# Premium Estimator — step 81

Implemented independently of the normal estimator. `/premium-estimator` guides
customers through project/property details, rooms or areas, conditional work
questions, contact details and a review before the £50 payment. It supports
standard/upgraded specifications, customer-supplied or retained materials,
refurbishment/repair, optional work, unknown answers and special requests.

Project types cover renovation, extension, loft, new build, kitchen, bathroom,
roof, groundworks, garden, repairs and other work. Selected work packages cover
doors, windows, floors, wall painting/plastering, electrical/plumbing,
roof covering, insulation, groundworks, structure and landscaping. These are
customer-friendly questions, not an exposed internal catalogue.

Roof covering questions depend on roof type. Roof windows, insulation and
guttering are separately flagged for assessment; their costs are **excluded**
from roof covering. Structural and groundworks pricing is only as complete as
the company-approved assembly mapped to that work package. No project type
silently adds unselected work. Unknown specifications/measurements and special
requests remain unpriced and require review. At least one included, confirmed,
priceable item is required to start checkout.

## Data preservation

No live database migration or payment has been performed during implementation.
The new migration `20260926120000_add_premium_estimator` creates four new tables:

| Table | Purpose |
| --- | --- |
| PremiumRequest | Immutable reviewed brief, pricing inputs, catalogue and fee snapshots |
| PremiumCheckout | Immutable Stripe session association |
| PremiumPayment | Verified paid receipt, committed before estimate generation |
| PremiumSubmission | Generated internal and customer estimate snapshots and review flags |

Existing tables, records, relations and the normal estimator are untouched by
this migration. New foreign keys reference only these new tables, with RESTRICT
deletion semantics. UPDATE, DELETE and TRUNCATE are blocked on all four tables.
No final project, legacy client/user or project phase is created or modified.
Corrections, quote revisions, refunds and payment disputes need separate future
append-only records; do not rewrite these original receipts or estimates.

## Payment and snapshot flow

1. Validate the brief; require an authenticated Kinde identity before any checkout
   database call. The owner ID is obtained on the server, not from the form.
2. Map work codes to company-approved IDs on the server. Load effective catalogue
   versions in a repeatable-read, read-only transaction. Confirm the fee settings
   and validate calculation before opening payment.
3. Append a request with frozen pricing inputs and catalogue. A per-owner lock,
   unique owner/request key and five-new-checkouts-per-hour limit protect retries.
4. Create a Stripe card Checkout Session for exactly **5000 pence GBP total**,
   with a stable idempotency key and one-hour expiry. No browser-supplied price,
   redirect origin or tax percentage is accepted. Returning from cancellation
   resumes the same open checkout; expired requests require a new key.
5. `/api/premium/webhook` verifies the signature against the raw request body.
   Only paid, completed sessions matching mode, amount, currency, live/test mode,
   stored session, request ID and payment intent can produce a receipt.
6. Commit the paid receipt before generating the estimate. Generate from the
   frozen inputs and recorded engine version, then append the submission.
   Duplicate deliveries do not duplicate receipts or estimates. Failure after
   payment returns HTTP 500 for Stripe retry, retaining the receipt.
7. The return page checks the signed-in owner and only displays the customer
   projection. A return URL alone never grants a paid estimate. Pending pages
   refresh for one minute, then offer manual refresh and a contact reference.

Company prices, margins, supplier data and internal catalogue IDs never go to
the wizard or customer projection. Reviewed drafts stay in sessionStorage in the
same browser tab to survive sign-in/checkout; they are not sent to a mailing list.
Customers can return to their paid result via the same reviewed checkout.

Admin `/dashboard/premium-estimates` requires the exact configured `ADMIN_EMAILS`
allowlist and shows paid submissions, pending generation and review reasons.
This is a read-only review list. Full quote editing follows in step 82.

Stripe references: [fulfilling Checkout payments](https://docs.stripe.com/checkout/fulfillment)
and [webhook signatures](https://docs.stripe.com/webhooks/signature).

## Activation prerequisites (not performed)

Keep payments disabled until these have been completed in the deployment
environment. No `.env` file was edited as part of this implementation.

- Review a backup and apply the additive foundation and premium migrations using
  the documented migration deployment process. Never use reset or destructive
  schema push. Set `PREMIUM_ESTIMATOR_STORAGE_READY=true` after migration so the
  admin review list remains accessible even when new checkouts are disabled.
- Configure and approve the effective company settings and catalogue. The fee
  must be £50 total, `estimatorFeeInclusive=true`, with an explicit, effective
  fee tax treatment. No legal VAT classification is guessed. Construction VAT
  remains the explicit treatment attached to the selected prices.
- Set `PREMIUM_ESTIMATOR_MAPPING_JSON` with a version, approved item IDs, optional
  upgrade option IDs and customer-facing descriptions. Increment the version
  whenever the mapping or its descriptions change. A stale reviewed version is
  rejected before checkout. Schema example (replace placeholder IDs):

```json
{
  "version": "company-approved-1",
  "work": {
    "doors": {
      "itemId": "APPROVED-DOOR-UUID",
      "standardDescription": "Describe the exact approved door specification",
      "upgradeOptionId": "APPROVED-OPTION-UUID",
      "upgradeDescription": "Describe the exact approved upgrade"
    }
  },
  "roofVariants": {
    "pitched:slate": {
      "itemId": "APPROVED-ROOF-COVERING-UUID",
      "standardDescription": "Describe covering inclusions and exclusions"
    }
  }
}
```

- Count packages need COUNT catalogue units. Floors, walls and measured areas
  use AREA; groundworks volume uses VOLUME. Canonical unit factors convert the
  entered metres/metres-squared/metres-cubed correctly. Roof variant keys are
  `pitched:concrete`, `pitched:clay`, `pitched:slate` or `flat:membrane`.
  Map roof-covering-only assemblies; roof accessories are separate review items.
  Missing mappings/upgrades or invalid prices block payment instead of inventing
  commercial values. Configured public descriptions are required for activation.
- Set `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_WEBHOOK_SECRET`,
  `PREMIUM_ESTIMATOR_ORIGIN` (trusted HTTPS origin in production), and
  `PREMIUM_ESTIMATOR_LIVE_MODE=false` for test credentials. Register
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`
  for the premium webhook endpoint. Keep the webhook operational when disabling
  new checkouts so already-paid customers can still be fulfilled.
- Exercise Stripe test checkout, cancellation, duplicate webhook deliveries and
  webhook retries against an isolated staging database. Real Stripe end-to-end
  payment has not been exercised here; tests use a mocked Checkout transport and
  the real Stripe signature verifier.
- Set `PREMIUM_ESTIMATOR_ENABLED=true` only when ready. This also adds the premium
  link to the homepage estimator section. It defaults off; the wizard can be
  explored without enabling payment or querying a database.

## Verification

`npm run test:premium` tests actual modules, real Prisma calls against temporary
PGlite PostgreSQL, migration preservation of all existing rows/columns/constraints/
indexes, immutability, payment order, retries, invalid signatures, ownership,
mapping and conditional component rendering. No application database URL is used.

`node scripts/preview-premium.mjs` builds an isolated interactive browser preview
at `http://127.0.0.1:4319`. It replaces the checkout action with a local no-op
message, has no database/authentication/.env access, and cannot take a payment.
Generated preview files live under `.next/premium-preview`.
