DO $$
BEGIN
  CREATE TYPE "ClientProjectStatus" AS ENUM ('review', 'sent', 'started', 'ongoing', 'finished');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Client" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "houseNumber" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "postcode" TEXT NOT NULL,
  "preferredContact" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "foundUs" TEXT,
  "startTimeframe" TEXT,
  "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
  "marketingAccepted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientProject" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL,
  "projectType" TEXT NOT NULL,
  "status" "ClientProjectStatus" NOT NULL DEFAULT 'review',
  "priceEstimated" TEXT,
  "finalPrice" TEXT,
  "formData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "Client"
    ADD CONSTRAINT "Client_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClientProject"
    ADD CONSTRAINT "ClientProject_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Client_email_idx" ON "Client"("email");
CREATE INDEX IF NOT EXISTS "ClientProject_clientId_idx" ON "ClientProject"("clientId");
CREATE INDEX IF NOT EXISTS "ClientProject_status_idx" ON "ClientProject"("status");
