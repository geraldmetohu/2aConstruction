-- Jobs (accepted takeoff quotes): progress, client panel, photos, payments, expenses, workers,
-- subcontractors, check-ins and orders. New independent tables only: no existing table, column or
-- record is altered or removed. Needs 20261101120000_add_takeoff_quotes first.

CREATE TABLE "TakeoffJob" (
  "quoteId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "startDate" DATE,
  "completedAt" TIMESTAMPTZ(6),
  "clientContacts" JSONB NOT NULL DEFAULT '[]',
  "accessNotes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJob_pkey" PRIMARY KEY ("quoteId"),
  CONSTRAINT "TakeoffJob_status_check" CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'))
);
ALTER TABLE "TakeoffJob" ADD CONSTRAINT "TakeoffJob_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffJobStage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "percent" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL DEFAULT '',
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobStage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobStage_status_check" CHECK ("status" IN ('NOT_STARTED', 'IN_PROGRESS', 'DONE')),
  CONSTRAINT "TakeoffJobStage_percent_check" CHECK ("percent" BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX "TakeoffJobStage_quoteId_stage_key" ON "TakeoffJobStage"("quoteId", "stage");
ALTER TABLE "TakeoffJobStage" ADD CONSTRAINT "TakeoffJobStage_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Activity feed and messages for both sides (append-only).
CREATE TABLE "TakeoffJobEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobEvent_actorKind_check" CHECK ("actorKind" IN ('ADMIN', 'CLIENT', 'WORKER', 'SYSTEM'))
);
CREATE INDEX "TakeoffJobEvent_quoteId_createdAt_idx" ON "TakeoffJobEvent"("quoteId", "createdAt");
ALTER TABLE "TakeoffJobEvent" ADD CONSTRAINT "TakeoffJobEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffJobPhoto" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "stage" TEXT NOT NULL DEFAULT '',
  "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
  "favourite" BOOLEAN NOT NULL DEFAULT false,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobPhoto_url_check" CHECK ("url" ~ '^https://')
);
CREATE INDEX "TakeoffJobPhoto_quoteId_createdAt_idx" ON "TakeoffJobPhoto"("quoteId", "createdAt");
CREATE INDEX "TakeoffJobPhoto_favourite_idx" ON "TakeoffJobPhoto"("favourite");
ALTER TABLE "TakeoffJobPhoto" ADD CONSTRAINT "TakeoffJobPhoto_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Things the client has to answer or do.
CREATE TABLE "TakeoffJobAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "dueDate" DATE,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "response" TEXT NOT NULL DEFAULT '',
  "respondedAt" TIMESTAMPTZ(6),
  "respondedBy" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobAction_kind_check" CHECK ("kind" IN ('QUESTION', 'DECISION', 'ORDER', 'DOCUMENT', 'ACCESS', 'OTHER')),
  CONSTRAINT "TakeoffJobAction_status_check" CHECK ("status" IN ('OPEN', 'ANSWERED', 'DONE', 'CANCELLED'))
);
CREATE INDEX "TakeoffJobAction_quoteId_status_idx" ON "TakeoffJobAction"("quoteId", "status");
ALTER TABLE "TakeoffJobAction" ADD CONSTRAINT "TakeoffJobAction_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Items the client supplies: ordered / delivered.
CREATE TABLE "TakeoffJobSupply" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "itemKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TO_ORDER',
  "note" TEXT NOT NULL DEFAULT '',
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobSupply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobSupply_status_check" CHECK ("status" IN ('TO_ORDER', 'ORDERED', 'DELIVERED'))
);
CREATE UNIQUE INDEX "TakeoffJobSupply_quoteId_itemKey_key" ON "TakeoffJobSupply"("quoteId", "itemKey");
ALTER TABLE "TakeoffJobSupply" ADD CONSTRAINT "TakeoffJobSupply_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Our material orders per programme stage.
CREATE TABLE "TakeoffJobOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ORDERED',
  "supplier" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobOrder_status_check" CHECK ("status" IN ('ORDERED', 'DELIVERED'))
);
CREATE UNIQUE INDEX "TakeoffJobOrder_quoteId_stage_key" ON "TakeoffJobOrder"("quoteId", "stage");
ALTER TABLE "TakeoffJobOrder" ADD CONSTRAINT "TakeoffJobOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money in from clients (reported by the client or recorded by us, then confirmed).
CREATE TABLE "TakeoffJobPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "scheduleNo" INTEGER,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  "reference" TEXT NOT NULL DEFAULT '',
  "paidOn" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REPORTED',
  "note" TEXT NOT NULL DEFAULT '',
  "recordedBy" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "confirmedBy" TEXT,
  "confirmedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobPayment_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "TakeoffJobPayment_status_check" CHECK ("status" IN ('REPORTED', 'CONFIRMED', 'REJECTED')),
  CONSTRAINT "TakeoffJobPayment_actorKind_check" CHECK ("actorKind" IN ('ADMIN', 'CLIENT'))
);
CREATE INDEX "TakeoffJobPayment_quoteId_idx" ON "TakeoffJobPayment"("quoteId");
CREATE INDEX "TakeoffJobPayment_paidOn_idx" ON "TakeoffJobPayment"("paidOn");
ALTER TABLE "TakeoffJobPayment" ADD CONSTRAINT "TakeoffJobPayment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffWorker" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "trade" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "payBasis" TEXT NOT NULL DEFAULT 'DAY',
  "dayRate" DECIMAL(12,2),
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tokenHash" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffWorker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffWorker_kind_check" CHECK ("kind" IN ('EMPLOYEE', 'SUBCONTRACTOR')),
  CONSTRAINT "TakeoffWorker_payBasis_check" CHECK ("payBasis" IN ('DAY', 'JOB'))
);
CREATE UNIQUE INDEX "TakeoffWorker_tokenHash_key" ON "TakeoffWorker"("tokenHash");

CREATE TABLE "TakeoffWorkerRating" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workerId" UUID NOT NULL,
  "quoteId" UUID,
  "score" INTEGER NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "ratedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffWorkerRating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffWorkerRating_score_check" CHECK ("score" BETWEEN 1 AND 10)
);
CREATE INDEX "TakeoffWorkerRating_workerId_idx" ON "TakeoffWorkerRating"("workerId");
ALTER TABLE "TakeoffWorkerRating" ADD CONSTRAINT "TakeoffWorkerRating_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "TakeoffWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TakeoffWorkerRating" ADD CONSTRAINT "TakeoffWorkerRating_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffJobAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "workerId" UUID NOT NULL,
  "trade" TEXT NOT NULL DEFAULT '',
  "payBasis" TEXT NOT NULL DEFAULT 'DAY',
  "dayRate" DECIMAL(12,2),
  "agreedPrice" DECIMAL(12,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffJobAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffJobAssignment_payBasis_check" CHECK ("payBasis" IN ('DAY', 'JOB'))
);
CREATE UNIQUE INDEX "TakeoffJobAssignment_quoteId_workerId_key" ON "TakeoffJobAssignment"("quoteId", "workerId");
ALTER TABLE "TakeoffJobAssignment" ADD CONSTRAINT "TakeoffJobAssignment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TakeoffJobAssignment" ADD CONSTRAINT "TakeoffJobAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "TakeoffWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakeoffCheckIn" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workerId" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "note" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'WORKER',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffCheckIn_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffCheckIn_kind_check" CHECK ("kind" IN ('IN', 'OUT')),
  CONSTRAINT "TakeoffCheckIn_source_check" CHECK ("source" IN ('WORKER', 'ADMIN'))
);
CREATE INDEX "TakeoffCheckIn_quoteId_at_idx" ON "TakeoffCheckIn"("quoteId", "at");
CREATE INDEX "TakeoffCheckIn_workerId_at_idx" ON "TakeoffCheckIn"("workerId", "at");
ALTER TABLE "TakeoffCheckIn" ADD CONSTRAINT "TakeoffCheckIn_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "TakeoffWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TakeoffCheckIn" ADD CONSTRAINT "TakeoffCheckIn_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money out: materials, plant, skips, labour and subcontractor payments (per job or overheads).
CREATE TABLE "TakeoffExpense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID,
  "workerId" UUID,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "supplier" TEXT NOT NULL DEFAULT '',
  "amount" DECIMAL(12,2) NOT NULL,
  "spentOn" DATE NOT NULL,
  "void" BOOLEAN NOT NULL DEFAULT false,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "TakeoffExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TakeoffExpense_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "TakeoffExpense_category_check" CHECK ("category" IN ('MATERIALS', 'PLANT', 'SKIPS', 'LABOUR', 'SUBCONTRACTOR', 'FEES', 'OVERHEAD', 'OTHER'))
);
CREATE INDEX "TakeoffExpense_quoteId_idx" ON "TakeoffExpense"("quoteId");
CREATE INDEX "TakeoffExpense_workerId_idx" ON "TakeoffExpense"("workerId");
CREATE INDEX "TakeoffExpense_spentOn_idx" ON "TakeoffExpense"("spentOn");
ALTER TABLE "TakeoffExpense" ADD CONSTRAINT "TakeoffExpense_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TakeoffQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TakeoffExpense" ADD CONSTRAINT "TakeoffExpense_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "TakeoffWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- History is append-only; records are never deleted (photos are hidden, expenses voided, workers made inactive).
CREATE TRIGGER "TakeoffJobEvent_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffJobEvent" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffJobEvent_retain_table" BEFORE TRUNCATE ON "TakeoffJobEvent" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffWorkerRating_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffWorkerRating" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffWorkerRating_retain_table" BEFORE TRUNCATE ON "TakeoffWorkerRating" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffCheckIn_retain_rows" BEFORE UPDATE OR DELETE ON "TakeoffCheckIn" FOR EACH ROW EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffCheckIn_retain_table" BEFORE TRUNCATE ON "TakeoffCheckIn" FOR EACH STATEMENT EXECUTE FUNCTION "takeoff_retain_history"();
CREATE TRIGGER "TakeoffJob_no_delete" BEFORE DELETE ON "TakeoffJob" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobStage_no_delete" BEFORE DELETE ON "TakeoffJobStage" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobPhoto_no_delete" BEFORE DELETE ON "TakeoffJobPhoto" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobAction_no_delete" BEFORE DELETE ON "TakeoffJobAction" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobSupply_no_delete" BEFORE DELETE ON "TakeoffJobSupply" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobOrder_no_delete" BEFORE DELETE ON "TakeoffJobOrder" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobPayment_no_delete" BEFORE DELETE ON "TakeoffJobPayment" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffWorker_no_delete" BEFORE DELETE ON "TakeoffWorker" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffJobAssignment_no_delete" BEFORE DELETE ON "TakeoffJobAssignment" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
CREATE TRIGGER "TakeoffExpense_no_delete" BEFORE DELETE ON "TakeoffExpense" FOR EACH ROW EXECUTE FUNCTION "takeoff_no_delete"();
