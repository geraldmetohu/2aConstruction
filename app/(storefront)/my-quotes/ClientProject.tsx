"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, Camera, ChevronLeft, ChevronRight, CircleCheck, ClipboardCheck, ClipboardList, Ellipsis, FileText, House, ListTodo, Mail, MessageSquare, Phone, Receipt, Send, ShoppingCart, TriangleAlert, Users, X } from "lucide-react";
import { SnagList, type SnagView } from "@/app/componets/takeoff/SnagList";
import type { DueRow, StageProgress, SupplyNeed } from "@/app/lib/takeoff/jobs";
import type { ClientContact } from "@/app/lib/takeoff/jobs-store";
import { clientAddSnag, clientAnswer, clientMessage, clientReportPayment, clientSaveInfo, clientSetSnag, clientSupply } from "./project-actions";

export interface ClientProjectView {
  quoteId: string; reference: string; title: string; siteAddress: string; status: string; startDate: string | null; finish: string | null;
  progress: { stages: StageProgress[]; percent: number }; events: { id: string; kind: string; message: string; actorKind: string; createdAt: string }[];
  photos: { id: string; url: string; caption: string; stage: string; createdAt: string }[];
  documents: { id: string; title: string; category: string; categoryLabel: string; url: string; fileName: string; sizeBytes: number; createdAt: string }[];
  actions: { id: string; kind: string; title: string; detail: string; dueDate: string | null; status: string; response: string }[];
  supplies: SupplyNeed[]; money: { rows: DueRow[]; received: number; outstanding: number; reported: number };
  payments: { id: string; amount: number; paidOn: string; status: string; reference: string }[];
  bank: { accountName: string; sortCode: string; accountNumber: string; bankName: string }; office: { phone: string; email: string; siteManager: string; siteManagerPhone: string };
  contacts: ClientContact[]; accessNotes: string; unread: number;
  portalOn: boolean; requestedStart: string | null; manager: { name: string; phone: string; email: string };
  invoices: { number: string; label: string; scheduleNo: number; issuedOn: string; dueOn: string; gross: number; balance: number }[];
  snags: SnagView[];
}

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const input = "w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-base sm:py-2 sm:text-sm";
const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 sm:min-h-0";
const stateLabel: Record<DueRow["state"], [string, string]> = { PAID: ["Paid", "bg-emerald-100 text-emerald-800"], PART_PAID: ["Part paid", "bg-sky-100 text-sky-800"], DUE: ["Due soon", "bg-amber-100 text-amber-800"], OVERDUE: ["Overdue", "bg-red-100 text-red-800"], UPCOMING: ["Upcoming", "bg-neutral-100 text-neutral-700"] };

export function ClientProject({ v, quoteView, greetingName = "", initialTab }: { v: ClientProjectView; quoteView: ReactNode; greetingName?: string; initialTab?: string }) {
  const router = useRouter();
  const openActions = v.actions.filter(a => a.status === "OPEN");
  const toOrder = v.supplies.filter(s => s.status === "TO_ORDER");
  const due = v.money.rows.filter(r => r.state === "DUE" || r.state === "OVERDUE");
  const todo = openActions.length + toOrder.length + due.length;
  const openSnags = v.snags.filter(s => s.status === "OPEN").length;
  const ALL = [["overview", "Overview", House, 0], ["todo", "To do", ListTodo, todo], ["messages", "Messages", MessageSquare, v.unread], ["photos", "Photos", Camera, 0], ["payments", "Payments", Banknote, due.length], ["snags", "Snagging", ClipboardCheck, openSnags], ["details", "Your details", Users, 0], ["quote", "Quote & documents", FileText, 0]] as const;
  const TABS = ALL.filter(([k]) => k !== "snags" || v.portalOn);
  type Tab = (typeof ALL)[number][0];
  const [tab, setTabState] = useState<Tab>((TABS.find(([k]) => k === initialTab)?.[0] ?? (todo ? "todo" : "overview")) as Tab);
  const [more, setMore] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  /** Switch tab, keep it in the address (back button / refresh / shared links) and bring the content into view. */
  const setTab = (k: Tab) => {
    setTabState(k); setMore(false);
    try { const u = new URL(window.location.href); u.searchParams.set("tab", k); window.history.replaceState(null, "", u); } catch { /* ignore */ }
    const el = top.current; if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (!msg?.ok) return; const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); }, [msg]);
  useEffect(() => { document.body.style.overflow = more ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [more]);
  // Phone tab bar: the four things people check most, everything else under "More".
  const MAIN: Tab[] = ["overview", "todo", "messages", "payments"];
  const extra = TABS.filter(([k]) => !MAIN.includes(k));
  const extraCount = extra.reduce((n, t) => n + t[3], 0);
  const officeTel = (v.manager.phone || v.office.siteManagerPhone || v.office.phone).replace(/[^\d+]/g, "");
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true); const r = await fn(); setBusy(false);
    setMsg(r.ok ? { ok: true, text: done } : { ok: false, text: r.message ?? "Failed" }); if (r.ok) router.refresh(); return r.ok;
  };
  const current = v.progress.stages.find(s => s.status === "IN_PROGRESS") ?? v.progress.stages.find(s => s.status === "NOT_STARTED");

  return (
    <>
      <section className="relative overflow-hidden bg-[#071a33] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 sm:px-8 md:pt-10">
          <Link href="/my-quotes" className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-[#f5b400]"><ArrowLeft className="h-4 w-4" />Client area</Link>
          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 pb-6 sm:mt-6 sm:gap-6 md:pb-8">
            <div className="min-w-0">
              <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5b400] sm:text-[11px] sm:tracking-[0.28em]"><span aria-hidden className="hidden h-px w-8 bg-[#f5b400] sm:block" /><span className="truncate">{greetingName ? `Welcome back, ${greetingName}` : "Your project"} · {v.reference}</span></p>
              <h1 className="mt-2 text-2xl font-semibold leading-[1.1] tracking-[-0.02em] sm:mt-4 sm:text-4xl md:text-5xl">{v.title}</h1>
              <p className="mt-1 truncate text-sm text-white/70 sm:mt-2 sm:text-base">{v.siteAddress}</p>
              <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 sm:mt-4 sm:text-sm">{v.startDate ? `Start ${day(v.startDate)}${v.finish ? ` · completion around ${day(v.finish)}` : ""}` : v.requestedStart ? `You asked to start from ${day(v.requestedStart)} – we'll confirm the date shortly` : "Start date to be confirmed – we'll be in touch"}</p>
            </div>
            <div className="flex flex-col items-center justify-center"><Ring percent={v.progress.percent} /><p className="mt-1 hidden max-w-[12rem] text-center text-xs text-white/60 sm:block">{current ? `Now: ${current.label}` : v.status === "COMPLETED" ? "Completed" : ""}</p></div>
          </div>
          {current && <p className="-mt-3 pb-4 text-xs text-white/60 sm:hidden">Now: {current.label}</p>}
          <nav aria-label="Project sections" className="-mx-1 hidden gap-1 overflow-x-auto border-t border-white/10 py-3 text-sm [scrollbar-width:none] md:flex">
            {TABS.map(([k, l, Icon, n]) => <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold transition-colors ${tab === k ? "bg-[#f5b400] text-[#071a33]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{l}{n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{n}</span>}</button>)}
          </nav>
        </div>
      </section>
    <div ref={top} className="scroll-mt-[76px]" />
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-8 md:py-10">
      {/* Phones: what tab you're on. */}
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 md:hidden">{(() => { const t = TABS.find(([k]) => k === tab); if (!t) return null; const Icon = t[2]; return <><Icon className="h-4 w-4" />{t[1]}</>; })()}</h2>
      {msg && <div role="status" className={`fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-lg md:static md:shadow-none ${msg.ok ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"}`}>
        <span>{msg.text}</span><button aria-label="Dismiss" onClick={() => setMsg(null)} className="shrink-0 opacity-60"><X className="h-4 w-4" /></button></div>}

      {tab === "overview" && <div className="grid gap-5 lg:grid-cols-5">
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6 lg:col-span-3"><h2 className="text-lg font-semibold text-[#071a33]">Progress by stage</h2>
          <ol className="mt-3 space-y-3">{v.progress.stages.map(s => (
            <li key={s.stage}>
              <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-semibold">{s.status === "DONE" ? <CircleCheck className="mr-1 inline h-4 w-4 text-emerald-600" /> : null}{s.label}</span><span className="text-xs text-neutral-500">{s.start ? (s.start === s.end ? day(s.start) : `${day(s.start)} – ${day(s.end!)}`) : ""}</span></div>
              <div className="mt-1 h-2 rounded-full bg-neutral-100"><div className={`h-2 rounded-full ${s.status === "DONE" ? "bg-emerald-500" : "bg-[#f5b400]"}`} style={{ width: `${s.percent}%` }} /></div>
              {s.note && <p className="mt-0.5 text-xs text-neutral-600">{s.note}</p>}
            </li>))}</ol>
        </section>
        <div className="space-y-5 lg:col-span-2">
          {todo > 0 && <button onClick={() => setTab("todo")} className="w-full rounded-2xl border-2 border-[#f5b400] bg-[#f5b400]/10 p-5 text-left"><p className="flex items-center gap-2 font-bold"><TriangleAlert className="h-5 w-5 text-amber-600" />{todo} thing{todo > 1 ? "s" : ""} need you</p>
            <p className="mt-1 text-sm text-neutral-700">{[openActions.length && `${openActions.length} question${openActions.length > 1 ? "s" : ""}`, toOrder.length && `${toOrder.length} item${toOrder.length > 1 ? "s" : ""} to order`, due.length && `${due.length} payment${due.length > 1 ? "s" : ""} due`].filter(Boolean).join(" · ")}</p></button>}
          <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Latest</h2>
            <ul className="mt-2 space-y-2 text-sm">{v.events.slice(0, 8).map(e => <li key={e.id} className="border-b pb-2">{e.message}<span className="block text-xs text-neutral-400">{when(e.createdAt)}</span></li>)}</ul></section>
          <Contacts v={v} />
        </div>
      </div>}

      {tab === "todo" && <div className="space-y-5">
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Questions & decisions for you</h2>
          {!v.actions.length && <p className="mt-2 text-sm text-neutral-500">Nothing at the moment.</p>}
          <ul className="mt-3 space-y-4">{v.actions.filter(a => a.status !== "CANCELLED").map(a => <ActionItem key={a.id} a={a} busy={busy} answer={r => act(() => clientAnswer(v.quoteId, a.id, r), "Thank you – your answer has been sent.")} />)}</ul></section>
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold text-[#071a33]"><ShoppingCart className="h-5 w-5" />Items you order</h2>
          <p className="mt-1 text-sm text-neutral-600">Please order these to the specification shown and tell us when they are ordered and delivered. Not sure? Send us a message before you buy.</p>
          <ul className="mt-3 divide-y">{v.supplies.map(s => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0 flex-1"><span className="block font-semibold">{s.item}</span><span className="text-sm text-neutral-600">{s.quantity} {s.unit} · {s.area}{s.spec ? ` · ${s.spec}` : ""}</span>
                {s.neededBy && <span className={`block text-xs font-semibold ${s.status !== "DELIVERED" && (s.daysLeft ?? 99) < 3 ? "text-red-700" : "text-neutral-500"}`}>Needed on site by {day(s.neededBy)}</span>}</span>
              <span className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto">{(["TO_ORDER", "ORDERED", "DELIVERED"] as const).map(st => <button key={st} disabled={busy} onClick={() => act(() => clientSupply(v.quoteId, { itemKey: s.key, label: s.item, status: st, note: "" }), "Thanks – updated.")}
                className={`rounded-full border px-3 py-2 text-xs font-semibold sm:py-1 ${s.status === st ? (st === "DELIVERED" ? "bg-emerald-600 text-white" : "bg-[#071a33] text-white") : "bg-white"}`}>{st === "TO_ORDER" ? "To order" : st === "ORDERED" ? "Ordered" : "Delivered"}</button>)}</span>
            </li>))}{!v.supplies.length && <li className="py-2 text-sm text-neutral-500">Nothing for you to order – we supply everything.</li>}</ul></section>
        {due.length > 0 && <button onClick={() => setTab("payments")} className="w-full rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6 text-left"><h2 className="text-lg font-semibold text-[#071a33]">Payments due</h2><ul className="mt-2 text-sm">{due.map(r => <li key={r.n}>{r.label}: {gbp(r.balance)} {r.date ? `by ${day(r.date)}` : ""}</li>)}</ul></button>}
      </div>}

      {tab === "messages" && <Messages v={v} busy={busy} send={(t, note) => act(() => clientMessage(v.quoteId, t, note), note ? "Note saved." : "Message sent – we will reply soon.")} />}

      {tab === "photos" && <Photos photos={v.photos} />}

      {tab === "payments" && <Payments v={v} busy={busy} report={p => act(() => clientReportPayment(v.quoteId, p), "Thank you – we will confirm once it reaches our account.")} />}

      {tab === "snags" && <SnagList snags={v.snags} audience="client" busy={busy}
        add={d => act(() => clientAddSnag(v.quoteId, d), "Snag added – we'll be in touch to fix it.")} toggle={(id, isDone) => act(() => clientSetSnag(v.quoteId, id, isDone), isDone ? "Marked as done." : "Reopened – we'll take another look.")} />}

      {tab === "details" && <Details v={v} busy={busy} save={p => act(() => clientSaveInfo(v.quoteId, p), "Saved – thank you.")} />}

      {tab === "quote" && <div className="space-y-5">
        {v.documents.length > 0 && <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Project documents</h2><p className="text-xs text-neutral-500">Plans, certificates and other files we've shared with you.</p>
          <ul className="mt-3 divide-y">{v.documents.map(d => <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 hover:bg-neutral-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-[10px] font-bold uppercase text-amber-400">{(d.fileName.split(".").pop() || "file").slice(0, 4)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.title}</span><span className="block text-xs text-neutral-500">{d.categoryLabel} · {when(d.createdAt)}{d.sizeBytes ? ` · ${d.sizeBytes > 1048576 ? `${(d.sizeBytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(d.sizeBytes / 1024))} KB`}` : ""}</span></span>
            <span className="text-xs font-bold text-[#8a6500]">Open</span></a></li>)}</ul></section>}
        {quoteView}</div>}
    </main>

      {/* Phones: app-style tab bar, with the rest under "More". */}
      <nav data-portal-tabbar aria-label="Project sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#071a33]/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <ul className="grid grid-cols-5">
          {TABS.filter(([k]) => MAIN.includes(k)).map(([k, l, Icon, n]) => (
            <li key={k}><button onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${tab === k ? "text-[#071a33]" : "text-neutral-500"}`}>
              {tab === k && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-[#f5b400]" />}
              <span className="relative"><Icon className="h-[22px] w-[22px]" />{n > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] leading-[18px] text-white">{n}</span>}</span>{l}</button></li>
          ))}
          <li><button onClick={() => setMore(true)} aria-expanded={more} className={`relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${!MAIN.includes(tab) ? "text-[#071a33]" : "text-neutral-500"}`}>
            {!MAIN.includes(tab) && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-[#f5b400]" />}
            <span className="relative"><Ellipsis className="h-[22px] w-[22px]" />{extraCount > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] leading-[18px] text-white">{extraCount}</span>}</span>More</button></li>
        </ul>
      </nav>
      {more && <div className="fixed inset-0 z-[55] md:hidden" role="dialog" aria-modal="true" aria-label="More">
        <button aria-label="Close" onClick={() => setMore(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
          <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-neutral-300" />
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {extra.map(([k, l, Icon, n]) => <li key={k}><button onClick={() => setTab(k)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold ${tab === k ? "border-[#f5b400] bg-[#f5b400]/10" : "border-neutral-200"}`}><Icon className="h-5 w-5 shrink-0 text-[#071a33]" /><span className="min-w-0 flex-1">{l}</span>{n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{n}</span>}</button></li>)}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {officeTel && <a href={`tel:${officeTel}`} className="flex items-center justify-center gap-2 rounded-2xl bg-[#071a33] px-4 py-3.5 text-sm font-bold text-white"><Phone className="h-4 w-4" />Call {v.manager.name ? v.manager.name.split(" ")[0] : "us"}</a>}
            <Link href="/my-quotes" className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />All my quotes</Link>
          </div>
        </div>
      </div>}
    </>
  );
}

function Ring({ percent }: { percent: number }) {
  const r = 42, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 100 100" className="h-20 w-20 sm:h-28 sm:w-28"><circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" /><circle cx="50" cy="50" r={r} fill="none" stroke="#f5b400" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(percent / 100) * c} ${c}`} transform="rotate(-90 50 50)" /><text x="50" y="56" textAnchor="middle" className="fill-white text-[20px] font-semibold">{percent}%</text></svg>;
}

function ActionItem({ a, busy, answer }: { a: ClientProjectView["actions"][number]; busy: boolean; answer: (r: string) => void }) {
  const [r, setR] = useState(a.response);
  return (
    <li className={`rounded-xl border p-4 ${a.status === "OPEN" ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="font-semibold">{a.title}{a.dueDate && <span className="ml-2 text-xs font-normal text-neutral-600">by {day(a.dueDate)}</span>}</p>
      {a.kind === "VARIATION" && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#8a6500]">Change to your contract – please approve or decline</p>}
      {a.detail && <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{a.detail}</p>}
      {a.kind === "VARIATION" ? (a.response ? <p className={`mt-2 text-sm font-semibold ${a.response.startsWith("APPROVED") ? "text-emerald-700" : "text-neutral-600"}`}>{a.response.startsWith("APPROVED") ? "You approved this change – it's added to your payment schedule." : "You declined this change."}</p>
        : a.status === "OPEN" ? <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => answer("APPROVED")} className={`${btn} bg-[#071a33] text-white`}>Approve this change</button>
          <button disabled={busy} onClick={() => { if (confirm("Decline this change? We'll carry on as originally agreed.")) answer("DECLINED"); }} className={`${btn} border border-[#071a33]/20 text-[#071a33]`}>Decline</button></div> : null)
      : a.status === "DONE" ? <p className="mt-2 text-sm text-emerald-700"><CircleCheck className="mr-1 inline h-4 w-4" />Done{a.response ? ` – ${a.response}` : ""}</p> : <>
        <textarea className={`${input} mt-2`} rows={2} placeholder="Your answer" value={r} onChange={e => setR(e.target.value)} />
        <button disabled={busy || !r.trim()} onClick={() => answer(r)} className={`${btn} mt-2 bg-[#071a33] text-white`}>{a.status === "ANSWERED" ? "Update answer" : "Send answer"}</button></>}
    </li>
  );
}

function Messages({ v, busy, send }: { v: ClientProjectView; busy: boolean; send: (t: string, note: boolean) => Promise<boolean> }) {
  const [t, setT] = useState(""), [note, setNote] = useState(false);
  const thread = v.events.filter(e => ["MESSAGE", "CLIENT_MESSAGE", "CLIENT_NOTE", "ANSWER", "ACTION", "PAYMENT"].includes(e.kind));
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Messages & notes</h2>
      <textarea className={`${input} mt-3`} rows={3} placeholder={note ? "A note for the team (e.g. please keep the side gate closed)" : "Write to us…"} value={t} onChange={e => setT(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={note} onChange={e => setNote(e.target.checked)} />Save as a note for the team</label>
        <button disabled={busy || !t.trim()} onClick={async () => (await send(t, note)) && setT("")} className={`${btn} bg-[#071a33] text-white`}><Send className="h-4 w-4" />Send</button></div>
      <ul className="mt-4 space-y-3">{thread.map(e => {
        const mine = e.actorKind === "CLIENT";
        return <li key={e.id} className={`flex ${mine ? "justify-end" : ""}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-amber-100" : "bg-neutral-100"}`}>{e.kind === "CLIENT_NOTE" && <span className="mr-1 text-[10px] font-bold uppercase text-[#8a6500]">Note</span>}{e.message}<span className="block text-[11px] text-neutral-500">{mine ? "You" : "2A Construction"} · {when(e.createdAt)}</span></div></li>;
      })}{!thread.length && <li className="text-sm text-neutral-500">No messages yet.</li>}</ul>
    </section>
  );
}

function Payments({ v, busy, report }: { v: ClientProjectView; busy: boolean; report: (p: { scheduleNo: number | null; amount: number; paidOn: string; reference: string }) => Promise<boolean> }) {
  const next = v.money.rows.find(r => r.balance > 0);
  const [f, setF] = useState({ scheduleNo: next ? String(next.n) : "", amount: next ? String(next.balance) : "", paidOn: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()), reference: v.reference });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">{([["Paid", v.money.received], ["Still to pay", v.money.outstanding], ["Waiting to confirm", v.money.reported]] as const).map(([l, x]) => <div key={l} className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">{l}</p><p className="text-2xl font-black">{gbp(x)}</p></div>)}</div>
      {v.invoices.length > 0 && <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold text-[#071a33]"><Receipt className="h-5 w-5" />Your invoices</h2>
        <ul className="mt-3 divide-y">{v.invoices.map(i => (
          <li key={i.number} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0"><span className="block font-semibold">{i.label}</span><span className="text-xs text-neutral-500">{i.number} · issued {day(i.issuedOn)} · due {day(i.dueOn)}</span></span>
            <span className="flex flex-wrap items-center gap-2"><span className="font-bold tabular-nums">{gbp(i.gross)}</span>
              {i.balance <= 0.005 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Paid</span>
                : <button onClick={() => { setF({ ...f, scheduleNo: String(i.scheduleNo), amount: String(i.balance), reference: i.number }); document.getElementById("paid")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-neutral-950">I&apos;ve paid this</button>}
              <a href={`/my-quotes/${v.quoteId}/invoices/${encodeURIComponent(i.number)}`} className="rounded-full border px-3 py-1 text-xs font-semibold">View / download</a></span>
          </li>))}</ul>
        <p className="mt-2 text-xs text-neutral-500">Invoices are raised automatically as each stage is completed. Press “I&apos;ve paid this” and confirm below once you&apos;ve made the transfer.</p></section>}
      <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Payment schedule</h2>
        <ul className="mt-3 divide-y">{v.money.rows.map(r => <li key={r.n} className="flex flex-wrap items-center justify-between gap-2 py-3"><span><span className="font-semibold">{r.label}</span><span className="block text-xs text-neutral-500">{r.when}{r.date ? ` · due ${day(r.date)}` : ""}</span></span>
          <span className="text-right"><span className="font-bold">{gbp(r.amount)}</span><span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${stateLabel[r.state][1]}`}>{stateLabel[r.state][0]}</span>{r.paid > 0 && r.balance > 0 && <span className="block text-xs text-neutral-500">{gbp(r.balance)} left</span>}</span></li>)}</ul></section>
      <section className="rounded-2xl border-2 border-neutral-900 bg-white p-5"><h2 className="text-lg font-semibold text-[#071a33]">How to pay</h2>
        {v.bank.accountNumber ? <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt className="text-neutral-500">Account name</dt><dd className="font-semibold">{v.bank.accountName}</dd><dt className="text-neutral-500">Sort code</dt><dd className="font-semibold">{v.bank.sortCode}</dd><dt className="text-neutral-500">Account number</dt><dd className="font-semibold">{v.bank.accountNumber}</dd><dt className="text-neutral-500">Reference</dt><dd className="font-semibold">{f.reference || v.reference}</dd></dl>
          : <p className="mt-2 text-sm">Please call us for bank details.</p>}
        <p className="mt-2 text-xs text-neutral-500">We will never ask you to change bank details by email. If in doubt, call us before paying.</p>
        <h3 id="paid" className="mt-5 font-semibold">Paid? Let us know</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <select className={input} value={f.scheduleNo} onChange={e => { const r = v.money.rows.find(x => String(x.n) === e.target.value); setF({ ...f, scheduleNo: e.target.value, amount: r ? String(r.balance) : f.amount }); }}><option value="">Other</option>{v.money.rows.filter(r => r.balance > 0).map(r => <option key={r.n} value={r.n}>{r.label}</option>)}</select>
          <input className={input} inputMode="decimal" placeholder="Amount £" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
          <input type="date" className={input} value={f.paidOn} onChange={e => setF({ ...f, paidOn: e.target.value })} />
          <button disabled={busy || !(Number(f.amount) > 0)} onClick={() => report({ scheduleNo: f.scheduleNo ? Number(f.scheduleNo) : null, amount: Number(f.amount), paidOn: f.paidOn, reference: f.reference })} className={`${btn} bg-amber-400 text-neutral-950`}>I&apos;ve paid</button>
        </div>
        {v.payments.length > 0 && <ul className="mt-4 text-sm">{v.payments.map(p => <li key={p.id} className="flex justify-between border-t py-1.5"><span>{day(p.paidOn)} · {gbp(p.amount)}</span><span className={p.status === "CONFIRMED" ? "text-emerald-700" : p.status === "REJECTED" ? "text-red-700" : "text-[#8a6500]"}>{p.status === "CONFIRMED" ? "Received" : p.status === "REJECTED" ? "Not found – please call us" : "Waiting to confirm"}</span></li>)}</ul>}
      </section>
    </div>
  );
}

/** Who to call: the project manager for this job first, then the site manager and office. */
function Contacts({ v }: { v: ClientProjectView }) {
  const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;
  const people = [
    v.manager.name && { role: "Your project manager", name: v.manager.name, phone: v.manager.phone, email: v.manager.email },
    v.office.siteManager && v.office.siteManager !== v.manager.name && { role: "Site manager", name: v.office.siteManager, phone: v.office.siteManagerPhone, email: "" },
    { role: "Office", name: "2A Construction", phone: v.office.phone, email: v.office.email },
  ].filter(Boolean) as { role: string; name: string; phone: string; email: string }[];
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Contact us</h2>
      <ul className="mt-2 divide-y">{people.map(p => (
        <li key={p.role} className="py-2.5 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{p.role}</p><p className="font-semibold">{p.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1">{p.phone && <a className="inline-flex items-center gap-1 font-semibold text-[#8a6500]" href={tel(p.phone)}><Phone className="h-4 w-4" />{p.phone}</a>}
            {p.email && <a className="inline-flex items-center gap-1 text-[#8a6500]" href={`mailto:${p.email}?subject=${encodeURIComponent(v.reference)}`}><Mail className="h-4 w-4" />{p.email}</a>}</p>
        </li>))}</ul>
    </section>
  );
}

function Details({ v, busy, save }: { v: ClientProjectView; busy: boolean; save: (p: { contacts: ClientContact[]; accessNotes: string }) => void }) {
  const [contacts, setContacts] = useState<ClientContact[]>(v.contacts.length ? v.contacts : [{ name: "", role: "", phone: "", email: "" }]);
  const [notes, setNotes] = useState(v.accessNotes);
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Contacts & access</h2>
      <p className="mt-1 text-sm text-neutral-600">Who can we call about the work, and anything we should know about access, parking, keys, alarms or pets.</p>
      <div className="mt-3 space-y-2">{contacts.map((c, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-4">{(["name", "role", "phone", "email"] as const).map(k => <input key={k} className={input} placeholder={{ name: "Name", role: "e.g. Partner, tenant", phone: "Phone", email: "Email" }[k]} value={c[k]} onChange={e => setContacts(contacts.map((x, n) => (n === i ? { ...x, [k]: e.target.value } : x)))} />)}</div>
      ))}</div>
      <button onClick={() => setContacts([...contacts, { name: "", role: "", phone: "", email: "" }])} className="mt-2 text-sm font-semibold text-[#8a6500]">+ Add another contact</button>
      <textarea className={`${input} mt-3`} rows={4} placeholder="Access, parking, key safe, alarm, pets, neighbours…" value={notes} onChange={e => setNotes(e.target.value)} />
      <button disabled={busy} onClick={() => save({ contacts: contacts.filter(c => c.name || c.phone || c.email), accessNotes: notes })} className={`${btn} mt-3 bg-[#071a33] text-white`}><ClipboardList className="h-4 w-4" />Save</button>
    </section>
  );
}

/** Photo grid (2 across on phones) with a full-screen viewer: tap to open, swipe or arrows to move, Esc / × to close. */
function Photos({ photos }: { photos: ClientProjectView["photos"] }) {
  const [i, setI] = useState<number | null>(null);
  const x0 = useRef<number | null>(null);
  const go = (d: number) => setI(n => (n === null ? n : (n + d + photos.length) % photos.length));
  useEffect(() => {
    if (i === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setI(null); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  });
  const p = i === null ? null : photos[i];
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Site photos</h2>
      {!photos.length && <p className="mt-2 text-sm text-neutral-500">Photos of your project will appear here as the work progresses.</p>}
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">{photos.map((ph, n) => (
        <li key={ph.id}><button onClick={() => setI(n)} className="group block w-full overflow-hidden rounded-xl bg-neutral-100 text-left">
          <img src={ph.url} alt={ph.caption || ph.stage || "Site photo"} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]" loading="lazy" />
          <span className="block truncate px-2 py-1.5 text-[11px] text-neutral-600">{ph.caption || ph.stage || "Site"} · {when(ph.createdAt)}</span></button></li>
      ))}</ul>
      {p && <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white"
        onTouchStart={e => { x0.current = e.touches[0].clientX; }} onTouchEnd={e => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0.current = null; }}>
        <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))] text-sm"><span>{i! + 1} / {photos.length}</span>
          <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto mr-3 text-white/70 underline">Full size</a>
          <button aria-label="Close" onClick={() => setI(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><X className="h-5 w-5" /></button></div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
          <img src={p.url} alt={p.caption || "Site photo"} className="max-h-full max-w-full object-contain" />
          {photos.length > 1 && <>
            <button aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-2 hidden h-11 w-11 place-items-center rounded-full bg-white/10 sm:grid"><ChevronLeft className="h-6 w-6" /></button>
            <button aria-label="Next photo" onClick={() => go(1)} className="absolute right-2 hidden h-11 w-11 place-items-center rounded-full bg-white/10 sm:grid"><ChevronRight className="h-6 w-6" /></button></>}
        </div>
        <p className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-sm text-white/80">{p.caption || p.stage || "Site"} · {when(p.createdAt)}</p>
      </div>}
    </section>
  );
}
