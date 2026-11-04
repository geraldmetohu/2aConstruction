"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

export interface Slide { id: string; name: string; cover: string; credit: string }

/** Full-bleed hero that cross-fades between projects with a slow push-in. Pauses on hover and for reduced motion. */
export function FeaturedSlider({ slides, children, interval = 6500 }: { slides: Slide[]; children: ReactNode; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = useCallback((d: number) => setI(x => (x + d + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => go(1), interval);
    return () => clearTimeout(id);
  }, [i, n, paused, go, interval]);
  const cur = slides[i];

  return (
    <section className="relative isolate flex min-h-[86svh] flex-col justify-end overflow-hidden bg-[#071a33] text-white" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <div key={s.id} aria-hidden={k !== i} className="absolute inset-0 -z-20 transition-opacity duration-[1200ms] ease-out" style={{ opacity: k === i ? 1 : 0 }}>
          <Image src={s.cover} alt={k === i ? s.name : ""} fill priority={k === 0} sizes="100vw"
            className={`object-cover transition-transform ease-linear ${k === i ? "scale-[1.08] duration-[8000ms]" : "scale-100 duration-0"}`} />
        </div>
      ))}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,26,51,.65)_0%,rgba(7,26,51,.2)_30%,rgba(7,26,51,.45)_60%,rgba(7,26,51,.94)_100%)]" />

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-8 pt-28 sm:px-8 lg:px-10">
        {children}
        {cur && (
          <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-white/25 pt-5">
            <Link href={cur.id ? `/project/${cur.id}` : "/contact#enquiry"} className="group min-w-0">
              <span className="block text-sm text-white/65">Featured project {i + 1} of {n}</span>
              <span className="mt-1 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                <span className="truncate bg-[linear-gradient(#f5b400,#f5b400)] bg-[length:0%_3px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_3px]">{cur.name}</span>
                <ArrowUpRight className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </span>
              <span className="mt-1 block text-white/65">{cur.credit}</span>
            </Link>
            {n > 1 && (
              <div className="flex items-center gap-3">
                <div className="mr-2 hidden gap-1.5 sm:flex" aria-hidden>
                  {slides.map((s, k) => (
                    <span key={s.id} className="relative h-[3px] w-10 overflow-hidden bg-white/25">
                      <span className={`absolute inset-0 origin-left bg-[#f5b400] ${k === i && !paused ? "animate-[slidefill_linear_forwards]" : ""} ${k < i ? "scale-x-100" : k === i && paused ? "scale-x-100" : "scale-x-0"}`} style={k === i ? { animationDuration: `${interval}ms` } : undefined} />
                    </span>
                  ))}
                </div>
                <button type="button" onClick={() => go(-1)} aria-label="Previous project" className="grid h-12 w-12 place-items-center border-2 border-white/40 transition-colors hover:border-white hover:bg-white hover:text-[#071a33]"><ArrowLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => go(1)} aria-label="Next project" className="grid h-12 w-12 place-items-center border-2 border-white/40 transition-colors hover:border-white hover:bg-white hover:text-[#071a33]"><ArrowRight className="h-5 w-5" /></button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes slidefill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
    </section>
  );
}
