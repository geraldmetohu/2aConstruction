import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { longDate, type QuoteDocs } from "./documents";

/**
 * The quotation as a PDF (attached to the "your quotation is ready" email). Same content as the
 * Quotation page of the document pack, in the format chosen for the client. The full pack
 * (contract, guarantee, health & safety) stays in the client area.
 */
export async function renderQuotationPdf(d: QuoteDocs): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 55, left: 48, right: 48 }, bufferPages: true, info: { Title: `Quotation ${d.reference}`, Author: d.company.registeredName || d.company.name } });
  doc.registerFont("Body", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Regular.ttf"));
  doc.registerFont("Bold", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Bold.ttf"));
  const out: Buffer[] = [];
  const done = new Promise<Buffer>((res, rej) => { doc.on("data", c => out.push(c)); doc.on("end", () => res(Buffer.concat(out))); doc.on("error", rej); });

  const W = 499, L = 48, ink = "#171717", grey = "#666666", gold = "#c99400";
  const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const room = (h: number) => { if (doc.y + h > doc.page.height - 60) doc.addPage(); };
  const text = (t: string, o: { bold?: boolean; size?: number; color?: string; gap?: number; width?: number; x?: number } = {}) => {
    doc.font(o.bold ? "Bold" : "Body").fontSize(o.size ?? 10).fillColor(o.color ?? ink).text(t, o.x ?? L, doc.y, { width: o.width ?? W, lineGap: 2 });
    doc.moveDown(o.gap ?? 0.3);
  };
  const heading = (t: string) => { room(60); doc.moveDown(0.6); text(t, { bold: true, size: 13 }); doc.moveTo(L, doc.y - 2).lineTo(L + W, doc.y - 2).lineWidth(0.5).strokeColor("#d4d4d4").stroke(); doc.moveDown(0.3); };
  /** Two columns: left text and a right-aligned amount on the same line. */
  const line = (left: string, right: string, o: { bold?: boolean; size?: number; indent?: number } = {}) => {
    room(18);
    const y = doc.y, size = o.size ?? 10, ind = o.indent ?? 0;
    doc.font(o.bold ? "Bold" : "Body").fontSize(size).fillColor(ink);
    doc.text(right, L + W - 110, y, { width: 110, align: "right" });
    const yr = doc.y;
    doc.text(left, L + ind, y, { width: W - 120 - ind, lineGap: 1.5 });
    doc.y = Math.max(doc.y, yr); doc.moveDown(0.2);
  };

  // Header
  const c = d.company;
  doc.font("Bold").fontSize(18).fillColor(ink).text(c.name, L, 50, { width: 260 });
  doc.font("Body").fontSize(8.5).fillColor(grey).text([c.registeredName, c.address, [c.phone, c.email].filter(Boolean).join(" · "), c.website].filter(Boolean).join("\n"), L + 260, 50, { width: W - 260, align: "right" });
  doc.y = Math.max(doc.y, 95);
  doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(2).strokeColor("#f5b400").stroke(); doc.moveDown(0.8);
  text("QUOTATION", { bold: true, size: 9, color: gold, gap: 0.1 });
  text(d.title, { bold: true, size: 18, gap: 0.2 });
  text(`Reference ${d.reference}${d.version > 1 ? ` v${d.version}` : ""} · ${longDate(d.issueDate)} · valid until ${longDate(d.validUntil)}`, { size: 9, color: grey, gap: 0.8 });
  text(`Prepared for: ${d.client.name || "—"}${d.client.address ? `, ${d.client.address.replace(/\n/g, ", ")}` : ""}`, { size: 9.5, gap: 0.1 });
  text(`Site: ${d.client.siteAddress.replace(/\n/g, ", ") || "—"}`, { size: 9.5, gap: 0.8 });

  // Letter & description
  text(d.letter.greeting, { gap: 0.4 });
  for (const p of d.letter.paragraphs) text(p, { gap: 0.5 });
  heading("Description of the works");
  for (const p of d.description) text(p, { gap: 0.4 });

  // Scope & price
  const Lay = d.layout;
  if (Lay) {
    heading(`Scope of works & price${Lay.format === "ITEMISED" ? " – itemised" : ""}`);
    let n = 0;
    for (const g of Lay.groups) {
      room(50);
      doc.save().rect(L, doc.y - 2, W, 18).fill("#f1f1f1").restore();
      line(g.title, gbp(g.net), { bold: true });
      if (g.text) text(g.text, { size: 8.5, color: grey, gap: 0.3 });
      for (const r of g.rows) {
        n++;
        const tags = [r.provisional && "provisional sum", r.vatPercent !== undefined && `${r.vatPercent}% VAT`].filter(Boolean).join(", ");
        line(`${n}. ${r.title}${tags ? ` (${tags})` : ""}`, gbp(r.net), { bold: true, size: 9.5 });
        text(r.text, { size: 9, x: L + 14, width: W - 134, gap: 0.2 });
        if (r.items?.length) {
          for (const i of r.items) {
            const q = `${Number(i.quantity.toFixed(2))} ${i.unit}`;
            if (Lay.format === "ITEMISED") line(`${i.description} – ${q}${i.byClient ? " (supplied by you)" : ` @ ${gbp(i.rate ?? 0)}`}`, i.byClient ? "—" : gbp(i.net ?? 0), { size: 8, indent: 24 });
            else line(`${i.description}${i.byClient ? " (supplied by you)" : ""}`, q, { size: 8, indent: 24 });
          }
        }
        doc.moveDown(0.3);
      }
    }
  } else {
    heading("Price");
    for (const a of d.price.areas) line(a.area, gbp(a.net));
  }
  // Totals
  room(90); doc.moveDown(0.3);
  doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(1).strokeColor(ink).stroke(); doc.moveDown(0.3);
  if (d.price.discount) { line("Subtotal", gbp(d.price.discount.netBeforeDiscount)); line(`Less: ${d.price.discount.label}`, `−${gbp(d.price.discount.amount)}`); }
  line("Total (ex VAT)", gbp(d.price.net), { bold: true });
  const vb = d.price.vatBreakdown && d.price.vatBreakdown.length > 1 ? d.price.vatBreakdown : null;
  if (vb) for (const v of vb) line(`VAT at ${v.percent}% on ${gbp(v.net)}`, gbp(v.vat)); else line("VAT", gbp(d.price.vat));
  line("Total including VAT", gbp(d.price.gross), { bold: true, size: 12 });
  if (Lay?.options.length) {
    heading("Optional extras");
    for (const o of Lay.options) line(o.title, o.chosen ? "Added – included above" : o.price != null ? `${gbp(o.price)} + VAT` : "Price on request", { size: 9.5 });
  }
  if (Lay?.notes) { heading("Notes & provisional sums"); text(Lay.notes, { size: 9.5 }); }

  // Programme & payments
  heading("Programme");
  text(`${d.start ? `Start ${longDate(d.start)}, completion around ${longDate(d.finish!)} – ` : ""}about ${d.workingDays} working days (≈ ${d.weeks} weeks), Monday to Friday excluding bank holidays.`, { size: 9.5 });
  for (const r of d.programme.filter(x => x.days > 0)) line(r.label, r.start ? (r.start === r.end ? longDate(r.start) : `${longDate(r.start)} – ${longDate(r.end!)}`) : `Day ${r.startDay + 1}${r.endDay > r.startDay ? `–${r.endDay + 1}` : ""}`, { size: 8.5 });
  heading("Payment schedule");
  for (const p of d.payments) line(`${p.n}. ${p.label} – ${p.when}${p.date ? ` (due ${longDate(p.date)})` : ""}`, gbp(p.amount), { size: 9 });
  text(`Invoices are payable within ${d.paymentDays} days by bank transfer${c.accountNumber ? ` to ${c.accountName || c.registeredName}, sort code ${c.sortCode}, account ${c.accountNumber}` : ""}.`, { size: 8.5, color: grey });
  if (d.supplies.length) {
    heading("Items you supply");
    for (const s of d.supplies) line(`${s.area}: ${s.item}${s.spec ? ` – ${s.spec}` : ""} (needed ${s.neededBy})`, `${s.quantity} ${s.unit}`, { size: 8.5 });
  }
  heading("Not included");
  for (const x of d.exclusions) text(`• ${x}`, { size: 8.5, gap: 0.1 });
  if (d.assumptions.length) { heading("Assumptions"); for (const x of d.assumptions) text(`• ${x}`, { size: 8.5, gap: 0.1 }); }
  heading("Acceptance");
  text(`This quotation is valid until ${longDate(d.validUntil)} and is subject to our contract terms, ${d.guarantee.years}-year workmanship guarantee and the health & safety documents in your client area. You can accept online in your client area or sign below.`, { size: 9.5, gap: 2 });
  room(40);
  const y = doc.y;
  doc.moveTo(L, y).lineTo(L + 220, y).moveTo(L + 279, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(ink).stroke();
  doc.font("Body").fontSize(8).fillColor(grey).text(`Signed for ${c.registeredName || c.name}`, L, y + 4, { width: 220 }).text("Client signature, name & date", L + 279, y + 4, { width: 220 });

  // Footer
  const count = doc.bufferedPageRange().count;
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i); const b = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font("Body").fontSize(7.5).fillColor(grey).text(`${c.registeredName || c.name}${c.companyNo ? ` · Company no. ${c.companyNo}` : ""}${c.vatNo ? ` · VAT ${c.vatNo}` : ""} · ${d.reference} · Page ${i + 1} of ${count}`, L, doc.page.height - 32, { width: W, align: "center", lineBreak: false });
    doc.page.margins.bottom = b;
  }
  doc.end();
  return done;
}
