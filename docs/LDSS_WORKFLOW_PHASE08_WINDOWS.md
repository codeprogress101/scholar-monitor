# Phase 08 / Checkpoint A - Semester submission windows

Delivered: 2026-10-07. Technically complete; human acceptance pending.

This is delivery evidence. The [workflow implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains the single working plan. The user authorized Checkpoint A and confirmed sequential, non-overlapping submission windows; financial processing may overlap.

## Delivered behavior

Coordinator can map existing semester payout cycles to regular term 1 and term 2, set each semester's final submission deadline, open numbered payroll batch windows, and extend deadlines with a reason. Routine setup needs dates and the term selection, without repetitive references or decision reasons. Staff and System Administrator can view setup but cannot manage it through the UI or API. Technical administration does not confer approval authority.

Open **Payout cycles**, then expand **Semester submission windows** beneath the relevant cycle. Both regular terms must be mapped before opening a window. The existing academic year, two sequential semesters and their payout cycles must already exist; the target cycle must be open for batch windows. The setup pins academic configuration versions and blocks ambiguous multiple-cycle mappings or later configuration changes for review. Mapping corrections are not yet implemented.

Dates include the whole selected day in Asia/Manila. For example, an October 15 cutoff ends at October 16 00:00 Manila, equivalent to October 15 16:00 UTC; the comparison is exclusive at that boundary. The next batch opens on a later date than every preceding cutoff. Extensions cannot overlap another window or exceed the current semester deadline. Extending the semester deadline does not silently extend individual batches.

Submission status (Scheduled, Open, Cutoff reached) is derived separately from payroll processing status. A cutoff passing does not mark a payment released or alter a payroll event. Legacy verification, routing, payment and reconciliation retain their existing rules. Reviewed/finalized managed window histories cannot be extended. Earlier deadline values, actor, timestamp and extension reason remain available in collapsed history.

**Setup only:** Checkpoint A does not enforce receipt deadlines, generate candidates, allocate entitlements, finalize managed batches, or produce a payroll form. The API and screen explicitly indicate this. Existing payroll commands reject advancement of these managed batches until the later checkpoints are delivered. Legacy unmanaged batches remain supported. No local business deadlines, mappings or windows were guessed or seeded.

## Storage and controls

Forward migration: `20261007010000_f36_payroll_submission_windows.sql`.

| Table | Purpose |
| --- | --- |
| `regular_payout_periods` | Unique semester/canonical cycle and academic-year term mapping, pinned configuration versions |
| `semester_submission_versions` | Append-only final submission deadline and extension history |
| `payroll_submission_windows` | Existing payroll batch identity plus transactionally assigned batch number |
| `payroll_submission_window_versions` | Append-only opening/cutoff history linked to the applicable semester deadline revision |

Runtime receives SELECT/INSERT only on these tables. Only Coordinator receives `payroll.windows.manage`. Commands use the existing transaction guard, expected revisions, idempotency receipts and atomic audit writes. A failed audit insert rolls the entire command back. Numbering skips collisions with existing payroll codes; historical batches retain unknown deadlines instead of receiving invented dates. Creating another cycle for an already mapped semester is rejected.

## Source and API map

| Files | Responsibility |
| --- | --- |
| `server/payouts/submission-rules.ts` | Strict inputs, whole-day Manila boundaries, overlap/deadline validation |
| `server/payouts/submission-service.ts` | Authorized reads, mapping, numbering, extensions, immutable history, audit and retry handling |
| `server/payouts/submission-routes.ts`, `server/app.ts` | GET `/api/v1/payout-cycles/:id/submission-windows`; POST suffixes `/configure`, `/extend-semester`, `/open-window`, `/extend-window` |
| `server/authorization/policy.ts`, `scripts/migration-lib.mjs` | Coordinator permission and restricted runtime grants |
| `server/payouts/service.ts`, `server/ovr/service.ts` | Canonical-cycle and setup-only financial bypass guards |
| `src/PayrollSubmissionWindows.tsx`, `src/PayoutCyclesPage.tsx` | Collapsed setup controls, independent statuses, read-only role views and history |
| `tests/submission-windows.test.ts` | Boundary, date precision and window validation tests |
| `scripts/test-submission-window-scenarios.ts`, `scripts/test-payout-cycles-db.ts` | Disposable database permission, race, preservation and rollback scenarios |
| `scripts/test-submission-windows-migration-db.mjs`, `scripts/check-database.mjs` | Restore/migration preservation, checksums and denied history mutations |

## Validation and preservation

- Before local migration: encrypted application backup and verified isolated restore of 92 tables.
- Migration rehearsal passed partial-DDL retry and repeated application. Historical business rows and schema were preserved; only migration/permission metadata and the four additive tables changed. The local database now has 34 applied migrations and 96 tables. All four new setup tables were empty after application. No operational roster or payroll was activated.
- Focused application checks passed: 259 unit tests across 45 files, lint, type checking, build and secrets scan. Existing bundle-size advisory remains.
- Disposable database scenarios passed: Staff/Admin/unassigned denial, invalid/duplicate terms, both-term prerequisite, idempotency conflicts, concurrent numbering and extension, non-overlap, semester deadline bounds, stale revisions, audit rollback, financial bypass rejection, frozen windows, configuration drift and denied runtime UPDATE/DELETE. A synthetic cutoff changed submission status without changing the existing payroll processing event.
- Browser checks passed: Coordinator extended a semester deadline and opened a later numbered window; Staff saw the same records without mapping, extension or opening controls. Screenshots: `output/playwright/phase08/windows/coordinator.png` and `staff.png`. Browser and disposable fixture were closed. Only the expected pre-login authentication 401 was observed.
- Full regression passed: 39 suites, including 259 unit tests and encrypted backup/restore. All 476 recorded source/build hashes were independently verified; 34 migration checksums passed. Frozen evidence: `output/workflow-phase08/windows-uat/F36-report.json`. An initial run found the independent role-matrix test missing the new Coordinator permission; the expected matrix was corrected, all 168 direct permission checks passed, and the full gate was rerun successfully. No permission was broadened to satisfy that test.

Local preservation evidence: `output/workflow-phase08/checkpoint-a/migration-local.json`. Browser and database demonstration rows were confined to disposable fixtures; they are not local operational setup.

## Recovery and next checkpoint

If needed, disable the new setup entry point and commands as a coordinated release. Retain the additive tables, permission history, existing payroll identities and all recorded versions. Do not delete mappings or restore an older backup over subsequent business activity. Do not remove an already applied migration from checksum tracking.

Next is B1: enrollment alternatives, receipt timing, official-membership integration and shared authoritative eligibility. B2 supplies automatic candidates and the live draft payroll-form preview; C supplies entitlement allocation. Checkpoint A alone does not authorize the new financial workflow or production deployment.
