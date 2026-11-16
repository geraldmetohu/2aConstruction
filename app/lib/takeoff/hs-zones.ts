// Site zoning and safety signs for the health & safety documents. Every job is set out in three zones –
// red (no entry / exclusion), amber (controlled – authorised operatives only) and green (safe areas) –
// chosen from the activities on the job, plus the signs that go with them (BS ISO 7010 colours).

import type { ActivityId } from "./activities";

export type ZoneLevel = "RED" | "AMBER" | "GREEN";
export interface SiteZone { level: ZoneLevel; area: string; why: string; controls: string[] }
export interface SafetySign { kind: "PROHIBITION" | "WARNING" | "MANDATORY" | "SAFE" | "FIRE"; text: string; where: string }

/** Activity → zones it creates. Areas are written for a house, not a large site. */
const ZONES: Partial<Record<ActivityId, SiteZone[]>> = {
  SCAFFOLD: [
    { level: "RED", area: "Below scaffold during erection, alteration and striking", why: "Falling tubes, boards and fittings", controls: ["Barriered and signed by the scaffolders", "Pedestrians diverted; client told the day before"] },
    { level: "AMBER", area: "Scaffold, loading bay and ladder access", why: "Work at height", controls: ["Operatives only once the handover certificate is issued", "Ladder removed or boarded at the end of each day", "Weekly inspection tag at the access point"] },
  ],
  DEMOLITION: [{ level: "RED", area: "Demolition and structural alteration area while propped", why: "Collapse, falling debris, dust", controls: ["Exclusion barrier and signs; nobody enters except the demolition team", "Props never touched or removed without the site manager", "Dust screens and extraction"] }],
  STRIP_OUT: [{ level: "AMBER", area: "Rooms being stripped out", why: "Debris, dust, exposed services", controls: ["Zip-door dust screens", "Services isolated and labelled", "Occupants kept out until cleaned down"] }],
  EXCAVATION: [{ level: "RED", area: "Open excavations and 1 m around them", why: "Falls into trenches, collapse, plant", controls: ["Rigid barriers or covers on every excavation", "Spoil kept 1 m back; daily inspection", "Children and pets kept away at all times"] }],
  STRUCTURAL_STEEL: [{ level: "RED", area: "Under steels and loads being lifted; propped openings", why: "Load falling, collapse", controls: ["Lifting plan and exclusion zone during the lift", "Permit to load / strike props", "Signs: no entry while lifting"] }],
  ROOFING: [{ level: "RED", area: "Ground below roof work, and the roof itself when stripped", why: "Falling tiles, slates and tools", controls: ["Debris chute / enclosed skip", "Exclusion below the eaves with barriers", "Brick guards and netting on the scaffold"] }],
  SOLAR: [{ level: "RED", area: "Ground below the array during installation", why: "Falling panels and fixings", controls: ["Exclusion below the working area", "Panels raised by hoist or at the loading bay"] }, { level: "AMBER", area: "Inverter, battery and DC isolator positions", why: "Live DC from panels in daylight", controls: ["Isolators labelled", "Only the electrician works on DC cabling"] }],
  HOT_WORKS: [{ level: "RED", area: "Hot works area and 10 m around it", why: "Fire", controls: ["Hot work permit", "Extinguisher at the point of work; 60-minute fire watch"] }],
  ELECTRICAL: [{ level: "AMBER", area: "Consumer unit and circuits being worked on", why: "Electric shock", controls: ["Isolated, locked off and labelled", "Only the electrician works on the installation"] }],
  GAS_HEATING: [{ level: "AMBER", area: "Boiler, gas meter and pipework being worked on", why: "Gas escape, carbon monoxide, scalds", controls: ["Gas isolated at the meter and capped", "Tightness test before use", "Smell of gas: call 0800 111 999"] }],
  DAMP_PROOFING: [{ level: "AMBER", area: "Walls being injected / tanked; cellar or basement", why: "Chemicals, dust, confined space", controls: ["Ventilated; operatives only", "Occupants and pets kept out until dry"] }],
  INSULATION: [{ level: "AMBER", area: "Loft space and hatch", why: "Falling through the ceiling, fibres", controls: ["Crawl boards", "Hatch guarded while open"] }],
  CONCRETE: [{ level: "AMBER", area: "Concrete pour and curing slab", why: "Wet cement burns, slips", controls: ["Barriered until it can be walked on", "Waterproof gloves and boots"] }],
  MASONRY: [{ level: "AMBER", area: "Block / brick cutting station", why: "Silica dust, noise", controls: ["Outside, with water suppression or extraction", "FFP3 and hearing protection"] }],
  GLAZING: [{ level: "AMBER", area: "Window and door openings while units are out", why: "Falls from openings, glass", controls: ["Openings guarded or boarded when unattended", "Glass stored upright on A-frames"] }],
  LANDSCAPING: [{ level: "AMBER", area: "Garden work area and plant routes", why: "Plant, cutting, trips", controls: ["Banksman for the digger / dumper", "Cutting station away from the house"] }],
  TREE_WORK: [{ level: "RED", area: "Drop zone below tree work (twice the height of the cut)", why: "Falling branches, chainsaws", controls: ["Cordoned and signed", "Nobody in the zone during cutting"] }],
  EXTERIOR_CLEANING: [{ level: "AMBER", area: "Below gutters, roofs and windows being cleaned", why: "Falling debris, slippery surfaces, run-off", controls: ["Cones and signs", "Water kept off paths and electrics"] }],
  FIRE_SAFETY: [{ level: "AMBER", area: "Escape routes while alarms or doors are being changed", why: "Reduced fire protection", controls: ["Escape routes kept clear", "Temporary detection while the alarm is off"] }],
  WASTE: [{ level: "AMBER", area: "Skip, wait-and-load area and rubble chute", why: "Falling waste, vehicles", controls: ["Skip not filled above the sides; covered", "Chute bottom enclosed"] }],
};

const GREEN: SiteZone[] = [
  { level: "GREEN", area: "Welfare: toilet, hand washing, drinking water and rest area", why: "Safe area for the team", controls: ["Kept clean and stocked", "First aid kit and accident book here"] },
  { level: "GREEN", area: "Pedestrian routes and the fire assembly point", why: "Safe access for everyone", controls: ["Kept clear and lit", "Assembly point agreed at the pre-start meeting"] },
];

export function siteZones(acts: ActivityId[], occupied: boolean): SiteZone[] {
  const seen = new Set<string>(), out: SiteZone[] = [];
  for (const id of acts) for (const z of ZONES[id] ?? []) if (!seen.has(z.area)) { seen.add(z.area); out.push(z); }
  out.push(...GREEN);
  if (occupied) out.push({ level: "GREEN", area: "Rooms the family keep using, separated from the works", why: "You live at home during the work", controls: ["Dust screens and floor protection at the boundary", "Made safe and clean at the end of each day"] });
  const rank: Record<ZoneLevel, number> = { RED: 0, AMBER: 1, GREEN: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export function safetySigns(acts: ActivityId[]): SafetySign[] {
  const has = (...ids: ActivityId[]) => ids.some(i => acts.includes(i));
  const signs: SafetySign[] = [
    { kind: "PROHIBITION", text: "No unauthorised entry", where: "Site entrance and every red zone" },
    { kind: "MANDATORY", text: "Safety boots and hi-vis must be worn", where: "Site entrance" },
    { kind: "SAFE", text: "First aid", where: "Welfare area" },
    { kind: "SAFE", text: "Fire assembly point", where: "Agreed assembly point" },
    { kind: "FIRE", text: "Fire extinguisher", where: "Each floor being worked on and at hot works" },
  ];
  if (has("SCAFFOLD", "ROOFING", "SOLAR", "DEMOLITION", "STRUCTURAL_STEEL", "TREE_WORK")) signs.push({ kind: "MANDATORY", text: "Hard hats must be worn", where: "Outside, below work at height" }, { kind: "WARNING", text: "Danger – overhead work", where: "Below scaffold and roof work" });
  if (has("SCAFFOLD")) signs.push({ kind: "PROHIBITION", text: "Incomplete scaffold – do not use", where: "Scaffold access while not handed over" });
  if (has("EXCAVATION")) signs.push({ kind: "WARNING", text: "Danger – deep excavation", where: "Each excavation" });
  if (has("ELECTRICAL", "SOLAR")) signs.push({ kind: "WARNING", text: "Danger – electricity", where: "Consumer unit, isolators and temporary supplies" });
  if (has("GAS_HEATING")) signs.push({ kind: "WARNING", text: "Gas – no naked flames", where: "Meter and boiler position while working" });
  if (has("HOT_WORKS")) signs.push({ kind: "PROHIBITION", text: "No smoking or naked flames", where: "Hot works and gas cylinder storage" });
  if (has("DEMOLITION", "STRIP_OUT", "MASONRY", "TILING")) signs.push({ kind: "MANDATORY", text: "Dust mask (FFP3) must be worn", where: "Cutting and demolition areas" });
  if (has("DEMOLITION", "LANDSCAPING", "MASONRY", "EXCAVATION")) signs.push({ kind: "MANDATORY", text: "Hearing protection must be worn", where: "Breaking and cutting areas" });
  if (has("DAMP_PROOFING", "RENDERING", "CONCRETE")) signs.push({ kind: "WARNING", text: "Caution – chemicals / wet cement", where: "Mixing and application areas" });
  if (has("LANDSCAPING", "EXCAVATION")) signs.push({ kind: "WARNING", text: "Caution – plant operating", where: "Digger and dumper routes" });
  return signs;
}
