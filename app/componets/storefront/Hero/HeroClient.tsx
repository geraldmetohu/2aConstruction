// app/componets/storefront/Hero/HeroClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils"; // optional helper
import { CanvasStage } from "./CanvasStage";

export type VideoSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  videoUrl: string;
  posterUrl?: string | null;
  ctaText?: string | null;
  ctaHref?: string | null;
  createdAt?: string | Date;
};

export type BannerFallback = {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaHref?: string | null;
  imageString: string;
};

type CanvasPreset = "sparks" | "grid" | "waves";

export function HeroClient({
  videos,
  bannersFallback = [],
  showCanvas = false,
  canvasPreset = "sparks",
}: {
  videos: VideoSlide[];
  bannersFallback?: BannerFallback[];
  showCanvas?: boolean;
  canvasPreset?: CanvasPreset;
}) {
  const hasVideos = videos && videos.length > 0;
  const slides = videos.slice(0, 5);
  if (!hasVideos) {
    return (
      <ImageHeroFallback
        slides={bannersFallback}
        showCanvas={showCanvas}
        canvasPreset={canvasPreset}
      />
    );
  }
  return (
    <VideoHero
      slides={slides}
      showCanvas={showCanvas}
      canvasPreset={canvasPreset}
    />
  );
}

function VideoHero({
  slides,
  showCanvas,
  canvasPreset,
}: {
  slides: VideoSlide[];
  showCanvas?: boolean;
  canvasPreset?: CanvasPreset;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const advanceMs = 7000;

  const next = () => setIdx((p) => (p + 1) % slides.length);
  const prev = () => setIdx((p) => (p - 1 + slides.length) % slides.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setPaused(!e.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, advanceMs);
    return () => clearTimeout(t);
  }, [idx, paused]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const active = slides[idx];
  const fromTop = idx % 2 === 0;
  const nextSrc = slides[(idx + 1) % slides.length]?.videoUrl;

  return (
    <section
      ref={containerRef}
      className="relative h-[100svh] w-full overflow-hidden bg-black"
      aria-label="Featured projects video hero"
    >
      {/* Background videos */}
      {slides.map((s, i) => (
        <video
          key={s.id}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            i === idx ? "opacity-100" : "opacity-0"
          )}
          src={s.videoUrl}
          poster={s.posterUrl || undefined}
          playsInline
          muted
          autoPlay
          loop
          preload={i === idx ? "auto" : i === (idx + 1) % slides.length ? "metadata" : "none"}
        />
      ))}

      {/* ✨ FULLSCREEN CANVAS LAYER (under text, over video) */}
      {showCanvas ? (
        <CanvasStage
          className="absolute inset-0 z-0 pointer-events-none" // keep clicks for buttons
          preset={canvasPreset}
          opacity={0.6} // tweak if needed
        />
      ) : null}

      {/* Scrim for text legibility */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/60 via-black/20 to-black/60" />

      {/* Headline + CTA */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ y: fromTop ? -40 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: fromTop ? 40 : -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="max-w-3xl"
          >
            <h1 className="text-3xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
              {active.title}
            </h1>
            {active.subtitle && (
              <p className="mt-3 text-white/85 text-base md:text-lg">
                {active.subtitle}
              </p>
            )}
            {active.ctaHref && active.ctaText && (
              <div className="mt-6">
                <Link
                  href={active.ctaHref}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 font-semibold text-black shadow-md transition hover:scale-[1.02]"
                >
                  {active.ctaText} <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "pointer-events-auto h-2.5 w-2.5 rounded-full border border-white/60 transition",
                i === idx ? "bg-white" : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => setPaused((p) => !p)}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
        aria-pressed={paused}
      >
        {paused ? "Play" : "Pause"}
      </button>

      {nextSrc ? <link rel="preload" as="video" href={nextSrc} /> : null}
    </section>
  );
}

function ImageHeroFallback({
  slides,
  showCanvas,
  canvasPreset,
}: {
  slides: BannerFallback[];
  showCanvas?: boolean;
  canvasPreset?: "sparks" | "grid" | "waves";
}) {
  if (!slides?.length) return null;
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((p) => (p + 1) % slides.length);
  useEffect(() => {
    const t = setTimeout(next, 5000);
    return () => clearTimeout(t);
  }, [idx]);

  const active = slides[idx];
  return (
    <section className="relative h:[100svh] h-[100svh] w-full overflow-hidden bg-black">
      <img
        src={active.imageString}
        alt={active.title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Canvas over fallback images too */}
      {showCanvas ? (
        <CanvasStage
          className="absolute inset-0 z-0 pointer-events-none"
          preset={canvasPreset}
          opacity={0.6}
        />
      ) : null}

      <div className="absolute inset-0 z-0 bg-black/45" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-6xl font-extrabold text-white">
            {active.title}
          </h1>
          {active.subtitle && <p className="mt-3 text-white/85">{active.subtitle}</p>}
          {active.ctaHref && active.ctaText && (
            <div className="mt-6">
              <Link
                href={active.ctaHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 font-semibold text-black shadow-md"
              >
                {active.ctaText} <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
