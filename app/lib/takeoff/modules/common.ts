import type { Ctx } from "../engine";
import type { Field } from "../package";
import { fmt, qty2 } from "../util";

const SHEET = 2.88; // 2.4 × 1.2 m board

export const flooringOptions: [string, string][] = [
  ["NONE", "No new flooring"], ["CARPET", "Carpet & underlay"], ["LAMINATE", "Laminate"],
  ["ENGINEERED", "Engineered oak"], ["SOLID_WOOD", "Solid wood"], ["LVT", "LVT"], ["VINYL", "Sheet vinyl"],
  ["TILE", "Porcelain tiles"], ["RESIN", "Poured resin"],
];
export const gradeOptions: [string, string][] = [["STANDARD", "Standard"], ["MID", "Mid range"], ["PREMIUM", "Premium"]];
export const paintSystemOptions: [string, string][] = [["STANDARD", "Standard trade emulsion"], ["DURABLE", "Durable / washable"], ["PREMIUM", "Premium designer paint"], ["KITCHEN_BATH", "Kitchen & bathroom paint"]];
const ceil = (x: number) => Math.ceil(x - 1e-9);

/** A new consumer unit is fitted once for the whole job, whichever project (or site settings) asked for it. */
export const newConsumerUnit = (input: Ctx["input"]) => input.prelims.consumerUnit || Object.values(input.packages).some(p => p.enabled && p.values.consumerUnit === true);

// ---------------------------------------------------------------- Plastering

/**
 * Skim coat. On old plaster: PVA bond first. On new boards: jointing tape to the joints.
 * Multi-finish 25 kg covers ≈10 m² at 2–3 mm.
 */
export function skim(ctx: Ctx, S: string, area: number, label: string, opts: { onBoard?: boolean; beads?: number } = {}) {
  if (area <= 0) return;
  const a = qty2(area);
  if (opts.onBoard) ctx.material(S, "jointing_tape", ceil(a / 40), `${fmt(a)} m² of boards ÷ 40 m² per roll`);
  else ctx.material(S, "pva_bond", ceil(a / 30), `${fmt(a)} m² ÷ 30 m² per 5 L (diluted)`);
  ctx.material(S, "multifinish", ceil(a / 10), `${fmt(a)} m² ÷ 10 m² per 25 kg bag`);
  if (opts.beads) ctx.material(S, "angle_bead", opts.beads, `${opts.beads} lengths for corners and reveals`);
  ctx.labour(S, "skim", a, `${label} ${fmt(a)} m²`);
}

/** Bonding (backing) coat 11 mm + skim, e.g. after hacking off. Bonding 25 kg ≈ 2.75 m². */
export function bondAndSkim(ctx: Ctx, S: string, area: number, label: string, beads = 0) {
  if (area <= 0) return;
  const a = qty2(area);
  ctx.material(S, "grit_primer", ceil(a / 50), `${fmt(a)} m² ÷ 50 m² per 10 L`, "Grit primer / bonding agent");
  ctx.material(S, "bonding_plaster", ceil(a / 2.75), `${fmt(a)} m² ÷ 2.75 m² per 25 kg bag at 11 mm`);
  ctx.material(S, "multifinish", ceil(a / 10), `${fmt(a)} m² ÷ 10 m² per bag`);
  if (beads) ctx.material(S, "angle_bead", beads, `${beads} lengths`);
  ctx.material(S, "stop_bead", ceil(a / 15), `stop beads at openings / edges`);
  ctx.labour(S, "bonding_coat", a, `${label} ${fmt(a)} m²`);
  ctx.labour(S, "skim", a, `${label} ${fmt(a)} m²`);
}

/** Plasterboard (screwed to timber, or dot & dab to masonry) then skim. */
export function boardAndSkim(ctx: Ctx, S: string, area: number, label: string, opts: { board?: "standard" | "moisture" | "fire"; fixing?: "screw" | "dab"; beads?: number } = {}) {
  if (area <= 0) return;
  const a = qty2(area);
  const sheets = ceil(a * 1.1 / SHEET);
  const key = opts.board === "moisture" ? "plasterboard_moisture" : opts.board === "fire" ? "plasterboard_fire" : "plasterboard_125";
  ctx.material(S, key, sheets, `${fmt(a)} m² × 1.1 waste ÷ ${SHEET} m² per board`, `${ctx.rates.materials[key].name} – ${label}`);
  if (opts.fixing === "dab") {
    ctx.material(S, "dab_adhesive", ceil(a / 3.5), `${fmt(a)} m² ÷ 3.5 m² per bag`);
    ctx.labour(S, "dot_and_dab", a, `${label} ${fmt(a)} m²`);
  } else {
    ctx.material(S, "drywall_screws", ceil(sheets * 32 / 1000), `${sheets} boards × 32 screws ÷ 1000`);
    ctx.labour(S, "plasterboard", a, `${label} ${fmt(a)} m²`);
  }
  skim(ctx, S, a, label, { onBoard: true, beads: opts.beads });
}

/** Fill, patch and make good existing plaster (allowance of 25% of the area). */
export function makeGood(ctx: Ctx, S: string, area: number, label: string) {
  if (area <= 0) return;
  const patch = qty2(area * 0.25);
  ctx.material(S, "multifinish", ceil(patch / 10), `25% of ${fmt(area)} m² = ${fmt(patch)} m² of patching`);
  ctx.labour(S, "make_good", patch, `${label}: 25% of ${fmt(area)} m²`);
}

// ---------------------------------------------------------------- Painting

export interface PaintSpec {
  label: string;
  rooms?: number;              // for per-room sundries (default 1)
  ceilings?: number;           // m²
  walls?: number;              // m²
  skirting?: number;           // m
  doors?: number;              // each (both faces + frame + architrave)
  windows?: number;            // each
  radiators?: number;          // each
  newPlaster?: number;         // m² needing a mist coat
  featureWalls?: number;
  prep?: "STANDARD" | "HEAVY";
  system?: string;             // paint system for walls
  wood?: "STANDARD" | "PREMIUM";
  newWood?: boolean;           // bare / new joinery needs primer-undercoat
  coats?: number;              // finish coats on walls & ceilings (company default 2)
  mistCoat?: boolean;          // mist coat on new plaster (company default yes)
  /** Doors priced part by part, by condition (replaces `doors`): new / bare joinery costs more than a repaint. */
  doorParts?: DoorParts;
  /** Windows: existing (repaint), new bare timber, or strip back (poor condition). Counts within `windows`. */
  windowsNew?: number;
  windowsStrip?: number;
  /** Skirting is new (bare / primed MDF): full paint system. */
  skirtingNew?: boolean;
  /** Staircase flights (spindles, strings, handrail). */
  stairs?: number;
}

export interface DoorParts { leavesNew: number; leavesOld: number; framesNew: number; framesOld: number; architravesNew: number; architravesOld: number }
export const doorConditionOptions: [string, string][] = [["AUTO", "Match the work (new doors new, rest existing)"], ["EXISTING", "All existing – repaint"], ["NEW", "All new / bare – full paint system"], ["MIXED", "Mixed – I'll say how many are new"]];

/** Split `total` doors into new / existing parts from the chosen condition. */
export function doorPartsFor(total: number, fitted: number, c: { leaves: string; frames: string; architraves: string; leavesNew?: number; framesNew?: number; architravesNew?: number }): DoorParts {
  const pick = (mode: string, mixed = 0) => {
    const nw = mode === "NEW" ? total : mode === "EXISTING" ? 0 : mode === "MIXED" ? Math.min(total, Math.max(0, mixed)) : Math.min(total, fitted);
    return [nw, total - nw] as const;
  };
  const [leavesNew, leavesOld] = pick(c.leaves, c.leavesNew), [framesNew, framesOld] = pick(c.frames, c.framesNew), [architravesNew, architravesOld] = pick(c.architraves, c.architravesNew);
  return { leavesNew, leavesOld, framesNew, framesOld, architravesNew, architravesOld };
}

const wallPaint: Record<string, { key: string; litres: number }> = {
  STANDARD: { key: "paint_trade_10l", litres: 10 }, DURABLE: { key: "paint_durable_5l", litres: 5 },
  PREMIUM: { key: "paint_premium_25l", litres: 2.5 }, KITCHEN_BATH: { key: "paint_kitbath_25l", litres: 2.5 },
};

/**
 * Painting & decorating. Coverage 12 m² per litre per coat, 2 coats; mist coat 10 m²/L.
 * Woodwork areas: skirting × 0.15 m, door (2 faces + frame) 4.5 m², window 1.2 m², radiator 1.8 m².
 */
export function paint(ctx: Ctx, S: string, p: PaintSpec) {
  const rooms = p.rooms ?? 1;
  const ceilings = qty2(p.ceilings ?? 0), walls = qty2(p.walls ?? 0), skirting = qty2(p.skirting ?? 0);
  const dp = p.doorParts;
  const doors = dp ? Math.max(dp.leavesNew + dp.leavesOld, dp.framesNew + dp.framesOld, dp.architravesNew + dp.architravesOld) : p.doors ?? 0;
  const windows = p.windows ?? 0, rads = p.radiators ?? 0, stairs = p.stairs ?? 0, mist = p.mistCoat === false ? 0 : qty2(p.newPlaster ?? 0);
  const coats = Math.min(3, Math.max(1, p.coats ?? 2)), cf = coats / 2;
  if (!(ceilings + walls + skirting + doors + windows + rads + stairs > 0)) return;
  const L = p.label;

  // Materials
  if (mist > 0) ctx.material(S, "mist_coat_paint", ceil(mist / 10 / 10), `${fmt(mist)} m² new plaster ÷ 10 m²/L ÷ 10 L`);
  if (ceilings > 0) ctx.material(S, "paint_trade_10l", ceil(ceilings * coats / 12 / 10), `ceilings ${fmt(ceilings)} m² × ${coats} coat${coats > 1 ? "s" : ""} ÷ 12 m²/L ÷ 10 L`, "Trade emulsion 10 L – ceilings");
  if (walls > 0) {
    const sys = wallPaint[p.system ?? "STANDARD"] ?? wallPaint.STANDARD;
    ctx.material(S, sys.key, ceil(walls * coats / 12 / sys.litres), `walls ${fmt(walls)} m² × ${coats} coat${coats > 1 ? "s" : ""} ÷ 12 m²/L ÷ ${sys.litres} L`);
  }
  const woodArea = qty2(skirting * 0.15 + doors * 4.5 + windows * 1.2 + rads * 1.8 + stairs * 6);
  if (woodArea > 0) {
    ctx.material(S, p.wood === "PREMIUM" ? "wood_premium_25l" : "wood_trade_25l", ceil(woodArea * 2 / 12 / 2.5),
      `woodwork ${fmt(woodArea)} m² (skirting ${fmt(skirting)} m × 0.15, ${doors} doors × 4.5, ${windows} windows × 1.2, ${rads} radiators × 1.8${stairs ? `, ${stairs} stair flight${stairs > 1 ? "s" : ""} × 6` : ""}) × 2 coats ÷ 12 m²/L ÷ 2.5 L`);
    // New / bare joinery: knotting, primer and undercoat on the new parts only (all of it when the spec says new wood or heavy prep).
    const newArea = dp || p.skirtingNew || p.windowsNew
      ? qty2((dp ? dp.leavesNew * 3.4 + dp.framesNew * 0.6 + dp.architravesNew * 0.5 : 0) + (p.skirtingNew ? skirting * 0.15 : 0) + (p.windowsNew ?? 0) * 1.2 + (p.windowsStrip ?? 0) * 1.2)
      : 0;
    const primeArea = p.newWood || p.prep === "HEAVY" ? woodArea : newArea;
    if (primeArea > 0) {
      ctx.material(S, "wood_undercoat_25l", ceil(primeArea / 12 / 2.5), `${fmt(primeArea)} m² ÷ 12 m²/L ÷ 2.5 L`);
      if (newArea > 0) ctx.material(S, "knotting_primer", ceil(newArea / 12), `new / bare joinery ${fmt(newArea)} m² ÷ 12 m²/L`);
    }
  }
  if (p.prep === "HEAVY") ctx.material(S, "stain_block", rooms, `${rooms} room${rooms > 1 ? "s" : ""}`);
  ctx.material(S, "filler_caulk", rooms, `${rooms} room${rooms > 1 ? "s" : ""}`);
  ctx.material(S, "masking", rooms, `${rooms} room${rooms > 1 ? "s" : ""}`);
  ctx.material(S, "dust_sheets", rooms, `${rooms} room${rooms > 1 ? "s" : ""}`);

  // Labour
  if (p.prep === "HEAVY") ctx.labour(S, "prep_heavy", ceilings + walls, `${L}: ceilings + walls ${fmt(ceilings + walls)} m²`);
  if (mist > 0) ctx.labour(S, "mist_coat", mist, `${L}: new plaster ${fmt(mist)} m²`);
  const coatText = coats === 2 ? "" : ` × ${coats}/2 coats`;
  if (ceilings > 0) ctx.labour(S, "paint_ceilings", qty2(ceilings * cf), `${L} ${fmt(ceilings)} m²${coatText}`);
  if (walls > 0) ctx.labour(S, "paint_walls", qty2(walls * cf), `${L} ${fmt(walls)} m²${coatText}`);
  if (p.featureWalls) ctx.labour(S, "feature_wall", p.featureWalls, `${p.featureWalls} wall${p.featureWalls > 1 ? "s" : ""}`);
  if (skirting > 0) ctx.labour(S, p.skirtingNew ? "paint_skirting_new" : "paint_skirting", skirting, `${fmt(skirting)} m${p.skirtingNew ? " new skirting" : ""}`);
  const nOf = (k: number, one: string) => `${k} ${one}${k > 1 ? "s" : ""}`;
  if (dp) {
    if (dp.leavesNew) ctx.labour(S, "paint_door_new", dp.leavesNew, `${L}: ${nOf(dp.leavesNew, "new door")}`);
    if (dp.leavesOld) ctx.labour(S, "paint_door_old", dp.leavesOld, `${L}: ${nOf(dp.leavesOld, "existing door")}`);
    if (dp.framesNew) ctx.labour(S, "paint_frame_new", dp.framesNew, `${L}: ${nOf(dp.framesNew, "new frame")}`);
    if (dp.framesOld) ctx.labour(S, "paint_frame_old", dp.framesOld, `${L}: ${nOf(dp.framesOld, "existing frame")}`);
    if (dp.architravesNew) ctx.labour(S, "paint_architrave_new", dp.architravesNew, `${L}: new architraves to ${nOf(dp.architravesNew, "door")}`);
    if (dp.architravesOld) ctx.labour(S, "paint_architrave_old", dp.architravesOld, `${L}: existing architraves to ${nOf(dp.architravesOld, "door")}`);
  } else if (doors > 0) ctx.labour(S, "paint_door", doors, `${doors} door${doors > 1 ? "s" : ""}`);
  if (windows > 0) {
    const wNew = Math.min(windows, p.windowsNew ?? 0), wStrip = Math.min(windows - wNew, p.windowsStrip ?? 0), wOld = windows - wNew - wStrip;
    if (wNew) ctx.labour(S, "paint_window_new", wNew, `${L}: ${nOf(wNew, "new window")}`);
    if (wStrip) ctx.labour(S, "paint_window_strip", wStrip, `${L}: ${nOf(wStrip, "window")} stripped back`);
    if (wOld) ctx.labour(S, "paint_window", wOld, `${nOf(wOld, "window")}`);
  }
  if (stairs > 0) ctx.labour(S, "paint_stairs", stairs, `${L}: ${nOf(stairs, "flight")}`);
  if (rads > 0) ctx.labour(S, "paint_radiator", rads, `${rads} radiator${rads > 1 ? "s" : ""}`);
}

/** Back-compatible simple decoration of walls + ceilings (2 coats, standard paint). */
export const coatOptions: [string, string][] = [["1", "1 coat"], ["2", "2 coats (standard)"], ["3", "3 coats"]];

export function decorate(ctx: Ctx, S: string, area: number, label: string, newPlaster = 0) {
  if (area <= 0) return;
  paint(ctx, S, { label, walls: area, newPlaster });
}

// ---------------------------------------------------------------- Floors, joinery, services

export function flooring(ctx: Ctx, S: string, area: number, type: string, o: { perimeter?: number; doors?: number } = {}) {
  if (area <= 0 || type === "NONE") return;
  const a = qty2(area), buy = ceil(a * 1.1);
  const perimeter = o.perimeter ?? 4 * Math.sqrt(a), doors = o.doors ?? 1;
  if (doors > 0) ctx.material(S, "threshold_strip", doors, `${doors} doorway${doors > 1 ? "s" : ""}`);
  if (type === "LAMINATE" || type === "ENGINEERED" || type === "SOLID_WOOD") ctx.material(S, "floor_beading", ceil(perimeter * 1.1 / 2.4), `${fmt(perimeter)} m perimeter + 10% ÷ 2.4 m`);
  const w = `${fmt(a)} m² + 10% cutting`;
  switch (type) {
    case "CARPET": ctx.material(S, "floor_carpet", buy, w); break;
    case "LAMINATE": ctx.material(S, "floor_laminate", buy, w); ctx.material(S, "underlay", ceil(a), `${fmt(a)} m²`); ctx.labour(S, "laminate_floor", a); break;
    case "ENGINEERED": ctx.material(S, "floor_engineered", buy, w); ctx.material(S, "underlay", ceil(a), `${fmt(a)} m²`); ctx.labour(S, "engineered_floor", a); break;
    case "SOLID_WOOD": ctx.material(S, "floor_solid_oak", buy, w); ctx.material(S, "flooring_screws", ceil(a / 10), `${fmt(a)} m² ÷ 10 m² per box`); ctx.labour(S, "solid_floor", a); break;
    case "LVT": ctx.material(S, "floor_lvt", buy, w); ctx.labour(S, "lvt_floor", a); break;
    case "VINYL": ctx.material(S, "floor_vinyl", buy, w); ctx.material(S, "latex_screed", ceil(a / 5), `${fmt(a)} m² ÷ 5 m² per bag`); ctx.labour(S, "vinyl_floor", a); break;
    case "RESIN": ctx.material(S, "resin_floor", ceil(a), `${fmt(a)} m²`); ctx.labour(S, "resin_floor_lay", a); break;
    case "TILE": tiles(ctx, S, { area: a, size: "PORCELAIN_600x600", surface: "floor", label: "floor" }); break;
  }
}

export function skirting(ctx: Ctx, S: string, perimeter: number) {
  if (perimeter <= 0) return;
  const p = qty2(perimeter), lengths = ceil(p * 1.1 / 4.2);
  ctx.material(S, "skirting_mdf", lengths, `${fmt(p)} m × 1.1 ÷ 4.2 m lengths`);
  ctx.material(S, "gripfill", ceil(lengths / 4), `1 tube per 4 lengths`);
  ctx.material(S, "skirting_fixings", ceil(p / 10), `${fmt(p)} m ÷ 10 m`);
  ctx.labour(S, "skirting_fit", p, `${fmt(p)} m`);
}

/** Electrical points first + second fix, downlights, certification. */
/** Electrical items, counted one by one. Each has its accessory, back box, cable run and labour. */
export interface ElecSpec {
  downlights?: number; pendants?: number; switches?: number; sockets?: number; spurs?: number; fanIsolators?: number;
  data?: number; tv?: number; cooker?: number; shaver?: number; outside?: number;
}
type Cable = "cable_15" | "cable_25" | "cable_6" | "cable_data" | "cable_coax";
export const elecItems: { key: keyof ElecSpec; label: string; one: string; mat: string; labour: string; cable: Cable; metres: number; box: boolean; fitting?: string }[] = [
  { key: "downlights", label: "recessed spotlights", one: "recessed spotlight", mat: "downlight", labour: "elec_downlight", cable: "cable_15", metres: 2, box: false },
  { key: "pendants", label: "pendant light points", one: "pendant light point", mat: "ceiling_rose", labour: "elec_light_point", cable: "cable_15", metres: 5, box: false, fitting: "pendant_fitting" },
  { key: "switches", label: "light switches", one: "light switch", mat: "light_switch", labour: "elec_switch", cable: "cable_15", metres: 4, box: true },
  { key: "sockets", label: "double sockets", one: "double socket", mat: "socket_double", labour: "elec_socket", cable: "cable_25", metres: 6, box: true },
  { key: "spurs", label: "fused spurs", one: "fused spur", mat: "fused_spur", labour: "elec_spur", cable: "cable_25", metres: 4, box: true },
  { key: "fanIsolators", label: "fan isolators", one: "fan isolator", mat: "fan_isolator", labour: "elec_isolator", cable: "cable_15", metres: 4, box: true },
  { key: "data", label: "data points", one: "data point", mat: "data_point", labour: "elec_data", cable: "cable_data", metres: 12, box: true },
  { key: "tv", label: "TV points", one: "TV point", mat: "tv_point", labour: "elec_data", cable: "cable_coax", metres: 12, box: true },
  { key: "cooker", label: "cooker circuits (45 A switch)", one: "cooker circuit (45 A switch)", mat: "cooker_switch", labour: "elec_cooker", cable: "cable_6", metres: 12, box: true },
  { key: "shaver", label: "shaver sockets", one: "shaver socket", mat: "shaver_socket", labour: "elec_shaver", cable: "cable_15", metres: 5, box: true },
  { key: "outside", label: "outside lights", one: "outside light", mat: "outside_light_point", labour: "elec_outside", cable: "cable_15", metres: 8, box: true, fitting: "outside_light_fitting" },
];
export const elecTotal = (e: ElecSpec) => elecItems.reduce((s, i) => s + (e[i.key] ?? 0), 0);
const elecName = (i: (typeof elecItems)[number], n: number) => `${n} ${n === 1 ? i.one : i.label}`;
export const elecSummary = (e: ElecSpec) => elecItems.filter(i => (e[i.key] ?? 0) > 0).map(i => elecName(i, e[i.key]!)).join(", ");

/**
 * Electrics item by item: accessory + back box + cable run + first & second fix labour.
 * A rewire also strips out the old wiring and fills the chases. New circuits (cooker) get an RCBO unless a new board is fitted.
 */
export function electricsItems(ctx: Ctx, S: string, e: ElecSpec, opts: { label: string; rewire?: boolean }) {
  const total = elecTotal(e);
  if (total <= 0) return 0;
  const cables: Partial<Record<Cable, number>> = {};
  let boxes = 0;
  for (const it of elecItems) {
    const n = Math.max(0, Math.round(e[it.key] ?? 0));
    if (!n) continue;
    ctx.material(S, it.mat, n, `${opts.label}: ${elecName(it, n)}`);
    if (it.fitting) ctx.material(S, it.fitting, n, elecName(it, n));
    ctx.labour(S, it.labour, n, `${opts.label}: ${elecName(it, n)}`);
    cables[it.cable] = (cables[it.cable] ?? 0) + n * it.metres;
    if (it.box) boxes += n;
  }
  for (const [k, metres] of Object.entries(cables) as [Cable, number][]) ctx.material(S, k, Math.ceil(metres * 1.1), `${fmt(metres)} m runs + 10%`);
  if (boxes) ctx.material(S, "back_box", boxes, `${boxes} wall accessories`);
  ctx.material(S, "elec_sundries", 1, `${opts.label}: clips, grommets, junction boxes, connectors`);
  if (opts.rewire) {
    ctx.labour(S, "elec_strip_old", total, `${opts.label}: remove old wiring, ${total} items`);
    ctx.labour(S, "make_good_chases", total, `${opts.label}: fill chases for ${total} items`);
    ctx.material(S, "bonding_plaster", Math.max(1, Math.ceil(total / 15)), `1 bag per 15 chased items`, "Bonding plaster for chases");
  }
  if ((e.cooker ?? 0) > 0 && !newConsumerUnit(ctx.input)) ctx.material(S, "rcbo", e.cooker!, `${e.cooker} new circuit${e.cooker! > 1 ? "s" : ""} in the existing board`);
  return total;
}

/** Radiators: radiator, valve pair, 15 mm flow & return (run × 2), 4 elbows, 2 tees, clips, drain-off, inhibitor top-up. */
export function radiators(ctx: Ctx, S: string, count: number, run = 4) {
  if (count <= 0) return;
  const pipe = count * run * 2;
  ctx.material(S, "radiator", count, `${count} radiators`);
  ctx.material(S, "rad_valves", count, `${count} radiators × 1 pair`);
  ctx.material(S, "pipe_cu_15", Math.ceil(pipe * 1.1), `${count} × ${fmt(run)} m × 2 (flow & return) + 10%`, "Copper pipe 15 mm – heating");
  ctx.material(S, "elbow90_15_cu", count * 4, `${count} × 4`, "15 mm 90° elbows – heating");
  ctx.material(S, "tee_15_cu", count * 2, `${count} × 2 (tee off flow & return)`, "15 mm tees – heating");
  ctx.material(S, "pipe_clip_15", Math.ceil(pipe / 0.6), `${fmt(pipe)} m ÷ 0.6 m`, "Pipe clips – heating");
  ctx.material(S, "solder_flux", count, `${count} radiators`);
  ctx.material(S, "drain_cock", 1, "drain down & refill");
  ctx.material(S, "inhibitor", 1, "refill with inhibitor");
  ctx.labour(S, "radiator_fit", count, `${count} radiators`);
}

/** Windows: frame, board, fixings kit (fixings, packers, foam, silicone, trims) and fitting. */
export function fitWindows(ctx: Ctx, S: string, n: number, key: string, label: string) {
  if (n <= 0) return;
  ctx.material(S, key, n, `${n} ${label}`);
  ctx.material(S, "window_board", n, `${n} windows`);
  ctx.material(S, "window_fixings", n, `${n} windows`);
  ctx.labour(S, "window_fit", n, `${n} ${label}`);
}

/** Timber stud wall: studs at 400 centres + top/bottom plate + noggin row, acoustic wool. Returns faces to board. */
export function studWall(ctx: Ctx, S: string, length: number, height: number, label: string) {
  if (length <= 0) return 0;
  const studs = ceil(length / 0.4) + 1, area = qty2(length * height);
  ctx.material(S, "timber_47x100", qty2(studs * height + 3 * length), `${studs} studs × ${fmt(height)} m + 3 × ${fmt(length)} m plates/noggins`, `Stud wall timber – ${label}`);
  ctx.material(S, "acoustic_wool", ceil(area), `${fmt(area)} m²`);
  ctx.labour(S, "stud_wall", area, `${label} ${fmt(length)} m × ${fmt(height)} m`);
  return area * 2;
}

export function stripOut(ctx: Ctx, S: string, area: number, label: string) {
  if (area <= 0) return;
  ctx.labour(S, "strip_out", qty2(area), `${label} ${fmt(area)} m²`);
}

/** New door with supporting materials and the company labour rate. Painting is added via paint(). */
export function newDoors(ctx: Ctx, S: string, n: number, doorType: string, o: { lining?: boolean; architrave?: boolean; hinges?: boolean; handle?: boolean; stop?: boolean; paint?: boolean; label?: string } = {}) {
  if (n <= 0) return;
  const per = (q: number, what: string) => `${n} door${n > 1 ? "s" : ""} × ${q} ${what}`;
  const name = ctx.rates.materials[doorType]?.name ?? "Door";
  ctx.material(S, doorType, n, per(1, "door"), o.label ? `${name} – ${o.label}` : name);
  if (o.lining !== false) ctx.material(S, "door_lining", n, per(1, "lining set"));
  if (o.architrave !== false) ctx.material(S, "architrave_set", n * 2, per(2, "sides"));
  if (o.hinges !== false) ctx.material(S, "hinges_pair", Math.ceil(n * 1.5), `${n} × 3 hinges = ${Math.ceil(n * 1.5)} pairs`);
  if (o.handle !== false) ctx.material(S, "handle_set", n, per(1, "set"));
  if (o.stop !== false) ctx.material(S, "door_stop", n, per(1, "set"));
  ctx.material(S, "door_fixings", n, per(1, "set"));
  if (doorType === "door_fire") { ctx.material(S, "fire_door_kit", n, per(1, "set")); ctx.material(S, "door_closer", n, per(1, "closer")); }
  ctx.labour(S, "door_hang", n, `${n} × £200, 1 day each`);
  if (o.paint) paint(ctx, S, { label: o.label ?? "new doors", rooms: 0,
    doorParts: { leavesNew: n, leavesOld: 0, framesNew: o.lining !== false ? n : 0, framesOld: o.lining !== false ? 0 : n, architravesNew: o.architrave !== false ? n : 0, architravesOld: o.architrave !== false ? 0 : n } });
}

// ---------------------------------------------------------------- Tiles

export const tileOptions: [string, string][] = [
  ["CERAMIC_300x600", "Ceramic 300 × 600"], ["PORCELAIN_300x600", "Porcelain 300 × 600"], ["PORCELAIN_600x600", "Porcelain 600 × 600"],
  ["PORCELAIN_600x1200", "Large porcelain 600 × 1200"], ["METRO_75x150", "Metro 75 × 150"], ["MOSAIC", "Mosaic"], ["STONE_600x400", "Natural stone 600 × 400"],
  ["CERAMIC_250x400", "Ceramic 250 × 400 (budget)"], ["METRO_100x200", "Metro 100 × 200"], ["ZELLIGE", "Handmade / zellige look"],
  ["WOODLOOK_200x1200", "Wood-effect plank 200 × 1200"], ["TERRAZZO_600", "Terrazzo-effect 600 × 600"],
];
const tileSpec: Record<string, { key: string; w: number; h: number; box: number; labour: string; large?: boolean; small?: boolean }> = {
  CERAMIC_300x600: { key: "tile_ceramic_300x600", w: 0.3, h: 0.6, box: 1.44, labour: "wall_tiling" },
  PORCELAIN_300x600: { key: "tile_porcelain_300x600", w: 0.3, h: 0.6, box: 1.44, labour: "wall_tiling" },
  PORCELAIN_600x600: { key: "tile_porcelain_600x600", w: 0.6, h: 0.6, box: 1.08, labour: "wall_tiling" },
  PORCELAIN_600x1200: { key: "tile_porcelain_600x1200", w: 0.6, h: 1.2, box: 1.44, labour: "wall_tiling_large", large: true },
  METRO_75x150: { key: "tile_metro_75x150", w: 0.075, h: 0.15, box: 1, labour: "wall_tiling_small", small: true },
  MOSAIC: { key: "tile_mosaic", w: 0.3, h: 0.3, box: 1, labour: "wall_tiling_small", small: true },
  STONE_600x400: { key: "tile_stone_600x400", w: 0.6, h: 0.4, box: 0.96, labour: "wall_tiling_large", large: true },
  CERAMIC_250x400: { key: "tile_ceramic_250x400", w: 0.25, h: 0.4, box: 1, labour: "wall_tiling" },
  METRO_100x200: { key: "tile_metro_100x200", w: 0.1, h: 0.2, box: 1, labour: "wall_tiling_small", small: true },
  ZELLIGE: { key: "tile_zellige", w: 0.1, h: 0.1, box: 0.5, labour: "wall_tiling_small", small: true },
  WOODLOOK_200x1200: { key: "tile_woodlook_200x1200", w: 0.2, h: 1.2, box: 1.44, labour: "wall_tiling_large", large: true },
  TERRAZZO_600: { key: "tile_terrazzo_600", w: 0.6, h: 0.6, box: 1.08, labour: "wall_tiling" },
};

/**
 * Tiling by tile size. Tiles = ⌈area × 1.1 ÷ tile area⌉, boxes = ⌈area × 1.1 ÷ box coverage⌉.
 * Adhesive 1 bag per 4 m² (walls) / 3 m² (floors) / 2.5 m² (large format, back-buttered);
 * grout 1 bag per 5 m² (3 m² for small tiles); spacers ≈3 per tile; levelling clips ≈4 per large tile.
 */
export function tiles(ctx: Ctx, S: string, o: { area: number; size: string; surface: "wall" | "floor"; label: string; trims?: number }) {
  if (o.area <= 0) return;
  const t = tileSpec[o.size] ?? tileSpec.PORCELAIN_300x600;
  const a = qty2(o.area), buy = a * 1.1;
  const count = ceil(buy / (t.w * t.h)), boxes = ceil(buy / t.box);
  ctx.material(S, t.key, boxes, `${fmt(a)} m² + 10% = ${fmt(buy)} m² → ${count} tiles = ${boxes} boxes of ${t.box} m²`, `${ctx.rates.materials[t.key].name.split(" (")[0]} – ${o.label} ${o.surface}`);
  const perBag = t.large ? 2.5 : o.surface === "floor" ? 3 : 4;
  ctx.material(S, "tile_adhesive", ceil(a / perBag), `${fmt(a)} m² ÷ ${perBag} m² per 20 kg bag`);
  ctx.material(S, "grout", ceil(a / (t.small ? 3 : 5)), `${fmt(a)} m² ÷ ${t.small ? 3 : 5} m² per bag`);
  ctx.material(S, "tile_primer", ceil(a / 25), `${fmt(a)} m² ÷ 25 m² per tub`);
  if (!t.small) ctx.material(S, "tile_spacers", ceil(count * 3 / 250), `${count} tiles × 3 spacers ÷ 250`);
  if (t.large) ctx.material(S, "tile_levelling", ceil(count * 4 / 100), `${count} tiles × 4 clips ÷ 100`);
  if (o.trims) ctx.material(S, "tile_trim_length", o.trims, `${o.trims} trims for edges and corners`);
  const labourKey = o.surface === "floor" && !t.large ? "floor_tiling" : t.labour;
  ctx.labour(S, labourKey, a, `${o.label} ${o.surface} ${fmt(a)} m² (${tileOptions.find(([k]) => k === o.size)?.[1]})`);
}

// ---------------------------------------------------------------- Roofline: fascia, soffit, gutters, downpipes

export const fasciaWidthOptions: [string, string][] = [["150", "150 mm"], ["175", "175 mm"], ["200", "200 mm"], ["225", "225 mm"], ["250", "250 mm"]];
export const soffitWidthOptions: [string, string][] = [["NONE", "No soffit"], ["100", "100 mm"], ["150", "150 mm"], ["200", "200 mm"], ["300", "300 mm"]];
export const rooflineColourOptions: [string, string][] = [["WHITE", "White"], ["BLACK", "Black"], ["ANTHRACITE", "Anthracite grey"], ["ROSEWOOD", "Rosewood"], ["GOLDEN_OAK", "Golden oak"]];
export const gutterProfileOptions: [string, string][] = [["HALFROUND", "Half round 112 mm"], ["SQUARE", "Square 114 mm"], ["DEEPFLOW", "Deep flow 115 mm"], ["OGEE", "Ogee 122 mm"]];
export const gutterColourOptions: [string, string][] = [["BLACK", "Black"], ["WHITE", "White"], ["ANTHRACITE", "Anthracite grey"], ["BROWN", "Brown"]];

/** Fascia (and soffit) boards in 5 m lengths with joints, corners, vent strip and pins. */
export function fasciaSoffit(ctx: Ctx, S: string, o: { length: number; fascia: string; soffit: string; colour: string; corners: number; eaves?: boolean; label: string }) {
  if (o.length <= 0) return;
  const L = qty2(o.length), boards = ceil(L * 1.05 / 5);
  ctx.material(S, `fascia_${o.fascia}`, boards, `${fmt(L)} m × 1.05 ÷ 5 m lengths`);
  let colourLengths = boards;
  if (o.soffit !== "NONE") { ctx.material(S, `soffit_${o.soffit}`, boards, `${fmt(L)} m × 1.05 ÷ 5 m lengths`); colourLengths += boards; }
  if (o.colour !== "WHITE") ctx.material(S, "foiled_upcharge", colourLengths, `${colourLengths} lengths in ${rooflineColourOptions.find(([k]) => k === o.colour)?.[1].toLowerCase()}`);
  const joints = Math.max(0, boards - 1) * (o.soffit !== "NONE" ? 2 : 1);
  if (joints) ctx.material(S, "fascia_joint", joints, `${Math.max(0, boards - 1)} joints${o.soffit !== "NONE" ? " × fascia & soffit" : ""}`);
  if (o.corners) ctx.material(S, "fascia_corner", o.corners * (o.soffit !== "NONE" ? 2 : 1), `${o.corners} corner${o.corners > 1 ? "s" : ""}`);
  ctx.material(S, "over_fascia_vent", ceil(L), `${fmt(L)} m`);
  if (o.eaves) ctx.material(S, "eaves_protector", ceil(L / 1.5), `${fmt(L)} m ÷ 1.5 m`);
  ctx.material(S, "polytop_pins", ceil(L / 10), `1 box per 10 m`);
  ctx.labour(S, "fascia_soffit_fit", L, `${o.label} ${fmt(L)} m`);
}

/**
 * Gutter run and downpipes, every component counted:
 * gutter lengths ⌈L × 1.05 ÷ 4⌉, brackets ⌈L ÷ 0.8⌉ + 1 (+1 per angle), unions (lengths − 1), stop ends, outlets,
 * 90° / 135° angles, downpipe lengths ⌈height ÷ 2.5⌉ each, clips ⌈height ÷ 1.8⌉ + 1, 2 offset bends, sockets and shoes.
 */
export function rainwater(ctx: Ctx, S: string, o: { length: number; downpipes: number; height: number; angles90: number; angles135: number; stopEnds: number; profile: string; pipe: "ROUND" | "SQUARE"; label: string }) {
  if (o.length <= 0) return;
  const L = qty2(o.length), lengths = ceil(L * 1.05 / 4);
  const g = `gutter_${o.profile.toLowerCase()}`;
  ctx.material(S, g, lengths, `${fmt(L)} m × 1.05 ÷ 4 m lengths`);
  ctx.material(S, "gutter_bracket", ceil(L / 0.8) + 1 + o.angles90 + o.angles135, `⌈${fmt(L)} m ÷ 0.8 m⌉ + 1 + 1 per angle`);
  if (lengths > 1) ctx.material(S, "gutter_union", lengths - 1, `${lengths} lengths − 1`);
  if (o.stopEnds) ctx.material(S, "gutter_stop_end", o.stopEnds, `${o.stopEnds} end pieces`);
  if (o.angles90) ctx.material(S, "gutter_angle_90", o.angles90, `${o.angles90} × 90°`);
  if (o.angles135) ctx.material(S, "gutter_angle_135", o.angles135, `${o.angles135} × 135° (45°)`);
  const dp = o.downpipes;
  if (dp) {
    const per = ceil(o.height / 2.5);
    ctx.material(S, "gutter_outlet", dp, `${dp} downpipe${dp > 1 ? "s" : ""}`);
    ctx.material(S, o.pipe === "SQUARE" ? "downpipe_square" : "downpipe_round", dp * per, `${dp} × ⌈${fmt(o.height)} m ÷ 2.5 m⌉`);
    ctx.material(S, "pipe_clip", dp * (ceil(o.height / 1.8) + 1), `${dp} × (⌈${fmt(o.height)} ÷ 1.8⌉ + 1)`);
    ctx.material(S, "offset_bend", dp * 2, `${dp} × 2`);
    if (per > 1) ctx.material(S, "pipe_socket", dp * (per - 1), `${dp} × ${per - 1} joints`);
    ctx.material(S, "pipe_shoe", dp, `${dp}`);
  }
  ctx.labour(S, "gutter_fit", qty2(L + dp * o.height), `${fmt(L)} m gutter + ${dp} × ${fmt(o.height)} m downpipe`);
}

/** Shared field set for roofline options (used by loft, extension, roofing). */
export function rooflineFields(group: string, defaults: { fascia?: string; soffit?: string; angles90?: number; downpipes?: number; height?: number } = {}): Field[] {
  return [
    { key: "fasciaWidth", label: "Fascia width", type: "select", default: defaults.fascia ?? "200", options: fasciaWidthOptions, group },
    { key: "soffitWidth", label: "Soffit width", type: "select", default: defaults.soffit ?? "150", options: soffitWidthOptions, group },
    { key: "rooflineColour", label: "Fascia / soffit colour", type: "select", default: "WHITE", options: rooflineColourOptions, clientChoice: true, group },
    { key: "gutterProfile", label: "Gutter profile", type: "select", default: "HALFROUND", options: gutterProfileOptions, group },
    { key: "gutterColour", label: "Gutter colour", type: "select", default: "BLACK", options: gutterColourOptions, clientChoice: true, group },
    { key: "pipe", label: "Downpipe", type: "select", default: "ROUND", options: [["ROUND", "Round 68 mm"], ["SQUARE", "Square 65 mm"]], group },
    { key: "downpipes", label: "Downpipes", type: "int", default: defaults.downpipes ?? 1, min: 0, max: 8, group },
    { key: "downpipeHeight", label: "Downpipe height", type: "number", unit: "m", default: defaults.height ?? 3, min: 0.5, max: 15, group },
    { key: "angles90", label: "Gutter 90° angles", type: "int", default: defaults.angles90 ?? 0, min: 0, max: 12, group },
    { key: "angles135", label: "Gutter 135° (45°) angles", type: "int", default: 0, min: 0, max: 12, group },
    { key: "stopEnds", label: "Gutter stop ends", type: "int", default: 2, min: 0, max: 12, group },
  ];
}

// ---------------------------------------------------------------- Steel beam bearings

/** What each end of a steel sits on – set per beam, per end, from the engineer's design. */
export const bearingOptions: [string, string][] = [
  ["PADSTONE", "Precast concrete padstone"], ["PADSTONE_HEAVY", "Precast padstone 140 mm (heavy load)"], ["PADSTONE_PLATE", "Padstone + steel spreader plate"],
  ["CAST", "Cast-in-place concrete padstone"], ["PLATE", "Steel bearing / spreader plate only"], ["ENG_BRICK", "Engineering brick bearing (3 courses)"],
  ["COLUMN", "Onto a steel column (cap plate)"], ["STEEL", "Bolted to another steel (end plate / cleat)"],
];
const bearingWords: Record<string, string> = {
  PADSTONE: "precast padstone", PADSTONE_HEAVY: "heavy-duty padstone", PADSTONE_PLATE: "padstone and spreader plate", CAST: "cast-in-place padstone",
  PLATE: "steel spreader plate", ENG_BRICK: "engineering brick bearing", COLUMN: "steel column cap plate", STEEL: "bolted steel connection",
};
/** Two fields per beam: end A and end B. */
export function bearingFields(prefix: string, label: string, group: string, when: Field["when"], def = "PADSTONE"): Field[] {
  return [
    { key: `${prefix}EndA`, label: `${label} – end A sits on`, type: "select", default: def, options: bearingOptions, group, when },
    { key: `${prefix}EndB`, label: `${label} – end B sits on`, type: "select", default: def, options: bearingOptions, group, when },
  ];
}
/**
 * Materials and labour for each bearing; returns the words for the scope ("padstones", "padstone one end, plate the other").
 * Every masonry bearing is dry-packed (one bag per four bearings).
 */
export function bearings(ctx: Ctx, S: string, ends: string[], label: string) {
  const count = (t: string) => ends.filter(e => e === t).length;
  const k = (t: string, mat: string, per = 1) => { const n = count(t); if (n) ctx.material(S, mat, n * per, `${label}: ${n} end${n > 1 ? "s" : ""}${per > 1 ? ` × ${per}` : ""} on ${bearingWords[t]}`); return n; };
  k("PADSTONE", "padstone"); k("PADSTONE_HEAVY", "padstone_large"); k("PADSTONE_PLATE", "padstone"); k("PADSTONE_PLATE", "bearing_plate"); k("PLATE", "bearing_plate");
  if (k("CAST", "padstone_cast_mix")) ctx.labour(S, "bearing_cast", count("CAST"), `${label}: ${count("CAST")} cast padstones`);
  if (k("ENG_BRICK", "engineering_brick", 12)) ctx.labour(S, "bearing_brick", count("ENG_BRICK"), `${label}: ${count("ENG_BRICK")} brick bearings`);
  if (k("STEEL", "steel_cleat")) ctx.labour(S, "steel_connection", count("STEEL"), `${label}: ${count("STEEL")} steel-to-steel connections`);
  const masonry = ends.filter(e => e !== "COLUMN" && e !== "STEEL").length;
  if (masonry) ctx.material(S, "dry_pack", Math.ceil(masonry / 4), `${label}: ${masonry} bearings ÷ 4 per bag`);
  const kinds = [...new Set(ends)];
  return kinds.length === 1 ? `${bearingWords[kinds[0]]}s at both ends` : kinds.map(t => `${count(t)} × ${bearingWords[t]}`).join(", ");
}
