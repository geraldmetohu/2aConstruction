"use client";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { buildQuoteLayout } from "@/app/lib/takeoff/quote-format";
import { customItemSchema, newRoom, quoteFormatOptions, roomTypeOptions, type CustomItem, type RoomInput, type TakeoffInput } from "@/app/lib/takeoff/schema";
import { TRADES, type RateBook, type TakeoffResult, type Trade } from "@/app/lib/takeoff/types";
import type { Field } from "@/app/lib/takeoff/package";
import { saveJobToLibrary } from "./actions";

const field = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankWording: TakeoffInput["wording"] = { intro: "", rows: {}, lines: {}, options: [], notes: "" };

/** Room field groups and the trades that do them (to hide the rest when only some trades are priced). */
export const roomGroupTrades: Record<string, Trade[]> = {
  "Strip out": ["LABOURER", "GENERAL_BUILDER"], Plastering: ["PLASTERER"], Painting: ["DECORATOR"], "Floor & joinery": ["CARPENTER", "TILER"],
  "Electrics & heating": ["ELECTRICIAN", "PLUMBER"], "Doors & windows": ["CARPENTER"], Kitchen: ["KITCHEN_FITTER", "PLUMBER", "ELECTRICIAN", "TILER"],
  Bathroom: ["PLUMBER", "TILER", "ELECTRICIAN"], Plumbing: ["PLUMBER"],
  // Project sections that belong to one family of trades (sizes and structure always stay visible).
  Electrics: ["ELECTRICIAN"], "Render system": ["RENDERER"], Preparation: ["RENDERER", "LABOURER", "GENERAL_BUILDER"], Finish: ["RENDERER", "DECORATOR"],
  "Clearance & trees": ["LANDSCAPER", "LABOURER"], Lawn: ["LANDSCAPER"], "Patio & paths": ["LANDSCAPER", "GROUNDWORKER"], Driveway: ["GROUNDWORKER", "LANDSCAPER"],
  Decking: ["CARPENTER", "LANDSCAPER"], "Fencing & walls": ["LANDSCAPER", "CARPENTER", "BRICKLAYER"], Planting: ["LANDSCAPER"], Maintenance: ["LANDSCAPER"],
  Windows: ["CLEANER"], "Hard surfaces": ["CLEANER"], "Roof & walls": ["CLEANER"],
  "Levels & structures": ["GROUNDWORKER", "CARPENTER", "LANDSCAPER"], "Lighting & water": ["ELECTRICIAN", "LANDSCAPER", "GROUNDWORKER"],
};
export const fieldsForTrades = (fields: Field[], trades: Trade[]) =>
  !trades.length ? fields : fields.filter(f => !f.group || !roomGroupTrades[f.group] || roomGroupTrades[f.group].some(t => trades.includes(t)));

/* ---------------------------------------------------------------- Trades */

export function TradeFilter({ value, onChange, rates }: { value: Trade[]; onChange: (t: Trade[]) => void; rates: RateBook }) {
  const toggle = (t: Trade) => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Trades in this quote</h2>
        {value.length > 0 && <button onClick={() => onChange([])} className="text-xs font-semibold text-amber-700 hover:underline">Price every trade</button>}
      </div>
      <p className="text-xs text-neutral-500">{value.length ? "Only the trades ticked are priced; room forms show only their sections. Site set-up and your own custom jobs are always kept." : "Every trade is priced. Pick trades to price a single-trade job, e.g. only carpentry or only electrics."}</p>
      <div className="flex flex-wrap gap-1.5">
        {TRADES.map(t => {
          const on = value.includes(t);
          return <button key={t} onClick={() => toggle(t)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? "border-amber-500 bg-amber-500 text-neutral-950" : "hover:border-amber-500"}`}>{rates.trades[t]?.name ?? t}</button>;
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Custom work */

let seq = 0;
const newItem = (): CustomItem => customItemSchema.parse({ id: `c${Date.now().toString(36)}${(seq++).toString(36)}`, title: "New item", price: 0 });

export function CustomWork({ items, onChange, areas, rates, margins, library = [], canSave = false }: {
  items: CustomItem[]; onChange: (items: CustomItem[]) => void; areas: string[]; rates: RateBook; margins: TakeoffInput["commercial"];
  library?: CustomItem[]; canSave?: boolean;
}) {
  const [jobs, setJobs] = useState(library);
  const [note, setNote] = useState("");
  const set = (id: string, v: Partial<CustomItem>) => onChange(items.map(i => i.id === id ? { ...i, ...v } : i));
  const cm = (1 + margins.contingencyPercent / 100) * (1 + margins.markupPercent / 100), w = 1 + margins.wastePercent / 100;
  const clientPrice = (i: CustomItem) => i.priceMode === "CLIENT" ? (i.price + i.materialPrice) * i.quantity
    : (i.price * (i.kind === "MATERIAL" ? w : 1) + i.materialPrice * w) * i.quantity * cm;
  async function saveJob(i: CustomItem) {
    const r = await saveJobToLibrary(i);
    if (r.ok) { setJobs(r.jobs); setNote(`"${i.title}" saved to your jobs.`); } else setNote(r.message);
  }
  async function removeJob(id: string) {
    const r = await saveJobToLibrary(null, id);
    if (r.ok) setJobs(r.jobs); else setNote(r.message);
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Custom work</h2>
      <p className="text-xs text-neutral-500">Anything not in the standard price list – a bespoke job, a provisional sum, a specialist. Give it a title, description, trade and price; it appears in the scope and price like any other item.</p>
      {items.map(i => (
        <div key={i.id} className="space-y-3 rounded-lg border border-neutral-200 p-3">
          <div className="flex items-start gap-2">
            <label className="block flex-1 text-xs font-semibold text-neutral-700">Title<input className={field} value={i.title} maxLength={120} onChange={e => set(i.id, { title: e.target.value })} /></label>
            <button title="Remove" onClick={() => { if (confirm(`Remove "${i.title}"?`)) onChange(items.filter(x => x.id !== i.id)); }} className="mt-6 text-neutral-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>
          <label className="block text-xs font-semibold text-neutral-700">Description (what the client reads)
            <textarea rows={2} className={field} value={i.description} maxLength={2000} onChange={e => set(i.id, { description: e.target.value })} placeholder="e.g. Build two oak floating shelves in each alcove, oiled finish, concealed fixings" /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-neutral-700">Trade<select className={field} value={i.trade} onChange={e => set(i.id, { trade: e.target.value as Trade })}>{TRADES.map(t => <option key={t} value={t}>{rates.trades[t]?.name ?? t}</option>)}</select></label>
            <label className="block text-xs font-semibold text-neutral-700">Where<select className={field} value={i.area} onChange={e => set(i.id, { area: e.target.value })}><option value="">Additional works</option>{areas.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
            <label className="block text-xs font-semibold text-neutral-700">Type<select className={field} value={i.kind} onChange={e => set(i.id, { kind: e.target.value as CustomItem["kind"] })}><option value="LABOUR">Labour / job</option><option value="MATERIAL">Materials / product</option></select></label>
            <NumIn label="Quantity" value={i.quantity} min={0.01} onChange={v => set(i.id, { quantity: v })} />
            <label className="block text-xs font-semibold text-neutral-700">Unit<input className={field} value={i.unit} maxLength={20} onChange={e => set(i.id, { unit: e.target.value || "item" })} /></label>
            <NumIn label="Price per unit (£, ex VAT)" value={i.price} onChange={v => set(i.id, { price: v })} />
            <label className="block text-xs font-semibold text-neutral-700">The price is<select className={field} value={i.priceMode} onChange={e => set(i.id, { priceMode: e.target.value as CustomItem["priceMode"] })}><option value="CLIENT">What the client pays</option><option value="COST">Our cost (add margins)</option></select></label>
            <NumIn label="Days on site" value={i.days} onChange={v => set(i.id, { days: v })} />
            <label className="block text-xs font-semibold text-neutral-700">Part of the job<select className={field} value={i.phase} onChange={e => set(i.id, { phase: e.target.value as CustomItem["phase"] })}><option value="FIRST_FIX">Structure & first fix</option><option value="SECOND_FIX">Second fix & finishes</option></select></label>
            <NumIn label="Materials per unit (£, optional)" value={i.materialPrice} onChange={v => set(i.id, { materialPrice: v })} />
            <label className="block text-xs font-semibold text-neutral-700">VAT<select className={field} value={i.vatPercent === null ? "" : String(i.vatPercent)} onChange={e => set(i.id, { vatPercent: e.target.value === "" ? null : Number(e.target.value) })}>
              <option value="">Same as the quote ({margins.vatPercent}%)</option><option value="0">0% (zero-rated)</option><option value="5">5% (reduced)</option><option value="20">20% (standard)</option></select></label>
            <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={i.provisional} onChange={e => set(i.id, { provisional: e.target.checked })} />Provisional sum</label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-neutral-600">Client pays <strong>{gbp(clientPrice(i))}</strong> + VAT{i.priceMode === "COST" ? ` (cost ${gbp((i.price + i.materialPrice) * i.quantity)} + margins)` : ""}{i.provisional ? " · provisional sum" : ""}.</p>
            {canSave && <button onClick={() => saveJob(i)} className="text-xs font-semibold text-amber-700 hover:underline">Save to my jobs</button>}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onChange([...items, newItem()])} className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add custom job</button>
        {jobs.length > 0 && <select className="rounded-full border px-4 py-2 text-sm" value="" onChange={e => { const j = jobs.find(x => x.id === e.target.value); if (j) onChange([...items, { ...j, id: newItem().id }]); }}>
          <option value="">+ Add one of your saved jobs…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title} – £{j.price + j.materialPrice}/{j.unit}</option>)}</select>}
      </div>
      {note && <p className="text-xs text-emerald-800">{note}</p>}
      {jobs.length > 0 && <details className="text-xs text-neutral-600"><summary className="cursor-pointer font-semibold">Your saved jobs ({jobs.length})</summary>
        <ul className="mt-1 space-y-1">{jobs.map(j => <li key={j.id} className="flex items-center justify-between gap-2"><span>{j.title} · {rates.trades[j.trade]?.name} · £{j.price + j.materialPrice}/{j.unit}</span>
          <button onClick={() => { if (confirm(`Remove "${j.title}" from your saved jobs?`)) removeJob(j.id); }} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></li>)}</ul></details>}
    </section>
  );
}

function NumIn({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  return (
    <label className="block text-xs font-semibold text-neutral-700">{label}
      <input className={field} inputMode="decimal" value={text} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setText(String(value)); }}
        onChange={e => { setText(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== "" && Number.isFinite(n) && n >= min) onChange(n); }} />
    </label>
  );
}

/* ---------------------------------------------------------------- Layout & wording */

export function WordingEditor({ input, result, rates, onChange }: {
  input: TakeoffInput; result: TakeoffResult; rates: RateBook; onChange: (fn: (i: TakeoffInput) => TakeoffInput) => void;
}) {
  const w = input.wording;
  const setW = (v: Partial<TakeoffInput["wording"]>) => onChange(i => ({ ...i, wording: { ...i.wording, ...v } }));
  const setTerms = (v: Partial<TakeoffInput["terms"]>) => onChange(i => ({ ...i, terms: { ...i.terms, ...v } }));
  // Automatic wording (placeholders) and every item, whatever format is chosen.
  const auto = useMemo(() => buildQuoteLayout(result, { ...input, wording: blankWording, terms: { ...input.terms, format: "ITEMISED" } }, rates.trades), [result, input, rates.trades]);
  const setRow = (key: string, v: Partial<{ title: string; text: string; hidden: boolean }>) => {
    const was = w.rows[key];
    const cur = { title: v.title ?? was?.title ?? "", text: v.text ?? was?.text ?? "", hidden: v.hidden ?? was?.hidden ?? false };
    const rows = { ...w.rows };
    if (!cur.title && !cur.text && !cur.hidden) delete rows[key]; else rows[key] = cur;
    setW({ rows });
  };
  const setLine = (id: string, text: string) => { const lines = { ...w.lines }; if (text.trim()) lines[id] = text; else delete lines[id]; setW({ lines }); };
  const [openRow, setOpenRow] = useState<string | null>(null);
  // Edits that no longer match anything (work removed or changed since they were written).
  const rowKeys = new Set(auto.groups.flatMap(g => g.rows.map(r => r.key)));
  const itemIds = new Set(auto.groups.flatMap(g => g.rows.flatMap(r => (r.items ?? []).map(i => i.id))));
  const lostRows = Object.keys(w.rows).filter(k => !rowKeys.has(k)), lostLines = Object.keys(w.lines).filter(k => !itemIds.has(k));
  const dropLost = () => setW({ rows: Object.fromEntries(Object.entries(w.rows).filter(([k]) => rowKeys.has(k))), lines: Object.fromEntries(Object.entries(w.lines).filter(([k]) => itemIds.has(k))) });

  return (
    <>
      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />How the price is set out</h2>
        <div className="grid gap-2">
          {quoteFormatOptions.map(([k, l]) => {
            const [name, desc] = l.split(" – ");
            return (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${input.terms.format === k ? "border-amber-500 bg-amber-50" : "hover:border-neutral-400"}`}>
                <input type="radio" name="quote-format" className="mt-1 accent-amber-600" checked={input.terms.format === k} onChange={() => setTerms({ format: k })} />
                <span><span className="block text-sm font-bold">{name}</span><span className="block text-xs text-neutral-600">{desc}</span></span>
              </label>
            );
          })}
        </div>
        <label className="block text-xs font-semibold text-neutral-700">Group the scope by
          <select className={field} value={input.terms.groupBy} onChange={e => setTerms({ groupBy: e.target.value as TakeoffInput["terms"]["groupBy"] })}><option value="AREA">Room / project (the order work is done)</option><option value="TRADE">Trade (who does what)</option></select></label>
        <p className="text-xs text-neutral-500">Every format carries the full information – description, scope, programme, payments, exclusions and terms. Only the level of price detail changes. Check it on the Documents tab.</p>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Covering letter</h2>
        <label className="block text-xs font-semibold text-neutral-700">Opening paragraphs (blank = written for you; leave a blank line between paragraphs)
          <textarea rows={5} className={field} value={w.intro} maxLength={4000} onChange={e => setW({ intro: e.target.value })}
            placeholder={"Thank you for asking us to quote for … Following our visit we have set out below exactly what is included …\n\nOur price for the works is … plus VAT …"} /></label>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Scope wording</h2>
          {(Object.keys(w.rows).length > 0 || Object.keys(w.lines).length > 0) && <button onClick={() => { if (confirm("Reset all scope wording to automatic?")) setW({ rows: {}, lines: {} }); }} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"><RotateCcw className="h-3.5 w-3.5" />Reset all</button>}
        </div>
        {lostRows.length + lostLines.length > 0 && <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {lostRows.length + lostLines.length} wording edit{lostRows.length + lostLines.length > 1 ? "s" : ""} no longer match{lostRows.length + lostLines.length > 1 ? "" : "es"} any step – the work was removed or changed{lostRows.length ? ` (${lostRows.map(k => w.rows[k].title || k.split("::").pop()).slice(0, 4).join(", ")})` : ""}.
          <button onClick={dropLost} className="ml-2 font-semibold underline">Remove them</button></div>}
        <p className="text-xs text-neutral-500">Change the title or description of any step, or hide a step (its price moves into the first step of the same section). Item descriptions are used on itemised quotes.</p>
        <div className="space-y-4">
          {auto.groups.map(g => (
            <div key={g.key}>
              <p className="flex justify-between text-xs font-bold uppercase tracking-wide text-neutral-500"><span>{g.title}</span><span>{gbp(g.net)}</span></p>
              <div className="mt-1.5 space-y-2">
                {g.rows.map(r => {
                  const cur = w.rows[r.key], hidden = cur?.hidden === true, open = openRow === r.key;
                  return (
                    <div key={r.key} className={`rounded-lg border p-3 ${hidden ? "bg-neutral-50 opacity-60" : ""} ${cur && !hidden ? "border-violet-300" : ""}`}>
                      <div className="flex items-start gap-2">
                        <input aria-label="Step title" className="min-w-0 flex-1 rounded-md border border-transparent px-1 py-0.5 text-sm font-semibold hover:border-neutral-300 focus:border-amber-500 focus:outline-none" value={cur?.title ?? ""} placeholder={r.title} maxLength={160} onChange={e => setRow(r.key, { title: e.target.value })} />
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{gbp(r.net)}</span>
                        <button title={hidden ? "Show this step" : "Hide this step (price stays in)"} onClick={() => setRow(r.key, { hidden: !hidden })} className="shrink-0 text-neutral-400 hover:text-neutral-800">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                      {r.trades && r.trades.length > 0 && <p className="mt-1 flex flex-wrap items-center gap-1 px-1 text-[11px] text-neutral-500" title="Internal only – never shown to the client"><span className="font-semibold">Trades:</span>{r.trades.map(t => <span key={t} className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">{t}</span>)}<span className="ml-1 italic">(internal)</span></p>}
                      <textarea aria-label="Step description" rows={2} className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none" value={cur?.text ?? ""} placeholder={r.text} maxLength={4000} onChange={e => setRow(r.key, { text: e.target.value })} />
                      {r.items && r.items.length > 0 && <button onClick={() => setOpenRow(open ? null : r.key)} className="mt-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900">{open ? "Hide items" : `Edit item descriptions (${r.items.length})`}</button>}
                      {open && <div className="mt-2 space-y-1">{r.items?.map(it => (
                        <div key={it.id} className="flex items-center gap-2 text-xs">
                          <input className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1 focus:border-amber-500 focus:outline-none" value={w.lines[it.id] ?? ""} placeholder={it.description} maxLength={300} onChange={e => setLine(it.id, e.target.value)} />
                          <span className="w-24 shrink-0 text-right text-neutral-500">{Number(it.quantity.toFixed(2))} {it.unit}</span>
                          <span className="w-20 shrink-0 text-right tabular-nums">{it.byClient ? "client" : gbp(it.net ?? 0)}</span>
                        </div>
                      ))}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Optional extras</h2>
        <p className="text-xs text-neutral-500">Offered to the client but not in the price (e.g. upgrades). Priced extras can be ticked by the client in their portal; “Added” puts it in the price now. Leave the price blank for “price on request”.</p>
        {w.options.map((o, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input className={`${field} mt-0 flex-1`} value={o.title} maxLength={200} onChange={e => setW({ options: w.options.map((x, j) => j === idx ? { ...x, title: e.target.value } : x) })} />
            <input className={`${field} mt-0 w-32`} inputMode="decimal" placeholder="£ ex VAT" value={o.price ?? ""} onChange={e => { const t = e.target.value.trim(), n = Number(t); setW({ options: w.options.map((x, j) => j === idx ? { ...x, price: t === "" ? null : Number.isFinite(n) && n >= 0 ? n : x.price } : x) }); }} />
            <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" className="h-4 w-4 accent-amber-600" disabled={o.price === null} checked={o.chosen} onChange={e => setW({ options: w.options.map((x, j) => j === idx ? { ...x, chosen: e.target.checked } : x) })} />Added</label>
            <button title="Remove" onClick={() => setW({ options: w.options.filter((_, j) => j !== idx) })} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={() => setW({ options: [...w.options, { title: "Optional extra", price: null, chosen: false }] })} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:border-amber-500"><Plus className="h-4 w-4" />Add option</button>
      </section>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Notes &amp; provisional sums</h2>
        <textarea rows={4} className={field} value={w.notes} maxLength={4000} onChange={e => setW({ notes: e.target.value })} placeholder="e.g. A provisional sum of £500 is included for making good after the rewire; adjusted to actual cost." />
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Loft rooms */

const LOFT_TYPES = ["BEDROOM", "ENSUITE", "BATHROOM", "OFFICE", "LANDING", "WC", "KITCHEN", "OTHER"] as const;

/** Loft fitted out room by room: say how many rooms, pick what each is, then set its works in Rooms. Totals add up with the loft shell. */
export function LoftRooms({ rooms, onChange, onEdit, costs, shellCost }: {
  rooms: RoomInput[]; onChange: (rooms: RoomInput[]) => void; onEdit: () => void; costs: Record<string, number>; shellCost: number;
}) {
  const loft = rooms.filter(r => r.floor === "LOFT");
  const others = rooms.filter(r => r.floor !== "LOFT");
  const make = (type: RoomInput["type"], i: number): RoomInput => {
    const label = roomTypeOptions.find(([k]) => k === type)?.[1] ?? "Room";
    const r = newRoom(type, `Loft ${label.toLowerCase()}${type === "BEDROOM" ? ` ${i}` : ""}`);
    // New rooms in a new loft: nothing to strip; fire doors are in the loft shell; wet rooms get a new suite.
    const wet = type === "ENSUITE" || type === "BATHROOM" || type === "WC";
    return { ...r, floor: "LOFT", doors: 0, height: 2.3, length: wet ? 2.2 : 3.8, width: wet ? 1.8 : 3.2,
      works: { strip: "NONE", ...(wet ? { bathroomRefit: true, layout: type === "ENSUITE" ? "SHOWER" : "BATH_SHOWER" } : { flooring: "CARPET", electrics: "ADD" }), ...(type === "KITCHEN" ? { kitchenRefit: true } : {}) } };
  };
  const setCount = (n: number) => {
    const next = [...loft];
    while (next.length < n) next.push(make("BEDROOM", next.filter(r => r.type === "BEDROOM").length + 1));
    next.length = Math.max(0, n);
    onChange([...others, ...next]);
  };
  const setType = (id: string, type: RoomInput["type"]) => onChange(rooms.map(r => r.id === id ? { ...make(type, 1), id: r.id, name: r.name.startsWith("Loft ") ? make(type, loft.filter(x => x.type === type).length + 1).name : r.name } : r));
  const roomsTotal = loft.reduce((s, r) => s + (costs[r.name] ?? 0), 0);
  return (
    <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-[#0d3b72]"><span className="h-4 w-1 rounded-full bg-amber-500" />Rooms in the loft</p>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">How many
          <select className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm" value={loft.length} onChange={e => setCount(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      {loft.length === 0 && <p className="text-xs text-neutral-600">Add the rooms the loft will have – e.g. 2 bedrooms and an en-suite. Each one gets its own works (flooring, electrics, heating, bathroom suite, decoration…).</p>}
      <ul className="space-y-1.5">
        {loft.map(r => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
            <select aria-label="Room type" className="rounded border border-neutral-300 px-1.5 py-1 text-xs" value={r.type} onChange={e => setType(r.id, e.target.value as RoomInput["type"])}>
              {LOFT_TYPES.map(t => <option key={t} value={t}>{roomTypeOptions.find(([k]) => k === t)?.[1]}</option>)}</select>
            <span className="text-xs tabular-nums text-neutral-500">{r.length} × {r.width} m</span>
            <span className="w-20 text-right text-xs font-semibold tabular-nums">{costs[r.name] ? gbp(costs[r.name]) : "—"}</span>
          </li>
        ))}
      </ul>
      {loft.length > 0 && <>
        <button onClick={onEdit} className="text-xs font-semibold text-amber-700 hover:underline">Set each room's size and works in step 2 (Rooms) →</button>
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-white p-2 text-xs">
          <div><dt className="text-neutral-500">Loft shell</dt><dd className="font-semibold tabular-nums">{gbp(shellCost)}</dd></div>
          <div><dt className="text-neutral-500">Loft rooms</dt><dd className="font-semibold tabular-nums">{gbp(roomsTotal)}</dd></div>
          <div><dt className="text-neutral-500">Loft total (cost)</dt><dd className="font-bold tabular-nums text-[#0d3b72]">{gbp(shellCost + roomsTotal)}</dd></div>
        </dl>
      </>}
    </div>
  );
}
