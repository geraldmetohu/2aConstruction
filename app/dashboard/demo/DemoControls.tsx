"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, KeyRound, Loader2, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { ConfirmDelete } from "@/app/componets/dashboard/ConfirmDelete";
import { resetDemo, runDemoStep, setupDemoLogin } from "./actions";

type Step = { n: number; title: string; client: string };

export function DemoControls({ email, hasLogin, done, steps, quote, canReset }: { email: string; hasLogin: boolean; done: number; steps: Step[]; quote: { id: string; reference: string; status: string } | null; canReset: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const go = async (fn: () => Promise<{ ok: boolean; message: string }>) => { setBusy(true); const r = await fn(); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) router.refresh(); };
  const next = steps.find(s => s.n === done + 1);
  const weak = pw && (pw.toLowerCase().includes(email.split("@")[0].toLowerCase()) || pw.length < 10);
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
      <section className="h-fit rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4 text-amber-600" />Demo client login</h2>
        <p className="mt-1 text-sm text-neutral-600">The client signs in with <strong className="break-all">{email}</strong>. {hasLogin ? "A password is set – change it here any time." : "Set a password to create the login."}</p>
        <label className="mt-3 block text-xs font-semibold">Password for the demo login
          <input type="text" value={pw} onChange={e => setPw(e.target.value)} autoComplete="off" spellCheck={false} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label>
        {weak && <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><TriangleAlert className="h-4 w-4 shrink-0" />Easy to guess. Anyone who tries it can see the demo project (only sample data). Fine for showing clients; don&apos;t reuse it anywhere else.</p>}
        <button disabled={busy || pw.length < 8} onClick={() => go(() => setupDemoLogin(pw))} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 text-sm font-bold text-white disabled:opacity-40">{hasLogin ? "Update password" : "Create demo login"}</button>
        <p className="mt-3 text-xs text-neutral-500">To see the client&apos;s side, open the site in a private / incognito window (or on a tablet) and sign in as the demo client. Notifications are emailed to that inbox, just like a real client.</p>
        <a href="/my-quotes" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 underline">Client portal link<ExternalLink className="h-3 w-3" /></a>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold">The story – from quote to handover</h2><p className="text-sm text-neutral-600">{quote ? `${quote.reference} · ${done} of ${steps.length} steps done` : "A fresh demo project is created with the first step."}</p></div>
          <div className="flex items-center gap-2">
            {next && <button disabled={busy || !hasLogin} onClick={() => go(() => runDemoStep(next.n))} className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-black text-neutral-950 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Step {next.n}: {next.title}</button>}
            {canReset ? <ConfirmDelete word="RESET" label="Reset demo" title="Reset the demo?" run={t => resetDemo(t)}
              what={["The demo project and everything on it (messages, invoices, payments, photos, snags)", "Only the project marked as a demo – nothing else", "The demo login stays; a fresh draft quote is made"]}>
              <span className="inline-flex items-center gap-1.5"><RotateCcw className="h-4 w-4" />Reset demo</span></ConfirmDelete>
              : <span className="text-xs text-neutral-500">Reset needs database update 20261117120000_confirmed_deletes.</span>}
          </div>
        </div>
        {!hasLogin && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Create the demo login first.</p>}
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        <ol className="mt-4 space-y-2">
          {steps.map(s => {
            const ok = s.n <= done, now = s.n === done + 1;
            return (
              <li key={s.n} className={`flex gap-3 rounded-xl border p-3 ${now ? "border-amber-400 bg-amber-50" : ok ? "bg-neutral-50" : ""}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${ok ? "bg-emerald-500 text-white" : now ? "bg-amber-500 text-neutral-950" : "border-2 border-neutral-200 text-neutral-400"}`}>{ok ? <Check className="h-4 w-4" /> : s.n}</span>
                <div className="min-w-0"><p className={`font-semibold ${ok ? "text-neutral-500" : ""}`}>{s.title}</p><p className="text-xs text-neutral-600">Client sees: {s.client}</p></div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
