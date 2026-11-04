"use server";

// Online card payments for estimates have been removed. Kept so any old page still loaded in a browser gets a clear answer.
type CheckoutResult = { ok: true; url: string } | { ok: false; message: string; needsLogin?: boolean };
export async function startPremiumCheckout(_raw: string, _key: string, _reviewedVersion: string): Promise<CheckoutResult> {
  void _raw; void _key; void _reviewedVersion;
  return { ok: false, message: "Paid estimates are no longer offered. Please use our free instant estimate or contact us for a site visit." };
}
