// app/componets/storefront/AnimatedCategorySelection.tsx
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

type Service = {
  title: string;
  slug: string;
  href: string;
  image: string; // Unsplash URL (portrait, UK style)
  caption?: string;
};

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1]; // ≈ easeOut
const BASE_PARAMS = "q=80&auto=format&fit=crop&w=1200&h=1600"; // portrait crop for full-cover

// UK-leaning (brick/terrace/georgian/modern) portraits
const SERVICES: Service[] = [
  {
    title: "All Projects",
    slug: "all",
    href: "/portfolio/all",
    image: `https://images.unsplash.com/photo-1604605823030-27a58eb74a49?${BASE_PARAMS}`,
    caption: "A mix of our extensions, lofts, roofing & refurbishments.",
  },
  {
    title: "General Projects",
    slug: "general",
    href: "/portfolio/general",
    image: `https://images.unsplash.com/photo-1515263487990-61b07816b324?${BASE_PARAMS}`,
    caption: "Kitchens, bathrooms, reconfiguration & finishes.",
  },
  {
    title: "Refurbishment",
    slug: "refurbishment",
    href: "/portfolio/refurbishment",
    image: `https://images.unsplash.com/photo-1600585154526-990dced4db0d?${BASE_PARAMS}`,
    caption: "Full-home makeovers with zero-snag handovers.",
  },
  {
    title: "Loft Conversions",
    slug: "loft",
    href: "/portfolio/loft",
    image: `https://images.unsplash.com/photo-1523217582562-09d0def993a6?${BASE_PARAMS}`,
    caption: "Dormer, hip-to-gable, mansard & Velux layouts.",
  },
  {
    title: "Extensions",
    slug: "extention", // keeping your current route spelling
    href: "/portfolio/extention",
    image: `https://images.unsplash.com/photo-1596079890744-c7cdbd6dc527?${BASE_PARAMS}`,
    caption: "Open-plan living, RSJs, single & double-storey builds.",
  },
  {
    title: "Roofing",
    slug: "roof",
    href: "/portfolio/roof",
    image: `/images/roof_edmonton.jpg`,
    caption: "Slate, tile, GRP/EPDM, leadwork & gutters.",
  },
];

const containerFade = (reduced: boolean): Variants => ({
  hidden: { opacity: 0, y: reduced ? 0 : 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 16 },
  },
});

const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemFade = (reduced: boolean): Variants => ({
  hidden: { opacity: 0, x: reduced ? 0 : 10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
});

export function AnimatedCategorySelection() {
  const [active, setActive] = useState<Service>(SERVICES[0]);
  const reduced = useReducedMotion();
  const reducedMotion = Boolean(reduced);

  const exploreHref = useMemo(() => active.href, [active]);

  return (
    <motion.section
      className="relative py-20 sm:py-24 lg:py-28"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={containerFade(reducedMotion)}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Browse by category
            </h2>
            <p className="mt-2 text-sm md:text-base text-neutral-600">
              Tap a service to preview recent work, then explore the portfolio.
            </p>
          </div>
          <Link
            href="/portfolio/all"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:border-amber-500 hover:shadow transition"
            aria-label="Browse all projects"
          >
            Browse all projects →
          </Link>
        </div>

        {/* 2-panel layout on desktop; stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-stretch">
          {/* LEFT: full-cover portrait image */}
          <div className="relative w-full h-[70vh] min-h-[480px] rounded-2xl overflow-hidden ring-1 ring-black/5 bg-neutral-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.slug}
                className="absolute inset-0"
                initial={{
                  opacity: 0,
                  scale: reducedMotion ? 1 : 0.98,
                  x: reducedMotion ? 0 : 18,
                }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, x: reducedMotion ? 0 : -18 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                <Image
                  src={active.image}
                  alt={`${active.title} preview`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/30" />
                <motion.div
                  className="absolute bottom-0 left-0 right-0 p-6 md:p-7 text-white"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold">{active.title}</h3>
                      {active.caption && (
                        <p className="mt-1 text-xs sm:text-sm text-white/85">
                          {active.caption}
                        </p>
                      )}
                    </div>
                    <Link
                      href={exploreHref}
                      className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
                    >
                      Explore more →
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: clean list */}
          <motion.ul
            className="rounded-2xl bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur p-6 md:p-7 ring-1 ring-amber-500/20 h-full"
            role="tablist"
            aria-label="Service categories"
            variants={listStagger}
            initial="hidden"
            animate="show"
          >
            {SERVICES.map((s) => {
              const selected = s.slug === active.slug;
              return (
                <motion.li key={s.slug} variants={itemFade(reducedMotion)}>
                  <button
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${s.slug}`}
                    onClick={() => setActive(s)}
                    className={[
                      "w-full text-left rounded-xl px-5 py-5 transition group mb-4 last:mb-0",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                      selected
                        ? "bg-amber-50 ring-1 ring-amber-500/60"
                        : "hover:bg-neutral-50 ring-1 ring-black/5",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-base md:text-lg font-semibold text-neutral-900">
                          {s.title}
                        </div>
                        {s.caption && (
                          <div className="mt-1 text-xs md:text-sm text-neutral-600">
                            {s.caption}
                          </div>
                        )}
                      </div>
                      <span
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                          selected
                            ? "bg-amber-500 text-black"
                            : "bg-black/5 text-neutral-700 group-hover:bg-black/10",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 sm:hidden">
          <Link
            href={exploreHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-400 transition"
          >
            Explore more →
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
