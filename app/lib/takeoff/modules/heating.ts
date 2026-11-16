import { bool, num, str, type WorkPackage } from "../package";
import { fmt, qty2 } from "../util";

export const boilerOptions: [string, string][] = [
  ["NONE", "No boiler work"], ["COMBI_SWAP", "Replace combi boiler (like for like)"], ["CONVERT_COMBI", "Convert to a combi (remove tanks & cylinder)"], ["SYSTEM", "System boiler + unvented cylinder"],
];
const heatPumpSizes: [string, string][] = [["5", "5 kW (flat / small house)"], ["8", "8 kW (2–3 bed house)"], ["11", "11 kW (3–4 bed house)"], ["14", "14 kW (large house)"]];

/** Heating & hot water: boiler replacement or conversion, radiators, full new system, controls, heat pumps. */
export const heatingPackage: WorkPackage = {
  id: "heating", label: "Heating, boilers & heat pumps", short: "Heating",
  description: "New combi or system boiler, conversion to combi, unvented cylinders, new radiators or a full new heating system, power flush, smart controls and air source heat pumps (MCS).",
  fields: [
    { key: "boiler", label: "Boiler", type: "select", default: "COMBI_SWAP", options: boilerOptions, public: true, group: "Boiler" },
    { key: "grade", label: "Boiler range", type: "select", default: "STANDARD", clientChoice: true, options: [["STANDARD", "Standard (10-year warranty)"], ["PREMIUM", "Premium (12-year warranty)"]], group: "Boiler", when: [{ key: "boiler", in: ["COMBI_SWAP", "CONVERT_COMBI"] }] },
    { key: "gasRun", label: "New gas pipe run", type: "number", unit: "m", default: 0, min: 0, max: 40, group: "Boiler", hint: "Only if the boiler moves or the supply is undersized", when: [{ key: "boiler", not: "NONE" }] },
    { key: "boilerMove", label: "Move the boiler to a new position", type: "boolean", default: false, group: "Boiler", hint: "e.g. out of the kitchen into the loft or a cupboard", when: [{ key: "heatPump", is: false }] },
    { key: "boilerMoveRun", label: "Pipe & flue run to the new position", type: "number", unit: "m", default: 3, min: 0.5, max: 25, group: "Boiler", hint: "Up to 3 m is the standard price; each metre after costs extra", when: [{ key: "boilerMove", is: true }] },
    { key: "flush", label: "Power flush the system", type: "boolean", default: true, group: "Boiler", when: [{ key: "boiler", not: "NONE" }] },
    { key: "controls", label: "Smart thermostat", type: "boolean", default: true, group: "Boiler" },
    { key: "cylinder", label: "Replace the hot water cylinder only (unvented)", type: "boolean", default: false, group: "Boiler", when: [{ key: "boiler", is: "NONE" }] },

    { key: "radiators", label: "Radiators to replace", type: "int", default: 0, min: 0, max: 40, public: true, group: "Radiators & pipework" },
    { key: "newSystem", label: "Full new heating pipework (number of radiators)", type: "int", default: 0, min: 0, max: 40, group: "Radiators & pipework", hint: "New flow & return to every radiator – lifts floors" },

    { key: "heatPump", label: "Air source heat pump", type: "boolean", default: false, public: true, group: "Heat pump" },
    { key: "hpSize", label: "Heat pump size", type: "select", default: "8", options: heatPumpSizes, group: "Heat pump", hint: "Confirmed by the heat loss survey", when: [{ key: "heatPump", is: true }] },
    { key: "hpRadiators", label: "Radiators to upsize for the heat pump", type: "int", default: 4, min: 0, max: 30, group: "Heat pump", when: [{ key: "heatPump", is: true }] },
    { key: "hpRemoveBoiler", label: "Remove the old boiler & cap the gas", type: "boolean", default: true, group: "Heat pump", when: [{ key: "heatPump", is: true }] },
  ],
  needsScaffold: () => false,
  build(ctx, v) {
    const did: string[] = [];
    const boiler = str(v, "boiler"), prem = str(v, "grade") === "PREMIUM";
    if (boiler !== "NONE" && !bool(v, "heatPump")) {
      const S = "Boiler";
      if (boiler === "COMBI_SWAP") {
        ctx.labour(S, "boiler_combi_swap", 1, "1 boiler");
        ctx.material(S, prem ? "boiler_combi_prem" : "boiler_combi_std", 1, "1 boiler");
        did.push(`replace the combi boiler with a new ${prem ? "premium " : ""}A-rated combi, flue and magnetic filter`);
      } else if (boiler === "CONVERT_COMBI") {
        ctx.labour(S, "boiler_conversion", 1, "1 conversion");
        ctx.material(S, prem ? "boiler_combi_prem" : "boiler_combi_std", 1, "1 boiler");
        did.push("convert the system to a combi boiler: remove the tanks in the loft and the hot water cylinder, re-route the pipework and fit a new combi with flue and filter");
      } else {
        ctx.labour(S, "boiler_system_fit", 1, "1 boiler + cylinder");
        ctx.material(S, "boiler_system_std", 1, "1 boiler"); ctx.material(S, "cylinder_unvented", 1, "1 cylinder");
        did.push("fit a new system boiler and an unvented hot water cylinder with G3 discharge");
      }
      ctx.material(S, "magnetic_filter", 1, "1 filter");
      const gas = num(v, "gasRun");
      if (gas) { ctx.labour(S, "gas_pipe_run", gas, `${fmt(gas)} m`); ctx.material(S, "gas_pipe", gas, `${fmt(gas)} m`); did.push(`run ${fmt(gas)} m of new gas pipe`); }
      if (bool(v, "flush")) { ctx.labour(S, "powerflush", 1, "1 system"); ctx.material(S, "inhibitor_cleaner", 1, "1 set"); did.push("power flush the system and add inhibitor"); }
      ctx.scope(`Boiler: ${did.splice(0).join("; ")}. Commissioned, Benchmark completed and registered with Gas Safe (building regulations notification); manufacturer's warranty registered.`, S);
      ctx.assume("Boiler price includes a standard flue up to 1 m and the boiler in the same position unless a gas run is shown; condensate run to a nearby drain.");
    }
    if (bool(v, "boilerMove") && !bool(v, "heatPump")) {
      const S = "Boiler", run = num(v, "boilerMoveRun") || 3;
      ctx.labour(S, "boiler_move", 1, "move boiler (first 3 m)");
      if (run > 3) ctx.labour(S, "boiler_move_extra", qty2(run - 3), `${fmt(run)} m run − 3 m included = ${fmt(run - 3)} m`);
      ctx.scope(`Boiler move: relocate the ${boiler === "NONE" ? "existing " : "new "}boiler to the agreed position with ${fmt(run)} m of new gas, heating, water and condensate pipework and a new flue; make good the old position. Gas Safe registered.`, S);
    }
    if (boiler === "NONE" && bool(v, "cylinder")) {
      ctx.labour("Hot water", "cylinder_unvented_fit", 1, "1 cylinder"); ctx.material("Hot water", "cylinder_unvented", 1, "1 cylinder");
      ctx.scope("Hot water: replace the cylinder with a new unvented cylinder, G3 discharge, commissioned by a G3-qualified engineer.", "Hot water");
    }
    const rads = num(v, "radiators"), sys = num(v, "newSystem");
    if (rads || sys) {
      const S = "Radiators & pipework";
      if (sys) { ctx.labour(S, "heating_new_system", sys, `${sys} radiators`); ctx.material(S, "heating_pipe_kit", sys, `${sys} radiators`); did.push(`new flow and return pipework to ${sys} radiator positions, lifting and refitting floorboards`); }
      if (rads) { ctx.labour(S, "radiator_replace", rads, `${rads} radiators`); ctx.material(S, "radiator_standard", rads, `${rads} radiators`); did.push(`replace ${rads} radiator${rads === 1 ? "" : "s"} with new double-panel radiators and valves`); }
      ctx.scope(`Radiators: ${did.splice(0).join("; ")}; system refilled, balanced and checked for leaks.`, S);
    }
    if (bool(v, "heatPump")) {
      const S = "Heat pump", kw = str(v, "hpSize");
      ctx.labour(S, "heat_pump_fit", 1, "1 heat pump"); ctx.labour(S, "heat_pump_electrics", 1, "1 supply");
      ctx.material(S, `heat_pump_${kw}kw`, 1, `${kw} kW`); ctx.material(S, "cylinder_heatpump", 1, "1 cylinder"); ctx.material(S, "heat_pump_kit", 1, "1 kit");
      const up = num(v, "hpRadiators");
      if (up) { ctx.labour(S, "radiator_replace", up, `${up} radiators`); ctx.material(S, "radiator_heatpump", up, `${up} radiators`); }
      if (bool(v, "hpRemoveBoiler")) ctx.labour(S, "gas_pipe_run", 1, "cap off gas at the boiler");
      ctx.scope(`Heat pump: heat loss survey, then supply and install a ${kw} kW air source heat pump on an anti-vibration base, new heat pump cylinder, primary pipework, weather compensation controls${up ? ` and ${up} larger radiators` : ""}${bool(v, "hpRemoveBoiler") ? "; remove the old boiler and cap the gas" : ""}. Commissioned and certified under MCS.`, S);
      ctx.assume("The heat pump is sized from a room-by-room heat loss survey (MCS 031); the size and number of radiators to upsize are confirmed by the survey.");
      ctx.assume("A Boiler Upgrade Scheme grant may be available for the heat pump if the property is eligible; any grant is shown separately and is not deducted from this price.");
    }
    if (bool(v, "controls")) {
      ctx.labour("Controls", "heating_controls_fit", 1, "1 thermostat"); ctx.material("Controls", "smart_thermostat", 1, "1 thermostat");
      ctx.scope("Controls: fit a smart thermostat with app control and show you how to use it.", "Controls");
    }
    if (boiler === "NONE" && !bool(v, "heatPump") && !bool(v, "boilerMove") && !rads && !sys && !bool(v, "cylinder") && !bool(v, "controls")) ctx.warn("Heating is switched on but no work is chosen yet.");
  },
};
