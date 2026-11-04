import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_META, CATEGORY_ORDER } from "@/app/lib/portfolio/categories";
import { ClosingCta, Eyebrow, LineLink, PageHero, SectionHead, SweepLink } from "@/app/componets/storefront/site/ui";
import { Reveal } from "@/app/componets/storefront/site/Reveal";
import { BuildSequence } from "@/app/componets/storefront/site/BuildSequence";
import { COMPANY } from "@/app/componets/storefront/site/brand";
import { STOCK } from "@/app/componets/storefront/site/stock-photos";

export const metadata: Metadata = {
  title: "Services",
  description: "House extensions, loft conversions, refurbishments, roofing, general building, decorating, flooring, plumbing and electrical work across London.",
  alternates: { canonical: "/services" },
};

const MAIN = CATEGORY_ORDER.slice(0, 5);
const TRADES = CATEGORY_ORDER.slice(5);

const INCLUDED = [
  { t: "Itemised quotation", d: "Every line priced, in build order, with a programme and payment stages." },
  { t: "Health & safety pack", d: "Construction phase plan, risk assessments, method statements and COSHH for your job." },
  { t: "Written contract", d: "Clear terms that protect you and us: scope, changes, payments and timings." },
  { t: "Protection & waste", d: "Floors and furniture protected, skips and waste removal, tidy site every day." },
  { t: "Client portal", d: "Track stages, see site photos, answer questions and see payments due online." },
  { t: `${COMPANY.guaranteeYears}-year guarantee`, d: "Workmanship guaranteed in writing, plus manufacturers' warranties." },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        image={STOCK.servicesHero}
        imageAlt="Modern kitchen with an island"
        eyebrow="Services"
        title="Everything a house needs,"
        accent="under one roof."
        lead="We cover structural work and finishing, so one team takes your project from the foundations to the final coat of paint."
        crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
      >
        <nav aria-label="Jump to a service" className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map(c => (
            <a key={c} href={`#${c}`} className="border border-white/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 transition-colors hover:border-[#f5b400] hover:bg-[#f5b400] hover:text-[#071a33]">{CATEGORY_META[c].short}</a>
          ))}
        </nav>
      </PageHero>

      {/* How a build comes together: scroll-driven section drawing */}
      <section className="border-b border-[#071a33]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <SectionHead eyebrow="How we build" title="How a build comes together" lead="A rear extension with a loft dormer, drawn in section. Keep scrolling and watch it go up, from the survey to the lights coming on." />
        </div>
      </section>
      <BuildSequence />

      {/* Main services: alternating editorial rows */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {MAIN.map((slug, i) => {
          const m = CATEGORY_META[slug];
          const flip = i % 2 === 1;
          return (
            <section key={slug} id={slug} className="scroll-mt-28 grid items-center gap-10 border-b border-[#071a33]/10 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
              <Reveal className={`group relative aspect-[4/3] overflow-hidden bg-neutral-200 lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
                <Image src={STOCK.services[slug] ?? m.image} alt={m.title} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                <span className="absolute bottom-0 left-0 bg-[#071a33] px-4 py-3 font-mono text-sm text-[#f5b400]">{m.number}</span>
              </Reveal>
              <Reveal delay={120} className={`lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
                <Eyebrow>{m.short}</Eyebrow>
                <h2 className="mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.025em] text-[#071a33] md:text-5xl">{m.title}</h2>
                <p className="mt-4 text-lg font-medium text-[#071a33]/80">{m.tagline}</p>
                <p className="mt-4 leading-relaxed text-neutral-600">{m.intro}</p>
                <ul className="mt-6 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {m.typicalScope.map(s => (
                    <li key={s} className="flex items-baseline gap-3 border-b border-[#071a33]/10 py-2.5 text-sm text-neutral-700"><span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] bg-[#f5b400]" />{s}</li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <SweepLink href={`/portfolio/${slug}`}>See {m.short.toLowerCase()}</SweepLink>
                  <LineLink href={`/contact?service=${slug}#enquiry`}>Ask about this</LineLink>
                </div>
              </Reveal>
            </section>
          );
        })}
      </div>

      {/* Trades */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <SectionHead eyebrow="Trades" title="Specialist trades, as part of a project or on their own." />
        <div className="mt-12 grid gap-px bg-[#071a33]/10 sm:grid-cols-2 lg:grid-cols-4">
          {TRADES.map((slug, i) => {
            const m = CATEGORY_META[slug];
            return (
              <Reveal key={slug} delay={i * 80} className="bg-white">
                <Link id={slug} href={`/portfolio/${slug}`} className="group block h-full scroll-mt-28 p-7">
                  <div className="relative -mx-7 -mt-7 mb-6 aspect-[4/3] overflow-hidden bg-neutral-200">
                    <Image src={STOCK.services[slug] ?? m.image} alt={m.title} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                    <span aria-hidden className="absolute bottom-0 left-0 h-1 w-0 bg-[#f5b400] transition-all duration-500 group-hover:w-full" />
                  </div>
                  <span className="font-mono text-xs text-[#c99400]">{m.number}</span>
                  <h3 className="mt-5 text-xl font-semibold text-[#071a33]">{m.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{m.tagline}</p>
                  <ul className="mt-5 space-y-1.5 text-sm text-neutral-500">{m.typicalScope.slice(0, 4).map(s => <li key={s}>— {s}</li>)}</ul>
                  <span className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#071a33]">View work <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span></span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Always included */}
      <section className="bg-[#071a33] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
          <SectionHead tone="light" eyebrow="With every project" title="What's always included." lead="These come as standard, whatever the size of the job." />
          <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((x, i) => (
              <Reveal key={x.t} delay={(i % 3) * 100} className="border-t border-white/15 pt-6">
                <dt className="flex items-baseline gap-3 text-lg font-semibold"><span className="font-mono text-xs text-[#f5b400]">{String(i + 1).padStart(2, "0")}</span>{x.t}</dt>
                <dd className="mt-3 leading-relaxed text-white/70">{x.d}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Estimate */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-6">
          <SectionHead eyebrow="Budgeting" title="Want a ballpark figure first?" lead="Our instant estimator gives you a guide price for common projects in a couple of minutes. We'll confirm the real figure after a site visit." />
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="relative">
            <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full border-2 border-[#f5b400]" />
            <div className="relative aspect-[3/2] overflow-hidden bg-neutral-200">
              <Image src={STOCK.estimate} alt="Builder reviewing drawings on site" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <SweepLink href="/estimator" tone="yellow">Instant estimate</SweepLink>
            <SweepLink href="/contact#enquiry">Book a visit</SweepLink>
          </div>
        </div>
      </section>

      <ClosingCta image={STOCK.servicesCta} />
    </>
  );
}
