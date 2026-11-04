import Link from "next/link";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { quoteEnabled } from "@/app/lib/quotes/access";
export const dynamic = "force-dynamic";
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCatalogueAdmin();
  if (!quoteEnabled()) return <div className="p-8"><h1 className="text-3xl font-bold">Quotes</h1><p className="mt-3">The quote builder is not enabled yet. No database query was made.</p></div>;
  const page = Math.max(1, Math.min(10000, Number.parseInt((await searchParams).page ?? "1", 10) || 1));
  const quotes = await prisma.draftQuote.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 31, include: { revisions: { orderBy: { version: "desc" }, take: 1, select: { version: true, customerResult: true, release: { select: { id: true } } } } } });
  return <div className="space-y-5 p-6"><h1 className="text-3xl font-black">Quote builder</h1><Link className="inline-block rounded-lg bg-neutral-950 px-4 py-3 text-white" href="/dashboard/quotes/new">Create from paid estimate</Link>{quotes.slice(0, 30).map(q => { const r = q.revisions[0]; const c = r.customerResult as { title: string; customerName: string }; return <Link key={q.id} className="block rounded-xl border p-5" href={`/dashboard/quotes/${q.id}`}><strong>{c.title}</strong><p>{c.customerName} · Revision {r.version} · {r.release ? "Released" : "Draft"}</p></Link>; })}{!quotes.length && <p>No quotes yet.</p>}<div className="flex gap-5">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}{quotes.length > 30 && <Link href={`?page=${page + 1}`}>Next</Link>}</div></div>;
}
