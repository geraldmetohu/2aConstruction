"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { saveNotifications, secretToken, settingsReady } from "@/app/lib/settings/app-settings";

const ready = async () => { const db = prismaDb(prisma); if (!(await settingsReady(db))) throw new Error("Needs the database update 20261118130000_admin_tools (run npx prisma migrate deploy)."); return db; };

export async function saveNotificationsAction(raw: unknown) {
  try {
    await requireCatalogueAdmin();
    const n = z.object({ morningList: z.boolean(), clientReminders: z.boolean(), portalDigest: z.boolean(), reviewRequests: z.boolean() }).parse(raw);
    await saveNotifications(await ready(), n);
    revalidatePath("/dashboard/notifications");
    return { ok: true as const, message: "Saved." };
  } catch (e) { return { ok: false as const, message: e instanceof Error ? e.message : "Could not save." }; }
}

/** Make the calendar link (or a new one – the old link stops working). */
export async function calendarLinkAction(rotate: boolean) {
  try {
    await requireCatalogueAdmin();
    await secretToken(await ready(), "calendarToken", rotate);
    revalidatePath("/dashboard/notifications");
    return { ok: true as const, message: rotate ? "New link made – the old one no longer works." : "Calendar link ready." };
  } catch (e) { return { ok: false as const, message: e instanceof Error ? e.message : "Could not make the link." }; }
}
