# Phase 08 / B1 - Regular-semester COG coverage

Subsequent update (2026-10-07): the user confirmed all three timing/membership decisions; see the [single tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) and [receipt-evidence increment](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md). Pending-question descriptions below reflect this report's original delivery state.

Date: 2026-10-07. Regular-coverage increment technically complete with passing full regression. B1 as a whole and human acceptance remain pending.

The [single implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains authoritative. This report records the regular-predecessor increment after the enrollment-document alternatives; it does not approve pending timing or membership policy.

## Working behavior

For semesters explicitly mapped to regular payout periods in Checkpoint A, Coordinator semester setup automatically selects the COG coverage:

- Second semester uses the mapped first semester of the same academic year.
- First semester uses the mapped second semester of the immediately preceding configured academic year.
- Missing/stale mappings, nonconsecutive or overlapping academic years, overlapping/intervening semesters and summer/irregular calendars require review. An arbitrary earlier end date is insufficient.

The annual start-year check is a restriction of this regular-calendar implementation, not a claimed ordinance requirement. Other calendars need an explicit supported policy before activation. Unmapped legacy setups retain their existing reviewed coverage path; they are not silently converted into regular periods or financially authorized.

The Coordinator sees the automatically selected predecessor or a specific review message. Saving/enabling requires the same current calendar source hash. A changed selection or calendar is rejected instead of silently replacing coverage. Disabling remains available. No new Staff input or checklist-generation step is added.

The shared backend check protects semester provisioning and managed COG receipt, batch receipt, resubmission, verification and waiver paths. Current enrollment coverage and individual COR/Certificate of Enrollment evidence remain separate. Verification records the regular-calendar source hash. Waivers cannot make a wrong predecessor valid or supply missing academic evidence.

## Historical preservation and limits

Existing documents, receipts, workflow events and setup versions are not moved or rewritten. An older exact verification without the newly introduced calendar hash remains valid when its current identity, placement and coverage still match. The added calendar evidence changes the academic-compliance source hash, so a prior assessment becomes stale and requires a fresh review; it does not require a fabricated replacement receipt. New verifications bind to the current calendar hash.

An existing saved predecessor that conflicts with its regular mapping blocks the affected managed path. This increment does not implement automatic remapping, mapping correction or historical reconciliation. Review and a separately designed correction path remain necessary. New first-year admission alternatives, irregular calendars and unresolved waiver rules are not inferred.

No migration, grant, role change or local operational business-data edit was made. The existing 35 migrations remain unchanged. Managed financial creation remains disabled; these checks do not establish on-time receipt, official membership, entitlement or payout approval.

## Source and data map

| Source | Responsibility |
| --- | --- |
| `server/continuing/regular-coverage.ts` | Shared regular-sequence resolver, configuration validation and source hash |
| `server/continuing/semester-setup.ts` | Options, setup/save and enable/recovery validation; saved policy evidence |
| `server/continuing/semester-receiving.ts` | Guard automatic provisioning without changing Staff steps |
| `server/requirements/semester-context.ts` | Shared managed COG coverage validation |
| `server/requirements/workflow-{service,model,validation}.ts` | Verification context, expected hash and immutable verification evidence |
| `server/continuing/semester-compliance.ts` | Preserve compatible old verification while invalidating stale academic assessment |
| `src/ContinuingSemesterSetup.tsx`, `SemesterAvailability.tsx`, `RequirementWorkflow.tsx` | Automatic coverage, review messages and source validation |
| `tests/regular-coverage.test.ts` | Within/across-year sequence, missing/stale/conflicting calendars and hash behavior |
| `scripts/test-regular-coverage-scenarios.ts`, `test-continuing-rosters-db.ts` | Integrated guards, rollback/retries, preservation and disposable browser fixture |

Existing tables supply the evidence: `regular_payout_periods`, `semesters`, `academic_years`, semester setup/policy versions, scholar-semester revisions, individual requirement coverage, receipts/workflow events and academic assessments. No new table is needed; source evidence is appended through existing versioned policy/verification records and atomic audits.

## Validation

- Focused checks passed: lint, type checking, 270 unit tests across 47 files, build and secrets scan. Existing bundle-size advisory remains.
- Disposable MariaDB integration passed: correct options/context; rejection of wrong coverage through individual/batch receipt, resubmission and waiver; stale setup/verification hashes; changed configuration; provisioning and recovery guards; audit-failure rollback and idempotent retries.
- Preservation checks confirmed original coverage and workflow histories remain intact. Introducing a valid regular mapping retains compatible document verification and makes the prior academic assessment stale. Explicit correction/resubmission remains independently supported with appended evidence.
- Playwright Coordinator check passed: automatic first-semester selection for a mapped second semester, no manual predecessor dropdown, successful disabled-setup save, and readable conflicting-calendar warning. Screenshots: `output/playwright/phase08/coverage-automatic.png`, `coverage-saved.png`, `coverage-ambiguous.png`. Checks used a disposable database; browser and fixture were closed.
- Full regression passed: all 40 suites, including 270 unit tests across 47 files and encrypted backup/restore. All 486 source/build hashes independently matched the tested files; 35 migration checksums passed. Frozen evidence: `output/workflow-phase08/coverage-uat/F36-report.json`. Human acceptance remains pending.

## Remaining work and recovery

B1 remains in progress. The three pending questions concern documented late encoding, continuing official membership and custody recording after cutoff. Receipt timing, cutoff enforcement and shared authoritative financial eligibility still need implementation before B2/C activation. No unanswered policy is treated as approved.

If a defect is found, preserve all recorded calendar hashes, policy versions and verification evidence and issue a corrective release. Do not remove checks to bypass a conflicting calendar, rewrite receipts or restore an old operational database over newer work. Keep affected managed setups disabled during reconciliation. There is no migration to reverse.
