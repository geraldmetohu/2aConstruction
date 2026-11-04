import Image from "next/image";
import Link from "next/link";
import { FullPhoto } from "./FullPhoto";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
export { Btn, BtnButton, btnClass, type BtnVariant } from "./buttons";

/** Heading style used by the area pages. */
export const display = "font-semibold tracking-[-0.03em]";

/** Small uppercase label with a yellow tick, used above headings. */
export function Eyebrow({ children, tone = "dark", className = "" }: { children: ReactNode; tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${tone === "light" ? "text-white/70" : "text-neutral-500"} ${className}`}>
      <span aria-hidden className="h-px w-8 bg-[#f5b400]" />
      {children}
    </span>
  );
}

type SweepTone = "dark" | "light" | "yellow";
const sweepBase = "group relative inline-flex items-center justify-center gap-4 overflow-hidden border px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b400]";
const sweepTone: Record<SweepTone, { box: string; fill: string; text: string }> = {
  dark: { box: "border-[#071a33] text-[#071a33]", fill: "bg-[#071a33]", text: "group-hover:text-white" },
  light: { box: "border-white text-white", fill: "bg-white", text: "group-hover:text-[#071a33]" },
  yellow: { box: "border-[#f5b400] bg-[#f5b400] text-[#071a33]", fill: "bg-[#071a33]", text: "group-hover:text-white" },
};

/** The site's square button: a colour panel sweeps in from the left on hover. */
export function SweepLink({ href, children, tone = "dark", external, className = "" }: { href: string; children: ReactNode; tone?: SweepTone; external?: boolean; className?: string }) {
  const t = sweepTone[tone];
  const inner = (
    <>
      <span aria-hidden className={`absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 ${t.fill}`} />
      <span className={`relative z-10 transition-colors duration-300 ${t.text}`}>{children}</span>
      <ArrowRight aria-hidden className={`relative z-10 h-4 w-4 transition-all duration-300 group-hover:translate-x-1 ${t.text}`} />
    </>
  );
  const cls = `${sweepBase} ${t.box} ${className}`;
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <Link href={href} className={cls}>{inner}</Link>;
}

/** Text link with an underline that grows on hover. */
export function LineLink({ href, children, light }: { href: string; children: ReactNode; light?: boolean }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 text-sm font-semibold ${light ? "text-white" : "text-[#071a33]"}`}>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">{children}</span>
      <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export interface Crumb { label: string; href?: string }

/** Dark hero used at the top of inner pages. */
/** The curve used between sections on the homepage, as a reusable divider. */
export function Curve({ fill = "#ffffff", className = "" }: { fill?: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1000 120" preserveAspectRatio="none" className={`block h-12 w-full md:h-20 ${className}`}>
      <path d="M0 120 C170 114 350 92 540 62 C720 34 875 12 1000 0 L1000 120 Z" fill={fill} />
    </svg>
  );
}

/** Inner-page hero: navy panel like the homepage sections, the photo shown in full, and the homepage curve underneath. */
export function PageHero({ image, eyebrow, title, accent, lead, crumbs, children, imageAlt = "", aside }: {
  image?: string; eyebrow?: string; title: ReactNode; accent?: ReactNode; lead?: ReactNode; crumbs?: Crumb[]; children?: ReactNode; size?: "sm" | "md" | "lg"; imageAlt?: string; aside?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#071a33] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#f5b400]/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-6 pt-12 sm:px-8 md:pt-16 lg:grid-cols-12 lg:items-center lg:px-10">
        <div className={image || aside ? "lg:col-span-6" : "lg:col-span-9"}>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-7 text-[11px] uppercase tracking-[0.22em] text-white/55">
              <ol className="flex flex-wrap items-center gap-2">
                {crumbs.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="text-white/30">/</span>}
                    {c.href ? <Link href={c.href} className="transition-colors hover:text-[#f5b400]">{c.label}</Link> : <span aria-current="page" className="text-white/90">{c.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {eyebrow && <Eyebrow tone="light">{eyebrow}</Eyebrow>}
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            {title}{accent && <> <span className="text-[#f5b400]">{accent}</span></>}
          </h1>
          {lead && <div className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">{lead}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {aside ? <div className="lg:col-span-6">{aside}</div> : image ? (
          <div className="relative lg:col-span-6">
            <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full border-2 border-[#f5b400]" />
            <div className="relative shadow-[0_30px_60px_-25px_rgba(0,0,0,.6)]">
              <FullPhoto src={image} alt={imageAlt} sizes="(min-width: 1024px) 45vw, 100vw" priority max={1.8} />
            </div>
          </div>
        ) : null}
      </div>
      <Curve className="mt-10" />
    </section>
  );
}

/** Numbered section heading: "01 — The brief". */
export function SectionHead({ number, eyebrow, title, lead, tone = "dark", className = "" }: { number?: string; eyebrow?: string; title: ReactNode; lead?: ReactNode; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        {number && <span className="font-mono text-xs text-[#f5b400]">{number}</span>}
        {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      </div>
      <h2 className={`mt-4 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.025em] md:text-5xl ${light ? "text-white" : "text-[#071a33]"}`}>{title}</h2>
      {lead && <p className={`mt-5 max-w-2xl text-base leading-relaxed md:text-lg ${light ? "text-white/70" : "text-neutral-600"}`}>{lead}</p>}
    </div>
  );
}

/** Closing call-to-action band shared by inner pages. */
export function ClosingCta({ title = "Planning something similar?", lead = "Book a free site visit. We measure up, talk it through and send an itemised quotation with a programme and payment stages.", image = "/images/handover.jpg" }: { title?: string; lead?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#071a33] text-white">
      <Image src={image} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071a33] via-[#071a33]/90 to-[#071a33]/40" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-[-20%] -z-10 h-[140%] w-[34%] rotate-[12deg] bg-[#f5b400]/85 mix-blend-multiply" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:px-10">
        <div>
          <Eyebrow tone="light">Start a project</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-6xl">{title}</h2>
          <p className="mt-6 max-w-xl text-white/75 md:text-lg">{lead}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
          <SweepLink href="/contact#enquiry" tone="yellow">Request a site visit</SweepLink>
          <SweepLink href="/estimator" tone="light">Online estimator</SweepLink>
        </div>
      </div>
    </section>
  );
}
