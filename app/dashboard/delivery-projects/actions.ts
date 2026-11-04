"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireDeliveryAdmin } from "@/app/lib/delivery/access";
import { ConversionError } from "@/app/lib/delivery/plan";
import { deliveryService } from "@/app/lib/delivery/service";
export async function convertAcceptedQuote(raw: unknown) {
  try {
    const actor = await requireDeliveryAdmin();
    const id = await deliveryService(prisma).convert(raw, actor);
    revalidatePath("/dashboard/delivery-projects");
    return { ok: true as const, id };
  } catch (error) {
    return { ok: false as const, message: error instanceof ConversionError ? error.message : error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : "Unable to convert this quote. No partial conversion was saved. Reload to check for an existing project before retrying." };
  }
}
