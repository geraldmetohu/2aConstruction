"use client";
import { useState } from "react";
import { CompareSlider } from "../CompareSlider";

export function BeforeAfterShowcase({ items }: { items: { id: string; title: string; before: string; after: string }[] }) {
  const [i, setI] = useState(0);
  const it = items[i];
  if (!it) return null;
  return (
    <div>
      {items.length > 1 && (
        <div role="tablist" aria-label="Choose a project" className="mb-6 flex flex-wrap gap-2">
          {items.map((x, k) => (
            <button key={x.id} role="tab" aria-selected={k === i} onClick={() => setI(k)}
              className={`border-2 px-4 py-2 text-[15px] font-semibold transition-colors ${k === i ? "border-[#071a33] bg-[#071a33] text-white" : "border-[#071a33]/20 text-[#071a33] hover:border-[#071a33]"}`}>{x.title}</button>
          ))}
        </div>
      )}
      <CompareSlider key={it.id} before={it.before} after={it.after} label={it.title} />
    </div>
  );
}
