// app/componets/storefront/Hero/CanvasStage.tsx
"use client";

import { useEffect, useRef } from "react";

type Preset = "sparks" | "grid" | "waves";

export function CanvasStage({
  className,
  preset = "sparks",
  opacity = 0.6,
}: {
  className?: string;
  preset?: Preset;
  opacity?: number; // 0 - 1 overlay strength
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0,
      h = 0,
      dpr = 1,
      t = 0;

    const resize = () => {
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onResize = () => resize();
    resize();
    window.addEventListener("resize", onResize);

    // --- Preset data ---
    const particles =
      preset === "sparks"
        ? Array.from({ length: 80 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.8 + 0.6,
          }))
        : [];

    function drawSparks() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity;
      // glow
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, "rgba(245,158,11,0.35)"); // amber
        g.addColorStop(1, "rgba(245,158,11,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawGrid() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity * 0.9;
      const step = 32;
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 1;
      const offset = (Math.sin(t / 5000) * step) / 3;

      ctx.beginPath();
      for (let x = -step * 2; x < w + step * 2; x += step) {
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, h);
      }
      for (let y = -step * 2; y < h + step * 2; y += step) {
        ctx.moveTo(0, y + offset);
        ctx.lineTo(w, y + offset);
      }
      ctx.stroke();

      // soft amber glow in corners
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 480);
      g1.addColorStop(0, "rgba(245,158,11,0.08)");
      g1.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
    }

    function drawWaves() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity * 0.8;
      ctx.lineWidth = 1.5;
      const rows = 5;
      for (let i = 0; i < rows; i++) {
        const yBase = (h / (rows + 1)) * (i + 1);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y =
            yBase +
            Math.sin((x + t * 0.12 + i * 40) / 26) * 6 +
            Math.sin((x + t * 0.2 + i * 10) / 70) * 9;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          i % 2 === 0 ? "rgba(245,158,11,0.35)" : "rgba(6,182,212,0.28)";
        ctx.stroke();
      }
    }

    const loop = (now: number) => {
      t = now;
      switch (preset) {
        case "grid":
          drawGrid();
          break;
        case "waves":
          drawWaves();
          break;
        default:
          drawSparks();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [preset, opacity]);

  return <canvas ref={canvasRef} className={className} />;
}
