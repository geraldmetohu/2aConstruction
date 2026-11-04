-- Additive only. No legacy table alterations, data updates, seeds or deletions.
BEGIN;
CREATE TABLE "PremiumRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ownerId" TEXT NOT NULL,
  "requestKey" UUID NOT NULL, "requirementsHash" TEXT NOT NULL,
  "requirements" JSONB NOT NULL, "pricingInput" JSONB NOT NULL,
  "catalogueSnapshot" JSONB NOT NULL, "feeSnapshot" JSONB NOT NULL,
  "mappingVersion" TEXT NOT NULL, "engineVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "PremiumRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PremiumRequest_valid_expiry" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "PremiumRequest_ownerId_requestKey_key" ON "PremiumRequest"("ownerId", "requestKey");
CREATE INDEX "PremiumRequest_ownerId_createdAt_idx" ON "PremiumRequest"("ownerId", "createdAt");
CREATE TABLE "PremiumCheckout" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "requestId" UUID NOT NULL,
  "sessionId" TEXT NOT NULL, "url" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PremiumCheckout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PremiumCheckout_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PremiumRequest"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "PremiumCheckout_requestId_key" ON "PremiumCheckout"("requestId");
CREATE UNIQUE INDEX "PremiumCheckout_sessionId_key" ON "PremiumCheckout"("sessionId");
CREATE TABLE "PremiumPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "checkoutId" UUID NOT NULL,
  "eventId" TEXT NOT NULL, "paymentIntentId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL, "currency" CHAR(3) NOT NULL,
  "paidAt" TIMESTAMPTZ(6) NOT NULL, "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PremiumPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PremiumPayment_fee" CHECK ("amountPence" = 5000 AND "currency" = 'gbp'),
  CONSTRAINT "PremiumPayment_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "PremiumCheckout"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "PremiumPayment_checkoutId_key" ON "PremiumPayment"("checkoutId");
CREATE UNIQUE INDEX "PremiumPayment_eventId_key" ON "PremiumPayment"("eventId");
CREATE UNIQUE INDEX "PremiumPayment_paymentIntentId_key" ON "PremiumPayment"("paymentIntentId");
CREATE TABLE "PremiumSubmission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "paymentId" UUID NOT NULL,
  "result" JSONB NOT NULL, "customerResult" JSONB NOT NULL,
  "snapshotHash" TEXT NOT NULL, "requiresReview" BOOLEAN NOT NULL,
  "reviewReasons" JSONB NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PremiumSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PremiumSubmission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PremiumPayment"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "PremiumSubmission_paymentId_key" ON "PremiumSubmission"("paymentId");
CREATE INDEX "PremiumSubmission_requiresReview_createdAt_idx" ON "PremiumSubmission"("requiresReview", "createdAt");
CREATE FUNCTION "premium_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Premium payment and estimate history is append-only' USING ERRCODE = '23514';
END;
$$;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['PremiumRequest','PremiumCheckout','PremiumPayment','PremiumSubmission'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "premium_reject_mutation"()', table_name || '_immutable', table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "premium_reject_mutation"()', table_name || '_no_truncate', table_name);
  END LOOP;
END;
$$;
COMMIT;
