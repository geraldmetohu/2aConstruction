# Company settings editor

The admin editor at `/dashboard/settings` is off unless `COMPANY_SETTINGS_ENABLED=true`. It uses the existing additive foundation tables `CompanySettings`, `CompanySettingsVersion` and `AuditEvent`. No new migration is needed for this stage, and no live database or environment changes were made.

Saving appends a version effective at the server's current time and its audit event in one transaction. Existing settings versions and all other records remain unchanged. The editor requires catalogue administrator authentication, a reason and explicit review. A project-independent advisory lock, expected version and stable request UUID prevent duplicate or conflicting saves. Future-dated existing versions block saving until effective. Tax selection requires an active code with a currently effective rate.

The existing pricing adapter reads effective markup, material waste and contingency settings and snapshots them into new estimates. Historical estimates, quotes and projects retain their snapshots. Item VAT rates remain versioned catalogue data rather than a single global tax rate. The editor selects the estimator fee's approved VAT code.

New quote conversions prefill validity using the effective settings and the London calendar date. New invoice drafts prefill due dates from the configured payment terms; a button reapplies terms after the issue date changes. Existing drafts and historical versions are never rewritten. Without valid planning settings the previous quote fallback remains 30 days and project forms remain manual.

The schedule editor offers explicit date suggestions from person-hours, team size, hours per working day and the configured weekdays. It skips nonworking weekdays, including across daylight-saving changes. Holidays, individual worker availability and dependencies still require review; saving uses the existing schedule validation. The helper does not create time entries or change labour rates.

GBP and the £50 inclusive fee remain fixed to match the explicit premium-estimator brief and existing public marketing, Stripe checkout and webhook checks. Automatic invoice generation and sending remain off. Broader configurable fees/currencies require coordinated checkout, customer-display and verification changes before enabling them.

Activation requires the foundation migration to have been provisioned through the reviewed deployment process, valid VAT catalogue data, administrator configuration, and the feature flag. No automatic seed or live migration is run. Suggested values are not approved company policy until an administrator reviews and saves them.

Validation: `npm run test:company-settings` runs an isolated in-memory PostgreSQL instance and verifies retry protection, stale versions, ownership of retries, invalid tax handling, audit records, immutable history, unchanged unrelated records and effective-date pricing selection. Focused TypeScript and ESLint checks cover the editor and service. Run `node scripts/preview-company-settings.mjs` for a synthetic read-only UI preview on port 4324.
