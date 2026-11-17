-- Who signs each quote's documents (one of the signatories set on the Company page).
-- Additive only: one new table, one row per quote. Nothing existing is changed or removed.
CREATE TABLE IF NOT EXISTS "TakeoffQuoteSigner" (
  "quoteId" UUID NOT NULL,
  "signatoryId" TEXT NOT NULL DEFAULT '',
  "setBy" TEXT NOT NULL,
  "setAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffQuoteSigner_pkey" PRIMARY KEY ("quoteId")
);
DO $$ BEGIN
  ALTER TABLE "TakeoffQuoteSigner" ADD CONSTRAINT "TakeoffQuoteSigner_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
