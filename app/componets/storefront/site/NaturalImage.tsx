"use client";
import Image from "next/image";
import { useState, type SyntheticEvent } from "react";

/**
 * Shows a photo at its own shape: portrait photos stay portrait, panoramas stay wide.
 * The box starts at `guess` and settles on the real ratio as soon as the image loads, so nothing is cropped.
 */
export function NaturalImage({ src, alt, sizes, guess = 4 / 3, className = "", imgClassName = "", priority, min = 0.5, max = 2.4 }: {
  src: string; alt: string; sizes: string; guess?: number; className?: string; imgClassName?: string; priority?: boolean; min?: number; max?: number;
}) {
  const [ratio, setRatio] = useState(guess);
  return (
    <div className={`relative w-full overflow-hidden bg-[#dfe4ea] ${className}`} style={{ aspectRatio: String(ratio) }}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
        className={`object-cover ${imgClassName}`}
        onLoad={(e: SyntheticEvent<HTMLImageElement>) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setRatio(Math.min(max, Math.max(min, i.naturalWidth / i.naturalHeight))); }} />
    </div>
  );
}
