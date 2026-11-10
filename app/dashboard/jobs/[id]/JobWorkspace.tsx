"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Banknote, Camera, CircleCheck, ClipboardCheck, ClipboardList, Receipt, UserCog, ExternalLink, Eye, EyeOff, FileText, FolderOpen, Search, HardHat, LogIn, LogOut, Mail, MapPin, MessageSquare, Package, Phone, Printer, Send, Star, Trash2, TriangleAlert, Users,
} from "lucide-react";
import { UploadDropzone } from "@/app/lib/uploadthing";
import type { DueRow, OrderNeed, PayOwed, StageProgress, SupplyNeed } from "@/app/lib/takeoff/jobs";
import { daysWorked } from "@/app/lib/takeoff/jobs";
import { DOC_CATEGORIES, docCategoryLabel, type DocCategory } from "@/app/lib/takeoff/job-documents";
import { docKinds } from "@/app/componets/takeoff/QuoteDocuments";
import { SnagList, type SnagView } from "@/app/componets/takeoff/SnagList";
import type { ActionRow, CheckInRow, ClientContact, ExpenseRow, JobEvent, JobStatus, PaymentRow, AssignmentRow } from "@/app/lib/takeoff/jobs-store";
import {
  addClientActionAction, addExpenseAction, addPhotosAction, adminCheckInAction, assignWorkerAction, postMessageAction, rateWorkerAction, recordPaymentAction, reviewPaymentAction,
  addDocumentsAction, addSnagAction, issueInvoiceAction, resendInvoiceAction, saveClientInfoAction, setManagerAction, setSnagAction, setClientActionStatusAction, updateDocumentAction, setOrderAction, setStageAction, setSupplyAction, updateJobAction, updatePhotoAction, voidExpenseAction,
} from "../actions";

type Iso<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };
type WorkerLite = { id: string; name: string; trade: string; kind: string; payBasis: "DAY" | "JOB"; dayRate: number | null; phone: string; email: string; rating: number | null; active: boolean };
export interface JobView {
  quoteId: string; reference: string; status: string; clientName: string; clientEmail: string; siteAddress: string; jobStatus: JobStatus; startDate: string; contacts: ClientContact[]; accessNotes: string; phone: string;
  progress: { stages: StageProgress[]; percent: number; behind: number };
  events: Iso<JobEvent, "createdAt">[]; photos: { id: string; url: string; caption: string; stage: string; visibleToClient: boolean; favourite: boolean; createdAt: string }[];
  documents: { id: string; category: string; title: string; fileName: string; url: string; mimeType: string; sizeBytes: number; note: string; visibleToClient: boolean; createdAt: string }[]; docsReady: boolean;
  actions: (Omit<ActionRow, "createdAt" | "respondedAt"> & { createdAt: string; respondedAt: string | null })[]; supplies: SupplyNeed[];
  money: { rows: DueRow[]; received: number; outstanding: number; reported: number }; payments: Iso<PaymentRow, "createdAt">[];
  finance: { contract: number; net: number; plannedCost: number; spent: number; received: number; profitSoFar: number };
  variations: { net: number; gross: number; count: number };
  expenses: Iso<ExpenseRow, "createdAt">[]; team: { assignment: AssignmentRow; worker: WorkerLite & { createdAt: string }; owed: PayOwed }[]; workers: WorkerLite[];
  checkIns: Iso<CheckInRow, "at">[]; toOrder: OrderNeed[]; orders: { stage: string; status: "ORDERED" | "DELIVERED"; supplier: string; note: string; updatedAt: string }[];
  stageMaterials: { stage: string; label: string; start: string | null; items: { description: string; quantity: number; unit: string }[] }[];
  /** Client portal (empty until the client-portal migration has run). */
  portalOn: boolean; requestedStart: string | null; manager: { name: string; phone: string; email: string };
  invoices: { number: string; label: string; scheduleNo: number; issuedOn: string; dueOn: string; gross: number; balance: number; emailed: boolean }[];
  snags: SnagView[];
}

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const input = "w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm";
const btn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40";
const TABS = [["progress", "Progress", ClipboardList], ["photos", "Photos", Camera], ["documents", "Documents", FileText], ["client", "Client", MessageSquare], ["money", "Money", Banknote], ["snags", "Snagging", ClipboardCheck], ["team", "Team", Users], ["orders", "Orders", Package]] as const;
type Tab = (typeof TABS)[number][0];
const stateTone: Record<DueRow["state"], string> = { PAID: "bg-emerald-100 text-emerald-800", PART_PAID: "bg-sky-100 text-sky-800", DUE: "bg-amber-100 text-amber-800", OVERDUE: "bg-red-100 text-red-800", UPCOMING: "bg-neutral-100 text-neutral-700" };

export function JobWorkspace({ job: j, initialTab }: { job: JobView; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((TABS.find(([k]) => k === initialTab)?.[0] ?? "progress") as Tab);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, done?: string) => {
    setBusy(true); const r = await fn(); setBusy(false);
    setMsg(r.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: r.message ?? "Failed" });
    if (r.ok) router.refresh();
    return r.ok;
  };
  const p = { j, act, busy };
  const openRequests = j.actions.filter(a => a.status === "OPEN" || a.status === "ANSWERED").length;
  return (
    <div className="space-y-5 p-6">
      <Link href="/dashboard/jobs" className="inline-flex items-center gap-1 text-sm text-neutral-600"><ArrowLeft className="h-4 w-4" />Jobs</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{j.reference}</p>
          <h1 className="text-2xl font-black">{j.clientName}</h1>
          <p className="text-sm text-neutral-600">{j.siteAddress}</p>
          <p className="mt-1 flex flex-wrap gap-3 text-sm">
            {j.phone && <a className="inline-flex items-center gap-1 font-semibold text-amber-700" href={`tel:${j.phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" />{j.phone}</a>}
            <a className="inline-flex items-center gap-1 font-semibold text-amber-700" href={`mailto:${j.clientEmail}`}><Mail className="h-4 w-4" />{j.clientEmail}</a>
            <Link className="text-neutral-600 underline" href={`/dashboard/calculator?quote=${j.quoteId}`}>Open quote</Link>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold">Status
            <select className={input} value={j.jobStatus} disabled={busy} onChange={e => act(() => updateJobAction(j.quoteId, { status: e.target.value }))}>
              <option value="PLANNED">Planned</option><option value="IN_PROGRESS">In progress</option><option value="ON_HOLD">On hold</option><option value="COMPLETED">Completed</option>
            </select></label>
          <label className="text-xs font-semibold">Start date
            <input type="date" className={input} defaultValue={j.startDate} onBlur={e => e.target.value !== j.startDate && act(() => updateJobAction(j.quoteId, { startDate: e.target.value || null }), "Start date saved – programme and payment dates updated.")} />
            {!j.startDate && j.requestedStart && <button type="button" disabled={busy} onClick={() => act(() => updateJobAction(j.quoteId, { startDate: j.requestedStart }), "Start date confirmed – the client can see it.")} className="mt-1 block text-[11px] font-semibold text-amber-700 hover:underline">Client asked for {j.requestedStart} – confirm</button>}</label>
          <div className="w-40"><p className="text-xs font-semibold">Progress {j.progress.percent}%</p><div className="mt-1 h-2 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${j.progress.percent}%` }} /></div></div>
        </div>
      </header>
      {j.status !== "ACCEPTED" && <p className="rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-900">This quote is not accepted yet ({j.status.toLowerCase()}). You can already add site photos; the client sees the project panel once they accept.</p>}
      {msg && <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      <nav className="flex flex-wrap gap-1 rounded-2xl bg-neutral-100 p-1 text-sm font-semibold">
        {TABS.map(([k, l, Icon]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 ${tab === k ? "bg-white shadow" : "text-neutral-600"}`}><Icon className="h-4 w-4" />{l}
          {k === "client" && openRequests > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{openRequests}</span>}
          {k === "money" && j.money.reported > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">!</span>}
          {k === "orders" && j.toOrder.some(o => !o.ordered) && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{j.toOrder.filter(o => !o.ordered).length}</span>}</button>)}
      </nav>
      {tab === "progress" && <ProgressTab {...p} />}
      {tab === "photos" && <PhotosTab {...p} />}
      {tab === "documents" && <DocumentsTab {...p} />}
      {tab === "client" && <ClientTab {...p} />}
      {tab === "money" && <MoneyTab {...p} />}
      {tab === "snags" && (j.portalOn ? <SnagList snags={j.snags} audience="admin" busy={busy}
        add={d => act(() => addSnagAction(j.quoteId, d), "Snag added – the client can see it.")} toggle={(id, isDone) => act(() => setSnagAction(j.quoteId, id, isDone), isDone ? "Marked as done – the client can see it." : "Reopened.")} />
        : <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">The snagging list needs the client-portal migration (20261112120000_client_portal).</p>)}
      {tab === "team" && <TeamTab {...p} />}
      {tab === "orders" && <OrdersTab {...p} />}
    </div>
  );
}

type P = { j: JobView; act: (fn: () => Promise<{ ok: boolean; message?: string }>, done?: string) => Promise<boolean>; busy: boolean };
const Card = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <section className="rounded-xl border bg-white p-4"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">{title}</h2>{right}</div>{children}</section>
);

// ---------------------------------------------------------------- Progress

function ProgressTab({ j, act, busy }: P) {
  return (
    <div className="grid gap-5 xl:grid-cols-5">
      <div className="space-y-3 xl:col-span-3">
        <Card title="Stages" right={j.progress.behind > 0 ? <span className="flex items-center gap-1 text-xs font-semibold text-red-700"><TriangleAlert className="h-4 w-4" />{j.progress.behind} behind programme</span> : undefined}>
          {!j.progress.stages.length && <p className="text-sm text-neutral-500">No programme stages.</p>}
          <ul className="divide-y">{j.progress.stages.map(s => <StageRowEdit key={s.stage} s={s} busy={busy} save={(v) => act(() => setStageAction(j.quoteId, { stage: s.stage, label: s.label, ...v }), `${s.label} updated – the client can see it.`)} />)}</ul>
        </Card>
      </div>
      <div className="xl:col-span-2"><Card title="Activity"><Feed events={j.events} /></Card></div>
    </div>
  );
}

function StageRowEdit({ s, save, busy }: { s: StageProgress; save: (v: { status: StageProgress["status"]; percent: number; note: string }) => void; busy: boolean }) {
  const [status, setStatus] = useState(s.status), [percent, setPercent] = useState(s.percent), [note, setNote] = useState(s.note);
  const changed = status !== s.status || percent !== s.percent || note !== s.note;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{s.label}{s.late && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-800">late</span>}</p>
        <p className="text-xs text-neutral-500">{s.start ? `${s.start} → ${s.end}` : `${s.days} days`}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select className={`${input} w-36`} value={status} onChange={e => { const v = e.target.value as StageProgress["status"]; setStatus(v); setPercent(v === "DONE" ? 100 : v === "NOT_STARTED" ? 0 : Math.max(10, percent)); }}>
          <option value="NOT_STARTED">Not started</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select>
        {status === "IN_PROGRESS" && <input type="range" min={5} max={95} step={5} value={percent} onChange={e => setPercent(Number(e.target.value))} className="w-32 accent-amber-600" />}
        <span className="w-10 text-xs font-semibold">{percent}%</span>
        <input className={`${input} min-w-[12rem] flex-1`} placeholder="Note for the client (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button disabled={!changed || busy} onClick={() => save({ status, percent, note })} className={`${btn} bg-neutral-950 text-white`}>Save</button>
      </div>
    </li>
  );
}

function Feed({ events }: { events: JobView["events"] }) {
  const tone: Record<string, string> = { CLIENT: "bg-sky-100 text-sky-800", ADMIN: "bg-neutral-100 text-neutral-700", WORKER: "bg-amber-100 text-amber-800", SYSTEM: "bg-violet-100 text-violet-800" };
  return <ul className="max-h-[32rem] space-y-2 overflow-y-auto text-sm">{events.map(e => (
    <li key={e.id} className="border-b pb-2"><span className={`mr-2 rounded px-1.5 text-[10px] font-bold ${tone[e.actorKind]}`}>{e.actorKind === "ADMIN" ? "You" : e.actorKind === "CLIENT" ? "Client" : e.actorKind === "WORKER" ? "Team" : "Auto"}</span>
      {!e.visibleToClient && <span className="mr-1 text-[10px] text-neutral-400">(internal)</span>}{e.message}<span className="block text-xs text-neutral-400">{when(e.createdAt)}</span></li>
  ))}{!events.length && <li className="text-neutral-500">Nothing yet.</li>}</ul>;
}

// ---------------------------------------------------------------- Photos

function PhotosTab({ j, act, busy }: P) {
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("");
  return (
    <div className="space-y-4">
      <Card title="Add site photos" right={<span className="text-xs text-neutral-500">New photos are private until you share them</span>}>
        <label className="mb-2 block text-xs font-semibold">Stage (optional)
          <select className={`${input} max-w-xs`} value={stage} onChange={e => setStage(e.target.value)}><option value="">Survey / general</option>{j.progress.stages.map(s => <option key={s.stage} value={s.label}>{s.label}</option>)}</select></label>
        <UploadDropzone endpoint="imageUploader" config={{ mode: "auto" }}
          onClientUploadComplete={(res: unknown[]) => { setErr(""); act(() => addPhotosAction(j.quoteId, (res as unknown as { ufsUrl?: string; url?: string; serverData?: { url?: string } }[]).map(f => ({ url: f.ufsUrl || f.url || f.serverData?.url || "", caption: "", stage })).filter(p => p.url)), `${res.length} photo${res.length > 1 ? "s" : ""} added.`); }}
          onUploadError={(e: unknown) => setErr((e instanceof Error && e.message) || "Upload failed. Please try again.")} className="rounded-xl border border-dashed border-amber-300 bg-amber-50 ut-button:rounded-full ut-button:bg-neutral-950 ut-button:text-white" />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{j.photos.map(ph => (
        <figure key={ph.id} className={`overflow-hidden rounded-xl border bg-white ${ph.visibleToClient ? "ring-2 ring-emerald-400" : ""}`}>
          <a href={ph.url} target="_blank" rel="noreferrer"><img src={ph.url} alt={ph.caption} className="aspect-[4/3] w-full object-cover" loading="lazy" /></a>
          <figcaption className="space-y-2 p-2">
            <input className={input} defaultValue={ph.caption} placeholder="Caption" onBlur={e => e.target.value !== ph.caption && act(() => updatePhotoAction(j.quoteId, ph.id, { caption: e.target.value }))} />
            <p className="text-[11px] text-neutral-500">{ph.stage || "General"} · {when(ph.createdAt)}</p>
            <div className="flex flex-wrap gap-1.5">
              <button disabled={busy} onClick={() => act(() => updatePhotoAction(j.quoteId, ph.id, { visibleToClient: !ph.visibleToClient }))} className={`${btn} ${ph.visibleToClient ? "bg-emerald-600 text-white" : "border"}`}>{ph.visibleToClient ? <><Eye className="h-3.5 w-3.5" />Client sees</> : <><EyeOff className="h-3.5 w-3.5" />Private</>}</button>
              <button disabled={busy} onClick={() => act(() => updatePhotoAction(j.quoteId, ph.id, { favourite: !ph.favourite }))} title="Favourites are kept for the website portfolio" className={`${btn} ${ph.favourite ? "bg-amber-400" : "border"}`}><Star className="h-3.5 w-3.5" />{ph.favourite ? "Favourite" : "Favourite?"}</button>
              <button disabled={busy} onClick={() => confirm("Remove this photo from the job? (It is hidden, not deleted.)") && act(() => updatePhotoAction(j.quoteId, ph.id, { hidden: true }))} className={`${btn} border text-red-700`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </figcaption>
        </figure>
      ))}</div>
      {!j.photos.length && <p className="text-sm text-neutral-500">No photos yet. Add survey photos now – they stay with the job from quote to completion.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Documents

const fileSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ext = (name: string) => (name.split(".").pop() || "file").slice(0, 4).toUpperCase();

function DocumentsTab({ j, act, busy }: P) {
  const [err, setErr] = useState("");
  const [category, setCategory] = useState<DocCategory>("PLANS");
  const [share, setShare] = useState(false);
  const [q, setQ] = useState("");
  const shown = j.documents.filter(d => !q || `${d.title} ${d.fileName} ${docCategoryLabel(d.category)}`.toLowerCase().includes(q.toLowerCase()));
  const groups = DOC_CATEGORIES.map(([k, label]) => ({ k, label, docs: shown.filter(d => d.category === k) })).filter(g => g.docs.length);
  return (
    <div className="space-y-4">
      <Card title="Documents we produce" right={<Link href={`/dashboard/jobs/${j.quoteId}/documents`} className={`${btn} bg-neutral-900 text-white`}><ExternalLink className="h-3.5 w-3.5" />Open & print</Link>}>
        <p className="text-sm text-neutral-600">Written automatically from the accepted quote and kept up to date with the start date: client documents, a RAMS for every activity, toolbox talks, induction, permits, registers, Building Regulations checklist and the completion set. The client sees the client documents under “Quote &amp; documents”.</p>
        <div className="mt-3 flex flex-wrap gap-2">{docKinds.map(([k, l]) => <span key={k} className="inline-flex items-center gap-1.5 rounded-full border bg-neutral-50 px-3 py-1 text-xs font-semibold"><FileText className="h-3.5 w-3.5 text-amber-600" />{l}</span>)}</div>
      </Card>

      <Card title="Upload documents" right={<span className="text-xs text-neutral-500">PDF, drawings, photos, Word/Excel – up to 20 at a time</span>}>
        {!j.docsReady ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Uploading documents needs the new table: apply migration <code>20261104120000_add_job_documents</code>.</p> : <>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold">Type of document
              <select className={`${input} w-64`} value={category} onChange={e => setCategory(e.target.value as DocCategory)}>{DOC_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="flex items-center gap-2 pb-1.5 text-sm"><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} />Share with the client straight away</label>
          </div>
          <UploadDropzone endpoint="documentUploader" config={{ mode: "auto" }}
            onClientUploadComplete={(res: unknown[]) => {
              setErr("");
              const files = (res as unknown as { ufsUrl?: string; url?: string; name?: string; size?: number; type?: string }[]).map(x => ({ url: x.ufsUrl || x.url || "", fileName: x.name ?? "file", sizeBytes: x.size ?? 0, mimeType: x.type ?? "" })).filter(f => f.url);
              act(() => addDocumentsAction(j.quoteId, { category, visibleToClient: share, files }), `${files.length} document${files.length > 1 ? "s" : ""} added to ${docCategoryLabel(category)}.`);
            }}
            onUploadError={(e: unknown) => setErr((e instanceof Error && e.message) || "Upload failed. Please try again.")} className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 ut-button:rounded-full ut-button:bg-neutral-950 ut-button:text-white" />
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        </>}
      </Card>

      {j.documents.length > 0 && (
        <div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input className={`${input} pl-9`} placeholder="Search documents" value={q} onChange={e => setQ(e.target.value)} /></div>
      )}
      {groups.map(g => (
        <Card key={g.k} title={`${g.label} (${g.docs.length})`}>
          <ul className="divide-y">{g.docs.map(d => (
            <li key={d.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <a href={d.url} target="_blank" rel="noreferrer" className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-900 text-[10px] font-black text-amber-400">
                {/^image\//.test(d.mimeType) ? <img src={d.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : ext(d.fileName)}
              </a>
              <div className="min-w-0 flex-1">
                <input className={`${input} font-semibold`} defaultValue={d.title} onBlur={e => e.target.value.trim() && e.target.value !== d.title && act(() => updateDocumentAction(j.quoteId, d.id, { title: e.target.value }))} />
                <p className="mt-1 truncate text-[11px] text-neutral-500">{d.fileName} · {fileSize(d.sizeBytes)} · {when(d.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <select aria-label="Type" className="rounded-lg border px-2 py-1 text-xs" value={d.category} disabled={busy} onChange={e => act(() => updateDocumentAction(j.quoteId, d.id, { category: e.target.value }))}>{DOC_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <a href={d.url} target="_blank" rel="noreferrer" className={`${btn} border`}><FolderOpen className="h-3.5 w-3.5" />Open</a>
                <button disabled={busy} onClick={() => act(() => updateDocumentAction(j.quoteId, d.id, { visibleToClient: !d.visibleToClient }), d.visibleToClient ? "Hidden from the client." : "Shared – the client has been notified in their panel.")} className={`${btn} ${d.visibleToClient ? "bg-emerald-600 text-white" : "border"}`}>{d.visibleToClient ? <><Eye className="h-3.5 w-3.5" />Client sees</> : <><EyeOff className="h-3.5 w-3.5" />Private</>}</button>
                <button disabled={busy} onClick={() => confirm("Remove this document from the job? (It is hidden, not deleted.)") && act(() => updateDocumentAction(j.quoteId, d.id, { hidden: true }))} className={`${btn} border text-red-700`} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}</ul>
        </Card>
      ))}
      {j.docsReady && !j.documents.length && <p className="text-sm text-neutral-500">No documents uploaded yet. Add the drawings, structural calcs, Building Control approvals, signed contract and certificates as they arrive.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Client

function ClientTab({ j, act, busy }: P) {
  const [text, setText] = useState(""), [internal, setInternal] = useState(false);
  const [req, setReq] = useState({ kind: "DECISION", title: "", detail: "", dueDate: "", price: "", vat: "20" });
  const [contacts, setContacts] = useState(j.contacts), [notes, setNotes] = useState(j.accessNotes);
  const messages = j.events.filter(e => ["MESSAGE", "NOTE", "CLIENT_MESSAGE", "CLIENT_NOTE", "ANSWER"].includes(e.kind));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        {j.portalOn && <ManagerCard j={j} act={act} busy={busy} />}
        <Card title="Messages & notes">
          <div className="flex flex-col gap-2">
            <textarea className={input} rows={3} placeholder={internal ? "Internal note (only you see this)" : "Message to the client (shown in their panel)"} value={text} onChange={e => setText(e.target.value)} />
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />Internal note</label>
              <button disabled={busy || !text.trim()} onClick={async () => (await act(() => postMessageAction(j.quoteId, text, internal))) && setText("")} className={`${btn} bg-neutral-950 text-white`}><Send className="h-3.5 w-3.5" />{internal ? "Save note" : "Send"}</button></div>
          </div>
          <div className="mt-3"><Feed events={messages} /></div>
        </Card>
        <Card title="Client contacts & access">
          {contacts.map((c, i) => (
            <div key={i} className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["name", "role", "phone", "email"] as const).map(k => <input key={k} className={input} placeholder={k} value={c[k]} onChange={e => setContacts(contacts.map((x, n) => n === i ? { ...x, [k]: e.target.value } : x))} />)}
            </div>
          ))}
          <button onClick={() => setContacts([...contacts, { name: "", role: "", phone: "", email: "" }])} className="text-xs font-semibold text-amber-700">+ Add contact</button>
          <textarea className={`${input} mt-2`} rows={3} placeholder="Access, parking, keys, pets, alarm…" value={notes} onChange={e => setNotes(e.target.value)} />
          <button disabled={busy} onClick={() => act(() => saveClientInfoAction(j.quoteId, { contacts: contacts.filter(c => c.name || c.phone || c.email), accessNotes: notes }), "Saved.")} className={`${btn} mt-2 bg-neutral-950 text-white`}>Save</button>
          <ul className="mt-3 space-y-1 text-sm">{j.contacts.filter(c => c.phone || c.email).map((c, i) => <li key={i}>{c.name} {c.role && <span className="text-neutral-500">({c.role})</span>} {c.phone && <a className="ml-2 text-amber-700" href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>} {c.email && <a className="ml-2 text-amber-700" href={`mailto:${c.email}`}>{c.email}</a>}</li>)}</ul>
        </Card>
      </div>
      <div className="space-y-5">
        <Card title="Requests to the client">
          <div className="grid gap-2 sm:grid-cols-4">
            <select className={input} value={req.kind} onChange={e => setReq({ ...req, kind: e.target.value })}>
              {[["DECISION", "Decision"], ["QUESTION", "Question"], ["VARIATION", "Variation (priced change)"], ["ORDER", "Order / buy"], ["ACCESS", "Access"], ["DOCUMENT", "Document"], ["OTHER", "Other"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <input className={`${input} sm:col-span-2`} placeholder="What do you need? e.g. Choose the kitchen worktop colour" value={req.title} onChange={e => setReq({ ...req, title: e.target.value })} />
            <input type="date" className={input} value={req.dueDate} onChange={e => setReq({ ...req, dueDate: e.target.value })} />
            <textarea className={`${input} sm:col-span-4`} rows={2} placeholder={req.kind === "VARIATION" ? "What changes and why – the client approves this in their portal" : "Details (optional)"} value={req.detail} onChange={e => setReq({ ...req, detail: e.target.value })} />
            {req.kind === "VARIATION" && <>
              <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">Price ex VAT (£)<input className={input} inputMode="decimal" value={req.price} onChange={e => setReq({ ...req, price: e.target.value })} /></label>
              <label className="text-xs font-semibold text-neutral-700">VAT %<input className={input} inputMode="decimal" value={req.vat} onChange={e => setReq({ ...req, vat: e.target.value })} /></label>
            </>}
          </div>
          <button disabled={busy || req.title.trim().length < 3 || (req.kind === "VARIATION" && !(Number(req.price) >= 0 && req.price.trim() !== ""))} onClick={async () => (await act(() => addClientActionAction(j.quoteId, { kind: req.kind, title: req.title, detail: req.detail, dueDate: req.dueDate || null,
            ...(req.kind === "VARIATION" ? { price: Number(req.price), vatPercent: Number(req.vat) || 0 } : {}) }), req.kind === "VARIATION" ? "Variation sent – the client approves or declines it in their portal." : "Request sent to the client.")) && setReq({ kind: "DECISION", title: "", detail: "", dueDate: "", price: "", vat: "20" })} className={`${btn} mt-2 bg-neutral-950 text-white`}>{req.kind === "VARIATION" ? "Send variation for approval" : "Ask the client"}</button>
          {j.variations.count > 0 && <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-900">{j.variations.count} approved variation{j.variations.count > 1 ? "s" : ""}: {gbp(j.variations.gross)} inc VAT added to the contract and the payment schedule.</p>}
          <ul className="mt-3 divide-y text-sm">{j.actions.map(a => (
            <li key={a.id} className="py-2"><p className="font-semibold">{a.title} <span className="text-xs font-normal text-neutral-500">{a.kind.toLowerCase()}{a.dueDate ? ` · by ${a.dueDate}` : ""} · {a.status.toLowerCase()}</span></p>
              {a.detail && <p className="text-neutral-600">{a.detail}</p>}
              {a.response && <p className="mt-1 rounded bg-sky-50 px-2 py-1 text-sky-900">Client: {a.response}</p>}
              <div className="mt-1 flex gap-2">{a.status !== "DONE" && <button onClick={() => act(() => setClientActionStatusAction(j.quoteId, a.id, "DONE"))} className={`${btn} border`}><CircleCheck className="h-3.5 w-3.5" />Close</button>}
                {a.status === "DONE" && <button onClick={() => act(() => setClientActionStatusAction(j.quoteId, a.id, "OPEN"))} className={`${btn} border`}>Re-open</button>}
                {a.status === "OPEN" && <button onClick={() => act(() => setClientActionStatusAction(j.quoteId, a.id, "CANCELLED"))} className={`${btn} border text-red-700`}>Cancel</button>}</div></li>
          ))}</ul>
        </Card>
        <Card title="Items the client supplies">
          {!j.supplies.length && <p className="text-sm text-neutral-500">Nothing to supply.</p>}
          <ul className="divide-y text-sm">{j.supplies.map(s => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 flex-1"><span className="block font-medium">{s.item} – {s.quantity} {s.unit}</span><span className="text-xs text-neutral-500">{s.area}{s.spec ? ` · ${s.spec}` : ""}{s.neededBy ? ` · needed by ${s.neededBy}` : ""}</span></span>
              <select className={`${input} w-32 ${s.status === "DELIVERED" ? "bg-emerald-50" : s.daysLeft !== undefined && s.daysLeft < 3 ? "bg-red-50" : ""}`} value={s.status} disabled={busy}
                onChange={e => act(() => setSupplyAction(j.quoteId, { itemKey: s.key, label: s.item, status: e.target.value, note: "" }))}>
                <option value="TO_ORDER">To order</option><option value="ORDERED">Ordered</option><option value="DELIVERED">Delivered</option></select>
            </li>
          ))}</ul>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Money

function MoneyTab({ j, act, busy }: P) {
  const f = j.finance;
  const [pay, setPay] = useState({ scheduleNo: "", amount: "", method: "BANK_TRANSFER", reference: "", paidOn: today(), note: "" });
  const [exp, setExp] = useState({ category: "MATERIALS", description: "", supplier: "", amount: "", spentOn: today(), workerId: "" });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([["Contract (inc VAT)", f.contract], ["Received", f.received], ["Outstanding", j.money.outstanding], ["Planned cost", f.plannedCost], ["Spent so far", f.spent], ["Profit so far (ex VAT)", f.profitSoFar]] as const).map(([l, v]) =>
          <div key={l} className="rounded-xl border bg-white p-3"><p className="text-xs text-neutral-500">{l}</p><p className={`text-lg font-black ${l.startsWith("Profit") && v < 0 ? "text-red-700" : ""}`}>{gbp(v)}</p></div>)}
      </div>
      <Card title="Payment schedule (client)">
        <table className="w-full text-sm [&_td]:pr-3 [&_th]:pr-3"><thead className="text-left text-xs text-neutral-500"><tr><th>#</th><th>Payment</th><th>Due</th><th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th></th></tr></thead>
          <tbody>{j.money.rows.map(r => <tr key={r.n} className="border-t"><td className="py-1.5">{r.n}</td><td>{r.label}<span className="block text-xs text-neutral-500">{r.when}</span></td><td className="whitespace-nowrap">{r.date ?? "—"}</td><td className="text-right">{gbp(r.amount)}</td><td className="text-right">{gbp(r.paid)}</td><td className="text-right font-semibold">{gbp(r.balance)}</td><td className="pl-2"><span className={`rounded px-1.5 text-xs font-semibold ${stateTone[r.state]}`}>{r.state.replace("_", " ").toLowerCase()}</span></td></tr>)}</tbody></table>
      </Card>
      {j.portalOn && j.status === "ACCEPTED" && <InvoicesCard j={j} act={act} busy={busy} />}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Payments received">
          <ul className="divide-y text-sm">{j.payments.map(p => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{p.paidOn} · <strong>{gbp(p.amount)}</strong> {p.method.replace("_", " ").toLowerCase()}{p.reference ? ` · ref ${p.reference}` : ""}{p.scheduleNo ? ` · payment ${p.scheduleNo}` : ""}<span className="block text-xs text-neutral-500">{p.actorKind === "CLIENT" ? "Reported by client" : "Recorded by you"}{p.note ? ` · ${p.note}` : ""}</span></span>
              {p.status === "REPORTED" ? <span className="flex gap-1"><button disabled={busy} onClick={() => act(() => reviewPaymentAction(j.quoteId, p.id, "CONFIRMED"), "Payment confirmed – the client has been told.")} className={`${btn} bg-emerald-600 text-white`}>Confirm received</button><button disabled={busy} onClick={() => act(() => reviewPaymentAction(j.quoteId, p.id, "REJECTED"))} className={`${btn} border text-red-700`}>Not received</button></span>
                : <span className={`rounded px-1.5 text-xs font-semibold ${p.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{p.status.toLowerCase()}</span>}</li>
          ))}{!j.payments.length && <li className="py-2 text-neutral-500">No payments yet.</li>}</ul>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select className={input} value={pay.scheduleNo} onChange={e => { const r = j.money.rows.find(x => String(x.n) === e.target.value); setPay({ ...pay, scheduleNo: e.target.value, amount: r ? String(r.balance) : pay.amount }); }}><option value="">Not linked</option>{j.money.rows.map(r => <option key={r.n} value={r.n}>{r.n}. {r.label}</option>)}</select>
            <input className={input} inputMode="decimal" placeholder="Amount £" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
            <input type="date" className={input} value={pay.paidOn} onChange={e => setPay({ ...pay, paidOn: e.target.value })} />
            <select className={input} value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select>
            <input className={input} placeholder="Reference" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} />
            <button disabled={busy || !(Number(pay.amount) > 0)} onClick={async () => (await act(() => recordPaymentAction(j.quoteId, { ...pay, scheduleNo: pay.scheduleNo ? Number(pay.scheduleNo) : null, amount: Number(pay.amount) }), "Payment recorded.")) && setPay({ ...pay, amount: "", reference: "" })} className={`${btn} justify-center bg-neutral-950 text-white`}>Record payment</button>
          </div>
        </Card>
        <Card title="Money out on this job">
          <ul className="max-h-72 divide-y overflow-y-auto text-sm">{j.expenses.map(e => (
            <li key={e.id} className={`flex items-center justify-between gap-2 py-1.5 ${e.void ? "opacity-40 line-through" : ""}`}><span>{e.spentOn} · {e.category.toLowerCase()} · {e.description}{e.supplier ? ` (${e.supplier})` : ""}{e.workerId ? ` · ${j.workers.find(w => w.id === e.workerId)?.name ?? "worker"}` : ""}</span>
              <span className="flex items-center gap-2 font-semibold">{gbp(e.amount)}{!e.void && <button onClick={() => confirm("Void this expense?") && act(() => voidExpenseAction(j.quoteId, e.id))} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>}</span></li>
          ))}{!j.expenses.length && <li className="py-2 text-neutral-500">Nothing recorded yet.</li>}</ul>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select className={input} value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })}>{["MATERIALS", "PLANT", "SKIPS", "LABOUR", "SUBCONTRACTOR", "FEES", "OTHER"].map(c => <option key={c} value={c}>{c[0] + c.slice(1).toLowerCase()}</option>)}</select>
            <input className={input} placeholder="Description" value={exp.description} onChange={e => setExp({ ...exp, description: e.target.value })} />
            <input className={input} placeholder="Supplier" value={exp.supplier} onChange={e => setExp({ ...exp, supplier: e.target.value })} />
            <input className={input} inputMode="decimal" placeholder="Amount £" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} />
            <input type="date" className={input} value={exp.spentOn} onChange={e => setExp({ ...exp, spentOn: e.target.value })} />
            <button disabled={busy || !(Number(exp.amount) > 0)} onClick={async () => (await act(() => addExpenseAction({ ...exp, quoteId: j.quoteId, workerId: exp.workerId || null, amount: Number(exp.amount) }), "Saved.")) && setExp({ ...exp, description: "", supplier: "", amount: "" })} className={`${btn} justify-center bg-neutral-950 text-white`}>Add</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Team

function TeamTab({ j, act, busy }: P) {
  const [add, setAdd] = useState({ workerId: "", trade: "", payBasis: "DAY" as "DAY" | "JOB", dayRate: "", agreedPrice: "" });
  const [manual, setManual] = useState({ workerId: "", kind: "IN" as "IN" | "OUT", at: `${today()}T08:00`, note: "" });
  const assigned = new Set(j.team.map(t => t.worker.id));
  const pick = j.workers.find(w => w.id === add.workerId);
  return (
    <div className="space-y-5">
      <Card title="Team on this job" right={<Link href="/dashboard/team" className="text-xs font-semibold text-amber-700">Workers & subcontractors →</Link>}>
        <div className="overflow-x-auto"><table className="w-full text-sm [&_td]:pr-3 [&_th]:pr-3"><thead className="text-left text-xs text-neutral-500"><tr><th>Name</th><th>Pay</th><th className="text-right">Days</th><th className="text-right">Earned</th><th className="text-right">Paid</th><th className="text-right">Owed</th><th></th></tr></thead>
          <tbody>{j.team.map(t => <TeamRow key={t.assignment.id} t={t} j={j} act={act} busy={busy} />)}</tbody></table></div>
        {!j.team.length && <p className="text-sm text-neutral-500">Nobody assigned yet.</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select className={`${input} sm:col-span-2`} value={add.workerId} onChange={e => { const w = j.workers.find(x => x.id === e.target.value); setAdd({ workerId: e.target.value, trade: w?.trade ?? "", payBasis: w?.payBasis ?? "DAY", dayRate: w?.dayRate ? String(w.dayRate) : "", agreedPrice: "" }); }}>
            <option value="">Add someone…</option>{j.workers.filter(w => w.active && !assigned.has(w.id)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(w => <option key={w.id} value={w.id}>{w.name} – {w.trade || w.kind.toLowerCase()}{w.rating ? ` · ${w.rating}/10` : ""}{w.dayRate ? ` · £${w.dayRate}/day` : ""}</option>)}</select>
          <input className={input} placeholder="Trade" value={add.trade} onChange={e => setAdd({ ...add, trade: e.target.value })} />
          <select className={input} value={add.payBasis} onChange={e => setAdd({ ...add, payBasis: e.target.value as "DAY" | "JOB" })}><option value="DAY">Day rate</option><option value="JOB">Price for the job</option></select>
          {add.payBasis === "DAY" ? <input className={input} inputMode="decimal" placeholder={pick?.dayRate ? `£${pick.dayRate}/day` : "£ per day"} value={add.dayRate} onChange={e => setAdd({ ...add, dayRate: e.target.value })} />
            : <input className={input} inputMode="decimal" placeholder="Agreed price £" value={add.agreedPrice} onChange={e => setAdd({ ...add, agreedPrice: e.target.value })} />}
          <button disabled={busy || !add.workerId || (add.payBasis === "JOB" && !(Number(add.agreedPrice) > 0))} onClick={async () => (await act(() => assignWorkerAction(j.quoteId, { workerId: add.workerId, trade: add.trade, payBasis: add.payBasis, dayRate: Number(add.dayRate) > 0 ? Number(add.dayRate) : null, agreedPrice: Number(add.agreedPrice) > 0 ? Number(add.agreedPrice) : null, active: true }), "Assigned.")) && setAdd({ workerId: "", trade: "", payBasis: "DAY", dayRate: "", agreedPrice: "" })} className={`${btn} justify-center bg-neutral-950 text-white`}>Assign</button>
        </div>
      </Card>
      <Card title="Check-ins">
        <div className="overflow-x-auto"><table className="w-full text-sm [&_td]:pr-3 [&_th]:pr-3"><thead className="text-left text-xs text-neutral-500"><tr><th>Date</th><th>Name</th><th>In</th><th>Out</th><th className="text-right">Hours</th><th className="text-right">Counts as</th></tr></thead>
          <tbody>{j.team.flatMap(t => daysWorked(j.checkIns.filter(c => c.workerId === t.worker.id).map(c => ({ ...c, at: new Date(c.at) }))).map(d => ({ d, name: t.worker.name, id: t.worker.id }))).sort((a, b) => b.d.date.localeCompare(a.d.date)).slice(0, 60).map(({ d, name, id }) => {
            const geo = j.checkIns.find(c => c.workerId === id && c.kind === "IN" && c.at.startsWith(d.date) && c.lat != null);
            return <tr key={`${id}${d.date}`} className="border-t"><td className="py-1.5">{d.date}</td><td>{name}</td><td>{d.in ?? "—"}{geo && <a className="ml-1 inline-flex text-amber-700" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${geo.lat},${geo.lng}`} title="Where they checked in"><MapPin className="h-3.5 w-3.5" /></a>}</td>
              <td>{d.out ?? <span className="text-red-700">missing</span>}</td><td className="text-right">{d.hours ?? "—"}</td><td className="text-right">{d.value} day</td></tr>;
          })}</tbody></table></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select className={input} value={manual.workerId} onChange={e => setManual({ ...manual, workerId: e.target.value })}><option value="">Enter for…</option>{j.team.map(t => <option key={t.worker.id} value={t.worker.id}>{t.worker.name}</option>)}</select>
          <select className={input} value={manual.kind} onChange={e => setManual({ ...manual, kind: e.target.value as "IN" | "OUT" })}><option value="IN">Check in</option><option value="OUT">Check out</option></select>
          <input type="datetime-local" className={input} value={manual.at} onChange={e => setManual({ ...manual, at: e.target.value })} />
          <input className={input} placeholder="Reason" value={manual.note} onChange={e => setManual({ ...manual, note: e.target.value })} />
          <button disabled={busy || !manual.workerId} onClick={() => act(() => adminCheckInAction(j.quoteId, manual), "Saved.")} className={`${btn} justify-center border`}>{manual.kind === "IN" ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}Add</button>
        </div>
      </Card>
    </div>
  );
}

function TeamRow({ t, j, act, busy }: { t: JobView["team"][number] } & P) {
  const [pay, setPay] = useState(""), [score, setScore] = useState(0);
  const w = t.worker, o = t.owed;
  return (
    <tr className={`border-t align-top ${t.assignment.active ? "" : "opacity-50"}`}>
      <td className="py-2"><p className="font-semibold">{w.name}</p><p className="text-xs text-neutral-500">{t.assignment.trade || w.trade} · {w.kind === "SUBCONTRACTOR" ? "subcontractor" : "employee"}{w.rating ? ` · ${w.rating}/10` : ""}</p>
        <p className="mt-1 flex gap-2 text-xs">{w.phone && <a className="text-amber-700" href={`tel:${w.phone.replace(/\s/g, "")}`}><Phone className="inline h-3.5 w-3.5" /> Call</a>}{w.phone && <a className="text-amber-700" href={`https://wa.me/${w.phone.replace(/\D/g, "").replace(/^0/, "44")}`} target="_blank" rel="noreferrer">WhatsApp</a>}{w.email && <a className="text-amber-700" href={`mailto:${w.email}?subject=${encodeURIComponent(j.reference + " " + j.siteAddress)}`}><Mail className="inline h-3.5 w-3.5" /> Email</a>}</p></td>
      <td className="text-xs">{o.basis === "DAY" ? `${o.rate ? `£${o.rate}` : "no rate"}/day` : `£${t.assignment.agreedPrice} job`}</td>
      <td className="text-right">{o.days}{o.missingOut > 0 && <span className="block text-[10px] text-red-700">{o.missingOut} no check-out</span>}</td>
      <td className="text-right">{gbp(o.earned)}</td><td className="text-right">{gbp(o.paid)}</td><td className={`text-right font-bold ${o.balance > 0 ? "text-amber-700" : ""}`}>{gbp(o.balance)}</td>
      <td className="space-y-1 pl-3 text-right">
        <span className="flex justify-end gap-1"><input className={`${input} w-20`} inputMode="decimal" placeholder="£" value={pay} onChange={e => setPay(e.target.value)} />
          <button disabled={busy || !(Number(pay) > 0)} onClick={async () => (await act(() => addExpenseAction({ quoteId: j.quoteId, workerId: w.id, category: w.kind === "SUBCONTRACTOR" ? "SUBCONTRACTOR" : "LABOUR", description: `Payment to ${w.name}`, supplier: "", amount: Number(pay), spentOn: today() }), `£${pay} paid to ${w.name} recorded.`)) && setPay("")} className={`${btn} bg-neutral-950 text-white`}>Paid</button></span>
        <span className="flex justify-end gap-1"><select className={`${input} w-20`} value={score} onChange={e => setScore(Number(e.target.value))}><option value={0}>Rate</option>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}/10</option>)}</select>
          <button disabled={busy || !score} onClick={async () => (await act(() => rateWorkerAction(w.id, score, "", j.quoteId), "Rating saved.")) && setScore(0)} className={`${btn} border`}><Star className="h-3.5 w-3.5" /></button></span>
        <button onClick={() => act(() => assignWorkerAction(j.quoteId, { workerId: w.id, trade: t.assignment.trade, payBasis: t.assignment.payBasis, dayRate: t.assignment.dayRate, agreedPrice: t.assignment.agreedPrice, active: !t.assignment.active }))} className="text-xs text-neutral-500 underline">{t.assignment.active ? "Remove from job" : "Put back on job"}</button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- Orders

function OrdersTab({ j, act, busy }: P) {
  const [supplier, setSupplier] = useState<Record<string, string>>({});
  const status = (stage: string) => j.orders.find(o => o.stage === stage);
  return (
    <div className="space-y-5">
      <Card title="Order next (stages starting in the next few days)" right={<button onClick={() => window.print()} className={`${btn} border print:hidden`}><Printer className="h-3.5 w-3.5" />Print list</button>}>
        {!j.toOrder.length && <p className="text-sm text-neutral-500">{j.startDate ? "Nothing starting in the next few days." : "Set the start date to get order reminders."}</p>}
        {j.toOrder.map(o => <OrderBlock key={o.stage} title={`${o.label} – starts ${o.start}${o.daysAway <= 1 ? " (order today!)" : ""}`} urgent={!o.ordered && o.daysAway <= 1} items={o.items} st={status(o.stage)} supplier={supplier[o.stage] ?? ""} setSupplier={v => setSupplier({ ...supplier, [o.stage]: v })}
          mark={s => act(() => setOrderAction(j.quoteId, { stage: o.stage, status: s, supplier: supplier[o.stage] ?? "", note: "" }), "Saved.")} busy={busy} />)}
      </Card>
      <Card title="All materials by stage">
        {j.stageMaterials.map(s => <OrderBlock key={s.stage} title={`${s.label}${s.start ? ` – ${s.start}` : ""}`} items={s.items} st={status(s.stage)} supplier={supplier[s.stage] ?? ""} setSupplier={v => setSupplier({ ...supplier, [s.stage]: v })}
          mark={st => act(() => setOrderAction(j.quoteId, { stage: s.stage, status: st, supplier: supplier[s.stage] ?? "", note: "" }), "Saved.")} busy={busy} collapsed />)}
      </Card>
    </div>
  );
}

function OrderBlock({ title, items, st, supplier, setSupplier, mark, busy, urgent, collapsed }: { title: string; items: { description: string; quantity: number; unit: string }[]; st?: { status: string; supplier: string }; supplier: string; setSupplier: (v: string) => void; mark: (s: "ORDERED" | "DELIVERED") => void; busy: boolean; urgent?: boolean; collapsed?: boolean }) {
  return (
    <details open={!collapsed} className={`mb-3 rounded-lg border p-3 ${urgent ? "border-red-300 bg-red-50" : ""}`}>
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><span className="font-semibold">{title}</span>
        <span className="text-xs">{st ? <span className={`rounded px-1.5 font-semibold ${st.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>{st.status.toLowerCase()}{st.supplier ? ` · ${st.supplier}` : ""}</span> : <span className="text-red-700">not ordered</span>}</span></summary>
      <ul className="mt-2 grid gap-x-6 text-sm sm:grid-cols-2">{items.map((i, n) => <li key={n} className="flex justify-between border-b py-0.5"><span>{i.description}</span><span className="pl-2 font-semibold">{i.quantity} {i.unit}</span></li>)}</ul>
      <div className="mt-2 flex flex-wrap gap-2 print:hidden">
        <input className={`${input} w-48`} placeholder="Supplier (e.g. Selco)" value={supplier} onChange={e => setSupplier(e.target.value)} />
        <button disabled={busy} onClick={() => mark("ORDERED")} className={`${btn} bg-neutral-950 text-white`}><Package className="h-3.5 w-3.5" />Ordered</button>
        <button disabled={busy} onClick={() => mark("DELIVERED")} className={`${btn} border`}><HardHat className="h-3.5 w-3.5" />Delivered</button>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------- Client portal: project manager and invoices

function ManagerCard({ j, act, busy }: P) {
  const [m, setM] = useState(j.manager);
  const changed = m.name !== j.manager.name || m.phone !== j.manager.phone || m.email !== j.manager.email;
  return (
    <Card title="Project manager" right={<span className="text-xs text-neutral-500">Shown to the client as their main contact</span>}>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={input} placeholder="Name" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} />
        <input className={input} placeholder="Mobile" type="tel" value={m.phone} onChange={e => setM({ ...m, phone: e.target.value })} />
        <input className={input} placeholder="Email" type="email" value={m.email} onChange={e => setM({ ...m, email: e.target.value })} />
      </div>
      <button disabled={busy || !changed} onClick={() => act(() => setManagerAction(j.quoteId, m), "Project manager saved – the client can see their details.")} className={`${btn} mt-2 bg-neutral-900 text-white`}><UserCog className="h-3.5 w-3.5" />Save</button>
    </Card>
  );
}

/** Invoices are raised automatically (deposit on acceptance, stages when marked done, final on completion); raise one early here. */
function InvoicesCard({ j, act, busy }: P) {
  const issued = new Set(j.invoices.map(i => i.scheduleNo));
  const notYet = j.money.rows.filter(r => !issued.has(r.n) && r.amount > 0);
  return (
    <Card title="Invoices" right={<span className="text-xs text-neutral-500">Raised automatically as stages are done – emailed to the client as a PDF, copy to the office</span>}>
      <ul className="divide-y text-sm">{j.invoices.map(i => (
        <li key={i.number} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><Receipt className="mr-1 inline h-4 w-4 text-neutral-400" /><strong>{i.number}</strong> · {i.label}<span className="block text-xs text-neutral-500">Issued {i.issuedOn} · due {i.dueOn}{i.emailed ? " · emailed" : " · not emailed (check the mail settings)"}</span></span>
          <span className="flex items-center gap-2"><strong className="tabular-nums">{gbp(i.gross)}</strong>
            <span className={`rounded px-1.5 text-xs font-semibold ${i.balance <= 0.005 ? "bg-emerald-100 text-emerald-800" : i.dueOn < today() ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{i.balance <= 0.005 ? "paid" : i.dueOn < today() ? "overdue" : "unpaid"}</span>
            <button disabled={busy} onClick={() => act(() => resendInvoiceAction(j.quoteId, i.number), "Invoice emailed to the client (PDF attached), copy to the office.")} className={`${btn} border`}><Mail className="h-3.5 w-3.5" />{i.emailed ? "Email again" : "Email it"}</button>
            <Link href={`/dashboard/jobs/${j.quoteId}/invoices/${encodeURIComponent(i.number)}`} className={`${btn} border`}><Printer className="h-3.5 w-3.5" />View</Link></span>
        </li>
      ))}{!j.invoices.length && <li className="py-2 text-neutral-500">No invoices yet.</li>}</ul>
      {notYet.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs"><span className="font-semibold text-neutral-600">Raise early:</span>
        {notYet.map(r => <button key={r.n} disabled={busy} onClick={() => confirm(`Issue and email the invoice for “${r.label}” (${gbp(r.amount)}) now?`) && act(() => issueInvoiceAction(j.quoteId, r.n), "Invoice issued and emailed to the client.")} className={`${btn} border`}>{r.label}</button>)}</div>}
    </Card>
  );
}
