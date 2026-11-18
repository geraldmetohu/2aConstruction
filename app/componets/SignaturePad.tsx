"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Sign with a finger, stylus or mouse. Calls onChange with a PNG data URL (or "" when cleared / empty).
 * Works with touch and pen (pointer events); the page doesn't scroll while signing.
 */
export function SignaturePad({ onChange, label = "Sign here", dark = false }: { onChange: (png: string) => void; label?: string; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false), last = useRef<[number, number] | null>(null), strokes = useRef(0), length = useRef(0);
  const [empty, setEmpty] = useState(true);
  const ink = dark ? "#ffffff" : "#0b1f3a";

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const fit = () => {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const g = c.getContext("2d"); if (!g) return;
      g.scale(dpr, dpr); g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 2.4; g.strokeStyle = ink;
      strokes.current = 0; length.current = 0; setEmpty(true); onChange("");
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e); strokes.current++; };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const g = e.currentTarget.getContext("2d"); if (!g) return;
    const p = pos(e);
    g.beginPath(); g.moveTo(...last.current); g.lineTo(...p); g.stroke();
    length.current += Math.hypot(p[0] - last.current[0], p[1] - last.current[1]);
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false; last.current = null;
    // A dot or a tiny scribble isn't a signature.
    const ok = length.current > 60;
    setEmpty(!ok);
    onChange(ok ? exportPng() : "");
  };
  const exportPng = () => {
    const c = ref.current!; const out = document.createElement("canvas");
    const w = 600, h = Math.round(600 * (c.height / c.width)); out.width = w; out.height = h;
    const g = out.getContext("2d")!;
    g.drawImage(c, 0, 0, w, h);
    // Always store dark-blue ink on a transparent background, whatever colour the pad was.
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = 11; d[i + 1] = 31; d[i + 2] = 58; }
    g.putImageData(img, 0, 0);
    return out.toDataURL("image/png");
  };
  const clear = () => {
    const c = ref.current; const g = c?.getContext("2d"); if (!c || !g) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore();
    strokes.current = 0; length.current = 0; setEmpty(true); onChange("");
  };
  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed ${dark ? "border-white/30 bg-white/5" : "border-neutral-300 bg-white"}`}>
        <canvas ref={ref} aria-label={label} role="img" className="block h-36 w-full touch-none cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
        {empty && <span className={`pointer-events-none absolute inset-0 grid place-items-center text-sm ${dark ? "text-white/40" : "text-neutral-400"}`}>{label}</span>}
        <span aria-hidden className={`pointer-events-none absolute inset-x-6 bottom-8 border-b ${dark ? "border-white/25" : "border-neutral-300"}`} />
      </div>
      <button type="button" onClick={clear} className={`mt-1 text-xs font-semibold underline ${dark ? "text-white/70" : "text-neutral-600"}`}>Clear and sign again</button>
    </div>
  );
}
