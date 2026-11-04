BEGIN;
-- New project-conversion tables only; no references or changes to existing tables.
CREATE TABLE "AcceptedQuote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "acceptedBy" TEXT NOT NULL,
  "acceptedAt" TIMESTAMPTZ(6) NOT NULL,
  "evidence" TEXT NOT NULL,
  "approvedOptionalKeys" JSONB NOT NULL,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcceptedQuote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcceptedQuote_quoteId_key" ON "AcceptedQuote"("quoteId");
CREATE UNIQUE INDEX "AcceptedQuote_revisionId_key" ON "AcceptedQuote"("revisionId");
CREATE TABLE "DeliveryClient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ownerId" TEXT NOT NULL,
  "legacyClientId" UUID,
  "normalizedEmail" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryClient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryClient_ownerId_key" ON "DeliveryClient"("ownerId");
CREATE UNIQUE INDEX "DeliveryClient_legacyClientId_key" ON "DeliveryClient"("legacyClientId");
CREATE UNIQUE INDEX "DeliveryClient_normalizedEmail_key" ON "DeliveryClient"("normalizedEmail");
CREATE TABLE "DeliveryProject" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "acceptanceId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "quoteSnapshot" JSONB NOT NULL,
  "planHash" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryProject_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "AcceptedQuote"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "DeliveryProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "DeliveryClient"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DeliveryProject_acceptanceId_key" ON "DeliveryProject"("acceptanceId");
CREATE INDEX "DeliveryProject_clientId_createdAt_idx" ON "DeliveryProject"("clientId", "createdAt");
CREATE TABLE "DeliveryStage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "DeliveryStage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DeliveryProject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DeliveryStage_projectId_name_key" ON "DeliveryStage"("projectId", "name");
CREATE TABLE "DeliveryRoom" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "DeliveryRoom_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryRoom_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DeliveryProject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DeliveryRoom_projectId_name_key" ON "DeliveryRoom"("projectId", "name");
CREATE TABLE "DeliveryTask" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "quoteLineKey" TEXT NOT NULL,
  "stageName" TEXT NOT NULL,
  "roomName" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "DeliveryTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DeliveryProject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DeliveryTask_projectId_quoteLineKey_key" ON "DeliveryTask"("projectId", "quoteLineKey");
CREATE TABLE "DeliveryRequirement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "taskId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" TEXT,
  "unit" TEXT NOT NULL,
  "supplyBy" TEXT NOT NULL,
  "needsReview" BOOLEAN NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "DeliveryRequirement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DeliveryTask"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "DeliveryRequirement_kind_check" CHECK ("kind" IN ('MATERIAL', 'LABOUR'))
);
CREATE INDEX "DeliveryRequirement_taskId_kind_idx" ON "DeliveryRequirement"("taskId", "kind");
CREATE TABLE "DeliveryBaseline" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryBaseline_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryBaseline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DeliveryProject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DeliveryBaseline_projectId_key" ON "DeliveryBaseline"("projectId");
CREATE FUNCTION "delivery_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Accepted scope and project baselines are append-only' USING ERRCODE = '23514'; END;
$$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['AcceptedQuote','DeliveryClient','DeliveryProject','DeliveryStage','DeliveryRoom','DeliveryTask','DeliveryRequirement','DeliveryBaseline'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "delivery_reject_mutation"()', t || '_immutable', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "delivery_reject_mutation"()', t || '_retention', t);
  END LOOP;
END; $$;
COMMIT;
