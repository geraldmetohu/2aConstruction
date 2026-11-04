"use client";
import Image from "next/image";
import { useState, type SyntheticEvent } from "react";

/**
 * Shows the whole photograph – never cropped.
 * The frame takes the photo's own shape once it loads. Very tall or very wide photos are fitted inside a
 * fixed frame instead, with a soft blurred copy of the same photo filling the space around them.
 */
export function FullPhoto({ src, alt, sizes, guess = 4 / 3, min = 0.62, max = 2.1, priority, className = "", imgClassName = "", rounded = "" }: {
  src: string; alt: string; sizes: string; guess?: number; min?: number; max?: number; priority?: boolean; className?: string; imgClassName?: string; rounded?: string;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const r = ratio ?? guess;
  const frame = Math.min(max, Math.max(min, r));
  const fitted = ratio !== null && Math.abs(frame - r) > 0.01; // photo shape is outside the frame limits
  return (
    <div className={`relative w-full overflow-hidden bg-[#e7ebf0] ${rounded} ${className}`} style={{ aspectRatio: String(frame) }}>
      {fitted && <Image src={src} alt="" aria-hidden fill sizes="40vw" className="scale-110 object-cover opacity-60 blur-2xl" />}
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
        className={`${fitted ? "object-contain" : "object-cover"} transition-opacity duration-500 ${ratio === null ? "opacity-0" : "opacity-100"} ${imgClassName}`}
        onLoad={(e: SyntheticEvent<HTMLImageElement>) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight); }} />
    </div>
  );
}
