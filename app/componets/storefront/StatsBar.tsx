// app/components/storefront/InteractiveProof.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Hammer, Clock3, ShieldCheck } from "lucide-react";

type Pillar = { title: string; blurb: string; details?: string; icon?: React.ReactNode };
type Counter = { label: string; value: number; suffix?: string };

const DEFAULT_PILLARS: Pillar[] = [
  {
    title: "Free Site Visit",
    blurb: "We assess, measure & advise before quoting.",
    details:
      "We visit, measure and flag risks early so your quote is accurate and realistic—no mid-job surprises.",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    title: "Fixed-Price Quote",
    blurb: "Transparent scope. No hidden extras.",
    details:
      "Clear inclusions/exclusions and a locked price based on a defined scope and schedule everyone agrees on.",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    title: "Clear Schedule",
    blurb: "Agreed start/finish dates & milestones.",
    details:
      "We align trades, materials and inspections. You get weekly updates and visible milestones.",
    icon: <Clock3 className="h-4 w-4" />,
  },
  {
    title: "Clean & Tidy",
    blurb: "Daily protection and end-of-job clean.",
    details:
      "Floors and walls protected daily. Waste separated. Final deep clean before handover.",
    icon: <Hammer className="h-4 w-4" />,
  },
];

const DEFAULT_COUNTERS: Counter[] = [
  { label: "Projects Delivered", value: 120, suffix: "+" },
  { label: "Avg. Rating", value: 5 },
  { label: "Years Experience", value: 10, suffix: "+" },
  { label: "Snag-Free Handovers", value: 98, suffix: "%" },
];

export function InteractiveProof({
  pillars = DEFAULT_PILLARS,
  counters = DEFAULT_COUNTERS,
  beforeAfter = { before: "/images/refurb.jpg", after: "/images/ext.jpeg" },
}: {
  pillars?: Pillar[];
  counters?: Counter[];
  beforeAfter?: { before: string; after: string };
}) {
  const [tab, setTab] = useState<"why" | "how">("why");
  const [mix, setMix] = useState(50);

  const variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)" },
    }),
    []
  );

  return (
    <section className="relative py-16">
      {/* background accents (unchanged) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
        bg-[radial-gradient(80rem_40rem_at_-10%_-10%,rgba(253,230,138,0.18),transparent_60%)]
        dark:bg-[radial-gradient(80rem_40rem_at_-10%_-10%,rgba(253,230,138,0.12),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]
        bg-[linear-gradient(transparent_31px,rgba(0,0,0,0.12)_32px),linear-gradient(90deg,transparent_31px,rgba(0,0,0,0.12)_32px)]
        bg-[length:32px_32px]"
      />

      <div className="mx-auto max-w-7xl px-4">
        {/* Header + tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider ring-1 ring-black/10 dark:ring-white/10 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 text-black">
              <Sparkles className="h-3.5 w-3.5" /> Homeowner-approved
            </span>
            <h3 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">Why homeowners pick us</h3>
            <p className="mt-1 text-sm text-muted-foreground">Interactive snapshot of how we deliver clean, on-time builds.</p>
          </div>

          <div className="inline-flex rounded-xl border ring-1 ring-black/10 overflow-hidden bg-white/80 backdrop-blur dark:bg-zinc-900/70">
            <Button variant={tab === "why" ? "default" : "ghost"} onClick={() => setTab("why")} className="rounded-none">
              Why Choose Us
            </Button>
            <Button variant={tab === "how" ? "default" : "ghost"} onClick={() => setTab("how")} className="rounded-none">
              How We Work
            </Button>
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {tab === "why" ? (
<motion.div
  key="why"
  initial="hidden"
  animate="show"
  exit="hidden"
  variants={whyVariants}
  transition={{ duration: 0.35, ease: "easeOut" }}
  className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
>
  {pillars.slice(0, 3).map((p, i) => (
    <motion.div key={p.title + i} variants={whyItem}>
      <FlipCard title={p.title} blurb={p.blurb} details={p.details}>
        {p.icon}
      </FlipCard>
    </motion.div>
  ))}



                {/* Counters */}
                <div className="col-span-1 md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {counters.map((c) => (
                    <StatBadge key={c.label} value={c.value} label={c.label} suffix={c.suffix} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="how"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={variants}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Before/After scrubber (unchanged) */}
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/10 bg-neutral-100 dark:bg-neutral-900">
                  <div className="relative aspect-[16/10] w-full">
                    <Image src={beforeAfter.after} alt="After" fill className="object-cover" />
                    <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - mix}% 0 0)` }}>
                      <Image src={beforeAfter.before} alt="Before" fill className="object-cover" />
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 backdrop-blur-sm" style={{ left: `${mix}%` }} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={mix}
                      onChange={(e) => setMix(parseInt(e.target.value))}
                      aria-label="Before after slider"
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[70%] accent-amber-500"
                    />
                  </div>
                  <div className="flex justify-between px-4 py-2 text-xs text-black/80">
                    <span className="rounded bg-white/80 px-2 py-0.5">Before</span>
                    <span className="rounded bg-white/80 px-2 py-0.5">After</span>
                  </div>
                </div>

                {/* Process steps (unchanged) */}
                <ol className="space-y-4">
                  {[
                    { t: "1) Site Visit", d: "Measure, inspect, advise and capture your brief." },
                    { t: "2) Fixed Quote", d: "Detailed scope, inclusions & timeline—no surprises." },
                    { t: "3) Build & Protect", d: "Daily floor/wall protection, tidy site, clear updates." },
                    { t: "4) Clean Handover", d: "Final clean, snag list zeroed, warranties delivered." },
                  ].map((s, i) => (
                    <motion.li
                      key={s.t}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                      className="relative rounded-xl border ring-1 ring-black/10 bg-white/80 dark:bg-zinc-900/70 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-emerald-400 text-black text-xs font-bold shadow ring-1 ring-black/10">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-semibold">{s.t}</div>
                          <div className="text-sm text-muted-foreground">{s.d}</div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust ribbon (unchanged) */}
        <div className="mt-10">
          <div className="relative overflow-hidden rounded-2xl px-5 py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 text-black">
            <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">“We build like it’s our own home.” — 5★ feedback, tidy sites, clean handovers.</p>
              <span className="text-sm/relaxed opacity-85">Fully insured • Building Control compliant • Clear schedule</span>
            </div>
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08]
              bg-[repeating-linear-gradient(45deg,black_0px,black_6px,transparent_6px,transparent_16px)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Flip card (keeps size; back = black bg, amber text, right-centered paragraph) ---------- */
/* ---------- Flip card (fixed: readable swap, same size; back = black bg, amber text, right-centered) ---------- */

export function FlipCard({
  title,
  blurb,
  details,
  children,
}: {
  title: string;
  blurb: string;
  details?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="button"
      aria-pressed={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      className="
        group relative h-full cursor-pointer select-none
        min-h-[240px] sm:min-h-[260px] md:min-h-[280px]
        [perspective:1000px]
      "
    >
      {/* Softer gradient border */}
      <span
        aria-hidden
        className="
          pointer-events-none absolute -inset-[1px] -z-20 rounded-2xl
          opacity-80
          bg-[linear-gradient(135deg,rgba(10,102,194,.45),rgba(43,177,255,.35),rgba(251,191,36,.30))]
        "
      />

      {/* Card surface */}
      <div
        className="
          relative z-0 overflow-hidden rounded-2xl ring-1 ring-neutral-200
          bg-white/85 dark:bg-zinc-900/70 backdrop-blur
          transition-transform duration-300
          [transform-style:preserve-3d]
          group-hover:[transform:rotateX(2.5deg)_rotateY(-2.5deg)_translateY(-2px)]
          group-hover:shadow-[0_10px_28px_rgba(17,24,39,0.12)]
        "
      >
        {/* BG textures (subtle greys) */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div
            className="
              absolute inset-0
              bg-[radial-gradient(40rem_28rem_at_22%_22%,rgba(2,132,199,.14),transparent_60%),
                  radial-gradient(34rem_26rem_at_78%_20%,rgba(56,189,248,.12),transparent_60%),
                  linear-gradient(135deg,rgba(243,244,246,.9),rgba(229,231,235,.9))]
            "
          />
          <div
            className="
              absolute inset-0 mix-blend-multiply opacity-[.06]
              bg-[radial-gradient(circle_at_1px_1px,#111827_1px,transparent_1.5px)]
              [background-size:18px_18px]
            "
          />
        </div>

        {/* Sheen (lighter) */}
        <span
          aria-hidden
          className="
            absolute inset-0 z-0 pointer-events-none
            bg-[linear-gradient(80deg,transparent_45%,rgba(255,255,255,.26)_50%,transparent_55%)]
            translate-x-[-120%]
            group-hover:translate-x-[120%]
            transition-transform duration-[1100ms] ease-out
          "
        />

        {/* CONTENT (centered) */}
        <div className="relative z-20 h-full p-5">
          <AnimatePresence initial={false} mode="popLayout">
            {!open ? (
              <motion.div
                key="front"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="min-h-[180px] grid place-items-center text-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <span
                    className="
                      inline-flex h-10 w-10 items-center justify-center rounded-xl
                      bg-gradient-to-br from-amber-400 to-emerald-400 text-neutral-900
                      shadow ring-1 ring-neutral-300
                    "
                  >
                    {children ?? "✔️"}
                  </span>
                  <h4 className="text-base font-semibold text-neutral-800 dark:text-zinc-100">
                    {title}
                  </h4>
                </div>

                <p className="mt-2 max-w-xs text-sm text-neutral-600 dark:text-zinc-300">
                  {blurb}
                </p>

                <span
                  aria-hidden
                  className="
                    mt-4 block h-[3px] w-10/12 rounded-full mx-auto
                    bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400
                    opacity-80
                  "
                />
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.2 }}
                className="
                  min-h-[180px] rounded-xl p-5
                  bg-[linear-gradient(135deg,#0f172a,#1f2937)]  /* slate tones */
                  text-amber-300 grid place-items-center text-center
                "
              >
                <div className="relative max-w-sm">
                  <span
                    aria-hidden
                    className="
                      absolute inset-0 opacity-[.06]
                      bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_1.5px)]
                      [background-size:14px_14px] rounded-lg
                    "
                  />
                  <div className="relative">
                    <h5 className="text-lg font-bold">{title}</h5>
                    <p className="mt-2 text-sm leading-relaxed text-amber-200/90">
                      {details ??
                        "We’ll show references from nearby jobs and a clear plan: scope, schedule, and protection approach before we start."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Focus ring when open (kept amber) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl transition-shadow ${
          open ? "shadow-[0_0_0_2px_rgba(245,158,11,0.5)]" : ""
        }`}
      />
    </div>
  );
}


/* Optional: handy variants for your wrapping grid */
export const whyVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};
export const whyItem: Variants = {
  hidden: { opacity: 0, y: -18, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 140, damping: 14 },
  },
};



function StatBadge({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border ring-1 ring-black/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur p-4 text-center"
    >
      <div className="text-3xl font-extrabold tracking-tight">
        <AnimatedCount to={value} />
        {suffix ?? ""}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function AnimatedCount({ to }: { to: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      // SSR: show final value during server render to avoid mismatch
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);

  return <span>{n}</span>;
}


/* -------------------------
   OPTION B: Logo marquee (keep for later if needed)
   - Use for partner logos / accreditations you truly hold.
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
