"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Calculator, Check, ChevronDown, ChevronUp, Cloud, CloudOff, Copy, FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import { PackageFields } from "@/app/componets/takeoff/PackageFields";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { ROOM_JOBS, roomFields, roomGeometry, roomJobs, roomTypeDefaults } from "@/app/lib/takeoff/modules/rooms";
import { toSpec, type Values } from "@/app/lib/takeoff/package";
import {
  accessOptions, ageOptions, constructionOptions, floorOptions, houseTypeOptions, newRoom, occupancyOptions, parkingOptions, roomTypeOptions, scaffoldModeOptions, type RoomInput,
} from "@/app/lib/takeoff/schema";
import {
  FINISHES_INTRO, PROJECT_TYPES, PROPERTY, SECTIONS, SITE, key, progress, projectType, roomFinishesFor, visitSteps,
  type Answer, type Answers, type Question,
} from "@/app/lib/site-visit/template";
import { startTakeoff, type VisitTakeoff } from "@/app/lib/site-visit/convert";
import { saveVisitAction, setVisitStatusAction } from "../actions";

const field = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 sm:text-sm";
const btn = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40";
const roomSpec = { fields: roomFields.filter(f => f.key !== "jobs"), defaults: Object.fromEntries(roomFields.map(f => [f.key, f.default])) };

export interface VisitDetailsState { clientName: string; clientEmail: string; clientPhone: string; siteAddress: string; postcode: string; visitAt: string; projectTypes: string[] }
export interface VisitView { id: string; reference: string; status: string; version: number; quoteId: string | null; quoteReference: string | null; details: VisitDetailsState; answers: Answers; takeoff: VisitTakeoff }
type Data = { details: VisitDetailsState; answers: Answers; takeoff: VisitTakeoff };

const STATUSES: [string, string][] = [["PLANNED", "Planned"], ["IN_PROGRESS", "On site"], ["DONE", "Visit done"], ["QUOTED", "Quoted"], ["CANCELLED", "Cancelled"]];

export function VisitForm({ visit }: { visit: VisitView }) {
  const [data, setData] = useState<Data>({ details: visit.details, answers: visit.answers, takeoff: visit.takeoff });
  const [version, setVersion] = useState(visit.version);
  const [status, setStatus] = useState(visit.status);
  const [save, setSave] = useState<{ state: "saved" | "dirty" | "saving" | "error"; text?: string }>({ state: "saved" });
  const [restore, setRestore] = useState<Data | null>(null);
  const backupKey = `site-visit:${visit.id}`;
  const steps = useMemo(() => visitSteps(data.details.projectTypes), [data.details.projectTypes]);
  const [step, setStep] = useState(steps[0].id);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(data); latest.current = data;
  const ver = useRef(version); ver.current = version;

  // Unsaved changes are also kept on this device, in case the signal drops on site.
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(backupKey) ?? "null");
      if (b && b.version === visit.version && JSON.stringify(b.data) !== JSON.stringify({ details: visit.details, answers: visit.answers, takeoff: visit.takeoff })) setRestore(b.data);
    } catch { /* optional */ }
  }, [backupKey, visit]);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSave({ state: "saving" });
    const d = latest.current;
    const r = await saveVisitAction({ id: visit.id, version: ver.current, details: d.details, answers: d.answers, takeoff: d.takeoff }).catch(() => ({ ok: false as const, message: "No connection – changes are kept on this device and saved when you're back online." }));
    if (r.ok) {
      setVersion(r.version); ver.current = r.version;
      if (latest.current === d) { setSave({ state: "saved" }); try { localStorage.removeItem(backupKey); } catch { /* */ } }
      else setSave({ state: "dirty" });
    } else setSave({ state: "error", text: r.message });
  }, [backupKey, visit.id]);

  const change = (fn: (d: Data) => Data) => {
    setData(d => {
      const next = fn(d);
      try { localStorage.setItem(backupKey, JSON.stringify({ version: ver.current, data: next })); } catch { /* */ }
      return next;
    });
    setSave({ state: "dirty" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 1500);
  };
  useEffect(() => {
    const retry = () => { if (save.state === "error" || save.state === "dirty") void flush(); };
    window.addEventListener("online", retry);
    const warn = (e: BeforeUnloadEvent) => { if (save.state !== "saved") e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("online", retry); window.removeEventListener("beforeunload", warn); };
  }, [flush, save.state]);

  const answer = (k: string, v: Answer | undefined) => change(d => { const a = { ...d.answers }; if (v === undefined || v === "") delete a[k]; else a[k] = v; return { ...d, answers: a }; });
  const setDetails = (v: Partial<VisitDetailsState>) => change(d => ({ ...d, details: { ...d.details, ...v } }));
  const setTakeoff = (fn: (t: VisitTakeoff) => VisitTakeoff) => change(d => ({ ...d, takeoff: fn(d.takeoff) }));
  const toggleType = (id: string) => change(d => {
    const on = d.details.projectTypes.includes(id);
    const types = on ? d.details.projectTypes.filter(t => t !== id) : [...d.details.projectTypes, id];
    let takeoff = d.takeoff;
    if (!on) {
      // Switch its calculator projects on and add the rooms it usually needs.
      const add = startTakeoff([id]);
      takeoff = { ...takeoff, packages: { ...takeoff.packages, ...Object.fromEntries(Object.entries(add.packages).map(([k, p]) => [k, takeoff.packages[k] ? { ...takeoff.packages[k], enabled: true } : p])) },
        rooms: [...takeoff.rooms, ...add.rooms.filter(r => !takeoff.rooms.some(x => x.type === r.type))] };
    }
    return { ...d, details: { ...d.details, projectTypes: types }, takeoff };
  });

  const count = (id: string) => {
    const a = data.answers;
    if (id.startsWith("project:")) { const p = projectType(id.slice(8)); if (!p) return null; const pr = progress(p.questions, a, x => key.project(p.id, x)); const plan = p.plan.filter((_, i) => a[key.plan(p.id, i)] === true).length; return { done: pr.done + plan, total: pr.total + p.plan.length }; }
    if (id === "rooms") return { done: data.takeoff.rooms.length, total: 0 };
    const s = SECTIONS[id]; return s ? progress(s.questions, a, x => key.section(s.id, x)) : null;
  };
  const stepIndex = Math.max(0, steps.findIndex(s => s.id === step));
  const current = steps[stepIndex] ?? steps[0];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="sticky top-0 z-30 -mx-3 border-b bg-white/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
            <p className="truncate text-lg font-black">{data.details.clientName || "New visit"} <span className="text-sm font-semibold text-neutral-500">{visit.reference}</span></p>
            <p className="flex items-center gap-1 text-xs text-neutral-500">{save.state === "saved" ? <><Cloud className="h-3.5 w-3.5" />Saved</> : save.state === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : save.state === "dirty" ? <><Cloud className="h-3.5 w-3.5" />Changes not saved yet</> : <span className="flex items-center gap-1 text-red-700"><CloudOff className="h-3.5 w-3.5" />{save.text}</span>}</p>
          </div>
          <select value={status} onChange={async e => { const s = e.target.value; setStatus(s); await setVisitStatusAction(visit.id, s); }} className="rounded-full border px-3 py-1.5 text-sm">{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <a href={`/dashboard/site-visits/${visit.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={() => { if (save.state !== "saved") void flush(); }} className={`${btn} border`}><FileDown className="h-4 w-4" />PDF</a>
          <a href={`/dashboard/site-visits/${visit.id}/pdf?blank=1`} target="_blank" rel="noopener noreferrer" className={`${btn} border`} title="This visit's form with space to write, to print before you go"><FileDown className="h-4 w-4" />Print to fill in</a>
          {visit.quoteId
            ? <Link href={`/dashboard/calculator?quote=${visit.quoteId}`} className={`${btn} bg-emerald-600 text-white`}><Calculator className="h-4 w-4" />Quote {visit.quoteReference}</Link>
            : <Link href={`/dashboard/calculator?visit=${visit.id}`} aria-disabled={save.state !== "saved"} onClick={e => { if (save.state !== "saved") { e.preventDefault(); void flush(); } }} className={`${btn} bg-neutral-950 text-white ${save.state !== "saved" ? "opacity-50" : ""}`} title="Opens the calculator with everything from this visit filled in"><Calculator className="h-4 w-4" />Make the quote</Link>}
        </div>
        <nav className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:-mx-6 sm:px-6" aria-label="Visit steps">
          {steps.map((s, i) => { const c = count(s.id); const full = c && c.total > 0 && c.done >= c.total; return (
            <button key={s.id} onClick={() => setStep(s.id)} aria-current={s.id === current.id ? "step" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${s.id === current.id ? "border-neutral-900 bg-neutral-900 text-white" : full ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "bg-white"}`}>
              <span className="tabular-nums opacity-60">{i + 1}</span>{s.title}{c && (c.total > 0 ? <span className="tabular-nums opacity-70">{c.done}/{c.total}</span> : c.done > 0 ? <span className="tabular-nums opacity-70">{c.done}</span> : null)}{full && <Check className="h-3.5 w-3.5" />}
            </button>); })}
        </nav>
      </header>

      {restore && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This device has changes that weren't saved.
        <button onClick={() => { const r = restore; setRestore(null); change(() => r); }} className={`${btn} bg-amber-500 text-neutral-950`}>Restore them</button>
        <button onClick={() => { setRestore(null); try { localStorage.removeItem(backupKey); } catch { /* */ } }} className={`${btn} border`}>Discard</button></div>}

      {stepIndex === 0 && <Details d={data.details} onChange={setDetails} onType={toggleType} />}

      <section className="space-y-4">
        <h2 className="text-xl font-black">{stepIndex + 1}. {current.title === "Good morning" ? "Arrival: good morning" : current.title === "Goodbye" ? "Before you leave: goodbye" : current.title}</h2>
        {current.kind === "section" && <SectionView section={SECTIONS[current.id]} answers={data.answers} onAnswer={answer} />}
        {current.kind === "property" && <>
          <SectionView section={PROPERTY} answers={data.answers} onAnswer={answer} />
          <PropertyFields t={data.takeoff} onChange={p => setTakeoff(t => ({ ...t, property: { ...t.property, ...p } }))} />
        </>}
        {current.kind === "project" && <ProjectView id={current.id.slice(8)} answers={data.answers} onAnswer={answer} takeoff={data.takeoff} onTakeoff={setTakeoff} />}
        {current.kind === "rooms" && <RoomsView answers={data.answers} onAnswer={answer} takeoff={data.takeoff} onTakeoff={setTakeoff} />}
        {current.kind === "site" && <>
          <SectionView section={SITE} answers={data.answers} onAnswer={answer} />
          <SiteFields t={data.takeoff} onChange={p => setTakeoff(t => ({ ...t, prelims: { ...t.prelims, ...p } }))} />
        </>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button disabled={stepIndex === 0} onClick={() => { setStep(steps[stepIndex - 1].id); window.scrollTo({ top: 0 }); }} className={`${btn} flex-1 justify-center border sm:flex-none`}>Back</button>
        {stepIndex < steps.length - 1
          ? <button onClick={() => { setStep(steps[stepIndex + 1].id); window.scrollTo({ top: 0 }); }} className={`${btn} flex-1 justify-center bg-amber-500 text-neutral-950 sm:flex-none`}>Next: {steps[stepIndex + 1].title}</button>
          : <button onClick={() => void flush()} className={`${btn} flex-1 justify-center bg-neutral-950 text-white sm:flex-none`}>Save now</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pieces

function Card({ title, children, intro }: { title?: string; intro?: string; children: ReactNode }) {
  return <div className="space-y-3 rounded-2xl border bg-white p-4">{title && <h3 className="font-bold">{title}</h3>}{intro && <p className="-mt-2 text-sm text-neutral-600">{intro}</p>}{children}</div>;
}

function Details({ d, onChange, onType }: { d: VisitDetailsState; onChange: (v: Partial<VisitDetailsState>) => void; onType: (id: string) => void }) {
  return (
    <Card title="Client and visit">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-neutral-700">Client name<input className={field} value={d.clientName} onChange={e => onChange({ clientName: e.target.value })} /></label>
        <label className="text-xs font-semibold text-neutral-700">Phone<input type="tel" className={field} value={d.clientPhone} onChange={e => onChange({ clientPhone: e.target.value })} /></label>
        <label className="text-xs font-semibold text-neutral-700">Email<input type="email" className={field} value={d.clientEmail} onChange={e => onChange({ clientEmail: e.target.value })} /></label>
        <label className="text-xs font-semibold text-neutral-700">Visit date and time<input type="datetime-local" className={field} value={d.visitAt} onChange={e => onChange({ visitAt: e.target.value })} /></label>
        <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">Site address<input className={field} value={d.siteAddress} onChange={e => onChange({ siteAddress: e.target.value })} /></label>
        <label className="text-xs font-semibold text-neutral-700">Postcode<input className={field} value={d.postcode} onChange={e => onChange({ postcode: e.target.value.toUpperCase() })} /></label>
      </div>
      <p className="text-xs font-semibold text-neutral-700">Type of project</p>
      <div className="flex flex-wrap gap-1.5">{PROJECT_TYPES.map(p => { const on = d.projectTypes.includes(p.id); return (
        <button key={p.id} type="button" onClick={() => onType(p.id)} aria-pressed={on} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-amber-500 bg-amber-500 text-neutral-950" : "bg-white hover:border-amber-400"}`}>{p.label}</button>); })}</div>
    </Card>
  );
}

function SectionView({ section, answers, onAnswer, prefix }: { section: { id: string; intro?: string; questions: Question[] }; answers: Answers; onAnswer: (k: string, v: Answer | undefined) => void; prefix?: (qid: string) => string }) {
  const k = prefix ?? ((qid: string) => key.section(section.id, qid));
  return <Card intro={section.intro}><QuestionList questions={section.questions} answers={answers} k={k} onAnswer={onAnswer} /></Card>;
}

function QuestionList({ questions, answers, k, onAnswer }: { questions: Question[]; answers: Answers; k: (qid: string) => string; onAnswer: (k: string, v: Answer | undefined) => void }) {
  return <div className="space-y-3">{questions.map(q => <QuestionInput key={q.id} q={q} value={answers[k(q.id)]} onChange={v => onAnswer(k(q.id), v)} />)}</div>;
}

function QuestionInput({ q, value, onChange }: { q: Question; value: Answer | undefined; onChange: (v: Answer | undefined) => void }) {
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? "border-amber-500 bg-amber-500 font-semibold text-neutral-950" : "bg-white hover:border-amber-400"}`;
  const hint = <>{q.say && <span className="mt-0.5 block text-[13px] font-normal italic text-amber-900"><span className="mr-1 text-[10px] font-bold uppercase not-italic tracking-wide text-amber-700">Ask</span>{q.say}</span>}{q.hint && <span className="mt-0.5 block text-xs font-normal text-neutral-500">{q.hint}</span>}</>;
  switch (q.type) {
    case "heading": return <h4 className="border-b border-amber-200 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-[#0d3b72] first:pt-0">{q.label}</h4>;
    case "script": return <blockquote className="rounded-r-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-[15px] italic text-neutral-800"><span className="mb-1 block text-[11px] font-bold uppercase not-italic tracking-wide text-amber-800">Say</span>{q.label}</blockquote>;
    case "check": return <label className="flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" checked={value === true} onChange={e => onChange(e.target.checked || undefined)} /><span>{q.label}{hint}</span></label>;
    case "yesno": return <div><p className="text-sm font-semibold">{q.label}</p>{hint}<div className="mt-1.5 flex gap-2">{([[true, "Yes"], [false, "No"]] as const).map(([v, l]) => <button key={l} type="button" onClick={() => onChange(value === v ? undefined : v)} className={chip(value === v)}>{l}</button>)}</div></div>;
    case "choice": return <div><p className="text-sm font-semibold">{q.label}</p>{hint}<div className="mt-1.5 flex flex-wrap gap-1.5">{q.options!.map(o => <button key={o} type="button" onClick={() => onChange(value === o ? undefined : o)} className={chip(value === o)}>{o}</button>)}</div></div>;
    case "multi": { const list = Array.isArray(value) ? value : []; return <div><p className="text-sm font-semibold">{q.label}</p>{hint}<div className="mt-1.5 flex flex-wrap gap-1.5">{q.options!.map(o => <button key={o} type="button" onClick={() => { const n = list.includes(o) ? list.filter(x => x !== o) : [...list, o]; onChange(n.length ? n : undefined); }} className={chip(list.includes(o))}>{o}</button>)}</div></div>; }
    case "long": return <label className="block text-sm font-semibold">{q.label}{hint}<textarea rows={3} className={field} value={typeof value === "string" ? value : ""} onChange={e => onChange(e.target.value)} /></label>;
    case "number": return <label className="block text-sm font-semibold">{q.label}{q.unit ? ` (${q.unit})` : ""}{hint}<input inputMode="decimal" className={`${field} sm:w-40`} value={value === undefined ? "" : String(value)} onChange={e => { const t = e.target.value.trim(); const n = Number(t); onChange(t === "" ? undefined : Number.isFinite(n) ? n : t); }} /></label>;
    case "date": return <label className="block text-sm font-semibold">{q.label}{hint}<input type="date" className={`${field} sm:w-52`} value={typeof value === "string" ? value : ""} onChange={e => onChange(e.target.value)} /></label>;
    default: return <label className="block text-sm font-semibold">{q.label}{hint}<input className={field} value={typeof value === "string" ? value : value === undefined ? "" : String(value)} onChange={e => onChange(e.target.value)} /></label>;
  }
}

function Sel({ label, value, options, onChange }: { label: string; value: string | undefined; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return <label className="text-xs font-semibold text-neutral-700">{label}<select className={field} value={value ?? ""} onChange={e => onChange(e.target.value)}><option value="">–</option>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>;
}
function Num({ label, value, onChange, int }: { label: string; value: unknown; onChange: (v: number | undefined) => void; int?: boolean }) {
  const [t, setT] = useState(value === undefined ? "" : String(value));
  useEffect(() => { setT(value === undefined ? "" : String(value)); }, [value]);
  return <label className="text-xs font-semibold text-neutral-700">{label}<input inputMode={int ? "numeric" : "decimal"} className={field} value={t}
    onChange={e => { setT(e.target.value); const s = e.target.value.trim(); const n = Number(s); if (s === "") onChange(undefined); else if (Number.isFinite(n)) onChange(int ? Math.round(n) : n); }} /></label>;
}
function Tick({ label, value, onChange }: { label: string; value: unknown; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={value === true} onChange={e => onChange(e.target.checked)} />{label}</label>;
}

function PropertyFields({ t, onChange }: { t: VisitTakeoff; onChange: (p: Record<string, unknown>) => void }) {
  const p = t.property;
  const set = (k: string) => (v: unknown) => onChange({ [k]: v === "" ? undefined : v });
  return (
    <Card title="House details for the quote" intro="These go straight into the quote calculator.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Sel label="House type" value={p.houseType as string} options={houseTypeOptions} onChange={set("houseType")} />
        <Num label="Width, party wall to party wall (m)" value={p.width} onChange={set("width")} />
        <Num label="Depth, front to back (m)" value={p.length} onChange={set("length")} />
        <Num label="Storeys" int value={p.storeys} onChange={set("storeys")} />
        <Num label="Bedrooms" int value={p.bedrooms} onChange={set("bedrooms")} />
        <Sel label="Walls" value={p.construction as string} options={constructionOptions} onChange={set("construction")} />
        <Sel label="Age" value={p.age as string} options={ageOptions} onChange={set("age")} />
        <Sel label="During the works" value={p.occupancy as string} options={occupancyOptions} onChange={set("occupancy")} />
        <Sel label="Parking" value={p.parking as string} options={parkingOptions} onChange={set("parking")} />
        <Sel label="Access" value={p.access as string} options={accessOptions} onChange={set("access")} />
      </div>
      <label className="block text-xs font-semibold text-neutral-700">Notes about the house (go on the quote)<textarea rows={2} className={field} value={(p.notes as string) ?? ""} onChange={e => onChange({ notes: e.target.value.slice(0, 1500) })} /></label>
    </Card>
  );
}

function SiteFields({ t, onChange }: { t: VisitTakeoff; onChange: (p: Record<string, unknown>) => void }) {
  const p = t.prelims;
  return (
    <Card title="Site set-up for the quote" intro="Scaffold, skips, fees and services – these go straight into the quote.">
      <div><p className="text-xs font-semibold text-neutral-700">Scaffold</p><div className="mt-1 flex flex-wrap gap-1.5">{scaffoldModeOptions.map(([k, l]) => <button key={k} type="button" onClick={() => onChange({ scaffoldMode: k, ...(k !== "NO" ? { scaffold: true } : {}) })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${(p.scaffoldMode ?? "AUTO") === k ? "border-amber-500 bg-amber-500 text-neutral-950" : "bg-white"}`}>{l}</button>)}</div></div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Tick label="Chimney scaffold / roof access" value={p.chimneyScaffold} onChange={v => onChange({ chimneyScaffold: v })} />
        <Tick label="Welfare (toilet / cabin)" value={p.welfare ?? true} onChange={v => onChange({ welfare: v })} />
        <Tick label="Protect floors, stairs and furniture" value={p.siteProtection ?? true} onChange={v => onChange({ siteProtection: v })} />
        <Tick label="Building control" value={p.buildingControl ?? true} onChange={v => onChange({ buildingControl: v })} />
        <Tick label="Structural engineer" value={p.structuralEngineer ?? true} onChange={v => onChange({ structuralEngineer: v })} />
        <Tick label="New consumer unit" value={p.consumerUnit} onChange={v => onChange({ consumerUnit: v })} />
        <Tick label="Move the stopcock" value={p.moveStopcock} onChange={v => onChange({ moveStopcock: v })} />
        <Tick label="Skips worked out from the job" value={p.autoSkips ?? true} onChange={v => onChange({ autoSkips: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {p.autoSkips === false && <Num label="Skips" int value={p.skips} onChange={v => onChange({ skips: v })} />}
        <Num label="Party wall neighbours" int value={p.partyWallNeighbours} onChange={v => onChange({ partyWallNeighbours: v })} />
        <Num label="New water main (m)" value={p.waterMainRun} onChange={v => onChange({ waterMainRun: v })} />
        <Num label="Outside taps" int value={p.outsideTaps} onChange={v => onChange({ outsideTaps: v })} />
      </div>
    </Card>
  );
}

function ProjectView({ id, answers, onAnswer, takeoff, onTakeoff }: { id: string; answers: Answers; onAnswer: (k: string, v: Answer | undefined) => void; takeoff: VisitTakeoff; onTakeoff: (fn: (t: VisitTakeoff) => VisitTakeoff) => void }) {
  const p = projectType(id);
  const [openSpec, setOpenSpec] = useState(true);
  if (!p) return null;
  return (
    <>
      <Card title="Walk-round" intro="Do these in order and tick each one off.">
        <div className="space-y-2">{p.plan.map((s, i) => <QuestionInput key={i} q={{ id: String(i), label: s, type: "check" }} value={answers[key.plan(p.id, i)]} onChange={v => onAnswer(key.plan(p.id, i), v)} />)}</div>
      </Card>
      <Card title="Ask the client"><QuestionList questions={p.questions} answers={answers} k={x => key.project(p.id, x)} onAnswer={onAnswer} /></Card>
      {p.packages.map(pid => { const pkg = workPackages.find(w => w.id === pid); if (!pkg) return null; const v = takeoff.packages[pid]; return (
        <div key={pid} className="rounded-2xl border bg-white">
          <button type="button" onClick={() => setOpenSpec(!openSpec)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
            <span><span className="block font-bold">{pkg.label}: measurements and specification</span><span className="block text-xs text-neutral-500">The calculator's own fields – they go straight into the quote. Fill in what you can on site.</span></span>
            {openSpec ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
          </button>
          {openSpec && <div className="border-t p-4"><PackageFields pkg={toSpec(pkg)} values={v?.values} inputClass={field} showClientChoice
            onChange={values => onTakeoff(t => ({ ...t, packages: { ...t.packages, [pid]: { enabled: true, values: { ...t.packages[pid]?.values, ...values } } } }))} /></div>}
        </div>); })}
      <Card title="Photos to take"><div className="space-y-2">{p.photos.map((s, i) => <QuestionInput key={i} q={{ id: String(i), label: s, type: "check" }} value={answers[`photo.${p.id}.${i}`]} onChange={v => onAnswer(`photo.${p.id}.${i}`, v)} />)}</div></Card>
    </>
  );
}

function RoomsView({ answers, onAnswer, takeoff, onTakeoff }: { answers: Answers; onAnswer: (k: string, v: Answer | undefined) => void; takeoff: VisitTakeoff; onTakeoff: (fn: (t: VisitTakeoff) => VisitTakeoff) => void }) {
  const [type, setType] = useState<RoomInput["type"]>("BEDROOM");
  const setRooms = (fn: (r: RoomInput[]) => RoomInput[]) => onTakeoff(t => ({ ...t, rooms: fn(t.rooms) }));
  const add = () => setRooms(rs => { const n = rs.filter(r => r.type === type).length; const name = roomTypeOptions.find(([k]) => k === type)?.[1] ?? "Room"; return [...rs, newRoom(type, n ? `${name} ${n + 1}` : name)]; });
  return (
    <>
      <SectionView section={FINISHES_INTRO} answers={answers} onAnswer={onAnswer} />
      {takeoff.rooms.map((r, i) => <RoomSheet key={r.id} room={r} index={i} count={takeoff.rooms.length} answers={answers} onAnswer={onAnswer}
        onChange={v => setRooms(rs => rs.map(x => x.id === r.id ? { ...x, ...v } : x))}
        onRemove={() => setRooms(rs => rs.filter(x => x.id !== r.id))}
        onDuplicate={() => setRooms(rs => { const c = { ...newRoom(r.type, `${r.name} (copy)`), floor: r.floor, length: r.length, width: r.width, height: r.height, doors: r.doors, windows: r.windows, radiators: r.radiators, works: { ...r.works } }; return [...rs.slice(0, i + 1), c, ...rs.slice(i + 1)]; })}
        onMove={d => setRooms(rs => { const j = i + d; if (j < 0 || j >= rs.length) return rs; const n = [...rs]; [n[i], n[j]] = [n[j], n[i]]; return n; })} />)}
      <Card title="Add a room">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-neutral-700">Type<select className={`${field} w-48`} value={type} onChange={e => setType(e.target.value as RoomInput["type"])}>{roomTypeOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <button type="button" onClick={add} className={`${btn} bg-amber-500 text-neutral-950`}><Plus className="h-4 w-4" />Add room</button>
        </div>
      </Card>
    </>
  );
}

function RoomSheet({ room, index, count, answers, onAnswer, onChange, onRemove, onDuplicate, onMove }: {
  room: RoomInput; index: number; count: number; answers: Answers; onAnswer: (k: string, v: Answer | undefined) => void;
  onChange: (v: Partial<RoomInput>) => void; onRemove: () => void; onDuplicate: () => void; onMove: (d: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"work" | "finishes">("work");
  const g = roomGeometry(room);
  const picked = roomJobs(room.works) ?? [];
  const jobs = ROOM_JOBS.filter(j => !j.types || j.types.includes(room.type));
  const setJobs = (list: string[], extra: Values = {}) => onChange({ works: { ...room.works, ...extra, jobs: list.join(",") } });
  const toggleJob = (id: string) => {
    if (picked.includes(id)) return setJobs(picked.filter(x => x !== id));
    const j = ROOM_JOBS.find(x => x.id === id)!;
    const start = Object.fromEntries(Object.entries(j.on ?? {}).filter(([k]) => { const now = room.works[k] ?? roomSpec.defaults[k]; return now === j.off[k] || now === undefined; }));
    setJobs([...picked, id], start);
  };
  const groups = picked.length ? new Set(ROOM_JOBS.filter(j => picked.includes(j.id)).flatMap(j => j.groups)) : null;
  const finishes = roomFinishesFor(room.type, room.floor);
  const doneFinishes = progress(finishes, answers, x => key.room(room.id, x));
  return (
    <section className="rounded-2xl border bg-white">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          <span className="min-w-0"><span className="block truncate font-bold">{room.name}</span><span className="block truncate text-xs text-neutral-500">{floorOptions.find(([k]) => k === room.floor)?.[1]} · {room.length} × {room.width} m · {g.floor} m² · finishes {doneFinishes.done}/{doneFinishes.total}</span></span>
        </button>
        <button type="button" title="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 text-neutral-400 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" title="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1 text-neutral-400 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
        <button type="button" title="Duplicate" onClick={onDuplicate} className="p-1 text-neutral-400"><Copy className="h-4 w-4" /></button>
        <button type="button" title="Remove" onClick={() => { if (confirm(`Remove ${room.name}?`)) onRemove(); }} className="p-1 text-neutral-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
      </header>
      {open && <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-neutral-700">Room name<input className={field} value={room.name} onChange={e => onChange({ name: e.target.value || "Room" })} /></label>
          <label className="text-xs font-semibold text-neutral-700">Type<select className={field} value={room.type} onChange={e => { const works = { ...room.works }; for (const k of Object.keys(roomTypeDefaults(room.type))) delete works[k]; onChange({ type: e.target.value as RoomInput["type"], works }); }}>{roomTypeOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="text-xs font-semibold text-neutral-700">Floor<select className={field} value={room.floor} onChange={e => onChange({ floor: e.target.value as RoomInput["floor"] })}>{floorOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <Num label="Length (m)" value={room.length} onChange={v => v !== undefined && v >= 0.5 && onChange({ length: v })} />
          <Num label="Width (m)" value={room.width} onChange={v => v !== undefined && v >= 0.5 && onChange({ width: v })} />
          <Num label="Ceiling height (m)" value={room.height} onChange={v => v !== undefined && v >= 1.8 && onChange({ height: v })} />
          <Num label="Doors" int value={room.doors} onChange={v => v !== undefined && onChange({ doors: v })} />
          <Num label="Windows" int value={room.windows} onChange={v => v !== undefined && onChange({ windows: v })} />
          <Num label="Radiators" int value={room.radiators} onChange={v => v !== undefined && onChange({ radiators: v })} />
        </div>
        <label className="block text-xs font-semibold text-neutral-700">Notes about this room<textarea rows={2} className={field} value={room.notes} onChange={e => onChange({ notes: e.target.value.slice(0, 600) })} /></label>
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-sm font-semibold">
          {([["work", "Work in the room"], ["finishes", `Finishes ${doneFinishes.done}/${doneFinishes.total}`]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-full px-3 py-1.5 ${tab === k ? "bg-white shadow" : "text-neutral-600"}`}>{l}</button>)}
        </div>
        {tab === "work" ? <>
          <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50/50 p-2.5">
            <p className="mb-1.5 text-xs font-semibold text-neutral-700">Jobs the client wants here</p>
            <div className="flex flex-wrap gap-1.5">{jobs.map(j => <button type="button" key={j.id} onClick={() => toggleJob(j.id)} aria-pressed={picked.includes(j.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${picked.includes(j.id) ? "border-amber-500 bg-amber-500 text-neutral-950" : "bg-white"}`}>{j.label}</button>)}</div>
          </div>
          {picked.length > 0 && <PackageFields pkg={{ ...roomSpec, fields: roomSpec.fields.filter(f => !groups || groups.has(f.group ?? "")) }} values={{ ...roomTypeDefaults(room.type), ...room.works }} context={{ roomType: room.type }}
            onChange={works => onChange({ works: { ...room.works, ...works } })} inputClass={field} showClientChoice />}
        </> : <QuestionList questions={finishes} answers={answers} k={x => key.room(room.id, x)} onAnswer={onAnswer} />}
      </div>}
    </section>
  );
}

