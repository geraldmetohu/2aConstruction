"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prismaDb, StoreError } from "@/app/lib/takeoff/store";
import { cleanTakeoff, startTakeoff } from "@/app/lib/site-visit/convert";
import { cleanAnswers } from "@/app/lib/site-visit/template";
import { createVisit, linkVisitQuote, saveVisit, setVisitStatus, type VisitDetails } from "@/app/lib/site-visit/store";

const message = (e: unknown) => e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Could not save. Nothing was changed.";

const detailsSchema = z.object({
  clientName: z.string().trim().max(200).default(""),
  clientEmail: z.string().trim().max(200).refine(s => !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s), "Check the email address").default(""),
  clientPhone: z.string().trim().max(40).default(""),
  siteAddress: z.string().trim().max(500).default(""),
  postcode: z.string().trim().toUpperCase().max(10).default(""),
  /** "YYYY-MM-DDTHH:mm" from the form (UK time) or an ISO string. */
  visitAt: z.string().trim().max(40).nullable().default(null),
  projectTypes: z.array(z.string().max(30)).max(10).default([]),
});
/** A local date-time from the form is London time. */
function visitAt(v: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
    const guess = new Date(`${v}:00Z`);
    const london = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/London" }));
    return new Date(guess.getTime() - (london.getTime() - guess.getTime())).toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const details = (raw: unknown): VisitDetails => { const d = detailsSchema.parse(raw); return { ...d, visitAt: visitAt(d.visitAt) }; };

export async function createVisitAction(formData: FormData) {
  const actor = await requireCatalogueAdmin();
  const d = details({
    clientName: formData.get("clientName") ?? "", clientEmail: formData.get("clientEmail") ?? "", clientPhone: formData.get("clientPhone") ?? "",
    siteAddress: formData.get("siteAddress") ?? "", postcode: formData.get("postcode") ?? "", visitAt: (formData.get("visitAt") as string) || null,
    projectTypes: formData.getAll("projectTypes").map(String),
  });
  const r = await createVisit(prismaDb(prisma), d, {}, startTakeoff(d.projectTypes, d.postcode), actor);
  revalidatePath("/dashboard/site-visits");
  redirect(`/dashboard/site-visits/${r.id}`);
}

/** A visit prepared outside the app (for example from the architect's drawings) as a .json file. */
export async function importVisitAction(formData: FormData) {
  const actor = await requireCatalogueAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 500_000) throw new StoreError("Choose the prepared visit file (.json).");
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(await file.text()); } catch { throw new StoreError("That file isn't a prepared visit."); }
  if (raw?.kind !== "2a-site-visit") throw new StoreError("That file isn't a prepared visit.");
  const d = details(raw.details ?? {});
  const r = await createVisit(prismaDb(prisma), d, cleanAnswers(raw.answers), cleanTakeoff(raw.takeoff), actor);
  revalidatePath("/dashboard/site-visits");
  redirect(`/dashboard/site-visits/${r.id}`);
}

export async function saveVisitAction(args: { id: string; version: number; details: unknown; answers: unknown; takeoff: unknown }) {
  try {
    await requireCatalogueAdmin();
    const id = z.string().uuid().parse(args.id);
    const r = await saveVisit(prismaDb(prisma), id, z.number().int().positive().parse(args.version), details(args.details), cleanAnswers(args.answers), cleanTakeoff(args.takeoff));
    return { ok: true as const, version: r.version };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}

export async function setVisitStatusAction(id: string, status: string) {
  try {
    await requireCatalogueAdmin();
    await setVisitStatus(prismaDb(prisma), z.string().uuid().parse(id), z.enum(["PLANNED", "IN_PROGRESS", "DONE", "QUOTED", "CANCELLED"]).parse(status));
    revalidatePath("/dashboard/site-visits");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}

/** Called by the calculator after the first save of a quote made from a visit. */
export async function linkVisitQuoteAction(visitId: string, quoteId: string) {
  try {
    await requireCatalogueAdmin();
    await linkVisitQuote(prismaDb(prisma), z.string().uuid().parse(visitId), z.string().uuid().parse(quoteId));
    revalidatePath("/dashboard/site-visits");
    return { ok: true as const };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}
