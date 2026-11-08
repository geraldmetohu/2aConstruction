"use server";
import { z } from "zod";
import { calculateTakeoff, customerTakeoff } from "@/app/lib/takeoff/engine";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { roomFields } from "@/app/lib/takeoff/modules/rooms";
import { readValues } from "@/app/lib/takeoff/package";
import { readCommercialDefaults, resolveTakeoffPrices } from "@/app/lib/takeoff/prices.server";
import { defaultTakeoffInput, roomTypeOptions, type TakeoffInput } from "@/app/lib/takeoff/schema";

export const instantQuoteEnabled = async () => process.env.INSTANT_QUOTE_ENABLED === "true";

// Public contract: customers choose scope and sizes, never prices, rates or
// internal options. Only fields marked `public` are read; the rest use defaults.
const publicSchema = z.object({
  property: z.object({
    houseType: z.enum(["TERRACED", "SEMI_OR_END", "DETACHED"]),
    width: z.number().finite().min(3).max(15),
    length: z.number().finite().min(4).max(20),
  }).strict(),
  packages: z.record(z.object({ enabled: z.boolean(), values: z.record(z.union([z.number().finite(), z.boolean(), z.string().max(40)])).default({}) })),
  rooms: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    type: z.enum(roomTypeOptions.map(([k]) => k) as [string, ...string[]]),
    length: z.number().finite().min(1).max(15),
    width: z.number().finite().min(1).max(15),
    works: z.record(z.union([z.number().finite(), z.boolean(), z.string().max(40)])).default({}),
  }).strict()).max(12).default([]),
}).strict();
export type PublicQuoteRequest = z.input<typeof publicSchema>;

export async function instantQuote(raw: PublicQuoteRequest) {
  if (!(await instantQuoteEnabled())) return { ok: false as const, message: "Instant prices are not available online yet. Please book a free survey and we will price your project." };
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Please check the measurements: house width 3–15 m and depth 4–20 m." };
  const base = defaultTakeoffInput();
  const packages: TakeoffInput["packages"] = {};
  for (const pkg of workPackages) {
    const p = parsed.data.packages[pkg.id];
    if (p?.enabled) packages[pkg.id] = { enabled: true, values: readValues(pkg, p.values, true) };
  }
  // Rooms: sizes plus public works only; doors/windows/height use typical values.
  const rooms: TakeoffInput["rooms"] = parsed.data.rooms.map((r, i) => ({
    id: `p${i}`, name: r.name, type: r.type as TakeoffInput["rooms"][number]["type"], floor: "GROUND", length: r.length, width: r.width, height: 2.5,
    doors: 1, windows: r.type === "HALL" || r.type === "LANDING" || r.type === "STAIRS" ? 0 : 1, radiators: 1, notes: "",
    // Only the public answers are stored, so room-type defaults (e.g. typical electrical items) still apply.
    works: Object.fromEntries(Object.entries(readValues({ fields: roomFields }, r.works, true)).filter(([k]) => roomFields.some(f => f.key === k && f.public))),
  }));
  if (!Object.keys(packages).length && !rooms.length) return { ok: false as const, message: "Choose at least one type of work or add a room." };

  try {
    const [{ rates, prices }, commercial] = await Promise.all([resolveTakeoffPrices(), readCommercialDefaults()]);
    const input: TakeoffInput = {
      ...base,
      property: { ...base.property, ...parsed.data.property },
      packages,
      rooms,
      commercial: { ...base.commercial, ...(commercial ?? {}) },
      priceEdits: {},
    };
    const r = calculateTakeoff(input, prices, rates);
    // Garden and cleaning start at zero: ask for a measurement rather than showing a price for set-up only.
    const empty = workPackages.filter(p => packages[p.id] && !r.lines.some(l => l.area === p.label && l.phase !== "SITE"));
    if (empty.length) return { ok: false as const, message: `Please enter at least one measurement for ${empty.map(p => p.label.toLowerCase()).join(" and ")}.` };
    const c = customerTakeoff(r, input);
    const vat = c.net > 0 ? c.gross / c.net : 1.2;
    return {
      ok: true as const,
      guide: c.guide,
      weeks: c.programme.weeks,
      workingDays: c.programme.workingDays,
      // Site set-up, fees and H&S are shared across the work packages for display.
      packages: (() => {
        const work = c.packages.filter(p => p.package !== "Site set-up & safety");
        const site = c.net - work.reduce((s, p) => s + p.net, 0), sum = work.reduce((s, p) => s + p.net, 0) || 1;
        return work.map(p => ({ name: p.package, approx: Math.round((p.net + site * p.net / sum) * vat / 100) * 100 }));
      })(),
      trades: c.trades.map(t => ({ trade: t.trade, days: Math.round(t.days * 2) / 2 })),
      scope: c.scope,
      clientSupplies: [...new Set(c.clientOrders.map(o => o.description.split(" – ")[0]))].slice(0, 10),
    };
  } catch {
    return { ok: false as const, message: "We could not calculate a price just now. Please try again or book a free survey." };
  }
}
