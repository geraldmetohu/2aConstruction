import { defaultRateBook, isClientFinish, variantGroupOf } from "./ratebook";
import { takeoffInputSchema, type RoomInput, type TakeoffInput } from "./schema";
import { fieldVisible, readValues, type Field, type Values, type WorkPackage } from "./package";
import { workPackages } from "./modules/index";
import { roomFields, buildRoom, roomValues } from "./modules/rooms";
import { buildPrelims } from "./modules/prelims";
import type { AreaSummary, ClientChoice, ScopeItem, ClientOrderItem, CostKind, Phase, PhaseSummary, PriceTable, RateBook, StageSummary, TakeoffLine, TakeoffResult, TakeoffTotals, Trade, TradeSummary } from "./types";
import { fmt, money } from "./util";
import { activitiesOf } from "./activities";

/** What the client must specify for an item they supply (from their choices in that area). */
const SPEC_KEYS: [RegExp, string[]][] = [
  [/^tile_|splashback/, ["tileColour", "groutColour", "splashbackColour"]],
  [/^(suite|shower)_/, ["bathGrade", "ensuiteGrade", "layout"]],
  [/^(base|wall)_unit_|^kitchen_sundries$/, ["kitchenGrade"]],
  [/^worktop_/, ["worktop"]],
  [/^floor_/, ["flooring", "kitchenFloor"]],
];
function specFor(rateKey: string, description: string, choices: ClientChoice[]) {
  const keys = SPEC_KEYS.find(([re]) => re.test(rateKey) || re.test(description.toLowerCase()))?.[1] ?? [];
  return choices.filter(c => keys.includes(c.key)).map(c => `${c.label}: ${c.valueLabel}`).join("; ");
}

export { money, qty2, fmt } from "./util";
export const TAKEOFF_ENGINE_VERSION = "takeoff-3";

export interface Ctx {
  input: TakeoffInput;
  rates: RateBook;
  /** Add a material / supporting / prelim line priced from the rate book. */
  material(stage: string, rateKey: string, quantity: number, formula: string, description?: string): void;
  /**
   * Add labour from the labour price list: cost = quantity × price per unit
   * (minimum ½ day for small jobs); days from output per day. Returns the days.
   */
  labour(stage: string, labourKey: string, quantity: number, formula?: string, description?: string): number;
  scope(text: string): void;
  assume(text: string): void;
  warn(text: string): void;
}

const halfDays = (d: number) => Math.ceil(d * 2 - 1e-9) / 2;

/** Which part of the job a stage belongs to (for the price summary). */
export function phaseOf(stage: string): Phase {
  if (stage.startsWith("Site ·")) return "SITE";
  return /second fix|decoration|tiling|kitchen fit-out|flooring|doors$/i.test(stage) ? "SECOND_FIX" : "FIRST_FIX";
}

export function calculateTakeoff(rawInput: unknown, prices: PriceTable = {}, rates: RateBook = defaultRateBook): TakeoffResult {
  const input = takeoffInputSchema.parse(rawInput);
  const lines: TakeoffLine[] = [];
  const scope: string[] = [], assumptions: string[] = [], warnings: string[] = [];
  const scopeItems: ScopeItem[] = [];
  const clientChoices: ClientChoice[] = [];
  let n = 0;

  const resolve = (priceKey: string, fallback: number, fallbackConfirmed: boolean) => {
    const edit = input.priceEdits[priceKey];
    if (edit !== undefined) return { unitPrice: edit, source: "MANUAL" as const, confirmed: true, label: undefined };
    const p = prices[priceKey];
    if (p) return { unitPrice: p.price, source: p.source, confirmed: true, label: p.label };
    return { unitPrice: fallback, source: "DEFAULT" as const, confirmed: fallbackConfirmed, label: undefined };
  };
  const gangText = (gang: { trade: Trade; n: number }[]) => gang.map(m => `${m.n} ${rates.trades[m.trade].name.toLowerCase()}${m.n > 1 ? "s" : ""}`).join(" + ");

  // Stable line ids: same area, stage and rate key are numbered in order of appearance.
  const seen = new Map<string, number>();
  const lineIdFor = (area: string, stage: string, rateKey: string) => {
    const base = `${area}::${stage}::${rateKey}`, i = (seen.get(base) ?? 0) + 1;
    seen.set(base, i);
    return `${base}::${i}`;
  };
  const makeCtx = (area: string, prefix: string): Ctx => {
    const st = (stage: string) => `${prefix} · ${stage}`;
    let current = "";
    return {
      input, rates,
      material(stage, rateKey, quantity, formula, description) {
        if (!rates.materials[rateKey]) { warnings.push(`Missing material rate "${rateKey}".`); return; }
        if (!(quantity > 0)) return;
        current = st(stage);
        // A chosen type/size for this material in this area (same group, same unit) replaces the default.
        const materialKey = `${area}::${rateKey}`;
        const group = variantGroupOf(rateKey);
        const chosen = input.materialChoices[materialKey];
        const useKey = chosen && group && group.keys.includes(chosen) && rates.materials[chosen] ? chosen : rateKey;
        const rate = rates.materials[useKey];
        const r = resolve(useKey, rate.price, rate.confirmed);
        const buyable = rate.kind === "MATERIAL" || rate.kind === "SUPPORTING";
        const clientSupplied = buyable && (input.clientSupply[materialKey] ?? (input.finishesByClient && isClientFinish(useKey)));
        const lineId = lineIdFor(area, stage, rateKey);
        const excluded = input.excluded[lineId] === true;
        const desc = useKey !== rateKey ? rate.name + (description && description !== rates.materials[rateKey].name ? ` – ${description.split(" – ").slice(1).join(" – ") || description}` : "") : description ?? rate.name;
        const value = money(quantity * r.unitPrice);
        lines.push({ key: `${rateKey}#${++n}`, lineId, area, package: area, stage: st(stage), phase: phaseOf(st(stage)), kind: rate.kind, rateKey: useKey, materialKey, variantGroup: group?.id,
          description: desc, quantity, unit: rate.unit, unitPrice: r.unitPrice, total: clientSupplied || excluded ? 0 : value,
          formula: excluded ? `${formula} · removed from this quote` : clientSupplied ? `${formula} · supplied by client (≈ £${fmt(value)})` : formula,
          source: r.source, sourceLabel: r.label, confirmed: r.confirmed, clientSupplied: clientSupplied && !excluded, excluded, imageUrl: prices[useKey]?.imageUrl });
      },
      labour(stage, key, quantity, formula, description) {
        const item = rates.labour[key];
        if (!item) { warnings.push(`Missing labour rate "${key}".`); return 0; }
        if (!(quantity > 0)) return 0;
        current = st(stage);
        const r = resolve(`labour:${key}`, item.price, item.confirmed);
        let days: number, charged = quantity, working: string;
        if (item.perDay) {
          // Raw days per line; the programme rounds each stage up to half days.
          const minDays = item.minDays ?? 0;
          days = Math.max(minDays, Math.round(quantity / item.perDay * 100) / 100);
          const minQty = minDays * item.perDay;
          if (quantity < minQty) charged = minQty;
          working = `${fmt(quantity)} ${item.unit} × £${fmt(r.unitPrice)}${charged > quantity ? ` (minimum ${fmt(minDays, 1)} day = ${fmt(minQty)} ${item.unit})` : ""} · ${fmt(days, 1)} day${days === 1 ? "" : "s"} at ${fmt(item.perDay)} ${item.unit}/day · ${gangText(item.gang)}`;
        } else {
          days = Math.round((item.daysPerUnit ?? 0) * quantity * 100) / 100;
          working = `${fmt(quantity)} ${item.unit} × £${fmt(r.unitPrice)} · ${fmt(days, 1)} day${days === 1 ? "" : "s"} · ${gangText(item.gang)}`;
        }
        const lineId = lineIdFor(area, stage, `labour:${key}`);
        const excluded = input.excluded[lineId] === true;
        lines.push({ key: `labour:${key}#${++n}`, lineId, area, package: area, stage: st(stage), phase: phaseOf(st(stage)), kind: "LABOUR", rateKey: `labour:${key}`,
          description: description ?? item.name, quantity, unit: item.unit, unitPrice: r.unitPrice, total: excluded ? 0 : money(charged * r.unitPrice),
          formula: (formula ? `${formula} → ${working}` : working) + (excluded ? " · removed from this quote" : ""), source: r.source, sourceLabel: r.label, confirmed: r.confirmed,
          days: excluded ? 0 : days, crew: item.gang.reduce((s, m) => s + m.n, 0), gang: item.gang, excluded });
        return excluded ? 0 : days;
      },
      scope: t => { scope.push(t); scopeItems.push({ text: t, area, stage: current || st("Start") }); },
      assume: t => { if (!assumptions.includes(t)) assumptions.push(t); },
      warn: t => warnings.push(t),
    };
  };

  const collectChoices = (fields: Field[], v: Values, visibleWith: Values, scopeKind: "room" | "package", id: string, area: string) => {
    for (const f of fields) if (f.clientChoice && (f.type === "select" || f.type === "text") && fieldVisible(f, visibleWith)) {
      const value = String(v[f.key]);
      clientChoices.push({ scope: scopeKind, id, area, key: f.key, label: f.label, value, valueLabel: f.type === "text" ? (value || "To be chosen") : f.options?.find(([k]) => k === value)?.[1] ?? value, options: f.options ?? [] });
    }
  };

  // Whole-house projects first (loft, extension, roof), then rooms, then site costs.
  const active: { pkg: WorkPackage; values: Values }[] = [];
  for (const pkg of workPackages) {
    const p = input.packages[pkg.id];
    if (!p?.enabled) continue;
    const values = readValues(pkg, p.values);
    active.push({ pkg, values });
    pkg.build(makeCtx(pkg.label, pkg.short), values);
    collectChoices(pkg.fields, values, values, "package", pkg.id, pkg.label);
  }
  // Each room is its own area; two rooms with the same name are kept apart ("Bedroom (2)").
  const usedNames = new Set(active.map(a => a.pkg.label));
  for (const original of input.rooms) {
    let name = original.name, k = 2;
    while (usedNames.has(name)) name = `${original.name} (${k++})`;
    usedNames.add(name);
    const room = name === original.name ? original : { ...original, name };
    const values = roomValues(room);
    buildRoom(makeCtx(room.name, "Rooms"), room, values);
    collectChoices(roomFields, values, { ...values, roomType: room.type }, "room", room.id, room.name);
  }
  if (!active.length && !input.rooms.length) warnings.push("Add a room or choose a project to start.");

  // Preliminaries depend on the programme length of the work above.
  const workDays = summariseStages(lines).reduce((s, x) => s + x.days, 0);
  const live = lines.filter(l => !l.excluded);
  const elec = {
    any: live.some(l => l.rateKey.startsWith("labour:elec_")),
    sockets: live.filter(l => l.rateKey === "socket_double").reduce((s, l) => s + l.quantity, 0),
    cookers: live.filter(l => l.rateKey === "cooker_switch").reduce((s, l) => s + l.quantity, 0),
  };
  if (lines.length) buildPrelims(makeCtx("Site set-up & safety", "Site"), workDays, active, input.rooms, elec);

  const stages = summariseStages(lines);
  const totals = summariseTotals(lines, input);
  const workingDays = Math.ceil(stages.reduce((s, x) => s + x.days, 0));
  const unconfirmedRates = [...new Set(lines.filter(l => !l.confirmed && !l.excluded && !l.clientSupplied).map(l => l.description))];

  const scaffoldCost = money(lines.filter(l => l.rateKey === "scaffold_erect" || l.rateKey === "scaffold_hire").reduce((s, l) => s + l.total, 0));
  const clientOrders: ClientOrderItem[] = lines.filter(l => l.clientSupplied && !l.excluded).map(l => ({ area: l.area, description: l.description, quantity: l.quantity, unit: l.unit, estimate: money(l.quantity * l.unitPrice), imageUrl: l.imageUrl, materialKey: l.materialKey!,
    stage: l.stage, spec: specFor(l.rateKey, l.description, clientChoices.filter(c => c.area === l.area)) }));
  return {
    lines, stages, totals, clientChoices, clientOrders,
    phases: summarisePhases(lines),
    scaffolding: { included: scaffoldCost > 0, cost: scaffoldCost },
    areas: summariseAreas(lines),
    trades: summariseTrades(lines, rates),
    programme: {
      workingDays,
      weeks: Math.max(1, Math.ceil(workingDays / 5)),
      personDays: Math.round(stages.reduce((s, x) => s + x.personDays, 0) * 10) / 10,
      peakCrew: Math.max(0, ...stages.map(s => s.crew)),
    },
    scope, scopeItems, assumptions, warnings, unconfirmedRates,
  };
}

function summarisePhases(lines: TakeoffLine[]): PhaseSummary[] {
  return (["FIRST_FIX", "SECOND_FIX", "SITE"] as Phase[]).map(phase => {
    const ls = lines.filter(l => l.phase === phase);
    const materials = money(ls.filter(l => l.kind === "MATERIAL" || l.kind === "SUPPORTING").reduce((s, l) => s + l.total, 0));
    const labour = money(ls.filter(l => l.kind === "LABOUR").reduce((s, l) => s + l.total, 0));
    const siteCosts = money(ls.filter(l => l.kind === "PRELIM" || l.kind === "HEALTH_SAFETY").reduce((s, l) => s + l.total, 0));
    return { phase, materials, labour, siteCosts, total: money(materials + labour + siteCosts) };
  }).filter(p => p.total > 0);
}

function summariseAreas(lines: TakeoffLine[]): AreaSummary[] {
  const map = new Map<string, AreaSummary>();
  for (const l of lines) {
    const a = map.get(l.area) ?? { area: l.area, cost: 0, days: 0 };
    a.cost = money(a.cost + l.total);
    a.days = Math.round((a.days + (l.days ?? 0)) * 100) / 100;
    map.set(l.area, a);
  }
  return [...map.values()];
}

/**
 * Stage duration: different trades work side by side, the same trade works in
 * sequence. Stage days = the longest single-trade total within the stage.
 */
function summariseStages(lines: TakeoffLine[]): StageSummary[] {
  const order: string[] = [];
  const map = new Map<string, StageSummary & { byTrade: Map<string, number>; crewByTrade: Map<string, number> }>();
  for (const l of lines) {
    if (!map.has(l.stage)) { order.push(l.stage); map.set(l.stage, { stage: l.stage, package: l.area, days: 0, crew: 0, personDays: 0, cost: 0, byTrade: new Map(), crewByTrade: new Map() }); }
    const s = map.get(l.stage)!;
    s.cost = money(s.cost + l.total);
    if (l.days && l.gang?.length) {
      const lead = l.gang[0].trade;
      s.byTrade.set(lead, (s.byTrade.get(lead) ?? 0) + l.days);
      s.crewByTrade.set(lead, Math.max(s.crewByTrade.get(lead) ?? 0, l.crew ?? 0));
      s.personDays += l.days * (l.crew ?? 0);
    }
  }
  return order.map(k => {
    const { byTrade, crewByTrade, ...s } = map.get(k)!;
    const days = halfDays(Math.max(0, ...byTrade.values()));
    const crew = [...crewByTrade.values()].reduce((a, b) => a + b, 0);
    return { ...s, days: Math.round(days * 100) / 100, crew, personDays: Math.round(s.personDays * 10) / 10 };
  });
}

function summariseTrades(lines: TakeoffLine[], rates: RateBook): TradeSummary[] {
  const map = new Map<Trade, TradeSummary>();
  for (const l of lines) {
    if (l.kind !== "LABOUR" || !l.gang?.length) continue;
    const weights = l.gang.map(m => m.n * rates.trades[m.trade].dayRate);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    l.gang.forEach((m, i) => {
      const s = map.get(m.trade) ?? { trade: m.trade, name: rates.trades[m.trade].name, dayRate: rates.trades[m.trade].dayRate, days: 0, personDays: 0, cost: 0, stages: [] };
      s.days = Math.round((s.days + (l.days ?? 0)) * 100) / 100;
      s.personDays = Math.round((s.personDays + (l.days ?? 0) * m.n) * 100) / 100;
      s.cost = money(s.cost + l.total * weights[i] / total);
      if (!s.stages.includes(l.area)) s.stages.push(l.area);
      map.set(m.trade, s);
    });
  }
  // Implied day rate = what this quote pays per person-day.
  for (const s of map.values()) if (s.personDays > 0) s.dayRate = Math.round(s.cost / s.personDays);
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function summariseTotals(lines: TakeoffLine[], input: TakeoffInput): TakeoffTotals {
  const by = (k: CostKind) => money(lines.filter(l => l.kind === k).reduce((s, l) => s + l.total, 0));
  const c = input.commercial;
  const material = by("MATERIAL"), supporting = by("SUPPORTING"), labour = by("LABOUR"), prelim = by("PRELIM"), healthSafety = by("HEALTH_SAFETY");
  const waste = money((material + supporting) * c.wastePercent / 100);
  const costSubtotal = money(material + supporting + waste + labour + prelim + healthSafety);
  const contingency = money(costSubtotal * c.contingencyPercent / 100);
  const markup = money((costSubtotal + contingency) * c.markupPercent / 100);
  const net = money(costSubtotal + contingency + markup);
  const vat = money(net * c.vatPercent / 100);
  return { material, supporting, waste, labour, prelim, healthSafety, costSubtotal, contingency, markup, net, vat, gross: money(net + vat) };
}

/**
 * Customer-safe projection: selling prices per room / project and stage, programme,
 * scope and the choices still to make. No unit costs, suppliers, waste, contingency or markup.
 */
export function customerTakeoff(result: TakeoffResult, input?: TakeoffInput) {
  const direct = result.lines.reduce((s, l) => s + l.total, 0);
  const factor = direct > 0 ? result.totals.net / direct : 0;
  const sections = result.stages.map(s => ({ stage: s.stage, package: s.package, days: s.days, net: money(s.cost * factor) }));
  const drift = money(result.totals.net - sections.reduce((s, x) => s + x.net, 0));
  if (sections.length && drift) sections[sections.length - 1].net = money(sections[sections.length - 1].net + drift);
  const areas = result.areas.map(a => ({ area: a.area, net: money(a.cost * factor) }));
  const areaDrift = money(result.totals.net - areas.reduce((s, x) => s + x.net, 0));
  if (areas.length && areaDrift) areas[areas.length - 1].net = money(areas[areas.length - 1].net + areaDrift);
  return {
    sections, areas,
    packages: areas.map(a => ({ package: a.area, net: a.net })),
    net: result.totals.net, vat: result.totals.vat, gross: result.totals.gross,
    guide: { low: Math.floor(result.totals.gross * 0.95 / 50) * 50, high: Math.ceil(result.totals.gross * 1.1 / 50) * 50 },
    programme: result.programme,
    trades: result.trades.map(t => ({ trade: t.name, days: t.days })),
    scope: result.scope,
    scopeItems: result.scopeItems,
    activities: activitiesOf(result.lines.filter(l => !l.excluded && (l.total > 0 || l.clientSupplied)).map(l => l.rateKey)),
    assumptions: result.assumptions,
    clientChoices: result.clientChoices,
    phases: result.phases.map(p => ({ phase: p.phase, materials: money(p.materials * factor), labour: money(p.labour * factor), siteCosts: money(p.siteCosts * factor), total: money(p.total * factor) })),
    clientOrders: result.clientOrders.map(o => ({ area: o.area, description: o.description, quantity: o.quantity, unit: o.unit, imageUrl: o.imageUrl, stage: o.stage, spec: o.spec })),
    scaffolding: { included: result.scaffolding.included },
    rooms: (input?.rooms ?? []).map((r: RoomInput) => ({ id: r.id, name: r.name, type: r.type, floor: r.floor, length: r.length, width: r.width, height: r.height })),
  };
}
export type CustomerTakeoff = ReturnType<typeof customerTakeoff>;
