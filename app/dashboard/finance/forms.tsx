"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, X } from "lucide-react";
import { CATEGORIES, CIS_LABEL, CIS_RATE, FREQUENCY_LABEL, VAT_LABEL, category, cisDeduction, vatFor, type CisStatus, type FinanceSettings, type Frequency, type VatTreatment } from "@/app/lib/finance/rules";
import {
  addEntryAction, addWorkDaysAction, payWorkerAction, saveJobCostAction, saveRecurringAction, saveSettingsAction, setExpenseVatAction, setJobCostStatusAction, setRecurringActiveAction,
  setWorkerTaxAction, voidEntryAction,
} from "./actions";
import { btn, gbp, input } from "./ui";
import { ConfirmDelete } from "@/app/componets/dashboard/ConfirmDelete";
import { deleteRecordAction } from "../delete-actions";

export interface JobOpt { id: string; label: string }
export interface WorkerOpt { id: string; name: string; kind: string; cisStatus: CisStatus; vatNumber: string; dayRate: number | null; utr: string; verificationNumber: string; active: boolean }
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[£,\s]/g, "")));
const TREATMENTS: VatTreatment[] = ["STANDARD", "REDUCED", "ZERO", "EXEMPT", "OUTSIDE", "REVERSE_CHARGE"];

/** Run a server action, show the answer, refresh the page data. */
function useAct() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, done: string, after?: () => void) => {
    setPending(true);
    try {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: done } : { ok: false, text: r.message ?? "Something went wrong." });
      if (r.ok) { after?.(); router.refresh(); }
    } catch { setMsg({ ok: false, text: "Couldn't reach the server – check your connection and try again." }); }
    finally { setPending(false); }
  };
  return { pending, msg, act, setMsg };
}
const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) => (m ? <p role="status" className={`mt-2 rounded-lg px-3 py-2 text-sm ${m.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{m.text}</p> : null);
const Field = ({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: ReactNode; wide?: boolean }) => (
  <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="mb-1 block text-xs font-semibold text-neutral-600">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-neutral-500">{hint}</span>}</label>
);
export function Disclosure({ label, children, open: o = false }: { label: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(o);
  return open ? (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-4">
      <div className="mb-3 flex items-center justify-between"><p className="font-semibold">{label}</p><button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 hover:bg-white"><X className="h-4 w-4" /></button></div>
      {children}
    </div>
  ) : <button onClick={() => setOpen(true)} className={`${btn} bg-neutral-900 text-white`}><Plus className="h-4 w-4" />{label}</button>;
}
function VatFields({ amount, cat, t, setT, vat, setVat }: { amount: number; cat: string; t: VatTreatment; setT: (t: VatTreatment) => void; vat: string; setVat: (v: string) => void }) {
  const auto = Number.isFinite(amount) ? vatFor(amount, t) : 0;
  return <>
    <Field label="VAT" hint={category(cat).hint}>
      <select className={input} value={t} onChange={e => { setT(e.target.value as VatTreatment); setVat(""); }}>{TREATMENTS.map(x => <option key={x} value={x}>{VAT_LABEL[x]}</option>)}</select>
    </Field>
    <Field label={t === "REVERSE_CHARGE" ? "VAT you account for (20%)" : "VAT included"} hint={vat === "" ? `Worked out: ${gbp(auto)}` : "Typed in – clear it to work it out"}>
      <input className={input} inputMode="decimal" placeholder={auto.toFixed(2)} value={vat} onChange={e => setVat(e.target.value)} />
    </Field>
  </>;
}

// ---------------------------------------------------------------- Money in / out

export function EntryForm({ dir: fixedDir, method: fixedMethod, jobs, workers, recurring = [], jobCosts = [], defaultCategory, defaultQuoteId, title }: {
  dir?: "IN" | "OUT"; method?: "BANK" | "CASH" | "CARD"; jobs: JobOpt[]; workers: WorkerOpt[]; recurring?: { id: string; name: string; category: string; amount: number; vatTreatment: VatTreatment; supplier: string }[];
  jobCosts?: { id: string; quoteId: string; title: string }[]; defaultCategory?: string; defaultQuoteId?: string; title?: string;
}) {
  const { pending, msg, act } = useAct();
  const [dir, setDir] = useState<"IN" | "OUT">(fixedDir ?? "OUT");
  const [f, setF] = useState({ date: today(), method: fixedMethod ?? "BANK", category: defaultCategory ?? (dir === "IN" ? "SALES" : "MATERIALS"), amount: "", counterparty: "", description: "", reference: "", quoteId: defaultQuoteId ?? "", workerId: "", recurringId: "", jobCostId: "" });
  const [t, setT] = useState<VatTreatment>(category(f.category).vat), [vat, setVat] = useState("");
  const cats = CATEGORIES.filter(c => c.dir === dir);
  const pick = (k: string) => { setF({ ...f, category: k }); setT(category(k).vat); setVat(""); };
  const amount = num(f.amount);
  const c = category(f.category);
  const jobPayment = dir === "IN" && f.category === "SALES" && f.quoteId;
  return (
    <div>
      {title && <p className="mb-2 font-semibold">{title}</p>}
      {!fixedDir && <div className="mb-3 inline-flex rounded-full border bg-white p-0.5 text-sm">{(["OUT", "IN"] as const).map(d => <button key={d} onClick={() => { setDir(d); pick(d === "IN" ? "SALES" : "MATERIALS"); }} className={`rounded-full px-4 py-1.5 font-semibold ${dir === d ? "bg-neutral-900 text-white" : ""}`}>{d === "OUT" ? "Money out" : "Money in"}</button>)}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date"><input type="date" className={input} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Amount (£)" hint={t === "REVERSE_CHARGE" ? "Amount on the invoice (no VAT charged)" : "Total paid, VAT included"}><input className={input} inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></Field>
        <Field label="What for"><select className={input} value={f.category} onChange={e => pick(e.target.value)}>
          {(["INCOME", "COST_OF_SALES", "OVERHEAD", "NOT_DEDUCTIBLE", "CAPITAL", "NOT_PL"] as const).map(g => cats.some(x => x.group === g) && <optgroup key={g} label={{ INCOME: "Income", COST_OF_SALES: "Job costs", OVERHEAD: "Company running costs", NOT_DEDUCTIBLE: "Not tax-deductible", CAPITAL: "Bought to keep", NOT_PL: "Tax, director, loans, transfers" }[g]}>{cats.filter(x => x.group === g).map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</optgroup>)}
        </select></Field>
        {!fixedMethod && <Field label="Paid by"><select className={input} value={f.method} onChange={e => setF({ ...f, method: e.target.value as "BANK" })}><option value="BANK">Bank transfer / direct debit</option><option value="CARD">Card</option><option value="CASH">Cash</option></select></Field>}
        <Field label={dir === "IN" ? "From" : "Paid to"}><input className={input} value={f.counterparty} onChange={e => setF({ ...f, counterparty: e.target.value })} placeholder={dir === "IN" ? "Client / company" : "Supplier"} /></Field>
        <Field label="Job (if it's for a job)"><select className={input} value={f.quoteId} onChange={e => setF({ ...f, quoteId: e.target.value, jobCostId: "" })}><option value="">Company (no job)</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></Field>
        {dir === "OUT" && c.jobCost && workers.length > 0 && <Field label="Worker (optional)"><select className={input} value={f.workerId} onChange={e => setF({ ...f, workerId: e.target.value })}><option value="">—</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>}
        {dir === "OUT" && f.quoteId && jobCosts.some(j => j.quoteId === f.quoteId) && <Field label="Against an agreed price"><select className={input} value={f.jobCostId} onChange={e => setF({ ...f, jobCostId: e.target.value })}><option value="">—</option>{jobCosts.filter(j => j.quoteId === f.quoteId).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></Field>}
        {dir === "OUT" && recurring.length > 0 && !f.quoteId && <Field label="Regular cost (optional)"><select className={input} value={f.recurringId} onChange={e => { const r = recurring.find(x => x.id === e.target.value); setF({ ...f, recurringId: e.target.value, ...(r ? { category: r.category, amount: f.amount || String(r.amount), counterparty: f.counterparty || r.supplier } : {}) }); if (r) { setT(r.vatTreatment); setVat(""); } }}><option value="">—</option>{recurring.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>}
        {!jobPayment && <VatFields amount={amount} cat={f.category} t={t} setT={setT} vat={vat} setVat={setVat} />}
        <Field label="Note" wide><input className={input} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Invoice no., what it was…" /></Field>
      </div>
      {jobPayment && <p className="mt-2 text-xs text-neutral-600">This is recorded on the job as a client payment – the client sees it in their portal and gets a receipt email.</p>}
      <button disabled={pending || !(amount > 0)} onClick={() => act(() => addEntryAction({
        ...f, direction: dir, amount, quoteId: f.quoteId || null, workerId: f.workerId || null, recurringId: f.recurringId || null, jobCostId: f.jobCostId || null,
        vatTreatment: t, vat: vat === "" ? null : num(vat),
      }), `${dir === "IN" ? "Money in" : "Cost"} of ${gbp(amount)} saved.`, () => setF({ ...f, amount: "", description: "", reference: "", counterparty: "" }))} className={`${btn} mt-3 bg-amber-500 text-neutral-950`}>Save</button>
      <Msg m={msg} />
    </div>
  );
}
export function VoidButton({ id, label = "Cancel" }: { id: string; label?: string }) {
  const { pending, msg, act } = useAct();
  return <span className="inline-flex items-center gap-2"><ConfirmDelete small label="" word="DELETE" title="Delete this money entry?" what={["The entry, for good (Cancel keeps it in the history instead)", "A matched bank line is un-matched so it can be matched again"]} run={t => deleteRecordAction("entry", id, t)} /><button disabled={pending} onClick={() => confirm("Cancel this entry? It stays in the history but is left out of every total.") && act(() => voidEntryAction(id), "Cancelled.")} className="text-xs font-semibold text-red-700 hover:underline">{label}</button>{msg && !msg.ok && <span className="ml-2 text-xs text-red-700">{msg.text}</span>}</span>;
}

// ---------------------------------------------------------------- Workers

export function PayWorkerForm({ workers, jobs, jobCosts = [] }: { workers: WorkerOpt[]; jobs: JobOpt[]; jobCosts?: { id: string; quoteId: string; title: string; workerId: string | null }[] }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ workerId: "", quoteId: "", jobCostId: "", date: today(), method: "BANK" as "BANK" | "CASH", days: "", rate: "", labour: "", materials: "", note: "" });
  const w = workers.find(x => x.id === f.workerId);
  const labour = f.labour !== "" ? num(f.labour) : num(f.days) * num(f.rate || String(w?.dayRate ?? "")) || 0;
  const materials = num(f.materials) || 0;
  const rc = !!(w?.vatNumber && w.cisStatus !== "NONE");
  const cis = w ? cisDeduction(labour, w.cisStatus) : 0;
  const total = rc ? labour + materials : labour + materials;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Who"><select className={input} value={f.workerId} onChange={e => { const x = workers.find(y => y.id === e.target.value); setF({ ...f, workerId: e.target.value, rate: x?.dayRate ? String(x.dayRate) : f.rate }); }}><option value="">Choose…</option>{workers.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Job"><select className={input} value={f.quoteId} onChange={e => setF({ ...f, quoteId: e.target.value, jobCostId: "" })}><option value="">No particular job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></Field>
        <Field label="Date paid"><input type="date" className={input} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Paid by"><select className={input} value={f.method} onChange={e => setF({ ...f, method: e.target.value as "BANK" })}><option value="BANK">Bank transfer</option><option value="CASH">Cash</option></select></Field>
        <Field label="Days"><input className={input} inputMode="decimal" value={f.days} onChange={e => setF({ ...f, days: e.target.value, labour: "" })} placeholder="e.g. 5" /></Field>
        <Field label="Day rate (£)"><input className={input} inputMode="decimal" value={f.rate} onChange={e => setF({ ...f, rate: e.target.value, labour: "" })} placeholder={w?.dayRate ? String(w.dayRate) : "0"} /></Field>
        <Field label="Labour (£)" hint="Or type the labour total"><input className={input} inputMode="decimal" value={f.labour} onChange={e => setF({ ...f, labour: e.target.value })} placeholder={labour ? labour.toFixed(2) : "0.00"} /></Field>
        <Field label="Materials they bought (£)" hint="No CIS on materials"><input className={input} inputMode="decimal" value={f.materials} onChange={e => setF({ ...f, materials: e.target.value })} placeholder="0.00" /></Field>
        {f.quoteId && jobCosts.some(c => c.quoteId === f.quoteId) && <Field label="Against an agreed price"><select className={input} value={f.jobCostId} onChange={e => setF({ ...f, jobCostId: e.target.value })}><option value="">—</option>{jobCosts.filter(c => c.quoteId === f.quoteId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>}
        <Field label="Note" wide><input className={input} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Week 9, first fix…" /></Field>
      </div>
      {w && <div className="mt-3 grid gap-1 rounded-xl bg-neutral-50 p-3 text-sm sm:grid-cols-4">
        <p>Labour <strong className="float-right sm:float-none sm:ml-2">{gbp(labour)}</strong></p>
        <p>Materials <strong className="float-right sm:float-none sm:ml-2">{gbp(materials)}</strong></p>
        <p>CIS {CIS_RATE[w.cisStatus]}% held back <strong className="float-right sm:float-none sm:ml-2">−{gbp(cis)}</strong></p>
        <p className="font-bold">To pay {w.name.split(" ")[0]} <span className="float-right sm:float-none sm:ml-2">{gbp(total - cis)}</span></p>
        <p className="text-xs text-neutral-500 sm:col-span-4">{CIS_LABEL[w.cisStatus]}.{w.cisStatus !== "NONE" ? " CIS applies to a subcontractor's labour however you pay them; the amount held back goes to HMRC with the monthly CIS return." : " Set their CIS status under “CIS details” if they are a subcontractor."}{rc ? " VAT registered: reverse charge – they don't charge you VAT; it's on your VAT return both ways." : ""}</p>
      </div>}
      <button disabled={pending || !w || !(labour + materials > 0)} onClick={() => act(() => payWorkerAction({ workerId: f.workerId, quoteId: f.quoteId || null, jobCostId: f.jobCostId || null, date: f.date, method: f.method, days: num(f.days) || null, labour, materials, note: f.note }),
        `Pay recorded: ${gbp(total - cis)} to ${w?.name}${cis ? `, ${gbp(cis)} CIS held back` : ""}.`, () => setF({ ...f, days: "", labour: "", materials: "", note: "" }))} className={`${btn} mt-3 bg-amber-500 text-neutral-950`}>Record payment</button>
      <Msg m={msg} />
    </div>
  );
}
export function WorkDaysForm({ workers, jobs }: { workers: WorkerOpt[]; jobs: JobOpt[] }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ workerId: "", quoteId: "", from: today(), to: today(), weekdays: true });
  const dates = useMemo(() => {
    const out: string[] = []; let d = new Date(`${f.from}T00:00:00Z`); const end = new Date(`${f.to}T00:00:00Z`);
    for (let i = 0; i < 62 && d <= end; i++) { const wd = d.getUTCDay(); if (!f.weekdays || (wd !== 0 && wd !== 6)) out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86_400_000); }
    return out;
  }, [f.from, f.to, f.weekdays]);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Who"><select className={input} value={f.workerId} onChange={e => setF({ ...f, workerId: e.target.value })}><option value="">Choose…</option>{workers.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Job"><select className={input} value={f.quoteId} onChange={e => setF({ ...f, quoteId: e.target.value })}><option value="">Choose…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></Field>
        <Field label="From"><input type="date" className={input} value={f.from} onChange={e => setF({ ...f, from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} /></Field>
        <Field label="To"><input type="date" className={input} value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.weekdays} onChange={e => setF({ ...f, weekdays: e.target.checked })} />Weekdays only</label>
      </div>
      <button disabled={pending || !f.workerId || !f.quoteId || !dates.length} onClick={() => act(() => addWorkDaysAction({ workerId: f.workerId, quoteId: f.quoteId, dates }), `${dates.length} day${dates.length === 1 ? "" : "s"} added.`)} className={`${btn} mt-3 bg-neutral-900 text-white`}>Add {dates.length} day{dates.length === 1 ? "" : "s"}</button>
      <p className="mt-1 text-xs text-neutral-500">Days already checked in on site aren't counted twice.</p>
      <Msg m={msg} />
    </div>
  );
}
export function WorkerTaxForm({ w }: { w: WorkerOpt }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ cisStatus: w.cisStatus, utr: w.utr, vatNumber: w.vatNumber, verificationNumber: w.verificationNumber });
  return (
    <div className="grid gap-2 sm:grid-cols-5 sm:items-end">
      <Field label="CIS status"><select className={input} value={f.cisStatus} onChange={e => setF({ ...f, cisStatus: e.target.value as CisStatus })}>{(Object.keys(CIS_LABEL) as CisStatus[]).map(k => <option key={k} value={k}>{CIS_LABEL[k]}</option>)}</select></Field>
      <Field label="UTR"><input className={input} inputMode="numeric" value={f.utr} onChange={e => setF({ ...f, utr: e.target.value })} placeholder="10 digits" /></Field>
      <Field label="HMRC verification no."><input className={input} value={f.verificationNumber} onChange={e => setF({ ...f, verificationNumber: e.target.value })} placeholder="V123456789" /></Field>
      <Field label="Their VAT number"><input className={input} value={f.vatNumber} onChange={e => setF({ ...f, vatNumber: e.target.value })} placeholder="If VAT registered" /></Field>
      <button disabled={pending} onClick={() => act(() => setWorkerTaxAction(w.id, f), "Saved.")} className={`${btn} border bg-white`}>Save</button>
      <div className="sm:col-span-5"><Msg m={msg} /></div>
    </div>
  );
}

// ---------------------------------------------------------------- Repeating costs & agreed prices

export function RecurringForm({ r }: { r?: { id: string; name: string; category: string; supplier: string; amount: number; vatTreatment: VatTreatment; frequency: Frequency; startDate: string; endDate: string | null; method: string; notes: string } }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ name: r?.name ?? "", category: r?.category ?? "INSURANCE", supplier: r?.supplier ?? "", amount: r ? String(r.amount) : "", frequency: r?.frequency ?? "MONTHLY" as Frequency, startDate: r?.startDate ?? today(), endDate: r?.endDate ?? "", method: r?.method ?? "BANK", notes: r?.notes ?? "" });
  const [t, setT] = useState<VatTreatment>(r?.vatTreatment ?? category(f.category).vat), [vat, setVat] = useState("");
  const amount = num(f.amount);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name"><input className={input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Public liability insurance" /></Field>
        <Field label="Category"><select className={input} value={f.category} onChange={e => { setF({ ...f, category: e.target.value }); setT(category(e.target.value).vat); }}>{CATEGORIES.filter(c => c.dir === "OUT" && c.group !== "NOT_PL").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
        <Field label="Supplier" hint="As it appears on the bank statement helps matching"><input className={input} value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} placeholder="Hiscox, Checkatrade…" /></Field>
        <Field label="Amount each time (£)"><input className={input} inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="How often"><select className={input} value={f.frequency} onChange={e => setF({ ...f, frequency: e.target.value as Frequency })}>{(Object.keys(FREQUENCY_LABEL) as Frequency[]).map(k => <option key={k} value={k}>{FREQUENCY_LABEL[k]}</option>)}</select></Field>
        <Field label={f.frequency === "ONE_OFF" ? "Date" : "First payment"}><input type="date" className={input} value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /></Field>
        {f.frequency !== "ONE_OFF" && <Field label="Ends (optional)"><input type="date" className={input} value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} /></Field>}
        <Field label="Paid by"><select className={input} value={f.method} onChange={e => setF({ ...f, method: e.target.value })}><option value="BANK">Direct debit / bank</option><option value="CARD">Card</option><option value="CASH">Cash</option></select></Field>
        <VatFields amount={amount} cat={f.category} t={t} setT={setT} vat={vat} setVat={setVat} />
      </div>
      <button disabled={pending || !f.name || !(amount > 0)} onClick={() => act(() => saveRecurringAction({ ...(r ? { id: r.id } : {}), ...f, amount, endDate: f.endDate || null, vatTreatment: t, vat: vat === "" ? null : num(vat) }), r ? "Saved." : `${f.name} added.`, () => !r && setF({ ...f, name: "", supplier: "", amount: "" }))} className={`${btn} mt-3 bg-amber-500 text-neutral-950`}>{r ? "Save" : "Add"}</button>
      <Msg m={msg} />
    </div>
  );
}
export function RecurringToggle({ id, active }: { id: string; active: boolean }) {
  const { pending, act } = useAct();
  return <span className="inline-flex items-center gap-2"><ConfirmDelete small label="" word="DELETE" title="Delete this regular cost?" what={["The regular cost", "Payments already recorded stay (they're no longer linked to it)"]} run={t => deleteRecordAction("recurring", id, t)} /><button disabled={pending} onClick={() => act(() => setRecurringActiveAction(id, !active), active ? "Stopped." : "Restarted.")} className="text-xs font-semibold text-neutral-600 hover:underline">{active ? "Stop" : "Restart"}</button></span>;
}
export function JobCostForm({ quoteId, jobs, workers }: { quoteId?: string; jobs: JobOpt[]; workers: WorkerOpt[] }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ quoteId: quoteId ?? "", workerId: "", supplier: "", title: "", category: "SUBCONTRACTOR", amount: "", labour: "", vatTreatment: "OUTSIDE" as VatTreatment, dueDate: "", notes: "" });
  const amount = num(f.amount), labour = f.labour === "" ? (f.category === "SUBCONTRACTOR" ? amount : 0) : num(f.labour);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!quoteId && <Field label="Job"><select className={input} value={f.quoteId} onChange={e => setF({ ...f, quoteId: e.target.value })}><option value="">Choose…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}</select></Field>}
        <Field label="What for"><input className={input} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Plastering whole house" /></Field>
        <Field label="Type"><select className={input} value={f.category} onChange={e => setF({ ...f, category: e.target.value, vatTreatment: category(e.target.value).vat })}>{CATEGORIES.filter(c => c.jobCost).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
        <Field label="Subcontractor"><select className={input} value={f.workerId} onChange={e => { const w = workers.find(x => x.id === e.target.value); setF({ ...f, workerId: e.target.value, supplier: w?.name ?? f.supplier, vatTreatment: w?.vatNumber && w.cisStatus !== "NONE" ? "REVERSE_CHARGE" : f.vatTreatment }); }}><option value="">— or type a supplier —</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
        {!f.workerId && <Field label="Supplier"><input className={input} value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></Field>}
        <Field label="Agreed price (£)" hint={f.vatTreatment === "STANDARD" ? "Including VAT" : "As quoted"}><input className={input} inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        {f.category === "SUBCONTRACTOR" && <Field label="Labour part (£)" hint="CIS is on labour only"><input className={input} inputMode="decimal" value={f.labour} onChange={e => setF({ ...f, labour: e.target.value })} placeholder={Number.isFinite(amount) ? amount.toFixed(2) : ""} /></Field>}
        <Field label="VAT"><select className={input} value={f.vatTreatment} onChange={e => setF({ ...f, vatTreatment: e.target.value as VatTreatment })}>{TREATMENTS.map(x => <option key={x} value={x}>{VAT_LABEL[x]}</option>)}</select></Field>
        <Field label="Due (optional)"><input type="date" className={input} value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></Field>
      </div>
      <button disabled={pending || !f.quoteId || !f.title || !(amount > 0)} onClick={() => act(() => saveJobCostAction({ ...f, workerId: f.workerId || null, amount, labour: Number.isFinite(labour) ? labour : 0, dueDate: f.dueDate || null }), "Price saved.", () => setF({ ...f, title: "", amount: "", labour: "" }))} className={`${btn} mt-3 bg-amber-500 text-neutral-950`}>Save price</button>
      <Msg m={msg} />
    </div>
  );
}
export function JobCostCancel({ id, status }: { id: string; status: string }) {
  const { pending, act } = useAct();
  return <span className="inline-flex items-center gap-2"><ConfirmDelete small label="" word="DELETE" title="Delete this job cost?" what={["The agreed price / cost", "Payments recorded against it"]} run={t => deleteRecordAction("jobcost", id, t)} /><button disabled={pending} onClick={() => act(() => setJobCostStatusAction(id, status === "OPEN" ? "CANCELLED" : "OPEN"), "Saved.")} className="text-xs font-semibold text-neutral-600 hover:underline">{status === "OPEN" ? "Cancel price" : "Reopen"}</button></span>;
}

// ---------------------------------------------------------------- Existing job expenses: add the VAT

export function ExpenseVat({ e }: { e: { id: string; amount: number; vat: number; vatTreatment: VatTreatment; method: "BANK" | "CASH" | "CARD" } }) {
  const { pending, msg, act } = useAct();
  const [t, setT] = useState<VatTreatment>(e.vatTreatment === "OUTSIDE" && !e.vat ? "STANDARD" : e.vatTreatment);
  const [m, setM] = useState(e.method);
  const vat = vatFor(e.amount, t === "REVERSE_CHARGE" ? "OUTSIDE" : t);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <select aria-label="VAT" className="rounded border px-1 py-0.5 text-xs" value={t} onChange={x => setT(x.target.value as VatTreatment)}>{TREATMENTS.filter(x => x !== "REVERSE_CHARGE").map(x => <option key={x} value={x}>{VAT_LABEL[x]}</option>)}</select>
      <select aria-label="Paid by" className="rounded border px-1 py-0.5 text-xs" value={m} onChange={x => setM(x.target.value as "BANK")}><option value="BANK">Bank</option><option value="CARD">Card</option><option value="CASH">Cash</option></select>
      <button disabled={pending} onClick={() => act(() => setExpenseVatAction(e.id, { vat, vatTreatment: t, method: m }), `VAT ${gbp(vat)} saved.`)} className="rounded bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-white">Save</button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- Settings

export function SettingsForm({ s }: { s: FinanceSettings }) {
  const { pending, msg, act } = useAct();
  const [f, setF] = useState({ ...s, incorporationDate: s.incorporationDate ?? "", firstPeriodEnd: s.firstPeriodEnd ?? "", vatRegistrationDate: s.vatRegistrationDate ?? "", vatFirstPeriodEnd: s.vatFirstPeriodEnd ?? "" });
  const set = (k: keyof typeof f, v: unknown) => setF({ ...f, [k]: v });
  return (
    <div className="space-y-5">
      <div><p className="mb-2 font-semibold">Company</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Incorporation date" hint="From Companies House – the first accounts start here"><input type="date" className={input} value={f.incorporationDate} onChange={e => set("incorporationDate", e.target.value)} /></Field>
          <Field label="Year end (accounting reference date)" hint="Day and month, e.g. 31 March"><input className={input} value={f.yearEnd} onChange={e => set("yearEnd", e.target.value)} placeholder="MM-DD, e.g. 03-31" /></Field>
          <Field label="First year end (optional)" hint="Only if your first accounts end on a different date"><input type="date" className={input} value={f.firstPeriodEnd} onChange={e => set("firstPeriodEnd", e.target.value)} /></Field>
          <Field label="Associated companies" hint="Other companies under the same control – usually 0"><input className={input} inputMode="numeric" value={f.associatedCompanies} onChange={e => set("associatedCompanies", Number(e.target.value) || 0)} /></Field>
          <Field label="Company number"><input className={input} value={f.companyNumber} onChange={e => set("companyNumber", e.target.value)} /></Field>
          <Field label="Company UTR"><input className={input} value={f.utr} onChange={e => set("utr", e.target.value)} /></Field>
        </div></div>
      <div><p className="mb-2 font-semibold">VAT</p>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.vatRegistered} onChange={e => set("vatRegistered", e.target.checked)} />VAT registered (quarterly returns)</label>
        {f.vatRegistered && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="VAT accounting" hint="Cash accounting: VAT counts when paid. Standard: on the invoice date."><select className={input} value={f.vatScheme} onChange={e => set("vatScheme", e.target.value)}><option value="CASH">Cash accounting scheme</option><option value="STANDARD">Standard (invoice) accounting</option></select></Field>
          <Field label="VAT number"><input className={input} value={f.vatNumber} onChange={e => set("vatNumber", e.target.value)} placeholder="GB123456789" /></Field>
          <Field label="Registered from" hint="Effective date on your VAT certificate"><input type="date" className={input} value={f.vatRegistrationDate} onChange={e => set("vatRegistrationDate", e.target.value)} /></Field>
          <Field label="End of your first VAT return" hint="Sets your quarters (stagger), from the VAT certificate or HMRC account"><input type="date" className={input} value={f.vatFirstPeriodEnd} onChange={e => set("vatFirstPeriodEnd", e.target.value)} /></Field>
        </div>}</div>
      <div><p className="mb-2 font-semibold">CIS</p>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.cisContractor} onChange={e => set("cisContractor", e.target.checked)} />We pay subcontractors (CIS contractor – monthly CIS returns)</label>
        <Field label="Our CIS rate when other builders pay us"><select className={input + " sm:max-w-xs"} value={f.cisOwnRate} onChange={e => set("cisOwnRate", Number(e.target.value))}><option value={0}>Gross status (0%)</option><option value={20}>20%</option><option value={30}>30%</option></select></Field>
      </div>
      <button disabled={pending} onClick={() => act(() => saveSettingsAction({ ...f, incorporationDate: f.incorporationDate || null, firstPeriodEnd: f.firstPeriodEnd || null, vatRegistrationDate: f.vatRegistrationDate || null, vatFirstPeriodEnd: f.vatFirstPeriodEnd || null }), "Settings saved – VAT quarters and year end are worked out from these.")} className={`${btn} bg-amber-500 text-neutral-950`}>Save settings</button>
      <Msg m={msg} />
    </div>
  );
}

// ---------------------------------------------------------------- CSV for the accountant

export function CsvButton({ name, rows, label = "Download CSV" }: { name: string; rows: (string | number | null)[][]; label?: string }) {
  const download = () => {
    const esc = (v: string | number | null) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const blob = new Blob(["﻿" + rows.map(r => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return <button onClick={download} className={`${btn} border bg-white`}><Download className="h-4 w-4" />{label}</button>;
}
