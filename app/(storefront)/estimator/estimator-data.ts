// What the online estimator asks. Plain, tap-to-choose questions per type of job – just enough for
// us to arrive at the site visit prepared. Every answer is optional except choosing at least one job
// and the contact details.

export type Pic = { label: string; image?: string; art?: "lshape" | "mansard" | "epdm" | "notsure"; detail?: string };
export type Question =
  | { id: string; label: string; kind: "one" | "many"; options: string[]; hint?: string }
  | { id: string; label: string; kind: "pics"; options: Pic[]; many?: boolean; hint?: string }
  | { id: string; label: string; kind: "text"; placeholder?: string };
export type JobGroup = "Build & extend" | "Inside the home" | "Outside" | "Repairs & other";
export type Job = { id: string; label: string; hint: string; group: JobGroup; icon: string; questions: Question[] };

const NS = "Not sure";
const notSure: Pic = { label: NS, art: "notsure", detail: "We'll advise on the visit" };

export const JOB_GROUPS: JobGroup[] = ["Build & extend", "Inside the home", "Outside", "Repairs & other"];

export const JOBS: Job[] = [
  // ---------------------------------------------------------------- Build & extend
  { id: "extension", label: "Extension", hint: "Rear, side return, wrap-around, double storey", group: "Build & extend", icon: "House", questions: [
    { id: "type", label: "What kind of extension?", kind: "pics", options: [
      { label: "Rear extension", image: "/images/estimator/rear.jpg" }, { label: "Side return", image: "/images/estimator/side_return.jpg" },
      { label: "Wrap-around", image: "/images/estimator/Wraparound.jpg" }, { label: "Double storey", image: "/images/estimator/double_storey.png" }, notSure] },
    { id: "size", label: "Roughly how big?", kind: "one", options: ["Up to 15 m²", "15–25 m²", "25–40 m²", "Over 40 m²", NS], hint: "A 3 × 5 m extension is 15 m²" },
    { id: "roof", label: "Roof", kind: "one", options: ["Flat roof with skylights", "Pitched / tiled roof", NS] },
    { id: "doors", label: "Doors to the garden", kind: "one", options: ["Bi-fold doors", "Sliding doors", "French doors", NS] },
    { id: "kitchen", label: "Will the new kitchen go in it?", kind: "one", options: ["Yes", "No", NS] },
  ] },
  { id: "loft", label: "Loft conversion", hint: "Dormer, hip to gable, L-shape, Velux", group: "Build & extend", icon: "Layers", questions: [
    { id: "type", label: "What kind of loft?", kind: "pics", options: [
      { label: "Rear dormer", image: "/images/estimator/dormer_loft.jpg" }, { label: "L-shape dormer", art: "lshape" },
      { label: "Hip to gable", image: "/images/estimator/hip_loft.jpg" }, { label: "Mansard", art: "mansard" },
      { label: "Velux / roof windows only", image: "/images/estimator/velux_loft.png" }, notSure] },
    { id: "rooms", label: "What would you like up there?", kind: "one", options: ["1 bedroom", "1 bedroom + en-suite", "2 bedrooms", "2 bedrooms + en-suite", "Office / playroom", NS] },
    { id: "finish", label: "Outside finish of the dormer", kind: "pics", options: [
      { label: "Tile hanging", image: "/images/estimator/tile_hanging_l.jpg" }, { label: "Render", image: "/images/estimator/rendering_loft.jpg" },
      { label: "Cladding", image: "/images/estimator/cladding_loft.jpg" }, notSure] },
  ] },
  { id: "garage", label: "Garage conversion", hint: "Into a bedroom, office, gym or annexe", group: "Build & extend", icon: "Warehouse", questions: [
    { id: "use", label: "What will it become?", kind: "one", options: ["Bedroom", "Office", "Living / play room", "Gym", "Annexe with shower room", NS] },
    { id: "garage", label: "The garage is…", kind: "one", options: ["Attached to the house", "Built into the house", "Separate in the garden", NS] },
    { id: "storage", label: "Keep part of it for storage?", kind: "one", options: ["Yes", "No", NS] },
  ] },
  { id: "basement", label: "Basement / cellar", hint: "Convert a cellar or dig a new basement", group: "Build & extend", icon: "Layers", questions: [
    { id: "type", label: "Which one?", kind: "one", options: ["Convert the cellar we have", "Dig a new basement", NS] },
    { id: "use", label: "What for?", kind: "many", options: ["Living space", "Bedroom", "Gym / cinema", "Storage", "Shower room"] },
    { id: "height", label: "Can you stand up in it today?", kind: "one", options: ["Yes", "Only just", "No", "There isn't one yet"] },
  ] },
  { id: "newBuild", label: "New build", hint: "New house, annexe or flats", group: "Build & extend", icon: "Building2", questions: [
    { id: "what", label: "What are you building?", kind: "one", options: ["A new house", "An annexe", "Flats", "Shell only, we fit out", NS] },
    { id: "planning", label: "Planning permission", kind: "one", options: ["Approved", "Applied, waiting", "Not yet", NS] },
    { id: "plot", label: "The plot", kind: "one", options: ["Empty plot", "Old building to knock down", "Garden of an existing house", NS] },
  ] },
  { id: "structural", label: "Steels & structural", hint: "Knock-throughs, underpinning, foundations", group: "Build & extend", icon: "HardHat", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["Remove a wall / knock through", "Remove a chimney breast", "Underpinning", "New foundations", "Cracks / movement", NS] },
    { id: "engineer", label: "Do you have an engineer's design?", kind: "one", options: ["Yes", "No – please arrange it", NS] },
  ] },
  { id: "demolition", label: "Demolition / strip-out", hint: "Strip out rooms, take down buildings, clear site", group: "Build & extend", icon: "Hammer", questions: [
    { id: "what", label: "What needs to come out?", kind: "many", options: ["Kitchen", "Bathroom", "Walls", "Ceilings / floors", "Garage / shed / conservatory", "Whole building", "Garden clearance"] },
    { id: "asbestos", label: "Built before 2000?", kind: "one", options: ["Yes", "No", NS], hint: "Older buildings may need an asbestos survey first" },
  ] },

  // ---------------------------------------------------------------- Inside
  { id: "kitchen", label: "Kitchen", hint: "Full new kitchen, fit only, or make ready", group: "Inside the home", icon: "CookingPot", questions: [
    { id: "scope", label: "What do you need?", kind: "one", options: ["Supply & fit a new kitchen", "Fit a kitchen I've bought", "Make it ready (plumbing, electrics, walls, floor)", NS] },
    { id: "layout", label: "Layout", kind: "one", options: ["Same layout", "New layout", "Knock through to another room", NS] },
    { id: "size", label: "Size", kind: "one", options: ["Small (galley)", "Medium", "Large / kitchen-diner", NS] },
    { id: "worktop", label: "Worktop", kind: "one", options: ["Laminate", "Wood", "Quartz", "Granite", NS] },
  ] },
  { id: "bathroom", label: "Bathroom", hint: "Bathroom, shower room, en-suite or WC", group: "Inside the home", icon: "Bath", questions: [
    { id: "type", label: "Which rooms?", kind: "many", options: ["Family bathroom", "Shower room", "En-suite", "Downstairs WC"] },
    { id: "bath", label: "Bath or shower?", kind: "one", options: ["Bath with shower over", "Shower only", "Walk-in shower", "Bath and separate shower", NS] },
    { id: "tiling", label: "Tiling", kind: "one", options: ["Floor to ceiling", "Wet areas only", "Floor only", NS] },
    { id: "level", label: "Finish level", kind: "one", options: ["Standard", "Mid-range", "Premium", NS] },
  ] },
  { id: "refurb", label: "Refurbishment", hint: "Whole house or a few rooms brought up to date", group: "Inside the home", icon: "Sofa", questions: [
    { id: "where", label: "Where?", kind: "many", options: ["Whole house", "Ground floor", "First floor", "Second floor", "A few rooms"] },
    { id: "works", label: "What's included?", kind: "many", options: ["Plastering", "Flooring", "Decorating", "New doors & skirting", "Rewire", "New heating", "Kitchen", "Bathroom"] },
    { id: "rooms", label: "How many rooms?", kind: "one", options: ["1–2", "3–4", "5–7", "8+", NS] },
  ] },
  { id: "decorating", label: "Plastering & decorating", hint: "Skim, paint, wallpaper, flooring", group: "Inside the home", icon: "PaintRoller", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["Plastering / skimming", "Painting walls & ceilings", "Woodwork & doors", "Wallpaper", "New flooring"] },
    { id: "rooms", label: "How many rooms?", kind: "one", options: ["1", "2–3", "4–6", "Whole house", NS] },
  ] },
  { id: "electrics", label: "Electrics", hint: "Rewire, sockets, lights, fuse box, EV charger", group: "Inside the home", icon: "Zap", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["Full rewire", "Extra sockets / lights", "New fuse box", "Outside lights / sockets", "EV charger", "Safety test (EICR)"] },
  ] },
  { id: "heating", label: "Heating & boiler", hint: "New boiler, radiators, underfloor, heat pump", group: "Inside the home", icon: "Flame", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["New boiler", "Move the boiler", "New radiators", "Underfloor heating", "Heat pump", "Fix a problem"] },
    { id: "now", label: "What do you have now?", kind: "one", options: ["Combi boiler", "Boiler with hot water tank", "Electric heating", "No heating", NS] },
  ] },
  { id: "aircon", label: "Air conditioning", hint: "Cooling and heating for bedrooms and living rooms", group: "Inside the home", icon: "Snowflake", questions: [
    { id: "rooms", label: "How many rooms?", kind: "one", options: ["1", "2", "3", "4", "5", "6+"] },
    { id: "type", label: "Type of unit", kind: "one", options: ["Wall-mounted", "Ceiling cassette", NS] },
    { id: "outside", label: "Where could the outdoor unit go?", kind: "one", options: ["Back wall", "On the ground in the garden", "Flat roof", NS] },
  ] },
  { id: "windows", label: "Windows & doors", hint: "Windows, front door, bi-folds, internal and fire doors", group: "Inside the home", icon: "DoorOpen", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["Windows", "Front door", "Back / patio doors", "Bi-fold or sliding doors", "Internal doors", "Fire doors"] },
    { id: "count", label: "How many windows?", kind: "one", options: ["1–3", "4–8", "9+", "None", NS] },
    { id: "material", label: "Material", kind: "one", options: ["uPVC", "Aluminium", "Timber / sash", NS] },
  ] },
  { id: "stairs", label: "Stairs, walls & fire safety", hint: "New staircase, move walls, fire doors, alarms", group: "Inside the home", icon: "ShieldCheck", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["New staircase", "Move / add walls", "Fire doors", "Smoke alarms", "Soundproofing", "HMO / landlord fire safety"] },
  ] },

  // ---------------------------------------------------------------- Outside
  { id: "roof", label: "Roof", hint: "New roof, repairs, flat roofs, gutters", group: "Outside", icon: "House", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["New roof", "Repair / leak", "Flat roof", "Gutters, fascias & soffits", "Chimney work", "Roof windows"] },
    { id: "tiles", label: "Tiles you like (pitched roof)", kind: "pics", options: [
      { label: "Concrete tiles", image: "/images/estimator/interlocking1.jpg" }, { label: "Clay plain tiles", image: "/images/estimator/clay_plain_tiles1.jpg" },
      { label: "Slate", image: "/images/estimator/slate_tiles.jpg" }, { label: "Pantiles", image: "/images/estimator/pantile.jpg" }, notSure] },
    { id: "flat", label: "Flat roof finish", kind: "pics", options: [
      { label: "Felt", image: "/images/estimator/felt_roof2.webp" }, { label: "Fibreglass (GRP)", image: "/images/estimator/fiberglass1.jpeg" },
      { label: "Rubber (EPDM)", art: "epdm" }, notSure] },
  ] },
  { id: "outsideWalls", label: "Render & outside walls", hint: "Render, cladding, insulation, repointing", group: "Outside", icon: "BrickWall", questions: [
    { id: "what", label: "What do you need?", kind: "many", options: ["New render", "Cladding", "External wall insulation", "Masonry paint", "Repointing", "Remove pebbledash"] },
    { id: "walls", label: "Which walls?", kind: "one", options: ["Front only", "Back only", "Whole house", NS] },
  ] },
  { id: "garden", label: "Garden & driveway", hint: "Patio, driveway, decking, turf, fencing", group: "Outside", icon: "Trees", questions: [
    { id: "surfaces", label: "Which finishes?", kind: "pics", many: true, options: [
      { label: "Block paving", image: "/images/estimator/block_paving.jpg" }, { label: "Porcelain patio", image: "/images/estimator/porcelain_tiles.jpg" },
      { label: "Resin", image: "/images/estimator/resin.jpg" }, { label: "Tarmac", image: "/images/estimator/tarmac.jpg" },
      { label: "Decking", image: "/images/estimator/decking.jpg" }, { label: "Lawn / turf", image: "/images/estimator/turf1.jpg" }] },
    { id: "extras", label: "Anything else?", kind: "many", options: ["Fencing", "Garden walls", "Drainage", "Lighting", "Steps / levels", "Clearance"] },
    { id: "size", label: "Roughly how big?", kind: "one", options: ["Up to 20 m²", "20–50 m²", "50–100 m²", "Over 100 m²", NS] },
  ] },
  { id: "gardenRoom", label: "Garden room", hint: "Office, gym, studio or summer house", group: "Outside", icon: "Trees", questions: [
    { id: "use", label: "What for?", kind: "one", options: ["Office", "Gym", "Studio / hobby room", "Summer house", "Guest room", NS] },
    { id: "size", label: "Size", kind: "one", options: ["Small (up to 10 m²)", "Medium (10–20 m²)", "Large (over 20 m²)", NS] },
    { id: "power", label: "Electrics & heating?", kind: "one", options: ["Yes", "Lights and sockets only", "No", NS] },
  ] },
  { id: "energy", label: "Solar & energy saving", hint: "Solar panels, battery, insulation", group: "Outside", icon: "Sun", questions: [
    { id: "what", label: "What are you interested in?", kind: "many", options: ["Solar panels", "Home battery", "EV charger", "Loft insulation", "Cavity wall insulation", "Heat pump"] },
  ] },

  // ---------------------------------------------------------------- Repairs & other
  { id: "damp", label: "Damp, leaks & cracks", hint: "Rising damp, mould, leaks, cracks", group: "Repairs & other", icon: "Droplets", questions: [
    { id: "what", label: "What can you see?", kind: "many", options: ["Damp patches low on walls", "Mould / condensation", "Water leak", "Cracks in walls", "Rotten floor / timber", NS] },
    { id: "where", label: "Where?", kind: "many", options: ["Basement / cellar", "Ground floor", "Upstairs", "Outside walls", "Ceiling"] },
  ] },
  { id: "small", label: "Small jobs & repairs", hint: "A few fixes around the house", group: "Repairs & other", icon: "Wrench", questions: [
    { id: "what", label: "What kind of jobs?", kind: "many", options: ["Doors & locks", "Plaster / holes", "Tiling", "Plumbing / taps", "Sockets / lights", "Fitting & assembly", "Gutters", "Other"] },
    { id: "list", label: "List the jobs", kind: "text", placeholder: "e.g. hang 2 doors, fix a dripping tap, patch a ceiling crack…" },
  ] },
];

export const HOME = {
  type: ["Terraced", "Semi-detached", "End of terrace", "Detached", "Bungalow", "Flat / maisonette", "Commercial"],
  bedrooms: ["1", "2", "3", "4", "5+"],
  age: ["Before 1919", "1919–1945", "1945–1980", "1980–2000", "After 2000", NS],
  living: ["Yes, we'll live there", "No, it will be empty", NS],
  parking: ["Driveway", "Free street parking", "Permit / paid parking", "Very limited", NS],
  plans: ["We have drawings & approval", "We have drawings", "We need drawings", "Not needed / not sure"],
};

export const BUDGETS = ["Under £5k", "£5k–£15k", "£15k–£30k", "£30k–£60k", "£60k–£100k", "£100k–£200k", "Over £200k", "Not sure yet"];
export const STARTS = ["As soon as possible", "In 1–3 months", "In 3–6 months", "In 6+ months", "Just getting prices"];
export const VISIT = ["Weekday morning", "Weekday afternoon", "Weekday evening", "Saturday"];
export const CONTACT = ["Phone", "WhatsApp", "Email", "Any"];
export const FOUND = ["Google", "Instagram", "Facebook", "Recommendation", "Saw our van / sign", "Existing client", "Other"];

/** The key each answer is saved under (shown to the team as e.g. "Loft conversion · what kind of loft?"). */
export const answerKey = (job: Job, q: Question) => `${job.label} · ${q.label.charAt(0).toLowerCase()}${q.label.slice(1)}`;
