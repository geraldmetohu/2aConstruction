import type { TakeoffLine, TakeoffResult } from "./types";

const bucket: Record<TakeoffLine["kind"], "material" | "supportingMaterial" | "labour" | "preliminaries"> = {
  MATERIAL: "material", SUPPORTING: "supportingMaterial", LABOUR: "labour", PRELIM: "preliminaries", HEALTH_SAFETY: "preliminaries",
};
const dec = (x: number, dp: number) => {
  const s = x.toFixed(dp).replace(/\.?0+$/, "");
  return s === "" ? "0" : s;
};

/**
 * Convert a takeoff into quote-builder lines (MANUAL lines with separated cost
 * buckets). The quote builder then applies the company's waste, contingency,
 * markup and the chosen VAT code exactly as for any other quote.
 */
export function takeoffToQuoteLines(result: TakeoffResult, taxCodeId: string) {
  return result.lines.map((l, i) => ({
    input: {
      type: "MANUAL" as const,
      key: `takeoff-${i + 1}-${l.rateKey.replace(/[^a-z0-9_-]/gi, "-")}`.slice(0, 160),
      description: l.description,
      quantity: dec(l.quantity, 6),
      unitLabel: l.unit,
      unitCosts: { material: "0", supportingMaterial: "0", labour: "0", plant: "0", waste: "0", preliminaries: "0", other: "0", [bucket[l.kind]]: dec(l.unitPrice, 4) },
      taxCodeId,
      reason: `Takeoff: ${l.formula}`.slice(0, 4000),
      inclusion: "INCLUDED" as const,
      selected: false,
      discountPercent: "0",
      stage: l.stage,
    },
    description: l.description,
    section: "Scope",
    room: "",
    stage: l.stage,
    overrides: {},
    overrideReason: "",
  }));
}
