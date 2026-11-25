// Permanent deletes, used only behind a "type the word to confirm" button in the dashboard.
// A project delete removes the quote and EVERYTHING attached to it – versions, job, stages, photos,
// documents, requests, messages, payments, invoices, expenses, finance entries and job costs – so a
// test or mistaken project leaves nothing behind. Bank statement lines are kept (they are the bank's
// record) but un-matched, so they can be matched again.

import type { Db, Sql } from "./store";
import { StoreError } from "./store";

export type DeleteReport = Record<string, number>;

/** The protected tables only allow a DELETE inside a transaction that switched this on (migration 20261117120000_confirmed_deletes). */
const unlock = (tx: Sql) => tx.query(`SELECT set_config('takeoff.confirmed_delete', 'on', true) AS ok`);

/** True once the confirmed-delete migration is applied (the guards know about the unlock). */
export async function deletesEnabled(db: Sql): Promise<boolean> {
  try {
    const [r] = await db.query<{ ok: boolean }>(`SELECT pg_get_functiondef('"takeoff_no_delete"'::regproc) LIKE '%confirmed_delete%' AS ok`);
    return !!r?.ok;
  } catch { return true; } // no guard function at all → nothing blocks deletes
}

/** Every table in this database that has a column with this name (found at run time, so new tables are included). */
async function tablesWith(db: Sql, column: string): Promise<string[]> {
  const rows = await db.query<{ t: string }>(
    `SELECT c.table_name AS t FROM information_schema.columns c JOIN information_schema.tables x ON x.table_name = c.table_name AND x.table_schema = c.table_schema
     WHERE c.column_name = $1 AND c.table_schema = current_schema() AND x.table_type = 'BASE TABLE'`, [column]);
  return rows.map(r => r.t);
}
const hasTable = async (db: Sql, t: string) => { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`"${t}"`]); return !!r?.ok; };
const count = async (db: Sql, sql: string, params: unknown[]) => { const r = await db.query<{ id: unknown }>(`${sql} RETURNING 1 AS id`, params); return r.length; };

/** Un-match bank lines that pointed at entries / payments / expenses we are removing. */
async function unmatchBank(tx: Sql, ids: { entries?: string[]; payments?: string[]; expenses?: string[] }) {
  if (!(await hasTable(tx, "FinanceBankLine"))) return 0;
  let n = 0;
  for (const [col, list] of [["entryId", ids.entries], ["paymentId", ids.payments], ["expenseId", ids.expenses]] as const) {
    if (!list?.length) continue;
    n += await count(tx, `UPDATE "FinanceBankLine" SET "${col}" = NULL, "status" = 'NEW', "updatedAt" = now() WHERE "${col}" = ANY($1::uuid[])`, [list]);
  }
  return n;
}
const ids = async (tx: Sql, table: string, where: string, params: unknown[]) => (await hasTable(tx, table)) ? (await tx.query<{ id: string }>(`SELECT "id"::text AS id FROM "${table}" WHERE ${where}`, params)).map(r => r.id) : [];

/** Delete a quote / project and everything related to it. Returns how many rows went from each table. */
export async function deleteProject(db: Db, quoteId: string): Promise<DeleteReport> {
  return db.transaction(async tx => {
    await unlock(tx);
    const [q] = await tx.query<{ id: string }>(`SELECT "id"::text AS id FROM "TakeoffQuote" WHERE "id" = $1::uuid FOR UPDATE`, [quoteId]);
    if (!q) throw new StoreError("Project not found – it may already have been deleted.");
    const report: DeleteReport = {};
    const p = [quoteId];
    // Money first: remember what bank lines pointed at, then remove entries tied to this job's costs.
    const entries = await ids(tx, "FinanceEntry", `"quoteId" = $1::uuid`, p);
    const costs = await ids(tx, "FinanceJobCost", `"quoteId" = $1::uuid`, p);
    if (costs.length) entries.push(...await ids(tx, "FinanceEntry", `"jobCostId" = ANY($1::uuid[])`, [costs]));
    const payments = await ids(tx, "TakeoffJobPayment", `"quoteId" = $1::uuid`, p);
    const expenses = await ids(tx, "TakeoffExpense", `"quoteId" = $1::uuid`, p);
    report.bankLinesUnmatched = await unmatchBank(tx, { entries, payments, expenses });
    if (entries.length) report.FinanceEntry = await count(tx, `DELETE FROM "FinanceEntry" WHERE "id" = ANY($1::uuid[])`, [entries]);
    // Every other table that records this quote id (children of the quote), then the job, then the quote.
    const skip = new Set(["TakeoffQuote", "TakeoffJob", "FinanceEntry", "FinanceBankLine", "SiteVisit"]);
    // A site visit stays (it is the record of the visit); it just stops pointing at the deleted quote.
    if (await hasTable(tx, "SiteVisit")) {
      const n = await count(tx, `UPDATE "SiteVisit" SET "quoteId" = NULL, "status" = CASE WHEN "status" = 'QUOTED' THEN 'DONE' ELSE "status" END, "updatedAt" = now() WHERE "quoteId" = $1::uuid`, p);
      if (n) report.siteVisitsUnlinked = n;
    }
    for (const t of await tablesWith(tx, "quoteId")) {
      if (skip.has(t)) continue;
      const n = await count(tx, `DELETE FROM "${t}" WHERE "quoteId" = $1::uuid`, p);
      if (n) report[t] = n;
    }
    if (await hasTable(tx, "TakeoffJob")) { const n = await count(tx, `DELETE FROM "TakeoffJob" WHERE "quoteId" = $1::uuid`, p); if (n) report.TakeoffJob = n; }
    report.TakeoffQuote = await count(tx, `DELETE FROM "TakeoffQuote" WHERE "id" = $1::uuid`, p);
    return report;
  });
}

/** Delete a team member / subcontractor with their assignments, check-ins, ratings, expenses and payments to them. */
export async function deleteWorker(db: Db, workerId: string): Promise<DeleteReport> {
  return db.transaction(async tx => {
    await unlock(tx);
    const [w] = await tx.query<{ id: string }>(`SELECT "id"::text AS id FROM "TakeoffWorker" WHERE "id" = $1::uuid FOR UPDATE`, [workerId]);
    if (!w) throw new StoreError("Team member not found.");
    const report: DeleteReport = {}, p = [workerId];
    const entries = await ids(tx, "FinanceEntry", `"workerId" = $1::uuid`, p);
    const costs = await ids(tx, "FinanceJobCost", `"workerId" = $1::uuid`, p);
    if (costs.length) entries.push(...await ids(tx, "FinanceEntry", `"jobCostId" = ANY($1::uuid[])`, [costs]));
    const expenses = await ids(tx, "TakeoffExpense", `"workerId" = $1::uuid`, p);
    report.bankLinesUnmatched = await unmatchBank(tx, { entries, expenses });
    if (entries.length) report.FinanceEntry = await count(tx, `DELETE FROM "FinanceEntry" WHERE "id" = ANY($1::uuid[])`, [entries]);
    for (const t of await tablesWith(tx, "workerId")) {
      if (t === "TakeoffWorker" || t === "FinanceEntry" || t === "FinanceBankLine") continue;
      const n = await count(tx, `DELETE FROM "${t}" WHERE "workerId" = $1::uuid`, p);
      if (n) report[t] = n;
    }
    report.TakeoffWorker = await count(tx, `DELETE FROM "TakeoffWorker" WHERE "id" = $1::uuid`, p);
    return report;
  });
}

/** Delete a login (client, trade or staff) with its sessions and tokens. Admin logins can't be deleted here. */
export async function deleteAccount(db: Db, accountId: string, opts: { isAdmin: (email: string, role: string) => boolean; selfId: string }): Promise<DeleteReport> {
  return db.transaction(async tx => {
    const [a] = await tx.query<{ id: string; email: string; role: string }>(`SELECT "id"::text AS id, "email", "role" FROM "AuthAccount" WHERE "id" = $1::uuid FOR UPDATE`, [accountId]);
    if (!a) throw new StoreError("Login not found.");
    if (a.id === opts.selfId) throw new StoreError("You can't delete the login you're using.");
    if (opts.isAdmin(a.email, a.role)) throw new StoreError("Admin logins can't be deleted from here.");
    const report: DeleteReport = {};
    for (const t of ["AuthSession", "AuthToken"]) if (await hasTable(tx, t)) { const n = await count(tx, `DELETE FROM "${t}" WHERE "accountId" = $1::uuid`, [accountId]); if (n) report[t] = n; }
    report.AuthAccount = await count(tx, `DELETE FROM "AuthAccount" WHERE "id" = $1::uuid`, [accountId]);
    return report;
  });
}

/** Single records: a finance entry, expense, client payment, invoice, photo, document, snag or request. */
export const SINGLE: Record<string, { table: string; label: string; bank?: "entries" | "payments" | "expenses" }> = {
  entry: { table: "FinanceEntry", label: "money entry", bank: "entries" },
  expense: { table: "TakeoffExpense", label: "expense", bank: "expenses" },
  payment: { table: "TakeoffJobPayment", label: "payment", bank: "payments" },
  invoice: { table: "TakeoffJobInvoice", label: "invoice" },
  photo: { table: "TakeoffJobPhoto", label: "photo" },
  document: { table: "TakeoffJobDocument", label: "document" },
  snag: { table: "TakeoffJobSnag", label: "snag" },
  action: { table: "TakeoffJobAction", label: "request" },
  jobcost: { table: "FinanceJobCost", label: "job cost" },
  recurring: { table: "FinanceRecurring", label: "regular cost" },
};
export async function deleteRecord(db: Db, kind: keyof typeof SINGLE, id: string): Promise<DeleteReport> {
  const s = SINGLE[kind];
  if (!s) throw new StoreError("Unknown record type.");
  return db.transaction(async tx => {
    await unlock(tx);
    if (!(await hasTable(tx, s.table))) throw new StoreError("Not found.");
    const report: DeleteReport = {};
    if (s.bank) report.bankLinesUnmatched = await unmatchBank(tx, { [s.bank]: [id] });
    if (kind === "jobcost") { const e = await ids(tx, "FinanceEntry", `"jobCostId" = $1::uuid`, [id]); if (e.length) { report.bankLinesUnmatched = (report.bankLinesUnmatched ?? 0) + await unmatchBank(tx, { entries: e }); report.FinanceEntry = await count(tx, `DELETE FROM "FinanceEntry" WHERE "id" = ANY($1::uuid[])`, [e]); } }
    if (kind === "recurring") await tx.query(`UPDATE "FinanceEntry" SET "recurringId" = NULL WHERE "recurringId" = $1::uuid RETURNING 1`, [id]);
    const n = await count(tx, `DELETE FROM "${s.table}" WHERE "id" = $1::uuid`, [id]);
    if (!n) throw new StoreError(`That ${s.label} was not found – it may already have been deleted.`);
    report[s.table] = n;
    return report;
  });
}

/** Plain-English summary of what a delete removed, for the confirmation message. */
export function describeReport(r: DeleteReport): string {
  const names: Record<string, string> = {
    TakeoffQuote: "project", TakeoffQuoteVersion: "quote versions", TakeoffQuoteEvent: "history entries", TakeoffQuoteSeen: "read markers", TakeoffJob: "job",
    TakeoffJobStage: "stages", TakeoffJobEvent: "messages & updates", TakeoffJobPhoto: "photos", TakeoffJobDocument: "documents", TakeoffJobAction: "requests",
    TakeoffJobSupply: "client supplies", TakeoffJobOrder: "orders", TakeoffJobPayment: "client payments", TakeoffJobInvoice: "invoices", TakeoffJobSnag: "snags",
    TakeoffJobAssignment: "team assignments", TakeoffCheckIn: "check-ins", TakeoffExpense: "expenses", TakeoffWorkerRating: "ratings", FinanceEntry: "money entries",
    FinanceJobCost: "job costs", FinanceRule: "bank rules", FinanceRecurring: "regular costs", TakeoffWorker: "team member", AuthAccount: "login", AuthSession: "sessions", AuthToken: "tokens",
    bankLinesUnmatched: "bank lines un-matched (kept)",
  };
  return Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${names[k] ?? k}`).join(", ") || "nothing";
}
