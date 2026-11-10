"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { listSuggestions, prismaDb, recordObservation, storageReady, suggestionsReady, upsertLink, listLinks, StoreError, type SupplierCode } from "@/app/lib/takeoff/store";
import { findProduct, monthlyPriceRun, refreshSupplierPrices } from "@/app/lib/takeoff/supplier.server";
import { SUPPLIER_IDS, supplierHome, supplierName, validSupplierUrl, type SupplierId } from "@/app/lib/takeoff/supplier-parse";

const supplier = z.enum(SUPPLIER_IDS as [SupplierId, ...SupplierId[]]);
const linkSchema = z.object({
  rateKey: z.string().refine(k => !!defaultRateBook.materials[k], "Unknown material"),
  supplier,
  url: z.string().trim().max(1000),
  packQuantity: z.number().finite().positive().max(100000),
  vatIncluded: z.boolean(),
  active: z.boolean(),
});
const msg = (e: unknown) => e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error ? e.message : "Could not save.";
const NEW_MERCHANTS = "More merchants and automatic product finding need migration 20261110120000_more_suppliers.";

async function ready() {
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) throw new StoreError("Supplier prices need the new database tables (migration 20261101120000_add_takeoff_quotes).");
  return db;
}
const done = () => { revalidatePath("/dashboard/supplier-prices"); revalidatePath("/dashboard/calculator"); };
/** Before the new migration only Selco and Builder Depot can be stored. */
async function checkMerchant(db: Awaited<ReturnType<typeof ready>>, s: SupplierId) {
  if (s !== "SELCO" && s !== "BUILDER_DEPOT" && !(await suggestionsReady(db))) throw new StoreError(NEW_MERCHANTS);
}

export async function saveSupplierLink(raw: unknown) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const l = linkSchema.parse(raw);
    await checkMerchant(db, l.supplier);
    if (l.url && !validSupplierUrl(l.supplier, l.url)) throw new StoreError(`Paste a https link to the product page on ${supplierHome(l.supplier).replace("https://", "").replace(/\/$/, "")}.`);
    await upsertLink(db, { ...l, active: l.active && !!l.url, url: l.url || supplierHome(l.supplier) }, actor);
    done();
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Check products not checked in the last 20 hours (up to 40 per click). */
export async function refreshNow() {
  try {
    await requireCatalogueAdmin();
    const db = await ready();
    const r = await refreshSupplierPrices(db, 40);
    done();
    return { ok: true as const, checked: r.checked, updated: r.ok, failed: r.results.filter(x => !x.ok).map(x => `${x.rateKey} (${supplierName(x.supplier)}): ${x.error}`) };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Run the monthly update now (re-check links, then look for unlinked materials) – about 2 minutes. */
export async function monthlyRunNow() {
  try {
    await requireCatalogueAdmin();
    const db = await ready();
    const { rates } = await companyRates();
    const materials = Object.entries(rates.materials).filter(([, m]) => m.kind === "MATERIAL" || m.kind === "SUPPORTING").map(([key, m]) => ({ key, name: m.name, unit: m.unit }));
    const r = await monthlyPriceRun(db, materials, { budgetMs: 100_000 });
    done();
    return { ok: true as const, ...r };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Look for one material on one merchant's site now. */
export async function findNow(rateKey: string, s: string) {
  try {
    await requireCatalogueAdmin();
    const db = await ready();
    const sup = supplier.parse(s);
    if (!(await suggestionsReady(db))) throw new StoreError(NEW_MERCHANTS);
    const { rates } = await companyRates();
    const m = rates.materials[rateKey];
    if (!m) throw new StoreError("Unknown material");
    const b = await findProduct(db, { key: rateKey, name: m.name, unit: m.unit }, sup);
    done();
    return { ok: true as const, name: b.name, price: b.price };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Use a product that was found: becomes the link for that material and merchant, with the pack size you confirmed. */
export async function acceptSuggestion(id: string, packQuantity: number, vatIncluded: boolean) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const s = (await listSuggestions(db)).find(x => x.id === id);
    if (!s) throw new StoreError("That suggestion is no longer available.");
    if (!(packQuantity > 0 && packQuantity <= 100000)) throw new StoreError("Enter the pack size.");
    await upsertLink(db, { rateKey: s.rateKey, supplier: s.supplier, url: s.url, packQuantity, vatIncluded, active: true }, actor);
    if (s.packPrice) {
      const link = (await listLinks(db)).find(l => l.rateKey === s.rateKey && l.supplier === s.supplier)!;
      await recordObservation(db, link, { ok: true, packPrice: s.packPrice, imageUrl: s.imageUrl ?? undefined });
    }
    done();
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/**
 * Import a merchant price list (CSV from your trade account): columns rateKey (or material name), supplier, price,
 * and optionally packQuantity, vatIncluded (yes/no), url. Each row becomes a price observation dated today.
 */
export async function importPriceList(csv: string) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const { rates } = await companyRates();
    const byName = new Map(Object.entries(rates.materials).map(([k, m]) => [m.name.toLowerCase(), k]));
    const rows = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 2001);
    if (rows.length < 2) throw new StoreError("Paste a header row and at least one price row.");
    const split = (l: string) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map(c => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()).slice(0, 10);
    const head = split(rows[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ""));
    const col = (...n: string[]) => head.findIndex(h => n.includes(h));
    const ci = { key: col("ratekey", "key", "material", "name"), sup: col("supplier", "merchant"), price: col("price", "packprice", "cost"), pack: col("packquantity", "pack", "packsize"), vat: col("vatincluded", "incvat", "vat"), url: col("url", "link") };
    if (ci.key < 0 || ci.sup < 0 || ci.price < 0) throw new StoreError("The header needs rateKey (or material), supplier and price columns.");
    let imported = 0; const problems: string[] = [];
    for (const [i, line] of rows.slice(1).entries()) {
      const c = split(line);
      const rawKey = c[ci.key] ?? "", key = rates.materials[rawKey] ? rawKey : byName.get(rawKey.toLowerCase());
      const sRaw = (c[ci.sup] ?? "").toUpperCase().replace(/&/g, "_AND_").replace(/[^A-Z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      const sup = SUPPLIER_IDS.find(x => x === sRaw || supplierName(x).toUpperCase().replace(/[^A-Z]/g, "") === sRaw.replace(/_/g, ""));
      const price = Number((c[ci.price] ?? "").replace(/[£,\s]/g, ""));
      if (!key) { problems.push(`row ${i + 2}: unknown material "${rawKey}"`); continue; }
      if (!sup) { problems.push(`row ${i + 2}: unknown supplier "${c[ci.sup]}"`); continue; }
      if (!(price > 0 && price < 100000)) { problems.push(`row ${i + 2}: price "${c[ci.price]}"`); continue; }
      try { await checkMerchant(db, sup); } catch (e) { problems.push(`row ${i + 2}: ${msg(e)}`); continue; }
      const url = ci.url >= 0 && c[ci.url] && validSupplierUrl(sup, c[ci.url]) ? c[ci.url] : undefined;
      const existing = (await listLinks(db)).find(l => l.rateKey === key && l.supplier === sup);
      const pack = ci.pack >= 0 && Number(c[ci.pack]) > 0 ? Number(c[ci.pack]) : existing?.packQuantity ?? 1;
      const vat = ci.vat >= 0 && c[ci.vat] ? /^(y|yes|true|1|inc)/i.test(c[ci.vat]) : existing?.vatIncluded ?? false;
      await upsertLink(db, { rateKey: key, supplier: sup as SupplierCode, url: url ?? existing?.url ?? supplierHome(sup), packQuantity: pack, vatIncluded: vat, active: true }, actor);
      const link = (await listLinks(db)).find(l => l.rateKey === key && l.supplier === sup)!;
      await recordObservation(db, link, { ok: true, packPrice: price });
      imported++;
    }
    done();
    return { ok: true as const, imported, problems: problems.slice(0, 20) };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}
