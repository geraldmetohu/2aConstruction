import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Mail, MessageCircle, Phone } from "lucide-react";
import { COMPANY } from "@/app/componets/storefront/site/brand";

/** Shared look for the client area: navy band like the rest of the site, a step tracker and a help card. */

export const firstName = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "";

export function PortalHero({ back, eyebrow, title, lead, right, children }: {
  back?: { href: string; label: string }; eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; right?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#071a33] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#f5b400]/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8 md:pb-14 md:pt-10">
        {back && <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-[#f5b400]"><ArrowLeft className="h-4 w-4" />{back.label}</Link>}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            {eyebrow && <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5b400]"><span aria-hidden className="h-px w-8 bg-[#f5b400]" />{eyebrow}</p>}
            <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-4xl md:text-5xl">{title}</h1>
            {lead && <div className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">{lead}</div>}
          </div>
          {right}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

const STEPS = ["Review your quote", "Choose your finishes", "Accept online", "We book your start"];

/** 1-based step the client is on. */
export function Steps({ current, light = true }: { current: number; light?: boolean }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const n = i + 1, done = n < current, on = n === current;
        return (
          <li key={s} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${on ? "border-[#f5b400] bg-[#f5b400]/10" : light ? "border-white/10" : "border-[#071a33]/10 bg-white"}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : on ? "bg-[#f5b400] text-[#071a33]" : light ? "bg-white/10 text-white/60" : "bg-[#071a33]/5 text-[#071a33]/50"}`}>{done ? <Check className="h-4 w-4" /> : n}</span>
            <span className={`leading-tight ${on ? (light ? "font-semibold text-white" : "font-semibold text-[#071a33]") : light ? "text-white/60" : "text-neutral-500"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function HelpCard({ title = "Questions? Talk to us", note, reference }: { title?: string; note?: string; reference?: string }) {
  const subject = reference ? `?subject=${encodeURIComponent(reference)}` : "";
  return (
    <div className="rounded-2xl border border-[#071a33]/10 bg-white p-5 shadow-[0_20px_50px_-35px_rgba(7,26,51,.45)]">
      <p className="font-semibold text-[#071a33]">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{note ?? "Happy to talk anything through – call, WhatsApp or email and a real person will answer."}</p>
      <div className="mt-4 grid gap-2">
        <a href={COMPANY.phoneHref} className="group flex items-center gap-3 rounded-xl border border-[#071a33]/10 px-3 py-2.5 text-sm font-semibold text-[#071a33] transition-colors hover:border-[#f5b400] hover:bg-[#f5b400]/10"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#071a33] text-[#f5b400]"><Phone className="h-4 w-4" /></span>{COMPANY.phone}</a>
        <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-[#071a33]/10 px-3 py-2.5 text-sm font-semibold text-[#071a33] transition-colors hover:border-[#f5b400] hover:bg-[#f5b400]/10"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#071a33] text-[#f5b400]"><MessageCircle className="h-4 w-4" /></span>WhatsApp us</a>
        <a href={`${COMPANY.emailHref}${subject}`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#071a33]/10 px-3 py-2.5 text-sm font-semibold text-[#071a33] transition-colors hover:border-[#f5b400] hover:bg-[#f5b400]/10"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#071a33] text-[#f5b400]"><Mail className="h-4 w-4" /></span><span className="truncate">{COMPANY.email}</span></a>
      </div>
    </div>
  );
}
