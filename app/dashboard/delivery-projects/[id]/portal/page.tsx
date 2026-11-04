import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requirePortalAdmin } from "@/app/lib/customer-portal/access";
import { currentPublication } from "@/app/lib/customer-portal/service";
import { loadProject } from "@/app/lib/project-management/service";
import type { PublicProject } from "@/app/lib/customer-portal/projection";
import { PortalSharing } from "./PortalSharing";
export const dynamic = "force-dynamic";
export default async function SharingPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalAdmin(); const { id } = await params; if (!z.string().uuid().safeParse(id).success) notFound();
  const p = await prisma.deliveryProject.findUnique({ where: { id }, select: { id: true } }); if (!p) notFound();
  const w = await loadProject(prisma, id), current = await currentPublication(prisma, id);
  const messages = await prisma.customerMessage.findMany({ where: { projectId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, authorKind: true, text: true, createdAt: true } });
  const files = w.state.flatMap(e => e.kind === "PHOTO" || e.kind === "DOCUMENT" ? [{ id: e.body.assetId, label: `${e.kind}: ${e.body.title}` }] : []);
  const variations = w.state.flatMap(e => e.kind === "VARIATION" ? [{ id: e.id, label: `${e.body.title} · ${e.body.status}` }] : []);
  const invoices = w.state.flatMap(e => e.kind === "INVOICE" && e.body.status === "ISSUED" ? [{ id: e.id, label: e.body.title }] : []);
  const snags = w.state.flatMap(e => e.kind === "SNAG" ? [{ id: e.id, label: e.body.title }] : []);
  return <div className="mx-auto max-w-5xl space-y-6 p-6"><Link className="text-sm underline" href={`/dashboard/delivery-projects/${id}/manage`}>← Project workspace</Link><h1 className="text-3xl font-black">Customer portal sharing</h1><p>Select the content, review the customer preview, then publish. Files and schedules remain private until explicitly shared.</p><PortalSharing key={`${w.sequence}-${current?.version ?? 0}`} projectId={id} sequence={w.sequence} version={current?.version ?? 0} shared={current?.status === "SHARED"} name={w.base.name} current={current?.status === "SHARED" ? current.snapshot as unknown as PublicProject : null} files={files} variations={variations} invoices={invoices} snags={snags} messages={messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))} /></div>;
}
