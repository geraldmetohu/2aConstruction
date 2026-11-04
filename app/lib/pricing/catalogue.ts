import "server-only";
import { Prisma } from "@prisma/client";
import { catalogueSchema } from "./schema";

// Caller supplies a consistent transaction. This adapter issues SELECTs only.
export async function loadPricingCatalogue(tx: Prisma.TransactionClient, asOf: Date) {
  const settings = await tx.companySettingsVersion.findFirst({ where: { settingsId: "company", effectiveFrom: { lte: asOf } }, orderBy: { effectiveFrom: "desc" } });
  if (!settings) throw new Error("Approved company settings are required.");
  const [units, items, roles, taxes, options, recipes] = await Promise.all([
    tx.itemUnit.findMany({ take: 5001 }),
    tx.constructionItem.findMany({ take: 5001, include: { category: true, prices: { where: { effectiveFrom: { lte: asOf } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }),
    tx.labourRole.findMany({ take: 5001, include: { rates: { where: { effectiveFrom: { lte: asOf } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }),
    tx.taxCode.findMany({ take: 5001, include: { rates: { where: { effectiveFrom: { lte: asOf } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }),
    tx.itemOption.findMany({ take: 10001, include: { versions: { where: { effectiveFrom: { lte: asOf } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }),
    tx.itemRecipeVersion.findMany({ where: { effectiveFrom: { lte: asOf }, publishedAt: { lte: asOf } }, orderBy: { effectiveFrom: "desc" }, distinct: ["itemId", "condition"], take: 10001, include: { supportingItems: true, labour: true } }),
  ]);
  const catalogue = catalogueSchema.parse({
    settings: { id: settings.id, effectiveFrom: settings.effectiveFrom.toISOString(), currency: settings.currency, markupPercent: settings.defaultMarkupPercent.toString(), wastePercent: settings.defaultWastePercent.toString(), contingencyPercent: settings.contingencyPercent.toString(), roundingPolicyVersion: settings.roundingPolicyVersion },
    units: units.map(u => ({ id: u.id, code: u.code, label: u.label, dimensionKind: u.dimensionKind, canonicalFactor: u.canonicalFactor?.toString() ?? null, quantityScale: u.quantityScale, archived: !!u.archivedAt })),
    items: items.map(i => ({ id: i.id, code: i.code, name: i.name, description: i.description, unitId: i.unitId, itemType: i.itemType, fixStage: i.fixStage, active: i.active, archived: !!i.archivedAt, categoryArchived: !!i.category.archivedAt, defaultQuantity: i.defaultQuantity.toString(), defaultDurationHours: i.defaultDurationHours?.toString() ?? null })),
    prices: items.flatMap(i => i.prices.map(p => ({ id: p.id, itemId: p.itemId, effectiveFrom: p.effectiveFrom.toISOString(), currency: p.currency, versionNumber: p.versionNumber, materialUnitCost: p.materialUnitCost.toString(), labourUnitCost: p.labourUnitCost?.toString() ?? null, plantUnitCost: p.plantUnitCost.toString(), wasteUnitCost: p.wasteUnitCost.toString(), otherUnitCost: p.otherUnitCost.toString(), taxCodeId: p.taxCodeId, source: p.source, confidence: p.confidence }))),
    labourRoles: roles.map(r => ({ id: r.id, name: r.name, archived: !!r.archivedAt })),
    labourRates: roles.flatMap(r => r.rates.map(v => ({ id: v.id, roleId: v.labourRoleId, effectiveFrom: v.effectiveFrom.toISOString(), currency: v.currency, hourlyCost: v.hourlyCost.toString(), dailyCost: v.dailyCost?.toString() ?? null, productiveHoursPerDay: v.productiveHoursPerDay.toString() }))),
    taxCodes: taxes.map(t => ({ id: t.id, label: t.label, active: t.active, archived: !!t.archivedAt })),
    taxRates: taxes.flatMap(t => t.rates.map(v => ({ id: v.id, taxCodeId: v.taxCodeId, effectiveFrom: v.effectiveFrom.toISOString(), rate: v.rate.toString() }))),
    options: options.map(o => ({ id: o.id, itemId: o.itemId, groupCode: o.groupCode, label: o.label, active: o.active, archived: !!o.archivedAt })),
    optionVersions: options.flatMap(o => o.versions.map(v => ({ id: v.id, optionId: v.optionId, effectiveFrom: v.effectiveFrom.toISOString(), ruleSchemaVersion: v.ruleSchemaVersion, rule: v.rule, specification: v.specification }))),
    recipes: recipes.map(r => ({ id: r.id, itemId: r.itemId, effectiveFrom: r.effectiveFrom.toISOString(), publishedAt: r.publishedAt?.toISOString() ?? null, condition: r.condition, ruleSchemaVersion: r.ruleSchemaVersion, quantityRule: r.quantityRule, assumptions: r.assumptions,
      supporting: r.supportingItems.map(s => ({ itemId: s.supportingItemId, ruleSchemaVersion: s.ruleSchemaVersion, quantityRule: s.quantityRule, mandatory: s.mandatory, defaultSelected: s.defaultSelected, costBucket: s.costBucket })),
      labour: r.labour.map(l => ({ roleId: l.labourRoleId, hoursPerUnit: l.hoursPerUnit.toString(), teamSize: l.teamSize, rateBasis: l.rateBasis })),
    })),
  });
  // The advertised £50 is the complete charge. Tax treatment must be approved.
  const feeTax = catalogue.taxCodes.find(t => t.id === settings.estimatorFeeTaxCodeId && t.active && !t.archived);
  const feeRate = catalogue.taxRates.find(t => t.taxCodeId === feeTax?.id);
  if (!settings.estimatorFeeAmount.equals(50) || settings.estimatorFeeInclusive !== true || !feeRate) throw new Error("Configure the £50 inclusive estimator fee and its approved VAT treatment before enabling checkout.");
  return { catalogue, fee: { grossPence: 5000, currency: "gbp", taxCodeId: feeTax!.id, taxRateVersionId: feeRate.id, rate: feeRate.rate, inclusive: true } };
}
