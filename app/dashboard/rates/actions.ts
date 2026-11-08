"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";
import { latestRateSet, prismaDb, saveRateSet, storageReady, StoreError } from "@/app/lib/takeoff/store";

const price = z.number().finite().min(0).max(1_000_000);
const schema = z.object({
  materials: z.record(z.object({ price }).strict()).default({}),
  labour: z.record(z.object({ price, perDay: z.number().finite().positive().max(10000).optional(), daysPerUnit: z.number().finite().min(0).max(100).optional() }).strict()).default({}),
}).strict();

/** Save a new version of the company rates. Only values that differ from the defaults are stored. */
export async function saveRates(expectedVersion: number, raw: unknown, reason: string) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = prismaDb(prisma);
    if (!(await storageReady(db))) throw new StoreError("Saving rates needs the new database tables (migration 20261101120000_add_takeoff_quotes).");
    const data = schema.parse(raw);
    for (const k of Object.keys(data.materials)) if (!defaultRateBook.materials[k]) delete data.materials[k];
    for (const k of Object.keys(data.labour)) if (!defaultRateBook.labour[k]) delete data.labour[k];
    // Keep everything else saved in the same versioned set (company details, saved jobs); only the prices are replaced.
    const current = ((await latestRateSet(db))?.overrides ?? {}) as Record<string, unknown>;
    const r = await saveRateSet(db, expectedVersion, { ...current, ...data }, z.string().trim().min(3, "Say briefly what changed").max(500).parse(reason), actor);
    revalidatePath("/dashboard/rates"); revalidatePath("/dashboard/calculator");
    return { ok: true as const, version: r.version };
  } catch (e) {
    return { ok: false as const, message: e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Could not save the rates." };
  }
}
