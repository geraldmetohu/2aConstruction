import { prisma } from "@/app/lib/db";
import { deleteClient } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Clock, ExternalLink, FileText, FolderOpen, Mail, Phone, Trash2, UserRound, Video } from "lucide-react";

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
                            <div className="flex flex-wrap gap-2">
                              {project.projectType.split(",").map((type) => (
                                <span key={type} className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                                  {type.trim()}
                                </span>
                              ))}
                            </div>
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

                      {(() => {
                        const { fileEntries, detailEntries } = splitProjectEntries(project.formData as Record<string, string | string[]>);

                        return (
                          <div className="mt-4 space-y-4">
                            {fileEntries.length > 0 && (
                              <div className="rounded-xl border bg-white p-4">
                                <div className="mb-4 flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4 text-amber-700" />
                                  <h4 className="text-sm font-black uppercase tracking-[0.16em] text-neutral-800">Uploads and attachments</h4>
                                </div>
                                <div className="space-y-4">
                                  {fileEntries.map(([key, value]) => (
                                    <div key={key} className="space-y-3">
                                      <p className="text-sm font-semibold text-neutral-700">{humanizeKey(key)}</p>
                                      <FormValue fieldKey={key} value={value} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="overflow-hidden rounded-xl border bg-white">
                              <dl className="divide-y">
                                {detailEntries.map(([key, value]) => (
                            <div key={key} className="grid gap-1 p-3 text-sm md:grid-cols-[220px_1fr]">
                              <dt className="font-semibold text-neutral-700">{humanizeKey(key)}</dt>
                              <dd className="text-neutral-600">
                                <FormValue fieldKey={key} value={value} />
                              </dd>
                            </div>
                                ))}
                              </dl>
                            </div>
                          </div>
                        );
                      })()}
                    </details>
                  ))}

                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-rose-100 p-2 text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black uppercase tracking-[0.16em] text-rose-900">Delete client</h4>
                        <p className="mt-1 text-sm text-rose-800">
                          Type <span className="font-bold">delete</span> to remove this client, their estimator submissions, and saved portal phases.
                        </p>
                        <form action={deleteClient} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                          <input type="hidden" name="clientId" value={client.id} />
                          <label className="flex-1 text-sm font-medium text-rose-900">
                            Confirmation
                            <input
                              type="text"
                              name="confirmation"
                              required
                              pattern="delete"
                              title="Type delete to confirm"
                              placeholder="Type delete"
                              className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none ring-0 transition focus:border-rose-400"
                            />
                          </label>
                          <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-bold text-white transition hover:bg-rose-800"
                          >
                            Delete client
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
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

function FormValue({ fieldKey, value }: { fieldKey: string; value: string | string[] }) {
  const values = Array.isArray(value) ? value : [value];
  const fileUrls = Array.from(new Set(values.flatMap(extractUrls)));

  if (fileUrls.length > 0) {
    return <FileGallery fieldKey={fieldKey} urls={fileUrls} />;
  }

  return <span>{values.join(", ") || "Not provided"}</span>;
}

function FileGallery({ fieldKey, urls }: { fieldKey: string; urls: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {urls.map((url) => {
        const image = isImageUrl(url) || isLikelyImageUpload(url, fieldKey);
        const video = isVideoUrl(url);
        const pdf = isPdfUrl(url);
        const fileName = getFileName(url);

        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
          >
            {image ? (
              <div className="h-36 bg-neutral-100">
                <img src={url} alt={fileName} className="h-full w-full object-cover" />
              </div>
            ) : video ? (
              <div className="h-36 bg-neutral-950">
                <video src={url} className="h-full w-full object-cover" controls preload="metadata" />
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-100 to-white px-4 text-center">
                <div className="rounded-full bg-white p-3 shadow-sm">
                  {video ? <Video className="h-7 w-7 text-amber-700" /> : <FileText className="h-7 w-7 text-amber-700" />}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  {pdf ? "PDF document" : video ? "Video attachment" : "File attachment"}
                </p>
              </div>
            )}
            <div className="space-y-2 p-3">
              <p className="line-clamp-2 text-sm font-semibold text-neutral-800">{fileName}</p>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                Open file
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function splitProjectEntries(entries: Record<string, string | string[]>) {
  return Object.entries(entries).reduce<{
    fileEntries: [string, string | string[]][];
    detailEntries: [string, string | string[]][];
  }>(
    (accumulator, entry) => {
      const [, value] = entry;
      const values = Array.isArray(value) ? value : [value];

      if (values.some((item) => extractUrls(item).length > 0)) {
        accumulator.fileEntries.push(entry);
      } else {
        accumulator.detailEntries.push(entry);
      }

      return accumulator;
    },
    { fileEntries: [], detailEntries: [] }
  );
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function extractUrls(value: string) {
  return value
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter((item) => looksLikeUrl(item));
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)($|\?)/i.test(value);
}

function isLikelyImageUpload(value: string, fieldKey: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const looksLikeUploadthing = hostname === "utfs.io" || hostname.endsWith(".ufs.sh");
    const imageField = /(photo|image|picture|idea|inspiration|sketch)/i.test(fieldKey);

    return looksLikeUploadthing && imageField && !isPdfUrl(value) && !isVideoUrl(value);
  } catch {
    return false;
  }
}

function isVideoUrl(value: string) {
  return /\.(mp4|mov|webm|avi|m4v)($|\?)/i.test(value);
}

function isPdfUrl(value: string) {
  return /\.pdf($|\?)/i.test(value);
}

function getFileName(value: string) {
  const lastSegment = value.split("/").pop() ?? value;

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}
