"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { STOREFRONT_TAG } from "@/app/lib/storefront-query";
import { setReviewStatus } from "@/app/lib/reviews/reviews";

export async function setReviewAction(id: string, status: "APPROVED" | "HIDDEN" | "PENDING", reply?: string) {
  try {
    const actor = await requireCatalogueAdmin();
    const ok = await setReviewStatus(prismaDb(prisma), z.string().uuid().parse(id), z.enum(["APPROVED", "HIDDEN", "PENDING"]).parse(status), actor, reply === undefined ? undefined : z.string().trim().max(1000).parse(reply));
    if (!ok) return { ok: false as const, message: status === "APPROVED" ? "The client didn't allow this review on the website, so it can't be shown." : "Review not found." };
    revalidateTag(STOREFRONT_TAG); revalidatePath("/dashboard/reviews"); revalidatePath("/");
    return { ok: true as const, message: status === "APPROVED" ? "Approved – it's now on the website." : status === "HIDDEN" ? "Hidden from the website." : "Saved." };
  } catch (e) { return { ok: false as const, message: e instanceof z.ZodError ? "Check the reply." : "Could not save." }; }
}
