"use client";
import { useCallback, useMemo, type ReactNode } from "react";
import { COL, F, L, P, fitBox, journeyProgress, Journey3D, type Phase3D, type V3 } from "./journey3d";

/* ------------------------------------------------------------------ Phases */

export const EXT_PHASES: Phase3D[] = [
  { id: 0, title: "Your home today", short: "Today", text: "The back of the house and the garden as they are now. The dashed line shows where the new extension goes." },
  { id: 1, title: "Site set-up & digging", short: "Set-up", text: "The area is marked out, the turf and soil are cleared and the digger arrives. A skip goes on site and the house is protected." },
  { id: 2, title: "Foundations & drainage", short: "Foundations", text: "Trenches are dug and filled with concrete to the depth Building Control signs off. New drains are laid and connected." },
  { id: 3, title: "Floor slab & walls", short: "Walls", text: "The insulated floor slab goes down and the walls rise: block inside, brick or render outside, with insulation in the cavity." },
  { id: 4, title: "Steels & roof structure", short: "Roof", text: "Steel beams open the back of the house into the extension, and the roof (and upper floor on a double storey) is framed." },
  { id: 5, title: "Watertight: roof, doors & glazing", short: "Watertight", text: "The roof is covered, rooflights go in and the bi-fold or sliding doors and windows are fitted. It's weathertight now." },
  { id: 6, title: "First fix, screed & plastering", short: "First fix", text: "Wiring, plumbing and underfloor heating go in, the floor is screeded and the walls and ceilings are plastered." },
  { id: 7, title: "Kitchen, floors & decorating", short: "Fit-out", text: "Kitchen and fittings go in, then the floor finish, lights and sockets, and decorating throughout." },
  { id: 8, title: "Finished – enjoy your new space", short: "Finished", text: "Patio and garden made good, everything checked and signed off by Building Control. Your new room is ready." },
];
const RULES: [number, RegExp][] = [
  [8, /clean|handover|hand over|snag|complet|sign.?off|certific/],
  [7, /second fix|kitchen|decorat|tiling|floor finish|fit.?out|paint|skirting/],
  [6, /first fix|plaster|screed|electric|plumb|heating|insulat/],
  [5, /window|door|rooflight|lantern|glaz|bi.?fold|roof cover|watertight/],
  [4, /roof|steel|beam|structural opening|first floor|upper|knock|opening/],
  [3, /slab|floor|wall|brick|block|dpc/],
  [2, /foundation|drain|underpin|concrete|trench/],
  [1, /scaffold|site|prelim|demolition|excavat|strip|skip|welfare|clearance|set.?up/],
];
export const isExtensionJob = (stages: { stage: string; label: string }[]) => stages.some(s => /^extension\b/i.test(s.stage));
const keep = (s: { stage: string }) => /^(extension|site)\b/i.test(s.stage);

export const EXT_TITLES: Record<string, string> = {
  REAR: "Your rear extension, step by step", SIDE_RETURN: "Your side return extension, step by step", SIDE: "Your side extension, step by step",
  WRAPAROUND: "Your wrap-around extension, step by step", DOUBLE: "Your double storey extension, step by step", DOUBLE_SIDE: "Your double storey side extension, step by step",
  WRAP_DOUBLE_REAR: "Your wrap-around extension, step by step", WRAP_DOUBLE_SIDE: "Your wrap-around extension, step by step",
};

/* ------------------------------------------------------------------ Layouts */

const W = 6.5, D = 8, H = 5.4, R = 3.2, E = 3.0;
type Block = { x0: number; x1: number; y0: number; y1: number; h: number; pitch?: boolean; existing?: boolean };
/** The existing outrigger (closet wing) and the new blocks for each type of extension. */
export function layoutFor(type: string): { existing: Block[]; ext: Block[] } {
  const out: Block = { x0: 0, x1: 3.4, y0: D, y1: D + 4, h: H - 0.6, pitch: true, existing: true };
  const infill = (h = E): Block => ({ x0: 3.4, x1: W, y0: D, y1: D + 4, h, pitch: h > E });
  switch (type) {
    case "SIDE_RETURN": return { existing: [out], ext: [infill()] };
    case "SIDE": return { existing: [], ext: [{ x0: W, x1: W + 2.8, y0: 2.4, y1: D, h: E }] };
    case "WRAPAROUND": return { existing: [out], ext: [infill(), { x0: 0, x1: W, y0: D + 4, y1: D + 7, h: E }] };
    case "DOUBLE": return { existing: [], ext: [{ x0: 0, x1: 4.6, y0: D, y1: D + 3.6, h: H, pitch: true }] };
    case "DOUBLE_SIDE": return { existing: [], ext: [{ x0: W, x1: W + 3, y0: 1.2, y1: D, h: H, pitch: true }] };
    case "WRAP_DOUBLE_REAR": return { existing: [out], ext: [infill(), { x0: 0, x1: 4.6, y0: D + 4, y1: D + 7, h: H, pitch: true }, { x0: 4.6, x1: W, y0: D + 4, y1: D + 7, h: E }] };
    case "WRAP_DOUBLE_SIDE": return { existing: [out], ext: [infill(H), { x0: 0, x1: W, y0: D + 4, y1: D + 7, h: E }] };
    default: return { existing: [], ext: [{ x0: 0, x1: W, y0: D, y1: D + 4.2, h: E }] };
  }
}
const order = (b: Block) => (b.x0 + b.x1) / 2 + (b.y0 + b.y1) / 2;

/* ------------------------------------------------------------------ Component */

export function ExtensionJourney3D({ stages, jobStatus, type = "REAR" }: { stages: { stage: string; label: string; status: string; percent: number }[]; jobStatus?: string; type?: string }) {
  const { status, current } = useMemo(() => journeyProgress(stages, RULES, 8, keep, jobStatus), [stages, jobStatus]);
  const render = useCallback((phase: number) => <ExtScene phase={phase} type={type} />, [type]);
  return <Journey3D phases={EXT_PHASES} status={status} current={current} title={EXT_TITLES[type] ?? EXT_TITLES.REAR} render={render} />;
}

/* ------------------------------------------------------------------ Drawing */

const winOnY = (x0: number, x1: number, z0: number, z1: number, y: number, lit: boolean, bars = 1) => <g>
  <F pts={[[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]} fill={COL.frame} stroke="#00000030" />
  <F pts={[[x0 + 0.08, y, z0 + 0.08], [x1 - 0.08, y, z0 + 0.08], [x1 - 0.08, y, z1 - 0.08], [x0 + 0.08, y, z1 - 0.08]]} fill={lit ? COL.glassLit : COL.glass} stroke="none" />
  {Array.from({ length: bars }, (_, i) => { const x = x0 + (x1 - x0) * (i + 1) / (bars + 1); return <L key={i} a={[x, y, z0 + 0.08]} b={[x, y, z1 - 0.08]} c="#ffffff" w={1.4} />; })}
</g>;
const winOnX = (y0: number, y1: number, z0: number, z1: number, x: number, lit: boolean) => <g>
  <F pts={[[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]} fill={COL.frame} stroke="#00000030" />
  <F pts={[[x, y0 + 0.08, z0 + 0.08], [x, y1 - 0.08, z0 + 0.08], [x, y1 - 0.08, z1 - 0.08], [x, y0 + 0.08, z1 - 0.08]]} fill={lit ? COL.glassLit : COL.glass} stroke="none" />
</g>;

/** The house: walls we see (back and side), windows and its hipped roof. */
function House({ lit }: { lit: boolean }) {
  return <g>
    <F pts={[[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]]} fill={COL.brick} />
    <F pts={[[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]]} fill={COL.brickSide} />
    <g opacity={0.16}>{Array.from({ length: 11 }, (_, i) => <L key={i} a={[0, D, 0.45 * (i + 1)]} b={[W, D, 0.45 * (i + 1)]} c="#000" w={0.5} />)}{Array.from({ length: 11 }, (_, i) => <L key={`s${i}`} a={[W, 0, 0.45 * (i + 1)]} b={[W, D, 0.45 * (i + 1)]} c="#000" w={0.5} />)}</g>
    {winOnY(1, 2.6, 3.1, 4.6, D, lit)}{winOnY(3.9, 5.5, 3.1, 4.6, D, lit)}{winOnY(1.2, 4.6, 0.25, 2.3, D, lit, 2)}{winOnX(2.5, 3.6, 3.2, 4.4, W, lit)}{winOnX(4.6, 5.8, 0.9, 2.3, W, lit)}
    <F pts={[[0, 0, H], [W, 0, H], [W - 4, 4, H + R], [0, 4, H + R]]} fill={COL.tileFront} />
    <F pts={[[W, 0, H], [W, D, H], [W - 4, 4, H + R]]} fill={COL.tileHip} />
    <F pts={[[0, D, H], [W, D, H], [W - 4, 4, H + R], [0, 4, H + R]]} fill={COL.tileRear} />
    <L a={[0, 4, H + R]} b={[W - 4, 4, H + R]} c={COL.ridge} w={2.4} /><L a={[W, D, H]} b={[W - 4, 4, H + R]} c={COL.ridge} w={1.6} />
    <F pts={[[1.0, 4.2, H + R - 0.4], [1.7, 4.2, H + R - 0.4], [1.7, 4.2, H + R + 1.1], [1.0, 4.2, H + R + 1.1]]} fill={COL.brick} />
    <F pts={[[1.7, 3.4, H + R - 0.4], [1.7, 4.2, H + R - 0.4], [1.7, 4.2, H + R + 1.1], [1.7, 3.4, H + R + 1.1]]} fill={COL.brickSide} />
    <F pts={[[1.0, 3.4, H + R + 1.1], [1.7, 3.4, H + R + 1.1], [1.7, 4.2, H + R + 1.1], [1.0, 4.2, H + R + 1.1]]} fill="#8d4b37" />
  </g>;
}

/** Walls and roof of a finished block (existing outrigger or new extension). */
function Shell({ b, lit, glazing, clad = true }: { b: Block; lit: boolean; glazing: boolean; clad?: boolean }) {
  const { x0, x1, y0, y1, h } = b, xm = (x0 + x1) / 2, rise = Math.min(1.6, (x1 - x0) * 0.32), wide = x1 - x0, deep = y1 - y0;
  const wall = clad ? COL.brick : COL.block, side = clad ? COL.brickSide : COL.blockSide;
  return <g>
    <F pts={[[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]]} fill={wall} />
    <F pts={[[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]]} fill={side} />
    {clad && <g opacity={0.16}>{Array.from({ length: Math.floor(h / 0.45) }, (_, i) => <g key={i}><L a={[x0, y1, 0.45 * (i + 1)]} b={[x1, y1, 0.45 * (i + 1)]} c="#000" w={0.5} /><L a={[x1, y0, 0.45 * (i + 1)]} b={[x1, y1, 0.45 * (i + 1)]} c="#000" w={0.5} /></g>)}</g>}
    {glazing && !b.existing && <>
      {winOnY(x0 + 0.35, x1 - 0.35, 0.12, 2.3, y1, lit, Math.max(1, Math.round(wide / 1.1) - 1))}
      {deep > 2.2 && winOnX(y0 + deep * 0.3, y0 + deep * 0.3 + Math.min(1.6, deep * 0.35), 0.9, 2.2, x1, lit)}
      {h > E + 0.5 && winOnY(xm - 0.8, xm + 0.8, 3.2, 4.6, y1, lit)}
    </>}
    {glazing && b.existing && <>{winOnY(x0 + 0.9, x1 - 0.9, 3.0, 4.3, y1, lit)}{winOnX(y0 + 1.2, y0 + 2.3, 0.9, 2.2, x1, lit)}</>}
    {b.pitch ? <>
      <F pts={[[x0, y0, h], [x0, y1 + 0.2, h], [xm, y1 + 0.2, h + rise], [xm, y0, h + rise]]} fill={COL.tileFront} />
      <F pts={[[x1, y0, h], [x1, y1 + 0.2, h], [xm, y1 + 0.2, h + rise], [xm, y0, h + rise]]} fill={COL.tileHip} />
      <F pts={[[x0, y1, h], [x1, y1, h], [xm, y1, h + rise]]} fill={wall} />
      <L a={[xm, y0, h + rise]} b={[xm, y1 + 0.2, h + rise]} c={COL.ridge} w={2} />
    </> : <>
      <F pts={[[x0, y0, h + 0.15], [x1, y0, h + 0.15], [x1, y1, h + 0.15], [x0, y1, h + 0.15]]} fill={COL.felt} />
      <F pts={[[x0, y1, h], [x1, y1, h], [x1, y1, h + 0.15], [x0, y1, h + 0.15]]} fill="#f2f2f2" />
      <F pts={[[x1, y0, h], [x1, y1, h], [x1, y1, h + 0.15], [x1, y0, h + 0.15]]} fill="#e6e6e6" />
      {!b.existing && glazing && <Lantern b={b} lit={lit} />}
    </>}
  </g>;
}

function Lantern({ b, lit }: { b: Block; lit: boolean }) {
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, lw = Math.min(1.1, (b.x1 - b.x0) / 3), ld = Math.min(1.6, (b.y1 - b.y0) / 3), z = b.h + 0.15;
  const a: V3 = [cx - lw, cy - ld, z], c: V3 = [cx + lw, cy + ld, z], top = z + 0.55;
  return <g>
    <F pts={[[a[0], c[1], z], [c[0], c[1], z], [c[0], c[1], z + 0.2], [a[0], c[1], z + 0.2]]} fill="#f4f4f4" />
    <F pts={[[c[0], a[1], z], [c[0], c[1], z], [c[0], c[1], z + 0.2], [c[0], a[1], z + 0.2]]} fill="#e8e8e8" />
    <F pts={[[a[0], a[1], z + 0.2], [c[0], a[1], z + 0.2], [cx + lw * 0.3, cy, top], [cx - lw * 0.3, cy, top]]} fill={lit ? COL.glassLit : "#a9c8e4"} stroke="#ffffff" />
    <F pts={[[a[0], c[1], z + 0.2], [c[0], c[1], z + 0.2], [cx + lw * 0.3, cy, top], [cx - lw * 0.3, cy, top]]} fill={lit ? "#ffe2a3" : COL.glass} stroke="#ffffff" />
    <F pts={[[c[0], a[1], z + 0.2], [c[0], c[1], z + 0.2], [cx + lw * 0.3, cy, top]]} fill={lit ? "#ffd98c" : "#9cc0e0"} stroke="#ffffff" />
  </g>;
}

function ExtScene({ phase, type }: { phase: number; type: string }) {
  const { existing, ext } = layoutFor(type);
  const double = ext.some(b => b.h > E + 0.5), lit = phase === 8;
  const maxY = Math.max(D + 7.5, ...ext.map(b => b.y1 + 3)), maxX = Math.max(W + 5, ...ext.map(b => b.x1 + 3.5));
  const parts: ReactNode[] = [];
  const add = (n: ReactNode) => parts.push(n);

  // Ground, garden, fence, neighbour
  add(<F key="g" pts={[[-7, -1, 0], [maxX, -1, 0], [maxX, maxY, 0], [-7, maxY, 0]]} fill={COL.grass} stroke="none" />);
  add(<F key="g2" pts={[[-7, maxY - 2.5, 0], [maxX, maxY - 2.5, 0], [maxX, maxY, 0], [-7, maxY, 0]]} fill={COL.grassDark} stroke="none" />);
  add(<F key="fence" pts={[[0, D, 0], [0, maxY, 0], [0, maxY, 1.6], [0, D, 1.6]]} fill="#9a7a55" op={0.5} />);
  add(<g key="nb" opacity={0.45}>
    <F pts={[[-W, D, 0], [0, D, 0], [0, D, H], [-W, D, H]]} fill="#b9a99c" />
    <F pts={[[-W, 0, H], [0, 0, H], [0, 4, H + R], [-W + 4, 4, H + R]]} fill="#7d716b" />
    <F pts={[[-W, D, H], [0, D, H], [0, 4, H + R], [-W + 4, 4, H + R]]} fill="#6a5f5a" />
  </g>);

  // Ground works under the new blocks
  for (const b of ext) {
    const pad: V3[] = [[b.x0, b.y0, 0.01], [b.x1, b.y0, 0.01], [b.x1, b.y1, 0.01], [b.x0, b.y1, 0.01]];
    if (phase === 0) add(<polygon key={`plan${b.x0}${b.y0}`} points={pad.map(p => P(...p)).join(" ")} fill="#f5b400" fillOpacity={0.12} stroke="#c78f00" strokeWidth={1.4} strokeDasharray="6 4" />);
    if (phase === 1) add(<g key={`dig${b.x0}${b.y0}`}><F pts={pad} fill={COL.soil} /><polygon points={pad.map(p => P(...p)).join(" ")} fill="none" stroke="#f5b400" strokeWidth={1.4} strokeDasharray="5 4" /></g>);
    if (phase === 2) add(<g key={`fd${b.x0}${b.y0}`}><F pts={pad} fill={COL.soil} /><Trenches b={b} /></g>);
    if (phase >= 3 && phase <= 7) add(<F key={`slab${b.x0}${b.y0}`} pts={[[b.x0, b.y0, 0.15], [b.x1, b.y0, 0.15], [b.x1, b.y1, 0.15], [b.x0, b.y1, 0.15]]} fill={phase >= 6 ? (phase === 7 ? "#e9e2d6" : COL.screed) : COL.concrete} />);
  }
  if (phase === 8) add(<F key="patio" pts={[[-0.01, Math.max(...ext.map(b => b.y1)), 0.01], [Math.max(W, ...ext.map(b => b.x1)), Math.max(...ext.map(b => b.y1)), 0.01], [Math.max(W, ...ext.map(b => b.x1)), Math.max(...ext.map(b => b.y1)) + 2.2, 0.01], [-0.01, Math.max(...ext.map(b => b.y1)) + 2.2, 0.01]]} fill={COL.patio} />);
  if (phase === 2) add(<g key="drain"><L a={[W - 0.6, D + 0.3, 0.05]} b={[W - 0.6, maxY - 3.2, 0.05]} c="#e8661f" w={3} /><F pts={[[W - 1.0, maxY - 3.6, 0.04], [W - 0.2, maxY - 3.6, 0.04], [W - 0.2, maxY - 2.8, 0.04], [W - 1.0, maxY - 2.8, 0.04]]} fill="#3e4247" /></g>);

  // Buildings, back to front
  type Item = { k: number; node: ReactNode };
  const items: Item[] = [{ k: 7.25, node: <House key="house" lit={lit} /> }];
  for (const b of existing) items.push({ k: order(b), node: <Shell key={`ex${b.x0}${b.y0}`} b={b} lit={lit} glazing /> });
  for (const b of ext) items.push({ k: order(b), node: <NewBlock key={`nw${b.x0}${b.y0}`} b={b} phase={phase} lit={lit} main={b === biggest(ext)} /> });
  items.sort((a, b) => a.k - b.k).forEach(i => add(i.node));

  if (double && phase >= 3 && phase <= 5) for (const b of ext.filter(x => x.h > E + 0.5)) add(<Scaffold key={`sc${b.x0}${b.y0}`} b={b} />);
  if (phase >= 1 && phase <= 7) add(<Skip key="skip" x={maxX - 2.6} y={-0.2} />);
  if (phase === 1 || phase === 2) add(<Digger key="dig" x={maxX - 3.2} y={maxY - 3.2} />);
  if (phase === 8) add(<g key="plants">{[[maxX - 1.5, maxY - 1.3, 0.9], [-1.5, maxY - 1, 0.8], [maxX - 1.2, 2.6, 0.7]].map(([x, y, r], i) => { const [cx, cy] = P(x, y, r).split(","); return <circle key={i} cx={cx} cy={cy} r={r * 15} fill="#5f9d55" stroke="#4d8745" />; })}</g>);

  const box = fitBox([[-2.5, 0, 0], [maxX - 1, -0.5, 0], [maxX - 1, maxY - 1, 0], [-2.5, maxY - 1, 0], [0, 4, H + R + 1.4]], 4);
  return (
    <svg viewBox={box} className="block h-auto w-full" role="img" aria-label={EXT_PHASES[phase].title}>
      <defs><filter id="ex-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#071a33" floodOpacity="0.16" /></filter></defs>
      <g filter="url(#ex-shadow)">{parts}</g>
    </svg>
  );
}
const biggest = (bs: Block[]) => bs.reduce((a, b) => ((b.x1 - b.x0) * (b.y1 - b.y0) > (a.x1 - a.x0) * (a.y1 - a.y0) ? b : a));

function Trenches({ b }: { b: Block }) {
  const t = 0.6, sides: V3[][] = [
    [[b.x0, b.y1 - t, 0.02], [b.x1, b.y1 - t, 0.02], [b.x1, b.y1, 0.02], [b.x0, b.y1, 0.02]],
    [[b.x1 - t, b.y0, 0.02], [b.x1, b.y0, 0.02], [b.x1, b.y1, 0.02], [b.x1 - t, b.y1, 0.02]],
    [[b.x0, b.y0, 0.02], [b.x0 + t, b.y0, 0.02], [b.x0 + t, b.y1, 0.02], [b.x0, b.y1, 0.02]],
  ];
  return <g>{sides.map((s, i) => <F key={i} pts={s} fill={COL.concrete} stroke={COL.soilDark} sw={1.2} />)}</g>;
}

/** A new block at a given phase. */
function NewBlock({ b, phase, lit, main }: { b: Block; phase: number; lit: boolean; main: boolean }) {
  const { x0, x1, y0, y1, h } = b;
  if (phase <= 2) return null;
  if (phase === 3) {
    const hw = Math.min(h * 0.55, 1.8);
    return <g>
      <F pts={[[x0 + 0.02, y0, 0], [x0 + 0.02, y1, 0], [x0 + 0.02, y1, hw], [x0 + 0.02, y0, hw]]} fill={COL.blockSide} />
      <F pts={[[x0, y1, 0], [x1, y1, 0], [x1, y1, hw], [x0, y1, hw]]} fill={COL.block} />
      <F pts={[[x1, y0, 0], [x1, y1, 0], [x1, y1, hw], [x1, y0, hw]]} fill={COL.blockSide} />
      <g opacity={0.35}>{Array.from({ length: Math.floor(hw / 0.22) }, (_, i) => <g key={i}><L a={[x0, y1, 0.22 * (i + 1)]} b={[x1, y1, 0.22 * (i + 1)]} c="#6b7380" w={0.5} /><L a={[x1, y0, 0.22 * (i + 1)]} b={[x1, y1, 0.22 * (i + 1)]} c="#6b7380" w={0.5} /></g>)}</g>
      <L a={[x0, y1, hw]} b={[x1, y1, hw]} c="#5c6470" w={1.6} /><L a={[x1, y0, hw]} b={[x1, y1, hw]} c="#5c6470" w={1.6} />
    </g>;
  }
  if (phase === 4) {
    return <g>
      <F pts={[[x0 + 0.02, y0, 0], [x0 + 0.02, y1, 0], [x0 + 0.02, y1, h], [x0 + 0.02, y0, h]]} fill={COL.blockSide} />
      {y0 === D && <F pts={[[x0 + 0.1, D + 0.05, 2.35], [x1 - 0.1, D + 0.05, 2.35], [x1 - 0.1, D + 0.05, 2.7], [x0 + 0.1, D + 0.05, 2.7]]} fill={COL.steel} stroke="#00000044" />}
      {x0 === W && <F pts={[[W + 0.05, y0 + 0.1, 2.35], [W + 0.05, y1 - 0.1, 2.35], [W + 0.05, y1 - 0.1, 2.7], [W + 0.05, y0 + 0.1, 2.7]]} fill={COL.steel} stroke="#00000044" />}
      <F pts={[[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]]} fill={COL.brick} />
      <F pts={[[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]]} fill={COL.brickSide} />
      <F pts={[[x0 + 0.35, y1, 0.12], [x1 - 0.35, y1, 0.12], [x1 - 0.35, y1, 2.3], [x0 + 0.35, y1, 2.3]]} fill="#3d3a36" op={0.85} />
      {b.pitch
        ? <g>{Array.from({ length: Math.ceil((y1 - y0) / 0.5) + 1 }, (_, i) => { const y = Math.min(y1, y0 + i * 0.5), xm = (x0 + x1) / 2, r = Math.min(1.6, (x1 - x0) * 0.32); return <g key={i}><L a={[x0, y, h]} b={[xm, y, h + r]} c={COL.timber} w={1.8} /><L a={[x1, y, h]} b={[xm, y, h + r]} c={COL.timber} w={1.8} /></g>; })}
            <L a={[(x0 + x1) / 2, y0, h + Math.min(1.6, (x1 - x0) * 0.32)]} b={[(x0 + x1) / 2, y1, h + Math.min(1.6, (x1 - x0) * 0.32)]} c={COL.timber} w={2.4} /></g>
        : <g><F pts={[[x0, y0, h], [x1, y0, h], [x1, y0 + (y1 - y0) * 0.45, h], [x0, y0 + (y1 - y0) * 0.45, h]]} fill={COL.osb} />
            {Array.from({ length: Math.ceil((x1 - x0) / 0.45) + 1 }, (_, i) => { const x = Math.min(x1, x0 + i * 0.45); return <L key={i} a={[x, y0, h]} b={[x, y1, h]} c={COL.timber} w={1.6} />; })}</g>}
    </g>;
  }
  if (phase === 5 || phase === 8) return <Shell b={b} lit={lit} glazing />;
  // 6–7: cut-away (roof lifted)
  const inner = phase === 6 ? COL.plaster : COL.paint, ih = Math.min(h, E);
  return <g>
    <F pts={[[x0 + 0.05, y0, 0.15], [x0 + 0.05, y1, 0.15], [x0 + 0.05, y1, ih], [x0 + 0.05, y0, ih]]} fill={inner} />
    {phase === 6 && <g>
      {Array.from({ length: Math.floor((y1 - y0) / 0.7) }, (_, i) => { const y = y0 + 0.4 + i * 0.7; return <polyline key={i} points={[P(x0 + 0.3, y, 0.17), P(x1 - 0.3, y, 0.17), P(x1 - 0.3, y + 0.35, 0.17), P(x0 + 0.3, y + 0.35, 0.17)].join(" ")} fill="none" stroke="#d13a2f" strokeWidth={1.1} opacity={0.75} />; })}
      <polyline points={[P(x0 + 0.05, y0 + 0.4, 1.1), P(x0 + 0.05, y1 - 0.5, 1.1), P(x0 + 0.05, y1 - 0.5, 2.6)].join(" ")} fill="none" stroke="#e8661f" strokeWidth={1.6} />
    </g>}
    {phase === 7 && main && <Kitchen b={b} />}
    {phase === 7 && <g opacity={0.25}>{Array.from({ length: Math.floor((x1 - x0) / 0.6) }, (_, i) => <L key={i} a={[x0 + 0.6 * (i + 1), y0, 0.16]} b={[x0 + 0.6 * (i + 1), y1, 0.16]} c="#9b8f7a" w={0.6} />)}</g>}
    <F pts={[[x0, y1, 0], [x1, y1, 0], [x1, y1, 0.9], [x0, y1, 0.9]]} fill={COL.brick} />
    <F pts={[[x1, y0, 0], [x1, y1, 0], [x1, y1, 0.9], [x1, y0, 0.9]]} fill={COL.brickSide} />
    <L a={[x0, y1, 0.9]} b={[x1, y1, 0.9]} c="#071a33" w={2} /><L a={[x1, y0, 0.9]} b={[x1, y1, 0.9]} c="#071a33" w={2} />
    <g fill="none" stroke="#071a33" strokeWidth={1.1} strokeDasharray="4 3" opacity={0.55}>
      <polygon points={[P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)].join(" ")} />
      <polyline points={[P(x0, y1, 0.9), P(x0, y1, h)].join(" ")} /><polyline points={[P(x1, y1, 0.9), P(x1, y1, h)].join(" ")} /><polyline points={[P(x1, y0, 0.9), P(x1, y0, h)].join(" ")} />
    </g>
  </g>;
}

function Kitchen({ b }: { b: Block }) {
  const { x0, x1, y0, y1 } = b, z = 0.15;
  const ux0 = x0 + 0.1, ux1 = x0 + 0.75, uy0 = y0 + 0.3, uy1 = y1 - 0.4;
  const ix0 = (x0 + x1) / 2 - 0.5, ix1 = ix0 + 1.0, iy0 = (y0 + y1) / 2 - 0.9, iy1 = iy0 + 1.8;
  const box = (a: number, c: number, d: number, e: number, top: number, front: string, side: string, worktop: string, k: string) => <g key={k}>
    <F pts={[[a, e, z], [c, e, z], [c, e, top], [a, e, top]]} fill={front} />
    <F pts={[[c, d, z], [c, e, z], [c, e, top], [c, d, top]]} fill={side} />
    <F pts={[[a, d, top], [c, d, top], [c, e, top], [a, e, top]]} fill={worktop} />
  </g>;
  return <g>
    {box(ux0, ux1, uy0, uy1, 1.05, "#f4f4f2", "#ffffff", "#3a3f46", "run")}
    {Array.from({ length: Math.floor((uy1 - uy0) / 0.6) }, (_, i) => <L key={i} a={[ux1, uy0 + 0.6 * (i + 1), z + 0.05]} b={[ux1, uy0 + 0.6 * (i + 1), 1.0]} c="#cfcfcf" w={0.6} />)}
    {(x1 - x0) > 3 && box(ix0, ix1, iy0, iy1, 1.05, "#1f3a5f", "#26476f", "#efefef", "island")}
    {(x1 - x0) > 3 && [0, 1].map(i => { const [cx, cy] = P((ix0 + ix1) / 2, iy0 + 0.45 + i * 0.9, 2.6).split(","); return <g key={i}><line x1={cx} y1={Number(cy) - 18} x2={cx} y2={cy} stroke="#333" strokeWidth={0.8} /><circle cx={cx} cy={cy} r="4" fill="#ffd27a" /><circle cx={cx} cy={cy} r="11" fill="#ffd27a" opacity="0.3" /></g>; })}
    {(y1 - y0) > 3.5 && (x1 - x0) > 4 && box(x1 - 1.9, x1 - 0.7, y1 - 1.6, y1 - 0.8, 0.75, "#b07d4f", "#c38e5d", "#c99a63", "table")}
  </g>;
}

function Scaffold({ b }: { b: Block }) {
  const yR = b.y1 + 0.8, xS = b.x1 + 0.8, top = b.h + 1.2, parts: ReactNode[] = [];
  for (let x = b.x0; x <= xS + 0.01; x += 1.6) parts.push(<L key={`r${x}`} a={[x, yR, 0]} b={[x, yR, top]} c={COL.scaffold} w={1.5} />);
  for (let y = b.y0; y <= yR + 0.01; y += 1.6) parts.push(<L key={`s${y}`} a={[xS, y, 0]} b={[xS, y, top]} c={COL.scaffold} w={1.5} />);
  for (const z of [2, 4, b.h + 0.4]) {
    parts.push(<F key={`br${z}`} pts={[[b.x0, yR - 0.45, z], [xS, yR - 0.45, z], [xS, yR, z], [b.x0, yR, z]]} fill={COL.board} op={0.9} />);
    parts.push(<F key={`bs${z}`} pts={[[xS - 0.45, b.y0, z], [xS, b.y0, z], [xS, yR - 0.45, z], [xS - 0.45, yR - 0.45, z]]} fill={COL.board} op={0.9} />);
  }
  return <g>{parts}</g>;
}

function Skip({ x, y }: { x: number; y: number }) {
  const x1 = x + 1.6, y1 = y + 2.6, z = 1.1;
  return <g>
    <F pts={[[x, y1, 0], [x1, y1, 0], [x1, y1, z], [x, y1, z]]} fill="#f5b400" />
    <F pts={[[x1, y, 0], [x1, y1, 0], [x1, y1, z], [x1, y, z]]} fill="#d99a00" />
    <F pts={[[x, y, z], [x1, y, z], [x1, y1, z], [x, y1, z]]} fill="#7a6a58" />
  </g>;
}

function Digger({ x, y }: { x: number; y: number }) {
  const body = (a: number, c: number, d: number, e: number, z0: number, z1: number, f: string, s: string, t: string) => <g>
    <F pts={[[a, e, z0], [c, e, z0], [c, e, z1], [a, e, z1]]} fill={f} />
    <F pts={[[c, d, z0], [c, e, z0], [c, e, z1], [c, d, z1]]} fill={s} />
    <F pts={[[a, d, z1], [c, d, z1], [c, e, z1], [a, e, z1]]} fill={t} />
  </g>;
  return <g>
    {body(x, x + 1.5, y, y + 2.2, 0, 0.45, "#2f3338", "#3c4046", "#24272b")}
    {body(x + 0.1, x + 1.4, y + 0.3, y + 1.9, 0.45, 1.2, "#f5b400", "#e0a300", "#ffc933")}
    {body(x + 0.2, x + 1.0, y + 0.4, y + 1.1, 1.2, 2.0, "#f5b400", "#e0a300", "#ffc933")}
    <F pts={[[x + 0.25, y + 1.1, 1.3], [x + 0.95, y + 1.1, 1.3], [x + 0.95, y + 1.1, 1.9], [x + 0.25, y + 1.1, 1.9]]} fill={COL.glass} />
    <L a={[x + 0.7, y + 1.9, 1.0]} b={[x + 0.7, y + 3.4, 2.2]} c="#e0a300" w={5} /><L a={[x + 0.7, y + 3.4, 2.2]} b={[x + 0.7, y + 4.0, 0.5]} c="#e0a300" w={4} />
    <F pts={[[x + 0.4, y + 3.8, 0.2], [x + 1.0, y + 3.8, 0.2], [x + 1.0, y + 4.3, 0.6], [x + 0.4, y + 4.3, 0.6]]} fill="#3c4046" />
  </g>;
}
