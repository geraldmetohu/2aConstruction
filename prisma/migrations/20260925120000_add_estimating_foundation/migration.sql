-- ADDITIVE FOUNDATION ONLY. No legacy table is read, altered or populated.
-- Deploy only after baseline/backup checks in docs/estimating-foundation-migration.md.
-- Do not replace these statements with IF NOT EXISTS: name collisions must fail.
BEGIN;

-- CreateEnum
CREATE TYPE "EstimateItemType" AS ENUM ('MATERIAL', 'LABOUR', 'PLANT', 'WASTE', 'PRELIMINARY', 'ASSEMBLY', 'OTHER');

-- CreateEnum
CREATE TYPE "EstimateItemRole" AS ENUM ('MAIN', 'SUPPORTING', 'BOTH');

-- CreateEnum
CREATE TYPE "EstimateFixStage" AS ENUM ('FIRST_FIX', 'SECOND_FIX', 'BOTH', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "EstimateWorkCondition" AS ENUM ('NEW_BUILD', 'NEW_INSTALLATION', 'REFURBISHMENT', 'REPAIR', 'MAKE_GOOD', 'REDECORATION');

-- CreateEnum
CREATE TYPE "EstimateRateBasis" AS ENUM ('HOURLY', 'DAILY');

-- CreateEnum
CREATE TYPE "EstimateDimensionKind" AS ENUM ('COUNT', 'LENGTH', 'AREA', 'VOLUME', 'TIME', 'MASS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EstimateCostBucket" AS ENUM ('MATERIAL', 'SUPPORTING_MATERIAL', 'LABOUR', 'PLANT', 'WASTE', 'OTHER');

-- CreateEnum
CREATE TYPE "EstimatePriceConfidence" AS ENUM ('UNVERIFIED', 'INDICATIVE', 'VERIFIED');

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemUnit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dimensionKind" "EstimateDimensionKind" NOT NULL,
    "canonicalFactor" DECIMAL(18,6),
    "quantityScale" INTEGER NOT NULL DEFAULT 3,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "itemType" "EstimateItemType" NOT NULL,
    "itemRole" "EstimateItemRole" NOT NULL DEFAULT 'MAIN',
    "fixStage" "EstimateFixStage" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "defaultQuantity" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "defaultDurationHours" DECIMAL(18,6),
    "defaultDimensions" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRateVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taxCodeId" UUID NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPriceVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "materialUnitCost" DECIMAL(19,4) NOT NULL,
    "labourUnitCost" DECIMAL(19,4),
    "plantUnitCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "wasteUnitCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "otherUnitCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "taxCodeId" UUID,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceDate" TIMESTAMPTZ(6),
    "confidence" "EstimatePriceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemPriceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "groupCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOptionVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "optionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "ruleSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "rule" JSONB NOT NULL,
    "specification" JSONB NOT NULL,
    "sourcePriceVersionId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemOptionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRecipeVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "condition" "EstimateWorkCondition" NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "ruleSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "quantityRule" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemRecipeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSupportingItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipeVersionId" UUID NOT NULL,
    "supportingItemId" UUID NOT NULL,
    "ruleSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "quantityRule" JSONB NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "defaultSelected" BOOLEAN NOT NULL DEFAULT true,
    "costBucket" "EstimateCostBucket" NOT NULL DEFAULT 'SUPPORTING_MATERIAL',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemSupportingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabourRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourRateVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "labourRoleId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "hourlyCost" DECIMAL(19,4) NOT NULL,
    "dailyCost" DECIMAL(19,4),
    "productiveHoursPerDay" DECIMAL(18,6) NOT NULL,
    "defaultTeamSize" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabourRateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLabour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipeVersionId" UUID NOT NULL,
    "labourRoleId" UUID NOT NULL,
    "hoursPerUnit" DECIMAL(18,6) NOT NULL,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "rateBasis" "EstimateRateBasis" NOT NULL DEFAULT 'HOURLY',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLabour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceReference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplierId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "supplierCode" TEXT,
    "sourceUrl" TEXT,
    "referencePrice" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "packQuantity" DECIMAL(18,6),
    "taxInclusive" BOOLEAN NOT NULL,
    "checkedAt" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPriceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'company',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettingsVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settingsId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GBP',
    "estimatorFeeAmount" DECIMAL(19,2) NOT NULL DEFAULT 50,
    "estimatorFeeInclusive" BOOLEAN,
    "estimatorFeeTaxCodeId" UUID,
    "defaultMarkupPercent" DECIMAL(7,4) NOT NULL,
    "defaultWastePercent" DECIMAL(7,4) NOT NULL,
    "contingencyPercent" DECIMAL(7,4) NOT NULL,
    "workdayHours" DECIMAL(18,6) NOT NULL,
    "defaultTeamSize" INTEGER NOT NULL,
    "workingCalendar" JSONB NOT NULL,
    "quoteValidityDays" INTEGER NOT NULL,
    "invoiceTermsDays" INTEGER NOT NULL,
    "autoGenerateInvoices" BOOLEAN NOT NULL DEFAULT false,
    "autoSendInvoices" BOOLEAN NOT NULL DEFAULT false,
    "roundingPolicyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettingsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" TEXT,
    "actorKind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_code_key" ON "ItemCategory"("code");

-- CreateIndex
CREATE INDEX "ItemCategory_parentId_sortOrder_idx" ON "ItemCategory"("parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUnit_code_key" ON "ItemUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionItem_code_key" ON "ConstructionItem"("code");

-- CreateIndex
CREATE INDEX "ConstructionItem_categoryId_active_idx" ON "ConstructionItem"("categoryId", "active");

-- CreateIndex
CREATE INDEX "ConstructionItem_unitId_idx" ON "ConstructionItem"("unitId");

-- CreateIndex
CREATE INDEX "ConstructionItem_name_idx" ON "ConstructionItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCode_code_key" ON "TaxCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRateVersion_taxCodeId_effectiveFrom_key" ON "TaxRateVersion"("taxCodeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ItemPriceVersion_taxCodeId_idx" ON "ItemPriceVersion"("taxCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPriceVersion_itemId_versionNumber_key" ON "ItemPriceVersion"("itemId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPriceVersion_itemId_currency_effectiveFrom_key" ON "ItemPriceVersion"("itemId", "currency", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOption_itemId_groupCode_code_key" ON "ItemOption"("itemId", "groupCode", "code");

-- CreateIndex
CREATE INDEX "ItemOptionVersion_sourcePriceVersionId_idx" ON "ItemOptionVersion"("sourcePriceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOptionVersion_optionId_versionNumber_key" ON "ItemOptionVersion"("optionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOptionVersion_optionId_effectiveFrom_key" ON "ItemOptionVersion"("optionId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRecipeVersion_itemId_condition_versionNumber_key" ON "ItemRecipeVersion"("itemId", "condition", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRecipeVersion_itemId_condition_effectiveFrom_key" ON "ItemRecipeVersion"("itemId", "condition", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ItemSupportingItem_supportingItemId_idx" ON "ItemSupportingItem"("supportingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemSupportingItem_recipeVersionId_supportingItemId_key" ON "ItemSupportingItem"("recipeVersionId", "supportingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabourRole_code_key" ON "LabourRole"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LabourRateVersion_labourRoleId_versionNumber_key" ON "LabourRateVersion"("labourRoleId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LabourRateVersion_labourRoleId_currency_effectiveFrom_key" ON "LabourRateVersion"("labourRoleId", "currency", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ItemLabour_labourRoleId_idx" ON "ItemLabour"("labourRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLabour_recipeVersionId_labourRoleId_key" ON "ItemLabour"("recipeVersionId", "labourRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "SupplierPriceReference_itemId_supplierId_checkedAt_idx" ON "SupplierPriceReference"("itemId", "supplierId", "checkedAt");

-- CreateIndex
CREATE INDEX "SupplierPriceReference_supplierId_idx" ON "SupplierPriceReference"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPriceReference_unitId_idx" ON "SupplierPriceReference"("unitId");

-- CreateIndex
CREATE INDEX "CompanySettingsVersion_estimatorFeeTaxCodeId_idx" ON "CompanySettingsVersion"("estimatorFeeTaxCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettingsVersion_settingsId_versionNumber_key" ON "CompanySettingsVersion"("settingsId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettingsVersion_settingsId_effectiveFrom_key" ON "CompanySettingsVersion"("settingsId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_idx" ON "AuditEvent"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_occurredAt_idx" ON "AuditEvent"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConstructionItem" ADD CONSTRAINT "ConstructionItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConstructionItem" ADD CONSTRAINT "ConstructionItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ItemUnit"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TaxRateVersion" ADD CONSTRAINT "TaxRateVersion_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemPriceVersion" ADD CONSTRAINT "ItemPriceVersion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ConstructionItem"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemPriceVersion" ADD CONSTRAINT "ItemPriceVersion_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemOption" ADD CONSTRAINT "ItemOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ConstructionItem"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemOptionVersion" ADD CONSTRAINT "ItemOptionVersion_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ItemOption"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemOptionVersion" ADD CONSTRAINT "ItemOptionVersion_sourcePriceVersionId_fkey" FOREIGN KEY ("sourcePriceVersionId") REFERENCES "ItemPriceVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemRecipeVersion" ADD CONSTRAINT "ItemRecipeVersion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ConstructionItem"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemSupportingItem" ADD CONSTRAINT "ItemSupportingItem_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "ItemRecipeVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemSupportingItem" ADD CONSTRAINT "ItemSupportingItem_supportingItemId_fkey" FOREIGN KEY ("supportingItemId") REFERENCES "ConstructionItem"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "LabourRateVersion" ADD CONSTRAINT "LabourRateVersion_labourRoleId_fkey" FOREIGN KEY ("labourRoleId") REFERENCES "LabourRole"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemLabour" ADD CONSTRAINT "ItemLabour_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "ItemRecipeVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ItemLabour" ADD CONSTRAINT "ItemLabour_labourRoleId_fkey" FOREIGN KEY ("labourRoleId") REFERENCES "LabourRole"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPriceReference" ADD CONSTRAINT "SupplierPriceReference_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPriceReference" ADD CONSTRAINT "SupplierPriceReference_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ConstructionItem"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPriceReference" ADD CONSTRAINT "SupplierPriceReference_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ItemUnit"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanySettingsVersion" ADD CONSTRAINT "CompanySettingsVersion_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "CompanySettings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompanySettingsVersion" ADD CONSTRAINT "CompanySettingsVersion_estimatorFeeTaxCodeId_fkey" FOREIGN KEY ("estimatorFeeTaxCodeId") REFERENCES "TaxCode"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Constraints below supplement Prisma's schema (which cannot express CHECKs).
ALTER TABLE "ItemUnit" ADD CONSTRAINT "ItemUnit_quantity_check"
  CHECK ("quantityScale" BETWEEN 0 AND 6 AND ("canonicalFactor" IS NULL OR "canonicalFactor" > 0));
ALTER TABLE "ConstructionItem" ADD CONSTRAINT "ConstructionItem_quantity_check"
  CHECK ("defaultQuantity" > 0 AND ("defaultDurationHours" IS NULL OR "defaultDurationHours" >= 0));
ALTER TABLE "TaxRateVersion" ADD CONSTRAINT "TaxRateVersion_rate_check"
  CHECK ("rate" BETWEEN 0 AND 100);
ALTER TABLE "ItemPriceVersion" ADD CONSTRAINT "ItemPriceVersion_cost_check"
  CHECK ("versionNumber" > 0 AND "materialUnitCost" >= 0 AND ("labourUnitCost" IS NULL OR "labourUnitCost" >= 0)
    AND "plantUnitCost" >= 0 AND "wasteUnitCost" >= 0 AND "otherUnitCost" >= 0 AND "currency" = 'GBP');
ALTER TABLE "ItemOptionVersion" ADD CONSTRAINT "ItemOptionVersion_rule_check"
  CHECK ("versionNumber" > 0 AND "ruleSchemaVersion" > 0 AND jsonb_typeof("rule") = 'object'
    AND jsonb_typeof("specification") = 'object');
ALTER TABLE "ItemRecipeVersion" ADD CONSTRAINT "ItemRecipeVersion_rule_check"
  CHECK ("versionNumber" > 0 AND "ruleSchemaVersion" > 0 AND jsonb_typeof("quantityRule") = 'object'
    AND jsonb_typeof("assumptions") = 'array');
ALTER TABLE "ItemSupportingItem" ADD CONSTRAINT "ItemSupportingItem_rule_check"
  CHECK ("ruleSchemaVersion" > 0 AND jsonb_typeof("quantityRule") = 'object'
    AND (NOT "mandatory" OR "defaultSelected"));
ALTER TABLE "LabourRateVersion" ADD CONSTRAINT "LabourRateVersion_rate_check"
  CHECK ("versionNumber" > 0 AND "hourlyCost" >= 0 AND ("dailyCost" IS NULL OR "dailyCost" >= 0)
    AND "productiveHoursPerDay" > 0 AND "productiveHoursPerDay" <= 24 AND "defaultTeamSize" > 0 AND "currency" = 'GBP');
ALTER TABLE "ItemLabour" ADD CONSTRAINT "ItemLabour_quantity_check"
  CHECK ("hoursPerUnit" >= 0 AND "teamSize" > 0);
ALTER TABLE "SupplierPriceReference" ADD CONSTRAINT "SupplierPriceReference_price_check"
  CHECK ("referencePrice" >= 0 AND ("packQuantity" IS NULL OR "packQuantity" > 0) AND "currency" = 'GBP');
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_singleton_check" CHECK ("id" = 'company');
ALTER TABLE "CompanySettingsVersion" ADD CONSTRAINT "CompanySettingsVersion_values_check"
  CHECK ("versionNumber" > 0 AND "currency" = 'GBP' AND "estimatorFeeAmount" >= 0
    AND "defaultMarkupPercent" >= 0 AND "defaultWastePercent" BETWEEN 0 AND 100
    AND "contingencyPercent" BETWEEN 0 AND 100 AND "workdayHours" > 0 AND "workdayHours" <= 24
    AND "defaultTeamSize" > 0 AND "quoteValidityDays" > 0 AND "invoiceTermsDays" >= 0
    AND jsonb_typeof("workingCalendar") = 'object' AND length(trim("roundingPolicyVersion")) > 0
    AND (NOT "autoSendInvoices" OR "autoGenerateInvoices"));

-- All newly introduced records are retained. Mutable master data can be archived.
-- Versioned prices/settings and audit events cannot be overwritten, even by SQL.
CREATE FUNCTION "estimate_reject_history_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Estimating history in % is immutable; append a new version', TG_TABLE_NAME
    USING ERRCODE = '23514';
END;
$$;

CREATE FUNCTION "estimate_reject_removal"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Estimating records in % must be retained; archive instead', TG_TABLE_NAME
    USING ERRCODE = '23514';
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ItemCategory', 'ItemUnit', 'ConstructionItem', 'TaxCode', 'TaxRateVersion',
    'ItemPriceVersion', 'ItemOption', 'ItemOptionVersion', 'ItemRecipeVersion',
    'ItemSupportingItem', 'LabourRole', 'LabourRateVersion', 'ItemLabour',
    'Supplier', 'SupplierPriceReference', 'CompanySettings', 'CompanySettingsVersion', 'AuditEvent'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "estimate_reject_removal"()', table_name || '_retain_rows', table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "estimate_reject_removal"()', table_name || '_retain_table', table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY[
    'TaxRateVersion', 'ItemPriceVersion', 'ItemOptionVersion', 'LabourRateVersion',
    'SupplierPriceReference', 'CompanySettings', 'CompanySettingsVersion', 'AuditEvent'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION "estimate_reject_history_change"()', table_name || '_immutable', table_name);
  END LOOP;
END;
$$;

-- Serialize graph changes so concurrent writers cannot jointly create cycles.
-- Conservative rule: supporting-item graphs must be acyclic across ALL versions.
CREATE FUNCTION "estimate_validate_graphs"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(9252026, 1);
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ItemCategory_graph_lock" BEFORE INSERT OR UPDATE ON "ItemCategory"
  FOR EACH STATEMENT EXECUTE FUNCTION "estimate_validate_graphs"();
CREATE TRIGGER "ItemSupportingItem_graph_lock" BEFORE INSERT OR UPDATE ON "ItemSupportingItem"
  FOR EACH STATEMENT EXECUTE FUNCTION "estimate_validate_graphs"();
CREATE TRIGGER "ItemRecipeVersion_graph_lock" BEFORE INSERT OR UPDATE ON "ItemRecipeVersion"
  FOR EACH STATEMENT EXECUTE FUNCTION "estimate_validate_graphs"();

CREATE FUNCTION "estimate_check_category_cycle"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT NEW."parentId" WHERE NEW."parentId" IS NOT NULL
      UNION
      SELECT c."parentId" FROM "ItemCategory" c JOIN ancestors a ON c.id = a.id WHERE c."parentId" IS NOT NULL
    ) SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Category hierarchy must not contain cycles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ItemCategory_no_cycles" AFTER INSERT OR UPDATE ON "ItemCategory"
  FOR EACH ROW EXECUTE FUNCTION "estimate_check_category_cycle"();

CREATE FUNCTION "estimate_guard_recipe"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."publishedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Published recipes are immutable' USING ERRCODE = '23514';
    END IF;
    IF NEW.id <> OLD.id OR NEW."itemId" <> OLD."itemId" OR NEW.condition <> OLD.condition
      OR NEW."versionNumber" <> OLD."versionNumber" THEN
      RAISE EXCEPTION 'Recipe identity is immutable; create a new version' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ItemRecipeVersion_freeze" BEFORE UPDATE ON "ItemRecipeVersion"
  FOR EACH ROW EXECUTE FUNCTION "estimate_guard_recipe"();

CREATE FUNCTION "estimate_guard_recipe_child"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE recipe "ItemRecipeVersion"%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW."recipeVersionId" <> OLD."recipeVersionId" THEN
      RAISE EXCEPTION 'Recipe child identity cannot be moved' USING ERRCODE = '23514';
    END IF;
  END IF;
  -- Locks against simultaneous publication as well as another child editor.
  SELECT * INTO recipe FROM "ItemRecipeVersion" WHERE id = NEW."recipeVersionId" FOR UPDATE;
  IF recipe."publishedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Published recipe components are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ItemSupportingItem_freeze" BEFORE INSERT OR UPDATE ON "ItemSupportingItem"
  FOR EACH ROW EXECUTE FUNCTION "estimate_guard_recipe_child"();
CREATE TRIGGER "ItemLabour_freeze" BEFORE INSERT OR UPDATE ON "ItemLabour"
  FOR EACH ROW EXECUTE FUNCTION "estimate_guard_recipe_child"();

CREATE FUNCTION "estimate_check_supporting_cycle"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE main_item uuid;
BEGIN
  SELECT "itemId" INTO main_item FROM "ItemRecipeVersion" WHERE id = NEW."recipeVersionId";
  IF EXISTS (
    WITH RECURSIVE reachable(id) AS (
      SELECT NEW."supportingItemId"
      UNION
      SELECT si."supportingItemId" FROM reachable r
        JOIN "ItemRecipeVersion" rv ON rv."itemId" = r.id
        JOIN "ItemSupportingItem" si ON si."recipeVersionId" = rv.id
    ) SELECT 1 FROM reachable WHERE id = main_item
  ) THEN
    RAISE EXCEPTION 'Supporting items must not contain cycles' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ItemSupportingItem_no_cycles" AFTER INSERT OR UPDATE ON "ItemSupportingItem"
  FOR EACH ROW EXECUTE FUNCTION "estimate_check_supporting_cycle"();

COMMIT;
