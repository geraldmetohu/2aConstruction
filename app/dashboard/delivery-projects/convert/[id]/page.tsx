import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { requireDeliveryAdmin } from "@/app/lib/delivery/access";
import { projectPlan } from "@/app/lib/delivery/plan";
import { QuoteResult } from "@/app/lib/quotes/calculate";
import { ConversionForm } from "../../ConversionForm";
export const dynamic = "force-dynamic";
export default async function ConvertPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDeliveryAdmin(); const { id } = await params; if (!z.string().uuid().safeParse(id).success) notFound();
  const existing = await prisma.acceptedQuote.findUnique({ where: { quoteId: id }, include: { project: { select: { id: true, name: true } } } });
  if (existing?.project) return <div className="p-8"><h1 className="text-2xl font-bold">Project already created</h1><Link className="mt-4 inline-block underline" href={`/dashboard/delivery-projects/${existing.project.id}`}>{existing.project.name}</Link></div>;
  const revision = await prisma.quoteRevision.findFirst({ where: { quoteId: id }, orderBy: { version: "desc" }, include: { quote: true, release: true } });
  if (!revision) notFound();
  if (!revision.release) return <div className="p-8"><h1 className="text-2xl font-bold">Release the quote first</h1><p className="mt-3">Only a released quote with recorded customer acceptance can become a project.</p><Link className="mt-4 inline-block underline" href={`/dashboard/quotes/${id}`}>Review quote</Link></div>;
  const result = revision.result as unknown as QuoteResult;
  // Verify using all priced optional lines so an optional-only quote can be reviewed.
  const optional = result.internalLines.flatMap(e => { const l = e.result.lines[0]; return l.priced && l.inclusion === "OPTIONAL" ? [{ key: e.key, description: e.presentation.description, gross: l.gross }] : []; });
  projectPlan(result, revision.snapshotHash, optional.map(o => o.key));
  const baseGross = result.internalLines.reduce((sum, e) => { const l = e.result.lines[0]; return sum.plus(l.priced && l.inclusion === "INCLUDED" ? l.gross : "0"); }, new Prisma.Decimal(0)).toFixed(2);
  const clients = await prisma.client.findMany({ where: { OR: [{ userId: revision.quote.ownerId }, { email: { equals: result.customer.customerEmail.trim(), mode: "insensitive" } }] }, select: { id: true, fullName: true, email: true }, orderBy: { createdAt: "asc" } });
  return <div className="mx-auto max-w-3xl space-y-6 p-6"><Link href={`/dashboard/quotes/${id}`} className="text-sm underline">← Quote</Link><h1 className="text-3xl font-black">Convert accepted quote</h1><ConversionForm quoteId={id} revisionId={revision.id} version={revision.version} title={result.customer.title} customerName={result.customer.customerName} releasedAt={revision.release.createdAt.toISOString()} validUntil={result.customer.validUntil} baseGross={baseGross} optional={optional} clients={clients} /></div>;
}
