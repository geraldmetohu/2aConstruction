// Free extras: work done on a project that wasn't on the quote and that we are not charging for.
// Internal only (never shown to the client). Kept so we can see what each job really gave away.
import { addEvent, getJob } from "./jobs-store";
import { StoreError, type Db, type Sql } from "./store";

export interface ExtraRow { id: string; quoteId: string; doneOn: string; title: string; detail: string; stage: string; hours: number; cost: number; value: number; reason: string; createdBy: string; createdAt: Date }
export interface ExtraInput { doneOn: string; title: string; detail: string; stage: string; hours: number; cost: number; value: number; reason: string }

const COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", to_char("doneOn", 'YYYY-MM-DD') AS "doneOn", "title", "detail", "stage",
  "hours"::float8 AS "hours", "cost"::float8 AS "cost", "value"::float8 AS "value", "reason", "createdBy", "createdAt"`;

export async function extrasReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffJobExtra"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

export async function listExtras(db: Sql, quoteId: string): Promise<ExtraRow[]> {
  if (!(await extrasReady(db))) return [];
  return db.query<ExtraRow>(`SELECT ${COLS} FROM "TakeoffJobExtra" WHERE "quoteId" = $1::uuid ORDER BY "doneOn" DESC, "createdAt" DESC`, [quoteId]);
}

export async function addExtra(db: Db, quoteId: string, x: ExtraInput, actor: string) {
  if (!(await extrasReady(db))) throw new StoreError("Free extras need the database update 20261117130000_job_extras.");
  return db.transaction(async tx => {
    await getJob(tx, quoteId);
    const [row] = await tx.query<ExtraRow>(`INSERT INTO "TakeoffJobExtra" ("quoteId", "doneOn", "title", "detail", "stage", "hours", "cost", "value", "reason", "createdBy")
      VALUES ($1::uuid, $2::date, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${COLS}`, [quoteId, x.doneOn, x.title, x.detail, x.stage, x.hours, x.cost, x.value, x.reason, actor]);
    // Internal note only (not visible to the client).
    await addEvent(tx, quoteId, "NOTE", `Free extra logged: ${row.title}${row.value ? ` (worth £${row.value.toFixed(2)}, not charged)` : ""}.`, "ADMIN", actor, false);
    return row;
  });
}

/** Remove a free extra logged by mistake (this table has no history lock). */
export async function removeExtra(db: Db, quoteId: string, id: string) {
  const rows = await db.query<{ id: string }>(`DELETE FROM "TakeoffJobExtra" WHERE "id" = $1::uuid AND "quoteId" = $2::uuid RETURNING "id"::text AS id`, [id, quoteId]);
  if (!rows.length) throw new StoreError("That extra was not found – it may already have been removed.");
}

export const extrasTotals = (rows: ExtraRow[]) => ({
  count: rows.length,
  hours: Math.round(rows.reduce((s, r) => s + r.hours, 0) * 100) / 100,
  cost: Math.round(rows.reduce((s, r) => s + r.cost, 0) * 100) / 100,
  value: Math.round(rows.reduce((s, r) => s + r.value, 0) * 100) / 100,
});
