import "server-only";
import { z } from "zod";
import { observationSchema } from "./schema";
export const productMappingSchema = observationSchema.innerType().omit({ packPrice: true, observedAt: true, sourceReference: true }).extend({ priceBasis: z.literal("PUBLIC"), minimumPacks: z.literal(1), location: z.literal("PUBLIC_ONLINE") }).strict();
export const mappingsSchema = z.array(productMappingSchema).max(10);
type Mapping = z.infer<typeof productMappingSchema>;
// One product and one fixed-price offer only. Never select a range, a "from" price,
// a different SKU, a member price or an ambiguous product variant.
export function extractPublicPrice(html: string, mapping: Mapping, now = new Date()) {
  const candidates: Record<string, unknown>[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) { for (const v of value) visit(v); return; }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node["@type"] === "Product" && String(node.sku) === mapping.sku) candidates.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) { try { visit(JSON.parse(match[1])); } catch { /* Unsupported markup is not a price. */ } }
  if (candidates.length !== 1) throw Error("No unique structured product with the mapped SKU");
  const offers = Array.isArray(candidates[0].offers) ? candidates[0].offers : [candidates[0].offers];
  if (offers.length !== 1) throw Error("Ambiguous offers");
  const offer = offers[0] as Record<string, unknown> | undefined;
  if (!offer || offer["@type"] !== "Offer" || offer.priceCurrency !== "GBP" || offer.priceSpecification || offer.eligibleQuantity) throw Error("No unambiguous GBP single-pack offer");
  if (offer.availability !== "https://schema.org/InStock" && offer.availability !== "http://schema.org/InStock") throw Error("Product is not explicitly in stock");
  if (offer.priceValidUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(String(offer.priceValidUntil)) || String(offer.priceValidUntil) < now.toISOString().slice(0, 10))) throw Error("Expired or invalid offer");
  if (typeof offer.price !== "string" && typeof offer.price !== "number") throw Error("Missing price");
  const price = String(offer.price);
  observationSchema.parse({ ...mapping, packPrice: price, observedAt: now.toISOString(), sourceReference: "validation" });
  return price;
}
export async function collectPublicPrice(mapping: Mapping, fetcher: typeof fetch = fetch, now = new Date()) {
  // Revalidate host before any network request; redirects cannot escape the allowlist.
  observationSchema.parse({ ...mapping, packPrice: "1", observedAt: now.toISOString(), sourceReference: "validation" });
  const response = await fetcher(mapping.sourceUrl, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "ConstructionPriceMonitor/1.0", Accept: "text/html" } });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw Error("Supplier page unavailable");
  const reader = response.body?.getReader(); if (!reader) throw Error("Empty supplier page");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 2000000) { await reader.cancel(); throw Error("Supplier page too large"); } chunks.push(value); } } finally { reader.releaseLock(); }
  return extractPublicPrice(Buffer.concat(chunks).toString("utf8"), mapping, now);
}
