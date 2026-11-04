import { z } from "zod";

const t = (max: number) => z.string().trim().max(max).default("");

/** Company details printed on quotes, contracts, guarantees and health & safety documents. */
export const companySchema = z.object({
  name: t(120), registeredName: t(120), address: t(300), phone: t(40), email: t(120), website: t(120),
  companyNo: t(20), vatNo: t(20), logoUrl: t(300),
  insurer: t(120), policyNo: t(60), publicLiability: t(40), employersLiability: t(40), contractorsAllRisk: t(40),
  memberships: t(300),
  bankName: t(80), accountName: t(120), sortCode: t(10), accountNumber: t(12),
  siteManager: t(80), siteManagerPhone: t(40), healthSafetyLead: t(80), firstAider: t(80),
  disputeScheme: t(200), workingHours: t(120),
});
export type CompanyProfile = z.output<typeof companySchema>;

/** Known details from the website; the rest are filled in on the Company & documents page. */
export const defaultCompany: CompanyProfile = companySchema.parse({
  name: "2A Construction", registeredName: "2A Construction Ltd", phone: "+44 7903 095967", email: "2a.construction.uk@gmail.com",
  companyNo: "15102296", logoUrl: "/2a_logo_dark.svg",
  memberships: "Federation of Master Builders (FMB) member · SafeContractor approved",
  disputeScheme: "Federation of Master Builders dispute resolution / RICS mediation",
  workingHours: "08:00–17:30 Monday to Friday, 08:00–13:00 Saturday (quiet work only)",
});

export const companyFromOverrides = (raw: unknown): CompanyProfile => {
  const parsed = companySchema.partial().safeParse(raw ?? {});
  const given = parsed.success ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined && v !== "")) : {};
  return { ...defaultCompany, ...given };
};

/** Fields the documents need before they are sent (shown as a warning to the admin). */
export const missingCompanyFields = (c: CompanyProfile) =>
  ([["address", "registered / trading address"], ["insurer", "insurer"], ["policyNo", "insurance policy number"], ["publicLiability", "public liability cover"],
    ["accountNumber", "bank account for payments"], ["siteManager", "site manager"]] as const).filter(([k]) => !c[k]).map(([, l]) => l);
