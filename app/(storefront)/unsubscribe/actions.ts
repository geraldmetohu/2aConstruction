"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { marketingReady, recordUnsubscribe } from "@/app/lib/marketing/contacts";
import { marketingConfigured, unsubscribeContact } from "@/app/lib/marketing/resend.server";

const hits = new Map<string, number[]>();

/** Anyone can stop marketing emails to an address (the same answer whether or not we know it). */
export async function unsubscribePublic(email: string) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  const now = Date.now(), list = (hits.get(ip) ?? []).filter(t => now - t < 3_600_000);
  if (list.length >= 10) return { ok: false as const, message: "Too many requests – please try again later or reply to one of our emails." };
  hits.set(ip, [...list, now]);
  const e = z.string().trim().toLowerCase().email().safeParse(email);
  if (!e.success) return { ok: false as const, message: "Please enter a valid email address." };
  try {
    const db = prismaDb(prisma);
    if (await marketingReady(db)) await recordUnsubscribe(db, e.data, "WEBSITE");
    if (marketingConfigured()) await unsubscribeContact(e.data).catch(() => {});
  } catch (err) { console.error("[unsubscribe]", err instanceof Error ? err.message : err); }
  return { ok: true as const, message: "Done – you won't get marketing emails from us any more. (We'll still email you about any project or quote you have with us.)" };
}
