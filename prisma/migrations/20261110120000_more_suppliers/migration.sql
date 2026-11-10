-- More merchants for supplier prices, and products found automatically.
-- Additive: no rows are changed or removed. The supplier check is widened (the old values stay allowed).

ALTER TABLE "TakeoffSupplierLink" DROP CONSTRAINT IF EXISTS "TakeoffSupplierLink_supplier_check";
ALTER TABLE "TakeoffSupplierLink" ADD CONSTRAINT "TakeoffSupplierLink_supplier_check" CHECK ("supplier" IN (
  'SELCO', 'BUILDER_DEPOT', 'TOOLSTATION', 'SCREWFIX', 'TRAVIS_PERKINS', 'WICKES', 'JEWSON', 'B_AND_Q', 'MKM', 'CITY_PLUMBING', 'CEF', 'TOPPS_TILES'));

CREATE TABLE IF NOT EXISTS "TakeoffSupplierSuggestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rateKey" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "packPrice" DECIMAL(19,4),
  "imageUrl" TEXT,
  "packGuess" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "packSure" BOOLEAN NOT NULL DEFAULT false,
  "score" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffSupplierSuggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffSupplierSuggestion_pack_check" CHECK ("packGuess" > 0)
);
CREATE INDEX IF NOT EXISTS "TakeoffSupplierSuggestion_rateKey_supplier_idx" ON "TakeoffSupplierSuggestion"("rateKey", "supplier", "createdAt");
