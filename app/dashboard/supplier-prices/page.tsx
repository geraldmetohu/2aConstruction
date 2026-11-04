import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { latestObservations, listLinks, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { SupplierLinks } from "./SupplierLinks";

export const metadata: Metadata = { title: "Supplier prices" };
export const dynamic = "force-dynamic";

export default async function SupplierPricesPage() {
  await requireCatalogueAdmin();
  const db = prismaDb(prisma);
  const storage = await storageReady(db);
  const { rates } = await companyRates();
  const [links, observations] = storage ? await Promise.all([listLinks(db), latestObservations(db)]) : [[], []];
  const materials = Object.entries(rates.materials).filter(([, m]) => m.kind === "MATERIAL" || m.kind === "SUPPORTING").map(([key, m]) => ({ key, name: m.name, unit: m.unit, price: m.price }));
  return <SupplierLinks storage={storage} materials={materials}
    links={links.map(l => ({ ...l, url: l.active ? l.url : "" }))}
    observations={observations.map(o => ({ ...o, observedAt: new Date(o.observedAt).toISOString() }))}
    cronConfigured={!!process.env.TAKEOFF_CRON_SECRET} />;
}
