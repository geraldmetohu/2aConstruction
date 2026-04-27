import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Clock3, FolderKanban, UserRound } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getClientProjects() {
  return prisma.clientProject.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      client: true,
      phases: {
        orderBy: { phaseOrder: "asc" },
      },
      portfolioProjects: true,
    },
  });
}

export default async function ProjectClientsPage() {
  const projects = await getClientProjects();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project / Clients</CardTitle>
        <CardDescription>
          Manage live client dashboards, progress stages, phase notes, completion dates and the images clients can see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No client projects exist yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Project mix</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Phases</TableHead>
                <TableHead>Portfolio links</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 font-semibold">
                        <UserRound className="h-4 w-4 text-amber-600" />
                        {project.client.fullName}
                      </div>
                      <p className="text-xs text-muted-foreground">{project.client.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{project.projectType}</TableCell>
                  <TableCell className="capitalize">{project.currentStage.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 text-sm">
                      <FolderKanban className="h-4 w-4 text-amber-600" />
                      {project.phases.length}
                    </div>
                  </TableCell>
                  <TableCell>{project.portfolioProjects.length}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2 text-sm">
                      <Clock3 className="h-4 w-4 text-amber-600" />
                      {project.updatedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(project.updatedAt) : "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="rounded-full">
                      <Link href={`/dashboard/project-clients/${project.id}`}>
                        Edit
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
