"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const INK = "#071a33";
const YELLOW = "#f5b400";
const WATER = "#2f7fd6";
const HEAT = "#e0523a";
const LIGHT = "#8d97a6";

export const BUILD_STEPS = [
  { title: "Survey and drawings", text: "We measure the house, set out the grid and draw the plans. Planning, party walls and Building Control are sorted before anything is dug." },
  { title: "Groundworks", text: "Trenches dug and inspected, concrete strip foundations poured, new drainage laid to falls, then an insulated slab." },
  { title: "Structure", text: "The extension walls go up in insulated cavity construction. The back of the house is opened on a steel beam, and the loft floor is strengthened." },
  { title: "Roofs", text: "A warm-deck flat roof with a glazed lantern over the kitchen, and a full-width dormer that turns the loft into a proper room." },
  { title: "Services and glazing", text: "Wiring, downlights, plumbing and underfloor heating go in while everything is open. Then the bi-fold doors are fitted." },
  { title: "Handover", text: "Plastered, decorated, tested and certified. Lights on, keys back, and a 5-year workmanship guarantee in writing." },
];

/** 0→1 progress of an element whose animation runs from `start` for `dur` stages, read from the --p scroll variable. */
const t = (start: number, dur = 0.6) => `clamp(0, calc((var(--p) - ${start}) / ${dur}), 1)`;
/** Visible only while its own stage is on screen (labels). */
const during = (stage: number) => `calc(${t(stage + 0.15, 0.25)} - ${t(stage + 0.92, 0.08)})`;

const draw = (start: number, dur = 0.6): CSSProperties => ({ strokeDasharray: 1, strokeDashoffset: `calc(1 - ${t(start, dur)})` as unknown as number });
const fade = (start: number, dur = 0.5): CSSProperties => ({ opacity: t(start, dur) as unknown as number });
const rise = (start: number, dur = 0.7): CSSProperties => ({ transform: `scale(1, ${t(start, dur)})`, transformBox: "fill-box", transformOrigin: "50% 100%" });
const drop = (start: number, dur = 0.5, by = 120): CSSProperties => ({ opacity: t(start, dur * 0.6) as unknown as number, transform: `translateY(calc((1 - ${t(start, dur)}) * -${by}px))` });

/**
 * "How we build": a section through a London terrace, drawn the way an architect would,
 * that builds itself as you scroll – a rear extension and loft dormer from survey to handover.
 * Scrolling scrubs the drawing forwards and backwards; the stage list jumps to any stage.
 */
export function BuildSequence({ id = "how-we-build" }: { id?: string }) {
  const outer = useRef<HTMLElement | null>(null);
  const stageBox = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = outer.current, box = stageBox.current;
        if (!el || !box) return;
        const r = el.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const f = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
        let p = f * BUILD_STEPS.length;
        if (reduce) p = Math.min(BUILD_STEPS.length, Math.floor(p) + 1); // jump between finished stages, no tweening
        box.style.setProperty("--p", p.toFixed(3));
        setStage(Math.min(BUILD_STEPS.length - 1, Math.floor(p)));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const goTo = (i: number) => {
    const el = outer.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + span * ((i + 0.62) / BUILD_STEPS.length), behavior: "smooth" });
  };

  const s = BUILD_STEPS[stage];
  return (
    <section ref={outer} id={id} aria-label="How a project is built" className="relative h-[560svh] bg-[#eef1f4]">
      <div ref={stageBox} className="sticky top-[76px] flex h-[calc(100svh-76px)] flex-col overflow-hidden" style={{ ["--p" as string]: 0 }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(7,26,51,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(7,26,51,.05)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative mx-auto grid h-full w-full max-w-[1440px] grid-rows-[1fr_auto] gap-4 px-5 py-4 sm:px-8 lg:grid-cols-12 lg:grid-rows-1 lg:gap-10 lg:px-10 lg:py-8">
          {/* Drawing */}
          <div className="relative flex min-h-0 items-center lg:order-2 lg:col-span-8 lg:items-center">
            <Drawing />
          </div>
          {/* Words */}
          <div className="relative flex flex-col justify-center pb-3 lg:order-1 lg:col-span-4 lg:pb-0">
            <p className="text-sm font-semibold text-[#071a33]/55" aria-live="polite">Stage {stage + 1} of {BUILD_STEPS.length}</p>
            <div className="relative mt-2 grid">
              {BUILD_STEPS.map((st, i) => (
                <div key={st.title} aria-hidden={i !== stage} className={`[grid-area:1/1] transition-all ease-out ${i === stage ? "duration-500" : "duration-200"} ${i === stage ? "translate-y-0 opacity-100" : i < stage ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0"}`}>
                  <h3 className="text-[1.7rem] font-extrabold leading-[1] text-[#071a33] [font-stretch:118%] sm:text-4xl lg:text-5xl">{st.title}</h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#071a33]/75 sm:text-lg">{st.text}</p>
                </div>
              ))}
              <span className="sr-only">{s.title}. {s.text}</span>
            </div>
            <ol className="mt-6 hidden space-y-1 lg:block" aria-label="Stages">
              {BUILD_STEPS.map((st, i) => (
                <li key={st.title}>
                  <button type="button" onClick={() => goTo(i)} className={`group flex w-full items-center gap-3 py-1.5 text-left text-[15px] transition-colors ${i === stage ? "font-bold text-[#071a33]" : "text-[#071a33]/50 hover:text-[#071a33]"}`}>
                    <span className="relative h-[3px] w-10 overflow-hidden bg-[#071a33]/15"><span className={`absolute inset-0 origin-left transition-transform duration-500 ${i < stage ? "scale-x-100 bg-[#071a33]" : i === stage ? "scale-x-100 bg-[#f5b400]" : "scale-x-0 bg-[#f5b400] group-hover:scale-x-50"}`} /></span>
                    {st.title}
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex gap-1.5 lg:hidden" aria-hidden>
              {BUILD_STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 transition-colors duration-500 ${i <= stage ? "bg-[#071a33]" : "bg-[#071a33]/15"}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Label({ x, y, tx, ty, text, stage, anchor = "start" }: { x: number; y: number; tx: number; ty: number; text: string; stage: number; anchor?: "start" | "end" }) {
  return (
    <g style={{ opacity: during(stage) as unknown as number }}>
      <circle cx={x} cy={y} r="3.5" fill={YELLOW} stroke={INK} strokeWidth="1.2" />
      <path d={`M${x} ${y} L${tx} ${ty} H${tx + (anchor === "start" ? 14 : -14)}`} fill="none" stroke={INK} strokeWidth="1" />
      <text x={tx + (anchor === "start" ? 18 : -18)} y={ty + 4.5} textAnchor={anchor} fontSize="14" fontWeight="600" fill={INK}>{text}</text>
    </g>
  );
}

function Dim({ x1, y1, x2, y2, label, start, side = 1 }: { x1: number; y1: number; x2: number; y2: number; label: string; start: number; side?: 1 | -1 }) {
  const v = x1 === x2;
  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={INK} strokeWidth="0.9" pathLength={1} style={draw(start, 0.35)} />
      <path d={v ? `M${x1 - 5} ${y1 + 5} L${x1 + 5} ${y1 - 5} M${x2 - 5} ${y2 + 5} L${x2 + 5} ${y2 - 5}` : `M${x1 - 5} ${y1 + 5} L${x1 + 5} ${y1 - 5} M${x2 - 5} ${y2 + 5} L${x2 + 5} ${y2 - 5}`} stroke={INK} strokeWidth="1.4" style={fade(start + 0.2, 0.2)} />
      <text x={v ? x1 + 10 * side : (x1 + x2) / 2} y={v ? (y1 + y2) / 2 : y1 - 7} textAnchor={v ? (side > 0 ? "start" : "end") : "middle"} dominantBaseline={v ? "middle" : "auto"} fontSize="13" fill={INK} style={fade(start + 0.3, 0.2)}>{label}</text>
    </g>
  );
}

function Grid({ x, label, start }: { x: number; label: string; start: number }) {
  return (
    <g>
      <path d={`M${x} 34 V640`} stroke={INK} strokeOpacity=".35" strokeWidth="0.8" strokeDasharray="10 4 2 4" style={fade(start, 0.3)} />
      <g style={fade(start + 0.1, 0.3)}>
        <circle cx={x} cy={22} r="13" fill="#fff" stroke={INK} strokeWidth="1.2" />
        <text x={x} y={27} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>{label}</text>
      </g>
    </g>
  );
}

function Person({ x, y, scale = 1, flip }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} fill={INK} opacity=".85">
      <circle cx="0" cy="-104" r="9" />
      <path d="M-11 -92 Q0 -96 11 -92 L14 -50 L8 -50 L7 0 L1 0 L0 -45 L-1 0 L-7 0 L-8 -50 L-14 -50 Z" />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-70" stroke="#4a3b2c" strokeWidth="5" />
      <circle cx="0" cy="-95" r="38" fill="#5f8b6a" />
      <circle cx="-22" cy="-78" r="24" fill="#6f9c78" />
      <circle cx="22" cy="-82" r="26" fill="#557f60" />
    </g>
  );
}

function Drawing() {
  // Coordinates: ground at y=560. Grid A = front wall, B = original rear wall, C = new rear wall of the extension.
  const A = 161, B = 531, C = 900;
  return (
    <svg viewBox="40 0 1150 680" role="img" aria-label="Section drawing of a terraced house with a new rear extension and loft dormer" className="block h-full max-h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="h-brick" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f3e6d6" /><path d="M0 0V8" stroke="#a1683f" strokeWidth="1.3" /></pattern>
        <pattern id="h-conc" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#d7dbe0" /><circle cx="3" cy="4" r="1.1" fill="#7d8591" /><circle cx="9" cy="9" r=".8" fill="#7d8591" /><path d="M7 2 l2 2 l-2 1z" fill="#7d8591" /></pattern>
        <pattern id="h-earth" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 L16 0" stroke={INK} strokeOpacity=".16" strokeWidth="1" /><path d="M-4 4 L4 -4 M12 20 L20 12" stroke={INK} strokeOpacity=".16" strokeWidth="1" /></pattern>
        <pattern id="h-ins" width="12" height="14" patternUnits="userSpaceOnUse"><rect width="12" height="14" fill="#fff7d6" /><path d="M0 7 Q3 0 6 7 T12 7" fill="none" stroke="#c89400" strokeWidth="1" /></pattern>
        <pattern id="h-timber" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#e9d2a9" /><path d="M0 0 L10 10 M10 0 L0 10" stroke="#a87b3f" strokeWidth=".7" /></pattern>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2f4d" /><stop offset=".7" stopColor="#4c6688" /><stop offset="1" stopColor="#c99e74" /></linearGradient>
        <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9ecf8" /><stop offset="1" stopColor="#9fc5e2" /></linearGradient>
        <radialGradient id="g-warm" cx=".5" cy=".15" r=".9"><stop offset="0" stopColor="#ffe7ad" /><stop offset="1" stopColor="#f3c86b" stopOpacity=".55" /></radialGradient>
        <linearGradient id="g-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2c2" stopOpacity=".9" /><stop offset="1" stopColor="#fff2c2" stopOpacity="0" /></linearGradient>
      </defs>

      {/* ===== Handover: dusk sky and interior light (painted first, revealed last) ===== */}
      <rect x="0" y="0" width="1200" height="560" fill="url(#g-sky)" style={fade(5.1, 0.6)} />
      <g style={fade(5.3, 0.6)}>
        <rect x={172} y={395} width={B - 9 - 172} height={153} fill="url(#g-warm)" opacity=".75" />
        <rect x={172} y={215} width={B - 9 - 172} height={168} fill="url(#g-warm)" opacity=".55" />
        <path d={`M300 76 H${B + 11} V205 H300 Z`} fill="url(#g-warm)" opacity=".6" />
        <rect x={B + 11} y={402} width={C - 20 - (B + 11)} height={146} fill="url(#g-warm)" opacity=".95" />
        <path d="M690 402 L640 548 H850 L790 402 Z" fill="url(#g-beam)" />
      </g>

      {/* Ground */}
      <rect x="0" y="560" width="1200" height="120" fill="url(#h-earth)" />
      <path d="M0 560 H1200" stroke={INK} strokeWidth="2.4" />

      {/* Grid lines */}
      <Grid x={A} label="A" start={0.05} />
      <Grid x={B} label="B" start={0.12} />
      <Grid x={C} label="C" start={0.2} />

      {/* ===== Existing house: faint until surveyed ===== */}
      <g style={{ opacity: `calc(.42 + .58 * ${t(0.1, 0.5)})` as unknown as number }}>
        {/* chimney beyond (elevation line weight) */}
        <path d="M300 112 V36 H336 V82" fill="none" stroke={LIGHT} strokeWidth="1.2" />
        {/* footings */}
        <rect x={A - 26} y="560" width="52" height="46" fill="url(#h-conc)" stroke={INK} strokeWidth="1.6" />
        <rect x={B - 26} y="560" width="52" height="46" fill="url(#h-conc)" stroke={INK} strokeWidth="1.6" />
        {/* front wall with window openings */}
        <path d={`M150 205 V265 M172 205 V265 M150 355 V425 M172 355 V425 M150 520 V560 M172 520 V560`} stroke={INK} strokeWidth="2.6" />
        <rect x="150" y="205" width="22" height="60" fill="url(#h-brick)" />
        <rect x="150" y="355" width="22" height="70" fill="url(#h-brick)" />
        <rect x="150" y="520" width="22" height="40" fill="url(#h-brick)" />
        <g stroke={INK} strokeWidth="1"><path d="M155 265 V355 M161 265 V355 M167 265 V355 M155 425 V520 M161 425 V520 M167 425 V520" /><path d="M146 355 H176 M146 520 H176" strokeWidth="2" /></g>
        {/* rear wall above the new opening */}
        <rect x={B - 11} y="205" width="22" height="190" fill="url(#h-brick)" stroke={INK} strokeWidth="2.6" />
        <path d={`M${B - 6} 260 V340 M${B} 260 V340 M${B + 6} 260 V340`} stroke={INK} strokeWidth="1" />
        {/* floors */}
        <rect x="172" y="383" width={B - 11 - 172} height="12" fill="url(#h-timber)" stroke={INK} strokeWidth="1.8" />
        <rect x="172" y="548" width={B - 11 - 172} height="12" fill="url(#h-conc)" stroke={INK} strokeWidth="1.8" />
        <rect x="172" y="205" width={B - 11 - 172} height="10" fill="url(#h-timber)" stroke={INK} strokeWidth="1.6" />
        {/* stair beyond */}
        <path d="M230 548 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-14 h18 v-13" fill="none" stroke={LIGHT} strokeWidth="1.2" />
        {/* roof: front slope always, rear slope until the dormer replaces it */}
        <path d="M128 222 L346 60 L356 68 L146 222 Z" fill="#5d6673" stroke={INK} strokeWidth="2.2" />
        <path d="M346 60 L564 222 L546 222 L336 68 Z" fill="#5d6673" stroke={INK} strokeWidth="2.2" style={{ opacity: `calc(1 - ${t(3.45, 0.25)})` as unknown as number }} />
      </g>
      {/* existing rear wall at ground floor: removed for the new opening */}
      <g style={{ opacity: `calc(1 - .75 * ${t(2.05, 0.3)})` as unknown as number }}>
        <rect x={B - 11} y="395" width="22" height="153" fill="url(#h-brick)" stroke={INK} strokeWidth="2.6" />
      </g>
      <g style={{ opacity: `calc(${t(2.1, 0.25)} - ${t(3.1, 0.3)})` as unknown as number }}><path d={`M${B - 11} 395 L${B + 11} 548 M${B + 11} 395 L${B - 11} 548`} stroke={HEAT} strokeWidth="1.5" /></g>

      {/* ===== 1. Survey: dimensions ===== */}
      <g style={{ opacity: `calc(1 - ${t(5.05, 0.3)})` as unknown as number }}>
        <Dim x1={70} y1={60} x2={70} y2={560} label="8.40" start={0.25} side={-1} />
        <Dim x1={110} y1={395} x2={110} y2={548} label="2.55" start={0.35} side={-1} />
        <Dim x1={B} y1={640} x2={C} y2={640} label="3.70 extension" start={0.45} />
        <Dim x1={A} y1={662} x2={B} y2={662} label="3.70 existing" start={0.55} />
        <Dim x1={970} y1={402} x2={970} y2={560} label="2.70" start={0.65} />
      </g>

      {/* ===== 2. Groundworks ===== */}
      <g style={drop(1.15, 0.4, 30)}>
        <rect x={C - 34} y="560" width="68" height="62" fill="url(#h-conc)" stroke={INK} strokeWidth="2" />
      </g>
      <g style={fade(1.35, 0.4)}>
        <rect x={B + 11} y="530" width={C - 20 - (B + 11)} height="8" fill="#c7cbd1" stroke={INK} strokeWidth="1" />
        <rect x={B + 11} y="538" width={C - 20 - (B + 11)} height="10" fill="url(#h-ins)" stroke={INK} strokeWidth="1" />
        <rect x={B + 11} y="548" width={C - 20 - (B + 11)} height="12" fill="url(#h-conc)" stroke={INK} strokeWidth="1.6" />
      </g>
      <path d={`M${B + 30} 588 Q760 596 1050 612`} fill="none" stroke={WATER} strokeWidth="6" strokeLinecap="round" pathLength={1} style={draw(1.5, 0.35)} />
      <g style={fade(1.7, 0.2)}><rect x="1040" y="578" width="44" height="52" fill="#fff" stroke={INK} strokeWidth="1.6" /><path d="M1036 578 H1088" stroke={INK} strokeWidth="3" /></g>
      <Label x={C} y={600} tx={1000} ty={652} text="Strip foundation" stage={1} />
      <Label x={700} y={594} tx={760} ty={660} text="New drainage to inspection chamber" stage={1} />
      <Label x={640} y={543} tx={600} ty={512} text="Insulated ground-bearing slab" stage={1} anchor="end" />

      {/* ===== 3. Structure ===== */}
      <g style={rise(2.15, 0.55)}>
        {/* cavity wall: outer brick leaf, insulation, inner block leaf – piers each side of the doors */}
        <rect x={C - 20} y="402" width="12" height="146" fill="#cfd5dc" stroke={INK} strokeWidth="1.6" />
        <rect x={C - 8} y="402" width="12" height="146" fill="url(#h-ins)" stroke={INK} strokeWidth="1" />
        <rect x={C + 4} y="402" width="14" height="146" fill="url(#h-brick)" stroke={INK} strokeWidth="2.2" />
      </g>
      <g style={drop(2.35, 0.4, 140)}>
        <path d={`M${B - 18} 381 H${B + 18} V385 H${B + 3} V397 H${B + 18} V401 H${B - 18} V397 H${B - 3} V385 H${B - 18} Z`} fill={YELLOW} stroke={INK} strokeWidth="1.4" />
        <rect x={B - 26} y="401" width="12" height="10" fill="url(#h-conc)" stroke={INK} />
      </g>
      <g style={drop(2.5, 0.4, 80)}>
        <path d="M330 201 H346 V205 H340 V213 H346 V217 H330 V213 H336 V205 H330 Z" fill={YELLOW} stroke={INK} strokeWidth="1.2" />
        <rect x="172" y="203" width={B - 11 - 172} height="4" fill={INK} />
      </g>
      <path d="M430 383 l-12 -12 h0 m0 0 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12 l-12 -12" fill="none" stroke={LIGHT} strokeWidth="1.2" pathLength={1} style={draw(2.6, 0.3)} />
      <Label x={B} y={391} tx={600} ty={330} text="Steel beam on padstones" stage={2} />
      <Label x={C + 10} y={470} tx={1010} ty={470} text="Insulated cavity wall" stage={2} />
      <Label x={338} y={209} tx={420} ty={150} text="Loft floor strengthened" stage={2} />

      {/* ===== 4. Roofs ===== */}
      <g style={drop(3.15, 0.45, 60)}>
        {/* warm deck: joists, deck, insulation, membrane – laid to a fall */}
        <path d={`M${B + 11} 388 L${C + 18} 392 L${C + 18} 402 L${B + 11} 402 Z`} fill="url(#h-timber)" stroke={INK} strokeWidth="2" />
        <path d={`M${B + 11} 378 L${C + 18} 383 L${C + 18} 392 L${B + 11} 388 Z`} fill="url(#h-ins)" stroke={INK} strokeWidth="1" />
        <path d={`M${B + 11} 376 L${C + 26} 381`} stroke={INK} strokeWidth="2.6" />
        <path d={`M${C + 18} 381 V370 H${C + 26} V381`} fill="none" stroke={INK} strokeWidth="2" />
      </g>
      <g style={drop(3.35, 0.4, 50)}>
        <path d="M680 378 L700 340 H780 L800 380 Z" fill="url(#g-glass)" stroke={INK} strokeWidth="2" />
        <path d="M700 340 L690 379 M740 340 V380 M780 340 L790 380" stroke={INK} strokeWidth="1" />
      </g>
      <g style={rise(3.5, 0.45)}>
        {/* dormer: rear wall carried up, flat roof, tile-hung face with window */}
        <rect x={B - 11} y="76" width="22" height="129" fill="#646d79" stroke={INK} strokeWidth="2.4" />
        <rect x={B - 5} y="104" width="10" height="72" fill="url(#g-glass)" stroke={INK} strokeWidth="1.2" />
      </g>
      <g style={drop(3.7, 0.3, 40)}>
        <path d={`M346 62 H${B + 26} V76 H346 Z`} fill="#3f4752" stroke={INK} strokeWidth="2.2" />
        <path d={`M346 70 H${B + 11}`} stroke="#c89400" strokeWidth="5" opacity=".7" />
      </g>
      <path d="M140 214 L340 66" stroke="#c89400" strokeWidth="7" strokeOpacity=".55" pathLength={1} style={draw(3.8, 0.3)} />
      <Label x={720} y={380} tx={760} ty={300} text="Warm flat roof and lantern" stage={3} />
      <Label x={B} y={140} tx={640} ty={120} text="Rear dormer, full height" stage={3} />
      <Label x={240} y={140} tx={200} ty={110} text="Insulation between rafters" stage={3} anchor="end" />

      {/* ===== 5. Services and glazing (the runs disappear into walls and floors at handover) ===== */}
      <g style={{ opacity: `calc(1 - ${t(5.05, 0.3)})` as unknown as number }}>
      <path d={`M${B + 20} 410 H${C - 26}`} stroke={YELLOW} strokeWidth="2.4" strokeDasharray="9 5" style={fade(4.1, 0.3)} />
      {[600, 650, 830, 870].map((x, i) => <g key={x} style={fade(4.2 + i * 0.05, 0.2)}><circle cx={x} cy={407} r="5" fill="#fff" stroke={INK} strokeWidth="1.4" /></g>)}
      <path d={`M${B + 22} 543 c 12 -6 24 -6 36 0 s 24 6 36 0 s 24 -6 36 0 s 24 6 36 0 s 24 -6 36 0 s 24 6 36 0 s 24 -6 36 0 s 24 6 36 0 s 24 -6 36 0`} fill="none" stroke={HEAT} strokeWidth="2.2" pathLength={1} style={draw(4.25, 0.4)} />
      <path d="M190 540 V230 M190 380 H500 M190 230 H470" fill="none" stroke={WATER} strokeWidth="2.4" strokeDasharray="7 5" style={fade(4.35, 0.3)} />
      </g>
      <g style={drop(4.55, 0.35, 30)}>
        {/* bi-fold doors in the new rear wall */}
        <rect x={C - 20} y="410" width="38" height="138" fill="url(#g-glass)" stroke={INK} strokeWidth="2" />
        <path d={`M${C - 1} 410 V548 M${C - 20} 476 H${C + 18}`} stroke={INK} strokeWidth="1" />
      </g>
      <Label x={650} y={407} tx={600} ty={455} text="Downlights and wiring" stage={4} anchor="end" />
      <Label x={760} y={543} tx={820} ty={505} text="Underfloor heating" stage={4} />
      <Label x={C} y={470} tx={1010} ty={430} text="Bi-fold doors" stage={4} />

      {/* ===== 6. Handover: furniture, people, garden ===== */}
      <g style={fade(5.4, 0.5)}>
        {/* kitchen island and pendants */}
        <rect x="640" y="500" width="150" height="48" fill="#f7f4ee" stroke={INK} strokeWidth="1.6" />
        <rect x="636" y="494" width="158" height="7" fill="#d9d2c4" stroke={INK} strokeWidth="1.2" />
        {[680, 715, 750].map(x => <g key={x}><path d={`M${x} 402 V448`} stroke={INK} strokeWidth="1" /><path d={`M${x - 10} 458 Q${x} 440 ${x + 10} 458 Z`} fill={YELLOW} stroke={INK} /></g>)}
        {/* dining room table beyond and sofa at the front */}
        <path d="M360 510 H470 M372 510 V548 M458 510 V548" stroke={INK} strokeWidth="2" />
        <path d="M190 548 V520 H285 V548 M190 520 V505 H200" fill="#c9ced6" stroke={INK} strokeWidth="1.6" />
        {/* bedroom in the new loft room */}
        <path d={`M380 205 V185 H500 V205 M380 185 V170 H392`} fill="#e9eef3" stroke={INK} strokeWidth="1.6" />
        {/* first floor bed */}
        <path d="M200 383 V360 H330 V383 M200 360 V340 H212" fill="#e9eef3" stroke={INK} strokeWidth="1.6" />
        <Person x={840} y={548} scale={0.9} />
        <Person x={600} y={548} scale={0.86} flip />
        <Person x={1000} y={560} scale={0.9} />
        <Tree x={1110} y={560} s={1.1} />
        <path d="M940 560 q20 -26 40 0 M1040 560 q16 -20 32 0" fill="#6f9c78" />
      </g>

      {/* Title block */}
      <g transform="translate(1012 18)">
        <rect width="170" height="74" fill="#fff" stroke={INK} strokeWidth="1.6" />
        <path d="M0 26 H170 M0 50 H170 M92 50 V74" stroke={INK} strokeWidth="1" />
        <text x="10" y="18" fontSize="13" fontWeight="700" fill={INK}>Section A–A</text>
        <text x="10" y="42" fontSize="11.5" fill={INK}>Rear extension + loft dormer</text>
        <text x="10" y="66" fontSize="11" fill={INK}>2A Construction</text>
        <text x="100" y="66" fontSize="11" fill={INK}>Indicative</text>
      </g>
    </svg>
  );
}

export function BuildSequenceIntro({ children }: { children: ReactNode }) {
  return <div className="border-y-2 border-[#071a33] bg-white">{children}</div>;
}
