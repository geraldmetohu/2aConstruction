// The office digest: client portal activity is queued and emailed to the office as ONE list (hourly),
// never one email per change, and nothing at all when nothing happened.
// Pure store functions (no "server-only") so tests can run them.
import { randomUUID } from "node:crypto";
import type { Sql } from "./store";

export interface Notice { id: string; quoteId: string; kind: string; heading: string; detail: string; link: string; replyTo: string; createdAt: Date; reference: string; clientName: string; clientEmail: string }

export async function digestReady(db: Sql): Promise<boolean> {
  try { const [r] = await db.query<{ ok: boolean }>(`SELECT to_regclass('"TakeoffOfficeNotice"') IS NOT NULL AS ok`); return !!r?.ok; } catch { return false; }
}

/** Queue one client action for the next digest. Returns false if the table isn't there yet (caller then emails at once). */
export async function queueNotice(db: Sql, n: { quoteId: string; kind: string; heading: string; detail: string; link: string; replyTo?: string }): Promise<boolean> {
  if (!(await digestReady(db))) return false;
  await db.query(`INSERT INTO "TakeoffOfficeNotice" ("quoteId", "kind", "heading", "detail", "link", "replyTo") VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
    [n.quoteId, n.kind, n.heading.slice(0, 300), n.detail.slice(0, 4000), n.link.slice(0, 500), (n.replyTo ?? "").slice(0, 300)]);
  return true;
}

/** Minutes since the oldest notice still waiting (null when none). */
export async function oldestWaitingMinutes(db: Sql): Promise<number | null> {
  if (!(await digestReady(db))) return null;
  const [r] = await db.query<{ m: number | null }>(`SELECT EXTRACT(EPOCH FROM (now() - min("createdAt")))::float8 / 60 AS m FROM "TakeoffOfficeNotice" WHERE "sentAt" IS NULL`);
  return r?.m ?? null;
}

/** Claim every waiting notice in one go (so two runs can never send the same item twice). */
export async function claimNotices(db: Sql): Promise<{ batch: string; notices: Notice[] }> {
  const batch = randomUUID();
  if (!(await digestReady(db))) return { batch, notices: [] };
  const notices = await db.query<Notice>(`WITH c AS (
      UPDATE "TakeoffOfficeNotice" SET "sentAt" = now(), "batch" = $1::uuid WHERE "sentAt" IS NULL RETURNING *)
    SELECT c."id"::text AS "id", c."quoteId"::text AS "quoteId", c."kind", c."heading", c."detail", c."link", c."replyTo", c."createdAt",
      q."reference", q."clientName", q."clientEmail"
    FROM c JOIN "TakeoffQuote" q ON q."id" = c."quoteId" ORDER BY q."reference", c."createdAt"`, [batch]);
  return { batch, notices };
}

/** Put a claimed batch back in the queue (the email failed). */
export async function releaseBatch(db: Sql, batch: string) {
  await db.query(`UPDATE "TakeoffOfficeNotice" SET "sentAt" = NULL, "batch" = NULL WHERE "batch" = $1::uuid`, [batch]);
}

const time = (d: Date) => new Date(d).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit" });

/** The digest email body: one block per project, one line per change. */
export function digestContent(notices: Notice[], base: string) {
  const byJob = new Map<string, Notice[]>();
  for (const n of notices) byJob.set(n.quoteId, [...(byJob.get(n.quoteId) ?? []), n]);
  const jobs = [...byJob.values()];
  const subject = `Client portal: ${notices.length} update${notices.length === 1 ? "" : "s"}${jobs.length > 1 ? ` on ${jobs.length} projects` : ` – ${jobs[0][0].clientName} (${jobs[0][0].reference})`}`;
  const blocks = jobs.map(list => ({
    title: `${list[0].clientName} – ${list[0].reference}`,
    link: `${base}/dashboard/jobs/${list[0].quoteId}`,
    lines: list.map(n => ({ when: time(n.createdAt), heading: n.heading, detail: n.detail, link: n.link })),
  }));
  const text = [`${notices.length} change${notices.length === 1 ? "" : "s"} in the client portal since the last update:`, "",
    ...blocks.flatMap(b => [b.title, ...b.lines.map(l => `  • ${l.when} – ${l.heading}${l.detail ? `: ${l.detail}` : ""}`), `  Open: ${b.link}`, ""]), "2A Construction Ltd"].join("\n");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#071a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#071a33;padding:22px 28px"><span style="font-size:13px;letter-spacing:3px;font-weight:700;color:#f5b400">2A CONSTRUCTION</span></td></tr>
<tr><td style="padding:26px 28px">
<h1 style="margin:0 0 6px;font-size:21px">${notices.length} change${notices.length === 1 ? "" : "s"} in the client portal</h1>
<p style="margin:0 0 18px;font-size:14px;color:#6b7690">Everything clients did since the last update, grouped by project.</p>
${blocks.map(b => `<div style="margin:0 0 18px;border:1px solid #e3e6ec;border-radius:10px;overflow:hidden">
<div style="background:#f8f9fb;padding:10px 14px;font-weight:700;font-size:15px">${esc(b.title)} <a href="${esc(b.link)}" style="float:right;font-size:13px;color:#b07d00;font-weight:600">Open job →</a></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${b.lines.map(l => `<tr><td style="padding:9px 14px;border-top:1px solid #eef0f4;font-size:12px;color:#6b7690;white-space:nowrap;vertical-align:top;width:86px">${esc(l.when)}</td>
<td style="padding:9px 14px 9px 0;border-top:1px solid #eef0f4;font-size:14px;line-height:1.5"><a href="${esc(l.link)}" style="color:#071a33;font-weight:600;text-decoration:none">${esc(l.heading)}</a>${l.detail ? `<br><span style="color:#33415c">${esc(l.detail)}</span>` : ""}</td></tr>`).join("")}</table></div>`).join("")}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8f9fb;font-size:12px;color:#6b7690">Sent once an hour, only when something has changed.</td></tr>
</table></td></tr></table></body></html>`;
  const replyTo = blocks.length === 1 ? notices.find(n => n.replyTo)?.replyTo : undefined;
  return { subject, text, html, replyTo };
}
