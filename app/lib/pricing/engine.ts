import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Catalogue, catalogueSchema, costKeys, Costs, ParsedRequest, requestSchema } from "./schema";

export const ENGINE_VERSION = "construction-pricing-v1";
const D = Prisma.Decimal.clone({ precision: 48, rounding: Prisma.Decimal.ROUND_HALF_UP });
type Num = Prisma.Decimal;
type Buckets = Record<typeof costKeys[number], Num>;
type ItemLine = Extract<ParsedRequest["lines"][number], { type: "ITEM" }>;
export class PricingError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "PricingError"; }
}
const fail = (code: string, message: string): never => { throw new PricingError(code, message); };
const zero = (): Buckets => Object.fromEntries(costKeys.map(k => [k, new D(0)])) as Buckets;
const total = (costs: Buckets) => costKeys.reduce((sum, k) => sum.plus(costs[k]), new D(0));
const money = (n: Num) => {
  if (!n.isFinite() || n.isNegative() || n.greaterThan("99999999999999999.99")) return fail("AMOUNT_OUT_OF_RANGE", "Calculated amount is outside the supported money range.");
  return n.toFixed(2);
};
const hours = (n: Num) => n.toFixed(6);
const costStrings = (b: Buckets): Costs => Object.fromEntries(costKeys.map(k => [k, money(b[k])])) as Costs;
const multiplyRule = (q: Num, rule: { kind: "per_unit" | "fixed"; value: string }) => rule.kind === "fixed" ? new D(rule.value) : q.times(rule.value);
function latest<T extends { id: string; effectiveFrom: string }>(values: T[], at: string): T | undefined {
  const eligible = values.filter(v => Date.parse(v.effectiveFrom) <= Date.parse(at)).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));
  if (eligible.length > 1 && Date.parse(eligible[0].effectiveFrom) === Date.parse(eligible[1].effectiveFrom)) fail("AMBIGUOUS_VERSION", "Two applicable versions have the same effective date.");
  return eligible[0];
}
function uniqueIds(rows: { id: string }[]) { if (new Set(rows.map(r => r.id)).size !== rows.length) fail("DUPLICATE_ID", "Catalogue snapshot contains duplicate identities."); }
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return fail("INVALID_SNAPSHOT", "Snapshots must contain finite JSON values.");
    const encoded = JSON.stringify(value);
    if (encoded === undefined) return fail("INVALID_SNAPSHOT", "Snapshots must contain JSON values only.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
}
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

export function calculateEstimate(rawRequest: unknown, rawCatalogue: unknown) {
  const parsedRequest = requestSchema.safeParse(rawRequest);
  const parsedCatalogue = catalogueSchema.safeParse(rawCatalogue);
  if (!parsedRequest.success) fail("INVALID_REQUEST", parsedRequest.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (!parsedCatalogue.success) fail("INVALID_CATALOGUE", parsedCatalogue.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  const request = parsedRequest.data!;
  const catalogue = parsedCatalogue.data!;
  for (const key of ["units", "items", "prices", "recipes", "labourRoles", "labourRates", "taxCodes", "taxRates", "options", "optionVersions"] as const) uniqueIds(catalogue[key]);
  if (Date.parse(catalogue.settings.effectiveFrom) > Date.parse(request.asOf)) fail("FUTURE_SETTINGS", "Company settings are not effective at the calculation date.");
  const warnings = new Set<string>();
  const assumptions = new Set<string>();
  let nodes = 0;
  const findItem = (id: string) => {
    const item = catalogue.items.find(i => i.id === id);
    if (!item || !item.active || item.archived || item.categoryArchived) return fail("UNAVAILABLE_ITEM", `Item ${id} is unavailable.`);
    return item;
  };
  const findUnit = (id: string) => {
    const unit = catalogue.units.find(u => u.id === id);
    if (!unit || unit.archived) return fail("UNAVAILABLE_UNIT", `Unit ${id} is unavailable.`);
    return unit;
  };
  const boundedQuantity = (n: Num, unit: Catalogue["units"][number]) => {
    if (!n.isFinite() || n.lte(0) || n.gt("999999999999")) return fail("INVALID_QUANTITY", "Calculated quantity must be positive and within the supported range.");
    const result = n.toDecimalPlaces(unit.quantityScale, D.ROUND_CEIL);
    if (!result.equals(n)) assumptions.add(`Quantity rounded up to ${unit.quantityScale} decimal places for ${unit.label}.`);
    return result;
  };
  function resolveQuantity(line: ItemLine) {
    const item = findItem(line.itemId); const unit = findUnit(item.unitId); const q = line.quantity;
    if (q.kind === "DEFAULT") { assumptions.add(`Standard quantity ${item.defaultQuantity} ${unit.label} assumed for ${item.name}.`); return boundedQuantity(new D(item.defaultQuantity), unit); }
    if (q.kind === "EXPLICIT") {
      const source = q.unitId ? findUnit(q.unitId) : unit;
      let result = new D(q.value);
      if (source.id !== unit.id) {
        if (source.dimensionKind !== unit.dimensionKind || ["COUNT", "CUSTOM"].includes(unit.dimensionKind) || !source.canonicalFactor || !unit.canonicalFactor) fail("INCOMPATIBLE_UNITS", "These units cannot be converted automatically.");
        result = result.times(source.canonicalFactor!).div(unit.canonicalFactor!);
      }
      return boundedQuantity(result, unit);
    }
    const expected = q.kind === "WALL" ? "AREA" : q.kind;
    if (unit.dimensionKind !== expected || !unit.canonicalFactor) fail("INCOMPATIBLE_DIMENSIONS", "Dimensions do not match this item's unit.");
    const factor = new D(q.lengthUnit === "mm" ? "0.001" : q.lengthUnit === "cm" ? "0.01" : "1");
    let result = new D(q.length).times(factor);
    if (q.kind === "AREA" || q.kind === "VOLUME") result = result.times(q.width).times(factor);
    if (q.kind === "VOLUME") result = result.times(q.depth).times(factor);
    if (q.kind === "WALL") result = result.times(q.height).times(factor).minus(q.openingsAreaM2);
    return boundedQuantity(result.div(unit.canonicalFactor!), unit);
  }

  function component(itemId: string, inputQuantity: Num, condition: ItemLine["condition"], supplyBy: ItemLine["supplyBy"], line: ItemLine, path: string[], usedOverrides: Set<string>, root: boolean): {
    costs: Buckets; personHours: Num; durationHours: Num; snapshot: Record<string, unknown>;
  } {
    if (++nodes > 5000 || path.length >= 20) return fail("EXPANSION_LIMIT", "Supporting-item expansion exceeds the safe calculation limit.");
    if (path.includes(itemId)) return fail("DEPENDENCY_CYCLE", "Supporting items form a circular dependency.");
    const item = findItem(itemId); const unit = findUnit(item.unitId);
    const price = latest(catalogue.prices.filter(p => p.itemId === itemId), request.asOf);
    if (!price) return fail("MISSING_PRICE", `No effective price for ${item.name}.`);
    if (price.confidence !== "VERIFIED") warnings.add(`Price for ${item.name} requires review (${price.confidence.toLowerCase()}).`);
    const recipe = latest(catalogue.recipes.filter(r => r.itemId === itemId && r.condition === condition && r.publishedAt !== null && Date.parse(r.publishedAt) <= Date.parse(request.asOf)), request.asOf);
    if (!recipe && price.labourUnitCost === null) return fail("MISSING_LABOUR_SPECIFICATION", `Set a labour price (including explicit zero) or publish a ${condition.toLowerCase()} specification for ${item.name}.`);
    if (recipe && (new Set(recipe.supporting.map(s => s.itemId)).size !== recipe.supporting.length || new Set(recipe.labour.map(l => l.roleId)).size !== recipe.labour.length)) fail("DUPLICATE_RECIPE_COMPONENT", "A recipe contains duplicate items or labour roles.");
    const q = boundedQuantity(recipe ? multiplyRule(inputQuantity, recipe.quantityRule) : inputQuantity, unit);
    const costs = zero();
    costs.material = supplyBy === "CONTRACTOR" ? new D(price.materialUnitCost).times(q) : new D(0);
    costs.plant = new D(price.plantUnitCost).times(q);
    costs.waste = new D(price.wasteUnitCost).times(q);
    costs[item.itemType === "PRELIMINARY" ? "preliminaries" : "other"] = new D(price.otherUnitCost).times(q);
    let personHours = new D(0), durationHours = new D(0), derivedLabour = new D(0);
    const labourSnapshots: Record<string, unknown>[] = [];
    for (const work of recipe?.labour ?? []) {
      const role = catalogue.labourRoles.find(r => r.id === work.roleId && !r.archived);
      const rate = latest(catalogue.labourRates.filter(r => r.roleId === work.roleId), request.asOf);
      if (!role) fail("MISSING_LABOUR_ROLE", `Labour role ${work.roleId} is unavailable.`);
      // An explicit item labour override still preserves effort, without requiring
      // a rate that will not be used in the monetary calculation.
      if (price.labourUnitCost === null && (!rate || (work.rateBasis === "DAILY" && rate.dailyCost === null))) fail("MISSING_LABOUR_RATE", `No applicable ${work.rateBasis.toLowerCase()} rate for ${role!.name}.`);
      const effort = new D(work.hoursPerUnit).times(q);
      const cost = price.labourUnitCost !== null ? new D(0) : work.rateBasis === "DAILY" ? effort.div(rate!.productiveHoursPerDay).times(rate!.dailyCost!) : effort.times(rate!.hourlyCost);
      personHours = personHours.plus(effort); durationHours = durationHours.plus(effort.div(work.teamSize)); derivedLabour = derivedLabour.plus(cost);
      labourSnapshots.push({ ...work, roleName: role!.name, rate: rate ?? null, personHours: hours(effort), durationHours: hours(effort.div(work.teamSize)), chargedFromRecipe: price.labourUnitCost === null, cost: money(cost) });
    }
    costs.labour = price.labourUnitCost === null ? derivedLabour : new D(price.labourUnitCost).times(q);
    if (!(recipe?.labour.length) && item.defaultDurationHours !== null) { durationHours = new D(item.defaultDurationHours).times(q); assumptions.add(`Duration for ${item.name} uses the catalogue allowance; person-hours are not specified.`); }
    if (!(recipe?.labour.length) && costs.labour.gt(0)) warnings.add(`Labour effort for ${item.name} requires review.`);
    const chosenOptions: Record<string, unknown>[] = [];
    const groups = new Set<string>();
    for (const optionId of root ? line.optionIds : []) {
      const option = catalogue.options.find(o => o.id === optionId && o.itemId === itemId && o.active && !o.archived);
      if (!option) fail("INVALID_OPTION", "Selected option does not belong to the item or is unavailable.");
      if (groups.has(option!.groupCode)) fail("CONFLICTING_OPTIONS", "Choose only one option in each option group.");
      groups.add(option!.groupCode);
      const version = latest(catalogue.optionVersions.filter(v => v.optionId === optionId), request.asOf);
      if (!version) fail("MISSING_OPTION_VERSION", "Selected option has no effective specification.");
      if (supplyBy === "CONTRACTOR") costs.material = costs.material.plus(new D(version!.rule.materialDelta).times(q));
      costs.labour = costs.labour.plus(new D(version!.rule.labourDelta).times(q));
      chosenOptions.push({ option: option!, version: version! });
    }
    const supportingSnapshots: Record<string, unknown>[] = [];
    for (const support of recipe?.supporting ?? []) {
      const override = line.supportingOverrides.find(s => s.itemId === support.itemId);
      if (override) usedOverrides.add(override.itemId);
      if (support.mandatory && override?.selected === false) fail("MANDATORY_SUPPORT", "A required supporting item cannot be excluded.");
      if (!(support.mandatory || (override?.selected ?? support.defaultSelected))) continue;
      const child = component(support.itemId, multiplyRule(q, support.quantityRule), override?.condition ?? condition, override?.supplyBy ?? "CONTRACTOR", line, [...path, itemId], usedOverrides, false);
      // Classify the child's direct material charge using the relationship.
      // Its labour and other charges retain their types and are added once.
      const bucket = ({ MATERIAL: "material", SUPPORTING_MATERIAL: "supportingMaterial", LABOUR: "labour", PLANT: "plant", WASTE: "waste", OTHER: "other" } as const)[support.costBucket];
      costs[bucket] = costs[bucket].plus(child.costs.material);
      costs.supportingMaterial = costs.supportingMaterial.plus(child.costs.supportingMaterial);
      for (const key of costKeys.filter(k => k !== "material" && k !== "supportingMaterial")) costs[key] = costs[key].plus(child.costs[key]);
      personHours = personHours.plus(child.personHours); durationHours = durationHours.plus(child.durationHours);
      supportingSnapshots.push({ relationship: support, ...child.snapshot });
    }
    for (const assumption of recipe?.assumptions ?? []) assumptions.add(assumption);
    return { costs, personHours, durationHours, snapshot: { item: { ...item }, unit: { ...unit }, quantity: q.toFixed(unit.quantityScale), supplyBy, condition, price: { ...price }, recipeId: recipe?.id ?? null,
      recipe: recipe ?? null, labour: labourSnapshots, options: chosenOptions, supporting: supportingSnapshots, costs: costStrings(costs), personHours: hours(personHours), durationHours: hours(durationHours) } };
  }

  const lines = request.lines.map(line => {
    if (line.type === "UNPRICED") { warnings.add(`Unpriced requirement: ${line.description}`); return { key: line.key, type: line.type, description: line.description, reason: line.reason, priced: false as const }; }
    if (line.inclusion === "EXCLUDED") return { key: line.key, type: line.type, description: line.type === "ITEM" ? catalogue.items.find(i => i.id === line.itemId)?.name ?? line.itemId : line.description, reason: "Excluded from scope", priced: false as const, excluded: true };
    let costs: Buckets, personHours = new D(0), durationHours = new D(0), source: Record<string, unknown>, taxCodeId: string | null | undefined, description: string, qty: string, unitLabel: string;
    if (line.type === "ITEM") {
      const used = new Set<string>();
      const item = findItem(line.itemId);
      const result = component(line.itemId, resolveQuantity(line), line.condition, line.supplyBy, line, [], used, true);
      if (line.supportingOverrides.some(s => !used.has(s.itemId))) fail("UNKNOWN_SUPPORT_OVERRIDE", "A supporting-item override does not apply to the selected specification.");
      costs = result.costs; personHours = result.personHours; durationHours = result.durationHours; source = result.snapshot;
      taxCodeId = line.taxCodeId ?? (source.price as Catalogue["prices"][number]).taxCodeId;
      description = item.name; qty = String(source.quantity); unitLabel = findUnit(item.unitId).label;
    } else {
      costs = Object.fromEntries(costKeys.map(k => [k, new D(line.unitCosts[k]).times(line.quantity)])) as Buckets;
      source = { description: line.description, unitCosts: line.unitCosts, reason: line.reason }; taxCodeId = line.taxCodeId; description = line.description; qty = line.quantity; unitLabel = line.unitLabel;
      if (line.type !== "MANUAL") warnings.add(`${line.type === "PROVISIONAL" ? "Provisional sum" : "Allowance"}: ${line.description} requires review.`);
      if (costs.labour.gt(0)) warnings.add(`Labour effort for ${line.description} is not specified.`);
    }
    const taxCode = catalogue.taxCodes.find(t => t.id === taxCodeId && t.active && !t.archived);
    const tax = latest(catalogue.taxRates.filter(t => t.taxCodeId === taxCodeId), request.asOf);
    if (!taxCode || !tax) fail("MISSING_TAX", `Assign an effective VAT treatment for ${description}; zero VAT is never assumed.`);
    // Waste percentage applies only to contractor material costs. Supporting
    // materials are included once, while fixed waste remains separately visible.
    const wasteAllowance = costs.material.plus(costs.supportingMaterial).times(catalogue.settings.wastePercent).div(100);
    costs.waste = costs.waste.plus(wasteAllowance);
    const roundedCosts = Object.fromEntries(costKeys.map(k => [k, new D(money(costs[k]))])) as Buckets;
    const subtotal = total(roundedCosts);
    const contingency = new D(money(subtotal.times(catalogue.settings.contingencyPercent).div(100)));
    const markup = new D(money(subtotal.plus(contingency).times(line.markupPercent ?? catalogue.settings.markupPercent).div(100)));
    const selling = subtotal.plus(contingency).plus(markup);
    const discount = new D(money(selling.times(line.discountPercent).div(100)));
    const net = selling.minus(discount);
    const vat = new D(money(net.times(tax!.rate).div(100)));
    return { key: line.key, type: line.type, description, priced: true as const, inclusion: line.inclusion, includedInTotal: line.inclusion !== "OPTIONAL" || line.selected,
      room: line.room ?? null, stage: line.stage ?? null, quantity: qty, unit: unitLabel, source,
      costs: costStrings(roundedCosts), costSubtotal: money(subtotal), wasteAllowance: money(wasteAllowance), contingency: money(contingency), markup: money(markup), discount: money(discount),
      markupPercent: line.markupPercent ?? catalogue.settings.markupPercent, discountPercent: line.discountPercent,
      tax: { ...tax!, label: taxCode!.label }, net: money(net), vat: money(vat), gross: money(net.plus(vat)), personHours: hours(personHours), sequentialDurationHours: hours(durationHours) };
  });
  function totals(included: boolean) {
    const selected = lines.filter(l => l.priced && l.includedInTotal === included);
    const sum = (key: "costSubtotal" | "contingency" | "markup" | "discount" | "net" | "vat" | "gross" | "personHours" | "sequentialDurationHours") => selected.reduce((acc, line) => acc.plus(line.priced ? line[key] : "0"), new D(0));
    return { costs: Object.fromEntries(costKeys.map(k => [k, money(selected.reduce((acc, l) => acc.plus(l.priced ? l.costs[k] : "0"), new D(0)))])) as Costs,
      costSubtotal: money(sum("costSubtotal")), contingency: money(sum("contingency")), markup: money(sum("markup")), discount: money(sum("discount")), net: money(sum("net")), vat: money(sum("vat")), gross: money(sum("gross")), personHours: hours(sum("personHours")), sequentialDurationHours: hours(sum("sequentialDurationHours")) };
  }
  request.specialRequests.forEach(s => warnings.add(`Unpriced special request: ${s}`));
  const result = { engineVersion: ENGINE_VERSION, currency: "GBP" as const, asOf: request.asOf, settings: catalogue.settings,
    inputSnapshot: request, catalogueSnapshot: catalogue, lines, totals: totals(true), optionalTotals: totals(false),
    hasUnpricedRequirements: request.specialRequests.length > 0 || request.lines.some(l => l.type === "UNPRICED"),
    requiresReview: warnings.size > 0, warnings: [...warnings], assumptions: [...assumptions],
    scheduleNote: "Labour effort and sequential task allowances only; project dates require dependency and team scheduling.",
  };
  const snapshotHash = createHash("sha256").update(canonicalJson(result)).digest("hex");
  return freeze({ ...result, snapshotHash });
}

export type EstimateResult = ReturnType<typeof calculateEstimate>;
// Explicit projection: never send the internal result or catalogue snapshot to a client.
export function customerEstimate(result: EstimateResult) {
  return {
    currency: result.currency, asOf: result.asOf, indicative: true, requiresReview: result.requiresReview,
    hasUnpricedRequirements: result.hasUnpricedRequirements,
    lines: result.lines.map(line => line.priced ? { key: line.key, description: line.description, type: line.type, inclusion: line.inclusion,
      includedInTotal: line.includedInTotal, room: line.room, stage: line.stage, quantity: line.quantity, unit: line.unit,
      net: line.net, vatRate: line.tax.rate, vat: line.vat, gross: line.gross } : { key: line.key, description: line.description, priced: false, reason: line.reason }),
    totals: { net: result.totals.net, vat: result.totals.vat, gross: result.totals.gross },
    optionalTotals: { net: result.optionalTotals.net, vat: result.optionalTotals.vat, gross: result.optionalTotals.gross },
    // A visibility setting changes disclosure only, never the financial result.
    ...(result.inputSnapshot.showContingency ? { contingencyIncluded: new D(result.totals.contingency).gt(0) } : {}),
    assumptions: [...result.assumptions],
  };
}
