"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { resolveError } from "@/app/lib/errors/error-log";

export async function resolveErrorAction(id: string) {
  await requireCatalogueAdmin();
  await resolveError(prismaDb(prisma), z.string().uuid().parse(id));
  revalidatePath("/dashboard/errors");
}
