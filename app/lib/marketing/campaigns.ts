// Saved templates and the record of every campaign sent (who got it and what it said).
// Pure store functions (no "server-only") so tests can run them.
import type { Sql } from "../takeoff/store";
import type { EmailContent } from "./templates";

export interface SavedTemplate { id: string; name: string; content: EmailContent; createdBy: string; updatedAt: Date }
export interface CampaignRow { id: string; name: string; subject: string; fromAddress: string; recipients: number; broadcastId: string | null; status: "DRAFT" | "SENDING" | "SENT" | "FAILED"; error: string; createdBy: string; createdAt: Date; sentAt: Date | null }

export async function listTemplates(db: Sql): Promise<SavedTemplate[]> {
  return db.query<SavedTemplate>(`SELECT "id"::text AS "id", "name", "content", "createdBy", "updatedAt" FROM "MarketingTemplate" ORDER BY "updatedAt" DESC`);
}
export async function saveTemplate(db: Sql, t: { id?: string; name: string; content: EmailContent }, actor: string) {
  if (t.id) {
    const [r] = await db.query<{ id: string }>(`UPDATE "MarketingTemplate" SET "name" = $2, "content" = $3::jsonb, "updatedAt" = now() WHERE "id" = $1::uuid RETURNING "id"::text AS "id"`, [t.id, t.name, JSON.stringify(t.content)]);
    if (r) return r.id;
  }
  const [r] = await db.query<{ id: string }>(`INSERT INTO "MarketingTemplate" ("name", "content", "createdBy") VALUES ($1, $2::jsonb, $3) RETURNING "id"::text AS "id"`, [t.name, JSON.stringify(t.content), actor]);
  return r.id;
}
export async function deleteTemplate(db: Sql, id: string) {
  await db.query(`DELETE FROM "MarketingTemplate" WHERE "id" = $1::uuid`, [id]);
}

export async function createCampaign(db: Sql, c: { name: string; subject: string; fromAddress: string; content: EmailContent; html: string; recipients: { email: string; name: string; basis: string }[] }, actor: string) {
  const [row] = await db.query<{ id: string }>(`INSERT INTO "MarketingCampaign" ("name", "subject", "fromAddress", "content", "html", "recipients", "status", "createdBy")
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'SENDING', $7) RETURNING "id"::text AS "id"`, [c.name, c.subject, c.fromAddress, JSON.stringify(c.content), c.html, c.recipients.length, actor]);
  for (let i = 0; i < c.recipients.length; i += 200) {
    const part = c.recipients.slice(i, i + 200);
    await db.query(`INSERT INTO "MarketingCampaignRecipient" ("campaignId", "email", "name", "basis")
      SELECT $1::uuid, x.email, x.name, x.basis FROM jsonb_to_recordset($2::jsonb) AS x(email text, name text, basis text) ON CONFLICT DO NOTHING`, [row.id, JSON.stringify(part)]);
  }
  return row.id;
}
export async function finishCampaign(db: Sql, id: string, r: { broadcastId?: string; error?: string }) {
  await db.query(`UPDATE "MarketingCampaign" SET "status" = $2, "broadcastId" = $3, "error" = $4, "sentAt" = CASE WHEN $2 = 'SENT' THEN now() ELSE NULL END WHERE "id" = $1::uuid`,
    [id, r.error ? "FAILED" : "SENT", r.broadcastId ?? null, (r.error ?? "").slice(0, 1000)]);
}
export async function listCampaigns(db: Sql, limit = 50): Promise<CampaignRow[]> {
  return db.query<CampaignRow>(`SELECT "id"::text AS "id", "name", "subject", "fromAddress", "recipients", "broadcastId", "status", "error", "createdBy", "createdAt", "sentAt" FROM "MarketingCampaign" ORDER BY "createdAt" DESC LIMIT $1`, [limit]);
}
export async function campaignRecipients(db: Sql, id: string) {
  return db.query<{ email: string; name: string; basis: string }>(`SELECT "email", "name", "basis" FROM "MarketingCampaignRecipient" WHERE "campaignId" = $1::uuid ORDER BY "email"`, [id]);
}
/** People emailed in the last `days` days (to avoid emailing someone too often). */
export async function recentlyEmailed(db: Sql, days = 14): Promise<Map<string, Date>> {
  const rows = await db.query<{ email: string; at: Date }>(`SELECT r."email", max(c."sentAt") AS "at" FROM "MarketingCampaignRecipient" r JOIN "MarketingCampaign" c ON c."id" = r."campaignId"
    WHERE c."status" = 'SENT' AND c."sentAt" > now() - ($1::int * interval '1 day') GROUP BY r."email"`, [days]);
  return new Map(rows.map(r => [r.email, r.at]));
}
