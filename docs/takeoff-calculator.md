# Takeoff quote calculator, quotes and client portal

Updated 1 November 2026.

The calculator turns a survey into a full price. It works out quantities, main and supporting materials, labour from the company labour price list, days per trade, site costs, health & safety, scope of works and programme. You can save a quote, send it to the client, and edit it after sending (the client sees a notice in their portal). The client can make their open choices and accept online.

## Database: new tables only

Nothing existing is changed, renamed or deleted. One **additive** migration adds new tables:

`prisma/migrations/20261101120000_add_takeoff_quotes/migration.sql`

| Table | Holds |
| --- | --- |
| `TakeoffQuote` | One row per quote: client, status, current and published version. Rows cannot be deleted (trigger). |
| `TakeoffQuoteVersion` | Every saved version: full input, prices and rates used, totals. Append-only (trigger). |
| `TakeoffQuoteEvent` | History: created, saved, sent, updated after send, viewed, client choice, accepted. Append-only. |
| `TakeoffQuoteSeen` | When the admin / client last looked (for "new" badges). |
| `TakeoffRateSet` | Versions of your labour and material price list. Append-only. |
| `TakeoffSupplierLink` | Selco / Builder Depot product link per material. Rows cannot be deleted. |
| `TakeoffPriceObservation` | Each daily price check (price, image, error). Append-only. |

Apply it yourself when you are ready. Take a backup first, then run:

```
npx prisma migrate deploy
npx prisma generate
```

Do **not** use `prisma migrate dev` or `db push` against the live database. Until the migration is applied, the calculator still works, but saving, sending, the rates page, supplier prices and the client portal show "needs the new database tables".

## Pages

| Page | Who | What |
| --- | --- | --- |
| `/dashboard/calculator` | Admin | 1 House (client, address, description) → 2 Rooms (each room separately: sizes, doors, windows, notes and the work in it) → 3 Projects (loft, extension, roof) → 4 Site & margins. Results: price summary (first fix / second fix / site, scaffolding included or not, client supplies), breakdown per area with formulas, a type/size dropdown on every material, a "Client supplies" tick, price edits, trades, programme, client choices, quotation, history. |
| `/dashboard/saved-quotes` | Admin | All quotes with status, total and new client activity. |
| `/dashboard/rates` | Admin | Labour price list (price per unit and output per day for each job) and material prices. Standard prices first; each save is a new version. |
| `/dashboard/supplier-prices` | Admin | Paste a Selco or Builder Depot product link per material, with pack size and whether the price includes VAT. "Refresh now" checks them. |
| `/my-quotes` | Client (logged in) | Quotes sent to the client's email. |
| `/my-quotes/[id]` | Client | Update notices, price by area and by part of the job, scaffolding included or not, "What you need to order" (with images where known), their choices with a new-price preview, programme, scope, terms, and acceptance. |
| `/instant-quote` | Public | Guide price for projects and rooms. Only public fields reach the browser. Off until `INSTANT_QUOTE_ENABLED=true`. |

## Prices: where each one comes from

For each line, the first price found is used:

1. A price edited on this quote.
2. Live supplier price: the lowest Selco / Builder Depot price, ex VAT per unit, checked within the last 8 days.
3. The older supplier price table, if present.
4. Catalogue item `TK-<KEY>`.
5. Your saved rates (Rates page, or the `TAKEOFF_RATEBOOK_JSON` environment variable).
6. Default rates (London 2026 estimates, marked "confirm").

### Daily supplier prices

Selco and Builder Depot have no public price API. The system reads the price from each product page you link, once a day, politely (4 at a time, 1 second apart). It also stores the product image, which is shown on the quote lines and in the client's order list. If a page shows more than one price, nothing is saved and the error appears on the Supplier prices page: link the exact product variant instead.

To run the daily check, set `TAKEOFF_CRON_SECRET` (at least 24 random characters). Then call:

```
GET /api/takeoff/prices/refresh
Authorization: Bearer <TAKEOFF_CRON_SECRET>
```

Call it once a day, e.g. with Vercel Cron or any scheduler. Each call checks up to 40 links that are due; call again if `remaining` is above 0.

## How labour is priced

Every labour job has a **price per unit** (m², m, m³, point, door…) and an **output per day** with the gang that does it. The cost is quantity × price. The days are quantity ÷ output. Company fixed jobs are priced per job with fixed days, for example loft demolition (£2,700 / 3 days / 3 people terraced; £3,300 / 4 days semi; £4,200 / 5 days detached), beam preparation (£600 for 1–3 beams, £1,200 for 4–5), beam installation (£1,450), floor joists (£4,300) and boarding (£800).

Within a stage, different trades work side by side, so a stage takes as long as its longest trade, rounded up to ½ day. All prices and outputs are editable on the Rates page.

Some examples: excavating foundations £115/m³ at 4 m³/day; loading spoil £28/m³ at 6 m³/day; hand digging £150/m³ at 2.5 m³/day; skim £12/m² at 40 m²/day (2 plasterers); mist coat £4/m²; walls £12/m² for 2 coats; ceilings £13/m²; door £150; window £110; radiator £55; wall tiling £50–70/m² depending on tile size.

## What is calculated

- **Rooms.** Each room has its own sizes and work. Walls = perimeter × height − doors − windows. The calculator covers:
  - Plastering (make good, skim with PVA, bonding + skim with grit primer, hack off, dot & dab), with beads and tape.
  - Coving.
  - Painting: choose ceiling, walls, skirting, doors, windows and radiators; set the coats (1, 2 or 3, default mist coat + 2) and the paint type.
  - Flooring, skirting, electrics (add points or rewire), downlights, radiators, new or refurbished doors, and windows.
  - Kitchen refit (units per 600 mm, worktop, splashback tiles, appliances, floor).
  - Bathroom refit (wet-zone backer, tanking, wall and floor tiles by size, suite, shower, UFH, towel rail).
- **Tiles.** Area + 10% → number of tiles → boxes of the chosen size. Also adhesive, grout, primer, spacers, levelling clips and trims. Colours are client choices.
- **Loft.** Your formulas (joists ⌈W × 4⌉ + 3, boarding sheets + 2, rafters H ÷ sin 45°, flat roof, sheets ÷ 2.8, partitions). **Each steel beam has its own size and length**; a length of 0 means width + 20 cm. Bolts are Σ ⌈length ÷ 0.6⌉ and fire protection is the total length. The full fit-out and dormer roofline are included.
- **Extension.** Foundations, then:
  - **Digger access yes/no.** With no access the job is hand dug, which takes longer and costs more.
  - Spoil is bulked ×1.3, and loading it is its own labour line (slower when site access is not easy). Spoil goes by grab lorry (8 m³) or skips (4.5 m³ of soil each).
  - Drainage, slab, cavity walls, a flat or pitched roof, and **each rooflight with its own size** (with trimmers and kerb).
  - **Each steel can be entered with its own size and length.**
  - Doors and windows, knock-through, first fix, plaster, decoration and flooring.
- **Roofline (loft dormer, extension, re-roof).** Fascia width and colour; soffit width; gutter profile and colour; gutter lengths, unions, brackets, stop ends, outlets, 90° and 135° angles; downpipes, clips, sockets and shoes.
- **Site.** Protection, scaffolding (included or not), skips for project and room waste, welfare, engineer, building control, party wall, final clean, and H&S (edge protection, temporary roof, excavation safety, dust control when the house is occupied).

## Plumbing, fixture by fixture

Each fixture brings its own materials, with quantities from the distances you enter (distance to the nearest supply and to the soil stack / drain):

| Fixture | Materials |
| --- | --- |
| Basin | 15 mm pipe, 90° elbows, tee, isolating valves, 2 flexi connectors, 32 mm waste with 2 × 90° + 1 × 45° bends, bottle trap, click-clack waste, boss |
| WC | 15 mm pipe, elbows, tee, isolating valve, flexi, 110 mm soil pipe, 92.5° and 135° soil bends, coupler, pan connector, fixing kit |
| Bath | 15 mm pipe, 90° and 45° elbows, tee, valves, ¾" tap connectors, 40 mm waste and bends, bath trap, waste & overflow |
| Shower | 15 mm pipe, 90° and 45° elbows, tee, valves, 90 mm tray waste, 40 mm waste and bends |
| Kitchen / utility sink | 15 mm pipe, elbows, tee, valves, flexis, 40 mm waste and bends, sink trap with appliance spigot, waste kit |
| Washing machine / dishwasher | appliance valve, standpipe & trap (washer), pipe and fittings |
| Radiator / towel rail | flow & return pipe, elbows, tees, TRV + lockshield, clips, drain-off, inhibitor |

Pipe clips every 0.6 m, waste clips every 1 m, solvent cement, solder & flux (copper) or inserts (PEX), PTFE. Choose copper or PEX per room. House services in step 4: new MDPE water main, stopcock, outside taps. Extractor fans and cooker hoods include ducting kits; windows, doors, skirting and floors include their fixings, fire-door kits, thresholds and beading.

## Client documents

The **Documents** tab (and the client's portal) produces a printable pack, built only from client-safe figures (profit and margins already inside each price):

1. **Quotation** – logo, company and client details, title, date, validity; description of the works; scope of works in programme order with dates; programme; price by area and by part of the job; **payment schedule** (deposit %, stage payments on completion of stages with due dates, final % on practical completion – amounts and dates); **items you supply** with specification, quantity and the date needed by; exclusions; assumptions; acceptance.
2. **Contract** – consumer building contract: parties, documents, price & payment, variations & unforeseen work, programme & delays, both sides' responsibilities, insurance, guarantee, 14-day cancellation right (with cancellation form), ending the contract, liability, complaints & disputes, signatures.
3. **Workmanship guarantee** – certificate (default 5 years): what is and isn't covered, conditions, claims.
4. **Construction phase plan** (CDM 2015) – project info, contacts, site rules, welfare, fire & emergency, existing information (asbestos), protecting occupants and public, monitoring.
5. **Risk assessment, method statements and COSHH register** – only for the activities in this job (found from its lines), with risk ratings before and after controls.

Start date, deposit, number of stage payments, final %, payment days, validity, guarantee years, client phone/address and extra exclusions are set in step 4. Company details (address, insurance, bank details, site manager, first aider…) are set on **Company & documents** (stored as a new version of the company settings – no extra table). **Have the contract and guarantee wording checked by a solicitor before first use.**

## Electrics, item by item

Each room's electrics are counted per item: recessed spotlights, pendant light points, light switches, double sockets, fused spurs, fan isolators, data and TV points, cooker circuit (45 A), shaver socket and outside lights. Every item has its accessory, back box, cable run (1.5 / 2.5 / 6 mm², Cat6, coax) and labour. Each room type starts from typical numbers, for example a kitchen has 6 spotlights, 6 double sockets, 4 spurs and a cooker circuit. Change any count.

A **rewire** also prices removing the old wiring and filling the chases. A kitchen or bathroom refit always includes its electrics. There is **one** test & certificate for the whole job, never one per room. A new consumer unit (with RCBOs counted from the circuits) is a tick box in step 4.

## Loft, extension and roof types

| Project | Types |
| --- | --- |
| Loft | Rear dormer · L-shape (adds the outrigger dormer: demolition, floor, walls, flat roof, cladding, windows) · Hip to gable + rear dormer (gable walls, extended rafters, ridge and tiles) · Rear mansard (72° slope, party walls raised) · Roof-light conversion (roof kept, windows in both slopes, no dormer) |
| Extension | Single storey rear · Side return infill · Wraparound (rear + side return, two roofs) · Double storey (first floor joists, upstairs windows, rooms, scaffolding) |
| Re-roof | Concrete interlocking, concrete plain, natural slate, fibre cement slate, clay plain, clay pantile · new covering or re-lay the existing (25% new) · whole roof or one slope · valleys, rafter repairs, chimney re-flashing and repointing |

**Lowered first floor ceilings (loft).** Tick it to price taking down the first floor ceilings, new board and skim, making good, moving light points, adjusting door heads and decoration. First floor rooms you have listed in step 2 renew their own ceiling in the room, and the loft prices only the rest of the floor, so nothing is counted twice.

## Removing lines and margins

- **Not needed:** any line (material or labour) can be marked "not needed". It stays visible, faded, at £0, and drops out of the price, the programme and the client's order list. "Put back" restores it.
- **Margins:** profit markup, contingency and waste are editable at the top of the results ("only you see these"). The client never sees them. On the quotation and in the portal, every price (areas, first fix, second fix, materials, labour) already includes them.

## Client choices and client supplies

Fields marked **client chooses** are priced with the option shown now, for example paint type and colour, tile size and colour, suite grade, worktop, door style, fascia and gutter colour. The client can change them in their portal, see the new price, and confirm. Confirming creates a new version, and you are alerted in Saved quotes.

By default the **client supplies the finishes**: tiles, bathroom suite and shower, towel rail, kitchen units, worktops and sink, floor finishes, and light fittings (pendants, outside lights). They are listed with quantities in the client's "What you need to order" list and on the quotation, and left out of your price. Untick "Client supplies" on a line to supply it yourself, or tick it on any other material. Step 4 switches the default off for the whole quote.

## Editing after sending

Saving a sent quote publishes the new version straight away and adds a notice in the client's portal ("Your quote has been updated"), with the reason you typed. Accepted quotes are locked.

## To confirm before going live

- All default prices and outputs marked "confirm": check them on the Rates page, or link supplier products.
- Test the supplier links on the Supplier prices page. Price reading was built against the standard product-page format and has not been tested on live Selco or Builder Depot pages.
- Set `TAKEOFF_CRON_SECRET` and schedule the daily refresh.
- Quote terms (deposit and stage payments) shown to clients.

## Tests

```
npm run test:takeoff        # formulas, rooms, painting, tiles, roofline, choices, prices (45 tests)
npm run test:takeoff-store  # new tables on a throwaway in-memory Postgres (PGlite) (9 tests)
npm run preview:takeoff     # local preview without database
```

## Jobs, client panel, team and activity (migration 20261102120000_add_takeoff_jobs)

Apply after the first migration (`npx prisma migrate deploy`). New tables only; records are never deleted (photos are hidden, expenses voided, workers made inactive, history is append-only).

| Page | Who | What |
| --- | --- | --- |
| `/dashboard` | Admin | **Activity panel**: everything that needs you (overdue / due payments, client-reported payments to confirm, new client messages and answers, materials to order for stages starting in the next days, client items due, stages behind, nobody checked in, team owed, start dates missing), turnover, profit, money to collect and a 12-month money in / out / profit chart. |
| `/dashboard/jobs` | Admin | Accepted quotes with status, start date, contract value, received, and what needs attention. |
| `/dashboard/jobs/[id]` | Admin | **Progress** (stage status, %, notes the client sees; status and start date move the programme and payment dates), **Photos** (upload; private until shared; favourites kept for the website portfolio; works before acceptance too), **Client** (messages, internal notes, requests / decisions with due dates, client-supplied items status, contacts & access), **Money** (payment schedule with paid / due / overdue, confirm client-reported payments, record payments, money out, profit so far), **Team** (assign workers / subcontractors by day rate or job price, days from check-ins, earned, paid, owed, pay, rate 1–10, call / WhatsApp / email, manual check-ins), **Orders** (materials per stage, reminders for stages starting soon, mark ordered / delivered, print). |
| `/dashboard/team` | Admin | Workers & subcontractors: trade, phone, email, pay basis, day rate, notes, ratings; sort by rating / price / owed; personal check-in link (copy, WhatsApp or email). |
| `/crew/[link]` | Workers | Phone page to check in / out on their sites (location saved). No account needed; a new link cancels the old one. |
| `/my-quotes/[id]` | Client | Once accepted: **project panel** – progress ring and stages, to-do (questions, items to order with ordered / delivered buttons, payments due), messages and notes, shared photos, payments (schedule, bank details, "I've paid"), contacts & access notes, quote & documents. |

**Daily automation:** call `/api/jobs/daily` each morning with `Authorization: Bearer <TAKEOFF_CRON_SECRET>`. It emails the office the day's list (to `ADMIN_EMAILS`) and reminds clients of items to order and payments due. Email needs `SMTP_URL` (or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) and `MAIL_FROM`; set `NEXT_PUBLIC_SITE_URL` so links in emails and check-in links are full addresses.

Days worked: check-in and check-out ≥ 6 hours = 1 day, less = ½ day; a check-in without check-out counts as a day and is flagged. Pay owed = days × day rate (or the agreed job price) − payments recorded to that person on that job.
