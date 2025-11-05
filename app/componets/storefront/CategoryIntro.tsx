"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Props = { title: string; blurb: string; image: string };

export function CategoryIntro({ title, blurb, image }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // tiny parallax on mouse (client-only)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--tx", `${cx * 4}px`);
      el.style.setProperty("--ty", `${cy * 4}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border bg-black"
      style={{ transform: "translate3d(var(--tx,0), var(--ty,0), 0)" }}
    >
      <div className="relative h-[52vh] min-h-[360px] w-full">
        <Image src={image} alt={title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-yellow-400"
            style={{
              textShadow:
                "0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm md:text-base text-white/90 leading-relaxed">
            {blurb}
          </p>
        </div>
      </div>
    </section>
  );
}
