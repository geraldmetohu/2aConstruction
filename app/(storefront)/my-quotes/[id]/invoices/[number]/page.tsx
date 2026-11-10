import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { invoiceFor, jobsAvailable, loadJob } from "@/app/lib/takeoff/jobs.server";
import { InvoiceDocument } from "@/app/componets/takeoff/InvoiceDocument";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

/** A stage invoice, for the client the quote was sent to only. */
export default async function ClientInvoicePage({ params }: { params: Promise<{ id: string; number: string }> }) {
  const { id, number } = await params;
  const user = await getAuthSession().getUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(`/my-quotes/${id}`)}`);
  if (!z.string().uuid().safeParse(id).success || !(await jobsAvailable())) notFound();
  const job = await loadJob(id, { forClient: true });
  if (!job || job.quote.clientEmail !== user.email.trim().toLowerCase() || job.quote.status !== "ACCEPTED") notFound();
  const v = invoiceFor(job, decodeURIComponent(number));
  if (!v) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 print:p-0">
      <Link href={`/my-quotes/${id}?tab=payments`} className="mb-4 inline-block text-sm text-neutral-600 hover:text-neutral-900 print:hidden">← Back to your project</Link>
      <InvoiceDocument d={job.docs} {...v} />
    </main>
  );
}
