import { bool, num, str, type Field, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";
import { renderNewWall } from "./external";
import { boardAndSkim, electricsItems, elecSummary, fitWindows, flooring, flooringOptions, newDoors, paint, paintSystemOptions, radiators, skim, skirting } from "./common";

const ceil = (x: number) => Math.ceil(x - 1e-9);
const SHEET = 2.88;

export const conversionUseOptions: [string, string][] = [
  ["OFFICE", "Home office"], ["BEDROOM", "Bedroom"], ["STUDIO", "Studio / hobby room"], ["GYM", "Gym"],
  ["LIVING", "Living / play room"], ["UTILITY", "Utility & WC"], ["KITCHEN", "Kitchen extension of the house"],
];
const useLabel = (k: string) => conversionUseOptions.find(([x]) => x === k)?.[1] ?? "room";

const g = "Garage";
const n = (key: string, label: string, group: string, d: number, max = 20, extra: Partial<Field> = {}): Field => ({ key, label, type: "int", default: d, min: 0, max, group, ...extra });

/**
 * Garage conversion to a habitable room. Building Regulations apply (change of use):
 * Part A footing under the infill wall, Part C damp (DPM + DPC), Part L insulation
 * (walls ≈0.28, floor ≈0.22, roof ≈0.16 W/m²K), Part B fire door / escape window and
 * smoke alarm, Part F background ventilation (trickle vents) and extract to a WC / utility.
 */
export const conversionPackage: WorkPackage = {
  id: "conversion", label: "Garage conversion", short: "Garage",
  description: "Convert the garage into an office, bedroom, studio, gym, living room or utility & WC: infill the door, raise and insulate the floor, line the walls, ceiling, electrics, heating and finishes – to Building Regulations.",
  fields: [
    { key: "use", label: "Converting to", type: "select", default: "OFFICE", options: conversionUseOptions, public: true, group: g },
    { key: "garageType", label: "Garage", type: "select", default: "INTEGRAL", group: g, options: [["INTEGRAL", "Integral (inside the house)"], ["ATTACHED", "Attached to the side"], ["DETACHED", "Detached in the garden"]] },
    { key: "length", label: "Length", type: "number", unit: "m", default: 5, min: 2, max: 12, public: true, group: g },
    { key: "width", label: "Width", type: "number", unit: "m", default: 2.7, min: 2, max: 8, public: true, group: g },
    { key: "height", label: "Ceiling height", type: "number", unit: "m", default: 2.4, min: 2, max: 3.5, group: g },
    { key: "strip", label: "Clear shelving, old units & services first", type: "boolean", default: true, group: g },

    { key: "infill", label: "Garage door opening becomes", type: "select", default: "WALL_WINDOW", public: true, group: "Front wall", options: [["WALL_WINDOW", "Brick / block wall with a window"], ["WALL_SOLID", "Solid wall"], ["FRENCH", "French doors"], ["BIFOLD", "Bi-fold doors"]] },
    { key: "doorWidth", label: "Garage door width", type: "number", unit: "m", default: 2.4, min: 1.8, max: 5.5, group: "Front wall" },
    { key: "doorHeight", label: "Garage door height", type: "number", unit: "m", default: 2.1, min: 1.8, max: 2.6, group: "Front wall" },
    { key: "footing", label: "New footing under the infill wall", type: "boolean", default: true, group: "Front wall", hint: "Building control usually asks for a trial hole; a footing is needed where the door threshold has none" },
    { key: "facing", label: "Outside face", type: "select", default: "BRICK", group: "Front wall", options: [["BRICK", "Facing brick to match"], ["RENDER", "Block & render"]] },

    { key: "floor", label: "Floor", type: "select", default: "SCREED", group: "Floor", options: [["SCREED", "DPM, PIR insulation & screed up to house level"], ["TIMBER", "Timber floor on sleeper walls with insulation"], ["EXISTING", "Floor already level & insulated"]] },
    { key: "floorRaise", label: "Raise floor by", type: "number", unit: "mm", default: 150, min: 0, max: 400, group: "Floor", when: [{ key: "floor", not: "EXISTING" }] },
    { key: "flooring", label: "Floor finish", type: "select", default: "LAMINATE", options: flooringOptions, public: true, clientChoice: true, group: "Floor" },

    { key: "walls", label: "Walls", type: "select", default: "STUD", group: "Walls & ceiling", options: [["STUD", "Insulated stud lining (single-skin walls)"], ["THERMAL_BOARD", "Insulated plasterboard dot & dab"], ["SKIM", "Already insulated – skim only"]] },
    { key: "ceiling", label: "Ceiling", type: "select", default: "INSULATE", group: "Walls & ceiling", options: [["INSULATE", "Insulate between & under joists, board & skim"], ["NEW_JOISTS", "New ceiling joists, insulate, board & skim"], ["SKIM", "Existing ceiling – skim only"]] },
    { key: "roof", label: "Garage roof", type: "select", default: "KEEP", group: "Walls & ceiling", options: [["KEEP", "Keep the existing roof"], ["FLAT_NEW", "New insulated flat roof (EPDM)"], ["REFELT", "Re-felt existing flat roof"]] },

    n("windows", "Extra windows", "Doors & windows", 0, 6),
    n("rooflights", "Flat rooflights", "Doors & windows", 0, 4),
    { key: "houseDoor", label: "Door through to the house", type: "select", default: "FIRE", group: "Doors & windows", options: [["FIRE", "FD30 fire door with closer"], ["STANDARD", "Standard internal door"], ["NONE", "No door"]] },
    { key: "newOpening", label: "Form a new opening into the house", type: "boolean", default: false, group: "Doors & windows", hint: "Lintel / steel, props and make good" },

    n("sockets", "Double sockets", "Electrics & heating", 6, 20),
    n("downlights", "Spotlights", "Electrics & heating", 6, 30),
    n("switches", "Light switches", "Electrics & heating", 1, 6),
    n("data", "Data / TV points", "Electrics & heating", 1, 6),
    { key: "heating", label: "Heating", type: "select", default: "RADIATOR", group: "Electrics & heating", options: [["RADIATOR", "Radiator off the house heating"], ["UFH_ELECTRIC", "Electric underfloor heating"], ["PANEL", "Electric panel heater"], ["NONE", "No heating"]] },
    n("radiators", "Radiators", "Electrics & heating", 1, 4, { when: [{ key: "heating", is: "RADIATOR" }] }),

    { key: "wc", label: "WC & basin (cloakroom)", type: "boolean", default: false, group: "Plumbing", when: [{ key: "use", in: ["UTILITY", "BEDROOM", "STUDIO", "GYM", "LIVING", "OFFICE"] }] },
    { key: "macerator", label: "Macerator (no gravity drain)", type: "boolean", default: false, group: "Plumbing", when: [{ key: "wc", is: true }] },
    { key: "utility", label: "Utility: sink, washing machine & dryer points", type: "boolean", default: false, group: "Plumbing", when: [{ key: "use", in: ["UTILITY", "KITCHEN"] }] },

    { key: "decorate", label: "Decorate (mist & 2 coats)", type: "boolean", default: true, group: "Finishes" },
    { key: "paintSystem", label: "Paint", type: "select", default: "STANDARD", options: paintSystemOptions, clientChoice: true, group: "Finishes", when: [{ key: "decorate", is: true }] },
  ],
  needsScaffold: () => false,
  skips: () => 1,
  build(ctx, v) {
    const L = num(v, "length"), W = num(v, "width"), H = num(v, "height");
    const A = qty2(L * W), perim = 2 * (L + W);
    const dw = num(v, "doorWidth"), dh = num(v, "doorHeight"), infill = str(v, "infill"), use = str(v, "use");
    const done: string[] = [];

    // Strip out & groundworks
    const G = "Strip out & groundworks";
    if (bool(v, "strip")) { ctx.labour(G, "strip_out", A, `${fmt(A)} m² garage`); done.push("clear the garage"); }
    ctx.labour(G, "garage_door_remove", 1, "garage door & frame");
    if (bool(v, "footing")) {
      ctx.labour(G, "infill_footing", dw, `${fmt(dw)} m under the door opening`);
      ctx.material(G, "concrete_c25", qty2(dw * 0.6 * 0.8), `${fmt(dw)} m × 0.6 m × 0.8 m deep`);
      done.push("dig and pour a new footing under the door opening");
    }

    // Infill wall: cavity wall, DPC tied in to the floor DPM, wall ties, lintel over a window / doors.
    const M = "Masonry & structure";
    const opening = qty2(dw * dh);
    const glazed = infill === "WALL_WINDOW" ? 1.2 * 1.2 : infill === "WALL_SOLID" ? 0 : opening;
    const wall = qty2(Math.max(0, opening - glazed));
    if (wall > 0) {
      ctx.labour(M, "garage_infill", wall, `${fmt(dw)} × ${fmt(dh)} m opening${glazed ? ` − ${fmt(glazed)} m² glazing` : ""}`);
      ctx.material(M, "thermal_block", ceil(wall * 10 * 1.05), `${fmt(wall)} m² × 10 blocks + 5% (inner leaf)`);
      if (str(v, "facing") === "BRICK") ctx.material(M, "facing_brick", ceil(wall * 60 * 1.05), `${fmt(wall)} m² × 60 bricks + 5%`);
      else { ctx.material(M, "dense_block", ceil(wall * 10 * 1.05), `${fmt(wall)} m² × 10 blocks + 5%`); renderNewWall(ctx, M, wall, "SILICONE", "infill wall"); }
      ctx.material(M, "cavity_insulation", ceil(wall), `${fmt(wall)} m²`);
      ctx.material(M, "wall_ties", ceil(wall * 2.5 / 50), `${fmt(wall)} m² × 2.5 ties ÷ 50 per box`);
      ctx.material(M, "dpc", 1, `${fmt(dw)} m`);
      ctx.material(M, "weep_vent", 2, "over the lintel / at DPC");
      ctx.material(M, "cavity_closer", 1, "reveals");
    }
    if (infill !== "WALL_SOLID") ctx.material(M, "lintel", 1, infill === "WALL_WINDOW" ? "over the new window" : "over the new doors");
    if (bool(v, "newOpening")) { ctx.labour(M, "knock_through", 1, "1 m opening to the house"); ctx.material(M, "lintel", 1, "new opening"); done.push("form a new opening through to the house"); }

    // Floor: DPM lapped to the DPC, PIR, screed (or sleeper walls + joists + chipboard) to house level.
    const F = "Floor";
    const fl = str(v, "floor");
    if (fl !== "EXISTING") {
      ctx.material(F, "dpm", ceil(A * 1.15), `${fmt(A)} m² + laps & upstands`);
      ctx.material(F, "pir_100", ceil(A / SHEET * 1.05), `${fmt(A)} m² ÷ ${SHEET} m² per sheet + 5%`);
      ctx.material(F, "edge_insulation", ceil(perim), `${fmt(perim)} m perimeter`);
      if (fl === "SCREED") {
        ctx.labour(F, "floor_raise", A, `${fmt(A)} m² raised ${num(v, "floorRaise")} mm`);
        ctx.material(F, "screed_mix", qty2(A * 0.065 * 2), `${fmt(A)} m² × 65 mm × 2 t/m³`);
        done.push(`lay a DPM, 100 mm PIR insulation and screed to bring the floor up to house level`);
      } else {
        ctx.material(F, "timber_47x100", qty2(ceil(L / 0.4) * W * 1.1), `joists at 400 centres × ${fmt(W)} m + 10%`, "Floor joists / sleepers");
        ctx.material(F, "chipboard_22", ceil(A / SHEET * 1.05), `${fmt(A)} m² ÷ ${SHEET} m² + 5%`);
        ctx.labour(F, "floor_raise", A, `${fmt(A)} m² timber floor`);
        done.push("build an insulated timber floor on sleepers to house level");
      }
    }
    flooring(ctx, "Flooring", A, str(v, "flooring"), { perimeter: perim, doors: 1 });

    // Walls: insulated stud lining or thermal board, ceiling insulation, board & skim.
    const P = "Plastering";
    const wallArea = qty2(perim * H - glazed);
    const wt = str(v, "walls");
    if (wt === "STUD") {
      ctx.labour("Carpentry & joinery", "insulated_lining", wallArea, `${fmt(perim)} m × ${fmt(H)} m − glazing`);
      ctx.material("Carpentry & joinery", "timber_47x100", qty2(ceil(perim / 0.6) * H * 1.1), `battens at 600 centres + 10%`, "Wall lining battens");
      ctx.material("Carpentry & joinery", "pir_50", ceil(wallArea / SHEET * 1.05), `${fmt(wallArea)} m² + 5%`);
      ctx.material("Carpentry & joinery", "vcl", ceil(wallArea * 1.1), `${fmt(wallArea)} m² + laps`);
      boardAndSkim(ctx, P, wallArea, "garage walls");
    } else if (wt === "THERMAL_BOARD") {
      ctx.material(P, "pir_50", ceil(wallArea / SHEET * 1.05), `${fmt(wallArea)} m² insulated board`, "Insulated plasterboard (PIR-backed)");
      boardAndSkim(ctx, P, wallArea, "garage walls", { fixing: "dab" });
    } else skim(ctx, P, wallArea, "garage walls");
    const ce = str(v, "ceiling");
    if (ce === "NEW_JOISTS") { ctx.material("Carpentry & joinery", "timber_47x150", qty2((ceil(L / 0.4) + 1) * W * 1.1), `joists at 400 centres + 10%`, "Ceiling joists"); ctx.labour("Carpentry & joinery", "stud_wall", A, "ceiling joists"); }
    if (ce !== "SKIM") {
      ctx.material("Carpentry & joinery", "loft_wool_270", ceil(A / 5), `${fmt(A)} m² ÷ 5 m² per roll`, "Insulation between ceiling joists");
      ctx.labour("Carpentry & joinery", "insulation_fit", A, `${fmt(A)} m² ceiling`);
      boardAndSkim(ctx, P, A, "garage ceiling");
    } else skim(ctx, P, A, "garage ceiling");
    if (str(v, "roof") === "FLAT_NEW") { ctx.labour("Roof", "flat_roof_structure", A, `${fmt(A)} m²`); ctx.material("Roof", "epdm_system", ceil(A * 1.15), `${fmt(A)} m² + upstands`); ctx.labour("Roof", "epdm_roof", A, `${fmt(A)} m²`); done.push("new insulated flat roof with EPDM"); }
    else if (str(v, "roof") === "REFELT") { ctx.material("Roof", "felt_system", ceil(A * 1.15), `${fmt(A)} m² + upstands`); ctx.labour("Roof", "felt_roof", A, `${fmt(A)} m²`); done.push("re-felt the flat roof"); }

    // Doors & windows
    const O = "Windows & doors";
    if (infill === "WALL_WINDOW") fitWindows(ctx, O, 1, "garage_window", "window in the infill wall (trickle vents, escape hinges)");
    if (infill === "FRENCH") { ctx.material(O, "french_upvc", 1, "1 set"); ctx.labour(O, "door_set_fit", 1, "French doors"); }
    if (infill === "BIFOLD") { ctx.material(O, "bifold_alu", 1, "1 set"); ctx.labour(O, "door_set_fit", 1, "bi-fold doors"); }
    fitWindows(ctx, O, num(v, "windows"), "window_upvc", "extra windows");
    if (num(v, "rooflights")) { ctx.material(O, "rooflight_flat", num(v, "rooflights"), `${num(v, "rooflights")} rooflights`); ctx.labour(O, "rooflight_fit", num(v, "rooflights"), "rooflights"); }
    const hd = str(v, "houseDoor");
    if (hd !== "NONE") newDoors(ctx, "Doors", 1, hd === "FIRE" ? "door_fire" : "door_standard", { label: "door to the house", paint: bool(v, "decorate") });
    skirting(ctx, "Carpentry & joinery", perim);

    // Electrics & heating (one certificate for the whole job comes from site costs)
    const E = "First fix";
    const elec = { sockets: num(v, "sockets"), downlights: num(v, "downlights"), switches: num(v, "switches"), data: num(v, "data"), fanIsolators: bool(v, "wc") ? 1 : 0 };
    electricsItems(ctx, E, elec, { label: "garage" });
    ctx.material(E, "smoke_alarm", 1, "mains interlinked smoke alarm (Part B)");
    if (str(v, "garageType") === "DETACHED") { ctx.material(E, "sub_board", 1, "garage board"); ctx.labour(E, "swa_connect", 1, "armoured supply from the house"); }
    const heat = str(v, "heating");
    if (heat === "RADIATOR") radiators(ctx, "Plumbing & heating", num(v, "radiators"), 6);
    if (heat === "UFH_ELECTRIC") { ctx.material(F, "ufh_mat", ceil(A * 0.8), `${fmt(A)} m² × 80% heated`); ctx.labour(F, "ufh_fit", ceil(A * 0.8), "electric UFH mat & thermostat"); }
    if (heat === "PANEL") { ctx.material(E, "panel_heater", 1, "1 heater"); ctx.labour(E, "heater_fit", 1, "spur & heater"); }

    // Plumbing
    if (bool(v, "wc")) {
      const Pl = "Plumbing & heating";
      ctx.material(Pl, "wc_cloakroom", 1, "WC & basin");
      ctx.material(Pl, bool(v, "macerator") ? "macerator" : "soil_110", 1, bool(v, "macerator") ? "pumped waste" : "soil connection");
      ctx.material(Pl, "extractor_fan", 1, "WC extract (Part F)"); ctx.material(Pl, "extract_duct_kit", 1, "duct to outside");
      ctx.labour(Pl, "cloakroom_fit", 1, "WC & basin with soil connection");
      done.push("cloakroom WC and basin with extract fan");
    }
    if (bool(v, "utility")) { ctx.labour("Plumbing & heating", "utility_plumbing", 1, "sink, washing machine & dryer"); ctx.material("Plumbing & heating", "plumbing_sundries", 1, "utility"); done.push("utility sink, washing machine and dryer connections"); }

    if (bool(v, "decorate")) paint(ctx, "Decoration", { label: "garage", rooms: 1, walls: wallArea, ceilings: A, newPlaster: wallArea + A, skirting: perim, system: str(v, "paintSystem") });

    const infillWords = infill === "WALL_WINDOW" ? "brick up the garage door opening as an insulated cavity wall with a new window" : infill === "WALL_SOLID" ? "brick up the garage door opening as an insulated cavity wall" : `fit ${infill === "BIFOLD" ? "bi-fold" : "French"} doors in the old garage door opening`;
    ctx.scope(`Garage conversion to a ${useLabel(use).toLowerCase()} (${fmt(L)} × ${fmt(W)} m): remove the garage door, ${infillWords}; ${done.join("; ")}; insulate and line the walls and ceiling, board and skim; electrics (${elecSummary(elec)}), smoke alarm${heat !== "NONE" ? `, ${heat === "RADIATOR" ? "radiator" : heat === "PANEL" ? "panel heater" : "underfloor heating"}` : ""}; ${flooringOptions.find(([k]) => k === str(v, "flooring"))?.[1].toLowerCase() ?? "floor"} finish${bool(v, "decorate") ? " and decoration" : ""}.`);
    ctx.assume("Garage conversion is built to Building Regulations (change of use): footing checked by a trial hole, DPM lapped to the DPC, wall / floor / roof insulation to Part L, fire door and escape window to Part B, trickle vents and extract to Part F. Building control fee is a provisional sum.");
    if (str(v, "garageType") === "INTEGRAL" && hd !== "FIRE") ctx.warn("An integral garage converted to a room normally needs a fire door to the house – check with building control.");
    if (use === "BEDROOM" && infill === "WALL_SOLID" && !num(v, "windows")) ctx.warn("A bedroom needs an escape window (Part B) – add a window.");
  },
};
