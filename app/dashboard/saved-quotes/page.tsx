import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { listQuotes, prismaDb, storageReady } from "@/app/lib/takeoff/store";

export const metadata: Metadata = { title: "Saved quotes" };
export const dynamic = "force-dynamic";

const tone: Record<string, string> = { DRAFT: "bg-neutral-100 text-neutral-700", SENT: "bg-amber-100 text-amber-800", ACCEPTED: "bg-emerald-100 text-emerald-800", DECLINED: "bg-red-100 text-red-800" };
const label: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", DECLINED: "Declined" };

export default async function SavedQuotesPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) return (
    <div className="rounded-2xl border bg-white p-6"><h1 className="text-xl font-black">Saved quotes</h1>
      <p className="mt-2 text-sm text-neutral-600">Saving quotes needs the new database tables. Apply migration <code>20261101120000_add_takeoff_quotes</code>, then quotes saved from the calculator appear here.</p></div>
  );
  const quotes = await listQuotes(db);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-black">Saved quotes</h1><p className="text-sm text-neutral-600">Drafts are only visible to you. Sent quotes are visible to the client when they log in with their email.</p></div>
        <Link href="/dashboard/calculator" className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New quote</Link>
      </header>
      {quotes.length === 0 && <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-neutral-600">No saved quotes yet.</p>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-2">Quote</th><th className="px-2">Client</th><th className="px-2">Status</th><th className="px-2 text-right">Total inc. VAT</th><th className="px-4 text-right">Updated</th></tr></thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id} className="border-t hover:bg-amber-50/40">
                <td className="px-4 py-3"><Link href={`/dashboard/calculator?quote=${q.id}`} className="font-semibold hover:underline">{q.reference}</Link><span className="block text-xs text-neutral-500">{q.siteAddress || "No address"} · v{q.currentVersion}</span></td>
                <td className="px-2 py-3">{q.clientName}<span className="block text-xs text-neutral-500">{q.clientEmail}</span></td>
                <td className="px-2 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone[q.status]}`}>{label[q.status]}</span>
                  {q.unread > 0 && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"><Bell className="h-3 w-3" />{q.unread} from client</span>}</td>
                <td className="px-2 py-3 text-right font-semibold">{q.gross != null ? `£${Math.round(q.gross).toLocaleString("en-GB")}` : "–"}</td>
                <td className="px-4 py-3 text-right text-xs text-neutral-500">{new Date(q.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
