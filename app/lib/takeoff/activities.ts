// Health & safety library: the activities a quote involves (found from its lines), with the
// hazards, controls and method statement for each. Used to build the construction phase plan,
// risk assessment and method statements that go with every quote.

export type ActivityId =
  | "SITE_SETUP" | "SCAFFOLD" | "DEMOLITION" | "STRIP_OUT" | "EXCAVATION" | "CONCRETE" | "DRAINAGE" | "MASONRY" | "STRUCTURAL_STEEL"
  | "CARPENTRY" | "ROOFING" | "HOT_WORKS" | "ELECTRICAL" | "PLUMBING" | "PLASTERING" | "TILING" | "DECORATING" | "JOINERY"
  | "KITCHEN" | "FLOORING" | "GLAZING" | "WASTE" | "RENDERING" | "LANDSCAPING" | "TREE_WORK" | "EXTERIOR_CLEANING";

/** Which rate keys mean which activity. Site set-up and waste are always present. */
const DETECT: [ActivityId, RegExp][] = [
  ["SCAFFOLD", /^scaffold_/],
  ["DEMOLITION", /^labour:(demolition_|hip_to_gable|knock_through)/],
  ["STRIP_OUT", /^labour:(strip_out|hack_off_plaster|ceiling_pull_down|roof_strip|elec_strip_old)/],
  ["EXCAVATION", /^labour:(excavate_|load_spoil)|^mini_digger$/],
  ["CONCRETE", /^labour:(pour_concrete|floor_slab|screed)/],
  ["DRAINAGE", /^labour:(drainage|water_main|soakaway_build)/],
  ["MASONRY", /^labour:(blockwork|facing_brickwork|party_wall_raise|render$|garden_wall)/],
  ["RENDERING", /^labour:(render_|ewi_|masonry_paint_apply)/],
  ["LANDSCAPING", /^labour:(garden_clearance|sub_base_lay|turf_lay|artificial_turf_lay|patio_lay|gravel_lay|block_paving_lay|resin_drive|tarmac_lay|kerb_lay|deck_|fence_|gate_fit|flowerbed_prep|planting|raised_bed|garden_maintenance|hedge_trim)/],
  ["TREE_WORK", /^labour:(tree_|stump_grind)/],
  ["EXTERIOR_CLEANING", /^labour:(window_clean|jet_wash|roof_moss_clean|gutter_clean|softwash|upvc_clean|deck_clean)/],
  ["STRUCTURAL_STEEL", /^labour:(beam_install|beam_prep_|knock_through)|^beam_/],
  ["CARPENTRY", /^labour:(floor_joists|floor_boarding|roof_structure_day|flat_roof_structure|pitched_roof_structure|stud_wall|mansard_frame|hip_to_gable|floor_joists_new|staircase_fit|roof_window_trim)/],
  ["ROOFING", /^labour:(roof_tiling_|grp_roof|felt_roof|flat_roof_covering|tile_hanging|roof_window_fit|fascia_soffit_fit|gutter_fit|chimney_|valley_fit|rooflight_fit)/],
  ["HOT_WORKS", /^labour:felt_roof|^felt_system$|^solder_flux$|^lead_/],
  ["ELECTRICAL", /^labour:(elec_|consumer_unit_fit|smoke_alarms_fit|ufh_fit)/],
  ["PLUMBING", /^labour:(bathroom_first_fix|kitchen_plumbing|radiator_fit|sanitary_fit|utility_plumbing|heating_extend|stopcock_move|outside_tap_fit|soil_stack_extend|water_main)/],
  ["PLASTERING", /^labour:(skim|plasterboard|bonding_coat|make_good|insulation_fit)/],
  ["TILING", /^labour:(wall_tiling|floor_tiling|tile_backer)/],
  ["DECORATING", /^labour:(paint_|mist_coat|prep_)/],
  ["JOINERY", /^labour:(door_hang|door_refurb|skirting_fit|door_head_adjust)/],
  ["KITCHEN", /^labour:(kitchen_units|worktop_fit)/],
  ["FLOORING", /^labour:(laminate_floor|engineered_floor|lvt_floor|floor_tiling)|^floor_carpet$/],
  ["GLAZING", /^labour:(window_fit|door_set_fit|rooflight_fit|roof_window_fit)/],
];

export function activitiesOf(rateKeys: string[]): ActivityId[] {
  const found = new Set<ActivityId>(["SITE_SETUP", "WASTE"]);
  for (const k of rateKeys) for (const [id, re] of DETECT) if (re.test(k)) found.add(id);
  return ORDER.filter(id => found.has(id));
}

/** Order in which activities happen on site (used for documents). */
export const ORDER: ActivityId[] = ["SITE_SETUP", "SCAFFOLD", "DEMOLITION", "STRIP_OUT", "EXCAVATION", "DRAINAGE", "CONCRETE", "MASONRY", "STRUCTURAL_STEEL",
  "CARPENTRY", "ROOFING", "HOT_WORKS", "GLAZING", "RENDERING", "ELECTRICAL", "PLUMBING", "PLASTERING", "TILING", "KITCHEN", "JOINERY", "FLOORING", "DECORATING",
  "TREE_WORK", "LANDSCAPING", "EXTERIOR_CLEANING", "WASTE"];

export type HazardId =
  | "HEIGHT" | "FALLING_OBJECTS" | "COLLAPSE" | "MANUAL_HANDLING" | "DUST" | "ASBESTOS" | "NOISE_VIBRATION" | "TOOLS" | "SLIPS"
  | "ELECTRIC" | "SERVICES" | "EXCAVATION" | "PLANT" | "FIRE" | "COSHH" | "LEAD" | "PUBLIC" | "WEATHER" | "DELIVERIES" | "GLASS" | "HOT_WATER" | "LONE";

/** Risk rating: likelihood × severity, each 1–5. */
export interface Hazard { title: string; who: string; harm: string; before: [number, number]; controls: string[]; after: [number, number] }

export const HAZARDS: Record<HazardId, Hazard> = {
  HEIGHT: { title: "Work at height (scaffold, roof, ladders, loft edges)", who: "Operatives", harm: "Falls causing serious injury or death", before: [3, 5], after: [1, 5],
    controls: ["Scaffold erected, altered and inspected by a competent scaffolder (NASC/CISRS); weekly and after bad weather inspections recorded", "Edge protection, toe boards and brick guards to all open edges; loft floor openings boarded or guarded", "Ladders for short-duration access only, footed or tied, in good condition", "Podium steps / hop-ups for internal work instead of chairs or buckets", "No work on roofs in high wind, ice or heavy rain"] },
  FALLING_OBJECTS: { title: "Falling materials and tools", who: "Operatives, occupants, neighbours, public", harm: "Head and body injuries", before: [3, 4], after: [1, 4],
    controls: ["Brick guards and debris netting on scaffold", "Exclusion zone below work at height; hard hats outside the house", "Materials stacked away from edges, loads not exceeding scaffold rating", "Waste lowered by chute or hoist, never thrown"] },
  COLLAPSE: { title: "Structural collapse / temporary works", who: "Operatives, occupants", harm: "Crush injuries, death", before: [2, 5], after: [1, 5],
    controls: ["All structural openings to the structural engineer's design and calculations", "Temporary propping (Acrow props, strong-boys, needles) designed and installed before any load-bearing wall or roof member is removed", "Props on solid bearings, checked daily; no removal until steel is packed and dry-packed", "Building Control inspections at key stages"] },
  MANUAL_HANDLING: { title: "Manual handling (blocks, boards, steels, sanitaryware)", who: "Operatives", harm: "Back and musculoskeletal injuries", before: [4, 3], after: [2, 2],
    controls: ["Mechanical aids: sack trucks, board lifters, hoists, gin wheel; team lifts for steels and heavy items", "Materials delivered as close to the point of use as possible", "Manual handling awareness for all operatives", "Loads split where possible (e.g. half bags, 2.4 m boards carried by two)"] },
  DUST: { title: "Dust including silica (cutting blocks, chasing, sanding)", who: "Operatives, occupants", harm: "Lung disease (silicosis, COPD), eye irritation", before: [4, 4], after: [2, 3],
    controls: ["On-tool extraction (M-class) or water suppression when cutting, chasing or grinding", "FFP3 face-fit tested masks where dust is generated", "Dust sheets, zip-door screens and sealed doorways in occupied homes; daily clean with H/M-class vacuum, no dry sweeping", "Cutting outside where practicable, downwind of the house"] },
  ASBESTOS: { title: "Asbestos-containing materials (pre-2000 buildings)", who: "Operatives, occupants", harm: "Mesothelioma, asbestosis, lung cancer", before: [2, 5], after: [1, 5],
    controls: ["Asbestos refurbishment survey before intrusive work in buildings built before 2000 (artex, floor tiles, soffits, flue pipes, insulation board)", "Stop work immediately if suspect material is found; isolate the area and inform the client; licensed contractor for removal", "Asbestos awareness training for all operatives"] },
  NOISE_VIBRATION: { title: "Noise and hand-arm vibration (breakers, grinders, SDS drills)", who: "Operatives, occupants, neighbours", harm: "Hearing loss, HAVS / vibration white finger", before: [3, 3], after: [2, 2],
    controls: ["Low-vibration tools; trigger time limited and recorded against HAV exposure points", "Hearing protection in noisy areas; noisy work kept to agreed hours", "Tools maintained, blades and bits sharp"] },
  TOOLS: { title: "Power tools and hand tools (saws, nail guns, cutters)", who: "Operatives", harm: "Cuts, amputation, eye injury", before: [3, 4], after: [1, 3],
    controls: ["110 V or battery tools; PAT tested; guards in place", "Only trained operatives use disc cutters and chop saws", "Eye protection and gloves; blades changed with power isolated"] },
  SLIPS: { title: "Slips, trips and falls on the level", who: "Everyone on site", harm: "Sprains, fractures", before: [4, 2], after: [2, 2],
    controls: ["Good housekeeping: walkways clear, cables routed overhead or covered", "Waste removed daily; floor protection taped down", "Adequate temporary lighting"] },
  ELECTRIC: { title: "Electricity (existing installation, temporary supplies)", who: "Operatives, occupants", harm: "Electric shock, burns, fire", before: [2, 5], after: [1, 5],
    controls: ["Safe isolation procedure: isolate, lock off, label and prove dead with an approved tester before work", "All electrical work by a qualified, Part P registered electrician to BS 7671", "110 V transformers / RCD protection for site tools", "Circuits tested and certified before re-energising"] },
  SERVICES: { title: "Buried and hidden services (gas, water, cables in walls and ground)", who: "Operatives, occupants", harm: "Electrocution, gas escape, flooding", before: [3, 5], after: [1, 4],
    controls: ["Service drawings obtained; CAT & Genny scan before digging; hand dig within 500 mm of services", "Wall and floor voids checked with a detector before drilling, chasing or cutting", "Gas work only by a Gas Safe registered engineer; water isolated before plumbing alterations"] },
  EXCAVATION: { title: "Excavations (trenches, reduce level dig)", who: "Operatives, occupants, public", harm: "Trench collapse, falls into excavations, undermining adjacent walls", before: [3, 5], after: [1, 4],
    controls: ["Trenches over 1.2 m deep or in poor ground supported (trench sheets / props); daily inspection recorded", "Barriers and covers around open excavations; no access for children or pets", "Spoil and plant kept back at least 1 m from the edge", "Adjacent footings checked; engineer consulted if foundations are exposed"] },
  PLANT: { title: "Plant (mini digger, dumper, mixer)", who: "Operatives, occupants, public", harm: "Crush and impact injuries", before: [3, 5], after: [1, 4],
    controls: ["Only trained, certificated operators (CPCS/NPORS); daily pre-use checks", "Banksman for reversing and confined areas; exclusion zone around slewing plant", "Plant not left with keys in; parked off the public highway"] },
  FIRE: { title: "Fire (hot works, flammables, waste)", who: "Everyone on site, neighbours", harm: "Burns, smoke inhalation, property damage", before: [2, 5], after: [1, 4],
    controls: ["Hot work permit; extinguisher at the point of work; 1 hour fire watch after hot works stop", "Flammable materials (solvents, gas bottles) stored outside in a secure ventilated cage", "Escape routes kept clear; smoke alarms in the house kept working (covered only while dust is generated)", "Waste removed regularly; no burning on site"] },
  COSHH: { title: "Hazardous substances (cement, adhesives, GRP resin, solvents, paints)", who: "Operatives, occupants", harm: "Dermatitis, burns, respiratory irritation", before: [3, 3], after: [1, 2],
    controls: ["COSHH assessments and safety data sheets on site for each product", "Gloves, eye protection; barrier cream; washing facilities", "Good ventilation; water-based low-VOC products in occupied homes where possible", "GRP resin and catalyst handled and stored as per manufacturer's instructions"] },
  LEAD: { title: "Lead (old paint, lead flashings)", who: "Operatives, occupants", harm: "Lead poisoning", before: [2, 4], after: [1, 3],
    controls: ["Old paint presumed to contain lead in pre-1970 homes: no dry sanding or burning off; wet abrade or chemical strippers", "Gloves when handling lead sheet; wash hands before eating; no eating on site"] },
  PUBLIC: { title: "Occupants, neighbours and members of the public", who: "Client, family, visitors, neighbours, public", harm: "Injury from site hazards", before: [3, 4], after: [1, 3],
    controls: ["Work areas segregated; site secured at the end of each day", "Occupants told daily of no-go areas; children and pets kept away from work areas", "Scaffold ladders removed or boarded out of hours; Heras fencing where needed", "Pavement and highway kept clear; skip lit and licensed when on the road"] },
  WEATHER: { title: "Weather (rain, wind, cold, heat)", who: "Operatives, property", harm: "Exposure, water damage to the house", before: [3, 3], after: [1, 2],
    controls: ["Temporary roof / tarpaulins secured before the roof is opened; checked each evening", "Work stopped in high winds for roofing and lifting", "Welfare with hot drinks and drying space; sun protection in summer"] },
  DELIVERIES: { title: "Deliveries and vehicles", who: "Operatives, public", harm: "Struck by vehicles or loads", before: [3, 4], after: [1, 3],
    controls: ["Deliveries booked and supervised; banksman for reversing lorries", "Crane-offloading (HIAB) only with a lifting plan and exclusion zone", "Materials stored off the highway or with a licence"] },
  GLASS: { title: "Handling glass and large glazed units", who: "Operatives", harm: "Cuts, crush injuries", before: [3, 4], after: [1, 3],
    controls: ["Glass lifting suction cups; enough people for the weight (or glazing robot for large bi-fold panes)", "Cut-resistant gloves and arm protection", "Units stored upright on A-frames, away from walkways"] },
  HOT_WATER: { title: "Hot water, pressurised systems and floods", who: "Operatives, occupants", harm: "Scalds, water damage", before: [2, 3], after: [1, 2],
    controls: ["Systems drained down and isolated before work; pressure tested after", "Unvented cylinders worked on only by G3 qualified plumbers", "Leak checks before covering pipework"] },
  LONE: { title: "Lone working", who: "Operatives", harm: "Delay in getting help after an accident", before: [2, 4], after: [1, 3],
    controls: ["No high-risk work (height, electrics, hot works) alone", "Check-in calls with the site manager; mobile phone on the person"] },
};

export interface Activity { title: string; hazards: HazardId[]; steps: string[]; plant: string[]; ppe: string[]; competence: string }

const BASIC_PPE = ["Safety boots", "Hi-vis vest", "Gloves"];

export const ACTIVITIES: Record<ActivityId, Activity> = {
  SITE_SETUP: { title: "Site set-up, protection and welfare", hazards: ["PUBLIC", "SLIPS", "DELIVERIES", "MANUAL_HANDLING"],
    steps: ["Pre-start meeting with the client: access, working hours, parking, storage, no-go areas, what stays in use", "Photograph existing condition of the property and shared areas", "Lay floor and stair protection (correx / carpet film), cover furniture, seal off work areas with dust screens", "Set up welfare (toilet, hand washing, drinking water, rest area), first aid kit, fire extinguishers and site notices", "Book skip / skip licence and parking suspension where needed", "Display the construction phase plan; induct all operatives"],
    plant: ["Protection materials", "Dust screens & zip doors", "Welfare unit"], ppe: BASIC_PPE, competence: "Site manager (SMSTS/SSSTS)" },
  SCAFFOLD: { title: "Scaffolding", hazards: ["HEIGHT", "FALLING_OBJECTS", "PUBLIC", "DELIVERIES"],
    steps: ["Scaffold designed for the loads (TG20 compliant) and erected by a specialist scaffolding contractor", "Handover certificate before use; inspected every 7 days and after alteration or bad weather (inspection register on site)", "Brick guards, netting, loading bay and ladder access with gate", "Ladder removed or boarded at the end of each day; alarm if required", "No alterations by our operatives"],
    plant: ["Tube & fitting / system scaffold", "Debris netting", "Loading bay"], ppe: [...BASIC_PPE, "Hard hat"], competence: "CISRS scaffolders; scaffold inspector" },
  DEMOLITION: { title: "Demolition and structural alterations", hazards: ["COLLAPSE", "HEIGHT", "FALLING_OBJECTS", "DUST", "ASBESTOS", "NOISE_VIBRATION", "MANUAL_HANDLING"],
    steps: ["Asbestos survey checked; services in the area isolated", "Temporary roof / weather protection and temporary propping installed to the engineer's design before removal", "Remove coverings (tiles, slates, felt) by hand, lowering via chute into the skip", "Dismantle structure in reverse order of construction, never undermining members still carrying load", "Make safe and weatherproof at the end of each day"],
    plant: ["Rubble chute", "Props & needles", "Breakers with dust suppression"], ppe: [...BASIC_PPE, "Hard hat", "FFP3 mask", "Eye & hearing protection"], competence: "Experienced demolition operatives under supervision" },
  STRIP_OUT: { title: "Strip out (ceilings, plaster, kitchens, bathrooms, old wiring)", hazards: ["DUST", "ASBESTOS", "SERVICES", "MANUAL_HANDLING", "TOOLS", "LEAD"],
    steps: ["Isolate electrics and water to the area; cap off pipes", "Check for asbestos (artex, old tiles, boxing) before removal", "Remove fixtures, then finishes, working top down; bag waste and take straight to the skip", "Wet methods and extraction to keep dust down; daily clean"],
    plant: ["SDS drills", "M-class vacuum", "Wheelbarrows, rubble sacks"], ppe: [...BASIC_PPE, "FFP3 mask", "Eye protection"], competence: "Trained general operatives" },
  EXCAVATION: { title: "Excavation and foundations", hazards: ["EXCAVATION", "SERVICES", "PLANT", "MANUAL_HANDLING", "NOISE_VIBRATION", "PUBLIC"],
    steps: ["Set out from approved drawings; CAT scan and mark services", "Excavate trenches to the depth agreed with Building Control (machine where access allows, by hand otherwise)", "Support trench sides where required; barrier and cover excavations", "Building Control inspection before concrete", "Pour trench fill / strip footings from ready-mix truck or barrow, levelled and tamped", "Remove spoil by grab lorry or skips"],
    plant: ["Mini digger", "Dumper / barrows", "CAT & Genny", "Trench sheets & props"], ppe: [...BASIC_PPE, "Hard hat", "Hearing protection"], competence: "CPCS / NPORS plant operator; groundworkers" },
  DRAINAGE: { title: "Drainage and water services", hazards: ["EXCAVATION", "SERVICES", "COSHH", "MANUAL_HANDLING"],
    steps: ["Locate existing runs; agree build-over / connections with the water company where needed", "Excavate to falls, bed and surround pipes in pea gravel", "Install chambers and gullies; air / water test; Building Control inspection", "Backfill in layers and compact"],
    plant: ["Mini digger", "Laser level", "Test kit"], ppe: [...BASIC_PPE, "Gloves (contaminated water)"], competence: "Groundworkers / drainage operatives" },
  CONCRETE: { title: "Concrete, floor slab and screed", hazards: ["COSHH", "MANUAL_HANDLING", "SLIPS", "DELIVERIES"],
    steps: ["Hardcore laid and compacted in layers, sand blinded, DPM lapped and taped", "Insulation laid tight-jointed; edge insulation", "Concrete placed, levelled and cured; screed laid after the building is watertight"],
    plant: ["Plate compactor", "Mixer / ready-mix pump", "Screed boards"], ppe: [...BASIC_PPE, "Waterproof gloves & boots (wet cement)", "Eye protection"], competence: "Groundworkers" },
  MASONRY: { title: "Brickwork and blockwork", hazards: ["HEIGHT", "MANUAL_HANDLING", "DUST", "COSHH", "FALLING_OBJECTS"],
    steps: ["Set out, DPC laid, starter kits fixed to existing walls", "Build cavity walls with ties at the specified spacing, insulation and cavity trays / weep vents", "Lintels and padstones to the engineer's design", "Lift heights limited; scaffold / trestles for work over 1.5 m; blocks cut with extraction or water"],
    plant: ["Mixer", "Trestles / scaffold", "Block splitter / saw with extraction"], ppe: [...BASIC_PPE, "Eye protection", "FFP3 when cutting"], competence: "Qualified bricklayers" },
  STRUCTURAL_STEEL: { title: "Steel beams and structural openings", hazards: ["COLLAPSE", "MANUAL_HANDLING", "HEIGHT", "DUST", "NOISE_VIBRATION"],
    steps: ["Engineer's calculations and Building Control approval in place", "Install needles and props at the spacing designed; check bearings", "Form padstone pockets, set padstones level", "Lift steel into position with a team lift / lifting equipment; pack and dry-pack bearings", "Leave props in place until dry-pack has cured (min 24 hours); fire protect steel", "Building Control inspection"],
    plant: ["Acrow props, strong-boys, needles", "Steel lifting equipment / gin wheel", "SDS breakers"], ppe: [...BASIC_PPE, "Hard hat", "FFP3", "Hearing protection"], competence: "Experienced builders under supervision" },
  CARPENTRY: { title: "Structural carpentry (joists, roof structure, stud walls, stairs)", hazards: ["HEIGHT", "TOOLS", "MANUAL_HANDLING", "FALLING_OBJECTS"],
    steps: ["Timber sizes and spacing to the drawings / engineer's design", "Joists fixed in hangers or on wall plates with restraint straps and strutting", "Loft floor boarded progressively to give a safe working platform; openings guarded", "Roof structure framed, braced and decked; temporary weathering maintained"],
    plant: ["Mitre saw", "Nail guns", "Podiums"], ppe: [...BASIC_PPE, "Eye & hearing protection"], competence: "Qualified carpenters" },
  ROOFING: { title: "Roofing (tiling, slating, flat roofs, roof windows, fascias & gutters)", hazards: ["HEIGHT", "FALLING_OBJECTS", "WEATHER", "MANUAL_HANDLING", "COSHH"],
    steps: ["Work only from the scaffold with edge protection; roof ladders where needed", "Membrane, battens at gauge, tiles/slates loaded out evenly", "Flashings dressed into abutments; ridges and verges fixed mechanically", "GRP / felt laid per manufacturer's method; resin mixed in small batches", "Fascia, soffit and guttering fitted to falls"],
    plant: ["Roof ladders", "Hoist / gin wheel", "Slate cutter"], ppe: [...BASIC_PPE, "Hard hat at ground level", "Gloves for resin"], competence: "Qualified roofers" },
  HOT_WORKS: { title: "Hot works (soldering, torch-on felt, lead)", hazards: ["FIRE", "LEAD", "COSHH"],
    steps: ["Hot work permit issued; combustibles removed or protected with fire blankets", "Extinguisher at the point of work", "Gas bottles stored and transported upright, regulators checked", "Fire watch for at least 1 hour after hot work stops", "Soldering near timber with heat mats"],
    plant: ["Blowtorch / roofing torch", "Fire blankets, heat mats, extinguishers"], ppe: [...BASIC_PPE, "Heat-resistant gloves", "Eye protection"], competence: "Trained roofers / plumbers" },
  GLAZING: { title: "Windows, doors and rooflights", hazards: ["GLASS", "HEIGHT", "MANUAL_HANDLING", "FALLING_OBJECTS"],
    steps: ["Check openings and sizes; units delivered and stored upright", "Lift with suction cups / enough operatives; glazing robot for large panes", "Fix with frame fixings and packers; seal with foam and silicone", "Rooflights lifted from the scaffold, never over occupied spaces"],
    plant: ["Glass suction lifters", "Glazing robot (large units)"], ppe: [...BASIC_PPE, "Cut-resistant gloves & sleeves"], competence: "Window fitters (FENSA registered where required)" },
  ELECTRICAL: { title: "Electrical installation", hazards: ["ELECTRIC", "SERVICES", "DUST", "HEIGHT"],
    steps: ["Safe isolation: isolate, lock off, prove dead", "First fix: cables routed in safe zones, protected where required; back boxes set", "Second fix after plastering: accessories, fittings", "Test, inspect and certify (EIC / minor works); Part P notification"],
    plant: ["Voltage indicator & proving unit", "Multi-function tester", "Chasing tools with extraction"], ppe: [...BASIC_PPE, "Eye protection"], competence: "Qualified electrician (18th Edition), Part P scheme member" },
  PLUMBING: { title: "Plumbing and heating", hazards: ["HOT_WATER", "FIRE", "SERVICES", "MANUAL_HANDLING"],
    steps: ["Isolate and drain down the area / system", "First fix supplies and wastes; pressure test before covering", "Second fix sanitaryware, appliances and radiators", "Refill with inhibitor, bleed, balance and check for leaks", "Gas work by a Gas Safe engineer only"],
    plant: ["Pipe cutters, blowtorch / press tool", "Pressure test kit"], ppe: [...BASIC_PPE, "Eye protection"], competence: "Qualified plumber; Gas Safe engineer for gas" },
  PLASTERING: { title: "Plasterboarding, insulation and plastering", hazards: ["MANUAL_HANDLING", "DUST", "COSHH", "HEIGHT"],
    steps: ["Boards fixed with screws / dabs; insulation cut with knives (not power saws)", "Beads and scrim; PVA / bonding as specified", "Skim and finish; mixing outside or with dust control"],
    plant: ["Board lifter", "Podiums / hop-ups", "Mixing drill"], ppe: [...BASIC_PPE, "Eye protection when mixing", "Masks when cutting insulation"], competence: "Qualified plasterers" },
  TILING: { title: "Tiling", hazards: ["DUST", "TOOLS", "COSHH", "MANUAL_HANDLING"],
    steps: ["Substrate prepared: backer board, tanking in wet zones", "Tiles set out, fixed with adhesive, spacers / levelling clips", "Cutting with wet cutters or extraction; grout and silicone"],
    plant: ["Wet tile cutter", "Mixing drill"], ppe: [...BASIC_PPE, "Knee pads", "Eye protection"], competence: "Qualified tiler" },
  KITCHEN: { title: "Kitchen installation", hazards: ["MANUAL_HANDLING", "TOOLS", "ELECTRIC", "HOT_WATER"],
    steps: ["Units assembled and fixed level to walls; wall units on suitable fixings", "Worktops cut with dust extraction; joints bolted and sealed", "Appliances connected by qualified trades; gas by Gas Safe engineer"],
    plant: ["Track saw / router with extraction", "Laser level"], ppe: [...BASIC_PPE, "Eye & hearing protection"], competence: "Kitchen fitter" },
  JOINERY: { title: "Second fix joinery (doors, skirting, architraves)", hazards: ["TOOLS", "MANUAL_HANDLING", "DUST"],
    steps: ["Doors hung with linings, hinges, ironmongery; fire doors with intumescent seals and closers to manufacturer's instructions", "Skirtings and architraves fixed, mitred and caulked"],
    plant: ["Mitre saw with extraction", "Nail guns"], ppe: [...BASIC_PPE, "Eye protection"], competence: "Carpenter" },
  FLOORING: { title: "Floor finishes", hazards: ["MANUAL_HANDLING", "TOOLS", "COSHH", "SLIPS"],
    steps: ["Subfloor checked flat and dry; underlay laid", "Boards / LVT / tiles laid to manufacturer's instructions with expansion gaps", "Thresholds and beading fitted"],
    plant: ["Flooring saw / cutter"], ppe: [...BASIC_PPE, "Knee pads"], competence: "Floor fitter" },
  DECORATING: { title: "Decorating", hazards: ["HEIGHT", "COSHH", "DUST", "LEAD"],
    steps: ["Prepare: fill, sand (with extraction), caulk; old paint treated as containing lead where applicable", "Mist coat on new plaster, then finish coats", "Water-based low-odour paints; ventilate rooms"],
    plant: ["Podiums", "Dust-extracted sanders"], ppe: [...BASIC_PPE, "Masks when sanding"], competence: "Decorator" },
  RENDERING: { title: "External render and external wall insulation (EWI)", hazards: ["HEIGHT", "FALLING_OBJECTS", "DUST", "COSHH", "WEATHER", "MANUAL_HANDLING", "PUBLIC"],
    steps: ["Work from the scaffold only; brick guards and netting; exclusion zone below", "Hack off old render top down, lowering waste by chute; wet methods to keep dust down", "Mask windows, doors and neighbouring surfaces; protect the ground", "EWI boards fixed with adhesive and mechanical fixings to the system manufacturer's specification; fire breaks where required", "Beads, base coat and mesh, then finish coat; no rendering below 5 °C, in frost or rain", "Sills, downpipes and fittings re-fixed; clean down and remove waste daily"],
    plant: ["Scaffold", "Render mixer / spray machine", "SDS breaker with dust suppression"], ppe: [...BASIC_PPE, "Hard hat at ground level", "Eye protection", "FFP3 when hacking off", "Waterproof gloves (wet cement)"], competence: "Renderers trained in the EWI system used (manufacturer approved installer)" },
  TREE_WORK: { title: "Tree felling, pruning and stump grinding", hazards: ["FALLING_OBJECTS", "TOOLS", "NOISE_VIBRATION", "PUBLIC", "HEIGHT", "SERVICES"],
    steps: ["Check for Tree Preservation Orders and conservation area before any work; nesting birds checked (Mar–Aug)", "Exclusion zone set out at least twice the tree height for felling; overhead lines and services identified", "Dismantle in sections from the top where space is tight, lowering with ropes", "Chainsaws used only by certified operators; chipper fed from the side", "Stumps ground out, arisings removed and the area made good"],
    plant: ["Chainsaws", "Wood chipper", "Stump grinder", "Rigging & lowering kit"], ppe: [...BASIC_PPE, "Chainsaw trousers & boots", "Helmet with visor & ear defenders"], competence: "NPTC chainsaw certified arborist" },
  LANDSCAPING: { title: "Landscaping: lawns, paving, drives, decking and fencing", hazards: ["MANUAL_HANDLING", "PLANT", "SERVICES", "DUST", "NOISE_VIBRATION", "TOOLS", "PUBLIC"],
    steps: ["Set out levels and falls away from the house; check services with CAT & Genny before digging", "Excavate and remove spoil; lay and compact MOT Type 1 in layers", "Paving laid on full mortar bed with primer; slabs cut with water suppression; joints pointed", "Block paving / resin / tarmac laid to manufacturer's instructions with edge restraints and drainage (SuDS)", "Decking and fencing set out, posts concreted; timber cut with extraction", "Turf / artificial grass laid on prepared levelled base; site left clean"],
    plant: ["Mini digger / dumper", "Plate compactor", "Disc cutter with water suppression", "Laser level"], ppe: [...BASIC_PPE, "Eye & hearing protection", "Knee pads", "FFP3 when cutting"], competence: "Landscapers / groundworkers; CPCS / NPORS plant operators" },
  EXTERIOR_CLEANING: { title: "Exterior cleaning (windows, jet washing, roof & gutter cleaning)", hazards: ["HEIGHT", "SLIPS", "COSHH", "ELECTRIC", "PUBLIC"],
    steps: ["Water-fed poles used from the ground wherever possible; ladders only for short access, footed", "Roof and high-level work from an access platform or roof ladders, never on wet or mossy slopes without fall protection", "Biocides mixed and applied per the label, plants protected, run-off kept from drains", "Jet washing with the area cordoned, outside sockets and lights protected", "Surfaces re-sanded / sealed after cleaning where included"],
    plant: ["Water-fed pole system", "Pressure washer / surface cleaner", "Access platform (where needed)"], ppe: [...BASIC_PPE, "Eye protection", "Waterproofs", "Chemical gloves"], competence: "Trained exterior cleaning operatives; IPAF for access platforms" },
  WASTE: { title: "Waste and site clearance", hazards: ["MANUAL_HANDLING", "PUBLIC", "DELIVERIES", "FIRE"],
    steps: ["Waste segregated where practicable (inert, timber, plasterboard, metal, general)", "Skips not overfilled; covered when needed; skip licence on the highway", "Waste removed by licensed carriers; waste transfer notes kept", "Builders' clean on completion"],
    plant: ["Skips / grab lorry", "Wheelbarrows"], ppe: BASIC_PPE, competence: "General operatives" },
};

export const riskScore = ([l, s]: [number, number]) => l * s;
export const riskBand = (score: number) => (score >= 15 ? "High" : score >= 8 ? "Medium" : "Low");

/** Substances likely on site for each activity (COSHH register). */
export const COSHH: Partial<Record<ActivityId, string[]>> = {
  CONCRETE: ["Cement & concrete (alkaline – skin burns)"], MASONRY: ["Cement mortar", "Silica dust from cutting blocks / bricks"],
  ROOFING: ["GRP resin & catalyst (MEKP)", "Roofing solvents / primers"], HOT_WORKS: ["Propane / butane", "Lead sheet"],
  PLASTERING: ["Gypsum plaster dust", "PVA / bonding agents", "Mineral wool fibres"], TILING: ["Tile adhesive & grout", "Tanking primer & membrane"],
  DECORATING: ["Water-based paints", "Solvent-based paints / white spirit", "Fillers & caulk"], PLUMBING: ["Solder flux", "Solvent cement (PVC)", "Central heating inhibitor"],
  FLOORING: ["Flooring adhesives", "Self-levelling compound"], KITCHEN: ["Worktop adhesives & sealants"], DEMOLITION: ["Silica / brick dust", "Possible asbestos (survey)"],
  STRIP_OUT: ["Plaster / silica dust", "Possible lead paint"], STRUCTURAL_STEEL: ["Intumescent paint"],
  RENDERING: ["Cement render & base coats", "Silicone render & primers", "EPS / mineral wool dust"], LANDSCAPING: ["Cement mortar & concrete", "Silica dust from cutting paving", "Resin binders", "Wood preservatives & decking oil"],
  TREE_WORK: ["Petrol & chain oil"], EXTERIOR_CLEANING: ["Biocides / moss killers", "Patio sealers", "Detergents"],
};
