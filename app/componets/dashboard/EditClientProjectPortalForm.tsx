"use client";

import { saveClientProjectPortal } from "@/app/actions";
import SortTableImageList from "@/app/componets/dashboard/SortTableImageList";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

type PhaseFormItem = {
  id?: string;
  title: string;
  status: "planned" | "active" | "completed";
  phaseOrder: number;
  targetDays: string;
  targetDate: string;
  jobsText: string;
  notes: string;
  images: string[];
};

export function EditClientProjectPortalForm({
  data,
}: {
  data: {
    id: string;
    projectType: string;
    dashboardTitle: string | null;
    introTitle: string | null;
    introMessage: string | null;
    currentStage: string;
    siteVisitDate: Date | null;
    agreementDate: Date | null;
    plannedStartDate: Date | null;
    targetCompletionDate: Date | null;
    progressPercent: number;
    isPortalVisible: boolean;
    adminSummary: string | null;
    clientNotes: string | null;
    priceEstimated: string | null;
    finalPrice: string | null;
    client: {
      fullName: string;
      email: string;
    };
    phases: {
      id: string;
      title: string;
      status: "planned" | "active" | "completed";
      phaseOrder: number;
      targetDays: number | null;
      targetDate: Date | null;
      jobs: unknown;
      notes: string | null;
      images: string[];
    }[];
  };
}) {
  const [lastResult, action] = useActionState(saveClientProjectPortal, undefined);
  const [phases, setPhases] = useState<PhaseFormItem[]>(
    data.phases.map((phase) => ({
      id: phase.id,
      title: phase.title,
      status: phase.status,
      phaseOrder: phase.phaseOrder,
      targetDays: phase.targetDays?.toString() ?? "",
      targetDate: phase.targetDate ? toDateInputValue(phase.targetDate) : "",
      jobsText: Array.isArray(phase.jobs) ? phase.jobs.filter((item): item is string => typeof item === "string").join("\n") : "",
      notes: phase.notes ?? "",
      images: phase.images,
    }))
  );

  const phasesJson = useMemo(
    () =>
      JSON.stringify(
        phases.map((phase, index) => ({
          id: phase.id,
          title: phase.title,
          status: phase.status,
          phaseOrder: index,
          targetDays: phase.targetDays ? Number(phase.targetDays) : null,
          targetDate: phase.targetDate || null,
          jobs: phase.jobsText.split("\n").map((item) => item.trim()).filter(Boolean),
          notes: phase.notes,
          images: phase.images,
        }))
      ),
    [phases]
  );

  function addPhase() {
    setPhases((current) => [
      ...current,
      {
        title: "",
        status: "planned",
        phaseOrder: current.length,
        targetDays: "",
        targetDate: "",
        jobsText: "",
        notes: "",
        images: [],
      },
    ]);
  }

  function updatePhase(index: number, patch: Partial<PhaseFormItem>) {
    setPhases((current) => current.map((phase, currentIndex) => (currentIndex === index ? { ...phase, ...patch } : phase)));
  }

  function removePhase(index: number) {
    setPhases((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="clientProjectId" value={data.id} />
      <input type="hidden" name="phasesJson" value={phasesJson} />

      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/project-clients">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Client Project Dashboard</h1>
          <p className="text-sm text-muted-foreground">{data.client.fullName} • {data.projectType}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal overview</CardTitle>
          <CardDescription>These details appear at the top of the client dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <FieldBlock label="Dashboard title" name="dashboardTitle" defaultValue={data.dashboardTitle ?? ""} />
          <FieldBlock label="Intro heading" name="introTitle" defaultValue={data.introTitle ?? ""} />
          <SelectBlock
            label="Current stage"
            name="currentStage"
            defaultValue={data.currentStage}
            options={[
              ["introduction", "Introduction"],
              ["estimator_sent", "Estimator sent"],
              ["site_visit", "Site visit"],
              ["agreeing_scope", "Agreeing scope"],
              ["start_booked", "Start booked"],
              ["in_progress", "In progress"],
              ["completed", "Completed"],
            ]}
          />
          <FieldBlock label="Progress percent" name="progressPercent" type="number" defaultValue={data.progressPercent.toString()} />
          <FieldBlock label="Site visit date" name="siteVisitDate" type="date" defaultValue={toDateInputValue(data.siteVisitDate)} />
          <FieldBlock label="Agreement date" name="agreementDate" type="date" defaultValue={toDateInputValue(data.agreementDate)} />
          <FieldBlock label="Planned start date" name="plannedStartDate" type="date" defaultValue={toDateInputValue(data.plannedStartDate)} />
          <FieldBlock label="Target completion date" name="targetCompletionDate" type="date" defaultValue={toDateInputValue(data.targetCompletionDate)} />
          <FieldBlock label="Estimated price" name="priceEstimated" defaultValue={data.priceEstimated ?? ""} />
          <FieldBlock label="Final price" name="finalPrice" defaultValue={data.finalPrice ?? ""} />
          <div className="space-y-3 rounded-2xl border p-4">
            <Label>Portal visible to client</Label>
            <Switch name="isPortalVisible" defaultChecked={data.isPortalVisible} />
          </div>
          <div className="space-y-3 rounded-2xl border p-4">
            <Label>Estimator project mix</Label>
            <p className="text-sm text-muted-foreground">{data.projectType}</p>
          </div>
          <div className="md:col-span-2">
            <Label>Intro message</Label>
            <Textarea name="introMessage" defaultValue={data.introMessage ?? ""} className="mt-2 min-h-28" />
          </div>
          <div className="md:col-span-2">
            <Label>Admin summary</Label>
            <Textarea name="adminSummary" defaultValue={data.adminSummary ?? ""} className="mt-2 min-h-24" />
          </div>
          <div className="md:col-span-2">
            <Label>Client-facing notes</Label>
            <Textarea name="clientNotes" defaultValue={data.clientNotes ?? ""} className="mt-2 min-h-24" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Phases</CardTitle>
            <CardDescription>Add phase-by-phase goals, jobs, notes and photos for the client to follow.</CardDescription>
          </div>
          <Button type="button" onClick={addPhase} className="rounded-full">
            <PlusCircle className="h-4 w-4" />
            Add phase
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {phases.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No phases added yet.
            </div>
          ) : (
            phases.map((phase, index) => (
              <div key={`${phase.id ?? "new"}-${index}`} className="rounded-3xl border bg-muted/20 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Phase {index + 1}</p>
                    <h3 className="text-lg font-black">{phase.title || "Untitled phase"}</h3>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => removePhase(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ControlledField label="Phase title" value={phase.title} onChange={(value) => updatePhase(index, { title: value })} />
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      value={phase.status}
                      onChange={(event) => updatePhase(index, { status: event.target.value as PhaseFormItem["status"] })}
                      className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <ControlledField label="Goal days" type="number" value={phase.targetDays} onChange={(value) => updatePhase(index, { targetDays: value })} />
                  <ControlledField label="Target date" type="date" value={phase.targetDate} onChange={(value) => updatePhase(index, { targetDate: value })} />
                  <div className="md:col-span-2">
                    <Label>Jobs for this phase</Label>
                    <Textarea
                      value={phase.jobsText}
                      onChange={(event) => updatePhase(index, { jobsText: event.target.value })}
                      className="mt-2 min-h-24"
                      placeholder="One job per line, e.g. Strip-out, first fix electrics, plasterboard..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Phase notes</Label>
                    <Textarea
                      value={phase.notes}
                      onChange={(event) => updatePhase(index, { notes: event.target.value })}
                      className="mt-2 min-h-24"
                      placeholder="Client-facing notes about progress, delays, inspections, or quality checkpoints."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Phase photos</Label>
                    <div className="mt-3">
                      <SortTableImageList
                        images={phase.images}
                        setImages={(updater) =>
                          setPhases((current) =>
                            current.map((item, currentIndex) => {
                              if (currentIndex !== index) return item;
                              const nextImages = typeof updater === "function" ? updater(item.images) : updater;
                              return { ...item, images: nextImages };
                            })
                          )
                        }
                        onDelete={(imageIndex) =>
                          setPhases((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, images: item.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex) }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          {lastResult?.message ? (
            <p className={`text-sm font-medium ${lastResult.ok ? "text-green-700" : "text-red-600"}`}>{lastResult.message}</p>
          ) : null}
          <SubmitButton text="Save client dashboard" />
        </CardFooter>
      </Card>
    </form>
  );
}

function FieldBlock({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function SelectBlock({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select name={name} defaultValue={defaultValue} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
        {options.map(([value, title]) => (
          <option key={value} value={value}>{title}</option>
        ))}
      </select>
    </div>
  );
}

function ControlledField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
