"use client";
import { useActionState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { sendEnquiry, type EnquiryState } from "./actions";

const SERVICES = ["House extension", "Loft conversion", "Refurbishment", "Roofing", "Kitchen", "Bathroom", "General building", "Painting & decorating", "Flooring", "Plumbing & heating", "Electrical", "Something else"];
const BUDGETS = ["Not sure yet", "Under £10k", "£10k – £30k", "£30k – £60k", "£60k – £100k", "£100k – £200k", "£200k+"];
const TIMING = ["As soon as possible", "Within 3 months", "3 – 6 months", "6 – 12 months", "Just planning"];

const field = "w-full border-0 border-b border-[#071a33]/25 bg-transparent px-0 py-3 text-base text-[#071a33] placeholder:text-neutral-400 focus:border-[#f5b400] focus:outline-none focus:ring-0";
const label = "text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500";

function Submit({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending}
      className="group relative inline-flex w-full items-center justify-center gap-4 overflow-hidden border border-[#071a33] bg-[#071a33] px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60 sm:w-auto">
      <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-[#f5b400] transition-transform duration-500 group-hover:scale-x-100" />
      <span className="relative z-10 transition-colors group-hover:text-[#071a33]">{pending ? "Sending…" : "Send enquiry"}</span>
      {pending ? <Loader2 className="relative z-10 h-4 w-4 animate-spin" /> : <ArrowRight className="relative z-10 h-4 w-4 transition-all group-hover:translate-x-1 group-hover:text-[#071a33]" />}
    </button>
  );
}

export function EnquiryForm({ service = "", reference = "" }: { service?: string; reference?: string }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(sendEnquiry, { ok: false, message: "" });
  const err = (k: string) => state.errors?.[k];

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-10">
        <CheckCircle2 className="h-10 w-10 text-[#f5b400]" />
        <p className="text-2xl font-semibold text-[#071a33]">Enquiry sent.</p>
        <p className="max-w-md text-neutral-600">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <input type="hidden" name="reference" value={reference} />
      <F name="name" label="Your name *" err={err("name")}><input id="name" name="name" autoComplete="name" required className={field} placeholder="Full name" /></F>
      <F name="email" label="Email *" err={err("email")}><input id="email" name="email" type="email" autoComplete="email" required className={field} placeholder="you@example.com" /></F>
      <F name="phone" label="Phone" err={err("phone")}><input id="phone" name="phone" type="tel" autoComplete="tel" className={field} placeholder="07…" /></F>
      <F name="postcode" label="Property postcode" err={err("postcode")}><input id="postcode" name="postcode" autoComplete="postal-code" className={`${field} uppercase`} placeholder="e.g. EN2 6AB" /></F>
      <F name="service" label="Type of project" err={err("service")}>
        <select id="service" name="service" defaultValue={service} className={field}><option value="">Choose…</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select>
      </F>
      <F name="budget" label="Rough budget" err={err("budget")}>
        <select id="budget" name="budget" defaultValue="" className={field}><option value="">Choose…</option>{BUDGETS.map(s => <option key={s}>{s}</option>)}</select>
      </F>
      <F name="timing" label="When would you like to start?" err={err("timing")}>
        <select id="timing" name="timing" defaultValue="" className={field}><option value="">Choose…</option>{TIMING.map(s => <option key={s}>{s}</option>)}</select>
      </F>
      <fieldset className="flex flex-col gap-2">
        <legend className={label}>Best way to reach you</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Phone", "Email", "WhatsApp"].map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="contactBy" value={c} defaultChecked={i === 0} className="peer sr-only" />
              <span className="block border border-[#071a33]/20 px-4 py-2 text-sm text-[#071a33] transition-colors peer-checked:border-[#071a33] peer-checked:bg-[#071a33] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#f5b400]">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <F name="message" label="About the project *" err={err("message")}>
          <textarea id="message" name="message" rows={5} required className={`${field} resize-y`}
            defaultValue={reference ? `I'd like something similar to "${reference}".\n\n` : ""}
            placeholder="What would you like done? Include rough sizes, whether you have drawings or planning, and anything else useful." />
        </F>
      </div>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-relaxed text-neutral-500">We only use your details to reply to this enquiry. No mailing lists.</p>
        <Submit pending={pending} />
      </div>
      {state.message && !state.ok && <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-2">{state.message}</p>}
    </form>
  );
}

function F({ name, label: l, err, children }: { name: string; label: string; err?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className={label}>{l}</label>
      {children}
      {err && <span className="mt-1.5 text-xs text-red-700">{err}</span>}
    </div>
  );
}
