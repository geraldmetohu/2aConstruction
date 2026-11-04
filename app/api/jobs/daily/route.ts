import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { companyOverview, db, jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { listJobs } from "@/app/lib/takeoff/jobs-store";
import { mailConfigured, sendMail, siteUrl } from "@/app/lib/takeoff/mail.server";

export const dynamic = "force-dynamic";

function authorised(req: Request) {
  const secret = process.env.TAKEOFF_CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 24 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/**
 * Daily automation (call once each morning, e.g. 06:30): emails the office a digest (orders for the next days,
 * payments due / overdue, client answers and messages, team owed) and reminds clients about items they must
 * order and payments due within 3 days. Without email set up it just returns the digest.
 */
async function run(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!(await jobsAvailable())) return NextResponse.json({ ok: false, reason: "Jobs tables not set up" });
  const o = await companyOverview();
  const base = siteUrl();
  const lines = o.todos.map(t => `• ${t.text}${base ? `\n  ${base}${t.href}` : ""}`);
  const digest = `Good morning,\n\n${lines.length ? `Today (${o.today}) these need you:\n\n${lines.join("\n")}` : "Nothing urgent today."}\n\nMoney: ${Math.round(o.finance.outstanding)} to collect, ${Math.round(o.finance.overdue)} overdue, team owed ${Math.round(o.finance.owedToTeam)}.\n`;
  const sent: string[] = [];
  const admins = (process.env.ADMIN_EMAILS ?? "").split(/[,;\s]+/).filter(Boolean);
  if (mailConfigured() && admins.length) { const r = await sendMail({ to: admins, subject: `2A Construction – today's list (${o.todos.length})`, text: digest }); if (r.sent) sent.push("office digest"); }

  // Client reminders: items to order within 5 days, payments due within 3 days.
  if (mailConfigured()) {
    for (const j of (await listJobs(db())).filter(x => x.status !== "COMPLETED")) {
      const job = await loadJob(j.quoteId, { forClient: true });
      if (!job) continue;
      const items = job.supplies.filter(s => s.status === "TO_ORDER" && s.daysLeft !== undefined && s.daysLeft <= 5 && s.daysLeft >= -2);
      const pays = job.money.rows.filter(r => r.balance > 0 && r.date && (r.state === "DUE" || r.state === "OVERDUE"));
      if (!items.length && !pays.length) continue;
      const text = `Hello ${j.clientName.split(" ")[0]},\n\nA quick reminder about your project at ${j.siteAddress}:\n\n${items.map(s => `• Please order: ${s.item} – ${s.quantity} ${s.unit}${s.spec ? ` (${s.spec})` : ""}, needed by ${s.neededBy}`).join("\n")}${items.length && pays.length ? "\n" : ""}${pays.map(r => `• ${r.label}: £${r.balance.toFixed(2)} ${r.state === "OVERDUE" ? "was due" : "is due"} on ${r.date}`).join("\n")}\n\nYou can see everything and let us know in your project panel${base ? `: ${base}/my-quotes/${j.quoteId}` : "."}\n\nThank you,\n2A Construction`;
      const r = await sendMail({ to: j.clientEmail, subject: `Your project ${j.reference} – reminder`, text });
      if (r.sent) sent.push(`client ${j.reference}`);
    }
  }
  return NextResponse.json({ ok: true, todos: o.todos.length, orders: o.orders.length, emailed: sent, email: mailConfigured() });
}
export const GET = run;
export const POST = run;
