"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { prismaDb, storageReady, upsertLink, StoreError } from "@/app/lib/takeoff/store";
import { refreshSupplierPrices, validSupplierUrl } from "@/app/lib/takeoff/supplier.server";

const linkSchema = z.object({
  rateKey: z.string().refine(k => !!defaultRateBook.materials[k], "Unknown material"),
  supplier: z.enum(["SELCO", "BUILDER_DEPOT"]),
  url: z.string().trim().max(1000),
  packQuantity: z.number().finite().positive().max(100000),
  vatIncluded: z.boolean(),
  active: z.boolean(),
});
const msg = (e: unknown) => e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error ? e.message : "Could not save.";

async function ready() {
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) throw new StoreError("Supplier prices need the new database tables (migration 20261101120000_add_takeoff_quotes).");
  return db;
}

export async function saveSupplierLink(raw: unknown) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = await ready();
    const l = linkSchema.parse(raw);
    if (l.url && !validSupplierUrl(l.supplier, l.url)) throw new StoreError(`Paste a https link to the product page on ${l.supplier === "SELCO" ? "selcobw.com" : "builderdepot.co.uk"}.`);
    await upsertLink(db, { ...l, active: l.active && !!l.url, url: l.url || "https://" + (l.supplier === "SELCO" ? "www.selcobw.com" : "www.builderdepot.co.uk") + "/" }, actor);
    revalidatePath("/dashboard/supplier-prices");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

/** Check products not checked in the last 20 hours (up to 40 per click). */
export async function refreshNow() {
  try {
    await requireCatalogueAdmin();
    const db = await ready();
    const r = await refreshSupplierPrices(db, 40);
    revalidatePath("/dashboard/supplier-prices"); revalidatePath("/dashboard/calculator");
    return { ok: true as const, checked: r.checked, updated: r.ok, failed: r.results.filter(x => !x.ok).map(x => `${x.rateKey} (${x.supplier}): ${x.error}`) };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}
