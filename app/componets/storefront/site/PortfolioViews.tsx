"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { creditLine } from "@/app/lib/portfolio/categories";
import { ProjectTile } from "./ProjectTile";
import type { PortfolioItem } from "./portfolio-data";

/** Two ways to browse: photographs (masonry, every photo at its own shape) or a list of names with a photo that follows the pointer. */
export function PortfolioViews({ items }: { items: PortfolioItem[] }) {
  const [view, setView] = useState<"photos" | "list">("photos");
  return (
    <div>
      <div role="tablist" aria-label="How to show projects" className="mb-10 inline-flex border-2 border-[#071a33] text-sm font-semibold">
        {(["photos", "list"] as const).map(v => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`px-4 py-2 transition-colors ${view === v ? "bg-[#071a33] text-white" : "text-[#071a33] hover:bg-[#071a33]/5"}`}>{v === "photos" ? "Photographs" : "List"}</button>
        ))}
      </div>
      {view === "photos"
        ? <div className="columns-1 gap-x-10 md:columns-2">{items.map(p => <div key={p.id} className="mb-16 break-inside-avoid"><ProjectTile item={p} sizes="(min-width: 768px) 50vw, 100vw" /></div>)}</div>
        : <ProjectList items={items} />}
    </div>
  );
}

function ProjectList({ items }: { items: PortfolioItem[] }) {
  const [hover, setHover] = useState<PortfolioItem | null>(null);
  const box = useRef<HTMLUListElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <ul ref={box} className="relative border-t-2 border-[#071a33]" onMouseLeave={() => setHover(null)}
      onMouseMove={e => { const r = box.current?.getBoundingClientRect(); if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
      {items.map(p => (
        <li key={p.id} className="border-b border-[#071a33]/20">
          <Link href={`/project/${p.id}`} onMouseEnter={() => setHover(p)} onFocus={() => setHover(p)}
            className="group grid grid-cols-[72px_1fr] items-center gap-4 py-5 sm:grid-cols-[1fr_auto] sm:gap-8 sm:py-7">
            <span className="relative block aspect-square overflow-hidden bg-[#dfe4ea] sm:hidden">{p.cover && <Image src={p.cover} alt="" fill sizes="72px" className="object-cover" />}</span>
            <span>
              <span className="block text-2xl font-extrabold leading-tight text-[#071a33] [font-stretch:115%] transition-transform duration-500 group-hover:translate-x-2 sm:text-4xl lg:text-5xl">{p.name}</span>
              <span className="mt-1 block text-sm text-[#071a33]/60 sm:hidden">{creditLine(p.category, p.location, p.completed)}</span>
            </span>
            <span className="hidden max-w-xs text-right text-sm text-[#071a33]/60 sm:block">{creditLine(p.category, p.location, p.completed)}</span>
          </Link>
        </li>
      ))}
      {hover?.cover && (
        <div aria-hidden className="pointer-events-none absolute z-10 hidden w-72 -translate-x-1/2 -translate-y-[60%] rotate-[-2deg] border-4 border-white shadow-[0_30px_60px_-20px_rgba(7,26,51,.5)] lg:block"
          style={{ left: pos.x, top: pos.y }}>
          <div className="relative aspect-[4/5]"><Image key={hover.cover} src={hover.cover} alt="" fill sizes="288px" className="object-cover" /></div>
        </div>
      )}
    </ul>
  );
}
