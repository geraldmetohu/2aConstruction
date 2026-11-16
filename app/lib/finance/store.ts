// Finance storage (migration 20261113120000_finance). Plain parameterised SQL behind the same tiny interface as the
// quotes and jobs stores, so it runs on Prisma in the app and on in-memory Postgres in the tests.
// Nothing here deletes data: entries are voided, repeating costs and rules switched off, bank lines un-matched.

import { StoreError, type Db, type Sql } from "@/app/lib/takeoff/store";
import { category, cisDeduction, isDay, normaliseSettings, r2, vatFor, type CisStatus, type Day, type FinanceSettings, type Frequency, type VatTreatment } from "./rules";
import { normDesc, type BankTxn } from "./bank-parse";

export type Method = "BANK" | "CASH" | "CARD";
const money = (x: number) => r2(x).toFixed(2);
const TREATMENTS: VatTreatment[] = ["STANDARD", "REDUCED", "ZERO", "EXEMPT", "OUTSIDE", "REVERSE_CHARGE"];
const checkTreatment = (t: string): VatTreatment => (TREATMENTS.includes(t as VatTreatment) ? (t as VatTreatment) : "STANDARD");

export async function financeReady(db: Sql): Promise<boolean> {
  try {
    const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"FinanceEntry"') IS NOT NULL AND to_regclass('"FinanceBankLine"') IS NOT NULL AS ok`);
    return !!r?.ok;
  } catch { return false; }
}

// ---------------------------------------------------------------- Settings

export async function getSettings(db: Sql): Promise<FinanceSettings> {
  const [r] = await db.query<{ data: unknown }>(`SELECT "data" FROM "FinanceSettings" WHERE "id" = 1`);
  return normaliseSettings(r?.data);
}
export async function saveSettings(db: Sql, raw: unknown, actor: string) {
  const s = normaliseSettings(raw);
  if (s.vatRegistered && s.vatRegistrationDate && s.vatFirstPeriodEnd && s.vatFirstPeriodEnd < s.vatRegistrationDate) throw new StoreError("The first VAT period must end after the registration date.");
  await db.query(`INSERT INTO "FinanceSettings" ("id", "data", "updatedBy", "updatedAt") VALUES (1, $1::jsonb, $2, now())
    ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now()`, [JSON.stringify(s), actor]);
  return s;
}

// ---------------------------------------------------------------- Entries

export interface EntryRow {
  id: string; date: Day; direction: "IN" | "OUT"; method: Method; category: string; description: string; counterparty: string; reference: string;
  quoteId: string | null; workerId: string | null; jobCostId: string | null; recurringId: string | null;
  amount: number; vat: number; vatTreatment: VatTreatment; cisLabour: number; cisMaterials: number; cisDeducted: number; days: number | null;
  receiptUrl: string; void: boolean; recordedBy: string; createdAt: Date; bankLineId: string | null;
}
const ENTRY_COLS = `e."id"::text AS "id", to_char(e."date", 'YYYY-MM-DD') AS "date", e."direction", e."method", e."category", e."description", e."counterparty", e."reference",
  e."quoteId"::text AS "quoteId", e."workerId"::text AS "workerId", e."jobCostId"::text AS "jobCostId", e."recurringId"::text AS "recurringId",
  e."amount"::float8 AS "amount", e."vat"::float8 AS "vat", e."vatTreatment", e."cisLabour"::float8 AS "cisLabour", e."cisMaterials"::float8 AS "cisMaterials",
  e."cisDeducted"::float8 AS "cisDeducted", e."days"::float8 AS "days", e."receiptUrl", e."void", e."recordedBy", e."createdAt",
  (SELECT l."id"::text FROM "FinanceBankLine" l WHERE l."entryId" = e."id" LIMIT 1) AS "bankLineId"`;

export interface EntryInput {
  date: Day; direction: "IN" | "OUT"; method: Method; category: string; description?: string; counterparty?: string; reference?: string;
  quoteId?: string | null; workerId?: string | null; jobCostId?: string | null; recurringId?: string | null;
  /** What the invoice/receipt says, VAT included (reverse charge: the amount without VAT). */
  amount: number; vat?: number | null; vatTreatment?: VatTreatment;
  /** CIS (payments to subcontractors, or when a contractor pays us): labour part, materials part, the deduction. */
  cisLabour?: number; cisMaterials?: number; cisDeducted?: number; days?: number | null; receiptUrl?: string;
}
function checkEntry(e: EntryInput) {
  if (!isDay(e.date)) throw new StoreError("Enter the date.");
  if (!(e.amount > 0) || e.amount > 10_000_000) throw new StoreError("Enter the amount.");
  const c = category(e.category);
  if (c.dir !== e.direction) throw new StoreError(`“${c.label}” is money ${c.dir === "IN" ? "in" : "out"}.`);
  const t = checkTreatment(e.vatTreatment ?? c.vat);
  const vat = e.vat == null ? vatFor(e.amount, t) : r2(e.vat);
  if (vat < 0 || (t !== "REVERSE_CHARGE" && vat >= e.amount)) throw new StoreError("The VAT can't be more than the amount.");
  const cisDeducted = r2(e.cisDeducted ?? 0);
  if (cisDeducted < 0 || cisDeducted > e.amount) throw new StoreError("The CIS deduction can't be more than the amount.");
  const net = t === "REVERSE_CHARGE" ? e.amount : r2(e.amount - vat), cisParts = r2((e.cisLabour ?? 0) + (e.cisMaterials ?? 0));
  if (cisParts > net + 0.01) throw new StoreError(`Labour and materials (£${cisParts.toFixed(2)}) can't be more than the amount before VAT (£${net.toFixed(2)}).`);
  if (e.receiptUrl && !/^https:\/\//.test(e.receiptUrl)) throw new StoreError("The receipt must be an uploaded file.");
  return { ...e, category: c.key, vatTreatment: t, vat, cisDeducted, cisLabour: r2(e.cisLabour ?? 0), cisMaterials: r2(e.cisMaterials ?? 0) };
}
export async function addEntry(db: Sql, raw: EntryInput, actor: string): Promise<string> {
  const e = checkEntry(raw);
  const [r] = await db.query<{ id: string }>(`INSERT INTO "FinanceEntry" ("date", "direction", "method", "category", "description", "counterparty", "reference", "quoteId", "workerId", "jobCostId", "recurringId",
      "amount", "vat", "vatTreatment", "cisLabour", "cisMaterials", "cisDeducted", "days", "receiptUrl", "recordedBy")
    VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, $10::uuid, $11::uuid, $12::numeric, $13::numeric, $14, $15::numeric, $16::numeric, $17::numeric, $18::numeric, $19, $20) RETURNING "id"::text AS "id"`,
    [e.date, e.direction, e.method, e.category, (e.description ?? "").slice(0, 500), (e.counterparty ?? "").slice(0, 200), (e.reference ?? "").slice(0, 120), e.quoteId ?? null, e.workerId ?? null, e.jobCostId ?? null, e.recurringId ?? null,
      money(e.amount), money(e.vat), e.vatTreatment, money(e.cisLabour), money(e.cisMaterials), money(e.cisDeducted), e.days ?? null, e.receiptUrl ?? "", actor]);
  return r.id;
}
export async function updateEntry(db: Sql, id: string, raw: EntryInput) {
  const e = checkEntry(raw);
  const r = await db.query(`UPDATE "FinanceEntry" SET "date" = $2::date, "direction" = $3, "method" = $4, "category" = $5, "description" = $6, "counterparty" = $7, "reference" = $8, "quoteId" = $9::uuid, "workerId" = $10::uuid,
      "jobCostId" = $11::uuid, "recurringId" = $12::uuid, "amount" = $13::numeric, "vat" = $14::numeric, "vatTreatment" = $15, "cisLabour" = $16::numeric, "cisMaterials" = $17::numeric, "cisDeducted" = $18::numeric,
      "days" = $19::numeric, "receiptUrl" = $20, "updatedAt" = now() WHERE "id" = $1::uuid AND NOT "void" RETURNING "id"`,
    [id, e.date, e.direction, e.method, e.category, (e.description ?? "").slice(0, 500), (e.counterparty ?? "").slice(0, 200), (e.reference ?? "").slice(0, 120), e.quoteId ?? null, e.workerId ?? null, e.jobCostId ?? null, e.recurringId ?? null,
      money(e.amount), money(e.vat), e.vatTreatment, money(e.cisLabour), money(e.cisMaterials), money(e.cisDeducted), e.days ?? null, e.receiptUrl ?? ""]);
  if (!r.length) throw new StoreError("That entry can't be changed.");
}
/** Cancel an entry (kept for the audit trail, left out of every total). A matched bank line goes back to "to do". */
export async function voidEntry(db: Db, id: string) {
  await db.transaction(async tx => {
    await tx.query(`UPDATE "FinanceEntry" SET "void" = true, "updatedAt" = now() WHERE "id" = $1::uuid`, [id]);
    await tx.query(`UPDATE "FinanceBankLine" SET "status" = 'NEW', "entryId" = NULL, "updatedAt" = now() WHERE "entryId" = $1::uuid`, [id]);
  });
}
export async function listEntries(db: Sql, f: { from?: Day; to?: Day; quoteId?: string; workerId?: string; method?: Method; includeVoid?: boolean } = {}) {
  const where: string[] = [], params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (!f.includeVoid) where.push(`NOT e."void"`);
  if (f.from) add(`e."date" >= ?::date`, f.from);
  if (f.to) add(`e."date" <= ?::date`, f.to);
  if (f.quoteId) add(`e."quoteId" = ?::uuid`, f.quoteId);
  if (f.workerId) add(`e."workerId" = ?::uuid`, f.workerId);
  if (f.method) add(`e."method" = ?`, f.method);
  return db.query<EntryRow>(`SELECT ${ENTRY_COLS} FROM "FinanceEntry" e ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY e."date" DESC, e."createdAt" DESC LIMIT 10000`, params);
}

/** Pay a worker or subcontractor: CIS worked out from their status (on the labour part only). */
export function workerPayment(p: { labour: number; materials: number; vatTreatment: VatTreatment; cisStatus: CisStatus }) {
  const labour = r2(Math.max(0, p.labour)), materials = r2(Math.max(0, p.materials)), net = r2(labour + materials);
  const vat = p.vatTreatment === "STANDARD" ? r2(net * 0.2) : p.vatTreatment === "REVERSE_CHARGE" ? r2(net * 0.2) : 0;
  const amount = p.vatTreatment === "STANDARD" ? r2(net + vat) : net; // reverse charge: they don't charge us VAT
  const cisDeducted = p.cisStatus === "NONE" ? 0 : cisDeduction(labour, p.cisStatus);
  return { amount, vat, cisLabour: p.cisStatus === "NONE" ? 0 : labour, cisMaterials: p.cisStatus === "NONE" ? 0 : materials, cisDeducted, toPay: r2(amount - cisDeducted) };
}

// ---------------------------------------------------------------- Existing job expenses: VAT & method

export async function setExpenseVat(db: Sql, id: string, p: { vat: number; vatTreatment: VatTreatment; method: Method }) {
  const t = checkTreatment(p.vatTreatment);
  const r = await db.query(`UPDATE "TakeoffExpense" SET "vat" = $2::numeric, "vatTreatment" = $3, "method" = $4 WHERE "id" = $1::uuid AND $2::numeric < "amount" RETURNING "id"`, [id, money(Math.max(0, p.vat)), t, p.method]);
  if (!r.length) throw new StoreError("The VAT can't be more than the amount.");
}
export interface JobExpenseRow { id: string; quoteId: string | null; workerId: string | null; category: string; description: string; supplier: string; amount: number; vat: number; vatTreatment: VatTreatment; method: Method; spentOn: Day; bankLineId: string | null }
export async function listJobExpenses(db: Sql, f: { from?: Day; to?: Day } = {}) {
  const params: unknown[] = [], where = [`NOT x."void"`];
  if (f.from) { params.push(f.from); where.push(`x."spentOn" >= $${params.length}::date`); }
  if (f.to) { params.push(f.to); where.push(`x."spentOn" <= $${params.length}::date`); }
  return db.query<JobExpenseRow>(`SELECT x."id"::text AS "id", x."quoteId"::text AS "quoteId", x."workerId"::text AS "workerId", x."category", x."description", x."supplier", x."amount"::float8 AS "amount",
      x."vat"::float8 AS "vat", x."vatTreatment", x."method", to_char(x."spentOn", 'YYYY-MM-DD') AS "spentOn",
      (SELECT l."id"::text FROM "FinanceBankLine" l WHERE l."expenseId" = x."id" LIMIT 1) AS "bankLineId"
    FROM "TakeoffExpense" x WHERE ${where.join(" AND ")} ORDER BY x."spentOn" DESC LIMIT 10000`, params);
}

// ---------------------------------------------------------------- Workers: CIS details

export async function setWorkerTax(db: Sql, workerId: string, p: { cisStatus: CisStatus; utr: string; vatNumber: string; verificationNumber: string }) {
  if (!["NONE", "GROSS", "NET20", "NET30"].includes(p.cisStatus)) throw new StoreError("Choose the CIS status.");
  if (p.utr && !/^\d{10}$/.test(p.utr.replace(/\s/g, ""))) throw new StoreError("The UTR is 10 digits.");
  await db.query(`UPDATE "TakeoffWorker" SET "cisStatus" = $2, "utr" = $3, "vatNumber" = $4, "verificationNumber" = $5, "updatedAt" = now() WHERE "id" = $1::uuid`,
    [workerId, p.cisStatus, p.utr.replace(/\s/g, ""), p.vatNumber.trim().slice(0, 20), p.verificationNumber.trim().slice(0, 20)]);
}
export interface WorkerTaxRow { id: string; name: string; kind: string; trade: string; payBasis: string; dayRate: number | null; active: boolean; cisStatus: CisStatus; utr: string; vatNumber: string; verificationNumber: string }
export async function listWorkerTax(db: Sql) {
  return db.query<WorkerTaxRow>(`SELECT "id"::text AS "id", "name", "kind", "trade", "payBasis", "dayRate"::float8 AS "dayRate", "active", "cisStatus", "utr", "vatNumber", "verificationNumber" FROM "TakeoffWorker" ORDER BY "active" DESC, "name"`);
}

// ---------------------------------------------------------------- Repeating costs

export interface RecurringRow { id: string; name: string; category: string; supplier: string; amount: number; vat: number; vatTreatment: VatTreatment; frequency: Frequency; startDate: Day; endDate: Day | null; method: Method; notes: string; active: boolean }
export async function saveRecurring(db: Sql, r: Omit<RecurringRow, "id" | "active" | "vat"> & { id?: string; vat?: number | null }, actor: string) {
  if (!r.name.trim()) throw new StoreError("Give it a name.");
  if (!(r.amount > 0)) throw new StoreError("Enter the amount.");
  if (!isDay(r.startDate) || (r.endDate && (!isDay(r.endDate) || r.endDate < r.startDate))) throw new StoreError("Check the dates.");
  if (!["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONE_OFF"].includes(r.frequency)) throw new StoreError("Choose how often.");
  const c = category(r.category); if (c.dir !== "OUT") throw new StoreError("Choose a cost category.");
  const t = checkTreatment(r.vatTreatment), vat = r.vat == null ? vatFor(r.amount, t) : r2(r.vat);
  const vals = [r.name.trim().slice(0, 120), c.key, r.supplier.trim().slice(0, 120), money(r.amount), money(vat), t, r.frequency, r.startDate, r.endDate || null, r.method, r.notes.slice(0, 500)];
  if (r.id) {
    const u = await db.query(`UPDATE "FinanceRecurring" SET "name" = $2, "category" = $3, "supplier" = $4, "amount" = $5::numeric, "vat" = $6::numeric, "vatTreatment" = $7, "frequency" = $8, "startDate" = $9::date, "endDate" = $10::date, "method" = $11, "notes" = $12, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [r.id, ...vals]);
    if (!u.length) throw new StoreError("Not found.");
    return r.id;
  }
  const [x] = await db.query<{ id: string }>(`INSERT INTO "FinanceRecurring" ("name", "category", "supplier", "amount", "vat", "vatTreatment", "frequency", "startDate", "endDate", "method", "notes", "createdBy")
    VALUES ($1, $2, $3, $4::numeric, $5::numeric, $6, $7, $8::date, $9::date, $10, $11, $12) RETURNING "id"::text AS "id"`, [...vals, actor]);
  return x.id;
}
export async function setRecurringActive(db: Sql, id: string, active: boolean) {
  await db.query(`UPDATE "FinanceRecurring" SET "active" = $2, "updatedAt" = now() WHERE "id" = $1::uuid`, [id, active]);
}
export async function listRecurring(db: Sql) {
  return db.query<RecurringRow>(`SELECT "id"::text AS "id", "name", "category", "supplier", "amount"::float8 AS "amount", "vat"::float8 AS "vat", "vatTreatment", "frequency",
      to_char("startDate", 'YYYY-MM-DD') AS "startDate", to_char("endDate", 'YYYY-MM-DD') AS "endDate", "method", "notes", "active" FROM "FinanceRecurring" ORDER BY "active" DESC, "name"`);
}

// ---------------------------------------------------------------- Prices agreed per job (subcontractors, suppliers)

export interface JobCostRow { id: string; quoteId: string; workerId: string | null; supplier: string; title: string; category: string; amount: number; labour: number; vatTreatment: VatTreatment; dueDate: Day | null; notes: string; status: "OPEN" | "CANCELLED"; paid: number; cisDeducted: number }
export async function saveJobCost(db: Sql, c: { id?: string; quoteId: string; workerId: string | null; supplier: string; title: string; category: string; amount: number; labour: number; vatTreatment: VatTreatment; dueDate: Day | null; notes: string }, actor: string) {
  if (!c.title.trim()) throw new StoreError("Say what the price is for.");
  if (!(c.amount > 0)) throw new StoreError("Enter the agreed price.");
  if (c.labour < 0 || c.labour > c.amount) throw new StoreError("The labour part can't be more than the price.");
  if (c.dueDate && !isDay(c.dueDate)) throw new StoreError("Check the date.");
  const cat = category(c.category); if (!cat.jobCost) throw new StoreError("Choose a job cost category.");
  const vals = [c.quoteId, c.workerId, c.supplier.trim().slice(0, 120), c.title.trim().slice(0, 200), cat.key, money(c.amount), money(c.labour), checkTreatment(c.vatTreatment), c.dueDate || null, c.notes.slice(0, 500)];
  if (c.id) {
    await db.query(`UPDATE "FinanceJobCost" SET "quoteId" = $2::uuid, "workerId" = $3::uuid, "supplier" = $4, "title" = $5, "category" = $6, "amount" = $7::numeric, "labour" = $8::numeric, "vatTreatment" = $9, "dueDate" = $10::date, "notes" = $11, "updatedAt" = now() WHERE "id" = $1::uuid`, [c.id, ...vals]);
    return c.id;
  }
  const [r] = await db.query<{ id: string }>(`INSERT INTO "FinanceJobCost" ("quoteId", "workerId", "supplier", "title", "category", "amount", "labour", "vatTreatment", "dueDate", "notes", "createdBy")
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::numeric, $7::numeric, $8, $9::date, $10, $11) RETURNING "id"::text AS "id"`, [...vals, actor]);
  return r.id;
}
export async function setJobCostStatus(db: Sql, id: string, status: "OPEN" | "CANCELLED") {
  await db.query(`UPDATE "FinanceJobCost" SET "status" = $2, "updatedAt" = now() WHERE "id" = $1::uuid`, [id, status]);
}
export async function listJobCosts(db: Sql, quoteId?: string) {
  return db.query<JobCostRow>(`SELECT c."id"::text AS "id", c."quoteId"::text AS "quoteId", c."workerId"::text AS "workerId", c."supplier", c."title", c."category", c."amount"::float8 AS "amount", c."labour"::float8 AS "labour",
      c."vatTreatment", to_char(c."dueDate", 'YYYY-MM-DD') AS "dueDate", c."notes", c."status",
      COALESCE((SELECT sum(e."amount")::float8 FROM "FinanceEntry" e WHERE e."jobCostId" = c."id" AND NOT e."void"), 0) AS "paid",
      COALESCE((SELECT sum(e."cisDeducted")::float8 FROM "FinanceEntry" e WHERE e."jobCostId" = c."id" AND NOT e."void"), 0) AS "cisDeducted"
    FROM "FinanceJobCost" c ${quoteId ? `WHERE c."quoteId" = $1::uuid` : ""} ORDER BY c."status", c."createdAt" DESC`, quoteId ? [quoteId] : []);
}

// ---------------------------------------------------------------- Bank statements

export interface StatementRow { id: string; fileName: string; bank: string; periodFrom: Day | null; periodTo: Day | null; openingBalance: number | null; closingBalance: number | null; lineCount: number; toDo: number; createdAt: Date }
export async function importStatement(db: Db, meta: { fileName: string; bank: string; periodFrom: Day | null; periodTo: Day | null; openingBalance: number | null; closingBalance: number | null }, txns: BankTxn[], fps: string[], actor: string) {
  if (!txns.length) throw new StoreError("No transactions to import.");
  if (txns.length > 5000) throw new StoreError("That's more than 5,000 lines – import it a few months at a time.");
  if (fps.length !== txns.length) throw new StoreError("Something went wrong reading the file.");
  for (const t of txns) if (!isDay(t.date) || !Number.isFinite(t.amount) || Math.abs(t.amount) > 10_000_000) throw new StoreError("A line on the statement couldn't be read.");
  return db.transaction(async tx => {
    const [s] = await tx.query<{ id: string }>(`INSERT INTO "FinanceBankStatement" ("fileName", "bank", "periodFrom", "periodTo", "openingBalance", "closingBalance", "uploadedBy")
      VALUES ($1, $2, $3::date, $4::date, $5::numeric, $6::numeric, $7) RETURNING "id"::text AS "id"`,
      [meta.fileName.slice(0, 200), meta.bank.slice(0, 60), meta.periodFrom, meta.periodTo, meta.openingBalance == null ? null : money(meta.openingBalance), meta.closingBalance == null ? null : money(meta.closingBalance), actor]);
    let added = 0;
    for (let i = 0; i < txns.length; i++) {
      const t = txns[i];
      const r = await tx.query(`INSERT INTO "FinanceBankLine" ("statementId", "date", "description", "amount", "balance", "fingerprint") VALUES ($1::uuid, $2::date, $3, $4::numeric, $5::numeric, $6)
        ON CONFLICT ("fingerprint") DO NOTHING RETURNING "id"`, [s.id, t.date, t.description.slice(0, 300), money(t.amount), t.balance == null ? null : money(t.balance), fps[i].slice(0, 400)]);
      added += r.length;
    }
    await tx.query(`UPDATE "FinanceBankStatement" SET "lineCount" = $2 WHERE "id" = $1::uuid`, [s.id, added]);
    return { statementId: s.id, added, duplicates: txns.length - added };
  });
}
export async function listStatements(db: Sql) {
  return db.query<StatementRow>(`SELECT s."id"::text AS "id", s."fileName", s."bank", to_char(s."periodFrom", 'YYYY-MM-DD') AS "periodFrom", to_char(s."periodTo", 'YYYY-MM-DD') AS "periodTo",
      s."openingBalance"::float8 AS "openingBalance", s."closingBalance"::float8 AS "closingBalance", s."lineCount",
      (SELECT count(*)::int FROM "FinanceBankLine" l WHERE l."statementId" = s."id" AND l."status" = 'NEW') AS "toDo", s."createdAt"
    FROM "FinanceBankStatement" s ORDER BY s."periodTo" DESC NULLS LAST, s."createdAt" DESC LIMIT 200`);
}

export interface BankLineRow { id: string; statementId: string; date: Day; description: string; amount: number; balance: number | null; status: "NEW" | "DONE" | "IGNORED"; entryId: string | null; paymentId: string | null; expenseId: string | null; note: string }
export async function listBankLines(db: Sql, f: { status?: "NEW" | "DONE" | "IGNORED"; from?: Day; to?: Day; limit?: number } = {}) {
  const where: string[] = [], params: unknown[] = [];
  if (f.status) { params.push(f.status); where.push(`"status" = $${params.length}`); }
  if (f.from) { params.push(f.from); where.push(`"date" >= $${params.length}::date`); }
  if (f.to) { params.push(f.to); where.push(`"date" <= $${params.length}::date`); }
  params.push(Math.min(f.limit ?? 500, 5000));
  return db.query<BankLineRow>(`SELECT "id"::text AS "id", "statementId"::text AS "statementId", to_char("date", 'YYYY-MM-DD') AS "date", "description", "amount"::float8 AS "amount", "balance"::float8 AS "balance", "status",
      "entryId"::text AS "entryId", "paymentId"::text AS "paymentId", "expenseId"::text AS "expenseId", "note"
    FROM "FinanceBankLine" ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY "date" ${f.status === "NEW" ? "ASC" : "DESC"}, "createdAt" LIMIT $${params.length}`, params);
}
async function lineForUpdate(tx: Sql, id: string) {
  const [l] = await tx.query<BankLineRow>(`SELECT "id"::text AS "id", to_char("date", 'YYYY-MM-DD') AS "date", "description", "amount"::float8 AS "amount", "status", "entryId"::text AS "entryId" FROM "FinanceBankLine" WHERE "id" = $1::uuid FOR UPDATE`, [id]);
  if (!l) throw new StoreError("Bank line not found.");
  if (l.status !== "NEW") throw new StoreError("This line is already done.");
  return l;
}
/** Record a bank line as a new entry (cost, income, worker pay…). */
export async function lineToEntry(db: Db, lineId: string, e: Omit<EntryInput, "date" | "direction" | "method" | "amount"> & { amount?: number }, actor: string) {
  return db.transaction(async tx => {
    const l = await lineForUpdate(tx, lineId);
    const paid = Math.abs(l.amount);
    // CIS: the bank shows what was paid after the deduction; the entry holds the full amount.
    const amount = r2(e.amount ?? paid + (e.cisDeducted ?? 0));
    if (Math.abs(r2(amount - (e.cisDeducted ?? 0)) - paid) >= 0.01) throw new StoreError(`The amount less CIS should be £${paid.toFixed(2)} (what left the bank).`);
    const id = await addEntry(tx, { ...e, date: l.date, direction: l.amount >= 0 ? "IN" : "OUT", method: "BANK", amount }, actor);
    await tx.query(`UPDATE "FinanceBankLine" SET "status" = 'DONE', "entryId" = $2::uuid, "note" = 'created', "doneBy" = $3, "updatedAt" = now() WHERE "id" = $1::uuid`, [lineId, id, actor]);
    return id;
  });
}
/** Match a bank line to something already recorded (an entry, a job expense, or a client payment). */
export async function linkLine(db: Db, lineId: string, target: { entryId?: string; expenseId?: string; paymentId?: string }, actor: string) {
  await db.transaction(async tx => {
    await lineForUpdate(tx, lineId);
    await tx.query(`UPDATE "FinanceBankLine" SET "status" = 'DONE', "entryId" = $2::uuid, "expenseId" = $3::uuid, "paymentId" = $4::uuid, "note" = 'linked', "doneBy" = $5, "updatedAt" = now() WHERE "id" = $1::uuid`,
      [lineId, target.entryId ?? null, target.expenseId ?? null, target.paymentId ?? null, actor]);
  });
}
export async function ignoreLine(db: Db, lineId: string, note: string, actor: string) {
  await db.transaction(async tx => {
    await lineForUpdate(tx, lineId);
    await tx.query(`UPDATE "FinanceBankLine" SET "status" = 'IGNORED', "note" = $2, "doneBy" = $3, "updatedAt" = now() WHERE "id" = $1::uuid`, [lineId, note.slice(0, 200), actor]);
  });
}
/** Undo: the line goes back to "to do"; an entry created from it is cancelled (void). */
export async function reopenLine(db: Db, lineId: string) {
  await db.transaction(async tx => {
    const [l] = await tx.query<{ entryId: string | null; note: string }>(`SELECT "entryId"::text AS "entryId", "note" FROM "FinanceBankLine" WHERE "id" = $1::uuid FOR UPDATE`, [lineId]);
    if (!l) throw new StoreError("Bank line not found.");
    // Only an entry made from this line is cancelled; one it was matched to stays.
    if (l.entryId && l.note === "created") await tx.query(`UPDATE "FinanceEntry" SET "void" = true, "updatedAt" = now() WHERE "id" = $1::uuid`, [l.entryId]);
    await tx.query(`UPDATE "FinanceBankLine" SET "status" = 'NEW', "entryId" = NULL, "expenseId" = NULL, "paymentId" = NULL, "note" = '', "updatedAt" = now() WHERE "id" = $1::uuid`, [lineId]);
  });
}

// ---------------------------------------------------------------- "Remember this" rules

export interface RuleRow { id: string; pattern: string; dir: "IN" | "OUT"; categoryKey: string; quoteId: string | null; workerId: string | null; counterparty: string; vatTreatment: VatTreatment; active: boolean }
/** The part of a bank description that identifies the payee: drop dates, card numbers, references. */
export function patternOf(description: string) {
  const skip = /^(CARD|PAYMENT|TO|FROM|DIRECT|DEBIT|BILL|RECEIVED|ON|DD|SO|BP|BGC|FPI|FPO|DEB|VIS|VISA|CR|TFR|POS|CONTACTLESS|FASTER|PAYMENTS|REF|REFERENCE|MOBILE|ONLINE|TRANSACTION|AUTOMATED|CREDIT|STANDING|ORDER|GB|GBR|UK|LTD|LIMITED|PLC|CO|THE|AND|D|S|O)$/;
  const words = normDesc(description).split(" ").filter(w => w.length >= 2 && !/\d/.test(w) && !skip.test(w) && !/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/.test(w));
  return words.slice(0, 3).join(" ");
}
export async function saveRule(db: Sql, r: { pattern: string; dir: "IN" | "OUT"; categoryKey: string; quoteId: string | null; workerId: string | null; counterparty: string; vatTreatment: VatTreatment }, actor: string) {
  const pattern = normDesc(r.pattern).slice(0, 80);
  if (pattern.length < 3) return null;
  await db.query(`INSERT INTO "FinanceRule" ("pattern", "direction", "category", "quoteId", "workerId", "counterparty", "vatTreatment", "createdBy") VALUES ($1, $2, $3, $4::uuid, $5::uuid, $6, $7, $8)
    ON CONFLICT ("pattern", "direction") DO UPDATE SET "category" = EXCLUDED."category", "quoteId" = EXCLUDED."quoteId", "workerId" = EXCLUDED."workerId", "counterparty" = EXCLUDED."counterparty", "vatTreatment" = EXCLUDED."vatTreatment", "active" = true`,
    [pattern, r.dir, category(r.categoryKey).key, r.quoteId, r.workerId, r.counterparty.slice(0, 120), checkTreatment(r.vatTreatment), actor]);
  return pattern;
}
export async function listRules(db: Sql) {
  return db.query<RuleRow>(`SELECT "id"::text AS "id", "pattern", "direction" AS "dir", "category" AS "categoryKey", "quoteId"::text AS "quoteId", "workerId"::text AS "workerId", "counterparty", "vatTreatment", "active" FROM "FinanceRule" ORDER BY "pattern"`);
}
export async function setRuleActive(db: Sql, id: string, active: boolean) {
  await db.query(`UPDATE "FinanceRule" SET "active" = $2 WHERE "id" = $1::uuid`, [id, active]);
}
