import type { Ctx } from "../engine";
import { fmt, qty2 } from "../util";
import { plumbFixtures, type PipeSystem } from "./plumbing";
import { boardAndSkim, flooring, paint, skim, stripOut, tiles } from "./common";

export interface BathroomSpec {
  length: number; width: number; height: number;
  layout: "BATH" | "BATH_SHOWER" | "SHOWER" | "WALK_IN";
  grade: "STANDARD" | "MID" | "PREMIUM";
  wallTiling: "FULL" | "HALF" | "WET_ZONES";
  floorTiling: boolean; ufh: boolean; towelRail: boolean; extractor: boolean;
  downlights: number; strip: boolean; ceiling: boolean; decorate: boolean;
  /** The bathroom door is new (e.g. a loft en-suite): full paint system instead of a repaint. */
  newDoor?: boolean;
  wallTileSize?: string; floorTileSize?: string;
  /** Distance to the nearest hot & cold supply, and to the soil stack (m). */
  supplyRun?: number; wasteRun?: number; pipe?: PipeSystem;
}

const layoutLabels: Record<BathroomSpec["layout"], string> = { BATH: "bath", BATH_SHOWER: "bath with shower over", SHOWER: "shower enclosure", WALK_IN: "walk-in shower" };

/**
 * Bathroom formulas.
 *   floor A = L × W, perimeter P = 2(L + W), walls = P × H − door 1.6 m²
 *   tiled walls: full = walls; half = P × 1.2 − 0.96; wet zones = shower 2 × 1.0 × 2.1, bath (1.7 + 0.7) × 0.6 (× 2.0 high with shower over), basin 0.36
 *   tiles +10%, adhesive 1 bag / 4 m² wall, 1 bag / 3 m² floor, grout 1 bag / 5 m², backer board & tanking to the wet zone
 */
export function buildBathroom(ctx: Ctx, S: (s: string) => string, b: BathroomSpec, label: string) {
  const A = qty2(b.length * b.width), P = 2 * (b.length + b.width);
  const walls = qty2(P * b.height - 1.6);
  const hasShower = b.layout !== "BATH", hasBath = b.layout === "BATH" || b.layout === "BATH_SHOWER";
  const wet = qty2((b.layout === "SHOWER" || b.layout === "WALK_IN" ? 2 * 1.0 * 2.1 : 0) + (hasBath ? (1.7 + 0.7) * (b.layout === "BATH_SHOWER" ? 2.0 : 0.6) : 0) + 0.36);
  const tiled = Math.min(walls, b.wallTiling === "FULL" ? walls : b.wallTiling === "HALF" ? qty2(P * 1.2 - 0.96) : wet);
  const g = b.grade.toLowerCase();

  if (b.strip) stripOut(ctx, S("Strip out"), A * 3, `${label}: remove suite, tiles and boards (${fmt(A)} m² room × 3)`);

  // First fix
  ctx.labour(S("First fix"), "bathroom_first_fix", 1, `${label}: supplies, wastes${hasShower ? ", shower valve" : ""}`);
  plumbFixtures(ctx, S("First fix"), [["BASIN", 1], ["WC", 1], ["BATH", hasBath ? 1 : 0], ["SHOWER", hasShower ? 1 : 0], ["TOWEL_RAIL", b.towelRail ? 1 : 0]],
    { pipe: b.pipe, supplyRun: b.supplyRun ?? 4, wasteRun: b.wasteRun ?? 2, label });
  if (b.extractor) { ctx.material(S("First fix"), "extractor_fan", 1, "1 fan"); ctx.material(S("First fix"), "extract_duct_kit", 1, "1 fan"); ctx.labour(S("First fix"), "duct_fit", 1, "extract duct to outside"); }
  ctx.material(S("First fix"), "tile_backer_board", Math.ceil(wet / 0.72 - 1e-9), `wet zone ${fmt(wet)} m² ÷ 0.72 m² per board`);
  ctx.material(S("First fix"), "tanking_kit", Math.ceil(wet / 6 - 1e-9), `${fmt(wet)} m² ÷ 6 m² per kit`);
  ctx.labour(S("First fix"), "tile_backer", wet, `wet zone ${fmt(wet)} m²`);

  // Plastering
  if (b.ceiling) boardAndSkim(ctx, S("Plastering"), A, `${label} ceiling`, { board: "moisture" });
  if (walls - tiled > 0.5) skim(ctx, S("Plastering"), walls - tiled, `${label} untiled walls`);

  // Tiling
  const T = S("Tiling");
  tiles(ctx, T, { area: tiled, size: b.wallTileSize ?? "PORCELAIN_300x600", surface: "wall", label, trims: Math.ceil((P + 4) / 2.5) });
  if (b.ufh) { ctx.material(T, "ufh_mat", Math.ceil(A * 0.7), `${fmt(A)} m² × 70% heated area`); ctx.labour(T, "ufh_fit", A * 0.7); }
  if (b.floorTiling) {
    ctx.material(T, "tile_backer_board", Math.ceil(A * 1.05 / 0.72 - 1e-9), `floor ${fmt(A)} m² + 5% ÷ 0.72 m² (rigid base over timber floor)`, "Tile backer board – floor");
    ctx.material(T, "board_screws", 1, "1 box of backer board screws & washers");
    ctx.labour(T, "tile_backer", A, `floor ${fmt(A)} m²`);
  }
  if (b.floorTiling) tiles(ctx, T, { area: A, size: b.floorTileSize ?? "PORCELAIN_600x600", surface: "floor", label }); else flooring(ctx, T, A, "LVT");

  // Second fix
  const F = S("Second fix");
  ctx.material(F, `suite_${g}`, 1, `${b.grade.toLowerCase()} suite`);
  if (hasShower) ctx.material(F, `shower_${g}`, 1, layoutLabels[b.layout]);
  if (b.towelRail) ctx.material(F, "towel_rail", 1, "1 towel rail");
  const items = 3 + (hasShower && hasBath ? 1 : 0) + (b.towelRail ? 1 : 0);
  ctx.material(F, "silicone", 2 + (hasBath ? 1 : 0), "bath / tray, basin, WC & tile edges");
  ctx.labour(F, "sanitary_fit", items, `${items} items: WC, basin, ${layoutLabels[b.layout]}${b.towelRail ? ", towel rail" : ""}`);

  if (b.decorate) paint(ctx, S("Decoration"), { label, ceilings: b.ceiling ? A : 0, walls: Math.max(0, walls - tiled), newPlaster: (b.ceiling ? A : 0) + Math.max(0, walls - tiled), system: "KITCHEN_BATH",
    doorParts: b.newDoor ? { leavesNew: 1, leavesOld: 0, framesNew: 1, framesOld: 0, architravesNew: 1, architravesOld: 0 } : { leavesNew: 0, leavesOld: 1, framesNew: 0, framesOld: 1, architravesNew: 0, architravesOld: 1 } });

  ctx.scope(`${label}: ${b.strip ? "strip out existing, " : ""}first fix plumbing (supplies to ${b.supplyRun ?? 4} m, wastes to ${b.wasteRun ?? 2} m), tank wet zones, ${b.wallTiling === "FULL" ? "full height" : b.wallTiling === "HALF" ? "half height" : "wet zone"} wall tiling (${fmt(tiled)} m²), ${b.floorTiling ? "tiled" : "LVT"} floor (${fmt(A)} m²), install ${b.grade.toLowerCase()} suite with ${layoutLabels[b.layout]}${b.towelRail ? ", heated towel rail" : ""}${b.extractor ? ", extractor fan" : ""}${b.downlights ? `, ${b.downlights} downlights` : ""}${b.ufh ? ", underfloor heating" : ""}.`);
}
