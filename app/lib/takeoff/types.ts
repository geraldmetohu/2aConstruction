// Takeoff calculator: turns property dimensions and the client's choices into
// quantities, costs, trades, labour days and a scope of works. Pure TypeScript,
// no database access, safe to run in the browser (admin) or on the server (public).

export type HouseType = "TERRACED" | "SEMI_OR_END" | "DETACHED";

export const houseTypeLabels: Record<HouseType, string> = {
  TERRACED: "Terraced",
  SEMI_OR_END: "Semi-detached / end-terrace",
  DETACHED: "Detached",
};

/** How a cost line is grouped in totals. */
export type CostKind =
  | "MATERIAL"        // main materials (door, beam, joists, sheets, bricks)
  | "SUPPORTING"      // hinges, screws, hangers, cement, sand, ties …
  | "LABOUR"
  | "PRELIM"          // scaffold, skips, plant, welfare, fees, cleaning
  | "HEALTH_SAFETY";  // RAMS, CDM plan, PPE, fire safety

export const costKindLabels: Record<CostKind, string> = {
  MATERIAL: "Main materials",
  SUPPORTING: "Supporting materials",
  LABOUR: "Labour",
  PRELIM: "Preliminaries & site costs",
  HEALTH_SAFETY: "Health & safety",
};

export type Trade =
  | "GENERAL_BUILDER" | "LABOURER" | "GROUNDWORKER" | "BRICKLAYER" | "CARPENTER" | "ROOFER"
  | "PLASTERER" | "ELECTRICIAN" | "PLUMBER" | "TILER" | "DECORATOR" | "KITCHEN_FITTER"
  | "RENDERER" | "LANDSCAPER" | "CLEANER";

/** Every trade in the order they are shown (filters, trade summaries, document grouping). */
export const TRADES: Trade[] = [
  "GENERAL_BUILDER", "LABOURER", "GROUNDWORKER", "BRICKLAYER", "CARPENTER", "ROOFER", "PLASTERER", "RENDERER",
  "ELECTRICIAN", "PLUMBER", "TILER", "DECORATOR", "KITCHEN_FITTER", "LANDSCAPER", "CLEANER",
];

export interface GangMember { trade: Trade; n: number }

/** Trade name and reference day rate (used only to split labour cost between trades in a gang). */
export interface TradeRate { name: string; dayRate: number; confirmed: boolean }

/** A material, consumable or fixed site cost with a unit price (ex VAT). */
export interface MaterialRate {
  name: string;
  unit: string;          // "m", "each", "sheet", "bag", "m2", "week", "item" …
  price: number;         // GBP ex VAT per unit
  kind: Exclude<CostKind, "LABOUR">;
  /** true = price given by the company; false = indicative default to confirm. */
  confirmed: boolean;
  /** Catalogue item code used to look up company/live supplier prices. */
  catalogueCode?: string;
  note?: string;
}

/**
 * A labour job from the labour price list. Priced per unit (m², m, point, door, job…)
 * so it matches how trades quote. Programme days come from `perDay` (output per day)
 * or `daysPerUnit` (fixed company allowance).
 */
export interface LabourItem {
  name: string;
  unit: string;
  price: number;          // GBP ex VAT per unit – editable
  gang: GangMember[];     // who does it (for the trades summary and crew size)
  perDay?: number;        // units completed per day
  daysPerUnit?: number;   // or a fixed allowance per unit (company jobs)
  minDays?: number;       // minimum charge / allowance in days (default ½ day for perDay items)
  group: string;          // price-list section, e.g. "Painting & decorating"
  confirmed: boolean;
  note?: string;
}

export interface RateBook {
  materials: Record<string, MaterialRate>;
  labour: Record<string, LabourItem>;
  trades: Record<Trade, TradeRate>;
}

export type PriceSource = "LIVE_SUPPLIER" | "CATALOGUE" | "COMPANY_RATE" | "DEFAULT" | "MANUAL";

export const priceSourceLabels: Record<PriceSource, string> = {
  LIVE_SUPPLIER: "Live supplier price",
  CATALOGUE: "Catalogue price",
  COMPANY_RATE: "Company rate",
  DEFAULT: "Default rate",
  MANUAL: "Edited for this quote",
};

/** Resolved unit price for one rate-book key. */
export interface ResolvedPrice {
  price: number;
  source: PriceSource;
  label?: string;       // e.g. "Selco · 28 Oct 2026"
  observedAt?: string;
  imageUrl?: string;
}

export type PriceTable = Record<string, ResolvedPrice>;

export interface TakeoffLine {
  key: string;
  /** Where the work is: a room name ("Bedroom 1") or a project ("Loft conversion", "Site"). */
  area: string;
  package: string;        // kept for compatibility: same as area
  stage: string;          // programme stage, e.g. "Extension · Foundations"
  kind: CostKind;
  rateKey: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  /** Human readable working, e.g. "(5.2 m × 4) + 3 = 24 joists × 7.4 m". */
  formula: string;
  source: PriceSource;
  sourceLabel?: string;
  confirmed: boolean;
  days?: number;
  crew?: number;
  gang?: GangMember[];
  /** First fix & structure, second fix & finishes, or site costs. */
  phase: Phase;
  /** Stable id of this material in this area: "<area>::<rateKey>" (used for type choices and client supply). */
  materialKey?: string;
  /** Alternatives the user can switch to (same unit), when the material has types/sizes. */
  variantGroup?: string;
  /** Client buys this item: shown for ordering, excluded from our price. */
  clientSupplied?: boolean;
  /** Stable id of this line for removing it: "<area>::<stage>::<rateKey>::<n>". */
  lineId: string;
  /** Removed from the quote by the admin (kept visible, faded, at £0). */
  excluded?: boolean;
  /** Product image from the linked supplier page, if any. */
  imageUrl?: string;
  /** Trade that does (or fits) this line. Site set-up lines have none. */
  trade?: Trade;
  /** Custom item added by hand for this quote (its id). */
  customId?: string;
  /** VAT rate for this line when it differs from the quote's rate (e.g. 0 for zero-rated energy-saving materials). */
  vatPercent?: number;
  /** Provisional sum (adjusted to actual cost). */
  provisional?: boolean;
}

export type Phase = "FIRST_FIX" | "SECOND_FIX" | "SITE";
export const phaseLabels: Record<Phase, string> = { FIRST_FIX: "Structure & first fix", SECOND_FIX: "Second fix & finishes", SITE: "Site set-up, scaffolding & safety" };

export interface PhaseSummary { phase: Phase; materials: number; labour: number; siteCosts: number; total: number }
export interface ClientOrderItem { area: string; description: string; quantity: number; unit: string; estimate: number; imageUrl?: string; materialKey: string; stage: string; spec: string }
/** A scope sentence with the programme stage it belongs to (for chronological order). */
export interface ScopeItem { text: string; area: string; stage: string; /** Describes several steps of the area (shown as its introduction). */ summary?: boolean }

export interface StageSummary {
  stage: string;
  package: string;
  days: number;
  crew: number;
  personDays: number;
  cost: number;
}

export interface TradeSummary {
  trade: Trade;
  name: string;
  dayRate: number;
  days: number;        // days on site (gang-days the trade is involved)
  personDays: number;
  cost: number;
  stages: string[];
}

export interface TakeoffTotals {
  material: number;
  supporting: number;
  waste: number;
  labour: number;
  prelim: number;
  healthSafety: number;
  costSubtotal: number;
  contingency: number;
  markup: number;
  /** Price before any discount. */
  netBeforeDiscount: number;
  discount: number;
  net: number;
  vat: number;
  gross: number;
  /** VAT by rate (one entry when everything is at the quote's rate). */
  vatBreakdown: { percent: number; net: number; vat: number }[];
}

/** An option the client will choose later in their portal; priced at the default for now. */
export interface ClientChoice {
  scope: "room" | "package";
  id: string;            // room id or package id
  area: string;          // room / project name
  key: string;
  label: string;
  value: string;
  valueLabel: string;
  options: [string, string][];
}

export interface AreaSummary { area: string; cost: number; days: number }

export interface TakeoffResult {
  lines: TakeoffLine[];
  phases: PhaseSummary[];
  /** Items the client has agreed to buy themselves (not in our price). */
  clientOrders: ClientOrderItem[];
  scaffolding: { included: boolean; cost: number };
  areas: AreaSummary[];
  clientChoices: ClientChoice[];
  stages: StageSummary[];
  trades: TradeSummary[];
  totals: TakeoffTotals;
  programme: { workingDays: number; weeks: number; personDays: number; peakCrew: number };
  scope: string[];
  scopeItems: ScopeItem[];
  assumptions: string[];
  warnings: string[];
  unconfirmedRates: string[];
}
