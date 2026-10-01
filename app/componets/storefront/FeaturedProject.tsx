// app/componets/storefront/FeaturedProject.tsx

import { prisma } from "@/app/lib/db";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { ProjectCard, LoadingProjectCart } from "./ProjectCard";
import { GridStagger, ItemFade } from "./GridStagger";

/* ================================================================
   DATA
================================================================ */

async function getFeaturedRows() {
  return prisma.project.findMany({
    where: { status: "published", isFeatured: true },
    select: {
      id: true,
      name: true,
      description: true,
      images: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

/* ================================================================
   BRAND BUTTON
================================================================ */

function BrandButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        inline-flex
        items-center
        gap-4
        overflow-hidden
        border
        border-[#f5b400]
        bg-[#f5b400]
        px-5
        py-3
        text-[10px]
        font-bold
        uppercase
        tracking-[0.16em]
        text-[#24221d]
        transition-colors
        duration-300
        hover:text-white
      "
    >
      <span
        aria-hidden="true"
        className="
          absolute
          inset-0
          origin-left
          scale-x-0
          bg-[#24221d]
          transition-transform
          duration-500
          ease-out
          group-hover:scale-x-100
        "
      />

      <span className="relative z-10 flex items-center gap-4">
        {children}

        <span className="flex h-6 w-6 items-center justify-center border border-[#24221d]/20 transition-colors duration-300 group-hover:border-white/40">
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

/* ================================================================
   BACKGROUND
================================================================ */

function FeaturedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Warm stone base */}
      <div className="absolute inset-0 bg-[#f1eee5]" />

      {/* Fine material grain */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.045]
          [background-image:radial-gradient(#655f50_0.6px,transparent_0.8px)]
          [background-size:6px_6px]
        "
      />

      {/* Architectural grid */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.035]
          [background-image:linear-gradient(to_right,#746d5d_1px,transparent_1px),linear-gradient(to_bottom,#746d5d_1px,transparent_1px)]
          [background-size:80px_80px]
        "
      />

      {/* Soft brand-colour light */}
      <div className="absolute -right-40 top-[-180px] h-[440px] w-[440px] rounded-full bg-[#f5b400]/10 blur-[110px]" />

      {/* Architectural vertical guide */}
      <div className="absolute right-[8%] top-0 hidden h-full w-px bg-[#8c8068]/10 lg:block" />
    </div>
  );
}

/* ================================================================
   FEATURED PROJECT SECTION
================================================================ */

export async function FeaturedProject() {
  const rows = await getFeaturedRows();

  return (
    <section className="relative isolate overflow-hidden bg-[#f1eee5] py-16 text-[#24221d] md:py-24">
      <FeaturedBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-6 border-b border-[#24221d]/15 pb-7 md:mb-10 md:flex-row md:items-end md:pb-9">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-[#b98a00]/30 bg-[#f5b400]/10 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#a77b00]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#8a6800]">
                Selected work
              </span>
            </div>

            <h2 className="text-3xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
              Featured projects
              <br />
              <span className="text-[#24221d]/35">
                built with purpose.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#555147] md:text-base md:leading-7">
              A closer look at our recent extensions, loft conversions
              and refurbishments — thoughtfully planned and carefully delivered.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#777164]">
              Explore our portfolio
            </span>

            <BrandButton href="/portfolio/all">
              View all projects
            </BrandButton>
          </div>
        </div>

        {/* PROJECT GRID */}
        <div className="relative mt-8 md:mt-10">
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
              </div>
            }
          >
            <LoadFeaturedGrid initial={rows} />
          </Suspense>
        </div>

        {/* BOTTOM DETAIL */}
        <div className="mt-10 flex items-center justify-between border-t border-[#24221d]/15 pt-5">
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-[#f5b400]" />

            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#777164]">
              Construction · Renovation · Transformation
            </span>
          </div>

          <span className="hidden text-[9px] font-medium uppercase tracking-[0.18em] text-[#777164] sm:block">
            Featured collection
          </span>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FEATURED GRID
================================================================ */

async function LoadFeaturedGrid({
  initial,
}: {
  initial: Awaited<ReturnType<typeof getFeaturedRows>>;
}) {
  const data = initial ?? (await getFeaturedRows());

  if (!data || data.length === 0) {
    return (
      <div className="relative overflow-hidden border border-[#24221d]/15 bg-[#e9e5da] px-6 py-16 text-center sm:px-10">
        <span className="absolute left-0 top-0 h-8 w-8 border-l border-t border-[#f5b400]" />
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b border-r border-[#f5b400]" />

        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a7400]">
          Portfolio update
        </p>

        <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#24221d]">
          New projects are on the way.
        </h3>

        <p className="mt-2 text-sm text-[#777164]">
          Check back soon to see our latest work.
        </p>
      </div>
    );
  }

  return (
    <GridStagger>
      {data.map((item) => (
        <ItemFade key={item.id}>
          <div className="group relative">
            {/* Offset architectural frame */}
            <div className="pointer-events-none absolute -bottom-2 -right-2 h-full w-full border border-[#b98a00]/25 transition-transform duration-500 group-hover:translate-x-1 group-hover:translate-y-1" />

            {/* Framed project card */}
            <div className="relative z-10 border border-[#24221d]/10 bg-[#e9e5da] p-1.5 shadow-[0_10px_30px_rgba(36,34,29,0.06)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(36,34,29,0.12)]">
              {/* Keep cover variant: displays images[0] */}
              <ProjectCard item={item} variant="cover" />
            </div>
          </div>
        </ItemFade>
      ))}
    </GridStagger>
  );
}