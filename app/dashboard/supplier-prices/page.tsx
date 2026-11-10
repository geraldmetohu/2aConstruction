import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { latestObservations, listLinks, listSuggestions, prismaDb, storageReady, suggestionsReady } from "@/app/lib/takeoff/store";
import { SupplierLinks } from "./SupplierLinks";

export const metadata: Metadata = { title: "Supplier prices" };
export const dynamic = "force-dynamic";

export default async function SupplierPricesPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const storage = await storageReady(db);
  const { rates } = await companyRates();
  const [links, observations, suggestions, merchants] = storage ? await Promise.all([listLinks(db), latestObservations(db), listSuggestions(db), suggestionsReady(db)]) : [[], [], [], false];
  const materials = Object.entries(rates.materials).filter(([, m]) => m.kind === "MATERIAL" || m.kind === "SUPPORTING").map(([key, m]) => ({ key, name: m.name, unit: m.unit, price: m.price }));
  return <SupplierLinks storage={storage} allMerchants={merchants} materials={materials}
    links={links.map(l => ({ ...l, url: l.active ? l.url : "" }))}
    observations={observations.map(o => ({ ...o, observedAt: new Date(o.observedAt).toISOString() }))}
    suggestions={suggestions.map(s => ({ ...s, createdAt: new Date(s.createdAt).toISOString() }))}
    cronConfigured={!!(process.env.CRON_SECRET || process.env.TAKEOFF_CRON_SECRET)} />;
}
