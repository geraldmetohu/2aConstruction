"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature } from "lucide-react";
import { setQuoteSignerAction } from "../calculator/actions";

type Q = { id: string; reference: string; clientName: string; status: string; signerId: string };
type S = { id: string; name: string; role: string; hasSignature: boolean };

/** Sign one, several or all quotes' documents as one of the company's signatories. */
export function SignQuotes({ quotes, signatories, defaultName, ready }: { quotes: Q[]; signatories: S[]; defaultName: string; ready: boolean }) {
  const router = useRouter();
  const [who, setWho] = useState(signatories[0]?.id ?? "");
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const open = quotes.filter(q => q.status !== "ACCEPTED" && q.status !== "DECLINED");
  const run = async (ids: string[]) => { setBusy(true); const r = await setQuoteSignerAction(ids, who); setBusy(false); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setPick(new Set()); router.refresh(); } };
  if (!signatories.length) return <p className="rounded-xl border bg-white p-4 text-sm text-neutral-600"><FileSignature className="mr-1 inline h-4 w-4 text-amber-600" />Add signatures on the <a href="/dashboard/company" className="font-semibold text-amber-700 underline">Company page</a> to sign quotes automatically.</p>;
  if (!ready) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Choosing who signs needs the database update 20261117140000_quote_signer (run <code>npx prisma migrate deploy</code>). Until then documents are signed by the default: {defaultName || "nobody"}.</p>;
  const btn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40";
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="flex items-center gap-2 font-bold"><FileSignature className="h-4 w-4 text-amber-600" />Sign documents</h2>
        <label className="text-xs font-semibold">Sign as
          <select className="mt-1 block rounded-lg border px-2.5 py-1.5 text-sm" value={who} onChange={e => setWho(e.target.value)}>
            {signatories.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` – ${s.role}` : ""}{s.hasSignature ? "" : " (no signature yet)"}</option>)}
            <option value="">Company default ({defaultName || "blank lines"})</option>
          </select></label>
        <button disabled={busy || !pick.size} onClick={() => run([...pick])} className={`${btn} bg-neutral-950 text-white`}>Sign {pick.size || ""} selected</button>
        <button disabled={busy || !open.length} onClick={() => run(open.map(q => q.id))} className={`${btn} border`}>All open quotes ({open.length})</button>
        <button disabled={busy || !quotes.length} onClick={() => run(quotes.map(q => q.id))} className={`${btn} border`}>Every quote ({quotes.length})</button>
      </div>
      {msg && <p className={`mt-2 rounded-lg px-3 py-1.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-neutral-600">Pick quotes ({pick.size} selected)</summary>
        <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto text-sm sm:grid-cols-2 lg:grid-cols-3">{quotes.map(q => (
          <li key={q.id}><label className="flex items-center gap-2 rounded px-2 py-1 hover:bg-neutral-50">
            <input type="checkbox" checked={pick.has(q.id)} onChange={e => { const n = new Set(pick); if (e.target.checked) n.add(q.id); else n.delete(q.id); setPick(n); }} />
            <span className="font-semibold">{q.reference}</span><span className="truncate text-neutral-500">{q.clientName}</span></label></li>))}</ul>
      </details>
    </section>
  );
}
