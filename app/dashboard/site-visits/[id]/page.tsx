import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { getVisit } from "@/app/lib/site-visit/store";
import { VisitForm } from "./VisitForm";

export const metadata: Metadata = { title: "Site visit" };
export const dynamic = "force-dynamic";

/** "YYYY-MM-DDTHH:mm" in London time, for the datetime-local input. */
function localInput(d: Date | null) {
  if (!d) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(d)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default async function SiteVisitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCatalogueAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const v = await getVisit(prismaDb(prisma), id);
  if (!v) notFound();
  return <VisitForm visit={{
    id: v.id, reference: v.reference, status: v.status, version: v.version, quoteId: v.quoteId, quoteReference: v.quoteReference,
    details: { clientName: v.clientName, clientEmail: v.clientEmail, clientPhone: v.clientPhone, siteAddress: v.siteAddress, postcode: v.postcode, visitAt: localInput(v.visitAt), projectTypes: v.projectTypes },
    answers: v.answers, takeoff: v.takeoff,
  }} />;
}
