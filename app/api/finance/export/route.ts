import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { loadReportInput } from "@/app/lib/finance/reports.server";
import { transactionsCsv, xeroBillsCsv, xeroSalesCsv } from "@/app/lib/finance/accounting-export";

export const dynamic = "force-dynamic";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const KINDS = { "xero-sales": ["Xero sales invoices", xeroSalesCsv], "xero-bills": ["Xero bills", xeroBillsCsv], transactions: ["Transactions", transactionsCsv] } as const;

/** Accounting exports (admin only): ?kind=xero-sales|xero-bills|transactions&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: Request) {
  try { await requireCatalogueAdmin(); } catch { return new Response("Admins only", { status: 403 }); }
  const u = new URL(req.url);
  const kind = z.enum(["xero-sales", "xero-bills", "transactions"]).safeParse(u.searchParams.get("kind"));
  const from = day.safeParse(u.searchParams.get("from")), to = day.safeParse(u.searchParams.get("to"));
  if (!kind.success || !from.success || !to.success || from.data > to.data) return new Response("Choose what to export and a valid date range.", { status: 400 });
  const input = await loadReportInput();
  const [name, make] = KINDS[kind.data];
  const { csv } = make(input, from.data, to.data);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="2A ${name} ${from.data} to ${to.data}.csv"`, "Cache-Control": "no-store" } });
}
