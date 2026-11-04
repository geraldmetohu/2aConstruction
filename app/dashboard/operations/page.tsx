import Link from "next/link";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { managementEnabled } from "@/app/lib/project-management/access";
import { loadProject } from "@/app/lib/project-management/service";
import { summarizeProjects } from "@/app/lib/project-management/overview";
import { londonDate } from "@/app/lib/company-settings/defaults";
export const dynamic = "force-dynamic";
export default async function Operations({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCatalogueAdmin();
  if (!managementEnabled()) return <main className="p-6"><h1 className="text-3xl font-black">Operations overview</h1><p className="mt-4">Project management is not enabled yet.</p></main>;
  const query = await searchParams, page = Math.max(1, Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1));
  const data = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [estimates, review, quotes, projects, rows] = await Promise.all([tx.premiumSubmission.count(), tx.premiumSubmission.count({ where: { requiresReview: true } }), tx.draftQuote.count(), tx.deliveryProject.count(), tx.deliveryProject.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 26, select: { id: true } })]);
    const workspaces = [];
    for (const p of rows.slice(0, 25)) workspaces.push(await loadProject(tx, p.id));
    return { estimates, review, quotes, projects, workspaces, next: rows.length > 25 };
  }, { isolationLevel: "RepeatableRead", timeout: 60000 });
  const totals = summarizeProjects(data.workspaces, londonDate()), money = (value: string) => `£${Number(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <main className="mx-auto max-w-7xl space-y-6 p-6"><header><h1 className="text-3xl font-black">Operations overview</h1><p className="mt-3">Read-only summary of the new estimating and delivery system. Legacy projects remain in their existing dashboard.</p></header><div className="grid gap-4 sm:grid-cols-4">{[["Paid estimates", data.estimates], ["Estimates flagged for review", data.review], ["Quote drafts", data.quotes], ["Delivery projects", data.projects]].map(([label, value]) => <section key={label} className="rounded-2xl border p-5"><p className="text-sm">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></section>)}</div><h2 className="text-xl font-bold">Projects on this page · page {page}</h2><p className="text-sm text-neutral-600">The figures below cover these {data.workspaces.length} projects only. Contract and invoice totals include VAT; recorded costs exclude VAT. Recorded costs are not a forecast of final costs.</p><div className="grid gap-4 sm:grid-cols-3">{[["Active", totals.active], ["At least 80% complete", totals.nearingCompletion], ["Variations awaiting approval", totals.proposedVariations], ["Overdue unpaid invoices", totals.overdueInvoices], ["Contract value", money(totals.contractGross)], ["Invoiced", money(totals.invoiceGross)], ["Received", money(totals.received)], ["Outstanding", money(totals.outstanding)], ["Recorded net costs", money(totals.actualCostNet)]].map(([label, value]) => <section key={label} className="rounded-xl bg-neutral-50 p-4"><p className="text-sm">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></section>)}</div>{data.workspaces.map(w => <Link key={w.base.id} href={`/dashboard/delivery-projects/${w.base.id}/manage`} className="block rounded-xl border p-4"><strong>{w.base.name}</strong><p className="mt-2 text-sm">{w.progress.percent}% complete · {money(w.financials.outstanding)} outstanding</p></Link>)}<nav className="flex gap-5">{page > 1 && <Link href={`?page=${page - 1}`}>Previous page</Link>}{data.next && <Link href={`?page=${page + 1}`}>Next page</Link>}</nav></main>;
}
