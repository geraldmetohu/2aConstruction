import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requirePortalOwner } from "@/app/lib/customer-portal/access";
import { ownedProject, currentPublication } from "@/app/lib/customer-portal/service";
import type { PublicProject } from "@/app/lib/customer-portal/projection";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  try {
    const owner = await requirePortalOwner(), p = await params;
    z.string().uuid().parse(p.assetId); await ownedProject(prisma, p.projectId, owner);
    const publication = await currentPublication(prisma, p.projectId);
    if (!publication || publication.status !== "SHARED" || !(publication.snapshot as unknown as PublicProject).files.some(f => f.id === p.assetId)) return new Response("Not found", { status: 404 });
    const asset = await prisma.projectAsset.findFirst({ where: { id: p.assetId, projectId: p.projectId } });
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(asset.content), { headers: { "Content-Type": asset.mimeType, "Content-Disposition": `${asset.kind === "PHOTO" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Robots-Tag": "noindex, nofollow" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
