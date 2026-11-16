import { bool, num, type WorkPackage } from "../package";
import { fmt } from "../util";

const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Basement: convert an existing cellar or dig out a new basement under the house. */
export const basementPackage: WorkPackage = {
  id: "basement", label: "Basement & cellar conversion", short: "Basement",
  description: "Convert a cellar into a dry, habitable room or dig a new basement: underpinning by design, Type C waterproofing with sump, insulated slab, lightwells and a new staircase.",
  fields: [
    { key: "floorArea", label: "Basement floor area", type: "number", unit: "m²", default: 25, min: 5, max: 200, public: true, group: "Basement" },
    { key: "newDig", label: "Dig out a new basement (not an existing cellar)", type: "boolean", default: false, public: true, group: "Basement" },
    { key: "lowerBy", label: "Lower the floor by", type: "number", unit: "m", default: 0.3, min: 0, max: 3.5, group: "Basement", hint: "Cellar: to reach 2.3 m headroom. New dig: full depth (≈ 2.8 m)" },
    { key: "wallArea", label: "Wall area to waterproof", type: "number", unit: "m²", default: 50, min: 0, max: 600, group: "Waterproofing" },
    { key: "lightwells", label: "Lightwells", type: "int", default: 0, min: 0, max: 4, public: true, group: "Openings" },
    { key: "stairs", label: "New staircase into the basement", type: "boolean", default: false, group: "Openings" },
    { key: "partyWall", label: "Party wall surveyors (provisional sum)", type: "number", unit: "£", default: 2000, min: 0, max: 20000, group: "Fees", hint: "Most basements are notifiable under the Party Wall Act" },
  ],
  needsScaffold: () => false,
  skips: () => 0, // spoil goes by conveyor & grab lorry, priced in the dig
  build(ctx, v) {
    const A = num(v, "floorArea"), dig = bool(v, "newDig"), depth = num(v, "lowerBy") || (dig ? 2.8 : 0), W = num(v, "wallArea");
    const S1 = "Excavation";
    if (depth > 0) {
      const vol = Math.round(A * depth * 10) / 10, weeks = Math.max(1, ceil(vol / 25));
      ctx.labour(S1, "basement_dig", vol, `${fmt(A)} m² × ${fmt(depth)} m`);
      ctx.material(S1, "spoil_conveyor", weeks, `${fmt(vol)} m³ ÷ 25 m³ a week`);
      ctx.material(S1, "muck_away", ceil(vol * 1.3 / 8), `${fmt(vol)} m³ × 1.3 bulking ÷ 8 m³`);
      ctx.scope(`Excavation: ${dig ? "dig out a new basement" : "lower the cellar floor"} by ${fmt(depth)} m over ${fmt(A)} m² (${fmt(vol)} m³), by hand and conveyor, with temporary propping and underpinning in sequence to the engineer's design; spoil removed by grab lorry.`, S1);
      ctx.assume("Underpinning, retaining walls and temporary works are to the structural engineer's design; the price assumes London clay or similar with no rock and the water table below the dig.");
      if (dig) ctx.warn("A new basement needs planning permission in most boroughs, a construction method statement and building control – allow for these before the start date.");
    }
    const S2 = "Waterproofing";
    ctx.labour(S2, "cavity_membrane", A + W, `${fmt(W)} m² walls + ${fmt(A)} m² floor`);
    ctx.material(S2, "cavity_drain_membrane", ceil((A + W) * 1.1), `${fmt(A + W)} m² + 10% laps`);
    ctx.labour(S2, "sump_pump_fit", 1, "1 sump"); ctx.material(S2, "sump_pump", 1, "1 sump");
    ctx.labour(S2, "basement_slab", A, `${fmt(A)} m²`); ctx.material(S2, "basement_slab_kit", A, `${fmt(A)} m²`);
    ctx.scope(`Waterproofing: Type C cavity drain membrane to ${fmt(W)} m² of walls and the ${fmt(A)} m² floor, perimeter drainage to a sump with twin pumps, battery back-up and alarm; reinforced insulated slab and screed (BS 8102 grade 3 – habitable).`, S2);
    const lw = num(v, "lightwells");
    if (lw || bool(v, "stairs")) {
      const S = "Openings";
      if (lw) { ctx.labour(S, "lightwell_build", lw, `${lw} lightwells`); ctx.material(S, "lightwell_kit", lw, `${lw} lightwells`); }
      if (bool(v, "stairs")) { ctx.labour(S, "basement_stairs", 1, "1 staircase"); ctx.material(S, "basement_stair_kit", 1, "1 staircase"); }
      ctx.scope(`Openings: ${[lw ? `${lw} lightwell${lw === 1 ? "" : "s"} with retaining walls, drainage and walk-on grilles` : "", bool(v, "stairs") ? "form the opening and fit a new staircase with balustrade into the basement" : ""].filter(Boolean).join("; ")}.`, S);
    }
    const pw = num(v, "partyWall");
    if (pw > 0) {
      ctx.material("Fees", "party_wall_surveyor", pw, `£${fmt(pw)} provisional`);
      ctx.assume("Party wall surveyors' fees are a provisional sum adjusted to the actual invoices.");
    }
    ctx.assume("Basement price covers the shell: dry, insulated and ready for the rooms (plastering, electrics, heating and finishes are priced on the rooms).");
  },
};
