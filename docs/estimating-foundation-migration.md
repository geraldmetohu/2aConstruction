# Estimating foundation migration

Prepared 25 September 2026. **Created and tested locally; not deployed.**

The user's latest instruction is stricter than the original proposal: existing tables and data must stay unchanged. This batch therefore has no legacy-table additions, modifications, foreign keys, backfills, seeds or deletion operations. Every original Prisma model/enum remains unchanged. Previous migration files are unchanged.

## Included

Migration: `prisma/migrations/20260925120000_add_estimating_foundation/migration.sql`.

18 new, initially empty tables:

- Catalogue: `ItemCategory`, `ItemUnit`, `ConstructionItem`.
- Prices/tax: `ItemPriceVersion`, `TaxCode`, `TaxRateVersion`.
- Options/recipes: `ItemOption`, `ItemOptionVersion`, `ItemRecipeVersion`, `ItemSupportingItem`.
- Labour: `LabourRole`, `LabourRateVersion`, `ItemLabour`.
- Suppliers: `Supplier`, `SupplierPriceReference`.
- Configuration/history: `CompanySettings`, `CompanySettingsVersion`, `AuditEvent`.

New enums, indexes, foreign keys, CHECK constraints and trigger functions apply only to these new tables. There are no database dependencies on legacy `User`, `Client`, `Project` or other existing tables, so unresolved legacy TEXT/UUID differences cannot cause implicit type changes here.

This is the first foundation batch, not the full proposed application schema. Premium orders, quotes, projects, media, invoices and payments are later batches. No UI, server action or estimator behaviour has changed.

## Implemented data rules

- Decimal rates and quantities; GBP only in this first batch; positive quantity/unit factors and bounded tax/waste/contingency percentages. Markup can exceed 100%.
- Labour price NULL means derive from the recipe. Zero means an explicit zero-cost override.
- Effective dates and version numbers are unique per applicable item/role/option/settings scope.
- Price, tax, labour-rate, supplier-reference, option-version, settings-version and audit rows cannot be updated or removed through normal SQL operations.
- All new tables reject DELETE and TRUNCATE. Archiveable master records retain their IDs and references.
- Recipe drafts allow edits. Publication freezes the parent and all supporting-item/labour children, including new child insertions and moving children between recipes. A new recipe version supplies subsequent changes.
- Category and supporting-item cycles are rejected. Supporting-item cycle checks are conservative across all recipe versions, including drafts. Graph writes use a shared transaction advisory lock; actual multi-connection concurrency must additionally be validated on the target PostgreSQL deployment before catalogue writes are enabled.
- New foreign keys use RESTRICT, never CASCADE. Legacy delete behaviours are not modified by this migration.
- A settings version defaults the proposed fee amount to £50 but leaves its VAT-inclusive/exclusive flag undecided. No settings or rate rows are seeded. Payment must remain disabled until explicitly configured and validated in its later implementation.
- Migration DDL is wrapped in BEGIN/COMMIT. A conflicting existing table/type name fails instead of silently adopting or replacing that object.

Triggers are integrity protection for normal application writes, not a defence against a database owner intentionally disabling triggers or dropping tables. Production runtime credentials should not own schema DDL privileges.

## Refinements from the design proposal

- Archive fields on existing tables, existing cascade changes and identity/phase code fixes are deferred to respect the explicit unchanged-table/data requirement.
- No FK from audit actors or suppliers to legacy users/contacts in this batch. `actorUserId` is an optional stable audit snapshot; future audit writers must derive it from the authenticated session, never trust a caller's supplied actor.
- Recipe versions have an explicit draft/publication boundary so children can be assembled transactionally, then frozen together. Calculators must use published recipes only.
- No `supersedesId` is needed for price versions: item/version/effective-date history supplies ordering. Effective end is derived from the next effective version.
- Company settings are selected by latest applicable effective date/version; there is no mutable current-version pointer to go out of sync.
- Mutable catalogue rows have revision fields for the future service's optimistic concurrency checks. The revision check and audit insertion must be implemented in the same transaction by that service; this migration alone does not supply an audited write API.
- JSON rules have version/object-shape guards here. The later pricing engine must validate the full allowed rule grammar, dimensions, option ownership, rate basis and archive eligibility. Arbitrary expression execution is never allowed.

## Verification performed

Run `npm run test:estimating-migration`.

The tests use an ephemeral in-memory PGlite PostgreSQL instance. They do not import application code, load `.env`, use `DATABASE_URL`, connect to a server, send email or write customer data. Synthetic legacy fixtures are explicitly test-only.

The suite:

1. Replays the existing migration files into that isolated database.
2. Inserts synthetic records into all nine original tables, including old TEXT IDs, JSON submissions, price strings, photos and relational links.
3. Captures exact rows, column definitions, indexes and constraints.
4. Applies the new migration and compares the legacy snapshots exactly; checks new tables are empty.
5. Exercises decimal precision, invalid values, foreign keys, duplicate versions, archive operations, history immutability, graph cycles, recipe publication, settings and audit retention.
6. Verifies a mid-migration table-name collision rolls back preceding DDL and preserves the pre-existing colliding table and data.
7. Verifies the normalized original Prisma schema prefix against its pre-change SHA-256 fingerprint.

Results: **12 tests passed**. Prisma schema validation and client generation passed using a dummy local connection URL; neither command connects to the application database. `git diff --check` passed.

The application-wide TypeScript check (`node node_modules/typescript/bin/tsc --noEmit --incremental false`) still fails in unchanged files: Next page exports/async params, UploadThing types, portal action signatures, missing variables in `EditForm`, nullable portfolio fields, and Prisma config typing. These pre-existing issues are outside this migration-only batch. A production application build has not been claimed as passing.

## Production prerequisites (not executed)

1. Confirm the intended target database without logging secrets. Inspect applied migration history and actual legacy schema read-only; capture backup/restore verification and a legacy-data inventory under a coordinated write window.
2. Verify none of the 18 new names, new enum names or `estimate_*` function names already exist. Any collision needs review, not deletion or automatic replacement.
3. Verify every older migration is already applied as intended. `prisma migrate deploy` applies ALL pending migrations, including old ones; this repository contains historical SQL that alters old tables. Do not invoke it blindly under the user's unchanged-table requirement.
4. Test against an isolated restored production database and its PostgreSQL version/permissions. The synthetic PGlite test establishes SQL behaviour, not the actual deployed migration baseline or multi-session locking behaviour.
5. Review only this additive migration for deployment after those checks. Existing migration history must not be rewritten or reset to force alignment.
6. Compare pre/post legacy snapshots, migration status and backups. The only expected new persisted objects/data at this stage are new empty schema objects and the migration runner's own migration-history entry.

Do not run `migrate reset`, `db push`, destructive seeds, legacy data normalization or automatic duplicate merging. No production backup or read-only inspection was performed during this implementation, because this task stage creates migrations only.

## Rollback

Failure before COMMIT leaves no partial foundation schema; the tests verify this. After successful deployment, disable the new feature/application path and keep the additive tables. There is deliberately no down migration that drops tables or deletes versions. Any later failure should use a reviewed forward repair. Restoring a backup is a separate recovery operation requiring reconciliation of writes made since that backup, not a routine rollback.

Next implementation stage: an authenticated admin item manager using these models, after the separate deployment prerequisites are satisfied. Existing normal-estimator and portal paths remain untouched by this batch.
