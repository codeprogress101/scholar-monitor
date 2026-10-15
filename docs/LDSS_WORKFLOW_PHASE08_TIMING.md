# Phase 08 / B1 - Receipt timing and late-encoding decisions

Date: 2026-10-07. Receipt timing and late-encoding increment technically complete; full regression passed. B1 as a whole and human production acceptance remain open.

The [single implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md) remains authoritative. This increment implements the user's confirmed timing decisions; it does not activate managed payroll or replace membership/academic eligibility checks.

## Staff and Coordinator workflows

Staff continues receiving individual documents or a group of documents through the existing screen. Recording custody after a batch cutoff remains allowed while the semester workflow is available. No new Staff field, manual checklist-generation step or timing toggle is introduced. COR/enrollment and COG remain individual records.

In **Receive requirements -> Verification, corrections and document history -> Receipt timing by payroll batch**, each paper shows its current timing against the recorded batch cutoffs:

| Evidence | Timing result |
| --- | --- |
| No physical receipt | Missing receipt; timing not satisfied |
| Physical date and automatic recording timestamp within cutoff | Received and entered by cutoff |
| Claimed physical date on/before cutoff, automatic entry after cutoff | Coordinator evidence review required; timing not satisfied |
| Physical date after cutoff | Late; timing not satisfied for that cutoff, regardless of earlier paper or approval |
| Exact current late-encoding claim approved/rejected | Scoped approval/rejection; original dates remain unchanged |
| Missing receipt evidence or stale/ambiguous period configuration | Review required; no inferred timing satisfaction |

Cutoffs include the whole date in Asia/Manila using the exclusive boundary at the next local midnight. Physical date-only precision is preserved. A later verification date never substitutes for receipt timing. A later batch's opening date does not invalidate otherwise timely earlier semester evidence.

Coordinator selects **Review late encoding**, checks a receiving log or dated acknowledgment, and records its reference plus a decision reason. Those fields belong to the exception decision, not routine Staff receiving. Approval establishes only this document's timing for this cutoff; verification, academic compliance, membership and payout approval remain separate. Staff and System Administrator cannot decide timing.

## Preservation and controls

- Initial individual/batch receipts and resubmissions include their managed timing result in the atomic command/audit record. These observations remain unchanged when later decisions or deadlines change. Failed audits roll back the command.
- Current timing is derived from authoritative receipt/resubmission data and versioned cutoffs. Backdating a physical date alone cannot produce on-time timing when the entry timestamp is after cutoff.
- Decisions append immutable revisions tied to the exact instance, receipt/replacement source hash, batch and current deadline/window/cycle versions. Missing evidence and physically late receipts cannot receive this late-encoding approval.
- Approvals and rejections can be reconsidered by appending another reasoned decision. Expected revision/source checks and serialized transaction locks prevent competing decisions from silently replacing each other. Exact retries return the original result.
- A replacement cannot inherit an old paper's approval. Changed relevant deadline/window/cycle evidence requires renewed review if the current receipt still needs a late-encoding exception. Old decisions and original claims remain preserved.
- New timing decisions require an available open payout cycle and a draft/review batch plus an available document scope. Finalized/closed payroll is not reopened. Historical timing reads remain separate from frozen financial records, explicitly labeled as a comparison of the current document against recorded cutoffs.
- Waivers/academic findings do not substitute for physical evidence. The projection's `timingSatisfied` is a timing fact, not a financial authorization; `financialAuthorized` remains false.

## Data, API and source map

Migration `20261007030000_f36_requirement_timing_decisions.sql` adds one append-only `requirement_timing_decisions` table. It stores the source hash, immutable receipt/deadline snapshot, decision/evidence/reason, revision, actor and timestamp. Runtime grants are SELECT/INSERT only. No role permission is added or changed; commands reuse the existing Coordinator-only `payroll.windows.manage` permission for cutoff decisions.

| Source / API | Change |
| --- | --- |
| `server/requirements/timing-rules.ts` | Date-only physical/automatic timestamp classification at the Manila cutoff |
| `server/requirements/timing-service.ts` | Shared receipt/window projection, exact source hashes, append-only decisions, permissions/retries/audit transaction |
| GET `/api/v1/requirement-instances/:id/timing` | Current document timing per managed payroll window and preserved decision history |
| POST `/api/v1/requirement-instances/:id/timing/decide` | Coordinator evidence-based approve/reject; expected source hash and decision revision required |
| `server/requirements/timing-routes.ts`, `server/app.ts` | Existing authentication/CSRF/permission middleware integration |
| `server/requirements/receipt-service.ts`, `workflow-service.ts` | Atomic timing observation on individual/batch receipt and resubmission |
| `src/RequirementTimingPanel.tsx`, `ReceivingRequirements.tsx` | Collapsed per-document timing and Coordinator exception review |
| `src/PayrollSubmissionWindows.tsx` | Explain available timing review versus pending managed financial activation |
| `scripts/migration-lib.mjs`, `check-database.mjs` | Narrow grants and denied UPDATE/DELETE checks |
| `tests/receipt-timing.test.ts`, `scripts/test-requirement-timing-scenarios.ts` | Boundaries, authoritative source selection and database controls |
| `scripts/test-requirement-timing-migration-db.mjs` | Encrypted restore, interrupted-DDL retry and historical preservation checks |

Other database fixtures now expect 36 migrations; no applied migration was edited.

## Validation

- Local migration followed encrypted backup and verified isolated restore. All 96 pre-existing non-migration tables retained exact rows and historical schemas; no operational document, deadline, roster or payroll was backfilled. Local schema now has 36 migrations / 98 tables. Preservation evidence: `output/workflow-phase08/checkpoint-b1/timing-migration-local.json`.
- Focused checks passed: 280 unit tests across 49 files, lint, typecheck, build and secrets scan. Existing bundle-size advisory remains.
- Disposable MariaDB integration passed: custody after cutoff; separate results for initial/batch/replacement receipts; earlier evidence for a later window; rejected backdated claims without approval; Staff/Admin denial; required evidence; changed deadline/source rejection; append-only revisions; audit rollback; concurrent decision conflicts; safe retries; finalized-batch protection; original receipt and decision preservation; denied runtime UPDATE/DELETE.
- Playwright Coordinator approval and Staff read-only checks passed in a disposable fixture. Screenshots inspected: `output/playwright/phase08/timing-approved.png`, `timing-staff.png`; form capture: `timing-decision.png`. Browser and fixture were closed. Only the expected pre-login authentication 401 appeared.
- Full regression passed: all 41 suites, including 280 unit tests across 49 files and encrypted backup/restore. All 501 source/build hashes independently matched the tested release; all 36 migration checksums passed. Archive: `output/workflow-phase08/timing-uat/F36-report.json`. The initial gate caught an outdated 35-migration test expectation; it was corrected to 36 before this successful full rerun. Human production acceptance remains pending.

## Remaining B1 work and recovery

Timing classification and evidenced decisions are available. The reviewed/published continuing-masterlist bridge and shared authoritative eligibility integration are still pending. Managed batches remain financially disabled. Candidate queries, reservation/finalization paths and payroll previews must consume the same current timing source hashes and preserve approved snapshots before activation. The older `receiptDeadlineEnforcementEnabled: false` setup capability flag remains false until that integration is complete.

Custody after a batch cutoff does not bypass disabled/expired document scopes, archived or locked academic periods, or other existing protections. Broader after-semester-end receiving/recovery requires the planned integration; no general reopening or retroactive-payment authority was introduced. Legacy annual requirements remain on their existing workflow and need explicit reconciliation before managed timing is used. No reviewed/published membership is fabricated by this increment.

If correction is needed, disable affected managed decision paths and retain the table, snapshots, audits and applied migration. Issue a corrective release. Do not delete approvals/rejections, rewrite physical dates or restore an earlier database over subsequent operational activity.
