"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps a photo in a drawing-sheet frame: the photo wipes in, then the outline and the registration marks at the corners appear.
 */
export function DrawnFrame({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(t); }, []);
  const draw = (delay: number) => ({ opacity: on ? 1 : 0, transition: `opacity 500ms ease ${delay}ms` });
  return (
    <div className="relative">
      <div className={`transition-[clip-path] duration-[1100ms] ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none ${on ? "[clip-path:inset(0_0_0_0)]" : "[clip-path:inset(0_100%_0_0)]"}`} style={{ transitionDelay: "350ms" }}>
        {children}
      </div>
      <svg aria-hidden className="pointer-events-none absolute -inset-[10px] h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <rect x="0" y="0" width="100" height="100" fill="none" stroke="#071a33" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={draw(0)} />
        {[[0, 0], [100, 0], [0, 100], [100, 100]].map(([x, y], i) => (
          <g key={i}>
            <line x1={x - 2.5} y1={y} x2={x + 2.5} y2={y} stroke="#f5b400" strokeWidth="3" vectorEffect="non-scaling-stroke" style={draw(600 + i * 60)} />
            <line x1={x} y1={y - 3.5} x2={x} y2={y + 3.5} stroke="#f5b400" strokeWidth="3" vectorEffect="non-scaling-stroke" style={draw(600 + i * 60)} />
          </g>
        ))}
      </svg>
    </div>
  );
}
