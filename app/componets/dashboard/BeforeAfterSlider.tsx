"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  title,
  auto = true,
  duration = 5,
}: {
  beforeSrc: string;
  afterSrc: string;
  title?: string;
  auto?: boolean;
  duration?: number; // seconds for one way
}) {
  const [position, setPosition] = useState(50); // percentage divider
  const controls = useAnimation();
  const userInteracting = useRef(false);

  // Auto animation loop
  useEffect(() => {
    if (auto && !userInteracting.current) {
      const loop = async () => {
        while (true) {
          await controls.start({ x: "90%", transition: { duration, ease: "easeInOut" } });
          await controls.start({ x: "10%", transition: { duration, ease: "easeInOut" } });
        }
      };
      loop();
    }
  }, [auto, controls, duration]);

  // Handle user hover/touch
  const handleMove = (clientX: number, width: number) => {
    const rectPosition = ((clientX / width) * 100);
    setPosition(Math.max(0, Math.min(100, rectPosition)));
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto select-none">
      {/* After image (full) */}
      <Image
        src={afterSrc}
        alt="After"
        width={1000}
        height={600}
        className="rounded-lg object-cover w-full h-auto"
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden rounded-lg"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeSrc}
          alt="Before"
          width={1000}
          height={600}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Divider line */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
        animate={controls}
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        onMouseMove={(e) => {
          userInteracting.current = true;
          handleMove(e.nativeEvent.offsetX, e.currentTarget.parentElement!.clientWidth);
        }}
        onTouchMove={(e) => {
          userInteracting.current = true;
          const touch = e.touches[0];
          handleMove(touch.clientX - e.currentTarget.getBoundingClientRect().left, e.currentTarget.parentElement!.clientWidth);
        }}
        onMouseLeave={() => { userInteracting.current = false; }}
        onTouchEnd={() => { userInteracting.current = false; }}
      />

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">Before</div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">After</div>

      {title && (
        <div className="mt-3 text-center font-semibold">{title}</div>
      )}
    </div>
  );
}
