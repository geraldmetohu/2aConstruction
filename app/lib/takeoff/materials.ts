// Materials for a job, item by item. Every material on the accepted quote (grouped by programme stage) plus
// extras the team adds that weren't on the quote. Each can be confirmed: bought, delivered or not needed.
// Pure logic + store functions (no "server-only") so tests can run them.
import { randomUUID } from "node:crypto";
import type { TakeoffLine } from "./types";
import type { Sql } from "./store";

export type MaterialStatus = "NEEDED" | "ORDERED" | "DELIVERED" | "NOT_NEEDED";
export interface MaterialSaved { id: string; quoteId: string; itemKey: string; stage: string; description: string; quantity: number; unit: string; status: MaterialStatus; supplier: string; cost: number | null; note: string; extra: boolean; updatedBy: string; updatedAt: Date }
export interface MaterialItem {
  itemKey: string; stage: string; description: string; quantity: number; unit: string;
  /** Our cost on the quote (null for extras without a cost). */
  quotedCost: number | null; cost: number | null;
  status: MaterialStatus; supplier: string; note: string; extra: boolean; clientSupplied: boolean;
  /** Areas on the quote this item comes from (e.g. "Bedroom 1, En-suite"). */
  areas: string[]; updatedBy: string; updatedAt: string | null;
}
export interface MaterialStage { stage: string; label: string; start?: string; stageStatus: "DONE" | "IN_PROGRESS" | "NOT_STARTED"; items: MaterialItem[]; open: number; confirmed: number; total: number }

const r3 = (n: number) => Math.round(n * 1000) / 1000, r2 = (n: number) => Math.round(n * 100) / 100;
export const materialKey = (stage: string, description: string, unit: string) => `${stage}|${description.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
export const isConfirmed = (s: MaterialStatus) => s !== "NEEDED";

/** Build the materials list: quote lines (same material in a stage added up) merged with what's been saved. */
export function materialsFor(
  lines: TakeoffLine[],
  stages: { stage: string; label: string; start?: string; status: "DONE" | "IN_PROGRESS" | "NOT_STARTED" }[],
  saved: MaterialSaved[],
): MaterialStage[] {
  const savedBy = new Map(saved.map(s => [s.itemKey, s]));
  const byStage = new Map<string, Map<string, MaterialItem>>();
  const add = (stage: string, it: MaterialItem) => { if (!byStage.has(stage)) byStage.set(stage, new Map()); byStage.get(stage)!.set(it.itemKey, it); };
  for (const l of lines) {
    if ((l.kind !== "MATERIAL" && l.kind !== "SUPPORTING") || l.excluded) continue;
    const key = materialKey(l.stage, l.description, l.unit);
    const cur = byStage.get(l.stage)?.get(key);
    if (cur) {
      cur.quantity = r3(cur.quantity + l.quantity); cur.quotedCost = r2((cur.quotedCost ?? 0) + l.total);
      if (l.area && !cur.areas.includes(l.area)) cur.areas.push(l.area);
      continue;
    }
    const s = savedBy.get(key);
    add(l.stage, { itemKey: key, stage: l.stage, description: l.description, quantity: r3(l.quantity), unit: l.unit, quotedCost: r2(l.total), cost: s?.cost ?? null,
      status: s?.status ?? "NEEDED", supplier: s?.supplier ?? "", note: s?.note ?? "", extra: false, clientSupplied: !!l.clientSupplied,
      areas: l.area ? [l.area] : [], updatedBy: s?.updatedBy ?? "", updatedAt: s ? new Date(s.updatedAt).toISOString() : null });
  }
  for (const s of saved.filter(x => x.extra)) add(s.stage, { itemKey: s.itemKey, stage: s.stage, description: s.description, quantity: s.quantity, unit: s.unit, quotedCost: null, cost: s.cost,
    status: s.status, supplier: s.supplier, note: s.note, extra: true, clientSupplied: false, areas: [], updatedBy: s.updatedBy, updatedAt: new Date(s.updatedAt).toISOString() });
  const known = new Set(stages.map(s => s.stage));
  const order = [...stages, ...[...byStage.keys()].filter(k => !known.has(k)).map(k => ({ stage: k, label: k.replace(/ · /, " – ") || "Other", start: undefined, status: "NOT_STARTED" as const }))];
  return order.filter(s => byStage.has(s.stage)).map(s => {
    const items = [...byStage.get(s.stage)!.values()];
    const mine = items.filter(i => !i.clientSupplied);
    return { stage: s.stage, label: s.label, start: s.start, stageStatus: s.status, items, total: mine.length, confirmed: mine.filter(i => isConfirmed(i.status)).length, open: mine.filter(i => !isConfirmed(i.status)).length };
  });
}

/** Stages whose materials are all confirmed (counts as "bought" for the order reminders). */
export function confirmedStages(list: MaterialStage[]): Map<string, "ORDERED" | "DELIVERED"> {
  const out = new Map<string, "ORDERED" | "DELIVERED">();
  for (const s of list) {
    const mine = s.items.filter(i => !i.clientSupplied);
    if (!mine.length || mine.some(i => !isConfirmed(i.status))) continue;
    out.set(s.stage, mine.every(i => i.status === "DELIVERED" || i.status === "NOT_NEEDED") ? "DELIVERED" : "ORDERED");
  }
  return out;
}

// ---------------------------------------------------------------- Store

export async function materialsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffJobMaterial"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}
const COLS = `"id"::text AS "id", "quoteId"::text AS "quoteId", "itemKey", "stage", "description", "quantity"::float8 AS "quantity", "unit", "status", "supplier", "cost"::float8 AS "cost", "note", "extra", "updatedBy", "updatedAt"`;

export async function listMaterials(db: Sql, quoteId: string): Promise<MaterialSaved[]> {
  if (!(await materialsReady(db))) return [];
  return db.query<MaterialSaved>(`SELECT ${COLS} FROM "TakeoffJobMaterial" WHERE "quoteId" = $1::uuid ORDER BY "createdAt"`, [quoteId]);
}

export interface MaterialPatch { status?: MaterialStatus; supplier?: string; cost?: number | null; note?: string }
/** Confirm one or more items from the quote (creates the row the first time). */
export async function setMaterials(db: Sql, quoteId: string, items: { itemKey: string; stage: string; description: string; quantity: number; unit: string }[], patch: MaterialPatch, actor: string) {
  for (const it of items) {
    await db.query(`INSERT INTO "TakeoffJobMaterial" ("quoteId", "itemKey", "stage", "description", "quantity", "unit", "status", "supplier", "cost", "note", "updatedBy")
        VALUES ($1::uuid, $2, $3, $4, $5, $6, COALESCE($7, 'NEEDED'), COALESCE($8, ''), $9, COALESCE($10, ''), $11)
      ON CONFLICT ("quoteId", "itemKey") DO UPDATE SET
        "status" = COALESCE($7, "TakeoffJobMaterial"."status"), "supplier" = COALESCE($8, "TakeoffJobMaterial"."supplier"),
        "cost" = CASE WHEN $12::boolean THEN $9 ELSE "TakeoffJobMaterial"."cost" END, "note" = COALESCE($10, "TakeoffJobMaterial"."note"),
        "quantity" = EXCLUDED."quantity", "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now()`,
      [quoteId, it.itemKey, it.stage, it.description, it.quantity, it.unit, patch.status ?? null, patch.supplier ?? null, patch.cost ?? null, patch.note ?? null, actor, patch.cost !== undefined]);
  }
}

/** A material that wasn't on the quote. */
export async function addExtraMaterial(db: Sql, quoteId: string, m: { stage: string; description: string; quantity: number; unit: string; status: MaterialStatus; supplier: string; cost: number | null; note: string }, actor: string) {
  const [row] = await db.query<MaterialSaved>(`INSERT INTO "TakeoffJobMaterial" ("quoteId", "itemKey", "stage", "description", "quantity", "unit", "status", "supplier", "cost", "note", "extra", "updatedBy")
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11) RETURNING ${COLS}`,
    [quoteId, `extra:${randomUUID()}`, m.stage, m.description, m.quantity, m.unit, m.status, m.supplier, m.cost, m.note, actor]);
  return row;
}
export async function updateExtraMaterial(db: Sql, quoteId: string, itemKey: string, m: { stage: string; description: string; quantity: number; unit: string }, actor: string) {
  const rows = await db.query(`UPDATE "TakeoffJobMaterial" SET "stage" = $3, "description" = $4, "quantity" = $5, "unit" = $6, "updatedBy" = $7, "updatedAt" = now()
    WHERE "quoteId" = $1::uuid AND "itemKey" = $2 AND "extra" RETURNING "id"`, [quoteId, itemKey, m.stage, m.description, m.quantity, m.unit, actor]);
  return rows.length > 0;
}
/** Remove an extra added by mistake (items from the quote can only be marked "not needed"). */
export async function removeExtraMaterial(db: Sql, quoteId: string, itemKey: string) {
  const rows = await db.query(`DELETE FROM "TakeoffJobMaterial" WHERE "quoteId" = $1::uuid AND "itemKey" = $2 AND "extra" RETURNING "id"`, [quoteId, itemKey]);
  return rows.length > 0;
}
