import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectEditor } from "@/app/componets/dashboard/ProjectEditor";
import { projectAdmin } from "../access";
import { clientProjectOptions, editorDetail, photoSources } from "../editor-data";

export const metadata: Metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default async function ProjectCreatePage() {
  if (!(await projectAdmin())) redirect("/");
  const [sources, clientProjects, { ready, detail }] = await Promise.all([photoSources(), clientProjectOptions(), editorDetail(null)]);
  return (
    <ProjectEditor
      project={{ id: null, name: "", description: "", status: "draft", category: "extention", isFeatured: false, images: [], sourceClientProjectId: null }}
      detail={detail}
      sources={sources}
      detailsReady={ready}
      clientProjects={clientProjects}
    />
  );
}
