import { bool, num, str, type WorkPackage } from "../package";
import { beamForSpan, beamSizes, joistForSpan, timberSizes } from "../ratebook";
import { fmt, qty2 } from "../util";
import type { ElecSpec } from "./common";
import type { Ctx } from "../engine";
import { claddingOptions, cladNewWall, newRenderOptions, renderNewWall } from "./external";
import { brickOptions } from "./extension-options";
import { buildKitchen, kitchenFields } from "./kitchen";
import { boardAndSkim, elecSummary, electricsItems, fasciaSoffit, fitWindows, flooring, flooringOptions, paint, paintSystemOptions, radiators, rainwater, rooflineFields, skirting } from "./common";

const rooflightOptions: [string, string][] = [["rooflight_600", "600 × 600 flat"], ["rooflight_800", "800 × 800 flat"], ["rooflight_1000", "1000 × 1000 flat"], ["rooflight_1000x1500", "1000 × 1500 flat"], ["rooflight_1000x2000", "1000 × 2000 flat"], ["lantern_2000x1000", "Lantern 2000 × 1000"], ["lantern_3000x1000", "Lantern 3000 × 1000"], ["lantern_3000x1500", "Lantern 3000 × 1500"]];

const PITCH = 22.5; // lean-to pitch, degrees
const r1 = (x: number) => Math.ceil(x * 10 - 1e-9) / 10;

export const extTypeOptions: [string, string][] = [
  ["REAR", "Single storey rear"], ["SIDE_RETURN", "Side return infill"], ["SIDE", "Single storey side"], ["WRAPAROUND", "Wraparound (rear + side return)"],
  ["DOUBLE", "Double storey rear"], ["DOUBLE_SIDE", "Double storey side"], ["WRAP_DOUBLE_REAR", "Wraparound, double storey at the rear"], ["WRAP_DOUBLE_SIDE", "Wraparound, double storey over the side"],
];
const DOUBLES = ["DOUBLE", "DOUBLE_SIDE", "WRAP_DOUBLE_REAR", "WRAP_DOUBLE_SIDE"];
const WRAPS = ["WRAPAROUND", "WRAP_DOUBLE_REAR", "WRAP_DOUBLE_SIDE"];
const isDouble = { key: "extType", in: DOUBLES };
const rooflightSizeOptions: [string, string][] = [...rooflightOptions, ["CUSTOM_FLAT", "Flat rooflight – made to size"], ["CUSTOM_LANTERN", "Lantern – made to size"], ["TBC", "Size to be confirmed (client to fill in)"]];
export const extWallOptions: [string, string][] = [["BRICK_BLOCK", "Facing brick + block cavity"], ["BLOCK_RENDER", "Block cavity, rendered"], ["CLAD_COMPOSITE", "Block cavity, composite cladding"], ["CLAD_TIMBER", "Block cavity, timber cladding"]];

export const extensionPackage: WorkPackage = {
  id: "extension", label: "Extension", short: "Extension",
  description: "Rear, side return, wraparound or double storey extension: foundations, drainage, slab, cavity walls, roof, glazing, steel openings into the house, services and finishes.",
  fields: [
    { key: "extType", label: "Type of extension", type: "select", default: "REAR", public: true, group: "Size", options: extTypeOptions },
    { key: "width", label: "Width (across the back; side return: its width)", type: "number", unit: "m", default: 4.5, min: 1, max: 15, public: true, group: "Size" },
    { key: "depth", label: "Depth (projection; side return: length along the house)", type: "number", unit: "m", default: 4, min: 1, max: 15, public: true, group: "Size" },
    { key: "sideWidth", label: "Side return width", type: "number", unit: "m", default: 1.8, min: 0.8, max: 5, public: true, group: "Size", when: [{ key: "extType", in: WRAPS }] },
    { key: "sideLength", label: "Side return length (along the house)", type: "number", unit: "m", default: 4, min: 1, max: 15, public: true, group: "Size", when: [{ key: "extType", in: WRAPS }] },
    { key: "wallHeight", label: "Ground floor wall height", type: "number", unit: "m", default: 2.7, min: 2.2, max: 3.5, group: "Size" },
    { key: "upperHeight", label: "First floor wall height", type: "number", unit: "m", default: 2.4, min: 2.2, max: 3.2, group: "First floor", when: [isDouble] },
    { key: "upperRooms", label: "Rooms upstairs (bedroom / bathroom)", type: "int", default: 1, min: 1, max: 3, public: true, group: "First floor", when: [isDouble] },
    { key: "upperWindows", label: "First floor windows", type: "int", default: 2, min: 0, max: 8, public: true, group: "First floor", when: [isDouble] },
    { key: "upperOpening", label: "Open into the house at first floor (steel)", type: "boolean", default: true, group: "First floor", when: [isDouble] },
    { key: "upperOpeningWidth", label: "First floor opening width", type: "number", unit: "m", default: 1, min: 0.8, max: 6, group: "First floor", when: [isDouble, { key: "upperOpening", is: true }] },
    { key: "upperRadiators", label: "First floor radiators", type: "int", default: 1, min: 0, max: 6, group: "First floor", when: [isDouble] },

    { key: "foundation", label: "Foundations", type: "select", default: "TRENCH_FILL", group: "Foundations", hint: "As the engineer / Building Control require", options: [
      ["TRENCH_FILL", "Trench fill concrete"], ["STRIP", "Strip footing + blockwork"], ["RAFT", "Reinforced raft slab (poor ground)"], ["PILED", "Mini piles + reinforced ground beams (clay / trees / deep fill)"]] },
    { key: "foundDepth", label: "Foundation depth", type: "number", unit: "m", default: 1.0, min: 0.6, max: 3, hint: "1 m typical; deeper on clay / near trees", group: "Foundations", when: [{ key: "foundation", in: ["TRENCH_FILL", "STRIP"] }] },
    { key: "foundWidth", label: "Trench width", type: "number", unit: "m", default: 0.6, min: 0.45, max: 1.2, group: "Foundations", when: [{ key: "foundation", in: ["TRENCH_FILL", "STRIP"] }] },
    { key: "pileCentres", label: "Pile spacing along the walls", type: "number", unit: "m", default: 1.8, min: 1, max: 3, group: "Foundations", when: [{ key: "foundation", is: "PILED" }] },
    { key: "raftThickness", label: "Raft thickness", type: "int", unit: "mm", default: 250, min: 150, max: 450, group: "Foundations", when: [{ key: "foundation", is: "RAFT" }] },
    { key: "underpin", label: "Underpin existing house wall", type: "number", unit: "m", default: 0, min: 0, max: 40, group: "Foundations", hint: "Where the new foundation is deeper than the old one next to it" },
    { key: "columns", label: "Steel columns (on pad foundations)", type: "int", default: 0, min: 0, max: 8, group: "Beams & columns", hint: "Posts under beams, e.g. at a wraparound corner" },
    { key: "padSize", label: "Pad size (square, and as deep)", type: "number", unit: "m", default: 1, min: 0.6, max: 2, group: "Beams & columns", when: [{ key: "columns", gt: 0 }] },
    { key: "diggerAccess", label: "Can a mini digger get to the back?", type: "boolean", default: true, group: "Groundworks", hint: "If not, foundations are dug by hand" },
    { key: "spoilRemoval", label: "Spoil removal", type: "select", default: "GRAB", options: [["GRAB", "Grab lorry (≈8 m³ a load)"], ["SKIPS", "Skips (8 yd ≈ 4.5 m³ of soil)"]], group: "Groundworks" },
    { key: "drainRun", label: "New drainage run", type: "number", unit: "m", default: 6, min: 0, max: 40, group: "Groundworks" },
    { key: "chambers", label: "Inspection chambers", type: "int", default: 1, min: 0, max: 5, group: "Groundworks" },
    { key: "gullies", label: "Gullies / RWP connections", type: "int", default: 1, min: 0, max: 6, group: "Groundworks" },
    { key: "moveManhole", label: "Manholes to move / rebuild", type: "int", default: 0, min: 0, max: 4, group: "Groundworks" },
    { key: "buildOver", label: "Building over / near a public sewer", type: "boolean", default: false, group: "Groundworks", hint: "Needs the water company's build-over agreement" },
    { key: "breakOut", label: "Existing patio / concrete to break out", type: "number", unit: "m²", default: 0, min: 0, max: 200, group: "Groundworks" },

    { key: "walls", label: "External walls", type: "select", default: "BRICK_BLOCK", public: true, clientChoice: true, options: extWallOptions, group: "Walls & roof" },
    { key: "brick", label: "Facing brick", type: "select", default: "facing_brick", public: true, clientChoice: true, options: brickOptions, group: "Walls & roof", when: [{ key: "walls", is: "BRICK_BLOCK" }] },
    { key: "belowDpc", label: "Outer leaf below DPC", type: "select", default: "ENGINEERING", group: "Walls & roof", hint: "Engineering bricks resist frost and damp at ground level", options: [["ENGINEERING", "Engineering bricks (Class B)"], ["BLOCK", "Dense blocks"]] },
    { key: "cavityTrays", label: "Cavity trays into the house wall", type: "number", unit: "m", default: 0, min: 0, max: 30, group: "Walls & roof", hint: "Over a roof abutting a cavity wall (stops damp tracking in)" },
    { key: "renderSystem", label: "Render", type: "select", default: "SILICONE", options: newRenderOptions, clientChoice: true, group: "Walls & roof", when: [{ key: "walls", is: "BLOCK_RENDER" }] },
    { key: "roof", label: "Roof", type: "select", default: "FLAT_GRP", public: true, clientChoice: true, options: [["FLAT_GRP", "Flat roof – GRP fibreglass"], ["FLAT_EPDM", "Flat roof – EPDM rubber"], ["FLAT_FELT", "Flat roof – felt"], ["PITCHED_TILE", "Pitched lean-to – tiled"]], group: "Walls & roof" },
    { key: "rooflightCount", label: "Rooflights / lanterns", type: "int", default: 1, min: 0, max: 4, public: true, group: "Rooflights" },
    ...[1, 2, 3, 4].flatMap(i => [
      { key: `rooflight${i}`, label: `Rooflight ${i} size`, type: "select" as const, default: i === 1 ? "rooflight_1000x2000" : "rooflight_1000", options: rooflightSizeOptions, public: i === 1, clientChoice: true, group: "Rooflights", when: [{ key: "rooflightCount", gt: i - 1 }] },
      { key: `rooflight${i}W`, label: `Rooflight ${i} width`, type: "number" as const, unit: "m", default: 1, min: 0.4, max: 6, group: "Rooflights", when: [{ key: "rooflightCount", gt: i - 1 }, { key: `rooflight${i}`, in: ["CUSTOM_FLAT", "CUSTOM_LANTERN"] }] },
      { key: `rooflight${i}L`, label: `Rooflight ${i} length`, type: "number" as const, unit: "m", default: 2, min: 0.4, max: 8, group: "Rooflights", when: [{ key: "rooflightCount", gt: i - 1 }, { key: `rooflight${i}`, in: ["CUSTOM_FLAT", "CUSTOM_LANTERN"] }] },
    ]),

    { key: "doors", label: "Rear doors", type: "select", default: "BIFOLD", public: true, clientChoice: true, options: [["BIFOLD", "Aluminium bi-fold"], ["SLIDING", "Aluminium sliding"], ["FRENCH", "uPVC French doors"], ["NONE", "None"]], group: "Openings" },
    { key: "doorWidth", label: "Door opening width", type: "number", unit: "m", default: 3, min: 1, max: 8, public: true, group: "Openings", when: [{ key: "doors", not: "NONE" }] },
    { key: "windows", label: "Windows", type: "int", default: 1, min: 0, max: 8, public: true, group: "Openings" },
    { key: "knockThrough", label: "Open up into the house (steel beam)", type: "boolean", default: true, public: true, group: "Openings" },
    { key: "openingWidth", label: "Opening width into house", type: "number", unit: "m", default: 3.6, min: 1, max: 10, group: "Openings", when: [{ key: "knockThrough", is: true }] },
    { key: "customSteels", label: "Specify each steel beam myself", type: "boolean", default: false, group: "Steel beams", hint: "Otherwise sized automatically from the openings" },
    { key: "steelCount", label: "Number of steels", type: "int", default: 2, min: 1, max: 4, group: "Steel beams", when: [{ key: "customSteels", is: true }] },
    ...[1, 2, 3, 4].flatMap(i => [
      { key: `steel${i}Size`, label: `Steel ${i} size`, type: "select" as const, default: "203x133", options: Object.entries(beamSizes).map(([k, b]) => [k, b.label] as [string, string]), group: "Steel beams", when: [{ key: "customSteels", is: true }, { key: "steelCount", gt: i - 1 }] },
      { key: `steel${i}Length`, label: `Steel ${i} length`, type: "number" as const, unit: "m", default: 4, min: 0.5, max: 15, group: "Steel beams", when: [{ key: "customSteels", is: true }, { key: "steelCount", gt: i - 1 }] },
    ]),

    ...rooflineFields("Roofline", { fascia: "200", soffit: "NONE", downpipes: 1, height: 3 }),
    { key: "floorType", label: "Ground floor construction", type: "select", default: "SLAB", group: "Floor", options: [
      ["SLAB", "Ground bearing concrete slab, insulated"], ["BEAM_BLOCK", "Beam & block suspended floor"], ["TIMBER", "Suspended timber (joisted) floor"]], when: [{ key: "foundation", not: "RAFT" }] },
    { key: "screedType", label: "Screed", type: "select", default: "SAND_CEMENT", group: "Floor", options: [["SAND_CEMENT", "Sand & cement 65 mm"], ["LIQUID", "Liquid anhydrite 50 mm (best with UFH)"], ["NONE", "No screed"]], when: [{ key: "floorType", not: "TIMBER" }] },
    { key: "houseFloor", label: "Existing floor in the house to take up & relay level", type: "number", unit: "m²", default: 0, min: 0, max: 80, group: "Floor", hint: "Usually the room you open into, so the floors run through level" },
    { key: "ufh", label: "Underfloor heating (else radiators)", type: "boolean", default: false, public: true, clientChoice: true, group: "Heating" },
    { key: "ufhType", label: "Underfloor heating type", type: "select", default: "WET", group: "Heating", options: [["WET", "Wet (pipes in the screed, from the boiler / heat pump)"], ["ELECTRIC", "Electric mat"]], when: [{ key: "ufh", is: true }] },
    { key: "radiators", label: "Radiators", type: "int", default: 1, min: 0, max: 6, group: "Heating", when: [{ key: "ufh", is: false }] },
    { key: "consumerUnit", label: "New consumer unit (fuse board)", type: "boolean", default: false, group: "Electrics", hint: "Priced once for the whole job, even with a loft or other projects" },
    { key: "extSpots", label: "Recessed spotlights (0 = 1 per 2.5 m²)", type: "int", default: 0, min: 0, max: 60, group: "Electrics" },
    { key: "extSockets", label: "Double sockets (0 = 1 per 5 m², min 4)", type: "int", default: 0, min: 0, max: 40, group: "Electrics" },
    { key: "extPendants", label: "Pendant light points", type: "int", default: 0, min: 0, max: 10, group: "Electrics" },
    { key: "extSwitches", label: "Light switches", type: "int", default: 2, min: 0, max: 10, group: "Electrics" },
    { key: "extSpurs", label: "Fused spurs", type: "int", default: 1, min: 0, max: 10, group: "Electrics" },
    { key: "extData", label: "Data / TV points", type: "int", default: 1, min: 0, max: 10, group: "Electrics" },
    { key: "extOutside", label: "Outside lights", type: "int", default: 1, min: 0, max: 10, group: "Electrics" },
    { key: "flooring", label: "Flooring", type: "select", default: "ENGINEERED", public: true, clientChoice: true, options: flooringOptions, group: "Finishes" },
    { key: "decorate", label: "Plaster & decorate", type: "boolean", default: true, group: "Finishes" },
    { key: "paintSystem", label: "Paint type", type: "select", default: "STANDARD", options: paintSystemOptions, clientChoice: true, group: "Finishes", when: [{ key: "decorate", is: true }] },
    ...kitchenFields("Kitchen"),
  ],
  needsScaffold: v => DOUBLES.includes(str(v, "extType")),
  skips: v => (DOUBLES.includes(str(v, "extType")) ? 3 : 2),
  build(ctx, v) {
    const type = str(v, "extType");
    const w = num(v, "width"), d = num(v, "depth"), h = num(v, "wallHeight");
    const dbl = DOUBLES.includes(type), wrap = WRAPS.includes(type), sideReturn = type === "SIDE_RETURN", side = type === "SIDE" || type === "DOUBLE_SIDE";
    const sw = wrap ? num(v, "sideWidth") : 0, sl = wrap ? num(v, "sideLength") : 0;
    const uh = dbl ? num(v, "upperHeight") : 0;
    // Footprint and new external walls (the house walls are existing).
    const A = qty2(w * d + sw * sl);
    // Side extension (to a semi / detached house): width out from the house × depth along it; front, outer side and back walls are new.
    const P = qty2(sideReturn ? d + w : side ? d + 2 * w : wrap ? 2 * d + w + sl + sw : 2 * d + w);
    // Double storey part: all of it, only the rear part of a wraparound, or only the side part.
    const upper = !dbl ? { A: 0, P: 0, span: 0, width: 0 }
      : type === "WRAP_DOUBLE_REAR" ? { A: qty2(w * d), P: qty2(2 * d + w), span: d, width: w }
      : type === "WRAP_DOUBLE_SIDE" ? { A: qty2(sw * sl), P: qty2(sl + sw), span: sw, width: sl }
      : { A, P, span: side ? w : d, width: side ? d : w };
    const wallH = qty2(dbl && upper.A === A ? h + 0.3 + uh : h);
    const perimText = sideReturn ? `boundary wall ${fmt(d)} + end wall ${fmt(w)}` : side ? `${fmt(d)} along the side + 2 × ${fmt(w)} ends` : wrap ? `2 × ${fmt(d)} + ${fmt(w)} + side return ${fmt(sl)} + ${fmt(sw)}` : `2 × ${fmt(d)} + ${fmt(w)}`;
    // Roof sections: length along the house wall × span.
    const roofs: { len: number; span: number; label: string }[] = sideReturn ? [{ len: d, span: w, label: "side return" }] : side ? [{ len: d, span: w, label: "side" }]
      : wrap ? [{ len: w, span: d, label: "rear" }, { len: sl, span: sw, label: "side return" }] : [{ len: w, span: d, label: "rear" }];
    ctx.assume(`${extTypeOptions.find(([k]) => k === type)?.[1]}: footprint ${fmt(A)} m², new external walls ${fmt(P)} m${dbl ? `, two storeys over ${fmt(upper.A)} m² (${fmt(h)} + ${fmt(uh)} m)` : ""}.`);
    const fd = num(v, "foundDepth"), fw = num(v, "foundWidth");
    const found = str(v, "foundation"), trenchFill = found === "TRENCH_FILL", raft = found === "RAFT", piled = found === "PILED";

    // ---------- Groundworks & foundations ----------
    const G = "Foundations";
    const breakOut = num(v, "breakOut");
    if (breakOut) { ctx.labour(G, "break_out_concrete", breakOut, `${fmt(breakOut)} m² existing patio / concrete`); }
    // Dig: trenches (strip / trench fill), raft area with thickened edges, or ground beams over piles; plus the slab reduce level.
    const Vf = qty2(raft ? A * (num(v, "raftThickness") / 1000 + 0.15) + P * 0.3 * 0.3 : piled ? P * 0.45 * 0.6 : P * fw * fd);
    const Vdig = qty2(raft ? 0 : A * 0.3);
    const trenchText = raft ? `raft ${fmt(A)} m² × (${num(v, "raftThickness")} mm + 150 mm sub-base) + thickened edges ${fmt(P)} m × 0.3 × 0.3 = ${fmt(Vf)} m³`
      : piled ? `ground beams ${fmt(P)} m × 0.45 × 0.6 m = ${fmt(Vf)} m³` : `perimeter (${perimText} = ${fmt(P)} m) × ${fmt(fw)} m × ${fmt(fd)} m = ${fmt(Vf)} m³`;
    if (bool(v, "diggerAccess")) {
      const digDays = ctx.labour(G, "excavate_foundations", Vf, trenchText);
      const slabDigDays = Vdig ? ctx.labour(G, "excavate_slab", Vdig, `${fmt(A)} m² × 0.30 m reduce level = ${fmt(Vdig)} m³`) : 0;
      ctx.material(G, "mini_digger", Math.ceil(digDays + slabDigDays), `${fmt(digDays + slabDigDays)} digging days`);
    } else {
      ctx.labour(G, "excavate_hand", Vf, `${trenchText} – no digger access`, "Hand dig foundations");
      if (Vdig) ctx.labour(G, "excavate_hand", Vdig, `${fmt(A)} m² × 0.30 m reduce level = ${fmt(Vdig)} m³ – no digger access`, "Hand dig floor slab reduce level");
      ctx.assume("No digger access: foundations and slab dug by hand.");
    }
    const underpin = num(v, "underpin");
    const Vu = qty2(underpin * 0.6 * 1.2);
    const loose = qty2((Vf + Vdig + Vu + breakOut * 0.15) * 1.3);
    const byGrab = str(v, "spoilRemoval") === "GRAB";
    const loads = Math.ceil(loose / (byGrab ? 8 : 4.5) - 1e-9);
    if (byGrab) ctx.material(G, "muck_away", loads, `(${fmt(Vf)} + ${fmt(Vdig)}${Vu ? ` + underpinning ${fmt(Vu)}` : ""}${breakOut ? ` + break-out ${fmt(breakOut * 0.15)}` : ""} m³) × 1.3 bulking = ${fmt(loose)} m³ ÷ 8 m³ per load`);
    else ctx.material(G, "skip_8yd", loads, `(${fmt(Vf)} + ${fmt(Vdig)} m³ …) × 1.3 bulking = ${fmt(loose)} m³ ÷ 4.5 m³ of soil per skip`, "Skips for spoil (8 yd)");
    const throughHouse = ctx.input.property.access !== "EASY";
    ctx.labour(G, "load_spoil", qty2(loose * (throughHouse ? 1.5 : 1)), `${fmt(loose)} m³ loose spoil${throughHouse ? " × 1.5 (restricted access / through the house)" : ""}`);
    if (throughHouse) ctx.assume("Restricted access: spoil and materials barrowed through the property; allowance increased by 50%.");
    let foundText: string;
    if (raft) {
      const t = num(v, "raftThickness") / 1000, Vr = qty2(A * t + P * 0.3 * 0.3);
      ctx.material(G, "hardcore_mot", r1(A * 0.15 * 2), `${fmt(A)} m² × 150 mm × 2 t/m³`);
      ctx.material(G, "dpm", Math.ceil(A * 1.15), `${fmt(A)} m² + 15%`);
      ctx.material(G, "rebar_mesh", Math.ceil(A * 2 / 11.52 * 1.1), `top & bottom mesh: 2 × ${fmt(A)} m² ÷ 11.52 m² + 10% laps`);
      ctx.material(G, "rebar_cage", Math.ceil(P), `thickened edge ${fmt(P)} m`);
      ctx.material(G, "concrete_c25", r1(Vr * 1.05), `${fmt(A)} m² × ${fmt(t)} m + edges = ${fmt(Vr)} m³ + 5%`, "Concrete C30 – raft");
      ctx.labour(G, "raft_slab", A, `${fmt(A)} m²`);
      foundText = `reinforced ${num(v, "raftThickness")} mm raft slab with thickened edges (${fmt(A)} m²)`;
      ctx.assume("Raft foundation to the structural engineer's design; doubles as the ground floor slab.");
    } else if (piled) {
      const piles = Math.ceil(P / num(v, "pileCentres") - 1e-9) + 2;
      ctx.labour(G, "pile_mini", piles, `⌈${fmt(P)} m ÷ ${fmt(num(v, "pileCentres"))} m⌉ + 2 corners = ${piles} piles`);
      ctx.material(G, "pile_rig", 1, "rig delivery, set-up & test");
      const Vb = qty2(P * 0.45 * 0.6);
      ctx.material(G, "rebar_cage", Math.ceil(P), `${fmt(P)} m of ground beam`);
      ctx.material(G, "concrete_c25", r1(Vb * 1.05), `${fmt(P)} m × 0.45 × 0.6 m = ${fmt(Vb)} m³ + 5%`, "Concrete C30 – ground beams");
      ctx.labour(G, "ground_beam", P, `${fmt(P)} m`);
      foundText = `${piles} mini piles with reinforced ground beams`;
      ctx.assume("Piles are priced as an allowance for 8–12 m deep mini piles; the specialist confirms depth after a site investigation.");
    } else {
      const concreteDepth = trenchFill ? fd - 0.2 : 0.225;
      const Vc = qty2(P * fw * concreteDepth);
      ctx.material(G, "concrete_c25", r1(Vc * 1.05), `${fmt(P)} m × ${fmt(fw)} m × ${fmt(concreteDepth)} m = ${fmt(Vc)} m³ + 5%`, `Concrete C25 – ${trenchFill ? "trench fill" : "strip footing"}`);
      if (Vc < 6) ctx.material(G, "concrete_part_load", 1, `${fmt(Vc)} m³ < 6 m³ full load`);
      ctx.labour(G, "pour_concrete", Vc);
      foundText = `${fmt(fd)} m deep ${trenchFill ? "trench fill" : "strip footing"} foundations (${fmt(Vc)} m³ of concrete)`;
    }
    // Masonry from the foundation to DPC: inner leaf in dense block; outer leaf in engineering bricks or dense block.
    const belowH = raft || piled ? 0.3 : trenchFill ? 0.35 : fd - 0.225 + 0.15;
    const leafArea = qty2(P * belowH);
    const eng = str(v, "belowDpc") === "ENGINEERING" && !str(v, "walls").startsWith("CLAD");
    ctx.material(G, "dense_block", Math.ceil(leafArea * (eng ? 1 : 2) * 10 * 1.05), `${eng ? "inner leaf" : "2 leaves"} × ${fmt(P)} m × ${fmt(belowH)} m to DPC × 10 blocks + 5%`, "Dense blocks below DPC");
    if (eng) ctx.material(G, "engineering_brick", Math.ceil(leafArea * 60 * 1.05), `outer leaf ${fmt(P)} m × ${fmt(belowH)} m × 60 + 5%`);
    const belowArea = qty2(leafArea * 2);
    ctx.material(G, "mortar_cement", Math.ceil(belowArea * 0.015 * 12), `${fmt(belowArea)} m² × 0.015 m³ mortar × 12 bags/m³`);
    ctx.material(G, "mortar_sand", r1(belowArea * 0.015 * 1.6), `${fmt(belowArea * 0.015)} m³ × 1.6 t/m³`);
    ctx.labour(G, "blockwork", eng ? leafArea : belowArea, "below ground");
    if (eng) ctx.labour(G, "facing_brickwork", leafArea, "engineering bricks below DPC");
    ctx.material(G, "dpc", Math.ceil(P * 2), `${fmt(P)} m × 2 leaves`);
    if (underpin) {
      ctx.labour(G, "underpin", underpin, `${fmt(underpin)} m in 1 m bays`);
      ctx.material(G, "concrete_c25", r1(Vu * 1.05), `${fmt(underpin)} m × 0.6 × 1.2 m = ${fmt(Vu)} m³ + 5%`, "Concrete – underpinning");
      ctx.assume("Underpinning in hit-and-miss 1 m bays to the engineer's design; party wall notice where it is the neighbour's wall.");
    }
    const cols = num(v, "columns");
    if (cols) {
      const ps = num(v, "padSize"), Vp = qty2(cols * ps ** 3);
      ctx.labour(G, "pad_foundation", cols, `${cols} pad${cols > 1 ? "s" : ""} ${fmt(ps)} m cube`);
      ctx.material(G, "concrete_c25", r1(Vp * 1.05), `${cols} × ${fmt(ps)}³ = ${fmt(Vp)} m³ + 5%`, "Concrete – column pads");
    }
    ctx.scope(`${breakOut ? `Break out ${fmt(breakOut)} m² of existing patio / concrete. ` : ""}Excavate${bool(v, "diggerAccess") ? "" : " by hand"} and remove spoil (${loads} ${byGrab ? "grab loads" : "skips"}); ${foundText}${cols ? `, ${cols} column pad${cols > 1 ? "s" : ""}` : ""}${underpin ? `, underpin ${fmt(underpin)} m of the existing wall` : ""}; ${eng ? "engineering bricks and " : ""}blockwork to DPC with damp-proof course.`);

    const Dr = "Drainage";
    const run = num(v, "drainRun");
    if (run > 0) {
      ctx.material(Dr, "drain_pipe", run, `${fmt(run)} m`);
      ctx.material(Dr, "inspection_chamber", num(v, "chambers"), `${num(v, "chambers")} chambers`);
      ctx.material(Dr, "gully", num(v, "gullies"), `${num(v, "gullies")} gullies`);
      ctx.labour(Dr, "drainage", run, `${fmt(run)} m`);
      ctx.scope(`Divert / extend drainage: ${fmt(run)} m of 110 mm pipe, ${num(v, "chambers")} inspection chamber${num(v, "chambers") === 1 ? "" : "s"}, ${num(v, "gullies")} gull${num(v, "gullies") === 1 ? "y" : "ies"}.`);
    }
    const mh = num(v, "moveManhole");
    if (mh) { ctx.material(Dr, "inspection_chamber", mh, `${mh} rebuilt chamber${mh > 1 ? "s" : ""}`); ctx.labour(Dr, "manhole_move", mh, `${mh} manhole${mh > 1 ? "s" : ""}`); ctx.scope(`Move / rebuild ${mh} manhole${mh > 1 ? "s" : ""} outside the new footprint and reconnect the drains.`); }
    if (bool(v, "buildOver")) { ctx.material(Dr, "build_over", 1, "water company application & CCTV survey"); ctx.assume("Building over or within 3 m of a public sewer needs the water company's build-over agreement (CCTV survey before and after)."); }

    const Sl = "Floor slab";
    const floorType = raft ? "RAFT" : str(v, "floorType"), screedType = str(v, "screedType");
    const houseFloor = num(v, "houseFloor");
    const ufh = bool(v, "ufh"), wetUfh = ufh && str(v, "ufhType") === "WET";
    const groundFloor = (area: number, what: string) => {
      if (area <= 0) return "";
      const a2 = qty2(area);
      if (floorType === "BEAM_BLOCK") {
        ctx.material(Sl, "beam_block", Math.ceil(a2 * 1.05), `${what} ${fmt(a2)} m² + 5%`);
        ctx.material(Sl, "air_brick", Math.max(2, Math.ceil(P / 1.5)), "ventilated void: 1 per 1.5 m of wall");
        ctx.material(Sl, "dpm", Math.ceil(a2 * 1.15), `${fmt(a2)} m² + 15%`);
        ctx.material(Sl, "pir_100", Math.ceil(a2 / 2.88 - 1e-9), `${fmt(a2)} m² ÷ 2.88`, "PIR 100 mm on the beam & block");
        ctx.labour(Sl, "beam_block_lay", a2, `${what} ${fmt(a2)} m²`);
      } else if (floorType === "TIMBER") {
        const t = timberSizes[joistForSpan(Math.min(4, Math.max(w, d) / 2))];
        const joists = Math.ceil(Math.sqrt(a2) / 0.4 - 1e-9) + 1;
        ctx.material(Sl, t.key, qty2(joists * Math.sqrt(a2) * 1.05), `${joists} joists × ${fmt(Math.sqrt(a2))} m + 5%`, `Ground floor joists – ${t.label}`);
        ctx.labour(Sl, "sleeper_wall", qty2(Math.sqrt(a2) * 2), "2 sleeper walls");
        ctx.material(Sl, "air_brick", Math.max(2, Math.ceil(P / 1.5)), "ventilated void");
        ctx.material(Sl, "pir_100", Math.ceil(a2 / 2.88 - 1e-9), `${fmt(a2)} m² ÷ 2.88`, "PIR 100 mm between joists");
        ctx.material(Sl, "floorboard_18", Math.ceil(a2 / 0.72 - 1e-9) + 1, `⌈${fmt(a2)} m² ÷ 0.72⌉ + 1`);
        ctx.labour(Sl, "floor_joists_new", a2, `${what} ${fmt(a2)} m²`);
        return "suspended timber floor on sleeper walls with insulation and 18 mm boards";
      } else if (floorType !== "RAFT") {
        ctx.material(Sl, "hardcore_mot", r1(a2 * 0.15 * 2.0), `${fmt(a2)} m² × 150 mm × 2.0 t/m³`);
        ctx.material(Sl, "sand_blinding", r1(a2 * 0.025 * 1.6), `${fmt(a2)} m² × 25 mm × 1.6 t/m³`);
        ctx.material(Sl, "dpm", Math.ceil(a2 * 1.15), `${fmt(a2)} m² + 15% laps & upstands`);
        ctx.material(Sl, "pir_100", Math.ceil(a2 / 2.88 - 1e-9), `${fmt(a2)} m² ÷ 2.88`, "PIR 100 mm floor insulation");
        const Vs = qty2(a2 * 0.1);
        ctx.material(Sl, "concrete_c25", r1(Vs * 1.05), `${fmt(a2)} m² × 100 mm = ${fmt(Vs)} m³ + 5%`, `Concrete C25 – ${what} slab`);
        if (Vs < 6) ctx.material(Sl, "concrete_part_load", 1, `${fmt(Vs)} m³ < 6 m³ full load`);
        ctx.labour(Sl, "floor_slab", a2, `${what} ${fmt(a2)} m²`);
      } else {
        ctx.material(Sl, "pir_100", Math.ceil(a2 / 2.88 - 1e-9), `${fmt(a2)} m² ÷ 2.88`, "PIR 100 mm on the raft");
      }
      if (screedType === "LIQUID") { ctx.material(Sl, "screed_liquid", Math.ceil(a2), `${fmt(a2)} m²`); ctx.labour(Sl, "screed_liquid_pour", a2, `${what} ${fmt(a2)} m²`); }
      else if (screedType !== "NONE") { ctx.material(Sl, "screed_mix", Math.ceil(a2), `${fmt(a2)} m²`); ctx.labour(Sl, "screed", a2, `${what} ${fmt(a2)} m²`); }
      return `${floorType === "BEAM_BLOCK" ? "beam & block floor with a ventilated void, DPM and 100 mm PIR" : floorType === "RAFT" ? "100 mm PIR on the raft" : "ground bearing floor: 150 mm hardcore, blinding, DPM, 100 mm PIR and 100 mm concrete"}${screedType === "NONE" ? "" : `, ${screedType === "LIQUID" ? "50 mm liquid screed" : "65 mm screed"}`}`;
    };
    if (floorType !== "TIMBER" && floorType !== "RAFT") ctx.material(Sl, "edge_insulation", Math.ceil(P + w), `perimeter ${fmt(P + w)} m`);
    const floorText = groundFloor(A, "extension");
    if (houseFloor) {
      ctx.labour(Sl, "break_out_concrete", houseFloor, `existing floor in the house ${fmt(houseFloor)} m²`, "Take up existing floor in the house");
      groundFloor(houseFloor, "house floor");
    }
    ctx.scope(`Floor (${fmt(A)} m²): ${floorText}${houseFloor ? `; take up ${fmt(houseFloor)} m² of the existing floor in the house and relay to the same level` : ""}.`);

    // ---------- Superstructure ----------
    const Su = "Walls";
    const doors = str(v, "doors"), dw = doors === "NONE" ? 0 : num(v, "doorWidth"), windows = num(v, "windows");
    const openingsArea = dw * 2.1 + windows * 1.44;
    const upperWindows = dbl ? num(v, "upperWindows") : 0;
    const allOpenings = openingsArea + upperWindows * 1.44;
    // Wall area: ground floor all round, plus the first floor over the double storey part.
    const gross = qty2(dbl && upper.A !== A ? P * h + upper.P * (0.3 + uh) : P * wallH), net = qty2(Math.max(0, gross - allOpenings));
    const wallType = str(v, "walls"), brick = wallType === "BRICK_BLOCK", clad = wallType.startsWith("CLAD");
    const brickKey = str(v, "brick") || "facing_brick";
    if (brick) {
      ctx.material(Su, brickKey, Math.ceil(net * 60 * 1.05), `${fmt(net)} m² (walls ${fmt(gross)} − openings ${fmt(allOpenings)}) × 60 bricks + 5%`);
      ctx.labour(Su, "facing_brickwork", net, "outer leaf");
    } else if (clad) {
      ctx.material(Su, "dense_block", Math.ceil(net * 10 * 1.05), `${fmt(net)} m² × 10 blocks + 5%`, "Dense blocks – outer leaf");
      ctx.labour(Su, "blockwork", net, "outer leaf");
      cladNewWall(ctx, Su, net, wallType === "CLAD_COMPOSITE" ? "COMPOSITE" : "TIMBER", "extension walls");
    } else {
      ctx.material(Su, "dense_block", Math.ceil(net * 10 * 1.05), `${fmt(net)} m² × 10 blocks + 5%`, "Dense blocks – outer leaf");
      ctx.labour(Su, "blockwork", net, "outer leaf");
      // Beads: reveals ≈ 5 m per opening, 2 corners full height, base stop bead along the walls.
      renderNewWall(ctx, Su, net, str(v, "renderSystem"), "extension walls", qty2((windows + upperWindows + (dw > 0 ? 1 : 0)) * 5 + 2 * wallH + P));
    }
    ctx.material(Su, "thermal_block", Math.ceil(net * 10 * 1.05), `${fmt(net)} m² × 10 blocks + 5%`, "Thermal blocks – inner leaf");
    ctx.labour(Su, "blockwork", net, "inner leaf");
    const mortar = net * (brick ? 0.03 : 0.01) + net * 0.01;
    ctx.material(Su, "mortar_cement", Math.ceil(mortar * 12), `${fmt(mortar)} m³ mortar × 12 bags/m³`);
    ctx.material(Su, "mortar_sand", r1(mortar * 1.6), `${fmt(mortar)} m³ × 1.6 t/m³`);
    ctx.material(Su, "wall_ties", Math.ceil(net * 2.5 + 10), `${fmt(net)} m² × 2.5 ties + reveals`);
    ctx.material(Su, "cavity_insulation", Math.ceil(net), `${fmt(net)} m²`);
    const closers = qty2((dw ? dw + 2 * 2.1 : 0) + windows * 4 * 1.2);
    ctx.material(Su, "cavity_closer", Math.ceil(closers), `door ${fmt(dw)} + 2 × 2.1 m, ${windows} windows × 4.8 m`);
    if (windows + upperWindows) ctx.material(Su, "lintel", qty2((windows + upperWindows) * 1.5), `${windows + upperWindows} windows × 1.5 m`, "Steel lintels – windows");
    if (dw) {
      if (dw > 2.4 && bool(v, "customSteels")) ctx.material(Su, "padstone", 0, "");
      else if (dw > 2.4) {
        const b = beamSizes[beamForSpan(dw)];
        ctx.material(Su, b.key, qty2(dw + 0.3), `${fmt(dw)} m opening + 0.3 m bearings`, `Steel over rear doors – ${b.label}`);
        ctx.material(Su, "padstone", 2, "2 bearings");
      } else ctx.material(Su, "lintel", qty2(dw + 0.3), `${fmt(dw)} m + 0.3 m`, "Steel lintel – rear doors");
    }
    ctx.material(Su, "wall_starter", 4, "2 junctions × 2 leaves");
    ctx.material(Su, "weep_vent", Math.ceil(P / 0.9) + 2 * (windows + (dw ? 1 : 0)), `⌈${fmt(P)} m ÷ 0.9⌉ + 2 per opening`);
    const trays = num(v, "cavityTrays");
    if (trays) { ctx.material(Su, "cavity_tray", Math.ceil(trays), `${fmt(trays)} m`); ctx.labour(Su, "cavity_tray_fit", trays, `${fmt(trays)} m`); }
    ctx.scope(`Build ${fmt(net)} m² of cavity wall: ${brick ? `${ctx.rates.materials[brickKey]?.name.replace("Facing brick – ", "").toLowerCase() ?? "facing"} facing brick` : clad ? `blockwork with ${wallType === "CLAD_COMPOSITE" ? "composite" : "timber"} cladding` : "rendered blockwork"} outer leaf, 100 mm insulated cavity, thermal block inner leaf, with lintels, cavity closers and ties${trays ? `; ${fmt(trays)} m of cavity trays cut into the house wall` : ""}.`);

    // ---------- Roof ----------
    const R = "Roof";
    const roof = str(v, "roof");
    let ceilingArea = 0;
    for (const sec of roofs) ceilingArea += roofSection(ctx, R, roof, sec.len, sec.span, roofs.length > 1 ? sec.label : "");
    ceilingArea = qty2(ceilingArea);
    const edge = qty2(roofs.reduce((s, r) => s + r.len + 0.3, 0));
    fasciaSoffit(ctx, R, { length: edge, fascia: str(v, "fasciaWidth"), soffit: str(v, "soffitWidth"), colour: str(v, "rooflineColour"), corners: 2, eaves: roof === "PITCHED_TILE", label: "front edge" });
    rainwater(ctx, R, { length: edge, downpipes: num(v, "downpipes"), height: num(v, "downpipeHeight"), angles90: num(v, "angles90"), angles135: num(v, "angles135"),
      stopEnds: num(v, "stopEnds"), profile: str(v, "gutterProfile"), pipe: str(v, "pipe") as "ROUND" | "SQUARE", label: "front edge" });
    const lightKeys = Array.from({ length: num(v, "rooflightCount") }, (_, i) => str(v, `rooflight${i + 1}`));
    const lights = lightKeys.length, lantern = lightKeys.some(k => k.startsWith("lantern") || k === "CUSTOM_LANTERN");
    for (const [i, k] of lightKeys.entries()) {
      const custom = k === "CUSTOM_FLAT" || k === "CUSTOM_LANTERN", tbc = k === "TBC";
      const [a, b] = (k.match(/(\d+)(?:x(\d+))?$/) ?? []).slice(1).map(Number);
      const wid = custom ? num(v, `rooflight${i + 1}W`) : tbc ? 1 : (a || 1000) / 1000, len = custom ? num(v, `rooflight${i + 1}L`) : tbc ? 2 : (b || a || 1000) / 1000;
      if (custom) {
        const key = k === "CUSTOM_LANTERN" ? "lantern_custom" : "rooflight_custom", ar = qty2(Math.max(1, wid * len));
        ctx.material(R, key, ar, `${fmt(wid)} × ${fmt(len)} m = ${fmt(wid * len)} m²${wid * len < 1 ? " (1 m² minimum)" : ""}`, `${ctx.rates.materials[key].name} – rooflight ${i + 1} (${fmt(wid)} × ${fmt(len)} m)`);
      } else if (tbc) {
        ctx.material(R, "rooflight_1000x2000", 1, "allowance until the size is confirmed", `Rooflight ${i + 1} – size to be confirmed (priced as 1000 × 2000)`);
        ctx.assume(`Rooflight ${i + 1} is priced as a 1000 × 2000 mm allowance until you confirm the size; the price is adjusted to the size chosen.`);
      } else ctx.material(R, k, 1, `rooflight ${i + 1}`, `${ctx.rates.materials[k].name} – rooflight ${i + 1}`);
      ctx.material(R, "timber_47x175", qty2(2 * (wid + len) + 1), `trimmers: perimeter 2 × (${fmt(wid)} + ${fmt(len)}) m + 1 m`, `Rooflight ${i + 1} trimmers`);
      ctx.material(R, "upstand_kerb", 1, `rooflight ${i + 1}`);
    }
    if (lights) ctx.labour(R, "rooflight_fit", lights, `${lights} rooflight${lights > 1 ? "s" : ""}`);

    // ---------- Openings ----------
    const O = "Windows & doors";
    if (dw) {
      const key = doors === "BIFOLD" ? "bifold_alu" : doors === "SLIDING" ? "sliding_alu" : "french_upvc";
      ctx.material(O, key, dw, `${fmt(dw)} m opening`);
      ctx.labour(O, "door_set_fit", 1);
    }
    fitWindows(ctx, O, windows + upperWindows, "window_upvc", `windows (${windows} ground${upperWindows ? ` + ${upperWindows} first floor` : ""})`);
    ctx.scope(`Supply and fit ${dw ? `${fmt(dw)} m ${doors === "BIFOLD" ? "aluminium bi-fold" : doors === "SLIDING" ? "aluminium sliding" : "uPVC French"} doors` : "no rear doors"}${windows ? `, ${windows} window${windows > 1 ? "s" : ""}` : ""}${lights ? `, ${lights} rooflight${lights > 1 ? "s" : ""}${lantern ? " / lantern" : ""} (${lightKeys.map((k, i) => k === "TBC" ? "size to be confirmed" : k.startsWith("CUSTOM") ? `${fmt(num(v, `rooflight${i + 1}W`))} × ${fmt(num(v, `rooflight${i + 1}L`))} m ${k === "CUSTOM_LANTERN" ? "lantern" : "made to size"}` : ctx.rates.materials[k].name.replace(/^(Flat rooflight|Aluminium roof lantern) /, "")).join(", ")})` : ""}.`);

    // ---------- Knock-through ----------
    const K = "Structural opening";
    if (bool(v, "customSteels")) {
      const n = num(v, "steelCount");
      let metres = 0;
      for (let i = 1; i <= n; i++) {
        const b = beamSizes[str(v, `steel${i}Size`) as keyof typeof beamSizes], len = num(v, `steel${i}Length`);
        metres += len;
        ctx.material(K, b.key, qty2(len), `${fmt(len)} m as specified`, `Steel ${i} – ${b.label}`);
      }
      ctx.material(K, "padstone", n * 2, `${n} steels × 2 bearings`);
      ctx.material(K, "beam_transport", n, `${n} steels × £100`);
      ctx.material(K, "intumescent", qty2(metres), `${fmt(metres)} m total`, "Fire protection to steel");
    }
    if (bool(v, "knockThrough")) {
      const ow = num(v, "openingWidth");
      if (!bool(v, "customSteels")) {
        const b = beamSizes[beamForSpan(ow)];
        ctx.material(K, b.key, qty2(ow + 0.3), `${fmt(ow)} m opening + 2 × 150 mm bearings`, `Steel beam into house – ${b.label}`);
        ctx.material(K, "padstone", 2, "2 bearings");
        ctx.material(K, "intumescent", qty2(ow + 0.3), `${fmt(ow + 0.3)} m`, "Fire protection to steel");
      }
      ctx.material(K, "cement_bag", 2, "dry pack & make good");
      ctx.material(K, "sand_bag", 3, "dry pack & make good");
      ctx.material(K, "props_hire", 2, "2 weeks temporary support");
      ctx.labour(K, "knock_through", ow, `${fmt(ow)} m opening`);
      ctx.scope(`Form ${fmt(ow)} m structural opening in the rear wall on temporary supports, install steel on padstones, fire protect and make good.`);
      ctx.assume("Steel sizes are indicative unless specified; final sizes from the structural engineer.");
    }

    // ---------- First floor (double storey) ----------
    if (dbl) {
      const FF = "First floor";
      const span = upper.span, size = joistForSpan(span), t = timberSizes[size], UA = upper.A;
      const joists = Math.ceil(upper.width / 0.4 - 1e-9) + 1;
      ctx.material(FF, t.key, qty2(joists * (span + 0.1)), `${joists} joists (⌈${fmt(upper.width)} ÷ 0.4⌉ + 1) × ${fmt(span + 0.1)} m – ${size} for a ${fmt(span)} m span`, `First floor joists – ${t.label}`);
      ctx.material(FF, "joist_hanger", joists * 2, `${joists} joists × 2`);
      ctx.material(FF, "floorboard_18", Math.ceil(UA / 0.72 - 1e-9) + 2, `⌈${fmt(UA)} m² ÷ 0.72⌉ + 2`);
      ctx.material(FF, "acoustic_wool", Math.ceil(UA), `${fmt(UA)} m²`, "Acoustic wool between first floor joists");
      ctx.labour(FF, "floor_joists_new", UA, `${fmt(UA)} m²`);
      if (bool(v, "upperOpening")) {
        const ow = num(v, "upperOpeningWidth"), b = beamSizes[beamForSpan(ow)];
        ctx.material(FF, b.key, qty2(ow + 0.3), `${fmt(ow)} m + 0.3 m bearings`, `Steel / lintel – first floor opening – ${b.label}`);
        ctx.material(FF, "padstone", 2, "2 bearings");
        ctx.labour(FF, "knock_through", ow, `${fmt(ow)} m first floor opening`);
      }
      ctx.scope(`Double storey${UA !== A ? ` over ${fmt(UA)} m²` : ""}: first floor of ${t.label} joists, 18 mm boarding and acoustic insulation (${fmt(UA)} m²), ${upperWindows} first floor window${upperWindows === 1 ? "" : "s"}${bool(v, "upperOpening") ? `, ${fmt(num(v, "upperOpeningWidth"))} m opening into the house` : ""}.`);
      ctx.assume("Double storey: planning permission and party wall agreements to be in place; foundations sized for two storeys by the engineer.");
    }

    // ---------- Services & finishes ----------
    const F = "First fix";
    const elec: ElecSpec = {
      downlights: num(v, "extSpots") || Math.ceil(A / 2.5), sockets: num(v, "extSockets") || Math.max(4, Math.ceil(A / 5)), pendants: num(v, "extPendants"),
      switches: num(v, "extSwitches"), spurs: num(v, "extSpurs"), data: num(v, "extData"), tv: num(v, "extData") ? 1 : 0, outside: num(v, "extOutside"),
    };
    electricsItems(ctx, F, elec, { label: "extension ground floor" });
    const rooms = dbl ? num(v, "upperRooms") : 0;
    const upperElec: ElecSpec = { pendants: rooms, switches: rooms + 1, sockets: rooms * 4, data: rooms, tv: rooms };
    if (dbl) electricsItems(ctx, F, upperElec, { label: "extension first floor" });
    if (ufh && wetUfh) {
      const ha = qty2((A + houseFloor) * 0.85);
      ctx.material(F, "ufh_wet_kit", Math.ceil(ha), `${fmt(A + houseFloor)} m² × 85% heated`);
      ctx.material(F, "ufh_manifold", 1, "1 manifold");
      ctx.labour(F, "ufh_wet_fit", ha, `${fmt(ha)} m²`);
      ctx.labour(F, "ufh_manifold_fit", 1, "manifold, pump & thermostats");
      ctx.labour(F, "heating_extend", 1, "Connect UFH to the heating system");
      if (screedType === "SAND_CEMENT" || screedType === "NONE") ctx.assume("Wet underfloor heating works best in a liquid screed; with sand & cement allow longer drying before floor finishes.");
    } else if (ufh) {
      ctx.material(F, "ufh_mat", Math.ceil(A * 0.85), `${fmt(A)} m² × 85% heated`);
      ctx.labour(F, "ufh_fit", A * 0.85);
    } else { ctx.labour(F, "heating_extend", 1, "Extend heating"); radiators(ctx, F, num(v, "radiators")); }
    if (dbl) radiators(ctx, F, num(v, "upperRadiators"));

    const skirtLen = Math.max(0, P + w - dw - (bool(v, "knockThrough") ? num(v, "openingWidth") : 0));
    if (bool(v, "decorate")) {
      const groundWalls = qty2(Math.max(0, P * h - openingsArea));
      const upperWalls = dbl ? qty2(Math.max(0, upper.P * uh - upperWindows * 1.44)) : 0;
      const ceilings = qty2(ceilingArea + (dbl ? upper.A : 0));
      boardAndSkim(ctx, "Plastering", ceilings, dbl ? "ground floor & first floor ceilings" : "ceiling");
      boardAndSkim(ctx, "Plastering", groundWalls + upperWalls, "walls", { fixing: "dab" });
      paint(ctx, "Decoration", { label: "extension", ceilings, walls: groundWalls + upperWalls, newPlaster: ceilings + groundWalls + upperWalls,
        skirting: skirtLen * (dbl ? 2 : 1), windows: windows + upperWindows, radiators: (bool(v, "ufh") ? 0 : num(v, "radiators")) + (dbl ? num(v, "upperRadiators") : 0), system: str(v, "paintSystem"), newWood: true });
    }
    skirting(ctx, "Second fix", skirtLen * (dbl ? 2 : 1));
    const kitchenFloor = bool(v, "kitchen") ? qty2((num(v, "kBaseRun") + num(v, "kIsland")) * 0.6) : 0;
    flooring(ctx, "Second fix", qty2(A + houseFloor + upper.A - kitchenFloor), str(v, "flooring"), { perimeter: skirtLen * (dbl ? 2 : 1), doors: dbl ? 1 + rooms : 1 });
    ctx.scope(`Electrics (${elecSummary(elec)}${dbl ? `; first floor ${elecSummary(upperElec)}` : ""}), ${bool(v, "ufh") ? "underfloor heating" : `${num(v, "radiators")} radiator${num(v, "radiators") === 1 ? "" : "s"}`}, plasterboard and skim, ${flooringOptions.find(([k]) => k === str(v, "flooring"))?.[1].toLowerCase()} flooring (${fmt(A + houseFloor + upper.A - kitchenFloor)} m²) and decoration.`);
    // Kitchen in the extension: units, worktops, plumbing, hob circuit, sockets, spurs, extract and boiler move (flooring & decoration are the extension's).
    if (bool(v, "kitchen")) {
      buildKitchen(ctx, x => x === "Kitchen fit-out" ? "Kitchen fit-out" : x, { length: Math.max(w, d), width: Math.min(w, d), height: h, baseRun: num(v, "kBaseRun"), wallRun: num(v, "kWallRun"), tallUnits: num(v, "kTall"),
        island: num(v, "kIsland"), grade: str(v, "kGrade") || "MID", worktop: str(v, "kWorktop") || "LAMINATE", appliances: num(v, "kAppliances"), splashback: true, points: 0, flooring: "NONE", strip: false, decorate: false,
        hood: bool(v, "kHood"), hoodType: str(v, "kHoodType") as "WALL", supplyRun: num(v, "kSinkRun"), wasteRun: num(v, "kSinkRun"), fitBy: (str(v, "kFitBy") || "WE_FIT") as "US",
        hob: bool(v, "kHob"), sockets: num(v, "kSockets"), spurs: num(v, "kSpurs"), boilerMove: bool(v, "kBoilerMove"), boilerRun: num(v, "kBoilerRun") }, "Extension kitchen");
    }
    ctx.assume(`Extension ${fmt(A)} m², walls ${fmt(wallH)} m high. Foundations ${fmt(fd)} m deep in normal ground; clay, trees, drains under the footprint or poor ground may need deeper or piled foundations.`);
  },
};

/** One roof section: `w` along the house wall, `d` span. Returns the ceiling area under it. */
function roofSection(ctx: Ctx, R: string, roof: string, w: number, d: number, label: string): number {
  const L = label ? ` – ${label}` : "";
  let ceilingArea = qty2(w * d);
    if (roof === "PITCHED_TILE") {
      const rafterLen = (d + 0.3) / Math.cos(PITCH * Math.PI / 180);
      const rafters = Math.ceil(w / 0.4 - 1e-9) + 1;
      const Ar = qty2((w + 0.3) * rafterLen);
      ctx.material(R, "timber_47x150", qty2(rafters * rafterLen), `${rafters} rafters (⌈${fmt(w)} ÷ 0.4⌉ + 1) × ${fmt(rafterLen)} m (${PITCH}° pitch)`, `Rafters${L} – C24 47 × 150`);
      ctx.material(R, "wall_plate", qty2(2 * w), "house ledger + front wall plate");
      ctx.material(R, "resin_anchors", Math.ceil(w / 0.6), `ledger fixings at 600 centres`);
      ctx.material(R, "breather_membrane", Math.ceil(Ar * 1.15), `${fmt(Ar)} m² + 15%`);
      ctx.material(R, "batten_25x50", Math.ceil(Ar * 3), `${fmt(Ar)} m² × 3 m/m² at 340 gauge`);
      ctx.material(R, "tile_concrete", Math.ceil(Ar * 10 * 1.05), `${fmt(Ar)} m² × 10 tiles + 5%`);
      ctx.material(R, "dry_ridge", qty2(2 * rafterLen), "2 verges");
      ctx.material(R, "lead_flashing", qty2(w + 0.3), "abutment to house");
      ctx.material(R, "pir_100", Math.ceil(Ar / 2.88 - 1e-9), `${fmt(Ar)} m² ÷ 2.88`, "PIR 100 mm between rafters");
      ctx.material(R, "pir_50", Math.ceil(Ar / 2.88 - 1e-9), `${fmt(Ar)} m² ÷ 2.88`, "PIR 50 mm under rafters");
      ctx.labour(R, "pitched_roof_structure", Ar);
      ctx.labour(R, "roof_tiling_concrete", Ar);
      ctx.labour(R, "insulation_fit", Ar * 2);
      ceilingArea = Ar;
      ctx.scope(`${label ? `${label[0].toUpperCase()}${label.slice(1)}: p` : "P"}itched lean-to roof at ${PITCH}°: ${rafters} rafters, breathable membrane, battens, concrete interlocking tiles, lead abutment flashing, 150 mm PIR insulation (${fmt(Ar)} m²).`);
    } else {
      const Ar = qty2((w + 0.3) * (d + 0.3));
      const joists = Math.ceil(w / 0.4 - 1e-9) + 1;
      const size = joistForSpan(d);
      const t = timberSizes[size];
      ctx.material(R, t.key, qty2(joists * (d + 0.3)), `${joists} joists (⌈${fmt(w)} ÷ 0.4⌉ + 1) × (${fmt(d)} m span + 0.3 m) – ${size} for a ${fmt(d)} m span`, `Flat roof joists${L} – ${t.label}`);
      ctx.material(R, "wall_plate", qty2(2 * w), "house ledger + front wall plate");
      ctx.material(R, "resin_anchors", Math.ceil(w / 0.6), "ledger fixings at 600 centres");
      ctx.material(R, "joist_hanger", joists, `${joists} joists at the ledger`);
      ctx.material(R, "firring", qty2(joists * (d + 0.3)), `${joists} firrings × ${fmt(d + 0.3)} m`);
      const sheets = Math.ceil(Ar / 2.88 - 1e-9);
      ctx.material(R, "osb_18", sheets * 2, `deck + top layer: 2 × ⌈${fmt(Ar)} m² ÷ 2.88⌉`);
      ctx.material(R, "pir_150", sheets, `⌈${fmt(Ar)} m² ÷ 2.88⌉`, "PIR 150 mm warm deck");
      ctx.material(R, "vcl", Math.ceil(Ar), `${fmt(Ar)} m²`);
      const felt = roof === "FLAT_FELT", epdm = roof === "FLAT_EPDM";
      ctx.material(R, felt ? "felt_system" : epdm ? "epdm_system" : "grp_system", Math.ceil(Ar * 1.1), `${fmt(Ar)} m² + 10% upstands`);
      ctx.material(R, "roof_trims", qty2(2 * (d + 0.3) + w + 0.3), "3 edges");
      ctx.material(R, "lead_flashing", qty2(w + 0.3), "cover flashing to house wall");
      ctx.labour(R, "flat_roof_structure", Ar);
      ctx.labour(R, felt ? "felt_roof" : epdm ? "epdm_roof" : "grp_roof", Ar);
      ctx.scope(`${label ? `${label[0].toUpperCase()}${label.slice(1)}: w` : "W"}arm flat roof: ${joists} no. ${t.label} joists, firrings, 18 mm OSB deck, VCL, 150 mm PIR, 18 mm OSB and ${felt ? "torch-on felt" : epdm ? "EPDM rubber" : "GRP fibreglass"} finish (${fmt(Ar)} m²).`);
    }
  return ceilingArea;
}
