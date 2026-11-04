# Accepted quote → delivery project (stage 83)

Implemented at `/dashboard/delivery-projects`. A released quote links to the conversion form; existing portfolio and client-project dashboards remain unchanged.

## Acceptance and conversion

An authenticated admin records acceptance already received from the customer: the exact latest released revision, accepting person's name, date/time, written evidence reference, and explicitly approved optional lines. The confirmation checkbox records the admin's review. This is evidence capture, not an electronic signature or acceptance on the customer's behalf. Nothing is emailed or published.

Acceptance must fall after release, no later than the quoted validity date (UTC date), and not in the future. A valid historical acceptance can be converted after the quote has expired. Unreleased, superseded, unpriced, corrupted or unsupported snapshots are rejected. Only one project can originate from a quote. Further scope changes belong in future project variations rather than a duplicate conversion.

The server copies the verified immutable snapshot, without reading current prices or recalculating selling amounts. It creates:

1. An acceptance evidence record and a client identity, or a link to an existing client.
2. The delivery project with approved scope, assumptions, exclusions, terms and source snapshot.
3. Ordered stages, rooms/areas and one task per approved line.
4. Material and labour requirements from the frozen component and recipe snapshots.
5. A financial baseline containing accepted net/VAT/gross, original cost buckets, contingency, markup, discount and specified effort.

Optional work is included only when explicitly checked on the acceptance form, even if selected in the draft quote. Excluded and unapproved lines generate no project tasks or requirements. Their keys remain in the scope audit. The original quote, revisions, releases and prices remain unchanged.

Material quantities use the accepted item units, including recursively expanded supporting materials. Customer-supplied and retained materials remain labelled and must not be procured. An assembly quantity is not a supplier bill of materials. Monetary allowances without quantities or hours remain unquantified and flagged for review. Recipe labour is copied as person-hours and team effort; it does not invent a construction schedule. Requirements are planning inputs, not additional charges to sum on top of the financial baseline. Estimator service fees are not included in the construction baseline.

## Client matching and preservation

The conversion reads legacy clients by authenticated quote-owner identity or case-insensitive email. A single match is linked automatically; multiple matches require an explicit choice from those candidates. A unique delivery identity per owner, normalized email and legacy-client link prevents repeat conversions creating duplicates. Identity collisions across accounts stop conversion for review instead of merging accounts. Changing a quote's displayed email does not change its owner.

Existing client rows are never updated or inserted by this workflow. A new `DeliveryClient` represents either a new client or a link with a contact snapshot to the existing record. This preserves the old system while giving the delivery workflow stable identities. No portfolio project or legacy client portal record is created automatically.

All conversion writes occur in one transaction. Quote locks serialize conversion with quote editing and release. Identity resolution serializes across quotes. Retry returns the existing project for that revision; a different revision or changed optional approvals are rejected. Any failure rolls back the entire conversion.

## Storage and activation

`PROJECT_CONVERSION_ENABLED=true` enables the admin workflow. It defaults off. Access uses authenticated `ADMIN_EMAILS` checks before database access; there is no public or customer endpoint exposing internal costs.

The migration `20260928150000_add_project_conversion` creates eight independent tables: `AcceptedQuote`, `DeliveryClient`, `DeliveryProject`, `DeliveryStage`, `DeliveryRoom`, `DeliveryTask`, `DeliveryRequirement`, `DeliveryBaseline`. Foreign keys connect only these new tables. Source quote and legacy client IDs are application-validated snapshot references. No existing table, column, constraint or index is modified.

The new tables reject updates, deletes and truncation to protect the accepted baseline. Operational progress and changes can use additional records in stage 84. No live migration, configuration change or production database write was performed during implementation. Deploy the additive migrations through the normal deployment process before enabling the flag.

## Verification

`npm run test:project-conversion` exercises scope selection, snapshot verification, component requirements, authorization and a real Prisma/PostgreSQL lifecycle in an ephemeral PGlite database. It checks exact preservation of all pre-existing records, columns, constraints and indexes; existing-client reuse; new-client deduplication; acceptance date validation; concurrent retries; late-write rollback; and immutable baseline protections.

Focused TypeScript, ESLint and Prisma schema validation cover the implementation. Whole-application build success is not claimed because earlier unrelated TypeScript errors remain.

`node scripts/preview-project-conversion.mjs` serves the real React form with synthetic data at `http://127.0.0.1:4321`. Submission is a no-op and cannot record acceptance or create a project.

Next stage: project management, including progress, scheduling, workers, procurement, variations and financial activity against this preserved baseline.
