import type { Metadata } from "next";
import Link from "next/link";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db, jobsAvailable } from "@/app/lib/takeoff/jobs.server";
import { listJobs } from "@/app/lib/takeoff/jobs-store";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const tone = { PLANNED: "bg-sky-100 text-sky-800", IN_PROGRESS: "bg-amber-100 text-amber-800", ON_HOLD: "bg-red-100 text-red-800", COMPLETED: "bg-emerald-100 text-emerald-800" } as const;
const label = { PLANNED: "Planned", IN_PROGRESS: "In progress", ON_HOLD: "On hold", COMPLETED: "Completed" } as const;

export default async function JobsPage() {
  await requireCatalogueAdmin();
  if (!(await jobsAvailable())) return <main className="p-6"><h1 className="text-2xl font-black">Jobs</h1><p className="mt-2 text-sm text-amber-900">Jobs need the new database tables: apply migrations 20261101120000_add_takeoff_quotes and 20261102120000_add_takeoff_jobs.</p></main>;
  const jobs = await listJobs(db());
  return (
    <main className="space-y-5 p-6">
      <div><h1 className="text-2xl font-black">Jobs</h1><p className="text-sm text-neutral-600">Accepted quotes. Open a job for progress, photos, client requests, payments, team and orders.</p></div>
      {!jobs.length && <p className="rounded-xl border bg-white p-6 text-sm text-neutral-600">No accepted quotes yet. When a client accepts a quote in their portal it appears here.</p>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-2">Job</th><th>Status</th><th>Start</th><th className="text-right">Contract</th><th className="text-right">Received</th><th className="px-4 text-right">Needs you</th></tr></thead>
          <tbody>{jobs.map(j => (
            <tr key={j.quoteId} className="border-t hover:bg-amber-50">
              <td className="px-4 py-3"><Link href={`/dashboard/jobs/${j.quoteId}`} className="font-semibold hover:underline">{j.clientName}</Link><span className="block text-xs text-neutral-500">{j.reference} · {j.siteAddress}</span></td>
              <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone[j.status]}`}>{label[j.status]}</span></td>
              <td>{j.startDate ?? "—"}</td>
              <td className="text-right">{gbp(j.gross)}</td>
              <td className="text-right">{gbp(j.received)}{j.reported > 0 && <span className="block text-xs text-amber-700">+{gbp(j.reported)} to confirm</span>}</td>
              <td className="px-4 text-right text-xs">{[j.unread && `${j.unread} new`, j.openActions && `${j.openActions} open requests`].filter(Boolean).join(" · ") || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
