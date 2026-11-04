"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireManagementAdmin } from "@/app/lib/project-management/access";
import { ManagementError } from "@/app/lib/project-management/schema";
import { managementService } from "@/app/lib/project-management/service";
export async function recordProjectActivity(raw: unknown) {
  try { const actor = await requireManagementAdmin(); const sequence = await managementService(prisma).record(raw, actor); revalidatePath("/dashboard/delivery-projects", "layout"); return { ok: true as const, sequence }; }
  catch (e) { return { ok: false as const, message: e instanceof ManagementError ? e.message : e instanceof z.ZodError ? e.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : "Unable to save. Reload to check project history before retrying." }; }
}
