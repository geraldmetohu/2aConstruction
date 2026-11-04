import type { Metadata } from "next";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { CompanyForm } from "./CompanyForm";

export const metadata: Metadata = { title: "Company & documents" };
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  await requireCatalogueAdmin();
  const [{ company, version }, storage] = await Promise.all([companyProfile(), storageReady(prismaDb(prisma))]);
  return <CompanyForm company={company} version={version} storage={storage} />;
}
