import { defaultRateBook, isClientFinish, variantGroupOf } from "./ratebook";
import { takeoffInputSchema, type RoomInput, type TakeoffInput } from "./schema";
import { fieldVisible, readValues, type Field, type Values, type WorkPackage } from "./package";
import { workPackages } from "./modules/index";
import { roomFields, buildRoom, roomValues } from "./modules/rooms";
import { buildPrelims } from "./modules/prelims";
import type { AreaSummary, ClientChoice, ScopeItem, ClientOrderItem, CostKind, Phase, PhaseSummary, PriceTable, RateBook, StageSummary, TakeoffLine, TakeoffResult, TakeoffTotals, Trade, TradeSummary } from "./types";
import { fmt, money } from "./util";
import { activitiesOf } from "./activities";
import { buildQuoteLayout } from "./quote-format";

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
  /** A sentence for the client's scope of works. Give the step it describes when it isn't the one just priced. */
  scope(text: string, stage?: string): void;
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
    // Lines priced since the last scope sentence, by stage: a sentence describes the block of work just before it.
    let block = new Map<string, number>();
    const touch = (stage: string, weight: number) => { current = stage; block.set(stage, (block.get(stage) ?? 0) + weight); };
    return {
      input, rates,
      material(stage, rateKey, quantity, formula, description) {
        if (!rates.materials[rateKey]) { warnings.push(`Missing material rate "${rateKey}".`); return; }
        if (!(quantity > 0)) return;
        touch(st(stage), 1);
        // A chosen type/size for this material in this area (same group, same unit) replaces the default.
        const materialKey = `${area}::${rateKey}`;
        const group = variantGroupOf(rateKey);
        const chosen = input.materialChoices[materialKey];
        const useKey = chosen && group && group.keys.includes(chosen) && rates.materials[chosen] ? chosen : rateKey;
        const rate = rates.materials[useKey];
        const r = resolve(useKey, rate.price, rate.confirmed);
        const buyable = rate.kind === "MATERIAL" || rate.kind === "SUPPORTING";
        const clientSupplied = buyable && (input.labourOnly || (input.clientSupply[materialKey] ?? (input.finishesByClient && isClientFinish(useKey))));
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
        touch(st(stage), 2); // the job itself counts more than its materials
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
      scope: (t, stage) => {
        if (stage) { scope.push(t); scopeItems.push({ text: t, area, stage: st(stage) }); block = new Map(); return; }
        const ranked = [...block.entries()].sort((a, b) => b[1] - a[1]);
        const total = ranked.reduce((n, [, w]) => n + w, 0);
        // Work across three or more steps with no main one: a summary of the area, not one step.
        const summary = ranked.length >= 3 && ranked[0][1] / total < 0.5;
        scope.push(t); scopeItems.push({ text: t, area, stage: ranked[0]?.[0] ?? (current || st("Start")), ...(summary ? { summary: true } : {}) });
        block = new Map();
      },
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
  // Jobs priced by hand for this project (a job price, plus materials when given).
  for (const it of input.customItems) {
    const area = it.area.trim() || "Additional works", stage = `Extra · ${it.title}`;
    const c = input.commercial;
    const gang = [{ trade: it.trade, n: 1 }];
    const parts: { kind: "LABOUR" | "MATERIAL"; price: number; suffix: string; days: number }[] = [{ kind: it.kind, price: it.price, suffix: "", days: it.days }];
    if (it.materialPrice > 0) parts.push({ kind: "MATERIAL", price: it.materialPrice, suffix: " – materials", days: 0 });
    for (const part of parts) {
      const margin = (part.kind === "MATERIAL" ? 1 + c.wastePercent / 100 : 1) * (1 + c.contingencyPercent / 100) * (1 + c.markupPercent / 100);
      const unitCost = it.priceMode === "CLIENT" ? part.price / margin : part.price;
      const rk = `custom:${it.id}${part.suffix ? ":materials" : ""}`;
      const lineId = lineIdFor(area, stage, rk);
      const excluded = input.excluded[lineId] === true;
      lines.push({ key: `${rk}#${++n}`, lineId, area, package: area, stage, phase: it.phase, kind: part.kind, rateKey: rk, customId: it.id, trade: it.trade,
        description: it.title + part.suffix, quantity: it.quantity, unit: it.unit, unitPrice: money(unitCost), total: excluded ? 0 : money(it.quantity * unitCost),
        formula: (it.priceMode === "CLIENT"
          ? `${fmt(it.quantity)} ${it.unit} × £${fmt(part.price)} client price ÷ ${fmt(margin, 3)} (${part.kind === "MATERIAL" ? "waste, " : ""}contingency & markup) = cost`
          : `${fmt(it.quantity)} ${it.unit} × £${fmt(part.price)} cost`) + (part.days ? ` · ${fmt(part.days, 1)} day${part.days === 1 ? "" : "s"}` : "") + (it.provisional ? " · provisional sum" : "") + (excluded ? " · removed from this quote" : ""),
        source: "MANUAL", confirmed: true, days: excluded ? 0 : part.days, crew: 1, gang, excluded,
        ...(it.vatPercent !== null ? { vatPercent: it.vatPercent } : {}), ...(it.provisional ? { provisional: true } : {}) });
    }
    const text = (it.description ? `${it.title}: ${it.description}` : `${it.title}.`) + (it.provisional ? " (Provisional sum – adjusted to the actual cost.)" : "");
    scope.push(text); scopeItems.push({ text, area, stage });
    if (it.provisional) assumptions.push(`${it.title} is a provisional sum: the final account is adjusted up or down to the actual cost.`);
  }

  if (input.labourOnly) assumptions.push("Labour only: you supply all materials to our list and timings (site set-up, plant and waste removal are included in our price). Delays caused by late or wrong materials are charged at our day rates.");

  // Optional extras the client has chosen are priced in at the price offered (ex VAT, margins included).
  input.wording.options.forEach((o, idx) => {
    if (!o.chosen || o.price === null) return;
    const area = "Optional extras", stage = `Extra · ${o.title}`;
    const c = input.commercial, margin = (1 + c.contingencyPercent / 100) * (1 + c.markupPercent / 100);
    const rk = `option:${idx}`, lineId = lineIdFor(area, stage, rk);
    lines.push({ key: `${rk}#${++n}`, lineId, area, package: area, stage, phase: "SECOND_FIX", kind: "LABOUR", rateKey: rk, customId: `option:${idx}`, trade: "GENERAL_BUILDER",
      description: o.title, quantity: 1, unit: "item", unitPrice: money(o.price / margin), total: money(o.price / margin),
      formula: `optional extra chosen by the client: £${fmt(o.price)} ÷ ${fmt(margin, 3)} (contingency & markup) = cost`, source: "MANUAL", confirmed: true, days: 0, crew: 1, gang: [{ trade: "GENERAL_BUILDER", n: 1 }] });
    const text = `${o.title} (optional extra you chose).`;
    scope.push(text); scopeItems.push({ text, area, stage });
  });

  // Who does each line: labour from its gang; materials from their family, else the main trade of the same stage.
  tagTrades(lines);
  // Trade filter: only the chosen trades are priced (site set-up and hand-priced jobs are always kept).
  if (input.trades.length) {
    const keep = new Set(input.trades);
    const trimmed = new Set<string>();
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].phase !== "SITE" && !lines[i].customId && lines[i].trade && !keep.has(lines[i].trade!)) { trimmed.add(lines[i].area); lines.splice(i, 1); }
    const stagesLeft = new Set(lines.map(l => `${l.area}::${l.stage}`));
    // Where other trades' work was taken out, the written sentences would still describe it: drop them so the quote
    // describes only the jobs left (the scope table then lists those jobs with their quantities).
    for (let i = scopeItems.length - 1; i >= 0; i--) if (!stagesLeft.has(`${scopeItems[i].area}::${scopeItems[i].stage}`) || (trimmed.has(scopeItems[i].area) && !scopeItems[i].stage.startsWith("Extra · "))) { const at = scope.indexOf(scopeItems[i].text); if (at >= 0) scope.splice(at, 1); scopeItems.splice(i, 1); }
    for (let i = clientChoices.length - 1; i >= 0; i--) if (!lines.some(l => l.area === clientChoices[i].area)) clientChoices.splice(i, 1);
    assumptions.push(`Priced for ${input.trades.map(t => rates.trades[t]?.name.toLowerCase() ?? t).join(", ")} work only; other trades are by others.`);
  }

  if (!active.length && !input.rooms.length && !input.customItems.length) warnings.push("Add a room or choose a project to start.");

  // Preliminaries depend on the programme length of the work above.
  const workDays = summariseStages(lines).reduce((s, x) => s + x.days, 0);
  const live = lines.filter(l => !l.excluded);
  const elec = {
    any: live.some(l => l.rateKey.startsWith("labour:elec_")),
    sockets: live.filter(l => l.rateKey === "socket_double").reduce((s, l) => s + l.quantity, 0),
    cookers: live.filter(l => l.rateKey === "cooker_switch").reduce((s, l) => s + l.quantity, 0),
  };
  if (lines.length) buildPrelims(makeCtx("Site set-up & safety", "Site"), workDays, active, input.rooms, elec);
  tagTrades(lines);

  // Energy-saving materials relief: installing external wall insulation in a home is zero-rated (GB, to 31 March 2027).
  const ewi = active.find(a => a.pkg.id === "external" && a.values.insulation === true && ["SILICONE", "ACRYLIC", "MONOCOUCHE", "POLYMER"].includes(String(a.values.system)));
  if (ewi && input.commercial.esmZeroRate && input.commercial.vatPercent > 0) {
    for (const l of lines) if (l.area === ewi.pkg.label && l.vatPercent === undefined) l.vatPercent = 0;
    assumptions.push("The external wall insulation installation is zero-rated for VAT (energy-saving materials relief, available to 31 March 2027); other work is at the standard rate.");
    if (input.terms.startDate && input.terms.startDate > "2027-03-31") warnings.push("The 0% VAT relief for energy-saving materials is due to end on 31 March 2027 – check the VAT rate for work after that date.");
  }

  const stages = summariseStages(lines);
  const totals = summariseTotals(lines, input);
  const workingDays = Math.ceil(stages.reduce((s, x) => s + x.days, 0));
  const unconfirmedRates = [...new Set(lines.filter(l => !l.confirmed && !l.excluded && !l.clientSupplied).map(l => l.description))];

  const scaffoldCost = money(lines.filter(l => l.rateKey.startsWith("scaffold_") || l.rateKey === "chimney_scaffold").reduce((s, l) => s + l.total, 0));
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

/** Material families and the trade that fits them (roof tiles before wall / floor tiles). */
const MATERIAL_TRADE: [RegExp, Trade][] = [
  [/^(tile_(concrete|clay)|slate_|ridge_tile|dry_ridge|lead_|breather_membrane|batten_|felt_system|grp_system|roof_trims|fascia|soffit|gutter|downpipe|eaves_protector|over_fascia|polytop|pipe_clip$|offset_bend|pipe_socket|pipe_shoe|roof_window|rooflight_|lantern_|roof_lantern|upstand_kerb|clad_)/, "ROOFER"],
  [/^(render_|ewi_|masonry_paint$)/, "RENDERER"],
  [/^(cable_|back_box|elec_|light_switch|socket_double|fused_spur|fan_isolator|data_point|tv_point|cooker_switch|shaver_socket|outside_light|ceiling_rose|pendant_fitting|downlight|consumer_unit|rcbo|main_bonding|smoke_alarm|ufh_mat|extractor_fan)/, "ELECTRICIAN"],
  [/^(pipe_(cu|pex)|elbow|tee_|pipe_insert|isolating_valve|flexi_|tap_connector|pipe_clip_|solder|ptfe|waste_|bend(45|90)_|trap_|basin_waste|bath_waste|shower_waste|sink_waste|washer_valve|standpipe|soil_|pan_connector|wc_fixing|stopcock|drain_cock|mdpe|duct_sleeve|outside_tap|rad_valves|inhibitor|radiator|towel_rail|heating_pipework|suite_|shower_(standard|mid|premium)$|plumbing_sundries|sink_tap)/, "PLUMBER"],
  [/^(tile_|grout|wall_tile_|floor_tile$|tanking_kit|splashback_tile)/, "TILER"],
  [/^(paint_|mist_coat_paint|wood_(trade|premium|undercoat)|stain_block|filler_caulk|masking|emulsion|decor_sundries|knotting_primer|door_paint|dust_sheets)/, "DECORATOR"],
  [/^(plasterboard_|multifinish|dab_adhesive|drywall_screws|board_screws|scrim_beads|bonding_plaster|pva_bond|grit_primer|angle_bead|stop_bead|jointing_tape|coving)/, "PLASTERER"],
  [/^(base_unit|wall_unit|worktop|kitchen_sundries)/, "KITCHEN_FITTER"],
  [/^(facing_brick|dense_block|thermal_block|mortar_|wall_ties|cavity_|lintel|wall_starter|weep_vent|dpc$)/, "BRICKLAYER"],
  [/^(timber_|door_(standard|fire|premium|oak|glazed|lining|fixings|stop)|architrave|skirting_|hinges_|handle_|gripfill|fire_door_kit|door_closer|floorboard_|plywood_|osb_|staircase|window_board)/, "CARPENTER"],
];

/** Give every line a trade. Labour: the lead of its gang. Materials: their family, else the biggest labour trade in the same stage / area. */
function tagTrades(lines: TakeoffLine[]) {
  const main = (ls: TakeoffLine[]) => {
    const by = new Map<Trade, number>();
    for (const l of ls) if (l.kind === "LABOUR" && l.gang?.length) by.set(l.gang[0].trade, (by.get(l.gang[0].trade) ?? 0) + l.quantity * l.unitPrice);
    return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const byStage = new Map<string, TakeoffLine[]>(), byArea = new Map<string, TakeoffLine[]>();
  for (const l of lines) { (byStage.get(`${l.area}::${l.stage}`) ?? byStage.set(`${l.area}::${l.stage}`, []).get(`${l.area}::${l.stage}`)!).push(l); (byArea.get(l.area) ?? byArea.set(l.area, []).get(l.area)!).push(l); }
  const stageMain = new Map<string, Trade | undefined>(), areaMain = new Map<string, Trade | undefined>();
  for (const l of lines) {
    if (l.trade || l.phase === "SITE") continue;
    if (l.kind === "LABOUR" && l.gang?.length) { l.trade = l.gang[0].trade; continue; }
    const fam = MATERIAL_TRADE.find(([re]) => re.test(l.rateKey))?.[1];
    if (fam) { l.trade = fam; continue; }
    const sk = `${l.area}::${l.stage}`;
    if (!stageMain.has(sk)) stageMain.set(sk, main(byStage.get(sk) ?? []));
    if (!areaMain.has(l.area)) areaMain.set(l.area, main(byArea.get(l.area) ?? []));
    l.trade = stageMain.get(sk) ?? areaMain.get(l.area) ?? "GENERAL_BUILDER";
  }
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
  const netBeforeDiscount = money(costSubtotal + contingency + markup);
  const discount = money(Math.min(netBeforeDiscount, netBeforeDiscount * c.discountPercent / 100 + c.discountAmount));
  const net = money(netBeforeDiscount - discount);
  // VAT by rate: each line's selling price (margins applied, discount spread evenly) at its own rate.
  const cm = (1 + c.contingencyPercent / 100) * (1 + c.markupPercent / 100), w = 1 + c.wastePercent / 100;
  const sellRaw = lines.reduce((s, l) => s + l.total * (l.kind === "MATERIAL" || l.kind === "SUPPORTING" ? w : 1) * cm, 0);
  const scale = sellRaw > 0 ? net / sellRaw : 0;
  const byRate = new Map<number, number>();
  for (const l of lines) {
    const rate = l.vatPercent ?? c.vatPercent;
    byRate.set(rate, (byRate.get(rate) ?? 0) + l.total * (l.kind === "MATERIAL" || l.kind === "SUPPORTING" ? w : 1) * cm * scale);
  }
  if (!byRate.size) byRate.set(c.vatPercent, 0);
  const vatBreakdown = [...byRate.entries()].sort((a, b) => b[0] - a[0]).map(([percent, n]) => ({ percent, net: money(n), vat: money(n * percent / 100) }));
  // Rounding: the breakdown nets add up to the net.
  const nd = money(net - vatBreakdown.reduce((s, x) => s + x.net, 0));
  if (nd) { vatBreakdown[0].net = money(vatBreakdown[0].net + nd); vatBreakdown[0].vat = money(vatBreakdown[0].net * vatBreakdown[0].percent / 100); }
  const vat = money(vatBreakdown.reduce((s, x) => s + x.vat, 0));
  return { material, supporting, waste, labour, prelim, healthSafety, costSubtotal, contingency, markup, netBeforeDiscount, discount, net, vat, gross: money(net + vat), vatBreakdown };
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
    /** Discount before VAT (0 when none) and VAT by rate. Missing on older versions. */
    discount: result.totals.discount ? { label: input?.commercial.discountLabel || "Discount", amount: result.totals.discount, netBeforeDiscount: result.totals.netBeforeDiscount } : undefined as { label: string; amount: number; netBeforeDiscount: number } | undefined,
    vatBreakdown: result.totals.vatBreakdown as TakeoffTotals["vatBreakdown"] | undefined,
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
    /** Scope table in the chosen format (simple / normal / itemised). Missing on versions saved before formats existed. */
    layout: buildQuoteLayout(result, input, defaultRateBook.trades) as ReturnType<typeof buildQuoteLayout> | undefined,
  };
}
export type CustomerTakeoff = ReturnType<typeof customerTakeoff>;
