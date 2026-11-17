// Who signs each quote's documents. One row per quote; "" means "use the company default".
// Stored apart from the quote versions so a signer can be set on many quotes at once without new versions.
import type { Sql } from "./store";

export async function signerReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffQuoteSigner"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

export async function getSignerId(db: Sql, quoteId: string): Promise<string> {
  if (!(await signerReady(db))) return "";
  const [r] = await db.query<{ id: string }>(`SELECT "signatoryId" AS id FROM "TakeoffQuoteSigner" WHERE "quoteId" = $1::uuid`, [quoteId]);
  return r?.id ?? "";
}

export async function signerIds(db: Sql): Promise<Map<string, string>> {
  if (!(await signerReady(db))) return new Map();
  const rows = await db.query<{ q: string; id: string }>(`SELECT "quoteId"::text AS q, "signatoryId" AS id FROM "TakeoffQuoteSigner"`);
  return new Map(rows.map(r => [r.q, r.id]));
}

/** Set (or clear, with "") the signer on one or more quotes. Returns how many quotes were set. */
export async function setSigner(db: Sql, quoteIds: string[], signatoryId: string, actor: string): Promise<number> {
  if (!quoteIds.length) return 0;
  const rows = await db.query<{ q: string }>(`INSERT INTO "TakeoffQuoteSigner" ("quoteId", "signatoryId", "setBy")
    SELECT q."id", $2, $3 FROM "TakeoffQuote" q WHERE q."id" = ANY($1::uuid[])
    ON CONFLICT ("quoteId") DO UPDATE SET "signatoryId" = EXCLUDED."signatoryId", "setBy" = EXCLUDED."setBy", "setAt" = now()
    RETURNING "quoteId"::text AS q`, [quoteIds, signatoryId, actor]);
  return rows.length;
}
