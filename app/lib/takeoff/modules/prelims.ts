import type { Ctx } from "../engine";
import type { Values, WorkPackage } from "../package";
import type { RoomInput } from "../schema";
import { roomValues } from "./rooms";
import { newConsumerUnit } from "./common";

/** Site set-up, plant, professional fees and health & safety, sized from the programme and packages. */
export function buildPrelims(ctx: Ctx, workDays: number, active: { pkg: WorkPackage; values: Values }[], rooms: RoomInput[] = [], elec = { any: false, sockets: 0, cookers: 0 }) {
  const pr = ctx.input.prelims;
  const has = (id: string) => active.find(a => a.pkg.id === id);
  const loft = has("loft"), ext = has("extension"), roof = has("roofing");
  const demo = has("demolition");
  const demoStructural = !!demo && (Number(demo.values.loadBearing) > 0 || Number(demo.values.chimneyBreasts) > 0);
  const structural = !!loft || !!(ext && ext.values.knockThrough === true) || demoStructural;
  const roofOpen = (loft && loft.values.demolition === true) || (roof && roof.values.strip === true);
  const weeks = Math.max(1, Math.ceil(workDays / 5));
  const S = "Preliminaries";
  // Outside-only jobs (garden, cleaning, render) need no internal protection, dust control or builders' clean.
  const outdoorOnly = !rooms.length && active.length > 0 && active.every(a => a.pkg.id === "garden" || a.pkg.id === "cleaning" || a.pkg.id === "external" || a.pkg.id === "outbuilding" || (a.pkg.id === "demolition" && !Number(a.values.kitchens) && !Number(a.values.bathrooms) && !Number(a.values.partitions) && !Number(a.values.loadBearing) && !Number(a.values.chimneyBreasts) && !Number(a.values.strip)));
  const cleaningOnly = !rooms.length && active.length > 0 && active.every(a => a.pkg.id === "cleaning");

  if (pr.siteProtection && !outdoorOnly) ctx.material(S, "site_protection", 1, "Fixed allowance");
  const wantScaffold = pr.scaffoldMode === "YES" || (pr.scaffoldMode === "AUTO" && pr.scaffold && active.some(a => a.pkg.needsScaffold?.(a.values)));
  if (wantScaffold) {
    const p = ctx.input.property;
    const walls = has("external");
    // Elevations: chosen, else from the projects (roof / walls = front & rear, loft & extension = rear).
    const auto: string[] = roof || (walls && walls.values.storeys !== "ONE") ? ["FRONT", "REAR"] : ["REAR"];
    if ((roof || walls) && p.houseType === "DETACHED") auto.push("LEFT", "RIGHT");
    else if ((roof || walls) && p.houseType === "SEMI_OR_END") auto.push("LEFT");
    const elevations = pr.scaffoldElevations.length ? pr.scaffoldElevations : auto;
    // Height to the working platform above the eaves: 2.7 m a storey + 1 m for the top lift.
    const height = Math.max(1, p.storeys) * 2.7 + 1;
    const run = (e: string) => (e === "LEFT" || e === "RIGHT" ? p.length : p.width) + 1.2; // + returns at the ends
    const area = Math.ceil(elevations.reduce((s, e) => s + run(e) * height, 0));
    const scaffWeeks = pr.scaffoldWeeks || Math.max(2, Math.ceil(weeks * (loft ? 0.8 : 0.6)) + 1);
    const names = elevations.map(e => e.toLowerCase()).join(", ");
    ctx.material(S, "scaffold_area", area, `${names}: ${elevations.map(e => `${(run(e)).toFixed(1)} m`).join(" + ")} × ${height.toFixed(1)} m high (${p.storeys} storeys + top lift) = ${area} m², first 2 weeks hire included`);
    if (scaffWeeks > 2) ctx.material(S, "scaffold_area_hire", area * (scaffWeeks - 2), `${area} m² × ${scaffWeeks - 2} extra weeks (${scaffWeeks} weeks in all)`);
    if (pr.chimneyScaffold || (demo && Number(demo.values.stacks) > 0) || (roof && Number(roof.values.chimneyRemove) > 0)) ctx.material(S, "chimney_scaffold", 1, "Chimney scaffold / roof access");
    ctx.scope(`Erect, maintain and dismantle scaffolding to the ${names} elevation${elevations.length > 1 ? "s" : ""} (${area} m², ${scaffWeeks} weeks) for the duration of the ${roof || loft ? "roof" : "external"} works, with handrails, toe boards and a debris chute where needed.`, S);
  }
  // Rooms that make waste: strip out, kitchen/bathroom refits, new ceilings. Roughly one skip per two such rooms.
  const wasteRooms = rooms.filter(r => { const v = roomValues(r); return v.strip !== "NONE" || v.kitchenRefit === true || v.bathroomRefit === true || v.ceiling === "REPLACE"; }).length;
  const roomSkips = Math.ceil(wasteRooms / 2);
  const parts = [...active.filter(a => a.pkg.skips).map(a => `${a.pkg.short} ${a.pkg.skips!(a.values)}`), ...(roomSkips ? [`${wasteRooms} rooms with waste ÷ 2 = ${roomSkips}`] : [])];
  const skips = pr.autoSkips ? active.reduce((s, a) => s + (a.pkg.skips?.(a.values) ?? 0), 0) + roomSkips : pr.skips;
  if (skips > 0) {
    ctx.material(S, "skip_8yd", skips, pr.autoSkips ? parts.join(" + ") : `${skips} skips`);
    ctx.scope(`Remove all construction waste from site (${skips} skip${skips > 1 ? "s" : ""} allowed${ext ? " plus grab lorries for spoil" : ""}).`, S);
  }
  if (pr.welfare && !cleaningOnly) ctx.material(S, "welfare", weeks, `${weeks} weeks`);
  if (pr.structuralEngineer && structural) ctx.material(S, "structural_engineer", 1, "Calculations and drawings");
  if (pr.buildingControl && (loft || ext || demoStructural || has("conversion") || (has("outbuilding") && has("outbuilding")!.values.habitable === true))) { ctx.material(S, "building_control", 1, "Provisional sum"); ctx.assume("Building control fee is a provisional sum and will be adjusted to the actual invoice."); }
  if (pr.partyWallNeighbours > 0) ctx.material(S, "party_wall", pr.partyWallNeighbours, `${pr.partyWallNeighbours} neighbour${pr.partyWallNeighbours > 1 ? "s" : ""}`);
  if (pr.finalClean && !outdoorOnly) ctx.material(S, "final_clean", 1, "On completion");

  // Electrics for the whole job: one board (optional) and one certificate, never per room.
  const E = "Electrical testing";
  const board = newConsumerUnit(ctx.input);
  if (board) {
    const rcbos = 6 + Math.ceil(elec.sockets / 12) + elec.cookers;
    ctx.material(E, "consumer_unit", 1, "1 board");
    ctx.material(E, "rcbo", rcbos, `6 base circuits (lights × 2, sockets × 2, smoke alarms, immersion/boiler) + ⌈${elec.sockets} sockets ÷ 12⌉ + ${elec.cookers} cooker`);
    ctx.material(E, "main_bonding", 1, "gas & water bonding");
    ctx.labour(E, "consumer_unit_fit", 1, "1 board");
    ctx.scope(`Install a new 18th edition consumer unit with ${rcbos} RCBOs and main earth bonding.`, E);
  }
  // Water services
  const Wt = "Water services";
  if (pr.waterMainRun > 0) {
    ctx.material(Wt, "mdpe_25", Math.ceil(pr.waterMainRun * 1.1), `${pr.waterMainRun} m + 10%`);
    ctx.material(Wt, "duct_sleeve", Math.ceil(pr.waterMainRun), `${pr.waterMainRun} m`);
    ctx.material(Wt, "mdpe_fitting", 3, "boundary joint, entry adaptor, spare");
    ctx.material(Wt, "stopcock_22", 1, "new internal stopcock");
    ctx.material(Wt, "drain_cock", 1, "above stopcock");
    ctx.labour(Wt, "water_main", pr.waterMainRun, `${pr.waterMainRun} m`);
    ctx.scope(`Lay a new ${pr.waterMainRun} m 25 mm MDPE water main in ducting from the boundary with a new internal stopcock and drain-off.`, Wt);
  }
  if (pr.moveStopcock && !pr.waterMainRun) { ctx.material(Wt, "stopcock_15", 1, "1 stopcock"); ctx.material(Wt, "drain_cock", 1, "1"); ctx.labour(Wt, "stopcock_move", 1, "move / renew stopcock"); }
  if (pr.outsideTaps) { ctx.material(Wt, "outside_tap_kit", pr.outsideTaps, `${pr.outsideTaps} taps`); ctx.labour(Wt, "outside_tap_fit", pr.outsideTaps, `${pr.outsideTaps} taps`); ctx.scope(`Fit ${pr.outsideTaps} outside tap${pr.outsideTaps > 1 ? "s" : ""} with double check valve.`, Wt); }

  if (pr.electricalCertificate && (elec.any || board)) {
    ctx.labour(E, "elec_certificate", 1, "One test & certificate for all electrical work (Part P / EIC)");
    ctx.scope("Test, inspect and certify all electrical work (Part P notification / Electrical Installation Certificate).", E);
  }

  if (pr.healthSafety) {
    const H = "Health & safety";
    ctx.material(H, "rams_cpp", 1, "Risk assessment, method statement and CDM 2015 construction phase plan");
    ctx.material(H, "ppe_first_aid", 1, "Fixed allowance");
    ctx.material(H, "fire_safety", 1, "Fixed allowance");
    if (roofOpen) {
      ctx.material(H, "edge_protection", 1, "While roof is open");
      ctx.material(H, "temp_weatherproofing", 1, "Temporary roof sheeting");
    }
    if (ext) ctx.material(H, "excavation_safety", 1, "Excavations open");
    if (rooms.length && ctx.input.property.occupancy === "OCCUPIED") ctx.material(H, "dust_control", 1, "Occupied home: dust screens, extraction, daily clean");
    ctx.scope("Work carried out under a written risk assessment, method statement and CDM 2015 construction phase plan, with PPE, first aid and fire safety on site.", H);
  }
}
