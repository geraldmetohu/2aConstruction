import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/app/lib/db";
import { companyRates } from "@/app/lib/takeoff/prices.server";
import { prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { monthlyPriceRun } from "@/app/lib/takeoff/supplier.server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ok = (header: string, secret?: string) => {
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`), actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/**
 * Monthly supplier price update – run by Vercel Cron on the 1st (and the 2nd to finish anything left), see vercel.json.
 * Authorization: Bearer <CRON_SECRET> (set automatically by Vercel Cron) or Bearer <TAKEOFF_CRON_SECRET>.
 * Re-checks every linked product not checked for 20 days, then looks for unlinked materials on Screwfix,
 * Toolstation, Selco and Builder Depot (suggestions for you to confirm on the Supplier prices page).
 */
async function handle(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!ok(header, process.env.CRON_SECRET) && !ok(header, process.env.TAKEOFF_CRON_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = prismaDb(prisma);
  if (!(await storageReady(db))) return Response.json({ error: "Storage not set up" }, { status: 503 });
  const { rates } = await companyRates();
  const materials = Object.entries(rates.materials).filter(([, m]) => m.kind === "MATERIAL" || m.kind === "SUPPORTING").map(([key, m]) => ({ key, name: m.name, unit: m.unit }));
  const r = await monthlyPriceRun(db, materials, { budgetMs: 250_000 });
  return Response.json({ checked: r.checked, updated: r.updated, failed: r.failed.slice(0, 50), found: r.found.length, notFound: r.notFound.slice(0, 30), remaining: r.remaining }, { status: r.failed.length ? 207 : 200 });
}
export const GET = handle;
export const POST = handle;
