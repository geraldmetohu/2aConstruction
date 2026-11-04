"use client";
import { useRef, useState, type ReactNode } from "react";

/**
 * On devices with a mouse, a round "View" marker follows the pointer over a photo
 * and the photo eases in. Touch devices just get the normal tap.
 */
export function HoverCursor({ children, label = "View", className = "" }: { children: ReactNode; label?: string; className?: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div ref={box} className={`relative [@media(hover:hover)]:cursor-none ${className}`}
      onPointerMove={e => { if (e.pointerType !== "mouse") return; const r = box.current!.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
      onPointerLeave={() => setPos(null)}>
      {children}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 grid h-[88px] w-[88px] place-items-center rounded-full bg-[#f5b400] text-sm font-bold text-[#071a33] shadow-[0_10px_30px_-10px_rgba(7,26,51,.6)] transition-[opacity,transform] duration-200 ease-out"
        style={{ transform: `translate(${(pos?.x ?? 0) - 44}px, ${(pos?.y ?? 0) - 44}px) scale(${pos ? 1 : 0.4})`, opacity: pos ? 1 : 0 }}>
        {label}
      </span>
    </div>
  );
}
