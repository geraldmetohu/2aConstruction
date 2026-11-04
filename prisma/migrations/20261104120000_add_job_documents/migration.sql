-- Uploaded documents for each job (plans, drawings, signed contracts, certificates, warranties...).
-- Additive only: one new table. Nothing existing is changed or removed.
CREATE TABLE IF NOT EXISTS "TakeoffJobDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT '',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL DEFAULT '',
  "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobDocument_url_check" CHECK ("url" ~ '^https://'),
  CONSTRAINT "TakeoffJobDocument_category_check" CHECK ("category" IN ('PLANS', 'STRUCTURAL', 'PLANNING', 'BUILDING_CONTROL', 'CONTRACT', 'HEALTH_SAFETY', 'CERTIFICATE', 'WARRANTY', 'INVOICE', 'SURVEY', 'PARTY_WALL', 'OTHER'))
);
CREATE INDEX IF NOT EXISTS "TakeoffJobDocument_quoteId_createdAt_idx" ON "TakeoffJobDocument"("quoteId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "TakeoffJobDocument" ADD CONSTRAINT "TakeoffJobDocument_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
