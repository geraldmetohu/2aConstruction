import type { Ctx } from "../engine";
import { bool, num, str, type Field, type Values, type WorkPackage } from "../package";
import { beamSizes, partitionSizes, timberSizes, type BeamSize, type PartitionSize, type TimberSize } from "../ratebook";
import { houseTypeLabels } from "../types";
import { brickOptions } from "./extension-options";
import { claddingOptions, cladNewWall, newRenderOptions, renderNewWall } from "./external";
import { fmt, qty2 } from "../util";
import type { ElecSpec } from "./common";
import { buildBathroom } from "./bathroom";
import { boardAndSkim, elecSummary, electricsItems, fasciaSoffit, fitWindows, makeGood, flooring, flooringOptions, newDoors, paint, paintSystemOptions, radiators, rainwater, rooflineFields, skirting, studWall } from "./common";

/** Geometry shared by the formulas (exported for tests and the UI). */
export function loftGeometry(width: number, length: number, loftHeight: number) {
  const floorJoists = Math.ceil(width * 4 - 1e-9) + 3;                    // 4 per metre of width + 3
  const rafterLength = loftHeight / Math.sin(Math.PI / 4);                // height / sin 45°
  const frontProjection = Math.sqrt(rafterLength ** 2 - loftHeight ** 2); // plan depth of the front slope
  const flatRoofLength = length - frontProjection;                        // remaining depth = flat roof joist length
  return { floorJoists, rafterLength, frontProjection, flatRoofLength, floorArea: width * length, flatRoofArea: Math.max(0, flatRoofLength) * width };
}

const roofDays = { TERRACED: 3, SEMI_OR_END: 4, DETACHED: 5 } as const;
export const loftTypeOptions: [string, string][] = [
  ["REAR_DORMER", "Rear dormer"], ["L_SHAPE", "L-shape dormer (main roof + outrigger)"], ["HIP_TO_GABLE", "Hip to gable + rear dormer"],
  ["MANSARD", "Rear mansard"], ["VELUX", "Roof-light conversion (roof kept, Velux windows)"],
];
const timberOptions = Object.entries(timberSizes).map(([k, t]) => [k, t.label] as [string, string]);
const beamOptions = Object.entries(beamSizes).map(([k, b]) => [k, b.label] as [string, string]);
const MAX_BEAMS = 8;
/** One size + length pair per beam (length 0 = house width + 20 cm). */
function beamFields(): Field[] {
  const out: Field[] = [];
  for (let i = 1; i <= MAX_BEAMS; i++) {
    const when = [{ key: "beams", is: true }, { key: "beamCount", gt: i - 1 }];
    out.push({ key: `beam${i}Size`, label: `Beam ${i} size`, type: "select", default: i === 1 ? "203x203" : "203x133", options: beamOptions, group: "Steel beams", when });
    out.push({ key: `beam${i}Length`, label: `Beam ${i} length (0 = width + 20 cm)`, type: "number", unit: "m", default: 0, min: 0, max: 15, group: "Steel beams", when });
  }
  return out;
}

export const loftPackage: WorkPackage = {
  id: "loft", label: "Loft conversion", short: "Loft", usesProperty: true,
  description: "Loft conversion – rear dormer, L-shape, hip to gable, mansard or roof-light conversion: structure to the company rules, then cladding, windows, stairs, fire safety, insulation, plastering, services, en-suite and decoration.",
  fields: [
    { key: "loftType", label: "Type of loft conversion", type: "select", default: "REAR_DORMER", public: true, group: "Type", options: loftTypeOptions },
    { key: "outriggerWidth", label: "Outrigger dormer width", type: "number", unit: "m", default: 2.5, min: 1.5, max: 6, public: true, group: "Type", when: [{ key: "loftType", is: "L_SHAPE" }] },
    { key: "outriggerLength", label: "Outrigger dormer length", type: "number", unit: "m", default: 3.5, min: 1.5, max: 10, public: true, group: "Type", when: [{ key: "loftType", is: "L_SHAPE" }] },
    { key: "outriggerWindows", label: "Outrigger dormer windows", type: "int", default: 1, min: 0, max: 4, group: "Type", when: [{ key: "loftType", is: "L_SHAPE" }] },
    { key: "gables", label: "Hips to convert to gables", type: "int", default: 1, min: 1, max: 2, public: true, group: "Type", when: [{ key: "loftType", is: "HIP_TO_GABLE" }], hint: "Semi-detached 1, detached 2" },
    { key: "gableFinish", label: "Gable wall finish", type: "select", default: "BRICK", group: "Type", options: [["BRICK", "Facing brick + block"], ["RENDER", "Block, rendered"]], when: [{ key: "loftType", is: "HIP_TO_GABLE" }] },
    { key: "partyWallRaise", label: "Raise party walls (parapets)", type: "boolean", default: true, group: "Type", when: [{ key: "loftType", is: "MANSARD" }] },
    { key: "parapetHeight", label: "Party wall raise height", type: "number", unit: "m", default: 0.6, min: 0.2, max: 2, group: "Type", when: [{ key: "loftType", is: "MANSARD" }, { key: "partyWallRaise", is: true }] },
    { key: "rearRoofWindows", label: "Rear roof windows (Velux)", type: "int", default: 2, min: 0, max: 10, public: true, group: "Type", when: [{ key: "loftType", is: "VELUX" }] },

    { key: "lowerCeiling", label: "Lower first floor ceilings (loft floor hung lower for head height)", type: "boolean", default: false, public: true, group: "First floor ceilings" },
    { key: "lowerBy", label: "Lowered by about", type: "int", unit: "mm", default: 150, min: 50, max: 600, group: "First floor ceilings", when: [{ key: "lowerCeiling", is: true }] },
    { key: "doorHeads", label: "Door heads / architraves to adjust", type: "int", default: 0, min: 0, max: 12, group: "First floor ceilings", when: [{ key: "lowerCeiling", is: true }] },

    { key: "loftHeight", label: "Loft height", type: "number", unit: "m", default: 2.4, min: 1.8, max: 3.5, group: "Structure" },
    { key: "demolition", label: "Demolition of pitched roof", type: "boolean", default: true, group: "Structure", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "beams", label: "Steel beams", type: "boolean", default: true, group: "Structure" },
    { key: "beamCount", label: "Number of beams", type: "int", default: 3, min: 0, max: 8, group: "Structure", when: [{ key: "beams", is: true }] },
    ...beamFields(),
    { key: "beamDeliveries", label: "Beam deliveries to site", type: "int", default: 1, min: 1, max: 10, group: "Steel beams", when: [{ key: "beams", is: true }] },
    { key: "floor", label: "Floor joists & boarding", type: "boolean", default: true, group: "Structure" },
    { key: "joistSize", label: "Floor joists", type: "select", default: "47x175", options: timberOptions, group: "Structure", when: [{ key: "floor", is: true }] },
    { key: "boarding", label: "Boarding", type: "select", default: "FLOORBOARD", options: [["FLOORBOARD", "Flooring board 1.2 × 0.6"], ["PLYWOOD", "Plywood 2.4 × 1.2"]], group: "Structure", when: [{ key: "floor", is: true }] },
    { key: "roofStructure", label: "Roof structure (front roof, flat roof, partitions)", type: "boolean", default: true, group: "Structure", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "rafterSize", label: "Front roof rafters", type: "select", default: "47x150", options: timberOptions, group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },
    { key: "flatJoistSize", label: "Flat roof joists", type: "select", default: "47x175", options: timberOptions, group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },
    { key: "roofFinish", label: "Flat roof finish", type: "select", default: "FIBREGLASS", options: [["FIBREGLASS", "GRP fibreglass"], ["FELT", "Torch-on felt"]], public: true, group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },
    { key: "sidePartitionSize", label: "Side partitions ×2", type: "select", default: "6x2", options: Object.keys(partitionSizes).map(k => [k, k] as [string, string]), group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },
    { key: "backPartitionSize", label: "Back partition", type: "select", default: "6x2", options: Object.keys(partitionSizes).map(k => [k, k] as [string, string]), group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },
    { key: "studCentres", label: "Stud centres", type: "number", unit: "m", default: 0.4, min: 0.3, max: 0.6, group: "Structure", when: [{ key: "loftType", not: "VELUX" }, { key: "roofStructure", is: true }] },

    { key: "frontWindows", label: "Front roof windows (Velux)", type: "int", default: 2, min: 0, max: 10, public: true, group: "Dormer & windows" },
    { key: "flatWindows", label: "Flat roof windows", type: "int", default: 0, min: 0, max: 10, public: true, group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "rearWindows", label: "Dormer windows", type: "int", default: 2, min: 0, max: 6, public: true, group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "windowType", label: "Dormer window type", type: "select", default: "UPVC", options: [["UPVC", "uPVC"], ["ALU", "Aluminium"]], group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "juliet", label: "Juliet balcony", type: "boolean", default: false, public: true, group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "cladding", label: "Dormer cladding", type: "select", default: "TILE", public: true, clientChoice: true, options: claddingOptions, group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    { key: "renderSystem", label: "Render", type: "select", default: "SILICONE", options: newRenderOptions, clientChoice: true, group: "Dormer & windows", when: [{ any: [{ key: "cladding", is: "RENDER" }, { key: "gableFinish", is: "RENDER" }] }] },
    { key: "dormerBrick", label: "Brick", type: "select", default: "facing_brick", clientChoice: true, options: brickOptions, group: "Dormer & windows", when: [{ any: [{ key: "cladding", is: "BRICK" }, { key: "gableFinish", is: "BRICK" }] }] },
    { key: "fascia", label: "Fascia, soffit & guttering", type: "boolean", default: true, group: "Dormer & windows", when: [{ key: "loftType", not: "VELUX" }] },
    ...rooflineFields("Roofline (dormer)", { fascia: "200", soffit: "150", downpipes: 1, height: 3 }).map(f => ({ ...f, when: [{ key: "loftType", not: "VELUX" }, { key: "fascia", is: true }] })),

    { key: "fitOut", label: "Full fit-out (stairs, insulation, plastering, services, decoration)", type: "boolean", default: true, public: true, group: "Fit-out" },
    { key: "fitOutBy", label: "How to price the fit-out", type: "select", default: "WHOLE", group: "Fit-out", when: [{ key: "fitOut", is: true }],
      hint: "Room by room: add each loft room (bedroom, bathroom, office…) and choose its works like any room",
      options: [["WHOLE", "Whole loft – by number of bedrooms"], ["ROOMS", "Room by room – I'll add each loft room"]] },
    { key: "bedrooms", label: "Bedrooms in the loft", type: "int", default: 1, min: 1, max: 3, public: true, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "staircase", label: "New staircase", type: "boolean", default: true, group: "Stairs & access", when: [{ key: "fitOut", is: true }] },
    { key: "stairType", label: "Staircase", type: "select", default: "STANDARD", clientChoice: true, group: "Stairs & access", when: [{ key: "fitOut", is: true }, { key: "staircase", is: true }],
      options: [["STANDARD", "Straight / winder staircase with balustrade"], ["SPACE_SAVER", "Space-saver (alternating tread) – where Building Control allows"]] },
    { key: "hatch", label: "Loft hatch with folding ladder instead", type: "boolean", default: false, group: "Stairs & access", hint: "Storage only – a habitable loft room needs a fixed staircase", when: [{ key: "fitOut", is: true }, { key: "staircase", is: false }] },
    { key: "consumerUnit", label: "New consumer unit (fuse board)", type: "boolean", default: false, group: "Fit-out", hint: "Priced once for the whole job, even with other projects", when: [{ key: "fitOut", is: true }] },
    { key: "ensuite", label: "En-suite shower room", type: "boolean", default: true, public: true, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "ensuiteGrade", label: "En-suite grade", type: "select", default: "MID", clientChoice: true, options: [["STANDARD", "Standard"], ["MID", "Mid range"], ["PREMIUM", "Premium"]], group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }, { key: "ensuite", is: true }] },
    { key: "fireDoors", label: "FD30 fire doors (protected stair)", type: "int", default: 3, min: 0, max: 10, group: "Fit-out", when: [{ key: "fitOut", is: true }] },
    { key: "smokeAlarms", label: "Mains interlinked smoke / heat alarms", type: "int", default: 3, min: 0, max: 10, group: "Fit-out", when: [{ key: "fitOut", is: true }] },
    { key: "internalWalls", label: "Internal stud walls (landing / en-suite)", type: "number", unit: "m", default: 5, min: 0, max: 30, group: "Fit-out", when: [{ key: "fitOut", is: true }] },
    { key: "radiators", label: "Radiators", type: "int", default: 2, min: 0, max: 8, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "extraSockets", label: "Extra double sockets (on top of 4 per bedroom)", type: "int", default: 0, min: 0, max: 30, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "loftSpotlights", label: "Spotlights per bedroom", type: "int", default: 6, min: 0, max: 20, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "flooring", label: "Flooring", type: "select", default: "CARPET", options: flooringOptions, public: true, clientChoice: true, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "decorate", label: "Decorate", type: "boolean", default: true, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }] },
    { key: "paintSystem", label: "Paint type", type: "select", default: "STANDARD", options: paintSystemOptions, clientChoice: true, group: "Fit-out", when: [{ key: "fitOut", is: true }, { key: "fitOutBy", is: "WHOLE" }, { key: "decorate", is: true }] },
  ],
  needsScaffold: () => true,
  skips: v => (bool(v, "demolition") && str(v, "loftType") !== "VELUX" ? 4 : 2) + (bool(v, "lowerCeiling") ? 1 : 0) + (str(v, "loftType") === "L_SHAPE" ? 1 : 0),
  build: buildLoft,
};

export function buildLoft(ctx: Ctx, v: Values) {
  const p = ctx.input.property;
  const W = p.width, L = p.length, H = num(v, "loftHeight");
  const g = loftGeometry(W, L, H);
  const house = houseTypeLabels[p.houseType].toLowerCase();
  const type = str(v, "loftType");
  const velux = type === "VELUX", lshape = type === "L_SHAPE", h2g = type === "HIP_TO_GABLE", mansard = type === "MANSARD";
  const oW = lshape ? num(v, "outriggerWidth") : 0, oL = lshape ? num(v, "outriggerLength") : 0, oWin = lshape ? num(v, "outriggerWindows") : 0;
  const oA = qty2(oW * oL);
  const frontWindows = num(v, "frontWindows"), flatWindows = velux ? 0 : num(v, "flatWindows"), rearWindows = velux ? 0 : num(v, "rearWindows");
  const rearRoofWindows = velux ? num(v, "rearRoofWindows") : 0;
  const typeLabel = loftTypeOptions.find(([k]) => k === type)?.[1] ?? "Rear dormer";
  ctx.assume(`Loft type: ${typeLabel.toLowerCase()}.`);
  if (h2g && p.houseType === "TERRACED") ctx.warn("Hip to gable is chosen but the house is terraced (no hip). Check the loft type.");

  // 1. Demolition of the existing pitched roof (a roof-light conversion keeps the roof)
  if (!velux && bool(v, "demolition")) {
    ctx.labour("Demolition", `demolition_${p.houseType}`, 1, `${houseTypeLabels[p.houseType]} house`);
    ctx.scope(`Strip out and demolish the existing pitched rear roof structure (${house} property), removing all debris from site.`);
  }
  if (lshape) {
    ctx.labour("Demolition", "demolition_outrigger", 1, `outrigger roof ${fmt(oW)} × ${fmt(oL)} m`);
    ctx.scope(`Strip out the outrigger (rear addition) roof, ${fmt(oW)} × ${fmt(oL)} m, for the L-shape dormer.`);
  }
  if (velux) ctx.scope("Keep the existing roof covering and structure; open up the roof space for habitable use with new roof windows.");

  // 2–3. Steel beams
  const beamCount = bool(v, "beams") ? Math.min(MAX_BEAMS, num(v, "beamCount")) : 0;
  const beamList = Array.from({ length: beamCount }, (_, i) => {
    const size = beamSizes[str(v, `beam${i + 1}Size`) as BeamSize] ?? beamSizes["203x133"];
    const given = num(v, `beam${i + 1}Length`);
    return { n: i + 1, size, length: given > 0 ? given : W + 0.2, auto: !(given > 0) };
  });
  const beams = beamList.length;
  const beamMetres = qty2(beamList.reduce((s, b) => s + b.length, 0));
  if (beams > 0) {
    const S1 = "Beam preparation";
    ctx.material(S1, "padstone", beams * 2, `${beams} beams × 2 padstones`);
    ctx.material(S1, "cement_bag", beams, `${beams} beams × 1 bag`);
    ctx.material(S1, "sand_bag", beams * 2, `${beams} beams × 2 bags`);
    if (beams <= 3) ctx.labour(S1, "beam_prep_small", 1, `${beams} beam${beams > 1 ? "s" : ""} (1–3 beams: 1 day, 2 people)`);
    else if (beams <= 5) ctx.labour(S1, "beam_prep_large", 1, `${beams} beams (4–5 beams: 2 days, 2 people)`);
    else {
      const blocks = Math.ceil(beams / 5);
      ctx.labour(S1, "beam_prep_large", blocks, `${beams} beams → ${blocks} × (4–5 beam allowance)`);
      ctx.assume(`More than five beams: beam preparation allowed as ${blocks} × the 4–5 beam rate. Confirm on survey.`);
    }
    const S2 = "Steel beams";
    for (const b of beamList)
      ctx.material(S2, b.size.key, qty2(b.length), b.auto ? `house width ${fmt(W)} m + 0.20 m = ${fmt(b.length)} m` : `${fmt(b.length)} m as specified`, `Beam ${b.n} – ${b.size.label}`);
    ctx.material(S2, "beam_transport", beams, `${beams} beams × £100`);
    const deliveries = Math.max(1, num(v, "beamDeliveries"));
    ctx.material(S2, "beam_site_entry", deliveries, `${deliveries} deliver${deliveries > 1 ? "ies" : "y"} into site`);
    const installs = Math.ceil(beams / 5);
    ctx.labour(S2, "beam_install", installs, installs > 1 ? `${beams} beams → ${installs} installation days` : "1 day, 3 people");
    ctx.scope(`Supply and install ${beams} steel beam${beams > 1 ? "s" : ""} (${beamList.map(b => `${b.size.label} × ${fmt(b.length)} m`).join(", ")}) on concrete padstones, to the structural engineer's design.`);
  }

  // 4. Floor: joists + boarding
  if (bool(v, "floor")) {
    const S = "Floor preparation";
    const t = timberSizes[str(v, "joistSize") as TimberSize];
    const joistMetres = g.floorJoists * L;
    ctx.material(S, t.key, qty2(joistMetres), `(⌈${fmt(W)} m × 4⌉ + 3) = ${g.floorJoists} joists × ${fmt(L)} m length = ${fmt(joistMetres)} m`, `Floor joists – ${t.label}`);
    const hangers = g.floorJoists * 2;
    ctx.material(S, "joist_hanger", hangers, `${g.floorJoists} joists × 2`);
    ctx.material(S, "hanger_nails", Math.ceil(hangers * 10 / 250), `${hangers} hangers × 10 nails ÷ 250 per pack`);
    ctx.material(S, "timber_screws", Math.ceil(g.floorJoists / 10), `1 box per 10 joists`);
    ctx.material(S, "restraint_strap", 2 * Math.ceil(L / 2), `2 walls × ⌈${fmt(L)} m ÷ 2 m centres⌉`);
    const strutRows = Math.max(1, Math.ceil(L / 2.5) - 1);
    ctx.material(S, "strutting", qty2(strutRows * W), `${strutRows} row${strutRows > 1 ? "s" : ""} × ${fmt(W)} m width`);
    if (beams > 0) {
      const bolts = beamList.reduce((s, b) => s + Math.ceil(b.length / 0.6 - 1e-9), 0);
      ctx.material(S, "beam_bolts", bolts, `Σ ⌈beam length ÷ 0.6 m⌉ = ${bolts} bolts to fix timber plates`);
    }
    ctx.labour(S, "floor_joists", 1, "4 days, 3 people");
    if (oA > 0) {
      const oj = Math.ceil(oW * 4 - 1e-9) + 3;
      ctx.material(S, t.key, qty2(oj * oL), `outrigger: (⌈${fmt(oW)} m × 4⌉ + 3) = ${oj} joists × ${fmt(oL)} m`, `Floor joists over outrigger – ${t.label}`);
      ctx.material(S, "joist_hanger", oj * 2, `${oj} joists × 2`, "Joist hangers – outrigger floor");
      ctx.labour(S, "floor_joists_new", oA, `outrigger floor ${fmt(oA)} m²`);
    }

    const plywood = str(v, "boarding") === "PLYWOOD";
    const sheetArea = plywood ? 2.4 * 1.2 : 1.2 * 0.6;
    const boardArea = qty2(g.floorArea + oA);
    const sheets = Math.ceil(boardArea / sheetArea - 1e-9) + 2;
    ctx.material(S, plywood ? "plywood_18" : "floorboard_18", sheets,
      `⌈(${fmt(W)} × ${fmt(L)}${oA ? ` + outrigger ${fmt(oA)}` : ""} = ${fmt(boardArea)} m²) ÷ ${fmt(sheetArea)} m² per sheet⌉ + 2 spare = ${sheets} sheets`);
    ctx.material(S, "flooring_screws", Math.ceil(sheets * (plywood ? 30 : 12) / 200), `${sheets} sheets × ${plywood ? 30 : 12} screws ÷ 200`);
    ctx.material(S, "flooring_adhesive", Math.ceil(sheets / (plywood ? 4 : 10)), `1 tube per ${plywood ? 4 : 10} sheets`);
    ctx.labour(S, "floor_boarding", 1, "800 per 2 people");
    ctx.scope(`Install new loft floor: ${g.floorJoists} no. ${t.label} joists in hangers with strutting and restraint straps, boarded with 18 mm ${plywood ? "plywood" : "T&G flooring boards"} (${fmt(g.floorArea)} m²).`);
  }

  // 5. Roof structure: front roof, flat roof, partitions
  const hasFlat = g.flatRoofLength > 0.3;
  if (!velux && bool(v, "roofStructure")) {
    const S = "Roof structure";
    const days = roofDays[p.houseType];
    ctx.labour(S, "roof_structure_day", days, `${houseTypeLabels[p.houseType]}: ${days} days, 3 people (includes side and back partitions)`);

    const rafters = g.floorJoists + frontWindows;
    const rt = timberSizes[str(v, "rafterSize") as TimberSize];
    ctx.material(S, rt.key, qty2(rafters * g.rafterLength),
      `(${g.floorJoists} floor joists + ${frontWindows} windows) = ${rafters} rafters × (${fmt(H)} m ÷ sin 45° = ${fmt(g.rafterLength)} m)`, `Front roof rafters – ${rt.label}`);
    ctx.material(S, "framing_anchor", rafters * 2, `${rafters} rafters × 2`);

    let addCovering = () => {};
    if (!hasFlat) {
      ctx.warn(`House length ${fmt(L)} m is too short for a flat roof behind a ${fmt(g.frontProjection)} m front slope. Check dimensions.`);
    } else {
      const flatJoists = g.floorJoists + 3 + flatWindows;
      const ft = timberSizes[str(v, "flatJoistSize") as TimberSize];
      const lenText = `(${fmt(L)} m − √(${fmt(g.rafterLength)}² − ${fmt(H)}²) = ${fmt(g.flatRoofLength)} m)`;
      ctx.material(S, ft.key, qty2(flatJoists * g.flatRoofLength),
        `(${g.floorJoists} floor joists + 3 + ${flatWindows} flat windows) = ${flatJoists} joists × ${lenText}`, `Flat roof joists – ${ft.label}`);
      ctx.material(S, "firring", qty2(flatJoists * g.flatRoofLength), `${flatJoists} firrings × ${fmt(g.flatRoofLength)} m`);
      ctx.material(S, "joist_hanger", flatJoists * 2, `${flatJoists} flat roof joists × 2`, "Joist hangers – flat roof");
      ctx.material(S, "nails_box", Math.ceil((rafters + flatJoists) / 15), `1 box per 15 rafters / joists`);
      const sheets = Math.ceil(g.flatRoofArea / 2.8 - 1e-9);
      const sheetText = `⌈(${fmt(g.flatRoofLength)} m × ${fmt(W)} m = ${fmt(g.flatRoofArea)} m²) ÷ 2.8⌉ = ${sheets}`;
      ctx.material(S, "osb_12", sheets, sheetText);
      ctx.material(S, "pir_150", sheets, sheetText);
      ctx.material(S, "osb_18", sheets, sheetText);
      ctx.material(S, "vcl", Math.ceil(g.flatRoofArea), `${fmt(g.flatRoofArea)} m² roof area`);
      ctx.material(S, "foil_tape", Math.ceil(g.flatRoofArea / 10), `1 roll per 10 m²`);
      const finish = str(v, "roofFinish");
      addCovering = () => {
        const S2 = "Flat roof covering";
        const coverArea = Math.ceil(g.flatRoofArea * 1.1);
        ctx.material(S2, finish === "FELT" ? "felt_system" : "grp_system", coverArea, `${fmt(g.flatRoofArea)} m² + 10% laps and upstands`);
        ctx.material(S2, "roof_trims", qty2(W + 2 * g.flatRoofLength), `${fmt(W)} m + 2 × ${fmt(g.flatRoofLength)} m edges`);
        ctx.labour(S2, "flat_roof_covering", coverArea, `${coverArea} m²`);
      };
      ctx.scope(`Construct new flat roof: ${flatJoists} no. ${ft.label} joists with firrings, 12 mm OSB, 150 mm PIR insulation, 18 mm OSB deck and ${finish === "FELT" ? "torch-on felt" : "GRP fibreglass"} finish (${fmt(g.flatRoofArea)} m²).`);
    }
    ctx.scope(`Re-form front roof slope: ${rafters} no. ${rt.label} rafters at 45°${frontWindows ? `, trimmed for ${frontWindows} roof window${frontWindows > 1 ? "s" : ""}` : ""}.`);

    const c = num(v, "studCentres");
    const sideLen = Math.max(0, g.flatRoofLength);
    const sideSize = str(v, "sidePartitionSize") as PartitionSize, backSize = str(v, "backPartitionSize") as PartitionSize;
    if (sideLen > 0) {
      const sideStuds = Math.ceil(sideLen / c - 1e-9) + 1;
      const st = timberSizes[partitionSizes[sideSize]];
      ctx.material(S, st.key, qty2(2 * (sideStuds * H + 3 * sideLen)), `2 sides × (${sideStuds} studs × ${fmt(H)} m + 3 × ${fmt(sideLen)} m plates/noggins)`, `Side partitions ×2 – ${sideSize}`);
    }
    const backStuds = Math.ceil(W / c - 1e-9) + 1;
    const bt = timberSizes[partitionSizes[backSize]];
    ctx.material(S, bt.key, qty2(backStuds * H + 3 * W), `${backStuds} studs × ${fmt(H)} m + 3 × ${fmt(W)} m plates/noggins`, `Back partition – ${backSize}`);
    addCovering();

    // L-shape: flat roof and walls over the outrigger
    if (oA > 0) {
      const ft = timberSizes[str(v, "flatJoistSize") as TimberSize];
      const oj = Math.ceil(oW / 0.4 - 1e-9) + 1;
      ctx.labour(S, "roof_structure_day", 2, "outrigger dormer: 2 extra days, 3 people");
      ctx.material(S, ft.key, qty2(oj * (oL + 0.2)), `${oj} joists (⌈${fmt(oW)} ÷ 0.4⌉ + 1) × (${fmt(oL)} + 0.2) m`, `Outrigger flat roof joists – ${ft.label}`);
      ctx.material(S, "firring", qty2(oj * (oL + 0.2)), `${oj} firrings`, "Firrings – outrigger roof");
      const os = Math.ceil(oA / 2.8 - 1e-9);
      for (const k of ["osb_12", "pir_150", "osb_18"]) ctx.material(S, k, os, `⌈outrigger ${fmt(oA)} m² ÷ 2.8⌉ = ${os}`);
      const oStuds = Math.ceil(oL / c - 1e-9) + 1, wStuds = Math.ceil(oW / c - 1e-9) + 1;
      const st = timberSizes[partitionSizes[sideSize]];
      ctx.material(S, st.key, qty2(2 * (oStuds * H + 3 * oL) + wStuds * H + 3 * oW), `outrigger walls: 2 × (${oStuds} studs × ${fmt(H)} + 3 × ${fmt(oL)}) + ${wStuds} studs × ${fmt(H)} + 3 × ${fmt(oW)}`, `Outrigger dormer walls – ${sideSize}`);
      const S2 = "Flat roof covering";
      const area = Math.ceil(oA * 1.1);
      ctx.material(S2, str(v, "roofFinish") === "FELT" ? "felt_system" : "grp_system", area, `outrigger ${fmt(oA)} m² + 10%`);
      ctx.material(S2, "roof_trims", qty2(oW + 2 * oL), "outrigger edges");
      ctx.labour(S2, "flat_roof_covering", area, `outrigger ${area} m²`);
      ctx.scope(`Build the outrigger dormer (${fmt(oW)} × ${fmt(oL)} m): floor, framed walls and insulated flat roof, joined to the main dormer in an L-shape.`);
    }

    // Mansard: 72° rear slope instead of a vertical dormer face, party walls raised
    if (mansard) {
      const slopeArea = qty2(W * H / Math.sin(72 * Math.PI / 180));
      ctx.labour(S, "mansard_frame", slopeArea, `rear slope ${fmt(W)} × ${fmt(H)} ÷ sin 72° = ${fmt(slopeArea)} m²`);
      ctx.material(S, "timber_47x150", qty2((Math.ceil(W / 0.4) + 1) * (H / Math.sin(72 * Math.PI / 180))), `${Math.ceil(W / 0.4) + 1} mansard rafters`, "Mansard rafters – C24 47 × 150");
      if (bool(v, "partyWallRaise")) {
        const raise = qty2(2 * Math.max(0, g.flatRoofLength) * num(v, "parapetHeight"));
        ctx.material(S, "dense_block", Math.ceil(raise * 10 * 1.05), `2 party walls × ${fmt(g.flatRoofLength)} m × ${fmt(num(v, "parapetHeight"))} m = ${fmt(raise)} m² × 10 + 5%`, "Blocks – party wall raise");
        ctx.material(S, "mortar_cement", Math.ceil(raise * 0.12), `${fmt(raise)} m²`);
        ctx.labour(S, "party_wall_raise", raise, `${fmt(raise)} m²`);
      }
      ctx.labour(S, "roof_structure_day", 2, "mansard: 2 extra days, 3 people");
      ctx.scope(`Rear mansard: 72° rear slope framed and clad${bool(v, "partyWallRaise") ? ", party walls raised" : ""}, flat roof over.`);
    }

    // Hip to gable: remove each hip, build a gable wall and extend the ridge and roof slopes
    if (h2g) {
      const n = num(v, "gables");
      const gable = qty2(L * H / 2);
      const brick = str(v, "gableFinish") === "BRICK";
      const total = qty2(n * gable);
      ctx.labour(S, "hip_to_gable", n, `${n} gable${n > 1 ? "s" : ""}`);
      if (brick) { ctx.material(S, str(v, "dormerBrick") || "facing_brick", Math.ceil(total * 60 * 1.05), `${n} × (${fmt(L)} × ${fmt(H)} ÷ 2 = ${fmt(gable)} m²) × 60 + 5%`, "Facing bricks – gable (to match)"); ctx.labour(S, "facing_brickwork", total, "gable outer leaf"); }
      else { ctx.material(S, "dense_block", Math.ceil(total * 10 * 1.05), `${fmt(total)} m² × 10 + 5%`, "Blocks – gable outer leaf"); ctx.labour(S, "blockwork", total, "gable outer leaf"); renderNewWall(ctx, S, total, str(v, "renderSystem"), "gable"); }
      ctx.material(S, "thermal_block", Math.ceil(total * 10 * 1.05), `${fmt(total)} m² × 10 + 5%`, "Thermal blocks – gable inner leaf");
      ctx.labour(S, "blockwork", total, "gable inner leaf");
      ctx.material(S, "wall_ties", Math.ceil(total * 2.5), `${fmt(total)} m² × 2.5`);
      ctx.material(S, "mortar_cement", Math.ceil(total * 0.04 * 12), `${fmt(total)} m² cavity wall`);
      ctx.material(S, "mortar_sand", Math.ceil(total * 0.04 * 1.6 * 10) / 10, `${fmt(total)} m² cavity wall`);
      const newRafters = n * 2 * Math.ceil((L / 2) / 0.4);
      ctx.material(S, rt.key, qty2(newRafters * g.rafterLength), `${n} × 2 slopes × ⌈${fmt(L / 2)} m ÷ 0.4⌉ = ${newRafters} rafters × ${fmt(g.rafterLength)} m`, `Rafters – extended slopes`);
      ctx.material(S, "timber_47x225", qty2(n * L / 2), `ridge extension ${n} × ${fmt(L / 2)} m`, "Ridge board extension");
      const infill = qty2(n * (L / 2) * g.rafterLength);
      ctx.material(S, "breather_membrane", Math.ceil(infill * 1.1), `extended slopes ${fmt(infill)} m² + 10%`);
      ctx.material(S, "batten_25x50", Math.ceil(infill * 3), `${fmt(infill)} m² × 3 m/m²`);
      ctx.material(S, "tile_concrete", Math.ceil(infill * 10 * 1.05), `${fmt(infill)} m² × 10 + 5% (match existing)`, "Roof tiles – extended slopes");
      ctx.material(S, "ridge_tile", Math.ceil(n * (L / 2) / 0.45), `${fmt(n * L / 2)} m ridge`);
      ctx.material(S, "dry_ridge", qty2(n * 2 * g.rafterLength), `${n} gable × 2 verges`, "Dry verge – gable");
      ctx.labour(S, "roof_tiling_concrete", infill, `extended slopes ${fmt(infill)} m²`);
      ctx.scope(`Hip to gable: remove ${n} hip${n > 1 ? "s" : ""}, build ${n} cavity gable wall${n > 1 ? "s" : ""} (${fmt(total)} m², ${brick ? "facing brick" : "rendered"}), extend the ridge and re-tile the new slopes (${fmt(infill)} m²).`);
    }
    ctx.assume(`Partitions framed with studs at ${Math.round(c * 1000)} mm centres, top and bottom plates and one noggin row. Partition labour is included in the roof structure days.`);
    ctx.scope(`Frame dormer side walls (×2, ${sideSize}) and back wall (${backSize}) ready for windows, insulation and boarding.`);
  }

  // 6. Roof-light conversion: windows in both slopes, no dormer
  if (velux) {
    const S = "Roof windows";
    const all = frontWindows + rearRoofWindows;
    if (all) {
      const rt = timberSizes[str(v, "rafterSize") as TimberSize] ?? timberSizes["47x150"];
      ctx.material(S, "roof_window", all, `${frontWindows} front + ${rearRoofWindows} rear roof windows`);
      ctx.material(S, rt.key, qty2(all * 2 * 2.4), `${all} windows × 2 trimmers × 2.4 m`, `Trimmers for roof windows – ${rt.label}`);
      ctx.labour(S, "roof_window_trim", all, `${all} windows`);
      ctx.labour(S, "roof_window_fit", all, `${all} roof windows`);
      ctx.scope(`Trim the rafters and fit ${all} roof window${all > 1 ? "s" : ""} with flashing kits (${frontWindows} front, ${rearRoofWindows} rear).`);
    }
  }

  // 6. Dormer envelope: windows, cladding, rainwater goods
  if (!velux) {
    const S = "Dormer & windows";
    if (frontWindows + flatWindows > 0) {
      ctx.material(S, "roof_window", frontWindows + flatWindows, `${frontWindows} front + ${flatWindows} flat roof windows`);
      ctx.labour(S, "roof_window_fit", frontWindows + flatWindows, `${frontWindows + flatWindows} roof windows`);
    }
    const windowKey = str(v, "windowType") === "ALU" ? "window_alu" : "window_upvc";
    fitWindows(ctx, S, rearWindows + oWin, windowKey, `dormer windows${oWin ? ` (incl. ${oWin} outrigger)` : ""}`);
    if (bool(v, "juliet")) { ctx.material(S, "juliet_balcony", 1, "1 balcony"); ctx.labour(S, "window_fit", 1, "Juliet doors / balcony"); }
    // Cheeks on a party wall are masonry; only exposed cheeks are clad.
    const exposedCheeks = p.houseType === "TERRACED" ? 0 : p.houseType === "SEMI_OR_END" ? 1 : 2;
    const rearFace = mansard ? W * H / Math.sin(72 * Math.PI / 180) : W * H;
    const outrigger = oA > 0 ? Math.max(0, (oL + oW) * H - oWin * 1.44) : 0;
    const clad = qty2(Math.max(0, rearFace - rearWindows * 1.44 - (bool(v, "juliet") ? 2.0 : 0)) + exposedCheeks * Math.max(0, g.flatRoofLength) * H + outrigger);
    const cladding = str(v, "cladding");
    let cladText = "";
    if (clad > 0) cladText = cladNewWall(ctx, S, clad, cladding, "dormer", { renderSystem: str(v, "renderSystem"), brick: str(v, "dormerBrick"),
      formula: `rear face ${fmt(W)} × ${fmt(H)}${mansard ? " ÷ sin 72°" : ""} − windows${oA ? ` + outrigger (${fmt(oL)} + ${fmt(oW)}) × ${fmt(H)}` : ""}${exposedCheeks ? ` + ${exposedCheeks} exposed cheek${exposedCheeks > 1 ? "s" : ""} × ${fmt(g.flatRoofLength)} × ${fmt(H)}` : ""} = ${fmt(clad)} m²` });
    if (bool(v, "fascia")) {
      fasciaSoffit(ctx, S, { length: qty2(W + oW + oL), fascia: str(v, "fasciaWidth"), soffit: str(v, "soffitWidth"), colour: str(v, "rooflineColour"), corners: 2, label: "dormer" });
      rainwater(ctx, S, { length: qty2(W + oW + oL), downpipes: num(v, "downpipes"), height: num(v, "downpipeHeight"), angles90: num(v, "angles90"), angles135: num(v, "angles135"),
        stopEnds: num(v, "stopEnds"), profile: str(v, "gutterProfile"), pipe: str(v, "pipe") as "ROUND" | "SQUARE", label: "dormer" });
      ctx.material(S, "lead_flashing", qty2(2 * Math.max(0, g.flatRoofLength) + W), "abutments and cheek flashings");
    }
    ctx.scope(`Supply and fit ${frontWindows + flatWindows} roof window${frontWindows + flatWindows === 1 ? "" : "s"} and ${rearWindows} ${str(v, "windowType") === "ALU" ? "aluminium" : "uPVC"} dormer window${rearWindows === 1 ? "" : "s"}${bool(v, "juliet") ? " and a Juliet balcony" : ""}; clad dormer in ${cladText || "hanging tiles"}${bool(v, "fascia") ? ", new fascia, soffit and guttering" : ""}.`);
  }

  ctx.assume(`Loft geometry: width ${fmt(W)} m (party wall to party wall), length ${fmt(L)} m (front to back), loft height ${fmt(H)} m, front slope at 45°.`);
  ctx.assume("Beam sizes and positions to be confirmed by the structural engineer's calculations.");
  if (bool(v, "lowerCeiling")) lowerFirstFloorCeilings(ctx, v, W, L);
  if (!bool(v, "fitOut")) { ctx.assume("Loft priced as shell only: no stairs, insulation to walls/slope, plastering, services or decoration."); return; }

  // 7. Fit-out
  const bedrooms = num(v, "bedrooms");
  const flatLen = Math.max(0, g.flatRoofLength);
  const slope = qty2(velux ? 2 * W * g.rafterLength : W * g.rafterLength);
  const dormerWalls = qty2(velux ? 2 * W * 1.0 : (2 * flatLen + W) * H + (oA > 0 ? (2 * oL + oW) * H : 0));
  const partyWalls = qty2(velux ? 2 * (L * H / 2) : 2 * (flatLen * H + 0.5 * g.frontProjection * H));
  const ceiling = qty2(velux ? W * Math.max(0, L - 2 * g.frontProjection) : g.flatRoofArea + oA);
  const floorTotal = qty2(g.floorArea + oA);
  const openings = (rearWindows + oWin) * 1.44 + (frontWindows + flatWindows + rearRoofWindows) * 1.1;
  if (velux) ctx.assume("Roof-light conversion: knee walls 1.0 m high, flat ceiling at collar level; head height must be at least 2.2 m over the stair and most of the floor.");

  const byRooms = str(v, "fitOutBy") === "ROOMS";
  const loftRooms = ctx.input.rooms.filter(r => r.floor === "LOFT");
  if (byRooms && !loftRooms.length) ctx.warn("Loft fit-out is room by room but no loft rooms are added yet – add them in Rooms (floor: Loft).");
  if (!bool(v, "staircase") && bool(v, "hatch")) {
    ctx.material("Staircase", "loft_ladder", 1, "1 hatch & ladder");
    ctx.labour("Staircase", "loft_hatch_fit", 1, "1 hatch");
    ctx.scope("Form a loft hatch opening with trimmers and fit an insulated hatch with folding ladder.");
    ctx.assume("A loft ladder is only suitable for storage; habitable loft rooms need a fixed staircase under the Building Regulations.");
  }
  if (bool(v, "staircase")) {
    const S = "Staircase";
    const saver = str(v, "stairType") === "SPACE_SAVER";
    ctx.material(S, saver ? "staircase_spacesaver" : "staircase", 1, saver ? "1 space-saver staircase" : "1 staircase incl. balustrade");
    if (saver) ctx.assume("A space-saver staircase is only allowed where there is no room for a normal stair and serves one habitable room plus a bathroom.");
    const trim = timberSizes[str(v, "joistSize") as TimberSize] ?? timberSizes["47x175"];
    ctx.material(S, trim.key, 10, "stairwell trimmers 4 × 2.5 m", `Stairwell trimmers – ${trim.label}`);
    ctx.labour(S, "staircase_fit", 1, "1 staircase");
    ctx.scope("Form stairwell opening with trimmers and install new staircase with balustrade from the first floor landing.");
  }

  const S1 = "Insulation & first fix";
  const slopeText = velux ? `2 slopes × ${fmt(W)} × ${fmt(g.rafterLength)}` : `front slope ${fmt(W)} × ${fmt(g.rafterLength)}`;
  ctx.material(S1, "pir_100", Math.ceil(slope / 2.88 - 1e-9), `${slopeText} = ${fmt(slope)} m² ÷ 2.88`, `PIR 100 mm between rafters – ${velux ? "both slopes" : "front slope"}`);
  ctx.material(S1, "pir_50", Math.ceil(slope / 2.88 - 1e-9), `${fmt(slope)} m² ÷ 2.88`, `PIR 50 mm under rafters – ${velux ? "both slopes" : "front slope"}`);
  ctx.material(S1, "pir_100", Math.ceil(dormerWalls / 2.88 - 1e-9), `${velux ? "knee walls" : "dormer walls"} ${fmt(dormerWalls)} m² ÷ 2.88`, `PIR 100 mm – ${velux ? "knee walls" : "dormer walls"}`);
  ctx.material(S1, "acoustic_wool", Math.ceil(floorTotal), `floor ${fmt(floorTotal)} m²`, "Acoustic mineral wool between floor joists");
  ctx.labour(S1, "insulation_fit", slope + dormerWalls + floorTotal, `slope ${fmt(slope)} + walls ${fmt(dormerWalls)} + floor ${fmt(floorTotal)} m²`);
  const partitionFaces = studWall(ctx, S1, num(v, "internalWalls"), H, "landing / en-suite walls");

  const spots = byRooms ? 0 : num(v, "loftSpotlights");
  const elec: ElecSpec = {
    downlights: bedrooms * spots + 3 + (bool(v, "ensuite") ? 3 : 0),
    switches: bedrooms + 2 + (bool(v, "ensuite") ? 1 : 0),
    sockets: bedrooms * 4 + 1 + num(v, "extraSockets"),
    data: bedrooms, tv: bedrooms,
    fanIsolators: bool(v, "ensuite") ? 1 : 0, shaver: bool(v, "ensuite") ? 1 : 0, spurs: bool(v, "ensuite") ? 1 : 0,
  };
  // Room by room: each loft room carries its own electrics; the landing is priced here.
  const landing: ElecSpec = { downlights: 3, switches: 2, sockets: 1 };
  if (byRooms) electricsItems(ctx, S1, landing, { label: "loft landing" });
  else electricsItems(ctx, S1, elec, { label: `loft – ${bedrooms} bedroom${bedrooms > 1 ? "s" : ""}, landing${bool(v, "ensuite") ? ", en-suite" : ""}` });
  const alarms = num(v, "smokeAlarms");
  if (alarms) { ctx.material(S1, "smoke_alarm", alarms, `${alarms} alarms`); ctx.labour(S1, "smoke_alarms_fit", 1, "Interlinked on all floors"); }
  ctx.labour(S1, "heating_extend", 1, "Extend heating to loft");
  if (!byRooms) radiators(ctx, S1, num(v, "radiators"));
  if (beams > 0) ctx.material(S1, "intumescent", beamMetres, `${beams} beams, ${fmt(beamMetres)} m total`, "Fire protection to steel beams");

  const S2 = "Plastering";
  boardAndSkim(ctx, S2, ceiling + slope, "ceiling & slope", { board: "standard" });
  boardAndSkim(ctx, S2, Math.max(0, dormerWalls - openings) + partitionFaces, "dormer & stud walls");
  boardAndSkim(ctx, S2, partyWalls, "party walls", { fixing: "dab" });
  ctx.assume("Loft walls lined with 12.5 mm plasterboard and skimmed; party walls dot & dab. Fire-rated board where Building Control requires it.");

  if (!byRooms && bool(v, "ensuite")) {
    buildBathroom(ctx, s => `En-suite ${s.toLowerCase()}`, {
      length: 2.0, width: 1.6, height: Math.min(H, 2.3), layout: "SHOWER", supplyRun: 6, wasteRun: 3, grade: str(v, "ensuiteGrade") as "STANDARD" | "MID" | "PREMIUM",
      wallTiling: "FULL", floorTiling: true, ufh: false, towelRail: true, extractor: true, downlights: 2, strip: false, ceiling: false, decorate: true, newDoor: true,
    }, "En-suite");
    ctx.material("En-suite first fix", "soil_110", 2, "2 × 3 m branch to the stack", "110 mm soil pipe – en-suite branch");
    ctx.material("En-suite first fix", "soil_coupler", 2, "boss & coupler");
    ctx.labour("En-suite first fix", "soil_stack_extend", 1, "connect en-suite to the soil stack");
  }

  const S3 = "Second fix";
  const fireDoors = num(v, "fireDoors");
  newDoors(ctx, S3, fireDoors, "door_fire", { paint: true, label: "protected stair" });
  const floorArea = qty2(floorTotal * (velux ? 0.7 : 0.85) - (bool(v, "ensuite") ? 3.2 : 0));
  if (byRooms) {
    // The loft shell is boarded and skimmed here; each loft room adds its own flooring, skirting, electrics, heating and decoration.
    ctx.scope(`Loft shell: stairs, insulation, plasterboard and skim, ${fireDoors} FD30 fire doors, ${alarms} interlinked alarms and the heating extended; ${loftRooms.length ? `fit-out of ${loftRooms.map(r => r.name).join(", ")} is set out room by room` : "the loft rooms are fitted out room by room"}.`);
    return;
  }
  skirting(ctx, S3, 2 * (W + L));
  flooring(ctx, S3, floorArea, str(v, "flooring"), { perimeter: 2 * (W + L), doors: bedrooms + (bool(v, "ensuite") ? 1 : 0) });
  if (bool(v, "decorate")) {
    const walls = Math.max(0, dormerWalls - openings) + partyWalls + partitionFaces;
    paint(ctx, "Decoration", { label: "loft", ceilings: ceiling + slope, walls, newPlaster: ceiling + slope + walls, skirting: 2 * (W + L),
      windows: rearWindows + oWin + frontWindows + flatWindows + rearRoofWindows, radiators: num(v, "radiators"), system: str(v, "paintSystem"), newWood: true });
  }

  ctx.scope(`Insulate front slope (100 + 50 mm PIR), dormer walls (100 mm PIR) and floor (acoustic wool); plasterboard and skim throughout (${fmt(ceiling + slope + dormerWalls + partyWalls)} m²).`);
  ctx.scope(`Electrics for ${bedrooms} bedroom${bedrooms > 1 ? "s" : ""} and landing (${elecSummary(elec)}), ${alarms} mains interlinked smoke/heat alarms, ${num(v, "radiators")} radiators, ${fireDoors} FD30 fire doors to the protected stair.`);
  ctx.scope(`Skirting, ${flooringOptions.find(([k]) => k === str(v, "flooring"))?.[1].toLowerCase() ?? "flooring"} (${fmt(floorArea)} m²)${bool(v, "decorate") ? " and full decoration" : ""}.`);
}

/**
 * Lowered first floor ceilings: the new loft floor is hung lower, so the first floor ceilings come down and are renewed.
 * Rooms listed on the first floor renew their own ceiling (once); this prices the rest of the floor.
 */
function lowerFirstFloorCeilings(ctx: Ctx, v: Values, W: number, L: number) {
  const S = "First floor ceilings";
  const total = qty2(W * L * 0.85);
  const listed = ctx.input.rooms.filter(r => r.floor === "FIRST");
  const listedArea = qty2(listed.reduce((s, r) => s + r.length * r.width, 0));
  const rest = qty2(Math.max(0, total - listedArea));
  const by = num(v, "lowerBy");
  if (rest >= 1) {
    const label = listed.length ? `first floor not listed as rooms: ${fmt(total)} − ${fmt(listedArea)} m²` : `first floor ${fmt(W)} × ${fmt(L)} × 85% internal`;
    ctx.labour(S, "ceiling_pull_down", rest, label);
    boardAndSkim(ctx, S, rest, "lowered first floor ceilings");
    makeGood(ctx, S, qty2(rest * 0.3), "wall tops where ceilings were lowered");
    const lights = Math.max(1, Math.ceil(rest / 10));
    ctx.labour(S, "elec_reposition", lights, `${lights} light points (≈1 per 10 m²)`);
    paint(ctx, "Decoration", { label: "lowered first floor ceilings", ceilings: rest, newPlaster: rest });
  }
  const doors = num(v, "doorHeads");
  if (doors) { ctx.labour(S, "door_head_adjust", doors, `${doors} door${doors > 1 ? "s" : ""}`); ctx.material(S, "architrave_set", doors * 2, `${doors} doors × 2 sides`, "Architrave – adjusted door heads"); }
  ctx.scope(`Lower the first floor ceilings by about ${by} mm for loft head height: take down, new plasterboard and skim, make good wall tops, re-position light points${doors ? `, adjust ${doors} door head${doors > 1 ? "s" : ""}` : ""} and decorate${listed.length ? ` (${listed.map(r => r.name).join(", ")} priced in their room)` : ""}.`);
  ctx.assume("Lowered ceilings: first floor rooms listed on the quote have their new ceiling priced in the room, so no area is priced twice.");
}
