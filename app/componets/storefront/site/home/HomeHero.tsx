"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";

export interface HeroProject { id: string; name: string; cover: string; credit: string }

const LINES = ["Extensions.", "Loft conversions.", "Whole-house refits."];

/** Full-screen video hero. The headline is the one orchestrated entrance on the page. */
export function HomeHero({ video, poster, project }: { video: string | null; poster: string; project: HeroProject | null }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [useVideo, setUseVideo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    // The video is large: only load it on bigger screens, when the visitor hasn't asked to save data or reduce motion.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setUseVideo(!!video && window.innerWidth >= 768 && !conn?.saveData && !reduce);
    return () => cancelAnimationFrame(t);
  }, [video]);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) { void v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } };

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#071a33] text-white">
      <Image src={poster} alt="" fill priority sizes="100vw" className="-z-30 object-cover" />
      {useVideo && video && <video ref={ref} className="absolute inset-0 -z-20 h-full w-full object-cover" src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-hidden />}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,26,51,.6)_0%,rgba(7,26,51,.25)_25%,rgba(7,26,51,.45)_55%,rgba(7,26,51,.95)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,26,51,.85)_0%,rgba(7,26,51,.35)_55%,rgba(7,26,51,0)_80%)]" />

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-8 pt-32 sm:px-8 lg:px-10">
        <h1 className="text-[2.35rem] font-extrabold leading-[0.95] [font-stretch:118%] sm:text-7xl lg:text-[5.4rem] [text-shadow:0_2px_30px_rgba(7,26,51,.45)]">
          {LINES.map((l, i) => (
            <span key={l} className="block overflow-hidden pb-1">
              <span className="block transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ transform: ready ? "none" : "translateY(105%)", transitionDelay: `${150 + i * 120}ms` }}>
                {i === LINES.length - 1 ? <span className="text-[#f5b400]">{l}</span> : l}
              </span>
            </span>
          ))}
        </h1>
        <div className={`mt-7 grid grid-cols-1 gap-8 transition-opacity duration-700 [&>*]:min-w-0 lg:grid-cols-12 lg:items-end ${ready ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "700ms" }}>
          <div className="lg:col-span-6">
            <p className="max-w-xl text-lg leading-relaxed text-white/85 md:text-xl">London builders who run the whole job with one team, from the first measurement to the final clean. Free site visit, itemised quotation.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact#enquiry" className="group relative overflow-hidden bg-[#f5b400] px-7 py-4 text-base font-bold text-[#071a33]">
                <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100" />
                <span className="relative">Book a free site visit</span>
              </Link>
              <Link href="/portfolio/all" className="group relative overflow-hidden border-2 border-white/70 px-7 py-4 text-base font-bold text-white">
                <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100" />
                <span className="relative transition-colors duration-300 group-hover:text-[#071a33]">See our work</span>
              </Link>
            </div>
          </div>
          {project && (
            <Link href={`/project/${project.id}`} className="group flex items-center gap-4 self-end border border-white/25 bg-[#071a33]/55 p-3 pr-5 backdrop-blur-md transition-colors hover:bg-white hover:text-[#071a33] lg:col-span-4 lg:col-start-9">
              <span className="relative h-20 w-28 shrink-0 overflow-hidden"><Image src={project.cover} alt="" fill sizes="112px" className="object-cover transition-transform duration-700 group-hover:scale-110" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm opacity-70">Latest project</span>
                <span className="block truncate text-lg font-bold">{project.name}</span>
                <span className="block truncate text-sm opacity-70">{project.credit}</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-white/20 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/certifications#fmb-membership" className="grid h-11 w-24 place-items-center bg-white px-2 transition-transform hover:-translate-y-0.5"><Image src="/images/fmb-logo.png" alt="Federation of Master Builders member" width={80} height={36} className="h-8 w-auto object-contain" /></Link>
            <Link href="/certifications#safecontractor" className="grid h-11 w-24 place-items-center bg-white px-2 transition-transform hover:-translate-y-0.5"><Image src="/images/safe_contractor.png" alt="SafeContractor approved" width={80} height={36} className="h-8 w-auto object-contain" /></Link>
            <a href="https://www.checkatrade.com/trades/2aconstructionltd/reviews" target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold underline-offset-4 hover:underline">Read our reviews on Checkatrade</a>
          </div>
          <div className="flex items-center gap-5">
            {useVideo && <button type="button" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"} className="grid h-10 w-10 place-items-center rounded-full border border-white/40 transition-colors hover:bg-white hover:text-[#071a33]">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>}
            <a href="#home-start" className="group hidden items-center gap-3 text-sm font-semibold sm:flex">Scroll
              <span aria-hidden className="relative h-10 w-[2px] overflow-hidden bg-white/25"><span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_1.8s_ease-in-out_infinite] bg-[#f5b400]" /></span>
            </a>
          </div>
        </div>
      </div>
      <style>{`@keyframes scrollcue{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}`}</style>
    </section>
  );
}
