"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Camera, CircleCheck, ClipboardList, FileText, House, ListTodo, MessageSquare, Phone, Send, ShoppingCart, TriangleAlert, Users } from "lucide-react";
import type { DueRow, StageProgress, SupplyNeed } from "@/app/lib/takeoff/jobs";
import type { ClientContact } from "@/app/lib/takeoff/jobs-store";
import { clientAnswer, clientMessage, clientReportPayment, clientSaveInfo, clientSupply } from "./project-actions";

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
}

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const input = "w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm";
const btn = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40";
const stateLabel: Record<DueRow["state"], [string, string]> = { PAID: ["Paid", "bg-emerald-100 text-emerald-800"], PART_PAID: ["Part paid", "bg-sky-100 text-sky-800"], DUE: ["Due soon", "bg-amber-100 text-amber-800"], OVERDUE: ["Overdue", "bg-red-100 text-red-800"], UPCOMING: ["Upcoming", "bg-neutral-100 text-neutral-700"] };

export function ClientProject({ v, quoteView, greetingName = "" }: { v: ClientProjectView; quoteView: ReactNode; greetingName?: string }) {
  const router = useRouter();
  const openActions = v.actions.filter(a => a.status === "OPEN");
  const toOrder = v.supplies.filter(s => s.status === "TO_ORDER");
  const due = v.money.rows.filter(r => r.state === "DUE" || r.state === "OVERDUE");
  const todo = openActions.length + toOrder.length + due.length;
  const TABS = [["overview", "Overview", House, 0], ["todo", "To do", ListTodo, todo], ["messages", "Messages", MessageSquare, v.unread], ["photos", "Photos", Camera, 0], ["payments", "Payments", Banknote, due.length], ["details", "Your details", Users, 0], ["quote", "Quote & documents", FileText, 0]] as const;
  type Tab = (typeof TABS)[number][0];
  const [tab, setTab] = useState<Tab>(todo ? "todo" : "overview");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
        <div className="relative mx-auto max-w-6xl px-5 pt-8 sm:px-8 md:pt-10">
          <Link href="/my-quotes" className="text-sm text-white/60 transition-colors hover:text-[#f5b400]">← Client area</Link>
          <div className="mt-6 grid gap-6 pb-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5b400]"><span aria-hidden className="h-px w-8 bg-[#f5b400]" />{greetingName ? `Welcome back, ${greetingName}` : "Your project"} · {v.reference}</p>
              <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-4xl md:text-5xl">{v.title}</h1>
              <p className="mt-2 text-white/70">{v.siteAddress}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80">{v.startDate ? `Start ${day(v.startDate)}${v.finish ? ` · completion around ${day(v.finish)}` : ""}` : "Start date to be confirmed – we'll be in touch"}</p>
            </div>
            <div className="flex flex-col items-center justify-center"><Ring percent={v.progress.percent} /><p className="mt-2 max-w-[12rem] text-center text-xs text-white/60">{current ? `Now: ${current.label}` : v.status === "COMPLETED" ? "Completed" : ""}</p></div>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto border-t border-white/10 py-3 text-sm [scrollbar-width:none]">
            {TABS.map(([k, l, Icon, n]) => <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold transition-colors ${tab === k ? "bg-[#f5b400] text-[#071a33]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{l}{n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{n}</span>}</button>)}
          </nav>
        </div>
      </section>
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 md:py-10">
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}

      {tab === "overview" && <div className="grid gap-5 lg:grid-cols-5">
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6 lg:col-span-3"><h2 className="text-lg font-semibold text-[#071a33]">Progress by stage</h2>
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
          <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Latest</h2>
            <ul className="mt-2 space-y-2 text-sm">{v.events.slice(0, 8).map(e => <li key={e.id} className="border-b pb-2">{e.message}<span className="block text-xs text-neutral-400">{when(e.createdAt)}</span></li>)}</ul></section>
          <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Contact us</h2>
            <p className="mt-2 text-sm">{v.office.siteManager && <>Site manager: <strong>{v.office.siteManager}</strong><br /></>}
              <a className="mt-1 inline-flex items-center gap-1 font-semibold text-[#8a6500]" href={`tel:${(v.office.siteManagerPhone || v.office.phone).replace(/\s/g, "")}`}><Phone className="h-4 w-4" />{v.office.siteManagerPhone || v.office.phone}</a>
              {v.office.email && <><br /><a className="text-[#8a6500]" href={`mailto:${v.office.email}?subject=${encodeURIComponent(v.reference)}`}>{v.office.email}</a></>}</p></section>
        </div>
      </div>}

      {tab === "todo" && <div className="space-y-5">
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Questions & decisions for you</h2>
          {!v.actions.length && <p className="mt-2 text-sm text-neutral-500">Nothing at the moment.</p>}
          <ul className="mt-3 space-y-4">{v.actions.filter(a => a.status !== "CANCELLED").map(a => <ActionItem key={a.id} a={a} busy={busy} answer={r => act(() => clientAnswer(v.quoteId, a.id, r), "Thank you – your answer has been sent.")} />)}</ul></section>
        <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold text-[#071a33]"><ShoppingCart className="h-5 w-5" />Items you order</h2>
          <p className="mt-1 text-sm text-neutral-600">Please order these to the specification shown and tell us when they are ordered and delivered. Not sure? Send us a message before you buy.</p>
          <ul className="mt-3 divide-y">{v.supplies.map(s => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0 flex-1"><span className="block font-semibold">{s.item}</span><span className="text-sm text-neutral-600">{s.quantity} {s.unit} · {s.area}{s.spec ? ` · ${s.spec}` : ""}</span>
                {s.neededBy && <span className={`block text-xs font-semibold ${s.status !== "DELIVERED" && (s.daysLeft ?? 99) < 3 ? "text-red-700" : "text-neutral-500"}`}>Needed on site by {day(s.neededBy)}</span>}</span>
              <span className="flex gap-1">{(["TO_ORDER", "ORDERED", "DELIVERED"] as const).map(st => <button key={st} disabled={busy} onClick={() => act(() => clientSupply(v.quoteId, { itemKey: s.key, label: s.item, status: st, note: "" }), "Thanks – updated.")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.status === st ? (st === "DELIVERED" ? "bg-emerald-600 text-white" : "bg-[#071a33] text-white") : "bg-white"}`}>{st === "TO_ORDER" ? "To order" : st === "ORDERED" ? "Ordered" : "Delivered"}</button>)}</span>
            </li>))}{!v.supplies.length && <li className="py-2 text-sm text-neutral-500">Nothing for you to order – we supply everything.</li>}</ul></section>
        {due.length > 0 && <button onClick={() => setTab("payments")} className="w-full rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6 text-left"><h2 className="text-lg font-semibold text-[#071a33]">Payments due</h2><ul className="mt-2 text-sm">{due.map(r => <li key={r.n}>{r.label}: {gbp(r.balance)} {r.date ? `by ${day(r.date)}` : ""}</li>)}</ul></button>}
      </div>}

      {tab === "messages" && <Messages v={v} busy={busy} send={(t, note) => act(() => clientMessage(v.quoteId, t, note), note ? "Note saved." : "Message sent – we will reply soon.")} />}

      {tab === "photos" && <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Site photos</h2>
        {!v.photos.length && <p className="mt-2 text-sm text-neutral-500">Photos of your project will appear here as the work progresses.</p>}
        <div className="mt-3 columns-1 gap-3 sm:columns-2 lg:columns-3">{v.photos.map(p => <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="mb-3 block break-inside-avoid overflow-hidden rounded-xl"><img src={p.url} alt={p.caption} className="w-full" loading="lazy" /><span className="block bg-neutral-50 px-3 py-2 text-xs text-neutral-600">{p.caption || p.stage || "Site"} · {when(p.createdAt)}</span></a>)}</div></section>}

      {tab === "payments" && <Payments v={v} busy={busy} report={p => act(() => clientReportPayment(v.quoteId, p), "Thank you – we will confirm once it reaches our account.")} />}

      {tab === "details" && <Details v={v} busy={busy} save={p => act(() => clientSaveInfo(v.quoteId, p), "Saved – thank you.")} />}

      {tab === "quote" && <div className="space-y-5">
        {v.documents.length > 0 && <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Project documents</h2><p className="text-xs text-neutral-500">Plans, certificates and other files we've shared with you.</p>
          <ul className="mt-3 divide-y">{v.documents.map(d => <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 hover:bg-neutral-50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-[10px] font-bold uppercase text-amber-400">{(d.fileName.split(".").pop() || "file").slice(0, 4)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.title}</span><span className="block text-xs text-neutral-500">{d.categoryLabel} · {when(d.createdAt)}{d.sizeBytes ? ` · ${d.sizeBytes > 1048576 ? `${(d.sizeBytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(d.sizeBytes / 1024))} KB`}` : ""}</span></span>
            <span className="text-xs font-bold text-[#8a6500]">Open</span></a></li>)}</ul></section>}
        {quoteView}</div>}
    </main>
    </>
  );
}

function Ring({ percent }: { percent: number }) {
  const r = 42, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 100 100" className="h-28 w-28"><circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" /><circle cx="50" cy="50" r={r} fill="none" stroke="#f5b400" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(percent / 100) * c} ${c}`} transform="rotate(-90 50 50)" /><text x="50" y="56" textAnchor="middle" className="fill-white text-[20px] font-semibold">{percent}%</text></svg>;
}

function ActionItem({ a, busy, answer }: { a: ClientProjectView["actions"][number]; busy: boolean; answer: (r: string) => void }) {
  const [r, setR] = useState(a.response);
  return (
    <li className={`rounded-xl border p-4 ${a.status === "OPEN" ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="font-semibold">{a.title}{a.dueDate && <span className="ml-2 text-xs font-normal text-neutral-600">by {day(a.dueDate)}</span>}</p>
      {a.detail && <p className="mt-1 text-sm text-neutral-700">{a.detail}</p>}
      {a.status === "DONE" ? <p className="mt-2 text-sm text-emerald-700"><CircleCheck className="mr-1 inline h-4 w-4" />Done{a.response ? ` – ${a.response}` : ""}</p> : <>
        <textarea className={`${input} mt-2`} rows={2} placeholder="Your answer" value={r} onChange={e => setR(e.target.value)} />
        <button disabled={busy || !r.trim()} onClick={() => answer(r)} className={`${btn} mt-2 bg-[#071a33] text-white`}>{a.status === "ANSWERED" ? "Update answer" : "Send answer"}</button></>}
    </li>
  );
}

function Messages({ v, busy, send }: { v: ClientProjectView; busy: boolean; send: (t: string, note: boolean) => Promise<boolean> }) {
  const [t, setT] = useState(""), [note, setNote] = useState(false);
  const thread = v.events.filter(e => ["MESSAGE", "CLIENT_MESSAGE", "CLIENT_NOTE", "ANSWER", "ACTION", "PAYMENT"].includes(e.kind));
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Messages & notes</h2>
      <textarea className={`${input} mt-3`} rows={3} placeholder={note ? "A note for the team (e.g. please keep the side gate closed)" : "Write to us…"} value={t} onChange={e => setT(e.target.value)} />
      <div className="mt-2 flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={note} onChange={e => setNote(e.target.checked)} />Save as a note for the team</label>
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
      <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Payment schedule</h2>
        <ul className="mt-3 divide-y">{v.money.rows.map(r => <li key={r.n} className="flex flex-wrap items-center justify-between gap-2 py-3"><span><span className="font-semibold">{r.label}</span><span className="block text-xs text-neutral-500">{r.when}{r.date ? ` · due ${day(r.date)}` : ""}</span></span>
          <span className="text-right"><span className="font-bold">{gbp(r.amount)}</span><span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${stateLabel[r.state][1]}`}>{stateLabel[r.state][0]}</span>{r.paid > 0 && r.balance > 0 && <span className="block text-xs text-neutral-500">{gbp(r.balance)} left</span>}</span></li>)}</ul></section>
      <section className="rounded-2xl border-2 border-neutral-900 bg-white p-5"><h2 className="text-lg font-semibold text-[#071a33]">How to pay</h2>
        {v.bank.accountNumber ? <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm"><dt className="text-neutral-500">Account name</dt><dd className="font-semibold">{v.bank.accountName}</dd><dt className="text-neutral-500">Sort code</dt><dd className="font-semibold">{v.bank.sortCode}</dd><dt className="text-neutral-500">Account number</dt><dd className="font-semibold">{v.bank.accountNumber}</dd><dt className="text-neutral-500">Reference</dt><dd className="font-semibold">{v.reference}</dd></dl>
          : <p className="mt-2 text-sm">Please call us for bank details.</p>}
        <p className="mt-2 text-xs text-neutral-500">We will never ask you to change bank details by email. If in doubt, call us before paying.</p>
        <h3 className="mt-5 font-semibold">Paid? Let us know</h3>
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

function Details({ v, busy, save }: { v: ClientProjectView; busy: boolean; save: (p: { contacts: ClientContact[]; accessNotes: string }) => void }) {
  const [contacts, setContacts] = useState<ClientContact[]>(v.contacts.length ? v.contacts : [{ name: "", role: "", phone: "", email: "" }]);
  const [notes, setNotes] = useState(v.accessNotes);
  return (
    <section className="rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#071a33]">Contacts & access</h2>
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
