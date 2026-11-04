BEGIN;
-- Independent new tables only: no existing table, data or FK is changed.
CREATE TABLE "ProjectActivity" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "projectId" UUID NOT NULL,
 "sequence" INTEGER NOT NULL, "requestId" UUID NOT NULL, "entityId" UUID NOT NULL,
 "kind" TEXT NOT NULL, "body" JSONB NOT NULL, "requestHash" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ProjectActivity_sequence_check" CHECK ("sequence" > 0),
 CONSTRAINT "ProjectActivity_kind_check" CHECK ("kind" IN ('PROJECT','STAGE','ROOM','TASK','SCHEDULE','MATERIAL','WORKER','LABOUR','PHOTO','DOCUMENT','VARIATION','SNAG','INVOICE','PAYMENT','PAYMENT_REVERSAL','COST'))
);
CREATE UNIQUE INDEX "ProjectActivity_projectId_sequence_key" ON "ProjectActivity"("projectId", "sequence");
CREATE UNIQUE INDEX "ProjectActivity_projectId_requestId_key" ON "ProjectActivity"("projectId", "requestId");
CREATE INDEX "ProjectActivity_projectId_entityId_sequence_idx" ON "ProjectActivity"("projectId", "entityId", "sequence");
CREATE TABLE "ProjectAsset" (
 "id" UUID NOT NULL, "projectId" UUID NOT NULL, "kind" TEXT NOT NULL,
 "filename" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "byteLength" INTEGER NOT NULL,
 "content" BYTEA NOT NULL, "sha256" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProjectAsset_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ProjectAsset_kind_check" CHECK ("kind" IN ('PHOTO','DOCUMENT')),
 CONSTRAINT "ProjectAsset_length_check" CHECK ("byteLength" > 0 AND "byteLength" <= 12582912 AND octet_length("content") = "byteLength")
);
CREATE INDEX "ProjectAsset_projectId_createdAt_idx" ON "ProjectAsset"("projectId", "createdAt");
CREATE FUNCTION "project_activity_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Project history and files are append-only; record a correction' USING ERRCODE = '23514'; END;
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ProjectActivity','ProjectAsset'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "project_activity_reject_mutation"()', t || '_immutable', t);
  EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "project_activity_reject_mutation"()', t || '_retention', t);
 END LOOP;
END; $$;
COMMIT;
