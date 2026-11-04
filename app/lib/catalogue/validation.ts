import { z } from "zod";

export const itemTypes = ["MATERIAL", "LABOUR", "PLANT", "WASTE", "PRELIMINARY", "ASSEMBLY", "OTHER"] as const;
export const itemRoles = ["MAIN", "SUPPORTING", "BOTH"] as const;
export const fixStages = ["FIRST_FIX", "SECOND_FIX", "BOTH", "NOT_APPLICABLE"] as const;
export const conditions = ["NEW_BUILD", "NEW_INSTALLATION", "REFURBISHMENT", "REPAIR", "MAKE_GOOD", "REDECORATION"] as const;
export const dimensions = ["width", "height", "length", "depth", "thickness", "diameter", "area", "volume"] as const;
export const lookupKinds = ["category", "unit", "labour", "supplier", "tax"] as const;
export type LookupKind = typeof lookupKinds[number];
export type ActionResult = { ok: boolean; message: string; id?: string };

const text = (max = 160) => z.string().trim().min(1, "Please fill in the required fields.").max(max);
const optionalText = (max = 2000) => z.string().trim().max(max).default("");
const uuid = z.string().uuid("Please choose a valid entry.");
const optionalId = z.union([uuid, z.literal("")]).default("");
const code = text(60).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Codes can contain letters, numbers, dots, hyphens and underscores.");
const integer = (min: number, max: number) => z.string().regex(/^\d+$/, "Enter a whole number.").transform(Number).pipe(z.number().int().min(min).max(max));
// Keep decimals as strings. Reject exponent notation, NaN, commas and excess scale.
export const decimal = (scale = 4, positive = false) => z.string().trim()
  .regex(new RegExp(`^\\d{1,9}(?:\\.\\d{1,${scale}})?$`), `Enter a number with up to ${scale} decimal places.`)
  .refine(v => !positive || Number(v) > 0, "Enter a number greater than zero.");
const optionalDecimal = (scale = 4) => z.union([decimal(scale), z.literal("")]).default("");
const bool = z.enum(["true", "false"]).transform(v => v === "true");
const utc = z.string().datetime({ offset: true }).transform(v => new Date(v));
const json = <T extends z.ZodTypeAny>(schema: T) => z.string().max(40000).transform((v, ctx) => {
  try { return JSON.parse(v) as unknown; } catch { ctx.addIssue({ code: "custom", fatal: true, message: "The form could not be read. Please reload and try again." }); return z.NEVER; }
}).pipe(schema);
const revision = integer(1, 2147483646);
export const itemRef = z.object({ itemId: uuid, revision });
export const itemSchema = z.object({
  id: optionalId, revision: z.union([revision, z.literal("")]).default(""), code, name: text(), description: optionalText(4000),
  categoryId: uuid, unitId: uuid, itemType: z.enum(itemTypes), itemRole: z.enum(itemRoles), fixStage: z.enum(fixStages),
  defaultQuantity: decimal(6, true), defaultDurationHours: optionalDecimal(6), active: bool,
  ...Object.fromEntries(dimensions.map(key => [key, optionalDecimal(6)])) as Record<typeof dimensions[number], ReturnType<typeof optionalDecimal>>,
}).refine(v => !v.id || typeof v.revision === "number", "Reload this item before saving.");
export const statusSchema = itemRef.extend({ state: z.enum(["archive", "restore", "activate", "deactivate"]) });
export const duplicateSchema = itemRef.extend({ code, name: text() });
export const priceSchema = itemRef.extend({
  materialUnitCost: decimal(), labourUnitCost: optionalDecimal(), plantUnitCost: decimal(), wasteUnitCost: decimal(), otherUnitCost: decimal(),
  taxCodeId: optionalId, effectiveFrom: utc, source: text(500), sourceDate: z.union([utc, z.literal("")]),
  confidence: z.enum(["UNVERIFIED", "INDICATIVE", "VERIFIED"]), notes: optionalText(4000),
});
const supporting = z.object({ itemId: uuid, quantity: decimal(6, true), mandatory: z.boolean(), defaultSelected: z.boolean() })
  .refine(v => !v.mandatory || v.defaultSelected, "Required supporting items must be selected by default.");
const labour = z.object({ roleId: uuid, hours: decimal(6, true), teamSize: z.number().int().min(1).max(1000), rateBasis: z.enum(["HOURLY", "DAILY"]) });
export const recipeSchema = itemRef.extend({
  condition: z.enum(conditions), assumptions: optionalText(4000),
  supporting: json(z.array(supporting).max(50)), labour: json(z.array(labour).max(30)),
}).refine(v => new Set(v.supporting.map(s => s.itemId)).size === v.supporting.length, "Each supporting item can appear once.")
  .refine(v => new Set(v.labour.map(s => s.roleId)).size === v.labour.length, "Each labour role can appear once.")
  .refine(v => !v.supporting.some(s => s.itemId === v.itemId), "An item cannot support itself.");
export const optionSchema = itemRef.extend({ optionId: optionalId, groupCode: code, code, label: text(), materialDelta: decimal(), labourDelta: decimal(), specification: optionalText(2000) });
export const optionStatusSchema = itemRef.extend({ optionId: uuid, active: bool });
export const referenceSchema = itemRef.extend({
  supplierId: uuid, unitId: uuid, supplierCode: optionalText(160), sourceUrl: z.union([z.string().url().max(2000).refine(v => /^https?:\/\//i.test(v), "Use an http or https link."), z.literal("")]),
  referencePrice: decimal(), packQuantity: z.union([decimal(6, true), z.literal("")]), taxInclusive: bool, checkedAt: utc, notes: optionalText(4000),
});
export const lookupSchema = z.object({
  kind: z.enum(lookupKinds), id: optionalId, revision: z.union([revision, z.literal("")]).default(""), code, name: text(),
  parentId: optionalId, dimensionKind: z.enum(["COUNT", "LENGTH", "AREA", "VOLUME", "TIME", "MASS", "CUSTOM"]).default("COUNT"),
  canonicalFactor: z.union([decimal(6, true), z.literal("")]).default(""), quantityScale: integer(0, 6).default("3"),
  email: z.union([z.string().email().max(320), z.literal("")]).default(""), phone: optionalText(80),
  website: z.union([z.string().url().max(2000).refine(v => /^https?:\/\//i.test(v)), z.literal("")]).default(""),
}).refine(v => !v.id || typeof v.revision === "number", "Reload this entry before saving.");
export const lookupStatusSchema = z.object({ kind: z.enum(lookupKinds), id: uuid, revision, archive: bool });
export const rateSchema = z.object({
  kind: z.enum(["tax", "labour"]), id: uuid, revision, effectiveFrom: utc, source: text(500),
  rate: optionalDecimal(), hourlyCost: optionalDecimal(), dailyCost: optionalDecimal(),
  productiveHoursPerDay: optionalDecimal(6), defaultTeamSize: integer(1, 1000).default("1"),
}).superRefine((v, ctx) => {
  if (v.kind === "tax" && (v.rate === "" || Number(v.rate) > 100)) ctx.addIssue({ code: "custom", message: "Enter a VAT rate between 0 and 100." });
  if (v.kind === "labour" && (v.hourlyCost === "" || Number(v.productiveHoursPerDay) <= 0 || Number(v.productiveHoursPerDay) > 24)) ctx.addIssue({ code: "custom", message: "Enter an hourly cost and between 0 and 24 productive hours per day." });
});

export function formValues(form: FormData) {
  const result: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string" || value.length > 40000 || key.length > 100) throw new Error("Invalid form data.");
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error("Repeated form field.");
    Object.defineProperty(result, key, { value, enumerable: true, configurable: true });
  }
  return result;
}

export function humanize(value: string) { return value.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase()); }
export function isCatalogueAdmin(user: { id?: string | null; email?: string | null } | null, allowlist: string | undefined) {
  return !!user?.id && !!user.email && (allowlist ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean).includes(user.email.trim().toLowerCase());
}
