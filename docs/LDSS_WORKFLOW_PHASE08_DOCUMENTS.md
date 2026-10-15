# Phase 08 / B1 - Enrollment document alternatives

Subsequent update (2026-10-07): the user confirmed all three timing/membership decisions; see the [single tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) and [receipt-evidence increment](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md). Pending-question descriptions below reflect this report's original delivery state.

Date: 2026-10-07. Enrollment increment technically complete with passing full regression. B1 as a whole and human acceptance remain pending.

The [single implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains authoritative. This report records delivery evidence for the independent enrollment-document portion of B1. It does not replace the tracker or approve pending policy.

## Staff workflow

In **Scholar registry -> Receive requirements**, select the semester enrollment obligation and choose **Certificate of Registration (COR)** or **Certificate of Enrollment**. COR is the normal default; only the enrollment row needs this choice. Receive the separate COG as usual. Receiving either enrollment document leaves COG unsatisfied until its own receipt and verification.

When an enrollment document is returned for correction, choose the actual replacement type during resubmission. The initial receipt and each replacement retain their own type. Verification shows the latest actual document type and the existing scholar, placement and semester coverage. Routine reasons/references remain under optional details; no new routine free-text field is required.

This uses the same two requirement instances, automatic semester provisioning, existing status transitions, verification and academic-compliance service. It creates no generic completion flag, second enrollment obligation, annual admission history, entitlement or payroll entry. Existing coverage identity `cor` continues to mean the enrollment obligation internally; actual paper type is separately recorded. Historical definition codes and snapshots retain their original wording.

Earlier annual-record workflows without explicit semester coverage retain their existing definitions. They cannot claim the new alternative by sending a forged document type. Historical receipts with no actual-type evidence remain unclassified; nothing is inferred from a requirement's editable name. Original date-only receipt values and automatic recording timestamps remain unchanged.

## Data and source map

Migration `20261007020000_f36_enrollment_document_evidence.sql` adds `requirement_document_evidence` with instance identity, exactly one initial receipt or workflow-event reference, actual document type, actor and recording timestamp. Receipt/event uniqueness prevents duplicate evidence. Runtime has SELECT/INSERT only. Existing role permissions are unchanged.

| Source | Change |
| --- | --- |
| `server/requirements/document-evidence.ts` | Shared type validation and atomic evidence insertion |
| `server/requirements/receipt-validation.ts`, `receipt-service.ts` | Per-document type in individual and batch receiving; wrong-type rejection and transaction rollback |
| `server/requirements/workflow-validation.ts`, `workflow-service.ts` | Replacement type validation, immutable receipt details, latest actual type in verification context |
| `server/requirements/instances-service.ts`, `instances-model.ts`, `workflow-model.ts` | Typed initial receipt and replacement history without historical relabeling |
| `src/ReceivingRequirements.tsx`, `RequirementWorkflow.tsx`, `document-labels.ts` | Single enrollment choice, replacement selector, readable receipt/verification history |
| `server/continuing/compliance-engine.ts`, `semester-compliance.ts` | Enrollment-alternative wording in current blockers; existing academic rules retained |
| `scripts/migration-lib.mjs`, `check-database.mjs` | Append-only grant and denied-mutation checks |
| `tests/document-evidence.test.ts`, `scripts/test-semester-coverage-scenarios.ts` | Validation, independent COG, rollback, replacement history, permissions and retry/concurrency checks |
| `scripts/test-continuing-rosters-db.ts` | Certificate of Enrollment used in the continuing-scholar receiving/compliance fixture |
| `scripts/test-document-evidence-migration-db.mjs` | Encrypted restore, interrupted-DDL retry, checksum and historical preservation validation |

## Validation

- Local migration followed encrypted backup and verified isolated restore of the 96-table database. All 95 non-migration tables retained their exact rows; historical schemas and role policy were preserved. The local database now has 35 migrations and 97 tables. The new evidence table was empty after migration; no business records were backfilled.
- Focused checks passed: 262 unit tests across 46 files, lint, type checking, build and secrets scan. Existing bundle-size advisory remains.
- Requirement workflow database scenarios passed: Certificate of Enrollment cannot substitute for COG; an invalid mixed batch leaves neither partial receipts nor type evidence; audit failure rolls everything back; retries and concurrent resubmissions create one result; replacement type preserves the original receipt; System Administrator cannot resubmit.
- Continuing-roster integration passed with Certificate of Enrollment as the original enrollment receipt. Existing verification, academic findings, grading changes, stale review handling, corrections and eligibility preview continue using their established safeguards. This is not financial eligibility activation.
- Staff browser check passed in a disposable fixture: reopen a verified enrollment requirement, resubmit Certificate of Enrollment, see the replacement in history, send for verification, see the actual type in verification context and verify. Optional routine details stayed collapsed. Screenshots: `output/playwright/phase08/b1-replacement.png`, `b1-verification.png`; executable check: `b1-verify.js`. Browser and fixture were closed. Only the expected pre-login authentication 401 appeared. Subsequent text-only changes clarify enrollment coverage/compliance wording and are included in the final regression build.
- Full regression passed: all 40 suites, including 262 unit tests and encrypted backup/restore. All 482 source/build hashes independently matched the tested release; 35 migration checksums passed. Frozen evidence: `output/workflow-phase08/documents-uat/F36-report.json`. Human acceptance remains pending.

Preservation evidence: `output/workflow-phase08/checkpoint-b1/documents-migration-local.json`.

## Pending B1 scope and policy

The user was asked three questions while independent implementation continued. No response has yet been recorded:

1. Whether Coordinator may approve late encoding of claimed on-time physical receipt using a receiving log or dated acknowledgment, retaining an evidence reference and decision.
2. Whether continuing scholars without annual admission records should enter a reviewed/published official membership path based on the accepted continuing roster. Any implementation must extend the existing official-membership controls rather than fabricate exam/selection history or bypass publication.
3. Whether Staff may continue recording physical custody after cutoff while timing review/late status blocks eligibility for that cutoff, preserving possible later-batch consideration and closed payroll history.

At this enrollment increment's delivery, B1 still needed stronger immediately-preceding-semester validation for the managed path; receipt timing and late-encoding decisions; cutoff enforcement across receiving/resubmission; the official-membership/standing bridge; and shared authoritative eligibility/source integration. An earlier end date alone is not proof that it is the immediately preceding semester; the enrollment alternative did not resolve that gap. The subsequent [regular-coverage increment](LDSS_WORKFLOW_PHASE08_COVERAGE.md) records the new mapped-calendar validation and its limits. Follow the single tracker for current progress.

Managed batches remain setup-only. B2 candidates/preview, C entitlement allocation and D approved payroll/release remain pending. Existing waivers do not establish missing academic evidence or authorize an undecided timing exception.

## Recovery

Disable the alternative-document input/commands as a coordinated release if correction is needed, retaining the evidence table and applied migration. Do not delete receipts, replacement events or their types. Reverting blindly to code that assumes every enrollment paper is COR would misrepresent newly recorded alternatives. Preserve new evidence on historical reads and verification, and use a corrective release. Never restore an old backup over subsequent operational records merely to remove this additive feature.
