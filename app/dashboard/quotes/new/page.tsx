import { prisma } from "@/app/lib/db";
import { requireQuoteAdmin } from "@/app/lib/quotes/access";
import { ConvertButton } from "../QuoteEditor";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function NewQuote({ searchParams }: { searchParams: Promise<{ submission?: string }> }) {
  await requireQuoteAdmin(); const query = await searchParams;
  const id = z.string().uuid().safeParse(query.submission);
  const sources = await prisma.premiumSubmission.findMany({ where: id.success ? { id: id.data } : {}, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, payment: { select: { checkout: { select: { request: { select: { requirements: true } } } } } } } });
  return <div className="space-y-5 p-6"><h1 className="text-3xl font-black">Create a draft quote</h1><p>Choose a paid estimate. Conversion preserves its scope and prices and is safe to repeat.</p>{sources.map(s => { const brief = s.payment.checkout.request.requirements as { contact: { name: string }; postcode: string }; return <div key={s.id} className="rounded-xl border p-5"><p className="mb-3 font-bold">{brief.contact.name} · {brief.postcode}</p><ConvertButton submissionId={s.id} /></div>; })}{!sources.length && <p>No matching paid submissions.</p>}</div>;
}
