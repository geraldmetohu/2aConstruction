BEGIN;
-- New portal tables only. Source identities are validated in application transactions.
CREATE TABLE "CustomerPublication" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "projectId" UUID NOT NULL,
 "version" INTEGER NOT NULL, "requestId" UUID NOT NULL, "requestHash" TEXT NOT NULL,
 "status" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "publishedBy" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CustomerPublication_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CustomerPublication_version_check" CHECK ("version" > 0),
 CONSTRAINT "CustomerPublication_status_check" CHECK ("status" IN ('SHARED','WITHDRAWN'))
);
CREATE UNIQUE INDEX "CustomerPublication_projectId_version_key" ON "CustomerPublication"("projectId","version");
CREATE UNIQUE INDEX "CustomerPublication_projectId_requestId_key" ON "CustomerPublication"("projectId","requestId");
CREATE TABLE "CustomerMessage" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "projectId" UUID NOT NULL,
 "requestId" UUID NOT NULL, "authorId" TEXT NOT NULL, "authorKind" TEXT NOT NULL,
 "text" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CustomerMessage_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CustomerMessage_kind_check" CHECK ("authorKind" IN ('CUSTOMER','ADMIN'))
);
CREATE UNIQUE INDEX "CustomerMessage_authorId_requestId_key" ON "CustomerMessage"("authorId","requestId");
CREATE INDEX "CustomerMessage_projectId_createdAt_idx" ON "CustomerMessage"("projectId","createdAt");
CREATE TABLE "CustomerDecision" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "projectId" UUID NOT NULL,
 "publicationId" UUID NOT NULL, "variationId" UUID NOT NULL, "sourceHash" TEXT NOT NULL,
 "decision" TEXT NOT NULL, "actorId" TEXT NOT NULL, "requestId" UUID NOT NULL,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CustomerDecision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CustomerDecision_decision_check" CHECK ("decision" IN ('APPROVE','DECLINE'))
);
CREATE UNIQUE INDEX "CustomerDecision_projectId_variationId_sourceHash_key" ON "CustomerDecision"("projectId","variationId","sourceHash");
CREATE UNIQUE INDEX "CustomerDecision_actorId_requestId_key" ON "CustomerDecision"("actorId","requestId");
CREATE FUNCTION "customer_portal_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Portal history is append-only' USING ERRCODE = '23514'; END;
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['CustomerPublication','CustomerMessage','CustomerDecision'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "customer_portal_reject_mutation"()', t || '_immutable', t);
  EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "customer_portal_reject_mutation"()', t || '_retention', t);
 END LOOP;
END; $$;
COMMIT;
