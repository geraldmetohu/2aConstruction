import type { Metadata } from "next";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { listAssignments, listCheckIns, listJobs, workerByToken } from "@/app/lib/takeoff/jobs-store";
import { hashCrewToken } from "@/app/lib/takeoff/crew-token.server";
import { londonDay } from "@/app/lib/takeoff/jobs";
import { CrewCheckIn } from "./CrewCheckIn";

export const metadata: Metadata = { title: "Site check-in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CrewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bad = <main className="mx-auto max-w-md p-6 text-center"><h1 className="text-xl font-bold">Link not valid</h1><p className="mt-2 text-neutral-600">Ask the office for a new check-in link.</p></main>;
  if (!(await jobsAvailable()) || token.length < 20 || token.length > 100) return bad;
  const d = db();
  const w = await workerByToken(d, hashCrewToken(token));
  if (!w) return bad;
  const [assignments, jobs, checkIns] = await Promise.all([listAssignments(d, { workerId: w.id, activeOnly: true }), listJobs(d), listCheckIns(d, { workerId: w.id, sinceDays: 2 })]);
  const today = londonDay(new Date());
  const sites = assignments.map(a => {
    const j = jobs.find(x => x.quoteId === a.quoteId);
    const mine = checkIns.filter(c => c.quoteId === a.quoteId && londonDay(c.at) === today);
    const last = mine[mine.length - 1];
    return { quoteId: a.quoteId, name: j?.siteAddress || j?.reference || "Site", reference: j?.reference ?? "", status: j?.status ?? "PLANNED",
      inside: last?.kind === "IN", times: mine.map(c => `${c.kind === "IN" ? "In" : "Out"} ${new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`) };
  }).filter(s => s.status !== "COMPLETED");
  return <CrewCheckIn token={token} name={w.name} sites={sites} />;
}
