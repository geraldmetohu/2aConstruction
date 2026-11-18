import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { getSetting } from "@/app/lib/settings/app-settings";
import { toIcs } from "@/app/lib/calendar/ics";
import { jobsCalendar } from "@/app/lib/calendar/jobs-calendar.server";

export const dynamic = "force-dynamic";

/** The team calendar feed (subscribe in Google / Outlook / Apple calendar). The link is secret – keep it to the team. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const given = token.replace(/\.ics$/i, "");
  const saved = await getSetting(prismaDb(prisma), "calendarToken").catch(() => null);
  if (!saved || given.length !== saved.length || !timingSafeEqual(Buffer.from(given), Buffer.from(saved))) return new Response("Not found", { status: 404 });
  const body = toIcs("2A Construction – jobs", await jobsCalendar());
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="2a-jobs.ics"', "Cache-Control": "private, max-age=900" } });
}
