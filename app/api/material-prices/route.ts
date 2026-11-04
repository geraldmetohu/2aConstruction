import { authorizeMaterialPrices as authorize } from "@/app/lib/material-prices/access";
import { z } from "zod";
import { prisma } from "@/app/lib/db";

import { importMaterialPrices, MaterialPriceError } from "@/app/lib/material-prices/service";
import { supplierSchema } from "@/app/lib/material-prices/schema";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  let actor: string; try { actor = await authorize(request); } catch { return reply({ error: "Unavailable or unauthorized" }, 403); }
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Use application/json" }, 415);
    const reader = request.body?.getReader(); if (!reader) return reply({ error: "Missing body" }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 512000) { await reader.cancel(); return reply({ error: "Batch too large" }, 413); } chunks.push(value); } } finally { reader.releaseLock(); }
    return reply(await importMaterialPrices(prisma, JSON.parse(Buffer.concat(chunks).toString("utf8")), actor));
  } catch (e) { return reply({ error: e instanceof MaterialPriceError ? e.message : "Invalid batch or import unavailable" }, 400); }
}
export async function GET(request: Request) {
  try { await authorize(request); } catch { return reply({ error: "Unavailable or unauthorized" }, 403); }
  const params = new URL(request.url).searchParams;
  const query = z.object({ itemId: z.string().uuid(), supplier: supplierSchema.optional(), before: z.string().uuid().optional() }).safeParse(Object.fromEntries(params));
  if (!query.success) return reply({ error: "Supply a valid itemId; supplier and before cursor are optional" }, 400);
  const rows = await prisma.actualMaterialValue.findMany({ where: { itemId: query.data.itemId, supplier: query.data.supplier }, orderBy: [{ observedAt: "desc" }, { id: "desc" }], take: 100, ...(query.data.before ? { cursor: { id: query.data.before }, skip: 1 } : {}), select: { id: true, itemId: true, supplier: true, sku: true, sourceUrl: true, location: true, priceBasis: true, packPrice: true, packQuantity: true, unitCode: true, unitPrice: true, currency: true, taxInclusive: true, minimumPacks: true, observedAt: true, receivedAt: true } });
  return reply({ observations: rows.map(r => ({ ...r, stale: Date.now() - r.observedAt.getTime() > 8 * 86400000 })), nextCursor: rows.length === 100 ? rows.at(-1)!.id : null });
}
