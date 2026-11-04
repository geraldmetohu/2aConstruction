"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { FullPhoto } from "./FullPhoto";

export interface GalleryImage { url: string; caption?: string }

/**
 * Editorial photo mosaic. Every photo opens full screen; arrow keys, swipe and Escape work.
 * Layout repeats a rhythm of one wide photo followed by a pair, so long galleries never look like a product grid.
 */
export function ProjectGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen(i => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, close, step]);

  if (!images.length) return null;

  return (
    <>
      {/* Masonry: every photograph shown whole, in its own shape */}
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {images.map((img, idx) => (
          <figure key={img.url + idx} className="mb-5 break-inside-avoid">
            <button type="button" onClick={() => setOpen(idx)} aria-label={`Open photo ${idx + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ""}`}
              className="group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5b400]">
              <FullPhoto src={img.url} alt={img.caption || `${title}, photo ${idx + 1}`} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" max={2.4} min={0.5}
                guess={idx % 3 === 1 ? 3 / 4 : 4 / 3} imgClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]" />
              <span aria-hidden className="pointer-events-none absolute inset-0 border-[3px] border-transparent transition-colors duration-500 group-hover:border-[#f5b400]" />
              <span aria-hidden className="absolute right-3 top-3 grid h-9 w-9 place-items-center bg-white/95 text-[#071a33] opacity-0 transition-opacity duration-300 group-hover:opacity-100"><Expand className="h-4 w-4" /></span>
            </button>
            {img.caption && <figcaption className="mt-2 flex gap-3 text-sm text-neutral-600"><span className="font-mono text-[11px] text-[#c99400]">{String(idx + 1).padStart(2, "0")}</span>{img.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[200] flex flex-col bg-[#040f1f]/97 text-white"
          onTouchStart={e => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={e => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); touch.current = null; }}>
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="font-mono text-xs text-white/60">{String(open + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span>
            <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 place-items-center border border-white/20 hover:bg-white hover:text-[#071a33]"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative flex-1" onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <Image key={images[open].url} src={images[open].url} alt={images[open].caption || `${title}, photo ${open + 1}`} fill sizes="100vw" className="object-contain p-2 sm:p-8" priority />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center bg-white/10 hover:bg-[#f5b400] hover:text-[#071a33] sm:left-6"><ChevronLeft className="h-6 w-6" /></button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center bg-white/10 hover:bg-[#f5b400] hover:text-[#071a33] sm:right-6"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>
          <div className="min-h-[56px] px-4 pb-4 text-center text-sm text-white/80 sm:px-6">{images[open].caption}</div>
          {images.length > 1 && (
            <div className="hidden gap-2 overflow-x-auto px-6 pb-5 sm:flex sm:justify-center">
              {images.map((img, k) => (
                <button key={img.url + k} type="button" onClick={() => setOpen(k)} aria-label={`Photo ${k + 1}`} className={`relative h-14 w-20 shrink-0 overflow-hidden ${k === open ? "ring-2 ring-[#f5b400]" : "opacity-50 hover:opacity-100"}`}>
                  <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
