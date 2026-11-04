import type { GangMember, LabourItem, MaterialRate, RateBook, Trade, TradeRate } from "./types";

// Company standard rates, GBP excluding VAT, London / South East 2026.
//
// confirmed: true  → given by the company (loft and door labour notes).
// confirmed: false → researched indicative default (UK merchant prices and
//                    London trade rates, Nov 2026). Shown with an amber badge
//                    until the company confirms or replaces it.
//
// Override order at runtime (see prices.server.ts):
//   per-quote edit → live supplier observation (Selco / Builder Depot, ≤ 8 days)
//   → catalogue item price (item code TK-<KEY>) → TAKEOFF_RATEBOOK_JSON → defaults below.

const m = (name: string, unit: string, price: number, kind: MaterialRate["kind"], confirmed = false, note?: string): MaterialRate =>
  ({ name, unit, price, kind, confirmed, note });
const g = (...members: [Trade, number][]): GangMember[] => members.map(([trade, n]) => ({ trade, n }));
/** Per-unit labour priced from output per day. */
const lp = (name: string, unit: string, price: number, perDay: number, gang: GangMember[], group: string, minDays?: number): LabourItem =>
  ({ name, unit, price, perDay, gang, group, minDays, confirmed: false });
/** Fixed labour job with a day allowance per unit (company prices). */
const lj = (name: string, unit: string, price: number, daysPerUnit: number, gang: GangMember[], group: string, confirmed = false, note?: string): LabourItem =>
  ({ name, unit, price, daysPerUnit, gang, group, confirmed, note });
const t = (name: string, dayRate: number): TradeRate => ({ name, dayRate, confirmed: false });

/** Timber sizes. "6x2" style sizes map onto these. */
export const timberSizes = {
  "47x100": { label: "C24 47 × 100 mm (4×2)", key: "timber_47x100" },
  "47x150": { label: "C24 47 × 150 mm (6×2)", key: "timber_47x150" },
  "47x175": { label: "C24 47 × 175 mm (7×2)", key: "timber_47x175" },
  "47x200": { label: "C24 47 × 200 mm (8×2)", key: "timber_47x200" },
  "47x225": { label: "C24 47 × 225 mm (9×2)", key: "timber_47x225" },
} as const;
export type TimberSize = keyof typeof timberSizes;

export const partitionSizes = { "6x2": "47x150", "7x2": "47x175", "8x2": "47x200", "9x2": "47x225" } as const satisfies Record<string, TimberSize>;
export type PartitionSize = keyof typeof partitionSizes;

export const beamSizes = {
  "152x89": { label: "152 × 89 UB", key: "beam_152x89" },
  "152x152": { label: "152 × 152 UC", key: "beam_152x152" },
  "178x102": { label: "178 × 102 UB", key: "beam_178x102" },
  "203x133": { label: "203 × 133 UB", key: "beam_203x133" },
  "203x203": { label: "203 × 203 UC", key: "beam_203x203" },
  "254x146": { label: "254 × 146 UB", key: "beam_254x146" },
} as const;
export type BeamSize = keyof typeof beamSizes;

/** Joist size by clear span (rule of thumb at 400 centres, domestic floor/flat roof loading). Engineer to confirm. */
export const joistForSpan = (span: number): TimberSize => span <= 3.0 ? "47x150" : span <= 3.8 ? "47x175" : span <= 4.4 ? "47x200" : "47x225";
/** Steel for a structural opening by span (indicative, engineer to confirm). */
export const beamForSpan = (span: number): BeamSize => span <= 2.5 ? "152x89" : span <= 3.5 ? "178x102" : span <= 4.5 ? "203x133" : "254x146";

export const defaultRateBook: RateBook = {
  trades: {
    GENERAL_BUILDER: t("General builder", 280),
    LABOURER: t("Labourer", 170),
    GROUNDWORKER: t("Groundworker", 230),
    BRICKLAYER: t("Bricklayer", 280),
    CARPENTER: t("Carpenter", 270),
    ROOFER: t("Roofer", 270),
    PLASTERER: t("Plasterer", 260),
    ELECTRICIAN: t("Electrician", 300),
    PLUMBER: t("Plumber", 300),
    TILER: t("Tiler", 250),
    DECORATOR: t("Decorator", 220),
    KITCHEN_FITTER: t("Kitchen fitter", 260),
  },

  // Labour price list. Price per unit, editable on the Rates page (saved) or per quote.
  // `perDay` = output per day for the programme. Company figures are confirmed.
  labour: {
    // Strip out & groundworks
    strip_out: lp("Strip out, bag & take to skip", "m2", 23, 15, g(["LABOURER", 2]), "Strip out & groundworks"),
    hack_off_plaster: lp("Hack off old plaster & bag waste", "m2", 9.5, 18, g(["LABOURER", 1]), "Strip out & groundworks"),
    ceiling_pull_down: lp("Pull down old ceiling & clear", "m2", 9, 25, g(["LABOURER", 1]), "Strip out & groundworks"),
    excavate_foundations: lp("Excavate foundation trenches (mini digger + hand trim)", "m3", 115, 4, g(["GROUNDWORKER", 2]), "Strip out & groundworks", 1),
    excavate_slab: lp("Reduce level dig for floor slab", "m3", 92, 5, g(["GROUNDWORKER", 2]), "Strip out & groundworks"),
    load_spoil: lp("Barrow & load spoil into skip / grab lorry", "m3", 28, 6, g(["LABOURER", 1]), "Strip out & groundworks", 1),
    pour_concrete: lp("Place & level concrete", "m3", 50, 8, g(["GROUNDWORKER", 2]), "Strip out & groundworks", 1),
    floor_slab: lp("Floor slab: hardcore, compact, blind, DPM, insulation, pour", "m2", 46, 10, g(["GROUNDWORKER", 2]), "Strip out & groundworks", 2),
    screed: lp("Floor screed", "m2", 10, 40, g(["GROUNDWORKER", 1], ["LABOURER", 1]), "Strip out & groundworks"),
    drainage: lp("Drainage runs & chambers", "m", 92, 5, g(["GROUNDWORKER", 2]), "Strip out & groundworks", 1),

    // Structure, masonry & loft (company figures)
    demolition_TERRACED: lj("Demolition of pitched roof – terraced", "job", 2700, 3, g(["GENERAL_BUILDER", 3]), "Loft – company prices", true),
    demolition_SEMI_OR_END: lj("Demolition of pitched roof – semi / end-terrace", "job", 3300, 4, g(["GENERAL_BUILDER", 3]), "Loft – company prices", true),
    demolition_DETACHED: lj("Demolition of pitched roof – detached", "job", 4200, 5, g(["GENERAL_BUILDER", 3]), "Loft – company prices", true),
    beam_prep_small: lj("Beam preparations (1–3 beams)", "job", 600, 1, g(["GENERAL_BUILDER", 2]), "Loft – company prices", true),
    beam_prep_large: lj("Beam preparations (4–5 beams)", "job", 1200, 2, g(["GENERAL_BUILDER", 2]), "Loft – company prices", true),
    beam_install: lj("Beam installation", "job", 1450, 1, g(["GENERAL_BUILDER", 3]), "Loft – company prices", true),
    floor_joists: lj("Floor joists installation", "job", 4300, 4, g(["CARPENTER", 3]), "Loft – company prices", true),
    floor_boarding: lj("Floor boarding", "job", 800, 1, g(["CARPENTER", 2]), "Loft – company prices", true, "Days not specified – 1 day assumed"),
    roof_structure_day: lj("Roof structure (front roof, flat roof, partitions)", "day", 1100, 1, g(["CARPENTER", 3]), "Loft – company prices", false, "Days are company figures; day rate to confirm"),
    flat_roof_covering: lp("Flat roof covering (loft)", "m2", 30, 20, g(["ROOFER", 2]), "Roofing"),
    blockwork: lp("Blockwork", "m2", 36, 20, g(["BRICKLAYER", 2], ["LABOURER", 1]), "Masonry & structure"),
    facing_brickwork: lp("Facing brickwork (≈350 bricks per bricklayer a day)", "m2", 62, 12, g(["BRICKLAYER", 2], ["LABOURER", 1]), "Masonry & structure"),
    knock_through: lp("Form structural opening: props, needles, steel, dry pack, make good", "m", 560, 1.2, g(["GENERAL_BUILDER", 2], ["LABOURER", 1]), "Masonry & structure", 2),

    // Carpentry & joinery
    flat_roof_structure: lp("Flat roof: wall plates, joists, firrings, deck, insulation", "m2", 54, 10, g(["CARPENTER", 2]), "Carpentry & joinery", 2),
    pitched_roof_structure: lp("Pitched roof structure", "m2", 68, 8, g(["CARPENTER", 2]), "Carpentry & joinery", 1),
    window_fit: lp("Fit window", "each", 135, 4, g(["CARPENTER", 2]), "Carpentry & joinery"),
    door_set_fit: lp("Fit bi-fold / sliding door set", "each", 540, 1, g(["CARPENTER", 2]), "Carpentry & joinery"),
    rooflight_fit: lp("Fit flat rooflight / lantern", "each", 270, 2, g(["CARPENTER", 2]), "Carpentry & joinery"),
    staircase_fit: lp("Fit staircase & balustrade", "each", 1080, 0.5, g(["CARPENTER", 2]), "Carpentry & joinery", 1),
    stud_wall: lp("Stud partition framing", "m2", 34, 8, g(["CARPENTER", 1]), "Carpentry & joinery"),
    insulation_fit: lp("Fit insulation", "m2", 11, 25, g(["CARPENTER", 1]), "Carpentry & joinery"),
    skirting_fit: lp("Fit skirting / architrave", "m", 11, 25, g(["CARPENTER", 1]), "Carpentry & joinery"),
    door_hang: lj("Hang new door incl. lining, architrave & ironmongery", "door", 200, 1, g(["CARPENTER", 1]), "Carpentry & joinery", true),
    door_refurb: lj("Refurbish door (ease, adjust, fill, rehang)", "door", 90, 0.5, g(["CARPENTER", 1]), "Carpentry & joinery"),
    laminate_floor: lp("Lay laminate flooring", "m2", 14, 20, g(["CARPENTER", 1]), "Flooring"),
    engineered_floor: lp("Lay engineered wood flooring", "m2", 18, 15, g(["CARPENTER", 1]), "Flooring"),
    lvt_floor: lp("Lay LVT flooring", "m2", 15, 18, g(["CARPENTER", 1]), "Flooring"),

    // Roofing
    roof_strip: lp("Strip existing roof covering", "m2", 18, 40, g(["ROOFER", 2], ["LABOURER", 1]), "Roofing"),
    roof_tiling_concrete: lp("Felt, batten & tile (concrete interlocking)", "m2", 39, 14, g(["ROOFER", 2]), "Roofing"),
    roof_tiling_slate: lp("Felt, batten & slate", "m2", 77, 7, g(["ROOFER", 2]), "Roofing"),
    roof_tiling_clay: lp("Felt, batten & tile (clay plain)", "m2", 90, 6, g(["ROOFER", 2]), "Roofing"),
    grp_roof: lp("GRP fibreglass roof finish", "m2", 27, 20, g(["ROOFER", 2]), "Roofing", 1),
    felt_roof: lp("Torch-on felt roof finish", "m2", 22, 25, g(["ROOFER", 2]), "Roofing", 1),
    tile_hanging: lp("Tile hanging to dormer", "m2", 90, 6, g(["ROOFER", 2]), "Roofing"),
    fascia_gutter: lp("Fascia, soffit & guttering", "m", 23, 12, g(["ROOFER", 1]), "Roofing"),
    roof_window_fit: lp("Fit & flash roof window", "each", 220, 2, g(["ROOFER", 1], ["LABOURER", 1]), "Roofing", 0.5),
    chimney_flashing: lj("Re-flash chimney in lead", "chimney", 270, 1, g(["ROOFER", 1]), "Roofing"),
    roof_tiling_fibre_slate: lp("Felt, batten & fibre cement slate", "m2", 60, 9, g(["ROOFER", 2]), "Roofing"),
    roof_tiling_pantile: lp("Felt, batten & clay pantile", "m2", 55, 10, g(["ROOFER", 2]), "Roofing"),
    roof_tiling_concrete_plain: lp("Felt, batten & concrete plain tile", "m2", 85, 6, g(["ROOFER", 2]), "Roofing"),
    roof_strip_reuse: lp("Strip carefully, sort & stack tiles/slates for re-use", "m2", 26, 25, g(["ROOFER", 2], ["LABOURER", 1]), "Roofing"),
    valley_fit: lp("Form valley (lead or GRP)", "m", 45, 8, g(["ROOFER", 2]), "Roofing"),
    rafter_repair: lp("Sister / replace rotten rafter", "m", 38, 15, g(["CARPENTER", 2]), "Roofing"),
    chimney_repoint: lj("Repoint chimney stack & renew flaunching", "chimney", 380, 1, g(["ROOFER", 1], ["LABOURER", 1]), "Roofing"),
    demolition_outrigger: lj("Demolition of outrigger roof (L-shape loft)", "job", 1500, 2, g(["GENERAL_BUILDER", 3]), "Loft – company prices"),
    hip_to_gable: lj("Hip to gable: remove hip, frame gable & extend ridge", "gable", 2400, 4, g(["CARPENTER", 2], ["LABOURER", 1]), "Carpentry & joinery"),
    mansard_frame: lp("Mansard slope framing (72°)", "m2", 75, 6, g(["CARPENTER", 2]), "Carpentry & joinery"),
    party_wall_raise: lp("Raise party wall in block / brick", "m2", 85, 6, g(["BRICKLAYER", 2], ["LABOURER", 1]), "Masonry & structure"),
    roof_window_trim: lp("Trim rafters for roof window (existing roof)", "each", 180, 3, g(["CARPENTER", 2]), "Carpentry & joinery"),
    floor_joists_new: lp("New floor joists & boarding (double storey)", "m2", 38, 10, g(["CARPENTER", 2]), "Carpentry & joinery", 1),
    door_head_adjust: lj("Lower / adjust door head & architrave", "door", 120, 0.5, g(["CARPENTER", 1]), "Carpentry & joinery"),

    // Plastering
    plasterboard: lp("Fix plasterboard", "m2", 9, 60, g(["PLASTERER", 2]), "Plastering"),
    dot_and_dab: lp("Dot & dab plasterboard to masonry", "m2", 13, 40, g(["PLASTERER", 2]), "Plastering"),
    bonding_coat: lp("Bonding / backing coat (11 mm)", "m2", 21, 25, g(["PLASTERER", 2]), "Plastering"),
    skim: lp("Skim coat finish", "m2", 12, 40, g(["PLASTERER", 2]), "Plastering"),
    make_good: lp("Fill, patch & make good plaster", "m2", 5, 60, g(["PLASTERER", 1]), "Plastering"),
    render: lp("External render system", "m2", 35, 15, g(["PLASTERER", 2]), "Plastering"),

    // Painting & decorating (London, per unit)
    prep_heavy: lp("Heavy preparation (fill cracks, sand, stain block)", "m2", 5, 40, g(["DECORATOR", 1]), "Painting & decorating"),
    mist_coat: lp("Mist coat on new plaster", "m2", 4, 60, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_ceilings: lp("Paint ceilings (2 coats)", "m2", 13, 20, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_walls: lp("Paint walls (2 coats incl. light prep)", "m2", 12, 25, g(["DECORATOR", 1]), "Painting & decorating"),
    feature_wall: lp("Feature wall in second colour", "wall", 60, 4, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_skirting: lp("Paint skirting (prep, undercoat, top coat)", "m", 7, 40, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_door: lp("Paint door both faces, frame & architrave", "door", 150, 2.5, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_window: lp("Paint window frame & board", "window", 110, 3, g(["DECORATOR", 1]), "Painting & decorating"),
    paint_radiator: lp("Paint radiator", "each", 55, 6, g(["DECORATOR", 1]), "Painting & decorating"),

    // Tiling
    tile_backer: lp("Fix tile backer board & tanking", "m2", 21, 12, g(["TILER", 1]), "Tiling"),
    wall_tiling: lp("Wall tiling", "m2", 50, 5, g(["TILER", 1]), "Tiling", 1),
    floor_tiling: lp("Floor tiling", "m2", 35, 8, g(["TILER", 1]), "Tiling"),

    // Electrics, plumbing & heating
    electrics_points: lp("Electrics first & second fix (chase, cable, accessory)", "point", 75, 4, g(["ELECTRICIAN", 1]), "Electrics", 0.5),
    elec_certificate: lj("Test, inspect & certify (Part P)", "job", 150, 0.5, g(["ELECTRICIAN", 1]), "Electrics"),
    consumer_unit_fit: lj("Install new consumer unit", "job", 300, 1, g(["ELECTRICIAN", 1]), "Electrics"),
    smoke_alarms_fit: lj("Mains interlinked smoke / heat alarms", "job", 150, 0.5, g(["ELECTRICIAN", 1]), "Electrics"),
    ufh_fit: lp("Underfloor heating", "m2", 15, 20, g(["ELECTRICIAN", 1]), "Electrics"),
    radiator_fit: lp("Fit radiator: pipework, valves, fill & balance", "each", 150, 2, g(["PLUMBER", 1]), "Plumbing & heating", 0.5),
    bathroom_first_fix: lj("Bathroom plumbing first fix (supplies & wastes)", "job", 600, 2, g(["PLUMBER", 1]), "Plumbing & heating"),
    sanitary_fit: lp("Second fix sanitaryware", "item", 150, 2, g(["PLUMBER", 1]), "Plumbing & heating"),
    kitchen_plumbing: lj("Kitchen plumbing (sink, dishwasher, washer)", "job", 450, 1.5, g(["PLUMBER", 1]), "Plumbing & heating"),
    water_main: lp("New water main in MDPE (trench & ducting)", "m", 38, 8, g(["PLUMBER", 1], ["LABOURER", 1]), "Plumbing & heating", 1),
    stopcock_move: lj("Move / renew internal stopcock", "job", 160, 0.5, g(["PLUMBER", 1]), "Plumbing & heating"),
    outside_tap_fit: lj("Outside tap with double check valve", "job", 120, 0.5, g(["PLUMBER", 1]), "Plumbing & heating"),
    utility_plumbing: lj("Utility plumbing (sink / washing machine)", "job", 300, 1, g(["PLUMBER", 1]), "Plumbing & heating"),
    soil_stack_extend: lj("Extend / connect soil stack", "job", 380, 1, g(["PLUMBER", 1]), "Plumbing & heating"),
    duct_fit: lp("Core / route extract ducting to outside", "each", 95, 3, g(["ELECTRICIAN", 1]), "Electrics"),
    // Electrics item by item (first & second fix each)
    elec_downlight: lp("Recessed spotlight: cut out, wire & fit", "each", 45, 10, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_light_point: lp("Pendant light point: cable, ceiling rose & connect", "each", 65, 6, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_switch: lp("Light switch (1–2 way): chase, box, cable, fit", "each", 45, 8, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_socket: lp("Double socket: chase, box, cable, fit", "each", 70, 6, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_spur: lp("Fused spur (appliance / towel rail / hood)", "each", 55, 7, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_isolator: lp("Fan isolator & extractor wiring", "each", 60, 6, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_data: lp("Data / TV point", "each", 55, 7, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_cooker: lp("Cooker circuit & 45 A switch", "each", 150, 2, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_shaver: lp("Shaver socket", "each", 70, 6, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_outside: lp("Outside light point (through wall, sealed)", "each", 90, 4, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_strip_old: lp("Remove old wiring & accessories (rewire)", "item", 8, 40, g(["ELECTRICIAN", 1]), "Electrics"),
    elec_reposition: lp("Drop / re-position ceiling light point", "each", 40, 10, g(["ELECTRICIAN", 1]), "Electrics"),
    make_good_chases: lp("Fill chases & make good after electrics", "item", 8, 30, g(["PLASTERER", 1]), "Plastering"),
    heating_extend: lj("Extend heating system & balance", "job", 300, 1, g(["PLUMBER", 1]), "Plumbing & heating"),

    wall_tiling_small: lp("Wall tiling – small format (metro / mosaic)", "m2", 70, 3.5, g(["TILER", 1]), "Tiling", 1),
    wall_tiling_large: lp("Wall / floor tiling – large format (600 × 1200, stone)", "m2", 60, 4, g(["TILER", 1], ["LABOURER", 1]), "Tiling", 1),
    fascia_soffit_fit: lp("Fit fascia & soffit", "m", 18, 14, g(["ROOFER", 1]), "Roofing"),
    gutter_fit: lp("Fit guttering & downpipes", "m", 9, 25, g(["ROOFER", 1]), "Roofing"),
    excavate_hand: lp("Hand dig (no digger access)", "m3", 150, 2.5, g(["GROUNDWORKER", 2]), "Strip out & groundworks", 1),

    // Kitchens
    kitchen_units: lp("Fit kitchen units / appliances", "unit", 65, 4, g(["KITCHEN_FITTER", 1]), "Kitchens"),
    worktop_fit: lp("Fit worktops", "m", 65, 4, g(["KITCHEN_FITTER", 1]), "Kitchens"),
  },

  materials: {
    // Steel beams, per metre
    beam_152x89: m("Steel beam 152 × 89 UB", "m", 38, "MATERIAL"),
    beam_152x152: m("Steel beam 152 × 152 UC", "m", 48, "MATERIAL"),
    beam_178x102: m("Steel beam 178 × 102 UB", "m", 42, "MATERIAL"),
    beam_203x133: m("Steel beam 203 × 133 UB", "m", 52, "MATERIAL"),
    beam_203x203: m("Steel beam 203 × 203 UC", "m", 88, "MATERIAL"),
    beam_254x146: m("Steel beam 254 × 146 UB", "m", 62, "MATERIAL"),
    beam_transport: m("Beam transport", "beam", 100, "PRELIM", true),
    beam_site_entry: m("Getting beams into site", "delivery", 100, "PRELIM", true),
    padstone: m("Concrete padstone / bearing plate", "each", 9.5, "SUPPORTING"),
    cement_bag: m("Cement 25 kg", "bag", 7.5, "SUPPORTING"),
    sand_bag: m("Building sand bag", "bag", 4.5, "SUPPORTING"),
    beam_bolts: m("M12 bolts, nuts & washers", "set", 2.2, "SUPPORTING"),
    intumescent: m("Fire protection to steel (board / paint)", "m", 18, "SUPPORTING"),

    // Structural timber, per metre
    timber_47x100: m("C24 treated timber 47 × 100", "m", 3.4, "MATERIAL"),
    timber_47x150: m("C24 treated timber 47 × 150", "m", 4.8, "MATERIAL"),
    timber_47x175: m("C24 treated timber 47 × 175", "m", 6.2, "MATERIAL"),
    timber_47x200: m("C24 treated timber 47 × 200", "m", 7.3, "MATERIAL"),
    timber_47x225: m("C24 treated timber 47 × 225", "m", 8.6, "MATERIAL"),
    batten_25x50: m("Treated roof batten 25 × 50", "m", 0.75, "SUPPORTING"),
    firring: m("Tapered firring piece", "m", 2.1, "MATERIAL"),
    wall_plate: m("Wall plate 100 × 75", "m", 4.5, "MATERIAL"),

    // Joist / roof fixings
    joist_hanger: m("Joist hanger", "each", 2.6, "SUPPORTING"),
    hanger_nails: m("Square twist hanger nails (pack 250)", "pack", 8.5, "SUPPORTING"),
    timber_screws: m("Structural timber screws (box 50)", "box", 14, "SUPPORTING"),
    restraint_strap: m("Lateral restraint strap", "each", 4.5, "SUPPORTING"),
    strutting: m("Herringbone strutting", "m", 3.2, "SUPPORTING"),
    framing_anchor: m("Framing anchor / truss clip", "each", 0.9, "SUPPORTING"),
    nails_box: m("Round wire nails 90 mm (box)", "box", 12, "SUPPORTING"),
    resin_anchors: m("Resin & studs for wall plates", "set", 6, "SUPPORTING"),

    // Boards, sheets, insulation
    plywood_18: m("Plywood 18 mm 2.4 × 1.2 m", "sheet", 38, "MATERIAL"),
    floorboard_18: m("Flooring board 18 mm T&G 1.2 × 0.6 m", "sheet", 7.5, "MATERIAL"),
    osb_12: m("OSB3 12 mm 2.4 × 1.2 m", "sheet", 18, "MATERIAL"),
    osb_18: m("OSB3 18 mm 2.4 × 1.2 m", "sheet", 26, "MATERIAL"),
    pir_150: m("PIR insulation 150 mm 2.4 × 1.2 m", "sheet", 62, "MATERIAL"),
    pir_100: m("PIR insulation 100 mm 2.4 × 1.2 m", "sheet", 45, "MATERIAL"),
    pir_50: m("PIR insulation 50 mm 2.4 × 1.2 m", "sheet", 28, "MATERIAL"),
    acoustic_wool: m("Acoustic mineral wool 100 mm", "m2", 4.5, "MATERIAL"),
    flooring_screws: m("Flooring screws (box 200)", "box", 9, "SUPPORTING"),
    flooring_adhesive: m("Flooring adhesive", "tube", 6.5, "SUPPORTING"),
    vcl: m("Vapour control layer", "m2", 1.2, "SUPPORTING"),
    foil_tape: m("Foil insulation tape", "roll", 6, "SUPPORTING"),
    breather_membrane: m("Breathable roofing membrane", "m2", 1.3, "SUPPORTING"),

    // Flat roof finish
    felt_system: m("Torch-on felt system (3 layer)", "m2", 14, "MATERIAL"),
    grp_system: m("GRP fibreglass roof system", "m2", 26, "MATERIAL"),
    roof_trims: m("Roof edge trims & drip", "m", 6, "SUPPORTING"),

    // Pitched roof coverings
    tile_concrete: m("Concrete interlocking roof tile", "each", 1.2, "MATERIAL", false, "≈10 per m²"),
    slate_natural: m("Natural slate 500 × 250", "each", 1.8, "MATERIAL", false, "≈20 per m²"),
    tile_clay_plain: m("Clay plain tile", "each", 0.65, "MATERIAL", false, "≈60 per m²"),
    slate_nails: m("Copper slate nails / tile clips", "m2", 1.5, "SUPPORTING"),
    ridge_tile: m("Ridge tile", "each", 6, "MATERIAL"),
    dry_ridge: m("Dry ridge / verge system", "m", 15, "SUPPORTING"),
    lead_flashing: m("Lead flashing code 4", "m", 18, "SUPPORTING"),
    slate_fibre_cement: m("Fibre cement slate 600 × 300", "each", 1.6, "MATERIAL", false, "≈13 per m²"),
    tile_clay_pantile: m("Clay pantile", "each", 1.3, "MATERIAL", false, "≈16 per m²"),
    tile_concrete_plain: m("Concrete plain tile", "each", 0.45, "MATERIAL", false, "≈60 per m²"),
    lead_valley: m("Lead valley code 5 incl. valley boards", "m", 42, "SUPPORTING"),
    fascia_soffit: m("uPVC fascia & soffit", "m", 25, "MATERIAL"),
    gutter: m("Guttering incl. brackets & fittings", "m", 9, "MATERIAL"),
    downpipe: m("Downpipe 2.5 m incl. fittings", "each", 14, "MATERIAL"),

    // Dormer cladding
    clad_tile_hanging: m("Tile hanging (tiles, battens, membrane)", "m2", 38, "MATERIAL"),
    clad_slate: m("Slate hanging (slates, battens, membrane)", "m2", 52, "MATERIAL"),
    clad_render: m("Render system on board / mesh", "m2", 22, "MATERIAL"),

    // Windows, doors, rooflights, stairs
    roof_window: m("Roof window MK08 centre-pivot incl. flashing", "each", 650, "MATERIAL"),
    window_upvc: m("uPVC double glazed window ~1.2 × 1.2 m", "each", 420, "MATERIAL"),
    window_alu: m("Aluminium window ~1.2 × 1.2 m", "each", 850, "MATERIAL"),
    juliet_balcony: m("Juliet balcony (glass)", "each", 450, "MATERIAL"),
    bifold_alu: m("Aluminium bi-fold doors", "m", 1100, "MATERIAL", false, "per metre of opening width"),
    sliding_alu: m("Aluminium sliding doors", "m", 950, "MATERIAL", false, "per metre of opening width"),
    french_upvc: m("uPVC French doors", "m", 600, "MATERIAL", false, "per metre of opening width"),
    rooflight_flat: m("Flat rooflight ~1 × 1 m", "each", 750, "MATERIAL"),
    roof_lantern: m("Aluminium roof lantern ~2 × 1 m", "each", 1600, "MATERIAL"),
    staircase: m("Loft staircase (softwood) incl. balustrade", "each", 1600, "MATERIAL"),
    window_board: m("Window board / reveals", "each", 25, "SUPPORTING"),

    // Masonry & groundworks
    concrete_c25: m("Ready-mix concrete C25", "m3", 165, "MATERIAL"),
    concrete_part_load: m("Ready-mix part-load / pump charge", "delivery", 180, "PRELIM"),
    hardcore_mot: m("MOT Type 1 sub-base", "t", 45, "MATERIAL"),
    sand_blinding: m("Sharp sand blinding", "t", 55, "SUPPORTING"),
    dpm: m("DPM 1200 gauge", "m2", 0.8, "SUPPORTING"),
    dpc: m("DPC roll 100 mm", "m", 0.4, "SUPPORTING"),
    edge_insulation: m("Perimeter edge insulation strip", "m", 1.5, "SUPPORTING"),
    screed_mix: m("Sand & cement screed (65 mm)", "m2", 9, "MATERIAL"),
    facing_brick: m("Facing brick 65 mm", "each", 0.95, "MATERIAL"),
    dense_block: m("Concrete block 7N 100 mm", "each", 1.5, "MATERIAL"),
    thermal_block: m("Thermal / aircrete block 100 mm", "each", 2.4, "MATERIAL"),
    mortar_cement: m("Cement for mortar 25 kg", "bag", 7.5, "SUPPORTING"),
    mortar_sand: m("Building sand bulk bag", "t", 55, "SUPPORTING"),
    wall_ties: m("Stainless cavity wall ties", "each", 0.14, "SUPPORTING"),
    cavity_insulation: m("Cavity insulation board 100 mm", "m2", 14, "MATERIAL"),
    cavity_closer: m("Insulated cavity closer", "m", 6, "SUPPORTING"),
    lintel: m("Steel cavity lintel", "m", 38, "MATERIAL"),
    wall_starter: m("Wall starter kit", "each", 22, "SUPPORTING"),
    weep_vent: m("Weep vents & cavity trays", "each", 1.5, "SUPPORTING"),
    drain_pipe: m("110 mm drainage pipe & bedding", "m", 11, "MATERIAL"),
    inspection_chamber: m("Inspection chamber & cover", "each", 140, "MATERIAL"),
    gully: m("Yard / RWP gully", "each", 35, "SUPPORTING"),
    props_hire: m("Acrow props / strong-boys hire", "week", 80, "PRELIM"),

    // Plaster & dry lining
    plasterboard_125: m("Plasterboard 12.5 mm 2.4 × 1.2 m", "sheet", 11.5, "MATERIAL"),
    plasterboard_moisture: m("Moisture resistant plasterboard 12.5 mm", "sheet", 15, "MATERIAL"),
    plasterboard_fire: m("Fire-rated plasterboard 12.5 mm", "sheet", 14, "MATERIAL"),
    multifinish: m("Multi-finish plaster 25 kg", "bag", 13, "SUPPORTING"),
    dab_adhesive: m("Dri-wall adhesive 25 kg", "bag", 11, "SUPPORTING"),
    drywall_screws: m("Drywall screws (box 1000)", "box", 12, "SUPPORTING"),
    board_screws: m("Backer board screws & washers (box 100)", "box", 14, "SUPPORTING"),
    scrim_beads: m("Scrim tape & angle beads", "m2", 0.6, "SUPPORTING"),
    bonding_plaster: m("Bonding coat plaster 25 kg (≈2.75 m² at 11 mm)", "bag", 14, "MATERIAL"),
    pva_bond: m("PVA / bonding agent 5 L", "tub", 16, "SUPPORTING"),
    grit_primer: m("Grit primer (Blue Grit) 10 L", "tub", 48, "SUPPORTING"),
    angle_bead: m("Angle bead 3 m", "length", 2.4, "SUPPORTING"),
    stop_bead: m("Stop bead 3 m", "length", 2.6, "SUPPORTING"),
    jointing_tape: m("Scrim / jointing tape 90 m", "roll", 4.5, "SUPPORTING"),
    dust_sheets: m("Dust sheets, protection & bags", "room", 12, "SUPPORTING"),
    coving: m("Plaster coving 3 m", "length", 9, "MATERIAL"),
    coving_adhesive: m("Coving adhesive", "tube", 6, "SUPPORTING"),

    // Paint systems (per tin; coverage used in the formulas)
    paint_trade_10l: m("Trade emulsion 10 L (≈12 m²/L)", "tin", 45, "MATERIAL"),
    paint_premium_25l: m("Premium emulsion 2.5 L (≈12 m²/L)", "tin", 55, "MATERIAL"),
    paint_durable_5l: m("Durable / washable emulsion 5 L (≈12 m²/L)", "tin", 42, "MATERIAL"),
    paint_kitbath_25l: m("Kitchen & bathroom emulsion 2.5 L (≈12 m²/L)", "tin", 30, "MATERIAL"),
    mist_coat_paint: m("Contract matt for mist coat 10 L (≈10 m²/L)", "tin", 32, "MATERIAL"),
    wood_trade_25l: m("Satinwood / gloss 2.5 L (≈12 m²/L)", "tin", 32, "MATERIAL"),
    wood_premium_25l: m("Premium woodwork paint 2.5 L (≈12 m²/L)", "tin", 58, "MATERIAL"),
    wood_undercoat_25l: m("Primer / undercoat 2.5 L", "tin", 26, "SUPPORTING"),
    stain_block: m("Stain block primer 1 L", "tin", 16, "SUPPORTING"),
    filler_caulk: m("Filler, decorators caulk, sandpaper", "room", 18, "SUPPORTING"),
    masking: m("Masking tape & sundries", "room", 8, "SUPPORTING"),

    // Decoration & joinery
    emulsion: m("Trade emulsion 10 L", "tin", 45, "MATERIAL"),
    decor_sundries: m("Filler, caulk, sandpaper, sundries", "m2", 0.5, "SUPPORTING"),
    skirting_mdf: m("MDF skirting 119 mm × 4.2 m", "length", 14, "MATERIAL"),
    architrave_set: m("Architrave set (one side)", "set", 14, "SUPPORTING"),
    gripfill: m("Grab adhesive & pins", "tube", 5, "SUPPORTING"),

    // Flooring
    floor_laminate: m("Laminate flooring 8 mm", "m2", 18, "MATERIAL"),
    floor_engineered: m("Engineered oak flooring", "m2", 45, "MATERIAL"),
    floor_lvt: m("LVT click flooring", "m2", 30, "MATERIAL"),
    floor_carpet: m("Carpet & underlay supplied and fitted", "m2", 28, "MATERIAL"),
    underlay: m("Flooring underlay", "m2", 3, "SUPPORTING"),
    floor_tile: m("Porcelain floor tile", "m2", 32, "MATERIAL"),

    // Electrics & heating
    elec_point: m("Electrical point materials (cable, box, accessory)", "point", 22, "SUPPORTING"),
    downlight: m("Fire-rated LED downlight", "each", 14, "SUPPORTING"),
    consumer_unit: m("Consumer unit 18th edition (board, main switch, surge protection)", "each", 220, "MATERIAL"),
    smoke_alarm: m("Mains interlinked smoke / heat alarm", "each", 28, "SUPPORTING"),
    extractor_fan: m("Extractor fan with timer / humidistat", "each", 65, "MATERIAL"),
    radiator: m("Double panel radiator 600 × 1000 with brackets", "each", 110, "MATERIAL"),
    towel_rail: m("Heated towel rail", "each", 180, "MATERIAL"),
    ufh_mat: m("Electric underfloor heating kit", "m2", 38, "MATERIAL"),
    heating_pipework: m("Heating pipework & fittings", "point", 35, "SUPPORTING"),
    // Plumbing: pipe, fittings, valves, wastes and soil (each fixture lists its own)
    pipe_cu_15: m("Copper pipe 15 mm", "m", 4.2, "SUPPORTING"),
    pipe_cu_22: m("Copper pipe 22 mm", "m", 8.5, "SUPPORTING"),
    pipe_pex_15: m("PEX barrier pipe 15 mm (push-fit)", "m", 1.6, "SUPPORTING"),
    pipe_pex_22: m("PEX barrier pipe 22 mm (push-fit)", "m", 2.9, "SUPPORTING"),
    elbow90_15_cu: m("15 mm 90° elbow (end-feed copper)", "each", 0.9, "SUPPORTING"),
    elbow90_15_pf: m("15 mm 90° elbow (push-fit)", "each", 2.6, "SUPPORTING"),
    elbow45_15_cu: m("15 mm 45° obtuse elbow (copper)", "each", 1.2, "SUPPORTING"),
    elbow45_15_pf: m("15 mm 45° elbow (push-fit)", "each", 3.2, "SUPPORTING"),
    tee_15_cu: m("15 mm equal tee (copper)", "each", 1.2, "SUPPORTING"),
    tee_15_pf: m("15 mm equal tee (push-fit)", "each", 3.4, "SUPPORTING"),
    elbow90_22_cu: m("22 mm 90° elbow (copper)", "each", 1.8, "SUPPORTING"),
    tee_22_15_cu: m("22 × 22 × 15 mm reducing tee (copper)", "each", 2.6, "SUPPORTING"),
    pipe_insert_15: m("15 mm pipe inserts (PEX)", "each", 0.25, "SUPPORTING"),
    isolating_valve_15: m("15 mm isolating valve", "each", 3.5, "SUPPORTING"),
    flexi_connector: m("Flexible tap connector 15 mm × ½\"", "each", 4.5, "SUPPORTING"),
    tap_connector_bath: m("Bath tap connector ¾\"", "each", 3.5, "SUPPORTING"),
    pipe_clip_15: m("15 mm pipe clip", "each", 0.25, "SUPPORTING"),
    pipe_clip_22: m("22 mm pipe clip", "each", 0.3, "SUPPORTING"),
    solder_flux: m("Solder, flux & wire wool", "fixture", 3, "SUPPORTING"),
    ptfe_jointing: m("PTFE tape & jointing compound", "fixture", 1.5, "SUPPORTING"),
    waste_32: m("32 mm solvent weld waste pipe 3 m", "length", 6, "SUPPORTING"),
    waste_40: m("40 mm solvent weld waste pipe 3 m", "length", 7.5, "SUPPORTING"),
    bend90_32: m("32 mm 90° waste bend", "each", 1.6, "SUPPORTING"),
    bend45_32: m("32 mm 45° waste bend", "each", 1.6, "SUPPORTING"),
    bend90_40: m("40 mm 90° waste bend", "each", 1.8, "SUPPORTING"),
    bend45_40: m("40 mm 45° waste bend", "each", 1.8, "SUPPORTING"),
    waste_clip: m("Waste pipe clip", "each", 0.35, "SUPPORTING"),
    waste_boss: m("Strap-on boss / waste connector to stack", "each", 6, "SUPPORTING"),
    solvent_cement: m("Solvent cement 250 ml", "tin", 8, "SUPPORTING"),
    trap_bottle_32: m("32 mm bottle trap (basin)", "each", 6, "SUPPORTING"),
    basin_waste: m("Basin waste (click-clack)", "each", 9, "SUPPORTING"),
    trap_bath_40: m("40 mm bath trap", "each", 7, "SUPPORTING"),
    bath_waste_overflow: m("Bath waste & overflow", "each", 15, "SUPPORTING"),
    shower_waste_90: m("90 mm shower tray waste & trap", "each", 18, "SUPPORTING"),
    trap_sink_40: m("40 mm sink trap with appliance spigot", "each", 10, "SUPPORTING"),
    sink_waste_kit: m("Sink waste & overflow kit", "each", 18, "SUPPORTING"),
    washer_valve: m("Washing machine / dishwasher valve", "each", 5, "SUPPORTING"),
    standpipe_40: m("40 mm washing machine standpipe & trap", "each", 12, "SUPPORTING"),
    soil_110: m("110 mm soil pipe 3 m", "length", 22, "SUPPORTING"),
    bend90_110: m("110 mm 92.5° soil bend", "each", 9, "SUPPORTING"),
    bend45_110: m("110 mm 135° (45°) soil bend", "each", 8, "SUPPORTING"),
    soil_coupler: m("110 mm soil coupler / boss", "each", 6, "SUPPORTING"),
    pan_connector: m("WC pan connector", "each", 7, "SUPPORTING"),
    wc_fixing_kit: m("WC & cistern fixing kit", "each", 5, "SUPPORTING"),
    stopcock_15: m("15 mm stopcock", "each", 9, "SUPPORTING"),
    stopcock_22: m("22 mm stopcock", "each", 14, "SUPPORTING"),
    drain_cock: m("Drain-off cock", "each", 3, "SUPPORTING"),
    mdpe_25: m("MDPE blue water pipe 25 mm", "m", 1.2, "SUPPORTING"),
    mdpe_fitting: m("MDPE 25 mm coupler / adaptor", "each", 7, "SUPPORTING"),
    duct_sleeve: m("Ducting sleeve for water main", "m", 1.5, "SUPPORTING"),
    outside_tap_kit: m("Outside tap kit with check valve", "each", 25, "SUPPORTING"),
    rad_valves: m("Radiator valves (TRV + lockshield) pair", "pair", 28, "SUPPORTING"),
    inhibitor: m("Central heating inhibitor 1 L", "bottle", 14, "SUPPORTING"),
    extract_duct_kit: m("Extract ducting kit 100 mm (duct, clips, outlet grille)", "kit", 18, "SUPPORTING"),
    hood_duct_kit: m("Cooker hood ducting kit 150 mm", "kit", 28, "SUPPORTING"),
    window_fixings: m("Window fixings, packers, expanding foam, silicone & trims", "window", 18, "SUPPORTING"),
    door_fixings: m("Lining screws, wedges, packers & frame fixings", "door", 6, "SUPPORTING"),
    fire_door_kit: m("Intumescent strips, smoke seals & fire door hinges upgrade", "door", 18, "SUPPORTING"),
    door_closer: m("Overhead / concealed door closer", "each", 35, "SUPPORTING"),
    skirting_fixings: m("Skirting screws / pins & caulk (per 10 m)", "pack", 4, "SUPPORTING"),
    threshold_strip: m("Door threshold / transition strip", "each", 12, "SUPPORTING"),
    floor_beading: m("Scotia / beading 2.4 m", "length", 3.5, "SUPPORTING"),
    worktop_joint_kit: m("Worktop joint bolts, end caps & sealant", "joint", 12, "SUPPORTING"),
    // Electrical items (accessories ours; decorative light fittings normally supplied by the client)
    ceiling_rose: m("Ceiling rose & lampholder", "each", 4.5, "SUPPORTING"),
    pendant_fitting: m("Pendant light fitting / shade", "each", 35, "MATERIAL"),
    light_switch: m("Light switch plate (1–2 gang)", "each", 5, "SUPPORTING"),
    socket_double: m("Double switched socket", "each", 6.5, "SUPPORTING"),
    fused_spur: m("Switched fused spur", "each", 8, "SUPPORTING"),
    fan_isolator: m("3-pole fan isolator switch", "each", 12, "SUPPORTING"),
    data_point: m("Data outlet Cat6 & faceplate", "each", 9, "SUPPORTING"),
    tv_point: m("TV coax outlet & faceplate", "each", 7, "SUPPORTING"),
    cooker_switch: m("45 A cooker switch", "each", 18, "SUPPORTING"),
    shaver_socket: m("Dual-voltage shaver socket", "each", 32, "SUPPORTING"),
    outside_light_point: m("External junction box & sealed connection", "each", 9, "SUPPORTING"),
    outside_light_fitting: m("Outside wall light", "each", 45, "MATERIAL"),
    cable_15: m("Twin & earth 1.5 mm² (lighting)", "m", 0.85, "SUPPORTING"),
    cable_25: m("Twin & earth 2.5 mm² (sockets)", "m", 1.3, "SUPPORTING"),
    cable_6: m("Twin & earth 6 mm² (cooker)", "m", 3.6, "SUPPORTING"),
    cable_data: m("Cat6 data cable", "m", 0.45, "SUPPORTING"),
    cable_coax: m("Coax cable", "m", 0.5, "SUPPORTING"),
    back_box: m("Back box (metal / dry-lining)", "each", 0.9, "SUPPORTING"),
    elec_sundries: m("Electrical sundries (clips, grommets, junction boxes, connectors)", "room", 15, "SUPPORTING"),
    rcbo: m("RCBO circuit breaker", "each", 28, "SUPPORTING"),
    main_bonding: m("Main earth bonding (10 mm² cable & clamps)", "set", 40, "SUPPORTING"),

    // Bathrooms
    suite_standard: m("Bathroom suite – standard (WC, basin, bath/tray, taps)", "set", 900, "MATERIAL"),
    suite_mid: m("Bathroom suite – mid range incl. vanity", "set", 1800, "MATERIAL"),
    suite_premium: m("Bathroom suite – premium incl. vanity", "set", 3500, "MATERIAL"),
    shower_standard: m("Shower valve, tray & enclosure – standard", "set", 550, "MATERIAL"),
    shower_mid: m("Shower valve, tray & enclosure – mid range", "set", 950, "MATERIAL"),
    shower_premium: m("Shower valve, tray & walk-in screen – premium", "set", 1700, "MATERIAL"),
    wall_tile_standard: m("Wall tiles – standard", "m2", 25, "MATERIAL"),
    wall_tile_mid: m("Wall tiles – mid range", "m2", 45, "MATERIAL"),
    wall_tile_premium: m("Wall tiles – premium", "m2", 80, "MATERIAL"),
    tile_adhesive: m("Tile adhesive 20 kg", "bag", 20, "SUPPORTING"),
    grout: m("Grout 3 kg", "bag", 8, "SUPPORTING"),
    tile_trim: m("Tile trims", "m", 3.5, "SUPPORTING"),
    tile_backer_board: m("Tile backer board 1.2 × 0.6 m", "sheet", 12, "MATERIAL"),
    tanking_kit: m("Tanking kit (6 m²)", "kit", 70, "SUPPORTING"),
    plumbing_sundries: m("Pipework, fittings, wastes & traps", "item", 45, "SUPPORTING"),
    silicone: m("Sanitary silicone", "tube", 7, "SUPPORTING"),

    // Joinery types (alternatives selectable per quote)
    skirting_mdf_144: m("MDF skirting 144 mm × 4.2 m", "length", 17, "MATERIAL"),
    skirting_mdf_169: m("MDF skirting 169 mm × 4.2 m", "length", 20, "MATERIAL"),
    skirting_ogee_119: m("MDF ogee skirting 119 mm × 4.2 m", "length", 16, "MATERIAL"),
    skirting_pine_119: m("Pine skirting 119 mm × 4.2 m", "length", 19, "MATERIAL"),
    skirting_oak_119: m("Oak veneered skirting 119 mm × 4.2 m", "length", 38, "MATERIAL"),
    architrave_ogee: m("Ogee architrave set (one side)", "set", 16, "SUPPORTING"),
    architrave_pine: m("Pine architrave set (one side)", "set", 20, "SUPPORTING"),
    architrave_oak: m("Oak architrave set (one side)", "set", 35, "SUPPORTING"),
    door_oak: m("Internal oak door", "each", 190, "MATERIAL"),
    door_glazed: m("Internal glazed door", "each", 140, "MATERIAL"),
    handle_premium: m("Premium lever handle & latch set", "set", 45, "SUPPORTING"),
    handle_black: m("Matt black lever handle & latch set", "set", 32, "SUPPORTING"),
    hinges_fire: m("Fire-rated hinges (pair)", "pair", 9, "SUPPORTING"),
    hinges_brass: m("Brass / black hinges (pair)", "pair", 14, "SUPPORTING"),
    window_timber: m("Timber double glazed window ~1.2 × 1.2 m", "each", 950, "MATERIAL"),
    plasterboard_acoustic: m("Acoustic plasterboard 12.5 mm", "sheet", 18, "MATERIAL"),
    plasterboard_15: m("Plasterboard 15 mm 2.4 × 1.2 m", "sheet", 14.5, "MATERIAL"),
    plasterboard_thermal: m("Thermal laminate board 37.5 mm", "sheet", 38, "MATERIAL"),
    pir_25: m("PIR insulation 25 mm 2.4 × 1.2 m", "sheet", 18, "MATERIAL"),
    pir_75: m("PIR insulation 75 mm 2.4 × 1.2 m", "sheet", 36, "MATERIAL"),
    pir_120: m("PIR insulation 120 mm 2.4 × 1.2 m", "sheet", 52, "MATERIAL"),
    pir_165: m("PIR insulation 165 mm 2.4 × 1.2 m", "sheet", 70, "MATERIAL"),

    // Tiles by size (priced per box; coverage per box in the tile options)
    tile_ceramic_300x600: m("Ceramic wall tile 300 × 600 (box 1.44 m²)", "box", 32, "MATERIAL"),
    tile_porcelain_300x600: m("Porcelain tile 300 × 600 (box 1.44 m²)", "box", 46, "MATERIAL"),
    tile_porcelain_600x600: m("Porcelain tile 600 × 600 (box 1.08 m²)", "box", 38, "MATERIAL"),
    tile_porcelain_600x1200: m("Large format porcelain 600 × 1200 (box 1.44 m²)", "box", 69, "MATERIAL"),
    tile_metro_75x150: m("Metro tile 75 × 150 (box 1 m²)", "box", 28, "MATERIAL"),
    tile_mosaic: m("Mosaic sheets (box 1 m²)", "box", 60, "MATERIAL"),
    tile_stone_600x400: m("Natural stone tile 600 × 400 (box 0.96 m²)", "box", 72, "MATERIAL"),
    tile_spacers: m("Tile spacers (bag 250)", "bag", 3.5, "SUPPORTING"),
    tile_levelling: m("Tile levelling clips & wedges (bag 100)", "bag", 14, "SUPPORTING"),
    tile_primer: m("Tile primer 5 L", "tub", 22, "SUPPORTING"),
    tile_trim_length: m("Tile trim 2.5 m", "length", 6.5, "SUPPORTING"),

    // Fascia, soffit & rainwater (lengths; white uPVC; colours via the foiled upcharge)
    fascia_150: m("uPVC fascia board 150 mm × 5 m", "length", 28, "MATERIAL"),
    fascia_175: m("uPVC fascia board 175 mm × 5 m", "length", 32, "MATERIAL"),
    fascia_200: m("uPVC fascia board 200 mm × 5 m", "length", 36, "MATERIAL"),
    fascia_225: m("uPVC fascia board 225 mm × 5 m", "length", 40, "MATERIAL"),
    fascia_250: m("uPVC fascia board 250 mm × 5 m", "length", 45, "MATERIAL"),
    soffit_100: m("uPVC soffit board 100 mm × 5 m", "length", 18, "MATERIAL"),
    soffit_150: m("uPVC soffit board 150 mm × 5 m", "length", 22, "MATERIAL"),
    soffit_200: m("uPVC soffit board 200 mm × 5 m", "length", 26, "MATERIAL"),
    soffit_300: m("uPVC soffit board 300 mm × 5 m", "length", 34, "MATERIAL"),
    foiled_upcharge: m("Coloured / woodgrain foil upcharge", "length", 9, "MATERIAL"),
    fascia_joint: m("Fascia / soffit joint trim", "each", 2.5, "SUPPORTING"),
    fascia_corner: m("Fascia / soffit corner trim", "each", 4.5, "SUPPORTING"),
    over_fascia_vent: m("Over-fascia ventilation strip", "m", 2.6, "SUPPORTING"),
    eaves_protector: m("Eaves protector / felt support tray 1.5 m", "length", 3.2, "SUPPORTING"),
    polytop_pins: m("Stainless polytop pins (box 100)", "box", 8, "SUPPORTING"),
    gutter_halfround: m("Half-round gutter 112 mm × 4 m", "length", 14, "MATERIAL"),
    gutter_square: m("Square gutter 114 mm × 4 m", "length", 16, "MATERIAL"),
    gutter_deepflow: m("Deep-flow gutter 115 mm × 4 m", "length", 18, "MATERIAL"),
    gutter_ogee: m("Ogee gutter 122 mm × 4 m", "length", 22, "MATERIAL"),
    gutter_bracket: m("Gutter fascia bracket", "each", 1.6, "SUPPORTING"),
    gutter_union: m("Gutter union joint", "each", 3.2, "SUPPORTING"),
    gutter_stop_end: m("Gutter stop end (end piece)", "each", 2.5, "SUPPORTING"),
    gutter_outlet: m("Running outlet", "each", 4.5, "SUPPORTING"),
    gutter_angle_90: m("Gutter 90° angle", "each", 6.5, "SUPPORTING"),
    gutter_angle_135: m("Gutter 135° (45°) angle", "each", 7.5, "SUPPORTING"),
    downpipe_round: m("Round downpipe 68 mm × 2.5 m", "length", 11, "MATERIAL"),
    downpipe_square: m("Square downpipe 65 mm × 2.5 m", "length", 13, "MATERIAL"),
    pipe_clip: m("Downpipe clip", "each", 1.6, "SUPPORTING"),
    offset_bend: m("Offset bend 112.5°", "each", 3.5, "SUPPORTING"),
    pipe_socket: m("Downpipe socket / connector", "each", 3, "SUPPORTING"),
    pipe_shoe: m("Downpipe shoe / gully connector", "each", 3, "SUPPORTING"),

    // Rooflights by size
    rooflight_600: m("Flat rooflight 600 × 600", "each", 420, "MATERIAL"),
    rooflight_800: m("Flat rooflight 800 × 800", "each", 520, "MATERIAL"),
    rooflight_1000: m("Flat rooflight 1000 × 1000", "each", 750, "MATERIAL"),
    rooflight_1000x1500: m("Flat rooflight 1000 × 1500", "each", 980, "MATERIAL"),
    rooflight_1000x2000: m("Flat rooflight 1000 × 2000", "each", 1250, "MATERIAL"),
    lantern_2000x1000: m("Aluminium roof lantern 2000 × 1000", "each", 1600, "MATERIAL"),
    lantern_3000x1000: m("Aluminium roof lantern 3000 × 1000", "each", 2100, "MATERIAL"),
    lantern_3000x1500: m("Aluminium roof lantern 3000 × 1500", "each", 2600, "MATERIAL"),
    upstand_kerb: m("Rooflight timber upstand / kerb", "each", 45, "SUPPORTING"),

    // Kitchens
    base_unit_standard: m("Kitchen base unit – standard", "each", 150, "MATERIAL"),
    base_unit_mid: m("Kitchen base unit – mid range", "each", 260, "MATERIAL"),
    base_unit_premium: m("Kitchen base unit – premium", "each", 420, "MATERIAL"),
    wall_unit_standard: m("Kitchen wall unit – standard", "each", 110, "MATERIAL"),
    wall_unit_mid: m("Kitchen wall unit – mid range", "each", 190, "MATERIAL"),
    wall_unit_premium: m("Kitchen wall unit – premium", "each", 310, "MATERIAL"),
    worktop_laminate: m("Laminate worktop", "m", 60, "MATERIAL"),
    worktop_wood: m("Solid wood worktop", "m", 150, "MATERIAL"),
    worktop_quartz: m("Quartz worktop – templated & fitted by supplier", "m", 450, "MATERIAL"),
    sink_tap: m("Sink & mixer tap", "set", 260, "MATERIAL"),
    kitchen_sundries: m("Plinths, panels, handles, fixings", "unit", 25, "SUPPORTING"),
    splashback_tile: m("Splashback tiles", "m2", 35, "MATERIAL"),

    // Doors
    door_standard: m("Internal door – standard", "each", 75, "MATERIAL"),
    door_fire: m("Internal fire door FD30", "each", 120, "MATERIAL"),
    door_premium: m("Internal door – premium", "each", 160, "MATERIAL"),
    door_lining: m("Door lining / frame set", "set", 28, "SUPPORTING"),
    hinges_pair: m("Hinges (pair)", "pair", 6, "SUPPORTING"),
    handle_set: m("Door handle & latch set", "set", 18, "SUPPORTING"),
    door_stop: m("Door stop bead set", "set", 6, "SUPPORTING"),
    door_paint: m("Paint & sundries per door", "door", 12, "SUPPORTING"),

    // Preliminaries & plant
    scaffold_erect: m("Scaffold erect & dismantle", "item", 1800, "PRELIM"),
    scaffold_hire: m("Scaffold hire", "week", 120, "PRELIM"),
    skip_8yd: m("Skip hire 8 yd", "skip", 320, "PRELIM"),
    muck_away: m("Muck away grab lorry (≈8 m³)", "load", 360, "PRELIM"),
    mini_digger: m("Mini digger hire incl. fuel", "day", 140, "PRELIM"),
    welfare: m("Welfare unit / site toilet", "week", 45, "PRELIM"),
    site_protection: m("Site set-up & protection (floors, stairs, dust)", "item", 250, "PRELIM"),
    building_control: m("Building control fee (provisional)", "item", 1000, "PRELIM"),
    structural_engineer: m("Structural engineer calculations", "item", 650, "PRELIM"),
    party_wall: m("Party wall surveyor (per neighbour)", "neighbour", 1000, "PRELIM"),
    final_clean: m("Builders' clean on completion", "item", 250, "PRELIM"),

    // Health & safety
    rams_cpp: m("RAMS & CDM construction phase plan", "item", 150, "HEALTH_SAFETY"),
    ppe_first_aid: m("PPE & first aid provision", "item", 60, "HEALTH_SAFETY"),
    fire_safety: m("Temporary fire extinguishers & signage", "item", 60, "HEALTH_SAFETY"),
    edge_protection: m("Edge protection / fall arrest while roof open", "item", 200, "HEALTH_SAFETY"),
    temp_weatherproofing: m("Temporary roof sheeting / weatherproofing", "item", 250, "HEALTH_SAFETY"),
    excavation_safety: m("Trench support, barriers & service scan (CAT)", "item", 180, "HEALTH_SAFETY"),
    dust_control: m("Dust extraction & asbestos check allowance", "item", 120, "HEALTH_SAFETY"),
  },
};

/** Material alternatives the user can pick per quote (same unit). */
/**
 * Finishes the client normally buys (when "client supplies finishes" is on): tiles, sanitaryware, kitchen,
 * floor finishes and decorative light fittings. Each line can still be switched to "we supply".
 */
const CLIENT_FINISH = /^(tile_(ceramic|porcelain|metro|mosaic|stone)|wall_tile_|floor_tile$|splashback_tile$|suite_|shower_(standard|mid|premium)$|towel_rail$|(base|wall)_unit_|worktop_|sink_tap$|kitchen_sundries$|floor_(laminate|engineered|lvt|carpet)$|pendant_fitting$|outside_light_fitting$)/;
export const isClientFinish = (key: string) => CLIENT_FINISH.test(key);

export const materialVariants: { id: string; label: string; keys: string[] }[] = [
  { id: "pipe15", label: "15 mm pipe", keys: ["pipe_cu_15", "pipe_pex_15"] },
  { id: "skirting", label: "Skirting", keys: ["skirting_mdf", "skirting_mdf_144", "skirting_mdf_169", "skirting_ogee_119", "skirting_pine_119", "skirting_oak_119"] },
  { id: "architrave", label: "Architrave", keys: ["architrave_set", "architrave_ogee", "architrave_pine", "architrave_oak"] },
  { id: "plasterboard", label: "Plasterboard", keys: ["plasterboard_125", "plasterboard_15", "plasterboard_moisture", "plasterboard_fire", "plasterboard_acoustic", "plasterboard_thermal"] },
  { id: "pir", label: "PIR insulation", keys: ["pir_25", "pir_50", "pir_75", "pir_100", "pir_120", "pir_150", "pir_165"] },
  { id: "door", label: "Door", keys: ["door_standard", "door_glazed", "door_fire", "door_premium", "door_oak"] },
  { id: "handle", label: "Handles", keys: ["handle_set", "handle_black", "handle_premium"] },
  { id: "hinges", label: "Hinges", keys: ["hinges_pair", "hinges_fire", "hinges_brass"] },
  { id: "window", label: "Window", keys: ["window_upvc", "window_alu", "window_timber"] },
  { id: "glazed_doors", label: "Rear doors", keys: ["bifold_alu", "sliding_alu", "french_upvc"] },
  { id: "timber", label: "Timber size", keys: ["timber_47x100", "timber_47x150", "timber_47x175", "timber_47x200", "timber_47x225"] },
  { id: "beam", label: "Steel size", keys: ["beam_152x89", "beam_152x152", "beam_178x102", "beam_203x133", "beam_203x203", "beam_254x146"] },
  { id: "fascia", label: "Fascia width", keys: ["fascia_150", "fascia_175", "fascia_200", "fascia_225", "fascia_250"] },
  { id: "soffit", label: "Soffit width", keys: ["soffit_100", "soffit_150", "soffit_200", "soffit_300"] },
  { id: "gutter", label: "Gutter profile", keys: ["gutter_halfround", "gutter_square", "gutter_deepflow", "gutter_ogee"] },
  { id: "downpipe", label: "Downpipe", keys: ["downpipe_round", "downpipe_square"] },
  { id: "rooflight", label: "Rooflight size", keys: ["rooflight_600", "rooflight_800", "rooflight_1000", "rooflight_1000x1500", "rooflight_1000x2000", "lantern_2000x1000", "lantern_3000x1000", "lantern_3000x1500"] },
  { id: "flat_finish", label: "Flat roof finish", keys: ["grp_system", "felt_system"] },
  { id: "cladding", label: "Dormer cladding", keys: ["clad_tile_hanging", "clad_slate", "clad_render"] },
  { id: "worktop", label: "Worktop", keys: ["worktop_laminate", "worktop_wood", "worktop_quartz"] },
  { id: "consumer_unit", label: "Consumer unit", keys: ["consumer_unit"] },
];
const variantIndex = new Map(materialVariants.flatMap(g => g.keys.map(k => [k, g] as const)));
export const variantGroupOf = (key: string) => variantIndex.get(key);

/** Catalogue item code used when looking up company/live prices. */
export const catalogueCodeFor = (key: string) => defaultRateBook.materials[key]?.catalogueCode ?? `TK-${key.toUpperCase()}`;

/**
 * Apply company overrides:
 * { materials: { key: { price } }, labour: { key: { price, days, crew } },
 *   trades: { BRICKLAYER: { dayRate } }, outputs: { blockwork: { perDay } } }
 */
export function mergeRateBook(base: RateBook, overrides: unknown): RateBook {
  const out: RateBook = { materials: { ...base.materials }, labour: { ...base.labour }, trades: { ...base.trades } };
  if (!overrides || typeof overrides !== "object") return out;
  const ov = overrides as Record<string, Record<string, unknown> | undefined>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const rec = (v: unknown) => (v && typeof v === "object" ? v as Record<string, unknown> : null);
  for (const [key, raw] of Object.entries(ov.materials ?? {})) {
    const cur = out.materials[key], r = rec(raw); if (!cur || !r) continue;
    const price = num(r.price); if (price !== undefined) out.materials[key] = { ...cur, price, confirmed: true };
  }
  for (const [key, raw] of Object.entries(ov.labour ?? {})) {
    const cur = out.labour[key], r = rec(raw); if (!cur || !r) continue;
    const perDay = num(r.perDay), daysPerUnit = num(r.daysPerUnit);
    out.labour[key] = { ...cur, price: num(r.price) ?? cur.price,
      ...(cur.perDay !== undefined && perDay ? { perDay } : {}),
      ...(cur.daysPerUnit !== undefined && daysPerUnit !== undefined ? { daysPerUnit } : {}), confirmed: true };
  }
  for (const [key, raw] of Object.entries(ov.trades ?? {})) {
    const cur = out.trades[key as Trade], r = rec(raw); if (!cur || !r) continue;
    const dayRate = num(r.dayRate); if (dayRate !== undefined) out.trades[key as Trade] = { ...cur, dayRate, confirmed: true };
  }
  return out;
}
