// app/components/storefront/ProofBar.tsx
"use client";

import { useMemo } from "react";
import { motion, type Variants, type Transition } from "framer-motion";

type Pillar = {
  title: string;
  blurb?: string;
  icon?: React.ReactNode; // keep it flexible: emoji, SVG, or Icon component
};

const DEFAULT_PILLARS: Pillar[] = [
  { title: "Free Site Visit", blurb: "We assess, measure & advise before quoting.", icon: "📝" },
  { title: "Fixed-Price Quote", blurb: "Transparent scope. No hidden extras.", icon: "📦" },
  { title: "Clear Schedule", blurb: "Agreed start/finish dates & milestones.", icon: "📅" },
  { title: "Clean & Tidy", blurb: "Daily protection and end-of-job clean.", icon: "🧹" },
];

export function ProofBar({
  pillars = DEFAULT_PILLARS,
  bgClass = "bg-zinc-100 dark:bg-zinc-950",
  ringClass = "ring-1 ring-zinc-200/70 dark:ring-white/10",
  accentClass = "bg-amber-400 text-black",
  withIntro = true,
}: {
  pillars?: Pillar[];
  bgClass?: string;
  ringClass?: string;
  accentClass?: string;
  withIntro?: boolean;
}) {
  const container: Variants = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: { staggerChildren: 0.09, delayChildren: 0.05 },
      },
    }),
    []
  );

  const dropBounce: Transition = useMemo(
    () => ({ type: "spring", stiffness: 260, damping: 20, mass: 0.7 }),
    []
  );

  const item: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: -20, scale: 0.98, filter: "blur(2px)" },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: dropBounce,
      },
    }),
    [dropBounce]
  );

  return (
    <section className={`${bgClass} relative py-14`}>
      {/* subtle background accents */}
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

      <div className="relative mx-auto max-w-7xl px-4">
        {withIntro && (
          <div className="mb-8 text-center">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              What you can expect from us
            </h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-300">
              Practical promises we actually keep—no inflated numbers.
            </p>
          </div>
        )}

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
        >
          {pillars.map((p, i) => (
            <motion.div
              key={`${p.title}-${i}`}
              variants={item}
              className={`
                group relative overflow-hidden rounded-2xl
                bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur
                ${ringClass}
                shadow-sm hover:shadow-md transition
                hover:-translate-y-0.5
              `}
            >
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      inline-flex h-8 w-8 items-center justify-center rounded-full
                      ${accentClass} text-sm font-bold
                    `}
                    aria-hidden
                  >
                    {p.icon ?? "✔️"}
                  </span>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {p.title}
                  </h4>
                </div>
                {p.blurb && (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {p.blurb}
                  </p>
                )}
              </div>

              {/* bottom accent bar */}
              <span
                className="
                  pointer-events-none absolute inset-x-0 bottom-0 h-0.5
                  bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500
                  scale-x-0 origin-left transition-transform duration-300
                  group-hover:scale-x-100
                "
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------
   OPTION B: Logo marquee (replace grid above if you prefer)
   - Use for partner logos, suppliers, or accreditation *logos you truly hold*.
   - Keep it honest: only show what you can verify.
--------------------------------
import Image from "next/image";

export function ProofMarquee() {
  const logos = [
    { src: "/logos/dulux.png", alt: "Dulux" },
    { src: "/logos/travisperkins.png", alt: "Travis Perkins" },
    { src: "/logos/howdens.png", alt: "Howdens" },
    { src: "/logos/velux.png", alt: "VELUX" },
  ];
  return (
    <section className="bg-zinc-100 dark:bg-zinc-950 py-10">
      <div className="mx-auto max-w-7xl px-4 overflow-hidden">
        <div className="flex animate-[marquee_28s_linear_infinite] gap-12 opacity-80 hover:opacity-100">
          {logos.concat(logos).map((l, i) => (
            <div key={i} className="relative h-10 w-32 grayscale hover:grayscale-0 transition">
              <Image src={l.src} alt={l.alt} fill className="object-contain" />
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
*/
