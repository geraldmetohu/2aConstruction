"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, CreditCard, Ruler, ShieldCheck } from "lucide-react";
import { Draft, newDraft, requirementsSchema, roomSchema } from "@/app/lib/premium/requirements";
import { PropertyQuestions, PublicSpecifications, RoomQuestions, ScopeReview, WorkQuestions } from "./Questions";
import { startPremiumCheckout } from "./actions";

const input = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
const button = "inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-bold text-white hover:bg-amber-500 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:border-amber-500 disabled:opacity-40";
const storageKey = "2a-premium-estimator-v1";
const steps = ["Project", "Rooms & work", "Specification", "Your details", "Review"];
const defaultId = "11111111-1111-4111-8111-111111111111";
export { ScopeReview as Review } from "./Questions";

export function PremiumWizard({ enabled, specifications = {}, mappingVersion = "" }: { enabled: boolean; specifications?: PublicSpecifications; mappingVersion?: string }) {
  const [draft, setDraft] = useState<Draft>(() => newDraft(defaultId));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const raw = JSON.parse(saved);
        const parsed = requirementsSchema.safeParse({ ...raw.draft, consent: true });
        if (parsed.success) { setDraft({ ...parsed.data, consent: false }); setStep(4); requestKey.current = typeof raw.key === "string" ? raw.key : null; setNotice("Your reviewed answers have been restored in this tab. Please check them before continuing."); }
      }
    } catch { /* Storage is optional; the wizard remains usable. */ }
    if (new URLSearchParams(window.location.search).has("cancelled")) setNotice("You returned from checkout. Review your answers and continue when you are ready. Payment is confirmed only after Stripe notifies us.");
  }, []);
  function change(next: Draft) { setDraft({ ...next, consent: false }); requestKey.current = null; setError(""); }
  function go(next: number) { setStep(next); setError(""); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }); }
  function next() {
    if (step === 0 && draft.postcode.trim().length < 3) return setError("Enter the project postcode before continuing.");
    if (step === 1 || step === 2) {
      for (const room of draft.rooms) { const parsed = roomSchema.safeParse(room); if (!parsed.success) return setError(`${room.name || "Room"}: ${parsed.error.issues[0].message}`); }
    }
    if (step === 3) {
      const parsed = requirementsSchema.safeParse({ ...draft, consent: true });
      if (!parsed.success) return setError(parsed.error.issues[0].message);
    }
    go(step + 1);
  }
  async function pay() {
    const parsed = requirementsSchema.safeParse(draft);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true); setError("");
    requestKey.current ??= crypto.randomUUID();
    try {
      try { sessionStorage.setItem(storageKey, JSON.stringify({ draft, key: requestKey.current })); } catch { /* Optional tab-local recovery. */ }
      const result = await startPremiumCheckout(JSON.stringify(parsed.data), requestKey.current, mappingVersion);
      if (result.ok) { window.location.assign(result.url); return; }
      if ("needsLogin" in result && result.needsLogin) { window.location.assign("/api/auth/login?post_login_redirect_url=%2Fpremium-estimator"); return; }
      setError(result.message);
      if (/expired|answers changed/i.test(result.message)) requestKey.current = null;
    } catch { setError("The connection was interrupted. Try again to resume the same checkout."); }
    finally { setBusy(false); }
  }
  const field = (label: string, value: string, onChange: (v: string) => void, placeholder = "", type = "text") => <label className="block text-sm font-semibold">{label}<input className={input} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={type === "email" ? 200 : 100} /></label>;
  return <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_48%,#f4f7fb_100%)] px-4 py-10 md:py-16">
    <div className="mx-auto max-w-6xl">
      <Link href="/estimator" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-amber-800"><ArrowLeft size={16} /> Looking for the normal estimator?</Link>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_300px]">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">2A Construction · Premium estimator</p><h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">Your space.<br />A clearer starting point.</h1><p className="mt-4 max-w-2xl leading-7 text-neutral-600">Tell us what you want to change. Build a room-by-room scope, choose your specification and review everything before the £50 payment.</p></div>
        <aside className="rounded-3xl bg-neutral-950 p-6 text-white"><p className="text-sm text-neutral-300">One-off estimate fee</p><p className="mt-1 text-4xl font-black">£50<span className="ml-2 text-sm font-normal text-neutral-400">total</span></p><ul className="mt-5 space-y-3 text-sm text-neutral-200">{["Itemised indicative estimate", "Materials, labour and VAT", "Optional work shown separately"].map(t => <li key={t} className="flex gap-2"><Check className="shrink-0 text-amber-400" size={17} />{t}</li>)}</ul><p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-neutral-400">The fee is for preparing your estimate. Construction costs are separate. A survey and agreed quote are needed before work begins.</p></aside>
      </div>
      {!enabled && <p className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Premium payments are not open yet. You can explore the questions and review your scope. Use the normal estimator to send an enquiry now.</p>}
      <nav aria-label="Estimate progress" className="my-8"><ol className="grid grid-cols-5 gap-2">{steps.map((name, i) => <li key={name} aria-current={i === step ? "step" : undefined} className={`border-t-4 pt-3 ${i <= step ? "border-amber-500" : "border-neutral-200"}`}><span className="text-xs font-bold text-neutral-400">0{i + 1}</span><span className={`mt-1 block break-words text-[10px] font-semibold leading-4 sm:text-sm ${i === step ? "text-neutral-950" : "text-neutral-500"}`}>{name}</span></li>)}</ol></nav>
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] md:p-9">
        <div className="mb-7 flex items-center gap-3"><span className="rounded-2xl bg-amber-100 p-3 text-amber-800">{step === 4 ? <ClipboardList size={23} /> : <Ruler size={23} />}</span><div><p className="text-xs uppercase tracking-wider text-neutral-500">Step {step + 1} of 5</p><h2 ref={heading} tabIndex={-1} className="scroll-mt-24 text-2xl font-black outline-none">{["What are you planning?", "Where will the work happen?", "Make the scope your own", "Who is this estimate for?", "Review before payment"][step]}</h2></div></div>
        {notice && <p role="status" className="mb-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{notice}</p>}
        {step === 0 && <PropertyQuestions draft={draft} change={change} />}
        {step === 1 && <RoomQuestions draft={draft} change={change} />}
        {step === 2 && <WorkQuestions draft={draft} change={change} specifications={specifications} />}
        {step === 3 && <div className="max-w-2xl space-y-5">{field("Full name", draft.contact.name, name => change({ ...draft, contact: { ...draft.contact, name } }))}{field("Email address", draft.contact.email, email => change({ ...draft, contact: { ...draft.contact, email } }), "you@example.com", "email")}{field("Phone number (optional)", draft.contact.phone, phone => change({ ...draft, contact: { ...draft.contact, phone } }), "", "tel")}<p className="text-sm leading-6 text-neutral-500">Your estimate will be linked to your signed-in account. We use these details to identify your enquiry. Your reviewed answers are kept in this browser tab so you can return from sign-in or checkout.</p></div>}
        {step === 4 && <><ScopeReview draft={draft} specifications={specifications} /><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex justify-between gap-4 text-lg font-black"><span>Premium estimate fee</span><span>£50 total</span></div><p className="mt-3 text-sm leading-6 text-neutral-700">You are paying for an indicative estimate of the confirmed scope above. Optional extras are separate; uncertain and special items need review. This payment does not book construction work or create a final project.</p><label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.consent} onChange={e => setDraft({ ...draft, consent: e.target.checked })} className="mt-1 accent-amber-600" /><span>I have reviewed my answers and understand the £50 fee, the exclusions and that a survey and final agreed quote are still required.</span></label></div></>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-neutral-100 pt-6"><button type="button" className={secondary} disabled={step === 0 || busy} onClick={() => go(step - 1)}><ArrowLeft size={16} /> Back</button>{step < 4 ? <button type="button" className={button} onClick={next}>Continue <ArrowRight size={16} /></button> : <button type="button" className={button} disabled={!enabled || !draft.consent || busy} onClick={pay}><CreditCard size={17} />{busy ? "Preparing secure checkout…" : enabled ? "Continue to secure payment · £50" : "Payments opening soon"}</button>}</div>
        {step === 4 && <p className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500"><ShieldCheck size={15} /> Secure payment through Stripe. Sign-in may be required.</p>}
      </div>
    </div>
  </main>;
}
