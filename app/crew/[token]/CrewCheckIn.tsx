"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, MapPin } from "lucide-react";
import { crewCheckIn } from "../actions";

type Site = { quoteId: string; name: string; reference: string; inside: boolean; times: string[] };

export function CrewCheckIn({ token, name, sites }: { token: string; name: string; sites: Site[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const position = () => new Promise<{ lat?: number; lng?: number; accuracy?: number }>(resolve => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), () => resolve({}), { timeout: 8000, maximumAge: 60000 });
  });
  const go = async (s: Site, kind: "IN" | "OUT") => {
    setBusy(s.quoteId + kind); setMsg(null);
    const r = await crewCheckIn(token, s.quoteId, kind, await position());
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: kind === "IN" ? `Checked in at ${s.name}. Have a safe day.` : `Checked out from ${s.name}. Thanks!` } : { ok: false, text: r.message });
    if (r.ok) router.refresh();
  };
  return (
    <main className="mx-auto min-h-screen max-w-md bg-neutral-950 p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">2A Construction</p>
      <h1 className="mt-1 text-2xl font-black">Hi {name.split(" ")[0]}</h1>
      <p className="text-sm text-neutral-400">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
      {msg && <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-600" : "bg-red-600"}`}>{msg.text}</p>}
      <div className="mt-5 space-y-4">
        {sites.map(s => (
          <section key={s.quoteId} className="rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-amber-400" />{s.name}</p>
            <p className="text-xs text-neutral-400">{s.reference}{s.times.length ? ` · today: ${s.times.join(", ")}` : ""}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button disabled={!!busy || s.inside} onClick={() => go(s, "IN")} className="flex flex-col items-center gap-1 rounded-xl bg-emerald-500 py-4 text-lg font-black text-neutral-950 disabled:opacity-30"><LogIn className="h-6 w-6" />{busy === s.quoteId + "IN" ? "…" : "Check in"}</button>
              <button disabled={!!busy || !s.inside} onClick={() => go(s, "OUT")} className="flex flex-col items-center gap-1 rounded-xl bg-amber-400 py-4 text-lg font-black text-neutral-950 disabled:opacity-30"><LogOut className="h-6 w-6" />{busy === s.quoteId + "OUT" ? "…" : "Check out"}</button>
            </div>
          </section>
        ))}
        {!sites.length && <p className="rounded-2xl bg-white/10 p-4 text-sm">You are not booked on a site right now. Call the office if this is wrong.</p>}
      </div>
      <p className="mt-6 text-xs text-neutral-500">Your location is saved with each check-in to confirm you are on site. Keep this link private.</p>
    </main>
  );
}
