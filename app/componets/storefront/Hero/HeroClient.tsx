// app/componets/storefront/Hero/HeroClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type HeroSlide = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  videoUrl: string;
  ctaText?: string | null;
  ctaHref?: string | null;
  durationSec?: number;
};

export function HeroClient({ videos }: { videos: HeroSlide[] }) {
  const slides = useMemo(() => videos ?? [], [videos]);
  const [idx, setIdx] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (n: number) => {
      if (!slides.length) return;
      setIdx((i) => ((n % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => go(idx + 1), [go, idx]);

  // Auto-advance by per-slide duration
  useEffect(() => {
    if (!slides.length) return;
    const ms = (slides[idx]?.durationSec ?? 6) * 1000;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(next, ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [idx, slides, next]);

  // Keyboard support (optional)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, go, next]);

  // Touch swipe
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let sx = 0;
    const ts = (e: TouchEvent) => (sx = e.changedTouches[0].clientX);
    const te = (e: TouchEvent) => {
      const ex = e.changedTouches[0].clientX;
      if (ex - sx > 40) go(idx - 1);
      if (sx - ex > 40) next();
    };
    el.addEventListener("touchstart", ts);
    el.addEventListener("touchend", te);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchend", te);
    };
  }, [idx, go, next]);

  if (!slides.length) return null;

  const active = slides[idx];

  return (
    <section
      ref={wrapRef}
      // Full width, full viewport height; page remains scrollable
      className="relative w-full min-h-[100dvh] bg-black"
      aria-label="Hero video slideshow"
    >
      {/* Cross-fading video */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.video
            key={active.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
            src={active.videoUrl}
            autoPlay
            muted
            playsInline
            loop={false}
          />
        </AnimatePresence>
      </div>

      {/* Legibility scrim */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

      {/* Copy + CTA */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-white">
        {(active.title || active.subtitle) && (
          <div className="max-w-3xl">
            {active.title && (
              <h2 className="text-2xl md:text-4xl font-bold leading-tight">{active.title}</h2>
            )}
            {active.subtitle && (
              <p className="mt-2 text-sm md:text-base opacity-90">{active.subtitle}</p>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          {active.ctaHref && active.ctaText && (
            <Link href={active.ctaHref}>
              <Button size="lg">{active.ctaText}</Button>
            </Link>
          )}
        </div>

        {/* Dots only (active = amber) */}
        <div className="mt-5 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className={`h-2 w-6 rounded-full transition
                ${i === idx ? "bg-amber-500" : "bg-white/40 hover:bg-white/70"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
