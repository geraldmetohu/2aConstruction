import "server-only";
import { prisma } from "@/app/lib/db";
import { catalogueCodeFor, defaultRateBook, mergeRateBook } from "./ratebook";
import { currentSupplierPrices, latestRateSet, prismaDb, storageReady } from "./store";
import type { PriceTable, RateBook, Trade } from "./types";
import { companyFromOverrides, defaultCompany, type CompanyProfile } from "./company";
import { supplierName } from "./supplier-parse";

/** Prices are re-read on the 1st of every month, so a price stays current for 40 days. */
const LIVE_MAX_AGE_DAYS = 40;
const n = (v: { toString(): string } | null | undefined) => (v == null ? 0 : Number(v.toString()));
const dateLabel = (d: Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

function readEnvOverrides(): unknown {
  const raw = process.env.TAKEOFF_RATEBOOK_JSON;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Company rates: defaults → TAKEOFF_RATEBOOK_JSON → latest saved rate set (Rates page). */
export async function companyRates(): Promise<{ rates: RateBook; version: number; overrides: Record<string, Record<string, unknown>> }> {
  const env = (readEnvOverrides() ?? {}) as Record<string, Record<string, unknown>>;
  let saved: Record<string, Record<string, unknown>> = {}, version = 0;
  try {
    const db = prismaDb(prisma);
    if (await storageReady(db)) {
      const set = await latestRateSet(db);
      if (set) { saved = (set.overrides ?? {}) as Record<string, Record<string, unknown>>; version = set.version; }
    }
  } catch { /* storage not set up yet */ }
  const merged = { materials: { ...env.materials, ...saved.materials }, labour: { ...env.labour, ...saved.labour }, trades: { ...env.trades, ...saved.trades } };
  return { rates: mergeRateBook(defaultRateBook, merged), version, overrides: merged };
}

/**
 * Resolve prices for every rate-book key. Strictly read-only.
 * Priority: live supplier price (merchant links, refreshed on the 1st of each month, ≤ 40 days,
 * lowest ex-VAT) → older supplier import table → catalogue item TK-<KEY> → company rates → defaults.
 */
export async function resolveTakeoffPrices(now = new Date()): Promise<{ rates: RateBook; prices: PriceTable; notes: string[]; rateVersion: number }> {
  const { rates, version, overrides } = await companyRates();
  const prices: PriceTable = {};
  const notes: string[] = [];
  const label = version ? `Company rates v${version}` : "Company rate";

  for (const key of Object.keys(overrides.materials ?? {})) if (rates.materials[key]?.confirmed) prices[key] = { price: rates.materials[key].price, source: "COMPANY_RATE", label };
  for (const key of Object.keys(overrides.labour ?? {})) if (rates.labour[key]) prices[`labour:${key}`] = { price: rates.labour[key].price, source: "COMPANY_RATE", label };
  for (const key of Object.keys(overrides.trades ?? {})) { const t = rates.trades[key as Trade]; if (t?.confirmed) prices[`trade:${key}`] = { price: t.dayRate, source: "COMPANY_RATE", label }; }

  // Catalogue prices and the older supplier import table (if those tables exist).
  const byCode = new Map(Object.keys(rates.materials).map(key => [catalogueCodeFor(key), key]));
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const items = await tx.constructionItem.findMany({
        where: { code: { in: [...byCode.keys()] }, active: true, archivedAt: null },
        select: { id: true, code: true, unit: { select: { code: true } },
          prices: { where: { effectiveFrom: { lte: now }, currency: "GBP" }, orderBy: { effectiveFrom: "desc" }, take: 1,
            select: { materialUnitCost: true, plantUnitCost: true, otherUnitCost: true, effectiveFrom: true } } },
        take: 1000,
      });
      for (const item of items) {
        const key = byCode.get(item.code)!, p = item.prices[0];
        const unit = p ? n(p.materialUnitCost) + n(p.plantUnitCost) + n(p.otherUnitCost) : 0;
        if (unit > 0) prices[key] = { price: Math.round(unit * 100) / 100, source: "CATALOGUE", label: `Catalogue · ${dateLabel(p!.effectiveFrom)}`, observedAt: p!.effectiveFrom.toISOString() };
      }
      if (!items.length) return;
      try {
        const since = new Date(now.getTime() - LIVE_MAX_AGE_DAYS * 86400000);
        const obs = await tx.actualMaterialValue.findMany({ where: { itemId: { in: items.map(i => i.id) }, observedAt: { gte: since, lte: now }, currency: "GBP" }, orderBy: { observedAt: "desc" }, take: 2000 });
        const unitOf = new Map(items.map(i => [i.id, i.unit.code])), keyOf = new Map(items.map(i => [i.id, byCode.get(i.code)!]));
        const seen = new Set<string>();
        for (const o of obs) {
          if (seen.has(`${o.itemId}|${o.supplier}`)) continue;
          seen.add(`${o.itemId}|${o.supplier}`);
          if (unitOf.get(o.itemId) !== o.unitCode) continue;
          const exVat = o.taxInclusive ? n(o.unitPrice) / 1.2 : n(o.unitPrice), key = keyOf.get(o.itemId)!;
          if (prices[key]?.source === "LIVE_SUPPLIER" && prices[key].price <= exVat) continue;
          prices[key] = { price: Math.round(exVat * 100) / 100, source: "LIVE_SUPPLIER", label: `${supplierName(o.supplier)} · ${dateLabel(o.observedAt)}`, observedAt: o.observedAt.toISOString() };
        }
      } catch { /* older supplier table not set up */ }
    }, { isolationLevel: "RepeatableRead", timeout: 20000 });
  } catch {
    notes.push("Catalogue prices are not available, so catalogue lookups were skipped.");
  }

  // Daily supplier prices from the Supplier prices page (highest priority for materials).
  try {
    const db = prismaDb(prisma);
    if (await storageReady(db)) {
      const live = await currentSupplierPrices(db, LIVE_MAX_AGE_DAYS);
      for (const p of live) if (rates.materials[p.rateKey])
        prices[p.rateKey] = { price: Math.round(p.unitPriceExVat * 100) / 100, source: "LIVE_SUPPLIER", label: `${supplierName(p.supplier)} · ${dateLabel(p.observedAt)}`, observedAt: new Date(p.observedAt).toISOString(), imageUrl: p.imageUrl ?? undefined };
      if (!live.length) notes.push("No live supplier prices yet. Link products (or let the monthly run find them) on the Supplier prices page.");
    } else notes.push("Quote saving, saved rates and live supplier prices need the new database tables (migration 20261101120000_add_takeoff_quotes).");
  } catch { notes.push("Live supplier prices are not available right now."); }

  return { rates, prices, notes, rateVersion: version };
}

/** Company commercial defaults (markup, waste, contingency) if settings exist. */
export async function readCommercialDefaults(now = new Date()) {
  try {
    const row = await prisma.companySettingsVersion.findFirst({ where: { settingsId: "company", effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
    if (!row) return null;
    return { markupPercent: n(row.defaultMarkupPercent), wastePercent: n(row.defaultWastePercent), contingencyPercent: n(row.contingencyPercent) };
  } catch { return null; }
}

/** Company details for documents: defaults → the latest saved set (Company & documents page). */
export async function companyProfile(): Promise<{ company: CompanyProfile; version: number }> {
  try {
    const db = prismaDb(prisma);
    if (await storageReady(db)) {
      const set = await latestRateSet(db);
      if (set) return { company: companyFromOverrides((set.overrides as { company?: unknown } | null)?.company), version: set.version };
    }
  } catch { /* storage not set up yet */ }
  return { company: defaultCompany, version: 0 };
}
