import "server-only";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { batchSchema } from "./schema";
import { canonicalJson } from "@/app/lib/pricing/engine";
export class MaterialPriceError extends Error {}
export async function importMaterialPrices(db: PrismaClient, raw: unknown, actor: string, now = new Date()) {
  const { observations } = batchSchema.parse(raw);
  for (const row of observations) {
    const age = now.getTime() - Date.parse(row.observedAt);
    if (age < 0 || age > 8 * 86400000) throw new MaterialPriceError("Import observations dated within the last eight days.");
  }
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('material-price-import'))`;
    let inserted = 0, duplicates = 0;
    for (const row of observations) {
      const item = await tx.constructionItem.findFirst({ where: { id: row.itemId, active: true, archivedAt: null }, include: { unit: true } });
      if (!item || item.itemType !== "MATERIAL" || item.unit.archivedAt || item.unit.code !== row.unitCode) throw new MaterialPriceError("Map each supplier product to an active material with the same base unit.");
      const normalized = { ...row, observedAt: new Date(row.observedAt).toISOString(), packPrice: new Prisma.Decimal(row.packPrice).toFixed(4), packQuantity: new Prisma.Decimal(row.packQuantity).toFixed(6) };
      const observationKey = createHash("sha256").update(canonicalJson({ supplier: row.supplier, sku: row.sku, itemId: row.itemId, location: row.location, priceBasis: row.priceBasis, minimumPacks: row.minimumPacks, sourceReference: row.sourceReference })).digest("hex");
      const previous = await tx.actualMaterialValue.findUnique({ where: { observationKey } });
      if (previous) {
        const equal = previous.sourceUrl === row.sourceUrl && previous.packPrice.equals(row.packPrice) && previous.packQuantity.equals(row.packQuantity) && previous.unitCode === row.unitCode && previous.taxInclusive === row.taxInclusive && previous.observedAt.toISOString() === normalized.observedAt;
        if (!equal) throw new MaterialPriceError("A source observation already exists with different values. Provide a new source reference for a correction.");
        duplicates++; continue;
      }
      const unitPrice = new Prisma.Decimal(row.packPrice).div(row.packQuantity).toDecimalPlaces(6);
      if (unitPrice.lte(0) || unitPrice.gte('10000000000000')) throw new MaterialPriceError("The normalized unit price is outside the supported range.");
      await tx.actualMaterialValue.create({ data: { ...normalized, observationKey, unitPrice, importedBy: actor } }); inserted++;
    }
    return { inserted, duplicates };
  }, { timeout: 30000 });
}
