import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { premiumOwner } from "@/app/lib/premium/server";
import { customerEstimate } from "@/app/lib/pricing/engine";
import { RefreshStatus } from "./RefreshStatus";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your premium estimate", robots: { index: false, follow: false } };
const pounds = (n: string) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default async function PremiumResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ownerId = await premiumOwner();
  if (!ownerId) redirect(`/api/auth/login?post_login_redirect_url=${encodeURIComponent(`/premium-estimator/result/${id}`)}`);
  const request = await prisma.premiumRequest.findFirst({ where: { id, ownerId }, select: { id: true, expiresAt: true, checkout: { select: { payment: { select: { amountPence: true, submission: { select: { customerResult: true, requiresReview: true } } } } } } } });
  if (!request) notFound();
  const payment = request.checkout?.payment;
  const submission = payment?.submission;
  const result = submission?.customerResult as ReturnType<typeof customerEstimate> | undefined;
  return <main className="min-h-screen bg-neutral-50 px-4 py-14"><div className="mx-auto max-w-4xl"><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">Premium estimator</p><h1 className="mt-3 text-4xl font-black">{result ? "Your indicative estimate" : payment ? "Payment received" : "Confirming your payment"}</h1><p className="mt-3 text-sm text-neutral-500">Reference: {request.id}</p>
    {!result ? <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-7"><p>{payment ? "Your £50 payment is recorded. We are preparing the estimate from your saved scope. Please do not pay again." : "We have not yet received a verified payment confirmation. Returning from checkout does not itself confirm payment."}</p><RefreshStatus /><p className="mt-5 text-sm text-neutral-600">If payment was taken and this status does not change, <Link href="/contact" className="underline">contact us</Link> with the reference above.</p><Link href="/premium-estimator" className="mt-5 inline-block font-semibold underline">Return to your scope</Link></section>
    : <><div className="mt-7 grid gap-4 sm:grid-cols-2"><section className="rounded-3xl bg-neutral-950 p-7 text-white"><p className="text-sm text-neutral-300">Priced scope total, including VAT</p><p className="mt-2 text-4xl font-black">{pounds(result.totals.gross)}</p><p className="mt-3 text-sm text-neutral-400">Net {pounds(result.totals.net)} + VAT {pounds(result.totals.vat)}</p></section><section className="rounded-3xl border border-neutral-200 bg-white p-7"><p className="font-bold">Estimate fee paid: £50</p><p className="mt-3 text-sm leading-6 text-neutral-600">The estimate fee is separate from construction costs. This is an indicative estimate, not a final quote or a booking for construction work.</p></section></div>
    {(submission?.requiresReview || result.hasUnpricedRequirements) && <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Your scope has been flagged for our team to review. Items marked “To confirm” and special requests are excluded from the priced total. A survey and agreed quote are required before work starts.</p>}
    <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white"><h2 className="border-b px-6 py-5 text-xl font-black">Your scope</h2><ul className="divide-y">{result.lines.map(line => <li key={line.key} className="flex flex-wrap justify-between gap-3 px-6 py-5"><div><p className="font-bold">{line.description}</p>{"net" in line ? <p className="mt-1 text-sm text-neutral-500">{line.room} · {line.quantity} {line.unit}{!line.includedInTotal ? " · Optional, separate from total" : ""}</p> : <p className="mt-1 text-sm text-amber-800">{line.reason}</p>}</div><p className="font-bold">{typeof line.gross === "string" ? `${pounds(line.gross)} inc. VAT` : "To confirm"}</p></li>)}</ul></section>
    {Number(result.optionalTotals.gross) > 0 && <p className="mt-5 rounded-2xl bg-white p-5 font-bold">Optional extras: {pounds(result.optionalTotals.gross)} including VAT — excluded from the main total.</p>}
    {result.assumptions.length > 0 && <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6"><h2 className="font-bold">Assumptions to confirm</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-600">{result.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></section>}
    <Link className="mt-7 inline-block rounded-full bg-neutral-950 px-6 py-3 font-bold text-white" href="/contact">Discuss this estimate</Link></>}
  </div></main>;
}
