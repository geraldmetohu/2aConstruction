import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { longDate, type QuoteDocs } from "./documents";

export interface InvoicePdfInput {
  number: string; label: string; description: string; issuedOn: string; dueOn: string; net: number; vat: number; gross: number;
}
/** The running position on the contract, shown under the invoice. */
export interface InvoiceAccount { contract: number; earlier: { number: string; label: string; issuedOn: string; gross: number }[]; paidToDate?: number }

/**
 * A stage invoice as a PDF (attached to the invoice email for the client and the office copy).
 * Same content as the invoice page in the portal; a tax invoice when the company has a VAT number.
 */
export async function renderInvoicePdf(d: QuoteDocs, inv: InvoicePdfInput, account: InvoiceAccount): Promise<Buffer> {
  const c = d.company, vatInvoice = !!c.vatNo;
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 55, left: 48, right: 48 }, info: { Title: `Invoice ${inv.number}`, Author: c.registeredName || c.name } });
  doc.registerFont("Body", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Regular.ttf"));
  doc.registerFont("Bold", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Bold.ttf"));
  const out: Buffer[] = [];
  const done = new Promise<Buffer>((res, rej) => { doc.on("data", (b: Buffer) => out.push(b)); doc.on("end", () => res(Buffer.concat(out))); doc.on("error", rej); });

  const W = 499, L = 48, ink = "#071a33", grey = "#666666", gold = "#b07f00", rule = "#d4d4d4";
  const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const text = (t: string, o: { bold?: boolean; size?: number; color?: string; gap?: number; width?: number; x?: number; align?: "left" | "right" } = {}) => {
    doc.font(o.bold ? "Bold" : "Body").fontSize(o.size ?? 10).fillColor(o.color ?? ink).text(t, o.x ?? L, doc.y, { width: o.width ?? W, lineGap: 2, align: o.align });
    doc.moveDown(o.gap ?? 0.3);
  };
  const hr = (w = 0.5, color = rule) => { doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(w).strokeColor(color).stroke(); };
  const heading = (t: string) => { doc.moveDown(0.8); text(t, { bold: true, size: 12, gap: 0.15 }); hr(1.2, ink); doc.moveDown(0.4); };
  const row = (left: string, right: string, o: { bold?: boolean; size?: number; color?: string; x?: number; w?: number } = {}) => {
    const y = doc.y, size = o.size ?? 10, x = o.x ?? L, w = o.w ?? W;
    doc.font(o.bold ? "Bold" : "Body").fontSize(size).fillColor(o.color ?? ink);
    doc.text(right, x + w - 120, y, { width: 120, align: "right" });
    const yr = doc.y;
    doc.text(left, x, y, { width: w - 130, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yr); doc.moveDown(0.25);
  };

  // Letterhead
  doc.font("Bold").fontSize(18).fillColor(ink).text(c.name, L, 50, { width: 250 });
  doc.font("Body").fontSize(8.5).fillColor(grey).text([c.registeredName, c.address, [c.phone, c.email].filter(Boolean).join(" · "), c.website].filter(Boolean).join("\n"), L + 250, 50, { width: W - 250, align: "right" });
  doc.y = Math.max(doc.y, 98);
  doc.rect(L, doc.y, W * 0.75, 3).fill(ink); doc.rect(L + W * 0.75, doc.y, W * 0.25, 3).fill("#f5b400");
  doc.y += 18;

  // Title block + details
  const top = doc.y;
  text(vatInvoice ? "TAX INVOICE" : "INVOICE", { bold: true, size: 9, color: gold, gap: 0.1, width: 280 });
  text(d.title, { bold: true, size: 17, gap: 0.15, width: 280 });
  if (d.client.siteAddress) text(`Site: ${d.client.siteAddress.replace(/\n/g, ", ")}`, { size: 9, color: grey, width: 280 });
  const leftEnd = doc.y;
  const details: [string, string][] = [["Invoice no.", inv.number], ["Invoice date", longDate(inv.issuedOn)], ["Due by", longDate(inv.dueOn)], ["Our reference", d.reference], ...(vatInvoice ? [["VAT no.", c.vatNo] as [string, string]] : [])];
  doc.y = top;
  for (const [k, v] of details) {
    const y = doc.y;
    doc.font("Body").fontSize(8.5).fillColor(grey).text(k, L + 320, y, { width: 75 });
    doc.font("Bold").fontSize(8.5).fillColor(ink).text(v, L + 395, y, { width: W - 395, align: "right" });
    doc.moveDown(0.25);
  }
  doc.y = Math.max(doc.y, leftEnd) + 14;

  // Invoice to / amount due
  const boxY = doc.y, boxH = 74;
  doc.roundedRect(L, boxY, W / 2 - 8, boxH, 6).lineWidth(0.6).strokeColor(rule).stroke();
  doc.roundedRect(L + W / 2 + 8, boxY, W / 2 - 8, boxH, 6).fill(ink);
  doc.font("Bold").fontSize(7.5).fillColor(grey).text("INVOICE TO", L + 12, boxY + 10, { width: W / 2 - 30, characterSpacing: 1.2 });
  doc.font("Bold").fontSize(10.5).fillColor(ink).text(d.client.name || "—", L + 12, boxY + 23, { width: W / 2 - 30 });
  doc.font("Body").fontSize(8.5).fillColor(grey).text([d.client.address?.replace(/\n/g, ", "), d.client.email].filter(Boolean).join("\n"), L + 12, doc.y + 1, { width: W / 2 - 30, height: 34, ellipsis: true });
  doc.font("Bold").fontSize(7.5).fillColor("#f5b400").text("AMOUNT DUE", L + W / 2 + 20, boxY + 10, { width: W / 2 - 40, characterSpacing: 1.2 });
  doc.font("Bold").fontSize(22).fillColor("#ffffff").text(gbp(inv.gross), L + W / 2 + 20, boxY + 24, { width: W / 2 - 40 });
  doc.font("Body").fontSize(8.5).fillColor("#c9d1dc").text(`by ${longDate(inv.dueOn)}`, L + W / 2 + 20, boxY + 52, { width: W / 2 - 40 });
  doc.y = boxY + boxH + 6;

  // Details
  heading("Details");
  row("Description", "Amount", { bold: true, size: 8, color: grey });
  hr(); doc.moveDown(0.3);
  const y0 = doc.y;
  doc.font("Bold").fontSize(10).fillColor(ink).text(gbp(inv.net), L + W - 120, y0, { width: 120, align: "right" });
  doc.font("Bold").fontSize(10).fillColor(ink).text(inv.label, L, y0, { width: W - 130 });
  if (inv.description) text(inv.description, { size: 8.5, color: grey, width: W - 130, gap: 0.1 });
  text(`${d.title} – contract ${d.reference}`, { size: 8, color: grey, width: W - 130, gap: 0.4 });
  hr(); doc.moveDown(0.5);
  const tx = L + W - 230;
  row("Net", gbp(inv.net), { x: tx, w: 230 });
  row(`VAT${inv.net > 0 ? ` (${Math.round(inv.vat / inv.net * 1000) / 10}%)` : ""}`, gbp(inv.vat), { x: tx, w: 230 });
  doc.moveTo(tx, doc.y).lineTo(L + W, doc.y).lineWidth(1.5).strokeColor(ink).stroke(); doc.moveDown(0.3);
  row("Total", gbp(inv.gross), { x: tx, w: 230, bold: true, size: 12 });

  // Account
  heading("Your account");
  const earlier = account.earlier.filter(i => i.number !== inv.number && i.issuedOn <= inv.issuedOn);
  row("Contract sum including VAT and approved variations", gbp(account.contract), { size: 9 });
  for (const i of earlier) row(`${i.number} · ${i.label} (${longDate(i.issuedOn)})`, gbp(i.gross), { size: 9, color: grey });
  row(`This invoice – ${inv.number}`, gbp(inv.gross), { size: 9, bold: true });
  if (account.paidToDate !== undefined) row("Paid to date (all invoices)", gbp(account.paidToDate), { size: 9 });
  row("Left to invoice after this one", gbp(Math.max(0, account.contract - earlier.reduce((s, i) => s + i.gross, 0) - inv.gross)), { size: 9 });

  // How to pay
  doc.moveDown(0.8);
  const payY = doc.y, lines: [string, string][] = c.accountNumber
    ? [["Account name", c.accountName || c.registeredName || c.name], ...(c.bankName ? [["Bank", c.bankName] as [string, string]] : []), ["Sort code", c.sortCode], ["Account number", c.accountNumber], ["Payment reference", inv.number]]
    : [["Bank details", "Please call us for our bank details"], ["Payment reference", inv.number]];
  const payH = 30 + lines.length * 14 + 26;
  if (payY + payH > doc.page.height - 70) doc.addPage();
  const py = doc.y;
  doc.roundedRect(L, py, W, payH, 6).lineWidth(1.4).strokeColor(ink).stroke();
  doc.font("Bold").fontSize(10.5).fillColor(ink).text("How to pay", L + 14, py + 12);
  let ly = py + 30;
  for (const [k, v] of lines) { doc.font("Body").fontSize(9).fillColor(grey).text(k, L + 14, ly, { width: 120 }); doc.font("Bold").fontSize(9).fillColor(ink).text(v, L + 140, ly, { width: W - 160 }); ly += 14; }
  doc.font("Body").fontSize(8).fillColor(grey).text(`Payable within ${d.paymentDays} days by bank transfer. We will never change our bank details by email – if in doubt, call us before paying. Tell us once you've paid in your client area.`, L + 14, ly + 4, { width: W - 28 });
  doc.y = py + payH + 10;

  // Footer
  const foot = [c.registeredName || c.name, c.companyNo ? `Registered in England & Wales no. ${c.companyNo}` : "", c.vatNo ? `VAT no. ${c.vatNo}` : ""].filter(Boolean).join(" · ");
  const b = doc.page.margins.bottom; doc.page.margins.bottom = 0; // the footer sits in the bottom margin
  doc.font("Body").fontSize(7.5).fillColor(grey).text(foot, L, doc.page.height - 40, { width: W, align: "center", lineBreak: false });
  doc.page.margins.bottom = b;

  doc.end();
  return done;
}
