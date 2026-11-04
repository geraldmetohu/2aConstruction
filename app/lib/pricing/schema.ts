import { z } from "zod";

const amount = z.string().regex(/^\d{1,12}(?:\.\d{1,6})?$/, "Use a nonnegative decimal string with up to six decimal places.");
const positive = amount.refine(v => Number(v) > 0, "Quantity must be greater than zero.");
const percent = amount.refine(v => Number(v) <= 100, "Percentage must not exceed 100.");
const id = z.string().min(1).max(160);
const text = z.string().trim().min(1).max(4000);
const date = z.string().datetime({ offset: true });
const condition = z.enum(["NEW_BUILD", "NEW_INSTALLATION", "REFURBISHMENT", "REPAIR", "MAKE_GOOD", "REDECORATION"]);
const quantity = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("EXPLICIT"), value: positive, unitId: id.optional() }).strict(),
  z.object({ kind: z.literal("DEFAULT") }).strict(),
  z.object({ kind: z.literal("LENGTH"), length: positive, lengthUnit: z.enum(["m", "cm", "mm"]).default("m") }).strict(),
  z.object({ kind: z.literal("AREA"), length: positive, width: positive, lengthUnit: z.enum(["m", "cm", "mm"]).default("m") }).strict(),
  z.object({ kind: z.literal("WALL"), length: positive, height: positive, openingsAreaM2: amount.default("0"), lengthUnit: z.enum(["m", "cm", "mm"]).default("m") }).strict(),
  z.object({ kind: z.literal("VOLUME"), length: positive, width: positive, depth: positive, lengthUnit: z.enum(["m", "cm", "mm"]).default("m") }).strict(),
]);
const lineBase = {
  key: id, room: z.string().max(160).optional(), stage: z.string().max(160).optional(),
  inclusion: z.enum(["INCLUDED", "OPTIONAL", "EXCLUDED"]).default("INCLUDED"),
  selected: z.boolean().default(false), discountPercent: percent.default("0"),
  taxCodeId: id.optional(), markupPercent: amount.optional(),
};
export const costKeys = ["material", "supportingMaterial", "labour", "plant", "waste", "preliminaries", "other"] as const;
export const costsSchema = z.object({ material: amount.default("0"), supportingMaterial: amount.default("0"), labour: amount.default("0"), plant: amount.default("0"), waste: amount.default("0"), preliminaries: amount.default("0"), other: amount.default("0") }).strict();
export const requestSchema = z.object({
  asOf: date, currency: z.literal("GBP"), showContingency: z.boolean().default(true),
  specialRequests: z.array(text).max(100).default([]),
  lines: z.array(z.discriminatedUnion("type", [
    z.object({ ...lineBase, type: z.literal("ITEM"), itemId: id, condition, quantity,
      supplyBy: z.enum(["CONTRACTOR", "CLIENT", "EXISTING"]).default("CONTRACTOR"),
      // Child supply/condition can be overridden explicitly; root supply never
      // silently removes hinges, fixings or installation labour.
      supportingOverrides: z.array(z.object({ itemId: id, selected: z.boolean().optional(), supplyBy: z.enum(["CONTRACTOR", "CLIENT", "EXISTING"]).optional(), condition: condition.optional() }).strict()).max(100).default([]),
      optionIds: z.array(id).max(30).default([]),
    }).strict(),
    z.object({ ...lineBase, type: z.enum(["MANUAL", "ALLOWANCE", "PROVISIONAL"]), description: text, quantity: positive, unitLabel: text, unitCosts: costsSchema, taxCodeId: id, reason: text }).strict(),
    z.object({ key: id, type: z.literal("UNPRICED"), description: text, reason: text }).strict(),
  ])).min(1).max(300),
}).strict().superRefine((r, ctx) => {
  if (new Set(r.lines.map(l => l.key)).size !== r.lines.length) ctx.addIssue({ code: "custom", message: "Line keys must be unique." });
  for (const line of r.lines) if (line.type === "ITEM") {
    if (new Set(line.optionIds).size !== line.optionIds.length || new Set(line.supportingOverrides.map(s => s.itemId)).size !== line.supportingOverrides.length) ctx.addIssue({ code: "custom", message: "Option and supporting-item selections must be unique." });
  }
});
const versionBase = { id, effectiveFrom: date };
const unitSchema = z.object({ id, code: id, label: text, dimensionKind: z.enum(["COUNT", "LENGTH", "AREA", "VOLUME", "TIME", "MASS", "CUSTOM"]), canonicalFactor: positive.nullable(), quantityScale: z.number().int().min(0).max(6), archived: z.boolean() }).strict();
const ruleSchema = z.object({ kind: z.enum(["per_unit", "fixed"]), value: positive }).strict();
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
// Parse nested specifications too: z.unknown() would retain references to the
// caller's objects, allowing snapshot freezing to freeze the caller's data.
const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValue), z.record(jsonValue),
]));
export const catalogueSchema = z.object({
  settings: z.object({ id, effectiveFrom: date, currency: z.literal("GBP"), markupPercent: amount, wastePercent: percent, contingencyPercent: percent, roundingPolicyVersion: z.literal("GBP_LINE_HALF_UP_V1") }).strict(),
  units: z.array(unitSchema).max(5000),
  items: z.array(z.object({ id, code: id, name: text, description: z.string().max(10000), unitId: id,
    itemType: z.enum(["MATERIAL", "LABOUR", "PLANT", "WASTE", "PRELIMINARY", "ASSEMBLY", "OTHER"]), fixStage: id,
    active: z.boolean(), archived: z.boolean(), categoryArchived: z.boolean(), defaultQuantity: positive, defaultDurationHours: amount.nullable(),
  }).strict()).max(5000),
  prices: z.array(z.object({ ...versionBase, itemId: id, currency: z.literal("GBP"), versionNumber: z.number().int().positive(),
    materialUnitCost: amount, labourUnitCost: amount.nullable(), plantUnitCost: amount, wasteUnitCost: amount, otherUnitCost: amount,
    taxCodeId: id.nullable(), source: text, confidence: z.enum(["UNVERIFIED", "INDICATIVE", "VERIFIED"]),
  }).strict()).max(10000),
  recipes: z.array(z.object({ ...versionBase, itemId: id, condition, publishedAt: date.nullable(), ruleSchemaVersion: z.literal(1), quantityRule: ruleSchema, assumptions: z.array(text).max(100),
    supporting: z.array(z.object({ itemId: id, ruleSchemaVersion: z.literal(1), quantityRule: ruleSchema, mandatory: z.boolean(), defaultSelected: z.boolean(), costBucket: z.enum(["MATERIAL", "SUPPORTING_MATERIAL", "LABOUR", "PLANT", "WASTE", "OTHER"]) }).strict()).max(100),
    labour: z.array(z.object({ roleId: id, hoursPerUnit: amount, teamSize: z.number().int().positive().max(1000), rateBasis: z.enum(["HOURLY", "DAILY"]) }).strict()).max(100),
  }).strict()).max(10000),
  labourRoles: z.array(z.object({ id, name: text, archived: z.boolean() }).strict()).max(5000),
  labourRates: z.array(z.object({ ...versionBase, roleId: id, currency: z.literal("GBP"), hourlyCost: amount, dailyCost: amount.nullable(), productiveHoursPerDay: positive.refine(v => Number(v) <= 24) }).strict()).max(10000),
  taxCodes: z.array(z.object({ id, label: text, active: z.boolean(), archived: z.boolean() }).strict()).max(5000),
  taxRates: z.array(z.object({ ...versionBase, taxCodeId: id, rate: percent }).strict()).max(10000),
  options: z.array(z.object({ id, itemId: id, groupCode: id, label: text, active: z.boolean(), archived: z.boolean() }).strict()).max(10000),
  optionVersions: z.array(z.object({ ...versionBase, optionId: id, ruleSchemaVersion: z.literal(1), rule: z.object({ kind: z.literal("surcharge"), materialDelta: amount, labourDelta: amount }).strict(), specification: z.record(jsonValue) }).strict()).max(10000),
}).strict();

export type PricingRequest = z.input<typeof requestSchema>;
export type ParsedRequest = z.output<typeof requestSchema>;
export type Catalogue = z.output<typeof catalogueSchema>;
export type Costs = Record<typeof costKeys[number], string>;
