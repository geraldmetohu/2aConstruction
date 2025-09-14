import { EditForm } from "@/app/componets/dashboard/EditForm";
import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";

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

export default async function EditRoute({
    params,
}: {
    params: {id: string};
}) {
    const data = await getData(params.id);
    return <EditForm data={data}/>;
}