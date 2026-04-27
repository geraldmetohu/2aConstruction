DO $$
BEGIN
  CREATE TYPE "ClientPortalStage" AS ENUM (
    'introduction',
    'estimator_sent',
    'site_visit',
    'agreeing_scope',
    'start_booked',
    'in_progress',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ClientPhaseStatus" AS ENUM ('planned', 'active', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ClientProject"
  ADD COLUMN IF NOT EXISTS "dashboardTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "introTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "introMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "currentStage" "ClientPortalStage" NOT NULL DEFAULT 'introduction',
  ADD COLUMN IF NOT EXISTS "siteVisitDate" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "agreementDate" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "targetCompletionDate" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPortalVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "adminSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "clientNotes" TEXT;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "sourceClientProjectId" UUID;

CREATE TABLE IF NOT EXISTS "ClientProjectPhase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clientProjectId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ClientPhaseStatus" NOT NULL DEFAULT 'planned',
  "phaseOrder" INTEGER NOT NULL DEFAULT 0,
  "targetDays" INTEGER,
  "targetDate" TIMESTAMP(6),
  "jobs" JSONB NOT NULL,
  "notes" TEXT,
  "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProjectPhase_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "ClientProjectPhase"
    ADD CONSTRAINT "ClientProjectPhase_clientProjectId_fkey"
    FOREIGN KEY ("clientProjectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Project"
    ADD CONSTRAINT "Project_sourceClientProjectId_fkey"
    FOREIGN KEY ("sourceClientProjectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ClientProject_currentStage_idx" ON "ClientProject"("currentStage");
CREATE INDEX IF NOT EXISTS "ClientProject_plannedStartDate_idx" ON "ClientProject"("plannedStartDate");
CREATE INDEX IF NOT EXISTS "ClientProjectPhase_clientProjectId_idx" ON "ClientProjectPhase"("clientProjectId");
CREATE INDEX IF NOT EXISTS "Project_sourceClientProjectId_idx" ON "Project"("sourceClientProjectId");
