import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { backupAllowed } from "@/app/lib/backup/access.server";
import { EXCLUDED_TABLES, listTables } from "@/app/lib/backup/backup";

export const dynamic = "force-dynamic";

/** What a backup contains: every table with its row count. */
export async function GET(req: Request) {
  if (!(await backupAllowed(req))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const tables = await listTables(prismaDb(prisma));
  return NextResponse.json({ createdAt: new Date().toISOString(), tables, excluded: [...EXCLUDED_TABLES], site: new URL(req.url).origin }, { headers: { "Cache-Control": "no-store" } });
}
