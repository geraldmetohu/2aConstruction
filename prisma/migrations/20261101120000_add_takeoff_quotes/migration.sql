-- Takeoff quotes, versions, client notices/choices, company rate sets and supplier prices.
-- New independent tables only. No existing table, column or record is altered or removed.

CREATE TABLE "TakeoffQuote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientEmail" TEXT NOT NULL,
  "siteAddress" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "publishedVersion" INTEGER,
  "sentAt" TIMESTAMPTZ(6),
  "acceptedAt" TIMESTAMPTZ(6),
  "acceptedName" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffQuote_status_check" CHECK ("status" IN ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED')),
  CONSTRAINT "TakeoffQuote_version_check" CHECK ("currentVersion" > 0)
);
CREATE UNIQUE INDEX "TakeoffQuote_reference_key" ON "TakeoffQuote"("reference");
CREATE INDEX "TakeoffQuote_clientEmail_idx" ON "TakeoffQuote"("clientEmail");
CREATE INDEX "TakeoffQuote_updatedAt_idx" ON "TakeoffQuote"("updatedAt");

CREATE TABLE "TakeoffQuoteVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "customer" JSONB NOT NULL,
  "rates" JSONB NOT NULL,
  "prices" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffQuoteVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TakeoffQuoteVersion_quoteId_version_key" ON "TakeoffQuoteVersion"("quoteId", "version");
ALTER TABLE "TakeoffQuoteVersion" ADD CONSTRAINT "TakeoffQuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffQuoteEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffQuoteEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffQuoteEvent_kind_check" CHECK ("kind" IN ('CREATED', 'SAVED', 'SENT', 'UPDATED_AFTER_SEND', 'CLIENT_VIEWED', 'CLIENT_CHOICE', 'ACCEPTED', 'DECLINED')),
  CONSTRAINT "TakeoffQuoteEvent_actorKind_check" CHECK ("actorKind" IN ('ADMIN', 'CLIENT'))
);
CREATE INDEX "TakeoffQuoteEvent_quoteId_createdAt_idx" ON "TakeoffQuoteEvent"("quoteId", "createdAt");
ALTER TABLE "TakeoffQuoteEvent" ADD CONSTRAINT "TakeoffQuoteEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Read receipts are separate so events themselves stay immutable.
CREATE TABLE "TakeoffQuoteSeen" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "viewer" TEXT NOT NULL,
  "seenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffQuoteSeen_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffQuoteSeen_viewer_check" CHECK ("viewer" IN ('ADMIN', 'CLIENT'))
);
CREATE INDEX "TakeoffQuoteSeen_quoteId_viewer_seenAt_idx" ON "TakeoffQuoteSeen"("quoteId", "viewer", "seenAt");
ALTER TABLE "TakeoffQuoteSeen" ADD CONSTRAINT "TakeoffQuoteSeen_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffRateSet" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "version" INTEGER NOT NULL,
  "overrides" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffRateSet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TakeoffRateSet_version_key" ON "TakeoffRateSet"("version");

CREATE TABLE "TakeoffSupplierLink" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rateKey" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "packQuantity" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffSupplierLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffSupplierLink_supplier_check" CHECK ("supplier" IN ('SELCO', 'BUILDER_DEPOT')),
  CONSTRAINT "TakeoffSupplierLink_pack_check" CHECK ("packQuantity" > 0)
);
CREATE UNIQUE INDEX "TakeoffSupplierLink_rateKey_supplier_key" ON "TakeoffSupplierLink"("rateKey", "supplier");

CREATE TABLE "TakeoffPriceObservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "linkId" UUID NOT NULL,
  "rateKey" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "packPrice" DECIMAL(19,4),
  "unitPriceExVat" DECIMAL(19,6),
  "error" TEXT,
  "imageUrl" TEXT,
  "observedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffPriceObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffPriceObservation_status_check" CHECK ("status" IN ('OK', 'FAILED')),
  CONSTRAINT "TakeoffPriceObservation_price_check" CHECK ("status" = 'FAILED' OR ("packPrice" > 0 AND "unitPriceExVat" > 0))
);
CREATE INDEX "TakeoffPriceObservation_rateKey_observedAt_idx" ON "TakeoffPriceObservation"("rateKey", "observedAt");
CREATE INDEX "TakeoffPriceObservation_linkId_observedAt_idx" ON "TakeoffPriceObservation"("linkId", "observedAt");
ALTER TABLE "TakeoffPriceObservation" ADD CONSTRAINT "TakeoffPriceObservation_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TakeoffSupplierLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- History tables are append-only: no UPDATE, DELETE or TRUNCATE.
CREATE FUNCTION "takeoff_retain_history"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Takeoff history records are immutable' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "TakeoffQuoteVersion_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffQuoteVersion" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffQuoteVersion_retain_table" BEFORE TRUNCATE ON "TakeoffQuoteVersion" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffQuoteEvent_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffQuoteEvent" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffQuoteEvent_retain_table" BEFORE TRUNCATE ON "TakeoffQuoteEvent" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffRateSet_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffRateSet" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffRateSet_retain_table" BEFORE TRUNCATE ON "TakeoffRateSet" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffPriceObservation_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffPriceObservation" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffPriceObservation_retain_table" BEFORE TRUNCATE ON "TakeoffPriceObservation" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
-- Quotes and supplier links can be updated (status, current version, active) but never deleted.
CREATE FUNCTION "takeoff_no_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Takeoff quotes and supplier links cannot be deleted' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "TakeoffQuote_no_delete" BEFORE DELETE ON "TakeoffQuote" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffQuote_no_truncate" BEFORE TRUNCATE ON "TakeoffQuote" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffSupplierLink_no_delete" BEFORE DELETE ON "TakeoffSupplierLink" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffSupplierLink_no_truncate" BEFORE TRUNCATE ON "TakeoffSupplierLink" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_no_delete"();
