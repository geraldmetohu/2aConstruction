"use client";
import { useState } from "react";
import { Building2, CheckCircle2, Hammer, House, LayoutList, Plus, Trash2, Wrench } from "lucide-react";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { roomGeometry } from "@/app/lib/takeoff/modules/rooms";
import { conversionUseOptions } from "@/app/lib/takeoff/modules/conversion";
import { outbuildingTypeOptions } from "@/app/lib/takeoff/modules/outbuilding";
import {
  floorOptions, newRoom, quoteModeOptions, roomTypeOptions, scaffoldElevationOptions, scaffoldModeOptions,
  type QuoteMode, type RoomInput, type TakeoffInput,
} from "@/app/lib/takeoff/schema";
import { TRADES, type RateBook, type TakeoffResult, type Trade } from "@/app/lib/takeoff/types";

const field = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
const gbp0 = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const fmt = (x: number) => Number(x.toFixed(2)).toString();

/* ---------------------------------------------------------------- Client details */

const POSTCODE = /^([A-Z]{1,2}[0-9][A-Z0-9]?) ?([0-9][A-Z]{2})$/;
/** UK postcode in its standard form ("n182hp" → "N18 2HP"), or null when it isn't one. */
export function ukPostcode(raw: string): string | null {
  const m = raw.trim().toUpperCase().replace(/\s+/g, "").match(/^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : raw.trim().toUpperCase() === "GIR 0AA" ? "GIR 0AA" : null;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(\+44\s?|0)(\d\s?){9,10}$/;

export type ClientDetails = { name: string; email: string; address: string };
/** What is still missing before the quote can be saved. */
export function missingClientDetails(c: ClientDetails, input: TakeoffInput): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("client name");
  if (!POSTCODE.test(input.property.postcode.trim().toUpperCase())) out.push("UK postcode");
  if (!EMAIL.test(c.email.trim())) out.push("email");
  if (!PHONE.test(input.terms.clientPhone.replace(/[()-]/g, "").trim())) out.push("phone number");
  return out;
}

export function ClientCard({ client, input, onClient, onPostcode, onPhone, onEmail, quotedBefore }: {
  client: ClientDetails; input: TakeoffInput; onClient: (c: ClientDetails) => void; onPostcode: (p: string) => void; onPhone: (p: string) => void;
  onEmail?: (email: string) => void; quotedBefore?: string;
}) {
  const [pcTouched, setPcTouched] = useState(false);
  const pc = input.property.postcode;
  const pcOk = !pc || POSTCODE.test(pc.trim().toUpperCase());
  const phone = input.terms.clientPhone;
  const phoneOk = !phone || PHONE.test(phone.replace(/[()-]/g, "").trim());
  const emailOk = !client.email || EMAIL.test(client.email.trim());
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Client</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-neutral-700">Client name *
          <input className={field} value={client.name} onChange={e => onClient({ ...client, name: e.target.value })} autoComplete="off" /></label>
        <label className="block text-xs font-semibold text-neutral-700">Postcode *
          <input className={`${field} uppercase ${pcTouched && !pcOk ? "border-red-400" : ""}`} value={pc} placeholder="e.g. N18 2HP"
            onChange={e => onPostcode(e.target.value.toUpperCase().slice(0, 10))}
            onBlur={() => { setPcTouched(true); const f = ukPostcode(pc); if (f) onPostcode(f); }} />
          {pcTouched && !pcOk && <span className="mt-0.5 block font-normal text-red-700">Not a UK postcode</span>}</label>
        <label className="block text-xs font-semibold text-neutral-700">Email * <span className="font-normal text-neutral-500">(they log in with this)</span>
          <input type="email" className={`${field} ${!emailOk ? "border-red-400" : ""}`} value={client.email} onChange={e => { onClient({ ...client, email: e.target.value }); onEmail?.(e.target.value); }} /></label>
        <label className="block text-xs font-semibold text-neutral-700">Phone *
          <input type="tel" className={`${field} ${!phoneOk ? "border-red-400" : ""}`} value={phone} placeholder="07… or +44…" onChange={e => onPhone(e.target.value.slice(0, 40))} />
          {!phoneOk && <span className="mt-0.5 block font-normal text-red-700">Enter a UK number</span>}</label>
        <div className="sm:col-span-2"><label className="block text-xs font-semibold text-neutral-700">Site address
          <input className={field} value={client.address} onChange={e => onClient({ ...client, address: e.target.value })} placeholder="House number, street, town" /></label></div>
        {quotedBefore && <p className="text-xs text-neutral-500 sm:col-span-2">{quotedBefore}</p>}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Quote type */

const modeIcons: Record<QuoteMode, typeof House> = { WHOLE_HOME: House, ROOMS: LayoutList, PROJECT: Building2, TRADE: Wrench };

export function ModePicker({ mode, onChange }: { mode: QuoteMode; onChange: (m: QuoteMode) => void }) {
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />How do you want to quote?</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {quoteModeOptions.map(([k, name, hint]) => {
          const Icon = modeIcons[k]; const on = mode === k;
          return (
            <button key={k} onClick={() => onChange(k)} className={`flex gap-3 rounded-xl border p-3 text-left ${on ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "hover:border-neutral-400"}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${on ? "text-amber-600" : "text-neutral-500"}`} />
              <span><span className="block text-sm font-bold">{name}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{hint}</span></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Whole home: what is included + rooms per floor */

const HOME_PROJECTS = ["loft", "extension", "conversion", "roofing", "external", "demolition", "outbuilding", "garden", "cleaning"];
const REFURB_AREAS: { id: string; label: string; floor: RoomInput["floor"]; types?: RoomInput["type"][] }[] = [
  { id: "GROUND", label: "Ground floor", floor: "GROUND" },
  { id: "FIRST", label: "First floor", floor: "FIRST" },
  { id: "SECOND", label: "Second floor", floor: "SECOND" },
  { id: "LOFT", label: "Loft rooms", floor: "LOFT" },
  { id: "STAIRS", label: "Stairs & landing", floor: "FIRST", types: ["STAIRS", "LANDING"] },
  { id: "HALL", label: "Hallway", floor: "GROUND", types: ["HALL"] },
];
const QUICK_TYPES: RoomInput["type"][] = ["LIVING", "DINING", "KITCHEN", "BEDROOM", "BATHROOM", "ENSUITE", "WC", "OFFICE", "UTILITY", "HALL", "LANDING", "STAIRS"];
const typeName = (t: string) => roomTypeOptions.find(([k]) => k === t)?.[1] ?? t;
const floorName = (f: string) => floorOptions.find(([k]) => k === f)?.[1] ?? f;

export function WholeHome({ input, onPackage, onRooms, onEdit, costs }: {
  input: TakeoffInput; onPackage: (id: string, on: boolean) => void; onRooms: (rooms: RoomInput[]) => void; onEdit: () => void; costs: Record<string, number>;
}) {
  const floors = [...new Set(input.rooms.map(r => r.floor))];
  const [open, setOpen] = useState<string[]>(floors.length ? floors : ["GROUND"]);
  const toggleArea = (a: (typeof REFURB_AREAS)[number]) => {
    if (a.types) {
      const has = input.rooms.some(r => a.types!.includes(r.type));
      if (has) { if (confirm(`Remove ${a.label.toLowerCase()} from the quote?`)) onRooms(input.rooms.filter(r => !a.types!.includes(r.type))); }
      else onRooms([...input.rooms, ...a.types.map(t => ({ ...newRoom(t), floor: t === "HALL" ? "GROUND" as const : a.floor, ...(t === "STAIRS" ? { length: 4, width: 0.9, height: 4.5 } : t === "HALL" || t === "LANDING" ? { length: 4, width: 1.2 } : {}) }))]);
    } else setOpen(o => o.includes(a.floor) ? o.filter(x => x !== a.floor) : [...o, a.floor]);
  };
  const add = (floor: RoomInput["floor"], type: RoomInput["type"]) => {
    const n = input.rooms.filter(r => r.type === type).length;
    onRooms([...input.rooms, { ...newRoom(type, n ? `${typeName(type)} ${n + 1}` : typeName(type)), floor }]);
  };
  const set = (id: string, v: Partial<RoomInput>) => onRooms(input.rooms.map(r => r.id === id ? { ...r, ...v } : r));
  return (
    <>
      <section className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />What the job includes</h2>
        <p className="text-xs text-neutral-500">Tick the projects and the parts of the house being refurbished. Each one gets its full specification in the next steps.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {workPackages.filter(p => HOME_PROJECTS.includes(p.id)).map(p => (
            <label key={p.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={!!input.packages[p.id]?.enabled} onChange={e => onPackage(p.id, e.target.checked)} />{p.label}</label>
          ))}
        </div>
        <p className="pt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">Refurbishment</p>
        <div className="flex flex-wrap gap-1.5">
          {REFURB_AREAS.map(a => {
            const on = a.types ? input.rooms.some(r => a.types!.includes(r.type)) : open.includes(a.floor) || input.rooms.some(r => r.floor === a.floor);
            return <button key={a.id} onClick={() => toggleArea(a)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-amber-500 bg-amber-500 text-neutral-950" : "hover:border-amber-500"}`}>{on && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{a.label}</button>;
          })}
        </div>
      </section>
      {floorOptions.filter(([f]) => open.includes(f) || input.rooms.some(r => r.floor === f)).map(([f]) => {
        const rooms = input.rooms.filter(r => r.floor === f);
        return (
          <section key={f} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex items-baseline justify-between gap-2"><h3 className="font-bold text-[#0d3b72]">{floorName(f)}</h3><span className="text-xs text-neutral-500">{rooms.length} room{rooms.length === 1 ? "" : "s"}{rooms.length ? ` · ${fmt(rooms.reduce((s, r) => s + roomGeometry(r).floor, 0))} m²` : ""}</span></div>
            {rooms.length > 0 && <div className="space-y-2">{rooms.map(r => (
              <div key={r.id} className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] items-end gap-2 sm:grid-cols-[1fr_8rem_4.5rem_4.5rem_auto]">
                <label className="block text-[11px] font-semibold text-neutral-600">Name<input className={field} value={r.name} onChange={e => set(r.id, { name: e.target.value || "Room" })} /></label>
                <label className="hidden text-[11px] font-semibold text-neutral-600 sm:block">Type<select className={field} value={r.type} onChange={e => set(r.id, { type: e.target.value as RoomInput["type"] })}>{roomTypeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <SizeInput label="L (m)" value={r.length} onChange={v => set(r.id, { length: v })} />
                <SizeInput label="W (m)" value={r.width} onChange={v => set(r.id, { width: v })} />
                <div className="flex items-center gap-1 pb-2">
                  {costs[r.name] !== undefined && <span className="hidden text-xs text-neutral-500 md:inline">{gbp0(costs[r.name])}</span>}
                  <button title={`Remove ${r.name}`} onClick={() => onRooms(input.rooms.filter(x => x.id !== r.id))} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}</div>}
            <div className="flex flex-wrap gap-1.5">{QUICK_TYPES.map(t => <button key={t} onClick={() => add(f, t)} className="rounded-full border px-2.5 py-1 text-xs hover:border-amber-500"><Plus className="mr-0.5 inline h-3 w-3" />{typeName(t)}</button>)}</div>
          </section>
        );
      })}
      {input.rooms.length > 0 && <button onClick={onEdit} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"><LayoutList className="h-4 w-4" />Specify each room ({input.rooms.length})</button>}
    </>
  );
}

function SizeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [t, setT] = useState(String(value));
  return <label className="block text-[11px] font-semibold text-neutral-600">{label}<input inputMode="decimal" className={field} value={t} onChange={e => { setT(e.target.value); const n = Number(e.target.value); if (n >= 0.5 && n <= 30) onChange(n); }} onBlur={() => setT(String(value))} /></label>;
}

/* ---------------------------------------------------------------- Project picker */

type Pick = { pkg: string; label: string; match?: [string, string, string]; values?: Record<string, string | boolean> };
const PROJECT_GROUPS: { title: string; items: Pick[] }[] = [
  { title: "Garage conversion", items: conversionUseOptions.map(([k, v]) => ({ pkg: "conversion", label: `Garage → ${v.toLowerCase()}`, match: ["use", k, "OFFICE"], values: { use: k } })) },
  { title: "Garden buildings", items: outbuildingTypeOptions.map(([k, v]) => ({ pkg: "outbuilding", label: v, match: ["type", k, "GARDEN_ROOM"], values: { type: k, ...(k === "SUMMER_HOUSE" || k === "SHED" ? { build: "KIT", insulated: k !== "SHED" } : { build: "BESPOKE", insulated: true }) } })) },
  { title: "House", items: [{ pkg: "loft", label: "Loft conversion" }, { pkg: "extension", label: "Extension" }, { pkg: "roofing", label: "Re-roof" }, { pkg: "demolition", label: "Demolition / strip out" }] },
  { title: "Outside", items: [{ pkg: "external", label: "Render / cladding / EWI" }, { pkg: "garden", label: "Garden & landscaping" }, { pkg: "cleaning", label: "Exterior cleaning" }] },
];

export function ProjectPicker({ input, onPick }: { input: TakeoffInput; onPick: (pkg: string, on: boolean, values?: Record<string, unknown>) => void }) {
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Choose the project</h2>
      <p className="text-xs text-neutral-500">Pick one (or more). Its form opens in the Projects step, with standard specs you can change.</p>
      {PROJECT_GROUPS.map(g => (
        <div key={g.title}>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">{g.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(it => {
              const p = input.packages[it.pkg];
              const on = !!p?.enabled && (!it.match || (p.values[it.match[0]] ?? it.match[2]) === it.match[1]);
              return <button key={it.label} onClick={() => onPick(it.pkg, !on, it.values)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-amber-500 bg-amber-500 text-neutral-950" : "hover:border-amber-500"}`}>{it.label}</button>;
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------------------------------------------------------------- Trade picker */

/** Projects each trade can quote on its own. */
export const packageTrades: Record<string, Trade[]> = {
  loft: ["GENERAL_BUILDER", "CARPENTER", "ROOFER", "PLASTERER", "ELECTRICIAN", "PLUMBER"],
  extension: ["GENERAL_BUILDER", "GROUNDWORKER", "BRICKLAYER", "CARPENTER", "ROOFER", "PLASTERER", "ELECTRICIAN", "PLUMBER"],
  conversion: ["GENERAL_BUILDER", "BRICKLAYER", "CARPENTER", "PLASTERER", "ELECTRICIAN", "PLUMBER"],
  roofing: ["ROOFER", "CARPENTER"], external: ["RENDERER", "DECORATOR", "BRICKLAYER"], demolition: ["LABOURER", "GENERAL_BUILDER"],
  outbuilding: ["CARPENTER", "GENERAL_BUILDER", "ELECTRICIAN", "GROUNDWORKER"], garden: ["LANDSCAPER", "GROUNDWORKER", "CARPENTER", "BRICKLAYER"], cleaning: ["CLEANER"],
};
/** Rooms-based services for each trade. */
const tradeServices: Partial<Record<Trade, string>> = {
  ELECTRICIAN: "Rewires, extra sockets & lights, consumer units, EICR, outside lights", PLUMBER: "Radiators, bathrooms, kitchens, water mains, outside taps",
  DECORATOR: "Walls, ceilings, woodwork, doors, wallpaper, outside masonry paint", CARPENTER: "Doors, skirting, flooring, stud walls, stairs, decking",
  PLASTERER: "Skimming, boarding, patching, render", TILER: "Wall & floor tiling, splashbacks", KITCHEN_FITTER: "Kitchen fit, worktops, appliances",
  ROOFER: "Re-roofs, flat roofs, repairs, fascias & gutters", RENDERER: "Render systems, EWI, repairs", LANDSCAPER: "Lawns, patios, fencing, planting",
  BRICKLAYER: "Walls, piers, infills, chimneys", GROUNDWORKER: "Footings, drainage, slabs, drives", CLEANER: "Windows, jet washing, gutters, roofs",
};

export function TradePicker({ value, onChange, rates }: { value: Trade[]; onChange: (t: Trade[]) => void; rates: RateBook }) {
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Which trade?</h2>
      <p className="text-xs text-neutral-500">Only that trade's services are shown and priced (the quote is tagged by trade, ready for trade log-ins later). Pick more than one for a small multi-trade job.</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {TRADES.filter(t => t !== "LABOURER").map(t => {
          const on = value.includes(t);
          return (
            <button key={t} onClick={() => onChange(on ? value.filter(x => x !== t) : [...value, t])} className={`rounded-lg border px-3 py-2 text-left ${on ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "hover:border-neutral-400"}`}>
              <span className="flex items-center gap-1.5 text-sm font-bold"><Hammer className={`h-3.5 w-3.5 ${on ? "text-amber-600" : "text-neutral-400"}`} />{rates.trades[t]?.name ?? t}</span>
              {tradeServices[t] && <span className="mt-0.5 block text-[11px] text-neutral-500">{tradeServices[t]}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Scaffolding: always asked */

export function ScaffoldCard({ prelims, result, onChange }: { prelims: TakeoffInput["prelims"]; result: TakeoffResult | null; onChange: (v: Partial<TakeoffInput["prelims"]>) => void }) {
  const lines = result?.lines.filter(l => l.rateKey.startsWith("scaffold_") || l.rateKey === "chimney_scaffold") ?? [];
  const toggle = (e: (typeof scaffoldElevationOptions)[number][0]) => onChange({ scaffoldElevations: prelims.scaffoldElevations.includes(e) ? prelims.scaffoldElevations.filter(x => x !== e) : [...prelims.scaffoldElevations, e] });
  return (
    <section className="space-y-3 rounded-xl border-2 border-amber-300 bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Is scaffolding needed?</h2>
      <div className="flex flex-wrap gap-1.5">
        {scaffoldModeOptions.map(([k, v]) => <button key={k} onClick={() => onChange({ scaffoldMode: k, ...(k !== "NO" ? { scaffold: true } : {}) })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${prelims.scaffoldMode === k ? "border-amber-500 bg-amber-500 text-neutral-950" : "hover:border-amber-500"}`}>{v}</button>)}
      </div>
      {prelims.scaffoldMode !== "NO" && <>
        <div>
          <p className="text-xs font-semibold text-neutral-700">Elevations {prelims.scaffoldElevations.length === 0 && <span className="font-normal text-neutral-500">(none ticked = worked out from the projects)</span>}</p>
          <div className="mt-1 flex flex-wrap gap-3">{scaffoldElevationOptions.map(([k, v]) => <label key={k} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={prelims.scaffoldElevations.includes(k)} onChange={() => toggle(k)} />{v}</label>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-neutral-700">Hire weeks (0 = from the programme)
            <input inputMode="numeric" className={field} value={prelims.scaffoldWeeks} onChange={e => { const n = Math.round(Number(e.target.value)); if (Number.isFinite(n) && n >= 0 && n <= 52) onChange({ scaffoldWeeks: n }); }} /></label>
          <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={prelims.chimneyScaffold} onChange={e => onChange({ chimneyScaffold: e.target.checked })} />Chimney scaffold / roof access</label>
        </div>
      </>}
      <p className={`rounded-lg px-3 py-2 text-xs ${lines.length ? "bg-emerald-50 text-emerald-900" : "bg-neutral-50 text-neutral-600"}`}>
        {lines.length ? <>Priced automatically: {lines.map(l => `${l.description.split(" (")[0]} ${l.quantity} ${l.unit}`).join(" + ")} = <strong>{gbp0(lines.reduce((s, l) => s + l.total, 0))}</strong> cost. {lines[0].formula}</>
          : prelims.scaffoldMode === "NO" ? "No scaffold in this quote." : "None of the work needs scaffold – choose “Yes” to add it anyway."}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- Review & confirm */

export function ReviewCard({ result, missing, onSave, canSave, saving, saved, groupBy, onGroupBy }: {
  result: TakeoffResult | null; missing: string[]; onSave: () => void; canSave: boolean; saving: boolean; saved: boolean;
  groupBy: "area" | "process"; onGroupBy: (g: "area" | "process") => void;
}) {
  const unconfirmed = result?.unconfirmedRates.length ?? 0;
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />Review the quote items</h2>
      <p className="text-sm text-neutral-600">Every item is on the right. Change quantities by changing the inputs, edit any unit price, switch a material type, mark items <em>client supplies</em> or <em>not needed</em>, and add your own jobs in Custom work.</p>
      <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
        <span className="py-1 text-neutral-500">Show items</span>
        {([["process", "In order of work – site set-up, first fix, second fix"], ["area", "By room / project"]] as const).map(([k, v]) => <button key={k} onClick={() => onGroupBy(k)} className={`rounded-full border px-3 py-1 ${groupBy === k ? "border-amber-500 bg-amber-500 text-neutral-950" : "hover:border-amber-500"}`}>{v}</button>)}
      </div>
      <ul className="space-y-1 text-sm">
        <Li ok={!missing.length}>{missing.length ? `Still needed: ${missing.join(", ")}` : "Client details complete"}</Li>
        <Li ok={!!result && result.lines.length > 0}>{result?.lines.length ? `${result.lines.length} items priced` : "No work added yet"}</Li>
        <Li ok={!unconfirmed}>{unconfirmed ? `${unconfirmed} lines use researched default prices (standard spec) – the client can change finishes later` : "All prices are your own"}</Li>
        <Li ok>{result?.scaffolding.included ? "Scaffolding included" : "No scaffolding"}</Li>
      </ul>
      <button disabled={!canSave || saving || missing.length > 0} onClick={onSave} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        <CheckCircle2 className="h-4 w-4" />{saving ? "Saving…" : saved ? "Confirm & save new version" : "Confirm & save as draft"}</button>
      <p className="text-xs text-neutral-500">Drafts can be edited later from Saved quotes. Choose the quote layout (simple, normal or itemised) in the next step before sending.</p>
    </section>
  );
}
function Li({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-emerald-600" : "text-neutral-300"}`} /><span className={ok ? "" : "text-amber-800"}>{children}</span></li>;
}
