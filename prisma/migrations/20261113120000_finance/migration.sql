-- Finance: company costs, repeating costs, subcontract prices per job, bank statements, cash book, VAT / CIS / year end.
-- Additive only: new tables, and new columns (with defaults) on TakeoffExpense and TakeoffWorker. Safe to run twice.

CREATE TABLE IF NOT EXISTS "FinanceSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedBy" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceSettings_one_row" CHECK ("id" = 1)
);

-- Every money movement that isn't already a job payment / job expense: company costs, subcontractor and worker
-- pay (with CIS), cash in and out, and anything categorised from a bank statement.
CREATE TABLE IF NOT EXISTS "FinanceEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL,
  "direction" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'BANK',
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "counterparty" TEXT NOT NULL DEFAULT '',
  "reference" TEXT NOT NULL DEFAULT '',
  "quoteId" UUID,
  "workerId" UUID,
  "jobCostId" UUID,
  "recurringId" UUID,
  "amount" NUMERIC(12,2) NOT NULL,
  "vat" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "vatTreatment" TEXT NOT NULL DEFAULT 'STANDARD',
  "cisLabour" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "cisMaterials" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "cisDeducted" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "days" NUMERIC(6,2),
  "receiptUrl" TEXT NOT NULL DEFAULT '',
  "void" BOOLEAN NOT NULL DEFAULT false,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceEntry_direction_check" CHECK ("direction" IN ('IN', 'OUT')),
  CONSTRAINT "FinanceEntry_method_check" CHECK ("method" IN ('BANK', 'CASH', 'CARD')),
  CONSTRAINT "FinanceEntry_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "FinanceEntry_cis_check" CHECK ("cisDeducted" >= 0 AND "cisDeducted" <= "amount")
);
CREATE INDEX IF NOT EXISTS "FinanceEntry_date_idx" ON "FinanceEntry"("date");
CREATE INDEX IF NOT EXISTS "FinanceEntry_quoteId_idx" ON "FinanceEntry"("quoteId");
CREATE INDEX IF NOT EXISTS "FinanceEntry_workerId_idx" ON "FinanceEntry"("workerId");
CREATE INDEX IF NOT EXISTS "FinanceEntry_jobCostId_idx" ON "FinanceEntry"("jobCostId");

-- Costs that repeat (insurance, Checkatrade, subscriptions…) or one-off planned costs.
CREATE TABLE IF NOT EXISTS "FinanceRecurring" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "supplier" TEXT NOT NULL DEFAULT '',
  "amount" NUMERIC(12,2) NOT NULL,
  "vat" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "vatTreatment" TEXT NOT NULL DEFAULT 'STANDARD',
  "frequency" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "method" TEXT NOT NULL DEFAULT 'BANK',
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceRecurring_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceRecurring_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "FinanceRecurring_frequency_check" CHECK ("frequency" IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_OFF'))
);

-- Prices agreed for parts of a job (a subcontractor's price, a supplier quote), paid by FinanceEntry rows.
CREATE TABLE IF NOT EXISTS "FinanceJobCost" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "workerId" UUID,
  "supplier" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'SUBCONTRACTOR',
  "amount" NUMERIC(12,2) NOT NULL,
  "labour" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "vatTreatment" TEXT NOT NULL DEFAULT 'OUTSIDE',
  "dueDate" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceJobCost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceJobCost_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "FinanceJobCost_status_check" CHECK ("status" IN ('OPEN', 'CANCELLED'))
);
CREATE INDEX IF NOT EXISTS "FinanceJobCost_quoteId_idx" ON "FinanceJobCost"("quoteId");

-- Uploaded bank statements (the file itself is not kept – only the lines read from it).
CREATE TABLE IF NOT EXISTS "FinanceBankStatement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fileName" TEXT NOT NULL DEFAULT '',
  "bank" TEXT NOT NULL DEFAULT '',
  "periodFrom" DATE,
  "periodTo" DATE,
  "openingBalance" NUMERIC(12,2),
  "closingBalance" NUMERIC(12,2),
  "lineCount" INTEGER NOT NULL DEFAULT 0,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceBankStatement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "FinanceBankLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "statementId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "amount" NUMERIC(12,2) NOT NULL,
  "balance" NUMERIC(12,2),
  "fingerprint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "entryId" UUID,
  "paymentId" UUID,
  "expenseId" UUID,
  "note" TEXT NOT NULL DEFAULT '',
  "doneBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceBankLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceBankLine_status_check" CHECK ("status" IN ('NEW', 'DONE', 'IGNORED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceBankLine_fingerprint_key" ON "FinanceBankLine"("fingerprint");
CREATE INDEX IF NOT EXISTS "FinanceBankLine_status_date_idx" ON "FinanceBankLine"("status", "date");
CREATE INDEX IF NOT EXISTS "FinanceBankLine_entryId_idx" ON "FinanceBankLine"("entryId");
DO $$ BEGIN
  ALTER TABLE "FinanceBankLine" ADD CONSTRAINT "FinanceBankLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "FinanceBankStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- "Remember this": a bank description pattern → category / job / worker.
CREATE TABLE IF NOT EXISTS "FinanceRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pattern" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quoteId" UUID,
  "workerId" UUID,
  "counterparty" TEXT NOT NULL DEFAULT '',
  "vatTreatment" TEXT NOT NULL DEFAULT 'STANDARD',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "FinanceRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceRule_pattern_direction_key" ON "FinanceRule"("pattern", "direction");

-- Existing job expenses: VAT and how they were paid (defaults keep today's behaviour).
ALTER TABLE "TakeoffExpense" ADD COLUMN IF NOT EXISTS "vat" NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "TakeoffExpense" ADD COLUMN IF NOT EXISTS "vatTreatment" TEXT NOT NULL DEFAULT 'OUTSIDE';
ALTER TABLE "TakeoffExpense" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'BANK';

-- Workers & subcontractors: CIS status and tax details.
ALTER TABLE "TakeoffWorker" ADD COLUMN IF NOT EXISTS "cisStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "TakeoffWorker" ADD COLUMN IF NOT EXISTS "utr" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TakeoffWorker" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TakeoffWorker" ADD COLUMN IF NOT EXISTS "verificationNumber" TEXT NOT NULL DEFAULT '';
