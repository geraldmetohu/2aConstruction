"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companySchema } from "@/app/lib/takeoff/company";
import { latestRateSet, prismaDb, saveRateSet, storageReady, StoreError } from "@/app/lib/takeoff/store";

/** Save company details as a new version of the company settings (rates are kept as they are). */
export async function saveCompany(expectedVersion: number, raw: unknown) {
  try {
    const actor = await requireCatalogueAdmin();
    const db = prismaDb(prisma);
    if (!(await storageReady(db))) throw new StoreError("Saving needs the new database tables (migration 20261101120000_add_takeoff_quotes).");
    const company = companySchema.parse(raw);
    if (company.logoUrl && !/^(\/[\w./-]+|https:\/\/\S+)$/.test(company.logoUrl)) throw new StoreError("The logo must be a path like /2a_logo_dark.svg or an https link.");
    for (const x of company.signatories) if (x.signatureUrl && !/^(\/[\w./-]+|https:\/\/\S+)$/.test(x.signatureUrl)) throw new StoreError(`The signature for ${x.name} must be an uploaded image (https link).`);
    if (new Set(company.signatories.map(x => x.id)).size !== company.signatories.length) throw new StoreError("Two signatories have the same id.");
    if (company.defaultSignatory && !company.signatories.some(x => x.id === company.defaultSignatory)) company.defaultSignatory = "";
    const current = ((await latestRateSet(db))?.overrides ?? {}) as Record<string, unknown>;
    const r = await saveRateSet(db, expectedVersion, { ...current, company }, "Company details updated", actor);
    revalidatePath("/dashboard/company"); revalidatePath("/dashboard/calculator");
    return { ok: true as const, version: r.version };
  } catch (e) {
    return { ok: false as const, message: e instanceof StoreError ? e.message : e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") || "Check the fields: one is too long." : "Could not save the company details." };
  }
}
