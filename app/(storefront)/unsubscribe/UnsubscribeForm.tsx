"use client";
import { useState } from "react";
import { unsubscribePublic } from "./actions";

export function UnsubscribeForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); const r = await unsubscribePublic(email); setBusy(false); setMsg({ ok: r.ok, text: r.message }); }} className="mt-6 space-y-3">
      <label className="block text-sm font-semibold">Your email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border px-3" autoComplete="email" /></label>
      <button disabled={busy} className="h-11 rounded-full bg-[#071a33] px-6 text-sm font-bold text-white disabled:opacity-50">Unsubscribe</button>
      {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
