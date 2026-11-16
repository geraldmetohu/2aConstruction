// Integrated management system (IMS) documents for a building contractor, written to follow ISO 9001:2015 (quality),
// ISO 14001:2015 (environment) and ISO 45001:2018 (occupational health & safety), all with the 2024 climate change
// amendment, plus the policies and answers asked for in construction tenders (PAS 91 / Common Assessment Standard).
// Everything is filled in from the company details. Certification itself needs an audit by a UKAS-accredited body.

import type { CompanyProfile } from "../takeoff/company";

export type ImsGroup = "Manual" | "Policies" | "Procedures" | "Registers & forms" | "Tender pack";
export interface ImsBlock { heading: string; paragraphs?: string[]; items?: string[]; table?: { cols: string[]; rows: string[][]; blank?: number; widths?: number[] } }
export interface ImsDoc { id: string; ref: string; group: ImsGroup; title: string; standards: string; purpose: string; blocks: ImsBlock[]; sign?: boolean }

export const IMS_GROUPS: ImsGroup[] = ["Manual", "Policies", "Procedures", "Registers & forms", "Tender pack"];

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const addYears = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + n); return d.toISOString().slice(0, 10); };

export function buildIms(c: CompanyProfile, today: string): { docs: ImsDoc[]; issued: string; review: string; missing: string[] } {
  const co = c.registeredName || c.name || "the Company";
  const trading = c.name || co;
  const md = c.director || "the Managing Director";
  const hs = c.healthSafetyLead || md;
  const sm = c.siteManager || "the Site Manager";
  const fa = c.firstAider || "the appointed first aider";
  const issued = /^\d{4}-\d{2}-\d{2}$/.test(c.imsStart) ? c.imsStart : today;
  const review = addYears(issued, 1);
  const scope = c.imsScope || "Construction, extension, loft conversion, refurbishment and renovation of residential and light commercial buildings, including associated groundworks, structural alterations, roofing, internal fit-out and building services, carried out from our office and on clients' sites in London and the South East of England.";
  const staff = c.employees ? `${c.employees} people` : "a small directly employed team";
  const missing = ([["director", "managing director"], ["employees", "number of employees"], ["address", "address"], ["wasteCarrier", "waste carrier registration"], ["insurer", "insurer"]] as const).filter(([k]) => !c[k]).map(([, l]) => l);

  const docs: ImsDoc[] = [];
  const add = (d: ImsDoc) => docs.push(d);

  // ------------------------------------------------------------------ Manual
  add({ id: "manual", ref: "IMS-01", group: "Manual", title: "Integrated Management System Manual", standards: "ISO 9001 · ISO 14001 · ISO 45001 (clauses 4–10)", sign: true,
    purpose: `How ${co} plans, runs, checks and improves its work so that it is right first time, safe and environmentally responsible.`,
    blocks: [
      { heading: "1. About us and the scope of the system", paragraphs: [`${co}${c.companyNo ? ` (company no. ${c.companyNo})` : ""} trades as ${trading}${c.address ? ` from ${c.address.replace(/\n/g, ", ")}` : ""}. We employ ${staff} and use specialist sub-contractors for regulated and specialist trades.`, `Scope: ${scope}`, "All requirements of ISO 9001, ISO 14001 and ISO 45001 apply. Design (ISO 9001 clause 8.3) applies where we take on design responsibility under a design-and-build contract; structural design is always carried out by a qualified structural engineer appointed by us or the client."] },
      { heading: "2. Context of the organisation (4.1–4.4)", paragraphs: ["We review internal and external issues at each management review, including the condition of the residential building market, availability and cost of skilled labour and materials, regulation (Building Safety Act 2022, Building Regulations, CDM 2015), customer expectations, and climate change – both the effect of extreme weather on site work and our own carbon and waste impacts.", "Interested parties and what they need from us are recorded in the Risks & Opportunities Register (REG-01): clients (safe, on-time, quality work at the agreed price), neighbours (consideration, noise and dust control, party wall compliance), employees and sub-contractors (safe work, fair pay, training), Building Control and the HSE (compliance), suppliers, insurers and the local authority."] },
      { heading: "3. Leadership and commitment (5.1–5.4)", paragraphs: [`${cap(md)} has overall responsibility for the management system, its policies and its results, and makes sure it has the people, time and money it needs.`], items: [
        `${cap(md)} – policies, objectives, resources, management review, final approval of procedures.`,
        `${cap(hs)} – health & safety lead: CDM duties, risk assessments, method statements, incident investigation, consultation with workers.`,
        `${cap(sm)} – site manager: day-to-day control of each site, inspections, briefings, quality checks, handover.`,
        `${cap(fa)} – first aid on site and the accident book.`,
        "Every worker and sub-contractor – work safely, follow the method statement, stop work if unsafe and report hazards, defects, incidents and near misses.",
      ] },
      { heading: "4. Consultation and participation of workers (ISO 45001 5.4)", paragraphs: ["Workers are consulted before changes that affect their health and safety: new methods, plant, substances and the content of risk assessments. This happens through site inductions, weekly toolbox talks, the daily pre-start briefing and an open-door approach to the H&S lead. Workers are told the results of investigations and inspections and are never penalised for raising a concern or stopping unsafe work."] },
      { heading: "5. Planning (6.1–6.3)", items: [
        "Risks and opportunities to the business and the system are assessed in REG-01 (likelihood × impact, 1–5 each) and reviewed at least yearly.",
        "Environmental aspects and their impacts are assessed in REG-02; significant aspects (waste, dust, noise, fuel and spills, asbestos, wildlife in roof spaces) have operational controls.",
        "Hazards are identified and assessed for every job in project risk assessments and method statements; the general hazards of our work are in the H&S Policy (POL-03).",
        "Legal and other requirements (compliance obligations) are listed in REG-03 and checked at least yearly.",
        "Objectives with targets, owners and dates are set in REG-04 and reviewed quarterly.",
        "Changes (new services, new methods, new premises) are planned and their risks assessed before they are introduced.",
      ] },
      { heading: "6. Support (7.1–7.5)", items: [
        "Resources: directly employed trades, approved sub-contractors (REG-06), owned and hired plant (REG-10), office systems and our online estimating, project and client portal system.",
        "Competence: required qualifications for each role (CSCS, Gas Safe, Part P, NVQ, SMSTS/SSSTS, IPAF/PASMA, asbestos awareness, first aid) are tracked in the Training Matrix (REG-05) – PRO-02.",
        "Awareness: everyone is told about the policies, their part in the system and what happens if it is not followed (induction and toolbox talks).",
        "Communication: internal (briefings, toolbox talks, messaging), with clients (client portal, written variations), with neighbours (letters before work starts) and with regulators (Building Control, HSE when required).",
        "Monitoring and measuring equipment (levels, moisture meters, electrical testers, gas analysers) is checked and calibrated – PRO-11.",
        "Documented information is controlled as PRO-01: approved, numbered, revised, available where needed and kept as records.",
        "Organisational knowledge – lessons learned from defects, complaints and audits – is shared in toolbox talks and built into our standard specifications and rate book.",
      ] },
      { heading: "7. Operation (8)", items: [
        "Tendering and contract review (PRO-04): every quotation is built from a site survey, priced from our rate book and reviewed before it is sent; scope, exclusions, programme and payment terms are written down and agreed.",
        "Design control (where we design): requirements recorded, structural design by a chartered engineer, drawings approved by the client and Building Control before work starts.",
        "Externally provided processes and products (PRO-03): sub-contractors and suppliers are approved, briefed and monitored.",
        "Construction control (PRO-05): each project has a programme, a construction phase plan, risk assessments and method statements, an inspection and test plan with hold points (e.g. foundations, steels, pre-plaster, completion), daily site diaries and photographs.",
        "Environmental operational control (PRO-09): waste duty of care, segregation and recycling, dust and noise control, spill prevention, protected wildlife checks before roof work.",
        "Emergency preparedness (PRO-08): fire, first aid, structural instability, gas escape, electrical incident, spills; tested at induction and by drills.",
        "Release and handover: work is checked against the specification and the snagging list before practical completion; certificates and the health & safety file are handed over.",
        "Nonconforming work is identified, recorded and put right (PRO-06).",
      ] },
      { heading: "8. Performance evaluation (9)", items: [
        "Monitoring: accident and near-miss rates, site inspection scores, defects at handover and in the defects period, complaints, customer satisfaction (survey at handover), waste recycled (%), programme and budget performance.",
        "Evaluation of compliance with legal requirements at least yearly (REG-03).",
        "Internal audits to a 12-month programme covering every clause and site (REG-07, PRO-10), by a competent person who does not audit their own work.",
        "Management review at least yearly (FRM-01) with all the inputs required by the standards.",
      ] },
      { heading: "9. Improvement (10)", paragraphs: ["Incidents, nonconformities, complaints and audit findings are recorded (REG-08, REG-09), the root cause is found, corrective action is taken and checked for effectiveness. Opportunities to improve are taken from reviews, feedback from clients and workers, and new methods and materials."] },
      { heading: "10. Where each requirement is met", table: { cols: ["Clause", "ISO 9001", "ISO 14001", "ISO 45001", "Our documents"], widths: [13, 21, 21, 21, 24], rows: [
        ["4", "Context, interested parties, scope", "Context, interested parties, scope", "Context, workers' needs, scope", "IMS-01 §1–2, REG-01"],
        ["5", "Leadership, quality policy, roles", "Leadership, environmental policy", "Leadership, OH&S policy, consultation", "IMS-01 §3–4, POL-01–03, PRO-12"],
        ["6", "Risks & opportunities, objectives", "Aspects, compliance obligations, objectives", "Hazards, legal requirements, objectives", "REG-01–04"],
        ["7", "Resources, competence, documents", "Competence, communication, documents", "Competence, communication, documents", "PRO-01, PRO-02, PRO-11, REG-05"],
        ["8", "Contract review, purchasing, control, release", "Operational control, emergencies", "Hazard control, contractors, emergencies", "PRO-03–05, PRO-08–09"],
        ["9", "Customer satisfaction, audit, review", "Monitoring, compliance, audit, review", "Monitoring, compliance, audit, review", "PRO-10, REG-07, FRM-01"],
        ["10", "Nonconformity & corrective action", "Nonconformity & corrective action", "Incidents, nonconformity & corrective action", "PRO-06, PRO-07, REG-08–09"],
      ] } },
    ] });

  // ------------------------------------------------------------------ Policies
  const policy = (id: string, ref: string, title: string, standards: string, purpose: string, blocks: ImsBlock[]) => add({ id, ref, group: "Policies", title, standards, purpose, blocks, sign: true });
  policy("quality", "POL-01", "Quality Policy", "ISO 9001 clause 5.2", `${co}'s commitment to quality workmanship and service.`, [
    { heading: "Our commitment", paragraphs: [`${co} builds and improves people's homes. Our aim is simple: work that is right first time, delivered safely, on time and at the price we agreed, by people the client is happy to have in their home.`], items: [
      "Understand exactly what each client wants: survey, written scope, clear exclusions and a fixed price before we start.",
      "Meet the Building Regulations, British Standards, manufacturers' instructions and every requirement we agree with the client.",
      "Use competent, qualified trades and approved suppliers, and check work at defined stages before it is covered up.",
      "Keep clients informed throughout through the client portal and a named site manager, and deal with any concern quickly and fairly.",
      "Record and learn from defects, complaints and feedback, and set measurable quality objectives that we review every quarter.",
      "Continually improve the management system and how we work.",
    ] },
    { heading: "Objectives", paragraphs: ["Quality objectives (for example zero defects at handover, every certificate issued at completion, customer satisfaction of 9/10 or better) are set in REG-04 and reviewed at management review. This policy is shared with everyone working for us, available to anyone who asks, and reviewed every year."] },
  ]);
  policy("environment", "POL-02", "Environmental Policy", "ISO 14001 clause 5.2", `${co}'s commitment to protecting the environment.`, [
    { heading: "Our commitment", paragraphs: [`Building work creates waste, dust, noise and carbon. ${co} is committed to protecting the environment, preventing pollution and reducing our impact – including on climate change – in everything we do.`], items: [
      "Comply with all environmental law and other requirements that apply to us, and check compliance every year.",
      "Reduce waste by careful ordering and measuring, re-use materials where we can and separate waste for recycling; use only licensed waste carriers and sites (duty of care).",
      "Prevent pollution: no burning of waste, spill kits on site, fuels and chemicals stored safely, nothing washed into drains.",
      "Control dust and noise to protect clients, neighbours and the public; work within agreed hours.",
      "Check roofs and lofts for bats and nesting birds before work, and stop and take advice if found.",
      "Reduce carbon: plan deliveries and journeys, maintain vehicles and plant, choose energy-efficient products and offer clients insulation, heat pumps and solar.",
      "Choose responsibly sourced materials – FSC / PEFC timber and products with lower environmental impact where practical.",
      "Set environmental objectives (REG-04), measure our performance and keep improving.",
    ] },
  ]);
  policy("hs", "POL-03", "Health & Safety Policy", "ISO 45001 clause 5.2 · Health and Safety at Work etc. Act 1974 s.2(3)", "Statement of intent, organisation and arrangements for health and safety.", [
    { heading: "Part 1 – Statement of intent", paragraphs: [`${co} will provide safe and healthy working conditions and prevent injury and ill health to our employees, sub-contractors, clients, neighbours and the public. We will meet our duties under the Health and Safety at Work etc. Act 1974, the Management of Health and Safety at Work Regulations 1999, the Construction (Design and Management) Regulations 2015 and all other relevant law as the minimum standard.`], items: [
      "Eliminate hazards where we can and reduce the risks that remain, following the hierarchy of control.",
      "Assess the risks of every job and write method statements before work starts; plan high-risk work (work at height, excavations, structural alterations, hot work, asbestos) in detail.",
      "Provide information, instruction, training and supervision, and make sure everyone is competent for their work.",
      "Provide and maintain safe plant and equipment, safe places of work, welfare facilities and the right PPE free of charge.",
      "Consult and involve workers in health and safety, and support anyone who stops work because it is unsafe.",
      "Investigate accidents, incidents and near misses to stop them happening again, and report under RIDDOR where required.",
      "Set health and safety objectives, monitor performance and continually improve.",
    ] },
    { heading: "Part 2 – Organisation (who is responsible)", items: [
      `${cap(md)}: overall responsibility; provides resources; signs this policy; chairs management review.`,
      `${cap(hs)}: health & safety lead; principal contractor duties under CDM 2015 on domestic projects; risk assessments and method statements; incident investigation; competent advice (with external specialist support when needed).`,
      `${cap(sm)}: runs each site safely; induction and daily briefings; inspections of scaffold, excavations and work equipment; permits; keeps the site tidy and secure.`,
      `${cap(fa)}: first aid and the accident book.`,
      "Employees and sub-contractors: follow method statements and instructions, use PPE, report hazards and incidents, stop work if unsafe, do not interfere with anything provided for safety.",
    ] },
    { heading: "Part 3 – Arrangements", table: { cols: ["Topic", "How we manage it"], widths: [28, 72], rows: [
      ["Risk assessment & method statements", "For every job and activity before work starts; briefed to the operatives; reviewed when conditions change (PRO-05)."],
      ["CDM 2015", "Construction phase plan for every project; for domestic clients we take on the client duties; F10 notification where the project exceeds the notification threshold."],
      ["Work at height", "Scaffold by CISRS-carded scaffolders with handover certificates and 7-day inspections; towers by PASMA-trained operatives; ladders for short-duration light work only."],
      ["Structural work & temporary works", "Engineer's design for steels and propping; temporary works checked before loading; no props removed without authority."],
      ["Asbestos", "Asbestos survey (refurbishment & demolition) for pre-2000 buildings before intrusive work; licensed contractors for licensable work; asbestos awareness training for all."],
      ["Hazardous substances (COSHH) & dust", "COSHH assessments and data sheets on site; on-tool extraction and water suppression for silica dust; FFP3 masks with face-fit testing."],
      ["Noise & vibration", "Low-noise / low-vibration tools, hearing protection zones, HAV exposure points monitored."],
      ["Manual handling", "Plan deliveries and lifts; mechanical aids; two-person lifts for steels, boards and glass."],
      ["Electrical & gas safety", "Isolation and lock-off; work by Part P / Gas Safe registered persons; 110 V tools on site; PAT testing."],
      ["Plant & equipment", "Inspected before use, maintained and recorded (PUWER, LOLER) – PRO-11, REG-10."],
      ["Fire", "Hot work permits, fire extinguishers on site, waste removed regularly, escape routes kept clear."],
      ["First aid & welfare", "First aid kit and trained first aider; toilet, washing, drinking water and rest facilities on every site."],
      ["Accidents & incidents", "Recorded and investigated (PRO-07); RIDDOR reports to the HSE within the legal time limits."],
      ["Occupied homes & the public", "Red / amber / green site zones, barriers and signage; children and pets kept out; neighbours informed before work starts."],
      ["Health surveillance", "For workers exposed to noise, vibration, dust or other hazards that require it."],
      ["Consultation", "Toolbox talks, inductions and open reporting (PRO-12)."],
      ["Monitoring", "Site inspections, audits, incident statistics; this policy reviewed every year."],
    ] } },
  ]);
  policy("equality", "POL-04", "Equality, Diversity & Inclusion Policy", "Equality Act 2010", "Fair treatment of everyone who works with us and everyone we work for.", [
    { heading: "Policy", paragraphs: [`${co} is committed to equality of opportunity and to a workplace free from discrimination, harassment and victimisation. We do not discriminate on the grounds of age, disability, gender reassignment, marriage or civil partnership, pregnancy or maternity, race, religion or belief, sex or sexual orientation (the protected characteristics of the Equality Act 2010).`], items: [
      "Recruitment, pay, training and promotion are based on skills, experience and performance.",
      "We make reasonable adjustments for disabled workers and clients.",
      "Bullying, harassment and discriminatory language are not tolerated on our sites or in our office and are dealt with as gross misconduct.",
      "We expect the same standards from our sub-contractors and suppliers.",
      `Concerns can be raised in confidence with ${md}; nobody will be treated less favourably for raising one.`,
    ] },
  ]);
  policy("slavery", "POL-05", "Modern Slavery & Ethical Labour Statement", "Modern Slavery Act 2015", "Our zero-tolerance approach to modern slavery and labour exploitation.", [
    { heading: "Statement", paragraphs: [`${co} has zero tolerance of slavery, servitude, forced or compulsory labour and human trafficking in our business and our supply chain. Construction is a high-risk sector for labour exploitation, and we take the following steps.`], items: [
      "Right-to-work checks for every employee; we pay at least the National Living Wage and pay on time.",
      "Sub-contractors are approved before use (PRO-03) and confirm in writing that they comply with the Modern Slavery Act and pay their workers directly and fairly.",
      "Site managers check identity and CSCS cards at induction and look out for signs of exploitation (no access to own documents, being transported to site by others, signs of fear or control).",
      "Concerns can be reported in confidence to the directors or to the Modern Slavery & Exploitation Helpline (08000 121 700).",
      "This statement is reviewed every year.",
    ] },
  ]);
  policy("bribery", "POL-06", "Anti-Bribery & Corruption Policy", "Bribery Act 2010", "How we prevent bribery and corruption.", [
    { heading: "Policy", paragraphs: [`${co} conducts its business honestly and does not offer, give, request or accept bribes in any form, directly or through others. This applies to everyone working for us and on our behalf.`], items: [
      "No payments or favours to obtain or keep work, approvals or inspections.",
      "Gifts and hospitality only if modest, occasional and recorded; never to public officials.",
      "No facilitation payments.",
      "Conflicts of interest are declared to the directors.",
      "Breaches are a disciplinary matter and may be reported to the authorities.",
    ] },
  ]);
  policy("data", "POL-07", "Data Protection & Information Security Policy", "UK GDPR · Data Protection Act 2018", "How we protect personal and business information.", [
    { heading: "Policy", paragraphs: [`${co} is the data controller for the personal data of our clients, employees and contacts. We process it lawfully, fairly and transparently, only for the purposes we collected it for, and keep it secure.`], items: [
      "We collect only what we need (contact details, site address, project information, payment records) and keep it no longer than necessary (accounting records 6 years; health & safety records as required by law).",
      "Systems are protected by individual logins, strong passwords and two-step verification where available; client data is held in our access-controlled systems, not on personal devices.",
      "Photographs of clients' homes are used for marketing only with written consent and never show the address or people.",
      "Data breaches are reported to the directors at once and to the ICO within 72 hours where required.",
      "People can ask for a copy of their data, or for it to be corrected or deleted, by contacting us.",
    ] },
  ]);
  policy("sustainability", "POL-08", "Sustainable Procurement & Responsible Sourcing Policy", "ISO 14001 · ISO 20400 guidance", "How we choose suppliers and materials responsibly.", [
    { heading: "Policy", items: [
      "Buy from established UK merchants and suppliers who can show legal, responsibly sourced products – FSC or PEFC certified timber, CE / UKCA marked products.",
      "Prefer local suppliers and consolidated deliveries to reduce transport.",
      "Choose durable, energy-efficient and low-VOC products and offer clients lower-carbon options.",
      "Order accurately from measured quantities to reduce waste, and return or re-use surplus materials.",
      "Pay suppliers and sub-contractors on time and fairly.",
    ] },
  ]);
  policy("drugs", "POL-09", "Drugs & Alcohol Policy", "Health and Safety at Work etc. Act 1974 · Misuse of Drugs Act 1971", "Fitness for work on our sites.", [
    { heading: "Policy", items: [
      "Nobody may work on our sites, drive for work or operate plant while under the influence of alcohol or drugs (including misuse of prescribed medicines).",
      "Anyone taking medication that may affect their ability to work safely must tell their supervisor.",
      "We may carry out testing for cause (after an incident or where there is reasonable suspicion), with consent.",
      "Anyone found unfit for work will be removed from site; breaches are gross misconduct.",
      "Anyone with a problem is encouraged to ask for help in confidence and will be supported.",
    ] },
  ]);

  // ------------------------------------------------------------------ Procedures
  const proc = (id: string, ref: string, title: string, standards: string, purpose: string, steps: string[], records: string[], extra: ImsBlock[] = []) =>
    add({ id, ref, group: "Procedures", title, standards, purpose, blocks: [{ heading: "Procedure", items: steps }, ...extra, { heading: "Records kept", items: records }] });
  proc("p-docs", "PRO-01", "Document & Record Control", "ISO 9001 7.5 · ISO 14001 7.5 · ISO 45001 7.5", "Make sure the right, current documents are in use and records are kept.", [
    `Every controlled document has a reference, revision number, issue date and approver (${md}) shown on it.`,
    "Documents are reviewed at least every 12 months or when work, law or the standards change; changes are approved before issue and the revision number goes up.",
    "Current documents are kept in the company system; superseded versions are marked and kept for reference only.",
    "Project documents (quotation, contract, drawings, risk assessments, method statements, inspection records, certificates, photographs) are kept against the job in our project system.",
    "Records are protected from loss and kept for at least: 6 years (contracts, quotes, accounts), 3 years (accident book entries), 40 years (asbestos health records), the life of the building (health & safety file – given to the client).",
  ], ["Document register (this system)", "Revision history on each document"]);
  proc("p-training", "PRO-02", "Competence, Training & Induction", "ISO 9001 7.2–7.3 · ISO 14001 7.2–7.3 · ISO 45001 7.2–7.3", "Make sure everyone is competent for their work.", [
    "Each role has defined competence requirements (qualification, card, experience) in the Training Matrix (REG-05).",
    "Before starting, new workers and sub-contractors are checked (CSCS / trade card, qualifications, right to work) and given a site induction covering the site rules, zones, emergency arrangements, the risk assessment and method statement.",
    "Training needs are reviewed at least yearly and when work changes; refresher dates are tracked and booked before expiry.",
    "Toolbox talks are given weekly and signed for.",
    "Training is checked for effectiveness through site observation and inspection results.",
  ], ["Training matrix (REG-05)", "Certificates and card copies", "Induction and toolbox talk sign-off sheets"]);
  proc("p-supply", "PRO-03", "Subcontractor & Supplier Selection and Monitoring", "ISO 9001 8.4 · ISO 45001 8.1.4 · ISO 14001 8.1", "Use only competent, reliable sub-contractors and suppliers.", [
    "New sub-contractors complete the pre-qualification questionnaire (FRM-02): insurance, qualifications, registration (Gas Safe, NICEIC/NAPIT, FENSA, MCS as needed), health & safety record, risk assessments, references.",
    "Approval is recorded in REG-06 with an expiry date for insurance and registrations.",
    "Each package is ordered in writing with the scope, programme, standards and site rules; their RAMS are reviewed and accepted before they start.",
    "Performance (quality, safety, programme, tidiness) is rated after each job; poor performers are suspended or removed from the list.",
    "Suppliers are approved on quality, reliability, price and responsible sourcing; deliveries are checked against the order and rejected if damaged or wrong.",
  ], ["Approved list (REG-06)", "Pre-qualification questionnaires", "Performance ratings"]);
  proc("p-tender", "PRO-04", "Tendering & Contract Review", "ISO 9001 8.2", "Make sure we understand and can deliver every job before we commit.", [
    "Enquiry logged; site survey carried out with measurements and photographs; drawings and specifications read.",
    "Quotation built from the rate book with the scope, client supplies, exclusions, assumptions, programme and payment schedule.",
    "Review before issue: is the scope complete, are we competent and resourced, are approvals (planning, Building Control, party wall) identified, are risks priced?",
    "On acceptance, the contract, programme and health & safety documents are issued; changes after acceptance are agreed in writing as variations with price and time.",
  ], ["Quotations and versions", "Signed contracts / portal acceptances", "Variation records"]);
  proc("p-site", "PRO-05", "Site Control, Inspection & Test", "ISO 9001 8.5–8.6 · ISO 14001 8.1 · ISO 45001 8.1", "Control the work on site so that it is safe and right first time.", [
    "Before start: construction phase plan, risk assessments and method statements, site zone plan, programme, services located and isolated, neighbours informed, welfare and site set-up in place.",
    "Daily: pre-start briefing; site diary; housekeeping; end-of-day make-safe.",
    "Weekly: site safety inspection (scaffold, edges, access, fire, welfare, waste, dust); toolbox talk.",
    "Hold points from the inspection & test plan are signed off before work continues (e.g. foundations, drainage, DPC, steel bearings, roof structure, pre-plaster services and insulation, waterproofing, completion). Building Control inspections are booked at the same points.",
    "Photographs are taken of work before it is covered (structure, fire-stopping, insulation, waterproofing).",
    "At completion: snagging walk-round with the client, certificates collected (electrical, gas, Building Control, FENSA, MCS), health & safety file handed over.",
  ], ["Site diary", "Inspection checklists", "Signed hold points", "Photographs", "Handover certificates"]);
  proc("p-ncr", "PRO-06", "Non-conformance, Corrective Action & Complaints", "ISO 9001 8.7 & 10.2 · ISO 14001 10.2 · ISO 45001 10.2", "Put things right and stop them happening again.", [
    "Anyone who finds work, a product or a process that does not meet requirements stops it being used or covered and tells the site manager.",
    "The nonconformity is recorded in REG-08 with what was found, the immediate fix and who owns it.",
    "Complaints from clients or neighbours are acknowledged within 2 working days and answered in full within 7 days; they are logged in REG-08.",
    "For anything more than a minor slip, the root cause is found (5 whys) and a corrective action agreed with a date.",
    "The action is checked later to confirm it worked, and the lesson shared in a toolbox talk.",
  ], ["Nonconformity & corrective action log (REG-08)", "Complaint correspondence"]);
  proc("p-incident", "PRO-07", "Incident Reporting & Investigation", "ISO 45001 10.2 · RIDDOR 2013", "Respond to, report and learn from accidents, incidents and near misses.", [
    "Make the area safe, give first aid, call 999 if needed.",
    "Record every accident in the accident book and every incident and near miss in REG-09 the same day.",
    `Tell ${hs} straight away. Specified injuries, dangerous occurrences and fatalities are reported to the HSE without delay (by phone for fatal and specified injuries) and in writing within 10 days; over-7-day injuries within 15 days; reportable occupational diseases when diagnosed.`,
    "Investigate in proportion to the seriousness: what happened, why (immediate and root causes), what will stop it happening again.",
    "Agree and track the actions; share the lessons with the team; review the risk assessment.",
    "Tell the insurer where a claim may follow.",
  ], ["Accident book", "Incident & near-miss log (REG-09)", "Investigation reports", "RIDDOR reference numbers"]);
  proc("p-emergency", "PRO-08", "Emergency Preparedness & Response", "ISO 14001 8.2 · ISO 45001 8.2", "Be ready for emergencies on every site.", [
    "The site-specific emergency arrangements (assembly point, nearest A&E, first aider, extinguishers, gas / water / electricity isolation points) are in the construction phase plan and briefed at induction.",
    "Fire: raise the alarm, evacuate to the assembly point, call 999; fight a fire only if trained and safe to do so.",
    "Gas escape: no switches or flames, open windows, turn off at the meter, evacuate, call 0800 111 999.",
    "Structural movement or collapse: evacuate, keep everyone away, call the structural engineer and emergency services if anyone is trapped.",
    "Electrical incident: isolate before touching the casualty; call 999.",
    "Spill of fuel, oil or chemicals: stop the source, use the spill kit, protect drains, collect contaminated material as hazardous waste; report pollution to the Environment Agency (0800 80 70 60).",
    "Bats or nesting birds found: stop work in that area and take advice from Natural England / an ecologist.",
    "Drills and the arrangements are reviewed at least yearly and after any emergency.",
  ], ["Emergency arrangements in each construction phase plan", "Drill and review records"]);
  proc("p-waste", "PRO-09", "Waste Management & Environmental Controls", "ISO 14001 8.1 · Environmental Protection Act 1990 s.34", "Control waste, dust, noise and pollution on our sites.", [
    `Waste is carried only by us${c.wasteCarrier ? ` (waste carrier registration ${c.wasteCarrier})` : " (registered waste carrier)"} or by registered carriers to permitted sites; a waste transfer note is kept for every load (consignment note for hazardous waste).`,
    "Waste is minimised by accurate ordering and segregated on site where space allows (inert, metal, timber, plasterboard, general); plasterboard is never mixed with general waste.",
    "Hazardous waste (asbestos, oils, paints, solvents, treated timber, fluorescent tubes) is stored and removed separately.",
    "Dust: on-tool extraction, water suppression, sheeting of skips, damping down, zip doors in occupied homes.",
    "Noise: work within agreed hours, quieter methods and plant, neighbours warned of noisy days.",
    "Fuels and chemicals stored on drip trays away from drains; spill kit on every site.",
    "Roofs and lofts are checked for bats and nesting birds before work starts.",
    "Recycling rate and waste per project are recorded and reported at management review.",
  ], ["Waste transfer and consignment notes", "Skip and grab tickets", "Recycling figures"]);
  proc("p-audit", "PRO-10", "Internal Audit & Management Review", "ISO 9001 9.2–9.3 · ISO 14001 9.2–9.3 · ISO 45001 9.2–9.3", "Check the system works and decide what to improve.", [
    "Internal audits follow the 12-month programme (REG-07) covering every clause, process and at least one live site per quarter.",
    "Audits are done by a competent person who does not audit their own work (an external consultant may be used).",
    "Findings are reported, nonconformities raised in REG-08 and actions followed up.",
    "Management review is held at least every 12 months using FRM-01, covering: actions from the last review; changes in issues, interested parties, risks and law; performance against objectives; customer satisfaction and complaints; incidents, nonconformities and corrective actions; audit results; compliance evaluation; supplier and sub-contractor performance; resources; consultation with workers; communication with interested parties; opportunities to improve.",
    "The review decides changes, resources and new objectives; minutes are kept.",
  ], ["Audit programme and reports", "Management review minutes (FRM-01)"]);
  proc("p-plant", "PRO-11", "Plant, Equipment & Calibration", "PUWER 1998 · LOLER 1998 · ISO 9001 7.1.5", "Keep plant, tools and measuring equipment safe and accurate.", [
    "All plant and tools are listed in REG-10 with their inspection and service dates.",
    "Users check equipment before use; faulty equipment is labelled and taken out of use.",
    "Portable electrical equipment is 110 V or battery on site and PAT tested at intervals set by use (typically 3-monthly for 110 V site tools).",
    "Lifting equipment and accessories are thoroughly examined every 6 or 12 months as LOLER requires.",
    "Scaffold is inspected before first use, every 7 days and after bad weather; towers after assembly.",
    "Measuring and test equipment (electrical testers, gas analysers, moisture meters, lasers) is calibrated to the manufacturer's interval.",
    "Hired plant arrives with its certificates and is checked before use.",
  ], ["Plant & equipment register (REG-10)", "Inspection, PAT, LOLER and calibration certificates"]);
  proc("p-consult", "PRO-12", "Consultation & Communication", "ISO 45001 5.4 & 7.4 · ISO 14001 7.4 · ISO 9001 7.4", "Involve workers and keep everyone informed.", [
    "Workers are consulted on risk assessments, method statements, PPE, new plant and changes that affect them – at the pre-start briefing and toolbox talks.",
    "Anyone can raise a concern or idea directly with the site manager or directors; concerns are answered and recorded.",
    "Clients are kept informed through the client portal: programme, photographs, decisions needed, variations, invoices and snagging.",
    "Neighbours receive a letter before work starts with the programme, working hours and a contact number.",
    "Regulators (Building Control, HSE, Environment Agency, local authority) are contacted as required by law and our procedures.",
  ], ["Toolbox talk records", "Client portal messages", "Neighbour letters"]);

  // ------------------------------------------------------------------ Registers & forms
  const reg = (id: string, ref: string, title: string, standards: string, purpose: string, table: ImsBlock["table"], notes: string[] = []) =>
    add({ id, ref, group: "Registers & forms", title, standards, purpose, blocks: [{ heading: title, table, ...(notes.length ? { items: notes } : {}) }] });
  reg("r-risks", "REG-01", "Risks & Opportunities Register", "ISO 9001 6.1 · ISO 14001 6.1 · ISO 45001 6.1", "Business risks and opportunities, interested parties and the actions taken (score = likelihood × impact, 1–5 each).", { cols: ["Issue / interested party", "Risk or opportunity", "L", "I", "Score", "Action", "Owner"], widths: [20, 26, 5, 5, 7, 27, 10], rows: [
    ["Skilled labour shortage", "Risk: delays, quality", "3", "4", "12", "Keep a core team; approved sub-contractor list with backups; plan programmes early", md],
    ["Material prices and lead times", "Risk: margin, programme", "4", "3", "12", "Supplier price links in the rate book; order long-lead items at contract; price review on quotes over 30 days", md],
    ["Clients – expectations", "Risk: disputes, complaints", "3", "3", "9", "Written scope, exclusions, client portal, named site manager", sm],
    ["Neighbours / party walls", "Risk: complaints, delays, damage claims", "3", "3", "9", "Neighbour letters, schedule of condition, Party Wall Act notices", sm],
    ["Building Safety Act 2022 – competence", "Risk: non-compliance", "2", "4", "8", "Competence records (REG-05); dutyholder roles defined for each project", md],
    ["Extreme weather / climate change", "Risk: roof open, programme", "3", "4", "12", "Temporary roof sheeting; weather planning; programme float", sm],
    ["Retrofit and low-carbon demand", "Opportunity: new work", "4", "3", "12", "Offer heat pumps, solar, insulation; train staff; MCS partners", md],
    ["Tenders and larger clients", "Opportunity: growth", "3", "4", "12", "Certification to ISO 9001/14001/45001; SSIP accreditation; this tender pack", md],
  ] }, ["Reviewed at least every 12 months and at management review."]);
  reg("r-aspects", "REG-02", "Environmental Aspects & Impacts Register", "ISO 14001 6.1.2", "Environmental aspects of our work, their impacts and how they are controlled (significant if score 12 or more).", { cols: ["Activity", "Aspect", "Impact", "Score", "Significant", "Control"], widths: [16, 18, 18, 8, 10, 30], rows: [
    ["Demolition & strip out", "Construction & demolition waste", "Landfill use, resource loss", "16", "Yes", "Segregation, licensed carriers, recycling target (REG-04)"],
    ["Cutting masonry / concrete", "Silica dust", "Air quality, nuisance, health", "15", "Yes", "Water suppression, extraction, sheeting"],
    ["Breaking out, plant", "Noise and vibration", "Nuisance to neighbours", "12", "Yes", "Agreed hours, quieter methods, neighbour letters"],
    ["Plant and vehicles", "Fuel use, emissions", "Climate change, air quality", "12", "Yes", "Route planning, maintained vehicles, consolidated deliveries"],
    ["Fuel / oil / chemicals", "Spills", "Pollution of land and water", "10", "No", "Drip trays, spill kit, storage away from drains"],
    ["Roof and loft work", "Disturbance of bats / nesting birds", "Harm to protected species", "10", "No", "Pre-work checks; stop and seek advice"],
    ["Asbestos-containing materials", "Hazardous waste", "Pollution, health", "15", "Yes", "Survey, licensed removal, consignment notes"],
    ["Painting / cleaning", "Washing out into drains", "Water pollution", "9", "No", "Wash out to containers; dispose correctly"],
    ["Timber purchase", "Resource use", "Deforestation", "8", "No", "FSC / PEFC timber"],
  ] });
  reg("r-legal", "REG-03", "Legal & Other Requirements Register", "ISO 14001 6.1.3 · ISO 45001 6.1.3 · ISO 9001 4.2", "The main laws and requirements that apply to our work (England), how they apply and how we comply. Checked at least yearly.", { cols: ["Requirement", "How it applies / how we comply"], widths: [38, 62], rows: [
    ["Health and Safety at Work etc. Act 1974", "General duties to employees and others – H&S Policy, risk assessments"],
    ["Management of Health and Safety at Work Regulations 1999", "Risk assessment, competent advice, emergency procedures"],
    ["Construction (Design and Management) Regulations 2015", "Construction phase plan, principal contractor duties, domestic client duties, F10 where notifiable"],
    ["Work at Height Regulations 2005", "Scaffold, towers, ladders, edge protection"],
    ["Control of Asbestos Regulations 2012", "Surveys, licensed removal, awareness training"],
    ["COSHH Regulations 2002 (as amended)", "Assessments for substances and dust"],
    ["Control of Noise at Work Regulations 2005 / Vibration Regulations 2005", "Exposure assessment, PPE, HAV monitoring"],
    ["Manual Handling Operations Regulations 1992", "Lift planning, mechanical aids"],
    ["PPE at Work Regulations 1992 (as amended 2022)", "Free PPE for employees and limb (b) workers"],
    ["PUWER 1998 / LOLER 1998", "Plant inspection and maintenance, lifting equipment examinations"],
    ["RIDDOR 2013", "Reporting injuries, diseases and dangerous occurrences"],
    ["Health and Safety (First-Aid) Regulations 1981", "First aiders and kits"],
    ["Electricity at Work Regulations 1989", "Safe isolation, competent electricians"],
    ["Gas Safety (Installation and Use) Regulations 1998", "Gas work by Gas Safe registered engineers"],
    ["Regulatory Reform (Fire Safety) Order 2005", "Fire risk on sites and in our premises"],
    ["Building Regulations 2010 & Building Safety Act 2022", "Compliance of the work, competence, Building Control notifications"],
    ["Party Wall etc. Act 1996", "Notices to neighbours before notifiable work"],
    ["Environmental Protection Act 1990 (s.34 duty of care)", "Waste transfer notes, registered carriers"],
    ["Waste (England and Wales) Regulations 2011 / Hazardous Waste Regulations 2005", "Waste hierarchy, consignment notes"],
    ["Control of Pollution Act 1974 (ss.60–61)", "Construction noise; local authority consents where needed"],
    ["Wildlife and Countryside Act 1981 / Conservation of Habitats and Species Regulations 2017", "Bats and nesting birds in roofs"],
    ["Consumer Rights Act 2015 / Consumer Contracts Regulations 2013", "Reasonable care and skill; 14-day cancellation"],
    ["Housing Grants, Construction and Regeneration Act 1996", "Payment and adjudication for non-domestic contracts"],
    ["UK GDPR / Data Protection Act 2018", "Client and employee data"],
    ["Equality Act 2010 · Modern Slavery Act 2015 · Bribery Act 2010", "Policies POL-04 to POL-06"],
    ["Employers' Liability (Compulsory Insurance) Act 1969", `Employer's liability insurance${c.employersLiability ? ` (${c.employersLiability})` : ""}, certificate displayed`],
    ["Working Time Regulations 1998 · National Minimum Wage Act 1998", "Hours, rest, holiday and pay"],
    ["Other: client and contract requirements, manufacturers' instructions, British Standards, trade scheme rules", "Read at contract review (PRO-04)"],
  ] });
  reg("r-objectives", "REG-04", "Objectives & Targets", "ISO 9001 6.2 · ISO 14001 6.2 · ISO 45001 6.2", "Measurable objectives, reviewed quarterly.", { cols: ["Objective", "Target", "Measure", "Owner", "Review"], widths: [30, 22, 22, 13, 13], rows: [
    ["Zero reportable accidents", "0 RIDDOR events", "Incident log", hs, "Quarterly"],
    ["Report near misses", "≥ 1 per site per month", "Incident log", sm, "Quarterly"],
    ["Right first time", "Snags at handover ≤ 10 per project", "Snagging lists", sm, "Quarterly"],
    ["Happy clients", "Satisfaction ≥ 9 / 10", "Handover survey", md, "Quarterly"],
    ["Complaints resolved", "100% answered within 7 days", "REG-08", md, "Quarterly"],
    ["Recycle waste", "≥ 80% diverted from landfill", "Waste transfer notes", sm, "Quarterly"],
    ["Training up to date", "100% cards and tickets in date", "REG-05", hs, "Quarterly"],
    ["On programme", "≥ 85% of projects completed within the agreed date (plus agreed extensions)", "Project records", md, "Quarterly"],
  ] });
  reg("r-training", "REG-05", "Training & Competence Matrix", "ISO 9001 7.2 · ISO 45001 7.2", "Qualifications and expiry dates for every person working for us.", { cols: ["Name", "Role", "CSCS / trade card", "Trade qualification", "SMSTS / SSSTS", "First aid", "Asbestos awareness", "IPAF / PASMA", "Other"], rows: [], blank: 10 });
  reg("r-suppliers", "REG-06", "Approved Suppliers & Subcontractors", "ISO 9001 8.4 · ISO 45001 8.1.4", "Approved suppliers and sub-contractors with their checks and expiry dates.", { cols: ["Name", "Trade / product", "Insurance expiry", "Registration (Gas Safe, NICEIC…)", "RAMS seen", "Approved by / date", "Rating"], rows: [], blank: 12 });
  reg("r-audit", "REG-07", "Internal Audit Programme (12 months)", "ISO 9001 9.2 · ISO 14001 9.2 · ISO 45001 9.2", `Audit programme from ${issued}.`, { cols: ["Quarter", "Processes / clauses", "Site audit", "Auditor", "Done / report ref"], widths: [12, 44, 16, 14, 14], rows: [
    ["Q1", "Context, leadership, policies, objectives, document control (4, 5, 6.2, 7.5)", "1 live site", "", ""],
    ["Q2", "Tendering & contract review, purchasing & sub-contractors, competence (7.2, 8.2, 8.4)", "1 live site", "", ""],
    ["Q3", "Site control, inspection & test, environmental controls, emergencies (8.1, 8.2, 8.5–8.7)", "1 live site", "", ""],
    ["Q4", "Monitoring, compliance evaluation, incidents, corrective action, management review (9, 10)", "1 live site", "", ""],
  ] });
  reg("r-ncr", "REG-08", "Nonconformity, Complaint & Corrective Action Log", "ISO 9001 10.2 · ISO 14001 10.2 · ISO 45001 10.2", "Every nonconformity, complaint and audit finding until it is closed.", { cols: ["No.", "Date", "Job / area", "What was found", "Immediate action", "Root cause", "Corrective action / owner / due", "Closed & effective?"], rows: [], blank: 12 });
  reg("r-incidents", "REG-09", "Accident, Incident & Near-miss Log", "ISO 45001 10.2 · RIDDOR 2013", "All accidents, incidents and near misses (personal details kept in the accident book).", { cols: ["Date", "Site", "Type (accident / near miss / dangerous occurrence / environmental)", "What happened", "Injury / damage", "RIDDOR? ref", "Investigation & actions", "Closed"], rows: [], blank: 12 });
  reg("r-plant", "REG-10", "Plant, Equipment & Calibration Register", "PUWER 1998 · LOLER 1998 · ISO 9001 7.1.5", "Owned and hired plant, tools and measuring equipment.", { cols: ["Item", "ID / serial", "Owned / hired", "Inspection type (PAT, LOLER, service, calibration)", "Last", "Next due", "Checked by"], rows: [], blank: 14 });
  add({ id: "f-review", ref: "FRM-01", group: "Registers & forms", title: "Management Review Minutes", standards: "ISO 9001 9.3 · ISO 14001 9.3 · ISO 45001 9.3", purpose: "Template for the yearly (or more frequent) management review.", blocks: [
    { heading: "Meeting", table: { cols: ["Date", "Attendees", "Period reviewed"], rows: [], blank: 1 } },
    { heading: "Inputs reviewed", table: { cols: ["Input", "Summary / data", "Decision or action"], widths: [34, 38, 28], rows: [
      ["Actions from the previous review", "", ""], ["Changes in issues, interested parties, risks & opportunities, law (incl. climate change)", "", ""],
      ["Objectives – performance against targets (REG-04)", "", ""], ["Customer satisfaction & complaints", "", ""], ["Incidents, near misses, ill health", "", ""],
      ["Nonconformities & corrective actions", "", ""], ["Internal & external audit results", "", ""], ["Evaluation of compliance (REG-03)", "", ""],
      ["Environmental performance (waste, recycling, fuel)", "", ""], ["Supplier & sub-contractor performance", "", ""], ["Consultation with workers", "", ""],
      ["Adequacy of resources", "", ""], ["Opportunities for improvement", "", ""],
    ] } },
    { heading: "Outputs", items: ["Is the management system still suitable, adequate and effective? ____", "Changes to the system, policies or objectives: ____", "Resources needed: ____", "Next review date: ____"] },
  ], sign: true });
  add({ id: "f-pqq", ref: "FRM-02", group: "Registers & forms", title: "Subcontractor Pre-qualification Questionnaire", standards: "ISO 9001 8.4 · ISO 45001 8.1.4", purpose: "Completed by every new sub-contractor before approval.", blocks: [
    { heading: "Company details", table: { cols: ["Question", "Answer"], widths: [45, 55], rows: [["Company / trading name", ""], ["Address", ""], ["Company / UTR number", ""], ["Contact name, phone, email", ""], ["Trade(s)", ""], ["Number of operatives", ""]] } },
    { heading: "Insurance & registration", table: { cols: ["Question", "Answer / expiry"], widths: [45, 55], rows: [["Public liability (min £5m) – insurer, policy, expiry", ""], ["Employer's liability (if employing)", ""], ["Registration (Gas Safe, NICEIC / NAPIT, FENSA, MCS, CISRS…)", ""], ["CIS status (gross / net 20% / 30%)", ""]] } },
    { heading: "Health, safety & environment", table: { cols: ["Question", "Answer"], widths: [45, 55], rows: [["Do you have a written H&S policy? (attach)", ""], ["Risk assessments & method statements for your work (attach examples)", ""], ["RIDDOR reportable incidents / HSE notices in the last 3 years", ""], ["Operatives' CSCS / trade cards (attach list)", ""], ["How you dispose of waste (carrier registration)", ""], ["Do you comply with the Modern Slavery Act and pay your workers directly?", ""]] } },
    { heading: "References & declaration", paragraphs: ["Two recent references (name, contact, project). I confirm the information above is true and I will tell " + co + " of any change.", "Signed: ____________________   Name: ____________________   Date: __________"] },
    { heading: "For office use", paragraphs: ["Approved: Yes / No   By: ____________   Date: ________   Added to REG-06: ☐"] },
  ] });

  // ------------------------------------------------------------------ Tender pack
  add({ id: "t-profile", ref: "TND-01", group: "Tender pack", title: "Company Profile & Capability Statement", standards: "Tender / pre-qualification", purpose: "A summary of who we are and what we do, for tenders and new clients.", blocks: [
    { heading: "Who we are", paragraphs: [`${co}${c.companyNo ? `, registered in England & Wales no. ${c.companyNo}` : ""}${c.vatNo ? `, VAT no. ${c.vatNo}` : ""}, is a residential building contractor${c.address ? ` based at ${c.address.replace(/\n/g, ", ")}` : ""}. We employ ${staff} and work with a vetted team of specialist sub-contractors.`] },
    { heading: "What we do", items: ["Loft conversions – dormer, hip-to-gable, mansard and roof-light", "Single and two-storey extensions, side returns and wraparounds", "Whole-house refurbishments and renovations; kitchens and bathrooms", "Structural alterations – steels, knock-throughs, chimney removal", "Roofing, rendering, external wall insulation and windows", "Heating, energy upgrades (heat pumps, solar, insulation), damp and repairs", "Garage conversions, basements and garden buildings"] },
    { heading: "How we work", items: ["Management system following ISO 9001, ISO 14001 and ISO 45001 (this document set)", "Fixed written quotations, clear contracts and a written workmanship guarantee on every job", "Construction phase plan, risk assessments and method statements on every project", "Online client portal: progress, photographs, decisions, invoices and snagging", "Registered trades for electrical (Part P) and gas (Gas Safe) work; Building Control on all notifiable work"] },
    { heading: "Accreditations, memberships & insurance", table: { cols: ["Item", "Details"], widths: [35, 65], rows: [
      ["Accreditations", c.accreditations || "— (add the accreditations you hold on the Company page)"],
      ["Memberships", c.memberships || "—"],
      ["Public liability", c.publicLiability ? `${c.publicLiability}${c.insurer ? ` – ${c.insurer}` : ""}${c.policyNo ? `, policy ${c.policyNo}` : ""}` : "—"],
      ["Employer's liability", c.employersLiability || "—"],
      ["Contract works", c.contractorsAllRisk || "—"],
      ["Waste carrier registration", c.wasteCarrier || "—"],
      ["Contact", [c.phone, c.email, c.website].filter(Boolean).join(" · ") || "—"],
    ] } },
  ] });
  add({ id: "t-pqq", ref: "TND-02", group: "Tender pack", title: "Pre-qualification Answers (PAS 91 / Common Assessment Standard)", standards: "PAS 91:2017 · Build UK Common Assessment Standard", purpose: "Ready answers to the core pre-qualification questions, pointing to the evidence in this pack.", blocks: [
    { heading: "Core questions", table: { cols: ["Question", "Our answer", "Evidence"], widths: [30, 50, 20], rows: [
      ["Do you have a health & safety policy, signed and reviewed in the last 12 months?", `Yes – signed by ${md}, reviewed annually.`, "POL-03"],
      ["How do you assess risk and plan work?", "Project risk assessments, method statements and a construction phase plan for every job; red / amber / green site zoning.", "PRO-05, sample RAMS"],
      ["How do you ensure competence of employees and sub-contractors?", "Training matrix, card checks at induction, sub-contractor pre-qualification and approval.", "PRO-02, PRO-03, REG-05, REG-06"],
      ["Do you consult your workforce on health & safety?", "Yes – pre-start briefings, weekly toolbox talks, open reporting.", "PRO-12"],
      ["How do you report and investigate accidents? RIDDOR record (3 years)?", "Incident procedure with root cause investigation; RIDDOR reporting.", "PRO-07, REG-09"],
      ["Have you had any HSE enforcement (improvement / prohibition notices) or prosecutions in the last 3 years?", "Answer: ____ (state honestly)", "—"],
      ["Do you have an environmental policy and manage waste legally?", `Yes – registered waste carrier${c.wasteCarrier ? ` ${c.wasteCarrier}` : ""}, transfer notes kept, recycling target 80%.`, "POL-02, PRO-09, REG-02"],
      ["Do you have a quality management system?", "Yes – management system following ISO 9001 with inspection & test hold points and handover checks.", "IMS-01, POL-01, PRO-05"],
      ["Equality & diversity, modern slavery, anti-bribery, data protection policies?", "Yes – all in place and reviewed annually.", "POL-04 to POL-07"],
      ["Insurance levels", [c.publicLiability && `PL ${c.publicLiability}`, c.employersLiability && `EL ${c.employersLiability}`].filter(Boolean).join(" · ") || "PL ____  EL ____", "Insurance certificates"],
      ["Financial standing", "Latest filed accounts at Companies House; bank reference on request.", "Accounts"],
      ["Building Safety Act competence", "Competence of individuals and the organisation recorded; dutyholder roles agreed per project.", "REG-05, IMS-01"],
    ] } },
  ] });
  add({ id: "t-evidence", ref: "TND-03", group: "Tender pack", title: "Accreditation Route & Evidence Checklist", standards: "SSIP · UKAS-accredited ISO certification", purpose: "What to gather and the steps to become certified and accredited.", blocks: [
    { heading: "Important", paragraphs: ["These documents set up a management system that follows ISO 9001, ISO 14001 and ISO 45001. They do not make the company certified. Certification needs an assessment by a UKAS-accredited certification body (stage 1 document review, then stage 2 on-site audit, then yearly surveillance audits). Until then, describe the company as \"operating a management system aligned to ISO 9001, ISO 14001 and ISO 45001\" – never as ISO certified."] },
    { heading: "Steps to certification", items: ["Fill in the company details and sign the policies.", "Run the system for about 3 months: keep the registers, inspection records, toolbox talks and incident log up to date.", "Carry out at least one full internal audit (REG-07) and a management review (FRM-01).", "Get quotes from UKAS-accredited certification bodies (check accreditation on the UKAS website) for an integrated 9001/14001/45001 audit.", "Stage 1 and stage 2 audits; close any findings; certificate issued (valid 3 years with yearly surveillance)."] },
    { heading: "Quick wins for tenders (SSIP)", items: ["An SSIP member scheme (e.g. CHAS, SafeContractor, Constructionline) assesses health & safety and is accepted by most main contractors and councils; one SSIP certificate is recognised by the others under deem-to-satisfy.", "Constructionline Gold / CHAS Elite use the Common Assessment Standard – TND-02 answers most questions."] },
    { heading: "Evidence checklist", table: { cols: ["Evidence", "Have it?"], widths: [80, 20], rows: [
      ["Signed policies POL-01 to POL-09 (dated within 12 months)", "☐"], ["Insurance certificates (PL, EL, contract works)", "☐"], ["Waste carrier registration certificate", "☐"],
      ["Training matrix and copies of cards / certificates", "☐"], ["Sample construction phase plan, risk assessment and method statement", "☐"], ["Sample site inspection and toolbox talk records", "☐"],
      ["Incident log and RIDDOR statistics (3 years)", "☐"], ["Approved sub-contractor list with pre-qualification forms", "☐"], ["Internal audit report and management review minutes", "☐"],
      ["Two client references and project case studies with photographs", "☐"], ["Latest accounts", "☐"], ["Trade registrations (Gas Safe, NICEIC / NAPIT, FENSA, MCS) as relevant", "☐"],
    ] } },
  ] });

  return { docs, issued, review, missing };
}
