import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as v from "./validation";
import { CatalogueError } from "./access";

type Tx = Prisma.TransactionClient;
const stale = () => new CatalogueError("This entry changed since you opened it. Reload before saving again.");
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function audit(tx: Tx, actor: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await tx.auditEvent.create({ data: { actorUserId: actor, actorKind: "ADMIN", action, entityType, entityId,
    before: before == null ? Prisma.DbNull : snapshot(before), after: after == null ? Prisma.DbNull : snapshot(after) } });
}

// All writers use Serializable + an expected master revision. Failed transactions
// are rolled back, including audit events; the caller must reload after conflicts.
export function catalogueService(db: PrismaClient) {
  const transaction = <T>(work: (tx: Tx) => Promise<T>) => db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  async function claimItem(tx: Tx, id: string, revision: number, allowArchived = false) {
    const before = await tx.constructionItem.findUnique({ where: { id } });
    if (!before || before.revision !== revision) throw stale();
    if (before.archivedAt && !allowArchived) throw new CatalogueError("Restore this item before editing it.");
    const result = await tx.constructionItem.updateMany({ where: { id, revision }, data: { revision: { increment: 1 } } });
    if (result.count !== 1) throw stale();
    return before;
  }
  async function validClassification(tx: Tx, categoryId: string, unitId: string) {
    const category = await tx.itemCategory.findUnique({ where: { id: categoryId } });
    const unit = await tx.itemUnit.findUnique({ where: { id: unitId } });
    if (!category || category.archivedAt || !unit || unit.archivedAt) throw new CatalogueError("Choose an available category and unit.");
  }
  async function validTax(tx: Tx, taxCodeId: string) {
    if (!taxCodeId) return;
    const tax = await tx.taxCode.findUnique({ where: { id: taxCodeId } });
    if (!tax || tax.archivedAt || !tax.active) throw new CatalogueError("Choose an available VAT code.");
  }
  async function validRecipeParts(tx: Tx, data: z.output<typeof v.recipeSchema>) {
    const items = await tx.constructionItem.findMany({ where: { id: { in: data.supporting.map(s => s.itemId) }, active: true, archivedAt: null } });
    const roles = await tx.labourRole.findMany({ where: { id: { in: data.labour.map(l => l.roleId) }, archivedAt: null } });
    if (items.length !== data.supporting.length || roles.length !== data.labour.length) throw new CatalogueError("A supporting item or labour role is unavailable. Refresh your selection.");
    for (const entry of data.labour.filter(l => l.rateBasis === "DAILY")) {
      const rate = await tx.labourRateVersion.findFirst({ where: { labourRoleId: entry.roleId, effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: "desc" } });
      if (!rate || rate.dailyCost === null) throw new CatalogueError("Add a current daily rate before selecting daily labour.");
    }
  }
  return {
    saveItem(actor: string, data: z.output<typeof v.itemSchema>) {
      return transaction(async tx => {
        const before = data.id ? await claimItem(tx, data.id, Number(data.revision)) : null;
        await validClassification(tx, data.categoryId, data.unitId);
        const defaultDimensions = Object.fromEntries(v.dimensions.filter(k => data[k] !== "").map(k => [k, data[k]]));
        const fields = { code: data.code, name: data.name, description: data.description, categoryId: data.categoryId, unitId: data.unitId,
          itemType: data.itemType, itemRole: data.itemRole, fixStage: data.fixStage, defaultQuantity: data.defaultQuantity,
          defaultDurationHours: data.defaultDurationHours || null, defaultDimensions, active: data.active };
        const item = data.id ? await tx.constructionItem.update({ where: { id: data.id }, data: fields }) : await tx.constructionItem.create({ data: fields });
        await audit(tx, actor, before ? "ITEM_UPDATED" : "ITEM_CREATED", "ConstructionItem", item.id, before, item);
        return item.id;
      });
    },
    status(actor: string, data: z.output<typeof v.statusSchema>) {
      return transaction(async tx => {
        const before = await claimItem(tx, data.itemId, data.revision, true);
        if (before.archivedAt && !["restore", "archive"].includes(data.state)) throw new CatalogueError("Restore this item first.");
        if (data.state === "restore" || data.state === "activate") await validClassification(tx, before.categoryId, before.unitId);
        const fields = data.state === "archive" ? { archivedAt: new Date(), active: false } : data.state === "restore" ? { archivedAt: null, active: false } : { active: data.state === "activate" };
        const after = await tx.constructionItem.update({ where: { id: data.itemId }, data: fields });
        await audit(tx, actor, `ITEM_${data.state.toUpperCase()}`, "ConstructionItem", after.id, before, after);
        return after.id;
      });
    },
    price(actor: string, data: z.output<typeof v.priceSchema>) {
      return transaction(async tx => {
        await claimItem(tx, data.itemId, data.revision);
        await validTax(tx, data.taxCodeId);
        const latest = await tx.itemPriceVersion.aggregate({ where: { itemId: data.itemId }, _max: { versionNumber: true } });
        const price = await tx.itemPriceVersion.create({ data: { itemId: data.itemId, versionNumber: (latest._max.versionNumber ?? 0) + 1,
          materialUnitCost: data.materialUnitCost, labourUnitCost: data.labourUnitCost || null, plantUnitCost: data.plantUnitCost,
          wasteUnitCost: data.wasteUnitCost, otherUnitCost: data.otherUnitCost, currency: "GBP", taxCodeId: data.taxCodeId || null,
          effectiveFrom: data.effectiveFrom, source: data.source, sourceDate: data.sourceDate || null, confidence: data.confidence, notes: data.notes || null } });
        await audit(tx, actor, "PRICE_VERSION_ADDED", "ItemPriceVersion", price.id, null, price);
        return data.itemId;
      });
    },
    recipe(actor: string, data: z.output<typeof v.recipeSchema>) {
      return transaction(async tx => {
        await claimItem(tx, data.itemId, data.revision);
        await validRecipeParts(tx, data);
        const latest = await tx.itemRecipeVersion.aggregate({ where: { itemId: data.itemId, condition: data.condition }, _max: { versionNumber: true } });
        const recipe = await tx.itemRecipeVersion.create({ data: { itemId: data.itemId, condition: data.condition, versionNumber: (latest._max.versionNumber ?? 0) + 1,
          effectiveFrom: new Date(), quantityRule: { kind: "per_unit", value: "1" }, assumptions: data.assumptions.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
          supportingItems: { create: data.supporting.map(s => ({ supportingItemId: s.itemId, quantityRule: { kind: "per_unit", value: s.quantity }, mandatory: s.mandatory, defaultSelected: s.defaultSelected })) },
          labour: { create: data.labour.map(l => ({ labourRoleId: l.roleId, hoursPerUnit: l.hours, teamSize: l.teamSize, rateBasis: l.rateBasis })) } },
          include: { supportingItems: true, labour: true } });
        // Publish only after all children exist; the migration then freezes them.
        const published = await tx.itemRecipeVersion.update({ where: { id: recipe.id }, data: { publishedAt: new Date() } });
        await audit(tx, actor, "RECIPE_PUBLISHED", "ItemRecipeVersion", recipe.id, null, { ...recipe, publishedAt: published.publishedAt });
        return data.itemId;
      });
    },
    option(actor: string, data: z.output<typeof v.optionSchema>) {
      return transaction(async tx => {
        await claimItem(tx, data.itemId, data.revision);
        const before = data.optionId ? await tx.itemOption.findUnique({ where: { id: data.optionId } }) : null;
        if (data.optionId && (!before || before.itemId !== data.itemId || before.archivedAt)) throw new CatalogueError("Option not found for this item.");
        const fields = { groupCode: data.groupCode, code: data.code, label: data.label };
        const option = before ? await tx.itemOption.update({ where: { id: before.id }, data: { ...fields, revision: { increment: 1 } } }) : await tx.itemOption.create({ data: { ...fields, itemId: data.itemId } });
        const latest = await tx.itemOptionVersion.aggregate({ where: { optionId: option.id }, _max: { versionNumber: true } });
        const version = await tx.itemOptionVersion.create({ data: { optionId: option.id, versionNumber: (latest._max.versionNumber ?? 0) + 1,
          effectiveFrom: new Date(), rule: { kind: "surcharge", materialDelta: data.materialDelta, labourDelta: data.labourDelta },
          specification: { groupCode: option.groupCode, code: option.code, label: option.label, description: data.specification } } });
        await audit(tx, actor, "OPTION_VERSION_ADDED", "ItemOption", option.id, before, { ...option, version });
        return data.itemId;
      });
    },
    optionStatus(actor: string, data: z.output<typeof v.optionStatusSchema>) {
      return transaction(async tx => {
        await claimItem(tx, data.itemId, data.revision);
        const before = await tx.itemOption.findUnique({ where: { id: data.optionId } });
        if (!before || before.itemId !== data.itemId) throw new CatalogueError("Option not found for this item.");
        const after = await tx.itemOption.update({ where: { id: before.id }, data: { active: data.active, revision: { increment: 1 } } });
        await audit(tx, actor, "OPTION_AVAILABILITY_CHANGED", "ItemOption", after.id, before, after);
        return data.itemId;
      });
    },
    reference(actor: string, data: z.output<typeof v.referenceSchema>) {
      return transaction(async tx => {
        await claimItem(tx, data.itemId, data.revision);
        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        const unit = await tx.itemUnit.findUnique({ where: { id: data.unitId } });
        if (!supplier || supplier.archivedAt || !unit || unit.archivedAt) throw new CatalogueError("Choose an available supplier and unit.");
        if (data.checkedAt > new Date()) throw new CatalogueError("A supplier check cannot be dated in the future.");
        const ref = await tx.supplierPriceReference.create({ data: { itemId: data.itemId, supplierId: data.supplierId, unitId: data.unitId,
          supplierCode: data.supplierCode || null, sourceUrl: data.sourceUrl || null, referencePrice: data.referencePrice, currency: "GBP",
          packQuantity: data.packQuantity || null, taxInclusive: data.taxInclusive, checkedAt: data.checkedAt, notes: data.notes || null } });
        await audit(tx, actor, "SUPPLIER_REFERENCE_ADDED", "SupplierPriceReference", ref.id, null, ref);
        return data.itemId;
      });
    },
    duplicate(actor: string, data: z.output<typeof v.duplicateSchema>) {
      return transaction(async tx => {
        const source = await claimItem(tx, data.itemId, data.revision, true);
        await validClassification(tx, source.categoryId, source.unitId);
        const now = new Date();
        const item = await tx.constructionItem.create({ data: { code: data.code, name: data.name, description: source.description, categoryId: source.categoryId,
          unitId: source.unitId, itemType: source.itemType, itemRole: source.itemRole, fixStage: source.fixStage, defaultQuantity: source.defaultQuantity,
          defaultDurationHours: source.defaultDurationHours, defaultDimensions: source.defaultDimensions ?? Prisma.DbNull, active: false } });
        const price = await tx.itemPriceVersion.findFirst({ where: { itemId: source.id, effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
        if (price) {
          await validTax(tx, price.taxCodeId ?? "");
          await tx.itemPriceVersion.create({ data: { itemId: item.id, versionNumber: 1, effectiveFrom: now,
            materialUnitCost: price.materialUnitCost, labourUnitCost: price.labourUnitCost, plantUnitCost: price.plantUnitCost,
            wasteUnitCost: price.wasteUnitCost, otherUnitCost: price.otherUnitCost, currency: price.currency, taxCodeId: price.taxCodeId,
            sourceDate: price.sourceDate, confidence: price.confidence, notes: price.notes,
            source: `Copied from ${source.code}: ${price.source}`.slice(0, 500) } });
        }
        for (const condition of v.conditions) {
          const recipe = await tx.itemRecipeVersion.findFirst({ where: { itemId: source.id, condition, publishedAt: { not: null }, effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" }, include: { supportingItems: true, labour: true } });
          if (!recipe) continue;
          const copy = await tx.itemRecipeVersion.create({ data: { itemId: item.id, versionNumber: 1, condition, effectiveFrom: now,
            ruleSchemaVersion: recipe.ruleSchemaVersion, quantityRule: recipe.quantityRule as Prisma.InputJsonValue, assumptions: recipe.assumptions as Prisma.InputJsonValue,
            supportingItems: { create: recipe.supportingItems.map(s => ({ supportingItemId: s.supportingItemId, ruleSchemaVersion: s.ruleSchemaVersion, quantityRule: s.quantityRule as Prisma.InputJsonValue, mandatory: s.mandatory, defaultSelected: s.defaultSelected, costBucket: s.costBucket })) },
            labour: { create: recipe.labour.map(l => ({ labourRoleId: l.labourRoleId, hoursPerUnit: l.hoursPerUnit, teamSize: l.teamSize, rateBasis: l.rateBasis })) } } });
          await tx.itemRecipeVersion.update({ where: { id: copy.id }, data: { publishedAt: now } });
        }
        const options = await tx.itemOption.findMany({ where: { itemId: source.id, active: true, archivedAt: null }, include: { versions: { where: { effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } });
        for (const option of options) {
          const version = option.versions[0];
          await tx.itemOption.create({ data: { itemId: item.id, groupCode: option.groupCode, code: option.code, label: option.label, sortOrder: option.sortOrder,
            versions: version ? { create: { versionNumber: 1, effectiveFrom: now, ruleSchemaVersion: version.ruleSchemaVersion, rule: version.rule as Prisma.InputJsonValue, specification: version.specification as Prisma.InputJsonValue, sourcePriceVersionId: version.sourcePriceVersionId } } : undefined } });
        }
        await audit(tx, actor, "ITEM_DUPLICATED", "ConstructionItem", item.id, { sourceItemId: source.id }, { item, sourcePriceVersionId: price?.id ?? null });
        return item.id;
      });
    },
    lookup(actor: string, data: z.output<typeof v.lookupSchema>) {
      return transaction(async tx => {
        if (data.kind === "category" && data.parentId) {
          const parent = await tx.itemCategory.findUnique({ where: { id: data.parentId } });
          if (!parent || parent.archivedAt || parent.id === data.id) throw new CatalogueError("Choose another available parent category.");
        }
        const common = { code: data.code, name: data.name };
        const where = { id: data.id, revision: Number(data.revision), archivedAt: null };
        // Explicit delegates ensure these writes can never target a legacy table.
        if (data.kind === "category") {
          const fields = { ...common, parentId: data.parentId || null };
          return saveLookup(tx, actor, "ItemCategory", data.id,
            () => tx.itemCategory.findUnique({ where: { id: data.id } }),
            () => tx.itemCategory.create({ data: fields }),
            () => tx.itemCategory.updateMany({ where, data: { ...fields, revision: { increment: 1 } } }));
        }
        if (data.kind === "unit") {
          const fields = { code: data.code, label: data.name, dimensionKind: data.dimensionKind, canonicalFactor: data.canonicalFactor || null, quantityScale: data.quantityScale };
          // Unit semantics are historical: create another unit to change its basis.
          const old = data.id ? await tx.itemUnit.findUnique({ where: { id: data.id } }) : null;
          if (old && (old.dimensionKind !== data.dimensionKind || (old.canonicalFactor?.toString() ?? "") !== (data.canonicalFactor ? new Prisma.Decimal(data.canonicalFactor).toString() : "") || old.quantityScale !== data.quantityScale)) throw new CatalogueError("Create a new unit to change its measurement basis or precision.");
          return saveLookup(tx, actor, "ItemUnit", data.id, () => tx.itemUnit.findUnique({ where: { id: data.id } }), () => tx.itemUnit.create({ data: fields }), () => tx.itemUnit.updateMany({ where, data: { ...fields, revision: { increment: 1 } } }));
        }
        if (data.kind === "labour") return saveLookup(tx, actor, "LabourRole", data.id, () => tx.labourRole.findUnique({ where: { id: data.id } }), () => tx.labourRole.create({ data: common }), () => tx.labourRole.updateMany({ where, data: { ...common, revision: { increment: 1 } } }));
        if (data.kind === "supplier") {
          const fields = { ...common, email: data.email || null, phone: data.phone || null, website: data.website || null };
          return saveLookup(tx, actor, "Supplier", data.id, () => tx.supplier.findUnique({ where: { id: data.id } }), () => tx.supplier.create({ data: fields }), () => tx.supplier.updateMany({ where, data: { ...fields, revision: { increment: 1 } } }));
        }
        const fields = { code: data.code, label: data.name };
        return saveLookup(tx, actor, "TaxCode", data.id, () => tx.taxCode.findUnique({ where: { id: data.id } }), () => tx.taxCode.create({ data: fields }), () => tx.taxCode.updateMany({ where, data: { ...fields, revision: { increment: 1 } } }));
      });
    },
    lookupStatus(actor: string, data: z.output<typeof v.lookupStatusSchema>) {
      return transaction(async tx => {
        const where = { id: data.id, revision: data.revision };
        const fields = { archivedAt: data.archive ? new Date() : null, revision: { increment: 1 } };
        const read = () => data.kind === "category" ? tx.itemCategory.findUnique({ where: { id: data.id } }) : data.kind === "unit" ? tx.itemUnit.findUnique({ where: { id: data.id } }) : data.kind === "labour" ? tx.labourRole.findUnique({ where: { id: data.id } }) : data.kind === "supplier" ? tx.supplier.findUnique({ where: { id: data.id } }) : tx.taxCode.findUnique({ where: { id: data.id } });
        const before = await read();
        if (!before || before.revision !== data.revision) throw stale();
        const result = data.kind === "category" ? await tx.itemCategory.updateMany({ where, data: fields }) : data.kind === "unit" ? await tx.itemUnit.updateMany({ where, data: fields }) : data.kind === "labour" ? await tx.labourRole.updateMany({ where, data: fields }) : data.kind === "supplier" ? await tx.supplier.updateMany({ where, data: fields }) : await tx.taxCode.updateMany({ where, data: { ...fields, active: !data.archive } });
        if (result.count !== 1) throw stale();
        await audit(tx, actor, data.archive ? "LOOKUP_ARCHIVED" : "LOOKUP_RESTORED", data.kind, data.id, before, await read());
        return data.id;
      });
    },
    rate(actor: string, data: z.output<typeof v.rateSchema>) {
      return transaction(async tx => {
        const where = { id: data.id, revision: data.revision, archivedAt: null };
        const claimed = data.kind === "tax" ? await tx.taxCode.updateMany({ where, data: { revision: { increment: 1 } } }) : await tx.labourRole.updateMany({ where, data: { revision: { increment: 1 } } });
        if (claimed.count !== 1) throw stale();
        if (data.kind === "tax") {
          const rate = await tx.taxRateVersion.create({ data: { taxCodeId: data.id, rate: data.rate, effectiveFrom: data.effectiveFrom, reason: data.source } });
          await audit(tx, actor, "TAX_RATE_ADDED", "TaxRateVersion", rate.id, null, rate);
        } else {
          const last = await tx.labourRateVersion.aggregate({ where: { labourRoleId: data.id }, _max: { versionNumber: true } });
          const rate = await tx.labourRateVersion.create({ data: { labourRoleId: data.id, versionNumber: (last._max.versionNumber ?? 0) + 1, hourlyCost: data.hourlyCost,
            dailyCost: data.dailyCost || null, productiveHoursPerDay: data.productiveHoursPerDay, defaultTeamSize: data.defaultTeamSize, currency: "GBP", effectiveFrom: data.effectiveFrom, source: data.source } });
          await audit(tx, actor, "LABOUR_RATE_ADDED", "LabourRateVersion", rate.id, null, rate);
        }
        return data.id;
      });
    },
  };
}

async function saveLookup<T extends { id: string; archivedAt: Date | null }>(tx: Tx, actor: string, type: string, id: string,
  read: () => Promise<T | null>, create: () => Promise<T>, update: () => Promise<{ count: number }>) {
  const before = id ? await read() : null;
  if (id && (!before || before.archivedAt)) throw new CatalogueError("Restore this entry before editing it.");
  let after: T;
  if (id) {
    if ((await update()).count !== 1) throw stale();
    after = (await read())!;
  } else after = await create();
  await audit(tx, actor, id ? "LOOKUP_UPDATED" : "LOOKUP_CREATED", type, after.id, before, after);
  return after.id;
}
