// Merchant registry and page parsing for supplier prices (pure – no network, so it can be tested).
// Prices come from the public product page (schema.org Product / Offer JSON-LD, or standard price meta tags).
// Automatic product finding uses each merchant's public search page, only where robots.txt allows it.

export const SUPPLIERS = {
  SELCO: { name: "Selco", hosts: ["www.selcobw.com", "selcobw.com"], search: "https://www.selcobw.com/search?q={q}", product: /\/product\/|-\d{4,}$|\/p\//i },
  BUILDER_DEPOT: { name: "Builder Depot", hosts: ["www.builderdepot.co.uk", "builderdepot.co.uk"], search: "https://www.builderdepot.co.uk/catalogsearch/result/?q={q}", product: /\.html$/i },
  TOOLSTATION: { name: "Toolstation", hosts: ["www.toolstation.com", "toolstation.com"], search: "https://www.toolstation.com/search?q={q}", product: /\/p\d{3,}$/i },
  SCREWFIX: { name: "Screwfix", hosts: ["www.screwfix.com", "screwfix.com"], search: "https://www.screwfix.com/search?search={q}", product: /\/p\/[^/]+\/\d+/i },
  TRAVIS_PERKINS: { name: "Travis Perkins", hosts: ["www.travisperkins.co.uk", "travisperkins.co.uk"], search: "https://www.travisperkins.co.uk/search?text={q}", product: /\/p\/\d+/i },
  WICKES: { name: "Wickes", hosts: ["www.wickes.co.uk", "wickes.co.uk"], search: "https://www.wickes.co.uk/search?text={q}", product: /\/p\/\d+/i },
  JEWSON: { name: "Jewson", hosts: ["www.jewson.co.uk", "jewson.co.uk"], search: "https://www.jewson.co.uk/search?text={q}", product: /\/p\/[^/]+|_\d{5,}/i },
  B_AND_Q: { name: "B&Q", hosts: ["www.diy.com", "diy.com"], search: "https://www.diy.com/search?term={q}", product: /\.prd$|\/departments\/.+_BQ/i },
  MKM: { name: "MKM", hosts: ["www.mkmbs.co.uk", "mkmbs.co.uk"], search: "https://www.mkmbs.co.uk/search?q={q}", product: /\/p\/|\/product\//i },
  CITY_PLUMBING: { name: "City Plumbing", hosts: ["www.cityplumbing.co.uk", "cityplumbing.co.uk"], search: "https://www.cityplumbing.co.uk/search?text={q}", product: /\/p\/[^/]+/i },
  CEF: { name: "CEF", hosts: ["www.cef.co.uk", "cef.co.uk"], search: "https://www.cef.co.uk/search?q={q}", product: /\/catalogue\/products\//i },
  TOPPS_TILES: { name: "Topps Tiles", hosts: ["www.toppstiles.co.uk", "toppstiles.co.uk"], search: "https://www.toppstiles.co.uk/search?q={q}", product: /\.html$|\/p\//i },
} as const;
export type SupplierId = keyof typeof SUPPLIERS;
export const SUPPLIER_IDS = Object.keys(SUPPLIERS) as SupplierId[];
export const supplierName = (s: string) => SUPPLIERS[s as SupplierId]?.name ?? s;
export const supplierHome = (s: SupplierId) => `https://${SUPPLIERS[s].hosts[0]}/`;
export const searchUrl = (s: SupplierId, q: string) => SUPPLIERS[s].search.replace("{q}", encodeURIComponent(q));

export function validSupplierUrl(supplier: string, url: string) {
  const s = SUPPLIERS[supplier as SupplierId];
  if (!s) return false;
  try { const u = new URL(url); return u.protocol === "https:" && (s.hosts as readonly string[]).includes(u.hostname); } catch { return false; }
}

/** Every JSON-LD object on the page (flattening @graph and arrays). */
function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    out.push(o);
    if (o["@graph"]) visit(o["@graph"]);
    if (o.itemListElement) visit(o.itemListElement);
    if (o.item && typeof o.item === "object") visit(o.item);
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) { try { visit(JSON.parse(m[1])); } catch { /* ignore broken blocks */ } }
  return out;
}
const isType = (o: Record<string, unknown>, t: string) => (Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]]).includes(t);

/** The single product price on a product page; ranges and several different prices are rejected. */
export function extractPrice(html: string): number {
  const found: number[] = [];
  const add = (v: unknown) => { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[£,\s]/g, "")) : NaN; if (Number.isFinite(n) && n > 0 && n < 100000) found.push(Math.round(n * 100) / 100); };
  for (const o of jsonLd(html)) if (isType(o, "Product")) {
    const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
    for (const off of offers) if (off && typeof off === "object") {
      const of = off as Record<string, unknown>;
      if (of.priceCurrency && of.priceCurrency !== "GBP") continue;
      if (of["@type"] === "AggregateOffer") continue; // a range, not a price
      add(of.price ?? (of.priceSpecification as Record<string, unknown> | undefined)?.price);
    }
  }
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

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
export function extractName(html: string): string | undefined {
  for (const o of jsonLd(html)) if (isType(o, "Product") && typeof o.name === "string") return decode(o.name).slice(0, 300);
  const og = html.match(/<meta\b[^>]*property\s*=\s*["']og:title["'][^>]*>/i)?.[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  const title = og ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return title ? decode(title).split(/ [|–-] /)[0].slice(0, 300) : undefined;
}

/** Product page links on a search results page: JSON-LD ItemList first, then links matching the merchant's product URL pattern. */
export function productLinks(html: string, supplier: SupplierId, base: string, max = 5): string[] {
  const s = SUPPLIERS[supplier];
  const out: string[] = [];
  const push = (href: unknown) => {
    if (typeof href !== "string" || out.length >= max) return;
    try {
      const u = new URL(decode(href), base); u.hash = ""; u.search = "";
      if (u.protocol === "https:" && (s.hosts as readonly string[]).includes(u.hostname) && s.product.test(u.pathname) && !out.includes(u.toString())) out.push(u.toString());
    } catch { /* ignore */ }
  };
  for (const o of jsonLd(html)) { if (isType(o, "ListItem") || isType(o, "Product")) push(o.url ?? (o.item as Record<string, unknown> | undefined)?.url); }
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) push(m[1]);
  return out;
}

// ---------------------------------------------------------------- Matching

const STOP = new Set(["the", "and", "with", "for", "per", "of", "x", "mm", "m", "kg", "pack", "each", "inc", "incl", "to", "in", "a", "–", "-", "&"]);
const words = (s: string) => s.toLowerCase().replace(/[×]/g, " x ").replace(/[^a-z0-9. ]+/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
const numbers = (s: string) => new Set((s.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n > 0));

/** How well a merchant product name matches our material (0–1): shared words, plus sizes / numbers that agree. */
export function matchScore(ours: string, theirs: string): number {
  const a = new Set(words(ours)), b = new Set(words(theirs));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter(w => b.has(w) || [...b].some(x => x.length > 4 && (x.startsWith(w) || w.startsWith(x)))).length;
  const na = numbers(ours), nb = numbers(theirs);
  const numShare = na.size ? [...na].filter(n => nb.has(n) || nb.has(n * 1000) || nb.has(n / 1000)).length / na.size : 0.5;
  const clash = na.size > 0 && nb.size > 0 && numShare === 0 ? 0.25 : 0;
  return Math.max(0, Math.min(1, (shared / a.size) * 0.7 + numShare * 0.3 - clash));
}

/** Search words for a material: drop pack descriptions and brackets. */
export const searchTerms = (name: string) => name.replace(/\([^)]*\)/g, " ").replace(/\b(supplied|fitted|allowance|client|per|set|pack|with brackets)\b/gi, " ").replace(/[–—]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * How many of our units one merchant pack holds, read from the product name, e.g. "Pack of 10", "2.4 m² pack", "25 kg".
 * Returns 1 (and sure = false) when the name doesn't say – the admin confirms before the link is used.
 */
export function guessPack(name: string, unit: string): { quantity: number; sure: boolean } {
  const n = name.toLowerCase().replace(/,/g, "");
  const num = (re: RegExp) => { const m = n.match(re); return m ? Number(m[1]) : 0; };
  if (unit === "m2") { const q = num(/(\d+(?:\.\d+)?)\s*(?:m²|m2|sq\.? ?m|square met)/); if (q) return { quantity: q, sure: true }; }
  if (unit === "m") { const q = num(/(\d+(?:\.\d+)?)\s*m(?:etre)?s?\b(?!m)/); if (q && q < 100) return { quantity: q, sure: true }; }
  if (unit === "each" || unit === "set" || unit === "box" || unit === "length" || unit === "sheet" || unit === "bag" || unit === "pair") {
    const q = num(/(?:pack|box|bag|tub) of (\d+)/) || num(/(\d+)\s*(?:pack|pk)\b/) || num(/\bx\s?(\d+)\b(?!\s*mm)/);
    if (q && q < 10000) return { quantity: q, sure: true };
    return { quantity: 1, sure: !(unit === "box" ? /\b(pack|pk)\b/ : /\b(pack|box|pk)\b/).test(n) };
  }
  return { quantity: 1, sure: false };
}

// ---------------------------------------------------------------- robots.txt

/** Is `path` allowed for any robot under robots.txt (User-agent: * groups; longest matching rule wins)? */
export function robotsAllows(robots: string, path: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null, lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") { if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (cur && (key === "allow" || key === "disallow")) cur.rules.push({ allow: key === "allow", path: val });
  }
  const rules = groups.filter(g => g.agents.includes("*")).flatMap(g => g.rules).filter(r => r.path);
  const toRe = (p: string) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) if (toRe(r.path).test(path) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) best = { allow: r.allow, len: r.path.length };
  return best ? best.allow : true;
}
