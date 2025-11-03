// If this file is server, move this component into a client file:
// app/components/storefront/ServicesOverview.tsx   <-- (note: "components" spelling)
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants, type Transition } from "framer-motion";

export function ServicesOverview() {
  // --- OPTION A: Local images in /public/images (keep this by default) ---
  const cards = [
    {
      href: "/portfolio/extention",
      title: "House Extensions",
      blurb: "Open-plan kitchens, RSJs, single & double-storey builds.",
      src: "/images/ext.jpeg",
    },
    {
      href: "/portfolio/loft",
      title: "Loft Conversions",
      blurb: "Dormer, hip-to-gable, mansard & Velux layouts.",
      src: "/images/loft.jpg",
    },
    {
      href: "/portfolio/refurbishment",
      title: "Refurbishments",
      blurb: "Full reconfiguration, kitchens, bathrooms & finishes.",
      src: "/images/refurb.jpg",
    },
    {
      href: "/portfolio/roof",
      title: "Roofing",
      blurb: "Slate, tile, GRP/EPDM flat roofs, leadwork & gutters.",
      src: "/images/roof_edmonton.jpg",
    },
  ];

  /* // --- OPTION B: Unsplash portraits (uncomment to use) ---
  // Also add images.unsplash.com to next.config.ts remotePatterns.
  const BASE = "q=80&auto=format&fit=crop&w=1600&h=1066";
  const cards = [
    {
      href: "/portfolio/extention",
      title: "House Extensions",
      blurb: "Open-plan kitchens, RSJs, single & double-storey builds.",
      src: `https://images.unsplash.com/photo-1600585154526-990dced4db0d?${BASE}`,
    },
    {
      href: "/portfolio/loft",
      title: "Loft Conversions",
      blurb: "Dormer, hip-to-gable, mansard & Velux layouts.",
      src: `https://images.unsplash.com/photo-1523217582562-09d0def993a6?${BASE}`,
    },
    {
      href: "/portfolio/refurbishment",
      title: "Refurbishments",
      blurb: "Full reconfiguration, kitchens, bathrooms & finishes.",
      src: `https://images.unsplash.com/photo-1596079890744-c7cdbd6dc527?${BASE}`,
    },
    {
      href: "/portfolio/roof",
      title: "Roofing",
      blurb: "Slate, tile, GRP/EPDM flat roofs, leadwork & gutters.",
      src: `https://images.unsplash.com/photo-1597674984903-2ee2f7adb87c?${BASE}`,
    },
  ];
  */

  // SECTION entrance (subtle)
  const springSoft: Transition = { type: "spring", stiffness: 110, damping: 18 };

  // Container variants (controls staggered order)
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.39,
        delayChildren: 0.25,
      },
    },
  };

  // Card "drop with bounce" animation
  const dropBounce: Transition = {
    type: "spring",
    stiffness: 260,
    damping: 20,
    mass: 0.7,
  };

  const item = (i: number): Variants => ({
    hidden: { opacity: 0, y: -28, scale: 0.98, filter: "blur(2px)" },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        ...dropBounce,
      },
    },
  });

  return (
    <section
      className="
        relative py-18 md:py-22 lg:py-24
        bg-zinc-100 dark:bg-zinc-950
      "
    >
      {/* decorative background accents */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(40rem_20rem_at_20%_0%,rgba(253,230,138,0.10),transparent_60%)]
          dark:bg-[radial-gradient(40rem_20rem_at_20%_0%,rgba(253,230,138,0.08),transparent_60%)]
        "
      />
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(30rem_18rem_at_90%_10%,rgba(168,162,158,0.20),transparent_55%)]
          dark:bg-[radial-gradient(30rem_18rem_at_90%_10%,rgba(168,162,158,0.12),transparent_55%)]
        "
      />

      <div className="relative max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={springSoft}
          className="
            text-3xl md:text-5xl font-extrabold tracking-tight
            text-zinc-900 dark:text-zinc-50
          "
        >
          What we do
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="
            mt-3 text-zinc-600 dark:text-zinc-300
            max-w-2xl
          "
        >
          Quality builds, clean finishes, and compliant delivery across London & the Home Counties.
        </motion.p>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="
            mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7
          "
        >
          {cards.map((c, i) => (
            <motion.div key={c.title} variants={item(i)}>
              <Link
                href={c.href}
                className="
                  group relative block overflow-hidden rounded-2xl
                  bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur
                  ring-1 ring-zinc-200/70 dark:ring-white/10
                  shadow-sm hover:shadow-md
                  transition transform
                  hover:-translate-y-0.5
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                "
              >
                {/* gradient frame */}
                <span
                  className="
                    pointer-events-none absolute inset-0 rounded-2xl 
                    ring-1 ring-transparent group-hover:ring-amber-400/40
                    transition
                  "
                />

                <div className="relative h-56 w-full">
                  <Image
                    src={c.src}
                    alt={c.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    className="
                      object-cover object-center
                      transition-transform duration-500
                      group-hover:scale-[1.04]
                    "
                    priority={i < 2}
                  />
                  {/* top label chip */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center rounded-full bg-amber-400/95 text-black text-[11px] font-semibold px-2.5 py-1">
                      {c.title}
                    </span>
                  </div>
                  {/* subtle overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                <div className="p-5">
                  <p className="text-sm md:text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {c.blurb}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Explore
                    </span>
                    <span
                      className="
                        inline-flex h-8 w-8 items-center justify-center rounded-full
                        bg-amber-400 text-black text-sm font-bold
                        transition group-hover:translate-x-0.5
                      "
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                </div>

                {/* bottom accent bar */}
                <span
                  className="
                    absolute inset-x-0 bottom-0 h-0.5
                    bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500
                    scale-x-0 origin-left transition-transform duration-300
                    group-hover:scale-x-100
                  "
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Subtle bottom divider glow */}
        <div className="mt-14 h-px bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent dark:via-white/10" />
      </div>
    </section>
  );
}
