# Implementation and release status

Updated 29 September 2026. Source implementation and synthetic verification only. No live database access, migrations, seeds, deployment, payment, email or portfolio publication occurred.

## Implemented workflow

The additive catalogue, pricing engine, premium estimator, versioned quotes, accepted-quote conversion, project workspace, customer publications and company settings editor are implemented behind default-off flags. Existing records are retained. Each stage has its own documentation and preservation tests.

The latest integration connects effective company quote-validity days to new quote drafts, payment terms to new invoice drafts, and hours/team/working days to explicit schedule suggestions. Past snapshots and existing entries stay unchanged. `Operations` adds an admin-only, read-only overview with global submission/quote/project counts and clearly labelled page-level project metrics. Flagged estimates remain flagged in their immutable original submissions; this is not a review-resolution queue. Project financial summaries use a consistent read-only transaction, and pagination bounds the number of projects loaded.

## Remaining launch dependencies

1. Company-approved catalogue content, supplier prices, labour rates, recipes, VAT treatment and premium-question-to-item mapping. Test fixtures and example defaults are not production commercial data. The original brief explicitly requires company-controlled prices, not invented final prices.
2. Review deployment against an isolated copy or staging database, with backups and migration history checked. Source migration tests demonstrate retention on synthetic PostgreSQL, not the state of the live database.
3. Exercise actual Kinde administrator/customer sessions and Stripe test-mode checkout, cancellation, return pages and signed webhook retries in staging. Current payment transport tests are mocked; no real transaction has been performed.
4. Verify production configuration, storage capacity, URLs and feature flags, then deploy through the chosen hosting process. No environment variables or live flags have been changed.

GBP and the £50 inclusive estimator fee match the explicit premium-estimator specification. Alternate currencies/fees are not enabled. Automated invoice emails, bank transfers, payroll, statutory accounting integrations and public portfolio publishing are not executed by this implementation. Portfolio draft automation and the broader eventual accounting/notification architecture in the source brief remain future modules; this status document does not label them complete.

## Verification

All existing test files were run individually in one sequential batch, using synthetic in-memory databases. The batch passed. The new operations aggregation test also passed separately. Focused TypeScript and ESLint checks passed for the connected defaults and operations module. Browser verification confirmed a 14-day new-invoice due date and a two-day schedule suggestion for 32 person-hours with two people working eight-hour days. See `output/planning-defaults-preview.png`.

The Node multi-file test runner could not spawn child processes in this environment (`EPERM`); executing each test file directly succeeded. Do not confuse that initial runner failure with an application test failure. A production build and live integration checks are separate release requirements.

The repository-wide type check exposed earlier compatibility issues in upload callback types, action-state signatures, a misplaced portfolio source selector, nullable legacy fields and Prisma configuration typing. These were corrected without changing database schemas or running the legacy mutation actions. Upload responses now pass through a runtime-validated adapter that accepts both supported URL fields; its regression test passes. The existing normal-estimator submission and pricing flow is retained. The full repository TypeScript check subsequently passed, and `ignoreBuildErrors` is now false so builds enforce it. Prisma schema validation also passed. This does not substitute for a production build or staging verification.
