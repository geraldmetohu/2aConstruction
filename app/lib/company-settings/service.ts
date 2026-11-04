import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { canonicalJson } from "@/app/lib/pricing/engine";
import { settingsSchema, SettingsError } from "./schema";
export function companySettingsService(db: PrismaClient) {
  return { async save(raw: unknown, actor: string, now = new Date()) {
    const input = settingsSchema.parse(raw);
    return db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('company-settings'))`;
      const existing = await tx.companySettingsVersion.findUnique({ where: { id: input.requestId } });
      if (existing) {
        const audit = await tx.auditEvent.findFirst({ where: { entityId: existing.id, action: "COMPANY_SETTINGS_VERSION" } });
        if (audit?.actorUserId !== actor || canonicalJson(audit?.after) !== canonicalJson(input)) throw new SettingsError("This save request has already been used. Reload before saving.");
        return existing.versionNumber;
      }
      const latest = await tx.companySettingsVersion.findFirst({ where: { settingsId: "company" }, orderBy: { versionNumber: "desc" } });
      if ((latest?.versionNumber ?? 0) !== input.expectedVersion) throw new SettingsError("Settings changed. Reload and review the latest version.");
      if (latest && latest.effectiveFrom >= now) throw new SettingsError("A future settings version exists. Wait until it takes effect before saving another version.");
      const tax = await tx.taxCode.findFirst({ where: { id: input.estimatorFeeTaxCodeId, active: true, archivedAt: null }, include: { rates: { where: { effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } });
      if (!tax?.rates.length) throw new SettingsError("Choose an active fee VAT code with a currently effective rate.");
      if (!(await tx.companySettings.findUnique({ where: { id: "company" } }))) await tx.companySettings.create({ data: { id: "company" } });
      const { requestId, expectedVersion, reason, workingDays, ...values } = input;
      const saved = await tx.companySettingsVersion.create({ data: { ...values, id: requestId, settingsId: "company", versionNumber: expectedVersion + 1, effectiveFrom: now, workingCalendar: { workingDays, timezone: "Europe/London" }, autoGenerateInvoices: false, autoSendInvoices: false, roundingPolicyVersion: "GBP_LINE_HALF_UP_V1" } });
      await tx.auditEvent.create({ data: { actorUserId: actor, actorKind: "ADMIN", action: "COMPANY_SETTINGS_VERSION", entityType: "CompanySettingsVersion", entityId: saved.id, before: latest ? JSON.parse(JSON.stringify(latest)) : Prisma.DbNull, after: input, reason } });
      return saved.versionNumber;
    }, { timeout: 15000 });
  } };
}
