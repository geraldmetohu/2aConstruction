import "server-only";
import { linksDue, recordObservation, type Db, type LinkRow } from "./store";

const HOSTS: Record<LinkRow["supplier"], string[]> = {
  SELCO: ["www.selcobw.com", "selcobw.com"],
  BUILDER_DEPOT: ["www.builderdepot.co.uk", "builderdepot.co.uk"],
};

export function validSupplierUrl(supplier: LinkRow["supplier"], url: string) {
  try { const u = new URL(url); return u.protocol === "https:" && HOSTS[supplier].includes(u.hostname); } catch { return false; }
}

/**
 * Read the product price from the public product page: schema.org Product/Offer JSON-LD first,
 * then standard product price meta tags. Ranges and multiple different prices are rejected.
 */
export function extractPrice(html: string): number {
  const found: number[] = [];
  const add = (v: unknown) => { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[£,\s]/g, "")) : NaN; if (Number.isFinite(n) && n > 0 && n < 100000) found.push(Math.round(n * 100) / 100); };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o["@graph"]) visit(o["@graph"]);
    const type = Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]];
    if (type.includes("Product")) {
      const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
      for (const off of offers) if (off && typeof off === "object") {
        const of = off as Record<string, unknown>;
        if (of.priceCurrency && of.priceCurrency !== "GBP") continue;
        if (of["@type"] === "AggregateOffer") continue; // a range, not a price
        add(of.price);
      }
    }
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) { try { visit(JSON.parse(m[1])); } catch { /* ignore broken blocks */ } }
  if (!found.length) {
    for (const m of html.matchAll(/<meta\b[^>]*(?:itemprop\s*=\s*["']price["']|property\s*=\s*["'](?:product:price:amount|og:price:amount)["'])[^>]*>/gi)) {
      const c = m[0].match(/content\s*=\s*["']([^"']+)["']/i); if (c) add(c[1]);
    }
  }
  const unique = [...new Set(found)];
  if (!unique.length) throw new Error("No price found on the page");
  if (unique.length > 1) throw new Error(`Several prices on the page (${unique.slice(0, 4).join(", ")}): link the exact product variant`);
  return unique[0];
}

/** Product image from og:image or JSON-LD (https only). */
export function extractImage(html: string): string | undefined {
  const og = html.match(/<meta\b[^>]*property\s*=\s*["']og:image["'][^>]*>/i)?.[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  const ld = html.match(/"image"\s*:\s*"(https:[^"]+)"/)?.[1];
  const url = og ?? ld;
  return url && /^https:\/\//.test(url) && url.length < 1000 ? url : undefined;
}

export async function fetchSupplierPrice(link: Pick<LinkRow, "supplier" | "url">, fetcher: typeof fetch = fetch) {
  if (!validSupplierUrl(link.supplier, link.url)) throw new Error("Only https Selco / Builder Depot product links are allowed");
  const res = await fetcher(link.url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "2AConstruction-PriceCheck/1.0 (daily price check)", Accept: "text/html" } });
  if (!res.ok) throw new Error(`Supplier page returned ${res.status}`);
  if (res.url && !validSupplierUrl(link.supplier, res.url)) throw new Error("Redirected away from the supplier site");
  const html = (await res.text()).slice(0, 3_000_000);
  return { price: extractPrice(html), imageUrl: extractImage(html) };
}

/** Refresh links not checked in the last 20 hours. One request per product, a few at a time. */
export async function refreshSupplierPrices(db: Db, limit = 40, fetcher: typeof fetch = fetch) {
  const due = await linksDue(db, 20, limit);
  const results: { rateKey: string; supplier: string; ok: boolean; price?: number; error?: string }[] = [];
  for (let i = 0; i < due.length; i += 4) {
    await Promise.all(due.slice(i, i + 4).map(async link => {
      try {
        const { price, imageUrl } = await fetchSupplierPrice(link, fetcher);
        await recordObservation(db, link, { ok: true, packPrice: price, imageUrl });
        results.push({ rateKey: link.rateKey, supplier: link.supplier, ok: true, price });
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        await recordObservation(db, link, { ok: false, error });
        results.push({ rateKey: link.rateKey, supplier: link.supplier, ok: false, error });
      }
    }));
    if (i + 4 < due.length) await new Promise(r => setTimeout(r, 1000));
  }
  return { checked: results.length, ok: results.filter(r => r.ok).length, results };
}
