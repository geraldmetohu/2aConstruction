import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { ProjectEditor } from "@/app/componets/dashboard/ProjectEditor";
import { isCategory } from "@/app/lib/portfolio/categories";
import { projectAdmin } from "../access";
import { clientProjectOptions, editorDetail, photoSources } from "../editor-data";

export const metadata: Metadata = { title: "Edit project" };
export const dynamic = "force-dynamic";

export default async function EditRoute({ params }: { params: Promise<{ id: string }> }) {
  if (!(await projectAdmin())) redirect("/");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await prisma.project.findUnique({ where: { id } });
  if (!data) notFound();
  const [sources, clientProjects, { ready, detail }] = await Promise.all([photoSources(), clientProjectOptions(), editorDetail(id)]);
  return (
    <ProjectEditor
      project={{
        id: data.id, name: data.name, description: data.description, status: data.status, category: isCategory(data.category) ? data.category : "general",
        isFeatured: !!data.isFeatured, images: data.images, sourceClientProjectId: data.sourceClientProjectId,
      }}
      detail={detail}
      sources={sources}
      detailsReady={ready}
      clientProjects={clientProjects}
    />
  );
}
