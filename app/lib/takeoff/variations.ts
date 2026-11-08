// Variations (change orders) after the client accepts: extra or changed work priced by the office,
// approved or declined by the client in their portal. Stored as job requests of kind "VARIATION";
// the price is written in the first line of the request so the record reads on its own.

const PRICE = /^Price: £([\d,]+(?:\.\d{1,2})?) \+ VAT at (\d+(?:\.\d+)?)% = £([\d,]+(?:\.\d{1,2})?)/;
const num = (s: string) => Number(s.replace(/,/g, ""));
const r2 = (x: number) => Math.round(x * 100) / 100;
const gbp = (x: number) => x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const variationDetail = (net: number, vatPercent: number, description: string) =>
  `Price: £${gbp(net)} + VAT at ${vatPercent}% = £${gbp(r2(net * (1 + vatPercent / 100)))} including VAT${description.trim() ? `\n\n${description.trim()}` : ""}`;

export function variationPrice(detail: string): { net: number; vatPercent: number; gross: number } | null {
  const m = PRICE.exec(detail);
  return m ? { net: num(m[1]), vatPercent: Number(m[2]), gross: num(m[3]) } : null;
}

export const isApproved = (a: { kind: string; response: string | null; status: string }) => a.kind === "VARIATION" && a.status !== "CANCELLED" && /^APPROVED/.test(a.response ?? "");
export const isDeclined = (a: { kind: string; response: string | null }) => a.kind === "VARIATION" && /^DECLINED/.test(a.response ?? "");

/** Approved variations: each one's price, and the totals to add to the contract sum. */
export function approvedVariations<A extends { kind: string; title: string; detail: string; response: string | null; status: string; respondedAt?: string | Date | null }>(actions: A[]) {
  const list = actions.filter(isApproved).map(a => ({ action: a, price: variationPrice(a.detail) })).filter((x): x is { action: A; price: NonNullable<ReturnType<typeof variationPrice>> } => !!x.price);
  return { list, net: r2(list.reduce((s, x) => s + x.price.net, 0)), gross: r2(list.reduce((s, x) => s + x.price.gross, 0)) };
}
