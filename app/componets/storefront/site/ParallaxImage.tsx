"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";

/** A full-bleed photo that drifts slightly slower than the page as you scroll past it. */
export function ParallaxImage({ src, alt, className = "", priority, strength = 0.12, cover }: { src: string; alt: string; className?: string; priority?: boolean; strength?: number; cover?: boolean }) {
  const box = useRef<HTMLDivElement | null>(null);
  const img = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = box.current, i = img.current;
        if (!b || !i) return;
        const r = b.getBoundingClientRect();
        const centre = r.top + r.height / 2 - window.innerHeight / 2;
        i.style.transform = `translate3d(0, ${(-centre * strength).toFixed(1)}px, 0) scale(1.15)`;
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [strength]);
  return (
    <div ref={box} className={`${cover ? "absolute inset-0" : "relative"} overflow-hidden bg-[#071a33] ${className}`}>
      <div ref={img} className="absolute inset-0 will-change-transform" style={{ transform: "scale(1.15)" }}>
        <Image src={src} alt={alt} fill priority={priority} sizes="100vw" className="object-cover" />
      </div>
    </div>
  );
}
