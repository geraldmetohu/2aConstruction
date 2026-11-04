import { prisma } from "@/app/lib/db";
import { authorizeMaterialPrices } from "@/app/lib/material-prices/access";
import { collectPublicPrice, mappingsSchema } from "@/app/lib/material-prices/collector";
import { importMaterialPrices } from "@/app/lib/material-prices/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  let actor: string; try { actor = await authorizeMaterialPrices(request); } catch { return Response.json({ error: "Unavailable or unauthorized" }, { status: 403 }); }
  let raw: unknown; try { raw = JSON.parse(process.env.MATERIAL_PRICE_PRODUCTS_JSON ?? "[]"); } catch { return Response.json({ error: "Invalid supplier mapping configuration" }, { status: 503 }); }
  const mappings = mappingsSchema.safeParse(raw);
  if (!mappings.success || !mappings.data.length) return Response.json({ error: "Configure reviewed supplier product mappings before refreshing" }, { status: 503 });
  const now = new Date(), monday = new Date(now); monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const results = [];
  for (const mapping of mappings.data) {
    const sourceReference = `public-week:${monday.toISOString().slice(0, 10)}`;
    try {
      const prior = await prisma.actualMaterialValue.findFirst({ where: { itemId: mapping.itemId, supplier: mapping.supplier, sku: mapping.sku, location: mapping.location, priceBasis: "PUBLIC", minimumPacks: 1, sourceReference } });
      if (prior) { results.push({ supplier: mapping.supplier, sku: mapping.sku, status: "already-recorded" }); continue; }
      const packPrice = await collectPublicPrice(mapping, fetch, now);
      await importMaterialPrices(prisma, { observations: [{ ...mapping, packPrice, observedAt: now.toISOString(), sourceReference }] }, actor, now);
      results.push({ supplier: mapping.supplier, sku: mapping.sku, status: "recorded" });
    } catch { results.push({ supplier: mapping.supplier, sku: mapping.sku, status: "failed", message: "No verified price saved. Review the source page, mapping and storage." }); }
  }
  return Response.json({ results }, { status: results.some(r => r.status === "failed") ? 207 : 200, headers: { "Cache-Control": "no-store" } });
}
