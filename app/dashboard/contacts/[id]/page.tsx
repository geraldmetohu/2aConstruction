import { EditContactForm } from "@/app/componets/dashboard/EditContactForm";
import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";

async function getData(contactId: string) {
    const data = await prisma.contact.findUnique({
        where: {
            id: contactId,
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
    return <EditContactForm data={data}/>;
}