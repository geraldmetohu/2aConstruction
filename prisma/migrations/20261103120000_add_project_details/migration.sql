-- Extra write-up fields for public portfolio projects.
-- Additive only: creates one new table. The existing "Project" table and its rows are not changed.
CREATE TABLE IF NOT EXISTS "ProjectDetail" (
  "projectId" UUID NOT NULL,
  "subtitle" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "propertyType" TEXT NOT NULL DEFAULT '',
  "completedOn" TEXT NOT NULL DEFAULT '',
  "duration" TEXT NOT NULL DEFAULT '',
  "floorArea" TEXT NOT NULL DEFAULT '',
  "valueBand" TEXT NOT NULL DEFAULT '',
  "showValue" BOOLEAN NOT NULL DEFAULT false,
  "brief" TEXT NOT NULL DEFAULT '',
  "approach" TEXT NOT NULL DEFAULT '',
  "outcome" TEXT NOT NULL DEFAULT '',
  "scope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "coverImage" TEXT NOT NULL DEFAULT '',
  "beforeImage" TEXT NOT NULL DEFAULT '',
  "afterImage" TEXT NOT NULL DEFAULT '',
  "captions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "testimonial" TEXT NOT NULL DEFAULT '',
  "testimonialName" TEXT NOT NULL DEFAULT '',
  "testimonialRating" INTEGER,
  "sourceQuoteId" UUID,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ProjectDetail_pkey" PRIMARY KEY ("projectId"),
  CONSTRAINT "ProjectDetail_rating_check" CHECK ("testimonialRating" IS NULL OR "testimonialRating" BETWEEN 1 AND 5)
);

-- If a project is ever deleted from the dashboard, its write-up goes with it.
-- Nothing in "Project" itself is altered by this constraint.
DO $$ BEGIN
  ALTER TABLE "ProjectDetail" ADD CONSTRAINT "ProjectDetail_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
