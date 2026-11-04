import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { premiumEnabled } from "@/app/lib/premium/server";
import { requirementsSchema } from "@/app/lib/premium/requirements";
import Link from "next/link";
import { quoteEnabled } from "@/app/lib/quotes/access";
export const dynamic = "force-dynamic";
export default async function PremiumEstimates({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCatalogueAdmin();
  if (!premiumEnabled() && process.env.PREMIUM_ESTIMATOR_STORAGE_READY !== "true") return <div className="p-8"><h1 className="text-2xl font-bold">Premium estimates</h1><p className="mt-4">Premium storage is not enabled. No database query was made.</p></div>;
  const query = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const payments = await prisma.premiumPayment.findMany({ orderBy: { recordedAt: "desc" }, skip: (page - 1) * 30, take: 31, include: { checkout: { include: { request: { select: { id: true, requirements: true } } } }, submission: { select: { id: true, requiresReview: true, reviewReasons: true } } } });
  return <div className="p-6"><h1 className="text-3xl font-black">Premium estimates</h1><p className="mt-3 text-neutral-600">Paid submissions and review flags. No project is created automatically.</p><div className="mt-6 space-y-4">{payments.slice(0, 30).map(payment => {
    const brief = requirementsSchema.parse(payment.checkout.request.requirements);
    const reasons = payment.submission?.reviewReasons as string[] | undefined;
    return <article key={payment.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{brief.contact.name} · {brief.postcode}</h2><span className="text-sm font-bold">{!payment.submission ? "Paid · generation pending" : payment.submission.requiresReview ? "Needs review" : "Estimate generated"}</span></div><p className="mt-2 text-sm">{brief.contact.email} · {brief.contact.phone || "No phone supplied"}</p><p className="mt-2 break-all text-xs text-neutral-500">Reference {payment.checkout.request.id} · Fee £50 paid</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{reasons?.map((r, i) => <li key={i}>{r}</li>)}</ul>{brief.specialRequests && <p className="mt-3 whitespace-pre-wrap text-sm">Special requests: {brief.specialRequests}</p>}{payment.submission && quoteEnabled() && <Link className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm font-semibold" href={`/dashboard/quotes/new?submission=${payment.submission.id}`}>Create / open draft quote</Link>}</article>;
  })}{payments.length === 0 && <p className="rounded-2xl border p-8 text-neutral-500">No paid premium estimates yet.</p>}</div><div className="mt-6 flex gap-5">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}{payments.length > 30 && <Link href={`?page=${page + 1}`}>Next</Link>}</div></div>;
}
