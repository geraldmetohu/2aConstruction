import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { digestTick } from "@/app/lib/takeoff/office-digest.server";

/** Renders nothing. Lets page views send the hourly client-portal digest when one is due (after the response). */
export function OfficeDigestTick() {
  digestTick(prismaDb(prisma));
  return null;
}
