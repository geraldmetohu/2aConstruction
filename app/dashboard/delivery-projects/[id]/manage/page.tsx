import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireManagementAdmin } from "@/app/lib/project-management/access";
import { loadProject } from "@/app/lib/project-management/service";
import { portalEnabled } from "@/app/lib/customer-portal/access";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { readPlanningDefaults } from "@/app/lib/company-settings/read";
export const dynamic = "force-dynamic";
export default async function ManageProject({ params }: { params: Promise<{ id: string }> }) {
  await requireManagementAdmin(); const { id } = await params; if (!z.string().uuid().safeParse(id).success) notFound();
  const exists = await prisma.deliveryProject.findUnique({ where: { id }, select: { id: true } }); if (!exists) notFound();
  const workspace = await loadProject(prisma, id);
  const defaults = await readPlanningDefaults(prisma);
  return <div className="mx-auto max-w-7xl p-4 md:p-6"><Link className="text-sm underline" href={`/dashboard/delivery-projects/${id}`}>← Accepted baseline</Link>{portalEnabled() && <Link className="ml-5 text-sm underline" href={`/dashboard/delivery-projects/${id}/portal`}>Customer portal sharing</Link>}<ProjectWorkspace workspace={workspace} defaults={defaults} /></div>;
}
