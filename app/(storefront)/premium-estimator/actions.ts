"use server";

// Online card payments for estimates have been removed. Kept so any old page still loaded in a browser gets a clear answer.
export async function startPremiumCheckout(_raw: string, _key: string, _reviewedVersion: string) {
  void _raw; void _key; void _reviewedVersion;
  return { ok: false as const, message: "Paid estimates are no longer offered. Please use our free instant estimate or contact us for a site visit." };
}
