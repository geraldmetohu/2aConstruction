import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { workPackages } from "../takeoff/modules/index";
import { ROOM_JOBS, roomFields, roomGeometry, roomJobs, roomTypeDefaults } from "../takeoff/modules/rooms";
import { fieldVisible, readValues, toSpec, type Field, type Values } from "../takeoff/package";
import { accessOptions, ageOptions, constructionOptions, floorOptions, houseTypeOptions, occupancyOptions, parkingOptions, roomTypeOptions, scaffoldModeOptions, type RoomInput } from "../takeoff/schema";
import type { VisitTakeoff } from "./convert";
import { FINISHES_INTRO, PROPERTY, ROOM_FINISHES, SECTIONS, SITE, answerText, key, projectType, roomFinishesFor, visitSteps, type Answers, type Question } from "./template";

export interface VisitPdfInput {
  companyName: string;
  reference: string;
  clientName: string; clientPhone: string; clientEmail: string; siteAddress: string; postcode: string;
  visitAt: Date | null;
  types: string[];
  answers: Answers;
  takeoff: VisitTakeoff;
  /** A blank form to print and fill in by hand. */
  blank: boolean;
}

const optLabel = (opts: readonly (readonly [string, string])[], v: unknown) => opts.find(([k]) => k === v)?.[1] ?? (v === undefined || v === "" ? "" : String(v));

/**
 * The site visit form as a PDF: blank to print before the visit, or filled in with everything recorded on site.
 * Same order as the web form: before, good morning, client, property, each project, rooms and finishes, site, photos, goodbye.
 */
export async function renderVisitPdf(d: VisitPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 46, bottom: 52, left: 44, right: 44 }, bufferPages: true, info: { Title: `Site visit ${d.reference}`, Author: d.companyName } });
  doc.registerFont("Body", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Regular.ttf"));
  doc.registerFont("Bold", path.join(process.cwd(), "app/lib/quotes/fonts/LiberationSans-Bold.ttf"));
  const out: Buffer[] = [];
  const done = new Promise<Buffer>((res, rej) => { doc.on("data", c => out.push(c)); doc.on("end", () => res(Buffer.concat(out))); doc.on("error", rej); });

  const L = 44, W = 507, ink = "#171717", grey = "#666666", gold = "#c99400", rule = "#bdbdbd";
  const bottom = () => doc.page.height - 60;
  const room = (h: number) => { if (doc.y + h > bottom()) doc.addPage(); };
  const text = (t: string, o: { bold?: boolean; size?: number; color?: string; x?: number; width?: number; gap?: number; italic?: boolean } = {}) => {
    doc.font(o.bold ? "Bold" : "Body").fontSize(o.size ?? 9.5).fillColor(o.color ?? ink).text(t, o.x ?? L, doc.y, { width: o.width ?? W, lineGap: 1.5 });
    doc.moveDown(o.gap ?? 0.25);
  };
  const box = (x: number, y: number, on: boolean) => {
    doc.lineWidth(0.7).strokeColor("#555").rect(x, y, 8, 8).stroke();
    if (on) doc.lineWidth(1.3).strokeColor(ink).moveTo(x + 1.5, y + 4.2).lineTo(x + 3.5, y + 6.5).lineTo(x + 7, y + 1.5).stroke();
  };
  const blankLines = (n: number, x = L, w = W) => { for (let i = 0; i < n; i++) { room(16); doc.y += 13; doc.lineWidth(0.4).strokeColor(rule).moveTo(x, doc.y).lineTo(x + w, doc.y).stroke(); } doc.y += 5; };
  const h1 = (t: string, n?: number) => {
    room(70); doc.moveDown(0.5);
    const y = doc.y;
    doc.rect(L, y, W, 20).fill("#0d3b72");
    doc.font("Bold").fontSize(11.5).fillColor("#ffffff").text(`${n ? `${n}. ` : ""}${t}`, L + 8, y + 5, { width: W - 16 });
    doc.y = y + 26; doc.fillColor(ink);
  };
  const h2 = (t: string) => { room(40); doc.moveDown(0.3); text(t, { bold: true, size: 10.5, color: "#0d3b72", gap: 0.1 }); doc.lineWidth(0.5).strokeColor(gold).moveTo(L, doc.y).lineTo(L + 120, doc.y).stroke(); doc.y += 4; };
  const intro = (t?: string) => { if (t) text(t, { color: grey, size: 8.5, gap: 0.4 }); };

  /** Options in a row with tick boxes, wrapping across the width. */
  const options = (opts: string[], chosen: (o: string) => boolean, x0 = L + 8, w = W - 8) => {
    doc.font("Body").fontSize(8.8);
    let x = x0; room(14); let y = doc.y;
    for (const o of opts) {
      const tw = doc.widthOfString(o) + 18;
      if (x + tw > x0 + w) { x = x0; y += 13; if (y > bottom()) { doc.addPage(); y = doc.y; } }
      box(x, y + 1, chosen(o)); doc.fillColor(ink).text(o, x + 11, y, { lineBreak: false }); x += tw + 6;
    }
    doc.y = y + 15; doc.x = L;
  };

  const question = (q: Question, a: Answers, k: string) => {
    const v = a[k];
    if (q.type === "heading") { room(40); doc.moveDown(0.2); text(q.label.toUpperCase(), { bold: true, size: 8, color: "#8a6d00", gap: 0.15 }); return; }
    const asked = () => { if (q.say) text(`Ask: ${q.say}`, { size: 8.5, color: "#7a5c00", gap: 0.1 }); };
    if (q.type === "script") {
      doc.font("Body").fontSize(9.5);
      const h = doc.heightOfString(q.label, { width: W - 24 }) + 18;
      room(h + 4);
      const y = doc.y;
      doc.rect(L, y, W, h).fill("#fdf6e3"); doc.rect(L, y, 3, h).fill(gold);
      doc.font("Bold").fontSize(7).fillColor("#8a6d00").text("SAY", L + 12, y + 5);
      doc.font("Body").fontSize(9.5).fillColor(ink).text(q.label, L + 12, y + 13, { width: W - 24, lineGap: 1.5 });
      doc.y = y + h + 5; return;
    }
    if (q.type === "check") {
      doc.font("Body").fontSize(9.5);
      const h = doc.heightOfString(q.label, { width: W - 16 });
      room(h + 6);
      const y = doc.y; box(L, y + 1, v === true); doc.fillColor(ink).text(q.label, L + 14, y, { width: W - 16, lineGap: 1.5 });
      if (q.say) text(`Ask: ${q.say}`, { x: L + 14, width: W - 16, size: 8.5, color: "#7a5c00", gap: 0 });
      if (q.hint) text(q.hint, { x: L + 14, width: W - 16, size: 8, color: grey, gap: 0 });
      doc.y += 4; return;
    }
    room(30);
    const label = `${q.label}${q.type === "number" && q.unit ? ` (${q.unit})` : ""}`;
    // Short choices go on the same line as the question.
    const opts = q.type === "yesno" ? ["Yes", "No"] : q.type === "choice" || q.type === "multi" ? q.options ?? [] : null;
    if (opts) {
      doc.font("Bold").fontSize(9.2); const lw = doc.widthOfString(label) + 12;
      doc.font("Body").fontSize(8.8); const ow = opts.reduce((t, o) => t + doc.widthOfString(o) + 24, 0);
      if (lw + ow <= W) {
        const y = doc.y;
        doc.font("Bold").fontSize(9.2).fillColor(ink).text(label, L, y + 0.5, { lineBreak: false });
        doc.y = y;
        options(opts, o => q.type === "yesno" ? (o === "Yes" && v === true) || (o === "No" && v === false) : q.type === "choice" ? v === o : Array.isArray(v) && v.includes(o), L + lw, W - lw);
        doc.y -= 2; asked(); if (q.hint) text(q.hint, { size: 8, color: grey, gap: 0.1 }); doc.y += 2;
        return;
      }
    }
    text(label, { bold: true, size: 9.2, gap: 0.1 });
    asked();
    if (q.hint) text(q.hint, { size: 8, color: grey, gap: 0.1 });
    if (q.type === "yesno") { options(["Yes", "No"], o => (o === "Yes" && v === true) || (o === "No" && v === false)); return; }
    if (q.type === "choice") { options(q.options ?? [], o => v === o); return; }
    if (q.type === "multi") { options(q.options ?? [], o => Array.isArray(v) && v.includes(o)); return; }
    const t = answerText(q, v);
    if (t) { text(t, { x: L + 8, width: W - 8, gap: 0.5 }); return; }
    if (!d.blank) { text("–", { x: L + 8, color: grey, gap: 0.4 }); return; }
    blankLines(q.type === "long" ? 3 : 1, L + 8, q.type === "number" || q.type === "date" ? 160 : W - 8);
  };
  const questions = (qs: Question[], a: Answers, k: (id: string) => string) => qs.forEach(q => question(q, a, k(q.id)));

  /** Calculator fields, two per row: label and value (or a line to write on). */
  const fieldGrid = (rows: [string, string][]) => {
    const colW = (W - 16) / 2;
    for (let i = 0; i < rows.length; i += 2) {
      room(26);
      const y = doc.y; let maxY = y;
      for (let c = 0; c < 2 && i + c < rows.length; c++) {
        const [label, value] = rows[i + c], x = L + c * (colW + 16);
        doc.font("Bold").fontSize(8).fillColor(grey).text(label, x, y, { width: colW });
        const vy = doc.y;
        if (value) doc.font("Body").fontSize(9.2).fillColor(ink).text(value, x, vy, { width: colW });
        else { doc.lineWidth(0.4).strokeColor(rule).moveTo(x, vy + 11).lineTo(x + colW, vy + 11).stroke(); doc.y = vy + 13; }
        maxY = Math.max(maxY, doc.y);
      }
      doc.y = maxY + 5; doc.x = L;
    }
  };
  const fieldValue = (f: Field, v: Values) => {
    if (f.type === "boolean") return v[f.key] ? "Yes" : "No";
    if (f.type === "select") return optLabel(f.options ?? [], v[f.key]);
    return `${v[f.key]}${f.unit ? ` ${f.unit}` : ""}`;
  };
  /** A calculator form: blank = every field shown at its starting point; filled = the values in this visit. */
  const calcFields = (spec: { fields: Field[]; defaults: Values }, raw: Record<string, unknown> | undefined, context: Values = {}) => {
    const v = { ...spec.defaults, ...readValues(spec, raw ?? {}) };
    const set = new Set(Object.keys(raw ?? {}));
    const fields = spec.fields.filter(f => fieldVisible(f, { ...v, ...context }) && (d.blank || set.has(f.key)));
    const known = (f: Field) => set.has(f.key);
    if (!fields.length) { text(d.blank ? "" : "Not filled in on the visit – complete in the calculator.", { color: grey, size: 8.5 }); return; }
    const groups = [...new Set(fields.map(f => f.group ?? ""))];
    for (const g of groups) {
      const list = fields.filter(f => (f.group ?? "") === g);
      if (g) { room(30); text(g.toUpperCase(), { bold: true, size: 7.5, color: "#8a6d00", gap: 0.15 }); }
      if (d.blank) {
        const checks = list.filter(f => f.type === "boolean"), rest = list.filter(f => f.type !== "boolean");
        const choices = (f: Field) => { const t = (f.options ?? []).map(o => o[1]).join(" / "); return f.type === "select" && t.length <= 90 ? ` – ${t}` : ""; };
        fieldGrid(rest.map(f => known(f) ? [f.label, fieldValue(f, v)] : [`${f.label}${f.unit ? ` (${f.unit})` : ""}${choices(f)}`, ""]));
        if (checks.length) options(checks.map(f => f.label), o => { const f = checks.find(x => x.label === o)!; return known(f) && v[f.key] === true; }, L, W);
      } else fieldGrid(list.map(f => [f.label, fieldValue(f, v)]));
    }
  };

  // ---------------------------------------------------------------- Cover
  doc.font("Bold").fontSize(17).fillColor(ink).text(d.companyName, L, 46, { width: 300 });
  doc.font("Bold").fontSize(13).fillColor(gold).text("Site visit form", L + 300, 48, { width: W - 300, align: "right" });
  doc.font("Body").fontSize(9).fillColor(grey).text(d.reference, L + 300, doc.y, { width: W - 300, align: "right" });
  doc.y = 82; doc.lineWidth(1).strokeColor(gold).moveTo(L, doc.y).lineTo(L + W, doc.y).stroke(); doc.y += 8;
  const when = d.visitAt ? new Date(d.visitAt).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  fieldGrid([["Client", d.clientName], ["Visit", when], ["Phone", d.clientPhone], ["Email", d.clientEmail], ["Site address", [d.siteAddress, d.postcode].filter(Boolean).join(", ")],
    ["Project", d.types.map(t => projectType(t)?.label ?? t).join(", ")]]);

  // ---------------------------------------------------------------- Steps
  const a = d.answers, t = d.takeoff;
  visitSteps(d.types).forEach((s, i) => {
    const n = i + 1;
    if (s.kind === "section") {
      const sec = SECTIONS[s.id];
      h1(sec.title, n); intro(sec.intro); questions(sec.questions, a, x => key.section(sec.id, x));
      return;
    }
    if (s.kind === "property") {
      h1(PROPERTY.title, n); intro(PROPERTY.intro);
      h2("House details for the quote");
      const p = t.property;
      const pick = (opts: readonly (readonly [string, string])[]) => opts.map(o => o[1]).join(" / ");
      const or = (label: string, value: string, choices: string) => [value ? label : `${label}${choices ? ` – ${choices}` : ""}`, value] as [string, string];
      fieldGrid(d.blank ? [
        or("House type", optLabel(houseTypeOptions, p.houseType), pick(houseTypeOptions)), or("Width, party wall to party wall (m)", String(p.width ?? ""), ""), or("Depth, front to back (m)", String(p.length ?? ""), ""),
        or("Storeys / bedrooms", [p.storeys, p.bedrooms].filter(x => x !== undefined).join(" / "), ""), or("Walls", optLabel(constructionOptions, p.construction), pick(constructionOptions)), or("Age", optLabel(ageOptions, p.age), pick(ageOptions)),
        or("During the works", optLabel(occupancyOptions, p.occupancy), pick(occupancyOptions)), or("Parking", optLabel(parkingOptions, p.parking), pick(parkingOptions)), or("Access", optLabel(accessOptions, p.access), pick(accessOptions)),
      ] : [
        ["House type", optLabel(houseTypeOptions, p.houseType)], ["Width (m)", String(p.width ?? "")], ["Depth (m)", String(p.length ?? "")], ["Storeys / bedrooms", [p.storeys, p.bedrooms].filter(x => x !== undefined).join(" / ")],
        ["Walls", optLabel(constructionOptions, p.construction)], ["Age", optLabel(ageOptions, p.age)], ["During the works", optLabel(occupancyOptions, p.occupancy)], ["Parking", optLabel(parkingOptions, p.parking)], ["Access", optLabel(accessOptions, p.access)],
      ]);
      if (p.notes) text(String(p.notes), { size: 9, gap: 0.4 });
      h2("On site");
      questions(PROPERTY.questions, a, x => key.section(PROPERTY.id, x));
      return;
    }
    if (s.kind === "project") {
      const p = projectType(s.id.slice(8));
      if (!p) return;
      h1(p.label, n);
      h2("Walk-round");
      p.plan.forEach((step, j) => question({ id: String(j), label: `${j + 1}. ${step}`, type: "check" }, a, key.plan(p.id, j)));
      h2("Ask the client");
      questions(p.questions, a, x => key.project(p.id, x));
      for (const pid of p.packages) {
        const pkg = workPackages.find(w => w.id === pid);
        if (!pkg) continue;
        h2(`${pkg.label}: measurements and specification`);
        intro(d.blank ? "The quote calculator's own fields. Write in what you measure; options are listed after each label." : "As recorded on site (anything not filled in starts from the calculator's defaults).");
        calcFields(toSpec(pkg), t.packages[pid]?.values);
      }
      h2("Photos to take");
      p.photos.forEach((ph, j) => question({ id: String(j), label: ph, type: "check" }, a, `photo.${p.id}.${j}`));
      return;
    }
    if (s.kind === "rooms") {
      h1("Rooms and finishes", n); intro(FINISHES_INTRO.intro);
      questions(FINISHES_INTRO.questions, a, x => key.section(FINISHES_INTRO.id, x));
      const roomSpec = { fields: roomFields.filter(f => f.key !== "jobs"), defaults: Object.fromEntries(roomFields.map(f => [f.key, f.default])) };
      const saidOnce = new Set<string>();
      const sheet = (r: RoomInput | null, label: string) => {
        h2(label);
        if (r) {
          const g = roomGeometry(r);
          fieldGrid([["Type / floor", `${optLabel(roomTypeOptions, r.type)} · ${optLabel(floorOptions, r.floor)}`], ["Size", `${r.length} × ${r.width} m, ${r.height} m high (${g.floor} m² floor, ${g.walls} m² walls)`],
            ["Doors / windows / radiators", `${r.doors} / ${r.windows} / ${r.radiators}`], ["Jobs", (roomJobs(r.works) ?? []).map(id => ROOM_JOBS.find(j => j.id === id)?.label ?? id).join(", ") || "Not picked"]]);
          if (r.notes) text(r.notes, { size: 9, gap: 0.4 });
          const picked = roomJobs(r.works);
          const groups = picked && new Set(ROOM_JOBS.filter(j => picked.includes(j.id)).flatMap(j => j.groups));
          const works = Object.fromEntries(Object.entries(r.works).filter(([k]) => k !== "jobs"));
          if (!d.blank && Object.keys(works).length) calcFields({ ...roomSpec, fields: roomSpec.fields.filter(f => !groups || groups.has(f.group ?? "")) }, { ...roomTypeDefaults(r.type), ...works }, { roomType: r.type });
          text("Finishes", { bold: true, size: 9.5, color: "#0d3b72", gap: 0.2 });
          // The "Ask" wording is printed once, on the first room, to keep the printed form short.
          const list = roomFinishesFor(r.type, r.floor).map(x => saidOnce.has(x.id) ? { ...x, say: undefined } : (saidOnce.add(x.id), x));
          questions(list, a, x => key.room(r.id, x));
        } else {
          fieldGrid([["Room name", ""], [`Type – ${roomTypeOptions.map(o => o[1]).join(" / ")}`, ""], [`Floor – ${floorOptions.map(o => o[1]).join(" / ")}`, ""], ["Length × width × height (m)", ""], ["Doors / windows / radiators", ""], ["Notes", ""]]);
          text("Jobs the client wants here", { bold: true, size: 9.2, gap: 0.1 });
          options(ROOM_JOBS.map(j => j.label), () => false);
          text("Finishes", { bold: true, size: 9.5, color: "#0d3b72", gap: 0.2 });
          questions(ROOM_FINISHES.filter(x => !x.types && !x.floors), {}, x => x);
        }
      };
      if (d.blank) {
        // A prepared visit prints its rooms (with what is known) and space to write; then spare sheets.
        t.rooms.forEach(r => sheet(r, `${r.name} (${optLabel(floorOptions, r.floor)})`));
        const spare = t.rooms.length ? 1 : 2;
        for (let j = 0; j < spare; j++) sheet(null, t.rooms.length ? "Another room" : `Room ${j + 1}`);
        if (!t.rooms.some(r => r.type === "KITCHEN")) { h2("Kitchen – extra finishes"); questions(ROOM_FINISHES.filter(x => x.types?.includes("KITCHEN")), {}, x => x); }
        if (!t.rooms.some(r => ["BATHROOM", "ENSUITE", "WC"].includes(r.type))) { h2("Bathroom / en-suite / WC – extra finishes"); questions(ROOM_FINISHES.filter(x => x.types?.includes("BATHROOM")), {}, x => x); }
        h2("More rooms"); blankLines(8);
      } else if (!t.rooms.length) text("No rooms added on this visit.", { color: grey });
      else t.rooms.forEach(r => sheet(r, r.name));
      return;
    }
    if (s.kind === "site") {
      h1(SITE.title, n); intro(SITE.intro);
      questions(SITE.questions, a, x => key.section(SITE.id, x));
      h2("Site set-up for the quote");
      const p = t.prelims;
      if (d.blank) {
        text("Scaffold", { bold: true, size: 9.2, gap: 0.1 }); options(scaffoldModeOptions.map(o => o[1]), () => false);
        options(["Chimney scaffold", "Welfare", "Floor & furniture protection", "Building control", "Structural engineer", "New consumer unit", "Move the stopcock"], () => false, L, W);
        fieldGrid([["Skips (or worked out from the job)", ""], ["Party wall neighbours", ""], ["New water main (m)", ""], ["Outside taps", ""]]);
      } else {
        const yn = (x: unknown, def: boolean) => (x ?? def) ? "Yes" : "No";
        fieldGrid([["Scaffold", optLabel(scaffoldModeOptions, p.scaffoldMode ?? "AUTO")], ["Chimney scaffold", yn(p.chimneyScaffold, false)], ["Welfare", yn(p.welfare, true)], ["Protection", yn(p.siteProtection, true)],
          ["Building control", yn(p.buildingControl, true)], ["Structural engineer", yn(p.structuralEngineer, true)], ["New consumer unit", yn(p.consumerUnit, false)], ["Skips", p.autoSkips === false ? String(p.skips ?? "") : "Worked out from the job"],
          ["Party wall neighbours", String(p.partyWallNeighbours ?? 0)], ["New water main (m)", String(p.waterMainRun ?? 0)], ["Outside taps", String(p.outsideTaps ?? 0)]]);
      }
    }
  });

  if (d.blank) { h1("Sketch and notes"); blankLines(22); }

  // Footer: page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font("Body").fontSize(7.5).fillColor(grey).text(`${d.companyName} · Site visit ${d.reference}${d.clientName ? ` · ${d.clientName}` : ""} · page ${i + 1} of ${range.count}`, L, doc.page.height - 38, { width: W, align: "center", lineBreak: false });
  }
  doc.end();
  return done;
}
