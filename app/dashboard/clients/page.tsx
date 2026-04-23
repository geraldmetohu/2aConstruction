import { prisma } from "@/app/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Clock, Mail, Phone, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

async function getClients() {
  return prisma.client.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      projects: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clients</CardTitle>
        <CardDescription>Estimator submissions from the website.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No estimator forms have been submitted yet.
          </div>
        ) : (
          clients.map((client) => (
            <details key={client.id} className="group rounded-2xl border bg-white p-4 shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-amber-600" />
                    <h2 className="text-lg font-bold">{client.fullName}</h2>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" />{client.email}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{client.phone}</span>
                    <span>{client.address}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">{client.preferredContact}</span>
                  {client.startTimeframe && <span className="rounded-full bg-neutral-100 px-3 py-1">{client.startTimeframe}</span>}
                  <span className="rounded-full bg-neutral-950 px-3 py-1 text-white">Open details</span>
                </div>
              </summary>

              <div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-3 rounded-xl bg-neutral-50 p-4 text-sm">
                  <InfoRow label="Found us" value={client.foundUs ?? "Not provided"} />
                  <InfoRow label="Looking to start" value={client.startTimeframe ?? "Not provided"} />
                  <InfoRow label="Terms accepted" value={client.termsAccepted ? "Yes" : "No"} />
                  <InfoRow label="Contact consent" value={client.marketingAccepted ? "Yes" : "No"} />
                  <InfoRow label="Submitted" value={client.createdAt?.toLocaleString("en-GB") ?? "Unknown"} />
                </div>

                <div className="space-y-4">
                  {client.projects.map((project) => (
                    <details key={project.id} className="rounded-xl border bg-neutral-50 p-4" open>
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-base font-bold capitalize">{project.projectType}</h3>
                            <p className="text-sm text-muted-foreground">Project ID: {project.id}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                              <Clock className="h-3.5 w-3.5" />
                              {project.status}
                            </span>
                            {project.priceEstimated && (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                                Estimate: {project.priceEstimated}
                              </span>
                            )}
                            {project.finalPrice && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Final: {project.finalPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </summary>

                      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
                        <dl className="divide-y">
                          {Object.entries(project.formData as Record<string, string | string[]>).map(([key, value]) => (
                            <div key={key} className="grid gap-1 p-3 text-sm md:grid-cols-[220px_1fr]">
                              <dt className="font-semibold text-neutral-700">{humanizeKey(key)}</dt>
                              <dd className="text-neutral-600">{Array.isArray(value) ? value.join(", ") : value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-semibold text-neutral-700">{label}</span>
      <span className="text-right text-neutral-600">{value}</span>
    </div>
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}
