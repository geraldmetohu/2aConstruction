import { EditForm } from "@/app/componets/dashboard/EditForm";
import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getData(projectId: string) {
    const data = await prisma.project.findUnique({
        where: {
            id: projectId,
        },
    });
    if(!data) {
        return notFound();
    }
    return data;
}

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

export default async function EditRoute({
    params,
}: {
    params: Promise<{id: string}>;
}) {
    const { id } = await params;
    const data = await getData(id);
    const sourceOptions = await getSourceOptions();
    return <EditForm data={data} sourceOptions={sourceOptions}/>;
}
