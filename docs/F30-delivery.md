# F30 — Dashboard

Implemented in v0.31.0. Next checkpoint: F31 audit log and event viewer.

## Behavior

Dashboard shows seven operational report cards where the signed-in account has the underlying report permission. Cards display report totals, units and status breakdowns, and open Reports with the same cycle and report selected. Totals for missing requirements and verification count documents; they are not distinct scholar counts. Payment totals count effective finalized roster entries and distinguish paid, recorded not-paid, and pending outcomes.

The selected academic year, semester, payout cycle, state, target date and refresh time are explicit. A unique available open cycle defaults automatically; multiple open cycles require selection. Historical cycles remain selectable. Refresh reads subsequent changes. Failed loads show an error, not zero totals. System Administrators receive administration shortcuts without scholarship aggregates. Unknown or unassigned roles cannot fetch metrics.

## Sources and permissions

`GET /api/v1/dashboard?cycleId=<UUID>` requires configuration read access and at least one underlying operational report permission. Each card additionally requires the permission in F29's report catalog. The response contains aggregates and scope metadata, without scholar rows or contact details. Cache-Control is `no-store`.

F29's transaction reader is shared by both endpoints. All permitted dashboard reports run within one authorization transaction under the existing configuration guard. Eligibility assessments are reused only inside that transaction, so missing-document, verification and eligibility cards do not repeat the same assessment or use a separate definition. Nothing is cached between requests; there are no dashboard counters, new tables, grants or migrations. All 28 existing migrations remain unchanged.

Existing F29 synchronous scope limits apply: scopes exceeding 1,000 source annual records, batches or masterlist versions fail explicitly. Larger deployments need background/indexed reporting. Cards and subsequently opened reports can differ if an operational write occurs between those requests; their timestamps and report fingerprints identify the read results.

## Validation

- `npm run check`: lint, **152 unit tests in 33 files**, full type checking, production build and secret scan pass.
- `npm run test:dashboard-db`: disposable MariaDB fixture verifies seven-card equality with reports, count/fingerprint equality, Staff/Coordinator access, administrator/unassigned denial, invalid scopes and absence of scholar rows. Reopening a verified document increases the missing count by one and changes the eligibility fingerprint. Later payment corrections reconcile to the same dashboard totals as reports.
- Browser: ambiguous cycle selection, card-to-report navigation retaining both filters, 390px mobile layout without page overflow, and administrator shortcuts verified. Screenshots: `output/playwright/f30-dashboard.png`, `f30-mobile.png`.
- Local health confirms F30 / v0.31.0 and database connected.

## Files

`server/dashboard/{service,routes}.ts`, shared reader in `server/reports/service.ts`, `src/DashboardPage.tsx`, dashboard registration/navigation, report hash-link selection, `scripts/test-dashboard-scenarios.ts`, existing eligibility fixture integration, `tests/dashboard.test.ts`, package script/release metadata, README and implementation plan.

Personal accounts, demo data and activation files were not changed.
