import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { canonicalJson } from "@/app/lib/pricing/engine";
import { entries, invoiceTotals } from "@/app/lib/project-management/state";
import type { Workspace } from "@/app/lib/project-management/service";
import type { CustomerQuote } from "@/app/lib/quotes/calculate";
import type { PublicationInput } from "./schema";
import { PortalError } from "./schema";
export const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
export type FileInfo = { id: string; kind: string; mimeType: string; filename: string; byteLength: number };
export function projectForCustomer(w: Workspace, input: PublicationInput, quote: CustomerQuote, approvedKeys: string[], files: FileInfo[]) {
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (![input.fileIds, input.variationIds, input.invoiceIds, input.snagIds].every(unique)) throw new PortalError("Choose each shared item once.");
  const selectedFiles = input.fileIds.map(id => {
    const asset = files.find(f => f.id === id), entry = w.state.find(e => (e.kind === "PHOTO" || e.kind === "DOCUMENT") && e.body.assetId === id);
    if (!asset || !entry || (entry.kind !== "PHOTO" && entry.kind !== "DOCUMENT")) throw new PortalError("Choose files attached to this project.");
    return { id: asset.id, kind: asset.kind, title: entry.body.title, filename: asset.filename, mimeType: asset.mimeType, byteLength: asset.byteLength };
  });
  const variations = input.variationIds.map(id => {
    const e = entries(w.state, "VARIATION").find(v => v.id === id); if (!e) throw new PortalError("Choose a variation from this project.");
    const vat = new Prisma.Decimal(e.body.net).times(e.body.vatRate).div(100).toDecimalPlaces(2);
    return { id: e.id, title: e.body.title, description: e.body.description, status: e.body.status, net: new Prisma.Decimal(e.body.net).toFixed(2), vat: vat.toFixed(2), gross: new Prisma.Decimal(e.body.net).plus(vat).toFixed(2), vatRate: e.body.vatRate, sourceHash: hash(e.body) };
  });
  const invoices = input.invoiceIds.map(id => {
    const e = entries(w.state, "INVOICE").find(v => v.id === id); if (!e || e.body.status !== "ISSUED") throw new PortalError("Only issued invoices can be shared.");
    const balance = w.financials.invoices.find(i => i.id === id)!;
    return { id: e.id, title: e.body.title, issueDate: e.body.issueDate, dueDate: e.body.dueDate, lines: e.body.lines.map(l => ({ description: l.description, quantity: l.quantity, unitNet: l.unitNet, vatRate: l.vatRate })), ...invoiceTotals(e.body), paid: balance.paid, outstanding: balance.outstanding, status: balance.status };
  });
  const reversed = new Set(entries(w.state, "PAYMENT_REVERSAL").map(e => e.body.paymentId));
  const payments = entries(w.state, "PAYMENT").filter(e => input.invoiceIds.includes(e.body.invoiceId) && !reversed.has(e.id)).map(e => ({ id: e.id, invoiceId: e.body.invoiceId, amount: e.body.amount, date: e.body.date, method: e.body.method }));
  const tasks = w.base.tasks.map(t => { const live = entries(w.state, "TASK").find(e => e.id === t.id)!; return { id: t.id, description: t.description, stage: t.stageName, room: t.roomName, status: live.body.status, progress: live.body.progress }; });
  const schedule = input.shareSchedule ? entries(w.state, "SCHEDULE").flatMap(e => { const t = tasks.find(t => t.id === e.body.taskId); return t ? [{ task: t.description, start: e.body.start, end: e.body.end }] : []; }) : [];
  // Build every public object explicitly. Internal notes, costs, wages, actors and evidence never pass through.
  return {
    projectId: w.base.id, title: input.title, introduction: input.introduction, address: w.base.scope.address,
    status: entries(w.state, "PROJECT")[0].body.status,
    progress: { percent: w.progress.percent, completed: w.progress.completed, total: w.progress.total, stages: w.progress.stages.map(s => ({ name: w.base.stages.find(b => b.id === s.id)?.name ?? s.name, progress: Math.round(s.progress) })) },
    scope: { tasks, assumptions: [...quote.assumptions], exclusions: [...quote.exclusions], terms: quote.terms },
    quote: { title: quote.title, lines: quote.lines.filter(l => approvedKeys.includes(l.key)).map(l => ({ description: l.description, quantity: l.quantity, unit: l.unit, net: l.net, vat: l.vat, gross: l.gross, room: l.room, stage: l.stage })), net: w.base.baseline.net, vat: w.base.baseline.vat, gross: w.base.baseline.gross },
    contractGross: w.financials.contractGross, scheduleShared: input.shareSchedule, schedule, variations, invoices, payments, files: selectedFiles,
    snags: input.snagIds.map(id => { const snag = entries(w.state, "SNAG").find(s => s.id === id); if (!snag) throw new PortalError("Choose a snag from this project."); return { id, title: snag.body.title, status: snag.body.status, priority: snag.body.priority, room: w.base.rooms.find(r => r.id === snag.body.roomId)?.name ?? "Project area" }; }),
    // Internal snag descriptions and resolution notes are not automatically shared.
    snagSummary: { total: entries(w.state, "SNAG").length, completed: entries(w.state, "SNAG").filter(e => ["COMPLETED", "VERIFIED"].includes(e.body.status)).length },
  };
}
export type PublicProject = ReturnType<typeof projectForCustomer>;
