"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, RefreshCw, Search } from "lucide-react";
import { refreshNow, saveSupplierLink } from "./actions";

type Supplier = "SELCO" | "BUILDER_DEPOT";
type Link = { id: string; rateKey: string; supplier: Supplier; url: string; packQuantity: number; vatIncluded: boolean; active: boolean };
type Obs = { linkId: string; rateKey: string; supplier: string; status: string; packPrice: number | null; unitPriceExVat: number | null; error: string | null; observedAt: string };
const names: Record<Supplier, string> = { SELCO: "Selco", BUILDER_DEPOT: "Builder Depot" };

export function SupplierLinks({ storage, materials, links, observations, cronConfigured }: {
  storage: boolean; materials: { key: string; name: string; unit: string; price: number }[]; links: Link[]; observations: Obs[]; cronConfigured: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyLinked, setOnlyLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = useMemo(() => materials.filter(m => (!q || m.name.toLowerCase().includes(q.toLowerCase())) && (!onlyLinked || links.some(l => l.rateKey === m.key && l.active))), [materials, q, onlyLinked, links]);
  const linked = links.filter(l => l.active).length;

  async function refresh() {
    setBusy(true); setMsg(null);
    const r = await refreshNow();
    setBusy(false);
    setMsg(r.ok ? { ok: !r.failed.length, text: `Checked ${r.checked} product${r.checked === 1 ? "" : "s"}: ${r.updated} updated${r.failed.length ? `, ${r.failed.length} failed – ${r.failed.slice(0, 3).join("; ")}` : ""}.${r.checked === 0 ? " Everything was checked in the last 20 hours." : ""}` } : { ok: false, text: r.message });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-white p-4">
        <div>
          <h1 className="text-xl font-black">Supplier prices</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">Paste the Selco or Builder Depot product page for each material. Prices are read from the product page once a day; the calculator uses the cheapest current price (converted to ex VAT). {linked} product{linked === 1 ? "" : "s"} linked.</p>
        </div>
        <button disabled={!storage || busy || !linked} onClick={refresh} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Checking…" : "Check prices now"}</button>
        {msg && <p className={`w-full rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</p>}
        {!storage && <p className="w-full rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Needs the new database tables (migration 20261101120000_add_takeoff_quotes).</p>}
        {storage && !cronConfigured && <p className="w-full rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Daily automatic check: set <code>TAKEOFF_CRON_SECRET</code> and call <code>/api/takeoff/prices/refresh</code> once a day (see docs/takeoff-calculator.md). Until then use “Check prices now”.</p>}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"><Search className="h-4 w-4 text-neutral-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search materials" className="w-48 outline-none" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyLinked} onChange={e => setOnlyLinked(e.target.checked)} /> Only linked</label>
      </div>

      <div className="space-y-3">
        {shown.map(m => (
          <section key={m.key} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{m.name}</p><p className="text-xs text-neutral-500">Your fallback price £{m.price.toFixed(2)} / {m.unit}</p></div>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {(["SELCO", "BUILDER_DEPOT"] as const).map(s => {
                const link = links.find(l => l.rateKey === m.key && l.supplier === s);
                const obs = link ? observations.find(o => o.linkId === link.id) : undefined;
                return <LinkRow key={s} supplier={s} unit={m.unit} rateKey={m.key} link={link} obs={obs} disabled={!storage} onSaved={() => router.refresh()} />;
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LinkRow({ supplier, unit, rateKey, link, obs, disabled, onSaved }: { supplier: Supplier; unit: string; rateKey: string; link?: Link; obs?: Obs; disabled: boolean; onSaved: () => void }) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [pack, setPack] = useState(String(link?.packQuantity ?? 1));
  const [vat, setVat] = useState(link?.vatIncluded ?? true);
  const [err, setErr] = useState("");
  const changed = url !== (link?.url ?? "") || Number(pack) !== (link?.packQuantity ?? 1) || vat !== (link?.vatIncluded ?? true);
  async function save() {
    setErr("");
    const r = await saveSupplierLink({ rateKey, supplier, url: url.trim(), packQuantity: Number(pack) || 1, vatIncluded: vat, active: !!url.trim() });
    if (!r.ok) setErr(r.message); else onSaved();
  }
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{names[supplier]}</p>
      <input disabled={disabled} value={url} onChange={e => setUrl(e.target.value)} placeholder={`https://www.${supplier === "SELCO" ? "selcobw.com" : "builderdepot.co.uk"}/product…`} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1">Pack contains <input disabled={disabled} value={pack} onChange={e => setPack(e.target.value)} className="w-14 rounded border px-1.5 py-0.5 text-right" inputMode="decimal" /> {unit}</label>
        <label className="flex items-center gap-1"><input disabled={disabled} type="checkbox" checked={vat} onChange={e => setVat(e.target.checked)} /> Page price includes VAT</label>
        {changed && <button disabled={disabled} onClick={save} className="ml-auto rounded-full bg-neutral-950 px-3 py-1 font-semibold text-white">Save</button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
      {obs && <p className={`mt-2 flex items-center gap-1 text-xs ${obs.status === "OK" ? "text-emerald-800" : "text-amber-800"}`}>
        {obs.status === "OK" ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
        {obs.status === "OK" ? `£${obs.packPrice?.toFixed(2)} per pack → £${obs.unitPriceExVat?.toFixed(2)} ex VAT per ${unit}` : obs.error}
        <span className="text-neutral-500"> · {new Date(obs.observedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></p>}
    </div>
  );
}
