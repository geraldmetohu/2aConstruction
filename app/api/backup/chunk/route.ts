import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { prismaDb } from "@/app/lib/takeoff/store";
import { backupAllowed } from "@/app/lib/backup/access.server";
import { readChunk } from "@/app/lib/backup/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ?table=Name&offset=0 → { rows: [...], next } (next is the offset to ask for, or null when done). */
export async function GET(req: Request) {
  if (!(await backupAllowed(req))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const u = new URL(req.url);
  const table = z.string().min(1).max(128).safeParse(u.searchParams.get("table"));
  const offset = z.coerce.number().int().min(0).safeParse(u.searchParams.get("offset") ?? "0");
  if (!table.success || !offset.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const c = await readChunk(prismaDb(prisma), table.data, offset.data);
    // The rows are already JSON from the database – sent as-is.
    return new Response(`{"table":${JSON.stringify(c.table)},"offset":${c.offset},"count":${c.rows},"next":${c.next ?? "null"},"rows":${c.json}}`, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && e.message === "Unknown table" ? "Unknown table" : "Could not read" }, { status: 400 }); }
}
