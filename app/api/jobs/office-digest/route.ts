import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/app/lib/takeoff/jobs.server";
import { sendOfficeDigest } from "@/app/lib/takeoff/office-digest.server";

export const dynamic = "force-dynamic";

/** Bearer <CRON_SECRET> (Vercel Cron) or Bearer <TAKEOFF_CRON_SECRET> (e.g. the GitHub Actions schedule). */
function authorised(req: Request) {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return [process.env.CRON_SECRET, process.env.TAKEOFF_CRON_SECRET].some(secret =>
    !!secret && secret.length >= 24 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret)));
}

/** Hourly: email the office ONE list of everything clients did in their portal since the last run – or nothing. */
async function run(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await sendOfficeDigest(db())) }); }
  catch (e) { console.error("[office-digest]", e); return NextResponse.json({ ok: false, error: "Digest failed" }, { status: 500 }); }
}
export const GET = run;
export const POST = run;
