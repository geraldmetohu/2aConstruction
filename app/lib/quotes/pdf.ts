import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import type { CustomerQuote } from "./calculate";
export async function renderQuotePdf(quote: CustomerQuote, reference: string, version: number, draft: boolean): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 80, bottom: 55, left: 48, right: 48 }, bufferPages: true, autoFirstPage: false, info: { Title: `${quote.title} - revision ${version}`, Author: "2A Construction", Subject: draft ? "Draft quote - not released" : "Construction quote" } });
  doc.registerFont("Body", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Regular.ttf"));
  doc.registerFont("Bold", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Bold.ttf"));
  const buffers: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => buffers.push(chunk)); doc.on("end", () => resolve(Buffer.concat(buffers))); doc.on("error", reject); });
  doc.on("pageAdded", () => {
    doc.save().rect(0, 0, doc.page.width, 56).fill("#171717").restore();
    doc.font("Bold").fontSize(15).fillColor("#ffffff").text("2A CONSTRUCTION", 48, 22, { lineBreak: false });
    doc.font("Body").fontSize(9).text(`${draft ? "DRAFT | " : ""}Revision ${version}`, 390, 26, { width: 157, align: "right", lineBreak: false });
    doc.fillColor("#171717"); doc.x = 48; doc.y = 80;
  });
  doc.addPage();
  const paragraph = (text: string, bold = false, size = 10.5) => { doc.font(bold ? "Bold" : "Body").fontSize(size).fillColor("#171717").text(text, { width: 499, lineGap: 3 }); doc.moveDown(0.45); };
  const room = (height: number) => { if (doc.y + height > doc.page.height - 55) doc.addPage(); };
  const money = (value: string) => `£${new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
  paragraph(quote.title, true, 22);
  paragraph(`${draft ? "DRAFT - not released to customer" : "Customer quote"}\nReference: ${reference}\nRevision: ${version} | Valid until: ${quote.validUntil}`, false, 9);
  paragraph(quote.customerName, true, 12); paragraph(`${quote.customerEmail}\n${quote.address}`);
  let group = "";
  for (const line of quote.lines) {
    const nextGroup = [line.section, line.room, line.stage].filter(Boolean).join(" / ");
    if (nextGroup !== group) { room(90); paragraph(nextGroup || "Scope", true, 13); group = nextGroup; }
    room(65); paragraph(line.description, true);
    if (typeof line.gross === "string") {
      paragraph(`${line.quantity} ${line.unit} | ${line.includedInTotal ? "Included" : "Optional - excluded from main total"}\nNet ${money(line.net!)} | VAT ${line.vatRate}%: ${money(line.vat!)} | Total ${money(line.gross)}`, false, 9.5);
    } else paragraph(`${line.reason === "Excluded from scope" ? "Excluded" : "Unpriced - requires assessment"}: ${line.reason}`, false, 9.5);
    doc.moveDown(0.4);
  }
  room(125); paragraph("Price summary", true, 14);
  paragraph(`Net: ${money(quote.totals.net)}\nVAT: ${money(quote.totals.vat)}\nIncluded total: ${money(quote.totals.gross)}`, true, 12);
  if (Number(quote.optionalTotals.gross) > 0) paragraph(`Optional work: ${money(quote.optionalTotals.gross)} including VAT, separate from the included total.`);
  for (const [title, values] of [["Assumptions", quote.assumptions], ["Exclusions", quote.exclusions]] as const) {
    if (values.length) { room(60); paragraph(title, true, 13); for (const text of values) paragraph(`- ${text}`); }
  }
  if (quote.terms) { room(60); paragraph("Terms", true, 13); paragraph(quote.terms); }
  if (quote.hasUnpricedRequirements) paragraph("Unpriced requirements are not included in the total and need review.");
  const count = doc.bufferedPageRange().count;
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i); const bottom = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font("Body").fontSize(8).fillColor("#666666").text(`2A Construction | Revision ${version} | Page ${i + 1} of ${count}`, 48, doc.page.height - 30, { width: 499, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }
  doc.end(); return complete;
}
