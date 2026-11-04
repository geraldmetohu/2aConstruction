"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requirePortalOwner } from "@/app/lib/customer-portal/access";
import { portalService } from "@/app/lib/customer-portal/service";
import { PortalError } from "@/app/lib/customer-portal/schema";
import { ManagementError } from "@/app/lib/project-management/schema";
function errorMessage(e: unknown) { return e instanceof PortalError || e instanceof ManagementError ? e.message : e instanceof z.ZodError ? "Check your message or decision details." : "Unable to save. Reload to check whether your response was recorded."; }
export async function sendCustomerMessage(raw: unknown) {
  try { const owner = await requirePortalOwner(); await portalService(prisma).message(raw, owner, "CUSTOMER"); revalidatePath("/my-projects", "layout"); return { ok: true as const }; } catch (e) { return { ok: false as const, message: errorMessage(e) }; }
}
export async function decideCustomerVariation(raw: unknown) {
  try { const owner = await requirePortalOwner(); await portalService(prisma).decide(raw, owner); revalidatePath("/my-projects", "layout"); revalidatePath("/dashboard/delivery-projects", "layout"); return { ok: true as const }; } catch (e) { return { ok: false as const, message: errorMessage(e) }; }
}
