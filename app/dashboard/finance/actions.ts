"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { StoreError } from "@/app/lib/takeoff/store";
import { checkIn, recordPayment, reviewPayment } from "@/app/lib/takeoff/jobs-store";
import { notifyClient } from "@/app/lib/takeoff/notify.server";
import { db } from "@/app/lib/finance/reports.server";
import {
  addEntry, financeReady, ignoreLine, importStatement, lineToEntry, linkLine, listWorkerTax, patternOf, reopenLine, saveJobCost, saveRecurring, saveRule, saveSettings,
  setExpenseVat, setJobCostStatus, setRecurringActive, setRuleActive, setWorkerTax, voidEntry, workerPayment,
} from "@/app/lib/finance/store";
import { fingerprints } from "@/app/lib/finance/bank-parse";
import { category } from "@/app/lib/finance/rules";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
const fail = (e: unknown): { ok: false; message: string } => ({
  ok: false, message: e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error && /permission/.test(e.message) ? e.message : "Something went wrong. Please try again.",
});
async function run<T extends object>(fn: (actor: string) => Promise<T | void>): Promise<Result<T>> {
  try {
    const actor = await requireCatalogueAdmin();
    if (!(await financeReady(db()))) throw new StoreError("Finance needs its database tables – run the migration 20261113120000_finance.");
    const r = await fn(actor);
    revalidatePath("/dashboard/finance"); revalidatePath("/dashboard/jobs"); revalidatePath("/dashboard");
    return { ok: true, ...(r ?? {}) } as Result<T>;
  } catch (e) { return fail(e); }
}

const uuid = z.string().uuid();
const optId = z.string().uuid().nullable().optional().transform(v => v ?? null);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date");
const amount = z.number({ invalid_type_error: "Enter the amount" }).finite().positive("Enter the amount").max(10_000_000);
const nonNeg = z.number().finite().min(0).max(10_000_000);
const method = z.enum(["BANK", "CASH", "CARD"]);
const treatment = z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT", "OUTSIDE", "REVERSE_CHARGE"]);
const text = (n: number) => z.string().trim().max(n).default("");

// ---------------------------------------------------------------- Settings

export async function saveSettingsAction(raw: unknown) {
  return run(async actor => { await saveSettings(db(), raw, actor); });
}

// ---------------------------------------------------------------- Money in / out

const entrySchema = z.object({
  date: day, direction: z.enum(["IN", "OUT"]), method, category: z.string().min(1, "Choose a category"), description: text(500), counterparty: text(200), reference: text(120),
  quoteId: optId, workerId: optId, jobCostId: optId, recurringId: optId, amount, vat: nonNeg.nullable().optional(), vatTreatment: treatment.optional(),
  cisLabour: nonNeg.optional(), cisMaterials: nonNeg.optional(), cisDeducted: nonNeg.optional(), days: z.number().min(0).max(366).nullable().optional(), receiptUrl: text(500),
});
export async function addEntryAction(raw: unknown) {
  return run(async actor => {
    const e = entrySchema.parse(raw);
    // A client paying for a job is recorded on the job itself (the client sees it in their portal).
    if (e.direction === "IN" && e.category === "SALES" && e.quoteId) {
      await recordPayment(db(), e.quoteId, { scheduleNo: null, amount: e.amount, method: e.method === "CASH" ? "CASH" : "BANK_TRANSFER", reference: e.reference, paidOn: e.date, note: e.description }, actor, "ADMIN");
      await notifyClient(db(), e.quoteId, { kind: "PAYMENT_CONFIRMED", amount: e.amount, paidOn: e.date });
      return;
    }
    await addEntry(db(), e, actor);
  });
}
export async function voidEntryAction(id: string) {
  return run(async () => { await voidEntry(db(), uuid.parse(id)); });
}
export async function setExpenseVatAction(id: string, raw: unknown) {
  return run(async () => {
    const p = z.object({ vat: nonNeg, vatTreatment: treatment, method }).parse(raw);
    await setExpenseVat(db(), uuid.parse(id), p);
  });
}

// ---------------------------------------------------------------- Workers: pay, days, CIS details

export async function payWorkerAction(raw: unknown) {
  return run(async actor => {
    const p = z.object({
      workerId: uuid, quoteId: optId, jobCostId: optId, date: day, method, days: z.number().min(0).max(366).nullable().optional(),
      labour: nonNeg, materials: nonNeg, note: text(300),
    }).parse(raw);
    const w = (await listWorkerTax(db())).find(x => x.id === p.workerId);
    if (!w) throw new StoreError("Worker not found.");
    if (!(p.labour + p.materials > 0)) throw new StoreError("Enter the labour (and any materials).");
    // CIS applies to subcontractors' labour however they are paid; VAT-registered subcontractors use the reverse charge.
    const vatTreatment = w.vatNumber && w.cisStatus !== "NONE" ? "REVERSE_CHARGE" : "OUTSIDE";
    const pay = workerPayment({ labour: p.labour, materials: p.materials, vatTreatment, cisStatus: w.cisStatus });
    await addEntry(db(), {
      date: p.date, direction: "OUT", method: p.method, category: w.kind === "SUBCONTRACTOR" || w.cisStatus !== "NONE" ? "SUBCONTRACTOR" : "LABOUR",
      description: p.note || `Pay${p.days ? ` – ${p.days} day${p.days === 1 ? "" : "s"}` : ""}`, counterparty: w.name, quoteId: p.quoteId, workerId: w.id, jobCostId: p.jobCostId,
      amount: pay.amount, vat: pay.vat, vatTreatment, cisLabour: pay.cisLabour, cisMaterials: pay.cisMaterials, cisDeducted: pay.cisDeducted, days: p.days ?? null,
    }, actor);
    return { toPay: pay.toPay, cisDeducted: pay.cisDeducted };
  });
}
/** Days on site entered by the office (shows as a check-in, so the worker's days and pay add up). */
export async function addWorkDaysAction(raw: unknown) {
  return run(async () => {
    const p = z.object({ workerId: uuid, quoteId: uuid, dates: z.array(day).min(1, "Pick the days").max(60) }).parse(raw);
    for (const d of [...new Set(p.dates)]) await checkIn(db(), p.workerId, p.quoteId, "IN", {}, "ADMIN", "Day entered in Finance", `${d}T08:00:00Z`);
  });
}
export async function setWorkerTaxAction(workerId: string, raw: unknown) {
  return run(async () => {
    const p = z.object({ cisStatus: z.enum(["NONE", "GROSS", "NET20", "NET30"]), utr: text(20), vatNumber: text(20), verificationNumber: text(20) }).parse(raw);
    await setWorkerTax(db(), uuid.parse(workerId), p);
  });
}

// ---------------------------------------------------------------- Repeating costs & agreed job prices

export async function saveRecurringAction(raw: unknown) {
  return run(async actor => {
    const p = z.object({
      id: uuid.optional(), name: z.string().trim().min(1, "Give it a name").max(120), category: z.string(), supplier: text(120), amount, vat: nonNeg.nullable().optional(), vatTreatment: treatment,
      frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONE_OFF"]), startDate: day, endDate: day.nullable().optional().transform(v => v ?? null), method, notes: text(500),
    }).parse(raw);
    await saveRecurring(db(), p, actor);
  });
}
export async function setRecurringActiveAction(id: string, active: boolean) {
  return run(async () => { await setRecurringActive(db(), uuid.parse(id), !!active); });
}
export async function saveJobCostAction(raw: unknown) {
  return run(async actor => {
    const p = z.object({
      id: uuid.optional(), quoteId: uuid, workerId: optId, supplier: text(120), title: z.string().trim().min(1, "Say what the price is for").max(200), category: z.string(),
      amount, labour: nonNeg, vatTreatment: treatment, dueDate: day.nullable().optional().transform(v => v ?? null), notes: text(500),
    }).parse(raw);
    await saveJobCost(db(), p, actor);
  });
}
export async function setJobCostStatusAction(id: string, status: "OPEN" | "CANCELLED") {
  return run(async () => { await setJobCostStatus(db(), uuid.parse(id), z.enum(["OPEN", "CANCELLED"]).parse(status)); });
}

// ---------------------------------------------------------------- Bank statements

const txnSchema = z.object({ date: day, description: z.string().max(300), amount: z.number().finite().refine(v => v !== 0 && Math.abs(v) <= 10_000_000), balance: z.number().finite().nullable() });
export async function importStatementAction(raw: unknown) {
  return run(async actor => {
    const p = z.object({
      fileName: text(200), bank: text(60), periodFrom: day.nullable(), periodTo: day.nullable(), openingBalance: z.number().finite().nullable(), closingBalance: z.number().finite().nullable(),
      txns: z.array(txnSchema).min(1, "No transactions to import").max(5000),
    }).parse(raw);
    const r = await importStatement(db(), p, p.txns, fingerprints(p.txns), actor);
    return { added: r.added, duplicates: r.duplicates };
  });
}

const choiceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ENTRY"), category: z.string(), quoteId: optId, workerId: optId, recurringId: optId, jobCostId: optId, vatTreatment: treatment.optional(), vat: nonNeg.nullable().optional(),
    cisLabour: nonNeg.optional(), cisMaterials: nonNeg.optional(), cisDeducted: nonNeg.optional(), counterparty: text(200), description: text(500), remember: z.boolean().default(false) }),
  z.object({ kind: z.literal("CLIENT_PAYMENT"), paymentId: uuid }),
  z.object({ kind: z.literal("JOB_PAYMENT"), quoteId: uuid, remember: z.boolean().default(false) }),
  z.object({ kind: z.literal("MATCH"), entryId: optId, expenseId: optId, paymentId: optId }),
  z.object({ kind: z.literal("IGNORE"), note: text(200) }),
]);
/** Sort one bank line: record it, match it to something already recorded, confirm a client payment, or ignore it. */
export async function sortBankLineAction(lineId: string, raw: unknown) {
  return run(async actor => {
    const id = uuid.parse(lineId), c = choiceSchema.parse(raw), d = db();
    const [line] = await d.query<{ date: string; description: string; amount: number; status: string }>(`SELECT to_char("date", 'YYYY-MM-DD') AS "date", "description", "amount"::float8 AS "amount", "status" FROM "FinanceBankLine" WHERE "id" = $1::uuid`, [id]);
    if (!line) throw new StoreError("Bank line not found.");
    if (line.status !== "NEW") throw new StoreError("This line is already done.");
    const dir = line.amount >= 0 ? "IN" : "OUT";
    if (c.kind === "IGNORE") return void (await ignoreLine(d, id, c.note, actor));
    if (c.kind === "MATCH") return void (await linkLine(d, id, { entryId: c.entryId ?? undefined, expenseId: c.expenseId ?? undefined, paymentId: c.paymentId ?? undefined }, actor));
    if (c.kind === "CLIENT_PAYMENT") {
      const p = await reviewPayment(d, c.paymentId, "CONFIRMED", actor);
      await linkLine(d, id, { paymentId: c.paymentId }, actor);
      await notifyClient(d, p.quoteId, { kind: "PAYMENT_CONFIRMED", amount: p.amount, paidOn: p.paidOn });
      return;
    }
    if (c.kind === "JOB_PAYMENT") {
      if (dir !== "IN") throw new StoreError("That's money out.");
      await recordPayment(d, c.quoteId, { scheduleNo: null, amount: line.amount, method: "BANK_TRANSFER", reference: line.description.slice(0, 120), paidOn: line.date, note: "From bank statement" }, actor, "ADMIN");
      const [p] = await d.query<{ id: string }>(`SELECT "id"::text AS "id" FROM "TakeoffJobPayment" WHERE "quoteId" = $1::uuid AND "paidOn" = $2::date AND "amount" = $3::numeric ORDER BY "createdAt" DESC LIMIT 1`, [c.quoteId, line.date, line.amount.toFixed(2)]);
      await linkLine(d, id, { paymentId: p.id }, actor);
      await notifyClient(d, c.quoteId, { kind: "PAYMENT_CONFIRMED", amount: line.amount, paidOn: line.date });
      if (c.remember) await saveRule(d, { pattern: patternOf(line.description), dir, categoryKey: "SALES", quoteId: c.quoteId, workerId: null, counterparty: "", vatTreatment: "STANDARD" }, actor);
      return;
    }
    const cat = category(c.category);
    if (cat.dir !== dir) throw new StoreError(`“${cat.label}” is money ${cat.dir === "IN" ? "in" : "out"} – this line is money ${dir === "IN" ? "in" : "out"}.`);
    await lineToEntry(d, id, { category: cat.key, quoteId: c.quoteId, workerId: c.workerId, recurringId: c.recurringId, jobCostId: c.jobCostId, vatTreatment: c.vatTreatment, vat: c.vat ?? null,
      cisLabour: c.cisLabour, cisMaterials: c.cisMaterials, cisDeducted: c.cisDeducted, counterparty: c.counterparty, description: c.description || line.description }, actor);
    if (c.remember) await saveRule(d, { pattern: patternOf(line.description), dir, categoryKey: cat.key, quoteId: c.quoteId, workerId: c.workerId, counterparty: c.counterparty, vatTreatment: c.vatTreatment ?? cat.vat }, actor);
  });
}
export async function reopenBankLineAction(lineId: string) {
  return run(async () => { await reopenLine(db(), uuid.parse(lineId)); });
}
export async function setRuleActiveAction(id: string, active: boolean) {
  return run(async () => { await setRuleActive(db(), uuid.parse(id), !!active); });
}
