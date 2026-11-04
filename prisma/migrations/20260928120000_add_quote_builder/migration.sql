BEGIN;
-- New tables only. Source submission identity is a snapshot reference, without
-- changing any pre-existing model or relation.
CREATE TABLE "DraftQuote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sourceSubmissionId" UUID NOT NULL,
  "ownerId" TEXT NOT NULL, "catalogueSnapshot" JSONB NOT NULL, "pricingAsOf" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DraftQuote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DraftQuote_sourceSubmissionId_key" ON "DraftQuote"("sourceSubmissionId");
CREATE INDEX "DraftQuote_ownerId_createdAt_idx" ON "DraftQuote"("ownerId", "createdAt");
CREATE TABLE "QuoteRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "quoteId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "document" JSONB NOT NULL, "result" JSONB NOT NULL, "customerResult" JSONB NOT NULL, "snapshotHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteRevision_version_positive" CHECK ("version" > 0),
  CONSTRAINT "QuoteRevision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "DraftQuote"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "QuoteRevision_quoteId_version_key" ON "QuoteRevision"("quoteId", "version");
CREATE TABLE "QuoteRelease" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "revisionId" UUID NOT NULL,
  "reviewedBy" TEXT NOT NULL, "reviewNote" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteRelease_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteRelease_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "QuoteRevision"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "QuoteRelease_revisionId_key" ON "QuoteRelease"("revisionId");
CREATE FUNCTION "quote_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Quote history is append-only; create a new revision' USING ERRCODE = '23514'; END;
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['DraftQuote','QuoteRevision','QuoteRelease'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "quote_reject_mutation"()', t || '_immutable', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "quote_reject_mutation"()', t || '_retention', t);
  END LOOP;
END; $$;
COMMIT;
