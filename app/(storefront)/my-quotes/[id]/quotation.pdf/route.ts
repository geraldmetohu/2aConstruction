import { getAuthSession } from "@/app/lib/auth/session.server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import type { CustomerTakeoff } from "@/app/lib/takeoff/engine";
import { buildDocuments } from "@/app/lib/takeoff/documents";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { renderQuotationPdf } from "@/app/lib/takeoff/quote-pdf.server";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getClientQuote, prismaDb, storageReady } from "@/app/lib/takeoff/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The quotation PDF for the version the signed-in client can see. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthSession().getUser();
  if (!user?.email) return new Response("Please sign in.", { status: 401 });
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) return new Response("Not found", { status: 404 });
  const q = await getClientQuote(db, id, user.email);
  if (!q?.version) return new Response("Not found", { status: 404 });
  const { company } = await companyProfile();
  const issued = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(q.version.createdAt));
  const pdf = await renderQuotationPdf(buildDocuments({ customer: q.version.customer as CustomerTakeoff, input: takeoffInputSchema.parse(q.version.input), company,
    client: { name: q.quote.clientName, email: q.quote.clientEmail, siteAddress: q.quote.siteAddress }, reference: q.quote.reference, version: q.version.version, issueDate: issued }));
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Quotation ${q.quote.reference}.pdf"`, "Cache-Control": "private, no-store" } });
}
