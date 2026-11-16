"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";

/* ------------------------------------------------------------------ Phases */

export interface LoftPhase { id: number; title: string; short: string; text: string }
export const LOFT_PHASES: LoftPhase[] = [
  { id: 0, title: "Your home today", short: "Today", text: "The house as it is now: a hipped roof with an unused loft space." },
  { id: 1, title: "Scaffold & protection", short: "Scaffold", text: "Scaffold goes up at the back and side, with a skip on site. The roof and your home are protected before anything is opened." },
  { id: 2, title: "Steels & new floor", short: "Steels", text: "The back of the roof is opened. Steel beams go in to the engineer's design and the new loft floor is built on them." },
  { id: 3, title: "Gable & dormer frame", short: "Frame", text: "The sloping side (hip) is replaced by a straight gable wall, and the timber frame of the rear dormer is built." },
  { id: 4, title: "Roof on & watertight", short: "Watertight", text: "The dormer is clad, the flat roof is laid and the windows and roof windows go in. The house is watertight again." },
  { id: 5, title: "Insulation & first fix", short: "First fix", text: "Inside the loft: insulation in the walls and roof, and the wiring and pipework for lights, sockets, heating and the en-suite." },
  { id: 6, title: "Plastering & new stairs", short: "Plaster", text: "Walls and ceilings are boarded and skimmed, the en-suite walls are formed and the new staircase is fitted." },
  { id: 7, title: "Fit-out & decorating", short: "Fit-out", text: "Flooring, doors, en-suite tiling and fittings, lights and sockets, then decorating throughout." },
  { id: 8, title: "Finished – welcome home", short: "Finished", text: "Scaffold down, everything checked and signed off by Building Control. Your new rooms are ready." },
];

const RULES: [number, RegExp][] = [
  [8, /clean|handover|hand over|snag|complet|sign.?off|certific/],
  [7, /second fix|en-?suite|tiling|decorat|flooring|paint|kitchen|bath|fit.?out|skirting/],
  [6, /plaster|stair|board/],
  [5, /insulat|first fix|electric|plumb|heating/],
  [4, /flat roof|roof cover|window|cladding|render|fascia|tile hang|roof alter|watertight|lead/],
  [3, /roof structure|gable|dormer|hip|rafter|mansard/],
  [2, /steel|beam|floor prep|floor joist|trimmer|chimney|structur/],
  [1, /scaffold|site set|prelim|protect|demolition|strip|welfare|skip/],
];
/** Which drawing phase a programme stage belongs to (0 = not a loft stage). */
export function phaseOf(stage: { stage: string; label: string }): number {
  const t = `${stage.stage} ${stage.label}`.toLowerCase();
  for (const [p, re] of RULES) if (re.test(t)) return p;
  return 0;
}
/** Is this job a loft conversion? (any stage named Loft …) */
export const isLoftJob = (stages: { stage: string; label: string }[]) => stages.some(s => /loft/i.test(`${s.stage} ${s.label}`));

type Status = "DONE" | "NOW" | "NEXT";
type StageLike = { stage: string; label: string; status: string; percent: number };
/** The status of each drawing phase, and the phase the job is in today. */
export function loftProgress(stages: StageLike[], jobStatus?: string): { status: Status[]; current: number } {
  const by = new Map<number, StageLike[]>();
  for (const s of stages) { const p = phaseOf(s); if (p) by.set(p, [...(by.get(p) ?? []), s]); }
  const status: Status[] = LOFT_PHASES.map(() => "NEXT");
  const finished = jobStatus === "COMPLETED" || (stages.length > 0 && stages.every(s => s.status === "DONE"));
  let current = 0;
  for (let p = 1; p <= 8; p++) {
    const list = by.get(p);
    if (!list?.length) continue;
    const done = list.every(s => s.status === "DONE"), started = list.some(s => s.status === "DONE" || s.status === "IN_PROGRESS" || s.percent > 0);
    if (done) { status[p] = "DONE"; current = Math.max(current, p); }
    else if (started) { status[p] = "NOW"; current = Math.max(current, p); }
  }
  // Phases with no stage of their own follow the ones around them.
  for (let p = 1; p <= 8; p++) if (!by.get(p)?.length && status[p] === "NEXT" && p < current) status[p] = "DONE";
  if (finished) { status.fill("DONE"); current = 8; }
  if (current === 0 && stages.some(s => s.status !== "NOT_STARTED")) current = 1;
  status[0] = "DONE";
  if (!finished && current > 0 && status[current] === "DONE" && current < 8) { current = current + 1; status[current] = "NOW"; }
  if (!finished && current > 0) status[current] = "NOW";
  return { status, current };
}

/* ------------------------------------------------------------------ Component */

export function LoftJourney3D({ stages, jobStatus, title = "Your loft, step by step" }: { stages: StageLike[]; jobStatus?: string; title?: string }) {
  const { status, current } = useMemo(() => loftProgress(stages, jobStatus), [stages, jobStatus]);
  const [phase, setPhase] = useState(current);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPhase(current), [current]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPhase(p => { if (p >= 8) { setPlaying(false); return 8; } return p + 1; }), 2200);
    return () => clearInterval(t);
  }, [playing]);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = rail.current?.querySelector<HTMLElement>(`[data-p="${phase}"]`); const box = rail.current; if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" }); }, [phase]);
  const ph = LOFT_PHASES[phase], st = status[phase];
  const go = (p: number) => { setPlaying(false); setPhase(Math.max(0, Math.min(8, p))); };
  return (
    <section className="overflow-hidden rounded-3xl border border-[#071a33]/10 bg-white shadow-[0_18px_40px_-34px_rgba(7,26,51,.45)]">
      <style>{`@keyframes lj-in{from{opacity:.0;transform:translateY(6px)}to{opacity:1;transform:none}}.lj-in{animation:lj-in .55s ease both}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <div><h2 className="text-lg font-semibold text-[#071a33]">{title}</h2><p className="text-xs text-neutral-500">A 3D view of each phase – tap any step to see it.</p></div>
        <button onClick={() => { if (playing) setPlaying(false); else { if (phase >= 8) setPhase(0); setPlaying(true); } }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#071a33] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#f5b400] hover:text-[#071a33]">
          {playing ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Play the build</>}</button>
      </div>

      <div className="relative mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-b from-[#dceaf7] via-[#eef4fa] to-[#f7f5ef] sm:mx-5">
        <div key={phase} className="lj-in"><Scene phase={phase} /></div>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#071a33] shadow-sm backdrop-blur">Phase {phase} of 8 · {ph.title}</span>
          {phase === current && <span className="inline-flex items-center gap-1 rounded-full bg-[#f5b400] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#071a33] shadow-sm"><MapPin className="h-3 w-3" />{current === 8 ? "Completed" : "You are here"}</span>}
          {phase !== current && st === "DONE" && phase > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"><Check className="h-3 w-3" />Done</span>}
          {phase !== current && st === "NEXT" && <span className="rounded-full bg-[#071a33]/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Coming up</span>}
        </div>
        <button onClick={() => go(phase - 1)} disabled={phase === 0} aria-label="Previous phase" className="absolute left-2 top-1/2 grid h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#071a33] shadow disabled:opacity-0"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => go(phase + 1)} disabled={phase === 8} aria-label="Next phase" className="absolute right-2 top-1/2 grid h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#071a33] shadow disabled:opacity-0"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <p key={`t${phase}`} className="lj-in min-h-[3rem] px-4 pt-3 text-sm leading-relaxed text-neutral-700 sm:px-6">{ph.text}</p>

      {/* Phase rail */}
      <div ref={rail} className="overflow-x-auto px-3 pb-4 pt-2 sm:px-5">
        <ol className="flex min-w-[560px] items-start">
          {LOFT_PHASES.map((p, i) => {
            const s = status[i], sel = i === phase, here = i === current;
            return (
              <li key={p.id} data-p={i} className="relative flex flex-1 flex-col items-center">
                {i > 0 && <span aria-hidden className={`absolute right-1/2 top-4 h-0.5 w-full ${s === "DONE" || here ? "bg-emerald-400" : "bg-neutral-200"}`} />}
                <button onClick={() => go(i)} aria-label={p.title} aria-current={sel ? "step" : undefined}
                  className={`relative grid h-8 w-8 place-items-center rounded-full text-xs font-black transition ${here ? "bg-[#f5b400] text-[#071a33]" : s === "DONE" ? "bg-emerald-500 text-white" : "border-2 border-neutral-200 bg-white text-neutral-400"} ${sel ? "ring-4 ring-[#071a33]/15 scale-110" : ""}`}>
                  {here && current < 8 && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#f5b400]/50" />}
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

/* ------------------------------------------------------------------ The drawing */

const S = 21, OX = 380, OY = 196;
const W = 6.5, D = 8, H = 5.4, R = 3.2, Hr = H + R - 0.18;
const P = (x: number, y: number, z: number) => `${((x - y) * 0.866 * S + OX).toFixed(1)},${((x + y) * 0.5 * S - z * S + OY).toFixed(1)}`;
const poly = (pts: [number, number, number][]) => pts.map(p => P(...p)).join(" ");
const C = {
  brick: "#b8664b", brickSide: "#cf7a5c", tile: "#5d4a43", tileFront: "#6e5951", tileHip: "#7c665c", tileRear: "#4f3e38", ridge: "#3b2e2a",
  timber: "#d9a35b", timberLight: "#f0d3a2", osb: "#d8b77c", steel: "#a63d2f", steelTop: "#c6563f", render: "#efe9de", renderSide: "#f7f3ec",
  hang: "#4c4f58", hangSide: "#5b5f69", felt: "#2a2e35", glass: "#8fb6d9", glassLit: "#ffd27a", frame: "#ffffff", ins: "#f1c84a", plaster: "#f5f1ea",
  oak: "#c9985f", grass: "#a8c98a", grassDark: "#8fb873", patio: "#cfc8bb", scaffold: "#7d8794", board: "#a8743d",
};
const F = ({ pts, fill, stroke = "#00000022", sw = 0.8, op }: { pts: [number, number, number][]; fill: string; stroke?: string; sw?: number; op?: number }) =>
  <polygon points={poly(pts)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={op} />;
const L = ({ a, b, c = "#00000055", w = 0.9, dash }: { a: [number, number, number]; b: [number, number, number]; c?: string; w?: number; dash?: string }) => {
  const [x1, y1] = P(...a).split(","), [x2, y2] = P(...b).split(",");
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />;
};
const slopeZ = (y: number) => H + R * Math.min(y, D - y) / 4; // pitched roof height along y

/** Windows on the rear wall (y = D) and the side wall (x = W). */
const winY = (x0: number, x1: number, z0: number, z1: number, lit = false, y = D) => <g>
  <F pts={[[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]} fill={C.frame} stroke="#00000030" />
  <F pts={[[x0 + 0.1, y, z0 + 0.1], [x1 - 0.1, y, z0 + 0.1], [x1 - 0.1, y, z1 - 0.1], [x0 + 0.1, y, z1 - 0.1]]} fill={lit ? C.glassLit : C.glass} stroke="none" />
  <L a={[(x0 + x1) / 2, y, z0 + 0.1]} b={[(x0 + x1) / 2, y, z1 - 0.1]} c="#ffffff" w={1.2} />
</g>;
const winX = (y0: number, y1: number, z0: number, z1: number, lit = false) => <g>
  <F pts={[[W, y0, z0], [W, y1, z0], [W, y1, z1], [W, y0, z1]]} fill={C.frame} stroke="#00000030" />
  <F pts={[[W, y0 + 0.1, z0 + 0.1], [W, y1 - 0.1, z0 + 0.1], [W, y1 - 0.1, z1 - 0.1], [W, y0 + 0.1, z1 - 0.1]]} fill={lit ? C.glassLit : C.glass} stroke="none" />
</g>;

function Scene({ phase }: { phase: number }) {
  const hipped = phase <= 2, opened = phase === 2, frame = phase === 3, clad = phase === 4 || phase === 8, inside = phase >= 5 && phase <= 7;
  const scaffold = phase >= 1 && phase <= 7, lit = phase === 8;
  const parts: ReactNode[] = [];
  const add = (n: ReactNode) => parts.push(n);

  // Ground and garden
  add(<F key="ground" pts={[[-8, -2, 0], [W + 4.5, -2, 0], [W + 4.5, 14, 0], [-8, 14, 0]]} fill={C.grass} stroke="none" />);
  add(<F key="lawn" pts={[[-8, 10.5, 0], [W + 4.5, 10.5, 0], [W + 4.5, 14, 0], [-8, 14, 0]]} fill={C.grassDark} stroke="none" />);
  add(<F key="patio" pts={[[0, D, 0], [W, D, 0], [W, D + 2.4, 0], [0, D + 2.4, 0]]} fill={C.patio} stroke="#0000001a" />);
  add(<F key="fence" pts={[[0, D, 0], [0, 14, 0], [0, 14, 1.6], [0, D, 1.6]]} fill="#9a7a55" stroke="#00000022" op={0.55} />);

  // Neighbour (attached, hipped, faded)
  const NW = -W;
  add(<g key="neighbour" opacity={0.5}>
    <F pts={[[NW, D, 0], [0, D, 0], [0, D, H], [NW, D, H]]} fill="#b9a99c" />
    <F pts={[[NW, 0, H], [0, 0, H], [0, 4, H + R], [NW + 4, 4, H + R]]} fill="#7d716b" />
    <F pts={[[NW, D, H], [0, D, H], [0, 4, H + R], [NW + 4, 4, H + R]]} fill="#6a5f5a" />
    {winY(NW + 1.2, NW + 2.6, 3.2, 4.6, false)}{winY(NW + 3.8, NW + 5.2, 3.2, 4.6, false)}{winY(NW + 1.4, NW + 4.6, 0.4, 2.4, false)}
  </g>);

  // House walls (rear and side are the ones we see)
  add(<F key="rear" pts={[[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]]} fill={C.brick} />);
  add(<F key="side" pts={[[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]]} fill={C.brickSide} />);
  add(<g key="brick-lines" opacity={0.18}>{Array.from({ length: 12 }, (_, i) => <L key={i} a={[0, D, 0.45 * (i + 1)]} b={[W, D, 0.45 * (i + 1)]} c="#000" w={0.5} />)}
    {Array.from({ length: 12 }, (_, i) => <L key={`s${i}`} a={[W, 0, 0.45 * (i + 1)]} b={[W, D, 0.45 * (i + 1)]} c="#000" w={0.5} />)}</g>);
  add(<g key="wins">{winY(1, 2.6, 3.1, 4.6, lit)}{winY(3.9, 5.5, 3.1, 4.6, lit)}{winY(0.8, 4.4, 0.25, 2.4, lit)}{winX(2.5, 3.6, 3.2, 4.4, lit)}{winX(5, 6.2, 0.9, 2.3, lit)}</g>);
  add(<F key="eaves" pts={[[0, D, H], [W, D, H], [W, D + 0.25, H - 0.1], [0, D + 0.25, H - 0.1]]} fill="#fafafa" stroke="#00000033" />);

  // Roof and loft, by phase
  if (hipped) {
    if (opened) {
      // Back of the roof opened: new floor and steels visible
      add(<F key="deck" pts={[[0, 0.3, H], [W - 0.2, 0.3, H], [W - 0.2, D - 0.2, H], [0, D - 0.2, H]]} fill={C.osb} />);
      add(<g key="joists">{Array.from({ length: 15 }, (_, i) => <L key={i} a={[0.2 + i * 0.42, 0.3, H]} b={[0.2 + i * 0.42, D - 0.2, H]} c="#8b6a3a" w={0.6} />)}</g>);
      add(<F key="front" pts={[[0, 0, H], [W, 0, H], [W - 4, 4, H + R], [0, 4, H + R]]} fill={C.tileFront} />);
      add(<Steels key="steels" />);
      add(<g key="rafters">{Array.from({ length: 9 }, (_, i) => { const x = 0.3 + i * 0.3 * 0.9 * 2.4; return x < W - 4 ? <L key={i} a={[x, D, H]} b={[x, 4, H + R]} c={C.timber} w={1.6} /> : null; })}
        {[0, 1, 2, 3, 4, 5].map(i => { const t = i / 5; return <L key={`h${i}`} a={[W, t * D, H]} b={[W - 4, 4, H + R]} c={C.timber} w={1.6} />; })}
        <L a={[0, 4, H + R]} b={[W - 4, 4, H + R]} c={C.ridge} w={2.2} /></g>);
    } else {
      add(<F key="front" pts={[[0, 0, H], [W, 0, H], [W - 4, 4, H + R], [0, 4, H + R]]} fill={C.tileFront} />);
      add(<F key="hip" pts={[[W, 0, H], [W, D, H], [W - 4, 4, H + R]]} fill={C.tileHip} />);
      add(<F key="rearRoof" pts={[[0, D, H], [W, D, H], [W - 4, 4, H + R], [0, 4, H + R]]} fill={C.tileRear} />);
      add(<g key="tiles" opacity={0.22}>{Array.from({ length: 9 }, (_, i) => { const y = D - (i + 1) * 0.42; return <L key={i} a={[0, y, slopeZ(y)]} b={[W - (D - y), y, slopeZ(y)]} c="#000" w={0.5} />; })}</g>);
      add(<L key="ridge" a={[0, 4, H + R]} b={[W - 4, 4, H + R]} c={C.ridge} w={2.4} />);
      add(<L key="hipline1" a={[W, D, H]} b={[W - 4, 4, H + R]} c={C.ridge} w={1.6} />);
    }
    add(<Chimney key="ch" />);
  } else {
    // Front slope now runs to a gable
    add(<F key="front" pts={[[0, 0, H], [W, 0, H], [W, 4, H + R], [0, 4, H + R]]} fill={C.tileFront} />);
    if (clad) add(<g key="rw">{[[1.2, 2.2], [3.6, 4.6]].map(([a, b], i) => <F key={i} pts={[[a, 1.4, slopeZ(1.4)], [b, 1.4, slopeZ(1.4)], [b, 2.7, slopeZ(2.7)], [a, 2.7, slopeZ(2.7)]]} fill={lit ? C.glassLit : C.glass} stroke="#ffffff" sw={1.4} />)}</g>);
    add(<Chimney key="ch" />);
    if (frame) {
      add(<F key="deck" pts={[[0, 4, H], [W, 4, H], [W, D, H], [0, D, H]]} fill={C.osb} />);
      add(<Steels key="steels" />);
      add(<F key="dtop" pts={[[0, 4, Hr], [W, 4, Hr], [W, D, Hr], [0, D, Hr]]} fill={C.timberLight} op={0.35} />);
      add(<g key="studs">
        {Array.from({ length: 12 }, (_, i) => { const x = 0.25 + i * 0.55; return <L key={i} a={[x, D, H]} b={[x, D, Hr]} c={C.timber} w={1.8} />; })}
        {Array.from({ length: 9 }, (_, i) => { const y = 4 + i * 0.5; return <L key={`j${i}`} a={[0, y, Hr]} b={[W, y, Hr]} c={C.timber} w={1.4} />; })}
        {Array.from({ length: 14 }, (_, i) => { const y = 0.3 + i * 0.55; const top = y <= 4 ? H + R * y / 4 : Hr; return <L key={`g${i}`} a={[W, y, H]} b={[W, y, top]} c={C.timber} w={1.8} />; })}
        <L a={[0, D, Hr]} b={[W, D, Hr]} c={C.timber} w={2.2} /><L a={[W, 4, Hr]} b={[W, D, Hr]} c={C.timber} w={2.2} /><L a={[W, 0, H]} b={[W, 4, H + R]} c={C.timber} w={2.2} />
      </g>);
    } else if (inside) {
      add(<Interior key="in" phase={phase} />);
    } else {
      // Clad dormer, flat roof and rendered gable
      add(<F key="ridge-strip" pts={[[0, 4, Hr], [W, 4, Hr], [W, 4, H + R], [0, 4, H + R]]} fill={C.ridge} />);
      add(<F key="dtop" pts={[[0, 4, Hr], [W, 4, Hr], [W, D, Hr], [0, D, Hr]]} fill={C.felt} />);
      add(<F key="dface" pts={[[0, D, H], [W, D, H], [W, D, Hr], [0, D, Hr]]} fill={C.hang} />);
      add(<g key="hanglines" opacity={0.3}>{Array.from({ length: 7 }, (_, i) => <L key={i} a={[0, D, H + 0.38 * (i + 1)]} b={[W, D, H + 0.38 * (i + 1)]} c="#000" w={0.5} />)}</g>);
      add(<F key="gable" pts={[[W, 0, H], [W, 4, H + R], [W, 4, Hr], [W, D, Hr], [W, D, H]]} fill={C.renderSide} />);
      add(<g key="dwin">{winY(0.7, 2.6, H + 0.75, H + 2.45, lit)}{winY(3.4, 5.9, H + 0.75, H + 2.45, lit)}</g>);
      add(<L key="fascia" a={[0, D + 0.02, Hr]} b={[W, D + 0.02, Hr]} c="#fafafa" w={3} />);
    }
  }

  if (scaffold) add(<Scaffold key="sc" sheeted={phase === 1} />);
  if (phase >= 1 && phase <= 7) add(<Skip key="skip" />);
  if (phase === 8) add(<Garden key="garden" />);

  return (
    <svg viewBox="0 0 640 400" className="block h-auto w-full" role="img" aria-label={LOFT_PHASES[phase].title}>
      <defs>
        <radialGradient id="lj-sun" cx="85%" cy="12%" r="35%"><stop offset="0" stopColor="#fff6d8" stopOpacity="0.9" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" /></radialGradient>
        <filter id="lj-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#071a33" floodOpacity="0.18" /></filter>
      </defs>
      <rect width="640" height="400" fill="url(#lj-sun)" />
      <g filter="url(#lj-shadow)">{parts}</g>
      {phase === 0 && <g><rect x="436" y="56" width="188" height="42" rx="10" fill="#071a33" /><text x="530" y="74" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff">Hipped roof today</text><text x="530" y="90" textAnchor="middle" fontSize="10.5" fill="#f5b400">becomes 2 bedrooms + en-suite</text></g>}
    </svg>
  );
}

function Chimney() {
  const x0 = 1.0, x1 = 1.7, y0 = 3.4, y1 = 4.2, z0 = H + R - 0.4, z1 = H + R + 1.1;
  return <g>
    <F pts={[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]} fill={C.brick} />
    <F pts={[[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]} fill={C.brickSide} />
    <F pts={[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]} fill="#8d4b37" />
    <F pts={[[x0 + 0.2, y0 + 0.25, z1], [x0 + 0.45, y0 + 0.25, z1], [x0 + 0.45, y0 + 0.5, z1 + 0.35], [x0 + 0.2, y0 + 0.5, z1 + 0.35]]} fill="#b5634a" />
  </g>;
}

function Steels() {
  const beam = (y: number, z: number, x0 = 0.1, x1 = W - 0.1, k = "") => <g key={k + y}>
    <F pts={[[x0, y, z], [x1, y, z], [x1, y, z + 0.3], [x0, y, z + 0.3]]} fill={C.steel} stroke="#00000044" />
    <F pts={[[x0, y - 0.2, z + 0.3], [x1, y - 0.2, z + 0.3], [x1, y, z + 0.3], [x0, y, z + 0.3]]} fill={C.steelTop} stroke="#00000044" />
    <F pts={[[x1, y - 0.2, z], [x1, y, z], [x1, y, z + 0.3], [x1, y - 0.2, z + 0.3]]} fill="#7f2c22" stroke="none" />
  </g>;
  return <g>
    {beam(5.3, H, 0.1, W - 0.1, "b")}{beam(7.4, H, 0.1, W - 0.1, "c")}
    <L a={[2.2, 4.05, H]} b={[2.2, 4.05, H + R - 0.35]} c={C.timber} w={3} /><L a={[4.6, 4.05, H]} b={[4.6, 4.05, H + R - 0.35]} c={C.timber} w={3} />
    {beam(4.15, H + R - 0.35, 0.1, W - 0.1, "r")}
  </g>;
}

/** Cut-away view of the loft (roof and back wall lifted off). */
function Interior({ phase }: { phase: number }) {
  const wall = phase === 5 ? C.ins : phase === 6 ? C.plaster : "#f6efe2";
  const floor = phase === 5 ? C.osb : phase === 6 ? "#ddc79f" : C.oak;
  const pw: [number, number, number][] = [[0.12, 0.6, H], [0.12, 4, H + R - 0.15], [0.12, 4, Hr], [0.12, D, Hr], [0.12, D, H]];
  return <g>
    <F pts={[[0, 0.6, H], [W, 0.6, H], [W, D, H], [0, D, H]]} fill={floor} />
    {phase === 7 && <g opacity={0.25}>{Array.from({ length: 14 }, (_, i) => <L key={i} a={[0.3 + i * 0.45, 0.6, H]} b={[0.3 + i * 0.45, D, H]} c="#6b4a26" w={0.6} />)}</g>}
    {phase === 5 && <g opacity={0.5}>{Array.from({ length: 15 }, (_, i) => <L key={i} a={[0.2 + i * 0.42, 0.6, H]} b={[0.2 + i * 0.42, D, H]} c="#8b6a3a" w={0.6} />)}</g>}
    <F pts={pw} fill={wall} />
    <F pts={[[0.12, 1.6, H], [W, 1.6, H], [W, 1.6, H + 1.25], [0.12, 1.6, H + 1.25]]} fill={wall} />
    {phase === 5 && <g>
      {Array.from({ length: 6 }, (_, i) => <L key={i} a={[0.12, 1 + i * 1.2, H]} b={[0.12, 1 + i * 1.2, i < 3 ? H + R * (1 + i * 1.2) / 4 - 0.2 : Hr - 0.1]} c="#c9a12f" w={1} />)}
      {Array.from({ length: 6 }, (_, i) => <L key={`k${i}`} a={[0.4 + i * 1.05, 1.6, H]} b={[0.4 + i * 1.05, 1.6, H + 1.25]} c="#c9a12f" w={1} />)}
      <polyline points={[P(0.12, 7.6, H + 0.4), P(0.12, 5, H + 0.4), P(0.12, 5, H + 2.2), P(0.12, 2.4, H + 1.4)].join(" ")} fill="none" stroke="#e8661f" strokeWidth={1.6} />
      <polyline points={[P(1.2, 1.6, H + 0.35), P(5.6, 1.6, H + 0.35)].join(" ")} fill="none" stroke="#e8661f" strokeWidth={1.6} />
      <polyline points={[P(0.12, 7.8, H + 0.2), P(0.12, 6.2, H + 0.2)].join(" ")} fill="none" stroke="#2f7fd1" strokeWidth={2} />
      <polyline points={[P(0.12, 7.8, H + 0.3), P(0.12, 6.2, H + 0.3)].join(" ")} fill="none" stroke="#d13a2f" strokeWidth={2} />
    </g>}
    {/* en-suite partition */}
    {phase >= 6 && <g>
      <F pts={[[2.3, 5.8, H], [2.3, D, H], [2.3, D, H + 2.3], [2.3, 5.8, H + 2.3]]} fill={phase === 7 ? "#e9eef2" : C.plaster} />
      <F pts={[[0.12, 5.8, H + 2.3], [2.3, 5.8, H + 2.3], [2.3, 5.8, H + 2.3], [0.12, 5.8, H + 2.3]]} fill="#ddd" />
      <L a={[0.12, 5.8, H + 2.3]} b={[2.3, 5.8, H + 2.3]} c="#00000055" w={1} />
      <F pts={[[2.3, 6.2, H], [2.3, 7.0, H], [2.3, 7.0, H + 2.0], [2.3, 6.2, H + 2.0]]} fill={phase === 7 ? "#ffffff" : "#c8b79a"} stroke="#00000033" />
    </g>}
    {/* staircase opening */}
    {phase >= 6 && <g>
      <F pts={[[3.6, 1.9, H], [5.6, 1.9, H], [5.6, 3.2, H], [3.6, 3.2, H]]} fill="#3d3a36" />
      {Array.from({ length: 5 }, (_, i) => <F key={i} pts={[[3.6 + i * 0.4, 1.9, H - 0.05 - i * 0.2], [4.0 + i * 0.4, 1.9, H - 0.05 - i * 0.2], [4.0 + i * 0.4, 3.2, H - 0.05 - i * 0.2], [3.6 + i * 0.4, 3.2, H - 0.05 - i * 0.2]]} fill={phase === 7 ? "#d9b483" : "#e8d3ad"} stroke="#00000033" />)}
      <L a={[3.6, 3.25, H + 0.9]} b={[5.6, 3.25, H + 0.9]} c={phase === 7 ? "#ffffff" : C.timber} w={2.4} />
      {[3.6, 4.1, 4.6, 5.1, 5.6].map(x => <L key={x} a={[x, 3.25, H]} b={[x, 3.25, H + 0.9]} c={phase === 7 ? "#ffffff" : C.timber} w={1.4} />)}
    </g>}
    {phase === 7 && <g>
      <F pts={[[3.0, 4.6, H + 0.01], [5.6, 4.6, H + 0.01], [5.6, 7.2, H + 0.01], [3.0, 7.2, H + 0.01]]} fill="#d7c9b3" stroke="none" op={0.8} />
      <F pts={[[3.4, 5.0, H + 0.45], [5.2, 5.0, H + 0.45], [5.2, 7.0, H + 0.45], [3.4, 7.0, H + 0.45]]} fill="#f5b400" />
      <F pts={[[5.2, 5.0, H], [5.2, 7.0, H], [5.2, 7.0, H + 0.45], [5.2, 5.0, H + 0.45]]} fill="#d99a00" />
      <F pts={[[3.4, 7.0, H], [5.2, 7.0, H], [5.2, 7.0, H + 0.45], [3.4, 7.0, H + 0.45]]} fill="#e3a600" />
      <F pts={[[3.5, 5.1, H + 0.47], [5.1, 5.1, H + 0.47], [5.1, 5.6, H + 0.47], [3.5, 5.6, H + 0.47]]} fill="#ffffff" />
      <F pts={[[0.15, 6.0, H + 0.01], [2.25, 6.0, H + 0.01], [2.25, D, H + 0.01], [0.15, D, H + 0.01]]} fill="#b9c7d2" />
      <F pts={[[0.15, 7.0, H], [1.2, 7.0, H], [1.2, 7.0, H + 2], [0.15, 7.0, H + 2]]} fill="#cfe6f5" op={0.6} stroke="#9fb9cc" />
      <circle cx={P(4.3, 6, H + 2.3).split(",")[0]} cy={P(4.3, 6, H + 2.3).split(",")[1]} r="14" fill="#ffd27a" opacity="0.35" />
      <circle cx={P(4.3, 6, H + 2.3).split(",")[0]} cy={P(4.3, 6, H + 2.3).split(",")[1]} r="3.5" fill="#ffd27a" />
    </g>}
    {/* cut edges of the lifted roof and dormer */}
    <g fill="none" stroke="#071a33" strokeWidth={1.1} strokeDasharray="4 3" opacity={0.55}>
      <polygon points={poly([[0, 4, Hr], [W, 4, Hr], [W, D, Hr], [0, D, Hr]])} />
      <polyline points={[P(W, 0, H), P(W, 4, H + R), P(W, 4, Hr)].join(" ")} />
      <polyline points={[P(W, D, H), P(W, D, Hr)].join(" ")} />
    </g>
    <L a={[0, D, H]} b={[W, D, H]} c="#071a33" w={2.2} /><L a={[W, 0.6, H]} b={[W, D, H]} c="#071a33" w={2.2} />
  </g>;
}

function Scaffold({ sheeted }: { sheeted: boolean }) {
  const yR = D + 0.9, xS = W + 0.9, top = H + 2.2, lifts = [1.9, 3.8, H + 0.2, top - 0.4];
  const parts: ReactNode[] = [];
  for (let x = -0.2; x <= W + 1; x += 1.8) parts.push(<L key={`r${x}`} a={[x, yR, 0]} b={[x, yR, top]} c={C.scaffold} w={1.6} />);
  for (let y = -0.2; y <= D + 1; y += 1.8) parts.push(<L key={`s${y}`} a={[xS, y, 0]} b={[xS, y, top]} c={C.scaffold} w={1.6} />);
  for (const z of lifts) {
    parts.push(<L key={`lr${z}`} a={[-0.2, yR, z]} b={[xS, yR, z]} c={C.scaffold} w={1.3} />);
    parts.push(<L key={`ls${z}`} a={[xS, -0.2, z]} b={[xS, yR, z]} c={C.scaffold} w={1.3} />);
    parts.push(<F key={`br${z}`} pts={[[-0.2, yR - 0.45, z], [xS, yR - 0.45, z], [xS, yR, z], [-0.2, yR, z]]} fill={C.board} stroke="#00000033" op={0.9} />);
    parts.push(<F key={`bs${z}`} pts={[[xS - 0.45, -0.2, z], [xS, -0.2, z], [xS, yR - 0.45, z], [xS - 0.45, yR - 0.45, z]]} fill={C.board} stroke="#00000033" op={0.9} />);
  }
  parts.push(<L key="brace" a={[-0.2, yR, 0]} b={[3.4, yR, 3.8]} c={C.scaffold} w={1.1} />);
  if (sheeted) {
    parts.push(<F key="sh1" pts={[[-0.2, yR, H - 0.6], [xS, yR, H - 0.6], [xS, yR, top + 0.2], [-0.2, yR, top + 0.2]]} fill="#ffffff" stroke="#c9d3de" op={0.55} />);
    parts.push(<F key="sh2" pts={[[xS, -0.2, H - 0.6], [xS, yR, H - 0.6], [xS, yR, top + 0.2], [xS, -0.2, top + 0.2]]} fill="#ffffff" stroke="#c9d3de" op={0.55} />);
  }
  return <g>{parts}</g>;
}

function Skip() {
  const x0 = W + 2.0, x1 = W + 3.6, y0 = 1.0, y1 = 3.6, z = 1.1;
  return <g>
    <F pts={[[x0, y1, 0], [x1, y1, 0], [x1, y1, z], [x0, y1, z]]} fill="#f5b400" />
    <F pts={[[x1, y0, 0], [x1, y1, 0], [x1, y1, z], [x1, y0, z]]} fill="#d99a00" />
    <F pts={[[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]} fill="#7a6a58" />
  </g>;
}

function Garden() {
  const bush = (x: number, y: number, r: number, k: string) => { const [cx, cy] = P(x, y, r).split(","); return <circle key={k} cx={cx} cy={cy} r={r * S * 0.75} fill="#5f9d55" stroke="#4d8745" />; };
  return <g>{bush(W + 1.6, 9.5, 0.9, "a")}{bush(W + 2.6, 11.8, 1.1, "b")}{bush(1, 12.6, 0.8, "c")}{bush(W + 1.3, 1.5, 0.7, "d")}</g>;
}
