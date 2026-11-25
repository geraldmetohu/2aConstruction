import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { prismaDb } from "@/app/lib/takeoff/store";
import { getVisit } from "@/app/lib/site-visit/store";
import { renderVisitPdf } from "@/app/lib/site-visit/pdf.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin: the site visit form as a PDF. ?blank=1 = to print and fill in by hand (what is known so far is printed, with space for the rest). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCatalogueAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const v = await getVisit(prismaDb(prisma), id);
  if (!v) return new Response("Not found", { status: 404 });
  const blank = new URL(req.url).searchParams.get("blank") === "1";
  const { company } = await companyProfile();
  const pdf = await renderVisitPdf({
    companyName: company.name, reference: v.reference, clientName: v.clientName, clientPhone: v.clientPhone, clientEmail: v.clientEmail,
    siteAddress: v.siteAddress, postcode: v.postcode, visitAt: v.visitAt, types: v.projectTypes,
    // "Print to fill in": what is already known is printed, with space to write everything else.
    answers: v.answers, takeoff: v.takeoff, blank,
  });
  const name = `Site visit ${v.reference}${v.clientName ? ` ${v.clientName.replace(/[^\w .-]/g, "")}` : ""}${blank ? " (to fill in)" : ""}.pdf`;
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
