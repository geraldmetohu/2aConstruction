-- Free extras: work we did on a project that was not on the quote and that we are not charging the client for
-- (goodwill, small favours, things we chose to absorb). Internal only – never shown to the client.
-- Additive only: one new table. Nothing existing is changed or removed.
CREATE TABLE IF NOT EXISTS "TakeoffJobExtra" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "doneOn" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "stage" TEXT NOT NULL DEFAULT '',
  "hours" NUMERIC(8,2) NOT NULL DEFAULT 0,
  "cost" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "value" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobExtra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobExtra_amounts_check" CHECK ("hours" >= 0 AND "cost" >= 0 AND "value" >= 0)
);
CREATE INDEX IF NOT EXISTS "TakeoffJobExtra_quoteId_idx" ON "TakeoffJobExtra"("quoteId", "doneOn");
DO $$ BEGIN
  ALTER TABLE "TakeoffJobExtra" ADD CONSTRAINT "TakeoffJobExtra_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
