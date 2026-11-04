"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";

// Real reviews, as published on Checkatrade and the FMB. Keep them word for word.
const REVIEWS = [
  { quote: "I can tell a professional tradesman from the moment they walk through the door. 2A were absolutely brilliant.", who: "Checkatrade review", where: "GU21", href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews" },
  { quote: "Great team, fast work no delays, used them on 3 of my extensions.", who: "Checkatrade review", where: "EN3", href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews" },
  { quote: "From the first meeting, the team were professional, friendly and easy to communicate with.", who: "Patty Moodley, via the FMB", where: "SE10", href: "https://www.fmb.org.uk/builder/2a-construction-ltd.html" },
  { quote: "Very responsive, did the job at the time they said and in time.", who: "Checkatrade review", where: "E5", href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews" },
];

export function Reviews() {
  const [i, setI] = useState(0);
  const go = (d: number) => setI(x => (x + d + REVIEWS.length) % REVIEWS.length);
  const r = REVIEWS[i];
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-9">
        <div className="flex gap-1" aria-label="Rated 10 out of 10">{Array.from({ length: 5 }).map((_, k) => <Star key={k} aria-hidden className="h-6 w-6 fill-[#f5b400] text-[#f5b400]" />)}</div>
        <div className="mt-6 grid" aria-live="polite">
          {REVIEWS.map((x, k) => (
            <blockquote key={k} aria-hidden={k !== i} className={`[grid-area:1/1] text-[1.9rem] font-extrabold leading-[1.1] [font-stretch:112%] transition-all duration-700 ease-out sm:text-5xl ${k === i ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              “{x.quote}”
            </blockquote>
          ))}
        </div>
        <p className="mt-6 text-lg"><a href={r.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">{r.who}</a><span className="text-white/60">, {r.where}</span></p>
      </div>
      <div className="flex items-end gap-3 lg:col-span-3 lg:justify-end">
        <button type="button" onClick={() => go(-1)} aria-label="Previous review" className="grid h-14 w-14 place-items-center border-2 border-white/40 transition-colors hover:border-[#f5b400] hover:bg-[#f5b400] hover:text-[#071a33]"><ArrowLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next review" className="grid h-14 w-14 place-items-center border-2 border-white/40 transition-colors hover:border-[#f5b400] hover:bg-[#f5b400] hover:text-[#071a33]"><ArrowRight className="h-5 w-5" /></button>
        <span className="ml-2 text-sm text-white/60">{i + 1} / {REVIEWS.length}</span>
      </div>
    </div>
  );
}
