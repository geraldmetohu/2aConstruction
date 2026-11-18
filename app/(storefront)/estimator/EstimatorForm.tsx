"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Bath, BrickWall, Building2, Camera, Check, CookingPot, DoorOpen, Droplets, Flame, Hammer, HardHat, House, Layers,
  Loader2, PaintRoller, ShieldCheck, Snowflake, Sofa, Sun, Trees, Warehouse, Wrench, X, Zap, ZoomIn, Phone, Mail, MessageCircle, Clock,
} from "lucide-react";
import { useUploadThing } from "@/app/lib/uploadthing";
import { normalizeUploadedFile } from "@/app/lib/uploaded-file";
import { submitEstimator } from "@/app/actions";
import { BUDGETS, CONTACT, FOUND, HOME, JOB_GROUPS, JOBS, STARTS, VISIT, answerKey, type Job, type Pic, type Question } from "./estimator-data";

type Answers = Record<string, string | string[]>;
type Upload = { name: string; url: string; type?: string };
type Contact = { fullName: string; phone: string; email: string; houseNumber: string; street: string; postcode: string; preferredContact: string; foundUs: string; terms: boolean; contactOk: boolean; news: boolean };

const STEPS = ["What you need", "A few details", "Your home", "Photos", "Budget & timing", "Your details"];
const DRAFT_KEY = "2a-estimator-draft-v2";
const ICONS: Record<string, typeof House> = { House, Layers, Warehouse, Building2, HardHat, Hammer, CookingPot, Bath, Sofa, PaintRoller, Zap, Flame, Snowflake, DoorOpen, ShieldCheck, BrickWall, Trees, Sun, Droplets, Wrench };
const emptyContact: Contact = { fullName: "", phone: "", email: "", houseNumber: "", street: "", postcode: "", preferredContact: "", foundUs: "", terms: false, contactOk: false, news: false };
const homeKey = (k: string) => `Your home · ${k}`;

export function EstimatorForm() {
  const top = useRef<HTMLDivElement>(null);
  const honey = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [jobs, setJobs] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | { emailSent: boolean }>(null);
  const [zoom, setZoom] = useState<Pic | null>(null);
  const [restored, setRestored] = useState(false);

  // Keep the project answers (not contact details) if the page is closed half way.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { const d = JSON.parse(raw); if (Array.isArray(d.jobs) && d.jobs.length) { setJobs(d.jobs.filter((j: string) => JOBS.some(x => x.id === j))); setAnswers(d.answers ?? {}); setNotes(d.notes ?? ""); setRestored(true); } }
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    try { if (sent) localStorage.removeItem(DRAFT_KEY); else if (jobs.length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ jobs, answers, notes })); } catch { /* ignore */ }
  }, [jobs, answers, notes, sent]);

  const chosen = useMemo(() => JOBS.filter(j => jobs.includes(j.id)), [jobs]);
  const go = (n: number) => { setError(""); setStep(n); requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const set = (key: string, value: string | string[]) => setAnswers(a => { const n = { ...a }; if (!value || (Array.isArray(value) && !value.length)) delete n[key]; else n[key] = value; return n; });
  const toggleJob = (id: string) => setJobs(j => j.includes(id) ? j.filter(x => x !== id) : [...j, id]);
  const reset = () => { setJobs([]); setAnswers({}); setNotes(""); setRestored(false); try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

  function next() {
    if (step === 0 && !jobs.length) { setError("Choose at least one thing you'd like done."); return; }
    go(Math.min(STEPS.length - 1, step + 1));
  }

  const contactErrors = (() => {
    const e: Partial<Record<keyof Contact, string>> = {};
    if (contact.fullName.trim().length < 2) e.fullName = "Please enter your name";
    if (contact.phone.replace(/\D/g, "").length < 10) e.phone = "Please enter a phone number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) e.email = "Please enter a valid email";
    if (!contact.houseNumber.trim()) e.houseNumber = "House number or name";
    if (!contact.street.trim()) e.street = "Street";
    if (contact.postcode.trim().length < 5) e.postcode = "Postcode";
    if (!contact.preferredContact) e.preferredContact = "Choose how to contact you";
    if (!contact.terms || !contact.contactOk) e.terms = "Please tick both boxes so we can contact you";
    return e;
  })();
  const [showErrors, setShowErrors] = useState(false);

  async function send() {
    if (Object.keys(contactErrors).length) { setShowErrors(true); setError("Please check the highlighted details."); return; }
    setSending(true); setError("");
    const fd = new FormData();
    fd.set("company", honey.current?.value ?? "");
    fd.set("projectType", chosen.map(j => j.label).join(", "));
    for (const j of chosen) for (const q of j.questions) { const v = answers[answerKey(j, q)]; if (v) (Array.isArray(v) ? v : [v]).forEach(x => fd.append(answerKey(j, q), x)); }
    for (const [k, v] of Object.entries(answers)) if (k.startsWith("Your home · ") || k.startsWith("Timing · ")) (Array.isArray(v) ? v : [v]).forEach(x => fd.append(k, x));
    if (notes.trim()) fd.set("Anything else we should know", notes.trim());
    uploads.forEach(u => fd.append("photosUrls", u.url));
    const budget = answers["Timing · budget"], start = answers["Timing · start"];
    fd.set("budgetRange", typeof budget === "string" ? budget : "");
    fd.set("startTimeframe", typeof start === "string" ? start : "");
    for (const k of ["fullName", "phone", "email", "houseNumber", "street", "postcode", "preferredContact", "foundUs"] as const) fd.set(k, contact[k].trim());
    fd.set("termsAccepted", "on"); fd.set("marketingAccepted", "on");
    if (contact.news) fd.set("newsOptIn", "on");
    try {
      const r = await submitEstimator(fd);
      if (r.ok) { setSent({ emailSent: (r as { emailSent?: boolean }).emailSent ?? true }); top.current?.scrollIntoView({ behavior: "smooth" }); }
      else setError(r.message);
    } catch { setError("Sorry, something went wrong sending your request. Please try again or call us."); }
    setSending(false);
  }

  return (
    <section className="bg-[#f4f6f9] text-neutral-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#071a33] text-white">
        <Image src="/images/estimator_overview.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071a33] via-[#071a33]/90 to-[#071a33]/40" />
        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-10 md:pb-24 md:pt-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Free estimate · 2 minutes</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight md:text-5xl">Tell us about your project</h1>
          <p className="mt-3 max-w-xl text-base text-white/75">Tap what you&apos;d like done and answer a few quick questions – skip anything you&apos;re not sure about. We&apos;ll call you to book a free site visit, already prepared.</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {["No obligation", "Every question optional", "Fully insured & guaranteed"].map(t => <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-amber-300" />{t}</span>)}
          </div>
        </div>
      </div>

      <div ref={top} className="relative mx-auto -mt-12 max-w-5xl scroll-mt-24 px-4 pb-16">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
          {sent ? <Success emailSent={sent.emailSent} name={contact.fullName.split(" ")[0]} /> : <>
            {/* Progress */}
            <div className="border-b px-5 pb-4 pt-5 md:px-8">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-bold text-[#071a33]"><span className="text-amber-600">Step {step + 1}</span> of {STEPS.length} · {STEPS[step]}</p>
                {restored && step === 0 && <button onClick={reset} className="text-xs text-neutral-500 underline">Start again</button>}
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {STEPS.map((s, i) => <button key={s} type="button" aria-label={s} disabled={i > step && !jobs.length} onClick={() => (i <= step || jobs.length) && go(i)}
                  className={`h-1.5 rounded-full transition ${i <= step ? "bg-amber-500" : "bg-neutral-200"}`} />)}
              </div>
            </div>

            <div className="px-5 py-6 md:px-8 md:py-8">
              <input ref={honey} type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {step === 0 && <PickJobs jobs={jobs} toggle={toggleJob} />}
              {step === 1 && <Details chosen={chosen} answers={answers} set={set} zoom={setZoom} />}
              {step === 2 && <HomeStep answers={answers} set={set} notes={notes} setNotes={setNotes} />}
              {step === 3 && <Photos uploads={uploads} setUploads={setUploads} />}
              {step === 4 && <Timing answers={answers} set={set} />}
              {step === 5 && <ContactStep c={contact} setC={setContact} errors={showErrors ? contactErrors : {}} chosen={chosen} answers={answers} uploads={uploads.length} edit={go} />}
            </div>

            {/* Navigation – stays in reach at the bottom of the screen on phones */}
            <div className="sticky bottom-0 z-10 border-t bg-white/95 px-5 py-3 backdrop-blur md:px-8">
              {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
              <div className="flex items-center gap-3">
                {step > 0 && <button type="button" onClick={() => go(step - 1)} className="inline-flex h-12 items-center gap-2 rounded-full border px-5 font-semibold text-neutral-700 hover:bg-neutral-50"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></button>}
                {step === 0 && <p className="hidden text-sm text-neutral-500 sm:block">{jobs.length ? `${jobs.length} selected` : "Choose one or more"}</p>}
                {step < STEPS.length - 1
                  ? <button type="button" onClick={next} className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#071a33] px-7 font-bold text-white transition hover:bg-amber-500 hover:text-black sm:flex-none">
                      {step === 0 && jobs.length ? `Continue with ${jobs.length}` : step >= 1 && step <= 4 ? "Next" : "Continue"}<ArrowRight className="h-4 w-4" /></button>
                  : <button type="button" onClick={send} disabled={sending} className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 px-7 font-black text-black transition hover:bg-amber-400 disabled:opacity-60 sm:flex-none">
                      {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <>Send my request<ArrowRight className="h-4 w-4" /></>}</button>}
              </div>
              {step >= 1 && step <= 4 && <p className="mt-2 text-center text-xs text-neutral-500 sm:text-left">Not sure? Leave it blank and press Next.</p>}
            </div>
          </>}
        </div>
      </div>
      {zoom && <Lightbox pic={zoom} close={() => setZoom(null)} />}
    </section>
  );
}

/* ---------------------------------------------------------------- Step 1: jobs */

function PickJobs({ jobs, toggle }: { jobs: string[]; toggle: (id: string) => void }) {
  return (
    <div className="space-y-7">
      <Heading title="What would you like done?" sub="Pick as many as you need – a loft and a bathroom, a kitchen and new windows…" />
      {JOB_GROUPS.map(g => (
        <div key={g}>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">{g}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {JOBS.filter(j => j.group === g).map(j => {
              const on = jobs.includes(j.id), Icon = ICONS[j.icon] ?? House;
              return (
                <button key={j.id} type="button" onClick={() => toggle(j.id)} aria-pressed={on}
                  className={`group relative flex min-h-[7.5rem] flex-col items-start rounded-2xl border-2 p-3.5 text-left transition ${on ? "border-amber-500 bg-amber-50 shadow-sm" : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl transition ${on ? "bg-amber-500 text-black" : "bg-[#071a33]/5 text-[#071a33] group-hover:bg-[#071a33]/10"}`}><Icon className="h-5 w-5" /></span>
                  <span className="mt-2.5 font-bold leading-tight">{j.label}</span>
                  <span className="mt-1 text-xs leading-snug text-neutral-500">{j.hint}</span>
                  <span className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 transition ${on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-300 bg-white"}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Step 2: questions per job */

function Details({ chosen, answers, set, zoom }: { chosen: Job[]; answers: Answers; set: (k: string, v: string | string[]) => void; zoom: (p: Pic) => void }) {
  return (
    <div className="space-y-8">
      <Heading title="A few quick details" sub="Tap the answers that fit. Skip anything you don't know – we'll go through it on the visit." />
      {chosen.map((j, i) => {
        const Icon = ICONS[j.icon] ?? House;
        return (
          <div key={j.id} className={i ? "border-t pt-7" : ""}>
            <h3 className="mb-4 flex items-center gap-2.5 text-lg font-black text-[#071a33]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-black"><Icon className="h-4 w-4" /></span>{j.label}</h3>
            <div className="space-y-6">{j.questions.map(q => <Ask key={q.id} q={q} k={answerKey(j, q)} answers={answers} set={set} zoom={zoom} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Ask({ q, k, answers, set, zoom }: { q: Question; k: string; answers: Answers; set: (k: string, v: string | string[]) => void; zoom: (p: Pic) => void }) {
  const v = answers[k];
  if (q.kind === "text") return <Block label={q.label}><textarea value={typeof v === "string" ? v : ""} onChange={e => set(k, e.target.value)} rows={3} placeholder={q.placeholder} className={input + " h-auto py-3"} /></Block>;
  if (q.kind === "pics") {
    const many = !!q.many, sel = many ? (Array.isArray(v) ? v : []) : v;
    const pick = (l: string) => many ? set(k, toggle(sel as string[], l)) : set(k, sel === l ? "" : l);
    return (
      <Block label={q.label} hint={many ? "Choose any" : q.hint}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {q.options.map(o => {
            const on = many ? (sel as string[]).includes(o.label) : sel === o.label;
            return (
              <div key={o.label} className={`relative overflow-hidden rounded-2xl border-2 bg-white transition ${on ? "border-amber-500 ring-2 ring-amber-200" : "border-neutral-200 hover:border-neutral-400"}`}>
                <button type="button" onClick={() => pick(o.label)} aria-pressed={on} className="block w-full text-left">
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {o.image ? <Image src={o.image} alt={o.label} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" /> : <Art kind={o.art ?? "notsure"} />}
                  </div>
                  <p className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold leading-tight">
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-300"}`}>{on && <Check className="h-3 w-3" />}</span>{o.label}</p>
                </button>
                {o.image && <button type="button" onClick={() => zoom(o)} aria-label={`See ${o.label} bigger`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"><ZoomIn className="h-4 w-4" /></button>}
              </div>
            );
          })}
        </div>
      </Block>
    );
  }
  return <Block label={q.label} hint={q.kind === "many" ? "Choose any" : q.hint}><Chips options={q.options} many={q.kind === "many"} value={v} onChange={x => set(k, x)} /></Block>;
}

/* ---------------------------------------------------------------- Step 3: the home */

function HomeStep({ answers, set, notes, setNotes }: { answers: Answers; set: (k: string, v: string | string[]) => void; notes: string; setNotes: (s: string) => void }) {
  const row = (k: string, label: string, opts: string[], hint?: string) => <Block label={label} hint={hint}><Chips options={opts} value={answers[homeKey(k)]} onChange={v => set(homeKey(k), v)} /></Block>;
  return (
    <div className="space-y-6">
      <Heading title="About your home" sub="This helps us plan access, parking and the right team." />
      {row("type of property", "Type of property", HOME.type)}
      <div className="grid gap-6 md:grid-cols-2">{row("bedrooms", "Bedrooms", HOME.bedrooms)}{row("roughly built", "Roughly when was it built?", HOME.age)}</div>
      {row("living there during the work", "Will you live there during the work?", HOME.living)}
      {row("parking", "Parking for our van & skip", HOME.parking)}
      {row("drawings", "Drawings & planning", HOME.plans)}
      <Block label="Anything else we should know?"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="e.g. we want to open up the kitchen to the garden, there's a leak in the back bedroom, we need it done before September…" className={input + " h-auto py-3"} /></Block>
    </div>
  );
}

/* ---------------------------------------------------------------- Step 4: photos */

function Photos({ uploads, setUploads }: { uploads: Upload[]; setUploads: (f: (u: Upload[]) => Upload[]) => void }) {
  const { startUpload, isUploading } = useUploadThing("estimatorUploader");
  const [err, setErr] = useState("");
  async function add(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = "";
    if (!files.length) return;
    setErr("");
    try {
      const done = await startUpload(files);
      if (!done?.length) throw new Error("The files didn't upload – please try again.");
      const list = done.map(normalizeUploadedFile);
      setUploads(u => [...u, ...list.filter(x => !u.some(y => y.url === x.url))]);
    } catch (x) { setErr(x instanceof Error ? x.message : "Upload failed – please try again."); }
  }
  const isImg = (u: Upload) => u.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|heic)($|\?)/i.test(u.url);
  return (
    <div className="space-y-5">
      <Heading title="Add a few photos (optional)" sub="Photos of the rooms, the outside, any plans or drawings – they help us arrive with the right questions. You can skip this." />
      <label className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${isUploading ? "border-amber-400 bg-amber-50" : "border-neutral-300 bg-neutral-50 hover:border-amber-500 hover:bg-amber-50"}`}>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#071a33] text-white">{isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}</span>
        <span className="mt-3 text-lg font-black">{isUploading ? "Uploading…" : uploads.length ? "Add more photos or files" : "Take or choose photos"}</span>
        <span className="mt-1 text-sm text-neutral-500">Photos, videos, PDFs or drawings</span>
        <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.dwg,.zip" onChange={add} disabled={isUploading} className="sr-only" />
      </label>
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {uploads.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {uploads.map(u => <div key={u.url} className="group relative aspect-square overflow-hidden rounded-xl border bg-neutral-100">
          {isImg(u) ? <Image src={u.url} alt={u.name} fill sizes="160px" unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs font-semibold text-neutral-600">{u.name}</span>}
          <button type="button" onClick={() => setUploads(x => x.filter(y => y.url !== u.url))} aria-label="Remove" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"><X className="h-4 w-4" /></button>
        </div>)}
      </div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Step 5: budget & timing */

function Timing({ answers, set }: { answers: Answers; set: (k: string, v: string | string[]) => void }) {
  return (
    <div className="space-y-6">
      <Heading title="Budget & timing" sub="A rough idea helps us suggest the right options. It stays between us." />
      <Block label="Rough budget"><Chips options={BUDGETS} value={answers["Timing · budget"]} onChange={v => set("Timing · budget", v)} /></Block>
      <Block label="When would you like to start?"><Chips options={STARTS} value={answers["Timing · start"]} onChange={v => set("Timing · start", v)} /></Block>
      <Block label="Best time for the site visit" hint="Choose any"><Chips options={VISIT} many value={answers["Timing · best time for the site visit"]} onChange={v => set("Timing · best time for the site visit", v)} /></Block>
    </div>
  );
}

/* ---------------------------------------------------------------- Step 6: contact + summary */

function ContactStep({ c, setC, errors, chosen, answers, uploads, edit }: { c: Contact; setC: (f: (c: Contact) => Contact) => void; errors: Partial<Record<keyof Contact, string>>; chosen: Job[]; answers: Answers; uploads: number; edit: (s: number) => void }) {
  const f = (k: keyof Contact, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block"><span className="mb-1.5 block text-sm font-bold text-neutral-800">{label}</span>
      <input {...props} value={c[k] as string} onChange={e => setC(x => ({ ...x, [k]: e.target.value }))} className={`${input} ${errors[k] ? "border-red-400 bg-red-50" : ""}`} />
      {errors[k] && <span className="mt-1 block text-xs font-semibold text-red-600">{errors[k]}</span>}</label>
  );
  const answered = (j: Job) => j.questions.filter(q => answers[answerKey(j, q)]).length;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-5">
        <Heading title="Where can we reach you?" sub="We'll call to book your free site visit – usually within one working day." />
        {f("fullName", "Your name", { autoComplete: "name", placeholder: "First and last name" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {f("phone", "Phone", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "07…" })}
          {f("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", placeholder: "you@example.com" })}
        </div>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr_9rem]">
          {f("houseNumber", "House no.", { autoComplete: "address-line1", placeholder: "12" })}
          {f("street", "Street", { autoComplete: "address-line2", placeholder: "Street name" })}
          {f("postcode", "Postcode", { autoComplete: "postal-code", placeholder: "RM11 1AB", style: { textTransform: "uppercase" } })}
        </div>
        <Block label="Best way to contact you">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CONTACT.map(o => { const Icon = o === "Phone" ? Phone : o === "Email" ? Mail : o === "WhatsApp" ? MessageCircle : Clock, on = c.preferredContact === o;
              return <button key={o} type="button" onClick={() => setC(x => ({ ...x, preferredContact: o }))} aria-pressed={on}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold transition ${on ? "border-amber-500 bg-amber-50" : errors.preferredContact ? "border-red-300" : "border-neutral-200 hover:border-neutral-400"}`}><Icon className="h-4 w-4" />{o}</button>; })}
          </div>
          {errors.preferredContact && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.preferredContact}</span>}
        </Block>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-neutral-800">How did you find us? <span className="font-normal text-neutral-400">(optional)</span></span>
          <select value={c.foundUs} onChange={e => setC(x => ({ ...x, foundUs: e.target.value }))} className={input}><option value="">Choose…</option>{FOUND.map(o => <option key={o}>{o}</option>)}</select></label>
        <div className={`space-y-3 rounded-2xl p-4 ${errors.terms ? "bg-red-50 ring-1 ring-red-200" : "bg-neutral-50"}`}>
          <Tick on={c.terms} set={v => setC(x => ({ ...x, terms: v }))}>I agree to the <Link href="/terms" target="_blank" className="underline">terms</Link> and that the details I&apos;ve given are right to the best of my knowledge.</Tick>
          <Tick on={c.contactOk} set={v => setC(x => ({ ...x, contactOk: v }))}>2A Construction can contact me by phone, WhatsApp or email about this estimate.</Tick>
          <Tick on={c.news} set={v => setC(x => ({ ...x, news: v }))}>Optional: send me occasional news and offers from 2A Construction. I can unsubscribe at any time.</Tick>
          {errors.terms && <p className="text-xs font-semibold text-red-600">{errors.terms}</p>}
        </div>
      </div>
      <aside className="h-fit rounded-2xl bg-[#071a33] p-5 text-white lg:sticky lg:top-28">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Your request</p>
        <ul className="mt-3 space-y-2.5 text-sm">
          {chosen.map(j => <li key={j.id} className="flex items-start justify-between gap-2"><span className="font-semibold">{j.label}</span><span className="shrink-0 text-xs text-white/55">{answered(j)}/{j.questions.length} answered</span></li>)}
        </ul>
        <div className="mt-4 space-y-1.5 border-t border-white/15 pt-3 text-xs text-white/70">
          <p>{uploads ? `${uploads} photo${uploads > 1 ? "s" : ""} / files added` : "No photos added"}</p>
          {typeof answers["Timing · budget"] === "string" && <p>Budget: {answers["Timing · budget"]}</p>}
          {typeof answers["Timing · start"] === "string" && <p>Start: {answers["Timing · start"]}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => edit(0)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Change jobs</button>
          <button type="button" onClick={() => edit(1)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Edit answers</button>
          <button type="button" onClick={() => edit(3)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Photos</button>
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- Pieces */

const input = "h-12 w-full rounded-xl border-2 border-neutral-200 bg-white px-3.5 text-base outline-none transition focus:border-amber-500";
const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

function Heading({ title, sub }: { title: string; sub: string }) {
  return <div><h2 className="text-2xl font-black tracking-tight text-[#071a33] md:text-3xl">{title}</h2><p className="mt-1.5 max-w-2xl text-neutral-600">{sub}</p></div>;
}

function Block({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><p className="mb-2.5 font-bold text-neutral-900">{label}{hint && <span className="ml-2 text-xs font-normal text-neutral-500">{hint}</span>}</p>{children}</div>;
}

function Chips({ options, value, onChange, many }: { options: string[]; value: string | string[] | undefined; onChange: (v: string | string[]) => void; many?: boolean }) {
  const sel = many ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = many ? (sel as string[]).includes(o) : sel === o;
        return <button key={o} type="button" aria-pressed={on} onClick={() => onChange(many ? toggle(sel as string[], o) : on ? "" : o)}
          className={`inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"}`}>
          {on && <Check className="h-3.5 w-3.5" />}{o}</button>;
      })}
    </div>
  );
}

function Tick({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-neutral-700">
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} className="sr-only" />
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-300 bg-white"}`}>{on && <Check className="h-4 w-4" />}</span>
      <span>{children}</span>
    </label>
  );
}

function Lightbox({ pic, close }: { pic: Pic; close: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && close(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [close]);
  return (
    <div role="dialog" aria-modal aria-label={pic.label} onClick={close} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-900">{pic.image && <Image src={pic.image} alt={pic.label} fill sizes="(max-width: 900px) 100vw, 900px" className="object-contain" />}</div>
        <p className="mt-3 text-center text-lg font-bold text-white">{pic.label}</p>
        <button type="button" onClick={close} aria-label="Close" className="absolute -top-3 right-0 grid h-10 w-10 -translate-y-full place-items-center rounded-full bg-white text-black sm:-right-3 sm:top-0 sm:translate-y-0"><X className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

/** Simple drawings for options without a good photo. */
function Art({ kind }: { kind: NonNullable<Pic["art"]> }) {
  const sky = "#e8eef6", navy = "#071a33", amber = "#f5b400", brick = "#c8714f", tile = "#5b6472";
  return (
    <svg viewBox="0 0 240 180" className="absolute inset-0 h-full w-full" role="img" aria-hidden>
      <rect width="240" height="180" fill={sky} />
      {kind === "notsure" && <g>
        <circle cx="120" cy="84" r="44" fill="#fff" stroke={navy} strokeWidth="5" />
        <path d="M103 72c0-11 8-18 18-18s18 7 18 16c0 13-15 13-15 25" fill="none" stroke={navy} strokeWidth="7" strokeLinecap="round" />
        <circle cx="124" cy="110" r="5" fill={amber} />
        <text x="120" y="160" textAnchor="middle" fontSize="15" fontWeight="700" fill={navy} fontFamily="system-ui, sans-serif">We&apos;ll advise</text>
      </g>}
      {kind === "lshape" && <g>
        <rect x="30" y="150" width="180" height="10" fill="#9fb3a1" />
        <rect x="40" y="96" width="120" height="56" fill={brick} /><rect x="150" y="112" width="50" height="40" fill={brick} />
        <path d="M34 98 L100 52 L166 98 Z" fill={tile} /><path d="M146 114 L175 90 L204 114 Z" fill={tile} />
        <rect x="96" y="44" width="72" height="34" fill={navy} /><rect x="160" y="70" width="40" height="26" fill={navy} />
        <rect x="104" y="52" width="20" height="18" fill="#bcd3ec" /><rect x="136" y="52" width="20" height="18" fill="#bcd3ec" /><rect x="168" y="76" width="22" height="14" fill="#bcd3ec" />
        <rect x="58" y="112" width="20" height="22" fill="#fff" /><rect x="110" y="112" width="20" height="22" fill="#fff" /><rect x="164" y="122" width="22" height="18" fill="#fff" />
        <rect x="94" y="40" width="108" height="5" fill={amber} />
      </g>}
      {kind === "mansard" && <g>
        <rect x="30" y="150" width="180" height="10" fill="#9fb3a1" />
        <rect x="50" y="92" width="140" height="60" fill={brick} />
        <path d="M46 94 L62 42 H178 L194 94 Z" fill={tile} /><rect x="60" y="38" width="120" height="6" fill={amber} />
        <rect x="80" y="56" width="22" height="26" fill="#bcd3ec" stroke="#fff" strokeWidth="3" /><rect x="138" y="56" width="22" height="26" fill="#bcd3ec" stroke="#fff" strokeWidth="3" />
        <rect x="70" y="108" width="22" height="26" fill="#fff" /><rect x="148" y="108" width="22" height="26" fill="#fff" /><rect x="110" y="112" width="20" height="40" fill={navy} />
      </g>}
      {kind === "epdm" && <g>
        <rect x="30" y="150" width="180" height="10" fill="#9fb3a1" />
        <rect x="40" y="86" width="160" height="66" fill={brick} />
        <path d="M30 72 H210 V86 H30 Z" fill="#26292e" /><path d="M30 72 H210" stroke="#3f444b" strokeWidth="3" />
        <path d="M30 86 H210" stroke={amber} strokeWidth="4" />
        <rect x="90" y="62" width="44" height="12" rx="2" fill="#bcd3ec" stroke="#fff" strokeWidth="2" />
        <path d="M44 74 Q90 70 120 76 T196 74" stroke="#4a4f57" strokeWidth="1.5" fill="none" />
        <rect x="58" y="102" width="34" height="50" fill="#fff" /><rect x="100" y="102" width="34" height="50" fill="#fff" /><rect x="142" y="102" width="34" height="50" fill="#fff" />
        <text x="120" y="40" textAnchor="middle" fontSize="15" fontWeight="700" fill={navy} fontFamily="system-ui, sans-serif">Rubber roof</text>
      </g>}
    </svg>
  );
}

function Success({ emailSent, name }: { emailSent: boolean; name: string }) {
  return (
    <div className="px-6 py-14 text-center md:py-20">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"><Check className="h-10 w-10" /></div>
      <h2 className="mt-6 text-3xl font-black tracking-tight text-[#071a33] md:text-4xl">Thank you{name ? `, ${name}` : ""}!</h2>
      <p className="mx-auto mt-3 max-w-lg text-lg text-neutral-600">We&apos;ve got your request{emailSent ? " and sent you a confirmation email" : ""}. We&apos;ll be in touch – usually within one working day – to book your free site visit.</p>
      <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
        {[["1", "We call you", "To go through your project and book a visit"], ["2", "Site visit", "We measure up and talk through options"], ["3", "Your quote", "A clear, itemised price for the work"]].map(([n, t, d]) =>
          <div key={n} className="rounded-2xl border bg-neutral-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-sm font-black">{n}</span><p className="mt-2 font-bold">{t}</p><p className="text-sm text-neutral-500">{d}</p></div>)}
      </div>
      <Link href="/portfolio/all" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#071a33] px-6 font-bold text-white hover:bg-amber-500 hover:text-black">See our recent projects<ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
