# Construction pricing engine

This implements step 80 of the estimator instructions, independently of the UI.
It does not instantiate a database client, query a database, run migrations, or
write any data. Existing tables, records, normal estimator and public routes are
unchanged. The foundation migration remains a separate deployment step.

## Entry points

`app/lib/pricing/schema.ts` exports the validated request and catalogue snapshot
contracts. `app/lib/pricing/engine.ts` exports:

- `calculateEstimate(request, catalogueSnapshot)` — internal calculation result.
- `customerEstimate(result)` — explicit projection containing customer prices,
  scope and assumptions, without purchase costs, supplier references or markup.
- `PricingError` — stable error code plus a diagnostic message.

No frontend or HTTP endpoint is connected yet. A future trusted server adapter
must authenticate the caller, read approved effective catalogue versions in one
consistent read-only transaction and construct this snapshot. Never accept
customer-supplied prices, tax treatments, markups or a catalogue snapshot at a
public endpoint. Company staff control the commercial data.

```ts
const result = calculateEstimate({
  asOf: "2026-09-26T12:00:00.000Z",
  currency: "GBP",
  lines: [{
    key: "bedroom-door", type: "ITEM", itemId: approvedDoorId,
    room: "Bedroom", stage: "Second fix", condition: "NEW_INSTALLATION",
    quantity: { kind: "EXPLICIT", value: "1" }, supplyBy: "CLIENT",
  }],
}, trustedCatalogueSnapshot);
const customerResult = customerEstimate(result);
```

Amounts and quantities are decimal strings; money never uses binary floating
point arithmetic. All prices, rates and settings are explicit input, not market
price or tax assumptions. GBP is currently the supported currency.

## Calculation policy

1. Select the latest version effective at `asOf`. Recipes must also have been
   published by that time and match the requested work condition. Tied effective
   versions are rejected. Missing prices, VAT or required labour rates fail
   clearly; zero costs/tax must be supplied explicitly.
2. Resolve quantities from explicit values, declared defaults, lengths, areas,
   wall areas less openings, or volumes. Dimensions accept metres, centimetres
   and millimetres. Explicit unit conversion requires matching dimension kinds
   and configured canonical factors. Count/custom units (each, room, point, job)
   require their own unit; conversion is never guessed. Hours/days use the
   configured TIME conversion factor, distinct from a role's productive hours.
3. Round quantities upward to the configured precision, with an assumption
   notice. Apply fixed or per-unit recipe and dependency rules. Detect cycles,
   enforce mandatory supports, and cap expansion at 5,000 nodes / depth 20.
   Shared supporting items are counted per usage, not globally deduplicated.
4. Separate material, supporting material, labour, plant, waste, preliminaries
   and other costs. A supporting relationship's bucket classifies its direct
   material charge; its labour and other charges keep their original types.
   Nested supporting material remains supporting material. Client/existing
   supply removes that item's material and material upgrade charges; installation
   and supporting items remain unless individually overridden.
5. Recipe `hoursPerUnit` means total person-hours. Divide by team size for the
   task's duration allowance. Hourly cost is effort × hourly rate; daily cost is
   effort / productive hours per day × daily rate. An explicit item labour price
   replaces recipe monetary cost, while recipe effort remains visible. Default
   duration allowances do not invent person-hours.
6. Apply selected option material/labour surcharges per resolved unit. Allow one
   option per group. Option rules currently support nonnegative surcharges only.
7. Apply waste percentage once to material + supporting material. Add existing
   fixed waste. Round each cost bucket to pennies, half-up, and sum the buckets.
   Contingency = rounded cost subtotal × contingency percentage, rounded.
   Markup = (subtotal + contingency) × markup percentage, rounded.
   Discount = (subtotal + contingency + markup) × discount percentage, rounded.
   Net = subtotal + contingency + markup − discount.
   VAT = net × the explicit line VAT rate, rounded. Gross = net + VAT.
8. Apply the root line VAT treatment once to the entire assembly; dependency
   VAT is not charged independently. A mixed-tax scope must use separate root
   lines or a reviewed explicit line treatment. This is a calculation policy,
   not automatic determination of a project's legal VAT eligibility.
9. Sum rounded lines for totals. Unselected optional lines have separate totals;
   excluded lines have no charge. Allowances and provisional sums remain labelled
   and require review. Unpriced work and free-text special requests are flagged,
   never silently presented as covered by a zero price.

The `showContingency` setting controls the customer disclosure flag only; it
does not change charges. Internal output always contains the separate contingency
amount. Customer output currently indicates whether contingency is included;
itemised customer contingency pricing can be added with the quote presentation.

## Snapshots and integration boundary

The returned result contains the normalized request, full input catalogue,
selected versions, resolved quantities, calculation policy version and SHA-256
hash. Its objects are deeply frozen and independent of caller-owned data. The
hash fingerprints canonical JSON; it is not a digital signature.

Persist the **whole internal result** in the future quote-version layer. This
engine intentionally does not create a quote or write snapshot rows. Replay with
the stored `inputSnapshot` and `catalogueSnapshot`, using the recorded engine
version. Reading today's mutable catalogue is not historical replay: availability,
descriptions and effective price revisions may have changed. Keep older engine
versions available if a later policy changes the arithmetic.

The customer projection is a separate object; never send the internal result to
the browser. Catalogue names, recipe assumptions and manual descriptions should
be written for customers if used in that projection. Internal diagnostics should
be reviewed by staff rather than displayed verbatim at public endpoints.

Sequential duration is an allowance, not a promised completion date. Parallel
teams, calendars, dependencies and availability belong in future scheduling.
Snapshot loading, durable quote storage and the premium estimator wizard are
future integration stages, not enabled by this change.

## Verification

Run `npm run test:pricing`. Tests execute actual TypeScript engine code against
synthetic fixtures, without loading environment variables or connecting to a
database. Coverage includes arithmetic, rounding, dimensions, configurable
units, effective dates, work conditions, supporting items, supplied materials,
hourly/daily labour, options, mixed VAT, discounts, optional and unpriced work,
invalid/missing inputs, immutable snapshots and customer data projection.
