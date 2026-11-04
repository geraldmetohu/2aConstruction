import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { listAssignments, listCheckIns, listExpenses, listJobs, listWorkers } from "@/app/lib/takeoff/jobs-store";
import { payOwed } from "@/app/lib/takeoff/jobs";
import { mailConfigured } from "@/app/lib/takeoff/mail.server";
import { TeamManager } from "./TeamManager";

export const metadata: Metadata = { title: "Workers & subcontractors" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireCatalogueAdmin();
  if (!(await jobsAvailable())) return <main className="p-6 text-sm text-amber-900">Workers need the new database tables (migration 20261102120000_add_takeoff_jobs).</main>;
  const d = db();
  const [workers, assignments, checkIns, expenses, jobs] = await Promise.all([listWorkers(d), listAssignments(d), listCheckIns(d), listExpenses(d), listJobs(d)]);
  const jobName = new Map(jobs.map(j => [j.quoteId, `${j.reference} · ${j.clientName}`]));
  const rows = workers.map(w => {
    const mine = assignments.filter(a => a.workerId === w.id);
    const owed = mine.map(a => ({ ...payOwed(a, checkIns, expenses, w.dayRate), job: jobName.get(a.quoteId) ?? a.quoteId, active: a.active }));
    return {
      ...w, createdAt: new Date(w.createdAt).toISOString(),
      jobs: owed, owed: owed.reduce((s, o) => s + Math.max(0, o.balance), 0), paid: expenses.filter(e => !e.void && e.workerId === w.id).reduce((s, e) => s + e.amount, 0),
      days: owed.reduce((s, o) => s + o.days, 0), activeJobs: mine.filter(a => a.active).length,
    };
  });
  return <TeamManager workers={rows} email={mailConfigured()} />;
}
