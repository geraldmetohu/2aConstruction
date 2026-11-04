"use client";
import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareProject({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
        } catch { /* cancelled */ }
      }}
      className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#071a33] hover:text-[#c99400]">
      {done ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{done ? "Link copied" : "Share this project"}
    </button>
  );
}
