// Website errors, grouped by "signature" (where + what) so one problem is one row with a count – and the
// office gets ONE email per problem (again only if it's still happening 6 hours later), never a flood.
// Pure store functions (no "server-only") so tests can run them.
import { createHash } from "node:crypto";
import type { Sql } from "../takeoff/store";

export interface ErrorInput { source: "server" | "browser"; message: string; stack?: string; path?: string; method?: string; digest?: string }
export interface ErrorRow { id: string; signature: string; source: string; message: string; stack: string; path: string; method: string; digest: string; count: number; firstAt: Date; lastAt: Date; emailedAt: Date | null; resolvedAt: Date | null }

export async function errorLogReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"AppErrorLog"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

/** Ids, numbers and hex in messages/paths vary per request – take them out so the same bug groups together. */
export function normalise(s: string) {
  return s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").replace(/\b[0-9a-f]{16,}\b/gi, ":hex").replace(/\d+/g, "#").slice(0, 300);
}
export function signatureOf(e: ErrorInput) {
  const firstFrame = (e.stack ?? "").split("\n").find(l => /\bat\b|@/.test(l))?.trim() ?? "";
  return createHash("sha256").update([e.source, normalise(e.message), normalise(e.path ?? ""), normalise(firstFrame)].join("|")).digest("hex").slice(0, 32);
}

const clip = (s: string | undefined, n: number) => (s ?? "").slice(0, n);

/** Record an error. Returns the row and whether the office should be emailed now. */
export async function recordError(db: Sql, e: ErrorInput, opts: { remindAfterHours?: number } = {}): Promise<{ row: ErrorRow; email: boolean }> {
  const sig = signatureOf(e);
  const [row] = await db.query<ErrorRow>(`INSERT INTO "AppErrorLog" ("signature", "source", "message", "stack", "path", "method", "digest")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT ("signature") DO UPDATE SET "count" = "AppErrorLog"."count" + 1, "lastAt" = now(), "resolvedAt" = NULL,
      "message" = EXCLUDED."message", "stack" = EXCLUDED."stack", "path" = EXCLUDED."path", "digest" = EXCLUDED."digest"
    RETURNING "id"::text AS "id", "signature", "source", "message", "stack", "path", "method", "digest", "count", "firstAt", "lastAt", "emailedAt", "resolvedAt"`,
    [sig, e.source, clip(e.message, 2000) || "(no message)", clip(e.stack, 8000), clip(e.path, 500), clip(e.method, 10), clip(e.digest, 100)]);
  const hours = opts.remindAfterHours ?? 6;
  // Claim the email atomically so two servers don't both send it.
  const [claimed] = await db.query<{ id: string }>(`UPDATE "AppErrorLog" SET "emailedAt" = now()
    WHERE "id" = $1::uuid AND ("emailedAt" IS NULL OR "emailedAt" < now() - ($2::int * interval '1 hour')) RETURNING "id"::text AS "id"`, [row.id, hours]);
  return { row, email: !!claimed };
}

export async function listErrors(db: Sql, opts: { open?: boolean; limit?: number } = {}): Promise<ErrorRow[]> {
  if (!(await errorLogReady(db))) return [];
  return db.query<ErrorRow>(`SELECT "id"::text AS "id", "signature", "source", "message", "stack", "path", "method", "digest", "count", "firstAt", "lastAt", "emailedAt", "resolvedAt"
    FROM "AppErrorLog" ${opts.open ? `WHERE "resolvedAt" IS NULL` : ""} ORDER BY "lastAt" DESC LIMIT $1`, [opts.limit ?? 100]);
}

/** Mark fixed (it comes back as open if it happens again). */
export async function resolveError(db: Sql, id: string) {
  await db.query(`UPDATE "AppErrorLog" SET "resolvedAt" = now() WHERE "id" = $1::uuid`, [id]);
}
