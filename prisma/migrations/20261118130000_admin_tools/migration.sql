-- Admin tools: error log, signatures on acceptance, client reviews, marketing emails and small settings.
-- Additive only: new tables. Nothing existing is changed or removed.

-- Errors from the website (server and browser), grouped by signature so the office gets one email per problem.
CREATE TABLE IF NOT EXISTS "AppErrorLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "signature" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT NOT NULL DEFAULT '',
  "path" TEXT NOT NULL DEFAULT '',
  "method" TEXT NOT NULL DEFAULT '',
  "digest" TEXT NOT NULL DEFAULT '',
  "count" INTEGER NOT NULL DEFAULT 1,
  "firstAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "lastAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "emailedAt" TIMESTAMPTZ(6),
  "resolvedAt" TIMESTAMPTZ(6),
  CONSTRAINT "AppErrorLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppErrorLog_signature_key" UNIQUE ("signature")
);
CREATE INDEX IF NOT EXISTS "AppErrorLog_lastAt_idx" ON "AppErrorLog"("lastAt" DESC);

-- Small key/value settings (calendar link token, marketing segment id …).
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Materials for each job, item by item: every material on the accepted quote (confirmed bought / delivered /
-- not needed) plus extras the team adds that weren't on the quote.
CREATE TABLE IF NOT EXISTS "TakeoffJobMaterial" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "itemKey" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "quantity" NUMERIC(12,3) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'NEEDED',
  "supplier" TEXT NOT NULL DEFAULT '',
  "cost" NUMERIC(12,2),
  "note" TEXT NOT NULL DEFAULT '',
  "extra" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobMaterial_item_key" UNIQUE ("quoteId", "itemKey"),
  CONSTRAINT "TakeoffJobMaterial_status_check" CHECK ("status" IN ('NEEDED', 'ORDERED', 'DELIVERED', 'NOT_NEEDED')),
  CONSTRAINT "TakeoffJobMaterial_amounts_check" CHECK ("quantity" >= 0 AND ("cost" IS NULL OR "cost" >= 0))
);
DO $$ BEGIN
  ALTER TABLE "TakeoffJobMaterial" ADD CONSTRAINT "TakeoffJobMaterial_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Client reviews: written in the client portal after handover; shown on the website only once approved.
CREATE TABLE IF NOT EXISTS "TakeoffReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT '',
  "allowPublish" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reply" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "approvedAt" TIMESTAMPTZ(6),
  "approvedBy" TEXT,
  CONSTRAINT "TakeoffReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffReview_quote_key" UNIQUE ("quoteId"),
  CONSTRAINT "TakeoffReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "TakeoffReview_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'HIDDEN'))
);
CREATE INDEX IF NOT EXISTS "TakeoffReview_published_idx" ON "TakeoffReview"("status", "approvedAt" DESC);
DO $$ BEGIN
  ALTER TABLE "TakeoffReview" ADD CONSTRAINT "TakeoffReview_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- When each completed project's client was asked for a review (so they're asked once).
CREATE TABLE IF NOT EXISTS "TakeoffReviewRequest" (
  "quoteId" UUID NOT NULL,
  "sentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffReviewRequest_pkey" PRIMARY KEY ("quoteId")
);
DO $$ BEGIN
  ALTER TABLE "TakeoffReviewRequest" ADD CONSTRAINT "TakeoffReviewRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The client's drawn signature when they accept a quote online, with when, from where and on what device.
CREATE TABLE IF NOT EXISTS "TakeoffAcceptanceSignature" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "signedName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "ip" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "signedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffAcceptanceSignature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffAcceptanceSignature_image_check" CHECK ("image" LIKE 'data:image/png;base64,%' AND length("image") < 400000)
);
CREATE INDEX IF NOT EXISTS "TakeoffAcceptanceSignature_quote_idx" ON "TakeoffAcceptanceSignature"("quoteId", "signedAt" DESC);
DO $$ BEGIN
  ALTER TABLE "TakeoffAcceptanceSignature" ADD CONSTRAINT "TakeoffAcceptanceSignature_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Marketing emails.
-- Who said yes to news and offers (and when, where, the words they agreed to) – marketing consent is separate
-- from accepting the terms. "unsubscribedAt" is set when they unsubscribe (also synced from Resend).
CREATE TABLE IF NOT EXISTS "MarketingConsent" (
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL,
  "wording" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "consentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "unsubscribedAt" TIMESTAMPTZ(6),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "MarketingConsent_pkey" PRIMARY KEY ("email")
);
-- Email templates written in the dashboard (the ready-made ones live in the code).
CREATE TABLE IF NOT EXISTS "MarketingTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "MarketingTemplate_pkey" PRIMARY KEY ("id")
);
-- Every marketing email sent: what it said and exactly who it went to.
CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "html" TEXT NOT NULL,
  "recipients" INTEGER NOT NULL DEFAULT 0,
  "broadcastId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "error" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "sentAt" TIMESTAMPTZ(6),
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketingCampaign_status_check" CHECK ("status" IN ('DRAFT', 'SENDING', 'SENT', 'FAILED'))
);
CREATE TABLE IF NOT EXISTS "MarketingCampaignRecipient" (
  "campaignId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "basis" TEXT NOT NULL,
  CONSTRAINT "MarketingCampaignRecipient_pkey" PRIMARY KEY ("campaignId", "email")
);
DO $$ BEGIN
  ALTER TABLE "MarketingCampaignRecipient" ADD CONSTRAINT "MarketingCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
