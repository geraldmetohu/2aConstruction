import { EditClientProjectPortalForm } from "@/app/componets/dashboard/EditClientProjectPortalForm";
import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getClientProject(id: string) {
  const data = await prisma.clientProject.findUnique({
    where: { id },
    include: {
      client: true,
      phases: {
        orderBy: { phaseOrder: "asc" },
      },
    },
  });

  if (!data) notFound();
  return data;
}

export default async function ProjectClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientProject(id);
  return <EditClientProjectPortalForm data={data} />;
}
