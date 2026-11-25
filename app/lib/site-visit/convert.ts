// Turns a site visit into a quote calculator input. The measurements, rooms, room works, projects and site set-up
// were filled in with the calculator's own fields on site, so they carry straight over; the finishes and the
// answers to the standard questions go into the room notes and the house notes, so nothing said on site is lost.
// The calculator then works out the structure, materials and labour from them as usual – check those before sending.
//
// The client's answers (budget, other quotes, worries …) are internal: they are NOT written into the quote input,
// because the quote input is shown to the client in their portal. They come back as `summary`, which the calculator
// shows to the office only. Room finishes (the client's own choices) do go into the room notes.

import { z } from "zod";
import { newRoom, prelimsSchema, propertySchema, roomSchema, takeoffInputSchema, type RoomInput, type TakeoffInput } from "../takeoff/schema";
import { CLIENT, FINISHES_INTRO, PROPERTY, SITE, answerText, key, projectType, roomFinishesFor, type Answers, type Question } from "./template";

const value = z.union([z.number().finite(), z.boolean(), z.string().max(60)]);
export interface VisitTakeoff {
  property: Record<string, unknown>;
  rooms: RoomInput[];
  packages: Record<string, { enabled: boolean; values: Record<string, string | number | boolean> }>;
  prelims: Record<string, unknown>;
}

/** Validate the calculator part of a visit from untrusted input. Anything invalid is dropped, never guessed. */
export function cleanTakeoff(raw: unknown): VisitTakeoff {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const prop = propertySchema.partial().safeParse(src.property ?? {});
  const rooms = Array.isArray(src.rooms) ? src.rooms.slice(0, 40).map(r => roomSchema.safeParse(r)).filter(r => r.success).map(r => r.data!) : [];
  const pk = z.record(z.object({ enabled: z.boolean().default(true), values: z.record(value).default({}) })).safeParse(src.packages ?? {});
  const pre = prelimsSchema.partial().safeParse(src.prelims ?? {});
  return {
    property: prop.success ? stripUndefined(prop.data) : {},
    rooms,
    packages: pk.success ? Object.fromEntries(Object.entries(pk.data).slice(0, 20)) : {},
    prelims: pre.success ? stripUndefined(pre.data) : {},
  };
}
const stripUndefined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** A new visit's calculator part: the projects for its types switched on, and the rooms those types usually need. */
export function startTakeoff(types: string[], postcode = ""): VisitTakeoff {
  const packages: VisitTakeoff["packages"] = {};
  const rooms: RoomInput[] = [];
  for (const t of types) {
    const p = projectType(t);
    if (!p) continue;
    for (const id of p.packages) packages[id] = { enabled: true, values: {} };
    for (const r of p.rooms ?? []) if (!rooms.some(x => x.type === r)) rooms.push(newRoom(r));
  }
  return { property: postcode ? { postcode } : {}, rooms, packages, prelims: {} };
}

export interface VisitForQuote {
  reference: string;
  clientName: string; clientEmail: string; clientPhone: string; siteAddress: string; postcode: string;
  types: string[];
  answers: Answers;
  takeoff: VisitTakeoff;
}

const line = (q: Question, a: Answers, k: string) => { const t = answerText(q, a[k]); return t ? `${q.label.replace(/\?$/, "")}: ${t}` : ""; };

/** The answers worth keeping on the quote, as short lines. */
export function visitSummary(v: VisitForQuote): string[] {
  const a = v.answers, out: string[] = [`From site visit ${v.reference}.`];
  const pickLines = (s: { id: string; questions: Question[] }, ids: string[]) => s.questions.filter(x => ids.includes(x.id)).map(x => line(x, a, key.section(s.id, x.id))).filter(Boolean);
  out.push(...pickLines(CLIENT, ["why", "goal", "whoFor", "lookingFor", "mustHave", "niceToHave", "worries", "pastBuilders", "whyUs", "choosing", "startWish", "startFlex", "deadline",
    "livingIn", "wfh", "holidays", "budget", "budgetFirm", "finance", "otherQuotes", "otherQuotesCount", "otherQuotesDetail", "decideBy", "tenure", "partyWall"]));
  out.push(...pickLines(PROPERTY, ["condition", "knownProblems", "asbestos", "conservation", "waterPressure", "drains"]));
  out.push(...pickLines(SITE, ["skipWhere", "vanParking", "hours", "facilities", "keys", "neighboursSite", "protect", "houseRules"]));
  out.push(...pickLines(FINISHES_INTRO, ["who", "style", "inspiration", "showrooms"]));
  for (const t of v.types) {
    const p = projectType(t);
    if (!p) continue;
    const ls = p.questions.map(x => line(x, a, key.project(t, x.id))).filter(Boolean);
    if (ls.length) out.push(`${p.label} – ${ls.join("; ")}`);
  }
  return out;
}

/** The finishes asked about in one room, as one line. */
export function roomFinishesText(v: VisitForQuote, room: RoomInput): string {
  const ls = roomFinishesFor(room.type, room.floor).filter(x => x.type !== "heading").map(x => line(x, v.answers, key.room(room.id, x.id))).filter(Boolean);
  return ls.length ? `Finishes – ${ls.join("; ")}` : "";
}

const clip = (s: string, n: number) => s.length > n ? `${s.slice(0, n - 1)}…` : s;

/** Build the calculator input. `base` is a fresh calculator input (company margins and quote layout already in it). */
export function visitToTakeoff(v: VisitForQuote, base: TakeoffInput): { input: TakeoffInput; client: { name: string; email: string; address: string }; summary: string[] } {
  const t = cleanTakeoff(v.takeoff);
  const pk = Object.fromEntries(Object.entries(t.packages).filter(([, p]) => p.enabled));
  // Projects for the visit types are on even if nothing was changed in them.
  for (const type of v.types) for (const id of projectType(type)?.packages ?? []) if (!pk[id]) pk[id] = { enabled: true, values: {} };
  const big = ["loft", "extension"].some(id => pk[id]);
  const mode: TakeoffInput["mode"] = big || (Object.keys(pk).length && t.rooms.length) ? "WHOLE_HOME" : Object.keys(pk).length ? "PROJECT" : "ROOMS";

  const rooms = t.rooms.map(r => {
    const f = roomFinishesText(v, r);
    return { ...r, notes: clip([r.notes, f].filter(Boolean).join("\n"), 1000) };
  });
  const who = String(v.answers[key.section(FINISHES_INTRO.id, "who")] ?? "");
  const labels = v.types.map(x => projectType(x)?.label).filter(Boolean) as string[];

  const raw = {
    ...base,
    mode,
    // Only the notes written for the quote go on it (the client sees these); the visit answers stay internal.
    property: { ...base.property, ...t.property, postcode: (t.property.postcode as string) || v.postcode || base.property.postcode, notes: clip(String(t.property.notes ?? ""), 2000) },
    rooms,
    packages: pk,
    prelims: { ...base.prelims, ...t.prelims },
    finishesByClient: who ? who !== "We supply everything" : base.finishesByClient,
    terms: { ...base.terms, title: base.terms.title || clip(labels.join(" & "), 140), clientPhone: v.clientPhone || base.terms.clientPhone },
  };
  const parsed = takeoffInputSchema.safeParse(raw);
  // A field the calculator rejects is left at the calculator's default rather than blocking the quote.
  const input = parsed.success ? parsed.data : takeoffInputSchema.parse({ ...raw, property: base.property, prelims: base.prelims, rooms: [] });
  return { input, client: { name: v.clientName, email: v.clientEmail, address: [v.siteAddress, v.postcode].filter(Boolean).join(", ") }, summary: visitSummary(v) };
}
