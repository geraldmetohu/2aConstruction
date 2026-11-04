"use server";
import { prisma } from "@/app/lib/db";
import { requireSettingsAdmin } from "@/app/lib/company-settings/access";
import { companySettingsService } from "@/app/lib/company-settings/service";
import { SettingsError } from "@/app/lib/company-settings/schema";
import { revalidatePath } from "next/cache";
export async function saveCompanySettings(raw: unknown) {
  try { const actor = await requireSettingsAdmin(); const version = await companySettingsService(prisma).save(raw, actor); revalidatePath("/dashboard/settings"); return { ok: true as const, version }; }
  catch (e) { return { ok: false as const, message: e instanceof SettingsError ? e.message : "Settings could not be saved. Check the fields and your access, then retry." }; }
}
