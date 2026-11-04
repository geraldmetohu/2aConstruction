# Admin quote builder

Stage 82 adds draft quotes from paid premium submissions, editable scope and immutable revisions. No live database migration has been run. Existing tables, records and catalogue prices are unchanged.

## Workflow

Open **Dashboard → Quotes → New quote**, or use **Create / open draft quote** on a paid premium estimate. Conversion is idempotent: the same submission opens its existing draft. Its original catalogue snapshot and pricing date are retained; later catalogue edits do not reprice the quote.

Admins can add and remove lines in a new revision, edit quantities, conditions, specification options, material supply, descriptions, room/section/stage ordering, assumptions and exclusions. Manual, allowance, provisional, optional and excluded work are supported. Quote-only costs, supporting materials and labour effort require a reason and never write to the catalogue. Set labour cost to `derive` to use recipe hours and rates.

Calculate previews before saving. Each save appends a numbered revision with its input, catalogue snapshot, calculated costs, customer projection, author, reason and SHA-256 snapshot hash. Concurrent edits against an older revision are rejected. Earlier revisions remain accessible in history.

Release requires the latest saved revision, a review note, a valid expiry date and no unpriced work. Unpriced requirements must be priced or explicitly excluded. Release appends a separate record; it does not send email, accept a contract or create a project. Customers must sign in with the original submission account and can access only released revisions. Admins can view drafts. Customer HTML and PDF include selling prices, VAT, scope, terms and optional totals without exposing internal cost breakdowns.

## Configuration and storage

All flags are off unless their value is exactly `true`:

- `QUOTE_BUILDER_ENABLED`: enables admin creation/editing and quote viewing.
- `QUOTE_STORAGE_READY`: allows previously released quotes to remain readable when the builder is disabled.
- `QUOTE_ALLOW_DISCOUNTS`, `QUOTE_ALLOW_MARKUP`, `QUOTE_ALLOW_VAT_OVERRIDE`: independently allow the corresponding pricing changes. Restrictions are enforced when saving on the server.

Admin identity uses the existing authenticated `ADMIN_EMAILS` allowlist. Customer emails in quote text do not grant access; ownership stays attached to the original authenticated account.

The unapplied migration `20260928120000_add_quote_builder` creates only `DraftQuote`, `QuoteRevision` and `QuoteRelease`, their indexes, and retention triggers. It adds no columns or constraints to existing tables. All three new tables reject update, delete and truncate operations. The source submission ID is an immutable reference validated by the application, avoiding a foreign-key change to previous storage.

Review and apply the additive migrations through the deployment process before enabling flags. No production data, secrets or settings were changed during development. The implementation does not provide live catalogue refresh, email delivery, customer acceptance or project conversion; project conversion is the next stage.

## PDF and verification

The Node PDF route uses PDFKit with bundled, licensed Liberation Sans fonts. Next output tracing includes these fonts. The download uses the same owner/release checks as the customer page and private no-store caching. A three-page synthetic sample was rendered and visually checked for page breaks, long descriptions and optional totals.

- `npm run test:quotes`: eight domain, access-control and in-memory PostgreSQL lifecycle tests, including exact preservation of pre-existing records and schema objects across the new migration and quote operations.
- Focused TypeScript and ESLint checks cover the quote implementation. Existing unrelated application type errors prevent claiming a clean whole-project build.
- `node scripts/preview-quotes.mjs`: isolated editor at `http://127.0.0.1:4320`, synthetic catalogue only; save and release are no-ops.
- `node scripts/preview-quote-pdf.mjs`: generates `output/pdf/quote-preview.pdf` using synthetic data and the real renderer.

No production database, live payment or customer communication is used by these previews and tests.
