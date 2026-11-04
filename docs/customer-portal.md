# Customer portal (stage 85)

Implemented at `/my-projects`. Disabled unless `CUSTOMER_PORTAL_ENABLED=true`. No live database migration or deployment has been performed.

Administrators use `/dashboard/delivery-projects/[id]/portal` to preview and publish a customer update. Select individual files, variations, issued invoices and snag titles; schedule sharing is optional. Publication requires a reason and a preview. Withdrawing an update appends a withdrawal record and immediately blocks customer project content, messages and file access. Existing records remain intact.

Access requires an authenticated Kinde ID matching `DeliveryClient.ownerId`. Email matching and administrator bypass are not used for customer routes. Customer responses explicitly project public fields; internal costs, wages, supplier details, notes and approval evidence are excluded. File downloads recheck ownership and the latest publication on every request.

Progress, prices and billing reflect the dated publication. Messages and recorded decisions are current. Customers can approve or decline the exact published proposed variation with explicit confirmation. Ownership, publication version and proposal hash are rechecked under the project lock. The decision and new project activity are saved atomically, with retry protection. The team must publish another update to refresh the summary. Issue reports enter the conversation for team review. No automatic email, payment collection, refund or bank integration is implemented.

Storage is additive: `20260930120000_add_customer_portal` creates only `CustomerPublication`, `CustomerMessage` and `CustomerDecision`, with update/delete/truncate guards. It does not alter existing tables. Future use appends project activity for variation decisions; it never rewrites the accepted baseline or previous events.

Before activation, review and back up the target database, provision the preceding estimating/project migrations and this migration through the deployment process, confirm owner IDs, and set the feature flag. Do not run reset, destructive schema push or seed commands against existing data. The flag and live database have been left unchanged.

Validation: `npm run test:customer-portal` uses isolated in-memory PostgreSQL, verifies original rows/schema/indexes survive migration and portal operations, checks ownership and file withdrawal, concurrent decision retries, immutable records, and public-data redaction. Focused TypeScript and ESLint checks also pass. Authentication-provider and live deployment integration remain unverified.

Run `node scripts/preview-customer-portal.mjs` for a synthetic, read-only UI preview on port 4323. It uses the actual customer component and projection without a database connection.
