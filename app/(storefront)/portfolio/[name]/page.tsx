import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_META, CATEGORY_ORDER, isCategory, type PortfolioFilter } from "@/app/lib/portfolio/categories";
import { publishedPortfolio } from "@/app/componets/storefront/site/portfolio-data";
import { ProjectTile } from "@/app/componets/storefront/site/ProjectTile";
import { PhotoFan } from "@/app/componets/storefront/site/PhotoFan";
import { ClosingCta, Eyebrow, LineLink, PageHero, SweepLink } from "@/app/componets/storefront/site/ui";

export const dynamic = "force-dynamic";

const ALL = {
  title: "Our work",
  tagline: "Extensions, lofts, refurbishments and roofs we've built across London and the South East. Every photograph is from our own sites.",
};

function parse(raw: string): PortfolioFilter | null {
  const n = (raw ?? "").toLowerCase();
  if (n === "all") return "all";
  if (n === "extension" || n === "extensions") return "extention";
  if (n === "roofing") return "roof";
  return isCategory(n) ? n : null;
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const f = parse((await params).name);
  if (!f) return {};
  const title = f === "all" ? "Portfolio – Our Projects in London" : `${CATEGORY_META[f].title} in London – Portfolio`;
  const description = f === "all" ? ALL.tagline : `${CATEGORY_META[f].tagline} ${CATEGORY_META[f].intro}`;
  return { title, description, alternates: { canonical: `/portfolio/${f}` }, openGraph: { title, description } };
}

export default async function PortfolioPage({ params }: { params: Promise<{ name: string }> }) {
  const filter = parse((await params).name);
  if (!filter) notFound();

  const all = await publishedPortfolio();
  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const items = filter === "all" ? all : all.filter(p => p.category === filter);
  const meta = filter === "all" ? null : CATEGORY_META[filter];
  const photoCount = items.reduce((n, p) => n + p.images.length, 0);
  const withCover = [...items.filter(p => p.featured && p.cover), ...items.filter(p => !p.featured && p.cover)];
  const fan = withCover.slice(0, 3).map(p => ({ id: p.id, name: p.name, cover: p.cover! }));
  const tabs = [{ slug: "all", label: "All projects", n: all.length }, ...CATEGORY_ORDER.filter(c => counts.get(c) || c === filter).map(c => ({ slug: c, label: CATEGORY_META[c].title, n: counts.get(c) ?? 0 }))];

  return (
    <>
      <PageHero
        eyebrow={meta ? "Portfolio" : "Portfolio"}
        title={meta ? meta.title : ALL.title}
        lead={meta ? meta.tagline : ALL.tagline}
        crumbs={[{ label: "Home", href: "/" }, { label: "Portfolio", href: "/portfolio/all" }, ...(meta ? [{ label: meta.short }] : [])]}
        aside={fan.length > 0 ? <PhotoFan items={fan} /> : undefined}
        image={fan.length ? undefined : meta?.image ?? "/images/general.jpg"}
      >
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            { k: items.length === 1 ? "Project" : "Projects", v: items.length },
            { k: "Photographs", v: photoCount },
            ...(meta ? [] : [{ k: "Types of work", v: tabs.length - 1 }]),
          ].map(s => (
            <div key={s.k} className="border-l-2 border-[#f5b400] pl-4">
              <dt className="text-[11px] uppercase tracking-[0.22em] text-white/55">{s.k}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.v}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      {/* Filter */}
      <div className="sticky top-[76px] z-30 border-b border-[#071a33]/10 bg-white/95 backdrop-blur">
        <nav aria-label="Filter projects" className="mx-auto max-w-7xl overflow-x-auto px-5 py-3 sm:px-8 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-max gap-2">
            {tabs.map(t => {
              const on = t.slug === filter;
              return (
                <li key={t.slug}>
                  <Link href={`/portfolio/${t.slug}`} aria-current={on ? "page" : undefined}
                    className={`group relative inline-flex items-center gap-2 overflow-hidden border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${on ? "border-[#071a33] bg-[#071a33] text-white" : "border-[#071a33]/15 text-[#071a33] hover:border-[#071a33]"}`}>
                    {!on && <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-[#f5b400]/25 transition-transform duration-500 group-hover:scale-x-100" />}
                    <span className="relative">{t.label}</span>
                    <span className={`relative text-xs tabular-nums ${on ? "text-[#f5b400]" : "text-[#071a33]/45"}`}>{t.n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {meta && (
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pt-14 sm:px-8 md:pt-20 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-7">
            <Eyebrow>What we do</Eyebrow>
            <p className="mt-5 text-xl leading-relaxed text-[#071a33] md:text-2xl">{meta.intro}</p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Usually included</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {meta.typicalScope.map(s => <li key={s} className="border border-[#071a33]/15 bg-[#f6f7f9] px-3 py-1.5 text-sm text-[#071a33]/80">{s}</li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 md:pt-16 lg:px-10">
        {!items.length ? (
          <div className="border border-dashed border-[#071a33]/25 px-6 py-16 text-center">
            <p className="text-2xl font-semibold text-[#071a33]">No projects published here yet</p>
            <p className="mt-2 text-neutral-600">We&apos;re photographing recent work. In the meantime, have a look at everything else.</p>
            <div className="mt-6"><LineLink href="/portfolio/all">See all projects</LineLink></div>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <p className="text-sm text-neutral-500">{items.length} {items.length === 1 ? "project" : "projects"}. Click any project to see every photo.</p>
              {meta && <SweepLink href={`/contact?service=${filter}#enquiry`}>Ask about {meta.short.toLowerCase()}</SweepLink>}
            </div>
            <div className="columns-1 gap-x-8 md:columns-2 xl:columns-3">
              {items.map(p => <div key={p.id} className="mb-14 break-inside-avoid"><ProjectTile item={p} /></div>)}
            </div>
          </>
        )}
      </section>

      <ClosingCta title={meta ? `Thinking about ${meta.short.toLowerCase()}?` : undefined} />
    </>
  );
}
