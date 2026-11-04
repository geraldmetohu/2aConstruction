import Link from "next/link";
import { notFound } from "next/navigation";
import { viewQuote } from "@/app/lib/quotes/access";
import type { CustomerQuote } from "@/app/lib/quotes/calculate";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your construction quote", robots: { index: false, follow: false } };
import { CustomerQuoteView } from "../../CustomerQuoteView";
export default async function QuotePage({ params }: { params: Promise<{ id: string; version: string }> }) {
  const p = await params; const saved = await viewQuote(p.id, Number(p.version)); if (!saved) notFound();
  return <><CustomerQuoteView quote={saved.customerResult as CustomerQuote} reference={p.id} version={saved.version} draft={saved.draft} /><div className="mx-auto max-w-4xl px-4 pb-12"><Link className="rounded-full bg-neutral-950 px-6 py-3 font-bold text-white" href={`/api/quotes/${p.id}/${saved.version}/pdf`}>Download this revision as PDF</Link></div></>;
}
