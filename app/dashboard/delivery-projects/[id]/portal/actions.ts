"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requirePortalAdmin } from "@/app/lib/customer-portal/access";
import { portalService, currentPublication } from "@/app/lib/customer-portal/service";
import { publicationSchema, PortalError } from "@/app/lib/customer-portal/schema";
import { projectForCustomer } from "@/app/lib/customer-portal/projection";
import { loadProject } from "@/app/lib/project-management/service";
import type { QuoteResult } from "@/app/lib/quotes/calculate";
function message(e: unknown) { return e instanceof PortalError ? e.message : e instanceof z.ZodError ? "Check the sharing details and change reason." : "Unable to complete the portal action. Reload before retrying."; }
export async function previewPortalUpdate(raw: unknown) {
  try {
    await requirePortalAdmin(); const input = publicationSchema.parse(raw), w = await loadProject(prisma, input.projectId), current = await currentPublication(prisma, input.projectId);
    if (w.sequence !== input.expectedSequence || (current?.version ?? 0) !== input.expectedPublication) throw new PortalError("Reload to review the latest project state.");
    const p = await prisma.deliveryProject.findUniqueOrThrow({ where: { id: input.projectId }, select: { quoteSnapshot: true, scope: true } });
    const files = await prisma.projectAsset.findMany({ where: { projectId: input.projectId, id: { in: input.fileIds } }, select: { id: true, kind: true, mimeType: true, filename: true, byteLength: true } });
    const snapshot = projectForCustomer(w, input, (p.quoteSnapshot as unknown as QuoteResult).customer, (p.scope as { approvedLineKeys: string[] }).approvedLineKeys, files);
    return { ok: true as const, snapshot };
  } catch (e) { return { ok: false as const, message: message(e) }; }
}
export async function publishPortalUpdate(raw: unknown) {
  try { const actor = await requirePortalAdmin(); const id = await portalService(prisma).publish(raw, actor); revalidatePath("/my-projects", "layout"); revalidatePath("/dashboard/delivery-projects", "layout"); return { ok: true as const, id }; } catch (e) { return { ok: false as const, message: message(e) }; }
}
export async function sendTeamMessage(raw: unknown) {
  try { const actor = await requirePortalAdmin(); await portalService(prisma).message(raw, actor, "ADMIN"); revalidatePath("/my-projects", "layout"); revalidatePath("/dashboard/delivery-projects", "layout"); return { ok: true as const }; } catch (e) { return { ok: false as const, message: message(e) }; }
}
