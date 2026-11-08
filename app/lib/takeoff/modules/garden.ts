import { bool, num, str, type Field, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";
import type { Ctx } from "../engine";

const ceil = (x: number) => Math.ceil(x - 1e-9);
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

const area = (key: string, label: string, group: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "number", unit: "m²", default: 0, min: 0, max: 5000, public: true, group, ...extra });
const metres = (key: string, label: string, group: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "number", unit: "m", default: 0, min: 0, max: 2000, group, ...extra });
const count = (key: string, label: string, group: string, max = 30, extra: Partial<Field> = {}): Field => ({ key, label, type: "int", default: 0, min: 0, max, group, ...extra });

export const pavingOptions: [string, string][] = [["paving_porcelain", "Outdoor porcelain"], ["paving_sandstone", "Indian sandstone"], ["paving_concrete", "Concrete slabs"]];
export const driveOptions: [string, string][] = [["BLOCK", "Block paving"], ["RESIN", "Resin-bound"], ["TARMAC", "Tarmac"], ["GRAVEL", "Gravel on stabiliser grid"]];

/** Excavate, sub-base and spoil removal for a hard surface. Depth in metres. */
function base(ctx: Ctx, S: string, A: number, depth: number, subBase: number, what: string) {
  ctx.labour(S, "excavate_reduce", A, `${what} ${fmt(A)} m² to ${depth * 1000} mm`);
  ctx.material(S, "muck_away", Math.max(1, ceil(A * depth * 1.3 / 8)), `${fmt(A)} m² × ${depth} m × 1.3 bulking ÷ 8 m³`);
  ctx.material(S, "hardcore_mot", qty2(A * subBase * 2), `${fmt(A)} m² × ${subBase} m × 2 t/m³`);
  ctx.labour(S, "sub_base_lay", A, `${fmt(A)} m²`);
}

function paving(ctx: Ctx, S: string, A: number, slab: string, what: string) {
  base(ctx, S, A, 0.15, 0.1, what);
  ctx.material(S, "sharp_sand", qty2(A * 0.04 * 1.6), `${fmt(A)} m² × 40 mm bed × 1.6 t/m³`);
  ctx.material(S, "mortar_cement", ceil(A / 3), `1 bag per 3 m² of bed (6 : 1)`);
  ctx.material(S, slab, ceil(A * 1.1), `${fmt(A)} m² + 10% cutting`);
  ctx.material(S, "paving_primer", A, `${fmt(A)} m²`);
  ctx.material(S, "patio_jointing", ceil(A / 10), `${fmt(A)} m² ÷ 10 m²`);
  ctx.labour(S, "patio_lay", A, `${what} ${fmt(A)} m²`);
}

function gravel(ctx: Ctx, S: string, A: number, what: string, depth = 0.1) {
  base(ctx, S, A, depth, depth > 0.1 ? 0.1 : 0.05, what);
  ctx.material(S, "weed_membrane", ceil(A * 1.1), `${fmt(A)} m² + 10% laps`);
  ctx.material(S, "gravel_grid", ceil(A), `${fmt(A)} m²`);
  ctx.material(S, "gravel_decorative", ceil(A * 0.05 * 1.6 / 0.8), `${fmt(A)} m² × 50 mm × 1.6 t/m³ ÷ 0.8 t`);
  ctx.labour(S, "gravel_lay", A, `${fmt(A)} m²`);
}

/**
 * Garden, landscaping and outside groundworks. Every item starts at 0, so only what is measured is priced.
 * Stages run in site order: clearance → groundworks & hard landscaping → structures → soft landscaping → maintenance.
 */
export const gardenPackage: WorkPackage = {
  id: "garden", label: "Garden & landscaping", short: "Garden",
  description: "Garden clearance, tree work, lawns and artificial grass, patios, paths, driveways, decking, fencing, walls, flowerbeds and maintenance.",
  fields: [
    area("clearance", "Clear overgrown garden", "Clearance & trees"),
    count("treesSmall", "Small trees to fell (under 5 m)", "Clearance & trees", 20, { public: true }),
    count("treesLarge", "Large trees to fell (over 5 m)", "Clearance & trees", 10, { public: true }),
    count("treesPrune", "Trees to crown reduce / prune", "Clearance & trees", 20),
    count("stumps", "Stumps to grind out", "Clearance & trees", 30),
    metres("hedge", "Hedge to trim", "Clearance & trees"),

    area("turf", "New lawn – natural turf", "Lawn"),
    area("artificial", "Artificial grass", "Lawn"),
    { key: "artificialType", label: "Artificial grass type", type: "select", default: "artificial_turf_30", clientChoice: true, group: "Lawn", options: [["artificial_turf_30", "30 mm standard"], ["artificial_turf_40", "40 mm premium"]], when: [{ key: "artificial", gt: 0 }] },

    area("patio", "Patio", "Patio & paths"),
    { key: "patioSlab", label: "Patio paving", type: "select", default: "paving_porcelain", options: pavingOptions, clientChoice: true, public: true, group: "Patio & paths", when: [{ key: "patio", gt: 0 }] },
    area("path", "Paths", "Patio & paths"),
    { key: "pathType", label: "Path finish", type: "select", default: "PAVED", group: "Patio & paths", options: [["PAVED", "Paved (as the patio)"], ["GRAVEL", "Gravel on stabiliser grid"]], when: [{ key: "path", gt: 0 }] },
    { key: "pathWidth", label: "Path width", type: "number", unit: "m", default: 1, min: 0.5, max: 4, group: "Patio & paths", when: [{ key: "path", gt: 0 }] },

    area("driveway", "Driveway", "Driveway"),
    { key: "driveType", label: "Driveway surface", type: "select", default: "BLOCK", options: driveOptions, clientChoice: true, public: true, group: "Driveway", when: [{ key: "driveway", gt: 0 }] },
    metres("kerbs", "Kerbs / edging", "Driveway", { hint: "Edge restraint round the drive", when: [{ key: "driveway", gt: 0 }] }),
    metres("channel", "Drainage channel", "Driveway", { hint: "Water must drain to a permeable area or soakaway", when: [{ key: "driveway", gt: 0 }] }),
    count("soakaways", "Soakaways", "Driveway", 4),

    area("decking", "Decking", "Decking"),
    { key: "deckBoard", label: "Deck boards", type: "select", default: "deck_board_softwood", clientChoice: true, public: true, group: "Decking", options: [["deck_board_softwood", "Treated softwood"], ["deck_board_composite", "Composite"]], when: [{ key: "decking", gt: 0 }] },
    metres("deckRail", "Balustrade & handrail", "Decking", { when: [{ key: "decking", gt: 0 }] }),

    metres("fencing", "Fencing", "Fencing & walls", { public: true }),
    { key: "fenceHeight", label: "Fence height", type: "select", default: "1.8", group: "Fencing & walls", options: [["1.2", "1.2 m"], ["1.5", "1.5 m"], ["1.8", "1.8 m"]], when: [{ key: "fencing", gt: 0 }] },
    { key: "fenceType", label: "Fence type", type: "select", default: "CLOSE_BOARD", clientChoice: true, public: true, group: "Fencing & walls", options: [["CLOSE_BOARD", "Close-board (feather edge)"], ["PANEL", "Panels on concrete posts"]], when: [{ key: "fencing", gt: 0 }] },
    { key: "fenceRemove", label: "Take down the old fence", type: "boolean", default: true, group: "Fencing & walls", when: [{ key: "fencing", gt: 0 }] },
    count("gates", "Garden gates", "Fencing & walls", 6),
    metres("wall", "Brick garden wall (900 mm)", "Fencing & walls"),
    metres("retaining", "Retaining wall", "Fencing & walls"),
    { key: "retainingType", label: "Retaining wall type", type: "select", default: "SLEEPER", group: "Fencing & walls", options: [["SLEEPER", "Timber sleepers (up to 600 mm)"], ["BLOCK", "Block, rendered & capped (up to 900 mm)"]], when: [{ key: "retaining", gt: 0 }] },
    count("steps", "Garden steps", "Fencing & walls", 30),

    area("beds", "New flowerbeds", "Planting"),
    { key: "planting", label: "Supply & plant the beds", type: "boolean", default: true, group: "Planting", when: [{ key: "beds", gt: 0 }] },
    metres("bedEdging", "Steel edging to beds / lawn", "Planting"),
    metres("raisedBeds", "Raised sleeper beds (length)", "Planting"),

    area("levelling", "Level / grade the ground", "Levels & structures", { public: false }),
    { key: "topsoilImport", label: "Import topsoil", type: "number", unit: "m³", default: 0, min: 0, max: 500, group: "Levels & structures" },
    area("shedBase", "Concrete base for shed / garden room", "Levels & structures", { public: false }),
    count("sheds", "Sheds / summerhouses to assemble (your kit)", "Levels & structures", 5),
    count("pergolas", "Pergolas", "Levels & structures", 5),
    count("lights", "Garden lights", "Lighting & water", 30),
    metres("lightCable", "Armoured cable run for the lights", "Lighting & water", { default: 15, when: [{ key: "lights", gt: 0 }] }),
    count("irrigation", "Irrigation zones", "Lighting & water", 10),
    { key: "designPlan", label: "Garden design & planting plan", type: "boolean", default: false, public: true, group: "Design & extras", hint: "Drawn plan with planting list before we start" },
    area("gardenRoom", "Garden room / office (floor area)", "Design & extras"),
    count("outdoorKitchen", "Outdoor kitchen / BBQ area", "Design & extras", 2),
    count("waterFeature", "Water feature / small pond", "Design & extras", 4),
    area("playArea", "Play area (rubber mulch / bark)", "Design & extras", { public: false }),
    count("stores", "Bin / log stores", "Design & extras", 6),
    metres("trellis", "Trellis on fences / walls", "Design & extras"),
    metres("fenceStain", "Stain / paint existing fence", "Design & extras"),
    metres("hedgePlant", "New hedge planting", "Planting"),
    count("treePlant", "Trees to plant", "Planting", 30),
    area("lawnCare", "Lawn renovation: scarify, aerate & feed", "Maintenance", { public: false }),
    count("rubbish", "Rubbish clearance loads (man & van)", "Maintenance", 20),
    count("maintenance", "Maintenance visits", "Maintenance", 52, { hint: "Mow, trim, weed and tidy – per visit" }),
  ],
  needsScaffold: () => false,
  skips: v => Number(v.clearance) > 0 ? 1 : 0,
  build(ctx, v) {
    const did: string[] = [];
    const C = "Clearance", G = "Groundworks", H = "Hard landscaping", T = "Structures", Sft = "Soft landscaping", M = "Maintenance";

    // Clearance & trees
    const clear = num(v, "clearance");
    if (clear) { ctx.labour(C, "garden_clearance", clear, `${fmt(clear)} m²`); ctx.material(C, "green_waste", Math.max(1, ceil(clear / 30)), `${fmt(clear)} m² ÷ 30 m² per load`); did.push(`clear ${fmt(clear)} m² of overgrown garden and remove the waste`); }
    const ts = num(v, "treesSmall"), tl = num(v, "treesLarge"), tp = num(v, "treesPrune"), st = num(v, "stumps"), hedge = num(v, "hedge");
    if (ts) ctx.labour(C, "tree_fell_small", ts, n(ts, "tree"));
    if (tl) ctx.labour(C, "tree_fell_large", tl, n(tl, "tree"));
    if (tp) ctx.labour(C, "tree_prune", tp, n(tp, "tree"));
    if (st) ctx.labour(C, "stump_grind", st, n(st, "stump"));
    if (hedge) ctx.labour(C, "hedge_trim", hedge, `${fmt(hedge)} m`);
    const treeLoads = ceil(ts * 0.5 + tl * 2 + tp * 0.5 + hedge / 40);
    if (treeLoads) ctx.material(C, "green_waste", treeLoads, `small trees × 0.5 + large × 2 + pruning × 0.5 + hedge ÷ 40 m`, "Green waste removal – tree work");
    const trees = [ts && `fell ${n(ts, "small tree")}`, tl && `fell ${n(tl, "large tree")}`, tp && `crown reduce ${n(tp, "tree")}`, st && `grind out ${n(st, "stump")}`, hedge && `trim ${fmt(hedge)} m of hedge`].filter(Boolean);
    if (trees.length) { did.push(`${trees.join(", ")} and take away the arisings`); ctx.assume("Tree work is subject to there being no Tree Preservation Order or conservation area restriction; we check with the council before starting."); }

    // Patio, paths, driveway
    const patio = num(v, "patio");
    if (patio) { paving(ctx, H, patio, str(v, "patioSlab"), "patio"); did.push(`${fmt(patio)} m² ${ctx.rates.materials[str(v, "patioSlab")]?.name.toLowerCase() ?? "paved"} patio on MOT Type 1 and a full mortar bed, primed and pointed, laid to falls away from the house`); }
    const path = num(v, "path");
    if (path) {
      const width = num(v, "pathWidth"), edge = qty2(2 * path / width);
      if (str(v, "pathType") === "GRAVEL") {
        gravel(ctx, H, path, "path");
        ctx.material(H, "kerb_edging", ceil(edge), `2 sides × ${fmt(path)} m² ÷ ${fmt(width)} m wide`);
        ctx.labour(H, "kerb_lay", edge, `${fmt(edge)} m edging`);
        did.push(`${fmt(path)} m² of gravel paths on membrane and stabiliser grid with edging`);
      } else { paving(ctx, H, path, str(v, "patioSlab"), "paths"); did.push(`${fmt(path)} m² of paved paths`); }
    }
    const drive = num(v, "driveway");
    if (drive) {
      const type = str(v, "driveType");
      if (type === "GRAVEL") gravel(ctx, G, drive, "driveway", 0.2);
      else {
        base(ctx, G, drive, 0.2, 0.15, "driveway");
        if (type === "BLOCK") {
          ctx.material(H, "sharp_sand", qty2(drive * 0.05 * 1.6), `${fmt(drive)} m² × 50 mm × 1.6 t/m³`);
          ctx.material(H, "block_paving", ceil(drive * 1.05), `${fmt(drive)} m² + 5% cutting`);
          ctx.material(H, "kiln_sand", ceil(drive / 10), `${fmt(drive)} m² ÷ 10 m² per bag`);
          ctx.labour(H, "block_paving_lay", drive, `${fmt(drive)} m²`);
        } else if (type === "TARMAC") {
          ctx.material(H, "tarmac", drive, `${fmt(drive)} m²`); ctx.labour(H, "tarmac_lay", drive, `${fmt(drive)} m²`);
        } else {
          ctx.material(H, "tarmac", drive, `${fmt(drive)} m² base course`, "Tarmac base course for the resin"); ctx.labour(H, "tarmac_lay", drive, `${fmt(drive)} m² base`);
          ctx.material(H, "resin_bound", drive, `${fmt(drive)} m²`); ctx.labour(H, "resin_drive", drive, `${fmt(drive)} m²`);
        }
      }
      const kerbs = num(v, "kerbs");
      if (kerbs) { ctx.material(G, "kerb_edging", ceil(kerbs), `${fmt(kerbs)} m`); ctx.material(G, "concrete_c25", qty2(kerbs * 0.03), `${fmt(kerbs)} m × 0.03 m³ haunching`); ctx.labour(G, "kerb_lay", kerbs, `${fmt(kerbs)} m`); }
      const ch = num(v, "channel");
      if (ch) { ctx.material(G, "drain_channel", ceil(ch), `${fmt(ch)} m`); ctx.labour(G, "drainage_channel", ch, `${fmt(ch)} m`); }
      did.push(`${fmt(drive)} m² ${driveOptions.find(([k]) => k === type)?.[1].toLowerCase()} driveway: dig out 200 mm, remove spoil, MOT Type 1 sub-base${kerbs ? `, ${fmt(kerbs)} m of kerbs` : ""}${ch ? `, ${fmt(ch)} m drainage channel` : ""}`);
      ctx.assume("A new or widened dropped kerb needs council approval and is not included unless listed. Front driveways over 5 m² must be permeable or drain to a permeable area (no planning needed when they do).");
    }
    const soak = num(v, "soakaways");
    if (soak) { ctx.material(G, "soakaway_crate", soak, n(soak, "soakaway")); ctx.labour(G, "soakaway_build", soak, n(soak, "soakaway")); did.push(n(soak, "new soakaway")); }

    // Structures: decking, fencing, gates, walls
    const deck = num(v, "decking");
    if (deck) {
      const board = str(v, "deckBoard"), posts = ceil(deck / 1.5);
      ctx.material(T, "weed_membrane", ceil(deck * 1.1), `${fmt(deck)} m² + 10%`);
      ctx.material(T, "deck_frame_timber", deck, `${fmt(deck)} m²`);
      ctx.material(T, "postcrete", posts, `1 post per 1.5 m² = ${posts}`);
      ctx.labour(T, "deck_frame", deck, `${fmt(deck)} m²`);
      ctx.material(T, board, ceil(deck * 1.1), `${fmt(deck)} m² + 10% cutting`);
      ctx.material(T, "deck_fixings", deck, `${fmt(deck)} m²`);
      ctx.labour(T, "deck_board_fix", deck, `${fmt(deck)} m²`);
      const rail = num(v, "deckRail");
      if (rail) { ctx.material(T, "deck_rail", rail, `${fmt(rail)} m`); ctx.labour(T, "deck_balustrade", rail, `${fmt(rail)} m`); }
      did.push(`${fmt(deck)} m² ${board === "deck_board_composite" ? "composite" : "treated softwood"} deck on a treated frame over weed membrane${rail ? ` with ${fmt(rail)} m of balustrade` : ""}`);
      ctx.assume("Decking more than 300 mm above ground may need planning permission.");
    }
    const fence = num(v, "fencing");
    if (fence) {
      const posts = ceil(fence / 1.83) + 1, panel = str(v, "fenceType") === "PANEL";
      if (bool(v, "fenceRemove")) { ctx.labour(T, "fence_remove", fence, `${fmt(fence)} m`); ctx.material(T, "skip_8yd", 1, "old fence", "Skip for the old fence"); }
      const h = str(v, "fenceHeight"), kit = `${panel ? "fence_panel_kit" : "fence_closeboard_kit"}${h === "1.8" ? "" : `_${h.replace(".", "")}`}`;
      ctx.material(T, kit, ceil(fence), `${fmt(fence)} m`);
      ctx.material(T, "postcrete", posts * 2, `${posts} posts × 2 bags`);
      ctx.labour(T, panel ? "fence_panel" : "fence_closeboard", fence, `${fmt(fence)} m, ${posts} posts`);
      did.push(`${bool(v, "fenceRemove") ? "take down the old fence and " : ""}put up ${fmt(fence)} m of ${str(v, "fenceHeight")} m ${panel ? "panel fencing on concrete posts" : "close-board fencing"} with gravel boards`);
    }
    const gates = num(v, "gates");
    if (gates) { ctx.material(T, "garden_gate", gates, n(gates, "gate")); ctx.labour(T, "gate_fit", gates, n(gates, "gate")); did.push(n(gates, "new garden gate")); }
    const wall = num(v, "wall");
    if (wall) { ctx.material(T, "brick_wall_mat", wall, `${fmt(wall)} m`); ctx.labour(T, "garden_wall", wall, `${fmt(wall)} m`); did.push(`${fmt(wall)} m of 900 mm brick garden wall on a concrete footing with coping`); }

    const ret = num(v, "retaining");
    if (ret) {
      if (str(v, "retainingType") === "BLOCK") { ctx.material(T, "retaining_block_mat", ret, `${fmt(ret)} m`); ctx.labour(T, "retaining_block", ret, `${fmt(ret)} m`); }
      else { ctx.material(T, "sleepers", ceil(ret * 3), `${fmt(ret)} m × 3 courses`); ctx.material(T, "postcrete", ceil(ret), `1 post per m`); ctx.labour(T, "retaining_sleeper", ret, `${fmt(ret)} m`); }
      did.push(`${fmt(ret)} m ${str(v, "retainingType") === "BLOCK" ? "rendered block" : "timber sleeper"} retaining wall`);
      ctx.assume("Retaining walls over 1 m high, or holding up a neighbour's ground or a drive, need an engineer's design and are priced separately.");
    }
    const steps = num(v, "steps");
    if (steps) { ctx.material(T, "step_mat", steps, n(steps, "step")); ctx.labour(T, "garden_steps", steps, n(steps, "step")); did.push(n(steps, "garden step")); }

    // Levels, bases, sheds, pergolas
    const L2 = "Levels & structures";
    const lev = num(v, "levelling"), soil = num(v, "topsoilImport");
    if (lev) { ctx.labour(G, "garden_level", lev, `${fmt(lev)} m²`); did.push(`level and grade ${fmt(lev)} m²`); }
    if (soil) { ctx.material(G, "topsoil", ceil(soil / 0.75), `${fmt(soil)} m³ ÷ 0.75 m³ per bag`); ctx.labour(G, "spread_topsoil", soil, `${fmt(soil)} m³`); did.push(`import and spread ${fmt(soil)} m³ of topsoil`); }
    const base2 = num(v, "shedBase");
    if (base2) { ctx.labour(L2, "excavate_reduce", base2, `base ${fmt(base2)} m²`); ctx.material(L2, "hardcore_mot", qty2(base2 * 0.1 * 2), `${fmt(base2)} m² × 100 mm × 2 t/m³`); ctx.material(L2, "concrete_c25", qty2(base2 * 0.1 * 1.05), `${fmt(base2)} m² × 100 mm + 5%`); ctx.labour(L2, "shed_base", base2, `${fmt(base2)} m²`); did.push(`${fmt(base2)} m² concrete base`); }
    const sheds = num(v, "sheds"), perg = num(v, "pergolas");
    if (sheds) { ctx.labour(L2, "shed_install", sheds, n(sheds, "building")); did.push(`assemble ${n(sheds, "shed / summerhouse", "sheds / summerhouses")} (your kit)`); }
    if (perg) { ctx.material(L2, "pergola_kit", perg, n(perg, "pergola")); ctx.labour(L2, "pergola_build", perg, n(perg, "pergola")); did.push(n(perg, "timber pergola")); }

    // Lighting & water
    const lights = num(v, "lights"), irr = num(v, "irrigation");
    if (lights) {
      const run = num(v, "lightCable");
      ctx.material("Lighting & water", "garden_light", lights, n(lights, "light"));
      ctx.labour("Lighting & water", "elec_outside", lights, n(lights, "light point"), "Connect garden light (sealed, RCD protected)");
      if (run) { ctx.material("Lighting & water", "swa_cable", ceil(run * 1.1), `${fmt(run)} m + 10%`); ctx.labour("Lighting & water", "swa_trench", run, `${fmt(run)} m`); }
      did.push(`${n(lights, "garden light")} on armoured cable${run ? ` (${fmt(run)} m in duct)` : ""}, tested and certified`);
    }
    if (irr) { ctx.material("Lighting & water", "irrigation_kit", irr, n(irr, "zone")); ctx.labour("Lighting & water", "irrigation_zone", irr, n(irr, "zone")); did.push(`${n(irr, "irrigation zone")} with timer`); }

    // Soft landscaping
    const turf = num(v, "turf");
    if (turf) {
      ctx.material(Sft, "topsoil", ceil(turf * 0.05 / 0.75), `${fmt(turf)} m² × 50 mm ÷ 0.75 m³`);
      ctx.material(Sft, "turf_roll", ceil(turf * 1.05), `${fmt(turf)} m² + 5%`);
      ctx.labour(Sft, "turf_lay", turf, `${fmt(turf)} m²`);
      did.push(`${fmt(turf)} m² of new turf on levelled topsoil`);
    }
    const art = num(v, "artificial");
    if (art) {
      ctx.material(Sft, "muck_away", Math.max(1, ceil(art * 0.075 * 1.3 / 8)), `${fmt(art)} m² × 75 mm × 1.3 ÷ 8 m³`);
      ctx.material(Sft, "hardcore_mot", qty2(art * 0.05 * 2), `${fmt(art)} m² × 50 mm × 2 t/m³`);
      ctx.material(Sft, "sharp_sand", qty2(art * 0.025 * 1.6), `${fmt(art)} m² × 25 mm × 1.6 t/m³`);
      ctx.material(Sft, "weed_membrane", ceil(art * 1.1), `${fmt(art)} m² + 10%`);
      ctx.material(Sft, str(v, "artificialType"), ceil(art * 1.1), `${fmt(art)} m² + 10% cutting`);
      ctx.material(Sft, "turf_tape", ceil(art / 4), `joins every 4 m roll width`);
      ctx.material(Sft, "turf_pins", ceil(art / 25), `${fmt(art)} m² ÷ 25 m²`);
      ctx.material(Sft, "kiln_sand", ceil(art / 5), `5 kg/m² infill ÷ 25 kg`);
      ctx.labour(Sft, "artificial_turf_lay", art, `${fmt(art)} m²`);
      did.push(`${fmt(art)} m² of ${str(v, "artificialType") === "artificial_turf_40" ? "40 mm" : "30 mm"} artificial grass on a compacted base, sand and weed membrane, joined, pinned and infilled`);
    }
    const beds = num(v, "beds");
    if (beds) {
      ctx.material(Sft, "topsoil", ceil(beds * 0.15 / 0.75), `${fmt(beds)} m² × 150 mm ÷ 0.75 m³`);
      ctx.material(Sft, "compost", ceil(beds / 2), `${fmt(beds)} m² ÷ 2 m² per bag`);
      ctx.labour(Sft, "flowerbed_prep", beds, `${fmt(beds)} m²`);
      if (bool(v, "planting")) {
        ctx.material(Sft, "plants_allowance", beds, `${fmt(beds)} m²`);
        ctx.material(Sft, "bark_mulch", ceil(beds / 1.4), `${fmt(beds)} m² × 50 mm ÷ 70 L`);
        ctx.labour(Sft, "planting", beds, `${fmt(beds)} m²`);
        ctx.assume("Plants are a provisional allowance of £15 per m² of bed; the planting plan is agreed with you before ordering.");
      }
      did.push(`${fmt(beds)} m² of new flowerbeds dug over with topsoil and compost${bool(v, "planting") ? ", planted and mulched" : ""}`);
    }
    const edging = num(v, "bedEdging");
    if (edging) { ctx.material(Sft, "lawn_edging", ceil(edging), `${fmt(edging)} m`); ctx.labour(Sft, "kerb_lay", qty2(edging * 0.4), `${fmt(edging)} m steel edging ≈ 40% of kerb time`, "Fit steel bed / lawn edging"); did.push(`${fmt(edging)} m of steel edging`); }
    const raised = num(v, "raisedBeds");
    if (raised) { ctx.material(Sft, "sleepers", ceil(raised * 2), `${fmt(raised)} m × 2 courses`); ctx.material(Sft, "topsoil", ceil(raised * 0.3 / 0.75), `${fmt(raised)} m × 0.3 m³/m ÷ 0.75`); ctx.labour(Sft, "raised_bed", raised, `${fmt(raised)} m`); did.push(`${fmt(raised)} m of raised sleeper beds filled with topsoil`); }

    // Design & extras
    const E = "Garden extras";
    if (bool(v, "designPlan")) { ctx.material(E, "design_plan", 1, "1 plan"); did.push("garden design and planting plan agreed with you before we start"); }
    const gr = num(v, "gardenRoom");
    if (gr) { ctx.material(E, "garden_room_mat", gr, `${fmt(gr)} m²`); ctx.labour(E, "garden_room_build", gr, `${fmt(gr)} m²`); did.push(`${fmt(gr)} m² insulated garden room / office with base, cladding, EPDM roof, glazing and electrics`);
      ctx.assume("A garden room under 2.5 m high (within 2 m of a boundary) and under 15 m² usually needs no planning or Building Regulations; larger ones are checked first."); }
    const ok = num(v, "outdoorKitchen"); if (ok) { ctx.material(E, "outdoor_kitchen_mat", ok, n(ok, "kitchen")); ctx.labour(E, "outdoor_kitchen", ok, n(ok, "kitchen")); did.push(`${n(ok, "outdoor kitchen / BBQ area")} (BBQ appliance by you)`); }
    const wf = num(v, "waterFeature"); if (wf) { ctx.material(E, "water_feature_kit", wf, n(wf, "feature")); ctx.labour(E, "water_feature", wf, n(wf, "feature")); did.push(n(wf, "water feature")); }
    const play = num(v, "playArea"); if (play) { ctx.material(E, "rubber_mulch", ceil(play), `${fmt(play)} m²`); ctx.labour(E, "play_surface", play, `${fmt(play)} m²`); did.push(`${fmt(play)} m² play area surface`); }
    const st2 = num(v, "stores"); if (st2) { ctx.material(E, "store_kit", st2, n(st2, "store")); ctx.labour(E, "store_build", st2, n(st2, "store")); did.push(n(st2, "bin / log store")); }
    const tr = num(v, "trellis"); if (tr) { ctx.material(E, "trellis", ceil(tr), `${fmt(tr)} m`); ctx.labour(E, "trellis_fit", tr, `${fmt(tr)} m`); did.push(`${fmt(tr)} m of trellis`); }
    const fs = num(v, "fenceStain"); if (fs) { ctx.material(E, "fence_stain_tin", ceil(fs / 25), `${fmt(fs)} m ÷ 25 m`); ctx.labour(E, "fence_stain", fs, `${fmt(fs)} m`); did.push(`stain ${fmt(fs)} m of fence both sides`); }
    const hp = num(v, "hedgePlant"); if (hp) { ctx.material(Sft, "hedge_plants", ceil(hp), `${fmt(hp)} m`); ctx.material(Sft, "compost", ceil(hp / 2), "1 bag per 2 m"); ctx.labour(Sft, "hedge_plant", hp, `${fmt(hp)} m`); did.push(`plant ${fmt(hp)} m of new hedge`); }
    const tp2 = num(v, "treePlant"); if (tp2) { ctx.material(Sft, "tree_standard", tp2, n(tp2, "tree")); ctx.labour(Sft, "tree_plant", tp2, n(tp2, "tree")); did.push(`plant ${n(tp2, "new tree")}`); }

    // Maintenance
    const lc = num(v, "lawnCare"); if (lc) { ctx.labour(M, "lawn_care", lc, `${fmt(lc)} m²`); ctx.material(M, "topsoil", ceil(lc * 0.005 / 0.75), "5 mm top dressing"); did.push(`renovate ${fmt(lc)} m² of lawn (scarify, aerate, top-dress, feed)`); }
    const rb = num(v, "rubbish"); if (rb) { ctx.labour(M, "rubbish_removal", rb, n(rb, "load")); did.push(`clear ${n(rb, "load")} of rubbish`); }
    const visits = num(v, "maintenance");
    if (visits) { ctx.labour(M, "garden_maintenance", visits, n(visits, "visit")); ctx.material(M, "green_waste", ceil(visits / 4), `1 load per 4 visits`); did.push(`${n(visits, "maintenance visit")} (mow, trim, weed and tidy)`); }

    if (did.length) ctx.scope(`Garden: ${did.join("; ")}.`);
    else ctx.warn("Garden & landscaping is switched on but nothing is measured yet.");
    if (patio || path || drive || deck || fence || wall || soak || ret || base2) ctx.assume("Groundworks assume normal soil with no hidden obstructions, rock or contaminated ground; services are located before digging.");
  },
};
