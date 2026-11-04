import { viewQuote } from "@/app/lib/quotes/access";
import { renderQuotePdf } from "@/app/lib/quotes/pdf";
import type { CustomerQuote } from "@/app/lib/quotes/calculate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const p = await params; const saved = await viewQuote(p.id, Number(p.version));
  if (!saved) return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const pdf = await renderQuotePdf(saved.customerResult as CustomerQuote, saved.quoteId, saved.version, saved.draft);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="quote-${saved.quoteId}-revision-${saved.version}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
