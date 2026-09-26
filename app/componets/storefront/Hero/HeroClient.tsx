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

  // Stores the native aspect ratio of the current video.
  // Default is 16:9 until the browser reads the actual MP4 dimensions.
  const [videoRatio, setVideoRatio] = useState(16 / 9);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  /*
   * Change slide.
   */
  const go = useCallback(
    (n: number) => {
      if (!slides.length) return;

      setIdx((current) => {
        return ((n % slides.length) + slides.length) % slides.length;
      });
    },
    [slides.length]
  );

  /*
   * Next slide.
   */
  const next = useCallback(() => {
    go(idx + 1);
  }, [go, idx]);

  /*
   * Automatically move to the next slide.
   */
  useEffect(() => {
    if (!slides.length) return;

    const duration =
      (slides[idx]?.durationSec ?? 6) * 1000;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      next();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = null;
    };
  }, [idx, slides, next]);

  /*
   * Keyboard navigation.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        next();
      }

      if (e.key === "ArrowLeft") {
        go(idx - 1);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [idx, go, next]);

  /*
   * Mobile swipe navigation.
   */
  useEffect(() => {
    const el = wrapRef.current;

    if (!el) return;

    let startX = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.changedTouches[0]?.clientX ?? 0;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const difference = endX - startX;

      // Swipe right
      if (difference > 40) {
        go(idx - 1);
      }

      // Swipe left
      if (difference < -40) {
        next();
      }
    };

    el.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });

    el.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [idx, go, next]);

  /*
   * Read the native dimensions of the active MP4.
   *
   * Example:
   *
   * 1920 x 1080
   * ratio = 1920 / 1080
   * ratio = 1.777...
   *
   * The container then uses that ratio so the entire
   * video is displayed without cropping.
   */
  const handleVideoMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    const video = event.currentTarget;

    if (
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const ratio =
        video.videoWidth / video.videoHeight;

      setVideoRatio(ratio);
    }
  };

  /*
   * No slides.
   */
  if (!slides.length) {
    return null;
  }

  const active = slides[idx];

  return (
    <section
      ref={wrapRef}
      aria-label="Hero video slideshow"
      className="relative w-full overflow-hidden bg-black"
      style={{
        /*
         * This is the important part.
         *
         * Width = 100%
         * Height = calculated automatically from
         * the actual MP4 dimensions.
         */
        aspectRatio: `${videoRatio}`,
      }}
    >
      {/* =========================================================
          VIDEO
          ========================================================= */}

      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.video
            key={active.id}
            initial={{
              opacity: 0,
              scale: 1,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 1,
            }}
            transition={{
              opacity: {
                duration: 0.6,
                ease: "easeInOut",
              },
            }}
            className="absolute inset-0 h-full w-full object-contain"
            src={active.videoUrl}
            autoPlay
            muted
            playsInline
            loop={false}
            preload="metadata"
            onLoadedMetadata={handleVideoMetadata}
          />
        </AnimatePresence>
      </div>

      {/* =========================================================
          DARK GRADIENT FOR TEXT LEGIBILITY
          ========================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-t
          from-black/50
          via-black/20
          to-transparent
        "
      />

      {/* =========================================================
          TEXT + CTA
          ========================================================= */}

      <div
        className="
          absolute
          inset-x-0
          bottom-0
          p-5
          sm:p-6
          md:p-8
          text-white
        "
      >
        {(active.title || active.subtitle) && (
          <div className="max-w-3xl">
            {active.title && (
              <h2
                className="
                  text-2xl
                  font-bold
                  leading-tight
                  sm:text-3xl
                  md:text-4xl
                "
              >
                {active.title}
              </h2>
            )}

            {active.subtitle && (
              <p
                className="
                  mt-2
                  text-sm
                  opacity-90
                  sm:text-base
                "
              >
                {active.subtitle}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        {active.ctaHref && active.ctaText && (
          <div className="mt-4">
            <Link href={active.ctaHref}>
              <Button size="lg">
                {active.ctaText}
              </Button>
            </Link>
          </div>
        )}

        {/* =======================================================
            SLIDE INDICATORS
            ======================================================= */}

        <div className="mt-5 flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => go(i)}
              className={`
                h-2
                w-6
                rounded-full
                transition
                duration-200
                ${
                  i === idx
                    ? "bg-amber-500"
                    : "bg-white/40 hover:bg-white/70"
                }
              `}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={
                i === idx ? "true" : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}