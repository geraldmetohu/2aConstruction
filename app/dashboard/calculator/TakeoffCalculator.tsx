"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Calculator, ChevronDown, ChevronUp, ClipboardList, Copy, FileText, HardHat, History, House, LayoutList,
  Eye, EyeOff, Lock, PenLine, Plus, Printer, RotateCcw, Save, Send, Settings2, Trash2, Users, Wrench,
} from "lucide-react";
import { calculateTakeoff, customerTakeoff } from "@/app/lib/takeoff/engine";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { roomFields, roomGeometry, roomTypeDefaults } from "@/app/lib/takeoff/modules/rooms";
import { toSpec } from "@/app/lib/takeoff/package";
import {
  accessOptions, ageOptions, constructionOptions, defaultTakeoffInput, floorOptions, houseTypeOptions, newRoom, occupancyOptions,
  parkingOptions, roomTypeOptions, takeoffInputSchema, type CustomItem, type RoomInput, type TakeoffInput,
} from "@/app/lib/takeoff/schema";
import { phaseLabels, priceSourceLabels, type PriceSource, type PriceTable, type RateBook, type TakeoffLine, type TakeoffResult, type Trade } from "@/app/lib/takeoff/types";
import { isClientFinish, materialVariants } from "@/app/lib/takeoff/ratebook";
import { PackageFields } from "@/app/componets/takeoff/PackageFields";
import { DocumentsViewer } from "@/app/componets/takeoff/DocumentsViewer";
import { buildDocuments } from "@/app/lib/takeoff/documents";
import { defaultCompany, missingCompanyFields, type CompanyProfile } from "@/app/lib/takeoff/company";

const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
import { saveTakeoffQuote, sendTakeoffQuote } from "./actions";
import { CustomWork, fieldsForTrades, LoftRooms, TradeFilter, WordingEditor } from "./QuoteExtras";

const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const gbp0 = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const field = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200";
const btn = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40";
const sourceTone: Record<PriceSource, string> = {
  LIVE_SUPPLIER: "bg-emerald-100 text-emerald-800", CATALOGUE: "bg-sky-100 text-sky-800", COMPANY_RATE: "bg-neutral-200 text-neutral-800",
  DEFAULT: "bg-neutral-100 text-neutral-600", MANUAL: "bg-violet-100 text-violet-800",
};
const roomSpec = { fields: roomFields, defaults: Object.fromEntries(roomFields.map(f => [f.key, f.default])) };
const label = (opts: readonly (readonly [string, string])[], v: string) => opts.find(([k]) => k === v)?.[1] ?? v;
const STORAGE = "2a-takeoff-draft-v3";

type Step = "house" | "rooms" | "projects" | "extras" | "site" | "wording";
type Tab = "breakdown" | "trades" | "programme" | "choices" | "documents" | "history";
type Commercial = { markupPercent: number; wastePercent: number; contingencyPercent: number } | null;
type Client = { name: string; email: string; address: string };
export type SavedQuote = {
  id: string; reference: string; status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"; version: number; publishedVersion: number | null;
  client: Client; input: TakeoffInput;
  versions: { version: number; reason: string; gross: number | null; visibleToClient: boolean; createdAt: string }[];
  events: { kind: string; message: string; actorKind: string; createdAt: string }[];
};

export function TakeoffCalculator({ rates, prices, notes, commercial, storage, saved, company = defaultCompany, savedJobs = [], clientFormats = {} }: {
  rates: RateBook; prices: PriceTable; notes: string[]; commercial: Commercial; storage: boolean; saved: SavedQuote | null; company?: CompanyProfile;
  savedJobs?: CustomItem[]; clientFormats?: Record<string, { format: string; groupBy: string }>;
}) {
  const router = useRouter();
  const fresh = () => {
    const d = defaultTakeoffInput();
    const terms = { ...d.terms, format: company.quoteFormat ?? d.terms.format, groupBy: company.quoteGroupBy ?? d.terms.groupBy };
    return { ...d, terms, ...(commercial ? { commercial: { ...d.commercial, ...commercial } } : {}) };
  };
  const [formatTouched, setFormatTouched] = useState(!!saved);
  const [input, setInput] = useState<TakeoffInput>(() => saved?.input ?? fresh());
  const [client, setClient] = useState<Client>(saved?.client ?? { name: "", email: "", address: "" });
  const [step, setStep] = useState<Step>("house");
  const [tab, setTab] = useState<Tab>("breakdown");
  const [last, setLast] = useState<TakeoffResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"" | "save" | "send">("");
  const [reason, setReason] = useState("");
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  // Unsaved drafts for a new quote are kept in this browser only.
  useEffect(() => {
    if (saved) return;
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
      const p = takeoffInputSchema.safeParse(s?.input);
      if (p.success) setInput(p.data);
      if (s?.client) setClient(c => ({ ...c, ...s.client }));
    } catch { /* optional */ }
  }, [saved]);
  useEffect(() => { if (!saved) try { localStorage.setItem(STORAGE, JSON.stringify({ input, client })); } catch { /* ignore */ } }, [input, client, saved]);

  const computed = useMemo(() => {
    try { return { result: calculateTakeoff(input, prices, rates), error: "" }; }
    catch (e) { return { result: null, error: e instanceof Error ? e.message.slice(0, 300) : "Check the inputs." }; }
  }, [input, prices, rates]);
  useEffect(() => { if (computed.result) setLast(computed.result); }, [computed.result]);
  const result = computed.result ?? last;

  const update = (fn: (i: TakeoffInput) => TakeoffInput) => { setInput(fn); setDirty(true); };
  const setProp = (v: Partial<TakeoffInput["property"]>) => update(i => ({ ...i, property: { ...i.property, ...v } }));
  const setPrelims = (v: Partial<TakeoffInput["prelims"]>) => update(i => ({ ...i, prelims: { ...i.prelims, ...v } }));
  const setTerms = (v: Partial<TakeoffInput["terms"]>) => update(i => ({ ...i, terms: { ...i.terms, ...v } }));
  const setCommercial = (v: Partial<TakeoffInput["commercial"]>) => update(i => ({ ...i, commercial: { ...i.commercial, ...v } }));
  const setPkg = (id: string, p: Partial<{ enabled: boolean; values: Record<string, number | boolean | string> }>) =>
    update(i => ({ ...i, packages: { ...i.packages, [id]: { enabled: i.packages[id]?.enabled ?? false, values: i.packages[id]?.values ?? {}, ...p } } }));
  const setRoom = (id: string, r: Partial<RoomInput>) => update(i => {
    const was = i.rooms.find(x => x.id === id);
    const next = { ...i, rooms: i.rooms.map(x => x.id === id ? { ...x, ...r } : x) };
    return was && r.name !== undefined && r.name !== was.name ? renameArea(next, was.name, r.name) : next;
  });
  const chooseMaterial = (materialKey: string, key: string | null) => update(i => {
    const materialChoices = { ...i.materialChoices };
    if (key === null) delete materialChoices[materialKey]; else materialChoices[materialKey] = key;
    return { ...i, materialChoices };
  });
  /** Stores only differences from the default (finishes by client), so the default can still be switched later. */
  const setClientSupply = (materialKey: string, on: boolean, byDefault: boolean) => update(i => {
    const clientSupply = { ...i.clientSupply };
    if (on === byDefault) delete clientSupply[materialKey]; else clientSupply[materialKey] = on;
    return { ...i, clientSupply };
  });
  const setExcluded = (lineId: string, off: boolean) => update(i => {
    const excluded = { ...i.excluded };
    if (off) excluded[lineId] = true; else delete excluded[lineId];
    return { ...i, excluded };
  });
  const editPrice = (key: string, value: number | null) => update(i => {
    const priceEdits = { ...i.priceEdits };
    if (value === null) delete priceEdits[key]; else priceEdits[key] = value;
    return { ...i, priceEdits };
  });

  const sent = saved?.status === "SENT";
  const accepted = saved?.status === "ACCEPTED";
  async function save() {
    setSaving("save"); setFlash(null);
    const r = await saveTakeoffQuote({ quoteId: saved?.id, expectedVersion: saved?.version, client: { clientName: client.name, clientEmail: client.email, siteAddress: client.address }, input, reason: reason || (saved ? "" : "First version") });
    setSaving("");
    if (!r.ok) { setFlash({ ok: false, text: r.message }); return; }
    setDirty(false); setReason("");
    try { if (!saved) localStorage.removeItem(STORAGE); } catch { /* ignore */ }
    setFlash({ ok: true, text: r.notified ? `Saved version ${r.version}. The client will see an "updated" notice when they log in.` : `Draft saved (version ${r.version}). The client can't see it until you press Send to client.` });
    router.push(`/dashboard/calculator?quote=${r.id}`); router.refresh();
  }
  async function send() {
    if (!saved) return;
    if (!confirm(`Send version ${saved.version} to ${saved.client.email}? They get an email with a link and see it when they log in with that email.`)) return;
    setSaving("send");
    const r = await sendTakeoffQuote(saved.id);
    setSaving("");
    setFlash(r.ok ? { ok: true, text: `Version ${r.version} is now visible to the client in their portal.${r.emailed ? " We've emailed them a link." : " (No email was sent – check the email settings, or send them the link yourself.)"}` } : { ok: false, text: r.message });
    router.refresh();
  }

  const steps: [Step, string, ReactNode, string][] = [
    ["house", "1. House", <House key="h" className="h-4 w-4" />, "Client & general description"],
    ["rooms", `2. Rooms (${input.rooms.length})`, <LayoutList key="r" className="h-4 w-4" />, "Sizes and work in each room"],
    ["projects", "3. Projects", <HardHat key="p" className="h-4 w-4" />, "Loft, extension, roof, render, garden, cleaning"],
    ["extras", `4. Custom work (${input.customItems.length})`, <Wrench key="e" className="h-4 w-4" />, "Jobs you price by hand"],
    ["site", "5. Site & margins", <Settings2 key="s" className="h-4 w-4" />, "Site costs, H&S, terms, markup"],
    ["wording", "6. Quote layout", <PenLine key="w" className="h-4 w-4" />, "Simple / normal / itemised, wording"],
  ];
  const areaNames = [...input.rooms.map(r => r.name), ...workPackages.filter(p => input.packages[p.id]?.enabled).map(p => p.label)];

  return (
    <div className="space-y-5">
      {/* ---------- Quote bar ---------- */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black"><Calculator className="h-6 w-6 text-amber-600" />{saved ? saved.reference : "New quote"}
            {saved && <StatusBadge status={saved.status} />}{saved && <span className="text-sm font-medium text-neutral-500">version {saved.version}{dirty ? " · unsaved changes" : ""}</span>}</h1>
          <p className="mt-1 text-xs text-neutral-500">{saved ? (sent ? "Sent to the client. Saving changes creates a new version and the client is told in their portal." : accepted ? "Accepted by the client – read only." : "Draft – only you can see it. Change anything, save as often as you like, then send it to the client.") : "Fill in the steps on the left. Saving keeps it as a draft – the client sees nothing until you send it."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(saved || dirty) && !accepted && <input value={reason} onChange={e => setReason(e.target.value)} placeholder={saved ? "What changed? (required)" : "Note (optional)"} className="w-full rounded-full border px-4 py-2 text-sm sm:w-56" />}
          {!accepted && <button disabled={!storage || !!saving || (saved ? !dirty || reason.trim().length < 3 : false)} onClick={save} className={`${btn} ${sent ? "bg-amber-500 text-neutral-950" : "bg-neutral-950 text-white"}`} title={storage ? "" : "Needs the new database tables"}>
            <Save className="h-4 w-4" />{saving === "save" ? "Saving…" : sent ? "Save & notify client" : "Save draft"}</button>}
          {saved && saved.status === "DRAFT" && <button disabled={dirty || !!saving} onClick={send} className={`${btn} border border-amber-500 text-amber-700`} title={dirty ? "Save first" : ""}><Send className="h-4 w-4" />{saving === "send" ? "Sending…" : "Send to client"}</button>}
          {saved && <a href={`/dashboard/calculator/pdf?quote=${saved.id}`} target="_blank" rel="noopener noreferrer" className={`${btn} border`} title={dirty ? "PDF of the last saved version" : ""}><FileText className="h-4 w-4" />PDF</a>}
          <button onClick={() => { if (!dirty || confirm("Start a new quote? Unsaved changes will be lost.")) { try { localStorage.removeItem(STORAGE); } catch { /* */ } router.push("/dashboard/calculator"); if (!saved) { setInput(fresh()); setClient({ name: "", email: "", address: "" }); setDirty(false); } } }} className={`${btn} border`}><RotateCcw className="h-4 w-4" />New</button>
        </div>
        {flash && <p className={`w-full rounded-lg px-3 py-2 text-sm ${flash.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{flash.text}</p>}
        {!storage && <p className="w-full rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Calculating works now. Saving, sending and the client portal start working once the new database tables are applied (migration 20261101120000_add_takeoff_quotes).</p>}
      </header>
      {notes.filter(n => !n.includes("database tables")).map(n => <p key={n} className="rounded-lg bg-sky-50 px-4 py-2 text-xs text-sky-900 print:hidden">{n}</p>)}

      <div className="grid gap-6 xl:grid-cols-12">
        {/* ---------- Steps ---------- */}
        <div className="min-w-0 space-y-4 xl:col-span-5 print:hidden">
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {steps.map(([k, name, icon, hint]) => (
              <button key={k} onClick={() => setStep(k)} className={`rounded-xl border p-3 text-left ${step === k ? "border-amber-500 bg-amber-50" : "bg-white hover:border-neutral-400"}`}>
                <span className="flex items-center gap-2 text-sm font-bold">{icon}{name}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{hint}</span>
              </button>
            ))}
          </nav>

          {step === "house" && <>
            <Card title="Client">
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Client name" value={client.name} onChange={v => { setClient({ ...client, name: v }); setDirty(true); }} />
                <Text label="Client email (they log in with this)" value={client.email} onChange={v => {
                  setClient({ ...client, email: v }); setDirty(true);
                  // A client we've quoted before gets the same layout as last time (until you choose one yourself).
                  const prev = clientFormats[v.trim().toLowerCase()];
                  if (prev && !formatTouched) update(i => ({ ...i, terms: { ...i.terms, format: prev.format as TakeoffInput["terms"]["format"], groupBy: prev.groupBy as TakeoffInput["terms"]["groupBy"] } }));
                }} />
                {clientFormats[client.email.trim().toLowerCase()] && !saved && <p className="text-xs text-neutral-500 sm:col-span-2">Quoted before – using their last layout ({clientFormats[client.email.trim().toLowerCase()].format.toLowerCase()}).</p>}
                <div className="sm:col-span-2"><Text label="Site address" value={client.address} onChange={v => { setClient({ ...client, address: v }); setDirty(true); }} /></div>
              </div>
            </Card>
            <Card title="The house">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="House type" value={input.property.houseType} options={houseTypeOptions} onChange={v => setProp({ houseType: v as TakeoffInput["property"]["houseType"] })} />
                <Num label="Width (m)" hint="Party wall to party wall" value={input.property.width} onChange={v => setProp({ width: v })} />
                <Num label="Depth (m)" hint="Front to back" value={input.property.length} onChange={v => setProp({ length: v })} />
                <Num label="Storeys" int value={input.property.storeys} onChange={v => setProp({ storeys: v })} />
                <Num label="Bedrooms" int value={input.property.bedrooms} onChange={v => setProp({ bedrooms: v })} />
                <Select label="Built" value={input.property.age} options={ageOptions} onChange={v => setProp({ age: v as TakeoffInput["property"]["age"] })} />
                <Select label="Walls" value={input.property.construction} options={constructionOptions} onChange={v => setProp({ construction: v as TakeoffInput["property"]["construction"] })} />
                <Select label="During works" value={input.property.occupancy} options={occupancyOptions} onChange={v => setProp({ occupancy: v as TakeoffInput["property"]["occupancy"] })} />
                <Select label="Parking" value={input.property.parking} options={parkingOptions} onChange={v => setProp({ parking: v as TakeoffInput["property"]["parking"] })} />
                <Select label="Access" value={input.property.access} options={accessOptions} onChange={v => setProp({ access: v as TakeoffInput["property"]["access"] })} />
              </div>
              <label className="block text-xs font-semibold text-neutral-700">General description / notes
                <textarea className={`${field} min-h-24`} value={input.property.notes} onChange={e => setProp({ notes: e.target.value })} placeholder="e.g. Victorian mid-terrace, original lath & plaster ceilings, damp in rear reception, access via side return…" />
              </label>
            </Card>
            <TradeFilter value={input.trades} rates={rates} onChange={trades => update(i => ({ ...i, trades }))} />
            <NextStep onClick={() => setStep("rooms")} label="Next: rooms" />
          </>}

          {step === "rooms" && <>
            {input.rooms.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-neutral-600">Add each room that needs work, with its size. Then tick what is needed in it: plastering, painting, flooring, electrics, heating, doors, windows, a new kitchen or bathroom.</p>}
            {input.trades.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Pricing {input.trades.map(t => rates.trades[t]?.name.toLowerCase() ?? t).join(", ")} only – room forms show just those sections. Change it in step 1.</p>}
            {input.rooms.map((room, idx) => <RoomCard key={room.id} room={room} index={idx} count={input.rooms.length} trades={input.trades}
              onChange={r => setRoom(room.id, r)}
              onRemove={() => update(i => ({ ...i, rooms: i.rooms.filter(x => x.id !== room.id) }))}
              onDuplicate={() => update(i => { const copy = { ...newRoom(room.type), ...room, id: newRoom().id, name: `${room.name} (copy)` }; const rooms = [...i.rooms]; rooms.splice(idx + 1, 0, copy); return { ...i, rooms }; })}
              onMove={d => update(i => { const rooms = [...i.rooms]; const j = idx + d; if (j < 0 || j >= rooms.length) return i; [rooms[idx], rooms[j]] = [rooms[j], rooms[idx]]; return { ...i, rooms }; })}
              cost={result?.areas.find(a => a.area === room.name)?.cost} />)}
            <AddRoom onAdd={(type, name) => update(i => ({ ...i, rooms: [...i.rooms, newRoom(type, name)] }))} existing={input.rooms} />
            <NextStep onClick={() => setStep("projects")} label="Next: projects" />
          </>}

          {step === "projects" && <>
            <p className="text-xs text-neutral-500">Whole-house projects. The loft uses the house width and depth from step 1.</p>
            {workPackages.map(pkg => {
              const on = input.packages[pkg.id]?.enabled ?? false;
              return (
                <section key={pkg.id} className={`space-y-3 rounded-xl border bg-white p-4 ${on ? "border-amber-400" : ""}`}>
                  <label className="flex cursor-pointer items-start justify-between gap-3">
                    <span><span className="block font-bold text-[#0d3b72]">{pkg.label}</span><span className="block text-xs text-neutral-500">{pkg.description}</span></span>
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-amber-600" checked={on} onChange={e => setPkg(pkg.id, { enabled: e.target.checked })} />
                  </label>
                  {on && <PackageFields pkg={(() => { const sp = toSpec(pkg); return input.trades.length ? { ...sp, fields: fieldsForTrades(sp.fields, input.trades) } : sp; })()} values={input.packages[pkg.id]?.values} onChange={values => setPkg(pkg.id, { values })} inputClass={field} showClientChoice />}
                  {on && pkg.id === "loft" && input.packages.loft?.values.fitOutBy === "ROOMS" && input.packages.loft?.values.fitOut !== false && (
                    <LoftRooms rooms={input.rooms} onChange={rooms => update(i => ({ ...i, rooms }))} onEdit={() => setStep("rooms")}
                      costs={Object.fromEntries((result?.areas ?? []).map(a => [a.area, a.cost]))} shellCost={result?.areas.find(a => a.area === pkg.label)?.cost ?? 0} />
                  )}
                </section>
              );
            })}
            <NextStep onClick={() => setStep("extras")} label="Next: custom work" />
          </>}

          {step === "extras" && <>
            <CustomWork items={input.customItems} areas={areaNames} rates={rates} margins={input.commercial} library={savedJobs} canSave={storage} onChange={customItems => update(i => ({ ...i, customItems }))} />
            <NextStep onClick={() => setStep("site")} label="Next: site & margins" />
          </>}

          {step === "wording" && (result
            ? <WordingEditor input={input} result={result} rates={rates} onChange={fn => { setFormatTouched(true); update(fn); }} />
            : <p className="rounded-xl border border-dashed p-4 text-sm text-neutral-600">Add some work first – the scope table is built from it.</p>)}

          {step === "site" && <>
            <Card title="Site set-up & health and safety">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Check label="Scaffolding (when needed)" value={input.prelims.scaffold} onChange={v => setPrelims({ scaffold: v })} />
                <Check label="Welfare unit" value={input.prelims.welfare} onChange={v => setPrelims({ welfare: v })} />
                <Check label="Protection of floors & stairs" value={input.prelims.siteProtection} onChange={v => setPrelims({ siteProtection: v })} />
                <Check label="Building control (loft / extension)" value={input.prelims.buildingControl} onChange={v => setPrelims({ buildingControl: v })} />
                <Check label="Structural engineer" value={input.prelims.structuralEngineer} onChange={v => setPrelims({ structuralEngineer: v })} />
                <Check label="Final clean" value={input.prelims.finalClean} onChange={v => setPrelims({ finalClean: v })} />
                <Check label="Health & safety pack" value={input.prelims.healthSafety} onChange={v => setPrelims({ healthSafety: v })} />
                <Check label="Work out skips automatically" value={input.prelims.autoSkips} onChange={v => setPrelims({ autoSkips: v })} />
                <Check label="New consumer unit (board + RCBOs)" value={input.prelims.consumerUnit} onChange={v => setPrelims({ consumerUnit: v })} />
                <Check label="Electrical test & certificate (once for the job)" value={input.prelims.electricalCertificate} onChange={v => setPrelims({ electricalCertificate: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {!input.prelims.autoSkips && <Num label="Skips" int value={input.prelims.skips} onChange={v => setPrelims({ skips: v })} />}
                <Num label="Party wall neighbours" int value={input.prelims.partyWallNeighbours} onChange={v => setPrelims({ partyWallNeighbours: v })} />
              </div>
            </Card>
            <Card title="House services (plumbing)">
              <div className="grid gap-3 sm:grid-cols-3">
                <Num label="New water main (m, 0 = none)" value={input.prelims.waterMainRun} onChange={v => setPrelims({ waterMainRun: v })} />
                <Num label="Outside taps" int value={input.prelims.outsideTaps} onChange={v => setPrelims({ outsideTaps: v })} />
              </div>
              <Check label="Move / renew the internal stopcock" value={input.prelims.moveStopcock} onChange={v => setPrelims({ moveStopcock: v })} />
            </Card>
            <Card title="Quotation & contract terms">
              <Text label="Quote title (blank = automatic)" value={input.terms.title} onChange={v => setTerms({ title: v })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-neutral-700">Planned start date
                  <input type="date" className={field} value={input.terms.startDate} onChange={e => setTerms({ startDate: e.target.value })} /></label>
                <Num label="Deposit %" value={input.terms.depositPercent} onChange={v => setTerms({ depositPercent: v })} />
                <Num label="Stage payments" int value={input.terms.stagePayments} onChange={v => setTerms({ stagePayments: v })} />
                <Num label="Final payment %" value={input.terms.finalPercent} onChange={v => setTerms({ finalPercent: v })} />
                <Num label="Pay invoices within (days)" int value={input.terms.paymentDays} onChange={v => setTerms({ paymentDays: v })} />
                <Num label="Quote valid for (days)" int value={input.terms.validityDays} onChange={v => setTerms({ validityDays: v })} />
                <Num label="Workmanship guarantee (years)" int value={input.terms.guaranteeYears} onChange={v => setTerms({ guaranteeYears: v })} />
                <Text label="Client phone" value={input.terms.clientPhone} onChange={v => setTerms({ clientPhone: v })} />
              </div>
              <Text label="Client address (if different from the site)" value={input.terms.clientAddress} onChange={v => setTerms({ clientAddress: v })} />
              <label className="block text-xs font-semibold text-neutral-700">Extra exclusions (one per line)
                <textarea rows={3} className={field} value={input.terms.exclusions} onChange={e => setTerms({ exclusions: e.target.value })} /></label>
              <p className="text-xs text-neutral-500">The Documents tab builds the quotation, payment schedule with dates, contract, {input.terms.guaranteeYears}-year guarantee, construction phase plan, risk assessment and method statements from these.</p>
            </Card>
            <Card title="Who buys the finishes">
              <Check label="Client supplies finishes: tiles, bathroom suite & shower, kitchen units & worktops, flooring, light fittings" value={input.finishesByClient} onChange={v => update(i => ({ ...i, finishesByClient: v }))} />
              <Check label="Labour only – the client buys all materials (we give them the full list)" value={input.labourOnly} onChange={v => update(i => ({ ...i, labourOnly: v }))} />
              <p className="text-xs text-neutral-500">They are listed for the client to order (with quantities) and left out of your price. Untick “Client supplies” on any line to supply it yourself.</p>
            </Card>
            <Card title="Margins & VAT">
              <div className="grid gap-3 sm:grid-cols-4">
                <Num label="Waste %" value={input.commercial.wastePercent} onChange={v => setCommercial({ wastePercent: v })} />
                <Num label="Contingency %" value={input.commercial.contingencyPercent} onChange={v => setCommercial({ contingencyPercent: v })} />
                <Num label="Markup %" value={input.commercial.markupPercent} onChange={v => setCommercial({ markupPercent: v })} />
                <Num label="VAT %" value={input.commercial.vatPercent} onChange={v => setCommercial({ vatPercent: v })} />
              </div>
              <Check label="0% VAT on external wall insulation (energy-saving materials relief, to 31 March 2027)" value={input.commercial.esmZeroRate} onChange={v => setCommercial({ esmZeroRate: v })} />
              <p className="text-xs text-neutral-500">Custom jobs can carry their own VAT rate. Check unusual cases with your accountant.</p>
            </Card>
            <Card title="Discount">
              <div className="grid gap-3 sm:grid-cols-3">
                <Num label="Discount %" value={input.commercial.discountPercent} onChange={v => setCommercial({ discountPercent: v })} />
                <Num label="Discount £ (ex VAT)" value={input.commercial.discountAmount} onChange={v => setCommercial({ discountAmount: v })} />
                <Text label="Shown as" value={input.commercial.discountLabel} onChange={v => setCommercial({ discountLabel: v })} />
              </div>
              {result && result.totals.discount > 0 && <p className="text-xs text-neutral-600">Discount {gbp(result.totals.discount)} off {gbp(result.totals.netBeforeDiscount)}; it comes off your profit ({gbp0(result.totals.markup - result.totals.discount)} left).</p>}
            </Card>
            <NextStep onClick={() => setStep("wording")} label="Next: quote layout & wording" />
          </>}
        </div>

        {/* ---------- Results ---------- */}
        <div className="min-w-0 space-y-4 xl:col-span-7">
          {computed.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 print:hidden">Check the inputs: {computed.error}</p>}
          {result && <>
            <section className="rounded-2xl bg-neutral-950 p-5 text-white print:hidden">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm text-neutral-400">Total inc. VAT</p><p className="text-3xl font-black sm:text-4xl">{gbp(result.totals.gross)}</p></div>
                <div className="grid w-full grid-cols-3 gap-3 text-sm sm:w-auto sm:gap-5">
                  <Stat label="Net" value={gbp0(result.totals.net)} />
                  <Stat label="Programme" value={`${result.programme.workingDays} days`} sub={`≈ ${result.programme.weeks} wk`} />
                  <Stat label="Profit" value={gbp0(result.totals.markup - result.totals.discount)} sub={result.totals.discount ? `after ${gbp0(result.totals.discount)} discount` : `${input.commercial.markupPercent}% markup`} />
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300"><Lock className="h-3.5 w-3.5" />Margins – only you see these. The client sees prices with them already included in every part.</p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {([["Profit markup %", "markupPercent", result.totals.markup], ["Contingency %", "contingencyPercent", result.totals.contingency], ["Waste %", "wastePercent", result.totals.waste]] as const).map(([lab, key, amount]) => (
                    <label key={key} className="text-xs text-neutral-400">{lab}
                      <input aria-label={lab} inputMode="decimal" className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-base font-bold text-white" value={input.commercial[key]}
                        onChange={e => { const n = Number(e.target.value); if (e.target.value.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 300) setCommercial({ [key]: n }); }} />
                      <span className="mt-0.5 block text-neutral-300">{gbp0(amount)}</span>
                    </label>
                  ))}
                </div>
              </div>
              {result.areas.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-xs">{result.areas.map(a => <span key={a.area} className="rounded-full bg-white/10 px-3 py-1">{a.area} · {gbp0(a.cost)} cost</span>)}</div>}
              {result.unconfirmedRates.length > 0 && <p className="mt-3 flex items-start gap-2 text-xs text-amber-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {result.unconfirmedRates.length} lines use researched default prices. Set your own on the Rates page, or link supplier prices.</p>}
              {result.warnings.map(w => <p key={w} className="mt-2 text-xs text-red-300">{w}</p>)}
            </section>

            <nav className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1 text-sm font-semibold sm:grid-cols-6 print:hidden">
              {([["breakdown", "Breakdown", ClipboardList], ["trades", "Trades", HardHat], ["programme", "Programme", Calculator], ["choices", `Client choices (${result.clientChoices.length})`, Users], ["documents", "Documents", Printer], ["history", "History", History]] as const)
                .filter(([k]) => k !== "history" || saved)
                .map(([k, name, Icon]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 ${tab === k ? "bg-white shadow" : "text-neutral-600"}`}><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{name}</span></button>)}
            </nav>

            {tab === "breakdown" && <><PriceSummary result={result} /><Breakdown result={result} input={input} rates={rates} editPrice={editPrice} chooseMaterial={chooseMaterial} setClientSupply={setClientSupply} setExcluded={setExcluded} /></>}
            {tab === "trades" && <Trades result={result} />}
            {tab === "programme" && <Programme result={result} />}
            {tab === "choices" && <Choices result={result} />}
            {tab === "documents" && <DocumentsViewer warnings={missingCompanyFields(company)} docs={buildDocuments({ customer: customerTakeoff(result, input), input, company,
              client: { name: client.name, email: client.email, siteAddress: client.address }, reference: saved?.reference ?? "DRAFT", version: saved?.version ?? 1, issueDate: todayIso() })} />}
            {tab === "history" && saved && <HistoryTab saved={saved} />}
          </>}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ Rooms */

/** A room's name is part of the keys for its choices, removed lines and wording edits: carry them over on rename. */
function renameArea(i: TakeoffInput, from: string, to: string): TakeoffInput {
  const move = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [k.startsWith(`${from}::`) ? `${to}::${k.slice(from.length + 2)}` : k.endsWith(`::${from}`) && k.startsWith("trade:") ? `${k.slice(0, -from.length)}${to}` : k, v]));
  return { ...i, materialChoices: move(i.materialChoices), clientSupply: move(i.clientSupply), excluded: move(i.excluded),
    wording: { ...i.wording, rows: move(i.wording.rows), lines: move(i.wording.lines) },
    customItems: i.customItems.map(c => c.area === from ? { ...c, area: to } : c) };
}

function RoomCard({ room, index, count, onChange, onRemove, onDuplicate, onMove, cost, trades = [] }: {
  trades?: Trade[];
  room: RoomInput; index: number; count: number; onChange: (r: Partial<RoomInput>) => void; onRemove: () => void; onDuplicate: () => void; onMove: (d: number) => void; cost?: number;
}) {
  const [open, setOpen] = useState(true);
  const g = roomGeometry(room);
  return (
    <section className="rounded-xl border bg-white">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          <span className="truncate font-bold">{room.name}</span>
          <span className="truncate text-xs text-neutral-500">{label(roomTypeOptions, room.type)} · {fmt(room.length)} × {fmt(room.width)} m · {fmt(g.floor)} m²</span>
        </button>
        {cost !== undefined && <span className="shrink-0 text-xs font-semibold text-neutral-700">{gbp0(cost)} cost</span>}
        <button title="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="text-neutral-400 hover:text-neutral-800 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
        <button title="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="text-neutral-400 hover:text-neutral-800 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
        <button title="Duplicate room" onClick={onDuplicate} className="text-neutral-400 hover:text-neutral-800"><Copy className="h-4 w-4" /></button>
        <button title="Remove room" onClick={() => { if (confirm(`Remove ${room.name}?`)) onRemove(); }} className="text-neutral-400 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
      </header>
      {open && <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Text label="Room name" value={room.name} onChange={v => onChange({ name: v || "Room" })} />
          <Select label="Type" value={room.type} options={roomTypeOptions} onChange={v => {
            // New type: electrical items restart from that type's typical numbers.
            const works = { ...room.works }; for (const k of Object.keys(roomTypeDefaults(room.type))) delete works[k];
            onChange({ type: v as RoomInput["type"], works });
          }} />
          <Select label="Floor" value={room.floor} options={floorOptions} onChange={v => onChange({ floor: v as RoomInput["floor"] })} />
          <Num label="Length (m)" value={room.length} onChange={v => onChange({ length: v })} />
          <Num label="Width (m)" value={room.width} onChange={v => onChange({ width: v })} />
          <Num label="Ceiling height (m)" value={room.height} onChange={v => onChange({ height: v })} />
          <Num label="Doors" int value={room.doors} onChange={v => onChange({ doors: v })} />
          <Num label="Windows" int value={room.windows} onChange={v => onChange({ windows: v })} />
          <Num label="Radiators" int value={room.radiators} onChange={v => onChange({ radiators: v })} />
        </div>
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">Floor & ceiling {fmt(g.floor)} m² · walls {fmt(g.walls)} m² (less doors & windows) · skirting {fmt(g.skirting)} m</p>
        <Text label="Notes about this room" value={room.notes} onChange={v => onChange({ notes: v })} />
        <div className="border-t pt-3"><p className="mb-2 text-sm font-bold">Work needed</p>
          <PackageFields pkg={trades.length ? { ...roomSpec, fields: fieldsForTrades(roomSpec.fields, trades) } : roomSpec} values={{ ...roomTypeDefaults(room.type), ...room.works }} context={{ roomType: room.type }} onChange={works => onChange({ works })} inputClass={field} showClientChoice />
        </div>
      </div>}
    </section>
  );
}

function AddRoom({ onAdd, existing }: { onAdd: (type: RoomInput["type"], name: string) => void; existing: RoomInput[] }) {
  const [type, setType] = useState<RoomInput["type"]>("BEDROOM");
  const add = (t: RoomInput["type"]) => {
    const base = label(roomTypeOptions, t), n = existing.filter(r => r.type === t).length;
    onAdd(t, n ? `${base} ${n + 1}` : base);
  };
  return (
    <section className="space-y-2 rounded-xl border border-dashed bg-white p-4">
      <p className="text-sm font-bold">Add a room</p>
      <div className="flex gap-2">
        <select className={`${field} mt-0`} value={type} onChange={e => setType(e.target.value as RoomInput["type"])}>{roomTypeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button onClick={() => add(type)} className={`${btn} shrink-0 bg-neutral-950 text-white`}><Plus className="h-4 w-4" />Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">{(["BEDROOM", "LIVING", "KITCHEN", "BATHROOM", "HALL", "LANDING"] as const).map(t => <button key={t} onClick={() => add(t)} className="rounded-full border px-3 py-1 text-xs hover:border-amber-500">+ {label(roomTypeOptions, t)}</button>)}</div>
    </section>
  );
}

/* ================================================================ Results tabs */

function PriceSummary({ result }: { result: TakeoffResult }) {
  const t = result.totals;
  const markupShare = t.costSubtotal > 0 ? (t.net) / (t.costSubtotal - t.waste) : 1;
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="font-bold">Price summary</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500"><tr><th className="py-1">Part of the job</th><th className="text-right">Materials</th><th className="text-right">Labour</th><th className="text-right">Site costs</th><th className="text-right">Cost</th><th className="text-right">Selling (ex VAT)</th></tr></thead>
          <tbody>
            {result.phases.map(p => <tr key={p.phase} className="border-t"><td className="py-1.5">{phaseLabels[p.phase]}</td><td className="text-right">{gbp0(p.materials)}</td><td className="text-right">{gbp0(p.labour)}</td><td className="text-right">{gbp0(p.siteCosts)}</td><td className="text-right font-semibold">{gbp0(p.total)}</td><td className="text-right">{gbp0(p.total * markupShare)}</td></tr>)}
            <tr className="border-t font-bold"><td className="py-1.5">Total</td><td className="text-right">{gbp0(t.material + t.supporting)}</td><td className="text-right">{gbp0(t.labour)}</td><td className="text-right">{gbp0(t.prelim + t.healthSafety)}</td><td className="text-right">{gbp0(t.costSubtotal - t.waste)}</td><td className="text-right">{gbp0(t.net)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <p className={`rounded-lg px-3 py-2 ${result.scaffolding.included ? "bg-emerald-50 text-emerald-900" : "bg-neutral-50 text-neutral-700"}`}>Scaffolding: <strong>{result.scaffolding.included ? `included (${gbp0(result.scaffolding.cost)} cost)` : "not included"}</strong></p>
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sky-900">Client supplies: <strong>{result.clientOrders.length ? `${result.clientOrders.length} item${result.clientOrders.length > 1 ? "s" : ""} (≈ ${gbp0(result.clientOrders.reduce((s, o) => s + o.estimate, 0))}, not in our price)` : "nothing"}</strong></p>
      </div>
      {result.clientOrders.length > 0 && <ul className="mt-2 space-y-1 text-xs text-neutral-700">{result.clientOrders.map((o, i) => <li key={i}>• {o.area}: {o.description} – {o.quantity} {o.unit}</li>)}</ul>}
      {(() => { const n = result.lines.filter(l => l.excluded).length; return n ? <p className="mt-2 text-xs text-neutral-600">{n} line{n > 1 ? "s" : ""} marked “not needed” (shown faded below, not in the price).</p> : null; })()}
    </section>
  );
}

function Breakdown({ result, input, rates, editPrice, chooseMaterial, setClientSupply, setExcluded }: { result: TakeoffResult; input: TakeoffInput; rates: RateBook; editPrice: (k: string, v: number | null) => void; chooseMaterial: (mk: string, key: string | null) => void; setClientSupply: (mk: string, on: boolean, byDefault: boolean) => void; setExcluded: (id: string, off: boolean) => void }) {
  const t = result.totals, c = input.commercial;
  return (
    <div className="space-y-4">
      {result.areas.map(area => {
        const lines = result.lines.filter(l => l.area === area.area);
        const stages = [...new Set(lines.map(l => l.stage))];
        return (
          <details key={area.area} open className="overflow-hidden rounded-xl border bg-white">
            <summary className="flex cursor-pointer items-center justify-between gap-3 bg-neutral-50 px-4 py-3">
              <span className="font-bold">{area.area}</span><span className="text-sm text-neutral-600"><strong className="text-neutral-900">{gbp(area.cost)}</strong> cost</span>
            </summary>
            {stages.map(stage => (
              <div key={stage}>
                <p className="border-t bg-white px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{stage.replace(/^[^·]+· /, "")}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm"><tbody>
                    {lines.filter(l => l.stage === stage).map(l => (
                      <tr key={l.key} className={`align-top ${l.excluded ? "bg-neutral-50 opacity-40" : ""}`}>
                        <td className="px-4 py-2">
                          <div className="flex gap-3">
                            {l.imageUrl && <img src={l.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded border object-contain" loading="lazy" />}
                            <div className="min-w-0">
                              <p className={`font-medium ${l.excluded ? "line-through" : ""}`}>{l.kind === "LABOUR" && <HardHat className="mr-1 inline h-3.5 w-3.5 text-amber-600" />}{l.description}{l.excluded && <span className="ml-1 rounded bg-neutral-200 px-1.5 text-xs font-semibold text-neutral-700 no-underline">not in quote</span>} {!l.confirmed && <span title="Researched default – confirm" className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">confirm</span>}{l.clientSupplied && <span className="ml-1 rounded bg-sky-100 px-1.5 text-xs font-semibold text-sky-800">client supplies</span>}</p>
                              <p className="mt-0.5 text-xs text-neutral-500">{l.formula}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                                <button onClick={() => setExcluded(l.lineId, !l.excluded)} title={l.excluded ? "Put back in the quote" : "Not needed – take out of the quote"} className="inline-flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-600 hover:border-neutral-500">
                                  {l.excluded ? <><Eye className="h-3 w-3" />Put back</> : <><EyeOff className="h-3 w-3" />Not needed</>}
                                </button>
                                {!l.excluded && <LineOptions line={l} rates={rates} input={input} chooseMaterial={chooseMaterial} setClientSupply={setClientSupply} />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">{l.quantity} {l.unit}</td>
                        <td className="px-2 py-2">
                          <PriceInput value={l.unitPrice} edited={input.priceEdits[l.rateKey] !== undefined} onChange={v => editPrice(l.rateKey, v)} />
                          <span title={l.sourceLabel} className={`mt-1 inline-block rounded px-1.5 text-[10px] font-semibold ${sourceTone[l.source]}`}>{l.sourceLabel ?? priceSourceLabels[l.source]}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{gbp(l.total)}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              </div>
            ))}
          </details>
        );
      })}
      <section className="rounded-xl border bg-white p-4">
        <h3 className="mb-2 font-bold">Totals</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
          {([["Main materials", t.material], ["Supporting materials", t.supporting], [`Waste (${c.wastePercent}% of materials)`, t.waste], ["Labour", t.labour], ["Site costs, plant & fees", t.prelim], ["Health & safety", t.healthSafety]] as const).map(([k, v]) => <Row key={k} k={k} v={gbp(v)} />)}
          <Row k="Cost subtotal" v={gbp(t.costSubtotal)} strong />
          <Row k={`Contingency (${c.contingencyPercent}%)`} v={gbp(t.contingency)} />
          <Row k={`Markup (${c.markupPercent}%)`} v={gbp(t.markup)} />
          <Row k="Net price" v={gbp(t.net)} strong />
          <Row k={`VAT (${c.vatPercent}%)`} v={gbp(t.vat)} />
          <Row k="Total inc. VAT" v={gbp(t.gross)} strong />
        </dl>
        <p className="mt-3 text-xs text-neutral-500">Unit prices edited here apply to this quote only. To change your standard prices for every quote, use Dashboard → Labour & material rates.</p>
      </section>
    </div>
  );
}

/** Type / size dropdown and "client supplies" switch for a material line. */
function LineOptions({ line, rates, input, chooseMaterial, setClientSupply }: { line: TakeoffLine; rates: RateBook; input: TakeoffInput; chooseMaterial: (mk: string, key: string | null) => void; setClientSupply: (mk: string, on: boolean, byDefault: boolean) => void }) {
  if (!line.materialKey || (line.kind !== "MATERIAL" && line.kind !== "SUPPORTING")) return null;
  const group = line.variantGroup ? materialVariants.find(g => g.id === line.variantGroup) : undefined;
  const original = line.materialKey.split("::").pop()!;
  const chosen = input.materialChoices[line.materialKey];
  const byDefault = input.finishesByClient && isClientFinish(line.rateKey);
  return (
    <>
      {group && <label className="flex items-center gap-1 text-neutral-600">{group.label}:
        <select className="rounded border border-neutral-200 px-1.5 py-0.5" value={chosen ?? original} onChange={e => chooseMaterial(line.materialKey!, e.target.value === original ? null : e.target.value)}>
          {group.keys.map(k => <option key={k} value={k}>{rates.materials[k].name} – £{rates.materials[k].price.toFixed(2)}/{rates.materials[k].unit}</option>)}
        </select></label>}
      <label className="flex items-center gap-1 text-neutral-600"><input type="checkbox" checked={!!line.clientSupplied} onChange={e => setClientSupply(line.materialKey!, e.target.checked, byDefault)} /> Client supplies</label>
    </>
  );
}

function Trades({ result }: { result: TakeoffResult }) {
  return (
    <section className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-neutral-50 text-left"><tr><th className="px-4 py-2">Trade</th><th className="px-2 py-2 text-right">Days on site</th><th className="px-2 py-2 text-right">Person-days</th><th className="px-2 py-2 text-right">£ / person-day</th><th className="px-4 py-2 text-right">Labour cost</th></tr></thead>
        <tbody>
          {result.trades.map(t => (
            <tr key={t.trade} className="border-t align-top">
              <td className="px-4 py-2"><p className="font-semibold">{t.name}</p><p className="text-xs text-neutral-500">{t.stages.join(" · ")}</p></td>
              <td className="px-2 py-2 text-right">{t.days}</td>
              <td className="px-2 py-2 text-right">{t.personDays}</td>
              <td className="px-2 py-2 text-right">{gbp0(t.dayRate)}</td>
              <td className="px-4 py-2 text-right font-semibold">{gbp(t.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-4 py-2 text-xs text-neutral-500">Labour is priced from your labour price list (per m², per door, per job…). £/person-day shows what each trade earns on this quote, so you can compare with what they charge.</p>
    </section>
  );
}

function Programme({ result }: { result: TakeoffResult }) {
  const staged = result.stages.filter(s => s.days > 0);
  const total = staged.reduce((s, x) => s + x.days, 0) || 1;
  let start = 0;
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <p className="text-sm text-neutral-600">About <strong>{result.programme.workingDays} working days</strong> (≈ {result.programme.weeks} weeks). Different trades in the same stage work side by side; stages follow each other. Allow extra for lead times, drying, inspections and weather.</p>
      {staged.map(s => {
        const left = start / total * 100, width = s.days / total * 100; start += s.days;
        return (
          <div key={s.stage} className="grid grid-cols-[11rem_1fr] items-center gap-3 text-sm">
            <span className="truncate font-medium" title={s.stage}>{s.stage}</span>
            <div className="relative h-7 rounded bg-neutral-100"><div className="absolute inset-y-0 flex items-center overflow-hidden whitespace-nowrap rounded bg-amber-500 px-2 text-xs font-bold text-neutral-950" style={{ left: `${left}%`, width: `${Math.max(width, 7)}%` }}>{s.days}d · {s.crew}p</div></div>
          </div>
        );
      })}
    </section>
  );
}

function Choices({ result }: { result: TakeoffResult }) {
  if (!result.clientChoices.length) return <p className="rounded-xl border bg-white p-4 text-sm text-neutral-600">No client choices in this quote.</p>;
  const areas = [...new Set(result.clientChoices.map(c => c.area))];
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4 text-sm">
      <p className="text-neutral-600">These options are priced with the choice shown for now. When the quote is sent, the client chooses them in their portal and the price updates automatically (you are told in Saved quotes).</p>
      {areas.map(a => (
        <div key={a}><p className="font-bold">{a}</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">{result.clientChoices.filter(c => c.area === a).map(c => <li key={c.key} className="rounded-lg bg-sky-50 px-3 py-1.5"><span className="text-neutral-600">{c.label}:</span> <strong>{c.valueLabel}</strong></li>)}</ul>
        </div>
      ))}
    </section>
  );
}

function HistoryTab({ saved }: { saved: SavedQuote }) {
  const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-white p-4"><h3 className="font-bold">Versions</h3>
        <ul className="mt-2 space-y-2 text-sm">{saved.versions.map(v => <li key={v.version} className="flex justify-between gap-3 border-b pb-2"><span><strong>v{v.version}</strong> {v.reason}{saved.publishedVersion === v.version && <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">client sees this</span>}<span className="block text-xs text-neutral-500">{when(v.createdAt)}</span></span><span className="shrink-0">{v.gross != null ? gbp0(v.gross) : ""}</span></li>)}</ul>
      </div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-bold">Activity</h3>
        <ul className="mt-2 space-y-2 text-sm">{saved.events.map((e, i) => <li key={i} className="border-b pb-2"><span className={`mr-2 rounded px-1.5 text-xs font-semibold ${e.actorKind === "CLIENT" ? "bg-sky-100 text-sky-800" : "bg-neutral-100 text-neutral-700"}`}>{e.actorKind === "CLIENT" ? "Client" : "You"}</span>{e.message}<span className="block text-xs text-neutral-500">{when(e.createdAt)}</span></li>)}</ul>
      </div>
    </section>
  );
}

/* ================================================================ Small parts */

const fmt = (x: number) => Number(x.toFixed(2)).toString();
function StatusBadge({ status }: { status: SavedQuote["status"] }) {
  const tone = { DRAFT: "bg-neutral-100 text-neutral-700", SENT: "bg-amber-100 text-amber-800", ACCEPTED: "bg-emerald-100 text-emerald-800", DECLINED: "bg-red-100 text-red-800" }[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{{ DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", DECLINED: "Declined" }[status]}</span>;
}
function NextStep({ onClick, label: text }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`${btn} w-full justify-center border bg-white hover:border-amber-500`}><FileText className="h-4 w-4" />{text}</button>;
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="flex items-center gap-2 font-bold text-[#0d3b72]"><span aria-hidden className="h-5 w-1.5 rounded-full bg-amber-500" />{title}</h2>{children}</section>;
}
function Text({ label: l, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-xs font-semibold text-neutral-700">{l}<input className={field} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
function Num({ label: l, value, onChange, int, hint }: { label: string; value: number; onChange: (v: number) => void; int?: boolean; hint?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(value)); }, [value, focused]);
  return (
    <label className="block text-xs font-semibold text-neutral-700">{l}
      <input className={field} inputMode={int ? "numeric" : "decimal"} value={text} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setText(String(value)); }}
        onChange={e => { setText(e.target.value); const v = Number(e.target.value); if (e.target.value.trim() !== "" && Number.isFinite(v)) onChange(int ? Math.max(0, Math.round(v)) : v); }} />
      {hint && <span className="mt-0.5 block font-normal text-neutral-500">{hint}</span>}
    </label>
  );
}
function Select({ label: l, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return <label className="block text-xs font-semibold text-neutral-700">{l}<select className={field} value={value} onChange={e => onChange(e.target.value)}>{options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>;
}
function Check({ label: l, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={value} onChange={e => onChange(e.target.checked)} />{l}</label>;
}
function PriceInput({ value, edited, onChange }: { value: number; edited: boolean; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value.toFixed(2));
  useEffect(() => { setText(value.toFixed(2)); }, [value]);
  return (
    <div className="flex items-center gap-1">
      <span className="text-neutral-400">£</span>
      <input aria-label="Unit price" className="w-20 rounded border border-neutral-200 px-1.5 py-0.5 text-right text-sm focus:border-amber-600 focus:outline-none" value={text} inputMode="decimal"
        onChange={e => setText(e.target.value)} onBlur={() => { const v = Number(text); if (Number.isFinite(v) && v >= 0 && Math.abs(v - value) > 0.0001) onChange(v); else setText(value.toFixed(2)); }} />
      {edited && <button title="Undo price edit" onClick={() => onChange(null)} className="text-neutral-400 hover:text-neutral-800"><RotateCcw className="h-3 w-3" /></button>}
    </div>
  );
}
function Stat({ label: l, value, sub }: { label: string; value: string; sub?: string }) {
  return <div><p className="text-neutral-400">{l}</p><p className="font-bold">{value}</p>{sub && <p className="text-xs text-neutral-400">{sub}</p>}</div>;
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <><dt className={strong ? "border-t pt-1 font-bold" : "text-neutral-700"}>{k}</dt><dd className={`text-right ${strong ? "border-t pt-1 font-bold" : ""}`}>{v}</dd></>;
}
