-- Client portal: the start date the client asks for when accepting, the project manager for each job,
-- stage invoices and the snagging list.
-- Additive only: new columns (with defaults) on "TakeoffJob" and two new tables. Nothing existing is changed or removed.
ALTER TABLE "TakeoffJob" ADD COLUMN IF NOT EXISTS "requestedStart" DATE;
ALTER TABLE "TakeoffJob" ADD COLUMN IF NOT EXISTS "managerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TakeoffJob" ADD COLUMN IF NOT EXISTS "managerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TakeoffJob" ADD COLUMN IF NOT EXISTS "managerEmail" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "TakeoffJobInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "scheduleNo" INTEGER NOT NULL,
  "number" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "issuedOn" DATE NOT NULL,
  "dueOn" DATE NOT NULL,
  "net" NUMERIC(12,2) NOT NULL,
  "vat" NUMERIC(12,2) NOT NULL,
  "gross" NUMERIC(12,2) NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "emailedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobInvoice_gross_check" CHECK ("gross" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "TakeoffJobInvoice_quoteId_scheduleNo_key" ON "TakeoffJobInvoice"("quoteId", "scheduleNo");
CREATE UNIQUE INDEX IF NOT EXISTS "TakeoffJobInvoice_number_key" ON "TakeoffJobInvoice"("number");
DO $$ BEGIN
  ALTER TABLE "TakeoffJobInvoice" ADD CONSTRAINT "TakeoffJobInvoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TakeoffJobSnag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "photoUrl" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "raisedByKind" TEXT NOT NULL,
  "raisedBy" TEXT NOT NULL,
  "doneByKind" TEXT,
  "doneBy" TEXT,
  "doneAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobSnag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobSnag_status_check" CHECK ("status" IN ('OPEN', 'DONE')),
  CONSTRAINT "TakeoffJobSnag_photo_check" CHECK ("photoUrl" = '' OR "photoUrl" ~ '^https://')
);
CREATE INDEX IF NOT EXISTS "TakeoffJobSnag_quoteId_createdAt_idx" ON "TakeoffJobSnag"("quoteId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "TakeoffJobSnag" ADD CONSTRAINT "TakeoffJobSnag_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
