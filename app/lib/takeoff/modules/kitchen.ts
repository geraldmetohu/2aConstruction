import type { Ctx } from "../engine";
import { fmt, qty2 } from "../util";
import { plumbFixtures, type PipeSystem } from "./plumbing";
import { electricsItems, flooring, flooringOptions, gradeOptions, paint, skim, stripOut, tiles } from "./common";
import type { Cond, Field } from "../package";

export interface KitchenSpec {
  length: number; width: number; height: number;
  baseRun: number; wallRun: number; tallUnits: number; island: number; // island length, 0 = none
  grade: string; worktop: string; appliances: number; splashback: boolean;
  points: number; flooring: string; strip: boolean; decorate: boolean;
  splashbackTile?: string;
  washingMachine?: boolean; dishwasher?: boolean; hood?: boolean; supplyRun?: number; wasteRun?: number; pipe?: PipeSystem;
  /** US = we supply & fit; WE_FIT = client supplies the kitchen, we fit it; CLIENT = the client's kitchen company supplies & fits (we do first fix & making good). */
  fitBy?: "US" | "WE_FIT" | "CLIENT";
  /** New cooker / hob circuit (10 mm² cable, 45 A switch). */
  hob?: boolean;
  /** Extractor: wall (short duct straight out) or ceiling (duct run through the ceiling void). */
  hoodType?: "WALL" | "CEILING";
  /** Move the boiler: metres of pipe & flue run (up to 3 m is the standard price). */
  boilerMove?: boolean; boilerRun?: number;
  /** Extra kitchen sockets and appliance spurs. */
  sockets?: number; spurs?: number;
}

export const fitByOptions: [string, string][] = [["US", "We supply & fit the kitchen"], ["WE_FIT", "Client supplies, we fit it"], ["CLIENT", "Client's kitchen company supplies & fits"]];

/** Kitchen questions for a project (extension, loft…). Keys start with "k" so they don't clash with the project's own fields. */
export function kitchenFields(group: string, when: Cond[] = []): Field[] {
  const on: Cond[] = [...when, { key: "kitchen", is: true }];
  const w = (extra: Cond[] = []) => [...on, ...extra];
  return [
    { key: "kitchen", label: "Kitchen in this project", type: "boolean", default: false, public: true, group, when },
    { key: "kFitBy", label: "Who fits the kitchen", type: "select", default: "WE_FIT", options: fitByOptions, group, when: w() },
    { key: "kBaseRun", label: "Base units run", type: "number", unit: "m", default: 4.2, min: 0.6, max: 20, public: true, group, when: w() },
    { key: "kWallRun", label: "Wall units run", type: "number", unit: "m", default: 3, min: 0, max: 15, group, when: w() },
    { key: "kTall", label: "Tall units", type: "int", default: 1, min: 0, max: 6, group, when: w() },
    { key: "kIsland", label: "Island length (0 = none)", type: "number", unit: "m", default: 0, min: 0, max: 5, public: true, group, when: w() },
    { key: "kGrade", label: "Unit grade", type: "select", default: "MID", options: gradeOptions, clientChoice: true, group, when: w([{ key: "kFitBy", is: "US" }]) },
    { key: "kWorktop", label: "Worktop", type: "select", default: "LAMINATE", clientChoice: true, options: [["LAMINATE", "Laminate"], ["WOOD", "Solid wood"], ["QUARTZ", "Quartz"]], group, when: w([{ key: "kFitBy", is: "US" }]) },
    { key: "kAppliances", label: "Appliances to install", type: "int", default: 4, min: 0, max: 10, group, when: w([{ key: "kFitBy", not: "CLIENT" }]) },
    { key: "kHob", label: "New hob / cooker circuit (10 mm² cable, 45 A switch)", type: "boolean", default: true, group, when: w() },
    { key: "kSockets", label: "Kitchen double sockets", type: "int", default: 6, min: 0, max: 20, group, when: w() },
    { key: "kSpurs", label: "Appliance fused spurs (fridge, dishwasher, washer, hood…)", type: "int", default: 4, min: 0, max: 12, group, when: w() },
    { key: "kHood", label: "Cooker hood ducted outside", type: "boolean", default: true, group, when: w() },
    { key: "kHoodType", label: "Extract route", type: "select", default: "WALL", group, options: [["WALL", "Through the wall (core drill)"], ["CEILING", "Through the ceiling void to outside"]], when: w([{ key: "kHood", is: true }]) },
    { key: "kSinkRun", label: "Sink to nearest supply / drain", type: "number", unit: "m", default: 3, min: 0.5, max: 25, group, when: w() },
    { key: "kBoilerMove", label: "Move the boiler", type: "boolean", default: false, group, when: w() },
    { key: "kBoilerRun", label: "Boiler pipe & flue run", type: "number", unit: "m", default: 3, min: 0.5, max: 25, group, hint: "Up to 3 m is the standard price; each metre after costs extra", when: w([{ key: "kBoilerMove", is: true }]) },
  ];
}

/**
 * Kitchen formulas: base units = ⌈run ÷ 0.6⌉ + island + tall × 2; wall units = ⌈run ÷ 0.6⌉;
 * worktop = (run + island) × 1.05; splashback = wall run × 0.6 m; floor outside the units.
 */
export function buildKitchen(ctx: Ctx, S: (s: string) => string, k: KitchenSpec, label: string) {
  const A = qty2(k.length * k.width);
  const g = k.grade.toLowerCase();
  const baseUnits = Math.ceil(k.baseRun / 0.6 - 1e-9) + Math.ceil(k.island / 0.6 - 1e-9);
  const wallUnits = Math.ceil(k.wallRun / 0.6 - 1e-9);

  if (k.strip) stripOut(ctx, S("Strip out"), A * 2, `${label}: remove old kitchen (${fmt(A)} m² × 2)`);
  const fit = k.fitBy ?? "US";
  // Electrics for the kitchen: hob circuit, sockets and appliance spurs.
  electricsItems(ctx, S("First fix"), { cooker: k.hob ? 1 : 0, sockets: k.sockets ?? 0, spurs: k.spurs ?? 0 }, { label: `${label} kitchen` });
  if (k.boilerMove) {
    const run = k.boilerRun ?? 3;
    ctx.labour(S("First fix"), "boiler_move", 1, `${label}: move boiler (first 3 m)`);
    if (run > 3) ctx.labour(S("First fix"), "boiler_move_extra", qty2(run - 3), `${fmt(run)} m run − 3 m included = ${fmt(run - 3)} m`);
  }

  ctx.labour(S("First fix"), "kitchen_plumbing", 1, `sink${k.dishwasher !== false ? ", dishwasher" : ""}${k.washingMachine !== false ? ", washing machine" : ""}`);
  plumbFixtures(ctx, S("First fix"), [["KITCHEN_SINK", 1], ["DISHWASHER", k.dishwasher !== false ? 1 : 0], ["WASHING_MACHINE", k.washingMachine !== false ? 1 : 0]],
    { pipe: k.pipe, supplyRun: k.supplyRun ?? 3, wasteRun: k.wasteRun ?? 2, label });
  if (k.hood !== false) {
    const ceiling = k.hoodType === "CEILING";
    ctx.material(S("First fix"), "hood_duct_kit", ceiling ? 2 : 1, ceiling ? "cooker hood – duct through the ceiling void" : "cooker hood");
    ctx.labour(S("First fix"), "duct_fit", ceiling ? 2 : 1, ceiling ? "duct run through the ceiling void to outside" : "core drill & duct to outside");
  }

  const U = S("Kitchen fit-out");
  if (fit === "CLIENT") {
    ctx.scope(`${label}: kitchen supplied and fitted by your kitchen company. We do the first fix plumbing, ${k.hob ? "hob circuit, " : ""}${k.sockets ? `${k.sockets} sockets, ` : ""}${k.spurs ? `${k.spurs} appliance spurs, ` : ""}${k.hood !== false ? "extract duct, " : ""}${k.boilerMove ? "boiler move, " : ""}making good${k.decorate ? " and decoration" : ""}.`);
    ctx.assume("Kitchen units, worktops, sink and appliances are supplied and fitted by the client's kitchen company; we coordinate the first fix positions with their drawings.");
    flooring(ctx, S("Second fix"), qty2(Math.max(A * 0.5, A - (k.baseRun + k.island) * 0.6)), k.flooring);
    if (k.decorate) { const walls = qty2(2 * (k.length + k.width) * k.height * 0.5); skim(ctx, S("Plastering"), walls + A, `${label} exposed walls & ceiling`); paint(ctx, S("Decoration"), { label, ceilings: A, walls, newPlaster: walls + A, system: "KITCHEN_BATH" }); }
    return;
  }
  const supply = fit === "US";
  if (!supply) ctx.assume("Kitchen units, worktops, sink and tap are supplied by the client, delivered before the fit date; we fit them.");
  if (supply) ctx.material(U, `base_unit_${g}`, baseUnits + k.tallUnits * 2, `⌈${fmt(k.baseRun)} m ÷ 0.6⌉${k.island ? ` + ⌈${fmt(k.island)} m island ÷ 0.6⌉` : ""} + ${k.tallUnits} tall × 2 = ${baseUnits + k.tallUnits * 2}`);
  if (supply && wallUnits) ctx.material(U, `wall_unit_${g}`, wallUnits, `⌈${fmt(k.wallRun)} m ÷ 0.6⌉`);
  ctx.material(U, "kitchen_sundries", baseUnits + wallUnits + k.tallUnits, `${baseUnits + wallUnits + k.tallUnits} units`);
  const top = Math.ceil((k.baseRun + k.island) * 1.05 * 10) / 10;
  const wt = k.worktop;
  if (supply) ctx.material(U, wt === "QUARTZ" ? "worktop_quartz" : wt === "WOOD" ? "worktop_wood" : "worktop_laminate", top, `(${fmt(k.baseRun)} + ${fmt(k.island)} m) + 5%`);
  if (supply) ctx.material(U, "sink_tap", 1, "1 sink & tap");
  const joints = (k.baseRun > 3 ? 1 : 0) + (k.baseRun > 6 ? 1 : 0) + (k.island ? 1 : 0) + 1;
  ctx.material(U, "worktop_joint_kit", joints, `${joints} joints / end caps`);
  ctx.material(U, "silicone", 2, "worktop & upstand edges");
  ctx.labour(U, "kitchen_units", baseUnits + wallUnits + k.tallUnits * 2 + k.appliances * 0.5, `${baseUnits} base + ${wallUnits} wall + ${k.tallUnits} tall (×2) + ${k.appliances} appliances (×0.5)`);
  if (wt !== "QUARTZ") ctx.labour(U, "worktop_fit", top);
  else ctx.assume("Quartz worktops are templated and fitted by the supplier after units are installed (adds about a week).");
  if (k.splashback) {
    const sb = qty2((k.wallRun || k.baseRun) * 0.6);
    tiles(ctx, U, { area: sb, size: k.splashbackTile ?? "METRO_75x150", surface: "wall", label: `${label} splashback`, trims: Math.ceil((k.wallRun || k.baseRun) / 2.5) });
  }
  const floorArea = qty2(Math.max(A * 0.5, A - (k.baseRun + k.island) * 0.6));
  flooring(ctx, S("Second fix"), floorArea, k.flooring);
  if (k.decorate) {
    const walls = qty2(2 * (k.length + k.width) * k.height * 0.5);
    skim(ctx, S("Plastering"), walls + A, `${label} exposed walls & ceiling`);
    paint(ctx, S("Decoration"), { label, ceilings: A, walls, newPlaster: walls + A, system: "KITCHEN_BATH" });
  }
  ctx.scope(`${label}: ${k.strip ? "strip out existing, " : ""}plumbing, ${baseUnits + k.tallUnits * 2} base and ${wallUnits} wall ${g} units${k.island ? ` with ${fmt(k.island)} m island` : ""}, ${fmt(top)} m ${wt === "QUARTZ" ? "quartz" : wt === "WOOD" ? "solid wood" : "laminate"} worktop, sink, ${k.appliances} appliances installed${k.splashback ? ", tiled splashback" : ""}, ${flooringOptions.find(([x]) => x === k.flooring)?.[1].toLowerCase()} floor (${fmt(floorArea)} m²).`);
  ctx.assume("Kitchen appliances supplied by the client unless listed; gas work by a Gas Safe engineer priced separately.");
}
