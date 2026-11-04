"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Copy, Link as LinkIcon, Mail, Pencil, Phone, Plus, Star, X } from "lucide-react";
import type { PayOwed } from "@/app/lib/takeoff/jobs";
import { checkInLinkAction, rateWorkerAction, saveWorkerAction } from "../jobs/actions";

type W = { id: string; name: string; kind: "EMPLOYEE" | "SUBCONTRACTOR"; trade: string; phone: string; email: string; payBasis: "DAY" | "JOB"; dayRate: number | null; notes: string; active: boolean; hasLink: boolean;
  rating: number | null; ratings: number; jobs: (PayOwed & { job: string; active: boolean })[]; owed: number; paid: number; days: number; activeJobs: number };
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
const input = "mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm";
const blank = { name: "", kind: "EMPLOYEE" as W["kind"], trade: "", phone: "", email: "", payBasis: "DAY" as W["payBasis"], dayRate: "", notes: "", active: true };
const TRADES = ["General builder", "Labourer", "Groundworker", "Bricklayer", "Carpenter", "Roofer", "Plasterer", "Electrician", "Plumber", "Gas engineer", "Tiler", "Decorator", "Kitchen fitter", "Scaffolder", "Steel fabricator", "Other"];

export function TeamManager({ workers, email }: { workers: W[]; email: boolean }) {
  const router = useRouter();
  const [sort, setSort] = useState<"rating" | "price" | "name" | "owed">("rating");
  const [kind, setKind] = useState<"ALL" | W["kind"]>("ALL");
  const [trade, setTrade] = useState("");
  const [form, setForm] = useState<(typeof blank & { id?: string }) | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => workers.filter(w => (kind === "ALL" || w.kind === kind) && (!trade || w.trade === trade)).sort((a, b) =>
    sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : sort === "price" ? (a.dayRate ?? 1e9) - (b.dayRate ?? 1e9) : sort === "owed" ? b.owed - a.owed : a.name.localeCompare(b.name)), [workers, sort, kind, trade]);
  const trades = [...new Set(workers.map(w => w.trade).filter(Boolean))].sort();
  const save = async () => {
    if (!form) return; setBusy(true);
    const r = await saveWorkerAction({ ...form, dayRate: Number(form.dayRate) > 0 ? Number(form.dayRate) : null });
    setBusy(false); setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.message }); if (r.ok) { setForm(null); router.refresh(); }
  };
  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black">Workers & subcontractors</h1><p className="text-sm text-neutral-600">Tap to call, WhatsApp or email. Sort by rating or price to choose who to use next. Each person gets a personal check-in link for site.</p></div>
        <button onClick={() => setForm({ ...blank })} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add person</button>
      </div>
      {msg && <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      {form && (
        <section className="rounded-xl border-2 border-amber-400 bg-white p-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">{form.id ? "Edit" : "New person"}</h2><button onClick={() => setForm(null)}><X className="h-4 w-4" /></button></div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">Name<input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label className="text-xs font-semibold">Type<select className={input} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as W["kind"], payBasis: e.target.value === "SUBCONTRACTOR" ? "JOB" : "DAY" })}><option value="EMPLOYEE">Worker (our team)</option><option value="SUBCONTRACTOR">Subcontractor</option></select></label>
            <label className="text-xs font-semibold">Trade<input list="trades" className={input} value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })} /><datalist id="trades">{TRADES.map(t => <option key={t} value={t} />)}</datalist></label>
            <label className="text-xs font-semibold">Phone<input className={input} inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="text-xs font-semibold">Email<input className={input} inputMode="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label className="text-xs font-semibold">Usually paid<select className={input} value={form.payBasis} onChange={e => setForm({ ...form, payBasis: e.target.value as W["payBasis"] })}><option value="DAY">By the day</option><option value="JOB">Price per job</option></select></label>
            <label className="text-xs font-semibold">Day rate £<input className={input} inputMode="decimal" value={form.dayRate} onChange={e => setForm({ ...form, dayRate: e.target.value })} /></label>
            <label className="text-xs font-semibold sm:col-span-2">Notes (CSCS, insurance, availability…)<input className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Active</label>
          </div>
          <button disabled={busy} onClick={save} className="mt-3 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Save</button>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ArrowUpDown className="h-4 w-4 text-neutral-500" />
        {([["rating", "Best rated"], ["price", "Cheapest day rate"], ["owed", "Most owed"], ["name", "Name"]] as const).map(([k, l]) => <button key={k} onClick={() => setSort(k)} className={`rounded-full border px-3 py-1 ${sort === k ? "bg-neutral-950 text-white" : "bg-white"}`}>{l}</button>)}
        <select className="rounded-full border px-3 py-1" value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="ALL">Everyone</option><option value="EMPLOYEE">Workers</option><option value="SUBCONTRACTOR">Subcontractors</option></select>
        <select className="rounded-full border px-3 py-1" value={trade} onChange={e => setTrade(e.target.value)}><option value="">All trades</option>{trades.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(w => <Card key={w.id} w={w} email={email} link={link?.id === w.id ? link.url : undefined} busy={busy}
        edit={() => setForm({ id: w.id, name: w.name, kind: w.kind, trade: w.trade, phone: w.phone, email: w.email, payBasis: w.payBasis, dayRate: w.dayRate ? String(w.dayRate) : "", notes: w.notes, active: w.active })}
        makeLink={async (send) => { setBusy(true); const r = await checkInLinkAction(w.id, send); setBusy(false); if (r.ok) { setLink({ id: w.id, url: r.url }); setMsg({ ok: true, text: r.emailed ? `Link emailed to ${w.email}.` : r.emailNote ? `New link made. ${r.emailNote}` : "New link made – copy and send it (the old link no longer works)." }); router.refresh(); } else setMsg({ ok: false, text: r.message }); }}
        rate={async (score) => { const r = await rateWorkerAction(w.id, score, "", null); if (r.ok) router.refresh(); }} />)}</div>
      {!list.length && <p className="text-sm text-neutral-500">Nobody here yet.</p>}
    </div>
  );
}

function Card({ w, email, link, busy, edit, makeLink, rate }: { w: W; email: boolean; link?: string; busy: boolean; edit: () => void; makeLink: (send: boolean) => void; rate: (s: number) => void }) {
  const tel = w.phone.replace(/\s/g, ""), wa = w.phone.replace(/\D/g, "").replace(/^0/, "44");
  return (
    <article className={`rounded-xl border bg-white p-4 ${w.active ? "" : "opacity-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-lg font-bold">{w.name}</p><p className="text-sm text-neutral-600">{w.trade || "—"} · {w.kind === "SUBCONTRACTOR" ? "Subcontractor" : "Worker"}</p></div>
        <div className="text-right"><p className="text-xl font-black">{w.rating ?? "–"}<span className="text-sm font-normal text-neutral-500">/10</span></p><p className="text-[11px] text-neutral-500">{w.ratings} rating{w.ratings === 1 ? "" : "s"}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {w.phone && <a href={`tel:${tel}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white"><Phone className="h-4 w-4" />Call</a>}
        {w.phone && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 font-semibold">WhatsApp</a>}
        {w.email && <a href={`mailto:${w.email}`} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold"><Mail className="h-4 w-4" />Email</a>}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-neutral-500">Rate</dt><dd className="font-semibold">{w.payBasis === "DAY" ? (w.dayRate ? `${gbp(w.dayRate)}/day` : "—") : "per job"}</dd></div>
        <div><dt className="text-neutral-500">Days / paid</dt><dd className="font-semibold">{w.days} · {gbp(w.paid)}</dd></div>
        <div><dt className="text-neutral-500">Owed</dt><dd className={`font-semibold ${w.owed > 0 ? "text-amber-700" : ""}`}>{gbp(w.owed)}</dd></div>
      </dl>
      {w.jobs.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-neutral-600">{w.jobs.map((j, i) => <li key={i}>{j.active ? "●" : "○"} {j.job}: {j.days} days, owed {gbp(j.balance)}</li>)}</ul>}
      {w.notes && <p className="mt-2 text-xs text-neutral-500">{w.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
        <button onClick={edit} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Pencil className="h-3.5 w-3.5" />Edit</button>
        <button disabled={busy} onClick={() => makeLink(false)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><LinkIcon className="h-3.5 w-3.5" />{w.hasLink ? "New check-in link" : "Check-in link"}</button>
        {email && w.email && <button disabled={busy} onClick={() => makeLink(true)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1"><Mail className="h-3.5 w-3.5" />Email link</button>}
        <span className="ml-auto flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /><select className="rounded border px-1 py-0.5" value="" onChange={e => rate(Number(e.target.value))}><option value="">Rate</option>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></span>
      </div>
      {link && <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs"><code className="min-w-0 flex-1 truncate">{link}</code><button onClick={() => navigator.clipboard.writeText(link)} className="inline-flex items-center gap-1 font-semibold"><Copy className="h-3.5 w-3.5" />Copy</button>
        {w.phone && <a className="font-semibold text-emerald-700" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Your 2A Construction check-in link: ${link}`)}`}>Send by WhatsApp</a>}</div>}
    </article>
  );
}
