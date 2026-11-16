import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { buildIms } from "@/app/lib/compliance/ims";
import { ImsViewer } from "@/app/componets/compliance/ImsViewer";

export const metadata: Metadata = { title: "ISO & tender documents" };
export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  await requireCatalogueAdmin();
  const { company } = await companyProfile();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const { docs, issued, review, missing } = buildIms(company, today);
  return <ImsViewer docs={docs} company={company} issued={issued} review={review} missing={missing} />;
}
