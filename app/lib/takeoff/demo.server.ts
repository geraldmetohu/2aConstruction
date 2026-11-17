// The client-portal demo: one sample client and project that the admin moves through a real job, step
// by step, using the same actions as a live job – so the demo client gets the real portal, notifications,
// requests, invoices, photos and the 3D build view. "Reset" deletes the demo project and starts again.
// The demo project is marked by createdBy = "DEMO" and is the only thing reset ever deletes.
import { calculateTakeoff, customerTakeoff } from "./engine";
import { resolveTakeoffPrices } from "./prices.server";
import { defaultTakeoffInput, takeoffInputSchema } from "./schema";
import { createQuote, type Db, type Sql } from "./store";
import { addEvent } from "./jobs-store";

export const DEMO_EMAIL = "metohu.gerald@gmail.com";
export const DEMO_NAME = "Demo Client";
export const DEMO_MARK = "DEMO";

export interface DemoStep { n: number; title: string; client: string }
/** The story, from quote to handover. Each step is run from the Demo page; the client sees the result in their portal. */
export const DEMO_STEPS: DemoStep[] = [
  { n: 1, title: "Send the quote", client: "Email with the quote; the quote appears in their portal with options to choose and accept." },
  { n: 2, title: "Client accepts", client: "Quote marked accepted; their project dashboard opens (they can also press Accept themselves instead)." },
  { n: 3, title: "Welcome, site manager & start date", client: "Welcome message, their site manager's name and number, and the start date – each with a notification." },
  { n: 4, title: "Questions for the client", client: "Two requests to answer: choose en-suite tiles, and confirm parking for the skip." },
  { n: 5, title: "Deposit invoice & payment", client: "Deposit invoice (PDF) by email and in Payments; then the payment is confirmed." },
  { n: 6, title: "Work starts – scaffold & set-up", client: "Status 'In progress', first stages ticked, site photos shared; the 3D view moves on." },
  { n: 7, title: "Structure – steels & floor", client: "Stage updates with notes, Building Control inspection message, stage invoice." },
  { n: 8, title: "Roof on & a variation", client: "Watertight update, plus an extra (variation) with a price to approve or decline." },
  { n: 9, title: "First fix, plastering & fit-out", client: "Most stages done, progress near the end, another message and photo." },
  { n: 10, title: "Snagging", client: "A snag list to review and add to before handover." },
  { n: 11, title: "Completed – handover", client: "All stages done, project completed, final invoice and guarantee details." },
];

/** A loft conversion with an en-suite – a typical project to show. */
export function demoInput() {
  const base = defaultTakeoffInput();
  return takeoffInputSchema.parse({
    ...base,
    property: { ...base.property, houseType: "SEMI_OR_END", width: 6.2, length: 8.4 },
    terms: { ...base.terms, title: "Loft conversion with en-suite (demo project)", clientPhone: "07700 900123", startDate: "" },
    rooms: [],
    packages: {
      loft: { enabled: true, values: { loftType: "HIP_TO_GABLE", gables: 1, loftWidth: 5.6, loftLength: 6.6, bedrooms: 2, ensuite: true, fireDoors: 4, smokeAlarms: 4, frontWindows: 2 } },
    },
  });
}

/** Find the demo project (newest first). */
export async function demoQuoteId(db: Sql): Promise<string | null> {
  const [r] = await db.query<{ id: string }>(`SELECT "id"::text AS id FROM "TakeoffQuote" WHERE "createdBy" = $1 ORDER BY "createdAt" DESC LIMIT 1`, [DEMO_MARK]);
  return r?.id ?? null;
}
export async function allDemoQuotes(db: Sql): Promise<string[]> {
  return (await db.query<{ id: string }>(`SELECT "id"::text AS id FROM "TakeoffQuote" WHERE "createdBy" = $1`, [DEMO_MARK])).map(r => r.id);
}

/** Create a fresh demo project (a draft quote, not sent yet). */
export async function createDemoQuote(db: Db) {
  const input = demoInput();
  const { rates, prices } = await resolveTakeoffPrices();
  const result = calculateTakeoff(input, prices, rates);
  const q = await createQuote(db, { clientName: DEMO_NAME, clientEmail: DEMO_EMAIL, siteAddress: "12 Sample Road, Hornchurch RM11 1AA" }, { input, result, customer: customerTakeoff(result, input), rates, prices }, DEMO_MARK);
  return q.id as string;
}

/** Which steps have run (kept as hidden notes on the demo project). */
export async function demoDone(db: Sql, quoteId: string): Promise<number> {
  const [r] = await db.query<{ n: number | null }>(`SELECT max(substring("message" FROM 'DEMO step ([0-9]+)')::int) AS n FROM "TakeoffJobEvent" WHERE "quoteId" = $1::uuid AND "kind" = 'NOTE' AND "message" LIKE 'DEMO step %'`, [quoteId]);
  return r?.n ?? 0;
}
export const markDemoStep = (db: Sql, quoteId: string, n: number, actor: string) => addEvent(db, quoteId, "NOTE", `DEMO step ${n}: ${DEMO_STEPS[n - 1]?.title ?? ""}`, "ADMIN", actor, false);
