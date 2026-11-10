-- Our own sign-in (replaces the Kinde hosted page): accounts, sessions, one-time email links and attempt log.
-- Additive only: new tables, no existing table or row is changed or removed.

CREATE TABLE IF NOT EXISTS "AuthAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "passwordHash" TEXT,
  "emailVerifiedAt" TIMESTAMPTZ(6),
  "role" TEXT NOT NULL DEFAULT 'CLIENT',
  "trade" TEXT,
  "userId" TEXT,
  "googleSub" TEXT,
  "avatarUrl" TEXT,
  "disabledAt" TIMESTAMPTZ(6),
  "passwordChangedAt" TIMESTAMPTZ(6),
  "lastLoginAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthAccount_role_check" CHECK ("role" IN ('ADMIN', 'STAFF', 'CLIENT', 'TRADE')),
  CONSTRAINT "AuthAccount_email_check" CHECK ("email" = lower("email") AND position('@' in "email") > 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthAccount_email_key" ON "AuthAccount"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AuthAccount_googleSub_key" ON "AuthAccount"("googleSub");

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,                       -- SHA-256 of the cookie token; the token itself is never stored
  "accountId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "revokedAt" TIMESTAMPTZ(6),
  "userAgent" TEXT NOT NULL DEFAULT '',
  "ip" TEXT NOT NULL DEFAULT '',
  "method" TEXT NOT NULL DEFAULT 'PASSWORD',
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuthSession_accountId_idx" ON "AuthSession"("accountId");

CREATE TABLE IF NOT EXISTS "AuthToken" (
  "id" TEXT NOT NULL,                       -- SHA-256 of the emailed token
  "accountId" UUID,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthToken_purpose_check" CHECK ("purpose" IN ('VERIFY', 'RESET', 'MAGIC', 'INVITE')),
  CONSTRAINT "AuthToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AuthToken_email_idx" ON "AuthToken"("email", "createdAt");

CREATE TABLE IF NOT EXISTS "AuthAttempt" (
  "id" BIGSERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthAttempt_key_at_idx" ON "AuthAttempt"("key", "at");
