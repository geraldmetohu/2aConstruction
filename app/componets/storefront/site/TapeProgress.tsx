"use client";
import { useEffect, useState } from "react";

/** A tape measure under the menu that pays out as you scroll down the page. */
export function TapeProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div aria-hidden className="pointer-events-none sticky top-[76px] z-40 h-0">
      <div className="h-[7px] bg-[#f5b400] [background-image:linear-gradient(90deg,#071a33_1px,transparent_1px),linear-gradient(90deg,#071a33_1px,transparent_1px)] [background-position:0_100%,0_100%] [background-repeat:repeat-x] [background-size:10px_3px,50px_7px]"
        style={{ width: `${p * 100}%`, opacity: p > 0.005 ? 1 : 0, transition: "opacity 300ms" }} />
    </div>
  );
}
