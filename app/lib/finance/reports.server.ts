import "server-only";
import { db as jobsDb } from "@/app/lib/takeoff/jobs.server";
import type { Sql } from "@/app/lib/takeoff/store";
import { financeReady, getSettings, listBankLines, listEntries, listJobCosts, listJobExpenses, listRecurring, listRules, listStatements, listWorkerTax } from "./store";
import { buildReport, type ReportInput } from "./report";
import type { Day } from "./rules";
import type { SuggestContext } from "./bank-parse";

export const db = jobsDb;
export const todayLondon = (): Day => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function tableExists(d: Sql, t: string) {
  const [r] = await d.query<{ ok: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`"${t}"`]);
  return !!r?.ok;
}

/** Everything the finance pages need, read once per page view. */
export async function loadReportInput(): Promise<ReportInput> {
  const d = db();
  const [hasInvoices, settings] = await Promise.all([tableExists(d, "TakeoffJobInvoice"), getSettings(d)]);
  const [entries, expenses, payments, invoices, jobs, jobCosts, recurring, workers, assignments, workDays, bankInfo, statements] = await Promise.all([
    listEntries(d),
    listJobExpenses(d),
    d.query<ReportInput["payments"][number]>(`SELECT p."id"::text AS "id", p."quoteId"::text AS "quoteId", p."amount"::float8 AS "amount", to_char(p."paidOn", 'YYYY-MM-DD') AS "paidOn", p."method", p."status", p."reference",
        EXISTS (SELECT 1 FROM "FinanceBankLine" l WHERE l."paymentId" = p."id") AS "linked" FROM "TakeoffJobPayment" p`),
    hasInvoices ? d.query<ReportInput["invoices"][number]>(`SELECT "quoteId"::text AS "quoteId", "number", "label", to_char("issuedOn", 'YYYY-MM-DD') AS "issuedOn", to_char("dueOn", 'YYYY-MM-DD') AS "dueOn",
        "net"::float8 AS "net", "vat"::float8 AS "vat", "gross"::float8 AS "gross" FROM "TakeoffJobInvoice"`) : Promise.resolve([]),
    d.query<ReportInput["jobs"][number]>(`SELECT q."id"::text AS "quoteId", q."reference", q."clientName", q."siteAddress", COALESCE(j."status", 'PLANNED') AS "jobStatus",
        COALESCE((v."customer" ->> 'net')::float8, 0) AS "contractNet", COALESCE((v."customer" ->> 'gross')::float8, 0) AS "contractGross",
        COALESCE((v."result" -> 'totals' ->> 'costSubtotal')::float8, 0) AS "plannedCost", COALESCE((v."input" -> 'commercial' ->> 'vatPercent')::float8, 20) AS "vatPercent",
        to_char(q."acceptedAt", 'YYYY-MM-DD') AS "acceptedAt"
      FROM "TakeoffQuote" q JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."publishedVersion" LEFT JOIN "TakeoffJob" j ON j."quoteId" = q."id"
      WHERE q."status" = 'ACCEPTED' ORDER BY (COALESCE(j."status", 'PLANNED') = 'COMPLETED'), q."acceptedAt" DESC`),
    listJobCosts(d),
    listRecurring(d),
    listWorkerTax(d),
    d.query<ReportInput["assignments"][number]>(`SELECT "quoteId"::text AS "quoteId", "workerId"::text AS "workerId", "payBasis", "dayRate"::float8 AS "dayRate", "agreedPrice"::float8 AS "agreedPrice" FROM "TakeoffJobAssignment"`),
    d.query<ReportInput["workDays"][number]>(`SELECT DISTINCT "workerId"::text AS "workerId", "quoteId"::text AS "quoteId", to_char(("at" AT TIME ZONE 'Europe/London')::date, 'YYYY-MM-DD') AS "day" FROM "TakeoffCheckIn" WHERE "kind" = 'IN'`),
    d.query<{ toDo: number }>(`SELECT count(*)::int AS "toDo" FROM "FinanceBankLine" WHERE "status" = 'NEW'`),
    listStatements(d),
  ]);
  const last = statements.find(s => s.periodTo && s.closingBalance != null) ?? null;
  return {
    today: todayLondon(), settings, entries, expenses, payments, invoices, jobs, jobCosts, recurring, workers, assignments, workDays,
    bank: { toDo: bankInfo[0]?.toDo ?? 0, lastClosing: last?.closingBalance ?? null, lastDate: last?.periodTo ?? null, statements: statements.length },
  };
}

export async function loadFinance() {
  const d = db();
  if (!(await financeReady(d))) return { ready: false as const };
  const input = await loadReportInput();
  return { ready: true as const, input, report: buildReport(input) };
}

/** What the bank page needs to suggest a match for each line. */
export async function loadSuggestContext(input: ReportInput): Promise<SuggestContext> {
  const d = db();
  const rules = (await listRules(d)).filter(r => r.active);
  const ref = new Map(input.jobs.map(j => [j.quoteId, `${j.reference} ${j.clientName}`]));
  const paidInvoices = new Map<string, number>();
  for (const p of input.payments) if (p.status === "CONFIRMED") paidInvoices.set(p.quoteId, (paidInvoices.get(p.quoteId) ?? 0) + p.amount);
  return {
    rules,
    reportedPayments: input.payments.filter(p => p.status === "REPORTED").map(p => ({ id: p.id, quoteId: p.quoteId, amount: p.amount, paidOn: p.paidOn, reference: p.reference, label: ref.get(p.quoteId) ?? "" })),
    invoices: input.invoices.map(i => ({ quoteId: i.quoteId, number: i.number, gross: i.gross, dueOn: i.dueOn, label: ref.get(i.quoteId) ?? "" })),
    jobs: input.jobs.map(j => ({ quoteId: j.quoteId, reference: j.reference, clientName: j.clientName, label: `${j.reference} ${j.clientName}` })),
    recurring: input.recurring.filter(r => r.active).map(r => ({ id: r.id, name: r.name, supplier: r.supplier, amount: r.amount, categoryKey: r.category })),
    workers: input.workers.filter(w => w.active).map(w => ({ id: w.id, name: w.name, categoryKey: w.kind === "SUBCONTRACTOR" ? "SUBCONTRACTOR" : "LABOUR" })),
    recorded: [
      ...input.entries.filter(e => e.method === "BANK" && !e.bankLineId).map(e => ({ kind: "ENTRY" as const, id: e.id, date: e.date, amount: (e.direction === "IN" ? 1 : -1) * (e.amount - e.cisDeducted), label: e.counterparty || e.description || e.category, categoryKey: e.category, quoteId: e.quoteId })),
      ...input.expenses.filter(e => e.method === "BANK" && !e.bankLineId).map(e => ({ kind: "EXPENSE" as const, id: e.id, date: e.spentOn, amount: -e.amount, label: `${e.supplier || e.description || e.category}${e.quoteId ? ` (${ref.get(e.quoteId)?.split(" ")[0] ?? "job"})` : ""}`, categoryKey: e.category, quoteId: e.quoteId })),
      ...input.payments.filter(p => p.status === "CONFIRMED" && !p.linked && p.method !== "CASH").map(p => ({ kind: "PAYMENT" as const, id: p.id, date: p.paidOn, amount: p.amount, label: `Client payment ${ref.get(p.quoteId) ?? ""}`, categoryKey: "SALES", quoteId: p.quoteId })),
    ],
  };
}

export { listBankLines, listStatements, listRules };
