// Activity-specific health & safety, Building Regulations and quality content. Each activity on a job gets
// its own RAMS from this (on top of the general hazards in activities.ts), its own toolbox talk, the permits it
// needs, the Building Regulations points to check, the inspection hold points and the emergency arrangements.
// UK law referenced: CDM 2015, Work at Height Regulations 2005, LOLER 1998, PUWER 1998, COSHH 2002,
// Control of Asbestos Regulations 2012, Control of Noise at Work Regulations 2005, Control of Vibration at Work
// Regulations 2005, Electricity at Work Regulations 1989, Gas Safety (Installation and Use) Regulations 1998,
// Building Regulations 2010 (Approved Documents A–S), Party Wall etc. Act 1996, waste duty of care (EPA 1990 s.34).

import type { ActivityId } from "./activities";

export type PermitId = "HOT_WORK" | "DIG" | "HEIGHT" | "ISOLATION" | "TEMP_WORKS" | "LIFT";

export const PERMITS: Record<PermitId, { title: string; when: string; checks: string[] }> = {
  HOT_WORK: { title: "Hot work permit", when: "Before any torch-on felt, soldering, lead welding, grinding or cutting that makes sparks", checks: [
    "Area within 10 m cleared of combustibles or protected with fire blankets / heat mats", "Floor, roof deck and voids below / behind checked for combustibles",
    "Suitable extinguisher (CO₂ / dry powder / water) at the point of work and the operative trained to use it", "Gas cylinders upright, secured, hoses and regulators checked; no cylinders inside the house overnight",
    "Smoke / heat detectors in the area covered only for the duration and uncovered afterwards", "Fire watch kept for at least 60 minutes after hot work stops; final check before leaving site",
    "Hot work stopped at least 1 hour before the end of the working day"] },
  DIG: { title: "Permit to dig / break ground", when: "Before any excavation, trenching, post holes, ground screws or breaking out", checks: [
    "Utility plans (gas, water, electricity, telecoms) obtained and checked", "Area scanned with CAT & Genny by a trained operative; services marked on the ground",
    "Trial holes dug by hand within 500 mm of indicated services", "Excavation support method agreed for trenches over 1.2 m or in loose ground",
    "Edge protection / barriers and covers ready; spoil stored at least 1 m back", "Adjacent foundations checked – undermining risk assessed by the engineer where within 3 m"] },
  HEIGHT: { title: "Permit to work at height / on roofs", when: "Roof work, work from scaffold above 2 m, loft edges and openings, leading edges", checks: [
    "Scaffold has a current handover certificate and a 7-day inspection tag", "Edge protection, toe boards and brick guards complete at the working level",
    "Weather checked: no roof work in winds over Beaufort 5 (≈ 23 mph), ice, snow or heavy rain", "Openings in floors and roofs boarded and fixed, or guarded",
    "Rescue plan in place for anyone using fall arrest; no lone working", "Exclusion zone below; materials raised by hoist or gin wheel, never thrown"] },
  ISOLATION: { title: "Electrical / services isolation permit", when: "Before work on or near any electrical circuit, gas, water or heating system", checks: [
    "Circuit identified; isolated at the consumer unit or main switch", "Locked off with a personal padlock and labelled 'DANGER – do not switch on'",
    "Proved dead with an approved voltage indicator (GS38) and proving unit – tested before and after", "Water / heating isolated and drained down; gas isolated and capped only by a Gas Safe engineer",
    "Occupants told what is off and for how long", "Permit cancelled only by the person who issued it, after the work is made safe"] },
  TEMP_WORKS: { title: "Temporary works permit to load / to strike", when: "Before loading props and needles, removing load-bearing structure, and before striking (removing) temporary supports", checks: [
    "Temporary works design (props, needles, spreaders) from the engineer / temporary works designer on site", "Props installed to the design: plumb, on spreader boards on a solid base, pinned and tight",
    "Temporary works coordinator / supervisor has inspected and signed 'permit to load'", "Masonry above the opening checked – loose brickwork supported",
    "Steel in place, bearings packed and dry-pack cured (at least 24 hours) before 'permit to strike' is signed", "Props struck in the order given; structure checked after striking"] },
  LIFT: { title: "Lifting operation permit", when: "Lifting steels, glazing, roof windows or heavy units by hand team, gin wheel, hoist, HIAB or crane", checks: [
    "Lifting plan for this lift read and briefed (weight, route, equipment, people)", "Lifting equipment and accessories inspected and in date (LOLER: accessories 6-monthly, equipment 12-monthly)",
    "Lift supervised by a competent appointed person; banksman / slinger where plant is used", "Exclusion zone below and along the route; public kept clear",
    "No lift in high winds; tag lines on long loads", "Team lifts: no more than 25 kg per person, and stop if the load is not under control"] },
};

export interface ActivityExtra {
  /** What this activity means on this job – used to pick the scope lines for the RAMS. */
  match: RegExp;
  /** Controls specific to this activity, on top of the general hazard controls. */
  controls: string[];
  permits: PermitId[];
  /** Building Regulations / legal compliance checks for this activity. */
  regs: string[];
  /** Inspection hold points – work does not continue until signed off. */
  hold: string[];
  emergency: string[];
  /** Key points for the toolbox talk. */
  talk: string[];
}

const BASE_EMERGENCY = ["Stop work, make the area safe and call the site supervisor", "First aider attends; call 999 for serious injury and give the site address and postcode", "Report in the accident book; RIDDOR-reportable incidents reported to the HSE by the site manager"];

export const EXTRA: Record<ActivityId, ActivityExtra> = {
  SITE_SETUP: { match: /protect|welfare|set[- ]up|site/i, permits: [],
    controls: ["Site induction for every person before they start; induction register signed", "Fire extinguishers and first aid kit positioned and shown at induction", "Safe pedestrian route for occupants agreed and kept clear", "Emergency contacts and nearest A&E displayed in the welfare area"],
    regs: ["CDM 2015: construction phase plan in place before work starts; welfare to Schedule 2", "Client duties explained (domestic client – contractor takes them on)", "Notify the HSE (F10) if the work lasts over 30 working days with more than 20 workers at once, or exceeds 500 person-days"],
    hold: ["Pre-start meeting with the client recorded", "Condition photos of the property taken and stored"],
    emergency: BASE_EMERGENCY,
    talk: ["Site rules and working hours", "Where the first aid kit, extinguishers and assembly point are", "Occupants, children and pets: no-go areas", "Report every accident and near miss"] },
  SCAFFOLD: { match: /scaffold/i, permits: ["HEIGHT"],
    controls: ["Scaffold to TG20:21 compliance sheet, or a bespoke design where outside TG20", "Scaffold handover certificate received before anyone uses it", "Ladder access tied and extended 1 m above the landing; access removed / boarded out of hours", "Debris netting and brick guards on all lifts; loading bay rated for the loads", "Pavement licence and lighting where the scaffold is on the highway"],
    regs: ["Work at Height Regulations 2005, Schedule 7: inspection after erection, every 7 days, and after alteration or bad weather", "Highways licence (Highways Act 1980 s.169) for scaffold on the pavement"],
    hold: ["Handover certificate", "7-day inspection tag and register entry", "Inspection after high winds"],
    emergency: [...BASE_EMERGENCY, "Fall from height: do not move the casualty unless in danger; call 999", "Scaffold damage or overload: clear the scaffold and call the scaffolder"],
    talk: ["Never alter the scaffold – only the scaffolder does", "Check the tag before going up", "Keep loading within the bay rating; no materials against guard rails", "Report missing boards, guard rails or ties immediately"] },
  DEMOLITION: { match: /demoli|remove|knock|take down|break out|chimney|strip the roof/i, permits: ["TEMP_WORKS", "ISOLATION"],
    controls: ["Asbestos refurbishment / demolition survey read before work; no work on suspect material", "Services disconnected and proved dead / capped before demolition starts", "Demolish top down, in a planned sequence; no undermining or leaving free-standing walls", "Chimney stacks taken down by hand from the scaffold, never pushed over", "Rubble lowered via enclosed chute into a covered skip; dust suppressed with water"],
    regs: ["Building Regulations: building notice / full plans in place for structural alterations", "Party Wall etc. Act 1996: notices served and awards agreed before work to party walls / chimney breasts", "Gas meter / supply isolated by the gas supplier or a Gas Safe engineer where removed"],
    hold: ["Asbestos survey seen", "Temporary works permit to load signed before any load-bearing removal", "Building Control told before structural removal"],
    emergency: [...BASE_EMERGENCY, "Unexpected movement or cracking: evacuate the area and the house, do not re-enter, call the engineer", "Suspect asbestos disturbed: stop, leave the area, close it off, wash and change, inform the site manager"],
    talk: ["Order of demolition for this job", "Props and needles – never remove or knock", "Dust: water spray and masks", "Stop if you find anything unexpected (asbestos, cables, cracks)"] },
  STRIP_OUT: { match: /strip|hack off|pull down|remove (?:the )?(?:old|existing)|clear/i, permits: ["ISOLATION"],
    controls: ["Each room isolated (electrics and water) before strip out; circuits proved dead", "Pre-1980 textured coatings, floor tiles and boxing treated as asbestos until tested", "Waste bagged and taken straight to the skip – no piles in the house", "Stairs and routes protected; heavy items (baths, radiators) carried by two"],
    regs: ["Control of Asbestos Regulations 2012: refurbishment survey before intrusive work in pre-2000 buildings", "Lead paint: no dry sanding or burning off in pre-1970 homes"],
    hold: ["Isolation permit signed for each area", "Asbestos survey result seen"],
    emergency: [...BASE_EMERGENCY, "Suspect asbestos: stop, leave, isolate the area, inform the site manager", "Live cable found: do not touch; isolate at the board; electrician to make safe"],
    talk: ["Prove dead before you cut", "What asbestos can look like in this house", "Dust control and masks", "Lifting heavy items as a team"] },
  EXCAVATION: { match: /excavat|dig|footing|foundation|trench|pile|pad|ground screw|underpin/i, permits: ["DIG"],
    controls: ["Trenches inspected at the start of every shift and after anything that may affect stability", "No one in an unsupported trench over 1.2 m deep, or in any trench showing signs of collapse", "Means of access by ladder within 10 m of anyone in a trench", "Spoil, plant and materials kept at least 1 m from the edge; stop blocks for dumpers", "Underpinning in hit-and-miss bays to the engineer's sequence"],
    regs: ["Building Regulations Part A: foundation depth and width agreed with Building Control (deeper near trees and in clay – NHBC 4.2)", "Building Control inspects the excavation before concrete is poured", "Party Wall Act: 1-month notice for excavation within 3 m (or 6 m at 45°) of a neighbour's foundations", "Build-over agreement with the water company if within 3 m of a public sewer"],
    hold: ["Permit to dig", "Building Control excavation inspection", "Daily excavation inspection record"],
    emergency: [...BASE_EMERGENCY, "Trench collapse: do not enter to rescue – call 999 (fire service) and stop all plant nearby", "Gas strike: evacuate, no ignition sources, call 0800 111 999", "Cable strike: keep clear of plant and the cable, call 105 / the network operator"],
    talk: ["Never enter an unsupported trench", "Service locations on this job", "Edge protection and covers at the end of the day", "Plant exclusion zones"] },
  DRAINAGE: { match: /drain|manhole|chamber|soakaway|gully|sewer|water main/i, permits: ["DIG"],
    controls: ["Confined space: no entry into manholes or chambers – work from the surface", "Hepatitis / Weil's disease (leptospirosis) awareness: gloves, cover cuts, wash before eating", "Test before backfilling", "Existing live drains kept running or over-pumped; no sewage into the garden"],
    regs: ["Building Regulations Part H: 100 mm pipes at 1:40 (1:80 with at least one WC); access within 12 m; rodding points; pipes bedded and surrounded in pea gravel", "Build-over agreement with the water company for work over or within 3 m of a public sewer", "Air / water test witnessed or recorded for Building Control"],
    hold: ["Drainage inspection by Building Control before backfill", "Drain test record"],
    emergency: [...BASE_EMERGENCY, "Anyone collapses in a chamber: do not enter – call 999", "Sewage contact with eyes or cuts: wash immediately and seek advice; tell the GP about work with sewage"],
    talk: ["Leptospirosis – signs and hygiene", "No entry into chambers", "Falls and testing before backfill"] },
  CONCRETE: { match: /concrete|slab|screed|floor raise|base|DPM/i, permits: [],
    controls: ["Wet concrete and screed burn skin: waterproof gloves and boots, wash off immediately", "Ready-mix / pump delivery booked with a banksman and exclusion zone", "Plate compactor: HAV points recorded, hearing protection"],
    regs: ["Building Regulations Part C: DPM lapped and sealed to the DPC; oversite at least 150 mm below DPC", "Part L: floor insulation to the U-value on the drawings (new floor ≈ 0.18 W/m²K)"],
    hold: ["Building Control oversite / DPM and insulation inspection before the pour"],
    emergency: [...BASE_EMERGENCY, "Cement in the eyes: rinse with clean water for at least 10 minutes and get medical help", "Cement burns: wash, remove contaminated clothing, get medical help"],
    talk: ["Cement burns – why waterproof gloves and boots", "Working around the pump / mixer", "Washing facilities"] },
  MASONRY: { match: /brick|block|wall|infill|cavity|DPC|lintel|pier/i, permits: ["HEIGHT"],
    controls: ["Bricks and blocks over 20 kg avoided; blocks lifted by two or with aids", "Work platforms at the correct lift height – no overreaching", "Block cutting with water suppression or on-tool extraction; no dry cutting", "New walls protected from wind until the mortar has gained strength"],
    regs: ["Part A: wall ties at 900 mm horizontal / 450 mm vertical (closer at openings); lateral restraint straps to the engineer / AD A", "Part C: DPC 150 mm above ground; cavity trays and weep vents over openings and where the new roof abuts the house", "Part L: cavity insulation and thermal blocks to the U-value on the drawings (new wall ≈ 0.18 W/m²K); cavity closers at openings", "Part B: cavity barriers where required"],
    hold: ["DPC level inspection by Building Control", "Wall ties / insulation check before closing the cavity"],
    emergency: BASE_EMERGENCY,
    talk: ["Silica dust from cutting – water or extraction, FFP3", "Lift heights and platforms", "Mortar and cement on skin"] },
  STRUCTURAL_STEEL: { match: /\bsteels?\b|\bbeams?\b|padstone|spreader plate|structural opening|column|needle|\bprops?\b|load-bearing/i, permits: ["TEMP_WORKS", "LIFT"],
    controls: ["Structural engineer's calculations and drawings on site; steel sizes, lengths, bearings (padstones / plates) and connections checked against them", "Temporary works design for needles and props; props at the spacing designed, on spreaders on a solid base", "Bearings formed level at the specified size; padstones bedded in mortar, plates on dry pack", "Steel lifted with a lifting plan (team lift up to 25 kg per person, otherwise gin wheel / genie lift / hoist)", "Dry pack fully packed between steel and masonry; at least 24 hours before props are struck", "Fire protection applied to the specified rating (intumescent paint or fire-rated board)"],
    regs: ["Building Regulations Part A: steel, bearings (minimum 100–150 mm or as the engineer specifies) and connections to the engineer's design, approved by Building Control", "Part B: 30-minute fire protection to steels supporting floors or escape routes (60 minutes where required)", "Party Wall Act: notice and award before cutting into or bearing on a party wall"],
    hold: ["Permit to load (props) before removing masonry", "Building Control inspection of steel and bearings before boxing in / plastering", "Permit to strike before props are removed"],
    emergency: [...BASE_EMERGENCY, "Signs of movement (cracking, props moving, dust falling): everyone out, nobody back in until the engineer has checked"],
    talk: ["Never touch or remove props", "The lifting plan for these steels", "Bearings must match the engineer's drawing – padstone or plate, as specified", "Packing and curing before striking"] },
  CARPENTRY: { match: /joist|rafter|roof structure|stud|frame|stair|floor|timber|deck|partition/i, permits: ["HEIGHT"],
    controls: ["Joists and rafters to the sizes and centres on the drawings; hangers and straps fixed with all nails", "Openings in the new floor guarded until the stairs and balustrade are in", "Nail guns: trained users only, sequential trigger, never pointed at anyone", "Long timbers carried by two; raised by hoist to the scaffold"],
    regs: ["Part A: timber grade C24 and sizes to the span tables / engineer; restraint straps at 2 m centres", "Part K: stairs – maximum pitch 42°, rise 150–220 mm, going 220–300 mm, headroom 2.0 m (1.9 m at the centre in a loft, 1.8 m at the side), balustrade 900 mm, no gaps over 100 mm", "Part B: loft – protected stair enclosure to a final exit with fire doors (E20 / FD20), mains-wired interlinked smoke alarms", "Part E: sound insulation (100 mm mineral wool, 10 kg/m³) in new internal walls and floors around bedrooms and bathrooms"],
    hold: ["Building Control inspection of the floor / roof structure before boarding", "Stair dimensions checked before fitting the balustrade"],
    emergency: [...BASE_EMERGENCY, "Nail gun injury: do not remove the nail – support it and go to A&E"],
    talk: ["Openings in floors – cover or guard", "Nail gun safety", "Hangers and straps – every hole nailed"] },
  ROOFING: { match: /roof|tile|slate|felt|EPDM|GRP|fascia|gutter|valley|ridge|flashing|rooflight|lantern|velux/i, permits: ["HEIGHT"],
    controls: ["Work from the scaffold with edge protection at eaves; roof ladders / crawling boards on slopes", "Never step on fragile surfaces (roof lights, asbestos cement, old felt decks) – covered or guarded", "Tiles loaded out evenly; no stacks at the edge", "Temporary weathering (tarpaulins / sheeting) fixed before the end of every day the roof is open"],
    regs: ["Part C: underlay, battens at gauge and tile fixing to BS 5534 and the manufacturer's wind uplift requirements", "Part F / C: roof ventilation (eaves, ridge or vent tiles) or a vapour-permeable underlay as designed – avoid condensation", "Part L: roof insulation to the U-value on the drawings (new roof ≈ 0.15 W/m²K; loft ceiling upgrade ≈ 0.16)", "Lead work to Lead Sheet Training Academy details (code and lap)"],
    hold: ["Insulation check before boarding", "Roof watertight sign-off before ceilings are boarded"],
    emergency: [...BASE_EMERGENCY, "Fall onto a roof or through a roof light: do not climb onto the roof to reach them – call 999"],
    talk: ["Weather limits: wind, ice and rain", "Fragile surfaces on this roof", "Tidy roof – nothing left loose overnight"] },
  HOT_WORKS: { match: /torch|felt|solder|lead|hot/i, permits: ["HOT_WORK"],
    controls: ["Hot work permit issued for every shift with hot work", "Torch-on felt only on non-combustible or protected decks; never near timber edges without a heat shield", "Fire watch for 60 minutes after the torch is off; final check of eaves, voids and insulation"],
    regs: ["Fire safety: Regulatory Reform (Fire Safety) Order 2005 principles; insurer's hot work conditions (check the policy wording)"],
    hold: ["Permit signed before work, and closed after the fire watch"],
    emergency: [...BASE_EMERGENCY, "Fire: raise the alarm, get everyone out, call 999; only tackle a small fire if trained and safe to do so", "Burns: cool with running water for 20 minutes; call 999 for serious burns"],
    talk: ["Hot work permit – why and how", "The 60-minute fire watch", "Gas cylinder storage and transport"] },
  GLAZING: { match: /window|door|glaz|bifold|bi-fold|french|rooflight|lantern|sliding/i, permits: ["LIFT"],
    controls: ["Large panes lifted with suction lifters or a glazing robot to a lifting plan", "Openings secured / boarded when units are not yet fitted", "Units stored upright on A-frames and protected"],
    regs: ["Part L: windows and doors U ≤ 1.4 W/m²K (rooflights ≤ 2.2)", "Part K: safety glazing in critical locations (doors and side panels, low-level glazing below 800 mm)", "Part B: escape windows from first-floor and loft rooms where required (clear opening ≥ 0.33 m², each side ≥ 450 mm, sill ≤ 1100 mm)", "Part F: trickle vents / background ventilation", "Replacement windows: FENSA / CERTASS certificate, or Building Control notification"],
    hold: ["Certificate of compliance (FENSA / BC) collected for the handover file"],
    emergency: [...BASE_EMERGENCY, "Deep cut from glass: apply pressure, raise the limb, call 999 for heavy bleeding"],
    talk: ["Glass weights and team lifting", "Cut-resistant gloves and sleeves", "Safety glazing marks"] },
  RENDERING: { match: /render|EWI|insulation board|cladding|masonry paint|clad/i, permits: ["HEIGHT"],
    controls: ["Work only from the scaffold; no ladders for render coats", "Masking and sheeting of neighbouring property, windows and paths before spraying / rendering", "Hacking off with water suppression; waste down an enclosed chute", "Weather limits: no render below 5 °C, in frost or heavy rain"],
    regs: ["Part L: EWI to the U-value on the drawings (renovated solid wall ≈ 0.30 W/m²K)", "Part B: combustibility of insulation and cladding – non-combustible within 1 m of a boundary where required", "Planning: render / cladding in a conservation area or on the front may need consent", "EWI: system installed by an approved installer to the system certificate (BBA)"],
    hold: ["Substrate check before base coat", "Mesh and beads check before finish coat"],
    emergency: BASE_EMERGENCY,
    talk: ["Wet cement and render on skin", "Working on the scaffold and loading the lifts", "Protecting neighbours' property"] },
  ELECTRICAL: { match: /electric|socket|light|switch|consumer unit|board|cable|circuit|spotlight|downlight|data|fan|alarm/i, permits: ["ISOLATION"],
    controls: ["Safe isolation procedure followed for every circuit; lock-off kit carried by each electrician", "Cables in safe zones or at least 50 mm deep / RCD protected; protected through joists (holes in the middle third)", "Temporary supplies via 110 V transformers; RCD-protected sockets", "Smoke / heat alarms interlinked and mains-wired"],
    regs: ["Building Regulations Part P: notifiable work by a registered competent person (NICEIC / NAPIT), or notified to Building Control", "BS 7671 (18th Edition): Electrical Installation Certificate issued for new circuits; Minor Works Certificates for small additions", "Smoke alarms: at least Grade D LD3 on every storey (more for loft conversions)", "Part F: extract fans in kitchens, bathrooms, utility and WC to the rates required"],
    hold: ["First fix inspection before plastering", "Testing and certificate before handover"],
    emergency: [...BASE_EMERGENCY, "Electric shock: do not touch the person – switch off at the board, then give first aid / CPR; call 999"],
    talk: ["Safe isolation – lock off and prove dead", "Cable routes on this job (where not to drill)", "Temporary power – 110 V only"] },
  PLUMBING: { match: /plumb|radiator|heating|boiler|water|bath|shower|basin|WC|toilet|sink|tap|cylinder|pipe|UFH|underfloor/i, permits: ["ISOLATION", "HOT_WORK"],
    controls: ["System drained down and isolated before cutting in", "Pressure test before covering pipework and before floors are laid", "Press-fit or push-fit where practicable to reduce hot work; otherwise hot work permit", "Unvented cylinders only by G3-qualified plumbers; gas only by Gas Safe engineers"],
    regs: ["Building Regulations Part G: hot water safety; thermostatic mixing valve to baths (48 °C max at the tap in new installations)", "Part L: heating controls, pipe insulation, system commissioning certificate (Benchmark)", "Gas Safety (Installation and Use) Regulations 1998: Gas Safe registered engineer for any gas work", "Water Supply (Water Fittings) Regulations 1999: double check valves on outside taps, no cross connections", "Part H: wastes and soil pipes with correct falls, traps and access"],
    hold: ["Pressure test record before boxing in / screeding", "Gas Safe certificate / Benchmark for the handover file"],
    emergency: [...BASE_EMERGENCY, "Flood: turn off the stopcock, isolate electrics in wet areas", "Gas smell: no switches or flames, open windows, turn off at the meter, leave, call 0800 111 999", "Scald: cool with running water for 20 minutes"],
    talk: ["Where the stopcock and gas meter are", "Pressure testing before covering", "Hot work or press-fit – which and when"] },
  PLASTERING: { match: /plaster|board|skim|insulat|lining|dryline/i, permits: [],
    controls: ["Board lifter for ceilings – no holding boards overhead by hand", "Podiums with guard rails / hop-ups – no buckets, chairs or ladders for ceilings", "Mixing outside or with dust control; masks when mixing and sanding"],
    regs: ["Part L: insulation and vapour control layer fitted continuously, taped at joints – checked before boarding", "Part B: fire-rated board (e.g. 12.5 mm fire board / 2 layers) where the drawings require it, around steels and escape routes", "Part E: acoustic board and insulation where required"],
    hold: ["Building Control pre-plaster (insulation) inspection where required", "First fix of electrics and plumbing complete and tested before boarding"],
    emergency: BASE_EMERGENCY,
    talk: ["Board lifters and podiums", "Dust when mixing and sanding", "Check first fix is signed off before boarding"] },
  TILING: { match: /til|splashback|tanking|backer/i, permits: [],
    controls: ["Wet cutters with RCD protection; no dry cutting of porcelain", "Tanking in wet zones before tiling; floors checked for deflection"],
    regs: ["British Standard BS 5385 tiling practice; tanking to the shower manufacturer's requirements", "Part K: slip resistance in wet areas (client choice – advised)"],
    hold: ["Tanking check before tiling"],
    emergency: BASE_EMERGENCY,
    talk: ["Wet cutter safety", "Knee protection", "Adhesive and grout on skin"] },
  KITCHEN: { match: /kitchen|worktop|unit|appliance|hob|oven|extract|cooker/i, permits: ["ISOLATION"],
    controls: ["Wall units on fixings suitable for the wall type and load", "Worktop cutting with extraction; quartz / sintered templated and cut by the supplier off site", "Appliances connected by qualified trades; gas hob by Gas Safe engineer"],
    regs: ["Part F: cooker hood extracting at least 30 l/s (or 60 l/s if not over the hob), ducted outside", "Part P / BS 7671: cooker circuit and isolation switch; sockets not directly behind the sink", "Gas: hob clearances and flue / ventilation to the manufacturer and Gas Safe engineer"],
    hold: ["Electrics and plumbing first fix tested before units go in"],
    emergency: BASE_EMERGENCY,
    talk: ["Lifting units and worktops", "Silica dust – no cutting of quartz on site", "Isolation before connecting"] },
  JOINERY: { match: /door|skirting|architrave|joinery|hang/i, permits: [],
    controls: ["Mitre saws with extraction and guards; push sticks for small pieces", "Fire doors fitted to the certification (gaps, intumescent strips, three hinges, closers)"],
    regs: ["Part B: fire doors (FD20 / FD30) where specified with self-closers and smoke seals as required", "Part K: door widths and safety glazing in glazed doors"],
    hold: ["Fire door installation check (labels, gaps 2–4 mm, closers) before handover"],
    emergency: BASE_EMERGENCY,
    talk: ["Mitre saw safety", "Fire door rules", "Dust and extraction"] },
  FLOORING: { match: /floor|laminate|LVT|carpet|engineered|vinyl|resin|underlay/i, permits: [],
    controls: ["Subfloor moisture tested before wood or LVT", "Adhesives and resin with ventilation; no ignition sources with solvent adhesives", "Knee pads; cutting outside or with extraction"],
    regs: ["Manufacturer's installation instructions (expansion gaps, moisture limits) – needed for product guarantees", "Underfloor heating: floor finish rated for UFH and commissioned before laying"],
    hold: ["Moisture reading recorded before laying"],
    emergency: BASE_EMERGENCY,
    talk: ["Adhesive and resin fumes", "Knee protection", "Moisture testing"] },
  DECORATING: { match: /paint|decorat|mist coat|emulsion|gloss/i, permits: [],
    controls: ["Podiums / hop-ups for ceilings and stairwells; stairwell platforms for high walls", "Water-based, low-VOC paints in occupied homes; ventilate", "Pre-1970 paint: lead test or treat as lead – no dry sanding or burning off"],
    regs: ["Control of Lead at Work Regulations 2002 where lead paint is found"],
    hold: ["Snagging walk-round before final coat"],
    emergency: BASE_EMERGENCY,
    talk: ["Working at height in stairwells", "Lead paint", "Ventilation and solvent fumes"] },
  TREE_WORK: { match: /tree|stump|hedge|prune|fell/i, permits: [],
    controls: ["Tree Preservation Order and conservation area checked (6 weeks' notice to the council in a conservation area)", "Nesting birds checked (Wildlife and Countryside Act 1981) – no work on active nests", "Aerial rescue plan and a competent second climber present for climbing work"],
    regs: ["Town and Country Planning Act 1990 (TPOs and conservation areas)", "Wildlife and Countryside Act 1981 (nesting birds, bats)"],
    hold: ["TPO / conservation check recorded"],
    emergency: [...BASE_EMERGENCY, "Chainsaw injury: pressure on the wound, call 999 immediately", "Climber injured in the tree: aerial rescue by the trained second climber; call 999"],
    talk: ["Exclusion zones", "Chainsaw PPE", "Aerial rescue plan"] },
  LANDSCAPING: { match: /patio|paving|lawn|turf|fence|drive|garden|deck|gravel|planting|wall|kerb|summer house|garden room|outbuilding|base/i, permits: ["DIG"],
    controls: ["Slab and block cutting with water suppression", "Heavy slabs lifted with slab lifters or by two", "Plant operated by trained, certificated operators with a banksman near people"],
    regs: ["Planning: a new or replacement front drive over 5 m² must be permeable (or drain to a soakaway / lawn) – SuDS guidance", "Dropped kerb: council permission for a new vehicle crossover", "Fences and walls: over 2 m (1 m next to a highway) may need planning", "Garden buildings: permitted development limits (2.5 m high within 2 m of a boundary; under half the garden); Building Regulations for sleeping accommodation or over 15 m² (unless conditions met)"],
    hold: ["Levels and falls checked before laying"],
    emergency: BASE_EMERGENCY,
    talk: ["Silica dust from cutting paving", "Plant and pedestrians", "Lifting slabs"] },
  EXTERIOR_CLEANING: { match: /clean|jet wash|moss|gutter|soft wash/i, permits: ["HEIGHT"],
    controls: ["Water-fed poles from the ground first choice; ladders only for short access and footed", "Pressure washers kept away from electrics; RCD protected", "Biocide run-off kept away from drains, ponds and plants"],
    regs: ["Environmental Permitting: wash water and biocides not into surface water drains", "Biocides used to the product label (Control of Pesticides / BPR)"],
    hold: [],
    emergency: BASE_EMERGENCY,
    talk: ["Slippery surfaces", "Ladder rules", "Biocide handling"] },
  WASTE: { match: /waste|skip|clear|clean/i, permits: [],
    controls: ["Waste carriers checked as registered with the Environment Agency", "Plasterboard segregated; hazardous waste (asbestos, paints, solvents) never in general skips", "Skips covered when blowing waste is possible; not filled above the sides"],
    regs: ["Waste duty of care (Environmental Protection Act 1990 s.34): waste transfer notes kept 2 years; hazardous waste consignment notes kept 3 years", "Skip permit from the council for skips on the road (lit at night)"],
    hold: ["Waste transfer note filed for every skip / load"],
    emergency: BASE_EMERGENCY,
    talk: ["What goes in which skip", "Hazardous waste", "Keeping routes clear"] },
};

/** PPE item → standard, for the RAMS PPE table. */
export const PPE_STANDARDS: [RegExp, string][] = [
  [/boot/i, "EN ISO 20345 (S3 / SRC)"], [/hi-vis/i, "EN ISO 20471 class 2"], [/hard hat|helmet/i, "EN 397"], [/glove.*cut|cut-resistant/i, "EN 388 (cut level C+)"],
  [/heat-resistant/i, "EN 407"], [/chemical|waterproof gloves/i, "EN ISO 374"], [/glove/i, "EN 388"], [/eye|visor/i, "EN 166"], [/hearing|ear/i, "EN 352"],
  [/FFP3|mask/i, "EN 149 FFP3 (face-fit tested)"], [/knee/i, "EN 14404"], [/chainsaw/i, "EN ISO 11393"], [/waterproof/i, "EN 343"],
];
export const ppeStandard = (item: string) => PPE_STANDARDS.find(([re]) => re.test(item))?.[1] ?? "To the task risk assessment";

/** Building Control inspection stages, in order, for the Building Regulations checklist. */
export const BC_STAGES: { id: string; title: string; when: ActivityId[] }[] = [
  { id: "COMMENCE", title: "Commencement notice (at least 2 days before starting)", when: ["SITE_SETUP"] },
  { id: "EXCAVATION", title: "Foundation excavations – before concrete", when: ["EXCAVATION"] },
  { id: "DPC", title: "Damp-proof course / oversite – before covering", when: ["MASONRY", "CONCRETE"] },
  { id: "DRAINS", title: "Drains – before backfilling, and drain test", when: ["DRAINAGE"] },
  { id: "STEEL", title: "Structural steels, bearings and connections – before covering", when: ["STRUCTURAL_STEEL"] },
  { id: "STRUCTURE", title: "Floor / roof structure – before boarding", when: ["CARPENTRY", "ROOFING"] },
  { id: "INSULATION", title: "Insulation & vapour control – pre-plaster", when: ["PLASTERING"] },
  { id: "COMPLETION", title: "Completion inspection, certificates (electrical, gas, FENSA), completion certificate", when: ["ELECTRICAL", "PLUMBING", "GLAZING", "WASTE"] },
];
