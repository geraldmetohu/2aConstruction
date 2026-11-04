import { Prisma } from "@prisma/client";
import { Entry, Kind, ManagementError, parseEntry } from "./schema";
const D = Prisma.Decimal;
export type Base = {
  id: string; name: string; scope: { assumptions: string[]; exclusions: string[]; terms: string; address: string };
  baseline: { net: string; vat: string; gross: string; costSubtotal: string; personHours: string; costs: Record<string, string> };
  taxRates: string[];
  stages: { id: string; name: string }[]; rooms: { id: string; name: string }[];
  tasks: { id: string; description: string; stageName: string; roomName: string }[];
  requirements: { id: string; taskId: string; kind: string; description: string; quantity: string | null; unit: string; supplyBy: string; needsReview: boolean }[];
};
export type State = Entry[];
export function entries<K extends Kind>(state: State, kind: K): Extract<Entry, { kind: K }>[] { return state.filter(e => e.kind === kind) as Extract<Entry, { kind: K }>[]; }
export function initialState(base: Base): State {
  return [parseEntry("PROJECT", base.id, { status: "PLANNED" }), ...base.stages.map(s => parseEntry("STAGE", s.id, { name: s.name, weight: 1 })), ...base.rooms.map(r => parseEntry("ROOM", r.id, { name: r.name })), ...base.tasks.map(t => parseEntry("TASK", t.id, { description: t.description, stageId: base.stages.find(s => s.name === t.stageName)!.id, roomId: base.rooms.find(r => r.name === t.roomName)!.id, status: "PLANNED", progress: 0, weight: 1 }))];
}
export function replay(base: Base, history: { kind: string; entityId: string; body: unknown }[]): State {
  const map = new Map(initialState(base).map(e => [e.id, e]));
  for (const event of history) map.set(event.entityId, parseEntry(event.kind as Kind, event.entityId, event.body));
  return [...map.values()];
}
export function invoiceTotals(body: Extract<Entry, { kind: "INVOICE" }>["body"]) {
  let net = new D(0), vat = new D(0);
  for (const l of body.lines) { const n = new D(l.quantity).times(l.unitNet).toDecimalPlaces(2); net = net.plus(n); vat = vat.plus(n.times(l.vatRate).div(100).toDecimalPlaces(2)); }
  return { net: net.toFixed(2), vat: vat.toFixed(2), gross: net.plus(vat).toFixed(2) };
}
export function labourTotals(body: Extract<Entry, { kind: "LABOUR" }>["body"]) {
  const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const workedMinutes = minutes(body.end) - minutes(body.start) - body.breakMinutes;
  return { minutes: workedMinutes, hours: new D(workedMinutes).div(60).toFixed(6), cost: new D(workedMinutes).div(60).times(body.hourlyRate).toFixed(2) };
}
export function finances(base: Base, state: State) {
  const variations = entries(state, "VARIATION").filter(e => e.body.status === "APPROVED");
  const variationNet = variations.reduce((n, e) => n.plus(e.body.net), new D(0));
  const variationVAT = variations.reduce((n, e) => n.plus(new D(e.body.net).times(e.body.vatRate).div(100).toDecimalPlaces(2)), new D(0));
  const net = new D(base.baseline.net).plus(variationNet), gross = new D(base.baseline.gross).plus(variationNet).plus(variationVAT);
  const reversed = new Set(entries(state, "PAYMENT_REVERSAL").map(e => e.body.paymentId));
  const payments = entries(state, "PAYMENT").filter(e => !reversed.has(e.id));
  const invoices = entries(state, "INVOICE").filter(e => e.body.status === "ISSUED").map(e => { const totals = invoiceTotals(e.body); const paid = payments.filter(p => p.body.invoiceId === e.id).reduce((n, p) => n.plus(p.body.amount), new D(0)); return { id: e.id, ...totals, paid: paid.toFixed(2), outstanding: new D(totals.gross).minus(paid).toFixed(2), status: paid.eq(totals.gross) ? "PAID" : paid.gt(0) ? "PART_PAID" : "UNPAID" }; });
  const invoiceNet = invoices.reduce((n, e) => n.plus(e.net), new D(0)), invoiceGross = invoices.reduce((n, e) => n.plus(e.gross), new D(0));
  const received = payments.reduce((n, e) => n.plus(e.body.amount), new D(0));
  const logs = entries(state, "LABOUR").filter(e => e.body.status === "RECORDED").map(e => labourTotals(e.body));
  const labourCost = logs.reduce((n, l) => n.plus(l.cost), new D(0));
  const costEntries = entries(state, "COST").filter(e => e.body.status === "RECORDED");
  const otherCost = costEntries.reduce((n, e) => n.plus(e.body.net), new D(0));
  const materialActual = costEntries.filter(e => ["MATERIAL", "SUPPORTING_MATERIAL"].includes(e.body.category)).reduce((n, e) => n.plus(e.body.net), new D(0));
  const actual = otherCost.plus(labourCost), hours = logs.reduce((n, l) => n.plus(l.hours), new D(0));
  return { contractNet: net.toFixed(2), contractGross: gross.toFixed(2), variationNet: variationNet.toFixed(2), invoiceNet: invoiceNet.toFixed(2), invoiceGross: invoiceGross.toFixed(2), received: received.toFixed(2), outstanding: invoiceGross.minus(received).toFixed(2), unbilledGross: gross.minus(invoiceGross).toFixed(2), actualCostNet: actual.toFixed(2), labourCostNet: labourCost.toFixed(2), materialCostNet: materialActual.toFixed(2), costVariance: actual.minus(base.baseline.costSubtotal).toFixed(2), labourHours: hours.toFixed(3), hoursVariance: hours.minus(base.baseline.personHours).toFixed(3), remainingMarginNet: net.minus(actual).toFixed(2), invoices };
}
export function progress(state: State) {
  const tasks = entries(state, "TASK");
  const stages = entries(state, "STAGE").map(s => { const children = tasks.filter(t => t.body.stageId === s.id); const weight = children.reduce((n, t) => n + t.body.weight, 0); return { id: s.id, name: s.body.name, weight: s.body.weight, count: children.length, progress: weight ? children.reduce((n, t) => n + t.body.weight * t.body.progress, 0) / weight : 0 }; });
  const active = stages.filter(s => s.count > 0), weight = active.reduce((n, s) => n + s.weight, 0);
  return { percent: weight ? Math.round(active.reduce((n, s) => n + s.progress * s.weight, 0) / weight) : 0, completed: tasks.filter(t => t.body.status === "COMPLETED").length, total: tasks.length, stages };
}

export function validateChange(base: Base, state: State, change: Entry, today = new Date().toISOString().slice(0, 10)) {
  const fail = (message: string): never => { throw new ManagementError(message); };
  const previous = state.find(e => e.id === change.id);
  if (previous && previous.kind !== change.kind) fail("This identifier belongs to another record type.");
  if (previous && ["PAYMENT", "PAYMENT_REVERSAL"].includes(previous.kind)) fail("Payment records are immutable. Record a reversal to correct a payment.");
  if (previous?.kind === "VARIATION" && previous.body.status === "APPROVED") fail("Approved variations are frozen. Record a separate adjusting variation.");
  const requireRef = (id: string, kind: Kind) => { if (!state.some(e => e.id === id && e.kind === kind)) fail(`Select a ${kind.toLowerCase()} belonging to this project.`); };
  const checkDate = (date: string) => { if (date > today) fail("Actual activity and approvals cannot be dated in the future."); };
  const checkTax = (rate: string) => { if (!base.taxRates.some(r => new D(r).eq(rate))) fail("Select a VAT rate from the accepted project configuration."); };
  switch (change.kind) {
    case "PROJECT": if (change.id !== base.id) fail("Invalid project reference."); if (change.body.status === "COMPLETED" && (entries(state, "TASK").some(t => t.body.status !== "COMPLETED") || entries(state, "SNAG").some(s => s.body.status !== "VERIFIED"))) fail("Complete all tasks and verify outstanding snags first."); break;
    case "STAGE": case "ROOM": if (entries(state, change.kind).some(e => e.id !== change.id && e.body.name.toLowerCase() === change.body.name.toLowerCase())) fail("That name is already used in this project."); break;
    case "TASK": {
      const b = change.body; requireRef(b.stageId, "STAGE"); requireRef(b.roomId, "ROOM");
      if (!previous && !b.variationId) fail("New scope tasks must reference an approved variation.");
      if (b.variationId && !entries(state, "VARIATION").some(v => v.id === b.variationId && v.body.status === "APPROVED")) fail("Choose an approved variation for added work.");
      if ((b.status === "COMPLETED") !== (b.progress === 100)) fail("Completed tasks must be 100%; other task statuses must be below 100%.");
      if (b.status === "PLANNED" && b.progress !== 0) fail("Planned tasks must have zero progress.");
      if (b.status === "COMPLETED") { const schedule = entries(state, "SCHEDULE").find(s => s.body.taskId === change.id); if (schedule?.body.predecessors.some(id => entries(state, "TASK").find(t => t.id === id)?.body.status !== "COMPLETED")) fail("Complete predecessor tasks first."); }
      break;
    }
    case "SCHEDULE": {
      const b = change.body; requireRef(b.taskId, "TASK"); if (b.workerId) requireRef(b.workerId, "WORKER");
      if (b.start > b.end || b.predecessors.includes(b.taskId) || new Set(b.predecessors).size !== b.predecessors.length) fail("Check schedule dates and predecessor selection.");
      for (const id of b.predecessors) requireRef(id, "TASK");
      if (entries(state, "SCHEDULE").some(e => e.id !== change.id && e.body.taskId === b.taskId)) fail("Edit the task's existing schedule instead of adding another.");
      const schedules = [...entries(state, "SCHEDULE").filter(s => s.id !== change.id), change];
      const graph = new Map(schedules.map(s => [s.body.taskId, s.body]));
      const done = new Set<string>();
      const visit = (id: string, trail: Set<string>) => { if (trail.has(id)) fail("Schedule dependencies form a cycle."); if (done.has(id)) return; const s = graph.get(id); if (!s) return; for (const p of s.predecessors) { const predecessor = graph.get(p); if (!predecessor) fail("Schedule predecessor tasks before dependent work."); if (predecessor!.end > s.start) fail("A predecessor finishes after its dependent task starts."); visit(p, new Set([...trail, id])); } done.add(id); };
      for (const id of graph.keys()) visit(id, new Set());
      break;
    }
    case "MATERIAL": {
      const b = change.body; requireRef(b.taskId, "TASK");
      if (new D(b.ordered).gt(b.planned) || new D(b.received).gt(b.ordered)) fail("Received quantity cannot exceed ordered quantity; ordered cannot exceed planned.");
      if (b.requirementId) { const r = base.requirements.find(r => r.id === b.requirementId && r.taskId === b.taskId && r.kind === "MATERIAL"); if (!r) fail("Select a material requirement belonging to this task."); if (r!.unit !== b.unit) fail("Use the accepted requirement's unit."); if (r!.supplyBy !== "CONTRACTOR" && (new D(b.ordered).gt(0) || new D(b.received).gt(0))) fail("Customer-supplied or retained materials must not be ordered as contractor purchases."); if (entries(state, "MATERIAL").some(e => e.id !== change.id && e.body.requirementId === b.requirementId)) fail("Edit the existing material tracking record."); }
      break;
    }
    case "WORKER": break;
    case "LABOUR": {
      const b = change.body; requireRef(b.taskId, "TASK"); requireRef(b.workerId, "WORKER"); checkDate(b.date);
      if (b.status === "RECORDED" && !entries(state, "WORKER").find(w => w.id === b.workerId)?.body.active) fail("Choose an active worker.");
      if (b.start >= b.end || labourTotals(b).minutes <= 0) fail("Enter a same-day shift with end after start and breaks shorter than the shift.");
      if (b.status === "RECORDED" && entries(state, "LABOUR").some(e => e.id !== change.id && e.body.status === "RECORDED" && e.body.workerId === b.workerId && e.body.date === b.date && e.body.start < b.end && b.start < e.body.end)) fail("This shift overlaps recorded time for the worker.");
      break;
    }
    case "PHOTO": case "DOCUMENT": if (change.body.taskId) requireRef(change.body.taskId, "TASK"); if (change.kind === "PHOTO") { if (change.body.roomId) requireRef(change.body.roomId, "ROOM"); if (change.body.stageId) requireRef(change.body.stageId, "STAGE"); checkDate(change.body.date); } break;
    case "VARIATION": { const b = change.body; checkTax(b.vatRate); if (b.status === "APPROVED") { if (!b.approvedBy || !b.approvalDate || b.evidence.length < 10) fail("Record the approver, approval date and written evidence before approving a variation."); checkDate(b.approvalDate); } break; }
    case "SNAG": { const b = change.body; requireRef(b.roomId, "ROOM"); if (b.taskId) requireRef(b.taskId, "TASK"); if (b.workerId) requireRef(b.workerId, "WORKER"); b.photoIds.forEach(id => requireRef(id, "PHOTO")); if (b.status === "ASSIGNED" && !b.workerId) fail("Assign a worker first."); if (["COMPLETED", "VERIFIED"].includes(b.status) && b.resolution.length < 10) fail("Record completion or verification evidence."); if (b.status === "VERIFIED" && !(previous?.kind === "SNAG" && ["COMPLETED", "VERIFIED"].includes(previous.body.status))) fail("Complete the snag before verification."); break; }
    case "INVOICE": {
      const b = change.body; if (b.stageId) requireRef(b.stageId, "STAGE"); b.lines.forEach(l => { checkTax(l.vatRate); if (new D(l.quantity).lte(0)) fail("Invoice quantities must be positive."); });
      if (b.dueDate < b.issueDate) fail("The due date cannot precede the issue date.");
      if (b.status === "ISSUED") { checkDate(b.issueDate); if (b.reviewNote.length < 10 || new D(invoiceTotals(b).gross).lte(0)) fail("Review the invoice and enter a positive total before issuing."); }
      if (b.status === "VOID" && b.reviewNote.length < 10) fail("Record a reason for voiding the invoice.");
      if (previous?.kind === "INVOICE" && previous.body.status !== "DRAFT") { const old = { ...previous.body, status: undefined, reviewNote: undefined }; const next = { ...b, status: undefined, reviewNote: undefined }; if (previous.body.status === "VOID" || b.status !== "VOID" || JSON.stringify(old) !== JSON.stringify(next)) fail("Issued invoices are frozen. They can only be voided without altering their values."); }
      if (b.status === "VOID" && new D(finances(base, state).invoices.find(i => i.id === change.id)?.paid ?? "0").gt(0)) fail("Reverse recorded payments before voiding the invoice.");
      break;
    }
    case "PAYMENT": { const b = change.body; requireRef(b.invoiceId, "INVOICE"); checkDate(b.date); const invoice = entries(state, "INVOICE").find(i => i.id === b.invoiceId)!; if (invoice.body.status !== "ISSUED" || b.date < invoice.body.issueDate) fail("Record payments only against an issued invoice, on or after its issue date."); const outstanding = finances(base, state).invoices.find(i => i.id === b.invoiceId)?.outstanding ?? "0"; if (new D(b.amount).lte(0) || new D(b.amount).gt(outstanding)) fail("Payment must be positive and no greater than the outstanding balance."); if (entries(state, "PAYMENT").some(p => p.body.reference.toLowerCase() === b.reference.toLowerCase())) fail("That payment reference is already recorded."); break; }
    case "PAYMENT_REVERSAL": requireRef(change.body.paymentId, "PAYMENT"); if (entries(state, "PAYMENT_REVERSAL").some(r => r.body.paymentId === change.body.paymentId)) fail("This payment has already been reversed."); break;
    case "COST": checkDate(change.body.date); checkTax(change.body.vatRate); if (entries(state, "COST").some(c => c.id !== change.id && c.body.supplier.toLowerCase() === change.body.supplier.toLowerCase() && c.body.reference.toLowerCase() === change.body.reference.toLowerCase())) fail("This supplier cost reference is already recorded."); break;
  }
  const next = [...state.filter(e => e.id !== change.id), change], totals = finances(base, next);
  for (const schedule of entries(next, "SCHEDULE")) { if (entries(next, "TASK").find(t => t.id === schedule.body.taskId)?.body.status === "COMPLETED" && schedule.body.predecessors.some(id => entries(next, "TASK").find(t => t.id === id)?.body.status !== "COMPLETED")) fail("Reopen dependent tasks before reopening their predecessor."); }
  if (new D(totals.contractNet).lt(0) || new D(totals.contractGross).lt(0)) fail("Approved variations cannot make the contract total negative.");
  if (new D(totals.invoiceNet).gt(totals.contractNet) || new D(totals.invoiceGross).gt(totals.contractGross)) fail("Issued invoices would exceed the accepted contract plus approved variations.");
  if (entries(next, "PROJECT")[0]?.body.status === "COMPLETED" && (entries(next, "TASK").some(t => t.body.status !== "COMPLETED") || entries(next, "SNAG").some(s => s.body.status !== "VERIFIED"))) fail("Reopen the project before adding unfinished work or snags.");
  return next;
}
