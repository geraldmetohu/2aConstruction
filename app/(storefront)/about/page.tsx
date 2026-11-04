import type { Metadata } from "next";
import Image from "next/image";
import { ClipboardCheck, FileText, HardHat, KeyRound, Ruler, ShieldCheck, Smartphone } from "lucide-react";
import { ClosingCta, Eyebrow, PageHero, SectionHead, SweepLink } from "@/app/componets/storefront/site/ui";
import { Reveal } from "@/app/componets/storefront/site/Reveal";
import { COMPANY } from "@/app/componets/storefront/site/brand";
import { STOCK } from "@/app/componets/storefront/site/stock-photos";

export const metadata: Metadata = {
  title: "About Us",
  description: "2A Construction is a London building company delivering extensions, loft conversions, refurbishments and roofing, with clear itemised quotes, proper paperwork and a 5-year workmanship guarantee.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { n: "01", title: "Straight answers", text: "Itemised quotations that show what you're paying for, a programme with real dates, and payment stages tied to finished work. Nothing vague, no surprises half way through." },
  { n: "02", title: "Built properly", text: "We do the parts you never see as carefully as the parts you do: foundations, steels, fire protection, insulation, flashings and first fix. That's where a building lasts or fails." },
  { n: "03", title: "Respect for the home", text: "Protected floors, dust sheets, a tidy site at the end of every day, and a team that remembers people are living around the work." },
];

const PROCESS = [
  { icon: Ruler, title: "Site visit & survey", text: "We visit, measure every room and talk through what you want, what's possible and what it needs (planning, party walls, Building Control)." },
  { icon: FileText, title: "Itemised quotation", text: "You receive a full quotation with the scope in build order, a programme, a payment schedule, and a clear list of anything you'll be supplying yourself." },
  { icon: ClipboardCheck, title: "Contract & safety pack", text: "Before we start: a written contract, construction phase plan, risk assessments, method statements and COSHH. You get these for every project." },
  { icon: HardHat, title: "The build", text: "A dedicated lead on site, daily check-ins from the team, and staged inspections. You see progress, photos and anything we need from you in your client portal." },
  { icon: Smartphone, title: "Always in the loop", text: "Your project page shows each stage, payments due, products to order and messages, so you never have to chase us for an update." },
  { icon: KeyRound, title: "Handover & guarantee", text: `Snagging done, certificates issued, site cleaned, and a ${COMPANY.guaranteeYears}-year workmanship guarantee in writing.` },
];

const TEAM = [
  { name: "Alex", role: "Director & Project Manager" },
  { name: "Kolin", role: "Site Manager" },
  { name: "Angelo", role: "Architectural Design" },
  { name: "Gerald", role: "Operations" },
];

const FAQ = [
  { q: "How soon can you start?", a: "That depends on the size of the job and whether approvals are needed. Smaller works can often start within a few weeks of accepting the quote. Extensions and lofts are usually booked further ahead, and we'll give you a realistic start date with the quotation." },
  { q: "Do you handle drawings, planning and Building Control?", a: "Yes. We coordinate the architectural drawings, structural calculations, planning or permitted development route and the Building Control inspections, so you deal with one point of contact." },
  { q: "How do payments work?", a: "A deposit to secure the start date, then stage payments as defined pieces of work are completed, and a final payment at handover. Every stage, date and amount is set out in the quotation before you commit." },
  { q: "Who supplies the finishes?", a: "Usually you choose and buy the finishing items, such as tiles, sanitaryware, the kitchen, flooring and light fittings, and we install them. The quotation lists exactly what you'll need and when we need it on site. If you'd rather we supplied them, we'll price that too." },
  { q: "What guarantee do I get?", a: `Every project comes with a written ${COMPANY.guaranteeYears}-year workmanship guarantee, plus the manufacturers' warranties on materials and products.` },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        image={STOCK.aboutHero}
        imageAlt="Builders working on a housing site"
        eyebrow="About 2A Construction"
        title="Builders who plan it properly,"
        accent="and finish it properly."
        lead="We're a London building company specialising in extensions, loft conversions, refurbishments and roofing. One team runs your project from the first measurement to the final clean."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      >
        <div className="flex flex-wrap gap-3">
          <SweepLink href="/contact#enquiry" tone="yellow">Book a site visit</SweepLink>
          <SweepLink href="/portfolio/all" tone="light">See our work</SweepLink>
        </div>
      </PageHero>

      {/* Story */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:px-10">
        <Reveal className="lg:col-span-6">
          <SectionHead number="01" eyebrow="Who we are" title="A small, senior team. Every job run like it's our own house." />
        </Reveal>
        <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-neutral-700 lg:col-span-5 lg:col-start-8">
          <p>2A Construction Ltd was set up to do building work the way homeowners hope it will be done. We give honest prices, keep to the programme and leave a site you'd be happy to walk through.</p>
          <p>We look after the whole job: structure, roofing, plumbing, electrics, plastering, joinery and finishing. We use our own people and a small circle of trusted specialists we know and rely on.</p>
          <p className="text-base text-neutral-500">Registered in England &amp; Wales · Company No. {COMPANY.companyNo} · Fully insured</p>
        </Reveal>
      </section>

      {/* Image band */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_1fr_1fr] md:gap-3">
        {STOCK.aboutBand.map((src, i) => (
          <div key={src} className={`group relative overflow-hidden bg-neutral-200 ${i === 0 ? "col-span-2 aspect-[16/9] md:col-span-1 md:aspect-auto md:h-[520px]" : "aspect-[4/5] md:aspect-auto md:h-[520px]"}`}>
            <Image src={src} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
          </div>
        ))}
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <SectionHead number="02" eyebrow="How we think" title="Three things we won't compromise on." />
        <div className="mt-14 grid gap-px bg-[#071a33]/10 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.n} delay={i * 100} className="group bg-white p-8 md:p-10">
              <div className="relative -mx-8 -mt-8 mb-8 aspect-[4/3] overflow-hidden bg-neutral-200 md:-mx-10 md:-mt-10">
                <Image src={STOCK.principles[i]} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                <span aria-hidden className="absolute bottom-0 left-0 h-1 w-0 bg-[#f5b400] transition-all duration-500 group-hover:w-full" />
              </div>
              <span className="font-mono text-sm text-[#c99400]">{p.n}</span>
              <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-[#071a33]">{p.title}</h3>
              <p className="mt-4 leading-relaxed text-neutral-600">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-[#071a33] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
          <SectionHead tone="light" number="03" eyebrow="Working with us" title="From first visit to handover." lead="This is the same process on every project, whether it's a loft for one family or a full house refurbishment." />
          <ol className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {PROCESS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={(i % 3) * 100} className="border-t border-white/15 pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f5b400]">{String(i + 1).padStart(2, "0")}</span>
                  <s.icon aria-hidden className="h-5 w-5 text-white/50" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-white/70">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Team + accreditations */}
      <section className="mx-auto grid max-w-7xl gap-16 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-7">
          <SectionHead number="04" eyebrow="The team" title="The people you'll deal with." />
          <ul className="mt-12 grid grid-cols-1 gap-px bg-[#071a33]/10 sm:grid-cols-2">
            {TEAM.map(t => (
              <li key={t.name} className="flex items-center gap-5 bg-white p-6">
                <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center bg-[#071a33] text-xl font-semibold text-[#f5b400]">{t.name[0]}</span>
                <div><p className="text-lg font-semibold text-[#071a33]">{t.name}</p><p className="text-sm text-neutral-500">{t.role}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <Eyebrow>Accredited &amp; insured</Eyebrow>
          <div className="mt-8 space-y-8">
            <div className="flex items-center gap-5 border-b border-[#071a33]/10 pb-8">
              <div className="relative h-16 w-28 shrink-0"><Image src="/images/fmb-logo.png" alt="Federation of Master Builders" fill sizes="112px" className="object-contain" /></div>
              <p className="text-sm leading-relaxed text-neutral-600">Member of the Federation of Master Builders.</p>
            </div>
            <div className="flex items-center gap-5 border-b border-[#071a33]/10 pb-8">
              <div className="relative h-16 w-28 shrink-0"><Image src="/images/safe_contractor.png" alt="SafeContractor approved" fill sizes="112px" className="object-contain" /></div>
              <p className="text-sm leading-relaxed text-neutral-600">SafeContractor approved: independently assessed health &amp; safety.</p>
            </div>
            <div className="flex items-center gap-5">
              <span className="grid h-16 w-28 shrink-0 place-items-center bg-[#f6f4ee]"><ShieldCheck aria-hidden className="h-8 w-8 text-[#071a33]" /></span>
              <p className="text-sm leading-relaxed text-neutral-600">Fully insured, with a written {COMPANY.guaranteeYears}-year workmanship guarantee on every project.</p>
            </div>
            <SweepLink href="/certifications">Certificates &amp; policies</SweepLink>
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="border-y border-[#071a33]/10 bg-[#f6f4ee]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Where we work</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base font-medium text-[#071a33]">
            {COMPANY.areas.map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-4">
          <SectionHead number="05" eyebrow="Questions" title="What people usually ask." />
          <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden bg-neutral-200 lg:block">
            <Image src={STOCK.faq} alt="Carpenter cutting timber with a mitre saw" fill sizes="30vw" className="object-cover" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[#f5b400]" />
          </div>
        </div>
        <div className="divide-y divide-[#071a33]/10 border-y border-[#071a33]/10 lg:col-span-7 lg:col-start-6">
          {FAQ.map(f => (
            <details key={f.q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-[#071a33]">
                {f.q}
                <span aria-hidden className="mt-1 grid h-7 w-7 shrink-0 place-items-center border border-[#071a33]/20 text-sm transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-2xl leading-relaxed text-neutral-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <ClosingCta image={STOCK.servicesCta} />
    </>
  );
}
