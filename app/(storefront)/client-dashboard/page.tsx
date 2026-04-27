import { prisma } from "@/app/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { CalendarClock, Camera, CheckCircle2, Clock3, FolderOpen, Hammer, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getClientDashboardData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      clients: {
        orderBy: { createdAt: "desc" },
        include: {
          projects: {
            where: { isPortalVisible: true },
            orderBy: { updatedAt: "desc" },
            include: {
              phases: {
                orderBy: { phaseOrder: "asc" },
              },
              portfolioProjects: {
                where: { status: "published" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

export default async function ClientDashboardPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {
    return (
      <section className="bg-[linear-gradient(180deg,#060606_0%,#111827_32%,#f8fafc_32%,#f8fafc_100%)] pb-16">
        <div className="mx-auto max-w-4xl px-4 pt-12 md:px-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">Client dashboard</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Sign in to view your project</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
              Your dashboard shows project stages, phase photos, notes and progress updates. Sign in with the same email you used for your estimator request.
            </p>
            <div className="mt-6">
              <Button asChild className="rounded-full bg-amber-500 px-5 text-black hover:bg-amber-400">
                <LoginLink authUrlParams={{ prompt: "login" }} postLoginRedirectURL="/api/auth/creation">
                  Sign in to your dashboard
                </LoginLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const dbUser = await getClientDashboardData(user.id);

  if (!dbUser || dbUser.clients.length === 0) {
    redirect("/");
  }

  return (
    <section className="bg-[linear-gradient(180deg,#060606_0%,#111827_16%,#f8fafc_16%,#f8fafc_100%)] pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">Client dashboard</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Your project space</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Follow your project stages, see phase-by-phase photo updates, and review notes from the 2A Construction team without leaving the main website.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><Mail className="h-4 w-4 text-amber-300" /> {dbUser.email}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><Hammer className="h-4 w-4 text-amber-300" /> {dbUser.clients.reduce((sum, client) => sum + client.projects.length, 0)} active portal project(s)</span>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {dbUser.clients.map((client) => (
            <div key={client.id} className="grid gap-6">
              {client.projects.map((project) => {
                const daysLeft = getDaysLeft(project.targetCompletionDate);
                const leadPortfolio = project.portfolioProjects[0];

                return (
                  <Card key={project.id} className="overflow-hidden rounded-[2rem] border-neutral-200 shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
                    <CardHeader className="border-b bg-white">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {project.projectType.split(",").map((type) => (
                              <span key={type} className="rounded-full bg-neutral-950 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                                {type.trim()}
                              </span>
                            ))}
                          </div>
                          <CardTitle className="mt-4 text-2xl font-black tracking-tight text-neutral-950 md:text-4xl">
                            {project.dashboardTitle || project.introTitle || "Your project dashboard"}
                          </CardTitle>
                          <CardDescription className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600 md:text-base">
                            {project.introMessage || "Your estimator, project stages, notes and progress updates will appear here as the job moves forward."}
                          </CardDescription>
                        </div>
                        <div className="grid gap-2 text-sm font-semibold text-neutral-700">
                          <span className="inline-flex justify-start rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                            Stage: {humanizeStage(project.currentStage)}
                          </span>
                          <span className="inline-flex justify-start rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">
                            Progress: {project.progressPercent}%
                          </span>
                          {daysLeft !== null && (
                            <span className="inline-flex justify-start rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">
                              Days left to completion target: {daysLeft}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8 bg-slate-50/70 p-6 md:p-8">
                      <div className="grid gap-4 lg:grid-cols-4">
                        <StatusCard label="Estimator sent" value={formatDate(project.createdAt)} Icon={CheckCircle2} />
                        <StatusCard label="Site visit" value={formatDate(project.siteVisitDate)} Icon={CalendarClock} />
                        <StatusCard label="Agreed scope" value={formatDate(project.agreementDate)} Icon={FolderOpen} />
                        <StatusCard label="Starting date" value={formatDate(project.plannedStartDate)} Icon={Clock3} />
                      </div>

                      <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Overall progress</p>
                            <p className="mt-1 text-sm text-neutral-600">Each phase below has its own goal, time allowance and photo notes.</p>
                          </div>
                          <span className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-black text-white">{project.progressPercent}%</span>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-neutral-950 transition-all duration-700" style={{ width: `${project.progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="space-y-5">
                          {project.phases.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-6 text-sm leading-7 text-neutral-600">
                              The team has not added live construction phases yet. Your top-line stage and milestone dates will appear here first, and detailed phases can be added later.
                            </div>
                          ) : (
                            project.phases.map((phase) => (
                              <div key={phase.id} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                                <div className="border-b bg-neutral-950 px-5 py-4 text-white">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Phase {phase.phaseOrder + 1}</p>
                                      <h3 className="mt-1 text-xl font-black">{phase.title}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.14em]">
                                      <span className="rounded-full bg-white/10 px-3 py-1">{humanizePhaseStatus(phase.status)}</span>
                                      {phase.targetDays ? <span className="rounded-full bg-white/10 px-3 py-1">{phase.targetDays} day goal</span> : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4 p-5">
                                  <div className="flex flex-wrap gap-2">
                                    {toStringArray(phase.jobs).map((job) => (
                                      <span key={job} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                                        {job}
                                      </span>
                                    ))}
                                  </div>
                                  {phase.notes ? (
                                    <p className="text-sm leading-7 text-neutral-600">{phase.notes}</p>
                                  ) : (
                                    <p className="text-sm text-neutral-500">Notes for this phase will appear here.</p>
                                  )}
                                  {phase.images.length > 0 && (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      {phase.images.map((image) => (
                                        <a key={image} href={image} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                                          <div className="relative h-40">
                                            <Image src={image} alt={phase.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="space-y-5">
                          <Card className="rounded-3xl border-neutral-200">
                            <CardHeader>
                              <CardTitle className="text-xl font-black text-neutral-950">Project notes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm leading-7 text-neutral-600">
                              <p>{project.clientNotes || "We will add practical notes here for you as the project progresses."}</p>
                              <div className="grid gap-3 text-sm">
                                <InfoLine label="Estimated price" value={project.priceEstimated || "TBC"} />
                                <InfoLine label="Final price" value={project.finalPrice || "To be confirmed"} />
                                <InfoLine label="Target completion" value={formatDate(project.targetCompletionDate)} />
                                <InfoLine label="Phone" value={client.phone} />
                              </div>
                            </CardContent>
                          </Card>

                          {leadPortfolio && (
                            <Card className="rounded-3xl border-neutral-200 bg-neutral-950 text-white">
                              <CardHeader>
                                <CardTitle className="text-xl font-black">Portfolio reference</CardTitle>
                                <CardDescription className="text-white/70">
                                  If this project is being prepared for the public portfolio, the linked showcase can be reviewed here.
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <Link href={`/project/${leadPortfolio.id}`} className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-black transition hover:bg-amber-300">
                                  View related portfolio project
                                </Link>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof CalendarClock;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-neutral-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-semibold text-neutral-700">{label}</span>
      <span className="text-right text-neutral-600">{value}</span>
    </div>
  );
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not booked yet";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value);
}

function getDaysLeft(value: Date | null | undefined) {
  if (!value) return null;
  const today = new Date();
  const diff = value.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function humanizeStage(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizePhaseStatus(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
