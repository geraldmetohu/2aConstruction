import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { latestObservations, listLinks, listSuggestions, prismaDb, storageReady, suggestionsReady } from "@/app/lib/takeoff/store";
import { SupplierLinks } from "./SupplierLinks";

export const metadata: Metadata = { title: "Supplier prices" };
export const dynamic = "force-dynamic";

export default async function SupplierPricesPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const storage = await storageReady(db);
  const { rates, overrides, choice } = await companyRates();
  const [links, observations, suggestions, merchants] = storage ? await Promise.all([listLinks(db), latestObservations(db), listSuggestions(db), suggestionsReady(db)]) : [[], [], [], false];
  const materials = Object.entries(rates.materials).filter(([, m]) => m.kind === "MATERIAL" || m.kind === "SUPPORTING").map(([key, m]) => {
    const edited = (overrides.materials?.[key] as { price?: unknown } | undefined)?.price;
    return { key, name: m.name, unit: m.unit, price: m.price, defaultPrice: defaultRateBook.materials[key]?.price ?? m.price, edited: typeof edited === "number" ? edited : null, use: choice[key] ?? "EDITED" };
  });
  return <SupplierLinks storage={storage} allMerchants={merchants} materials={materials}
    links={links.map(l => ({ ...l, url: l.active ? l.url : "" }))}
    observations={observations.map(o => ({ ...o, observedAt: new Date(o.observedAt).toISOString() }))}
    suggestions={suggestions.map(s => ({ ...s, createdAt: new Date(s.createdAt).toISOString() }))}
    cronConfigured={!!(process.env.CRON_SECRET || process.env.TAKEOFF_CRON_SECRET)} />;
}
