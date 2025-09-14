"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Stat = { k: string; v: number; suffix?: string };

const DEFAULT_STATS: Stat[] = [
  { k: "Projects Completed", v: 240 },
  { k: "Years Experience", v: 12 },
  { k: "Avg. Review", v: 4.9, suffix: "/5" },
  { k: "Cities Covered", v: 18 },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function StatsBar({
  stats = DEFAULT_STATS,
  accentClass = "text-primary",           // ← change accent colour here
  bgClass = "bg-gradient-to-r from-gray-50 to-white",
  durationMs = 1200,                      // ← animation duration
}: {
  stats?: Stat[];
  accentClass?: string;
  bgClass?: string;
  durationMs?: number;
}) {
  const [vals, setVals] = useState<number[]>(stats.map(() => 0));
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    []
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If reduced motion, jump straight to values when visible
    if (prefersReduced) {
      setVals(stats.map((s) => s.v));
      setStarted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            setStarted(true);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReduced, started, stats]);

  useEffect(() => {
    if (!started || prefersReduced) return;

    const start = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = easeOutCubic(p);

      setVals(stats.map((s) => {
        // keep 1 decimal for values that have decimals; integers stay integers
        const next = s.v * eased;
        return Number.isInteger(s.v) ? Math.round(next) : Math.round(next * 10) / 10;
      }));

      if (p < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        setVals(stats.map((s) => s.v)); // ensure exact final values
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, durationMs, prefersReduced, stats]);

  return (
    <section className={`${bgClass} py-14`}>
      <div ref={ref} className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <div key={s.k} className="relative">
            <div className={`text-4xl font-extrabold tracking-tight ${accentClass}`}>
              {vals[i]}
              {s.suffix ?? ""}
            </div>
            <div className="text-sm text-gray-600 mt-2">{s.k}</div>
            {/* subtle accent underline */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-current opacity-15" />
          </div>
        ))}
      </div>
    </section>
  );
}
