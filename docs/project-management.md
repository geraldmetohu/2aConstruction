# Project management (stage 84)

The internal workspace is `/dashboard/delivery-projects/[id]/manage`, linked from each delivery project's accepted baseline. It includes Overview, Scope, Stages, Rooms, Tasks, Schedule, Materials, Labour, Workers, Photos, Documents, Variations, Snagging, Invoices, Payments, Financials and History.

## Preservation and access

No live migration, production database write, email, payment or publication was performed during implementation. All existing tables, records, quotes and accepted delivery baselines remain unchanged.

The unapplied migration `20260929120000_add_project_management` creates only `ProjectActivity` and `ProjectAsset`, their indexes/checks and retention triggers. It does not add foreign keys to earlier tables. Both new tables reject update, delete and truncate. Project references are validated by the service before writing.

Every edit appends a typed, validated activity containing the entity ID, project sequence, actor, timestamp, reason, request ID and request hash. Current operational state is projected from the baseline plus these entries. Edits replace the current projection, never historical data. Saves lock the project and reject stale sequences. Identical retries reuse the recorded result; reusing a request ID for different content is rejected. A file and its activity are saved atomically. The UI shows the latest 100 history entries; all earlier entries remain stored and contribute to current state.

`PROJECT_MANAGEMENT_ENABLED=true` enables this stage. It is off by default. Apply additive migrations through the deployment process before enabling it. `PROJECT_CONVERSION_ENABLED` remains necessary for the delivery-project list and baseline navigation. All pages, actions, upload and file-serving routes require authenticated `ADMIN_EMAILS` access before database queries. This is an internal workspace; the customer portal is stage 85.

## Operations

- **Overview / scope:** accepted scope stays visible separately from operational changes. Progress uses task weights within stage weights, not expenditure. Empty stages do not distort overall progress.
- **Stages / rooms / tasks:** edit names, notes, weights and task progress/status. New scope tasks must reference an approved variation. Completed tasks must be 100%; planned tasks must be 0%. Completion requires predecessor tasks to be complete. A project can be completed only after all tasks and snags are complete/verified; reopen it before adding unfinished work.
- **Schedule:** task dates, worker assignment and finish-to-start predecessors. The server rejects cycles, missing predecessor schedules, duplicate schedules and date conflicts. It is a planning schedule, not an automatic resource-levelled programme. Staffing capacity and cross-project assignments require review.
- **Materials:** link accepted requirements or add a planning record, with planned/ordered/received quantities and supplier. Received cannot exceed ordered; ordered cannot exceed planned. Linked units must match the accepted unit. Customer-supplied or retained materials cannot become contractor purchase orders. Monetary material costs are entered separately under Financials, preventing quantity tracking from charging twice.
- **Workers / labour:** project worker records, trade, employment type, active flag and default hourly cost. Time entries capture same-day start/end, break and the actual hourly rate used. Overlapping worker shifts are rejected within this project. Rate changes do not reprice old entries. A void correction excludes a time entry from current hours/costs while preserving its history. Split overnight shifts at midnight. This is cost/time tracking, not payroll or wage payment execution.
- **Variations:** proposed, approved or rejected, with signed net adjustment and VAT. Approval requires approver/date/evidence and affects the contract once. Approved entries are frozen; corrections use a separate adjusting variation. Only rates from the accepted project's tax configuration are selectable; no legal VAT determination is automated.
- **Snagging:** room, task, priority, assignee, linked project photos, status and resolution evidence. Verification requires prior completion. Activity history retains the actor and completion/verification times.

## Files

New photos accept JPEG, PNG, WebP and AVIF, up to 12 MB and 40 megapixels. Sharp validates decoding, applies orientation, resizes within 1920 × 1920, removes metadata and encodes WebP. Only this optimized copy is stored; no existing original is modified. Caption, date, room, stage, task, favourite and portfolio-candidate metadata are separate history entries. Candidate flags do not publish files.

Documents accept PDF or UTF-8 plain text. Basic signature/encoding checks reject obvious type mismatches; this is not malware scanning. Downloads use attachment disposition for documents, restrictive content headers and no-store caching. Photos are viewed through the authenticated route. The upload endpoint enforces same-origin submission, a bounded request stream and project validation. File bytes are retained in the new PostgreSQL asset table with a SHA-256 hash, preserving access control without using the legacy public UploadThing routes. This increases database/backup size and should be considered when planning storage capacity. External object storage and separate thumbnail delivery can be added later without changing baseline records.

## Billing and financials

Invoices contain reviewed lines, quantities, unit net amounts and configured VAT rates. Calculations use Decimal and round each line before summing. Drafts can be revised. Issued invoices freeze their values and can only be voided with a reason after their recorded payments have been reversed. Invoice references are stable entity UUIDs. Issuing here records an internal invoice; it does not send email, generate a legal document package or move money. Stage completion never automatically issues or sends invoices.

Issued invoice totals cannot exceed the accepted contract plus approved variations. Payments record receipts already received against an issued invoice and reject overpayments or duplicate references. Partial/full payment status and outstanding balances are derived. A reversal corrects the internal receipt record; it does not perform a bank/card refund. Payments and reversals cannot be edited in place.

Financials show contract value, approved variations, invoices, receipts, outstanding/unbilled amounts, actual net costs, cost variance, hours variance and contract net less recorded costs. Non-labour costs are entered as supplier/receipt records; labour cost comes from time entries. Costs can be corrected/voided through a new history entry. These are project cost-control figures, not statutory accounts, tax filings or a forecast of final profit. Procurement, payroll, banking, email delivery and external accounting integrations are not automated.

## Verification and preview

- `npm run test:project-management`: domain invariants, financial reconciliation, authorization, image/file processing and real Prisma/PostgreSQL transactions in an ephemeral PGlite database. It compares every pre-existing record, column, constraint and index before/after migration and workflow operations, tests safe retries/stale changes, and proves a failed activity write also rolls back a new file.
- Focused TypeScript, ESLint and Prisma schema validation cover this implementation. Existing unrelated application type errors still prevent claiming a clean whole-project build.
- `node scripts/preview-project-management.mjs`: real React workspace with synthetic in-memory state at `http://127.0.0.1:4322`. No database, actual payment, email or file storage is used. Restarting discards preview state.

Next stage: a customer portal with explicit, limited projections from these internal records.
