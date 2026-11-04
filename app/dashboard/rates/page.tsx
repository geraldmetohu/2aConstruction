import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { RatesEditor } from "./RatesEditor";

export const metadata: Metadata = { title: "Labour & material rates" };
export const dynamic = "force-dynamic";

export default async function RatesPage() {
  await requireCatalogueAdmin();
  const [{ rates, version, overrides }, storage] = await Promise.all([companyRates(), storageReady(prismaDb(prisma))]);
  return <RatesEditor rates={rates} defaults={defaultRateBook} version={version} overrides={overrides} storage={storage} />;
}
