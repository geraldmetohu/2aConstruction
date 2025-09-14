"use client";

import { motion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Badge = { label: string; emoji?: string };

const DEFAULT_BADGES: Badge[] = [
  { label: "Fully Insured", emoji: "🏗️" },
  { label: "10-Year Structural Guarantee", emoji: "✅" },
  { label: "Gas Safe & NICEIC Partners", emoji: "🔧" },
  { label: "CHAS / SafeContractor", emoji: "🏆" },
  { label: "4.9/5 Client Rating", emoji: "⭐" },
];

export function TrustBadgesMarquee({
  badges = DEFAULT_BADGES,
  bgClass = "bg-white",
  pillClass = "bg-gray-100 text-gray-900",
  accentClass = "ring-1 ring-black/10",
  baseSpeed = 35, // lower = slower; base seconds for one loop
}: {
  badges?: Badge[];
  bgClass?: string;
  pillClass?: string;
  accentClass?: string;
  baseSpeed?: number;
}) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Duplicate for seamless loop
  const items = useMemo(() => [...badges, ...badges], [badges]);

  // Scroll reactivity — speed up when user scrolls
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll({ container: typeof window !== "undefined" ? undefined : undefined });
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 300, damping: 60, mass: 0.6 });
  // Map scroll velocity to a speed multiplier (1x .. 2.5x)
  const speedMul = useTransform(smooth, [0, 2000], [1, 2.5]);

  // Pause on hover/touch
  const [paused, setPaused] = useState(false);

  // If reduced motion, render static grid
  if (prefersReduced) {
    return (
      <section className={`py-6 border-y ${bgClass}`}>
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {badges.map((b, i) => (
            <div
              key={`${b.label}-${i}`}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full ${pillClass} ${accentClass}`}
            >
              {b.emoji && <span aria-hidden="true">{b.emoji}</span>}
              <span className="text-sm">{b.label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Convert speed multiplier to animation duration (seconds)
  const [duration, setDuration] = useState(baseSpeed);
  useEffect(() => {
    const unsub = speedMul.on("change", (m) => {
      const clamped = Math.max(0.6, Math.min(3, m)); // clamp
      setDuration(baseSpeed / clamped);
    });
    return () => unsub();
  }, [baseSpeed, speedMul]);

  return (
    <section className={`py-6 border-y ${bgClass}`}>
      <div className="mx-auto max-w-7xl px-0 overflow-hidden">
        <div
          ref={ref}
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* Track */}
          <motion.div
            // animate x from 0 to -50% (since we duplicated items) for a perfect loop
            animate={paused ? { x: "0%" } : { x: ["0%", "-50%"] }}
            transition={
              paused
                ? { duration: 0.2 }
                : { duration, ease: "linear", repeat: Infinity, repeatType: "loop" }
            }
            className="flex min-w-[200%] gap-3 px-4"
          >
            {items.map((b, i) => (
              <div
                key={`${b.label}-${i}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${pillClass} ${accentClass} hover:shadow-sm transition-transform hover:-translate-y-0.5`}
              >
                {b.emoji && <span aria-hidden="true">{b.emoji}</span>}
                <span className="text-sm whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
