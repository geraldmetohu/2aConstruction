import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { missingCompanyFields } from "@/app/lib/takeoff/company";
import { DocumentsViewer } from "@/app/componets/takeoff/DocumentsViewer";

export const metadata: Metadata = { title: "Job documents" };
export const dynamic = "force-dynamic";

/** The documents the system writes for this job: quotation, contract, guarantee, construction phase plan, RAMS. */
export default async function JobGeneratedDocuments({ params }: { params: Promise<{ id: string }> }) {
  await requireCatalogueAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success || !(await jobsAvailable())) notFound();
  const job = await loadJob(id);
  if (!job) notFound();
  return (
    <main className="mx-auto max-w-5xl p-6 print:p-0">
      <Link href={`/dashboard/jobs/${id}?tab=documents`} className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 print:hidden">← Back to {job.quote.clientName}</Link>
      <DocumentsViewer docs={job.docs} warnings={missingCompanyFields(job.company)} />
    </main>
  );
}
