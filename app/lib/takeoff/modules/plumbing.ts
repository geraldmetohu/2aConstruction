import type { Ctx } from "../engine";
import { fmt } from "../util";

/** A sanitary or appliance fixture, with everything needed to connect it. */
export type FixtureType = "BASIN" | "WC" | "BATH" | "SHOWER" | "KITCHEN_SINK" | "UTILITY_SINK" | "WASHING_MACHINE" | "DISHWASHER" | "TOWEL_RAIL";
export type PipeSystem = "COPPER" | "PEX";
export const pipeOptions: [string, string][] = [["COPPER", "Copper (soldered)"], ["PEX", "PEX push-fit"]];

interface Kit {
  label: string;
  /** Hot / cold (or flow / return) connections. */
  supplies: number;
  waste: "32" | "40" | "110" | null;
  /** Fixed items per fixture (trap, waste, connectors…). */
  items: [string, number][];
  /** Fittings on the supply run per connection. */
  elbows: number; elbows45: number; tees: number; isolators: number;
}

export const fixtureKits: Record<FixtureType, Kit> = {
  BASIN: { label: "basin", supplies: 2, waste: "32", items: [["flexi_connector", 2], ["trap_bottle_32", 1], ["basin_waste", 1]], elbows: 3, elbows45: 0, tees: 1, isolators: 1 },
  WC: { label: "WC", supplies: 1, waste: "110", items: [["flexi_connector", 1], ["pan_connector", 1], ["wc_fixing_kit", 1]], elbows: 2, elbows45: 0, tees: 1, isolators: 1 },
  BATH: { label: "bath", supplies: 2, waste: "40", items: [["tap_connector_bath", 2], ["trap_bath_40", 1], ["bath_waste_overflow", 1]], elbows: 3, elbows45: 1, tees: 1, isolators: 1 },
  SHOWER: { label: "shower", supplies: 2, waste: "40", items: [["shower_waste_90", 1]], elbows: 4, elbows45: 1, tees: 1, isolators: 1 },
  KITCHEN_SINK: { label: "kitchen sink", supplies: 2, waste: "40", items: [["flexi_connector", 2], ["trap_sink_40", 1], ["sink_waste_kit", 1]], elbows: 3, elbows45: 0, tees: 1, isolators: 1 },
  UTILITY_SINK: { label: "utility sink", supplies: 2, waste: "40", items: [["flexi_connector", 2], ["trap_sink_40", 1], ["sink_waste_kit", 1]], elbows: 3, elbows45: 0, tees: 1, isolators: 1 },
  WASHING_MACHINE: { label: "washing machine", supplies: 1, waste: "40", items: [["washer_valve", 1], ["standpipe_40", 1]], elbows: 2, elbows45: 0, tees: 1, isolators: 0 },
  DISHWASHER: { label: "dishwasher", supplies: 1, waste: null, items: [["washer_valve", 1]], elbows: 2, elbows45: 0, tees: 1, isolators: 0 },
  TOWEL_RAIL: { label: "heated towel rail", supplies: 2, waste: null, items: [["rad_valves", 1]], elbows: 3, elbows45: 0, tees: 1, isolators: 0 },
};

/**
 * Connect fixtures: supply pipe (run × connections + 10%), elbows 90° / 45°, tees, isolating valves, clips every 0.6 m;
 * wastes (32 / 40 mm) with 2 × 90° and 1 × 45° bends, clips every 1 m and a boss into the stack; WCs on 110 mm soil with
 * 92.5° and 135° bends, pan connector and coupler. Quantities are added up per material, so each appears once.
 */
export function plumbFixtures(ctx: Ctx, S: string, fixtures: [FixtureType, number][], o: { pipe?: PipeSystem; supplyRun?: number; wasteRun?: number; label: string }) {
  const list = fixtures.filter(([, n]) => n > 0);
  if (!list.length) return;
  const cu = (o.pipe ?? "COPPER") === "COPPER";
  const run = o.supplyRun ?? 4, wrun = o.wasteRun ?? 2;
  const q = new Map<string, number>(), why = new Map<string, string[]>();
  const add = (k: string, n: number, w: string) => { if (n <= 0) return; q.set(k, (q.get(k) ?? 0) + n); why.set(k, [...(why.get(k) ?? []), w]); };
  let pipe = 0, w32 = 0, w40 = 0, soil = 0, fixturesN = 0;
  for (const [type, n] of list) {
    const k = fixtureKits[type], tag = `${n} ${k.label}${n > 1 && !k.label.endsWith("s") ? "s" : ""}`;
    fixturesN += n;
    const conns = k.supplies * n;
    pipe += run * conns;
    add(cu ? "elbow90_15_cu" : "elbow90_15_pf", k.elbows * conns, `${tag}: ${k.elbows} per connection`);
    add(cu ? "elbow45_15_cu" : "elbow45_15_pf", k.elbows45 * conns, `${tag}: ${k.elbows45} per connection`);
    add(cu ? "tee_15_cu" : "tee_15_pf", k.tees * conns, `${tag}: ${k.tees} per connection`);
    add("isolating_valve_15", k.isolators * conns, `${tag}`);
    for (const [item, per] of k.items) add(item, per * n, tag);
    if (k.waste === "32") { w32 += wrun * n; add("bend90_32", 2 * n, tag); add("bend45_32", n, tag); add("waste_boss", n, tag); }
    if (k.waste === "40") { w40 += wrun * n; add("bend90_40", 2 * n, tag); add("bend45_40", n, tag); add("waste_boss", n, tag); }
    if (k.waste === "110") { soil += Math.max(1, wrun) * n; add("bend90_110", n, tag); add("bend45_110", n, tag); add("soil_coupler", n, tag); }
  }
  const pipeM = Math.ceil(pipe * 1.1);
  ctx.material(S, cu ? "pipe_cu_15" : "pipe_pex_15", pipeM, `${o.label}: ${fmt(run)} m run × connections = ${fmt(pipe)} m + 10%`);
  if (!cu) add("pipe_insert_15", Math.ceil(pipe / 1.5) * 2, "2 per joint, ≈1 joint per 1.5 m");
  add("pipe_clip_15", Math.ceil(pipe / 0.6), `${fmt(pipe)} m ÷ 0.6 m centres`);
  if (w32) ctx.material(S, "waste_32", Math.ceil(w32 * 1.1 / 3), `${fmt(w32)} m + 10% ÷ 3 m lengths`);
  if (w40) ctx.material(S, "waste_40", Math.ceil(w40 * 1.1 / 3), `${fmt(w40)} m + 10% ÷ 3 m lengths`);
  if (w32 + w40) { add("waste_clip", Math.ceil(w32 + w40), `${fmt(w32 + w40)} m ÷ 1 m centres`); add("solvent_cement", 1, o.label); }
  if (soil) ctx.material(S, "soil_110", Math.ceil(soil * 1.1 / 3), `${fmt(soil)} m + 10% ÷ 3 m lengths`);
  for (const [k, n] of q) ctx.material(S, k, n, why.get(k)!.join("; "));
  ctx.material(S, cu ? "solder_flux" : "ptfe_jointing", fixturesN, `${fixturesN} fixture${fixturesN > 1 ? "s" : ""}`);
  if (cu) ctx.material(S, "ptfe_jointing", fixturesN, `${fixturesN} fixture${fixturesN > 1 ? "s" : ""}`);
}
