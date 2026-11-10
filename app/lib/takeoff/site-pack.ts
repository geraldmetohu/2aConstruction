// The project document pack beyond the quotation and contract: one RAMS per activity (with its own risk
// assessment, sequence, permits, Building Regulations checks and hold points), toolbox talks, site induction,
// permits to work, temporary works and lifting, inspection registers, Building Regulations checklist,
// inspection & test plan, asbestos, waste, fire & emergency plan, CDM notification check, client letters
// (welcome, neighbours, variation form, privacy, complaints) and the completion set (snagging, handover
// certificates, practical completion, health & safety file, completion report).
// Built from the customer projection only – no costs, rates or margins.

import type { CustomerTakeoff } from "./engine";
import type { TakeoffInput } from "./schema";
import type { CompanyProfile } from "./company";
import { ACTIVITIES, COSHH, HAZARDS, riskBand, riskScore, type ActivityId, type HazardId } from "./activities";
import { BC_STAGES, EXTRA, PERMITS, ppeStandard, type PermitId } from "./hs-library";

const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface PackSection { heading: string; paragraphs?: string[]; items?: string[] }
export interface RamsRisk { hazard: string; who: string; harm: string; before: number; after: number; beforeBand: string; afterBand: string; controls: string[] }
export interface RamsDoc {
  id: ActivityId; n: number; title: string; dates: string; scope: string[]; sequence: string[]; risks: RamsRisk[]; specific: string[];
  plant: string[]; ppe: { item: string; standard: string }[]; competence: string; permits: string[]; regs: string[]; hold: string[]; emergency: string[];
  substances: string[];
}
export interface Register { title: string; law: string; columns: string[]; rows: number }

export interface SitePack {
  people: { siteManager: string; siteManagerPhone: string; supervisor: string; supervisorPhone: string; healthSafety: string; firstAider: string; hospital: string; office: string };
  f10: { notifiable: boolean; workingDays: number; personDays: number; peakCrew: number; text: string };
  rams: RamsDoc[];
  toolbox: { n: number; title: string; points: string[] }[];
  induction: PackSection[];
  permits: { id: PermitId; title: string; when: string; checks: string[]; activities: string[] }[];
  tempWorks: string[] | null;
  lifting: string[] | null;
  asbestos: string[];
  fire: PackSection[];
  waste: PackSection[];
  registers: Register[];
  buildingRegs: { stages: { title: string; applies: boolean }[]; checks: { activity: string; items: string[] }[]; notices: string[] };
  itp: { stage: string; checks: string[] }[];
  client: { welcome: PackSection[]; neighbour: string[]; variation: string[]; privacy: PackSection[]; complaints: PackSection[] };
  completion: { certificates: string[]; hsFile: string[]; practical: string[]; report: PackSection[] };
}

export interface PackArgs {
  c: CustomerTakeoff; input: TakeoffInput; company: CompanyProfile; acts: ActivityId[];
  title: string; reference: string; client: { name: string; siteAddress: string };
  programme: { label: string; start?: string; end?: string; startDay: number; endDay: number }[];
  start?: string; finish?: string; net: number; gross: number;
}

const has = (acts: ActivityId[], ...ids: ActivityId[]) => ids.some(id => acts.includes(id));

export function buildSitePack(a: PackArgs): SitePack {
  const { c, input, company: co, acts } = a;
  const t = input.terms, p = input.property;
  const people = {
    siteManager: co.siteManager || "________________", siteManagerPhone: co.siteManagerPhone || "________________",
    supervisor: t.siteSupervisor || co.siteManager || "________________", supervisorPhone: t.siteSupervisorPhone || co.siteManagerPhone || "________________",
    healthSafety: co.healthSafetyLead || co.siteManager || "________________", firstAider: co.firstAider || "________________",
    hospital: t.nearestHospital || "____________________ (nearest A&E – complete before start)", office: [co.phone, co.email].filter(Boolean).join(" · "),
  };
  const site = a.client.siteAddress || "the site";
  const old = p.age !== "POST_2000";
  const work = acts.filter(x => x !== "SITE_SETUP" && x !== "WASTE");

  // ---------- CDM notification (F10) ----------
  const { workingDays, personDays, peakCrew } = c.programme as { workingDays: number; weeks: number; personDays?: number; peakCrew?: number };
  const pd = personDays ?? 0, crew = peakCrew ?? 0;
  const notifiable = (workingDays > 30 && crew > 20) || pd > 500;
  const f10 = { notifiable, workingDays, personDays: pd, peakCrew: crew,
    text: notifiable ? `Notifiable: ${pd > 500 ? `about ${pd} person-days (over 500)` : `over 30 working days with more than 20 workers at once`}. The principal contractor submits form F10 to the HSE before work starts and displays a copy on site.`
      : `Not notifiable to the HSE: about ${workingDays} working days, ${pd || "under 500"} person-days, peak ${crew || "a few"} people on site (limits: over 30 days with over 20 workers at once, or over 500 person-days). CDM 2015 still applies in full – construction phase plan, welfare and competent people.` };

  // ---------- RAMS per activity ----------
  const scopeText = c.scope ?? [];
  const datesFor = (id: ActivityId) => {
    const re = EXTRA[id].match;
    const rows = a.programme.filter(r => re.test(r.label));
    if (!rows.length) return a.start ? `${longDate(a.start)} – ${a.finish ? longDate(a.finish) : "completion"} (as the programme)` : "As the programme";
    const s = rows[0], e = rows[rows.length - 1];
    return s.start ? `${longDate(s.start)} – ${longDate(e.end ?? e.start ?? s.start)}` : `Day ${s.startDay + 1} – ${e.endDay + 1}`;
  };
  const rams: RamsDoc[] = acts.map((id, i) => {
    const act = ACTIVITIES[id], ex = EXTRA[id];
    const scope = scopeText.filter(x => ex.match.test(x)).slice(0, 10);
    const risks = act.hazards.map((h: HazardId) => {
      const hz = HAZARDS[h], b = riskScore(hz.before), f = riskScore(hz.after);
      return { hazard: hz.title, who: hz.who, harm: hz.harm, before: b, after: f, beforeBand: riskBand(b), afterBand: riskBand(f), controls: hz.controls };
    }).sort((x, y) => y.before - x.before);
    const permits = ex.permits.map(pm => PERMITS[pm].title);
    return {
      id, n: i + 1, title: act.title, dates: datesFor(id),
      scope: scope.length ? scope : [id === "SITE_SETUP" ? `Set up, protect and run the site at ${site} for the duration of the works.` : id === "WASTE" ? "Removal of all construction waste and site clearance." : `${act.title} as described in the quotation.`],
      sequence: [
        "Read this RAMS and the drawings; brief every operative and get the briefing record signed before starting",
        ...(permits.length ? [`Get the ${permits.join(" and ").toLowerCase()} signed before starting`] : []),
        ...act.steps,
        "Clear up, make the area safe and secure at the end of each day; report any defects or near misses",
      ],
      risks, specific: ex.controls, plant: act.plant, ppe: act.ppe.map(item => ({ item, standard: ppeStandard(item) })), competence: act.competence,
      permits, regs: ex.regs, hold: ex.hold, emergency: ex.emergency, substances: COSHH[id] ?? [],
    };
  });

  // ---------- Toolbox talks ----------
  const toolbox = acts.map((id, i) => ({ n: i + 1, title: ACTIVITIES[id].title, points: [...EXTRA[id].talk, `Main hazards: ${ACTIVITIES[id].hazards.map(h => HAZARDS[h].title.split(" (")[0].toLowerCase()).join(", ")}`] }));

  // ---------- Site induction ----------
  const induction: PackSection[] = [
    { heading: "1. The project", items: [`${a.title} at ${site} (${a.reference})`, `Client: ${a.client.name || "—"} – ${p.occupancy === "OCCUPIED" ? "the house is occupied during the works" : "the house is empty during the works"}`,
      `Programme: ${a.start ? `${longDate(a.start)} to ${a.finish ? longDate(a.finish) : "completion"}` : `${workingDays} working days, start to be confirmed`}`, `Work on this job: ${work.map(x => ACTIVITIES[x].title.toLowerCase()).join("; ")}`] },
    { heading: "2. Who's who", items: [`Site manager: ${people.siteManager} – ${people.siteManagerPhone}`, `Site supervisor: ${people.supervisor} – ${people.supervisorPhone}`, `Health & safety: ${people.healthSafety}`, `First aider: ${people.firstAider}`, `Office: ${people.office}`] },
    { heading: "3. Emergencies", items: [`Nearest A&E: ${people.hospital}`, "Fire: raise the alarm, everyone out to the assembly point (front of the property), call 999", "Gas leak: 0800 111 999 · Power: 105 · Water: the water company's emergency number", "Accidents and near misses are reported to the supervisor the same day and written in the accident book"] },
    { heading: "4. Site rules", items: [`Working hours: ${co.workingHours || "08:00–17:30"}`, "PPE at all times: boots and hi-vis; hard hats outside and below work at height; task PPE as the RAMS", "No alcohol or drugs; no smoking or vaping on site or in the house", "Only use tools and plant you are trained and authorised to use; 110 V or battery tools only",
      "Never alter scaffolds, props or edge protection", "Keep routes and fire exits clear; waste to the skip daily", "Respect the client's home and neighbours: no music, no bad language, park only where agreed"] },
    { heading: "5. Hazards on this site", items: [...new Set(acts.flatMap(x => ACTIVITIES[x].hazards))].map(h => HAZARDS[h].title).concat(old ? ["Asbestos: built before 2000 – read the survey; stop work if you find suspect material"] : []) },
    { heading: "6. Welfare", items: [input.prelims.welfare ? "Welfare unit with toilet, hand washing, drinking water and rest area" : "Toilet and washing in the house as agreed with the client", "First aid kit and accident book: in the welfare area", "Drinking water and a place to eat away from the work"] },
    { heading: "7. Declaration", paragraphs: ["I have received this induction, I understand the site rules and the RAMS for my work, and I hold the cards and qualifications I have stated."] },
  ];

  // ---------- Permits ----------
  const permitIds = [...new Set(acts.flatMap(id => EXTRA[id].permits))];
  const permits = permitIds.map(id => ({ id, ...PERMITS[id], activities: acts.filter(x => EXTRA[x].permits.includes(id)).map(x => ACTIVITIES[x].title) }));

  // ---------- Temporary works & lifting ----------
  const steel = scopeText.filter(x => /steel|beam|opening|chimney|load-bearing|needle|prop/i.test(x));
  const tempWorks = has(acts, "STRUCTURAL_STEEL", "DEMOLITION", "EXCAVATION") ? [
    `Temporary works coordinator: ${people.siteManager}; temporary works supervisor: ${people.supervisor}`,
    ...(has(acts, "STRUCTURAL_STEEL", "DEMOLITION") ? ["Props, needles and strong-boys to the temporary works designer's / engineer's sketch for each opening – design on site before any load-bearing removal"] : []),
    ...(has(acts, "EXCAVATION") ? ["Trench support (trench sheets / props or trench boxes) for excavations over 1.2 m or in poor ground; adjacent foundations supported where undermined"] : []),
    ...(has(acts, "SCAFFOLD") ? ["Scaffold: TG20:21 compliance sheet or bespoke design; ties and loading bay as designed"] : []),
    ...(has(acts, "ROOFING", "DEMOLITION") ? ["Temporary roof / weather protection secured against wind uplift"] : []),
    ...steel.slice(0, 6).map(x => `This job: ${x}`),
    "Register: each item listed with its design reference, permit to load and permit to strike (see the temporary works register)",
  ] : null;
  const lifting = has(acts, "STRUCTURAL_STEEL", "GLAZING") ? [
    "Appointed person (plans the lift): " + people.siteManager + "; lift supervisor on the day: " + people.supervisor,
    ...steel.filter(x => /steel|beam/i.test(x)).slice(0, 4).map(x => `Load: ${x}`),
    "Weights: steel beams ≈ 20–60 kg per metre depending on the section (check the engineer's schedule); large glazed panes 50–150 kg",
    "Method: team lift (max 25 kg per person) only for short, light steels; otherwise gin wheel, genie lift, hoist, or HIAB with a CPCS / NPORS operator and slinger signaller",
    "Route: delivery point → working position kept clear; exclusion zone and public kept away; tag lines on long loads",
    "Equipment: lifting accessories with a current thorough examination (LOLER: 6-monthly for accessories and lifting people, 12-monthly for other equipment)",
    "Stop the lift in high wind, if the load is not under control, or anyone enters the exclusion zone",
  ] : null;

  // ---------- Asbestos ----------
  const asbestos = old ? [
    `The property was built ${p.age === "PRE_1919" ? "before 1919" : "before 2000"}, so asbestos-containing materials may be present (textured coatings, floor tiles, bitumen, soffits, flue pipes, insulating board, pipe lagging, water tanks).`,
    "A refurbishment / demolition asbestos survey (HSG264) of the areas being worked on is required before intrusive work. If none is available, the client is asked to commission one or authorise us to arrange it.",
    "Any material in the survey is left alone or removed first by a licensed contractor (licensable work), or by trained operatives for non-licensed work, under the Control of Asbestos Regulations 2012.",
    "If suspect material is found during work: stop, leave the area, close it off, inform the site manager and the client. Work resumes only after sampling.",
    "Asbestos waste is double-bagged, labelled and removed by a registered carrier with a hazardous waste consignment note.",
  ] : ["The property was built after 2000: asbestos is not expected. Operatives still stop work and report any suspect material."];

  // ---------- Fire & emergency ----------
  const fire: PackSection[] = [
    { heading: "Fire prevention", items: ["No smoking or naked flames except under a hot work permit", "Flammable liquids and gas cylinders stored outside in a ventilated, locked cage; minimum quantities", "Waste removed daily; no burning of waste", "House smoke alarms kept working (covered only while dust is made)"] },
    { heading: "Fire fighting equipment", items: ["Water / foam and CO₂ extinguishers at the work area and with every hot work", "Fire blanket in the kitchen area", "Extinguishers checked weekly (register)"] },
    { heading: "Means of escape", items: ["Escape routes agreed with the occupants and kept clear", p.storeys >= 3 || has(acts, "CARPENTRY") ? "Loft / upper floors: escape route via the stairs kept protected; nothing stored on the stairs" : "Stairs and doors kept clear", "Assembly point: front of the property on the pavement"] },
    { heading: "In an emergency", items: ["Raise the alarm – shout 'FIRE' – everyone out", "Call 999 and give the address and postcode: " + (site + (p.postcode ? `, ${p.postcode}` : "")), `Nearest A&E: ${people.hospital}`, "The supervisor checks everyone is out; nobody goes back in"] },
  ];

  // ---------- Waste ----------
  const waste: PackSection[] = [
    { heading: "Waste on this job", items: [`About ${input.prelims.autoSkips ? "the skips in the quotation" : `${input.prelims.skips} skips`}; waste types: ${[has(acts, "DEMOLITION", "STRIP_OUT", "MASONRY") && "rubble and inert", has(acts, "CARPENTRY", "JOINERY") && "timber", has(acts, "PLASTERING") && "plasterboard (separate)", has(acts, "ELECTRICAL", "PLUMBING") && "metal and cable", has(acts, "LANDSCAPING", "TREE_WORK") && "green waste", "general"].filter(Boolean).join(", ")}`] },
    { heading: "Duty of care", items: ["Waste carriers checked on the Environment Agency public register", "A waste transfer note for every skip / load, kept for 2 years (hazardous waste consignment notes for 3 years)", "Fly-tipping: never – all waste to licensed sites"] },
    { heading: "Reduce, reuse, recycle", items: ["Order materials to the take-off quantities (waste allowance already included)", "Off-cuts reused where possible; pallets returned", "Plasterboard and metals recycled"] },
    { heading: "Environment", items: ["No wash-out of cement, paint or render into drains; settle wash water", "Spill kit on site for fuels and oils", "Dust and noise kept within working hours; neighbours told before noisy work"] },
  ];

  // ---------- Registers ----------
  const registers: Register[] = [
    { title: "Site induction register", law: "CDM 2015 reg. 13(4)", columns: ["Date", "Name", "Company / trade", "CSCS / cards", "Emergency contact", "Signature"], rows: 12 },
    { title: "Daily site diary & sign-in", law: "Good practice", columns: ["Date", "Weather", "People on site", "Work done", "Deliveries / visitors", "Issues / delays"], rows: 14 },
    ...(has(acts, "SCAFFOLD", "ROOFING", "RENDERING") ? [{ title: "Scaffold inspection register", law: "Work at Height Regs 2005, Schedule 7", columns: ["Date", "Location / lift", "Inspected by", "Defects found", "Action taken", "Safe to use (Y/N)", "Signature"], rows: 12 }] : []),
    ...(has(acts, "EXCAVATION", "DRAINAGE") ? [{ title: "Excavation inspection register", law: "CDM 2015 reg. 22 (start of each shift)", columns: ["Date / time", "Excavation", "Depth", "Support OK", "Edge protection", "Inspected by", "Signature"], rows: 14 }] : []),
    ...(tempWorks ? [{ title: "Temporary works register", law: "BS 5975", columns: ["Item", "Location", "Design ref.", "Permit to load (date / by)", "Checked", "Permit to strike (date / by)"], rows: 8 }] : []),
    { title: "Ladder & stepladder pre-use checks", law: "Work at Height Regs 2005", columns: ["Date", "Ladder ID", "Feet / stiles / rungs OK", "Checked by", "Fit for use"], rows: 10 },
    { title: "Plant, tools & PAT register", law: "PUWER 1998", columns: ["Item", "ID / serial", "PAT / service date", "Next due", "Operator trained", "Checked by"], rows: 12 },
    { title: "PPE issue record", law: "PPE at Work Regs 1992 (amended 2022)", columns: ["Date", "Name", "PPE issued", "Face-fit test (FFP3)", "Signature"], rows: 10 },
    { title: "Fire extinguisher & fire point checks", law: "Fire safety good practice", columns: ["Week", "Location", "Extinguishers present & charged", "Escape routes clear", "Checked by"], rows: 10 },
    ...(has(acts, "DEMOLITION", "STRIP_OUT", "MASONRY", "LANDSCAPING") ? [{ title: "Hand-arm vibration exposure record", law: "Control of Vibration at Work Regs 2005", columns: ["Date", "Name", "Tool", "Trigger time", "Exposure points", "Daily total (EAV 100 / ELV 400)"], rows: 12 }] : []),
    { title: "Accident, incident & near miss report", law: "RIDDOR 2013 / Social Security (Claims) Regs", columns: ["Date / time", "Name", "What happened", "Injury / first aid", "Witnesses", "Action to stop it happening again", "RIDDOR (Y/N)"], rows: 6 },
    { title: "Waste transfer notes log", law: "EPA 1990 s.34", columns: ["Date", "Skip / load", "Waste type & EWC code", "Carrier & licence no.", "WTN no.", "Destination"], rows: 10 },
    { title: "Visitors' log", law: "Good practice", columns: ["Date", "Name", "Company", "Reason", "Time in", "Time out", "Inducted by"], rows: 10 },
  ];

  // ---------- Building Regulations ----------
  const buildingRegs = {
    stages: BC_STAGES.map(s => ({ title: s.title, applies: s.when.some(w => acts.includes(w)) && (s.id !== "COMMENCE" || needsBC(input)) })).filter(s => s.applies),
    checks: work.filter(id => EXTRA[id].regs.length).map(id => ({ activity: ACTIVITIES[id].title, items: EXTRA[id].regs })),
    notices: [
      needsBC(input) ? "Building Regulations: full plans or building notice submitted, and the commencement notice given before work starts" : "Building Regulations: the work listed may not need an application – confirm before starting (structural work, new circuits, drainage and replacement windows usually do, or need a competent person scheme)",
      ...(input.prelims.partyWallNeighbours > 0 || has(acts, "STRUCTURAL_STEEL", "EXCAVATION") ? ["Party Wall etc. Act 1996: notices served (2 months for party structure work, 1 month for excavation near a neighbour's foundations) and awards agreed"] : []),
      ...(has(acts, "EXCAVATION", "DRAINAGE") ? ["Build-over agreement with the water company if building over or within 3 m of a public sewer"] : []),
      "Planning permission / permitted development (lawful development certificate recommended) confirmed by the client before start",
      ...(f10.notifiable ? ["HSE F10 notification submitted"] : []),
    ],
  };

  // ---------- Inspection & test plan ----------
  const itp = work.filter(id => EXTRA[id].hold.length).map(id => ({ stage: ACTIVITIES[id].title, checks: EXTRA[id].hold }));

  // ---------- Client letters & forms ----------
  const first = a.client.name.trim().split(/\s+/)[0] || "";
  const client = {
    welcome: [
      { heading: `Dear ${first || "Sir / Madam"},`, paragraphs: [`Thank you for choosing ${co.name}. This letter explains what to expect while we carry out the ${a.title.toLowerCase()} at ${site}.`] },
      { heading: "Before we start", items: ["Clear the work areas of furniture and valuables, and agree where we can store materials", "Tell us about pets, alarm codes, parking and anything we should know", "Planning / permitted development and any party wall agreements confirmed", `Start date: ${a.start ? longDate(a.start) : "to be confirmed"}; finish about ${a.finish ? longDate(a.finish) : `${workingDays} working days later`}`] },
      { heading: "During the works", items: [`We work ${co.workingHours || "08:00–17:30 Monday to Friday"}`, "Areas we are working in are separated and protected; please keep children and pets away", "Water, power or heating may be off for short periods – we tell you the day before", `Your contact every day: ${people.supervisor} (${people.supervisorPhone}); project manager: ${people.siteManager} (${people.siteManagerPhone})`, "Changes you would like are priced on a variation form and agreed before we do them"] },
      { heading: "Payments", items: ["Stage invoices are issued as each stage is reached (see the payment schedule in your quotation)", "You can see payments due and upcoming in your client portal"] },
      { heading: "At the end", items: ["We walk round together and agree a snagging list", "You receive the handover pack: certificates, guarantees, manuals and the health & safety file", "Our workmanship guarantee starts from practical completion"] },
    ],
    neighbour: [
      "Dear Neighbour,",
      `We will be carrying out ${a.title.toLowerCase()} at ${site} ${a.start ? `from ${longDate(a.start)}` : "shortly"}, for about ${c.programme.weeks} week${c.programme.weeks > 1 ? "s" : ""}.`,
      `Working hours are ${co.workingHours || "08:00–17:30 Monday to Friday"}. ${has(acts, "SCAFFOLD") ? "Scaffolding will be put up at the start. " : ""}${has(acts, "DEMOLITION", "EXCAVATION", "MASONRY") ? "There will be some noisy work (breaking out, cutting) – we keep it to the middle of the day where we can. " : ""}Skips and deliveries are booked to keep the road clear.`,
      `If anything concerns you, please call ${people.siteManager} on ${people.siteManagerPhone}${co.email ? ` or email ${co.email}` : ""}. Thank you for your patience.`,
      `${co.name}`,
    ],
    variation: [
      `Variation no.: ______    Contract: ${a.reference}    Date: ____________`,
      "Description of the change requested: ______________________________________________",
      "Reason (client request / hidden defect / design change / Building Control): ____________",
      "Price of the change (ex VAT): £__________   VAT: £__________   Total: £__________",
      "Effect on the programme: ______ working days    New completion date: ____________",
      "We will not carry out a variation until it is agreed in writing (signed here or approved in the client portal).",
      "Client signature: ____________________  Date: ________    For " + (co.registeredName || co.name) + ": ____________________  Date: ________",
    ],
    privacy: [
      { heading: "Who we are", paragraphs: [`${co.registeredName || co.name}${co.companyNo ? ` (company no. ${co.companyNo})` : ""} is the data controller for the personal data you give us.`] },
      { heading: "What we keep and why", items: ["Your name, contact details and the site address – to quote, carry out and guarantee the work (contract)", "Photos of the property – to record condition and progress; we only use them publicly (website, social media) with your permission and without showing your address", "Payment records – kept for 6 years for tax (legal obligation)"] },
      { heading: "Who we share it with", items: ["Our site team and subcontractors working on your job", "Building Control, the structural engineer and certification schemes (e.g. Part P, FENSA, Gas Safe)", "We never sell your data"] },
      { heading: "Your rights", items: ["Ask for a copy, correction or deletion of your data", `Contact: ${co.email || co.phone}`, "You can complain to the Information Commissioner's Office (ico.org.uk)"] },
    ],
    complaints: [
      { heading: "If something isn't right", items: [`Tell your site supervisor (${people.supervisor}) or call ${people.siteManagerPhone} – most issues are fixed the same day`, `If not resolved, write to ${co.email || "us"}: we acknowledge within 2 working days and reply in full within 10 working days`, `If you are still not satisfied: ${co.disputeScheme || "independent mediation / an alternative dispute resolution scheme"}`, "This does not affect your statutory rights (Consumer Rights Act 2015)"] },
    ],
  };

  // ---------- Completion ----------
  const certificates = [
    ...(has(acts, "ELECTRICAL") ? ["Electrical Installation Certificate (BS 7671) and Part P notification / compliance certificate"] : []),
    ...(has(acts, "PLUMBING") ? ["Gas Safe certificate (if any gas work), Benchmark / commissioning certificate for heating, unvented cylinder G3 certificate (if fitted)"] : []),
    ...(has(acts, "GLAZING") ? ["FENSA / CERTASS certificate for windows and doors (or Building Control)"] : []),
    ...(needsBC(input) ? ["Building Control completion certificate"] : []),
    ...(has(acts, "STRUCTURAL_STEEL") ? ["Structural engineer's calculations and drawings (as built)"] : []),
    ...(has(acts, "RENDERING") ? ["EWI / render system guarantee (insurance-backed where offered)"] : []),
    ...(has(acts, "ROOFING") ? ["Roofing / flat roof membrane manufacturer's guarantee"] : []),
    "Our workmanship guarantee certificate", "Product guarantees, manuals and care instructions (appliances, boiler, windows, flooring, sanitaryware)", "Waste transfer notes (copies on request)",
  ];
  const hsFile = [
    "Brief description of the work carried out", "As-built drawings and structural calculations", "Positions of hidden services (cables, pipes, drains) – photos before boarding",
    "Residual hazards and how they are dealt with (e.g. asbestos left in place, fragile roof lights, steel positions)", "Key structural principles (load paths, steels, removed walls) and safe working loads",
    "Materials used that could be hazardous later (insulation, treated timber, resins)", "Information for cleaning and maintenance (gutters, roof access, rooflights)", "Certificates and guarantees listed above",
  ];
  const practical = [
    `We certify that the works under contract ${a.reference} at ${site} reached practical completion on: ____________________`,
    "Outstanding snagging items (listed on the snagging list) are to be completed by: ____________________",
    "The workmanship guarantee and the defects period start from this date. Retention (if any) is released at the end of the defects period.",
    `Signed for ${co.registeredName || co.name}: ____________________   Client: ____________________   Date: ____________`,
  ];
  const report: PackSection[] = [
    { heading: "Project", items: [`${a.title} – ${a.reference}`, `Client: ${a.client.name || "—"} · Site: ${site}`, `Planned: ${a.start ? `${longDate(a.start)} – ${a.finish ? longDate(a.finish) : "—"}` : `${workingDays} working days`} · Actual start: ____________ · Actual completion: ____________`] },
    { heading: "Work completed", items: (c.scope ?? []).slice(0, 30) },
    { heading: "Variations", paragraphs: ["Approved variations are listed in the client portal and on the final account. Total variations: £__________"] },
    { heading: "Final account", items: [`Contract sum: ${gbp(a.net)} + VAT (${gbp(a.gross)} inc. VAT)`, "Variations: £__________", "Payments received: £__________", "Final payment received on: ____________ (balance £0.00)"] },
    { heading: "Inspections & certificates", items: [...buildingRegs.stages.map(s => `${s.title}: passed on ____________`), ...certificates] },
    { heading: "Health & safety", items: ["Accidents: ____  Near misses: ____  RIDDOR reports: ____", "Health & safety file handed to the client on: ____________"] },
    { heading: "Snagging & handover", items: ["Snagging list completed on: ____________", "Keys, manuals and certificates handed over on: ____________", `Guarantee: ${t.guaranteeYears} years from practical completion`] },
    { heading: "Sign-off", paragraphs: [`Project manager: ${people.siteManager} ____________________   Client: ____________________   Date: ____________`] },
  ];

  return { people, f10, rams, toolbox, induction, permits, tempWorks, lifting, asbestos, fire, waste, registers, buildingRegs, itp, client, completion: { certificates, hsFile, practical, report } };
}

/** Work that normally needs Building Control (or a competent person scheme). */
function needsBC(input: TakeoffInput) {
  const on = (id: string) => !!input.packages[id]?.enabled;
  return on("loft") || on("extension") || on("conversion") || on("demolition") || (on("outbuilding") && input.packages.outbuilding?.values.habitable === true) || input.prelims.buildingControl && (on("roofing") || on("external"));
}
