import type { Ctx } from "../engine";
import { fmt, qty2 } from "../util";
import { plumbFixtures, type PipeSystem } from "./plumbing";
import { flooring, flooringOptions, paint, skim, stripOut, tiles } from "./common";

export interface KitchenSpec {
  length: number; width: number; height: number;
  baseRun: number; wallRun: number; tallUnits: number; island: number; // island length, 0 = none
  grade: string; worktop: string; appliances: number; splashback: boolean;
  points: number; flooring: string; strip: boolean; decorate: boolean;
  splashbackTile?: string;
  washingMachine?: boolean; dishwasher?: boolean; hood?: boolean; supplyRun?: number; wasteRun?: number; pipe?: PipeSystem;
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

  ctx.labour(S("First fix"), "kitchen_plumbing", 1, `sink${k.dishwasher !== false ? ", dishwasher" : ""}${k.washingMachine !== false ? ", washing machine" : ""}`);
  plumbFixtures(ctx, S("First fix"), [["KITCHEN_SINK", 1], ["DISHWASHER", k.dishwasher !== false ? 1 : 0], ["WASHING_MACHINE", k.washingMachine !== false ? 1 : 0]],
    { pipe: k.pipe, supplyRun: k.supplyRun ?? 3, wasteRun: k.wasteRun ?? 2, label });
  if (k.hood !== false) { ctx.material(S("First fix"), "hood_duct_kit", 1, "cooker hood"); ctx.labour(S("First fix"), "duct_fit", 1, "cooker hood duct to outside"); }

  const U = S("Kitchen fit-out");
  ctx.material(U, `base_unit_${g}`, baseUnits + k.tallUnits * 2, `⌈${fmt(k.baseRun)} m ÷ 0.6⌉${k.island ? ` + ⌈${fmt(k.island)} m island ÷ 0.6⌉` : ""} + ${k.tallUnits} tall × 2 = ${baseUnits + k.tallUnits * 2}`);
  if (wallUnits) ctx.material(U, `wall_unit_${g}`, wallUnits, `⌈${fmt(k.wallRun)} m ÷ 0.6⌉`);
  ctx.material(U, "kitchen_sundries", baseUnits + wallUnits + k.tallUnits, `${baseUnits + wallUnits + k.tallUnits} units`);
  const top = Math.ceil((k.baseRun + k.island) * 1.05 * 10) / 10;
  const wt = k.worktop;
  ctx.material(U, wt === "QUARTZ" ? "worktop_quartz" : wt === "WOOD" ? "worktop_wood" : "worktop_laminate", top, `(${fmt(k.baseRun)} + ${fmt(k.island)} m) + 5%`);
  ctx.material(U, "sink_tap", 1, "1 sink & tap");
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
