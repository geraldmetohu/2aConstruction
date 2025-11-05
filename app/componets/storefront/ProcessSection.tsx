"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

type Step = {
  title: string;
  text: string;
  img: string; // small square image (e.g. /images/site-visit.jpg)
};

export function ProcessLifeline({
  steps,
  label = "How your project flows",
}: {
  steps: Step[];
  label?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start end", "end start"] });
  const lineProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative py-12">
      {/* soft bg flare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
        bg-[radial-gradient(60rem_30rem_at_10%_-10%,rgba(253,230,138,0.16),transparent_60%)]
        dark:bg-[radial-gradient(60rem_30rem_at_10%_-10%,rgba(253,230,138,0.1),transparent_60%)]"
      />

      <div className="mx-auto max-w-7xl px-4">
        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">{label}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A clear, simple path from first visit to clean handover.
        </p>

        {/* Lifeline wrapper */}
        <div ref={wrapRef} className="relative mt-8">
          {/* LINE: vertical on mobile, horizontal on md+ */}
          <div className="relative">
            {/* static track */}
            <div className="md:h-1 md:w-full h-full md:rounded-full md:bg-zinc-200/60 dark:md:bg-white/10 md:relative">
              <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-200/60 dark:bg-white/10" />
              {/* animated fill */}
              <motion.div
                style={{ width: lineProgress }}
                className="hidden md:block h-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400"
              />
              <motion.div
                style={{ height: lineProgress }}
                className="md:hidden absolute left-6 top-0 w-0.5 bg-gradient-to-b from-amber-400 via-amber-500 to-emerald-400"
              />
            </div>

            {/* Steps */}
            <ol className="mt-6 grid md:grid-cols-4 gap-8">
              {steps.map((s, i) => (
                <StepCard key={s.title + i} index={i + 1} step={s} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative grid grid-cols-[2.75rem_1fr] md:grid-cols-1 items-start gap-3"
    >
      {/* node + ring */}
      <div className="relative md:mx-auto">
        <span className="absolute md:static -left-[2.15rem] md:left-0 top-1.5 md:top-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-900/80 shadow ring-1 ring-black/10">
          <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/30" />
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-emerald-400 text-black text-sm font-bold">
            {index}
          </span>
        </span>
      </div>

      {/* card */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-black/10 bg-white/85 dark:bg-zinc-900/70 backdrop-blur">
        {/* small image header */}
        <div className="relative h-28 w-full">
          <Image
            src={step.img}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 768px) 25vw, 90vw"
            priority={index === 1}
          />
          {/* subtle top gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
        </div>

        {/* text */}
        <div className="p-4">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h4>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{step.text}</p>
        </div>

        {/* progress cap (yellow underline on hover) */}
        <div className="h-0.5 w-0 bg-amber-400 transition-all duration-300 group-hover:w-full" />
      </div>
    </motion.li>
  );
}
