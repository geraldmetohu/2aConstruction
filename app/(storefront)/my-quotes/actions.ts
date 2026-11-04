"use server";
import { revalidatePath } from "next/cache";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { calculateTakeoff, customerTakeoff } from "@/app/lib/takeoff/engine";
import { roomFields } from "@/app/lib/takeoff/modules/rooms";
import { workPackages } from "@/app/lib/takeoff/modules/index";
import { takeoffInputSchema, type TakeoffInput } from "@/app/lib/takeoff/schema";
import { acceptQuote, getClientQuote, prismaDb, saveClientChoices, StoreError } from "@/app/lib/takeoff/store";
import { emailQuoteAccepted } from "@/app/lib/takeoff/quote-mail.server";
import type { PriceTable, RateBook } from "@/app/lib/takeoff/types";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";

const choiceSchema = z.array(z.object({ scope: z.enum(["room", "package"]), id: z.string().max(40), key: z.string().max(40), value: z.string().max(60) })).max(200);
const msg = (e: unknown) => e instanceof StoreError ? e.message : e instanceof z.ZodError ? "Please check your choices." : "Something went wrong. Please try again or contact us.";

async function clientEmail() {
  const user = await getKindeServerSession().getUser();
  if (!user?.email) throw new StoreError("Please log in with the email address the quote was sent to.");
  return user.email;
}

/** Apply only fields marked as client choices, with allowed values; everything else stays as quoted. */
function applyChoices(input: TakeoffInput, raw: unknown) {
  const choices = choiceSchema.parse(raw);
  const next: TakeoffInput = JSON.parse(JSON.stringify(input));
  const changes: string[] = [];
  for (const c of choices) {
    const fields = c.scope === "room" ? roomFields : workPackages.find(p => p.id === c.id)?.fields;
    const f = fields?.find(x => x.key === c.key && x.clientChoice);
    if (!f) continue;
    if (f.type === "select" && !f.options?.some(([k]) => k === c.value)) continue;
    const value = f.type === "text" ? c.value.trim().slice(0, 60) : c.value;
    if (c.scope === "room") {
      const room = next.rooms.find(r => r.id === c.id); if (!room) continue;
      if (room.works[c.key] === value) continue;
      room.works = { ...room.works, [c.key]: value };
      changes.push(`${room.name} – ${f.label}: ${f.type === "select" ? f.options!.find(([k]) => k === value)![1] : value}`);
    } else {
      const p = next.packages[c.id]; if (!p) continue;
      if (p.values[c.key] === value) continue;
      p.values = { ...p.values, [c.key]: value };
      changes.push(`${workPackages.find(x => x.id === c.id)!.label} – ${f.label}: ${f.type === "select" ? f.options!.find(([k]) => k === value)![1] : value}`);
    }
  }
  return { next, changes };
}

async function load(quoteId: string) {
  const email = await clientEmail();
  const q = await getClientQuote(prismaDb(prisma), z.string().uuid().parse(quoteId), email);
  if (!q?.version) throw new StoreError("Quote not found.");
  // Rates saved with the quote; any rate added since then falls back to the defaults.
  const saved = q.version.rates as RateBook;
  const rates: RateBook = { materials: { ...defaultRateBook.materials, ...saved.materials }, labour: { ...defaultRateBook.labour, ...saved.labour }, trades: { ...defaultRateBook.trades, ...saved.trades } };
  return { email, q, input: takeoffInputSchema.parse(q.version.input), rates, prices: q.version.prices as PriceTable };
}

/** Show the new price before the client confirms. Uses the prices the quote was made with. */
export async function previewChoices(quoteId: string, raw: unknown) {
  try {
    const { input, rates, prices } = await load(quoteId);
    const { next, changes } = applyChoices(input, raw);
    const c = customerTakeoff(calculateTakeoff(next, prices, rates), next);
    return { ok: true as const, gross: c.gross, changes };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

export async function confirmChoices(quoteId: string, version: number, raw: unknown) {
  try {
    const { email, q, input, rates, prices } = await load(quoteId);
    if (q.version!.version !== version) throw new StoreError("The quote has just been updated. Please reload.");
    const { next, changes } = applyChoices(input, raw);
    if (!changes.length) return { ok: true as const, version };
    const result = calculateTakeoff(next, prices, rates);
    const r = await saveClientChoices(prismaDb(prisma), quoteId, email, version, { input: next, result, customer: customerTakeoff(result, next), rates, prices }, changes.join("; "));
    revalidatePath(`/my-quotes/${quoteId}`);
    return { ok: true as const, version: r.version };
  } catch (e) { return { ok: false as const, message: msg(e) }; }
}

export async function acceptClientQuote(quoteId: string, version: number, fullName: string, agreed: boolean) {
  try {
    if (!agreed) throw new StoreError("Please tick the box to confirm you accept the quote and its terms.");
    const name = z.string().trim().min(3).max(120).parse(fullName);
    const email = await clientEmail();
    const id = z.string().uuid().parse(quoteId);
    const r = await acceptQuote(prismaDb(prisma), id, email, version, name);
    await emailQuoteAccepted({ quoteId: id, reference: r.reference, siteAddress: r.siteAddress, clientEmail: r.clientEmail, acceptedName: name, version });
    revalidatePath(`/my-quotes/${quoteId}`);
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: e instanceof z.ZodError ? "Please type your full name." : msg(e) }; }
}
