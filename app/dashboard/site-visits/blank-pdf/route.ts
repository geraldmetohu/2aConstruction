import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { companyProfile } from "@/app/lib/takeoff/prices.server";
import { PROJECT_TYPES } from "@/app/lib/site-visit/template";
import { renderVisitPdf } from "@/app/lib/site-visit/pdf.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin: a blank site visit form for the chosen project types (?types=LOFT&types=EXTENSION), to print. */
export async function GET(req: Request) {
  await requireCatalogueAdmin();
  const types = new URL(req.url).searchParams.getAll("types").flatMap(t => t.split(",")).filter(t => PROJECT_TYPES.some(p => p.id === t)).slice(0, 10);
  const { company } = await companyProfile();
  const pdf = await renderVisitPdf({ companyName: company.name, reference: "BLANK", clientName: "", clientPhone: "", clientEmail: "", siteAddress: "", postcode: "", visitAt: null,
    types, answers: {}, takeoff: { property: {}, rooms: [], packages: {}, prelims: {} }, blank: true });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Site visit form (blank).pdf"`, "Cache-Control": "private, no-store" } });
}
