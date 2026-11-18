// Client reviews: the client writes one in their portal after handover; it shows on the website only after
// we approve it (and only if they said we may). A week after completion the client is asked once by email.
// Pure store functions (no "server-only") so tests can run them.
import type { Sql } from "../takeoff/store";

export type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN";
export interface ReviewRow { id: string; quoteId: string; rating: number; title: string; body: string; displayName: string; area: string; allowPublish: boolean; status: ReviewStatus; reply: string; createdAt: Date; updatedAt: Date; approvedAt: Date | null; approvedBy: string | null; reference?: string; clientName?: string; projectTitle?: string }
export interface ReviewInput { rating: number; title: string; body: string; displayName: string; area: string; allowPublish: boolean }

const COLS = `r."id"::text AS "id", r."quoteId"::text AS "quoteId", r."rating", r."title", r."body", r."displayName", r."area", r."allowPublish", r."status", r."reply", r."createdAt", r."updatedAt", r."approvedAt", r."approvedBy"`;

export async function reviewsReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffReview"') IS NOT NULL AND to_regclass('"TakeoffReviewRequest"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

export async function getReview(db: Sql, quoteId: string): Promise<ReviewRow | null> {
  if (!(await reviewsReady(db))) return null;
  const [r] = await db.query<ReviewRow>(`SELECT ${COLS} FROM "TakeoffReview" r WHERE r."quoteId" = $1::uuid`, [quoteId]);
  return r ?? null;
}

/** The client writes or edits their review. Editing an approved review sends it back for approval. */
export async function saveReview(db: Sql, quoteId: string, x: ReviewInput) {
  const [r] = await db.query<ReviewRow>(`INSERT INTO "TakeoffReview" AS r ("quoteId", "rating", "title", "body", "displayName", "area", "allowPublish")
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
    ON CONFLICT ("quoteId") DO UPDATE SET "rating" = EXCLUDED."rating", "title" = EXCLUDED."title", "body" = EXCLUDED."body", "displayName" = EXCLUDED."displayName",
      "area" = EXCLUDED."area", "allowPublish" = EXCLUDED."allowPublish", "status" = 'PENDING', "approvedAt" = NULL, "approvedBy" = NULL, "updatedAt" = now()
    RETURNING ${COLS}`, [quoteId, x.rating, x.title, x.body, x.displayName, x.area, x.allowPublish]);
  return r;
}

export async function listReviews(db: Sql): Promise<ReviewRow[]> {
  if (!(await reviewsReady(db))) return [];
  return db.query<ReviewRow>(`SELECT ${COLS}, q."reference", q."clientName", COALESCE(v."input" -> 'terms' ->> 'title', '') AS "projectTitle"
    FROM "TakeoffReview" r JOIN "TakeoffQuote" q ON q."id" = r."quoteId" LEFT JOIN "TakeoffQuoteVersion" v ON v."quoteId" = q."id" AND v."version" = q."currentVersion"
    ORDER BY (r."status" = 'PENDING') DESC, r."updatedAt" DESC LIMIT 300`);
}

/** Approve (show on the website – only if the client allowed it) or hide; optional public reply. */
export async function setReviewStatus(db: Sql, id: string, status: ReviewStatus, actor: string, reply?: string) {
  const rows = await db.query(`UPDATE "TakeoffReview" SET "status" = $2, "approvedAt" = CASE WHEN $2 = 'APPROVED' THEN now() ELSE NULL END, "approvedBy" = CASE WHEN $2 = 'APPROVED' THEN $3 ELSE NULL END,
      "reply" = COALESCE($4, "reply"), "updatedAt" = now()
    WHERE "id" = $1::uuid AND ($2 <> 'APPROVED' OR "allowPublish") RETURNING "id"`, [id, status, actor, reply ?? null]);
  return rows.length > 0;
}

/** Approved reviews for the website, newest first. */
export async function publishedReviews(db: Sql, limit = 12): Promise<Pick<ReviewRow, "id" | "rating" | "title" | "body" | "displayName" | "area" | "reply" | "approvedAt">[]> {
  if (!(await reviewsReady(db))) return [];
  return db.query(`SELECT r."id"::text AS "id", r."rating", r."title", r."body", r."displayName", r."area", r."reply", r."approvedAt"
    FROM "TakeoffReview" r WHERE r."status" = 'APPROVED' AND r."allowPublish" ORDER BY r."approvedAt" DESC LIMIT $1`, [limit]);
}

/** Completed jobs (handed over at least `days` ago, within the last 60 days) whose client hasn't been asked or written one yet. */
export async function dueReviewRequests(db: Sql, days = 7) {
  if (!(await reviewsReady(db))) return [];
  return db.query<{ quoteId: string; reference: string; clientName: string; clientEmail: string }>(`SELECT q."id"::text AS "quoteId", q."reference", q."clientName", q."clientEmail"
    FROM "TakeoffJob" j JOIN "TakeoffQuote" q ON q."id" = j."quoteId"
    WHERE j."status" = 'COMPLETED' AND j."completedAt" IS NOT NULL AND j."completedAt" <= now() - ($1::int * interval '1 day') AND j."completedAt" > now() - interval '60 days'
      AND q."createdBy" <> 'DEMO'
      AND NOT EXISTS (SELECT 1 FROM "TakeoffReviewRequest" x WHERE x."quoteId" = q."id") AND NOT EXISTS (SELECT 1 FROM "TakeoffReview" r WHERE r."quoteId" = q."id")`, [days]);
}
export async function markReviewRequested(db: Sql, quoteId: string) {
  await db.query(`INSERT INTO "TakeoffReviewRequest" ("quoteId") VALUES ($1::uuid) ON CONFLICT DO NOTHING`, [quoteId]);
}
