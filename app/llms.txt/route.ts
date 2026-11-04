import { AREAS, SITE_URL } from "@/app/lib/seo/areas";
import { CATEGORY_META, CATEGORY_ORDER } from "@/app/lib/portfolio/categories";

// A plain-text summary for AI assistants and answer engines (the llms.txt convention).
export const dynamic = "force-static";

export function GET() {
  const areas = (r: string) => AREAS.filter(a => a.region === r && a.kind !== "hub").map(a => a.name).join(", ");
  const body = `# 2A Construction

> 2A Construction Ltd (Company No. 15102296) is a building company based in North London. We build house extensions, loft conversions, whole-house refurbishments and roofs for homeowners across London, North London and the South East of England. Member of the Federation of Master Builders (FMB), SafeContractor approved, fully insured, with a written 5-year workmanship guarantee.

## Contact
- Phone: +44 7903 095967
- Email: 2a.construction.uk@gmail.com
- Free site visits and itemised written quotations: ${SITE_URL}/contact
- Hours: Monday to Friday 8:00–18:00, Saturday 9:00–14:00

## Services
${CATEGORY_ORDER.map(c => `- [${CATEGORY_META[c].title}](${SITE_URL}/portfolio/${c}): ${CATEGORY_META[c].tagline}`).join("\n")}

## Areas covered
- North London: ${areas("North London")}
- South East: ${areas("South East")}
- Area pages: ${SITE_URL}/areas

## How we work
- Survey and drawings; planning, party wall and Building Control handled
- Itemised quotation with a programme and staged payments tied to finished work
- Written contract and a health and safety pack (construction phase plan, risk assessments, method statements)
- Online client portal with progress, photos, documents and payments
- Handover with certificates and a 5-year workmanship guarantee

## Key pages
- [Portfolio of finished projects](${SITE_URL}/portfolio/all)
- [Services](${SITE_URL}/services)
- [Online estimator](${SITE_URL}/estimator)
- [About](${SITE_URL}/about)
- [Certifications and compliance](${SITE_URL}/certifications)
- [Reviews on Checkatrade](https://www.checkatrade.com/trades/2aconstructionltd/reviews)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
