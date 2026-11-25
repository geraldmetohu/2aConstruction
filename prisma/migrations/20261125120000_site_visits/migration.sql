-- Site visits: the form filled in before and during each visit (standard questions, walk-round, finishes, and
-- the measurements in the quote calculator's own fields), which can then be turned into a draft quote.
-- Additive only: one new table. Nothing existing is changed or removed.
CREATE TABLE IF NOT EXISTS "SiteVisit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "clientName" TEXT NOT NULL DEFAULT '',
  "clientEmail" TEXT NOT NULL DEFAULT '',
  "clientPhone" TEXT NOT NULL DEFAULT '',
  "siteAddress" TEXT NOT NULL DEFAULT '',
  "postcode" TEXT NOT NULL DEFAULT '',
  "visitAt" TIMESTAMPTZ(6),
  "projectTypes" TEXT[] NOT NULL DEFAULT '{}',
  "answers" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "takeoff" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "version" INTEGER NOT NULL DEFAULT 1,
  "quoteId" UUID,
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteVisit_reference_key" UNIQUE ("reference"),
  CONSTRAINT "SiteVisit_status_check" CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'DONE', 'QUOTED', 'CANCELLED')),
  CONSTRAINT "SiteVisit_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SiteVisit_visitAt_idx" ON "SiteVisit"("visitAt" DESC);
CREATE INDEX IF NOT EXISTS "SiteVisit_clientEmail_idx" ON "SiteVisit"(lower("clientEmail"));
