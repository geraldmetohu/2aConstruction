import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Quote, Star } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { loadDetail } from "@/app/lib/portfolio/details.server";
import { completedLabel, orderedImages, story, type ProjectDetail } from "@/app/lib/portfolio/details-store";
import { CATEGORY_META, categoryTitle, isCategory } from "@/app/lib/portfolio/categories";
import { publishedPortfolio } from "@/app/componets/storefront/site/portfolio-data";
import { ProjectTile } from "@/app/componets/storefront/site/ProjectTile";
import { ProjectGallery } from "@/app/componets/storefront/site/ProjectGallery";
import { CompareSlider } from "@/app/componets/storefront/site/CompareSlider";
import { ShareProject } from "@/app/componets/storefront/site/ShareProject";
import { ClosingCta, Curve, Eyebrow, LineLink, SweepLink } from "@/app/componets/storefront/site/ui";
import { FullPhoto } from "@/app/componets/storefront/site/FullPhoto";
import { Reveal } from "@/app/componets/storefront/site/Reveal";

export const dynamic = "force-dynamic";

async function getProject(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  return prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, images: true, createdAt: true, category: true, status: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) return {};
  const d = await loadDetail(id);
  const desc = (d?.seoDescription || d?.subtitle || p.description || "").slice(0, 160);
  const cover = orderedImages(p.images, d)[0];
  return {
    title: `${p.name}${d?.location ? `, ${d.location}` : ""}`,
    description: desc,
    robots: p.status === "published" ? undefined : { index: false, follow: false },
    alternates: { canonical: `/project/${p.id}` },
    openGraph: { title: p.name, description: desc, images: cover ? [{ url: cover }] : undefined },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) notFound();
  const d = await loadDetail(p.id);

  const images = orderedImages(p.images, d);
  const cover = images[0] ?? (isCategory(p.category) ? CATEGORY_META[p.category].image : "/images/general.jpg");
  const s = story(p.description, d);
  const catLabel = categoryTitle(p.category);
  const completed = completedLabel(d?.completedOn ?? "", p.createdAt);

  const facts = [
    { k: "Location", v: d?.location },
    { k: "Completed", v: completed },
    { k: "Duration", v: d?.duration },
    { k: "Property", v: d?.propertyType },
    { k: "Area", v: d?.floorArea },
    { k: "Project value", v: d?.showValue ? d?.valueBand : "" },
  ].filter(f => f.v) as { k: string; v: string }[];

  // Photos for the gallery: everything except the cover (shown in the hero) when there are enough.
  const galleryUrls = images; // every photograph, the cover included
  const gallery = galleryUrls.map(url => ({ url, caption: d?.captions?.[url] ?? "" }));

  const list = await publishedPortfolio();
  const others = list.filter(x => x.id !== p.id);
  const at = list.findIndex(x => x.id === p.id);
  const next = at >= 0 && list.length > 1 ? list[(at + 1) % list.length] : others[0];
  const related = [...others.filter(x => x.category === p.category), ...others.filter(x => x.category !== p.category)].filter(x => x.id !== next?.id).slice(0, 3);

  return (
    <article>
      {p.status !== "published" && (
        <div className="bg-[#f5b400] px-5 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#071a33]">Preview – this project is {p.status} and not listed on the website</div>
      )}

      {/* Hero: navy panel like the homepage, the cover photograph shown in full */}
      <header className="relative overflow-hidden bg-[#071a33] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pt-10 sm:px-8 md:pt-14 lg:grid-cols-12 lg:items-center lg:px-10">
          <div className="lg:col-span-5">
            <nav aria-label="Breadcrumb" className="mb-7 text-[11px] uppercase tracking-[0.22em] text-white/55">
              <Link href="/portfolio/all" className="transition-colors hover:text-[#f5b400]">Portfolio</Link>
              <span className="mx-2 text-white/30">/</span>
              <Link href={`/portfolio/${p.category}`} className="transition-colors hover:text-[#f5b400]">{catLabel}</Link>
            </nav>
            <Eyebrow tone="light">{catLabel}{d?.location ? ` · ${d.location}` : ""}</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">{p.name}</h1>
            {d?.subtitle && <p className="mt-6 text-lg leading-relaxed text-white/80">{d.subtitle}</p>}
            {facts.length > 0 && (
              <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-5">
                {facts.map(f => (
                  <div key={f.k} className="border-l-2 border-[#f5b400] pl-4">
                    <dt className="text-[10px] uppercase tracking-[0.22em] text-white/55">{f.k}</dt>
                    <dd className="mt-1 font-semibold">{f.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              {images.length > 1 && <SweepLink href="#photos" tone="yellow">See all {images.length} photos</SweepLink>}
              <SweepLink href={`/contact?project=${encodeURIComponent(p.name)}#enquiry`} tone="light">Start a similar project</SweepLink>
            </div>
          </div>
          <div className="relative lg:col-span-7">
            <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full border-2 border-[#f5b400]" />
            <div className="relative shadow-[0_30px_60px_-25px_rgba(0,0,0,.6)]">
              <FullPhoto src={cover} alt={d?.captions?.[cover] || p.name} sizes="(min-width: 1024px) 55vw, 100vw" priority max={1.9} min={0.7} />
            </div>
          </div>
        </div>
        <Curve className="mt-12" />
      </header>

      {/* Story */}
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        {s.brief.length > 0 && <StoryBlock n="01" label="The brief" paras={s.brief} large />}

        {d && d.scope.length > 0 && (
          <Reveal className="mt-20 grid gap-8 border-t border-[#071a33]/10 pt-10 lg:grid-cols-12">
            <div className="lg:col-span-3"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Scope of works</p></div>
            <ol className="grid gap-x-10 sm:grid-cols-2 lg:col-span-9">
              {d.scope.map((x, i) => (
                <li key={x + i} className="flex items-baseline gap-4 border-b border-[#071a33]/10 py-4 text-[15px] text-neutral-800">
                  <span className="font-mono text-[11px] text-[#c99400]">{String(i + 1).padStart(2, "0")}</span>{x}
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        {s.approach.length > 0 && <div className="mt-20"><StoryBlock n={s.brief.length ? "02" : "01"} label="The work" paras={s.approach} /></div>}


        {(s.outcome.length > 0 || (d && d.highlights.length > 0)) && (
          <Reveal className="mt-20 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <span className="font-mono text-xs text-[#c99400]">{String([s.brief.length, s.approach.length].filter(Boolean).length + 1).padStart(2, "0")}</span>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">The result</p>
            </div>
            <div className="lg:col-span-9">
              {s.outcome.map((t, i) => <p key={i} className="mb-5 max-w-3xl text-lg leading-relaxed text-neutral-700">{t}</p>)}
              {d && d.highlights.length > 0 && (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {d.highlights.map((h, i) => (
                    <li key={h + i} className="flex gap-3 bg-[#f6f4ee] p-5 text-[15px] leading-snug text-[#071a33]">
                      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 bg-[#f5b400]" />{h}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        )}
      </div>

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="bg-[#f6f7f9]">
        <section id="photos" className="scroll-mt-28 mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Photographs</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-[#071a33] md:text-4xl">On site and finished</h2>
            </div>
            <p className="text-sm text-neutral-500">{gallery.length} photographs · tap any photo to enlarge</p>
          </div>
          <ProjectGallery images={gallery} title={p.name} />
        </section>
        </div>
      )}

      {/* Before / after */}
      {d?.beforeImage && d?.afterImage && (
        <section className="bg-[#f6f4ee] py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
            <Eyebrow>Before &amp; after</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-[#071a33] md:text-4xl">Drag to see the change</h2>
            <div className="mt-10"><CompareSlider before={d.beforeImage} after={d.afterImage} label={p.name} /></div>
          </div>
        </section>
      )}

      {d && <Testimonial d={d} />}

      {d && d.materials.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
          <div className="grid gap-6 border-t border-[#071a33]/10 pt-10 lg:grid-cols-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 lg:col-span-3">Materials &amp; finishes</p>
            <ul className="flex flex-wrap gap-2 lg:col-span-9">
              {d.materials.map((m, i) => <li key={m + i} className="border border-[#071a33]/15 px-4 py-2 text-sm text-[#071a33]">{m}</li>)}
            </ul>
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-[#071a33]/10 px-5 py-10 sm:px-8 lg:px-10">
        <div className="flex flex-wrap gap-3">
          <SweepLink href={`/contact?project=${encodeURIComponent(p.name)}#enquiry`} tone="yellow">Start a similar project</SweepLink>
          <SweepLink href={`/portfolio/${p.category}`}>More {catLabel.toLowerCase()}</SweepLink>
        </div>
        <ShareProject title={p.name} />
      </section>

      {next && (
        <Link href={`/project/${next.id}`} className="group relative isolate block overflow-hidden bg-[#071a33] text-white">
          {next.cover && <Image src={next.cover} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-40 transition-all duration-[1200ms] group-hover:scale-[1.03] group-hover:opacity-55" />}
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-16 sm:px-8 md:py-24 lg:px-10">
            <Eyebrow tone="light">Next project</Eyebrow>
            <span className="text-3xl font-semibold tracking-[-0.03em] md:text-6xl">{next.name} <span aria-hidden className="inline-block text-[#f5b400] transition-transform duration-500 group-hover:translate-x-2">→</span></span>
            {next.location && <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">{next.location}</span>}
          </div>
        </Link>
      )}

      {related.length > 1 && (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-24 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#071a33] md:text-3xl">More of our work</h2>
            <LineLink href="/portfolio/all">All projects</LineLink>
          </div>
          <div className="grid items-start gap-10 md:grid-cols-3">
            {related.map((r, i) => <ProjectTile key={r.id} item={r} index={i} aspect="aspect-[4/5]" sizes="(min-width: 768px) 33vw, 100vw" />)}
          </div>
        </section>
      )}

      <ClosingCta image={images[images.length - 1] ?? cover} />
    </article>
  );
}

function StoryBlock({ n, label, paras, large }: { n: string; label: string; paras: string[]; large?: boolean }) {
  return (
    <Reveal className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <span className="font-mono text-xs text-[#c99400]">{n}</span>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{label}</p>
      </div>
      <div className="lg:col-span-9">
        {paras.map((t, i) => (
          <p key={i} className={i === 0 && large
            ? "mb-6 max-w-4xl text-2xl font-medium leading-snug tracking-[-0.015em] text-[#071a33] md:text-[2rem] md:leading-[1.25]"
            : "mb-5 max-w-3xl text-lg leading-relaxed text-neutral-700"}>{t}</p>
        ))}
      </div>
    </Reveal>
  );
}

function Testimonial({ d }: { d: ProjectDetail }) {
  if (!d.testimonial) return null;
  return (
    <section className="bg-[#071a33] text-white">
      <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 md:py-28 lg:px-10">
        <Quote aria-hidden className="h-10 w-10 text-[#f5b400]" />
        <blockquote className="mt-6 text-2xl font-medium leading-snug tracking-[-0.015em] md:text-4xl md:leading-[1.2]">&ldquo;{d.testimonial}&rdquo;</blockquote>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {d.testimonialName && <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70">— {d.testimonialName}</span>}
          {d.testimonialRating && (
            <span className="flex gap-1" aria-label={`${d.testimonialRating} out of 5`}>
              {Array.from({ length: d.testimonialRating }).map((_, i) => <Star key={i} aria-hidden className="h-4 w-4 fill-[#f5b400] text-[#f5b400]" />)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
