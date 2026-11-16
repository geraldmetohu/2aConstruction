import { bool, num, str, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";

export const airconSystemOptions: [string, string][] = [
  ["MULTI", "Multi-split – one outdoor unit serves several rooms"],
  ["SINGLE", "Single-split – one outdoor unit per room"],
];

/** Split outdoor units for a multi-split: as few as possible, at most 5 rooms each, rooms spread evenly. */
export function multiSplitOutdoors(heads: number, units = 0): number[] {
  if (heads <= 0) return [];
  const n = Math.max(1, Math.min(heads, units || Math.ceil(heads / 5)));
  const base = Math.floor(heads / n), extra = heads % n;
  return Array.from({ length: n }, (_, i) => Math.min(5, base + (i < extra ? 1 : 0)));
}

/** Air conditioning (heat & cool): wall or ceiling cassette units, outdoor condensers, pipe runs, electrics, F-gas commissioning. */
export const airconPackage: WorkPackage = {
  id: "aircon", label: "Air conditioning", short: "Air con",
  description: "Wall-mounted or ceiling cassette air conditioning (heats and cools) to bedrooms, offices and living rooms: multi-split or single-split outdoor units, pipe runs, condensate, a dedicated circuit and F-gas commissioning.",
  fields: [
    { key: "system", label: "System", type: "select", default: "MULTI", options: airconSystemOptions, public: true, group: "Units" },
    { key: "wallUnits", label: "Wall-mounted indoor units", type: "int", default: 2, min: 0, max: 20, public: true, group: "Units", hint: "One per room" },
    { key: "largeUnits", label: "…of which larger 3.5 kW (big or south-facing rooms)", type: "int", default: 0, min: 0, max: 20, group: "Units", when: [{ key: "wallUnits", gt: 0 }] },
    { key: "cassettes", label: "Ceiling cassette units", type: "int", default: 0, min: 0, max: 20, public: true, group: "Units", hint: "Need a ceiling void of about 300 mm (e.g. a new loft or extension ceiling)" },
    { key: "outdoorUnits", label: "Outdoor condensers", type: "int", default: 0, min: 0, max: 10, group: "Units", hint: "0 = worked out (up to 5 rooms per condenser)", when: [{ key: "system", is: "MULTI" }] },
    { key: "pipeRun", label: "Average pipe run per indoor unit", type: "number", unit: "m", default: 6, min: 1, max: 30, group: "Installation", hint: "From the outdoor unit to the room, in trunking or hidden in walls and floors" },
    { key: "hidden", label: "Pipes hidden in walls / floors (not surface trunking)", type: "boolean", default: false, group: "Installation", hint: "Easiest during a loft or refurbishment, before plastering" },
    { key: "pumps", label: "Condensate pumps", type: "int", default: 0, min: 0, max: 20, group: "Installation", hint: "Where the drain can't fall to a gully or waste" },
    { key: "circuits", label: "New dedicated circuits", type: "int", default: 1, min: 0, max: 10, group: "Installation", hint: "One per outdoor unit is usual" },
  ],
  needsScaffold: () => false,
  build(ctx, v) {
    const wall = num(v, "wallUnits"), cas = num(v, "cassettes"), heads = wall + cas;
    if (!heads) { ctx.warn("Air conditioning is switched on but no indoor units are set."); return; }
    const S = "Air conditioning", multi = str(v, "system") !== "SINGLE", large = Math.min(num(v, "largeUnits"), wall);
    if (wall - large) ctx.material(S, multi ? "ac_wall_head" : "aircon_unit", wall - large, `${wall - large} wall unit${wall - large > 1 ? "s" : ""}`, multi ? undefined : "Single-split system 2.5 kW (indoor + outdoor unit)");
    if (large) ctx.material(S, multi ? "ac_wall_head_35" : "aircon_unit", large, `${large} larger unit${large > 1 ? "s" : ""}`, multi ? undefined : "Single-split system 3.5 kW (indoor + outdoor unit)");
    if (!multi && large) ctx.assume("Single-split 3.5 kW systems are priced at the standard split price; allow about £150 more each if the survey confirms the larger size.");
    if (wall) ctx.labour(S, "ac_head_fit", wall, `${wall} wall unit${wall > 1 ? "s" : ""}`);
    if (cas) { ctx.material(S, "ac_cassette_head", cas, `${cas} cassette${cas > 1 ? "s" : ""}`); ctx.labour(S, "ac_cassette_fit", cas, `${cas} cassette${cas > 1 ? "s" : ""}`); }

    const outdoors = multi ? multiSplitOutdoors(heads, num(v, "outdoorUnits")) : [];
    const outCount = multi ? outdoors.length : heads;
    if (multi) for (const ports of new Set(outdoors)) { const c = outdoors.filter(x => x === ports).length; ctx.material(S, ports === 1 ? "ac_outdoor_single" : `ac_outdoor_${ports}`, c, `${c} × ${ports}-room condenser`); }
    else if (cas) ctx.material(S, "ac_outdoor_single", cas, `${cas} cassette${cas > 1 ? "s" : ""} × 1 condenser`);
    const covered = multi ? outdoors.reduce((a, b) => a + b, 0) : heads;
    if (covered < heads) ctx.warn(`${heads} indoor units need more outdoor condensers – each multi-split condenser serves up to 5 rooms.`);
    ctx.material(S, "ac_bracket", outCount, `${outCount} condenser${outCount > 1 ? "s" : ""}`);
    ctx.labour(S, "ac_outdoor_fit", outCount, `${outCount} condenser${outCount > 1 ? "s" : ""}: braze, test, vacuum, gas & commission`);

    const run = qty2(heads * num(v, "pipeRun"));
    ctx.material(S, "ac_pipe", qty2(run * 1.1), `${heads} units × ${fmt(num(v, "pipeRun"))} m + 10%`);
    ctx.labour(S, "ac_pipe_run", bool(v, "hidden") ? qty2(run * 1.5) : run, `${fmt(run)} m${bool(v, "hidden") ? " × 1.5 hidden in walls / floors" : ""}`);
    const pumps = num(v, "pumps"); if (pumps) ctx.material(S, "ac_condensate_pump", pumps, `${pumps} pump${pumps > 1 ? "s" : ""}`);
    const circ = num(v, "circuits");
    if (circ) { ctx.labour(S, "ac_supply", circ, `${circ} circuit${circ > 1 ? "s" : ""}`); ctx.material(S, "ac_supply_kit", circ, `${circ} circuit${circ > 1 ? "s" : ""}`); }

    const kinds = [wall && `${wall} wall-mounted`, cas && `${cas} ceiling cassette`].filter(Boolean).join(" and ");
    ctx.scope(`Air conditioning: supply and install ${kinds} heat & cool indoor unit${heads > 1 ? "s" : ""} on ${multi ? `${outCount} multi-split outdoor condenser${outCount > 1 ? "s" : ""}` : `${outCount} single-split system${outCount > 1 ? "s" : ""}`} on brackets / stands with anti-vibration feet; ${fmt(run)} m of insulated refrigerant pipe and cable ${bool(v, "hidden") ? "hidden in the walls and floors" : "in white trunking"}, condensate drains${pumps ? ` (${pumps} with pumps)` : ""}${circ ? `, ${circ} dedicated circuit${circ > 1 ? "s" : ""} with outdoor isolator${circ > 1 ? "s" : ""}` : ""}. Pressure tested, vacuumed, commissioned and handed over with remotes and F-gas records by an F-gas certified engineer.`, S);
    ctx.assume("Indoor unit and condenser positions agreed on site with you before first fix. If the council needs planning consent for a condenser (e.g. a conservation area or on the front), the application is yours to make.");
    ctx.assume("Unit sizes are allowances for normal rooms; a heat gain check on site confirms them before ordering.");
  },
};
