"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, HardHat, House, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { FieldValue, PackageSpec } from "@/app/lib/takeoff/package";
import { PackageFields } from "@/app/componets/takeoff/PackageFields";
import { roomTypeOptions } from "@/app/lib/takeoff/schema";
import { instantQuote, type PublicQuoteRequest } from "./actions";

type Result = Awaited<ReturnType<typeof instantQuote>>;
type Room = { name: string; type: string; length: number; width: number; works: Record<string, FieldValue> };
type Packages = Record<string, { enabled: boolean; values: Record<string, FieldValue> }>;
const input = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
const label = "block text-sm font-semibold text-neutral-800";
const button = "inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-bold text-white hover:bg-amber-500 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40";
const gbp = (x: number) => `£${x.toLocaleString("en-GB")}`;

export function InstantQuote({ enabled, specs, roomSpec }: { enabled: boolean; specs: PackageSpec[]; roomSpec: PackageSpec }) {
  const workPackages = specs;
  const [property, setProperty] = useState<PublicQuoteRequest["property"]>({ houseType: "TERRACED", width: 5, length: 7 });
  const [text, setText] = useState({ width: "5", length: "7" });
  const [packages, setPackages] = useState<Packages>({ loft: { enabled: true, values: {} } });
  const [rooms, setRooms] = useState<Room[]>([]);
  const setRoom = (i: number, r: Partial<Room>) => { setRooms(x => x.map((y, j) => (j === i ? { ...y, ...r } : y))); setResult(null); };
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const touch = () => setResult(null);
  const setPkg = (id: string, p: Partial<Packages[string]>) => { setPackages(x => ({ ...x, [id]: { enabled: x[id]?.enabled ?? false, values: x[id]?.values ?? {}, ...p } })); touch(); };
  const needsHouse = workPackages.some(p => p.usesProperty && packages[p.id]?.enabled);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600">Instant guide price</p>
      <h1 className="mt-2 text-4xl font-black text-neutral-950 sm:text-5xl">What will my project cost?</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600">Choose the work and tell us the sizes. We calculate materials, every trade&apos;s time, site costs and health &amp; safety the same way we price a full quote, using current supplier prices.</p>

      {!enabled && <p className="mt-6 rounded-xl bg-amber-50 px-5 py-4 text-amber-900">Online prices are being set up. You can still explore the form, or <Link className="font-bold underline" href="/contact">book a free survey</Link>.</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <form className="space-y-6 lg:col-span-3" onSubmit={async e => {
          e.preventDefault(); setPending(true);
          try { setResult(await instantQuote({ property, packages, rooms })); }
          catch { setResult({ ok: false, message: "We could not calculate a price just now. Please try again." }); }
          finally { setPending(false); }
        }}>
          <fieldset className="rounded-2xl border border-neutral-200 p-6">
            <legend className="px-2 text-lg font-bold">What would you like done?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {workPackages.map(p => {
                const on = packages[p.id]?.enabled ?? false;
                return (
                  <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${on ? "border-amber-500 bg-amber-50" : "border-neutral-200"}`}>
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-amber-600" checked={on} onChange={e => setPkg(p.id, { enabled: e.target.checked })} />
                    <span><span className="block font-bold">{p.label}</span><span className="block text-xs text-neutral-600">{p.description}</span></span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {needsHouse && (
            <fieldset className="rounded-2xl border border-neutral-200 p-6">
              <legend className="flex items-center gap-2 px-2 text-lg font-bold"><House className="h-5 w-5 text-amber-600" /> Your house</legend>
              <label className={label}>House type
                <select className={input} value={property.houseType} onChange={e => { setProperty({ ...property, houseType: e.target.value as PublicQuoteRequest["property"]["houseType"] }); touch(); }}>
                  <option value="TERRACED">Terraced</option><option value="SEMI_OR_END">Semi-detached or end-terrace</option><option value="DETACHED">Detached</option>
                </select>
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["width", "length"] as const).map(k => (
                  <label key={k} className={label}>{k === "width" ? "House width (m)" : "House depth, front to back (m)"}
                    <input className={input} inputMode="decimal" value={text[k]} onChange={e => { setText({ ...text, [k]: e.target.value }); const n = Number(e.target.value); if (Number.isFinite(n)) { setProperty(p => ({ ...p, [k]: n })); touch(); } }} />
                    <span className="mt-1 block text-xs font-normal text-neutral-500">{k === "width" ? "Inside, wall to wall. A rough measurement is fine." : "Of the main house, not including any extension."}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="rounded-2xl border border-neutral-200 p-6">
            <legend className="px-2 text-lg font-bold">Rooms</legend>
            <p className="text-sm text-neutral-600">Add each room that needs work – kitchen, bathroom, bedrooms, hallway – with its size.</p>
            <div className="mt-4 space-y-4">
              {rooms.map((r, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className={`${label} sm:col-span-2`}>Room<select className={input} value={r.type} onChange={e => setRoom(i, { type: e.target.value, name: roomTypeOptions.find(([k]) => k === e.target.value)?.[1] ?? "Room", works: {} })}>{roomTypeOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                    {(["length", "width"] as const).map(k => <label key={k} className={label}>{k === "length" ? "Length (m)" : "Width (m)"}<input className={input} inputMode="decimal" defaultValue={r[k]} onChange={e => { const n = Number(e.target.value); if (e.target.value && Number.isFinite(n)) setRoom(i, { [k]: n }); }} /></label>)}
                  </div>
                  <div className="mt-4"><PackageFields pkg={roomSpec} values={r.works} context={{ roomType: r.type }} onChange={works => setRoom(i, { works })} publicOnly inputClass={input} labelClass={label} /></div>
                  <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs text-red-700" onClick={() => { setRooms(x => x.filter((_, j) => j !== i)); setResult(null); }}><Trash2 className="h-3.5 w-3.5" />Remove room</button>
                </div>
              ))}
            </div>
            {rooms.length < 12 && <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-900 px-4 py-2 text-sm font-bold" onClick={() => { setRooms(x => [...x, { name: "Bedroom", type: "BEDROOM", length: 4, width: 3.5, works: {} }]); setResult(null); }}><Plus className="h-4 w-4" />Add a room</button>}
          </fieldset>

          {workPackages.filter(p => packages[p.id]?.enabled && p.fields.length > 0).map(p => (
            <fieldset key={p.id} className="rounded-2xl border border-neutral-200 p-6">
              <legend className="px-2 text-lg font-bold">{p.label}</legend>
              <PackageFields pkg={p} values={packages[p.id]?.values} onChange={values => setPkg(p.id, { values })} publicOnly inputClass={input} labelClass={label} />
            </fieldset>
          ))}

          <button className={button} disabled={pending}>{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</> : <>Get my guide price <ArrowRight className="h-4 w-4" /></>}</button>
        </form>

        <aside className="lg:col-span-2">
          <div className="rounded-2xl bg-neutral-950 p-6 text-white lg:sticky lg:top-24" aria-live="polite">
            {!result && <><p className="text-neutral-400">Your guide price</p><p className="mt-2 text-3xl font-black">—</p><p className="mt-4 text-sm text-neutral-400">Choose your work, then press “Get my guide price”.</p></>}
            {result && !result.ok && <p className="text-amber-300">{result.message}</p>}
            {result?.ok && <>
              <p className="text-neutral-400">Guide price inc. VAT</p>
              <p className="mt-2 text-3xl font-black">{gbp(result.guide.low)} – {gbp(result.guide.high)}</p>
              <p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-amber-400" /> About {result.weeks} week{result.weeks > 1 ? "s" : ""} on site ({result.workingDays} working days)</p>
              {result.packages.length > 1 && <ul className="mt-4 space-y-1 text-sm">{result.packages.map(p => <li key={p.name} className="flex justify-between gap-3"><span className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-amber-400" />{p.name}</span><span className="text-neutral-300">≈ {gbp(p.approx)}</span></li>)}</ul>}
              <p className="mt-5 flex items-center gap-2 text-sm font-bold"><HardHat className="h-4 w-4 text-amber-400" /> Trades on your project</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-300">{result.trades.map(t => <li key={t.trade}>{t.trade} · {t.days} day{t.days === 1 ? "" : "s"}</li>)}</ul>
              {result.clientSupplies.length > 0 && <p className="mt-4 text-xs text-neutral-300">Not included – you choose and buy: {result.clientSupplies.join(", ").toLowerCase()}.</p>}
              <p className="mt-5 flex items-start gap-2 text-xs text-neutral-400"><ShieldCheck className="h-4 w-4 shrink-0" /> A guide based on your answers. Your fixed quote follows a free site survey and, where needed, a structural engineer&apos;s design.</p>
              <Link href="/contact" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-neutral-950 hover:bg-white">Book a free survey <ArrowRight className="h-4 w-4" /></Link>
            </>}
          </div>
          {result?.ok && <details className="mt-4 rounded-2xl border border-neutral-200 p-5 text-sm"><summary className="cursor-pointer font-bold">What the work involves</summary><ol className="mt-3 list-decimal space-y-1.5 pl-5 text-neutral-700">{result.scope.map(s => <li key={s}>{s}</li>)}</ol></details>}
        </aside>
      </div>
    </main>
  );
}
