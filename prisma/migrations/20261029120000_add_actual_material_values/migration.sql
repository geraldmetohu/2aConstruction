-- New independent history table only. No existing table or record is altered.
CREATE TABLE "actual_values" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "observationKey" TEXT NOT NULL UNIQUE,
  "itemId" UUID NOT NULL,
  "supplier" TEXT NOT NULL CHECK ("supplier" IN ('SELCO','BUILDER_DEPOT')),
  "sku" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL, "location" TEXT NOT NULL,
  "priceBasis" TEXT NOT NULL CHECK ("priceBasis" IN ('PUBLIC','ACCOUNT')),
  "packPrice" DECIMAL(19,4) NOT NULL CHECK ("packPrice" > 0),
  "packQuantity" DECIMAL(18,6) NOT NULL CHECK ("packQuantity" > 0),
  "unitCode" TEXT NOT NULL, "unitPrice" DECIMAL(19,6) NOT NULL CHECK ("unitPrice" > 0),
  "currency" TEXT NOT NULL DEFAULT 'GBP' CHECK ("currency" = 'GBP'),
  "taxInclusive" BOOLEAN NOT NULL, "minimumPacks" INTEGER NOT NULL CHECK ("minimumPacks" > 0),
  "observedAt" TIMESTAMPTZ(6) NOT NULL, "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "sourceReference" TEXT NOT NULL, "importedBy" TEXT NOT NULL
);
CREATE INDEX "actual_values_itemId_supplier_observedAt_idx" ON "actual_values"("itemId", "supplier", "observedAt");
CREATE FUNCTION "actual_values_retain_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Material price observations are immutable' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "actual_values_retain_rows" BEFORE UPDATE OR DELETE ON "actual_values" FOR EACH ROW EXECUTE FUNCTION "actual_values_retain_history"();
CREATE TRIGGER "actual_values_retain_table" BEFORE TRUNCATE ON "actual_values" FOR EACH STATEMENT EXECUTE FUNCTION "actual_values_retain_history"();
