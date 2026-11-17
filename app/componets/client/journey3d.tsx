"use client";
// Shared pieces for the client's 3D "how your build goes" views: the isometric drawing kit,
// stage → phase mapping, and the player (phase picture, "You are here", step rail, play button).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";

/* ------------------------------------------------------------------ Isometric kit (metres → screen) */

export type V3 = [number, number, number];
export const SCALE = 20;
/** Screen position of a 3D point, viewed from the back-right of the house. */
export const proj = (x: number, y: number, z: number): [number, number] => [(x - y) * 0.866 * SCALE, (x + y) * 0.5 * SCALE - z * SCALE];
export const P = (x: number, y: number, z: number) => { const [a, b] = proj(x, y, z); return `${a.toFixed(1)},${b.toFixed(1)}`; };
export const poly = (pts: V3[]) => pts.map(p => P(...p)).join(" ");
export const F = ({ pts, fill, stroke = "#00000022", sw = 0.8, op }: { pts: V3[]; fill: string; stroke?: string; sw?: number; op?: number }) =>
  <polygon points={poly(pts)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
export const L = ({ a, b, c = "#00000055", w = 0.9, dash }: { a: V3; b: V3; c?: string; w?: number; dash?: string }) => {
  const [x1, y1] = proj(...a), [x2, y2] = proj(...b);
  return <line x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke={c} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />;
};
/** viewBox that fits the given 3D points, with a margin. */
export function fitBox(points: V3[], pad = 14): string {
  const xs: number[] = [], ys: number[] = [];
  for (const p of points) { const [a, b] = proj(...p); xs.push(a); ys.push(b); }
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad - 30;
  return `${x0.toFixed(0)} ${y0.toFixed(0)} ${(Math.max(...xs) - x0 + pad).toFixed(0)} ${(Math.max(...ys) - y0 + pad).toFixed(0)}`;
}

export const COL = {
  brick: "#b8664b", brickSide: "#cf7a5c", tileFront: "#6e5951", tileHip: "#7c665c", tileRear: "#4f3e38", ridge: "#3b2e2a",
  timber: "#d9a35b", osb: "#d8b77c", steel: "#a63d2f", steelTop: "#c6563f", block: "#b9bfc8", blockSide: "#cdd2d9",
  felt: "#2a2e35", glass: "#8fb6d9", glassLit: "#ffd27a", frame: "#ffffff", plaster: "#e7b9a3", paint: "#f6f1e8",
  grass: "#a8c98a", grassDark: "#8fb873", soil: "#8a6a4f", soilDark: "#5e4634", concrete: "#a9adb2", screed: "#cfc6b5", patio: "#cfc8bb",
  scaffold: "#7d8794", board: "#a8743d",
};

/* ------------------------------------------------------------------ Phases & progress */

export interface Phase3D { id: number; title: string; short: string; text: string }
type StageLike = { stage: string; label: string; status: string; percent: number };
export type PhaseStatus = "DONE" | "NOW" | "NEXT";

/** Map programme stages to drawing phases. `rules` = [phase, pattern] checked in order; `keep` picks the stages that belong to this build. */
export function journeyProgress(stages: StageLike[], rules: [number, RegExp][], last: number, keep: (s: StageLike) => boolean, jobStatus?: string): { status: PhaseStatus[]; current: number } {
  const mine = stages.filter(keep);
  const by = new Map<number, StageLike[]>();
  for (const s of mine) { const t = `${s.stage} ${s.label}`.toLowerCase(); const hit = rules.find(([, re]) => re.test(t)); if (hit) by.set(hit[0], [...(by.get(hit[0]) ?? []), s]); }
  const status: PhaseStatus[] = Array.from({ length: last + 1 }, () => "NEXT");
  const finished = jobStatus === "COMPLETED" || (mine.length > 0 && mine.every(s => s.status === "DONE"));
  let current = 0;
  for (let p = 1; p <= last; p++) {
    const list = by.get(p); if (!list?.length) continue;
    if (list.every(s => s.status === "DONE")) { status[p] = "DONE"; current = Math.max(current, p); }
    else if (list.some(s => s.status === "DONE" || s.status === "IN_PROGRESS" || s.percent > 0)) { status[p] = "NOW"; current = Math.max(current, p); }
  }
  for (let p = 1; p < current; p++) if (status[p] === "NEXT") status[p] = "DONE";
  status[0] = "DONE";
  if (finished) return { status: status.map(() => "DONE"), current: last };
  if (current === 0 && mine.some(s => s.status !== "NOT_STARTED")) current = 1;
  if (current > 0 && status[current] === "DONE" && current < last) current += 1;
  if (current > 0) status[current] = "NOW";
  return { status, current };
}

/* ------------------------------------------------------------------ Player */

export function Journey3D({ phases, status, current, title, subtitle, render }: {
  phases: Phase3D[]; status: PhaseStatus[]; current: number; title: string; subtitle?: string; render: (phase: number) => ReactNode;
}) {
  const last = phases.length - 1;
  const [phase, setPhase] = useState(current);
  const [playing, setPlaying] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => setPhase(current), [current]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPhase(p => { if (p >= last) { setPlaying(false); return last; } return p + 1; }), 2200);
    return () => clearInterval(t);
  }, [playing, last]);
  useEffect(() => { const box = rail.current, el = box?.querySelector<HTMLElement>(`[data-p="${phase}"]`); if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" }); }, [phase]);
  const ph = phases[phase], st = status[phase];
  const go = (p: number) => { setPlaying(false); setPhase(Math.max(0, Math.min(last, p))); };
  const picture = useMemo(() => render(phase), [render, phase]);
  return (
    <section className="overflow-hidden rounded-3xl border border-[#071a33]/10 bg-white shadow-[0_18px_40px_-34px_rgba(7,26,51,.45)]">
      <style>{`@keyframes j3-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.j3-in{animation:j3-in .55s ease both}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <div><h2 className="text-lg font-semibold text-[#071a33]">{title}</h2><p className="text-xs text-neutral-500">{subtitle ?? "A 3D view of each phase – tap any step to see it."}</p></div>
        <button onClick={() => { if (playing) setPlaying(false); else { if (phase >= last) setPhase(0); setPlaying(true); } }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#071a33] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#f5b400] hover:text-[#071a33]">
          {playing ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Play the build</>}</button>
      </div>
      <div className="relative mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-b from-[#dceaf7] via-[#eef4fa] to-[#f7f5ef] sm:mx-5">
        <div key={phase} className="j3-in">{picture}</div>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#071a33] shadow-sm backdrop-blur">Phase {phase} of {last} · {ph.title}</span>
          {phase === current && <span className="inline-flex items-center gap-1 rounded-full bg-[#f5b400] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#071a33] shadow-sm"><MapPin className="h-3 w-3" />{current === last ? "Completed" : "You are here"}</span>}
          {phase !== current && st === "DONE" && phase > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"><Check className="h-3 w-3" />Done</span>}
          {phase !== current && st === "NEXT" && <span className="rounded-full bg-[#071a33]/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Coming up</span>}
        </div>
        <button onClick={() => go(phase - 1)} disabled={phase === 0} aria-label="Previous phase" className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#071a33] shadow disabled:opacity-0 sm:h-10 sm:w-10"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => go(phase + 1)} disabled={phase === last} aria-label="Next phase" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#071a33] shadow disabled:opacity-0 sm:h-10 sm:w-10"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <p key={`t${phase}`} className="j3-in min-h-[3rem] px-4 pt-3 text-sm leading-relaxed text-neutral-700 sm:px-6">{ph.text}</p>
      <div ref={rail} className="overflow-x-auto px-3 pb-4 pt-2 sm:px-5">
        <ol className="flex min-w-[560px] items-start">
          {phases.map((p, i) => {
            const s = status[i], sel = i === phase, here = i === current;
            return (
              <li key={p.id} data-p={i} className="relative flex flex-1 flex-col items-center">
                {i > 0 && <span aria-hidden className={`absolute right-1/2 top-4 h-0.5 w-full ${s === "DONE" || here ? "bg-emerald-400" : "bg-neutral-200"}`} />}
                <button onClick={() => go(i)} aria-label={p.title} aria-current={sel ? "step" : undefined}
                  className={`relative grid h-8 w-8 place-items-center rounded-full text-xs font-black transition ${here ? "bg-[#f5b400] text-[#071a33]" : s === "DONE" ? "bg-emerald-500 text-white" : "border-2 border-neutral-200 bg-white text-neutral-400"} ${sel ? "scale-110 ring-4 ring-[#071a33]/15" : ""}`}>
                  {here && current < last && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#f5b400]/50" />}
                  <span className="relative">{s === "DONE" && !here ? <Check className="h-4 w-4" /> : i}</span>
                </button>
                <span className={`mt-1.5 text-center text-[10px] font-semibold leading-tight ${sel ? "text-[#071a33]" : "text-neutral-500"}`}>{p.short}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
