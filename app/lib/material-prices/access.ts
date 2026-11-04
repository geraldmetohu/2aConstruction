import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
export async function authorizeMaterialPrices(request: Request) {
  if (process.env.MATERIAL_PRICES_ENABLED !== "true") throw Error("Disabled");
  const header = request.headers.get("authorization");
  if (header) {
    const secret = process.env.MATERIAL_PRICE_IMPORT_TOKEN;
    if (!secret || secret.length < 32) throw Error("Unauthorized");
    const expected = Buffer.from(`Bearer ${secret}`), actual = Buffer.from(header);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error("Unauthorized");
    return "material-price-import";
  }
  const actor = await requireCatalogueAdmin();
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) throw Error("Origin mismatch");
  return actor;
}
