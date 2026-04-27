import { CreateProjectForm } from "@/app/componets/dashboard/CreateProjectForm";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

async function getSourceOptions() {
  const clientProjects = await prisma.clientProject.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      client: true,
      phases: {
        orderBy: {
          phaseOrder: "asc",
        },
      },
    },
  });

  return clientProjects.map((project) => ({
    id: project.id,
    label: `${project.client.fullName} • ${project.projectType}`,
    images: project.phases.flatMap((phase) => phase.images),
  }));
}

export default async function ProjectCreatePage() {
  const sourceOptions = await getSourceOptions();
  return <CreateProjectForm sourceOptions={sourceOptions} />;
}
