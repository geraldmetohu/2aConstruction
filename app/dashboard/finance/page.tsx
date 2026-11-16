import type { Metadata } from "next";
import Link from "next/link";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { listBankLines, listRules, listStatements, loadFinance, loadSuggestContext, db } from "@/app/lib/finance/reports.server";
import { suggest } from "@/app/lib/finance/bank-parse";
import { CIS_LABEL, FREQUENCY_LABEL, VAT_LABEL, category, ukDate } from "@/app/lib/finance/rules";
import type { FinanceReport, ReportInput } from "@/app/lib/finance/report";
import { BankLines, BankUpload, ReopenLine, type LineView } from "./bank";
import { CsvButton, Disclosure, EntryForm, ExpenseVat, JobCostCancel, JobCostForm, PayWorkerForm, RecurringForm, RecurringToggle, SettingsForm, VoidButton, WorkDaysForm, WorkerTaxForm, type JobOpt, type WorkerOpt } from "./forms";
import { Badge, Card, MonthBars, Num, Stat, Table, gbp, monthName, ukDay } from "./ui";

export const metadata: Metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

const TABS = [
  ["overview", "Overview"], ["jobs", "Jobs"], ["company", "Company costs"], ["workers", "Workers & CIS"], ["bank", "Bank"], ["cash", "Cash"], ["vat", "VAT"], ["year", "Year end"], ["settings", "Settings"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireCatalogueAdmin();
  const sp = await searchParams;
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as Tab;
  const f = await loadFinance();
  if (!f.ready) return (
    <main className="p-4 sm:p-6"><h1 className="text-2xl font-black">Finance</h1>
      <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Finance needs its database tables. Run <code>npx prisma migrate deploy</code> to apply <code>20261113120000_finance</code> (it only adds new tables and columns – nothing existing is changed).</p></main>
  );
  const { input, report: r } = f;
  const jobs: JobOpt[] = input.jobs.map(j => ({ id: j.quoteId, label: `${j.reference} – ${j.clientName}` }));
  const workers: WorkerOpt[] = input.workers.map(w => ({ id: w.id, name: w.name, kind: w.kind, cisStatus: w.cisStatus, vatNumber: w.vatNumber, dayRate: w.dayRate, utr: w.utr, verificationNumber: w.verificationNumber, active: w.active }));
  return (
    <main className="space-y-5 p-4 pb-16 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-2xl font-black">Finance</h1><p className="text-sm text-neutral-600">Jobs, company costs, workers & CIS, bank, cash, VAT and year end – worked out from what you record.</p></div>
        <p className="text-xs text-neutral-500">Figures are estimates to run the business; your accountant files the returns.</p>
      </div>
      <nav aria-label="Finance sections" className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map(([k, l]) => {
          const n = k === "bank" ? r.headline.bankToDo : k === "vat" ? r.alerts.filter(a => a.tab === "vat" && a.level !== "info").length : k === "workers" ? r.alerts.filter(a => a.tab === "workers" && a.level !== "info").length : 0;
          return <Link key={k} href={`/dashboard/finance?tab=${k}`} scroll={false} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === k ? "border-amber-500 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>{l}{n > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{n}</span>}</Link>;
        })}
      </nav>
      {tab === "overview" && <Overview r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "jobs" && <JobsTab r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "company" && <CompanyTab r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "workers" && <WorkersTab r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "bank" && <BankTab r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "cash" && <CashTab r={r} input={input} jobs={jobs} workers={workers} />}
      {tab === "vat" && <VatTab r={r} />}
      {tab === "year" && <YearTab r={r} />}
      {tab === "settings" && <Card title="Settings – entered once"><SettingsForm s={r.settings} /></Card>}
    </main>
  );
}

type P = { r: FinanceReport; input: ReportInput; jobs: JobOpt[]; workers: WorkerOpt[] };
const jobLabel = (input: ReportInput, id: string | null) => (id ? input.jobs.find(j => j.quoteId === id)?.reference ?? "job" : "Company");
const Alerts = ({ r, only }: { r: FinanceReport; only?: string }) => {
  const list = r.alerts.filter(a => !only || a.tab === only);
  if (!list.length) return null;
  return <ul className="space-y-1.5">{list.map((a, i) => (
    <li key={i}><Link href={`/dashboard/finance?tab=${a.tab}`} className={`block rounded-xl px-3 py-2 text-sm ${a.level === "urgent" ? "bg-red-50 text-red-900" : a.level === "warn" ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900"}`}>{a.text} →</Link></li>
  ))}</ul>;
};

// ---------------------------------------------------------------- Overview

function Overview({ r, input, jobs, workers }: P) {
  const h = r.headline, y = h.year;
  const plannedJobCost = input.jobs.reduce((s, j) => s + j.plannedCost, 0), actualJobCost = r.jobs.reduce((s, j) => s + j.actualCost, 0);
  const notInBank = r.notInBank.reduce((s, m) => s + m.amount, 0);
  return (
    <div className="space-y-5">
      <Alerts r={r} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="dark" label={y ? `This year to ${ukDay(y.end)}` : "This year"} value={y ? gbp(y.netProfit, { pence: false }) : "—"} sub={y ? `profit on ${gbp(y.turnover, { pence: false })} sales · ${y.monthsDone} months in` : "Enter the company dates in Settings"} />
        <Stat label="Corporation Tax so far" value={y ? gbp(y.ct, { pence: false }) : "—"} sub="Estimate on profit to date" />
        <Stat tone={h.vatNow && h.vatNow.box5 > 0 ? "warn" : "plain"} label="VAT this quarter" value={h.vatNow ? gbp(h.vatNow.box5, { pence: false }) : "—"} sub={h.vatNow ? `${h.vatNow.box5 >= 0 ? "to pay" : "to reclaim"} · due ${ukDay(h.vatNow.due)}` : "Set the VAT dates in Settings"} />
        <Stat label="Bank" value={gbp(h.bankBalance, { pence: false })} sub={h.bankDate ? `last statement ${ukDay(h.bankDate)}` : "upload a statement"} />
        <Stat tone={h.owedByClients > 0 ? "warn" : "plain"} label="Owed by clients" value={gbp(h.owedByClients, { pence: false })} sub="Invoiced, not paid yet" />
        <Stat label="To pay workers & subbies" value={gbp(h.owedToWorkers, { pence: false })} sub="Days worked & agreed prices not paid yet" />
        <Stat label="Cash box" value={gbp(h.cashBox, { pence: false })} sub="Cash in less cash out" />
        <Stat label="This month" value={gbp(h.thisMonth.cashIn - h.thisMonth.cashOut, { pence: false })} sub={`in ${gbp(h.thisMonth.cashIn, { pence: false })} · out ${gbp(h.thisMonth.cashOut, { pence: false })}`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Last 12 months" right="Money that really moved (bank and cash)"><MonthBars months={r.months} /></Card>
        <Card title="On paper vs real">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Job costs planned in quotes</dt><dd className="tabular-nums">{gbp(plannedJobCost, { pence: false })}</dd></div>
            <div className="flex justify-between"><dt>Job costs actually spent</dt><dd className={`tabular-nums font-semibold ${actualJobCost > plannedJobCost ? "text-red-700" : ""}`}>{gbp(actualJobCost, { pence: false })}</dd></div>
            <div className="flex justify-between border-t pt-2"><dt>Company costs expected this year</dt><dd className="tabular-nums">{gbp(r.company.thisYear.expected, { pence: false })}</dd></div>
            <div className="flex justify-between"><dt>Company costs actually paid this year</dt><dd className="tabular-nums font-semibold">{gbp(r.company.thisYear.actual, { pence: false })}</dd></div>
            <div className="flex justify-between border-t pt-2"><dt>Recorded but not seen in the bank</dt><dd className="tabular-nums">{r.notInBank.length} · {gbp(notInBank, { pence: false })}</dd></div>
            <div className="flex justify-between"><dt>In the bank but not sorted yet</dt><dd className="tabular-nums">{h.bankToDo} line{h.bankToDo === 1 ? "" : "s"}</dd></div>
          </dl>
          <Link href="/dashboard/finance?tab=bank" className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline">Check against the bank →</Link>
        </Card>
      </div>
      <Card title="Month by month" right={<CsvButton name="monthly.csv" rows={[["Month", "Sales", "Job costs", "Running costs", "Profit", "Money in", "Money out", "Tax paid"], ...r.months.map(m => [m.month, m.income, m.costs, m.overheads, m.profit, m.cashIn, m.cashOut, m.taxPaid])]} />}>
        <Table head={["Month", "Sales", "Job costs", "Running costs", "Profit", "Money in", "Money out"]} min={620}>
          {[...r.months].reverse().map(m => <tr key={m.month}><td className="py-2 pr-3 font-medium">{monthName(m.month)}</td><Num>{gbp(m.income, { pence: false })}</Num><Num>{gbp(m.costs, { pence: false })}</Num><Num>{gbp(m.overheads, { pence: false })}</Num><Num strong tone={m.profit >= 0 ? "good" : "bad"}>{gbp(m.profit, { pence: false })}</Num><Num>{gbp(m.cashIn, { pence: false })}</Num><Num>{gbp(m.cashOut, { pence: false })}</Num></tr>)}
        </Table>
      </Card>
      <Disclosure label="Add money in or out"><EntryForm jobs={jobs} workers={workers} recurring={input.recurring.filter(x => x.active)} jobCosts={input.jobCosts.filter(c => c.status === "OPEN")} /></Disclosure>
    </div>
  );
}

// ---------------------------------------------------------------- Jobs

function JobsTab({ r, input, jobs, workers }: P) {
  const missing = input.expenses.filter(e => !e.vat && e.vatTreatment === "OUTSIDE" && ["MATERIALS", "PLANT", "SKIPS", "FEES", "OTHER", "JOB_FEES", "JOB_OTHER"].includes(e.category));
  return (
    <div className="space-y-5">
      <Card title="Jobs – money and profit" right="Costs shown without VAT">
        <Table head={["Job", "Contract", "Invoiced", "Received", "Planned cost", "Spent", "Still to pay", "Profit so far", "Forecast profit"]} min={900}>
          {r.jobs.map(j => (
            <tr key={j.quoteId} className="align-top">
              <td className="py-2 pr-3"><Link href={`/dashboard/jobs/${j.quoteId}?tab=money`} className="font-semibold hover:underline">{j.reference}</Link><span className="block text-xs text-neutral-500">{j.clientName}</span><Badge tone={j.jobStatus === "COMPLETED" ? "green" : j.jobStatus === "IN_PROGRESS" ? "amber" : "grey"}>{j.jobStatus.replace("_", " ").toLowerCase()}</Badge></td>
              <Num>{gbp(j.contractGross, { pence: false })}</Num><Num>{gbp(j.invoiced, { pence: false })}</Num>
              <Num tone={j.received >= j.invoiced ? "good" : undefined}>{gbp(j.received, { pence: false })}{j.reported > 0 && <span className="block text-[11px] text-amber-700">+{gbp(j.reported, { pence: false })} to confirm</span>}</Num>
              <Num>{gbp(j.plannedCost, { pence: false })}</Num>
              <Num tone={j.costVsPlan > 100 ? "bad" : undefined}>{gbp(j.actualCost, { pence: false })}<span className="block text-[11px] text-neutral-500">{j.costVsPlan}% of plan</span></Num>
              <Num>{gbp(j.stillToPay + j.labourOwed, { pence: false })}</Num>
              <Num strong tone={j.profitSoFar >= 0 ? "good" : "bad"}>{gbp(j.profitSoFar, { pence: false })}</Num>
              <Num tone={j.forecastProfit >= 0 ? "good" : "bad"}>{gbp(j.forecastProfit, { pence: false })}<span className="block text-[11px] text-neutral-500">plan {gbp(j.plannedProfit, { pence: false })}</span></Num>
            </tr>
          ))}
          {!r.jobs.length && <tr><td colSpan={9} className="py-4 text-neutral-500">No accepted jobs yet.</td></tr>}
        </Table>
      </Card>
      {r.jobs.map(j => (
        <details key={j.quoteId} className="group rounded-2xl border bg-white p-4">
          <summary className="cursor-pointer list-none font-semibold">{j.reference} – {j.clientName} <span className="text-sm font-normal text-neutral-500">· materials {gbp(j.materials, { pence: false })} · labour {gbp(j.labour, { pence: false })} · other {gbp(j.other, { pence: false })}</span></summary>
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Prices agreed (subcontractors, suppliers)</p>
              {j.jobCosts.length ? <Table head={["What for", "Who", "Agreed", "Paid", "Left", ""]} min={560}>{j.jobCosts.map(c => (
                <tr key={c.id} className={c.status === "CANCELLED" ? "opacity-50" : ""}><td className="py-2 pr-3">{c.title}<span className="block text-xs text-neutral-500">{category(c.category).label}{c.dueDate ? ` · due ${ukDay(c.dueDate)}` : ""}</span></td><td className="py-2 pr-3">{c.supplier || "—"}</td>
                  <Num>{gbp(c.amount)}</Num><Num>{gbp(c.paid)}{c.cisDeducted > 0 && <span className="block text-[11px] text-neutral-500">incl. CIS {gbp(c.cisDeducted)}</span>}</Num><Num strong>{gbp(Math.max(0, c.amount - c.paid))}</Num><td className="py-2 text-right"><JobCostCancel id={c.id} status={c.status} /></td></tr>
              ))}</Table> : <p className="text-sm text-neutral-500">None yet.</p>}
            </div>
            <Disclosure label="Add an agreed price"><JobCostForm quoteId={j.quoteId} jobs={jobs} workers={workers} /></Disclosure>
            <Disclosure label="Add a cost or payment for this job"><EntryForm jobs={jobs} workers={workers} jobCosts={input.jobCosts.filter(c => c.status === "OPEN")} defaultQuoteId={j.quoteId} /></Disclosure>
          </div>
        </details>
      ))}
      {missing.length > 0 && <Card title="Job expenses with no VAT entered" right="Add the VAT so it's reclaimed on the VAT return">
        <Table head={["Date", "Job", "What", "Amount", "VAT & paid by"]} min={640}>{missing.slice(0, 100).map(e => (
          <tr key={e.id}><td className="py-2 pr-3 whitespace-nowrap">{ukDay(e.spentOn)}</td><td className="py-2 pr-3">{jobLabel(input, e.quoteId)}</td><td className="py-2 pr-3">{e.supplier || e.description || category(e.category).label}</td><Num>{gbp(e.amount)}</Num><td className="py-2"><ExpenseVat e={e} /></td></tr>
        ))}</Table>
      </Card>}
    </div>
  );
}

// ---------------------------------------------------------------- Company costs

function CompanyTab({ r, input, jobs, workers }: P) {
  const c = r.company;
  const recent = input.entries.filter(e => e.direction === "OUT" && !e.quoteId && ["OVERHEAD", "NOT_DEDUCTIBLE", "CAPITAL"].includes(category(e.category).group)).slice(0, 60);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="dark" label="Regular costs per month" value={gbp(c.perMonth, { pence: false })} sub="All repeating costs, monthly equivalent" />
        <Stat label="This month" value={gbp(c.thisMonth.actual, { pence: false })} sub={`expected ${gbp(c.thisMonth.expected, { pence: false })}`} tone={c.thisMonth.actual > c.thisMonth.expected * 1.1 ? "warn" : "plain"} />
        <Stat label="This year" value={gbp(c.thisYear.actual, { pence: false })} sub={`expected ${gbp(c.thisYear.expected, { pence: false })}`} />
        <Stat label="Due in the next month" value={c.upcoming.length} sub={c.upcoming[0] ? `next: ${c.upcoming[0].name} ${ukDay(c.upcoming[0].next)}` : "nothing due"} />
      </div>
      <Card title="Regular costs" right="Insurance, Checkatrade, subscriptions, van finance…">
        <Table head={["Name", "Category", "Amount", "How often", "Next", "Paid this year", ""]} min={720}>
          {c.recurring.map(x => (
            <tr key={x.id} className={x.active ? "" : "opacity-50"}><td className="py-2 pr-3 font-medium">{x.name}<span className="block text-xs text-neutral-500">{x.supplier}</span></td><td className="py-2 pr-3 text-xs">{category(x.category).label}<span className="block text-neutral-500">{VAT_LABEL[x.vatTreatment]}</span></td>
              <Num>{gbp(x.amount)}</Num><td className="py-2 pr-3">{FREQUENCY_LABEL[x.frequency]}</td><td className="py-2 pr-3 whitespace-nowrap">{x.active && x.next ? <>{ukDay(x.next)}{x.dueSoon && <Badge tone="amber">soon</Badge>}</> : "—"}</td>
              <Num>{gbp(x.paidYear, { pence: false })}<span className="block text-[11px] text-neutral-500">of {gbp(x.expectedYear, { pence: false })}</span></Num><td className="py-2 text-right"><RecurringToggle id={x.id} active={x.active} /></td></tr>
          ))}
          {!c.recurring.length && <tr><td colSpan={7} className="py-4 text-neutral-500">Add your insurance, memberships and subscriptions – they're matched to the bank automatically.</td></tr>}
        </Table>
        <div className="mt-3"><Disclosure label="Add a regular cost"><RecurringForm /></Disclosure></div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Card title="This year by category">{c.byCategory.length ? <ul className="space-y-1.5 text-sm">{c.byCategory.map(b => <li key={b.key} className="flex justify-between gap-3"><span>{b.label}</span><span className="tabular-nums font-semibold">{gbp(b.amount, { pence: false })}</span></li>)}</ul> : <p className="text-sm text-neutral-500">Nothing yet.</p>}</Card>
        <Card title="Latest company costs" right={<CsvButton name="company-costs.csv" rows={[["Date", "Category", "Paid to", "Amount", "VAT", "Paid by"], ...recent.map(e => [e.date, category(e.category).label, e.counterparty || e.description, e.amount, e.vat, e.method])]} />}>
          <Table head={["Date", "What", "Amount", "VAT", ""]} min={480}>{recent.map(e => (
            <tr key={e.id}><td className="py-2 pr-3 whitespace-nowrap">{ukDay(e.date)}</td><td className="py-2 pr-3">{e.counterparty || e.description || category(e.category).label}<span className="block text-xs text-neutral-500">{category(e.category).label} · {e.method.toLowerCase()}{e.bankLineId ? " · in bank ✓" : ""}</span></td><Num>{gbp(e.amount)}</Num><Num>{gbp(e.vat)}</Num><td className="py-2 text-right"><VoidButton id={e.id} /></td></tr>
          ))}</Table>
        </Card>
      </div>
      <Disclosure label="Add a company cost"><EntryForm dir="OUT" defaultCategory="OTHER_OVERHEAD" jobs={jobs} workers={workers} recurring={input.recurring.filter(x => x.active)} /></Disclosure>
    </div>
  );
}

// ---------------------------------------------------------------- Workers & CIS

function WorkersTab({ r, input, jobs, workers }: P) {
  return (
    <div className="space-y-5">
      <Alerts r={r} only="workers" />
      <Card title="Workers & subcontractors" right="Days from site check-ins (or added here) × day rate; agreed prices for price work">
        <Table head={["Name", "CIS", "Days", "Owed", "Paid", "Balance", "CIS held back (tax year)", "Cash paid"]} min={820}>
          {r.workers.filter(w => w.active || w.paid || w.owed).map(w => (
            <tr key={w.id} className="align-top"><td className="py-2 pr-3 font-medium">{w.name}<span className="block text-xs text-neutral-500">{w.trade}{w.dayRate ? ` · ${gbp(w.dayRate, { pence: false })}/day` : ""}</span></td>
              <td className="py-2 pr-3"><Badge tone={w.cisStatus === "NONE" ? "grey" : w.cisStatus === "GROSS" ? "green" : "blue"}>{w.cisStatus === "NONE" ? "No CIS" : w.cisStatus === "GROSS" ? "Gross" : w.cisStatus === "NET20" ? "20%" : "30%"}</Badge>{w.cisMissing > 0 && <span className="mt-1 block text-[11px] text-amber-700">{w.cisMissing} without CIS</span>}</td>
              <Num>{w.days}</Num><Num>{gbp(w.owed)}</Num><Num>{gbp(w.paid)}</Num><Num strong tone={w.balance > 0 ? "bad" : undefined}>{gbp(w.balance)}</Num><Num>{gbp(w.cisDeductedYear)}</Num><Num>{gbp(w.cashPaid)}</Num></tr>
          ))}
        </Table>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Pay someone"><PayWorkerForm workers={workers} jobs={jobs} jobCosts={input.jobCosts.filter(c => c.status === "OPEN")} /></Card>
        <Card title="Add days worked" right="For days not checked in on site"><WorkDaysForm workers={workers} jobs={jobs} /></Card>
      </div>
      <Card title="CIS details" right="Verify new subcontractors with HMRC before paying them">
        <div className="space-y-4">{workers.filter(w => w.active).map(w => <div key={w.id}><p className="mb-1 text-sm font-semibold">{w.name}</p><WorkerTaxForm w={w} /></div>)}</div>
      </Card>
      {r.settings.cisContractor && <Card title="CIS monthly returns" right="Tax month 6th–5th · file by the 19th · pay by the 22nd · nil returns are needed too (from April 2026)">
        <Table head={["Tax month", "Subcontractors", "Gross paid", "Materials", "CIS to pay", "File by", ""]} min={720}>
          {[...r.cisMonths].reverse().map(m => (
            <tr key={m.key} className="align-top"><td className="py-2 pr-3 whitespace-nowrap">{m.label}<span className="block"><Badge tone={m.status === "OVERDUE" ? "red" : m.status === "DUE" ? "amber" : m.status === "OPEN" ? "blue" : "grey"}>{m.status === "OPEN" ? "current" : m.status === "DUE" ? "to file" : m.status === "OVERDUE" ? "overdue?" : "past"}</Badge></span></td>
              <td className="py-2 pr-3 text-xs">{m.nil ? "Nil return" : m.subs.map(s => <span key={s.workerId} className="block">{s.name} ({CIS_LABEL[s.status].split("(")[1]?.replace(")", "") ?? "—"})</span>)}</td>
              <Num>{gbp(m.gross)}</Num><Num>{gbp(m.subs.reduce((a, s) => a + s.materials, 0))}</Num><Num strong>{gbp(m.deducted)}</Num><td className="py-2 pr-3 whitespace-nowrap">{ukDay(m.returnDue)}<span className="block text-[11px] text-neutral-500">pay by {ukDay(m.paymentDue)}</span></td>
              <td className="py-2 text-right"><CsvButton label="CSV" name={`cis-${m.key}.csv`} rows={[["Subcontractor", "UTR", "Status", "Gross payment (excl VAT)", "Cost of materials", "CIS deducted"], ...m.subs.map(s => [s.name, s.utr, s.status, s.gross, s.materials, s.deducted])]} /></td></tr>
          ))}
        </Table>
        {r.cisSuffered > 0 && <p className="mt-3 text-sm text-neutral-600">CIS taken from <strong>your</strong> invoices by other contractors this tax year: <strong>{gbp(r.cisSuffered)}</strong> – claim it back through your PAYE (EPS) or against Corporation Tax.</p>}
      </Card>}
    </div>
  );
}

// ---------------------------------------------------------------- Bank

async function BankTab({ r, input }: P) {
  const d = db();
  const [toSort, recent, statements, rules, ctx] = await Promise.all([listBankLines(d, { status: "NEW", limit: 300 }), listBankLines(d, { limit: 40 }), listStatements(d), listRules(d), loadSuggestContext(input)]);
  const lines: LineView[] = toSort.map(l => ({ id: l.id, date: l.date, description: l.description, amount: l.amount, suggestions: suggest(l, ctx) }));
  const opts = {
    jobs: input.jobs.map(j => ({ id: j.quoteId, label: `${j.reference} – ${j.clientName}` })),
    workers: input.workers.filter(w => w.active).map(w => ({ id: w.id, name: w.name, kind: w.kind, cisStatus: w.cisStatus, vatNumber: w.vatNumber, dayRate: w.dayRate, utr: w.utr, verificationNumber: w.verificationNumber, active: w.active })),
    recurring: input.recurring.filter(x => x.active).map(x => ({ id: x.id, name: x.name, category: x.category, vatTreatment: x.vatTreatment })),
  };
  return (
    <div className="space-y-5">
      <Card title="Upload a statement"><BankUpload /></Card>
      <Card title="Sort the bank lines" right="Money in and out, matched to jobs, workers, regular costs and what you've already recorded"><BankLines lines={lines} opts={opts} /></Card>
      {r.notInBank.length > 0 && <Card title="Recorded, but not seen in the bank" right={`Up to your last statement (${ukDay(r.headline.bankDate)})`}>
        <Table head={["Date", "What", "Job", "Amount"]} min={480}>{r.notInBank.slice(0, 60).map(m => <tr key={`${m.source}${m.id}`}><td className="py-2 pr-3 whitespace-nowrap">{ukDay(m.date)}</td><td className="py-2 pr-3">{m.label}<span className="block text-xs text-neutral-500">{category(m.categoryKey).label}</span></td><td className="py-2 pr-3">{m.reference || "—"}</td><Num>{gbp(m.dir === "IN" ? m.amount : -m.amount)}</Num></tr>)}</Table>
        <p className="mt-2 text-xs text-neutral-500">Either it hasn't gone through yet, it was paid another way (cash/card – change it), or it's on a statement you haven't uploaded.</p>
      </Card>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Recently sorted">
          <ul className="divide-y text-sm">{recent.filter(l => l.status !== "NEW").slice(0, 25).map(l => (
            <li key={l.id} className="flex items-baseline gap-3 py-1.5"><span className="w-16 shrink-0 text-xs text-neutral-500">{ukDay(l.date)}</span><span className="min-w-0 flex-1 truncate">{l.description}</span><span className="tabular-nums">{gbp(l.amount)}</span>{l.status === "IGNORED" ? <Badge>ignored</Badge> : <Badge tone="green">done</Badge>}<ReopenLine id={l.id} /></li>
          ))}</ul>
        </Card>
        <Card title="Statements">
          <ul className="divide-y text-sm">{statements.map(s => <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5"><span>{s.bank} · {ukDay(s.periodFrom)} – {ukDay(s.periodTo)}<span className="block text-xs text-neutral-500">{s.fileName}</span></span><span className="text-xs">{s.lineCount} lines{s.toDo ? <> · <strong>{s.toDo} to sort</strong></> : " ✓"}{s.closingBalance != null ? ` · closing ${gbp(s.closingBalance)}` : ""}</span></li>)}
            {!statements.length && <li className="py-2 text-neutral-500">No statements yet.</li>}</ul>
          {rules.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Remembered ({rules.filter(x => x.active).length})</summary><ul className="mt-2 space-y-1">{rules.map(x => <li key={x.id} className={x.active ? "" : "opacity-50"}>“{x.pattern}” → {category(x.categoryKey).label}{x.quoteId ? ` · ${jobLabel(input, x.quoteId)}` : ""}</li>)}</ul></details>}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cash

function CashTab({ r, input, jobs, workers }: P) {
  const c = r.cashBook;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="dark" label="Cash box" value={gbp(c.balance)} sub="Should match the cash you're holding" />
        <Stat label="Cash taken in" value={gbp(c.in + c.withdrawn, { pence: false })} sub={`from clients ${gbp(c.in, { pence: false })} · from bank ${gbp(c.withdrawn, { pence: false })}`} />
        <Stat label="Cash paid out" value={gbp(c.out + c.banked, { pence: false })} sub={`costs & pay ${gbp(c.out, { pence: false })} · banked ${gbp(c.banked, { pence: false })}`} />
        <Stat label="Lines" value={c.lines.length} />
      </div>
      <Card title="Record cash" right="Cash sales and costs count for VAT and Corporation Tax like bank ones; keep receipts">
        <EntryForm method="CASH" jobs={jobs} workers={workers} recurring={input.recurring.filter(x => x.active)} jobCosts={input.jobCosts.filter(x => x.status === "OPEN")} />
      </Card>
      <Card title="Cash book" right={<CsvButton name="cash-book.csv" rows={[["Date", "What", "Job", "In", "Out", "Balance"], ...c.lines.map(l => [l.date, l.label, jobLabel(input, l.quoteId), l.dir === "IN" ? l.amount : "", l.dir === "OUT" ? l.amount : "", l.running])]} />}>
        <Table head={["Date", "What", "Job", "In", "Out", "Balance", ""]} min={620}>{c.lines.slice(0, 200).map(l => (
          <tr key={`${l.source}${l.id}`}><td className="py-2 pr-3 whitespace-nowrap">{ukDay(l.date)}</td><td className="py-2 pr-3">{l.label}<span className="block text-xs text-neutral-500">{category(l.categoryKey).label}</span></td><td className="py-2 pr-3">{jobLabel(input, l.quoteId)}</td>
            <Num tone="good">{l.dir === "IN" ? gbp(l.amount) : ""}</Num><Num>{l.dir === "OUT" ? gbp(l.amount) : ""}</Num><Num strong>{gbp(l.running)}</Num><td className="py-2 text-right">{l.source === "ENTRY" && <VoidButton id={l.id} />}</td></tr>
        ))}{!c.lines.length && <tr><td colSpan={7} className="py-4 text-neutral-500">No cash recorded yet.</td></tr>}</Table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- VAT

function VatTab({ r }: { r: FinanceReport }) {
  if (!r.settings.vatRegistered) return <Card title="VAT"><p className="text-sm">Not VAT registered (see Settings). Register when taxable turnover in any 12 months passes £90,000.</p></Card>;
  if (!r.vat.length) return <Card title="VAT"><p className="text-sm">Enter your VAT registration date and the end of your first VAT return in <Link href="/dashboard/finance?tab=settings" className="font-semibold underline">Settings</Link> – the quarters are worked out from them.</p></Card>;
  const tone = (s: string) => (s === "OVERDUE" ? "red" : s === "DUE" ? "amber" : s === "OPEN" ? "blue" : s === "PAID" || s === "REFUNDED" ? "green" : "grey") as "red";
  return (
    <div className="space-y-5">
      <Alerts r={r} only="vat" />
      <p className="text-sm text-neutral-600">{r.settings.vatScheme === "CASH" ? "Cash accounting: VAT counts when money comes in or goes out – an invoice only counts once it's paid, a bill once you've paid it." : "Standard VAT accounting: sales count on the invoice date, costs on the receipt date."} Construction reverse charge: when a VAT-registered subcontractor works for you, their VAT goes in box 1 and box 4 (it nets to nothing); when you work for another VAT-registered builder, your invoice has no VAT and the value goes in box 6 only.</p>
      {r.vat.map(v => (
        <Card key={v.key} title={<>{v.label} <Badge tone={tone(v.status)}>{{ OPEN: "current quarter", DUE: "to file", OVERDUE: "overdue", PAID: "paid", CLAIM: "repayment due", REFUNDED: "repaid" }[v.status as string] ?? v.status}</Badge></>}
          right={<span>Due {ukDay(v.due)}{v.paid ? ` · paid ${gbp(v.paid)}` : ""}</span>}>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {([["1", "VAT due on sales", v.box1], ["2", "VAT on EU acquisitions (NI only)", v.box2], ["3", "Total VAT due", v.box3], ["4", "VAT reclaimed on purchases", v.box4], ["5", v.box5 >= 0 ? "Net VAT to pay HMRC" : "Net VAT HMRC owes you", Math.abs(v.box5)], ["6", "Total sales ex VAT (whole £)", v.box6], ["7", "Total purchases ex VAT (whole £)", v.box7], ["8", "Supplies to the EU (NI only)", v.box8], ["9", "Acquisitions from the EU (NI only)", v.box9]] as const).map(([n, l, x]) => (
              <div key={n} className={`flex justify-between gap-3 border-b border-neutral-100 py-1 ${n === "5" ? "font-bold" : ""}`}><dt><span className="mr-2 inline-block w-5 text-neutral-400">{n}</span>{l}</dt><dd className="tabular-nums">{Number(n) >= 6 ? gbp(x, { pence: false }) : gbp(x)}</dd></div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span>{v.sales} sales · {v.purchases} purchases{v.drcOutput ? ` · reverse charge ${gbp(v.drcOutput)} in boxes 1 and 4` : ""}</span>
            <CsvButton label="Boxes CSV" name={`vat-${v.end}.csv`} rows={[["Box", "Description", "Amount"], ["1", "VAT due on sales", v.box1], ["2", "VAT due on acquisitions", v.box2], ["3", "Total VAT due", v.box3], ["4", "VAT reclaimed", v.box4], ["5", "Net VAT", v.box5], ["6", "Total sales ex VAT", v.box6], ["7", "Total purchases ex VAT", v.box7], ["8", "Supplies to EU", v.box8], ["9", "Acquisitions from EU", v.box9]]} />
          </div>
        </Card>
      ))}
      <p className="text-xs text-neutral-500">Submit through HMRC-recognised Making Tax Digital software (or your accountant) – these boxes are what to check it against.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Year end

function YearTab({ r }: { r: FinanceReport }) {
  if (!r.years.length) return <Card title="Year end"><p className="text-sm">Enter the incorporation date and year end in <Link href="/dashboard/finance?tab=settings" className="font-semibold underline">Settings</Link>.</p></Card>;
  return (
    <div className="space-y-5">
      {r.years.map(y => (
        <Card key={y.key} title={<>{y.label}{y.current && <Badge tone="blue">current – {y.monthsDone} months in</Badge>}{y.first && <Badge>first accounts</Badge>}</>}
          right={<CsvButton label="P&L CSV" name={`profit-and-loss-${y.end}.csv`} rows={[["Line", "Amount"], ["Turnover", y.pl.turnover], ["Cost of sales", y.pl.costOfSales], ["Gross profit", y.pl.grossProfit], ["Other income", y.pl.otherIncome], ["Overheads", y.pl.overheads], ["Not deductible", y.pl.notDeductible], ["Net profit", y.pl.netProfit], ["Capital allowances", y.pl.capitalAllowances], ["Taxable profit", y.pl.taxableProfit], ["Corporation Tax (estimate)", y.ct], [], ["Category", "Amount"], ...y.pl.byCategory.map(c => [c.label, c.amount])]} />}>
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <dl className="text-sm">
              {([["Turnover (sales)", y.pl.turnover, true], ["Cost of sales (materials, labour, subcontractors, plant)", -y.pl.costOfSales, false], ["Gross profit", y.pl.grossProfit, true], ["Other income", y.pl.otherIncome, false], ["Running costs", -y.pl.overheads, false], ["Not tax-deductible (entertaining, fines)", -y.pl.notDeductible, false], ["Net profit before tax", y.pl.netProfit, true]] as const).map(([l, x, b]) => (
                <div key={l} className={`flex justify-between gap-3 border-b border-neutral-100 py-1.5 ${b ? "font-bold" : ""}`}><dt>{l}</dt><dd className="tabular-nums">{gbp(x, { pence: false })}</dd></div>
              ))}
              <p className="mt-1 text-xs text-neutral-500">Gross margin {y.pl.grossMargin}%.</p>
              <div className="mt-4 rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold">Corporation Tax (estimate)</p>
                <div className="mt-1 flex justify-between"><span>Net profit + not deductible</span><span className="tabular-nums">{gbp(y.pl.netProfit + y.pl.notDeductible, { pence: false })}</span></div>
                {y.pl.capitalAllowances > 0 && <div className="flex justify-between"><span>Less capital allowances (tools, vans 100%; cars 18%)</span><span className="tabular-nums">−{gbp(y.pl.capitalAllowances, { pence: false })}</span></div>}
                <div className="flex justify-between font-semibold"><span>Taxable profit</span><span className="tabular-nums">{gbp(y.pl.taxableProfit, { pence: false })}</span></div>
                {y.taxes.map(t => <div key={t.start} className="mt-1 flex justify-between text-xs text-neutral-600"><span>{ukDate(t.start)} – {ukDate(t.end)}: {t.parts.map(p => `FY${p.fy} ${p.band}`).join(", ") || "no profit"}</span><span className="tabular-nums">{gbp(t.tax)}</span></div>)}
                <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Corporation Tax</span><span className="tabular-nums">{gbp(y.ct)}</span></div>
                <div className="flex justify-between text-sm"><span>Profit after tax (available for dividends)</span><span className="tabular-nums">{gbp(y.profitAfterTax, { pence: false })}</span></div>
              </div>
            </dl>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Deadlines</p>
              <p className="flex justify-between"><span>Corporation Tax payment</span><strong>{ukDay(y.ctPaymentDue)}</strong></p>
              {y.taxes.length > 1 && y.taxes.slice(0, -1).map(t => <p key={t.end} className="flex justify-between text-xs text-neutral-600"><span>(first 12 months – pay by)</span><span>{ukDay(t.paymentDue)}</span></p>)}
              <p className="flex justify-between"><span>Accounts to Companies House</span><strong>{ukDay(y.accountsDue)}</strong></p>
              <p className="flex justify-between"><span>Company Tax Return (CT600)</span><strong>{ukDay(y.ct600Due)}</strong></p>
              {y.ctPaid > 0 && <p className="flex justify-between"><span>Corporation Tax paid</span><span>{gbp(y.ctPaid)}</span></p>}
              <p className="pt-2 font-semibold">Biggest costs</p>
              <ul className="space-y-1">{y.pl.byCategory.filter(c => c.group !== "INCOME").slice(0, 8).map(c => <li key={c.key} className="flex justify-between gap-3"><span>{c.label}</span><span className="tabular-nums">{gbp(c.amount, { pence: false })}</span></li>)}</ul>
            </div>
          </div>
        </Card>
      ))}
      <p className="text-xs text-neutral-500">A limited company's accounts are always on invoices (accruals) – sales when invoiced, costs when billed – even though VAT is on cash accounting. Rates used: Corporation Tax 19% up to £50,000, 25% over £250,000, marginal relief between (limits shared with associated companies and scaled for short periods). Dividends, director's pay and capital allowances can change the final figure – your accountant prepares the statutory accounts and CT600.</p>
    </div>
  );
}
