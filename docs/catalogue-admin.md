# Admin item manager

Implemented 26 September 2026. Source changes only; **the live database has not been accessed, migrated, seeded or modified**.

## Features

- `/dashboard/items`: 30-item pages with search, category/availability filters and name/code/date sorting.
- `/dashboard/items/new`: item creation with categories/subcategories, configurable units, type, main/supporting role, first/second fix, duration, dimensions and availability.
- `/dashboard/items/[id]`: details, separate material/labour/plant/waste/other unit costs, price versions, work specifications, options, supplier references and availability/duplication.
- `/dashboard/items/setup`: create/edit/archive/restore categories, units, labour roles, suppliers and VAT codes; append labour/VAT rates.
- Work specifications cover new build, installation, refurbishment, repair, make-good and redecoration. Supporting-item selection has code autocomplete, per-unit quantities, required/default flags, and a labour editor for role/person-hours/team/rate basis.
- Options can represent standard/premium/custom finishes or other grouped choices, with additional material/labour costs and specification text. Editing appends a version; inactive options retain their history.
- Duplicate copies details, current price, published specifications and active options into an inactive item for review. Supplier observations remain on the source item. Scheduled prices are not copied.
- Archive/restore replaces deletion. Restore leaves items inactive until explicitly reviewed and activated.

An Items navigation entry was added to the existing admin dashboard. The dashboard navigation can scroll horizontally at narrower desktop widths. The normal estimator, portal saves, account-linking behaviour and existing tables are otherwise unchanged. Independently edited website/FMB files were left untouched.

## Access and data protection

Every new server action and read checks the Kinde session and exact normalized membership of `ADMIN_EMAILS`; layout checks alone are not used as authorization. It then checks the `CATALOGUE_ADMIN_ENABLED` flag. Unauthorized and disabled requests are tested to make no catalogue database calls.

All mutations use only the new catalogue tables, with Prisma serializable transactions, expected revisions and audit entries derived from the authenticated actor. A stale edit, invalid foreign reference, duplicate effective date, dependency cycle or failed audit/save rolls back the transaction. The user reloads after a conflict; the app does not silently overwrite concurrent edits.

Prices, rates, options and work specifications append new versions. Published recipes and their children remain frozen. Unit conversion basis/precision cannot be edited into a different meaning; create a new unit instead. Current prices and each condition's current recipe are queried independently of history limits so many future prices or unrelated revisions cannot blank out the editor.

All decimal inputs are validated as bounded decimal strings. NaN, infinity, exponent notation, negative costs, excess precision and invalid dates/IDs are rejected. Rules stored by these forms are a small explicit grammar; arbitrary expressions are not evaluated.

No application code in this batch calls delete, deleteMany, truncate or automatic seed operations. Existing legacy actions identified in the original audit still have their old behaviour; this batch does not claim to disable those actions globally.

## Activation

The feature is off unless `CATALOGUE_ADMIN_ENABLED=true` is explicitly configured. With it off, the Items page shows a setup-pending message and does not query the new tables. Missing tables also produce an unavailable message, not a migration attempt.

Before enabling:

1. Complete the database baseline and verified-backup checks in `estimating-foundation-migration.md`.
2. Deploy only the approved additive foundation migration after confirming older migrations are already applied. Do not blindly run all pending historical migrations.
3. Generate Prisma Client from the current schema as part of the application deployment.
4. Configure authorized `ADMIN_EMAILS` and then the feature flag. No `.env` or deployed configuration was changed in this task.
5. Add reviewed categories, units, rates and items through the admin UI. No commercial prices or tax decisions have been invented or loaded automatically.

Disabling the flag withdraws catalogue access without changing any stored records.

## Validation

- `npm run test:catalogue`: 17 passing checks, including real Prisma/server-action transactions against an ephemeral in-memory PostgreSQL instance exposed only on a random loopback port. Kinde and Next cache hooks are mocked at the test boundary; validation, access checks, services and database SQL are the actual code.
- `npm run test:catalogue-ui`: 13 passing render checks covering list/new/detail/price/work/options/supplier/archive and all setup screens.
- Targeted ESLint on the new catalogue code and dashboard navigation: passed.
- Application TypeScript check: existing errors remain in unrelated route props, UploadThing typing, portal action signatures, portfolio forms/nullability and Prisma configuration. No catalogue-specific errors were reported.
- Browser visual inspection: actual list and work-specification components rendered with synthetic fixtures and the app's Tailwind stylesheet. This was a static preview, not a logged-in production end-to-end test.
- Foundation migration tests from the preceding batch separately cover preservation of rows, columns, constraints and indexes across all nine legacy tables.

The test loader and preview script are test-only helpers. They do not load `.env` or start the real Next app, and do not introduce a production authentication bypass. The socket dependency is development-only. No live user data appears in fixtures.

## Current scope limits

- UI history windows show the latest 50 prices/references, 60 recipes across conditions and 30 option/rate versions. Older records remain stored. Current selections are not limited by those windows.
- Setup lookups are bounded to 1,000 entries per kind and supporting-item autocomplete to 2,000 items, sufficient for the proposed 200–300 item starter catalogue. Larger catalogues will need paginated lookup search.
- Supplier references are manually recorded; the application does not scrape prices or update your prices automatically.
- The catalogue stores internal costs. Selling-price/markup calculation, premium checkout, quote snapshots and project conversion belong to the following implementation stages.
- Multi-connection production concurrency and the actual deployment baseline still require staging validation; PGlite's socket adapter multiplexes one PostgreSQL session and is not a production concurrency simulator.
