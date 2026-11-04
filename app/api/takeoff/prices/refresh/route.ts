import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/app/lib/db";
import { prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { refreshSupplierPrices } from "@/app/lib/takeoff/supplier.server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily supplier price check. Call once a day (e.g. a hosting cron) with
 * Authorization: Bearer <TAKEOFF_CRON_SECRET>. Each call checks up to 40 products
 * not checked in the last 20 hours; call again if `remaining` is true.
 */
async function handle(request: Request) {
  const secret = process.env.TAKEOFF_CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret ?? ""}`), actual = Buffer.from(header);
  if (!secret || secret.length < 24 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) return Response.json({ error: "Storage not set up" }, { status: 503 });
  const r = await refreshSupplierPrices(db, 40);
  return Response.json({ checked: r.checked, updated: r.ok, failed: r.results.filter(x => !x.ok), remaining: r.checked === 40 }, { status: r.results.some(x => !x.ok) ? 207 : 200 });
}
export const GET = handle;
export const POST = handle;
