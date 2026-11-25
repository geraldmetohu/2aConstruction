import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FileDown, Plus } from "lucide-react";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { PROJECT_TYPES, projectType } from "@/app/lib/site-visit/template";
import { VISIT_STATUSES, listVisits, visitsReady } from "@/app/lib/site-visit/store";
import { createVisitAction, importVisitAction } from "./actions";

export const metadata: Metadata = { title: "Site visits" };
export const dynamic = "force-dynamic";

const field = "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const tone: Record<string, string> = { PLANNED: "bg-sky-100 text-sky-800", IN_PROGRESS: "bg-amber-100 text-amber-900", DONE: "bg-violet-100 text-violet-800", QUOTED: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-neutral-200 text-neutral-600" };
const when = (d: Date | null) => d ? new Date(d).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No date yet";

export default async function SiteVisitsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireCatalogueAdmin();
  const { show } = await searchParams;
  const db = prismaDb(prisma);
  const ready = await visitsReady(db);
  const all = show === "all";
  const rows = ready ? await listVisits(db, { status: all ? undefined : "OPEN" }) : [];
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black"><ClipboardList className="h-6 w-6 text-amber-600" />Site visits</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Prepare each visit beforehand, fill it in on site from good morning to goodbye, download it as a PDF, then turn it into a draft quote. The measurements and finishes go straight into the calculator; check the structure and materials there before sending.</p>
      </header>

      {!ready && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Needs the database update 20261125120000_site_visits (run <code>npx prisma migrate deploy</code>). You can still print a blank form below.</p>}

      <section className="rounded-2xl border bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5" />Prepare a visit</h2>
        <form action={createVisitAction} className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-neutral-700">Client name<input name="clientName" className={field} autoComplete="off" /></label>
            <label className="text-xs font-semibold text-neutral-700">Phone<input name="clientPhone" type="tel" className={field} /></label>
            <label className="text-xs font-semibold text-neutral-700">Email<input name="clientEmail" type="email" className={field} /></label>
            <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">Site address<input name="siteAddress" className={field} /></label>
            <label className="text-xs font-semibold text-neutral-700">Postcode<input name="postcode" className={field} /></label>
            <label className="text-xs font-semibold text-neutral-700">Visit date and time<input name="visitAt" type="datetime-local" className={field} /></label>
          </div>
          <fieldset>
            <legend className="text-xs font-semibold text-neutral-700">Type of project (pick all that apply)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PROJECT_TYPES.map(p => <label key={p.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                <input type="checkbox" name="projectTypes" value={p.id} className="h-4 w-4 accent-amber-600" />{p.label}</label>)}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button disabled={!ready} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Prepare the visit</button>
          </div>
        </form>
        <details className="mt-4 border-t pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Open a visit prepared from drawings (.json file)</summary>
          <form action={importVisitAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="file" name="file" accept="application/json,.json" required className="text-sm" />
            <button disabled={!ready} className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-40">Open it</button>
          </form>
        </details>
        <details className="mt-4 border-t pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Print a blank form instead</summary>
          <form action="/dashboard/site-visits/blank-pdf" method="get" target="_blank" className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">{PROJECT_TYPES.map(p => <label key={p.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
              <input type="checkbox" name="types" value={p.id} className="h-3.5 w-3.5 accent-amber-600" />{p.label}</label>)}</div>
            <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"><FileDown className="h-4 w-4" />Blank PDF</button>
          </form>
        </details>
      </section>

      {ready && <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{all ? "All visits" : "Upcoming and open visits"}</h2>
          <Link href={all ? "/dashboard/site-visits" : "/dashboard/site-visits?show=all"} className="text-sm font-semibold text-amber-700 hover:underline">{all ? "Show open only" : "Show all, including quoted"}</Link>
        </div>
        {!rows.length ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500">No visits yet. Prepare one above.</p> :
          <ul className="divide-y rounded-2xl border bg-white">
            {rows.map(v => <li key={v.id}><Link href={`/dashboard/site-visits/${v.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-neutral-50">
              <span className="w-44 shrink-0 text-sm font-semibold">{when(v.visitAt)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{v.clientName || "Client not named yet"}</span>
                <span className="block truncate text-xs text-neutral-500">{[v.siteAddress, v.postcode].filter(Boolean).join(", ") || "No address"} · {v.projectTypes.map(t => projectType(t)?.label ?? t).join(", ") || "No project type"}</span></span>
              <span className="text-xs text-neutral-500">{v.reference}{v.quoteReference ? ` → ${v.quoteReference}` : ""}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[v.status]}`}>{VISIT_STATUSES.find(([k]) => k === v.status)?.[1]}</span>
            </Link></li>)}
          </ul>}
      </section>}
    </div>
  );
}
