import { bool, num, str, type WorkPackage, type Values } from "../package";
import { fmt, qty2 } from "../util";
import type { Ctx } from "../engine";

/**
 * Fitted joinery: wardrobes (hinged or sliding), alcove units, shelving & bookcases, floating shelves,
 * media walls, under-stairs pull-outs, loft eaves storage, window seats and base cabinet runs.
 * Bespoke items are made on site from sheet material: every board, front, hinge, runner, rail, handle,
 * edging, fixing and finish is measured from the sizes, plus the joiner's and decorator's time.
 * "Fit only" items are units the client buys (e.g. flat-pack) that we assemble and fit with fillers and scribes.
 */

export type JoineryType = "WARDROBE" | "SLIDING" | "ALCOVE" | "SHELVES" | "FLOATING" | "MEDIA" | "UNDERSTAIRS" | "EAVES" | "WINDOW_SEAT" | "BASE_RUN";
interface TypeSpec { label: string; h: number; d: number; bay: number; fronts: "HINGED" | "SLIDING" | "NONE" | "PULLOUT"; mult: number; noun: string }
export const JOINERY_TYPES: Record<JoineryType, TypeSpec> = {
  WARDROBE: { label: "Fitted wardrobe – hinged doors", h: 2.4, d: 0.6, bay: 0.9, fronts: "HINGED", mult: 1, noun: "fitted wardrobe" },
  SLIDING: { label: "Fitted wardrobe – sliding doors", h: 2.4, d: 0.65, bay: 1.0, fronts: "SLIDING", mult: 0.8, noun: "sliding-door wardrobe" },
  ALCOVE: { label: "Alcove unit – cupboard below, shelves above", h: 2.4, d: 0.4, bay: 0.9, fronts: "HINGED", mult: 1, noun: "alcove unit" },
  SHELVES: { label: "Open shelving / bookcase", h: 2.0, d: 0.3, bay: 0.8, fronts: "NONE", mult: 0.6, noun: "bookcase / open shelving" },
  FLOATING: { label: "Floating shelves (oak or painted)", h: 0, d: 0.25, bay: 9, fronts: "NONE", mult: 0, noun: "floating shelves" },
  MEDIA: { label: "Media wall – TV recess with cabinets", h: 2.4, d: 0.45, bay: 0.9, fronts: "HINGED", mult: 1, noun: "media wall" },
  UNDERSTAIRS: { label: "Under-stairs pull-out storage", h: 1.6, d: 0.9, bay: 0.5, fronts: "PULLOUT", mult: 1.2, noun: "under-stairs storage" },
  EAVES: { label: "Loft eaves storage", h: 1.1, d: 0.7, bay: 0.8, fronts: "HINGED", mult: 1.1, noun: "eaves storage" },
  WINDOW_SEAT: { label: "Window seat with storage", h: 0.45, d: 0.5, bay: 0.9, fronts: "HINGED", mult: 1.3, noun: "window seat" },
  BASE_RUN: { label: "Base cabinets with worktop (utility, boot room, study)", h: 0.9, d: 0.6, bay: 0.6, fronts: "HINGED", mult: 1, noun: "base cabinet run" },
};
const typeOptions = Object.entries(JOINERY_TYPES).map(([k, t]) => [k, t.label] as [string, string]);
const MAX = 8;
const SHEET = 2.977; // 2.44 × 1.22 m
const BOARD: Record<string, { key: string; edge?: string; label: string }> = {
  PAINTED: { key: "mdf_18_mr", label: "18 mm MR MDF, hand-painted / sprayed" },
  FACTORY: { key: "mfc_18_white", edge: "edging_abs", label: "white melamine carcass with factory-finished doors" },
  OAK: { key: "oak_mdf_18", edge: "edging_oak", label: "oak-veneered MDF, oiled" },
};

const item = (i: number) => {
  const on = [{ key: "items", gt: i - 1 }];
  const g = `Item ${i}`, bespoke = [...on, { key: `j${i}Build`, is: "BESPOKE" }];
  return [
    { key: `j${i}Type`, label: `Item ${i}: what`, type: "select" as const, default: i === 1 ? "WARDROBE" : "SHELVES", options: typeOptions, public: true, group: g, when: on },
    { key: `j${i}Room`, label: "Room / where", type: "text" as const, default: "", public: true, group: g, when: on },
    { key: `j${i}Qty`, label: "How many the same", type: "int" as const, default: 1, min: 1, max: 10, group: g, when: on },
    { key: `j${i}W`, label: "Width (or shelf length)", type: "number" as const, unit: "m", default: 2.4, min: 0.3, max: 12, public: true, group: g, when: on },
    { key: `j${i}H`, label: "Height (0 = typical for this item)", type: "number" as const, unit: "m", default: 0, min: 0, max: 3.6, group: g, when: on, hint: "Floor-to-ceiling wardrobes ~2.4 m; window seat 0.45; eaves ~1.1" },
    { key: `j${i}D`, label: "Depth (0 = typical)", type: "number" as const, unit: "m", default: 0, min: 0, max: 1.2, group: g, when: on, hint: "Wardrobes 0.6, sliding 0.65, alcove 0.4, shelves 0.3" },
    { key: `j${i}Shelves`, label: "Number of floating shelves", type: "int" as const, default: 3, min: 1, max: 20, group: g, when: [...on, { key: `j${i}Type`, is: "FLOATING" }] },
    { key: `j${i}Build`, label: "Made by us or fit only", type: "select" as const, default: "BESPOKE", options: [["BESPOKE", "Bespoke – made & fitted by us"], ["FIT_ONLY", "Fit only – client supplies the units (e.g. flat-pack)"]] as [string, string][], public: true, group: g, when: [...on, { key: `j${i}Type`, not: "FLOATING" }] },
    { key: `j${i}Finish`, label: "Finish", type: "select" as const, default: "PAINTED", options: [["PAINTED", "Painted MDF (sprayed / hand-painted)"], ["FACTORY", "White carcass + factory-finished doors"], ["OAK", "Oak veneer, oiled"]] as [string, string][], public: true, clientChoice: true, group: g, when: [...on, { key: `j${i}Build`, not: "FIT_ONLY" }] },
    { key: `j${i}Shaker`, label: "Shaker-style doors (framed)", type: "boolean" as const, default: true, group: g, when: [...bespoke, { key: `j${i}Finish`, is: "PAINTED" }] },
    { key: `j${i}Drawers`, label: "Drawers (internal or external)", type: "int" as const, default: 0, min: 0, max: 30, group: g, when: [...on, { key: `j${i}Build`, not: "FIT_ONLY" }, { key: `j${i}Type`, not: "FLOATING" }] },
    { key: `j${i}Led`, label: "LED lighting", type: "boolean" as const, default: false, group: g, when: on },
    { key: `j${i}Handles`, label: "Handles by client", type: "boolean" as const, default: false, group: g, when: [...on, { key: `j${i}Build`, not: "FIT_ONLY" }, { key: `j${i}Type`, not: "FLOATING" }] },
  ];
};

export const joineryPackage: WorkPackage = {
  id: "joinery", label: "Fitted joinery & storage", short: "Joinery",
  description: "Bespoke fitted wardrobes (hinged or sliding), alcove units, bookcases and shelving, floating shelves, media walls, under-stairs pull-outs, loft eaves storage, window seats and cabinet runs – every board, front, hinge, runner, rail and finish measured, plus fitting and painting.",
  fields: [
    { key: "items", label: "Number of joinery items", type: "int", default: 1, min: 1, max: MAX, public: true, group: "Items", hint: "Each item can be several identical units (e.g. 2 alcoves)" },
    { key: "strip", label: "Existing wardrobes / cupboards to remove", type: "int", default: 0, min: 0, max: 20, group: "Items" },
    ...Array.from({ length: MAX }, (_, k) => item(k + 1)).flat(),
  ],
  needsScaffold: () => false,
  build(ctx, v) {
    const n = Math.min(MAX, Math.max(1, num(v, "items") || 1));
    const strip = num(v, "strip");
    if (strip) { ctx.labour("Joinery strip-out", "strip_wardrobe", strip, `${strip} existing`); ctx.scope(`Remove ${strip} existing wardrobe${strip > 1 ? "s" : ""} / cupboard${strip > 1 ? "s" : ""} and make good the walls and floor behind.`, "Joinery strip-out"); }
    for (let i = 1; i <= n; i++) buildItem(ctx, v, i);
    ctx.assume("Joinery sizes are taken on site before anything is made; walls behind fitted units are not decorated. Paint colours and handles are chosen with you before ordering.");
  },
};

/** One joinery item: measure the boards, fronts and hardware from its sizes, then price making, fitting and finishing. */
export function buildItem(ctx: Ctx, v: Values, i: number) {
  const type = (str(v, `j${i}Type`) || "WARDROBE") as JoineryType, t = JOINERY_TYPES[type] ?? JOINERY_TYPES.WARDROBE;
  const qty = Math.max(1, num(v, `j${i}Qty`) || 1), W = num(v, `j${i}W`) || 2.4;
  const Hh = num(v, `j${i}H`) || t.h, Dd = num(v, `j${i}D`) || t.d;
  const room = str(v, `j${i}Room`).trim(), name = `${t.noun.charAt(0).toUpperCase()}${t.noun.slice(1)}${room ? ` – ${room}` : ""}`;
  const tag = `${name}${qty > 1 ? ` × ${qty}` : ""}`;
  const S = "Fitted joinery", Fn = "Joinery finishing";
  const led = bool(v, `j${i}Led`);
  if (led) { ctx.material(S, "led_strip_kit", qty, `${tag}: 1 per unit`); ctx.labour(S, "elec_led_strip", qty, `${tag}: 1 per unit`); }

  // Floating shelves: board + concealed brackets
  if (type === "FLOATING") {
    const shelves = Math.max(1, num(v, `j${i}Shelves`) || 3) * qty, brackets = shelves * Math.max(2, Math.ceil(W / 0.45));
    const oak = str(v, `j${i}Finish`) === "OAK";
    ctx.material(S, oak ? "oak_shelf_30" : "mdf_18_mr", oak ? qty2(shelves * W * 1.05) : Math.ceil(shelves * W * Dd * 2 * 1.2 / SHEET), oak ? `${tag}: ${shelves} shelves × ${fmt(W)} m + 5%` : `${shelves} shelves × ${fmt(W)} × ${fmt(Dd)} m, boxed (2 faces) ÷ ${SHEET} m² + 20%`);
    ctx.material(S, "floating_shelf_bracket", brackets, `${shelves} shelves × ${Math.max(2, Math.ceil(W / 0.45))} brackets`);
    ctx.labour(S, "joinery_shelf_fit", shelves, `${tag}: ${shelves} shelves`);
    if (oak) { ctx.material(Fn, "hardwax_oil", qty2(shelves * W * (Dd * 2 + 0.06)), `${shelves} × ${fmt(W)} m × all faces`); ctx.labour(Fn, "joinery_oil", qty2(shelves * W * (Dd * 2 + 0.06)), `${shelves} shelves, all faces`); }
    else { const a = qty2(shelves * W * (Dd * 2 + 0.06)); ctx.material(Fn, "joinery_paint_system", a, `${shelves} shelves, all faces`); ctx.labour(Fn, "joinery_paint", a, `${shelves} shelves, all faces`); }
    ctx.scope(`${tag}: ${shelves} floating ${oak ? "solid oak" : "painted MDF"} shelves, ${fmt(W)} m long, on concealed heavy-duty brackets${led ? ", with LED strip lighting" : ""}.`, S);
    return;
  }

  const face = W * Hh; // front face of one unit
  // Fit-only: the client supplies the units
  if (str(v, `j${i}Build`) === "FIT_ONLY") {
    ctx.labour(S, "joinery_flatpack_fit", qty2(face * qty), `${tag}: ${fmt(W)} × ${fmt(Hh)} m front`);
    ctx.material(S, "mdf_18_mr", Math.max(1, Math.ceil(qty * (2 * Hh * 0.1 + W * 0.15) * 1.2 / SHEET)), `${tag}: fillers & scribes (2 × ${fmt(Hh)} × 0.1 + ${fmt(W)} × 0.15) per unit + 20%`);
    ctx.material(S, "joinery_sundries", qty, `${tag}: wall fixings, screws, caulk`);
    ctx.material(Fn, "joinery_paint_system", qty2(qty * (2 * Hh * 0.1 + W * 0.15) * 2), "fillers & scribes, both faces");
    ctx.labour(Fn, "joinery_paint", qty2(qty * (2 * Hh * 0.1 + W * 0.15) * 2), "fillers & scribes, both faces");
    ctx.scope(`${tag}: assemble and fit your supplied units (${fmt(W)} × ${fmt(Hh)} m), fixed to the wall, with painted MDF fillers and scribes to walls and ceiling${led ? ", LED lighting" : ""}.`, S);
    ctx.assume(`${name}: the units, doors and handles are supplied by you and delivered to site before the fitting day.`);
    return;
  }

  // Bespoke: count the parts of one unit
  const finish = str(v, `j${i}Finish`) || "PAINTED", board = BOARD[finish] ?? BOARD.PAINTED;
  const shaker = finish === "PAINTED" && bool(v, `j${i}Shaker`) && (t.fronts === "HINGED" || t.fronts === "PULLOUT");
  const bays = Math.max(1, Math.ceil(W / t.bay)), bayW = W / bays;
  const plinth = ["WINDOW_SEAT", "UNDERSTAIRS"].includes(type) ? 0.08 : 0.1;
  const lowerH = type === "ALCOVE" ? Math.min(0.9, Hh) : type === "MEDIA" ? 0.5 : Hh - plinth;
  let shelves = 0;
  switch (type) {
    case "WARDROBE": case "SLIDING": shelves = bays + 3; break; // a hat shelf per bay + one shelving bay
    case "ALCOVE": shelves = 1 + Math.max(1, Math.floor((Hh - lowerH - 0.1) / 0.35)) ; break;
    case "SHELVES": shelves = bays * Math.max(1, Math.round((Hh - 0.1) / 0.35) - 1); break;
    case "MEDIA": shelves = bays + 2; break;
    case "EAVES": case "BASE_RUN": shelves = bays; break;
    default: shelves = 0;
  }
  const sides = (bays + 1) * Hh * Dd;
  const topBottom = 2 * W * Dd;
  const shelfArea = shelves * bayW * Dd;
  const extras = W * plinth + W * 0.15 + 2 * Hh * 0.08; // plinth, top filler, scribes
  const seatTop = type === "WINDOW_SEAT" ? W * (Dd + 0.05) : 0;
  const pullouts = t.fronts === "PULLOUT" ? Math.max(1, num(v, `j${i}Drawers`) || bays) : 0;
  const pulloutBoard = pullouts * (Hh * Dd * 0.9 + 2 * Dd * 0.12); // a panel + 2 shelves each
  const drawers = t.fronts === "PULLOUT" ? 0 : num(v, `j${i}Drawers`);
  const drawerFront = drawers * bayW * 0.18;
  const carcass = (type === "UNDERSTAIRS" ? Hh * Dd * 2 + W * Dd : sides + topBottom) + shelfArea + extras + seatTop + pulloutBoard;
  // Fronts
  const frontH = t.fronts === "NONE" || t.fronts === "SLIDING" ? 0 : lowerH;
  const doorsPerRow = t.fronts === "HINGED" ? Math.max(1, Math.ceil(W / 0.62)) : t.fronts === "PULLOUT" ? pullouts : 0;
  const topBox = type === "WARDROBE" && frontH > 2.3;
  const doorH = topBox ? frontH - 0.45 : frontH;
  const doors = doorsPerRow * (topBox ? 2 : 1);
  const frontArea = W * frontH + drawerFront;
  const hingesPer = (h: number) => h <= 0.9 ? 2 : h <= 1.6 ? 3 : h <= 2.1 ? 4 : 5;
  const hinges = t.fronts === "HINGED" ? doorsPerRow * hingesPer(doorH) + (topBox ? doorsPerRow * 2 : 0) : 0;

  // Materials per item (× identical units)
  const boardArea = carcass + (finish === "FACTORY" ? 0 : frontArea);
  const sheets = Math.ceil(qty * boardArea * 1.18 / SHEET);
  ctx.material(S, board.key, sheets, `${tag}: carcass ${fmt(carcass)} m² (${bays + 1} sides, top & base, ${shelves} shelves, plinth & scribes)${finish === "FACTORY" ? "" : ` + fronts ${fmt(frontArea)} m²`} × ${qty} + 18% offcuts ÷ ${SHEET} m²`);
  if (finish === "FACTORY" && frontArea > 0) ctx.material(S, "joinery_fronts", qty2(qty * frontArea * 1.05), `${tag}: ${fmt(W)} × ${fmt(frontH)} m fronts${drawers ? ` + ${drawers} drawer fronts` : ""} × ${qty} + 5%`);
  if (shaker && frontArea > 0) ctx.material(S, "mdf_6", Math.max(1, Math.ceil(qty * frontArea * 0.35 / SHEET)), `${tag}: shaker frames ≈ 35% of ${fmt(frontArea)} m² fronts`);
  if (board.edge) ctx.material(S, board.edge, qty2(qty * (shelves * bayW + (bays + 1) * Hh + 2 * W + (finish === "OAK" ? 2 * (W + frontH) * Math.max(1, doors) / 2 : 0)) * 1.1), `${tag}: shelf, side & top edges + 10%`);
  if (t.fronts === "SLIDING") {
    const sd = Math.max(2, Math.round(W / 1.1));
    ctx.material(S, "sliding_door_panel", qty2(qty * W * (Hh - 0.1) * 1.03), `${tag}: ${sd} doors, ${fmt(W)} × ${fmt(Hh - 0.1)} m`);
    ctx.material(S, "sliding_track", qty2(qty * W), `${tag}: ${fmt(W)} m top & bottom`);
    ctx.labour(S, "joinery_sliding_fit", sd * qty, `${tag}: ${sd} doors`);
  }
  if (hinges) ctx.material(S, "hinge_softclose", hinges * qty, `${tag}: ${doors} doors × ${hingesPer(doorH)} hinges${topBox ? " (top box doors 2 each)" : ""}`);
  if (type === "WARDROBE" || type === "SLIDING") ctx.material(S, "hanging_rail", qty2(qty * Math.max(bayW, W - bayW)), `${tag}: hanging in ${bays > 1 ? bays - 1 : 1} of ${bays} bays`);
  if (drawers) { ctx.material(S, "drawer_runner_set", drawers * qty, `${tag}: ${drawers} drawers`); ctx.labour(S, "joinery_drawer", drawers * qty, `${tag}: ${drawers} drawers`); }
  if (pullouts) { ctx.material(S, "pullout_hardware", pullouts * qty, `${tag}: ${pullouts} pull-outs`); ctx.labour(S, "joinery_pullout", pullouts * qty, `${tag}: ${pullouts} pull-outs`); }
  if (type === "WINDOW_SEAT") ctx.material(S, "lid_stay_set", Math.max(1, Math.ceil(W / 1.2)) * qty, `${tag}: lift-up lids`);
  if (type === "BASE_RUN") { ctx.material(S, "worktop_laminate", qty2(qty * W * 1.05), `${tag}: ${fmt(W)} m + 5%`); ctx.labour(S, "worktop_fit", qty2(qty * W), `${tag}: ${fmt(W)} m`); }
  if (type === "MEDIA") {
    const frame = W * Hh;
    ctx.material(S, "timber_47x100", qty2(qty * ((Math.ceil(W / 0.4) + 1) * Hh + 4 * W) * 1.1), `${tag}: studs at 400 + plates & recess noggins + 10%`);
    ctx.material(S, "plasterboard_125", Math.ceil(qty * frame * 1.4 / 2.88), `${tag}: ${fmt(frame)} m² face + returns ÷ 2.88`);
    ctx.labour(S, "joinery_frame", qty2(qty * frame), `${tag}: ${fmt(W)} × ${fmt(Hh)} m wall`);
  }
  const handles = !bool(v, `j${i}Handles`) && t.fronts !== "SLIDING" ? doors + drawers * (type === "WARDROBE" ? 0 : 1) : 0;
  if (handles) ctx.material(S, "cabinet_handle", handles * qty, `${tag}: ${doors} doors${drawers && type !== "WARDROBE" ? ` + ${drawers} drawers` : ""}`);
  ctx.material(S, "joinery_sundries", qty * Math.max(1, Math.ceil(bays / 2)), `${tag}: 1 per 2 bays`);

  // Labour: make & fit, measured on the front face (type factor for how much work a m² takes)
  const buildArea = type === "MEDIA" ? W * lowerH + W * 0.3 : face;
  const factor = t.mult * (shaker ? 1.15 : 1) * (finish === "OAK" ? 1.1 : 1);
  ctx.labour(S, "joinery_build", qty2(qty * buildArea * factor), `${tag}: ${fmt(W)} × ${fmt(type === "MEDIA" ? lowerH + 0.3 : Hh)} m front${factor !== 1 ? ` × ${fmt(factor)} (${type.toLowerCase().replace("_", " ")}${shaker ? ", shaker" : ""}${finish === "OAK" ? ", oak" : ""})` : ""}`);

  // Finishing
  const visible = frontArea * 2 + (bays + 1) * Hh * Dd * 0.6 + shelfArea * 2 + extras + seatTop * 2;
  if (finish === "PAINTED") { ctx.material(Fn, "joinery_paint_system", qty2(qty * visible), `${tag}: fronts both faces, shelves, sides & trims`); ctx.labour(Fn, "joinery_paint", qty2(qty * visible), `${tag}: ${fmt(visible)} m² per unit`); }
  else if (finish === "OAK") { ctx.material(Fn, "hardwax_oil", qty2(qty * visible), `${tag}: all visible faces`); ctx.labour(Fn, "joinery_oil", qty2(qty * visible), `${tag}: ${fmt(visible)} m² per unit`); }
  else { const trims = qty2(qty * extras * 2); ctx.material(Fn, "joinery_paint_system", trims, `${tag}: plinth, scribes & top filler`); ctx.labour(Fn, "joinery_paint", trims, `${tag}: trims`); }

  const fronts = t.fronts === "SLIDING" ? `${Math.max(2, Math.round(W / 1.1))} made-to-measure sliding doors on a soft-close track` : t.fronts === "PULLOUT" ? `${pullouts} full-height pull-outs on heavy-duty runners` : t.fronts === "HINGED" ? `${doors} ${shaker ? "shaker " : ""}door${doors === 1 ? "" : "s"} on soft-close hinges` : "open fronts";
  const inside = [type === "WARDROBE" || type === "SLIDING" ? "hanging rails and a shelving bay" : "", shelves ? `${shelves} shelves` : "", drawers ? `${drawers} soft-close drawer${drawers > 1 ? "s" : ""}` : "", type === "BASE_RUN" ? "laminate worktop" : "", type === "MEDIA" ? "stud-framed TV recess" : "", type === "WINDOW_SEAT" ? "lift-up seat lids" : "", led ? "LED lighting" : ""].filter(Boolean).join(", ");
  ctx.scope(`${tag}: bespoke ${t.noun}, ${fmt(W)} m wide × ${fmt(Hh)} m high × ${fmt(Dd)} m deep, in ${board.label}; ${fronts}${inside ? `, ${inside}` : ""}${!bool(v, `j${i}Handles`) && handles ? ", handles included" : ""}. Scribed to walls and ceiling, with plinth and fillers.`, S);
  if (bool(v, `j${i}Handles`)) ctx.assume(`${name}: handles supplied by you.`);
}
