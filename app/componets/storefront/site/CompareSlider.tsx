"use client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

/** Drag (or use the arrow keys) to compare the before and after photographs. */
export function CompareSlider({ before, after, label }: { before: string; after: string; label: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement | null>(null);
  const move = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);
  return (
    <div ref={box} className="relative aspect-[16/10] w-full select-none overflow-hidden bg-neutral-200 touch-pan-y"
      onPointerDown={e => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={e => { if (e.buttons) move(e.clientX); }}>
      <Image src={after} alt={`${label} – after`} fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={`${label} – before`} fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover" />
      </div>
      <span className="absolute left-0 top-0 bg-[#071a33] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">Before</span>
      <span className="absolute right-0 top-0 bg-[#f5b400] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#071a33]">After</span>
      <div aria-hidden className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pos}%` }} />
      <div role="slider" tabIndex={0} aria-label="Compare before and after" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
        onKeyDown={e => { if (e.key === "ArrowLeft") setPos(p => Math.max(0, p - 5)); if (e.key === "ArrowRight") setPos(p => Math.min(100, p + 5)); }}
        className="absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center bg-white text-[#071a33] shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f5b400]"
        style={{ left: `${pos}%` }}>
        <span className="text-xs font-bold tracking-tighter">◀ ▶</span>
      </div>
    </div>
  );
}
