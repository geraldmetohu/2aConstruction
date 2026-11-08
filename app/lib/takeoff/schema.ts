import { z } from "zod";

const metres = (max: number) => z.number().finite().min(0.5).max(max);
const count = (max: number) => z.number().int().min(0).max(max);
const percent = z.number().finite().min(0).max(100);
const value = z.union([z.number().finite(), z.boolean(), z.string().max(60)]);
const text = (max: number) => z.string().trim().max(max).default("");

export const houseTypeOptions = [["TERRACED", "Terraced"], ["SEMI_OR_END", "Semi-detached / end-terrace"], ["DETACHED", "Detached"]] as const;
export const constructionOptions = [["SOLID_BRICK", "Solid brick"], ["CAVITY", "Cavity wall"], ["TIMBER_FRAME", "Timber frame"], ["OTHER", "Other / not sure"]] as const;
export const ageOptions = [["PRE_1919", "Before 1919 (Victorian / Edwardian)"], ["1919_1945", "1919–1945"], ["1945_1980", "1945–1980"], ["1980_2000", "1980–2000"], ["POST_2000", "After 2000"]] as const;
export const parkingOptions = [["STREET", "Street parking"], ["PERMIT", "Permit / pay & display"], ["DRIVEWAY", "Driveway"], ["NONE", "No parking nearby"]] as const;
export const accessOptions = [["EASY", "Easy access"], ["RESTRICTED", "Restricted (narrow, through house)"], ["RED_ROUTE", "Red route / no stopping"]] as const;
export const occupancyOptions = [["EMPTY", "Empty during works"], ["OCCUPIED", "Occupied during works"]] as const;

const keys = <T extends readonly (readonly [string, string])[]>(o: T) => o.map(([k]) => k) as unknown as [T[number][0], ...T[number][0][]];

export const propertySchema = z.object({
  houseType: z.enum(keys(houseTypeOptions)),
  /** Party wall to party wall (side to side), metres. Loft beams span this. */
  width: metres(20),
  /** Front to back, metres. Loft floor joists span this. */
  length: metres(30),
  postcode: z.string().trim().max(10).default(""),
  // General description of the house
  storeys: count(5).default(2),
  bedrooms: count(12).default(3),
  construction: z.enum(keys(constructionOptions)).default("SOLID_BRICK"),
  age: z.enum(keys(ageOptions)).default("PRE_1919"),
  occupancy: z.enum(keys(occupancyOptions)).default("OCCUPIED"),
  parking: z.enum(keys(parkingOptions)).default("PERMIT"),
  access: z.enum(keys(accessOptions)).default("EASY"),
  notes: text(2000),
});

export const roomTypeOptions = [
  ["BEDROOM", "Bedroom"], ["LIVING", "Living room"], ["DINING", "Dining room"], ["KITCHEN", "Kitchen"], ["BATHROOM", "Bathroom"],
  ["ENSUITE", "En-suite"], ["WC", "WC / cloakroom"], ["HALL", "Hallway"], ["LANDING", "Landing"], ["STAIRS", "Staircase"],
  ["OFFICE", "Study / office"], ["UTILITY", "Utility"], ["OTHER", "Other"],
] as const;
export const floorOptions = [["BASEMENT", "Basement"], ["GROUND", "Ground floor"], ["FIRST", "First floor"], ["SECOND", "Second floor"], ["LOFT", "Loft"]] as const;

export const roomSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  type: z.enum(keys(roomTypeOptions)),
  floor: z.enum(keys(floorOptions)).default("GROUND"),
  length: z.number().finite().min(0.5).max(30),
  width: z.number().finite().min(0.5).max(30),
  height: z.number().finite().min(1.8).max(6).default(2.5),
  doors: count(10).default(1),
  windows: count(12).default(1),
  radiators: count(10).default(1),
  notes: text(1000),
  /** Works in this room, validated against the room works fields. */
  works: z.record(value).default({}),
});

export const packageInputSchema = z.object({
  enabled: z.boolean(),
  values: z.record(value).default({}),
});

export const prelimsSchema = z.object({
  scaffold: z.boolean().default(true),
  autoSkips: z.boolean().default(true),
  skips: count(30).default(3),
  welfare: z.boolean().default(true),
  siteProtection: z.boolean().default(true),
  buildingControl: z.boolean().default(true),
  structuralEngineer: z.boolean().default(true),
  partyWallNeighbours: count(4).default(0),
  finalClean: z.boolean().default(true),
  healthSafety: z.boolean().default(true),
  /** New consumer unit (board + RCBOs) for the house. */
  consumerUnit: z.boolean().default(false),
  /** One electrical certificate for the whole job when there is any electrical work. */
  electricalCertificate: z.boolean().default(true),
  /** House services. */
  waterMainRun: z.number().finite().min(0).max(100).default(0),
  moveStopcock: z.boolean().default(false),
  outsideTaps: count(4).default(0),
});

export const commercialSchema = z.object({
  wastePercent: percent.default(10),
  contingencyPercent: percent.default(5),
  markupPercent: z.number().finite().min(0).max(300).default(15),
  vatPercent: percent.default(20),
  /** 0% VAT on installing energy-saving materials (external wall insulation) in homes – GB relief to 31 March 2027. */
  esmZeroRate: z.boolean().default(true),
  /** Discount off the price before VAT: a percentage and / or a fixed amount. */
  discountPercent: percent.default(0),
  discountAmount: z.number().finite().min(0).max(1_000_000).default(0),
  discountLabel: z.string().trim().max(80).default(""),
});

/** Quotation and contract terms for this job. */
export const termsSchema = z.object({
  title: text(140),
  /** Planned start date (YYYY-MM-DD); stage dates and payment dates are worked out from it. */
  startDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  depositPercent: z.number().finite().min(0).max(50).default(10),
  /** Interim stage payments between the deposit and the final payment. */
  stagePayments: z.number().int().min(1).max(8).default(3),
  finalPercent: z.number().finite().min(0).max(30).default(10),
  paymentDays: z.number().int().min(0).max(60).default(7),
  validityDays: z.number().int().min(7).max(180).default(30),
  guaranteeYears: z.number().int().min(1).max(10).default(5),
  /** Client's correspondence address if different from the site. */
  clientAddress: text(300),
  clientPhone: text(40),
  exclusions: text(3000),
  /** How the price is set out for the client: simple (scope + price per activity), normal (grouped, what each step includes) or itemised (every product and job priced). */
  format: z.enum(["SIMPLE", "NORMAL", "ITEMISED"]).default("SIMPLE"),
  /** Group the scope table by section (project / room) or by trade. */
  groupBy: z.enum(["AREA", "TRADE"]).default("AREA"),
});
export type Terms = z.output<typeof termsSchema>;
export type QuoteFormat = Terms["format"];
export const quoteFormatOptions = [
  ["SIMPLE", "Simple – scope of each activity and its price"],
  ["NORMAL", "Normal – grouped, with what each step includes"],
  ["ITEMISED", "Itemised – every product and job priced"],
] as const;

export const tradeKeys = ["GENERAL_BUILDER", "LABOURER", "GROUNDWORKER", "BRICKLAYER", "CARPENTER", "ROOFER", "PLASTERER", "RENDERER",
  "ELECTRICIAN", "PLUMBER", "TILER", "DECORATOR", "KITCHEN_FITTER", "LANDSCAPER", "CLEANER"] as const;
export const tradeSchema = z.enum(tradeKeys);

/** A job priced by hand for this project (anything not in the standard price list). */
export const customItemSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().max(120).default("").transform(t => t || "Custom item"),
  description: text(2000),
  trade: tradeSchema.default("GENERAL_BUILDER"),
  /** Room / project it belongs to; blank = "Additional works". */
  area: text(60),
  quantity: z.number().finite().min(0.01).max(100_000).default(1),
  unit: z.string().trim().min(1).max(20).default("item"),
  /** Price per unit, ex VAT. */
  price: z.number().finite().min(0).max(1_000_000).default(0),
  /** CLIENT = the price the client pays (margins already in it); COST = our cost (waste, contingency and markup are added). */
  priceMode: z.enum(["CLIENT", "COST"]).default("CLIENT"),
  kind: z.enum(["LABOUR", "MATERIAL"]).default("LABOUR"),
  /** Working days on site, for the programme. */
  days: z.number().finite().min(0).max(365).default(0),
  phase: z.enum(["FIRST_FIX", "SECOND_FIX"]).default("SECOND_FIX"),
  /** Materials per unit on top of the price (same price basis), for a job that has both. */
  materialPrice: z.number().finite().min(0).max(1_000_000).default(0),
  /** VAT rate for this job when it differs from the quote (e.g. 0 for zero-rated work); null = the quote's rate. */
  vatPercent: z.number().finite().min(0).max(100).nullable().default(null),
  /** Provisional sum: an allowance adjusted to the actual cost. */
  provisional: z.boolean().default(false),
});
export type CustomItem = z.output<typeof customItemSchema>;

/** Wording the admin changed for the client documents (kept per version). */
export const wordingSchema = z.object({
  /** Opening paragraph(s) of the quotation letter; blank = written automatically. */
  intro: text(4000),
  /** Per scope row ("<area>::<stage>"): new title / description, or hidden from the scope table (its price stays in). */
  rows: z.record(z.object({ title: text(160), text: text(4000), hidden: z.boolean().default(false) })).default({}),
  /** Per line id: new description for the itemised quote. */
  lines: z.record(z.string().trim().max(300)).default({}),
  /** Optional extras offered but not included in the price. */
  options: z.array(z.object({ title: z.string().trim().max(200).default("").transform(t => t || "Optional extra"), price: z.number().finite().min(0).max(1_000_000).nullable().default(null),
    /** The client added it (from their portal, or you for them); it is then priced in. */
    chosen: z.boolean().default(false) })).max(30).default([]),
  /** Provisional sums and important notes printed under the scope table. */
  notes: text(4000),
});
export type Wording = z.output<typeof wordingSchema>;

export const takeoffInputSchema = z.object({
  property: propertySchema,
  rooms: z.array(roomSchema).max(40).default([]),
  /** Whole-house projects keyed by package id (loft, extension, roofing). */
  packages: z.record(packageInputSchema).default({}),
  prelims: prelimsSchema,
  commercial: commercialSchema,
  /** Per-quote price edits keyed by rate key (materials) or labour:<key>. */
  priceEdits: z.record(z.number().finite().min(0).max(1_000_000)).default({}),
  /** Chosen type/size per material in an area: { "<area>::<rateKey>": "<alternative rateKey>" }. */
  materialChoices: z.record(z.string().max(60)).default({}),
  /** Who buys each material: { "<area>::<rateKey>": true (client) | false (us) }; overrides the default below. */
  clientSupply: z.record(z.boolean()).default({}),
  /** Client supplies finishes (tiles, sanitaryware, kitchen, flooring, light fittings) unless a line says otherwise. */
  finishesByClient: z.boolean().default(false),
  /** Labour only: the client buys every material (we list what to order); site costs stay in our price. */
  labourOnly: z.boolean().default(false),
  /** Lines removed from this quote: { "<lineId>": true }. Shown faded to the admin, not in the price. */
  excluded: z.record(z.boolean()).default({}),
  terms: termsSchema.default({}),
  /** Only these trades are priced (empty = every trade). Site set-up is always kept. */
  trades: z.array(tradeSchema).max(20).default([]),
  /** Jobs added by hand for this project. */
  customItems: z.array(customItemSchema).max(80).default([]),
  wording: wordingSchema.default({}),
});

export type TakeoffInput = z.output<typeof takeoffInputSchema>;
export type RoomInput = z.output<typeof roomSchema>;
export type PrelimsInput = z.output<typeof prelimsSchema>;

export function defaultTakeoffInput(): TakeoffInput {
  return takeoffInputSchema.parse({
    property: { houseType: "TERRACED", width: 5, length: 7 },
    rooms: [],
    packages: { loft: { enabled: true } },
    prelims: {},
    commercial: {},
    finishesByClient: true,
  });
}

let seq = 0;
export function newRoom(type: RoomInput["type"] = "BEDROOM", name?: string): RoomInput {
  const label = roomTypeOptions.find(([k]) => k === type)?.[1] ?? "Room";
  return roomSchema.parse({ id: `r${Date.now().toString(36)}${(seq++).toString(36)}`, name: name ?? label, type, length: 4, width: 3.5 });
}
