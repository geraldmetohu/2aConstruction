import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL, areaBySlug, inArea } from "@/app/lib/seo/areas";
import { CATEGORY_META, CATEGORY_ORDER } from "@/app/lib/portfolio/categories";
import { publishedPortfolio } from "@/app/componets/storefront/site/portfolio-data";
import { ProjectTile } from "@/app/componets/storefront/site/ProjectTile";
import { Btn, ClosingCta, PageHero, SectionHead, display } from "@/app/componets/storefront/site/ui";
import { COMPANY } from "@/app/componets/storefront/site/brand";

export const dynamic = "force-dynamic";

const title = (n: string) => `Builders in ${n} – Extensions, Loft Conversions & Refurbishments`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = areaBySlug((await params).slug);
  if (!a) return {};
  const description = `2A Construction builds house extensions, loft conversions, refurbishments and roofs in ${a.name}. FMB member, SafeContractor approved, itemised quotes and a ${COMPANY.guaranteeYears}-year guarantee. Free site visit.`;
  return {
    title: title(a.name), description, alternates: { canonical: `/areas/${a.slug}` },
    openGraph: { title: title(a.name), description, url: `/areas/${a.slug}`, type: "website" },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = areaBySlug((await params).slug);
  if (!a) notFound();
  const all = await publishedPortfolio();
  const local = all.filter(p => p.location && inArea(a, p.location));
  const shown = (local.length ? local : all).slice(0, 6);
  const faqs = [
    { q: `Do you cover all of ${a.name}?`, a: `Yes. We work right across ${a.name}${a.postcodes ? ` (${a.postcodes})` : ""} and the neighbouring areas, with free site visits.` },
    { q: `Do I need planning permission for an extension or loft in ${a.name}?`, a: a.planning + " We handle drawings, applications and Building Control for you." },
    { q: "How do your quotes and payments work?", a: "You get an itemised quotation with a programme and payment stages tied to finished work: a deposit, stage payments and a final payment at handover." },
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", "@id": `${SITE_URL}/#business`, name: "2A Construction", url: SITE_URL,
      telephone: COMPANY.phone, email: COMPANY.email, areaServed: { "@type": a.kind === "county" ? "AdministrativeArea" : "Place", name: a.name },
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Areas we cover", item: `${SITE_URL}/areas` },
      { "@type": "ListItem", position: 3, name: a.name, item: `${SITE_URL}/areas/${a.slug}` },
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div>
      <PageHero
        image={shown[0]?.cover ?? "/images/ext.jpeg"}
        title={`Builders in ${a.name}`}
        lead={`House extensions, loft conversions, refurbishments and roofing in ${a.name}, from the first measurement to the final clean.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Areas", href: "/areas" }, { label: a.name }]}
      >
        <div className="flex flex-wrap gap-3">
          <Btn href="/contact#quote">Request a free quote</Btn>
          <Btn href={COMPANY.phoneHref} variant="light">Call {COMPANY.phone}</Btn>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-7">
          <h2 className={`${display} text-3xl text-[#071a33] md:text-4xl`}>Building in {a.name}</h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-[#071a33]/80">
            <p>{a.homes}</p>
            <p>{a.projects}</p>
            <p>{a.planning}</p>
          </div>
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <h2 className="text-lg font-bold text-[#071a33]">What we do in {a.name}</h2>
          <ul className="mt-4 divide-y divide-[#071a33]/10 border-y border-[#071a33]/10">
            {CATEGORY_ORDER.slice(0, 5).map(c => (
              <li key={c}><Link href={`/portfolio/${c}`} className="group flex items-center justify-between py-3 font-semibold text-[#071a33]">{CATEGORY_META[c].title}<span aria-hidden className="transition-transform group-hover:translate-x-1">→</span></Link></li>
            ))}
          </ul>
        </aside>
      </section>

      {shown.length > 0 && (
        <section className="bg-[#eef1f4]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <SectionHead title={local.length ? `Our work in ${a.name}` : "Recent projects"} lead={local.length ? undefined : `A selection of recent projects from across London and the South East.`} />
            <div className="mt-12 grid items-start gap-10 md:grid-cols-3">{shown.map(p => <ProjectTile key={p.id} item={p} sizes="(min-width: 768px) 33vw, 100vw" />)}</div>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-4"><SectionHead title="Questions" /></div>
        <div className="divide-y divide-[#071a33]/10 border-y border-[#071a33]/10 lg:col-span-7 lg:col-start-6">
          {faqs.map(f => (
            <details key={f.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-[#071a33]">{f.q}<span aria-hidden className="mt-1 text-xl transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-[#071a33]/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {a.nearby.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
          <h2 className="text-lg font-bold text-[#071a33]">Nearby areas</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {a.nearby.map(s => { const n = areaBySlug(s); return n ? <li key={s}><Link href={`/areas/${s}`} className="inline-block border-2 border-[#071a33]/15 px-4 py-2 font-semibold text-[#071a33] transition-colors hover:border-[#071a33] hover:bg-[#071a33] hover:text-white">{n.name}</Link></li> : null; })}
          </ul>
        </section>
      )}

      <ClosingCta title={`Planning a project in ${a.name}?`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
