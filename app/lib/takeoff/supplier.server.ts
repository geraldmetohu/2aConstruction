import "server-only";
import { addSuggestion, linksDue, materialsToSearch, recordObservation, suggestionsReady, type Db, type LinkRow, type SupplierCode } from "./store";
import {
  extractImage, extractName, extractPrice, guessPack, matchScore, productLinks, robotsAllows, searchTerms, searchUrl, SUPPLIER_IDS, supplierName, validSupplierUrl,
  type SupplierId,
} from "./supplier-parse";

export { extractImage, extractPrice, validSupplierUrl } from "./supplier-parse";

const UA = "2AConstruction-PriceCheck/2.0 (monthly trade price check; contact via 2aconstruction.co.uk)";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// robots.txt per host, cached for the run.
const robotsCache = new Map<string, Promise<string>>();
async function allowed(url: string, fetcher: typeof fetch) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) robotsCache.set(u.host, fetcher(`${u.origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000), cache: "no-store" })
    .then(r => (r.ok ? r.text() : "")).catch(() => ""));
  return robotsAllows(await robotsCache.get(u.host)!, u.pathname + u.search);
}

async function getPage(url: string, supplier: string, fetcher: typeof fetch) {
  if (!validSupplierUrl(supplier, url)) throw new Error(`Only https ${supplierName(supplier)} links are allowed`);
  if (!(await allowed(url, fetcher))) throw new Error(`${supplierName(supplier)}'s robots.txt does not allow automated reading of this page – use a price list import or enter the price by hand`);
  const res = await fetcher(url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-GB" } });
  if (res.status === 403 || res.status === 429) throw new Error(`${supplierName(supplier)} blocked the automatic check (${res.status}) – import their price list or enter the price by hand`);
  if (!res.ok) throw new Error(`Supplier page returned ${res.status}`);
  if (res.url && !validSupplierUrl(supplier, res.url)) throw new Error("Redirected away from the supplier site");
  return (await res.text()).slice(0, 3_000_000);
}

export async function fetchSupplierPrice(link: Pick<LinkRow, "supplier" | "url">, fetcher: typeof fetch = fetch) {
  const html = await getPage(link.url, link.supplier, fetcher);
  return { price: extractPrice(html), imageUrl: extractImage(html) };
}

/** Check links not checked for `hours` hours. One request per product, a few at a time, a second apart. */
export async function refreshSupplierPrices(db: Db, limit = 40, fetcher: typeof fetch = fetch, hours = 20) {
  const due = await linksDue(db, hours, limit);
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
    if (i + 4 < due.length) await sleep(1000);
  }
  return { checked: results.length, ok: results.filter(r => r.ok).length, results };
}

/**
 * Find a material on a merchant's site: search page → first few product pages → best name match.
 * Saves a suggestion (product, price, pack size guess) for the admin to confirm; never changes prices by itself.
 */
export async function findProduct(db: Db, material: { key: string; name: string; unit: string }, supplier: SupplierId, fetcher: typeof fetch = fetch) {
  const q = searchTerms(material.name);
  const html = await getPage(searchUrl(supplier, q), supplier, fetcher);
  const links = productLinks(html, supplier, searchUrl(supplier, q), 4);
  if (!links.length) throw new Error("No products found in the search results");
  let best: { url: string; name: string; price: number | null; image?: string; score: number } | null = null;
  for (const url of links) {
    await sleep(800);
    try {
      const page = await getPage(url, supplier, fetcher);
      const name = extractName(page) ?? "";
      const score = matchScore(material.name, name);
      let price: number | null = null; try { price = extractPrice(page); } catch { /* product without a single price */ }
      if (!best || score > best.score) best = { url, name, price, image: extractImage(page), score };
    } catch { /* skip this candidate */ }
  }
  if (!best || best.score < 0.4) throw new Error(best ? `Closest match "${best.name}" is not close enough` : "Could not read the product pages");
  const pack = guessPack(best.name, material.unit);
  await addSuggestion(db, { rateKey: material.key, supplier: supplier as SupplierCode, url: best.url, productName: best.name, packPrice: best.price, imageUrl: best.image ?? null, packGuess: pack.quantity, packSure: pack.sure, score: Math.round(best.score * 1000) / 1000 });
  return best;
}

/**
 * The monthly run (1st of the month): re-check every linked product not checked in the last 20 days, then look for
 * unlinked materials on the merchants chosen, until the time budget runs out. Call again (e.g. on the 2nd) to finish.
 */
export async function monthlyPriceRun(db: Db, materials: { key: string; name: string; unit: string }[], opts: { budgetMs?: number; suppliers?: SupplierId[]; fetcher?: typeof fetch } = {}) {
  const t0 = Date.now(), budget = opts.budgetMs ?? 250_000, fetcher = opts.fetcher ?? fetch;
  let checked = 0, updated = 0; const failed: string[] = [];
  while (Date.now() - t0 < budget * 0.6) {
    const r = await refreshSupplierPrices(db, 20, fetcher, 20 * 24);
    checked += r.checked; updated += r.ok; failed.push(...r.results.filter(x => !x.ok).map(x => `${x.rateKey} (${supplierName(x.supplier)}): ${x.error}`));
    if (r.checked < 20) break;
  }
  const found: string[] = [], notFound: string[] = [];
  if (await suggestionsReady(db)) {
    for (const s of opts.suppliers ?? (["SCREWFIX", "TOOLSTATION", "SELCO", "BUILDER_DEPOT"] as SupplierId[])) {
      if (Date.now() - t0 > budget) break;
      const keys = await materialsToSearch(db, s as SupplierCode, materials.map(m => m.key), 25, 6);
      for (const key of keys) {
        if (Date.now() - t0 > budget) break;
        const m = materials.find(x => x.key === key)!;
        try { const b = await findProduct(db, m, s, fetcher); found.push(`${m.name} → ${supplierName(s)}: ${b.name}`); }
        catch (e) {
          notFound.push(`${m.name} (${supplierName(s)}): ${e instanceof Error ? e.message : "error"}`);
          if (e instanceof Error && /robots|blocked/.test(e.message)) break; // the site doesn't allow it – don't keep trying
        }
      }
    }
  }
  return { checked, updated, failed, found, notFound, remaining: Date.now() - t0 > budget };
}

export const supplierList = SUPPLIER_IDS.map(id => ({ id, name: supplierName(id) }));
