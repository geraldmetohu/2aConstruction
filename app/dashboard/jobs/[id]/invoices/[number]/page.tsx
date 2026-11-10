import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { invoiceFor, jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { InvoiceDocument } from "@/app/componets/takeoff/InvoiceDocument";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function JobInvoicePage({ params }: { params: Promise<{ id: string; number: string }> }) {
  await requireCatalogueAdmin();
  const { id, number } = await params;
  if (!z.string().uuid().safeParse(id).success || !(await jobsAvailable())) notFound();
  const job = await loadJob(id);
  if (!job) notFound();
  const v = invoiceFor(job, decodeURIComponent(number));
  if (!v) notFound();
  return (
    <main className="mx-auto max-w-5xl p-6 print:p-0">
      <Link href={`/dashboard/jobs/${id}?tab=money`} className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 print:hidden">← Back to {job.quote.clientName}</Link>
      <InvoiceDocument d={job.docs} {...v} />
    </main>
  );
}
