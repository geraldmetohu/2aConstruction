import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireManagementAdmin } from "@/app/lib/project-management/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireManagementAdmin(); } catch { return new Response("Not found", { status: 404 }); }
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const asset = await prisma.projectAsset.findUnique({ where: { id } }); if (!asset) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(asset.content), { headers: { "Content-Type": asset.mimeType, "Content-Disposition": `${asset.kind === "PHOTO" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Robots-Tag": "noindex, nofollow" } });
}
