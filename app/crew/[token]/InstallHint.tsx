"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registers the offline helper and offers "Add to home screen" (Android) or shows how (iPhone). */
export function InstallHint() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/crew-sw.js", { scope: "/crew/" }).catch(() => {});
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (installed) return null;
  return (
    <section className="mt-5 rounded-2xl border border-white/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-bold"><Smartphone className="h-4 w-4 text-amber-400" />Put this on your home screen</p>
      {prompt ? <button onClick={async () => { await prompt.prompt(); setPrompt(null); }} className="mt-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-neutral-950">Add to home screen</button>
        : <p className="mt-1 text-xs text-neutral-400">{ios ? "In Safari tap the Share button, then “Add to Home Screen”." : "In Chrome open the ⋮ menu, then “Add to Home screen” / “Install app”."} It opens like an app – check in with one tap, even with poor signal.</p>}
    </section>
  );
}
