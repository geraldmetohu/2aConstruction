import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/app/lib/errors/report.server";

export const dynamic = "force-dynamic";

// Errors that happen in a visitor's browser (sent by the error screens). Small, rate-limited, never trusted.
const body = z.object({ message: z.string().max(2000), stack: z.string().max(8000).optional(), path: z.string().max(500).optional(), digest: z.string().max(100).optional() });
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now(), list = (hits.get(ip) ?? []).filter(t => now - t < 60_000);
  if (list.length >= 10) return NextResponse.json({ ok: false }, { status: 429 });
  hits.set(ip, [...list, now]);
  if (hits.size > 5000) hits.clear();
  const sameSite = (req.headers.get("origin") ?? "") === new URL(req.url).origin;
  if (!sameSite) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  // Browser extensions and old cached pages cause noise that isn't ours to fix.
  if (/chrome-extension:|moz-extension:|ResizeObserver loop|Loading chunk \d+ failed|ChunkLoadError/i.test(`${parsed.data.message} ${parsed.data.stack ?? ""}`)) return NextResponse.json({ ok: true });
  await reportError({ source: "browser", ...parsed.data });
  return NextResponse.json({ ok: true });
}
