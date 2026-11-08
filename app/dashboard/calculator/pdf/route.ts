import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import type { CustomerTakeoff } from "@/app/lib/takeoff/engine";
import { buildDocuments } from "@/app/lib/takeoff/documents";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { renderQuotationPdf } from "@/app/lib/takeoff/quote-pdf.server";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getQuote, prismaDb, storageReady } from "@/app/lib/takeoff/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin: the quotation PDF of the latest saved version (drafts included). */
export async function GET(req: Request) {
  await requireCatalogueAdmin();
  const id = new URL(req.url).searchParams.get("quote") ?? "";
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) return new Response("Not found", { status: 404 });
  const q = await getQuote(db, id);
  if (!q?.latest) return new Response("Not found", { status: 404 });
  const { company } = await companyProfile();
  const pdf = await renderQuotationPdf(buildDocuments({ customer: q.latest.customer as CustomerTakeoff, input: takeoffInputSchema.parse(q.latest.input), company,
    client: { name: q.quote.clientName, email: q.quote.clientEmail, siteAddress: q.quote.siteAddress }, reference: q.quote.reference, version: q.quote.currentVersion,
    issueDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()) }));
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Quotation ${q.quote.reference}${q.quote.status === "DRAFT" ? " DRAFT" : ""}.pdf"`, "Cache-Control": "private, no-store" } });
}
