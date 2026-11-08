"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, Search } from "lucide-react";
import type { RateBook } from "@/app/lib/takeoff/types";
import { saveRates } from "./actions";

type Overrides = Record<string, Record<string, unknown>>;
type Edits = { materials: Record<string, { price: number }>; labour: Record<string, { price: number; perDay?: number; daysPerUnit?: number }> };
const groupOfMaterial = (kind: string) => ({ MATERIAL: "Main materials", SUPPORTING: "Supporting materials", PRELIM: "Site costs, plant & fees", HEALTH_SAFETY: "Health & safety" } as Record<string, string>)[kind] ?? kind;

export function RatesEditor({ rates, defaults, version, overrides, storage }: { rates: RateBook; defaults: RateBook; version: number; overrides: Overrides; storage: boolean }) {
  const router = useRouter();
  const initial: Edits = { materials: { ...(overrides.materials as Edits["materials"]) }, labour: { ...(overrides.labour as Edits["labour"]) } };
  const [edits, setEdits] = useState<Edits>(initial);
  const [tab, setTab] = useState<"labour" | "materials">("labour");
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(edits) !== JSON.stringify(initial);

  const labourGroups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const [k, item] of Object.entries(defaults.labour)) { if (q && !item.name.toLowerCase().includes(q.toLowerCase())) continue; g.set(item.group, [...(g.get(item.group) ?? []), k]); }
    return [...g.entries()];
  }, [defaults, q]);
  const materialGroups = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const [k, m] of Object.entries(defaults.materials)) { if (q && !m.name.toLowerCase().includes(q.toLowerCase())) continue; const grp = groupOfMaterial(m.kind); g.set(grp, [...(g.get(grp) ?? []), k]); }
    return [...g.entries()];
  }, [defaults, q]);

  const setLabour = (k: string, v: Partial<Edits["labour"][string]>) => setEdits(e => {
    const base = defaults.labour[k], start = { price: base.price, ...(base.perDay ? { perDay: base.perDay } : {}), ...(base.daysPerUnit !== undefined ? { daysPerUnit: base.daysPerUnit } : {}) };
    const cur = { ...start, ...e.labour[k], ...v };
    const same = cur.price === base.price && (cur.perDay ?? base.perDay) === base.perDay && (cur.daysPerUnit ?? base.daysPerUnit) === base.daysPerUnit;
    const labour = { ...e.labour }; if (same) delete labour[k]; else labour[k] = cur;
    return { ...e, labour };
  });
  const setMaterial = (k: string, price: number) => setEdits(e => {
    const materials = { ...e.materials }; if (price === defaults.materials[k].price) delete materials[k]; else materials[k] = { price };
    return { ...e, materials };
  });

  async function save() {
    setBusy(true);
    const r = await saveRates(version, edits, reason);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `Saved as rates version ${r.version}. New calculations use these prices. Saved quotes keep their own prices until you re-save them.` } : { ok: false, text: r.message });
    if (r.ok) { setReason(""); router.refresh(); }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-white p-4">
        <div>
          <h1 className="text-xl font-black">Labour & material rates</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">Your standard prices for every quote. Change a trade&apos;s price (for example what your plasterer charges per m²) and every new calculation uses it. Rates version {version || "– (defaults)"}.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="What changed? e.g. New decorator prices" className="min-w-0 flex-1 rounded-full border px-4 py-2 text-sm sm:w-64 sm:flex-none" />
          <button disabled={!storage || !dirty || busy || reason.trim().length < 3} onClick={save} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4" />{busy ? "Saving…" : "Save rates"}</button>
        </div>
        {msg && <p className={`w-full rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
        {!storage && <p className="w-full rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">You can look through the rates now. Saving needs the new database tables (migration 20261101120000_add_takeoff_quotes).</p>}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-neutral-100 p-1 text-sm font-semibold">
          {(["labour", "materials"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 ${tab === t ? "bg-white shadow" : "text-neutral-600"}`}>{t === "labour" ? "Labour price list" : "Materials & site costs"}</button>)}
        </div>
        <label className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"><Search className="h-4 w-4 text-neutral-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="w-40 outline-none" /></label>
        <span className="text-xs text-neutral-500"><span className="rounded bg-amber-100 px-1.5 text-amber-800">default</span> = researched price you haven&apos;t confirmed yet</span>
      </div>

      {tab === "labour" && labourGroups.map(([group, keys]) => (
        <section key={group} className="overflow-x-auto rounded-xl border bg-white">
          <h2 className="bg-neutral-50 px-4 py-2 font-bold">{group}</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500"><tr><th className="px-4 py-1.5">Job</th><th className="px-2">Who</th><th className="px-2 text-right">Price</th><th className="px-2 text-right">Output / time</th><th className="px-4 text-right">≈ per person-day</th></tr></thead>
            <tbody>
              {keys.map(k => {
                const base = defaults.labour[k], cur = { ...base, ...edits.labour[k] }, changed = !!edits.labour[k];
                const crew = base.gang.reduce((s, m) => s + m.n, 0);
                const perPersonDay = cur.perDay ? cur.price * cur.perDay / crew : cur.daysPerUnit ? cur.price / cur.daysPerUnit / crew : 0;
                return (
                  <tr key={k} className={`border-t ${changed ? "bg-violet-50" : ""}`}>
                    <td className="px-4 py-2">{base.name} {!base.confirmed && !changed && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs text-amber-800">default</span>}</td>
                    <td className="px-2 py-2 text-xs text-neutral-500">{base.gang.map(g => `${g.n} ${rates.trades[g.trade].name.toLowerCase()}`).join(" + ")}</td>
                    <td className="px-2 py-2 text-right"><NumCell value={cur.price} prefix="£" suffix={`/${base.unit}`} onChange={v => setLabour(k, { price: v })} /></td>
                    <td className="px-2 py-2 text-right">{base.perDay
                      ? <NumCell value={cur.perDay!} suffix={` ${base.unit}/day`} onChange={v => v > 0 && setLabour(k, { perDay: v })} />
                      : <NumCell value={cur.daysPerUnit ?? 0} suffix={` day/${base.unit}`} onChange={v => setLabour(k, { daysPerUnit: v })} />}</td>
                    <td className="px-4 py-2 text-right text-xs text-neutral-600">{perPersonDay ? `£${Math.round(perPersonDay)}` : "–"}
                      {changed && <button title="Back to default" onClick={() => setEdits(e => { const labour = { ...e.labour }; delete labour[k]; return { ...e, labour }; })} className="ml-2 text-neutral-400 hover:text-neutral-800"><RotateCcw className="inline h-3 w-3" /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {tab === "materials" && materialGroups.map(([group, keys]) => (
        <section key={group} className="overflow-x-auto rounded-xl border bg-white">
          <h2 className="bg-neutral-50 px-4 py-2 font-bold">{group}</h2>
          <table className="w-full text-sm"><tbody>
            {keys.map(k => {
              const base = defaults.materials[k], changed = !!edits.materials[k];
              return (
                <tr key={k} className={`border-t ${changed ? "bg-violet-50" : ""}`}>
                  <td className="px-4 py-2">{base.name} {!base.confirmed && !changed && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs text-amber-800">default</span>}</td>
                  <td className="px-4 py-2 text-right"><NumCell value={edits.materials[k]?.price ?? base.price} prefix="£" suffix={`/${base.unit}`} onChange={v => setMaterial(k, v)} />
                    {changed && <button title="Back to default" onClick={() => setMaterial(k, base.price)} className="ml-2 text-neutral-400 hover:text-neutral-800"><RotateCcw className="inline h-3 w-3" /></button>}</td>
                </tr>
              );
            })}
          </tbody></table>
        </section>
      ))}
      <p className="text-xs text-neutral-500">Material prices here are your fallback. Where a Selco or Builder Depot product is linked on the Supplier prices page, the daily supplier price is used instead.</p>
    </div>
  );
}

function NumCell({ value, onChange, prefix = "", suffix = "" }: { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(value);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">{prefix}
      <input className="w-20 rounded border border-neutral-200 px-1.5 py-0.5 text-right focus:border-amber-600 focus:outline-none" inputMode="decimal" value={shown}
        onFocus={() => { setText(String(value)); setFocused(true); }}
        onChange={e => { setText(e.target.value); }}
        onBlur={() => { setFocused(false); const v = Number(text); if (text.trim() !== "" && Number.isFinite(v) && v >= 0 && v !== value) onChange(v); }} />
      <span className="text-xs text-neutral-500">{suffix}</span>
    </span>
  );
}
