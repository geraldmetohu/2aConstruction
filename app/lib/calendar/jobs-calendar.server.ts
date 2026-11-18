import "server-only";
import { createHash } from "node:crypto";
import { listJobs } from "@/app/lib/takeoff/jobs-store";
import { db, loadJob } from "@/app/lib/takeoff/jobs.server";
import { siteUrl } from "@/app/lib/takeoff/mail.server";
import type { CalEvent } from "./ics";

const h = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Everything dated on live jobs: each stage, stage payments due, and questions the client must answer by a date. */
export async function jobsCalendar(): Promise<CalEvent[]> {
  const base = siteUrl() || "https://2aconstruction.co.uk";
  const events: CalEvent[] = [];
  const jobs = (await listJobs(db())).filter(j => j.status !== "COMPLETED");
  for (const j of jobs) {
    const job = await loadJob(j.quoteId).catch(() => null);
    if (!job) continue;
    const url = `${base}/dashboard/jobs/${j.quoteId}`, where = j.siteAddress.replace(/\n/g, ", ");
    const tag = `${j.reference} ${j.clientName}`;
    for (const s of job.progress.stages) {
      if (!s.start) continue;
      events.push({ uid: `${j.quoteId}-stage-${h(s.stage)}@2aconstruction.co.uk`, title: `${s.status === "DONE" ? "✓ " : ""}${s.label} – ${tag}`, start: s.start, end: s.end ?? s.start,
        description: `${s.days} working day${s.days === 1 ? "" : "s"} · ${s.status === "DONE" ? "done" : s.status === "IN_PROGRESS" ? `in progress (${s.percent}%)` : "not started"}${s.note ? `\n${s.note}` : ""}\n${url}`,
        location: where, url, category: "Stage" });
    }
    for (const r of job.money.rows) {
      if (!r.date || r.balance <= 0) continue;
      events.push({ uid: `${j.quoteId}-pay-${r.n}@2aconstruction.co.uk`, title: `£ ${r.label} due ${gbp(r.balance)} – ${tag}`, start: r.date, description: `${r.when}\n${url}?tab=money`, url: `${url}?tab=money`, category: "Payment" });
    }
    for (const a of job.actions) {
      if (a.status !== "OPEN" || !a.dueDate) continue;
      events.push({ uid: `${j.quoteId}-ask-${a.id}@2aconstruction.co.uk`, title: `? Client to answer: ${a.title} – ${tag}`, start: a.dueDate, description: `${a.detail}\n${url}?tab=client`, url: `${url}?tab=client`, category: "Client" });
    }
  }
  return events;
}
