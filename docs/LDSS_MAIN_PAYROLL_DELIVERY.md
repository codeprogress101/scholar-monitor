# Main scholar-to-payroll delivery — 2026-10-07

This is a delivery/test report supporting the [single implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md), not another implementation plan. The bounded workflow is technically validated. User operational acceptance remains pending; broader expansion is paused.

## Delivered behavior

The existing registry, published annual masterlist, academic records, semester receiving, verification, academic findings and payroll services now form one path. A published scholar can enter the semester workspace without being entered into a fictional continuing roster. The participation record cites the actual publication; it does not manufacture examination, interview, selection or notarization facts.

Staff selects a semester and receives COR **or Certificate of Enrollment**, and COG, together or separately. Each retains its own receipt, actual document type, actor, timestamp, coverage and verification. An enabled Coordinator setup supplies the two obligations automatically. Current COR/enrollment and preceding-semester COG are not regenerated for another batch in the same semester.

The existing eligibility engine evaluates published membership, active/reconciled standing, open period, current covered verification, degree category, approved grading scale, current compliant academic review, unresolved adverse findings, receipt timing, overrides and prior ordinary allocations. A named batch provides the applicable cutoff. There is no Staff “mark eligible” switch. All configured payout obligations remain checked: the cycle must use the exact covered semester definition versions; additional unsatisfied requirements cannot disappear from eligibility.

Numbered batches display live candidates and a **Draft** sample-based form. After the whole-day Manila cutoff, every unresolved timely submission requires review or an explicit Coordinator deferral. Evidence changes invalidate a deferral. Staff submits the current automatic roster for review; a different Coordinator finalizes it. Current source hashes, batch revisions, a shared transaction lock and the database's unique scholar/semester/benefit constraint protect finalization.

Finalization freezes the roster and form fields, and creates the full PHP 5,000 ordinary degree entitlement/allocation atomically with audit and retry records. Later eligible scholars appear in later batches. They are never added to a finalized batch. Profile edits cannot change the official form.

## Payroll Form

Updated 21 October 2026: new draft and newly frozen forms use `daet-sample-v2`, with exactly 20 scholars per page and the final remainder. Full names, schools and reprocessing notes wrap within their cells. Both formats share the fixed groups, page totals and continuous printed numbering. The template version participates in draft review fingerprints. Existing frozen `daet-sample-v1` forms retain the original renderer and line-budget pagination described below. No eligibility, receipt or payment data is changed by this presentation update.

Updated 8 October 2026: preview and editable Word downloads use the sample's 13 x 8.5-inch landscape paper, original embedded Daet and LDSS logos, repeated headings and a maximum of 20 students per page. Long entries use fewer rows. Printed AWARD NO runs continuously from 1 for each batch without changing stored awards or Scholar IDs. Each page ends with its student count beneath the name columns and its monetary total beneath AMOUNT. All four borderless certification/signatory blocks appear only on the final page; the footer shows academic year, semester, batch and Page X of Y. Signature/date received cells remain blank.

The user confirmed these sample names/titles, which are frozen with each payroll:

- ARIANNE ARIKA B. CARRANCEJA — Chairman, Committee on Education
- ROSSANO C. VALENCIA — Municipal Mayor
- RODANTE V. FORBES — Municipal Treasurer
- WINDILIN H. BARBADO — Disbursing Officer/Asst.Mun.Tres

Use **Download Word** beside the draft preview or official payroll button for an editable .docx file. Printable HTML remains available; disable browser-supplied headers/footers when printing it. Word embeds the logos and uses actual repeating headers and page-number fields. Draft exports retain their warning. Both formats share pagination, numbering and totals, and use the same authorized live draft or frozen official data. Export audit records include the format; downloading does not record payment. Validation evidence: [Payroll layout report](../output/payroll-layout/REPORT.md).

## Exact operational test steps

Use separate Staff and Coordinator accounts. System Administrator access alone cannot approve the scholarship, defer a scholar or finalize payroll.

1. **One-time period setup:** ensure academic year, two sequential regular semesters, school/course, and individual semester COR and COG definitions exist. Create/open the semester payout cycles with those exact definition versions. In **Payout cycles → Semester submission windows**, map both terms and set their final submission deadlines. This setup is per semester, never per student.
2. As Coordinator, expand **Document policy for published scholars (once per semester)**. Select the receiving semester, confirm its automatically proposed preceding regular semester, choose the COR/COG definitions, record the policy authority once, save and enable the reviewed setup. Accepted continuing rosters can retain their existing enabled setup. The immediately preceding term must exist in the regular calendar; term 1 needs the previous academic year's term 2.
3. Use scholars with an actual published annual masterlist membership and Active standing. In **Scholar registry → Receive requirements**, select the semester. School/course/year comes from their academic record. Record the semester degree category if still unknown. Do not create replacement qualification records for this test.
4. Receive A's enrollment paper and COG together. Receive only B's enrollment paper. Leave optional storage/reference/remarks collapsed unless useful. Open each received document and complete its separate verification. Submitted alone must not qualify either scholar.
5. Configure the approved school grading rule once as Coordinator if missing. Staff reviews A's academic findings from the verified documents: average, enrollment, required load and failed/dropped/INC findings. A needs a current Compliant result. Missing context or a stale review remains blocked.
6. Coordinator opens **PAY-001** through **Semester submission windows**, setting opening and cutoff within the semester final deadline. Open **Payroll drafts [cycle] → Open Payroll PAY-001**. A appears automatically; B has an explicit missing-document reason. **Preview current payroll (Draft)** opens the live sample form without creating an allocation.
7. After the cutoff, complete review of timely submissions or use **Defer to later batch** with a Coordinator reason. An on-time paper encoded late needs its existing evidenced timing decision; verification may occur after cutoff. Staff clicks **Submit Payroll for review**. Coordinator reviews and clicks **Finalize Payroll**. The existing separate-submitter/finalizer safeguard remains enforced.
8. Click **Open official Payroll Form**. Confirm the sample columns, selected academic year/term/batch, PHP 5,000 per row, totals, the four signatories and blank signature/date cells. Printing does not mark anyone paid.
9. Open a subsequent non-overlapping **PAY-002** window. Record/verify B's missing COG and review compliance. Existing valid semester enrollment evidence remains usable. B becomes eligible in PAY-002; A is shown as **Already allocated this semester**. PAY-001 remains unchanged.
10. Select a different semester. Earlier verification/payment is not evidence for that semester; its own obligations and review are required. Preserve the old payroll when testing subsequent profile changes.

For an immediate synthetic demonstration without waiting for actual calendar cutoffs, run `npm run test:main-payroll-db`. It uses a disposable database and simulates historical receipt/cutoff timestamps there. It does not backdate production/local operational receipts. The command writes synthetic draft/official forms and A–H results under `output/main-payroll/` and cleans up its disposable database.

## Changed implementation files

| Area | Files |
| --- | --- |
| Shared official membership and semester eligibility | `server/eligibility/official-membership.ts`, `semester-sources.ts`, `service.ts`, `engine.ts`, `model.ts` |
| Published-scholar semester workspace | `server/continuing/official-cohort.ts`, `semester-receiving.ts`, `semester-receiving-routes.ts`, `semester-setup.ts`, `semester-eligibility-preview.ts` |
| Existing payroll integration and frozen export | `server/ovr/managed-payroll.ts`, `payroll-form.ts`, `service.ts`, `model.ts`, `routes.ts`, `rules.ts` |
| Guard managed allocations from legacy release/amendment writers | `server/ovr/processing-service.ts`, `amendment-service.ts`, `payment-correction-service.ts` |
| Applicable semester definitions and window capability | `server/payouts/service.ts`, `submission-service.ts` |
| Staff/Coordinator screens | `src/ScholarRequirements.tsx`, `ContinuingSemesterSetup.tsx`, `PayrollSubmissionWindows.tsx`, `PayoutCyclesPage.tsx`, `OvrDrafts.tsx`, `PayrollCandidates.tsx`, `SemesterEligibilityPreview.tsx` |
| Migration/runtime grants | `db/migrations/20261007040000_f36_payroll_workflow.sql`, `scripts/migration-lib.mjs` |
| New regression evidence | `scripts/test-main-payroll-scenarios.ts`, `scripts/test-payroll-workflow-migration-db.mjs`, `tests/payroll-form.test.ts` |
| Existing test integration | `scripts/test-eligibility-db.ts`, `test-payout-cycles-db.ts`, `test-submission-window-scenarios.ts`, `test-workflow-foundation-db.mjs`, `check-database.mjs`, migration-count expectations in existing isolated DB suites, `package.json` |
| Documentation | This report, `README.md` and the single workflow tracker |

These changes are in addition to the uncommitted work already present before this task. Existing F00–F36 function numbers and historical migrations were retained.

## Migration and preservation

Migration **37**, `20261007040000_f36_payroll_workflow.sql`, extends participation provenance with `official_masterlist`, adds immutable deferral and entitlement-to-payroll allocation links, and widens the existing `ovr_entries` primary key to permit several scholars in one reviewed batch revision. It reuses `semester_entitlements` and its unique semester-benefit constraint; it does not create a second batch or eligibility system.

Before local application, an encrypted backup was restored and verified, the migration and repeated DDL were tested on that restore, and all pre-existing business-table row hashes/counts were compared. All rows in **97 business tables** were preserved. Only declared schema extensions changed. No business backfill, deletion/reset, shared MariaDB system-table repair, or application restart was performed. Evidence: `output/main-payroll/migration-local.json`.

## Validation results

- `npm run check`: passed lint, 283 unit tests in 50 files, TypeScript checks, production build and secret scan. Existing Vite bundle-size advisory remains.
- `npm run test:main-payroll-db`: passed A–H scenarios and existing eligibility regressions in a disposable database. Includes separate COR/COG receiving, Certificate of Enrollment, missing COG, compliant academic review, historical on-time custody verified after cutoff, explicit deferral, multi-member snapshots, official export, no payment created by export, later-batch completion, duplicate-constraint rejection, cross-semester isolation, role denial, stale hashes, audit rollback, simultaneous requests and idempotent retry.
- `npm run test:continuing-rosters-db`: passed existing roster, semester, academic compliance, predecessor and receipt-timing regression scenarios.
- `npm run test:payout-cycles-db`: passed existing cycle and submission-window scenarios, including the deliberate extension allowing applicable semester definitions in payout policy.
- Migration preservation and retry checks: passed and applied locally.
- Browser checks passed for automatic candidates, hidden manual-add controls, cutoff gating, preserved frozen form, and published-scholar receiving with year level and distinct COR/COG coverage. The earlier non-authoritative readiness comparison now points managed semesters to the actual batch candidates.
- Print checks passed for the 13 ? 8.5 inch single-page official sample and a 21-recipient multi-page fixture, including numbering, per-page totals and all certification blocks on their respective pages.
- Final `npm run test:uat`: **43 suites passed**, including 283 unit tests, build/type/lint/secret checks, database workflows, backup/restore and migration checks. The gate verified 368 source files, 148 build artifacts and 37 migration records. Archived report: `output/main-payroll/F36-report.json`.
- `git diff --check`: passed. No application restart or unrelated phase expansion was performed.

## Remaining limitations and stop point

- Broader phase expansion remains paused. This delivery ends at the official Payroll Form. Allocation-aware actual release, routing and amendments for new numbered batches remain server-guarded; historical legacy processing continues. No payment is inferred from approval or export.
- Names-only continuing rosters without published annual membership still need their publication bridge. The implementation never fabricates admissions or bypasses masterlist approval.
- Existing annual-owned checklists for the same semester are preserved and reported for explicit reconciliation. They are not silently converted, copied or overwritten. Choose a correctly configured semester without conflicting legacy ownership when testing the new path.
- Non-degree benefits, first-college-semester admission-grade alternatives, and new retroactive entitlements after semester end remain outside this delivered policy. Missing or conflicting records fail closed with reasons.
- A cycle's frozen payout definitions must match its covered semester obligations. A pre-existing cycle using different legacy definitions requires explicit reconciliation; similar document names alone do not establish equivalence.
- The supplied form has year columns I–V. Unrecognized/out-of-range year levels require record/policy review. Award numbers remain blank if absent; Scholar IDs are not substituted.
- The four confirmed signatories are versioned within each frozen form. A future configuration/editor for changing officials is outside this task; a later authorized change must preserve previous snapshots.
- Automated results are not human acceptance or production readiness. Stop after the bounded workflow's final checks and report; do not continue to unrelated enhancements.
