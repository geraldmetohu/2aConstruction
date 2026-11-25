// Site visit form: the plan for every visit, from "good morning" to "goodbye", the standard questions, the
// walk-round steps and questions for each type of project, and the finishes to ask about in each room.
// Pure data (no database, no React) so the web form, the PDF and the quote converter all read the same list.
//
// Measurements and specifications that the quote calculator needs (house size, rooms, loft / extension details,
// site set-up) are NOT repeated here: the form shows the calculator's own fields for those, so they go straight
// into the quote. This file holds everything else you ask and check on site.

import type { RoomInput } from "../takeoff/schema";

export type QType = "heading" | "script" | "check" | "text" | "long" | "yesno" | "choice" | "multi" | "number" | "date";
export interface Question {
  id: string;
  /** What is recorded (short – used on the PDF, in summaries and in the quote notes). */
  label: string;
  type: QType;
  /** How to ask it, in natural words (shown above the answer). */
  say?: string;
  options?: string[];
  unit?: string;
  hint?: string;
}
export type Answer = string | number | boolean | string[];
export type Answers = Record<string, Answer>;

export interface Section {
  id: string;
  title: string;
  /** One line under the title: why this part matters / what to do. */
  intro?: string;
  questions: Question[];
}

const q = (id: string, label: string, type: QType = "text", extra: Partial<Question> = {}): Question => ({ id, label, type, ...extra });
const head = (id: string, label: string) => q(id, label, "heading");
/** Ask in natural words, record under a short label. */
const ask = (x: Question, say: string): Question => ({ ...x, say });
const say = (id: string, label: string) => q(id, label, "script");
const tick = (id: string, label: string, hint?: string) => q(id, label, "check", hint ? { hint } : {});
const yes = (id: string, label: string, hint?: string) => q(id, label, "yesno", hint ? { hint } : {});
const pick = (id: string, label: string, options: string[], hint?: string) => q(id, label, "choice", { options, ...(hint ? { hint } : {}) });
const many = (id: string, label: string, options: string[], hint?: string) => q(id, label, "multi", { options, ...(hint ? { hint } : {}) });

// ---------------------------------------------------------------- Project types

export interface ProjectType {
  id: string;
  label: string;
  /** Calculator projects switched on for this type (their fields are filled in on the visit). */
  packages: string[];
  /** Rooms usually added for this type. */
  rooms?: RoomInput["type"][];
  /** The walk-round: what to look at, measure and check, in order. */
  plan: string[];
  questions: Question[];
  photos: string[];
}

export const PROJECT_TYPES: ProjectType[] = [
  {
    id: "EXTENSION", label: "House extension", packages: ["extension"],
    plan: [
      "Walk the garden with the client: where the extension goes, how far out and how wide.",
      "Measure the garden, the proposed footprint and the distance to each boundary.",
      "Check access for a digger, skip and grab lorry (side gate width, through the house, front garden).",
      "Find the drains: lift manhole covers, note depth and which way they run, check for a drain under the footprint.",
      "Look for trees within 5 m and their type (foundation depth), and any boundary walls or fences to come down.",
      "Check ground levels and steps from the house to the garden.",
      "Inside: the rear wall to be opened up, what sits above it (floors, chimney breast), and the window and door heads.",
      "Note the eaves and first floor window sill height (limits a flat roof height) and any boiler flue, gas meter or soil pipe on the rear wall.",
      "Check the party walls with both neighbours and their own extensions.",
    ],
    questions: [
      pick("drawings", "Drawings and planning", ["Nothing yet", "Architect working on it", "Planning submitted", "Planning approved", "Permitted development / lawful development certificate", "Building regs drawings ready"]),
      q("architect", "Architect / designer (name, contact)"),
      yes("engineer", "Structural engineer calculations done?"),
      pick("roof", "Roof the client wants", ["Flat roof", "Pitched roof", "Lean-to", "Flat roof with lantern", "Not sure"]),
      many("rooflights", "Rooflights", ["Lantern", "Flat rooflights", "Velux in pitch", "None"]),
      pick("rearDoors", "Rear doors", ["Bi-fold", "Sliding", "French doors", "Fixed glazing + door", "Not sure"]),
      q("doorColour", "Door and window frame colour (inside / outside)"),
      yes("kitchenIn", "Kitchen going into the extension?"),
      yes("ufh", "Underfloor heating wanted?"),
      q("ceilingHeight", "Ceiling height wanted", "number", { unit: "m" }),
      yes("knockThrough", "Knock through to the existing room(s)?"),
      many("externalFinish", "Outside walls finish", ["Brick to match", "Render", "Cladding", "Not sure"]),
      q("neighbours", "Neighbours: names, attitude, party wall agreement needed?", "long"),
    ],
    photos: ["Rear elevation", "Garden and footprint area", "Side access / gate", "Drains and manholes (lids off)", "Rear wall inside", "Neighbours' boundaries"],
  },
  {
    id: "LOFT", label: "Loft conversion", packages: ["loft"],
    plan: [
      "Go up into the loft (ladder, torch, mask): measure the head height from the top of the ceiling joists to the underside of the ridge (2.2 m or more is workable).",
      "Note the roof structure: traditional cut roof or trussed rafters, purlins, struts, the condition of the timbers and felt.",
      "Find the chimney stacks and breasts, water tanks, pipes and cables that will need moving.",
      "Measure party wall to party wall and front to back; note the hip or gable ends.",
      "On the landing: where the new staircase can land (head height over the stairs), and which doors become fire doors.",
      "Outside: look at the rear roof slope, the dormer position, the roof covering and the neighbours' dormers.",
      "Check the first floor ceilings (cracks, lath and plaster) and whether they can be lowered.",
      "If there are drawings: check the key sizes against the house (ridge height, party wall to party wall, stair position) and note anything that doesn't match.",
      "Look at where the steels will bear (party wall, chimney breast, spine wall) and where they can get in (window, scaffold, roof).",
      "Find the soil stack and where the loft en-suite waste can run; check the hot water system copes with another bathroom.",
    ],
    questions: [
      pick("loftType", "Type of loft the client wants", ["Rear dormer", "L-shaped dormer", "Hip to gable + rear dormer", "Mansard", "Roof-light (Velux) only", "Not sure – advise"]),
      many("loftRooms", "Rooms in the loft", ["Bedroom", "En-suite", "Office", "Storage", "Playroom"]),
      yes("ensuite", "En-suite in the loft?"),
      q("headroom", "Head height measured", "number", { unit: "m" }),
      pick("roofStructure", "Roof structure", ["Traditional cut roof", "Trussed rafters", "Not seen"]),
      yes("tanks", "Water tanks in the loft (system to change)?"),
      pick("stairs", "Staircase", ["Over the existing stairs", "From a bedroom", "Space-saver", "Not sure"]),
      many("loftWindows", "Windows", ["Dormer windows", "Velux front", "Velux rear", "Juliet balcony"]),
      pick("planningLoft", "Planning", ["Permitted development", "Needs planning", "Conservation area", "Not sure"]),
      yes("eavesStorage", "Eaves storage wanted?"),
    ],
    photos: ["Loft space (all directions)", "Ridge and roof timbers", "Chimney stacks", "Landing and stairs", "Rear roof slope from the garden", "Front elevation"],
  },
  {
    id: "KITCHEN", label: "Kitchen", packages: [], rooms: ["KITCHEN"],
    plan: [
      "Measure every wall, window and door, and the height to the ceiling.",
      "Mark the services: sink, gas, boiler, consumer unit, soil and waste pipes, extractor route.",
      "Check the floor (level, tiles to lift, what is underneath) and the walls (plaster condition, tiles).",
      "Ask about any wall to take down or open up, and check what it carries.",
      "Agree the new layout roughly with the client; sketch it on the back of this form.",
    ],
    questions: [
      pick("kitchenSupply", "Who supplies the kitchen", ["Client buys, we fit", "We supply and fit", "Client's own fitter", "Not decided"]),
      q("kitchenBrand", "Kitchen company / range chosen"),
      pick("layoutChange", "Layout", ["Same layout", "New layout", "Open plan (wall to remove)", "Not sure"]),
      many("appliances", "Appliances", ["Oven", "Hob", "Extractor", "Fridge freezer", "Dishwasher", "Washing machine", "Microwave", "Wine cooler", "Boiling water tap"]),
      q("appliancesBy", "Appliances supplied by (client / us)"),
      pick("extractor", "Extractor", ["Wall chimney hood", "Integrated", "Ceiling", "Downdraft", "Recirculating"]),
      yes("boilerMoveK", "Boiler moving?"),
    ],
    photos: ["Every wall of the kitchen", "Services (sink, gas, boiler)", "Floor", "Ceiling"],
  },
  {
    id: "BATHROOM", label: "Bathroom / en-suite", packages: [], rooms: ["BATHROOM"],
    plan: [
      "Measure the room, the window and door, and the ceiling height (and any sloped ceiling).",
      "Find the soil stack and how far the WC and waste can run to it.",
      "Check the water system: combi, system or gravity (tank in loft), and the water pressure at the taps.",
      "Look at the floor (soft spots, rotten joists around the WC) and the walls (tiles, plaster).",
      "Check the extractor route to outside and any window.",
    ],
    questions: [
      pick("waterSystem", "Hot water", ["Combi boiler", "System boiler + cylinder", "Gravity (tank in loft)", "Not sure"]),
      pick("pressure", "Water pressure", ["Good", "Low", "Not checked"]),
      pick("bathLayout", "Layout wanted", ["Bath", "Bath + shower over", "Shower enclosure", "Walk-in / wet room", "Bath and separate shower"]),
      pick("suiteBy", "Who supplies the suite and tiles", ["Client", "Us", "Not decided"]),
      ask(q("bathUsers", "Who uses it (children, elderly, guests)"), "\"Who's going to use it most – the children, guests?\""),
      ask(yes("bathAccess", "Needs easy access (walk-in, grab rails, comfort-height WC)"), "\"Is easy access important – a walk-in shower, grab rails?\""),
    ],
    photos: ["Every wall", "Soil stack", "Floor", "Boiler / cylinder"],
  },
  {
    id: "REFURB", label: "Refurbishment (rooms / whole house)", packages: ["internal"],
    plan: [
      "Go room by room with the client, top to bottom; add each room to the Rooms section as you go.",
      "In each room note the plaster (blown, cracked), ceilings (artex, lath and plaster), floors, skirting, doors and windows.",
      "Check the electrics (consumer unit age, sockets, old rubber or lead cable) and the heating (boiler age, radiators).",
      "Look for damp (tide marks, salts, smell), and anything that may contain asbestos (artex, old floor tiles, boxing).",
    ],
    questions: [
      pick("scope", "Scope", ["A few rooms", "One floor", "Whole house"]),
      yes("rewire", "Rewire needed?"),
      yes("replaster", "Replastering throughout?"),
      yes("artex", "Artex or textured ceilings (asbestos test)?"),
      yes("newHeating", "New heating / radiators?"),
      yes("floorsAll", "New floors throughout?"),
    ],
    photos: ["Each room", "Consumer unit", "Boiler", "Any damp or cracks"],
  },
  {
    id: "ROOF", label: "Roof", packages: ["roofing"],
    plan: [
      "Look at the roof from the street and the garden (and from upstairs windows); note the covering, slopes, valleys and chimneys.",
      "Go into the loft: daylight through the tiles, felt condition, wet timbers, insulation depth.",
      "Check the roofline: fascias, soffits, gutters and downpipes.",
      "Check scaffold access on each side and any conservatory or extension roofs in the way.",
    ],
    questions: [
      pick("roofProblem", "Why the roof work", ["Leaking", "Old / slipped tiles", "Selling / survey", "Full renewal", "Roofline only"]),
      pick("covering", "Current covering", ["Concrete interlocking", "Concrete plain", "Natural slate", "Fibre cement slate", "Clay plain", "Clay pantile", "Felt / flat"]),
      q("leakWhere", "Where it leaks / damage seen", "long"),
      many("chimneys", "Chimneys", ["Repoint", "Re-flash", "Remove", "Cap", "None"]),
      q("roofline", "Roofline colour (fascia, gutters)"),
    ],
    photos: ["Front and rear slopes", "Chimneys", "Loft underside", "Gutters and fascias", "Scaffold access"],
  },
  {
    id: "CONVERSION", label: "Garage conversion", packages: ["conversion"],
    plan: [
      "Measure the garage inside and the door opening.",
      "Check the floor (slab level against the house), the walls (single skin?), the roof and the ceiling height.",
      "Check the foundations under the garage door (a new wall needs them) and the damp course.",
      "Find the services nearby: consumer unit, water, waste, heating.",
    ],
    questions: [
      pick("garageUse", "What the garage becomes", ["Bedroom", "Office", "Living room", "Gym / studio", "Utility & WC", "Kitchen extension"]),
      pick("garageFront", "Front opening", ["Window + brick infill", "Door + window", "Full glazing"]),
      yes("garageWc", "WC / shower needed?"),
      pick("planningGarage", "Planning", ["Permitted development", "Needs planning", "Not sure"]),
    ],
    photos: ["Garage inside", "Garage door from outside", "Floor and walls", "Services"],
  },
  {
    id: "OUTBUILDING", label: "Garden room / outbuilding", packages: ["outbuilding"],
    plan: [
      "Mark where it goes and measure it; measure the distance to each boundary (within 2 m means 2.5 m height limit).",
      "Check the ground (slope, roots, soft ground) and access for materials through the side or house.",
      "Measure the cable and water runs from the house.",
    ],
    questions: [
      pick("roomUse", "What it is for", ["Office", "Gym", "Studio", "Summer house", "Annexe (sleeping – needs planning)", "Storage"]),
      yes("roomWater", "Water / WC needed?"),
      many("roomFinish", "Outside finish", ["Timber cladding", "Composite cladding", "Render", "Not sure"]),
    ],
    photos: ["The spot in the garden", "Access route", "Boundaries"],
  },
  {
    id: "EXTERNAL", label: "Render, brickwork & outside walls", packages: ["external"],
    plan: [
      "Measure each elevation (width × height) and note windows and doors.",
      "Check the existing render or brick: hollow areas, cracks, damp, pointing.",
      "Note downpipes, cables, satellite dishes and anything fixed to the walls.",
    ],
    questions: [
      pick("renderType", "Finish wanted", ["Silicone render", "Monocouche", "Sand & cement + paint", "External wall insulation (EWI)", "Repointing / brick repair"]),
      q("renderColour", "Colour"),
      many("elevations", "Elevations", ["Front", "Rear", "Left side", "Right side"]),
    ],
    photos: ["Each elevation", "Close-ups of damage"],
  },
  {
    id: "GARDEN", label: "Garden & landscaping", packages: ["garden"],
    plan: [
      "Walk the garden and measure each area: lawn, patio, paths, beds, fences.",
      "Check the levels, the drainage (where water sits) and access for a digger and skip.",
      "Note trees, sheds and anything to remove.",
    ],
    questions: [
      many("gardenWork", "Work wanted", ["Patio", "Paths", "Driveway", "Decking", "Lawn / artificial grass", "Fencing", "Walls", "Planting", "Lighting", "Clearance"]),
      q("patioStone", "Patio stone / colour"),
      q("fenceType", "Fence type and height"),
    ],
    photos: ["Whole garden from the house", "Each area", "Access"],
  },
  {
    id: "BASEMENT", label: "Basement / cellar", packages: ["basement"],
    plan: [
      "Measure the cellar and its head height; check the floor and walls for water.",
      "Note the access (stairs, hatch, light well) and the drains level.",
    ],
    questions: [pick("basementUse", "Use", ["Habitable room", "Storage", "Not decided"]), yes("waterIn", "Water coming in?")],
    photos: ["Cellar walls and floor", "Access", "Front light well"],
  },
  {
    id: "DAMP", label: "Damp & structural repairs", packages: ["damp"],
    plan: [
      "Take meter readings on the affected walls and note heights; look for salts and the outside ground level against the DPC.",
      "Check gutters, downpipes and leaks above, and the air bricks.",
      "Lift a floorboard if possible to check the joists and void.",
    ],
    questions: [q("dampWhere", "Where and how high", "long"), pick("dampType", "Likely cause", ["Rising damp", "Penetrating", "Condensation", "Leak", "Not sure – survey"])],
    photos: ["Affected walls", "Outside ground level", "Air bricks"],
  },
  {
    id: "WINDOWS", label: "Windows & doors", packages: ["windows"],
    plan: ["Count and measure each window and outside door (width × height), note the style and the opening.", "Check the reveals, sills and lintels."],
    questions: [
      pick("windowMaterial", "Material", ["uPVC", "Aluminium", "Timber sash", "Timber casement", "Composite (doors)"]),
      q("windowColour", "Colour inside / outside"),
      pick("glazing", "Glazing", ["Double", "Triple", "Acoustic", "Obscure where needed"]),
    ],
    photos: ["Each window and door", "Front elevation"],
  },
  {
    id: "HEATING", label: "Heating & boiler", packages: ["heating"],
    plan: ["Find the boiler: make, model, age, flue position, gas meter and pipe size.", "Count the radiators and note their sizes and valves.", "Check the hot water system and the water pressure."],
    questions: [
      q("boiler", "Current boiler (make, age, location)"),
      pick("heatingWant", "What the client wants", ["New combi", "System boiler + cylinder", "Heat pump", "New radiators only", "Powerflush / service"]),
      yes("smartControls", "Smart thermostat wanted?"),
    ],
    photos: ["Boiler and flue", "Gas meter", "Cylinder", "Radiators"],
  },
  {
    id: "ELECTRICS", label: "Electrics / rewire", packages: [],
    plan: ["Check the consumer unit (age, RCD protection, fuse wire), the meter and the earthing.", "Look at the cable types (old rubber, lead, black) and socket numbers in each room."],
    questions: [
      pick("elecScope", "Work wanted", ["Full rewire", "Partial rewire", "New consumer unit", "Extra sockets / lights", "EICR test", "EV charger", "Solar / battery"]),
      q("cuAge", "Consumer unit type and age"),
    ],
    photos: ["Consumer unit", "Meter", "Old cabling"],
  },
  {
    id: "AIRCON", label: "Air conditioning", packages: ["aircon"],
    plan: [
      "Agree which rooms get an indoor unit and where it goes on the wall (away from the bed head, over a door or window).",
      "Find where the outdoor condenser(s) can go: side or rear wall, flat roof or ground, away from the neighbours' windows.",
      "Plan the pipe and drain runs from each unit (through the loft, boxed down, or hidden in walls) and where the condensate drains.",
      "Check the consumer unit has space for a new circuit.",
    ],
    questions: [
      ask(many("acRooms", "Rooms with air con", ["Loft bedrooms", "First floor bedrooms", "Living room", "Office", "Kitchen"]), "\"Which rooms would you like the air con in?\""),
      ask(pick("acUse", "Mainly for", ["Cooling", "Heating and cooling", "Not sure"]), "\"Is it mainly for the summer, or would you use it to heat as well?\""),
      ask(pick("acStyle", "Indoor unit style", ["Standard white", "Black / dark", "Mirror / designer", "Ceiling cassette", "Not decided"]), "\"Have you seen any units you like? There are some nice black and mirror ones now.\""),
      ask(q("acCondenser", "Where the outdoor unit(s) can go"), "\"Where would you be happy for the outdoor unit to go?\""),
      yes("acHidden", "Pipes hidden in walls (not trunking)"),
    ],
    photos: ["Each wall where a unit goes", "Outdoor condenser position", "Consumer unit"],
  },
  {
    id: "DECOR", label: "Decorating & flooring only", packages: [],
    plan: ["Go room by room; add each room to the Rooms section with what needs painting and the floor wanted."],
    questions: [pick("decorScope", "Scope", ["Walls & ceilings", "Woodwork too", "Full redecoration", "Floors only"]), yes("furniture", "Furniture to move / cover?")],
    photos: ["Each room"],
  },
];
/** How to ask the project questions, in natural words. */
const PROJECT_SAY: Record<string, string> = {
 "EXTENSION.drawings": "Have you had any drawings done yet, or applied for planning?",
 "EXTENSION.roof": "Are you thinking a flat roof with a lantern, or a pitched roof?",
 "EXTENSION.rearDoors": "For the back, are you imagining bi-folds or big sliding doors?",
 "EXTENSION.kitchenIn": "Will the kitchen be moving into the new space?",
 "EXTENSION.ufh": "Would you like underfloor heating in there?",
 "EXTENSION.neighbours": "Have you mentioned it to the neighbours yet? How do you get on?",
 "LOFT.loftType": "What sort of loft are you picturing – a dormer at the back, or the hip-to-gable as well?",
 "LOFT.loftRooms": "What would you like up there – one big bedroom, two, an office?",
 "LOFT.ensuite": "Would you like a shower room or en-suite up there?",
 "LOFT.stairs": "Where do you imagine the stairs going? Over the existing stairs is usually best.",
 "LOFT.loftWindows": "Do you want the dormer windows at the back and Velux windows at the front?",
 "LOFT.planningLoft": "Has the architect said if it's permitted development, or does it need planning?",
 "LOFT.eavesStorage": "Would you like us to build storage into the eaves?",
 "KITCHEN.kitchenSupply": "Have you chosen a kitchen yet, or would you like us to supply it?",
 "KITCHEN.layoutChange": "Are you keeping the same layout, or opening it up?",
 "KITCHEN.appliances": "Which appliances are going in?",
 "BATHROOM.bathLayout": "Bath, shower, or both?",
 "BATHROOM.suiteBy": "Have you started looking at bathrooms and tiles? Would you like to buy them yourself, or shall we supply?",
 "BATHROOM.pressure": "Do you find the shower pressure OK at the moment?",
 "REFURB.scope": "Which rooms are you thinking of doing?",
 "ROOF.roofProblem": "What's made you look at the roof – a leak, or is it just getting old?",
 "HEATING.heatingWant": "Is the boiler staying, being moved, or are you thinking of replacing it?"
};
for (const p of PROJECT_TYPES) for (const x of p.questions) { const w = PROJECT_SAY[`${p.id}.${x.id}`]; if (w && !x.say) x.say = `"${w}"`; }
export const projectType = (id: string) => PROJECT_TYPES.find(p => p.id === id);

// ---------------------------------------------------------------- The visit, in order

export const BEFORE: Section = {
  id: "before", title: "Before the visit", intro: "Prepare the day before so you walk in knowing the house, the drawings and the client.",
  questions: [
    tick("confirm", "Confirmed the appointment the day before", "\"Hi, it's … from 2A Construction – just confirming I'll see you tomorrow at … . Is there anywhere best to park?\""),
    tick("enquiry", "Read their enquiry, estimator answers, photos and any drawings they sent"),
    tick("drawings", "Read the architect's drawings and the engineer's calculations, and marked what to check on site"),
    tick("planning", "Checked the council planning portal (history, conservation area, listed building, article 4)"),
    tick("streetView", "Looked at the house on Street View and satellite: type, roof, rear, neighbours, parking"),
    tick("parking", "Checked parking and permits for the visit"),
    tick("kit", "Kit: laser measure, tape, moisture meter, torch, ladder, camera / phone charged, mask, shoe covers"),
    tick("samples", "Brought tile, door-handle and colour samples, the brochure and portfolio photos on the tablet"),
    tick("form", "This form ready (on the tablet or printed)"),
    q("prepNotes", "What I already know / things to check", "long"),
  ],
};

/** Talking to our own team: before the visit, and the briefing for the people who will do the job. */
export const TEAM: Section = {
  id: "team", title: "Brief the team", intro: "Two minutes with whoever comes with you, before you knock. Same again later with the site manager and the trades.",
  questions: [
    head("van", "In the van, before you knock"),
    say("brief", "\"Right, quick one before we go in. This is … – it's a … . She's (they've) already had a couple of quotes, so let's be on top form. I'll do the talking on price and dates; can you have a proper look at the loft, the roof and the access and take the photos?\""),
    q("whoComes", "Who came with me and their role"),
    tick("roles", "Agreed who talks, who measures and who takes photos"),
    tick("manners", "Phones on silent, shoe covers on, no smoking near the house, no swearing – even outside"),
    say("noPrices", "\"If anyone asks about price, dates or 'can you just…', say: 'Good question – … will put all of that in the quote so it's in writing.' We never guess numbers on the doorstep.\""),
    tick("noPromises", "Team knows not to promise prices, dates or extras on site"),
    head("household", "Talking with the household"),
    say("kids", "Be friendly with everyone in the house – children, parents, a cleaner or a nanny – but only agree things with the person who decides."),
    q("otherPeople", "Other people at the house (names, who they are)"),
    head("handover", "For the site team later"),
    q("crewNotes", "What the trades must know (pets, alarm, parking, people working from home, no-go rooms)", "long"),
  ],
};

export const ARRIVAL: Section = {
  id: "arrival", title: "Arrival: good morning", intro: "First five minutes: warm, on time, and tell them how the visit will go.",
  questions: [
    say("hello", "\"Good morning! I'm … from 2A Construction – you must be … . Lovely to meet you, thanks for having us.\""),
    say("colleague", "\"This is … , who works with me – they'll be measuring and taking a few photos while we chat.\""),
    tick("onTime", "Arrived on time (or called ahead if late)"),
    ask(yes("parkedOk", "Parked where they're happy"), "\"Is the van OK where it is, or would you rather I moved it?\""),
    tick("shoes", "Shoe covers on, asked where to put bags and tools"),
    ask(yes("timeOk", "Client has about an hour"), "\"Is now still a good time? It usually takes about an hour – have you got that long?\""),
    say("plan", "\"Here's how I'd like to do it: we sit down for ten minutes so you can tell me what you have in mind, then we walk round together. I'll measure and take some photos, we'll talk through the finishes – tiles, doors, flooring and so on – and I'll finish by telling you exactly what happens next. Does that sound OK?\""),
    tick("photosOk", "Asked permission to take photos and measurements"),
    tick("whoHere", "Met everyone who decides (partner, family, landlord)"),
  ],
};

export const CLIENT: Section = {
  id: "client", title: "The client and the project", intro: "Sit down first and let them talk. Ask, listen, and write their words – it's what goes in the quote letter.",
  questions: [
    head("people", "Getting to know them"),
    ask(q("deciders", "Who decides (names)"), "\"Will anyone else be involved in the decision – a partner or family?\""),
    ask(q("household", "Who lives here (children, pets, health needs)"), "\"Who lives here at the moment? Any little ones or pets we should know about?\""),
    ask(pick("contactBy", "Best way to contact", ["Phone", "WhatsApp", "Email", "Text"]), "\"What's the best way to get hold of you – call, WhatsApp or email?\""),
    ask(q("bestTime", "Best time to call"), "\"And is there a good time of day?\""),
    head("hWhy", "Why this project, and why now"),
    ask(q("why", "Why now", "long"), "\"So what's got you thinking about doing this now?\""),
    ask(q("goal", "What they want it to be (their words)", "long"), "\"If you picture it finished, what does it look like? How will you use the space day to day?\""),
    ask(q("whoFor", "Who the new rooms are for"), "\"Who will be using the new rooms?\""),
    ask(q("lookingFor", "What they're looking for most", "long"), "\"What's most important to you – more space, a bigger bathroom, adding value, a quiet office…?\""),
    ask(q("mustHave", "Must-haves", "long"), "\"What's absolutely non-negotiable for you?\""),
    ask(q("niceToHave", "Nice-to-haves", "long"), "\"And what would be lovely if the budget allows?\""),
    ask(q("worries", "Worries (mess, noise, time, cost, neighbours)", "long"), "\"Is there anything you're worried about with the work – the mess, the noise, how long it takes, the cost?\""),
    ask(q("pastBuilders", "Past building work and how it went"), "\"Have you had building work done before? How did it go – anything you'd want done differently this time?\""),
    head("hWhyUs", "Why us"),
    ask(pick("heardFrom", "How they heard about us", ["Google", "Checkatrade", "Recommendation", "Facebook / Instagram", "Saw a site / van", "Repeat client", "Architect", "Other"]), "\"How did you come across us?\""),
    ask(q("whyUs", "Why they called us"), "\"What made you want to get us round?\""),
    ask(many("choosing", "What matters most choosing a builder", ["Price", "Quality of finish", "Speed", "Reliability / trust", "Communication", "Guarantee", "Recommendations", "Tidiness"]), "\"When you're choosing who to go with, what matters most to you?\""),
    head("timing", "Timing"),
    ask(q("startWish", "When they'd like to start", "date"), "\"When would you ideally like us to start?\""),
    ask(pick("startFlex", "How flexible the start is", ["Fixed date", "A few weeks either way", "Flexible", "Waiting on something (planning, party wall, money)"]), "\"How flexible is that?\""),
    ask(q("deadline", "Must be finished by (and why)"), "\"Is there anything we need to be finished by – a baby, a holiday, Christmas, family coming to stay?\""),
    ask(yes("livingIn", "Living in the house during the works"), "\"Are you planning to stay in the house while we work?\""),
    ask(yes("wfh", "Someone works from home"), "\"Does anyone work from home? We'll plan the noisy jobs around your calls.\""),
    ask(q("holidays", "Holidays / times away during the works"), "\"Any holidays booked in the next few months? Sometimes that's a good time to do the messiest bits.\""),
    head("money", "Budget"),
    ask(pick("budget", "Budget in mind", ["Under £10k", "£10–25k", "£25–50k", "£50–80k", "£80–120k", "£120k+", "Not sure / would like advice"]), "\"Have you got a budget in mind? It just helps me suggest the right finishes – no pressure at all.\""),
    ask(pick("budgetFirm", "Is the budget firm", ["Firm limit", "Rough guide", "Not sure"]), "\"Is that a firm limit, or more of a guide?\""),
    ask(yes("finance", "Need finance / waiting on a mortgage or remortgage"), "\"Is the money ready, or are you waiting on a remortgage or anything like that?\""),
    head("quotes", "Other quotes and deciding"),
    ask(yes("otherQuotes", "Getting other quotes"), "\"Are you getting a few prices? Completely normal – we'd suggest it.\""),
    ask(q("otherQuotesCount", "How many other quotes", "number"), "\"How many builders have you had round, or are you planning to?\""),
    ask(q("otherQuotesDetail", "What they liked / didn't like about the others (and prices if they share)", "long"), "\"Was there anything you liked or didn't like about the others? Anything they suggested that you'd want us to look at?\""),
    ask(q("decideBy", "When they will decide", "date"), "\"When are you hoping to make a decision?\""),
    head("paperwork", "Paperwork"),
    ask(pick("tenure", "Ownership", ["Freehold", "Leasehold (freeholder consent needed)", "Rented (landlord consent)", "Not sure"]), "\"Do you own the freehold?\""),
    ask(yes("insurer", "Told their home insurer / lender"), "\"Have you let your home insurance know? They usually want to hear about building work.\""),
    ask(pick("partyWall", "Party wall notices", ["Not needed", "Not served yet", "Served – waiting", "Agreed with neighbours", "Surveyor appointed"]), "\"Have you spoken to the neighbours about the party wall yet?\""),
  ],
};

export const PROPERTY: Section = {
  id: "property", title: "The property", intro: "The house details below go straight into the quote. Add what you see on site here.",
  questions: [
    q("condition", "General condition", "long"),
    ask(yes("asbestos", "Anything that may contain asbestos (artex, old floor tiles, boxing, garage roof)?", "Before 2000: assume yes until tested."), "\"Do you know if there's ever been an asbestos survey? With a house this age it's just something we check.\""),
    ask(q("stopcock", "Stopcock location"), "\"Do you know where the stopcock is?\""),
    q("gasMeter", "Gas meter location"),
    q("electricMeter", "Electric meter and consumer unit (location, age)"),
    q("boilerInfo", "Boiler (make, age, location)"),
    pick("waterPressure", "Water pressure", ["Good", "Low", "Not checked"]),
    q("drains", "Drains (manholes, which way they run, soil stack position)"),
    q("loftAccess", "Loft access"),
    yes("conservation", "Conservation area / listed building?"),
    ask(q("knownProblems", "Problems they know about (leaks, cracks, damp)", "long"), "\"Is there anything about the house we should know – leaks, cracks, damp, things that have been patched up?\""),
  ],
};

export const SITE: Section = {
  id: "site", title: "Site set-up and logistics", intro: "How we will work at the house. The scaffold, skips and fees below go straight into the quote.",
  questions: [
    ask(pick("skipWhere", "Skip goes", ["On the drive", "On the road (permit)", "Grab lorry instead", "Wait and load"]), "\"Where would you be happy for a skip to go – on the drive, or shall we get a road permit?\""),
    ask(q("vanParking", "Van parking for the team"), "\"Is there anywhere the lads can park in the day?\""),
    ask(q("hours", "Working hours allowed (8–6 weekdays, Saturdays?)"), "\"We normally work 8 till 5, Monday to Friday. Is that OK? Would you mind the odd Saturday morning?\""),
    ask(many("facilities", "We can use", ["Toilet", "Water", "Electricity", "Storage space", "Garage / shed"]), "\"Would you be OK with the team using a toilet, or shall we bring a portaloo?\""),
    ask(q("keys", "Keys, alarm and access arrangements"), "\"If you're out, how would you like us to get in – a key, a lockbox?\""),
    ask(q("neighboursSite", "Neighbours (names, access over their land, how they get on)"), "\"How do you get on with the neighbours? We always knock and introduce ourselves before we start.\""),
    ask(q("protect", "What must be protected (floors, stairs, furniture, garden)"), "\"Is there anything precious we need to be extra careful with – floors, the stairs, furniture, the garden?\""),
    ask(q("houseRules", "House rules (pets, rooms out of bounds, music, smoking)"), "\"Any house rules we should know about?\""),
  ],
};

export const PHOTOS: Section = {
  id: "photos", title: "Photos and measurements", intro: "Tick off as you go. Take more photos than you think you need.",
  questions: [
    tick("front", "Front of the house"),
    tick("rear", "Rear of the house and garden"),
    tick("rooms", "Every room in the works (all walls, ceiling, floor)"),
    tick("services", "Consumer unit, boiler, stopcock, meters"),
    tick("problems", "Every crack, damp patch or problem the client mentioned"),
    tick("access", "Access route, parking and skip position"),
    tick("measured", "All rooms and areas measured"),
  ],
};

export const FINISHES_INTRO: Section = {
  id: "finishes", title: "Finishes", intro: "Agree who chooses and who buys the finishes, then go room by room in the Rooms section.",
  questions: [
    ask(pick("who", "Who supplies the finishes (tiles, suite, kitchen, floors, light fittings)", ["Client supplies the finishes", "We supply everything", "Mixed – decide per item"]), "\"Some clients like to choose and buy their own tiles, bathroom and flooring, and we fit them; others prefer us to supply everything. What would suit you?\""),
    ask(many("style", "Overall style", ["Modern", "Classic / period", "Scandi", "Industrial", "Farmhouse", "Hotel / luxury", "Not decided"]), "\"How would you describe the look you're going for?\""),
    ask(q("inspiration", "Inspiration (Pinterest / Instagram, showrooms, photos sent)"), "\"Have you saved any pictures – Pinterest, Instagram, showrooms? Could you send them over to me?\""),
    ask(q("showrooms", "Showrooms / suppliers they like"), "\"Have you been to any showrooms yet? We can recommend a few, and our trade discount usually helps.\""),
    ask(yes("sendList", "Send them our finishes checklist to fill in?"), "\"I'll send you our finishes checklist so you can think about it at home – no rush.\""),
  ],
};

export const CLOSING: Section = {
  id: "closing", title: "Before you leave: goodbye", intro: "Last ten minutes: sum up in their words, agree next steps and dates, and leave on a good note.",
  questions: [
    say("summary", "\"So, just to make sure I've got it right: you'd like … , ideally starting around … , and what matters most to you is … . Have I missed anything?\""),
    tick("summed", "Summed up the job and the client agreed"),
    say("nextSteps", "\"Next, I'll put together a full itemised quote with a programme and a payment plan. You'll get an email with a link to your own client area, where you can read it, choose your finishes and accept online when you're ready.\""),
    ask(q("quoteBy", "Quote promised by", "date"), "\"You'll have it by … – is that OK for you?\""),
    say("payment", "\"The way we work is a small deposit, stage payments as each stage is finished, and a 5% final payment when it's all done and you're happy. Our prices are held for 30 days.\""),
    ask(tick("questions", "Asked if they have any questions"), "\"Is there anything you'd like to ask me – anything at all?\""),
    q("clientQuestions", "Their questions and my answers", "long"),
    tick("brochure", "Left the brochure / business card"),
    ask(q("followUp", "Follow-up call booked for", "date"), "\"Would it be OK if I gave you a quick call a couple of days after you get the quote, to go through it?\""),
    say("bye", "\"Thank you so much for your time today – it's a lovely house and it'll be a great project. Speak soon!\""),
  ],
};

export const AFTER: Section = {
  id: "after", title: "After the visit (office and team)",
  questions: [
    head("office", "Same day"),
    tick("thanks", "Thank-you message sent the same day", "\"Thanks again for having us today, … – it was lovely to meet you. I'll have your quote over by … . Any questions in the meantime, just message me.\""),
    tick("photosUploaded", "Photos saved to the client's file"),
    head("handover", "Handover to the office and site manager"),
    say("handoverScript", "\"Quick handover on … : she wants … , ideally starting … . What matters most to her is … ; she's worried about … . She's had … other quotes. Tiles and finishes: … . House rules: … . I've promised the quote by … .\""),
    tick("handedOver", "Handed over to the office / site manager"),
    head("quote", "The quote"),
    tick("quoteMade", "Quote made in the calculator from this visit"),
    tick("structure", "Structure, steels and materials checked against the drawings and calculations"),
    tick("sent", "Quote sent by the promised date"),
    tick("called", "Follow-up call made"),
    q("internal", "Internal notes (risks, how keen, competition)", "long"),
  ],
};

// ---------------------------------------------------------------- Room finishes

export interface RoomQuestion extends Question { types?: RoomInput["type"][]; floors?: RoomInput["floor"][] }
const WET: RoomInput["type"][] = ["BATHROOM", "ENSUITE", "WC"];
const DRY: RoomInput["type"][] = ["BEDROOM", "LIVING", "DINING", "KITCHEN", "HALL", "LANDING", "STAIRS", "OFFICE", "UTILITY", "OTHER"];
const STAIRS: RoomInput["type"][] = ["HALL", "LANDING", "STAIRS"];
const rq = (x: Question, types?: RoomInput["type"][], floors?: RoomInput["floor"][]): RoomQuestion => ({ ...x, ...(types ? { types } : {}), ...(floors ? { floors } : {}) });
const TILE_SIZES = ["300 × 600", "600 × 600", "600 × 1200", "Metro 75 × 150", "Metro 100 × 300", "Square 100 × 100", "Mosaic", "Hexagon", "Zellige / handmade", "Not decided"];

/** Finishes to ask about in each room (the quote calculator's own fields for the room are shown with them). */
export const ROOM_FINISHES: RoomQuestion[] = [
  rq(head("hUse", "How the room will be used")),
  rq(ask(q("roomUse", "Who uses it and how"), "\"Who's going to use this room, and what for?\"")),
  rq(ask(q("furniture", "Furniture to fit (bed size, desk, wardrobes) and where"), "\"Where are you thinking the bed (desk, sofa) will go?\""), DRY),
  rq(head("hWalls", "Walls, ceiling and woodwork")),
  rq(ask(q("wallColour", "Wall colour(s) and brand"), "\"Have you got a colour in mind for the walls? Any particular brand – Dulux, Farrow & Ball?\"")),
  rq(ask(pick("wallSheen", "Wall finish", ["Matt", "Flat matt", "Eggshell", "Silk", "Washable / durable matt"]), "\"Flat matt, or something more wipeable?\"")),
  rq(q("ceilingColour", "Ceiling colour")),
  rq(ask(q("woodColour", "Woodwork colour and finish (skirting, doors, frames)"), "\"Woodwork in white, or the same colour as the walls?\"")),
  rq(pick("ceilingFinish", "Ceiling finish", ["Smooth", "Keep existing", "Remove artex", "Not decided"])),
  rq(pick("coving", "Coving / cornice", ["None", "Plain coving", "Ornate cornice", "Shadow gap", "Keep existing", "Match existing"])),
  rq(q("featureWall", "Feature wall (paint, wallpaper, panelling)")),
  rq(head("hJoinery", "Skirting, architraves and doors")),
  rq(pick("skirtingProfile", "Skirting profile", ["Torus", "Ogee", "Pencil round", "Chamfered", "Square", "Victorian", "Match existing"])),
  rq(q("skirtingHeight", "Skirting height", "number", { unit: "mm" })),
  rq(pick("architrave", "Architrave profile", ["Torus", "Ogee", "Pencil round", "Chamfered", "Victorian", "Match existing"])),
  rq(ask(pick("doorStyle", "Door style", ["Flush", "4-panel", "6-panel", "Shaker", "Glazed", "Oak", "Pocket / sliding", "Keep existing"]), "\"For the doors, are you thinking something simple like a shaker, or a panelled or glazed door?\"")),
  rq(pick("doorFinish", "Door finish", ["White primed / painted", "Oak", "Walnut", "Painted colour", "Keep existing"])),
  rq(ask(pick("ironmongery", "Handles, hinges and locks finish", ["Chrome", "Satin chrome", "Brushed brass", "Matt black", "Antique bronze", "Keep existing"]), "\"Door handles – chrome, black, brushed brass? And lever handles or knobs?\"")),
  rq(pick("handleType", "Handle type", ["Lever on rose", "Lever on backplate", "Knob", "Not decided"])),
  rq(head("hHeat", "Radiators, windows and air con")),
  rq(ask(pick("radiatorStyle", "Radiator style", ["Panel", "Column", "Vertical", "Designer", "Keep existing", "No radiator"]), "\"Standard white radiators, or something like a column or a vertical one?\"")),
  rq(pick("radiatorColour", "Radiator colour", ["White", "Anthracite", "Black", "Chrome", "Other"])),
  rq(pick("valves", "Radiator valves", ["White", "Chrome", "Brass", "Black"])),
  rq(q("radiatorPosition", "Radiator position (under window, moved, behind door)")),
  rq(q("windowFinish", "Windows: frame colour, handles, sill (tiled / timber / uPVC)")),
  rq(ask(q("rooflights", "Roof windows: finish (white / pine), blinds (blackout, electric), manual / electric / solar"), "\"For the Velux windows, would you like blackout blinds? Manual, or the solar ones with a remote?\""), undefined, ["LOFT"]),
  rq(ask(q("eaves", "Eaves storage / built-in wardrobes"), "\"We can build storage into the eaves, or fitted wardrobes – would that be useful?\""), DRY, ["LOFT"]),
  rq(ask(q("aircon", "Air con: unit style and colour, position, controls"), "\"For the air con, where would you like the indoor unit? White, or a black or mirror finish?\""), ["BEDROOM", "LIVING", "OFFICE"]),
  rq(head("hFloor", "Floor")),
  rq(ask(pick("floorType", "Floor wanted", ["Carpet", "Engineered wood", "Laminate", "LVT", "Tiles", "Solid wood", "Keep existing", "Not decided"]), "\"What would you like on the floor in here?\""), DRY),
  rq(q("floorFinish", "Floor: colour / wood tone, plank size, pattern (straight / herringbone), direction")),
  rq(pick("carpet", "Carpet type", ["Twist", "Saxony", "Loop / berber", "Wool", "Not carpet"]), ["BEDROOM", "LIVING", "LANDING", "STAIRS", "HALL", "OFFICE"]),
  rq(pick("thresholds", "Door thresholds", ["Brushed chrome", "Brass", "Black", "Wood to match", "Flush (no bar)"])),
  rq(head("hStairs", "Stairs and balustrade"), STAIRS),
  rq(ask(pick("balustrade", "Balustrade", ["Square spindles", "Turned spindles", "Glass", "Metal", "Keep existing"]), "\"For the new stairs, what kind of balustrade do you like – square spindles, glass?\""), STAIRS),
  rq(pick("handrail", "Handrail and newels", ["Oak", "Painted pine", "Oak handrail, painted spindles", "Match existing"]), STAIRS),
  rq(pick("stairFinish", "Stair treads", ["Carpet", "Carpet runner", "Oak treads", "Painted"]), STAIRS),
  rq(head("hElec", "Lights, switches and sockets")),
  rq(ask(pick("lightTemp", "Light colour", ["Warm white (2700–3000K)", "Neutral (4000K)", "Selectable", "Not decided"]), "\"Do you like a warm light or a brighter, whiter light?\"")),
  rq(q("lightFittings", "Light fittings (spots and bezel colour, pendants, wall lights, LED strips) and positions")),
  rq(ask(pick("switches", "Switches and sockets", ["White plastic", "White flat plate", "Brushed steel", "Polished chrome", "Brushed brass", "Matt black", "Keep existing"]), "\"Switches and sockets in white, or a metal finish like brushed steel or black?\"")),
  rq(ask(q("sockets", "Extra sockets, USB, TV / data points – positions and heights"), "\"Let's think about where you'll need sockets – bedside, desk, TV?\"")),
  rq(q("blinds", "Curtain poles / blinds to fit")),
  // Kitchen
  rq(head("hKitchen", "Kitchen"), ["KITCHEN"]),
  rq(q("kitchenDoors", "Kitchen door style and colour"), ["KITCHEN"]),
  rq(q("kitchenHandles", "Handles (or handleless)"), ["KITCHEN"]),
  rq(q("worktopFinish", "Worktop material, colour and thickness"), ["KITCHEN"]),
  rq(pick("sink", "Sink", ["Inset", "Undermount", "Belfast", "Composite", "Stainless steel"]), ["KITCHEN"]),
  rq(q("tap", "Tap (and boiling water tap?)"), ["KITCHEN"]),
  rq(q("splashback", "Splashback (tiles – size, colour, layout – glass or worktop upstand)"), ["KITCHEN"]),
  // Bathroom, en-suite, WC
  rq(head("hSuite", "Bathroom suite"), WET),
  rq(ask(pick("suiteStyle", "Suite style", ["Modern", "Traditional", "Not decided"]), "\"Modern and clean, or more traditional?\""), WET),
  rq(pick("wc", "WC", ["Close coupled", "Back to wall", "Wall hung", "Rimless", "Keep existing"]), WET),
  rq(pick("basin", "Basin", ["Vanity unit", "Pedestal", "Wall hung", "Countertop"]), WET),
  rq(q("vanity", "Vanity unit size and colour"), WET),
  rq(ask(pick("shower", "Shower", ["Thermostatic mixer", "Electric", "Rainhead + handset", "Over the bath", "None"]), "\"For the shower, would you like a big rainfall head as well as a handset?\""), WET),
  rq(q("screen", "Shower screen / tray / enclosure (size, walk-in, frameless)"), WET),
  rq(pick("trayType", "Shower floor", ["Stone resin tray", "Low-profile tray", "Wet room (tiled floor)", "Bath"]), WET),
  rq(pick("brassware", "Taps and shower finish", ["Chrome", "Matt black", "Brushed brass", "Gunmetal", "Brushed nickel"]), WET),
  rq(q("mirror", "Mirror / cabinet, shaver socket, LED mirror"), WET),
  rq(q("bathExtractor", "Extractor route"), WET),
  rq(q("accessories", "Towel rail size / colour, toilet roll holder, hooks"), WET),
  rq(head("hTiles", "Tiles"), WET),
  rq(ask(pick("tileSupply", "Who supplies the tiles", ["Client buys, we fit", "We supply (allowance per m²)", "Not decided"]), "\"Would you like to choose and buy the tiles yourself, or shall we supply them?\""), WET),
  rq(q("tileBudget", "Tile budget", "number", { unit: "£/m²" }), WET),
  rq(ask(pick("tileHeight", "Wall tiling", ["Full height, all walls", "Full height in the shower, half elsewhere", "Wet zones only", "Feature wall only"]), "\"Tiles all the way up, or just around the shower and bath?\""), WET),
  rq(pick("wallTileSize", "Wall tile size", TILE_SIZES), WET),
  rq(pick("wallTileFinish", "Wall tile finish", ["Gloss", "Matt", "Satin", "Textured", "Marble effect", "Stone effect", "Concrete effect", "Wood effect"]), WET),
  rq(q("wallTileColour", "Wall tile colour / name / supplier"), WET),
  rq(ask(pick("tileLayout", "Tile layout", ["Straight (stack)", "Brick bond (half)", "Third offset", "Vertical stack", "Herringbone", "Chevron", "Not decided"]), "\"How would you like them laid – straight, brick pattern, or something like herringbone?\""), WET),
  rq(q("tileFeature", "Feature wall / feature tile (where, which tile)"), WET),
  rq(pick("floorTileSize", "Floor tile size", TILE_SIZES), WET),
  rq(q("floorTileColour", "Floor tile colour / name / anti-slip rating"), WET),
  rq(pick("groutColour", "Grout colour", ["White", "Light grey", "Mid grey", "Anthracite", "Black", "To match the tile"]), WET),
  rq(pick("trims", "Tile edge trims", ["Chrome", "Brushed steel", "Matt black", "Brushed brass", "White", "Mitred edges (no trim)"]), WET),
  rq(ask(q("niche", "Shower niche (size, position, lit?)"), "\"Would you like a niche in the shower wall for shampoo bottles? We can light it too.\""), WET),
  rq(yes("boxing", "Pipes and cistern boxed in and tiled"), WET),
];
export const roomFinishesFor = (type: RoomInput["type"], floor?: RoomInput["floor"]) => ROOM_FINISHES.filter(x => (!x.types || x.types.includes(type)) && (!x.floors || (floor !== undefined && x.floors.includes(floor))));

// ---------------------------------------------------------------- The whole plan

/** The order of the visit. "project:<id>" = that project type's walk-round, "rooms" = room sheets, "quote:*" = calculator fields. */
export type Step = { id: string; title: string; kind: "section" | "project" | "property" | "rooms" | "site" };
export function visitSteps(types: string[]): Step[] {
  const projects = types.map(projectType).filter((p): p is ProjectType => !!p);
  return [
    { id: BEFORE.id, title: BEFORE.title, kind: "section" },
    { id: TEAM.id, title: "Brief the team", kind: "section" },
    { id: ARRIVAL.id, title: "Good morning", kind: "section" },
    { id: CLIENT.id, title: "Client & project", kind: "section" },
    { id: PROPERTY.id, title: "Property", kind: "property" },
    ...projects.map(p => ({ id: `project:${p.id}`, title: p.label, kind: "project" as const })),
    { id: "rooms", title: "Rooms & finishes", kind: "rooms" },
    { id: SITE.id, title: "Site set-up", kind: "site" },
    { id: PHOTOS.id, title: "Photos", kind: "section" },
    { id: CLOSING.id, title: "Goodbye", kind: "section" },
    { id: AFTER.id, title: "After", kind: "section" },
  ];
}
export const SECTIONS: Record<string, Section> = Object.fromEntries([BEFORE, TEAM, ARRIVAL, CLIENT, PROPERTY, FINISHES_INTRO, SITE, PHOTOS, CLOSING, AFTER].map(s => [s.id, s]));

/** Answer keys: "<section>.<question>", "project.<type>.<question>", "room.<roomId>.<question>". */
export const key = {
  section: (s: string, qid: string) => `${s}.${qid}`,
  project: (t: string, qid: string) => `project.${t}.${qid}`,
  plan: (t: string, i: number) => `plan.${t}.${i}`,
  room: (r: string, qid: string) => `room.${r}.${qid}`,
};

/** Shown as an answer in the PDF / summaries. */
export function answerText(q: Question, a: Answer | undefined): string {
  if (a === undefined || a === "" || (Array.isArray(a) && !a.length)) return "";
  if (q.type === "check" || q.type === "yesno") return a === true ? "Yes" : a === false ? "No" : String(a);
  if (Array.isArray(a)) return a.join(", ");
  if (q.type === "number" && q.unit) return `${a} ${q.unit}`;
  if (q.type === "date" && typeof a === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a)) return new Date(`${a}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return String(a);
}

/** How much of a list is answered (scripts don't count). */
export function progress(questions: Question[], answers: Answers, k: (qid: string) => string) {
  const list = questions.filter(x => x.type !== "script" && x.type !== "heading");
  const done = list.filter(x => { const a = answers[k(x.id)]; return a !== undefined && a !== "" && !(Array.isArray(a) && !a.length) && !(x.type === "check" && a !== true); }).length;
  return { done, total: list.length };
}

/** Clean untrusted answers: known shapes only, short strings. */
export function cleanAnswers(raw: unknown): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 3000)) {
    if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(k)) continue;
    if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 4000);
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string").slice(0, 30).map(x => x.slice(0, 200));
  }
  return out;
}
