import { bool, num, str, type WorkPackage } from "../package";
import { fmt } from "../util";

const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Solar PV, batteries, EV chargers and insulation – the energy-saving measures (0% VAT where they qualify). */
export const energyPackage: WorkPackage = {
  id: "energy", label: "Solar, batteries, EV & insulation", short: "Energy",
  description: "Solar PV panels with hybrid inverter, home batteries, 7 kW EV chargers, loft insulation and boarding, and cavity wall insulation. MCS certified; energy-saving materials at 0% VAT where they qualify.",
  fields: [
    { key: "panels", label: "Solar panels (430 W)", type: "int", default: 0, min: 0, max: 40, public: true, group: "Solar PV", hint: "About 10 panels for a 3-bed house (4.3 kWp)" },
    { key: "birdMesh", label: "Bird mesh around the array", type: "boolean", default: true, group: "Solar PV", when: [{ key: "panels", gt: 0 }] },
    { key: "battery", label: "Home battery", type: "select", default: "NONE", clientChoice: true, options: [["NONE", "No battery"], ["5", "5 kWh"], ["10", "10 kWh"], ["13", "13.5 kWh"]], public: true, group: "Battery" },
    { key: "ev", label: "EV charger (7 kW)", type: "boolean", default: false, public: true, group: "EV charging" },
    { key: "evCable", label: "Cable run beyond 10 m", type: "number", unit: "m", default: 0, min: 0, max: 60, group: "EV charging", when: [{ key: "ev", is: true }] },
    { key: "loftArea", label: "Loft insulation", type: "number", unit: "m²", default: 0, min: 0, max: 400, public: true, group: "Insulation" },
    { key: "boarding", label: "Raised loft boarding", type: "number", unit: "m²", default: 0, min: 0, max: 200, group: "Insulation" },
    { key: "cavityArea", label: "Cavity wall insulation (wall area)", type: "number", unit: "m²", default: 0, min: 0, max: 600, group: "Insulation", hint: "Only for unfilled cavities in good condition – checked by borescope" },
  ],
  needsScaffold: v => num(v, "panels") > 0,
  build(ctx, v) {
    const panels = num(v, "panels"), batt = str(v, "battery");
    if (panels) {
      const S = "Solar PV", kwp = Math.round(panels * 0.43 * 100) / 100;
      ctx.labour(S, "solar_install", panels, `${panels} panels`);
      ctx.material(S, "solar_panel", panels, `${panels} panels`);
      ctx.material(S, "solar_mounting", panels, `${panels} panels`);
      ctx.material(S, "inverter_hybrid", 1, "1 inverter");
      if (bool(v, "birdMesh")) { const m = ceil(Math.sqrt(panels) * 1.7 * 2 + 4); ctx.material(S, "bird_mesh", m, `≈ perimeter of ${panels} panels`); }
      ctx.labour(S, "solar_commission", 1, "1 system");
      ctx.scope(`Solar PV: supply and fit ${panels} × 430 W all-black panels (${fmt(kwp)} kWp) on roof hooks and rails, a 5 kW hybrid inverter${bool(v, "birdMesh") ? ", bird mesh around the array" : ""}, generation meter and isolators; DNO notification, MCS certificate and handover pack for Smart Export Guarantee.`, S);
      ctx.assume("Solar layout and output are confirmed by the design after the roof survey; the roof structure is assumed sound for the added load.");
      if (panels > 16) ctx.warn("Arrays over about 3.68 kW per phase need G99 approval from the network operator before installation – allow 6–8 weeks.");
    }
    if (batt !== "NONE") {
      const S = "Battery";
      ctx.labour(S, "battery_fit", 1, "1 battery"); ctx.material(S, `battery_${batt}`, 1, `${batt} kWh`);
      if (!panels) ctx.material(S, "inverter_hybrid", 1, "1 inverter (battery only)");
      ctx.scope(`Battery: install a ${batt === "13" ? "13.5" : batt} kWh home battery${panels ? " on the hybrid inverter" : " with its own hybrid inverter"}, set up for cheap-rate charging and commissioned.`, S);
    }
    if (bool(v, "ev")) {
      const S = "EV charging", extra = num(v, "evCable");
      ctx.labour(S, "ev_charger_fit", 1, "1 charger"); ctx.material(S, "ev_charger", 1, "1 charger");
      ctx.material(S, "ev_cable", 10 + extra, `10 m${extra ? ` + ${fmt(extra)} m` : ""}`);
      if (extra) ctx.labour(S, "ev_cable_run", extra, `${fmt(extra)} m beyond 10 m`);
      ctx.scope(`EV charging: install a 7 kW smart charger (tethered) with ${fmt(10 + extra)} m of armoured cable, RCD protection and earthing, set up in the app; DNO notified and Part P certificate issued.`, S);
    }
    const loft = num(v, "loftArea"), board = num(v, "boarding"), cav = num(v, "cavityArea");
    if (loft || board || cav) {
      const S = "Insulation", parts: string[] = [];
      if (loft) { ctx.labour(S, "loft_insulation_lay", loft, `${fmt(loft)} m²`); ctx.material(S, "loft_insulation_roll", ceil(loft * 1.05), `${fmt(loft)} m² + 5%`); parts.push(`top up the loft to 270 mm of mineral wool over ${fmt(loft)} m²`); }
      if (board) { ctx.labour(S, "loft_boarding", board, `${fmt(board)} m²`); ctx.material(S, "loft_legs", board, `${fmt(board)} m²`); parts.push(`${fmt(board)} m² of raised loft boarding on loft legs so the insulation is not squashed`); }
      if (cav) { ctx.labour(S, "cavity_wall_fill", cav, `${fmt(cav)} m²`); ctx.material(S, "cavity_beads", cav, `${fmt(cav)} m²`); parts.push(`fill ${fmt(cav)} m² of cavity wall with bonded bead after a borescope check, holes made good to match`); }
      ctx.scope(`Insulation: ${parts.join("; ")}.`, S);
      if (cav) ctx.assume("Cavity fill is subject to a borescope survey; walls with exposure, damp or debris in the cavity are not filled.");
    }
    if (!panels && batt === "NONE" && !bool(v, "ev") && !loft && !board && !cav) ctx.warn("Energy is switched on but nothing is chosen yet.");
  },
};
