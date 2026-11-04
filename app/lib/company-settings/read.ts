import "server-only";
import { Prisma } from "@prisma/client";
import { planningDefaultsSchema } from "./defaults";
export async function readPlanningDefaults(tx: Prisma.TransactionClient, now = new Date()) {
  const row = await tx.companySettingsVersion.findFirst({ where: { settingsId: "company", effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
  if (!row) return null;
  const calendar = row.workingCalendar as { workingDays?: unknown };
  const parsed = planningDefaultsSchema.safeParse({ versionId: row.id, quoteValidityDays: row.quoteValidityDays, invoiceTermsDays: row.invoiceTermsDays, workdayHours: Number(row.workdayHours), defaultTeamSize: row.defaultTeamSize, workingDays: calendar?.workingDays });
  return parsed.success ? parsed.data : null;
}
