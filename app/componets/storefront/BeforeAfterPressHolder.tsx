"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  title?: string;
  transitionMs?: number;   // fade speed
  className?: string;
  altBefore?: string;
  altAfter?: string;
};

export function BeforeAfterPressHold({
  beforeSrc,
  afterSrc,
  title,
  transitionMs = 220,
  className = "",
  altBefore = "Before",
  altAfter = "After",
}: Props) {
  const [revealed, setRevealed] = useState(false); // true = show Before
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const setDown = useCallback(() => setRevealed(true), []);
  const setUp = useCallback(() => setRevealed(false), []);

  return (
    <div className={`relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] select-none ${className}`}>
      {/* AFTER (default) */}
      <Image
        src={afterSrc}
        alt={altAfter}
        fill
        className="object-cover"
        priority
      />

      {/* BEFORE (fades in while pressed) */}
      <Image
        src={beforeSrc}
        alt={altBefore}
        fill
        className="object-cover pointer-events-none"
        style={{
          opacity: revealed ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease`,
        }}
      />

      {/* Labels */}
      <div className="absolute left-3 top-3 px-2 py-1 bg-black/55 text-white text-xs uppercase">
        {revealed ? "Before" : "After"}
      </div>

      {/* Title */}
      {title && (
        <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent text-white">
          <div className="text-sm sm:text-base font-medium">{title}</div>
        </div>
      )}

      {/* Interaction layer (press & hold) */}
      <button
        ref={btnRef}
        aria-label="Press and hold to view the BEFORE image"
        title="Press and hold to view BEFORE"
        className="absolute inset-0 cursor-pointer bg-transparent"
        // Mouse
        onMouseDown={setDown}
        onMouseUp={setUp}
        onMouseLeave={setUp}
        // Touch
        onTouchStart={(e) => { e.preventDefault(); setDown(); }}
        onTouchEnd={setUp}
        onTouchCancel={setUp}
        // Keyboard (hold Space/Enter)
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setDown();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setUp();
          }
        }}
      />
    </div>
  );
}
