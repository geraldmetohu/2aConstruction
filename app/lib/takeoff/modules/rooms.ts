import type { Ctx } from "../engine";
import { bool, num, readValues, str, type Field, type Values } from "../package";
import type { RoomInput } from "../schema";
import { fmt, qty2 } from "../util";
import { buildBathroom } from "./bathroom";
import { buildKitchen } from "./kitchen";
import { pipeOptions, plumbFixtures, type PipeSystem } from "./plumbing";
import type { ElecSpec } from "./common";
import {
  boardAndSkim, bondAndSkim, coatOptions, elecItems, elecSummary, electricsItems, flooring, flooringOptions, gradeOptions, makeGood, newDoors, paint, paintSystemOptions,
  fitWindows, radiators, skim, skirting, stripOut, tileOptions,
} from "./common";

const WET = ["BATHROOM", "ENSUITE", "WC"];
const notRefit = [{ key: "bathroomRefit", is: false }, { key: "kitchenRefit", is: false }];
const yesNo = (key: string, label: string, def: boolean, group: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "boolean", default: def, group, ...extra });

/** Typical electrical items per room type (used as the starting values; every count is editable). */
export const roomElectrics: Record<RoomInput["type"], ElecSpec> = {
  BEDROOM: { pendants: 1, switches: 1, sockets: 4, data: 1, tv: 1 },
  LIVING: { pendants: 1, downlights: 4, switches: 2, sockets: 6, data: 1, tv: 1 },
  DINING: { pendants: 1, switches: 1, sockets: 4 },
  KITCHEN: { downlights: 6, pendants: 0, switches: 2, sockets: 6, spurs: 4, cooker: 1 },
  BATHROOM: { downlights: 4, switches: 1, fanIsolators: 1, shaver: 1, spurs: 1 },
  ENSUITE: { downlights: 3, switches: 1, fanIsolators: 1, shaver: 1 },
  WC: { downlights: 1, switches: 1, fanIsolators: 1 },
  HALL: { pendants: 2, switches: 3, sockets: 1 },
  LANDING: { pendants: 1, switches: 2, sockets: 1 },
  STAIRS: { pendants: 1, switches: 2 },
  OFFICE: { downlights: 4, switches: 1, sockets: 6, data: 2 },
  UTILITY: { downlights: 2, switches: 1, sockets: 3, spurs: 2 },
  OTHER: { pendants: 1, switches: 1, sockets: 2 },
};
/** Starting values for a room type: its electrical items (only keys the user has not set are filled). */
export const roomTypeDefaults = (type: RoomInput["type"]): Values =>
  Object.fromEntries(elecItems.map(i => [i.key, roomElectrics[type][i.key] ?? 0]));
const elecOn: Field["when"] = [{ any: [{ key: "electrics", not: "NONE" }, { key: "kitchenRefit", is: true }, { key: "bathroomRefit", is: true }] }];
const elecLabels: Record<string, string> = {
  downlights: "Recessed spotlights", pendants: "Pendant light points", switches: "Light switches", sockets: "Double sockets", spurs: "Fused spurs",
  fanIsolators: "Fan isolators (extractor)", data: "Data points", tv: "TV points", cooker: "Cooker circuit (45 A)", shaver: "Shaver socket", outside: "Outside lights",
};

/** What can be done in a room. `roomType` is available to conditions. */
export const roomFields: Field[] = [
  { key: "strip", label: "Strip out", type: "select", default: "NONE", group: "Strip out", options: [["NONE", "Nothing to strip"], ["FLOORING", "Old flooring"], ["FULL", "Flooring, skirting & fittings"]] },

  { key: "walls", label: "Walls", type: "select", default: "NONE", public: true, group: "Plastering", when: notRefit, options: [
    ["NONE", "No plastering"], ["MAKE_GOOD", "Fill & make good"], ["SKIM", "Skim (PVA + multi-finish)"], ["BOND_SKIM", "Bonding coat + skim"],
    ["HACK_OFF", "Hack off, bonding + skim"], ["DRYLINE", "Dot & dab boards + skim"]] },
  { key: "ceiling", label: "Ceiling", type: "select", default: "NONE", public: true, group: "Plastering", when: notRefit, options: [
    ["NONE", "No plastering"], ["SKIM", "Skim"], ["OVERBOARD", "Overboard + skim"], ["REPLACE", "Pull down, new board + skim"]] },
  yesNo("coving", "New coving", false, "Plastering", { when: notRefit }),

  yesNo("paintCeiling", "Paint ceiling", true, "Painting", { public: true, when: notRefit }),
  yesNo("paintWalls", "Paint walls", true, "Painting", { public: true, when: notRefit }),
  yesNo("paintSkirting", "Paint skirting", true, "Painting", { public: true, when: notRefit }),
  yesNo("paintDoors", "Paint doors & frames", true, "Painting", { public: true, when: notRefit }),
  yesNo("paintWindows", "Paint windows", false, "Painting", { when: notRefit }),
  yesNo("paintRadiators", "Paint radiators", false, "Painting", { when: notRefit }),
  { key: "prep", label: "Preparation", type: "select", default: "STANDARD", group: "Painting", when: notRefit, options: [["STANDARD", "Standard (light filling included)"], ["HEAVY", "Heavy (cracks, stains, sanding)"]] },
  { key: "featureWalls", label: "Feature walls (2nd colour)", type: "int", default: 0, min: 0, max: 4, group: "Painting", when: [...notRefit, { key: "paintWalls", is: true }] },
  { key: "coats", label: "Finish coats", type: "select", default: "2", group: "Painting", options: coatOptions, when: notRefit },
  yesNo("mistCoat", "Mist coat on new plaster", true, "Painting", { when: notRefit }),
  { key: "paintColour", label: "Wall colour", type: "text", default: "", clientChoice: true, group: "Painting", when: [...notRefit, { key: "paintWalls", is: true }] },
  { key: "paintSystem", label: "Paint type", type: "select", default: "STANDARD", options: paintSystemOptions, clientChoice: true, public: true, group: "Painting", when: notRefit },
  { key: "wallFinish", label: "Wall finish", type: "select", default: "MATT", options: [["MATT", "Matt"], ["SILK", "Silk"], ["EGGSHELL", "Eggshell"]], clientChoice: true, group: "Painting", when: [...notRefit, { key: "paintWalls", is: true }] },
  { key: "woodPaint", label: "Woodwork paint", type: "select", default: "STANDARD", options: [["STANDARD", "Standard trade"], ["PREMIUM", "Premium"]], clientChoice: true, group: "Painting", when: notRefit },
  { key: "woodFinish", label: "Woodwork finish", type: "select", default: "SATIN", options: [["SATIN", "Satin"], ["GLOSS", "Gloss"], ["EGGSHELL", "Eggshell"]], clientChoice: true, group: "Painting", when: notRefit },

  { key: "flooring", label: "Flooring", type: "select", default: "NONE", options: flooringOptions, clientChoice: true, public: true, group: "Floor & joinery", when: notRefit },
  yesNo("newSkirting", "New skirting", false, "Floor & joinery", { when: notRefit }),

  { key: "electrics", label: "Electrics", type: "select", default: "NONE", group: "Electrics & heating", public: true, hint: "Items below start from typical numbers for this room – change any count", options: [["NONE", "No electrical work"], ["ADD", "New items as listed"], ["REWIRE", "Full rewire (all items listed)"]] },
  ...elecItems.map((i): Field => ({ key: i.key, label: elecLabels[i.key], type: "int", default: 0, min: 0, max: 40, group: "Electrics & heating", when: elecOn })),
  { key: "newRadiators", label: "New radiators", type: "int", default: 0, min: 0, max: 6, group: "Electrics & heating" },

  { key: "newDoors", label: "New doors", type: "int", default: 0, min: 0, max: 6, group: "Doors & windows" },
  { key: "doorType", label: "Door style", type: "select", default: "door_standard", clientChoice: true, group: "Doors & windows", options: [["door_standard", "Standard"], ["door_fire", "Fire door FD30"], ["door_premium", "Premium"]], when: [{ key: "newDoors", gt: 0 }] },
  { key: "refurbDoors", label: "Doors to refurbish", type: "int", default: 0, min: 0, max: 6, group: "Doors & windows" },
  { key: "newWindows", label: "New windows", type: "int", default: 0, min: 0, max: 8, group: "Doors & windows" },
  { key: "windowType", label: "Window type", type: "select", default: "UPVC", clientChoice: true, group: "Doors & windows", options: [["UPVC", "uPVC"], ["ALU", "Aluminium"]], when: [{ key: "newWindows", gt: 0 }] },

  yesNo("kitchenRefit", "New kitchen", false, "Kitchen", { public: true, when: [{ key: "roomType", in: ["KITCHEN"] }] }),
  { key: "baseRun", label: "Base units run", type: "number", unit: "m", default: 4.2, min: 0.6, max: 20, public: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "wallRun", label: "Wall units run", type: "number", unit: "m", default: 3, min: 0, max: 15, public: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "tallUnits", label: "Tall units", type: "int", default: 1, min: 0, max: 6, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "island", label: "Island length (0 = none)", type: "number", unit: "m", default: 0, min: 0, max: 5, public: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "kitchenGrade", label: "Unit grade", type: "select", default: "MID", options: gradeOptions, clientChoice: true, public: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "worktop", label: "Worktop", type: "select", default: "LAMINATE", clientChoice: true, public: true, group: "Kitchen", options: [["LAMINATE", "Laminate"], ["WOOD", "Solid wood"], ["QUARTZ", "Quartz"]], when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "appliances", label: "Appliances to install", type: "int", default: 4, min: 0, max: 10, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "splashbackTile", label: "Splashback tile", type: "select", default: "METRO_75x150", options: tileOptions, clientChoice: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "splashbackColour", label: "Splashback tile colour", type: "text", default: "", clientChoice: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "kitchenFloor", label: "Kitchen flooring", type: "select", default: "LVT", options: flooringOptions, clientChoice: true, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  yesNo("washingMachine", "Washing machine point", true, "Kitchen", { when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] }),
  yesNo("dishwasher", "Dishwasher point", true, "Kitchen", { when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] }),
  yesNo("hood", "Cooker hood ducted outside", true, "Kitchen", { when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] }),
  { key: "sinkSupplyRun", label: "Sink to nearest supply", type: "number", unit: "m", default: 3, min: 0.5, max: 25, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },
  { key: "sinkWasteRun", label: "Sink to drain / stack", type: "number", unit: "m", default: 2, min: 0.5, max: 15, group: "Kitchen", when: [{ key: "roomType", in: ["KITCHEN"] }, { key: "kitchenRefit", is: true }] },

  yesNo("bathroomRefit", "New bathroom", false, "Bathroom", { public: true, when: [{ key: "roomType", in: WET }] }),
  { key: "layout", label: "Layout", type: "select", default: "BATH_SHOWER", public: true, group: "Bathroom", options: [["BATH", "Bath only"], ["BATH_SHOWER", "Bath with shower over"], ["SHOWER", "Shower enclosure"], ["WALK_IN", "Walk-in shower"]], when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "bathGrade", label: "Suite & tile grade", type: "select", default: "MID", options: gradeOptions, clientChoice: true, public: true, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "wallTiling", label: "Wall tiling", type: "select", default: "FULL", group: "Bathroom", options: [["FULL", "Full height"], ["HALF", "Half height"], ["WET_ZONES", "Wet zones only"]], when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "wallTileSize", label: "Wall tile size", type: "select", default: "PORCELAIN_300x600", options: tileOptions, clientChoice: true, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "floorTileSize", label: "Floor tile size", type: "select", default: "PORCELAIN_600x600", options: tileOptions, clientChoice: true, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }, { key: "floorTiling", is: true }] },
  { key: "tileColour", label: "Tile colour", type: "text", default: "", clientChoice: true, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "groutColour", label: "Grout colour", type: "text", default: "", clientChoice: true, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  yesNo("floorTiling", "Tiled floor (else LVT)", true, "Bathroom", { when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] }),
  yesNo("ufh", "Electric underfloor heating", false, "Bathroom", { when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] }),
  yesNo("towelRail", "Heated towel rail", true, "Bathroom", { when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] }),
  { key: "supplyRun", label: "Distance to nearest hot & cold supply", type: "number", unit: "m", default: 4, min: 0.5, max: 25, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  { key: "soilRun", label: "Distance to soil stack / drain", type: "number", unit: "m", default: 2, min: 0.5, max: 15, group: "Bathroom", when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] },
  yesNo("newSoilStack", "Soil stack needs extending / new connection", false, "Bathroom", { when: [{ key: "roomType", in: WET }, { key: "bathroomRefit", is: true }] }),
  { key: "pipe", label: "Pipework", type: "select", default: "COPPER", options: pipeOptions, group: "Plumbing", when: [{ any: [{ key: "kitchenRefit", is: true }, { key: "bathroomRefit", is: true }, { key: "roomType", in: ["UTILITY"] }] }] },
  yesNo("utilitySink", "Utility sink", true, "Plumbing", { when: [{ key: "roomType", in: ["UTILITY"] }] }),
  yesNo("utilityWasher", "Washing machine / dryer point", true, "Plumbing", { when: [{ key: "roomType", in: ["UTILITY"] }] }),
  { key: "utilityRun", label: "Utility to nearest supply / drain", type: "number", unit: "m", default: 3, min: 0.5, max: 25, group: "Plumbing", when: [{ key: "roomType", in: ["UTILITY"] }] },
];

/** Validated works for a room; refit options only apply to the right room types. */
export function roomValues(room: RoomInput): Values {
  const v = readValues({ fields: roomFields }, { ...roomTypeDefaults(room.type), ...room.works });
  if (room.type !== "KITCHEN") v.kitchenRefit = false;
  if (!WET.includes(room.type)) v.bathroomRefit = false;
  return v;
}

/** Room geometry used by every formula. */
export function roomGeometry(r: Pick<RoomInput, "length" | "width" | "height" | "doors" | "windows">) {
  const floor = qty2(r.length * r.width), perimeter = qty2(2 * (r.length + r.width));
  const walls = qty2(Math.max(0, perimeter * r.height - r.doors * 1.9 - r.windows * 1.5)); // door 0.9 × 2.1, window ≈1.5 m²
  const skirting = qty2(Math.max(0, perimeter - r.doors * 0.9));
  return { floor, perimeter, walls, skirting, ceiling: floor };
}

/** The loft conversion lowers the first floor ceilings (new loft floor joists hung lower). */
export function loftLowersCeilings(input: Ctx["input"]) {
  const loft = input.packages.loft;
  return !!loft?.enabled && loft.values.lowerCeiling === true;
}

export function buildRoom(ctx: Ctx, room: RoomInput, v: Values) {
  const g = roomGeometry(room);
  const R = room.name;
  const did: string[] = [];
  // First floor rooms under a loft with lowered ceilings: the ceiling is renewed here, once (the loft prices only the rest of the floor).
  const lowered = room.floor === "FIRST" && loftLowersCeilings(ctx.input);

  // Kitchen / bathroom refits cover the room's own finishes.
  if (bool(v, "kitchenRefit")) {
    buildKitchen(ctx, s => s, { length: room.length, width: room.width, height: room.height, baseRun: num(v, "baseRun"), wallRun: num(v, "wallRun"),
      tallUnits: num(v, "tallUnits"), island: num(v, "island"), grade: str(v, "kitchenGrade"), worktop: str(v, "worktop"), appliances: num(v, "appliances"),
      splashback: true, points: 0, flooring: str(v, "kitchenFloor"), strip: str(v, "strip") !== "NONE", decorate: true, splashbackTile: str(v, "splashbackTile"),
      washingMachine: bool(v, "washingMachine"), dishwasher: bool(v, "dishwasher"), hood: bool(v, "hood"), supplyRun: num(v, "sinkSupplyRun"), wasteRun: num(v, "sinkWasteRun"), pipe: str(v, "pipe") as PipeSystem }, R);
  }
  if (bool(v, "bathroomRefit")) {
    buildBathroom(ctx, s => s, { length: room.length, width: room.width, height: room.height, layout: str(v, "layout") as "BATH",
      grade: str(v, "bathGrade") as "MID", wallTiling: str(v, "wallTiling") as "FULL", floorTiling: bool(v, "floorTiling"), ufh: bool(v, "ufh"),
      towelRail: bool(v, "towelRail"), extractor: true, downlights: 0, strip: str(v, "strip") !== "NONE", ceiling: true, decorate: true,
      wallTileSize: str(v, "wallTileSize"), floorTileSize: str(v, "floorTileSize"), supplyRun: num(v, "supplyRun"), wasteRun: num(v, "soilRun"), pipe: str(v, "pipe") as PipeSystem }, R);
    if (bool(v, "newSoilStack")) {
      ctx.material("First fix", "soil_110", 2, "2 × 3 m to extend the stack", "110 mm soil pipe – stack extension");
      ctx.material("First fix", "soil_coupler", 2, "branch & coupler");
      ctx.labour("First fix", "soil_stack_extend", 1, `${R}: connect to soil stack`);
    }
  }
  if (room.type === "UTILITY" && (bool(v, "utilitySink") || bool(v, "utilityWasher"))) {
    ctx.labour("First fix", "utility_plumbing", 1, `${R}: ${[bool(v, "utilitySink") && "sink", bool(v, "utilityWasher") && "washing machine"].filter(Boolean).join(" & ")}`);
    plumbFixtures(ctx, "First fix", [["UTILITY_SINK", bool(v, "utilitySink") ? 1 : 0], ["WASHING_MACHINE", bool(v, "utilityWasher") ? 1 : 0]], { pipe: str(v, "pipe") as PipeSystem, supplyRun: num(v, "utilityRun"), wasteRun: num(v, "utilityRun"), label: R });
    if (bool(v, "utilitySink")) ctx.material("Second fix", "sink_tap", 1, "utility sink & tap");
    did.push("utility plumbing");
  }
  const refit = bool(v, "kitchenRefit") || bool(v, "bathroomRefit");
  if (lowered && refit) {
    ctx.labour("Strip out", "ceiling_pull_down", g.ceiling, `${R} ceiling ${fmt(g.ceiling)} m² – lowered with the loft floor`);
    did.push("ceiling lowered with the loft floor");
  }

  if (!refit) {
    // Strip out
    const strip = str(v, "strip");
    if (strip !== "NONE") { stripOut(ctx, "Strip out", strip === "FULL" ? g.floor * 1.5 : g.floor, `${R}: ${strip === "FULL" ? "flooring, skirting & fittings (floor × 1.5)" : "flooring"}`); did.push(strip === "FULL" ? "strip out" : "lift flooring"); }

    // Plastering
    const P = "Plastering", walls = str(v, "walls"), ceiling = lowered ? "REPLACE" : str(v, "ceiling");
    const beads = room.windows * 3; // reveals
    let newPlaster = 0;
    switch (walls) {
      case "MAKE_GOOD": makeGood(ctx, P, g.walls, `${R} walls`); did.push("make good walls"); break;
      case "SKIM": skim(ctx, P, g.walls, `${R} walls`, { beads }); newPlaster += g.walls; did.push("skim walls"); break;
      case "BOND_SKIM": bondAndSkim(ctx, P, g.walls, `${R} walls`, beads); newPlaster += g.walls; did.push("bond and skim walls"); break;
      case "HACK_OFF":
        ctx.labour("Strip out", "hack_off_plaster", g.walls, `${R} walls ${fmt(g.walls)} m²`);
        ctx.material("Strip out", "skip_8yd", Math.max(1, Math.ceil(g.walls / 60)) , `1 skip per 60 m² of plaster`, "Skip for plaster waste");
        bondAndSkim(ctx, P, g.walls, `${R} walls`, beads); newPlaster += g.walls; did.push("hack off and re-plaster walls"); break;
      case "DRYLINE": boardAndSkim(ctx, P, g.walls, `${R} walls`, { fixing: "dab", beads }); newPlaster += g.walls; did.push("dry-line walls"); break;
    }
    switch (ceiling) {
      case "SKIM": skim(ctx, P, g.ceiling, `${R} ceiling`); newPlaster += g.ceiling; did.push("skim ceiling"); break;
      case "OVERBOARD": boardAndSkim(ctx, P, g.ceiling, `${R} ceiling`); newPlaster += g.ceiling; did.push("overboard ceiling"); break;
      case "REPLACE":
        ctx.labour("Strip out", "ceiling_pull_down", g.ceiling, `${R} ceiling ${fmt(g.ceiling)} m²${lowered ? " – lowered with the loft floor" : ""}`);
        boardAndSkim(ctx, P, g.ceiling, `${R} ceiling`); newPlaster += g.ceiling; did.push(lowered ? "new lowered ceiling (with the loft)" : "replace ceiling"); break;
    }
    if (bool(v, "coving")) {
      const lengths = Math.ceil(g.perimeter * 1.1 / 3 - 1e-9);
      ctx.material(P, "coving", lengths, `${fmt(g.perimeter)} m × 1.1 ÷ 3 m`);
      ctx.material(P, "coving_adhesive", Math.ceil(lengths / 3), "1 tube per 3 lengths");
      ctx.labour(P, "skirting_fit", g.perimeter, `${fmt(g.perimeter)} m coving`, "Fit coving");
      did.push("new coving");
    }

    // Joinery
    if (bool(v, "newSkirting")) { skirting(ctx, "Second fix", g.skirting); did.push("new skirting"); }

    // Painting
    const paintWalls = bool(v, "paintWalls"), paintCeiling = bool(v, "paintCeiling") || lowered;
    const doorsToPaint = bool(v, "paintDoors") ? room.doors : 0;
    paint(ctx, "Decoration", {
      label: R,
      ceilings: paintCeiling ? g.ceiling : 0,
      walls: paintWalls ? g.walls : 0,
      skirting: bool(v, "paintSkirting") ? g.skirting : 0,
      doors: doorsToPaint, windows: bool(v, "paintWindows") ? room.windows : 0, radiators: bool(v, "paintRadiators") ? room.radiators : 0,
      newPlaster: Math.min(newPlaster, (paintWalls ? g.walls : 0) + (paintCeiling ? g.ceiling : 0)),
      featureWalls: paintWalls ? num(v, "featureWalls") : 0,
      prep: str(v, "prep") as "STANDARD" | "HEAVY", system: str(v, "paintSystem"), wood: str(v, "woodPaint") as "STANDARD" | "PREMIUM",
      newWood: bool(v, "newSkirting"), coats: Number(str(v, "coats")), mistCoat: bool(v, "mistCoat"),
    });
    const painted = [paintCeiling && "ceiling", paintWalls && "walls", bool(v, "paintSkirting") && "skirting", doorsToPaint && "doors", bool(v, "paintWindows") && room.windows && "windows", bool(v, "paintRadiators") && room.radiators && "radiators"].filter(Boolean);
    if (painted.length) did.push(`paint ${painted.join(", ")}${str(v, "prep") === "HEAVY" ? " (heavy preparation)" : ""}`);

    // Flooring
    const fl = str(v, "flooring");
    if (fl !== "NONE") { flooring(ctx, "Second fix", g.floor, fl, { perimeter: g.skirting, doors: room.doors }); did.push(`${flooringOptions.find(([k]) => k === fl)?.[1].toLowerCase()} floor`); }
  }

  // Electrics, heating, doors, windows (all room types). Refits always include their electrics.
  const el = str(v, "electrics");
  const mode = el !== "NONE" ? el : refit ? "ADD" : "NONE";
  if (mode !== "NONE") {
    const spec: ElecSpec = Object.fromEntries(elecItems.map(i => [i.key, num(v, i.key)]));
    if (electricsItems(ctx, "First fix", spec, { label: R, rewire: mode === "REWIRE" })) did.push(`${mode === "REWIRE" ? "rewire" : "electrics"}: ${elecSummary(spec)}`);
  }
  else if (lowered) {
    const lights = Math.max(1, num(v, "pendants") + num(v, "downlights"));
    ctx.labour("First fix", "elec_reposition", lights, `${R}: ${lights} light point${lights > 1 ? "s" : ""} dropped to the new ceiling`);
  }
  if (num(v, "newRadiators")) { radiators(ctx, "First fix", num(v, "newRadiators")); did.push(`${num(v, "newRadiators")} new radiator${num(v, "newRadiators") > 1 ? "s" : ""}`); }
  if (num(v, "newDoors")) { newDoors(ctx, "Second fix", num(v, "newDoors"), str(v, "doorType"), { paint: !refit && bool(v, "paintDoors"), label: R }); did.push(`${num(v, "newDoors")} new door${num(v, "newDoors") > 1 ? "s" : ""}`); }
  if (num(v, "refurbDoors")) { ctx.labour("Second fix", "door_refurb", num(v, "refurbDoors"), `${num(v, "refurbDoors")} doors`); did.push(`refurbish ${num(v, "refurbDoors")} door${num(v, "refurbDoors") > 1 ? "s" : ""}`); }
  const nw = num(v, "newWindows");
  if (nw) {
    fitWindows(ctx, "First fix", nw, str(v, "windowType") === "ALU" ? "window_alu" : "window_upvc", "windows");
    did.push(`${nw} new window${nw > 1 ? "s" : ""}`);
  }

  if (did.length && !refit) ctx.scope(`${R} (${fmt(room.length)} × ${fmt(room.width)} m): ${did.join(", ")}.`);
  else if (did.length) ctx.scope(`${R}: also ${did.join(", ")}.`);
}
