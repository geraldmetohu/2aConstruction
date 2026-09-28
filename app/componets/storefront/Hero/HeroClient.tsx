
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  ctaText?: string;
  ctaHref?: string;
  durationSec?: number;
};

type HeroClientProps = {
  videos: HeroSlide[];
};

export default function HeroClient({
  videos,
}: HeroClientProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const slides = videos.filter(
    (video) => video.videoUrl
  );

  const active = slides[index] ?? slides[0];

  /*
   * =========================================================
   * NEXT SLIDE
   * =========================================================
   */
  const next = useCallback(() => {
    if (slides.length <= 1) return;

    setDirection(1);

    setIndex((current) => {
      return (current + 1) % slides.length;
    });
  }, [slides.length]);

  /*
   * =========================================================
   * PREVIOUS SLIDE
   * =========================================================
   */
  const previous = useCallback(() => {
    if (slides.length <= 1) return;

    setDirection(-1);

    setIndex((current) => {
      return (
        (current - 1 + slides.length) %
        slides.length
      );
    });
  }, [slides.length]);

  /*
   * =========================================================
   * GO TO SPECIFIC SLIDE
   * =========================================================
   */
  const goToSlide = useCallback(
    (
      nextIndex: number,
      nextDirection?: 1 | -1
    ) => {
      if (!slides.length) return;

      const normalizedIndex =
        (nextIndex + slides.length) %
        slides.length;

      setDirection(
        nextDirection ??
          (normalizedIndex > index ? 1 : -1)
      );

      setIndex(normalizedIndex);
    },
    [index, slides.length]
  );

  /*
   * =========================================================
   * AUTOMATIC SLIDESHOW
   * =========================================================
   */
  useEffect(() => {
    if (
      slides.length <= 1 ||
      isPaused ||
      !active
    ) {
      return;
    }

    const duration =
      Math.max(
        active.durationSec ?? 7,
        3
      ) * 1000;

    const timer = window.setTimeout(() => {
      next();
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    active,
    isPaused,
    next,
    slides.length,
  ]);

  /*
   * =========================================================
   * KEYBOARD NAVIGATION
   * =========================================================
   */
  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "ArrowRight") {
        next();
      }

      if (event.key === "ArrowLeft") {
        previous();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [next, previous]);

  /*
   * =========================================================
   * TOUCH / SWIPE
   * =========================================================
   */
  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    touchStartX.current =
      event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (touchStartX.current === null) {
      return;
    }

    const endX =
      event.changedTouches[0]?.clientX ?? 0;

    const difference =
      touchStartX.current - endX;

    touchStartX.current = null;

    if (Math.abs(difference) < 50) {
      return;
    }

    if (difference > 0) {
      next();
    } else {
      previous();
    }
  };

  /*
   * =========================================================
   * NO SLIDES
   * =========================================================
   */
  if (!slides.length) {
    return null;
  }

  /*
   * =========================================================
   * WHOLE-SLIDE ANIMATION
   *
   * Forward:
   *
   * Current slide  ---> RIGHT
   * New slide       <--- LEFT
   *
   * Backward:
   *
   * Current slide  ---> LEFT
   * New slide       <--- RIGHT
   * =========================================================
   */
  const slideVariants = {
    enter: (slideDirection: 1 | -1) => ({
      x:
        slideDirection === 1
          ? "-100%"
          : "100%",
      opacity: 1,
    }),

    center: {
      x: "0%",
      opacity: 1,
    },

    exit: (slideDirection: 1 | -1) => ({
      x:
        slideDirection === 1
          ? "100%"
          : "-100%",
      opacity: 1,
    }),
  };

  return (
    <section
      className="relative min-h-screen w-full overflow-hidden"
      onMouseEnter={() =>
        setIsPaused(true)
      }
      onMouseLeave={() =>
        setIsPaused(false)
      }
    >
      {/* =====================================================
          PERMANENT HERO BACKGROUND
          ===================================================== */}
      <div className="absolute inset-0">
        <img
          src="/images/hero_background.jpg"
          alt=""
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* =====================================================
          HERO CONTENT
          ===================================================== */}
      <div
        className="relative z-10 flex min-h-screen w-full flex-col items-center px-4 py-24 sm:px-6 lg:px-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* =================================================
            FIXED HERO STAGE

            The important part:

            The stage has a fixed minimum height.

            Therefore different amounts of text do NOT
            change the position of the video.
            ================================================= */}
        <div className="relative w-full max-w-5xl min-h-[780px] sm:min-h-[800px] lg:min-h-[820px]">

          <AnimatePresence
            initial={false}
            custom={direction}
            mode="sync"
          >
            <motion.div
              key={active.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0 flex flex-col items-center justify-start pt-12"
            >
              {/* =================================================
                  VIDEO

                  IMPORTANT:
                  This is deliberately kept almost identical
                  to your original working video.
                  ================================================= */}
              <div className="relative w-full overflow-hidden rounded-sm shadow-2xl">
                <video
                  key={active.videoUrl}
                  src={active.videoUrl}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  className="block h-auto w-full"
                  onEnded={next}
                />
              </div>

              {/* Subtle video edge */}
              <div className="pointer-events-none absolute left-0 right-0 top-12 rounded-sm ring-1 ring-white/20" />

              {/* =================================================
                  TEXT + CTA

                  IMPORTANT:
                  This is part of the SAME animated slide.
                  ================================================= */}
              {(active.title ||
                active.subtitle ||
                active.ctaText) && (
                <div className="mt-7 flex w-full flex-col items-center text-center">
                  {/* TITLE */}
                  {active.title && (
                    <h1
                      className="max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl lg:text-6xl"
                      style={{
                        fontFamily:
                          '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                      }}
                    >
                      {active.title}
                    </h1>
                  )}

                  {/* SUBTITLE */}
                  {active.subtitle && (
                    <p
                      className="mt-3 max-w-2xl text-sm font-light leading-relaxed tracking-wide text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-base md:text-lg"
                      style={{
                        fontFamily:
                          '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                      }}
                    >
                      {active.subtitle}
                    </p>
                  )}

                  {/* CTA */}
                  {active.ctaHref &&
                    active.ctaText && (
                      <a
                        href={active.ctaHref}
                        className="group relative mt-6 inline-flex items-center gap-4 overflow-hidden border border-white/90 px-6 py-3 text-sm font-medium tracking-wide text-white transition-all duration-300 hover:text-black"
                        style={{
                          fontFamily:
                            '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {/* White sweep */}
                        <span className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100" />

                        {/* Text */}
                        <span className="relative z-10">
                          {active.ctaText}
                        </span>

                        {/* Arrow */}
                        <span className="relative z-10 text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </a>
                    )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* =====================================================
            SLIDE INDICATORS
            ===================================================== */}
        {slides.length > 1 && (
          <div className="relative z-30 -mt-2 flex items-center gap-3">
            {slides.map(
              (slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${
                    slideIndex + 1
                  }`}
                  onClick={() =>
                    goToSlide(
                      slideIndex,
                      slideIndex > index
                        ? 1
                        : -1
                    )
                  }
                  className="group relative h-1 overflow-hidden rounded-full bg-white/30 transition-all duration-300"
                >
                  <span
                    className={`block h-full rounded-full bg-white transition-all duration-500 ${
                      slideIndex === index
                        ? "w-10"
                        : "w-4 group-hover:w-6"
                    }`}
                  />
                </button>
              )
            )}
          </div>
        )}

        {/* =====================================================
            SLIDE NUMBER
            ===================================================== */}
        {slides.length > 1 && (
          <div className="relative z-30 mt-3 text-[10px] tracking-[0.3em] text-white/70">
            {String(index + 1).padStart(
              2,
              "0"
            )}{" "}
            /{" "}
            {String(slides.length).padStart(
              2,
              "0"
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          DIAGONAL BOTTOM EDGE
          ===================================================== */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-40 h-16 w-full bg-white sm:h-20 lg:h-24"
        style={{
          clipPath:
            "polygon(0 100%, 100% 0, 100% 100%)",
        }}
      />
    </section>
  );
}
