import "server-only";
import { after } from "next/server";
import { mailConfigured, officeInbox, sendMail, siteUrl } from "./mail.server";
import { claimNotices, digestContent, oldestWaitingMinutes, releaseBatch } from "./office-digest";
import type { Sql } from "./store";

/** Email everything waiting as one digest. Does nothing (and sends nothing) when the queue is empty.
 *  With `ifOlderThanMinutes`, only sends when the oldest waiting item is at least that old. */
export async function sendOfficeDigest(db: Sql, opts: { ifOlderThanMinutes?: number } = {}): Promise<{ sent: number; reason?: string }> {
  if (!mailConfigured()) return { sent: 0, reason: "email not set up" };
  const to = officeInbox(); if (!to.length) return { sent: 0, reason: "no office inbox" };
  const age = await oldestWaitingMinutes(db);
  if (age === null) return { sent: 0, reason: "nothing waiting" };
  if (opts.ifOlderThanMinutes !== undefined && age < opts.ifOlderThanMinutes) return { sent: 0, reason: "not due yet" };
  const { batch, notices } = await claimNotices(db);
  if (!notices.length) return { sent: 0, reason: "nothing waiting" };
  const m = digestContent(notices, siteUrl() || "https://2aconstruction.co.uk");
  try {
    const r = await sendMail({ to, subject: m.subject, text: m.text, html: m.html, ...(m.replyTo ? { replyTo: m.replyTo } : {}) });
    if (!r.sent) { await releaseBatch(db, batch); return { sent: 0, reason: r.reason ?? "email failed" }; }
  } catch (e) { await releaseBatch(db, batch); throw e; }
  return { sent: notices.length };
}

// The hourly send is driven by the site's own traffic: on page views (at most one check every 5 minutes per
// server instance), once the oldest waiting change is an hour old the digest goes out – after the page has been
// sent, so nobody waits for it. The 06:30 daily run sends anything left overnight. An external hourly
// schedule (e.g. GitHub Actions calling /api/jobs/office-digest) is optional on top.
let lastCheck = 0;
export function digestTick(db: Sql) {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const now = Date.now();
  if (now - lastCheck < 5 * 60_000) return;
  lastCheck = now;
  try {
    after(() => sendOfficeDigest(db, { ifOlderThanMinutes: 60 }).catch(e => console.error("[office-digest] tick", e)));
  } catch { /* not inside a request */ }
}
