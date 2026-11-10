// Builds the client document pack for a quote: quotation (description, chronological scope, programme
// with dates, price, stage payments, client supplies), contract, workmanship guarantee and the health &
// safety documents (construction phase plan, risk assessment, method statements, COSHH register).
// Works only from the customer projection (no costs, rates or margins) so it is safe to show clients.

import type { CustomerTakeoff } from "./engine";
import type { TakeoffInput } from "./schema";
import { ageOptions, constructionOptions, houseTypeOptions, roomTypeOptions } from "./schema";
import type { CompanyProfile } from "./company";
import { ACTIVITIES, COSHH, HAZARDS, ORDER, riskBand, riskScore, type ActivityId, type HazardId } from "./activities";
import { extTypeOptions } from "./modules/extension";
import { loftTypeOptions } from "./modules/loft";
import { coveringOptions } from "./modules/roofing";
import { phaseLabels } from "./types";
import { renderSystemOptions } from "./modules/external";
import type { QuoteLayout } from "./quote-format";
import { buildSitePack, type SitePack } from "./site-pack";

const label = (opts: readonly (readonly [string, string])[], k: unknown) => opts.find(([v]) => v === k)?.[1] ?? String(k ?? "");
const r2 = (x: number) => Math.round(x * 100) / 100;
const gbpText = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------- Working-day calendar (England & Wales)

const BANK_HOLIDAYS = new Set([
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
  "2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26",
]);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isWorkingDay = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !BANK_HOLIDAYS.has(iso(d));
/** The date of working day `n` (0 = start date or next working day). */
export function workingDate(start: string, n: number) {
  const d = new Date(`${start}T00:00:00Z`);
  while (!isWorkingDay(d)) d.setUTCDate(d.getUTCDate() + 1);
  let left = Math.max(0, Math.floor(n));
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (isWorkingDay(d)) left--; }
  return iso(d);
}
const addDays = (date: string, days: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return iso(d); };
export const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// ---------------------------------------------------------------- Types

export interface DocParty { name: string; email: string; phone: string; address: string; siteAddress: string }
export interface ProgrammeRow { stage: string; label: string; days: number; startDay: number; endDay: number; start?: string; end?: string }
/** kind/stages say when the stage invoice is raised: deposit on acceptance, a stage payment when its stages are done, final on completion. */
export interface PaymentRow { n: number; label: string; when: string; date?: string; percent: number; amount: number; kind?: "DEPOSIT" | "STAGE" | "FINAL" | "VARIATION"; stages?: string[]; net?: number }
export interface SupplyRow { area: string; item: string; quantity: number; unit: string; spec: string; neededBy: string }
export interface DocSection { heading: string; paragraphs?: string[]; items?: string[] }

export interface QuoteDocs {
  company: CompanyProfile; client: DocParty; reference: string; version: number; issueDate: string; validUntil: string; title: string;
  /** Covering letter: greeting and opening paragraphs (the admin's own wording when given). */
  letter: { greeting: string; paragraphs: string[] };
  /** Scope & price table in the chosen format; missing on versions saved before formats existed. */
  layout?: QuoteLayout;
  description: string[]; programme: ProgrammeRow[]; workingDays: number; weeks: number; start?: string; finish?: string;
  scope: { heading: string; dates?: string; items: string[] }[];
  price: { areas: { area: string; net: number }[]; phases: { label: string; total: number }[]; net: number; vat: number; gross: number; scaffolding: boolean;
    discount?: { label: string; amount: number; netBeforeDiscount: number }; vatBreakdown?: { percent: number; net: number; vat: number }[] };
  payments: PaymentRow[]; paymentDays: number; supplies: SupplyRow[]; exclusions: string[]; assumptions: string[];
  contract: DocSection[]; cancellationForm: string[]; guarantee: { years: number; sections: DocSection[] };
  cpp: DocSection[]; risks: { id: HazardId; title: string; who: string; harm: string; before: number; after: number; beforeBand: string; afterBand: string; controls: string[]; activities: string[] }[];
  methods: { id: ActivityId; title: string; steps: string[]; plant: string[]; ppe: string[]; competence: string; hazards: string[] }[];
  coshh: { activity: string; substances: string[] }[];
  /** Full project pack: RAMS per activity, permits, registers, Building Regulations, client letters, completion. */
  pack?: SitePack;
}

export interface DocArgs {
  customer: CustomerTakeoff; input: TakeoffInput; company: CompanyProfile;
  client: { name: string; email: string; siteAddress: string };
  reference: string; version: number; issueDate: string;
}

// ---------------------------------------------------------------- Description

function describe(input: TakeoffInput, c: CustomerTakeoff): string[] {
  const p = input.property;
  const out: string[] = [];
  out.push(`The property is a ${label(houseTypeOptions, p.houseType).toLowerCase()} house of ${p.storeys} storeys with ${p.bedrooms} bedrooms, built ${label(ageOptions, p.age).toLowerCase().replace("victorian", "Victorian").replace("edwardian", "Edwardian")} with ${label(constructionOptions, p.construction).toLowerCase()} walls${p.occupancy === "OCCUPIED" ? ", and will be occupied during the works" : ""}.${p.notes ? ` ${p.notes}` : ""}`);
  const works: string[] = [];
  const loft = input.packages.loft, ext = input.packages.extension, roof = input.packages.roofing;
  if (loft?.enabled) {
    const v = loft.values;
    works.push(`a ${label(loftTypeOptions, v.loftType ?? "REAR_DORMER").toLowerCase()} loft conversion (${p.width} × ${p.length} m footprint) creating ${v.bedrooms ?? 1} bedroom${Number(v.bedrooms ?? 1) > 1 ? "s" : ""}${v.ensuite !== false ? " with an en-suite shower room" : ""}${v.lowerCeiling ? ", lowering the first floor ceilings for head height" : ""}`);
  }
  if (ext?.enabled) {
    const v = ext.values, w = Number(v.width ?? 4.5), d = Number(v.depth ?? 4);
    works.push(`a ${label(extTypeOptions, v.extType ?? "REAR").toLowerCase()} extension of about ${r2(w * d)} m² (${w} × ${d} m)${v.knockThrough !== false ? " opened up into the house with a steel beam" : ""}`);
  }
  if (roof?.enabled) works.push(`re-roofing in ${label(coveringOptions, roof.values.covering ?? "SLATE").toLowerCase()}${roof.values.slopes === "FRONT" ? " (front slope)" : roof.values.slopes === "REAR" ? " (rear slope)" : ""}`);
  const extW = input.packages.external, garden = input.packages.garden, cleaning = input.packages.cleaning;
  if (extW?.enabled) {
    const v = extW.values;
    works.push(`${v.system === "PAINT_ONLY" ? "repainting the outside walls" : `${v.hackOff ? "re-rendering" : "rendering"} the outside walls in ${label(renderSystemOptions, v.system ?? "SILICONE").toLowerCase()}`}${v.insulation ? " over external wall insulation" : ""} (about ${v.area ?? 60} m²)`);
  }
  if (garden?.enabled) works.push("garden and landscaping works");
  if (cleaning?.enabled) works.push("exterior cleaning");
  if (input.rooms.length) works.push(`works to ${input.rooms.length} room${input.rooms.length > 1 ? "s" : ""}: ${input.rooms.map(r => `${r.name} (${label(roomTypeOptions, r.type).toLowerCase()}, ${r.length} × ${r.width} m)`).join(", ")}`);
  if (input.customItems.length) works.push(input.customItems.length === 1 ? input.customItems[0].title.toLowerCase() : `${input.customItems.length} further items of work listed in the scope`);
  if (works.length) out.push(`We will carry out ${works.length > 1 ? `${works.slice(0, -1).join("; ")}; and ${works[works.length - 1]}` : works[0]}.`);
  out.push(`The work takes about ${c.programme.workingDays} working days (≈ ${c.programme.weeks} weeks) on site. All work is carried out by our own trades and approved specialists, to current Building Regulations and British Standards, with the site kept safe, clean and protected throughout.`);
  return out;
}

// ---------------------------------------------------------------- Programme, scope, payments

const stageLabel = (stage: string) => stage.replace(/^Site · /, "").replace(/^Rooms · /, "Rooms – ").replace(" · ", " – ");

function programme(c: CustomerTakeoff, start: string) {
  // Site set-up first, works in programme order, electrical testing & completion last.
  const setup = /Site · (Preliminaries|Health & safety)/;
  const first = c.sections.filter(s => setup.test(s.stage));
  const services = c.sections.filter(s => /Site · Water services/.test(s.stage));
  const last = c.sections.filter(s => /Electrical testing/.test(s.stage));
  const middle = c.sections.filter(s => !first.includes(s) && !last.includes(s) && !services.includes(s));
  const rows: ProgrammeRow[] = [];
  let day = 0;
  for (const s of [...first, ...services, ...middle, ...last]) {
    const days = setup.test(s.stage) ? 0 : s.days;
    const from = Math.floor(day), row: ProgrammeRow = { stage: s.stage, label: stageLabel(s.stage), days, startDay: from, endDay: Math.max(from, Math.ceil(day + days) - 1) };
    if (start) { row.start = workingDate(start, row.startDay); row.end = workingDate(start, row.endDay); }
    rows.push(row);
    day += days;
  }
  return rows;
}

function scopeByStage(c: CustomerTakeoff, rows: ProgrammeRow[]) {
  const items = c.scopeItems ?? c.scope.map(text => ({ text, area: "", stage: "" }));
  const out: { heading: string; dates?: string; items: string[] }[] = [];
  const used = new Set<number>();
  const before = items.map((x, i) => [x, i] as const).filter(([x]) => /Site · (Preliminaries|Health & safety)/.test(x.stage));
  if (before.length) { out.push({ heading: "Before work starts", items: before.map(([x]) => x.text) }); before.forEach(([, i]) => used.add(i)); }
  for (const r of rows) {
    if (/Site · (Preliminaries|Health & safety)/.test(r.stage)) continue;
    const mine = items.map((x, i) => [x, i] as const).filter(([x, i]) => !used.has(i) && x.stage === r.stage);
    if (!mine.length) continue;
    mine.forEach(([, i]) => used.add(i));
    out.push({ heading: r.label, dates: r.start ? (r.start === r.end ? longDate(r.start) : `${longDate(r.start)} – ${longDate(r.end!)}`) : `Day ${r.startDay + 1}${r.endDay > r.startDay ? `–${r.endDay + 1}` : ""}`, items: mine.map(([x]) => x.text) });
  }
  const rest = items.filter((_, i) => !used.has(i)).map(x => x.text);
  if (rest.length) out.push({ heading: "Completion", items: rest });
  return out.map((s, i) => ({ ...s, heading: `${i + 1}. ${s.heading}` }));
}

export function paymentSchedule(c: CustomerTakeoff, input: TakeoffInput, rows: ProgrammeRow[], issueDate: string): PaymentRow[] {
  const t = input.terms, gross = c.gross;
  const deposit = r2(gross * t.depositPercent / 100), final = r2(gross * t.finalPercent / 100);
  const middle = r2(gross - deposit - final);
  const work = rows.filter(r => r.days > 0 && !/Electrical testing/.test(r.stage));
  const netOf = (r: ProgrammeRow) => c.sections.find(s => s.stage === r.stage)?.net ?? 0;
  const totalNet = work.reduce((s, r) => s + netOf(r), 0) || 1;
  const n = Math.max(1, Math.min(t.stagePayments, work.length || 1));
  const chunks: ProgrammeRow[][] = Array.from({ length: n }, () => []);
  let acc = 0;
  for (const r of work) { const k = Math.min(n - 1, Math.floor((acc / totalNet) * n + 1e-9)); chunks[k].push(r); acc += netOf(r); }
  const filled = chunks.filter(ch => ch.length);
  const out: PaymentRow[] = [];
  const start = t.startDate;
  if (deposit > 0) out.push({ n: 0, label: "Deposit", when: "On signing the contract, to book the start date and order long-lead materials", date: start ? (addDays(start, -7) > issueDate ? addDays(start, -7) : issueDate) : undefined, percent: t.depositPercent, amount: deposit, kind: "DEPOSIT" });
  let paid = 0;
  filled.forEach((ch, i) => {
    const share = ch.reduce((s, r) => s + netOf(r), 0) / totalNet;
    const amount = i === filled.length - 1 ? r2(middle - paid) : r2(middle * share);
    paid = r2(paid + amount);
    const lastRow = ch[ch.length - 1];
    out.push({ n: 0, label: `Stage payment ${i + 1}`, when: `On completion of: ${ch.map(r => r.label).join(", ")}`, date: lastRow.end, percent: r2(amount / gross * 100), amount, kind: "STAGE", stages: ch.map(r => r.stage) });
  });
  if (final > 0) {
    const end = rows.length ? rows[rows.length - 1].end : undefined;
    out.push({ n: 0, label: "Final payment", when: "On practical completion, after the handover walk-round and snagging list", date: end, percent: t.finalPercent, amount: final, kind: "FINAL" });
  }
  const drift = r2(gross - out.reduce((s, p) => s + p.amount, 0));
  if (drift && out.length) out[out.length - 1].amount = r2(out[out.length - 1].amount + drift);
  return out.map((p, i) => ({ ...p, n: i + 1 }));
}

// ---------------------------------------------------------------- Contract & guarantee

function contract(d: Omit<QuoteDocs, "contract" | "guarantee" | "cpp" | "risks" | "methods" | "coshh" | "cancellationForm">, input: TakeoffInput): DocSection[] {
  const co = d.company, t = input.terms, cl = d.client;
  const contractor = `${co.registeredName || co.name}${co.companyNo ? ` (company no. ${co.companyNo})` : ""}${co.address ? `, ${co.address}` : ""}`;
  return [
    { heading: "1. The parties", paragraphs: [`This contract is between ${contractor} ("we", "us", "the Contractor") and ${cl.name || "the client named on the quotation"}${cl.address ? ` of ${cl.address}` : ""} ("you", "the Client"), for works at ${cl.siteAddress || "the site address on the quotation"} ("the Site").`] },
    { heading: "2. The works and the contract documents", items: [
      `We will carry out the works described in quotation ${d.reference} version ${d.version} dated ${longDate(d.issueDate)} ("the Works"), in a good and workmanlike manner, with reasonable care and skill, using materials of satisfactory quality and fit for purpose, in accordance with the Building Regulations and current British Standards.`,
      "The contract is made up of, in order of priority: (a) any written variation agreed by both of us; (b) these terms; (c) the quotation including its scope of works, programme, payment schedule, items you supply, assumptions and exclusions; (d) drawings and the structural engineer's design (where applicable).",
      "Anything not described in the quotation is not included. Provisional sums and allowances (for example Building Control fees) are adjusted to the actual cost.",
    ] },
    { heading: "3. Price and payment", items: [
      `The contract price is £${d.price.gross.toLocaleString("en-GB", { minimumFractionDigits: 2 })} including VAT at the current rate (£${d.price.net.toLocaleString("en-GB", { minimumFractionDigits: 2 })} plus VAT). If the VAT rate changes, the price changes accordingly.`,
      `You will pay in line with the payment schedule in the quotation: a deposit of ${t.depositPercent}%, stage payments on completion of each stage, and the final ${t.finalPercent}% on practical completion. We will send an invoice for each payment, payable within ${t.paymentDays} days by bank transfer${co.accountNumber ? ` to ${co.accountName || co.registeredName}, sort code ${co.sortCode}, account ${co.accountNumber}` : ""}. We never ask you to change bank details by email; always confirm by phone.`,
      "Payments are for work completed and materials delivered to the Site. Ownership of materials passes to you when they are paid for; until then they remain ours.",
      `If a payment is late we may charge interest at 4% a year above the Bank of England base rate from the due date. If a payment is more than 14 days overdue, we may suspend the works after giving you 7 days' written notice, and the programme will be extended accordingly.`,
      "If you disagree with part of an invoice, tell us in writing within 7 days saying why; you must still pay the part that is not disputed.",
    ] },
    { heading: "4. Changes (variations) and unforeseen work", items: [
      "Any change you ask for, and any extra work, will be agreed in writing (email is fine) with its price and effect on the programme before we carry it out.",
      "If we find something that could not reasonably have been seen at survey (for example rotten timbers, defective drains, poor ground, asbestos, hidden services, structural defects), we will stop that part of the work, show you, and agree the remedy and cost with you before continuing. We will not proceed without your agreement except where urgent work is needed to keep the property safe or weathertight.",
      "Items you choose in your portal (finishes, colours, grades) are priced as shown when you confirm them.",
    ] },
    { heading: "5. Start, programme and completion", items: [
      d.start ? `We plan to start on ${longDate(d.start)} and expect to reach practical completion on or around ${longDate(d.finish!)} (${d.workingDays} working days).` : `The works take about ${d.workingDays} working days. We will confirm the start date in writing.`,
      "The programme is our best estimate. It may be extended for: bad weather; variations; late or unavailable client-supplied items; delays by Building Control, the local authority, utility companies or the structural engineer; unforeseen conditions; lack of access; or anything outside our reasonable control. We will tell you as soon as we know about a delay and keep you updated.",
      "Practical completion is when the works are finished apart from minor snagging items that do not stop you using the area. We will walk round with you, agree a snagging list and complete it within 14 days.",
    ] },
    { heading: "6. Your responsibilities", items: [
      "Give us safe access to the Site during working hours, use of water and electricity, and somewhere to store materials and place a skip.",
      "Obtain any planning permission, party wall agreements and freeholder / landlord consents needed (unless the quotation says we will), and tell us about any conditions.",
      "Supply the items listed as client supplies, of the right specification and quantity, by the dates in the quotation. Delays caused by late or wrong items may cost extra and extend the programme. We are responsible for fitting them properly, but not for faults in the items themselves.",
      "Remove or protect valuables, furniture and fragile items from the work areas; keep children and pets away from work areas.",
      "Tell your home insurer about the works before we start.",
      "Make decisions and approvals in good time when we ask for them.",
    ] },
    { heading: "7. Our responsibilities", items: [
      "Manage the Site safely as principal contractor under the Construction (Design and Management) Regulations 2015, with a construction phase plan, risk assessments and method statements (attached).",
      "Use competent, insured trades; registered electricians (Part P) and Gas Safe engineers where required.",
      "Arrange Building Control inspections where the quotation includes them and give you the completion certificate and electrical / gas certificates.",
      "Protect your property, keep the Site tidy, remove our waste, and leave the Site clean on completion.",
      "Work within the agreed working hours and respect your neighbours.",
    ] },
    { heading: "8. Insurance", items: [
      `We hold public liability insurance${co.publicLiability ? ` of ${co.publicLiability}` : ""}${co.employersLiability ? ` and employer's liability insurance of ${co.employersLiability}` : ""}${co.insurer ? ` with ${co.insurer}${co.policyNo ? ` (policy ${co.policyNo})` : ""}` : ""}. A copy is available on request.`,
      "The existing structure and contents remain your responsibility to insure. Our insurance covers damage caused by our negligence.",
    ] },
    { heading: "9. Guarantee and defects", items: [
      `We guarantee our workmanship for ${t.guaranteeYears} years from practical completion, on the terms of the workmanship guarantee attached. Manufacturers' guarantees for products we supply are passed on to you.`,
      "Nothing in this contract affects your statutory rights under the Consumer Rights Act 2015.",
    ] },
    { heading: "10. Your right to cancel", items: [
      "If this contract is made at your home or online (away from our premises), you have the right to cancel within 14 days of signing without giving a reason, under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013. Use the cancellation form attached or tell us clearly in writing.",
      "If you ask us to start work within the 14-day cancellation period and then cancel, you must pay for the work done and materials ordered for you up to the time you tell us. Materials made or ordered to your specification cannot be returned.",
      "After the cancellation period, if you end the contract without a legal reason you must pay for work done, materials ordered and our reasonable losses.",
    ] },
    { heading: "11. Ending the contract", items: [
      "Either of us may end the contract by written notice if the other seriously breaks it and does not put it right within 14 days of being asked in writing.",
      "We may end the contract if you become insolvent or do not pay an amount due within 28 days of a written reminder. You may end it if we stop work for 21 days without good reason or become insolvent.",
      "On ending, you pay for work properly done and materials delivered; we hand over materials paid for.",
    ] },
    { heading: "12. Liability", items: [
      "We are responsible for loss or damage that is a foreseeable result of our breach of this contract or our negligence. We are not responsible for loss that was not foreseeable, or for business losses.",
      "We do not exclude or limit liability for death or personal injury caused by negligence, for fraud, or for anything that cannot be excluded by law.",
    ] },
    { heading: "13. Complaints and disputes", items: [
      `If you are unhappy, please tell ${co.siteManager || "your site manager"} first; we will respond within 7 days and aim to resolve any complaint quickly and fairly.`,
      `If we cannot agree, either of us may refer the dispute to ${co.disputeScheme || "an independent mediator"} before going to court. You may also use the courts. This contract is governed by the law of England and Wales.`,
    ] },
    { heading: "14. General", items: [
      "This contract (with the documents in clause 2) is the whole agreement between us. Changes must be agreed in writing.",
      "We use your personal data only to carry out this contract and as required by law (see our data protection policy).",
      "Sub-contracting: we may use specialist sub-contractors (for example scaffolding, steel fabrication, plastering) but remain responsible for their work.",
      "Accepting the quote in your online portal by typing your full name and ticking the acceptance box has the same effect as signing this contract.",
    ] },
  ];
}

function guarantee(d: Pick<QuoteDocs, "company" | "client" | "reference">, years: number): DocSection[] {
  const co = d.company.registeredName || d.company.name;
  return [
    { heading: "What is covered", paragraphs: [`${co} guarantees the workmanship of the works carried out under contract ${d.reference} at ${d.client.siteAddress || "the property"} for ${years} years from the date of practical completion. If a defect appears that is caused by faulty workmanship, we will put it right free of charge, including making good and redecorating the affected area.`] },
    { heading: "Materials", items: ["Products and materials we supply carry their manufacturers' guarantees, which we pass on to you (for example windows, roof systems, boilers, appliances).", "Items supplied by you are covered by their own manufacturer or retailer; our guarantee covers our fitting of them."] },
    { heading: "What is not covered", items: [
      "Fair wear and tear, misuse, neglect, accidental damage, or lack of normal maintenance (for example clearing gutters, re-sealing silicone, servicing).",
      "Work altered or repaired by anyone other than us.",
      "Hairline cracks from normal drying shrinkage and settlement of new plaster and timber (we will fill and touch up once, between 6 and 12 months after completion, on request).",
      "Condensation, or damage from causes outside the works (for example existing structure, ground movement beyond our foundations' design, storm, flood, fire).",
      "Defects in items supplied by the client, or in existing parts of the building we did not work on.",
      "Consequential losses beyond the cost of the remedial work.",
    ] },
    { heading: "Conditions", items: [
      "The contract price has been paid in full.",
      "You tell us in writing within 14 days of noticing a defect and give us reasonable access to inspect and repair it.",
      "The guarantee transfers to a new owner of the property if you sell within the guarantee period; please give them this certificate.",
      "An insurance-backed guarantee (which protects you if we cease trading) is available on request at extra cost.",
      "This guarantee is in addition to your statutory rights.",
    ] },
  ];
}

// ---------------------------------------------------------------- Health & safety

function cpp(d: Pick<QuoteDocs, "company" | "client" | "reference" | "start" | "finish" | "workingDays" | "title">, input: TakeoffInput, acts: ActivityId[]): DocSection[] {
  const co = d.company, p = input.property;
  const old = p.age !== "POST_2000";
  return [
    { heading: "1. Project information", items: [
      `Project: ${d.title} (${d.reference})`, `Site: ${d.client.siteAddress || "as quotation"}`, `Client: ${d.client.name}`,
      `Principal contractor (and principal designer for a single-contractor domestic project, taking on the client's CDM duties): ${co.registeredName || co.name}`,
      `Programme: ${d.start ? `${longDate(d.start)} to ${longDate(d.finish!)}` : `${d.workingDays} working days, start date to be confirmed`}`,
      `Property: ${label(houseTypeOptions, p.houseType)}, ${label(ageOptions, p.age).toLowerCase()}, ${label(constructionOptions, p.construction).toLowerCase()}; ${p.occupancy === "OCCUPIED" ? "occupied during works" : "empty during works"}; access: ${p.access === "EASY" ? "easy" : "restricted"}.`,
    ] },
    { heading: "2. Management and contacts", items: [
      `Site manager: ${co.siteManager || "________________"}${co.siteManagerPhone ? ` – ${co.siteManagerPhone}` : ""}`,
      ...(input.terms.siteSupervisor ? [`Site supervisor: ${input.terms.siteSupervisor}${input.terms.siteSupervisorPhone ? ` – ${input.terms.siteSupervisorPhone}` : ""}`] : []),
      `Health & safety lead: ${co.healthSafetyLead || co.siteManager || "________________"}`, `First aider: ${co.firstAider || "________________"}`,
      `Office: ${co.phone}${co.email ? ` · ${co.email}` : ""}`,
      `Emergency services: 999 · Nearest A&E: ${input.terms.nearestHospital || "____________________ (site manager to complete and display)"}`,
      "Gas emergency: 0800 111 999 · Power cut: 105 · Water: your water company's emergency line",
    ] },
    { heading: "3. Site rules", items: [
      `Working hours: ${co.workingHours || "08:00–17:30 Mon–Fri"}. No noisy work outside these hours.`,
      "Everyone working on site receives a site induction and signs the induction register before starting.",
      "PPE: safety boots and hi-vis at all times; hard hats outside and below work at height; other PPE as the method statements require.",
      "No alcohol or drugs; no smoking or vaping in the house or on scaffolds.",
      "Keep work areas tidy; walkways and fire exits clear; waste to the skip daily.",
      "Report every accident, near miss and unsafe condition to the site manager immediately.",
      "Only trained and authorised people operate plant and power tools.",
    ] },
    { heading: "4. Welfare (Schedule 2, CDM 2015)", items: [
      input.prelims.welfare ? "Welfare unit with toilet and hand-washing on site." : "Use of a toilet and wash basin in the property agreed with the client.",
      "Drinking water, somewhere to rest and eat, and to dry clothing; hot water and soap for washing.",
      "First aid kit and trained first aider on site; accident book kept.",
    ] },
    { heading: "5. Fire and emergency arrangements", items: [
      "Fire extinguishers (CO₂ and water / foam) at the work area and with every hot work; fire blanket in the kitchen area.",
      "Escape routes agreed with occupants and kept clear; the house smoke alarms stay working (covered only while dust is being made, then uncovered).",
      "Assembly point: front of the property on the pavement (or as agreed with the client).",
      "Accidents: give first aid, call 999 if needed, make the area safe, inform the site manager. RIDDOR-reportable incidents are reported to the HSE.",
    ] },
    { heading: "6. Existing information and significant risks", items: [
      old ? "The property was built before 2000: an asbestos survey is required before intrusive work. Any suspect material found: stop, isolate and inform." : "Built after 2000: asbestos not expected; stop work and inform if any suspect material is found.",
      "Existing services (gas, water, electrics, drains) located before work; electrical isolations by our electrician only.",
      ...acts.filter(a => !["SITE_SETUP", "WASTE"].includes(a)).map(a => `${ACTIVITIES[a].title}: see method statement and risk assessment.`),
    ] },
    { heading: "7. Protecting occupants, neighbours and the public", items: [
      "Work areas separated with dust screens and zip doors; floors and stairs protected.",
      "Daily briefing to occupants of areas to keep away from; children and pets kept away.",
      "Site secured at the end of each day: tools locked away, scaffold ladder removed, excavations covered or fenced.",
      "Deliveries booked and supervised; pavements kept clear; skip licensed when on the road.",
      "Neighbours informed before noisy work, scaffolding and deliveries.",
    ] },
    { heading: "8. Monitoring and review", items: [
      "Site manager checks the site daily; scaffold and excavation inspections recorded weekly and after bad weather.",
      "This plan is reviewed and updated when the work, programme or risks change, and all operatives are briefed on changes.",
    ] },
  ];
}

// ---------------------------------------------------------------- Build

export function buildDocuments(a: DocArgs): QuoteDocs {
  const { customer: c, input, company } = a;
  const t = input.terms;
  const rows = programme(c, t.startDate);
  const start = t.startDate ? rows[0]?.start ?? workingDate(t.startDate, 0) : undefined;
  const lastDay = rows.reduce((m, r) => Math.max(m, r.endDay), 0);
  const finish = t.startDate ? workingDate(t.startDate, lastDay) : undefined;
  const client: DocParty = { name: a.client.name, email: a.client.email, phone: t.clientPhone, address: t.clientAddress || a.client.siteAddress, siteAddress: a.client.siteAddress };
  const pkgTitles = [input.packages.loft?.enabled && "Loft conversion", input.packages.extension?.enabled && "Extension", input.packages.roofing?.enabled && "Re-roof",
    input.packages.external?.enabled && (input.packages.external.values.insulation ? "External wall insulation" : "External render"), input.packages.garden?.enabled && "Garden & landscaping",
    input.packages.cleaning?.enabled && "Exterior cleaning", input.packages.conversion?.enabled && "Garage conversion", input.packages.outbuilding?.enabled && "Garden building",
    input.packages.demolition?.enabled && "Demolition", input.rooms.length > 0 && "Internal refurbishment"].filter(Boolean) as string[];
  const title = t.title || (pkgTitles.length ? pkgTitles.join(", ").replace(/, ([^,]*)$/, " and $1") : "Building works");
  const stageStart = new Map(rows.map(r => [r.stage, r.start ?? `Day ${r.startDay + 1}`]));
  const layout = c.layout;
  const first = a.client.name.trim().split(/\s+/)[0] ?? "";
  const how = layout?.format === "ITEMISED" ? "every item and job priced" : layout?.format === "NORMAL" ? "what each stage includes and its price" : "what we will do at each stage and its price";
  const custom = layout?.intro?.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean) ?? [];
  const letter = {
    greeting: `Dear ${first || "Sir / Madam"},`,
    paragraphs: custom.length ? custom : [
      `Thank you for asking us to quote for the ${title.toLowerCase()}${a.client.siteAddress ? ` at ${a.client.siteAddress.split("\n")[0]}` : ""}. Following our visit we have set out below exactly what is included, with ${how}.`,
      `Our price for the works is ${gbpText(c.net)} plus VAT (${gbpText(c.gross)} including VAT). The work takes about ${c.programme.workingDays} working days (≈ ${c.programme.weeks} week${c.programme.weeks > 1 ? "s" : ""})${t.startDate ? `, starting ${longDate(start ?? t.startDate)}` : ""}.`,
      "Everything listed in the scope below is included. Anything not listed, or listed under \"Not included\", is not part of this price – if you would like something added, just ask and we will price it before any work is done.",
    ],
  };
  const base = {
    company, client, reference: a.reference, version: a.version, issueDate: a.issueDate, validUntil: addDays(a.issueDate, t.validityDays), title, letter, layout,
    description: describe(input, c), programme: rows, workingDays: c.programme.workingDays, weeks: c.programme.weeks, start, finish,
    scope: scopeByStage(c, rows),
    price: { areas: c.areas, phases: c.phases.map(p => ({ label: phaseLabels[p.phase], total: p.total })), net: c.net, vat: c.vat, gross: c.gross, scaffolding: c.scaffolding.included, discount: c.discount, vatBreakdown: c.vatBreakdown },
    payments: paymentSchedule(c, input, rows, a.issueDate), paymentDays: t.paymentDays,
    supplies: c.clientOrders.map(o => {
      const when = o.stage ? stageStart.get(o.stage) : undefined;
      return { area: o.area, item: o.description, quantity: o.quantity, unit: o.unit, spec: o.spec ?? "", neededBy: when ? (when.startsWith("Day") ? `before ${when.toLowerCase()}` : `by ${longDate(addDays(when, -3))}`) : "before the start" };
    }),
    exclusions: [
      ...t.exclusions.split("\n").map(s => s.trim()).filter(Boolean),
      "Planning permission, party wall surveyor fees and freeholder consents, unless listed in the price.",
      "Items listed as supplied by you, and their delivery.",
      "Work to hidden defects found once work starts (priced and agreed before we carry it out).",
      "Asbestos survey and removal, unless listed.",
      "Gas work other than that listed; boiler replacement.",
      "Decoration of areas not listed; moving or storing furniture.",
    ],
    assumptions: c.assumptions,
  };
  const acts = (c.activities?.length ? c.activities : ORDER) as ActivityId[];
  const hazardActs = new Map<HazardId, string[]>();
  for (const id of acts) for (const h of ACTIVITIES[id].hazards) hazardActs.set(h, [...(hazardActs.get(h) ?? []), ACTIVITIES[id].title]);
  return {
    ...base,
    contract: contract(base, input),
    cancellationForm: [
      `To: ${company.registeredName || company.name}${company.address ? `, ${company.address}` : ""}${company.email ? `, ${company.email}` : ""}`,
      `I/We hereby give notice that I/we cancel my/our contract for the supply of the following service: ${title} (${a.reference}).`,
      "Ordered on: ____________________    Name of consumer(s): ______________________________",
      "Address of consumer(s): ______________________________________________",
      "Signature of consumer(s) (only if this form is notified on paper): ______________________    Date: ____________",
    ],
    guarantee: { years: t.guaranteeYears, sections: guarantee(base, t.guaranteeYears) },
    cpp: cpp(base, input, acts),
    risks: [...hazardActs.entries()].map(([id, activities]) => {
      const h = HAZARDS[id], b = riskScore(h.before), f = riskScore(h.after);
      return { id, title: h.title, who: h.who, harm: h.harm, before: b, after: f, beforeBand: riskBand(b), afterBand: riskBand(f), controls: h.controls, activities };
    }).sort((x, y) => y.before - x.before),
    methods: acts.map(id => ({ id, ...ACTIVITIES[id], hazards: ACTIVITIES[id].hazards.map(h => HAZARDS[h].title) })),
    coshh: acts.filter(id => COSHH[id]).map(id => ({ activity: ACTIVITIES[id].title, substances: COSHH[id]! })),
    pack: buildSitePack({ c, input, company, acts, title, reference: a.reference, client: { name: a.client.name, siteAddress: a.client.siteAddress },
      programme: rows, start, finish, net: c.net, gross: c.gross }),
  };
}
