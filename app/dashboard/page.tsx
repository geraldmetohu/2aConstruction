import Link from "next/link";
import { Banknote, ChevronRight, Package, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { navSections } from "../componets/dashboard/nav-config";
import { companyOverview, jobsAvailable } from "../lib/takeoff/jobs.server";
import { FinanceChart } from "./FinanceChart";

export const dynamic = "force-dynamic";
const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const levelTone = { urgent: "border-red-300 bg-red-50", soon: "border-amber-300 bg-amber-50", info: "border-neutral-200 bg-white" } as const;

/** Activity panel: what needs doing, and how the business is doing. */
async function ActivityPanel() {
  let o: Awaited<ReturnType<typeof companyOverview>>;
  try { if (!(await jobsAvailable())) return null; o = await companyOverview(); } catch { return null; }
  const f = o.finance;
  const profit12 = f.months.reduce((s, m) => s + m.profit, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          [TrendingUp, "Turnover (12 months)", gbp(f.turnover12), `${gbp(f.thisMonthIn)} this month`],
          [Wallet, "Profit (12 months, ex VAT)", gbp(profit12), `Money out ${gbp(f.out12)}`],
          [Banknote, "Still to collect", gbp(f.outstanding), f.overdue ? `${gbp(f.overdue)} overdue` : `${gbp(f.dueSoon)} due this week`],
          [Package, "Active jobs", String(f.activeJobs), `${gbp(f.contractActive)} contracts · team owed ${gbp(f.owedToTeam)}`],
        ] as const).map(([Icon, label, value, sub]) => (
          <div key={label} className="rounded-xl border bg-white p-4"><p className="flex items-center gap-2 text-xs font-semibold text-neutral-500"><Icon className="h-4 w-4 text-amber-600" />{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p><p className={`text-xs ${label === "Still to collect" && f.overdue ? "font-semibold text-red-700" : "text-neutral-500"}`}>{sub}</p></div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-xl border bg-white p-4 xl:col-span-2">
          <h3 className="flex items-center gap-2 font-bold"><TriangleAlert className="h-5 w-5 text-amber-600" />Needs you {o.todos.length > 0 && <span className="rounded-full bg-neutral-900 px-2 text-xs text-white">{o.todos.length}</span>}</h3>
          <ul className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto">{o.todos.map((t, i) => (
            <li key={i}><Link href={t.href} className={`block rounded-lg border px-3 py-2 text-sm hover:shadow-sm ${levelTone[t.level]}`}>{t.text}</Link></li>
          ))}{!o.todos.length && <li className="text-sm text-neutral-500">All clear. Nothing urgent.</li>}</ul>
        </section>
        <section className="rounded-xl border bg-white p-4 xl:col-span-3">
          <h3 className="font-bold">Money in & out</h3><p className="text-xs text-neutral-500">Confirmed client payments vs recorded spending (materials, labour, subcontractors, plant) per month.</p>
          <FinanceChart data={f.months} />
        </section>
      </div>
      {o.orders.length > 0 && <section className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-bold"><Package className="h-5 w-5" />Order for the next days</h3>
        <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{o.orders.map((x, i) => <li key={i}><Link className="hover:underline" href={`/dashboard/jobs/${x.quoteId}?tab=orders`}><strong>{x.reference}</strong> – {x.label}: {x.items} items (starts {x.start})</Link></li>)}</ul></section>}
    </div>
  );
}

export default async function Dashboard() {
  const sections = navSections.filter(s => s.title !== "Overview" || s.links.length > 1)
    .map(s => ({ ...s, links: s.links.filter(l => l.href !== "/dashboard") }));
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-neutral-900">Welcome back</h2>
        <p className="mt-1 text-sm text-neutral-600">What needs you today, how the business is doing, and everything else below.</p>
      </div>
      {await ActivityPanel()}
      {sections.map(section => (
        <section key={section.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{section.title}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {section.links.map(link => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-neutral-950"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-semibold text-neutral-900">{link.name}<ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-amber-600" /></span>
                    {link.hint && <span className="mt-0.5 block text-xs text-neutral-500">{link.hint}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
