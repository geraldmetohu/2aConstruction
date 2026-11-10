import { bool, num, str, type Field, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";
import { boardAndSkim, electricsItems, elecSummary, fitWindows, flooring, flooringOptions, paint, paintSystemOptions } from "./common";
import { cladNewWall, claddingOptions } from "./external";

const ceil = (x: number) => Math.ceil(x - 1e-9);
const SHEET = 2.88;

export const outbuildingTypeOptions: [string, string][] = [
  ["SUMMER_HOUSE", "Summer house"], ["GARDEN_ROOM", "Garden room"], ["OFFICE", "Garden office"], ["GYM", "Garden gym"],
  ["STUDIO", "Studio / workshop"], ["ANNEXE", "Annexe (sleeping accommodation)"], ["SHED", "Shed / store"],
];
const typeLabel = (k: string) => outbuildingTypeOptions.find(([x]) => x === k)?.[1] ?? "garden building";
const n = (key: string, label: string, group: string, d: number, max = 20, extra: Partial<Field> = {}): Field => ({ key, label, type: "int", default: d, min: 0, max, group, ...extra });
const B = "Building";

/**
 * Garden buildings: summer houses, garden rooms, offices, gyms, studios and annexes.
 * Kit = assemble a bought kit; bespoke = insulated timber frame clad to choice.
 * Permitted development: max 2.5 m high within 2 m of a boundary, not in front of the house, ≤ 50% of the garden.
 * Sleeping accommodation (annexe) needs Building Regulations; over 15 m² internal (or 15–30 m² within 1 m of a boundary
 * unless built of non-combustible materials) too.
 */
export const outbuildingPackage: WorkPackage = {
  id: "outbuilding", label: "Garden room / summer house", short: "Garden building",
  description: "Summer house, garden room, office, gym, studio or annexe: base, insulated timber frame or kit, cladding, roof, doors & windows, electrics, heating and finishes.",
  fields: [
    { key: "type", label: "Building", type: "select", default: "GARDEN_ROOM", options: outbuildingTypeOptions, public: true, group: B },
    { key: "build", label: "Built as", type: "select", default: "BESPOKE", group: B, options: [["BESPOKE", "Bespoke insulated timber frame"], ["KIT", "Kit / log cabin (we assemble)"]] },
    { key: "length", label: "Length", type: "number", unit: "m", default: 4, min: 1.5, max: 15, public: true, group: B },
    { key: "width", label: "Depth", type: "number", unit: "m", default: 3, min: 1.5, max: 10, public: true, group: B },
    { key: "height", label: "Overall height", type: "number", unit: "m", default: 2.5, min: 2, max: 4, group: B, hint: "2.5 m max within 2 m of a boundary (permitted development)" },
    { key: "clearance", label: "Clear & level the area first", type: "number", unit: "m²", default: 0, min: 0, max: 200, group: B },

    { key: "base", label: "Base", type: "select", default: "SCREWS", group: "Base", options: [["SCREWS", "Ground screws & timber frame"], ["SLAB", "Concrete slab 100 mm on hardcore"], ["EXISTING", "Existing patio / slab"]] },

    { key: "cladding", label: "Outside cladding", type: "select", default: "COMPOSITE", options: claddingOptions.filter(([k]) => k !== "TILE" && k !== "SLATE"), clientChoice: true, group: "Walls & roof", when: [{ key: "build", is: "BESPOKE" }] },
    { key: "roof", label: "Roof covering", type: "select", default: "EPDM", group: "Walls & roof", options: [["EPDM", "EPDM rubber (flat)"], ["FELT", "Torch-on felt (flat)"], ["SHINGLES", "Felt shingles (pitched kit)"]] },
    { key: "insulated", label: "Insulated & lined inside", type: "boolean", default: true, group: "Walls & roof" },
    { key: "lining", label: "Inside finish", type: "select", default: "PLASTER", group: "Walls & roof", options: [["PLASTER", "Plasterboard & skim"], ["PLY", "Plywood / OSB"], ["TG", "Tongue & groove boards"]], when: [{ key: "insulated", is: true }] },

    { key: "doors", label: "Doors", type: "select", default: "BIFOLD", public: true, group: "Doors & windows", options: [["BIFOLD", "Aluminium bi-folds"], ["FRENCH", "French doors"], ["SINGLE", "Single glazed door"], ["KIT", "Kit doors"]] },
    n("windows", "Windows", "Doors & windows", 1, 8),
    n("rooflights", "Rooflights", "Doors & windows", 0, 4),

    { key: "power", label: "Power from the house", type: "boolean", default: true, public: true, group: "Electrics & heating" },
    { key: "cableRun", label: "Armoured cable run from the house", type: "number", unit: "m", default: 15, min: 0, max: 100, group: "Electrics & heating", when: [{ key: "power", is: true }] },
    n("sockets", "Double sockets", "Electrics & heating", 4, 20, { when: [{ key: "power", is: true }] }),
    n("downlights", "Spotlights", "Electrics & heating", 4, 20, { when: [{ key: "power", is: true }] }),
    n("outside", "Outside lights", "Electrics & heating", 1, 6, { when: [{ key: "power", is: true }] }),
    n("data", "Data point", "Electrics & heating", 1, 4, { when: [{ key: "power", is: true }] }),
    { key: "heating", label: "Heating", type: "select", default: "PANEL", group: "Electrics & heating", options: [["PANEL", "Electric panel heater"], ["AIRCON", "Air conditioning (heat & cool)"], ["NONE", "None"]], when: [{ key: "power", is: true }] },

    { key: "water", label: "Water & waste (WC / sink)", type: "boolean", default: false, group: "Plumbing", hint: "Annexes and studios" },
    { key: "habitable", label: "Sleeping accommodation – Building Regulations", type: "boolean", default: false, group: "Plumbing", when: [{ key: "type", is: "ANNEXE" }] },

    { key: "flooring", label: "Floor finish", type: "select", default: "LAMINATE", options: flooringOptions, clientChoice: true, group: "Finishes" },
    { key: "decorate", label: "Paint inside", type: "boolean", default: true, group: "Finishes", when: [{ key: "lining", is: "PLASTER" }] },
    { key: "paintSystem", label: "Paint", type: "select", default: "STANDARD", options: paintSystemOptions, clientChoice: true, group: "Finishes", when: [{ key: "decorate", is: true }] },
    { key: "deck", label: "Decking in front", type: "number", unit: "m²", default: 0, min: 0, max: 100, group: "Finishes" },
  ],
  needsScaffold: () => false,
  skips: () => 1,
  build(ctx, v) {
    const L = num(v, "length"), W = num(v, "width"), H = num(v, "height");
    const A = qty2(L * W), perim = 2 * (L + W);
    const type = str(v, "type"), kit = str(v, "build") === "KIT";
    const wallH = Math.max(2, H - 0.25);
    const doorArea = str(v, "doors") === "BIFOLD" ? 2.4 * 2.1 : str(v, "doors") === "FRENCH" ? 1.5 * 2.1 : 0.9 * 2.1;
    const glazing = doorArea + num(v, "windows") * 1.0;
    const wallArea = qty2(Math.max(0, perim * wallH - glazing));
    const roofA = qty2((L + 0.4) * (W + 0.4));
    const words: string[] = [];

    // Site & base
    const G = "Strip out & groundworks";
    if (num(v, "clearance")) { ctx.labour(G, "garden_clearance", num(v, "clearance"), `${fmt(num(v, "clearance"))} m²`); words.push("clear the area"); }
    const base = str(v, "base");
    if (base === "SCREWS") { ctx.labour(G, "outbuilding_base_screws", A, `${fmt(A)} m²`); words.push("ground screw foundation with a treated timber base frame"); }
    if (base === "SLAB") {
      ctx.labour(G, "excavate_reduce", A, `${fmt(A)} m² to 200 mm`);
      ctx.material(G, "hardcore_mot", qty2(A * 0.1 * 2), `${fmt(A)} m² × 100 mm × 2 t/m³`);
      ctx.material(G, "dpm", ceil(A * 1.15), `${fmt(A)} m² + laps`);
      ctx.material(G, "concrete_c25", qty2(A * 0.1 * 1.05), `${fmt(A)} m² × 100 mm + 5%`);
      ctx.labour(G, "pour_concrete", qty2(A * 0.1), `${fmt(A)} m² × 100 mm`);
      words.push("100 mm concrete slab on hardcore and DPM");
    }

    // Structure
    const S = "Structure";
    if (kit) {
      ctx.material(S, "outbuilding_kit_mat", A, `${fmt(A)} m² floor area (allowance – client to choose the kit)`);
      ctx.labour(S, "outbuilding_kit", A, `${fmt(A)} m²`);
      words.push("assemble the summer house / log cabin kit and treat");
    } else {
      const frame = qty2(wallArea + glazing + roofA + A);
      ctx.material(S, "outbuilding_frame_mat", frame, `walls ${fmt(qty2(wallArea + glazing))} + roof ${fmt(roofA)} + floor ${fmt(A)} m²`);
      ctx.labour(S, "outbuilding_frame", frame, `${fmt(frame)} m² of frame`);
      ctx.material(S, "breather_membrane", ceil((wallArea + roofA) * 1.15), `${fmt(qty2(wallArea + roofA))} m² + laps`);
      const clad = cladNewWall(ctx, "Cladding", wallArea, str(v, "cladding"), "garden building");
      words.push(`insulated timber frame on 47 × 100 studs with OSB sheathing and breather membrane, ${clad}`);
    }
    const R = "Roof";
    const rc = str(v, "roof");
    if (rc === "EPDM") { ctx.material(R, "epdm_system", ceil(roofA * 1.1), `${fmt(roofA)} m² + upstands`); ctx.labour(R, "epdm_roof", roofA, `${fmt(roofA)} m²`); }
    else if (rc === "FELT") { ctx.material(R, "felt_system", ceil(roofA * 1.1), `${fmt(roofA)} m²`); ctx.labour(R, "felt_roof", roofA, `${fmt(roofA)} m²`); }
    else ctx.labour(R, "felt_roof", roofA, `${fmt(roofA)} m² shingles`);
    words.push(rc === "EPDM" ? "EPDM rubber roof" : rc === "FELT" ? "torch-on felt roof" : "felt shingle roof");
    ctx.material(R, "fascia_soffit", ceil(perim), `${fmt(perim)} m edge trim`);
    ctx.material(R, "downpipe", 1, "1 gutter & downpipe set");

    // Insulation & lining
    if (bool(v, "insulated")) {
      const C = "Carpentry & joinery";
      const lined = qty2(wallArea + A * 2);
      ctx.material(C, "outbuilding_lining_mat", lined, `walls ${fmt(wallArea)} + ceiling ${fmt(A)} + floor ${fmt(A)} m²`);
      ctx.labour(C, "outbuilding_lining", lined, `${fmt(lined)} m²`);
      ctx.material(C, "vcl", ceil(lined * 1.1), `${fmt(lined)} m² + laps`);
      if (str(v, "lining") === "PLASTER") boardAndSkim(ctx, "Plastering", qty2(wallArea + A), "garden building");
      else ctx.material(C, "osb_18", ceil((wallArea + A) / SHEET * 1.05), `${fmt(qty2(wallArea + A))} m² ÷ ${SHEET} m²`, str(v, "lining") === "TG" ? "Tongue & groove lining" : "Plywood / OSB lining");
      ctx.material(C, "chipboard_22", ceil(A / SHEET * 1.05), `${fmt(A)} m² floor deck`);
      words.push("insulate the floor, walls and roof (PIR) with a vapour barrier and line inside");
    }

    // Doors & windows
    const O = "Windows & doors";
    const d = str(v, "doors");
    if (d === "BIFOLD") { ctx.material(O, "bifold_alu", 1, "1 set"); ctx.labour(O, "door_set_fit", 1, "bi-folds"); }
    if (d === "FRENCH") { ctx.material(O, "french_upvc", 1, "1 set"); ctx.labour(O, "door_set_fit", 1, "French doors"); }
    if (d === "SINGLE") fitWindows(ctx, O, 1, "window_upvc", "glazed door");
    if (!kit) fitWindows(ctx, O, num(v, "windows"), "window_upvc", "windows");
    if (num(v, "rooflights")) { ctx.material(O, "rooflight_flat", num(v, "rooflights"), `${num(v, "rooflights")}`); ctx.labour(O, "rooflight_fit", num(v, "rooflights"), "rooflights"); }

    // Electrics & heating
    let elec = { sockets: 0, downlights: 0, outside: 0, data: 0, spurs: 0 };
    if (bool(v, "power")) {
      const E = "First fix";
      const run = num(v, "cableRun");
      if (run) { ctx.material(E, "swa_cable", ceil(run * 1.1), `${fmt(run)} m + 10%`); ctx.labour(E, "swa_trench", run, `${fmt(run)} m`); }
      ctx.material(E, "sub_board", 1, "garden building board with RCD");
      ctx.labour(E, "swa_connect", 1, "connect, test & certify");
      elec = { sockets: num(v, "sockets"), downlights: num(v, "downlights"), outside: num(v, "outside"), data: num(v, "data"), spurs: str(v, "heating") === "NONE" ? 0 : 1 };
      electricsItems(ctx, E, elec, { label: "garden building" });
      if (str(v, "heating") === "PANEL") { ctx.material(E, "panel_heater", 1, "1 heater"); ctx.labour(E, "heater_fit", 1, "heater"); }
      if (str(v, "heating") === "AIRCON") { ctx.material(E, "aircon_unit", 1, "1 unit"); ctx.labour(E, "aircon_fit", 1, "split unit"); }
      words.push(`armoured supply from the house${run ? ` (${fmt(run)} m in a trench)` : ""} to a new board, ${elecSummary(elec)}${str(v, "heating") === "PANEL" ? ", panel heater" : str(v, "heating") === "AIRCON" ? ", air conditioning" : ""}`);
    }
    if (bool(v, "water")) {
      ctx.material("Plumbing & heating", "wc_cloakroom", 1, "WC & basin");
      ctx.material("Plumbing & heating", "macerator", 1, "pumped waste to the house drain");
      ctx.material("Plumbing & heating", "mdpe_25", ceil(num(v, "cableRun") * 1.1), `${fmt(num(v, "cableRun"))} m water feed + 10%`);
      ctx.labour("Plumbing & heating", "cloakroom_fit", 1, "WC & basin");
      words.push("water feed and pumped waste with WC and basin");
    }

    // Finishes
    flooring(ctx, "Flooring", A, str(v, "flooring"), { perimeter: perim, doors: 0 });
    if (bool(v, "decorate") && bool(v, "insulated") && str(v, "lining") === "PLASTER") paint(ctx, "Decoration", { label: "garden building", rooms: 1, walls: wallArea, ceilings: A, newPlaster: wallArea + A, system: str(v, "paintSystem") });
    if (num(v, "deck")) { ctx.labour("Decking", "deck_frame", num(v, "deck"), `${fmt(num(v, "deck"))} m²`); ctx.labour("Decking", "deck_board_fix", num(v, "deck"), `${fmt(num(v, "deck"))} m²`); ctx.material("Decking", "deck_board_softwood", ceil(num(v, "deck") * 1.1), `${fmt(num(v, "deck"))} m² + 10%`); words.push(`${fmt(num(v, "deck"))} m² deck in front`); }

    ctx.scope(`${typeLabel(type)} ${fmt(L)} × ${fmt(W)} m, ${fmt(H)} m high: ${words.join("; ")}; ${d === "BIFOLD" ? "aluminium bi-fold doors" : d === "FRENCH" ? "French doors" : "glazed door"}${num(v, "windows") ? ` and ${num(v, "windows")} window${num(v, "windows") > 1 ? "s" : ""}` : ""}; ${flooringOptions.find(([k]) => k === str(v, "flooring"))?.[1].toLowerCase() ?? "floor"} finish.`);
    ctx.assume(`Built under permitted development: under 2.5 m high within 2 m of a boundary, not in front of the house and covering under half the garden. ${H > 2.5 ? "Over 2.5 m high – keep it more than 2 m from every boundary or apply for planning." : ""}`.trim());
    if (type === "ANNEXE" || bool(v, "habitable")) ctx.assume("Sleeping accommodation needs Building Regulations approval (insulation, fire safety, ventilation, drainage); building control fee is a provisional sum.");
    if (A > 15 && !bool(v, "habitable")) ctx.assume(`Over 15 m² internal floor area: building control may apply unless it is more than 1 m from every boundary or built mainly of non-combustible materials.`);
  },
};
