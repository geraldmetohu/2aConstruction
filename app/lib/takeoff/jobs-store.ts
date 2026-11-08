// Storage for jobs (accepted takeoff quotes): progress, activity & messages, photos, client actions,
// client supplies, our material orders, client payments, expenses, workers, ratings, assignments and
// check-ins. Plain parameterised SQL (see store.ts) so it is testable on in-memory Postgres.

import { StoreError, type Db, type Sql } from "./store";

export type JobStatus = "PLANNED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED";
export type ActorKind = "ADMIN" | "CLIENT" | "WORKER" | "SYSTEM";
export interface JobRow { quoteId: string; status: JobStatus; startDate: string | null; completedAt: Date | null; clientContacts: ClientContact[]; accessNotes: string; createdAt: Date; updatedAt: Date }
export interface ClientContact { name: string; role: string; phone: string; email: string }
export interface StageRow { stage: string; status: "NOT_STARTED" | "IN_PROGRESS" | "DONE"; percent: number; note: string; updatedBy: string; updatedAt: Date }
export interface JobEvent { id: string; quoteId: string; kind: string; message: string; actorKind: ActorKind; actor: string; visibleToClient: boolean; createdAt: Date }
export interface PhotoRow { id: string; quoteId: string; url: string; caption: string; stage: string; visibleToClient: boolean; favourite: boolean; hidden: boolean; uploadedBy: string; createdAt: Date }
export interface ActionRow { id: string; quoteId: string; kind: string; title: string; detail: string; dueDate: string | null; status: "OPEN" | "ANSWERED" | "DONE" | "CANCELLED"; response: string; respondedAt: Date | null; createdAt: Date }
export interface SupplyRow { itemKey: string; status: "TO_ORDER" | "ORDERED" | "DELIVERED"; note: string; updatedAt: Date }
export interface OrderRow { quoteId: string; stage: string; status: "ORDERED" | "DELIVERED"; supplier: string; note: string; updatedAt: Date }
export interface PaymentRow { id: string; quoteId: string; scheduleNo: number | null; amount: number; method: string; reference: string; paidOn: string; status: "REPORTED" | "CONFIRMED" | "REJECTED"; note: string; actorKind: "ADMIN" | "CLIENT"; createdAt: Date }
export interface ExpenseRow { id: string; quoteId: string | null; workerId: string | null; category: string; description: string; supplier: string; amount: number; spentOn: string; void: boolean; createdAt: Date }
export interface WorkerRow { id: string; name: string; kind: "EMPLOYEE" | "SUBCONTRACTOR"; trade: string; phone: string; email: string; payBasis: "DAY" | "JOB"; dayRate: number | null; notes: string; active: boolean; hasLink: boolean; rating: number | null; ratings: number; createdAt: Date }
export interface AssignmentRow { id: string; quoteId: string; workerId: string; trade: string; payBasis: "DAY" | "JOB"; dayRate: number | null; agreedPrice: number | null; active: boolean }
export interface CheckInRow { id: string; workerId: string; quoteId: string; kind: "IN" | "OUT"; at: Date; lat: number | null; lng: number | null; accuracy: number | null; note: string; source: "WORKER" | "ADMIN" }

const json = (v: unknown) => JSON.stringify(v ?? null);
const DATE = (c: string) => `to_char("${c}", 'YYYY-MM-DD') AS "${c}"`;

export async function jobsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffJob"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

// ---------------------------------------------------------------- Jobs

const JOB_COLS = `"quoteId"::text AS "quoteId", "status", ${DATE("startDate")}, "completedAt", "clientContacts", "accessNotes", "createdAt", "updatedAt"`;

export async function getJob(db: Sql, quoteId: string): Promise<JobRow> {
  await db.query(`INSERT INTO "TakeoffJob" ("quoteId") VALUES ($1::uuid) ON CONFLICT ("quoteId") DO NOTHING RETURNING "quoteId"`, [quoteId]);
  const [row] = await db.query<JobRow>(`SELECT ${JOB_COLS} FROM "TakeoffJob" WHERE "quoteId" = $1::uuid`, [quoteId]);
  return row;
}

export async function addEvent(db: Sql, quoteId: string, kind: string, message: string, actorKind: ActorKind, actor: string, visibleToClient = true) {
  await db.query(`INSERT INTO "TakeoffJobEvent" ("quoteId", "kind", "message", "actorKind", "actor", "visibleToClient") VALUES ($1::uuid, $2, $3, $4, $5, $6::boolean) RETURNING "id"`,
    [quoteId, kind, message.slice(0, 4000), actorKind, actor, visibleToClient]);
}

export async function updateJob(db: Db, quoteId: string, patch: { status?: JobStatus; startDate?: string | null }, actor: string) {
  return db.transaction(async tx => {
    const job = await getJob(tx, quoteId);
    if (patch.status && patch.status !== job.status) {
      await tx.query(`UPDATE "TakeoffJob" SET "status" = $2, "completedAt" = CASE WHEN $2 = 'COMPLETED' THEN now() ELSE NULL END, "updatedAt" = now() WHERE "quoteId" = $1::uuid RETURNING "quoteId"`, [quoteId, patch.status]);
      const label = { PLANNED: "planned", IN_PROGRESS: "in progress", ON_HOLD: "on hold", COMPLETED: "completed" }[patch.status];
      await addEvent(tx, quoteId, "STATUS", `Project is now ${label}.`, "ADMIN", actor);
    }
    if (patch.startDate !== undefined && patch.startDate !== job.startDate) {
      await tx.query(`UPDATE "TakeoffJob" SET "startDate" = $2::date, "updatedAt" = now() WHERE "quoteId" = $1::uuid RETURNING "quoteId"`, [quoteId, patch.startDate]);
      await addEvent(tx, quoteId, "START_DATE", patch.startDate ? `Start date set to ${patch.startDate}.` : "Start date to be confirmed.", "ADMIN", actor);
    }
    return getJob(tx, quoteId);
  });
}

export async function saveClientInfo(db: Db, quoteId: string, info: { contacts: ClientContact[]; accessNotes: string }, actor: string, actorKind: "ADMIN" | "CLIENT") {
  return db.transaction(async tx => {
    await getJob(tx, quoteId);
    await tx.query(`UPDATE "TakeoffJob" SET "clientContacts" = $2::jsonb, "accessNotes" = $3, "updatedAt" = now() WHERE "quoteId" = $1::uuid RETURNING "quoteId"`, [quoteId, json(info.contacts), info.accessNotes]);
    await addEvent(tx, quoteId, "CONTACTS", actorKind === "CLIENT" ? "Client updated contact details and access notes." : "Contact details and access notes updated.", actorKind, actor);
  });
}

/** Accepted quotes with job status, money received and what needs attention. */
export async function listJobs(db: Sql) {
  return db.query<{ quoteId: string; reference: string; clientName: string; clientEmail: string; siteAddress: string; acceptedAt: Date | null; publishedVersion: number;
    status: JobStatus; startDate: string | null; gross: number; received: number; reported: number; openActions: number; unread: number }>(`
    SELECT q."id"::text AS "quoteId", q."reference", q."clientName", q."clientEmail", q."siteAddress", q."acceptedAt", q."publishedVersion",
      COALESCE(j."status", 'PLANNED') AS "status", to_char(j."startDate", 'YYYY-MM-DD') AS "startDate",
      COALESCE((v."customer" ->> 'gross')::float8, 0) AS "gross",
      COALESCE((SELECT sum(p."amount")::float8 FROM "TakeoffJobPayment" p WHERE p."quoteId" = q."id" AND p."status" = 'CONFIRMED'), 0) AS "received",
      COALESCE((SELECT sum(p."amount")::float8 FROM "TakeoffJobPayment" p WHERE p."quoteId" = q."id" AND p."status" = 'REPORTED'), 0) AS "reported",
      (SELECT count(*)::int FROM "TakeoffJobAction" a WHERE a."quoteId" = q."id" AND a."status" = 'OPEN') AS "openActions",
      (SELECT count(*)::int FROM "TakeoffJobEvent" e WHERE e."quoteId" = q."id" AND e."actorKind" = 'CLIENT'
        AND e."createdAt" > COALESCE((SELECT max(s."seenAt") FROM "TakeoffQuoteSeen" s WHERE s."quoteId" = q."id" AND s."viewer" = 'ADMIN'), 'epoch')) AS "unread"
    FROM "TakeoffQuote" q
    JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."publishedVersion"
    LEFT JOIN "TakeoffJob" j ON j."quoteId" = q."id"
    WHERE q."status" = 'ACCEPTED'
    ORDER BY (COALESCE(j."status", 'PLANNED') = 'COMPLETED'), j."startDate" NULLS LAST, q."acceptedAt" DESC`);
}

// ---------------------------------------------------------------- Stages

export async function listStages(db: Sql, quoteId: string) {
  return db.query<StageRow>(`SELECT "stage", "status", "percent", "note", "updatedBy", "updatedAt" FROM "TakeoffJobStage" WHERE "quoteId" = $1::uuid`, [quoteId]);
}

export async function setStage(db: Db, quoteId: string, stage: string, s: { status: StageRow["status"]; percent: number; note: string }, actor: string, label = stage) {
  const percent = s.status === "DONE" ? 100 : s.status === "NOT_STARTED" ? 0 : Math.max(1, Math.min(99, Math.round(s.percent)));
  return db.transaction(async tx => {
    await getJob(tx, quoteId);
    await tx.query(`INSERT INTO "TakeoffJobStage" ("quoteId", "stage", "status", "percent", "note", "updatedBy") VALUES ($1::uuid, $2, $3, $4::int, $5, $6)
      ON CONFLICT ("quoteId", "stage") DO UPDATE SET "status" = EXCLUDED."status", "percent" = EXCLUDED."percent", "note" = EXCLUDED."note", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now() RETURNING "id"`,
      [quoteId, stage, s.status, percent, s.note, actor]);
    const what = s.status === "DONE" ? "completed" : s.status === "IN_PROGRESS" ? `in progress (${percent}%)` : "not started";
    await addEvent(tx, quoteId, "PROGRESS", `${label}: ${what}${s.note ? ` – ${s.note}` : ""}`, "ADMIN", actor);
    if (s.status !== "NOT_STARTED") await tx.query(`UPDATE "TakeoffJob" SET "status" = 'IN_PROGRESS', "updatedAt" = now() WHERE "quoteId" = $1::uuid AND "status" = 'PLANNED' RETURNING "quoteId"`, [quoteId]);
  });
}

// ---------------------------------------------------------------- Events & messages

export async function listEvents(db: Sql, quoteId: string, clientOnly = false, limit = 200) {
  return db.query<JobEvent>(`SELECT "id"::text AS "id", "quoteId"::text AS "quoteId", "kind", "message", "actorKind", "actor", "visibleToClient", "createdAt" FROM "TakeoffJobEvent"
    WHERE "quoteId" = $1::uuid ${clientOnly ? `AND "visibleToClient"` : ""} ORDER BY "createdAt" DESC, "id" DESC LIMIT $2::int`, [quoteId, limit]);
}

export async function unreadSince(db: Sql, quoteId: string, viewer: "ADMIN" | "CLIENT") {
  const other = viewer === "ADMIN" ? `"actorKind" = 'CLIENT'` : `"actorKind" <> 'CLIENT' AND "visibleToClient"`;
  const [r] = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "TakeoffJobEvent" WHERE "quoteId" = $1::uuid AND ${other}
    AND "createdAt" > COALESCE((SELECT max("seenAt") FROM "TakeoffQuoteSeen" WHERE "quoteId" = $1::uuid AND "viewer" = $2), 'epoch')`, [quoteId, viewer]);
  return r.n;
}

// ---------------------------------------------------------------- Photos

const PHOTO_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "url", "caption", "stage", "visibleToClient", "favourite", "hidden", "uploadedBy", "createdAt"`;

export async function addPhotos(db: Db, quoteId: string, photos: { url: string; caption?: string; stage?: string }[], actor: string) {
  return db.transaction(async tx => {
    for (const p of photos) {
      if (!/^https:\/\/[^\s]+$/.test(p.url)) throw new StoreError("Photos must be uploaded files (https links).");
      await tx.query(`INSERT INTO "TakeoffJobPhoto" ("quoteId", "url", "caption", "stage", "uploadedBy") VALUES ($1::uuid, $2, $3, $4, $5) RETURNING "id"`, [quoteId, p.url, p.caption ?? "", p.stage ?? "", actor]);
    }
    await addEvent(tx, quoteId, "PHOTO", `${photos.length} photo${photos.length === 1 ? "" : "s"} added.`, "ADMIN", actor, false);
  });
}

export async function updatePhoto(db: Db, id: string, patch: { caption?: string; stage?: string; visibleToClient?: boolean; favourite?: boolean; hidden?: boolean }, actor: string) {
  return db.transaction(async tx => {
    const [p] = await tx.query<PhotoRow>(`SELECT ${PHOTO_COLS} FROM "TakeoffJobPhoto" WHERE "id" = $1::uuid FOR UPDATE`, [id]);
    if (!p) throw new StoreError("Photo not found.");
    const n = { ...p, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) } as PhotoRow;
    await tx.query(`UPDATE "TakeoffJobPhoto" SET "caption" = $2, "stage" = $3, "visibleToClient" = $4::boolean, "favourite" = $5::boolean, "hidden" = $6::boolean, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`,
      [id, n.caption, n.stage, n.visibleToClient && !n.hidden, n.favourite, n.hidden]);
    if (patch.visibleToClient === true && !p.visibleToClient) await addEvent(tx, p.quoteId, "PHOTO", `New photo shared${n.caption ? `: ${n.caption}` : ""}.`, "ADMIN", actor, true);
    return { quoteId: p.quoteId };
  });
}

export async function listPhotos(db: Sql, quoteId: string, clientOnly = false) {
  return db.query<PhotoRow>(`SELECT ${PHOTO_COLS} FROM "TakeoffJobPhoto" WHERE "quoteId" = $1::uuid AND NOT "hidden" ${clientOnly ? `AND "visibleToClient"` : ""} ORDER BY "createdAt" DESC`, [quoteId]);
}

export async function listFavouritePhotos(db: Sql) {
  return db.query<PhotoRow & { reference: string; siteAddress: string }>(`SELECT ${PHOTO_COLS.split(", ").map(c => `p.${c}`).join(", ")}, q."reference", q."siteAddress"
    FROM "TakeoffJobPhoto" p JOIN "TakeoffQuote" q ON q."id" = p."quoteId" WHERE p."favourite" AND NOT p."hidden" ORDER BY p."createdAt" DESC LIMIT 500`);
}

// ---------------------------------------------------------------- Client actions

const ACTION_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "kind", "title", "detail", ${DATE("dueDate")}, "status", "response", "respondedAt", "createdAt"`;

export async function addAction(db: Db, quoteId: string, a: { kind: string; title: string; detail: string; dueDate: string | null }, actor: string) {
  return db.transaction(async tx => {
    const [r] = await tx.query<{ id: string }>(`INSERT INTO "TakeoffJobAction" ("quoteId", "kind", "title", "detail", "dueDate", "createdBy") VALUES ($1::uuid, $2, $3, $4, $5::date, $6) RETURNING "id"::text AS "id"`,
      [quoteId, a.kind, a.title, a.detail, a.dueDate, actor]);
    await addEvent(tx, quoteId, "ACTION", `New request for you: ${a.title}${a.dueDate ? ` (by ${a.dueDate})` : ""}`, "ADMIN", actor);
    return r;
  });
}

export async function answerAction(db: Db, quoteId: string, id: string, response: string, actor: string) {
  return db.transaction(async tx => {
    const [a] = await tx.query<ActionRow>(`SELECT ${ACTION_COLS} FROM "TakeoffJobAction" WHERE "id" = $1::uuid AND "quoteId" = $2::uuid FOR UPDATE`, [id, quoteId]);
    if (!a || a.status === "CANCELLED" || a.status === "DONE") throw new StoreError("This request is closed.");
    // A variation, once approved or declined, is a decision on the contract: it can't be changed from the portal.
    if (a.kind === "VARIATION" && a.response) throw new StoreError("You have already answered this change. Please message us if you need to change it.");
    if (a.kind === "VARIATION" && !/^(APPROVED|DECLINED)$/.test(response)) throw new StoreError("Please approve or decline the change.");
    await tx.query(`UPDATE "TakeoffJobAction" SET "status" = 'ANSWERED', "response" = $2, "respondedAt" = now(), "respondedBy" = $3, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [id, response, actor]);
    await addEvent(tx, quoteId, "ANSWER", a.kind === "VARIATION" ? `${response === "APPROVED" ? "Approved" : "Declined"} variation “${a.title}”.` : `Answered “${a.title}”: ${response}`, "CLIENT", actor);
  });
}

export async function setActionStatus(db: Db, quoteId: string, id: string, status: "OPEN" | "DONE" | "CANCELLED", actor: string) {
  return db.transaction(async tx => {
    const [a] = await tx.query<ActionRow>(`SELECT ${ACTION_COLS} FROM "TakeoffJobAction" WHERE "id" = $1::uuid AND "quoteId" = $2::uuid FOR UPDATE`, [id, quoteId]);
    if (!a) throw new StoreError("Request not found.");
    await tx.query(`UPDATE "TakeoffJobAction" SET "status" = $2, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [id, status]);
    if (status !== a.status) await addEvent(tx, quoteId, "ACTION", `“${a.title}” ${status === "DONE" ? "closed" : status === "CANCELLED" ? "cancelled" : "re-opened"}.`, "ADMIN", actor);
  });
}

export async function listActions(db: Sql, quoteId?: string) {
  return db.query<ActionRow>(`SELECT ${ACTION_COLS} FROM "TakeoffJobAction" ${quoteId ? `WHERE "quoteId" = $1::uuid` : ""} ORDER BY ("status" = 'OPEN') DESC, "dueDate" NULLS LAST, "createdAt" DESC LIMIT 500`, quoteId ? [quoteId] : []);
}

// ---------------------------------------------------------------- Client supplies & our orders

export async function setSupply(db: Db, quoteId: string, itemKey: string, status: SupplyRow["status"], note: string, actor: string, actorKind: "ADMIN" | "CLIENT", label: string) {
  return db.transaction(async tx => {
    await tx.query(`INSERT INTO "TakeoffJobSupply" ("quoteId", "itemKey", "status", "note", "updatedBy") VALUES ($1::uuid, $2, $3, $4, $5)
      ON CONFLICT ("quoteId", "itemKey") DO UPDATE SET "status" = EXCLUDED."status", "note" = EXCLUDED."note", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now() RETURNING "id"`, [quoteId, itemKey, status, note, actor]);
    await addEvent(tx, quoteId, "SUPPLY", `${label}: ${status === "DELIVERED" ? "delivered to site" : status === "ORDERED" ? "ordered" : "to order"}${note ? ` – ${note}` : ""}`, actorKind, actor);
  });
}
export async function listSupplies(db: Sql, quoteId?: string) {
  return db.query<SupplyRow & { quoteId: string }>(`SELECT "quoteId"::text AS "quoteId", "itemKey", "status", "note", "updatedAt" FROM "TakeoffJobSupply" ${quoteId ? `WHERE "quoteId" = $1::uuid` : ""}`, quoteId ? [quoteId] : []);
}

export async function setOrder(db: Db, quoteId: string, stage: string, o: { status: OrderRow["status"]; supplier: string; note: string }, actor: string) {
  return db.transaction(async tx => {
    await tx.query(`INSERT INTO "TakeoffJobOrder" ("quoteId", "stage", "status", "supplier", "note", "updatedBy") VALUES ($1::uuid, $2, $3, $4, $5, $6)
      ON CONFLICT ("quoteId", "stage") DO UPDATE SET "status" = EXCLUDED."status", "supplier" = EXCLUDED."supplier", "note" = EXCLUDED."note", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now() RETURNING "id"`,
      [quoteId, stage, o.status, o.supplier, o.note, actor]);
    await addEvent(tx, quoteId, "ORDER", `Materials for ${stage} ${o.status === "DELIVERED" ? "delivered" : "ordered"}${o.supplier ? ` from ${o.supplier}` : ""}.`, "ADMIN", actor, false);
  });
}
export async function listOrders(db: Sql, quoteId?: string) {
  return db.query<OrderRow>(`SELECT "quoteId"::text AS "quoteId", "stage", "status", "supplier", "note", "updatedAt" FROM "TakeoffJobOrder" ${quoteId ? `WHERE "quoteId" = $1::uuid` : ""}`, quoteId ? [quoteId] : []);
}

// ---------------------------------------------------------------- Client payments

const PAY_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "scheduleNo", "amount"::float8 AS "amount", "method", "reference", ${DATE("paidOn")}, "status", "note", "actorKind", "createdAt"`;

export async function recordPayment(db: Db, quoteId: string, p: { scheduleNo: number | null; amount: number; method: string; reference: string; paidOn: string; note: string }, actor: string, actorKind: "ADMIN" | "CLIENT") {
  if (!(p.amount > 0) || p.amount > 10_000_000) throw new StoreError("Enter the amount paid.");
  return db.transaction(async tx => {
    const status = actorKind === "ADMIN" ? "CONFIRMED" : "REPORTED";
    await tx.query(`INSERT INTO "TakeoffJobPayment" ("quoteId", "scheduleNo", "amount", "method", "reference", "paidOn", "status", "note", "recordedBy", "actorKind", "confirmedBy", "confirmedAt")
      VALUES ($1::uuid, $2::int, $3::numeric, $4, $5, $6::date, $7, $8, $9, $10, $11, $12::timestamptz) RETURNING "id"`,
      [quoteId, p.scheduleNo, p.amount.toFixed(2), p.method, p.reference, p.paidOn, status, p.note, actor, actorKind, actorKind === "ADMIN" ? actor : null, actorKind === "ADMIN" ? new Date().toISOString() : null]);
    await addEvent(tx, quoteId, "PAYMENT", actorKind === "CLIENT" ? `Client reports a payment of £${p.amount.toFixed(2)} on ${p.paidOn}${p.reference ? ` (ref ${p.reference})` : ""}.` : `Payment of £${p.amount.toFixed(2)} received – thank you.`, actorKind, actor);
  });
}

export async function reviewPayment(db: Db, id: string, status: "CONFIRMED" | "REJECTED", actor: string) {
  return db.transaction(async tx => {
    const [p] = await tx.query<PaymentRow>(`SELECT ${PAY_COLS} FROM "TakeoffJobPayment" WHERE "id" = $1::uuid FOR UPDATE`, [id]);
    if (!p || p.status !== "REPORTED") throw new StoreError("Only payments reported by the client can be confirmed or rejected.");
    await tx.query(`UPDATE "TakeoffJobPayment" SET "status" = $2, "confirmedBy" = $3, "confirmedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [id, status, actor]);
    await addEvent(tx, p.quoteId, "PAYMENT", status === "CONFIRMED" ? `Payment of £${p.amount.toFixed(2)} received – thank you.` : `We could not find the payment of £${p.amount.toFixed(2)} reported on ${p.paidOn}. Please contact us.`, "ADMIN", actor);
    return p;
  });
}

export async function listPayments(db: Sql, quoteId?: string) {
  return db.query<PaymentRow>(`SELECT ${PAY_COLS} FROM "TakeoffJobPayment" ${quoteId ? `WHERE "quoteId" = $1::uuid` : ""} ORDER BY "paidOn" DESC, "createdAt" DESC`, quoteId ? [quoteId] : []);
}

// ---------------------------------------------------------------- Expenses (money out)

const EXP_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "workerId"::text AS "workerId", "category", "description", "supplier", "amount"::float8 AS "amount", ${DATE("spentOn")}, "void", "createdAt"`;

export async function addExpense(db: Db, e: { quoteId: string | null; workerId: string | null; category: string; description: string; supplier: string; amount: number; spentOn: string }, actor: string) {
  if (!(e.amount > 0) || e.amount > 10_000_000) throw new StoreError("Enter the amount.");
  return db.transaction(async tx => {
    await tx.query(`INSERT INTO "TakeoffExpense" ("quoteId", "workerId", "category", "description", "supplier", "amount", "spentOn", "recordedBy") VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::numeric, $7::date, $8) RETURNING "id"`,
      [e.quoteId, e.workerId, e.category, e.description, e.supplier, e.amount.toFixed(2), e.spentOn, actor]);
    if (e.quoteId) await addEvent(tx, e.quoteId, "EXPENSE", `${e.category.toLowerCase()} £${e.amount.toFixed(2)}${e.description ? ` – ${e.description}` : ""}`, "ADMIN", actor, false);
  });
}
export async function voidExpense(db: Sql, id: string) {
  await db.query(`UPDATE "TakeoffExpense" SET "void" = true WHERE "id" = $1::uuid RETURNING "id"`, [id]);
}
export async function listExpenses(db: Sql, f: { quoteId?: string; workerId?: string } = {}) {
  const where: string[] = [], params: unknown[] = [];
  if (f.quoteId) { params.push(f.quoteId); where.push(`"quoteId" = $${params.length}::uuid`); }
  if (f.workerId) { params.push(f.workerId); where.push(`"workerId" = $${params.length}::uuid`); }
  return db.query<ExpenseRow>(`SELECT ${EXP_COLS} FROM "TakeoffExpense" ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY "spentOn" DESC, "createdAt" DESC LIMIT 2000`, params);
}

/** Money in (confirmed client payments) and out (expenses) per month, for the last `months` months. */
export async function monthlyMoney(db: Sql, months = 12) {
  return db.query<{ month: string; moneyIn: number; moneyOut: number }>(`
    WITH m AS (SELECT to_char(d, 'YYYY-MM') AS month FROM generate_series(date_trunc('month', now()) - (($1::int - 1) || ' months')::interval, date_trunc('month', now()), '1 month') d)
    SELECT m.month,
      COALESCE((SELECT sum("amount")::float8 FROM "TakeoffJobPayment" WHERE "status" = 'CONFIRMED' AND to_char("paidOn", 'YYYY-MM') = m.month), 0) AS "moneyIn",
      COALESCE((SELECT sum("amount")::float8 FROM "TakeoffExpense" WHERE NOT "void" AND to_char("spentOn", 'YYYY-MM') = m.month), 0) AS "moneyOut"
    FROM m ORDER BY m.month`, [months]);
}

// ---------------------------------------------------------------- Workers & subcontractors

const WORKER_COLS = `w."id"::text AS "id", w."name", w."kind", w."trade", w."phone", w."email", w."payBasis", w."dayRate"::float8 AS "dayRate", w."notes", w."active", (w."tokenHash" IS NOT NULL) AS "hasLink", w."createdAt",
  (SELECT round(avg(r."score")::numeric, 1)::float8 FROM "TakeoffWorkerRating" r WHERE r."workerId" = w."id") AS "rating",
  (SELECT count(*)::int FROM "TakeoffWorkerRating" r WHERE r."workerId" = w."id") AS "ratings"`;

export async function listWorkers(db: Sql) {
  return db.query<WorkerRow>(`SELECT ${WORKER_COLS} FROM "TakeoffWorker" w ORDER BY w."active" DESC, w."name"`);
}
export async function getWorker(db: Sql, id: string) {
  const [w] = await db.query<WorkerRow>(`SELECT ${WORKER_COLS} FROM "TakeoffWorker" w WHERE w."id" = $1::uuid`, [id]);
  return w ?? null;
}
export async function saveWorker(db: Sql, w: { id?: string; name: string; kind: WorkerRow["kind"]; trade: string; phone: string; email: string; payBasis: WorkerRow["payBasis"]; dayRate: number | null; notes: string; active: boolean }) {
  const rate = w.dayRate == null ? null : w.dayRate.toFixed(2);
  if (w.id) {
    const [r] = await db.query<{ id: string }>(`UPDATE "TakeoffWorker" SET "name" = $2, "kind" = $3, "trade" = $4, "phone" = $5, "email" = $6, "payBasis" = $7, "dayRate" = $8::numeric, "notes" = $9, "active" = $10::boolean, "updatedAt" = now()
      WHERE "id" = $1::uuid RETURNING "id"::text AS "id"`, [w.id, w.name, w.kind, w.trade, w.phone, w.email, w.payBasis, rate, w.notes, w.active]);
    if (!r) throw new StoreError("Worker not found.");
    return r;
  }
  const [r] = await db.query<{ id: string }>(`INSERT INTO "TakeoffWorker" ("name", "kind", "trade", "phone", "email", "payBasis", "dayRate", "notes", "active") VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9::boolean) RETURNING "id"::text AS "id"`,
    [w.name, w.kind, w.trade, w.phone, w.email, w.payBasis, rate, w.notes, w.active]);
  return r;
}
export async function setWorkerToken(db: Sql, id: string, tokenHash: string) {
  await db.query(`UPDATE "TakeoffWorker" SET "tokenHash" = $2, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [id, tokenHash]);
}
export async function workerByToken(db: Sql, tokenHash: string) {
  const [w] = await db.query<WorkerRow>(`SELECT ${WORKER_COLS} FROM "TakeoffWorker" w WHERE w."tokenHash" = $1 AND w."active"`, [tokenHash]);
  return w ?? null;
}
export async function rateWorker(db: Sql, workerId: string, score: number, note: string, quoteId: string | null, actor: string) {
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new StoreError("Rate from 1 to 10.");
  await db.query(`INSERT INTO "TakeoffWorkerRating" ("workerId", "quoteId", "score", "note", "ratedBy") VALUES ($1::uuid, $2::uuid, $3::int, $4, $5) RETURNING "id"`, [workerId, quoteId, score, note, actor]);
}
export async function listRatings(db: Sql, workerId: string) {
  return db.query<{ score: number; note: string; quoteId: string | null; createdAt: Date }>(`SELECT "score", "note", "quoteId"::text AS "quoteId", "createdAt" FROM "TakeoffWorkerRating" WHERE "workerId" = $1::uuid ORDER BY "createdAt" DESC`, [workerId]);
}

// ---------------------------------------------------------------- Assignments & check-ins

const ASSIGN_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "workerId"::text AS "workerId", "trade", "payBasis", "dayRate"::float8 AS "dayRate", "agreedPrice"::float8 AS "agreedPrice", "active"`;

export async function assignWorker(db: Db, quoteId: string, workerId: string, a: { trade: string; payBasis: "DAY" | "JOB"; dayRate: number | null; agreedPrice: number | null; active: boolean }, actor: string) {
  return db.transaction(async tx => {
    const [w] = await tx.query<{ name: string }>(`SELECT "name" FROM "TakeoffWorker" WHERE "id" = $1::uuid`, [workerId]);
    if (!w) throw new StoreError("Worker not found.");
    await tx.query(`INSERT INTO "TakeoffJobAssignment" ("quoteId", "workerId", "trade", "payBasis", "dayRate", "agreedPrice", "active") VALUES ($1::uuid, $2::uuid, $3, $4, $5::numeric, $6::numeric, $7::boolean)
      ON CONFLICT ("quoteId", "workerId") DO UPDATE SET "trade" = EXCLUDED."trade", "payBasis" = EXCLUDED."payBasis", "dayRate" = EXCLUDED."dayRate", "agreedPrice" = EXCLUDED."agreedPrice", "active" = EXCLUDED."active", "updatedAt" = now() RETURNING "id"`,
      [quoteId, workerId, a.trade, a.payBasis, a.dayRate == null ? null : a.dayRate.toFixed(2), a.agreedPrice == null ? null : a.agreedPrice.toFixed(2), a.active]);
    await addEvent(tx, quoteId, "TEAM", `${w.name}${a.trade ? ` (${a.trade})` : ""} ${a.active ? "assigned to" : "removed from"} the job.`, "ADMIN", actor, false);
  });
}
export async function listAssignments(db: Sql, f: { quoteId?: string; workerId?: string; activeOnly?: boolean } = {}) {
  const where: string[] = [], params: unknown[] = [];
  if (f.quoteId) { params.push(f.quoteId); where.push(`"quoteId" = $${params.length}::uuid`); }
  if (f.workerId) { params.push(f.workerId); where.push(`"workerId" = $${params.length}::uuid`); }
  if (f.activeOnly) where.push(`"active"`);
  return db.query<AssignmentRow>(`SELECT ${ASSIGN_COLS} FROM "TakeoffJobAssignment" ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`, params);
}

export async function checkIn(db: Db, workerId: string, quoteId: string, kind: "IN" | "OUT", geo: { lat?: number; lng?: number; accuracy?: number }, source: "WORKER" | "ADMIN", note = "", at?: string) {
  return db.transaction(async tx => {
    const [a] = await tx.query<{ name: string }>(`SELECT w."name" FROM "TakeoffJobAssignment" a JOIN "TakeoffWorker" w ON w."id" = a."workerId" WHERE a."quoteId" = $1::uuid AND a."workerId" = $2::uuid AND a."active" AND w."active"`, [quoteId, workerId]);
    if (!a) throw new StoreError("You are not assigned to this job. Please call the office.");
    const ok = (x: unknown) => typeof x === "number" && Number.isFinite(x) ? x : null;
    await tx.query(`INSERT INTO "TakeoffCheckIn" ("workerId", "quoteId", "kind", "at", "lat", "lng", "accuracy", "note", "source") VALUES ($1::uuid, $2::uuid, $3, COALESCE($4::timestamptz, now()), $5::float8, $6::float8, $7::float8, $8, $9) RETURNING "id"`,
      [workerId, quoteId, kind, at ?? null, ok(geo.lat), ok(geo.lng), ok(geo.accuracy), note, source]);
    await addEvent(tx, quoteId, "CHECK_IN", `${a.name} checked ${kind === "IN" ? "in" : "out"}${source === "ADMIN" ? " (entered by office)" : ""}.`, source === "ADMIN" ? "ADMIN" : "WORKER", workerId, false);
  });
}
export async function listCheckIns(db: Sql, f: { quoteId?: string; workerId?: string; sinceDays?: number } = {}) {
  const where: string[] = [], params: unknown[] = [];
  if (f.quoteId) { params.push(f.quoteId); where.push(`"quoteId" = $${params.length}::uuid`); }
  if (f.workerId) { params.push(f.workerId); where.push(`"workerId" = $${params.length}::uuid`); }
  if (f.sinceDays) { params.push(f.sinceDays); where.push(`"at" > now() - ($${params.length}::int || ' days')::interval`); }
  return db.query<CheckInRow>(`SELECT "id"::text AS "id", "workerId"::text AS "workerId", "quoteId"::text AS "quoteId", "kind", "at", "lat", "lng", "accuracy", "note", "source" FROM "TakeoffCheckIn"
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY "at" ASC LIMIT 5000`, params);
}
