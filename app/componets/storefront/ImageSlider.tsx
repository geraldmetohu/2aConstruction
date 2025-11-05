// app/componets/storefront/ImageSlider.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "cover" | "contain-blur";

type Props = {
  images: string[];
  mode?: Mode; // "cover" crops, "contain-blur" shows full image with blurred edges
  heightClass?: string; // optional: override height
};

export function ImageSlider({
  images,
  mode = "contain-blur",
  heightClass = "h-[46vh] sm:h-[52vh] md:h-[58vh] lg:h-[82vh]",
}: Props) {
  const slides = useMemo(
    () => (images && images.length ? images : ["/placeholder.png"]),
    [images]
  );
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (n: number) => setIdx((i) => ((n % slides.length) + slides.length) % slides.length),
    [slides.length]
  );
  const next = useCallback(() => go(idx + 1), [go, idx]);
  const prev = useCallback(() => go(idx - 1), [go, idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let sx = 0;
    const ts = (e: TouchEvent) => (sx = e.changedTouches[0].clientX);
    const te = (e: TouchEvent) => {
      const ex = e.changedTouches[0].clientX;
      if (ex - sx > 40) prev();
      if (sx - ex > 40) next();
    };
    el.addEventListener("touchstart", ts);
    el.addEventListener("touchend", te);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchend", te);
    };
  }, [prev, next]);

  return (
    <div className="w-full">
      {/* Main slide */}
      <div
        ref={wrapRef}
        className={[
          "relative w-full overflow-hidden rounded-2xl",
          "border bg-neutral-100 dark:bg-neutral-900 shadow-sm ring-1 ring-black/[0.06]",
          heightClass,
        ].join(" ")}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slides[idx] + mode}
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Background layer (only for contain-blur) */}
            {mode === "contain-blur" && (
              <Image
                src={slides[idx]}
                alt=""
                fill
                sizes="100vw"
                className="object-cover blur-xl scale-110 opacity-60"
                priority={idx === 0}
              />
            )}

            {/* Foreground image: either cover or contain */}
            <Image
              src={slides[idx]}
              alt={`Project image ${idx + 1}`}
              fill
              sizes="100vw"
              priority={idx === 0}
              className={mode === "cover" ? "object-cover" : "object-contain p-2"}
            />
          </motion.div>
        </AnimatePresence>

        {/* top gradient for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

        {slides.length > 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 md:px-3">
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto hidden md:flex backdrop-blur bg-white/80 hover:bg-white border border-black/10 shadow-sm"
              onClick={prev}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-auto hidden md:flex backdrop-blur bg-white/80 hover:bg-white border border-black/10 shadow-sm"
              onClick={next}
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* dots */}
      {slides.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to image ${i + 1}`}
              className={[
                "h-2.5 w-2.5 rounded-full transition-all",
                i === idx
                  ? "bg-amber-500 ring-2 ring-amber-500/20 scale-110"
                  : "bg-neutral-300 hover:bg-neutral-400",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {/* thumbs */}
      {slides.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
          {slides.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setIdx(i)}
              className={[
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-lg",
                "border ring-1 ring-black/[0.06] bg-white",
                i === idx ? "outline outline-2 outline-amber-500" : "",
              ].join(" ")}
              aria-label={`Select image ${i + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="200px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
