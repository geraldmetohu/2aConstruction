# UK material price observations

Implemented 29 October 2026. The user confirmed Builder Depot UK and Selco, with Walthamstow preferred. Existing data, catalogue prices, quote snapshots and tables have not been changed. The additive migration has NOT been applied to a live database. No real supplier prices have been imported yet.

## API

- `POST /api/material-prices`: authenticated import of up to 200 verified observations. Accepts `{ "observations": [...] }` with the fields below. Suitable for future supplier feeds/account exports after adapting their documented formats.
- `GET /api/material-prices?itemId=<uuid>&supplier=SELCO`: authenticated history, newest first, up to 100 observations; optional `before=<nextCursor>` pagination. Currency, VAT basis, location, quantity tier, source and stale status are returned. Compare observations with the same product, location, unit, VAT basis and quantity tier.
- `POST /api/material-prices/refresh`: collects reviewed mapped public product pages, at most ten per invocation. It records one observation per product/location/tier each UTC week; already-recorded products are skipped. Individual failures do not erase old observations. Partial failure returns HTTP 207 and per-product statuses. Larger catalogues need a queue or feed integration before increasing this limit.

All endpoints are off unless `MATERIAL_PRICES_ENABLED=true`. Access requires an existing catalogue-admin session or `Authorization: Bearer <MATERIAL_PRICE_IMPORT_TOKEN>` with a random secret of at least 32 characters. Cookie-authenticated writes require the same origin. Keep credentials out of browser code and product URLs.

## Storage

`ActualMaterialValue` maps to the new SQL table `actual_values`. It records `itemId`, supplier, SKU, source URL/reference, location, public/account basis, pack price, quantity, base unit, normalized unit price, GBP, VAT inclusion, minimum pack quantity, observation time, receipt time and importer. It retains both old and new observations. UPDATE, DELETE and TRUNCATE are rejected. No existing table is altered and no old values are copied, rewritten or removed.

The import checks an active MATERIAL catalogue item and matching base-unit code. Decimal arithmetic divides pack price by pack quantity without guessing VAT. For example, a price per 25 kg bag must explicitly map to quantity 25 and base unit kg. It must not be mapped as a one-unit kg price. Delivery charges are excluded; no cheapest-price claim or automatic catalogue repricing is made. Recent imports must be dated within eight days; older observations already stored remain available and are labelled stale. A source reference is an immutable observation identity; changed prices require a new source reference. Batch writes are atomic and retry-safe.

## Product mapping and supplier access

No documented supplier API or account feed was confirmed. The public-page collector supports strict schema.org Product/Offer JSON-LD only. It requires exactly one matching SKU, one explicit GBP price, in-stock availability and a nonexpired offer. Ranges, multiple variants, price specifications, quantity tiers and unsupported pages are rejected. It makes bounded HTTPS requests only to exact Selco/Builder Depot hosts, does not follow redirects, and does not bypass login, CAPTCHA, rate limits or other access restrictions. Actual supplier page compatibility remains to be checked against selected real product URLs; tests use representative synthetic markup.

Set `MATERIAL_PRICE_PRODUCTS_JSON` to a reviewed array of mappings, each with:

```json
{
  "itemId": "REPLACE_WITH_EXISTING_MATERIAL_UUID",
  "supplier": "SELCO",
  "sku": "EXACT_SUPPLIER_SKU",
  "sourceUrl": "https://www.selcobw.com/REPLACE_WITH_PRODUCT_PATH",
  "location": "PUBLIC_ONLINE",
  "priceBasis": "PUBLIC",
  "packQuantity": "25",
  "unitCode": "kg",
  "currency": "GBP",
  "taxInclusive": true,
  "minimumPacks": 1
}
```

This is a shape example, NOT a verified product or VAT mapping. Review each product's exact specification, pack size and VAT display before configuring it. Builder Depot mappings use `BUILDER_DEPOT` and `https://www.builderdepot.co.uk/...`. The collector labels general website prices `PUBLIC_ONLINE`; it does not falsely claim they are Walthamstow branch or negotiated account prices. A verified Walthamstow/account feed can use the import endpoint with its explicit location and basis.

To add another supplier later, add its identifier to validation and an additive SQL check-constraint migration for this new table, register its exact host and a tested adapter. Existing stored rows and historical selling prices must remain intact. An official API adapter can replace public extraction without changing the normalized observation contract.

## Weekly schedule

The Codex thread automation `weekly-uk-material-prices` was created for Mondays at 09:00 local UK time. It runs the configured importer and reports meaningful changes or new failures. It does not deploy, migrate or invent mappings. Until setup is complete, it reports the configuration blocker and stays quiet on unchanged repeats. This is a local app automation, not a hosted production cron guarantee.

`npm run prices:refresh` uses `MATERIAL_PRICE_API_ORIGIN` and `MATERIAL_PRICE_IMPORT_TOKEN` from its environment and POSTs to the refresh endpoint. The runner intentionally does not load `.env`, discover secrets or migrate anything. Supply the variables through the approved runtime/secret configuration. It exits 2 when configuration is missing and 1 on a failed/partial run. Existing `.env` files were not edited.

Before real collection: provision the new migration through the established deployment process, regenerate Prisma Client, deploy the routes, configure the secret/feature flag, review real material SKU mappings and verify one collection in staging. A Windows DLL lock interrupted the engine-file replacement during Prisma generation in this session, although the updated generated client passed the isolated real-Prisma tests. Repeat generation in the deployment environment with the old engine unloaded.

## Verification

`npm run test:material-prices`: strict extraction, access checks, network failure handling, price normalization, atomic retries, immutable history and preservation of all previous records/schema/indexes in an in-memory PostgreSQL database. No production connection is used. Full TypeScript and focused lint checks are also run.
