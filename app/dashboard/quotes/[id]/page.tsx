import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { quotePolicy, requireQuoteAdmin } from "@/app/lib/quotes/access";
import { catalogueSchema } from "@/app/lib/pricing/schema";
import { quoteDocumentSchema } from "@/app/lib/quotes/schema";
import { deliveryEnabled } from "@/app/lib/delivery/access";
import { QuoteEditor } from "../QuoteEditor";
export const dynamic = "force-dynamic";
export default async function EditQuote({ params }: { params: Promise<{ id: string }> }) {
  await requireQuoteAdmin(); const { id } = await params; if (!z.string().uuid().safeParse(id).success) notFound();
  const quote = await prisma.draftQuote.findUnique({ where: { id }, include: { revisions: { orderBy: { version: "desc" }, include: { release: { select: { id: true } } } } } });
  if (!quote) notFound(); const latest = quote.revisions[0];
  return <div className="mx-auto max-w-7xl space-y-6 p-6"><Link href="/dashboard/quotes">← Quotes</Link><h1 className="text-3xl font-black">Edit quote</h1><details className="rounded-xl border p-4"><summary>Revision history</summary>{quote.revisions.map(r => <p key={r.id} className="mt-2 text-sm"><Link className="underline" href={`/quotes/${id}/${r.version}`}>Revision {r.version}</Link> · {r.createdAt.toISOString().slice(0, 10)} · {r.reason} · {r.release ? "Released" : "Draft"}</p>)}</details>{deliveryEnabled() && <Link className="inline-block rounded-xl border px-4 py-3 font-semibold" href={`/dashboard/delivery-projects/convert/${id}`}>Convert accepted quote to project</Link>}<QuoteEditor key={latest.id} id={id} version={latest.version} initial={quoteDocumentSchema.parse(latest.document)} catalogue={catalogueSchema.parse(quote.catalogueSnapshot)} policy={quotePolicy()} released={!!latest.release} /></div>;
}
