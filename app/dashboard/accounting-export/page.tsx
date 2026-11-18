import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";

export const metadata: Metadata = { title: "Accounting export" };
export const dynamic = "force-dynamic";

/** UK tax year (6 April – 5 April) containing today, and the last 3 full months. */
function ranges(today = new Date()) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const y = today.getUTCFullYear(), m = today.getUTCMonth();
  const tyStart = new Date(Date.UTC(today >= new Date(Date.UTC(y, 3, 6)) ? y : y - 1, 3, 6));
  const tyEnd = new Date(Date.UTC(tyStart.getUTCFullYear() + 1, 3, 5));
  const qStart = new Date(Date.UTC(y, m - 3, 1)), qEnd = new Date(Date.UTC(y, m, 0));
  return { tyStart: iso(tyStart), tyEnd: iso(tyEnd), qStart: iso(qStart), qEnd: iso(qEnd), monthStart: iso(new Date(Date.UTC(y, m, 1))), today: iso(today) };
}

export default async function AccountingExportPage() {
  await requireCatalogueAdmin();
  const r = ranges();
  const files = [
    ["xero-sales", "Xero – sales invoices", "Every invoice raised (net, VAT, client, job). In Xero: Business → Invoices → Import. Choose “amounts are tax exclusive”."],
    ["xero-bills", "Xero – bills (costs)", "Every job cost and running cost with its account code and VAT. In Xero: Business → Bills to pay → Import. Tax payments, loans and transfers are left out."],
    ["transactions", "All money in and out (CSV)", "One line per payment in or out – for QuickBooks, FreeAgent, Sage, or your accountant's spreadsheet."],
  ];
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Accounting export</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Download your figures for Xero, QuickBooks or your accountant – the same numbers as the Finance pages. Account codes use Xero&apos;s standard UK chart (materials and subcontractors go to 310 Cost of Goods Sold); you can change them in Xero&apos;s import screen.</p>
      </header>
      <form method="get" action="/api/finance/export" className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">What to download</legend>
          {files.map(([k, title, hint], i) => <label key={k} className="flex items-start gap-2 text-sm"><input type="radio" name="kind" value={k} defaultChecked={i === 0} className="mt-1" /><span><strong>{title}</strong><span className="block text-xs text-neutral-600">{hint}</span></span></label>)}
        </fieldset>
        <label className="text-sm font-semibold">From<input type="date" name="from" defaultValue={r.tyStart} required className="mt-1 block h-10 rounded-lg border px-2" /></label>
        <label className="text-sm font-semibold">To<input type="date" name="to" defaultValue={r.tyEnd} required className="mt-1 block h-10 rounded-lg border px-2" /></label>
        <button className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-bold text-white"><Download className="h-4 w-4" />Download CSV</button>
      </form>
      <p className="text-xs text-neutral-500">Quick ranges: this tax year {r.tyStart} → {r.tyEnd} (default) · last 3 months {r.qStart} → {r.qEnd} · this month {r.monthStart} → {r.today}.</p>
    </div>
  );
}
