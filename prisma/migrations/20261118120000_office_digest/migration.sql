-- Office digest: what clients do in their portal (messages, answers, payments reported, snags, supplies) is queued
-- here and emailed to the office once an hour as one list, instead of one email per change.
-- Additive only: one new table. Nothing existing is changed or removed.
CREATE TABLE IF NOT EXISTS "TakeoffOfficeNotice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "link" TEXT NOT NULL DEFAULT '',
  "replyTo" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "sentAt" TIMESTAMPTZ(6),
  "batch" UUID,
  CONSTRAINT "TakeoffOfficeNotice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TakeoffOfficeNotice_unsent_idx" ON "TakeoffOfficeNotice"("createdAt") WHERE "sentAt" IS NULL;
DO $$ BEGIN
  ALTER TABLE "TakeoffOfficeNotice" ADD CONSTRAINT "TakeoffOfficeNotice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
