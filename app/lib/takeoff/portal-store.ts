// Client portal storage: the start date the client asks for, the job's project manager, stage invoices and
// the snagging list. Plain parameterised SQL like jobs-store.ts; every write is additive or an update of its own rows.

import { addEvent, getJob, type ActorKind } from "./jobs-store";
import { StoreError, type Db, type Sql } from "./store";

export interface PortalInfo { requestedStart: string | null; managerName: string; managerPhone: string; managerEmail: string }
export interface InvoiceRow { id: string; quoteId: string; scheduleNo: number; number: string; label: string; description: string; issuedOn: string; dueOn: string; net: number; vat: number; gross: number; emailedAt: Date | null; createdAt: Date }
export interface SnagRow { id: string; quoteId: string; title: string; detail: string; location: string; photoUrl: string; status: "OPEN" | "DONE"; raisedByKind: ActorKind; raisedBy: string; doneByKind: ActorKind | null; doneBy: string | null; doneAt: Date | null; createdAt: Date }

const DATE = (c: string) => `to_char("${c}", 'YYYY-MM-DD') AS "${c}"`;

/** True once the client-portal migration has been applied (until then the portal simply hides these parts). */
export async function portalReady(db: Sql): Promise<boolean> {
  try {
    const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffJobSnag"') IS NOT NULL AND to_regclass('"TakeoffJobInvoice"') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TakeoffJob' AND column_name = 'managerName') AS ok`);
    return !!r?.ok;
  } catch { return false; }
}

// ---------------------------------------------------------------- Start date requested & project manager

export async function getPortalInfo(db: Sql, quoteId: string): Promise<PortalInfo> {
  const [r] = await db.query<PortalInfo>(`SELECT ${DATE("requestedStart")}, "managerName", "managerPhone", "managerEmail" FROM "TakeoffJob" WHERE "quoteId" = $1::uuid`, [quoteId]);
  return r ?? { requestedStart: null, managerName: "", managerPhone: "", managerEmail: "" };
}

/** The client's preferred start, given when accepting. We confirm the actual start date ourselves. */
export async function setRequestedStart(db: Db, quoteId: string, date: string | null, actor: string) {
  return db.transaction(async tx => {
    await getJob(tx, quoteId);
    await tx.query(`UPDATE "TakeoffJob" SET "requestedStart" = $2::date, "updatedAt" = now() WHERE "quoteId" = $1::uuid RETURNING "quoteId"`, [quoteId, date]);
    if (date) await addEvent(tx, quoteId, "START_REQUEST", `Client would like to start from ${date} – we'll confirm the start date.`, "CLIENT", actor);
  });
}

export async function setManager(db: Db, quoteId: string, m: { name: string; phone: string; email: string }, actor: string) {
  return db.transaction(async tx => {
    await getJob(tx, quoteId);
    await tx.query(`UPDATE "TakeoffJob" SET "managerName" = $2, "managerPhone" = $3, "managerEmail" = $4, "updatedAt" = now() WHERE "quoteId" = $1::uuid RETURNING "quoteId"`, [quoteId, m.name, m.phone, m.email]);
    if (m.name) await addEvent(tx, quoteId, "MANAGER", `${m.name} is your project manager${m.phone ? ` – ${m.phone}` : ""}.`, "ADMIN", actor);
  });
}

// ---------------------------------------------------------------- Invoices

const INV_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "scheduleNo", "number", "label", "description", ${DATE("issuedOn")}, ${DATE("dueOn")},
  "net"::float8 AS "net", "vat"::float8 AS "vat", "gross"::float8 AS "gross", "emailedAt", "createdAt"`;

export async function listInvoices(db: Sql, quoteId: string) {
  return db.query<InvoiceRow>(`SELECT ${INV_COLS} FROM "TakeoffJobInvoice" WHERE "quoteId" = $1::uuid ORDER BY "scheduleNo"`, [quoteId]);
}

/** Raises an invoice once per schedule row. Returns it only if this call created it (so it is emailed once). */
export async function issueInvoice(db: Db, quoteId: string, inv: { scheduleNo: number; number: string; label: string; description: string; issuedOn: string; dueOn: string; net: number; vat: number; gross: number }, actor: string, actorKind: ActorKind = "SYSTEM") {
  if (!(inv.gross >= 0) || Math.abs(inv.net + inv.vat - inv.gross) > 0.011) throw new StoreError("Invoice amounts don't add up.");
  return db.transaction(async tx => {
    const [row] = await tx.query<InvoiceRow>(`INSERT INTO "TakeoffJobInvoice" ("quoteId", "scheduleNo", "number", "label", "description", "issuedOn", "dueOn", "net", "vat", "gross", "issuedBy")
      VALUES ($1::uuid, $2::int, $3, $4, $5, $6::date, $7::date, $8::numeric, $9::numeric, $10::numeric, $11) ON CONFLICT DO NOTHING RETURNING ${INV_COLS}`,
      [quoteId, inv.scheduleNo, inv.number, inv.label.slice(0, 200), inv.description.slice(0, 2000), inv.issuedOn, inv.dueOn, inv.net.toFixed(2), inv.vat.toFixed(2), inv.gross.toFixed(2), actor]);
    if (row) await addEvent(tx, quoteId, "INVOICE", `Invoice ${row.number} issued: ${row.label}, £${row.gross.toFixed(2)} due by ${row.dueOn}.`, actorKind, actor);
    return row ?? null;
  });
}

export async function markInvoiceEmailed(db: Sql, id: string) {
  await db.query(`UPDATE "TakeoffJobInvoice" SET "emailedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`, [id]);
}

// ---------------------------------------------------------------- Snagging

const SNAG_COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "title", "detail", "location", "photoUrl", "status", "raisedByKind", "raisedBy", "doneByKind", "doneBy", "doneAt", "createdAt"`;

export async function listSnags(db: Sql, quoteId: string) {
  return db.query<SnagRow>(`SELECT ${SNAG_COLS} FROM "TakeoffJobSnag" WHERE "quoteId" = $1::uuid ORDER BY ("status" = 'DONE'), "createdAt"`, [quoteId]);
}

export async function addSnag(db: Db, quoteId: string, s: { title: string; detail: string; location: string; photoUrl: string }, actor: string, actorKind: "ADMIN" | "CLIENT") {
  if (!s.title.trim()) throw new StoreError("Describe the snag.");
  if (s.photoUrl && !/^https:\/\/[^\s]+$/.test(s.photoUrl)) throw new StoreError("Photos must be uploaded files.");
  return db.transaction(async tx => {
    const [row] = await tx.query<SnagRow>(`INSERT INTO "TakeoffJobSnag" ("quoteId", "title", "detail", "location", "photoUrl", "raisedByKind", "raisedBy") VALUES ($1::uuid, $2, $3, $4, $5, $6, $7) RETURNING ${SNAG_COLS}`,
      [quoteId, s.title.trim().slice(0, 200), s.detail.slice(0, 2000), s.location.slice(0, 120), s.photoUrl, actorKind, actor]);
    await addEvent(tx, quoteId, "SNAG", `${actorKind === "CLIENT" ? "Client added a snag" : "Snag added"}: ${row.title}${row.location ? ` (${row.location})` : ""}.`, actorKind, actor);
    return row;
  });
}

/** Either side can mark a snag done or reopen it; the other side sees who did it and when. */
export async function setSnagStatus(db: Db, quoteId: string, id: string, status: "OPEN" | "DONE", actor: string, actorKind: "ADMIN" | "CLIENT") {
  return db.transaction(async tx => {
    const [s] = await tx.query<SnagRow>(`SELECT ${SNAG_COLS} FROM "TakeoffJobSnag" WHERE "id" = $1::uuid AND "quoteId" = $2::uuid FOR UPDATE`, [id, quoteId]);
    if (!s) throw new StoreError("Snag not found.");
    if (s.status === status) return s;
    await tx.query(`UPDATE "TakeoffJobSnag" SET "status" = $2, "doneByKind" = $3, "doneBy" = $4, "doneAt" = $5::timestamptz, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"`,
      [id, status, status === "DONE" ? actorKind : null, status === "DONE" ? actor : null, status === "DONE" ? new Date().toISOString() : null]);
    const who = actorKind === "CLIENT" ? "Client" : "We";
    await addEvent(tx, quoteId, "SNAG", status === "DONE" ? `${who} marked “${s.title}” as done.` : `${who} reopened “${s.title}”.`, actorKind, actor);
    return { ...s, status };
  });
}
