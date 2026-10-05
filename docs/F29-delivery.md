# F29 — Operational reports

Implemented in v0.30.0. F30 remains the next checkpoint.

## Delivered

- Reports navigation with two selectors: payout cycle and report. A unique available open cycle is selected automatically; ambiguous cycles require a choice. Closed and historical cycles remain available.
- `GET /api/v1/reports/operational` accepts `cycleId`, `kind`, `limit` (1–100; default 25), and `offset`. Unknown fields are rejected.
- Read-only rows, full-scope counts, explicit scope, generation time, cycle revision and deterministic content fingerprint. Stable source ordering and pagination; no manually maintained totals.
- Existing operational permissions are checked inside the report transaction. System administration does not confer scholarship access. Responses are non-cacheable and contain only fixed operational columns, without contact details, birth dates, addresses, document storage locations, authority references or audit payloads.

| Report | Scope and authoritative source | Permission |
| --- | --- | --- |
| Scholar status | Annual records in cycle academic year; includes active, inactive, terminal and unassigned status | `scholars.read` |
| Missing requirements | Cycle policy documents not generated, not submitted, returned for correction or rejected; one row per document | `scholars.read` |
| For verification | Cycle documents explicitly in `for_verification`; received/resubmitted documents are not silently sent for verification | `scholars.read` |
| Eligibility | F19 `eligibilityView`, effective overrides and `ovrEligibilityIssues` shared with roster validation | `scholars.read` |
| OVR status | Latest `ovrHistory`, `effectiveRoster`, `paymentRecords` and `reconcilePayments` | `ovr.prepare` |
| Paid and unpaid | Effective finalized roster, approved amendments and effective payment corrections; pending is distinct from recorded `not_paid` | `ovr.prepare` |
| Masterlist versions | All versions in the cycle academic year; counts exclude removed entries, matching the masterlist screen | `masterlists.prepare` |

Eligibility and OVR admission are displayed separately: effective eligibility alone does not bypass official membership, document, active-status or unresolved-override checks. Batch duplicates, locks and frozen-evidence checks still run in the actual OVR command. Reports never approve or mutate anything.

Payment names come from effective finalized roster evidence. Current scholar names may differ after a later approved change. Draft batches appear in OVR status but have no finalized payable roster.

## Consistency and limits

Each report holds the existing configuration guard for one authorization transaction, as operational writes do. It uses existing tables and domain readers; **no migration or new grants** are needed. All 28 prior migrations remain unchanged.

The content fingerprint identifies the entire ordered report, independent of page size, offset and generation timestamp. It is not a stored historical snapshot. Refresh and page changes read current data; concurrent changes between requests can change the fingerprint and totals.

Synchronous reports reject scopes exceeding 1,000 annual records, masterlist versions or OVR batches instead of silently truncating them. This bounds source processing; larger installations will need indexed/background reporting before lifting the limit. Document and payment row counts may exceed source-record counts. Eligibility reports reuse current assessments and can take longer than simple status reports.

## Validation

- `npm run check`: lint, **151 unit tests / 32 files**, type checks, production build and secrets scan passed.
- `npm run test:reports-db`: disposable MariaDB workflow fixture checks report authorization, strict scope, pagination, deterministic fingerprint, counts against SQL, exact shared eligibility checks, missing/verification rows, masterlist entry counts and absence of report writes. Repeated before and after finalization/payment corrections, including pending outcomes.
- `npx tsx scripts/test-eligibility-db.ts --amendments --reports`: passes report comparisons after approved roster amendments, alongside existing F19/F22/F24 scenarios.
- Browser: Staff navigation and all seven report selections, mobile viewport, and administrator restricted view checked using disposable accounts. Artifacts: `output/playwright/f29-payments.png`, `f29-mobile.png`.

Existing local accounts, demo records, activation files and passwords were not changed.

## Files

`server/reports/{model,service,routes}.ts`, `src/ReportsPage.tsx`, app registration/navigation, `scripts/test-report-scenarios.ts`, eligibility fixture integration, `tests/reports.test.ts`, package scripts/release metadata, README and implementation plan.
