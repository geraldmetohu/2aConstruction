"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CalendarDays, Check, FileText, ShoppingCart } from "lucide-react";
import { HelpCard, PortalHero, Steps } from "./PortalParts";
import { PortalScope } from "./PortalScope";
import type { CustomerTakeoff } from "@/app/lib/takeoff/engine";
import type { TakeoffInput } from "@/app/lib/takeoff/schema";
import { phaseLabels } from "@/app/lib/takeoff/types";
import { acceptClientQuote, confirmChoices, previewChoices } from "./actions";

export type ChoiceField = { scope: "room" | "package"; id: string; area: string; key: string; label: string; value: string; type: "select" | "text"; options: [string, string][] };
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ClientQuote({ id, reference, status, version, customer: c, property, siteAddress, clientName, choiceFields, acceptedName, acceptedAt, notices, history, greetingName = "", embedded = false }: {
  greetingName?: string; embedded?: boolean;
  id: string; reference: string; status: string; version: number; customer: CustomerTakeoff; property: TakeoffInput["property"]; siteAddress: string; clientName: string;
  choiceFields: ChoiceField[]; acceptedName: string | null; acceptedAt: string | null; notices: { message: string; at: string }[]; history: { kind: string; message: string; at: string }[];
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>(() => Object.fromEntries(choiceFields.map(f => [`${f.scope}:${f.id}:${f.key}`, f.value])));
  const [preview, setPreview] = useState<{ gross: number; changes: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(clientName);
  const [agree, setAgree] = useState(false);
  const open = status === "SENT";
  const extras = (c.layout?.options ?? []).map((o, i) => ({ i, chosen: !!o.chosen, priced: o.price != null }));
  const [picked, setPicked] = useState<Record<number, boolean>>(() => Object.fromEntries(extras.map(e => [e.i, e.chosen])));
  const payload = () => [
    ...choiceFields.map(f => ({ scope: f.scope as string, id: f.id, key: f.key, value: choices[`${f.scope}:${f.id}:${f.key}`] ?? f.value })),
    ...extras.filter(e => e.priced).map(e => ({ scope: "extra", id: String(e.i), key: "chosen", value: picked[e.i] ? "yes" : "no" })),
  ];
  const changed = useMemo(() => choiceFields.some(f => (choices[`${f.scope}:${f.id}:${f.key}`] ?? f.value) !== f.value) || extras.some(e => !!picked[e.i] !== e.chosen), [choices, choiceFields, picked, extras]);
  const areas = [...new Set(choiceFields.map(f => f.area))];

  async function check() { setBusy(true); const r = await previewChoices(id, payload()); setBusy(false); if (r.ok) setPreview(r); else setMsg({ ok: false, text: r.message }); }
  async function confirm() { setBusy(true); const r = await confirmChoices(id, version, payload()); setBusy(false); setMsg(r.ok ? { ok: true, text: "Thank you – your choices are saved and the quote has been updated." } : { ok: false, text: r.message }); setPreview(null); router.refresh(); }
  const [start, setStart] = useState("");
  async function accept() { setBusy(true); const r = await acceptClientQuote(id, version, name, agree, start); setBusy(false); setMsg(r.ok ? { ok: true, text: `Thank you – you have accepted the quote. ${start ? "We'll confirm your start date shortly." : "We will be in touch to book your start date."}` } : { ok: false, text: r.message }); router.refresh(); }

  const card = "rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6";
  const h2 = "text-lg font-semibold tracking-[-0.01em] text-[#071a33]";
  const accepted = status === "ACCEPTED";
  const step = accepted ? 4 : changed || preview ? 2 : 1;

  const docs = (
    <Link href={`/my-quotes/${id}/documents`} className="group flex items-center justify-between gap-4 rounded-2xl border border-[#071a33]/10 bg-white p-5 transition-colors hover:border-[#f5b400]">
      <span className="flex items-center gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#071a33] text-[#f5b400]"><FileText className="h-5 w-5" /></span>
        <span><span className="block font-semibold text-[#071a33]">Your documents</span><span className="text-sm text-neutral-600">Quotation, payment schedule, contract, guarantee and health &amp; safety pack – view, print or save as PDF.</span></span></span>
      <ArrowRight className="h-5 w-5 shrink-0 text-[#071a33] transition-transform group-hover:translate-x-1" />
    </Link>
  );
  const pdfLink = <a href={`/my-quotes/${id}/quotation.pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-[#071a33]/10 bg-white px-5 py-3 text-sm font-semibold text-[#071a33] transition-colors hover:border-[#f5b400]"><FileText className="h-4 w-4" />Download quotation (PDF)</a>;

  const content = (
    <div className="min-w-0 space-y-6">
      {notices.length > 0 && <section className="rounded-2xl border border-[#f5b400] bg-[#f5b400]/10 p-5"><p className="flex items-center gap-2 font-semibold text-[#071a33]"><Bell className="h-5 w-5 text-[#c99400]" />We&apos;ve updated your quote</p>
        <ul className="mt-2 space-y-1 text-sm text-[#071a33]/80">{notices.map((n, i) => <li key={i}>• {n.message.replace(/^Quote updated: /, "")} <span className="text-neutral-500">({when(n.at)})</span></li>)}</ul></section>}
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      {embedded && docs}{embedded && pdfLink}

      {c.layout ? <PortalScope layout={c.layout} net={c.net} vat={c.vat} gross={c.gross} discount={c.discount} vatBreakdown={c.vatBreakdown}
        picked={open ? picked : undefined} onPick={open ? (i, on) => { setPicked(p => ({ ...p, [i]: on })); setPreview(null); } : undefined} /> : <section className="grid gap-6 md:grid-cols-2">
        <div className={card}><h2 className={h2}>Price by area</h2>
          <table className="mt-3 w-full text-sm"><tbody>{c.areas.map(a => <tr key={a.area} className="border-b border-[#071a33]/10 last:border-0"><td className="py-2">{a.area}</td><td className="text-right font-semibold tabular-nums">{gbp(a.net)}</td></tr>)}</tbody></table>
        </div>
        <div className={card}><h2 className={h2}>Price by part of the job</h2>
          <table className="mt-3 w-full text-sm"><tbody>
            {c.phases.map(p => <tr key={p.phase} className="border-b border-[#071a33]/10 last:border-0"><td className="py-2">{phaseLabels[p.phase]}<span className="block text-xs text-neutral-500">materials {gbp(p.materials)} · labour {gbp(p.labour)}{p.siteCosts ? ` · site ${gbp(p.siteCosts)}` : ""}</span></td><td className="text-right align-top font-semibold tabular-nums">{gbp(p.total)}</td></tr>)}
          </tbody></table>
          <p className="mt-3 text-xs text-neutral-600">Scaffolding: <strong>{c.scaffolding.included ? "included" : "not included"}</strong>. Prices exclude VAT.</p>
        </div>
      </section>}

      {choiceFields.length > 0 && (
        <section className={`${card} ${open ? "ring-2 ring-[#f5b400]/40" : ""}`}>
          <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f5b400] text-sm font-bold text-[#071a33]">2</span>
            <div><h2 className={h2}>Your choices</h2>
              <p className="mt-1 text-sm text-neutral-600">{open ? "Your quote is priced with the options below. Change any of them, press “See new price”, then confirm. Nothing is fixed until you accept." : "Your confirmed choices."}</p></div></div>
          <div className="mt-5 space-y-6">
            {areas.map(a => (
              <div key={a}><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{a}</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {choiceFields.filter(f => f.area === a).map(f => {
                    const k = `${f.scope}:${f.id}:${f.key}`;
                    const field = "mt-1.5 w-full rounded-xl border border-[#071a33]/15 bg-white px-3 py-2.5 text-[#071a33] focus:border-[#f5b400] focus:outline-none focus:ring-2 focus:ring-[#f5b400]/30 disabled:bg-[#f6f7f9]";
                    return (
                      <label key={k} className="block text-sm font-medium text-[#071a33]">{f.label}
                        {f.type === "select"
                          ? <select disabled={!open} className={field} value={choices[k] ?? f.value} onChange={e => { setChoices({ ...choices, [k]: e.target.value }); setPreview(null); }}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                          : <input disabled={!open} className={field} value={choices[k] ?? f.value} maxLength={60} placeholder="e.g. colour name / code" onChange={e => { setChoices({ ...choices, [k]: e.target.value }); setPreview(null); }} />}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </section>
      )}

          {open && changed && <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-[#f5b400] bg-white p-4 shadow-lg">
            {!preview && <button disabled={busy} onClick={check} className="rounded-xl border border-[#071a33] px-5 py-2.5 text-sm font-bold text-[#071a33] hover:bg-[#071a33] hover:text-white">{busy ? "Working it out…" : "See new price"}</button>}
            {preview && <><p className="text-sm text-[#071a33]">New total: <strong className="text-lg tabular-nums">{gbp(preview.gross)}</strong> <span className={preview.gross >= c.gross ? "text-[#8a6500]" : "text-emerald-700"}>({preview.gross >= c.gross ? "+" : "−"}{gbp(Math.abs(preview.gross - c.gross))})</span></p>
              <button disabled={busy} onClick={confirm} className="rounded-xl bg-[#071a33] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0d2a4f]">Confirm my choices</button></>}
          </div>}

      {c.clientOrders.length > 0 && (
        <section className={card}>
          <h2 className={`flex items-center gap-2 ${h2}`}><ShoppingCart className="h-5 w-5 text-[#c99400]" />What you&apos;ll order</h2>
          <p className="mt-1 text-sm text-neutral-600">You&apos;ve agreed to supply these items. Please have them on site before the stage starts – quantities include a small allowance for cutting.</p>
          <ul className="mt-4 divide-y divide-[#071a33]/10 rounded-xl border border-[#071a33]/10">{c.clientOrders.map((o, i) => (
            <li key={i} className="flex items-center gap-3 p-3 text-sm">{o.imageUrl ? <img src={o.imageUrl} alt="" className="h-12 w-12 rounded-lg border object-contain" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#f6f7f9] text-[#071a33]/30"><ShoppingCart className="h-5 w-5" /></span>}
              <span className="min-w-0 flex-1"><span className="block font-medium text-[#071a33]">{o.description}</span><span className="text-xs text-neutral-500">{o.area}</span></span><span className="font-semibold tabular-nums text-[#071a33]">{o.quantity} {o.unit}</span></li>
          ))}</ul>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className={card}><h2 className={h2}>The property</h2><p className="mt-2 text-sm text-neutral-700">{property.storeys} storeys · {property.bedrooms} bedrooms{property.notes ? ` · ${property.notes}` : ""}</p>
          {c.rooms.length > 0 && <table className="mt-3 w-full text-xs"><tbody>{c.rooms.map(r => <tr key={r.id} className="border-b border-[#071a33]/10"><td className="py-1.5">{r.name}</td><td className="text-right">{r.length} × {r.width} m</td></tr>)}</tbody></table>}</div>
        <div className={card}><h2 className={`flex items-center gap-2 ${h2}`}><CalendarDays className="h-5 w-5 text-[#c99400]" />Programme</h2>
          <p className="mt-2 text-sm text-neutral-700">About <strong>{c.programme.workingDays} working days</strong> (≈ {c.programme.weeks} weeks) on site.</p>
          <p className="mt-2 text-xs text-neutral-600">Monday to Friday, excluding bank holidays. The dates for each stage are in the programme section of your quotation.</p></div>
      </section>

      <details className={`${card} group`} open={!embedded}>
        <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><h2 className={h2}>{c.layout ? "Assumptions & terms" : "Scope of works & terms"}</h2><span className="text-sm text-neutral-500 group-open:hidden">Show</span><span className="hidden text-sm text-neutral-500 group-open:inline">Hide</span></summary>
        {!c.layout && <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-neutral-800">{c.scope.map(s => <li key={s}>{s}</li>)}</ol>}
        {!c.layout && <h3 className="mt-5 font-semibold text-[#071a33]">Assumptions &amp; terms</h3>}<ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-700">{c.assumptions.map(s => <li key={s}>{s}</li>)}<li>Subject to site survey. Payment: deposit on acceptance, staged payments, balance on completion.</li></ul>
      </details>

      {open && (
        <section id="accept" className="scroll-mt-28 overflow-hidden rounded-2xl bg-[#071a33] text-white">
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f5b400] text-sm font-bold text-[#071a33]">3</span>
              <div><h2 className="text-xl font-semibold">Happy with everything? Accept online.</h2>
                <p className="mt-1 text-sm text-white/70">You&apos;re accepting version {version} for <strong className="text-white">{gbp(c.gross)}</strong> inc. VAT. Typing your name signs the contract online. Tell us when you&apos;d like to start and we&apos;ll confirm the date and send the deposit invoice.</p></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="block text-sm font-medium text-white/80">Your full name (your signature)<input autoComplete="name" className="mt-1.5 block w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 font-serif text-lg italic text-white placeholder:text-white/40 focus:border-[#f5b400] focus:outline-none" value={name} onChange={e => setName(e.target.value)} /></label>
              <label className="block text-sm font-medium text-white/80">Preferred start (optional)<input type="date" min={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date())} className="mt-1.5 block w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-white [color-scheme:dark] focus:border-[#f5b400] focus:outline-none" value={start} onChange={e => setStart(e.target.value)} /></label>
              <button disabled={busy || changed || !agree} onClick={accept} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5b400] px-6 py-3 text-sm font-bold text-[#071a33] transition-colors hover:bg-white disabled:opacity-40" title={changed ? "Confirm or reset your choices first" : !agree ? "Tick the box first" : ""}><Check className="h-4 w-4" />Accept quote</button>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-white/80"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#f5b400]" checked={agree} onChange={e => setAgree(e.target.checked)} />I have read and accept the quotation, contract terms, payment schedule and guarantee in “Your documents”.</label>
            {changed && <p className="mt-3 text-xs text-[#f5b400]">You&apos;ve changed some choices – confirm them above first so you accept the right price.</p>}
          </div>
        </section>
      )}

      {history.length > 0 && <details className="text-sm text-neutral-600"><summary className="cursor-pointer font-medium text-[#071a33]">Quote history</summary><ul className="mt-2 space-y-1">{history.map((h, i) => <li key={i}>{when(h.at)} – {h.message}</li>)}</ul></details>}
    </div>
  );

  if (embedded) return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#071a33]/10 bg-white p-5 sm:p-6">
        <div><p className="font-mono text-xs font-semibold tracking-wider text-[#071a33]/60">QUOTATION {reference}</p><p className="mt-1 text-lg font-semibold text-[#071a33]">{siteAddress || "Your project"}</p>
          <p className="mt-1 text-sm text-neutral-600">Version {version}{accepted && acceptedAt ? ` · accepted by ${acceptedName} on ${when(acceptedAt)}` : ""}</p></div>
        <div className="text-right"><p className="text-xs text-neutral-500">Total inc. VAT</p><p className="text-2xl font-semibold tabular-nums text-[#071a33]">{gbp(c.gross)}</p><p className="text-xs text-neutral-500">{gbp(c.net)} + VAT {gbp(c.vat)}</p></div>
      </div>
      {content}
    </div>
  );

  const total = (
    <div className="rounded-2xl border-2 border-[#f5b400] bg-white/5 px-6 py-5 backdrop-blur lg:min-w-[260px]">
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">Total inc. VAT</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">{gbp(c.gross)}</p>
      <p className="mt-1 text-xs text-white/60">{gbp(c.net)} + VAT {gbp(c.vat)}</p>
    </div>
  );

  return (
    <>
      <PortalHero back={{ href: "/my-quotes", label: "Client area" }} eyebrow={`Quotation ${reference}`}
        title={accepted ? <>Your accepted quote</> : <>{greetingName ? <>Hi {greetingName}, </> : null}here&apos;s your <span className="text-[#f5b400]">quotation.</span></>}
        lead={<><span className="font-semibold text-white">{siteAddress || "Your project"}</span><span className="block text-sm">Version {version}{accepted && acceptedAt ? ` · accepted by ${acceptedName} on ${when(acceptedAt)}` : ""}</span></>}
        right={total}>
        <Steps current={step} />
      </PortalHero>
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:py-12 lg:grid-cols-[1fr_320px]">
        {content}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {docs}
          {pdfLink}
          {open && <a href="#accept" className="flex items-center justify-center gap-2 rounded-2xl bg-[#071a33] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#f5b400] hover:text-[#071a33]"><Check className="h-4 w-4" />Ready? Accept this quote</a>}
          <HelpCard reference={reference} />
        </aside>
      </main>
    </>
  );
}
