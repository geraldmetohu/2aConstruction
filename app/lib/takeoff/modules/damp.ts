import { bool, num, type WorkPackage } from "../package";
import { fmt } from "../util";

const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Damp proofing, timber treatment and structural repairs. */
export const dampPackage: WorkPackage = {
  id: "damp", label: "Damp proofing & structural repairs", short: "Damp & repairs",
  description: "Damp survey, injected damp proof course, re-plastering, tanking and cavity membranes, sump pumps, woodworm and rot treatment, joist repairs, crack stitching, lintels, wall ties, repointing and air bricks.",
  fields: [
    { key: "survey", label: "Damp & timber survey", type: "boolean", default: true, group: "Damp" },
    { key: "dpc", label: "Injected damp proof course", type: "number", unit: "m", default: 0, min: 0, max: 200, public: true, group: "Damp", hint: "Length of wall to inject" },
    { key: "replaster", label: "Hack off & re-plaster (salt-resistant)", type: "number", unit: "m²", default: 0, min: 0, max: 400, group: "Damp" },
    { key: "tanking", label: "Tanking slurry", type: "number", unit: "m²", default: 0, min: 0, max: 400, group: "Damp", hint: "Below-ground walls (Type A)" },
    { key: "membrane", label: "Cavity drain membrane", type: "number", unit: "m²", default: 0, min: 0, max: 400, group: "Damp", hint: "Type C waterproofing for cellars" },
    { key: "sump", label: "Sump pump", type: "boolean", default: false, group: "Damp", when: [{ key: "membrane", gt: 0 }] },
    { key: "airBricks", label: "Air bricks to fit / replace", type: "int", default: 0, min: 0, max: 30, group: "Damp" },

    { key: "timber", label: "Woodworm / rot treatment", type: "number", unit: "m²", default: 0, min: 0, max: 400, group: "Timber" },
    { key: "joistEnds", label: "Rotten joist ends to repair", type: "int", default: 0, min: 0, max: 40, group: "Timber" },

    { key: "cracks", label: "Crack stitching", type: "number", unit: "m", default: 0, min: 0, max: 100, public: true, group: "Structural" },
    { key: "lintels", label: "Failed lintels to replace", type: "int", default: 0, min: 0, max: 20, group: "Structural" },
    { key: "wallTies", label: "Remedial wall ties (wall area)", type: "number", unit: "m²", default: 0, min: 0, max: 600, group: "Structural" },
    { key: "repoint", label: "Repointing", type: "number", unit: "m²", default: 0, min: 0, max: 600, public: true, group: "Structural" },
    { key: "engineer", label: "Structural engineer's report", type: "boolean", default: false, group: "Structural" },
  ],
  needsScaffold: v => num(v, "repoint") > 20 || num(v, "wallTies") > 20,
  build(ctx, v) {
    if (bool(v, "survey")) { ctx.material("Survey", "damp_survey", 1, "1 survey"); ctx.scope("Survey: damp and timber survey with written report and moisture readings before work starts; the scope below is confirmed by the report.", "Survey"); }
    const dpc = num(v, "dpc"), rep = num(v, "replaster"), tank = num(v, "tanking"), mem = num(v, "membrane"), ab = num(v, "airBricks");
    if (dpc || rep || tank || mem || ab) {
      const S = "Damp proofing", p: string[] = [];
      if (dpc) { ctx.labour(S, "dpc_injection", dpc, `${fmt(dpc)} m`); ctx.material(S, "dpc_cream", ceil(dpc / 4), `${fmt(dpc)} m ÷ 4 m per cartridge`); p.push(`inject a chemical damp proof course along ${fmt(dpc)} m of wall`); }
      if (rep) { ctx.labour(S, "damp_hack_replaster", rep, `${fmt(rep)} m²`); ctx.material(S, "renovating_plaster", rep, `${fmt(rep)} m²`); p.push(`hack off contaminated plaster to 1 m high and re-plaster ${fmt(rep)} m² in salt-resistant renovating plaster with a skim finish`); }
      if (tank) { ctx.labour(S, "tanking_slurry", tank, `${fmt(tank)} m²`); ctx.material(S, "tanking_slurry_mat", ceil(tank / 4), `${fmt(tank)} m² ÷ 4 m² per bag (2 coats)`); p.push(`tank ${fmt(tank)} m² of below-ground wall in two coats of slurry`); }
      if (mem) { ctx.labour(S, "cavity_membrane", mem, `${fmt(mem)} m²`); ctx.material(S, "cavity_drain_membrane", ceil(mem * 1.1), `${fmt(mem)} m² + 10% laps`); p.push(`fit ${fmt(mem)} m² of cavity drain membrane, sealed at all joints`); }
      if (mem && bool(v, "sump")) { ctx.labour(S, "sump_pump_fit", 1, "1 sump"); ctx.material(S, "sump_pump", 1, "1 sump"); p.push("a sump chamber with twin pumps, battery back-up and high-level alarm"); }
      if (ab) { ctx.labour(S, "air_brick_fit", ab, `${ab} air bricks`); ctx.material(S, "air_brick", ab, `${ab} air bricks`); p.push(`fit ${ab} air brick${ab === 1 ? "" : "s"} to ventilate the sub-floor`); }
      ctx.scope(`Damp: ${p.join("; ")}. Damp-proofing guarantee issued on completion.`, S);
      if (rep) ctx.assume("New plaster must dry out before decorating – allow 4 weeks per 25 mm; use breathable paint for the first coat.");
    }
    const tim = num(v, "timber"), je = num(v, "joistEnds");
    if (tim || je) {
      const S = "Timber", p: string[] = [];
      if (tim) { ctx.labour(S, "timber_treatment", tim, `${fmt(tim)} m²`); ctx.material(S, "timber_treatment_fluid", ceil(tim / 25), `${fmt(tim)} m² ÷ 25 m² per 5 L`); p.push(`spray ${fmt(tim)} m² of timber against woodworm and rot`); }
      if (je) { ctx.labour(S, "joist_end_repair", je, `${je} joists`); ctx.material(S, "joist_timber", je, `${je} repairs`); p.push(`cut out and splice ${je} rotten joist end${je === 1 ? "" : "s"} with new C24 timber and hangers`); }
      ctx.scope(`Timber: ${p.join("; ")}.`, S);
    }
    const cr = num(v, "cracks"), lin = num(v, "lintels"), wt = num(v, "wallTies"), rp = num(v, "repoint");
    if (cr || lin || wt || rp || bool(v, "engineer")) {
      const S = "Structural repairs", p: string[] = [];
      if (bool(v, "engineer")) { ctx.material(S, "structural_engineer", 1, "1 report"); p.push("structural engineer's inspection and report with repair details"); }
      if (cr) { ctx.labour(S, "crack_stitch", cr, `${fmt(cr)} m`); ctx.material(S, "helical_bar", ceil(cr * 2), `${fmt(cr)} m × 2 bars per metre`); p.push(`stitch ${fmt(cr)} m of cracked brickwork with stainless helical bars and repoint to match`); }
      if (lin) { ctx.labour(S, "lintel_replace", lin, `${lin} lintels`); ctx.material(S, "lintel", lin * 1.5, `${lin} × 1.5 m`); p.push(`prop and replace ${lin} failed lintel${lin === 1 ? "" : "s"}, making good the brickwork`); }
      if (wt) { ctx.labour(S, "wall_tie_replace", wt, `${fmt(wt)} m²`); ctx.material(S, "remedial_wall_tie", ceil(wt * 2.5), `${fmt(wt)} m² × 2.5 ties/m²`); p.push(`isolate the old ties and fit remedial helical wall ties over ${fmt(wt)} m²`); }
      if (rp) { ctx.labour(S, "repointing", rp, `${fmt(rp)} m²`); ctx.material(S, "repointing_mortar", rp, `${fmt(rp)} m²`); p.push(`rake out and repoint ${fmt(rp)} m² of brickwork in a matching mortar`); }
      ctx.scope(`Structural: ${p.join("; ")}.`, S);
      if (cr || lin) ctx.assume("Movement is assumed historic and not ongoing; any active subsidence (for example from trees or drains) is investigated and priced separately.");
    }
  },
};
