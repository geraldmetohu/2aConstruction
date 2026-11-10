import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import type { CustomerTakeoff } from "@/app/lib/takeoff/engine";
import { buildDocuments } from "@/app/lib/takeoff/documents";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { takeoffInputSchema } from "@/app/lib/takeoff/schema";
import { getClientQuote, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { DocumentsViewer } from "@/app/componets/takeoff/DocumentsViewer";

export const metadata: Metadata = { title: "Your quote documents", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Quotation, contract, guarantee and health & safety documents for the version the client can see. */
export default async function ClientDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthSession().getUser();
  if (!user?.email) redirect("/my-quotes");
  if (!z.string().uuid().safeParse(id).success) notFound();
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) notFound();
  const q = await getClientQuote(db, id, user.email);
  if (!q?.version) notFound();
  const { company } = await companyProfile();
  const issued = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(q.version.createdAt));
  const docs = buildDocuments({
    customer: q.version.customer as CustomerTakeoff, input: takeoffInputSchema.parse(q.version.input), company,
    client: { name: q.quote.clientName, email: q.quote.clientEmail, siteAddress: q.quote.siteAddress },
    reference: q.quote.reference, version: q.version.version, issueDate: issued,
  });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 print:p-0">
      <Link href={`/my-quotes/${id}`} className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 print:hidden">← Back to your quote</Link>
      <DocumentsViewer docs={docs} audience="client" />
    </main>
  );
}
