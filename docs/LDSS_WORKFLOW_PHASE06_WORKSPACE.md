# Phase 06 - Semester workspace progress

Started: 2026-10-06. Technical integration review completed: 2026-10-07. Phase 06 receiving acceptance gate passed; human operational acceptance remains pending. Earlier increment notes below are historical. See [final integration review](LDSS_WORKFLOW_PHASE06_ACCEPTANCE.md) for the current conclusion.

## First increment

- `src/ScholarRequirements.tsx` now loads the accepted continuing baseline alongside annual records. An accepted continuing scholar without an annual record sees an explicit pending semester-receiving notice instead of instructions to create an application record.
- Existing annual-record receiving displays year level, school and course for the selected academic year. The direct academic-record action keeps that year as context.
- `src/ScholarAcademicSummary.tsx` supports a fixed academic year without another selector. Its existing profile selector remains available. Reloading requirement years also refreshes the academic summary.
- No database migration, permissions, business records, receipt rules or historical records changed.

## Remaining implementation

The database supports semester-owned checklists, verification resolves their explicit coverage separately from legacy annual ownership, and Coordinator setup can save disabled policy scopes for accepted rosters. Application provisioning still requires an annual scholarship record. An accepted continuing roster must not be converted into fabricated examination or qualification history to satisfy that remaining dependency.

Next increment must provide semester provisioning, connect checklist/history readers and the Staff workspace, and handle historical placement resolution. Controlled scope enable/disable now exists. Preserve receipt transactions, period locks, idempotency and individual document history. Policy/scope versions have append-only access; scholar-semester records, revisions and document coverage still have SELECT access only.

Do not mark Phase 05 integration or Phase 06 complete until continuing scholars can actually receive documents through that path. Current notices do not establish compliance or eligibility.

## Second increment - retain receiving context

- `src/ScholarsPage.tsx` remembers each scholar's selected annual record and receiving period while the registry remains mounted. Visiting academic records and returning to receiving restores that context. This is in-memory navigation state, not persisted personal data or a saved receipt draft.
- `src/ScholarRequirements.tsx` restores the saved context and requires an explicit academic-year choice if the saved annual record is unavailable.
- `src/ReceivingRequirements.tsx` and `src/receiving-selection.ts` preserve explicit period choices. A stale choice no longer falls back to a different preferred period and provisions that other checklist. Staff sees a blocker and can choose an available period.
- The receiving page shows one year-level panel, scoped to its selected year; the independent profile selector is hidden while receiving is open.
- Unsaved document selections and custody notes are not retained across tab navigation. No backend, permissions or database changes were made in this increment.

The dependency review confirms that receipt and waiver services already obtain locks from the checklist semester, while verification additionally joins the annual scholarship record. The forthcoming ownership migration must handle that join and explicit document coverage together, rather than supplying a fabricated annual qualification.

## Third increment - compatible checklist ownership

Applied `20261006030000_f36_semester_checklist_owner.sql` locally after encrypted backup and verified restore:

- `requirement_checklists.scholarship_record_id` becomes nullable; new nullable `scholar_semester_id` provides an alternative owner. A CHECK requires exactly one owner.
- A composite foreign key requires the owner to belong to the checklist's semester. A unique owner/context index prevents duplicate semester checklists.
- Semester-owned checklists cannot attach to legacy payout cycles. Future entitlement integration must be implemented explicitly.
- All old checklist column values, counts and other business records were preserved. No annual records, receipts, policy approvals, semester records or grants were fabricated or created.
- Existing migration checksums remain unchanged. Exact migration-count checks now expect 32 migrations. Added `scripts/test-semester-checklist-db.mjs` and its npm command to the full acceptance gate.

This is a compatibility prerequisite, not an enabled continuing-receiving endpoint. Semester provisioning, coverage-aware verification and the Staff UI connection remain unfinished. Existing services continue to use annual ownership.

Validation: restored-copy partial/full DDL retry, preservation, missing/dual/invalid owner, wrong semester, legacy payout exclusion and duplicate-owner checks passed. Synthetic probes were rolled back. Local application and the final 38-suite UAT passed, including 190 unit tests and encrypted backup/restore. Evidence: `output/workflow-phase06/semester-bridge-local.json` and `output/workflow-phase06/validated-uat/F36-report.json`. Frozen source/build hashes were independently verified after the gate. No additional browser test was needed for this schema-only increment.

Recovery: keep the additive migration in place; existing annual-owner services remain compatible. Do not drop the new ownership column or restore an old backup over subsequent operational work. Once semester-owned records are introduced, recovery must preserve them through a forward corrective migration. Human production acceptance remains pending.

## Fourth increment - coverage-aware document processing

Implemented `server/requirements/semester-context.ts` and integrated it with verification, receipt and waiver services. Legacy annual-owner processing is preserved. Semester-owned actions require an enabled, current scope, an accepted participation decision, a semester revision and explicit document coverage. COR must cover the receiving semester; COG must match the recorded predecessor and end before the receiving semester starts. Missing, unsupported or conflicting coverage blocks processing.

Verification reads the academic record for the document's covered academic year, not necessarily the receiving year. A placement change effective after the COG period blocks verification for historical-placement review. No missing history is manufactured. Full historical placement resolution, first-year admission-grade alternatives and the creation of authorized scopes/semester records remain pending.

Verification requests include coverage identity and semester revision, so changed context must be reloaded. Immutable verification events preserve document coverage and receiving semester separately; receipt audit details identify the semester owner. The verification display labels document coverage separately from receiving context.

Runtime gains SELECT only on `scholar_semesters`, `scholar_semester_revisions`, `requirement_coverage`, and `workflow_scope_versions`. No role permission, new schema migration, INSERT/UPDATE/DELETE access on those tables, production scope activation or operational data creation is included. New semester records cannot yet be prepared from the Staff UI.

Targeted disposable-database coverage checks passed for prior-year school placement, separate COR receipt, missing/conflicting coverage, stale verification, snapshots, Admin denial and scope disabling across verification/receipt/waiver. The first full check caught a TypeScript type error in the new fixture helper; it was corrected before the final run. The final 38-suite acceptance gate passed, including 193 unit tests, database regression, runtime grant checks and encrypted backup/restore. Evidence: `output/workflow-phase06/coverage-uat/F36-report.json`; all recorded source/build hashes were verified after completion. No browser acceptance is claimed for the unconnected semester workspace.

Recovery: retain the schema bridge and disable new scopes if later enabled; do not delete coverage or event evidence. Legacy paths remain compatible. Human production acceptance is separate from automated validation.

## Fifth increment - Coordinator semester setup

Open **Continuing scholars**, then an **accepted roster**, to view Semester setup. A Coordinator chooses the receiving semester, preceding completed semester, and distinct applicable COR/COG definition versions. Authority issuer/reference and the document-policy source are recorded once for the roster/semester with an explicit review confirmation. Staff can view this record but cannot authorize it. These fields are not added to routine document receiving.

The service atomically appends authority, policy, disabled scope, audit and idempotency evidence. It rejects unaccepted rosters, duplicate setup, stale receiving-semester configuration, wrong coverage, unavailable periods, nonapplicable definitions, forged activation fields and unauthorized roles. A retry returns the original result. Saving setup creates no individual semester records, receipts, qualification history, compliance findings or entitlements.

Changes: `server/continuing/semester-setup.ts`, `semester-setup-routes.ts`, application registration, `src/ContinuingSemesterSetup.tsx`, continuing-roster integration, authorization catalog and migration/grant/test updates. Migration `20261006040000_f36_semester_setup.sql` grants `semesters.configure` to Coordinator only. Runtime gains SELECT/INSERT on policy and scope versions; UPDATE/DELETE remain denied. There are now 33 migrations.

Local migration evidence: `output/workflow-phase06/setup-migration.json`. An encrypted backup and verified restore preceded migration testing on the restored copy and local application. Existing business data/schema stayed unchanged; expected additions were one permission, one Coordinator role grant and one migration-history entry.

Targeted validation: five continuing-roster database scenarios passed, including new setup authority, rollback/retry and disabled-state checks. Browser checks saved setup as Coordinator and confirmed Staff has no authorization form, using a disposable database subsequently removed. Evidence: `output/playwright/phase06/setup-check.js`, `setup-staff-check.js`, `setup-coordinator.png`, and `setup-staff.png`. Application checks passed with 193 unit tests. Final validation recorded on 2026-10-07: all 38 UAT suites passed, including backup/restore, and all recorded source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/setup-uat/F36-report.json`. Human production acceptance remains pending.

Limitations: setups are disabled and immutable in this increment; there is no activation or correction action yet. Provisioning and the Staff receiving connection remain pending, so the Phase 06 acceptance gate is not complete. Do not edit setup rows directly to activate or correct them. Recovery preserves the forward migration and recorded setup evidence; disable entry points or apply a forward fix rather than deleting history or restoring over later operational work.

## Sixth increment - controlled setup availability

Coordinator can enable or disable the current setup revision from the accepted-roster screen. Enabling requires a review confirmation and revalidates roster acceptance, recorded authority, current semester dates/version, predecessor version/coverage, policy dates and applicable pinned document definitions. No repeated authority-reference entry is required. Disabling requires a reason and remains possible even when configuration has changed or the period has closed.

Each action atomically appends a scope revision, audit record and retry result. Old scope rows are unchanged. Stale requests and concurrent competing changes cannot overwrite one another. Staff and System Administrator cannot change availability. The UI presents current revisions first and collapses old revisions under **Setup history**.

No migration, new permissions or operational data changes were needed. Enabling setup does not create student semester records, requirements, receipts, compliance findings or entitlement. Staff provisioning remains unavailable. Reactivation after individual semester records exist is blocked for controlled recovery review, preventing a new scope revision from silently stranding or reinterpreting those records. No operational scope was enabled during this implementation; activation tests used a disposable database.

Targeted checks: all six continuing-roster scenarios passed, including audit-failure rollback, safe retries, stale-version rejection, concurrent disable, invalid document policy and used-scope reactivation blocking. Browser checks verified enable/disable and preserved revision history; the final presentation was checked with collapsed and expanded history. Evidence: `output/playwright/phase06/availability-check.js`, `availability-collapsed.yml`, `availability-expanded.yml`. Fixture and browser were closed. Final validation on 2026-10-07: all 38 UAT suites passed, including 193 unit tests and encrypted backup/restore. Recorded source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/availability-uat/F36-report.json`. Production acceptance remains pending.

Recovery: use the audited disable action to stop new scoped document actions. Preserve original scope, policy and event rows. Do not directly update ownership pointers or reactivate scopes with existing semester records until a controlled recovery path is delivered.

### Earlier validation results

First increment: `npm run check` passed with 188 unit tests.

Second increment: `npm run check` passed with 190 unit tests, lint, TypeScript, production build and secrets scan. Two regression tests exercise explicit historical choices and stale/ambiguous period resolution. All seven `test:receiving-db` scenarios passed in a disposable database. Browser checks passed for academic-navigation context retention, a single year-level panel and stale-selection blocking with zero fallback provisioning calls. Evidence: `output/playwright/phase06/context-check.js`, `retained-period.png`, `stale-period.png`. The browser and disposable fixture were closed afterward. Full UAT was not rerun; Phase 05 frozen evidence remains specific to its earlier candidate.

Recovery: revert only the respective increment's UI/helper changes and its new tests, preserving earlier edits to shared files. No schema or data rollback is needed.

## Seventh increment - automatic continuing-semester receiving

Implemented on 2026-10-07. Staff opens **Scholar registry -> scholar -> Receive requirements**. For an accepted continuing baseline with one current enabled setup, the system prepares the semester and separate COR/COG records automatically. No annual qualification record or repeated admission evidence is required. Multiple or stale period selections still require an explicit choice. Existing annual requirements remain accessible through **Earlier annual records**; attempts to create a second ownership path for the same scholar/semester are blocked.

COR is explicitly linked to the receiving semester and COG to the setup's preceding completed semester. Each starts Not Submitted. Receiving COR alone leaves COG unchanged. Date received defaults to today; custody reference, storage and remarks remain optional. Receipt, verification, correction, resubmission and waiver actions reuse existing services. The selected year's academic summary and academic-record link remain visible, and missing verification placement identifies the document's covered academic year.

Provisioning appends a semester owner, initial revision, checklist, individual instances, coverage, audit and retry result in one transaction. Concurrent requests reuse the same records. Missing category, enrollment, full load, school/course and year level remain unknown rather than inferred. Existing formal non-active status blocks preparation, with the final-semester graduation exception preserved; complete semester graduation handling remains Phase 10 work. No compliance result, payout entitlement or release is created.

Changes: `server/continuing/semester-receiving.ts`, its routes/application registration, shared checklist reading, legacy/new ownership collision protection, coverage/error DTOs, and receiving/academic navigation screens. Runtime now has SELECT/INSERT on `scholar_semesters`, `scholar_semester_revisions`, and `requirement_coverage`; UPDATE/DELETE remain denied. Applied these grants locally with `npm run db:migrate`; all 33 migration checksums verified and no new migration was needed. Operational roster scopes were not activated and no operational scholar records were provisioned by this work.

Authority and policy validity are rechecked when provisioning or processing semester documents. Disabled/superseded scopes expose preserved checklists as read-only. New automatic preparation is limited to current receiving periods. Calendar passage alone does not impose a new correction deadline on existing documents; configured locks, scope availability and authority validity still control actions. This does not authorize reopening closed payroll or retroactive payment.

Targeted validation: seven disposable-database roster scenarios passed, including audit-failure rollback, expired authority, duplicate/concurrent preparation, independent COR receipt, unknown-data preservation, missing academic context, role denial and disabled-scope history. Application checks passed with 193 unit tests. Staff browser checks confirmed automatic preparation without annual admission, independent document statuses, one academic summary and navigation to academic records. Evidence is under `output/playwright/phase06/provision-*`. All 38 regression suites passed, including 193 unit tests, runtime grant checks and encrypted backup/restore. All 423 recorded source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/provisioning-uat/F36-report.json`. The browser and disposable fixture were closed and cleaned up; verification blocked missing academic data while preserving receipt.

Remaining Phase 06 work: capture/version semester academic context and program category, complete actionable review/recovery paths, and test successive-period preparation without changing prior evidence. The overall Phase 06 acceptance gate and human production acceptance remain open.

Recovery: disable the affected roster's semester setup through the audited Coordinator action. Preserve all appended records and grants needed to read them. Used scopes cannot be re-enabled until controlled recovery is implemented; do not rewrite scope pointers or restore an older database over later work.

## Eighth increment - semester academic context and successive-period preservation

Implemented on 2026-10-07. **Receive requirements -> Semester academic details** is collapsed during normal receiving. Staff can record an unknown program category using one selection. The existing authoritative academic record supplies school, course and year level; these are not retyped or silently changed. Saving appends a semester revision with academic-record/version provenance and an atomic audit. The initial unknown revision stays readable. Repeating an unchanged save produces no extra revision; uncertain retries return their original result.

When preparing a later semester, a known program category carries forward only from the explicitly recorded predecessor and only for the same course. Its source semester/revision is stored in the snapshot. Year level is reused from the relevant academic record and never incremented by the calendar. Changed courses and previously recorded category changes require controlled review; this routine form cannot approve them. Enrollment, full load and normalized numeric year level remain unknown until their appropriate evidence/review workflow records them. No compliance or entitlement is inferred from these details.

Backend changes: `server/continuing/semester-academic.ts` and scholar/semester `academic-context` GET/POST routes; preparation now preserves same-course category provenance. UI: `src/SemesterAcademicDetails.tsx` inside the receiving workspace. `academic.edit` is reused for Staff/Coordinator capture. System Administrator has no scholarship authority. Runtime gains SELECT only on `semester_review_events` and `semester_entitlements` to prevent upstream edits once dependent records exist. All 33 migrations remain unchanged; local grants applied through the migration runner, with checksums verified. No operational setup activation, academic backfill or business-record mutation was performed.

Mutations reject stale semester or academic versions, unavailable/locked scopes, placement effective after the semester/in the future, category changes, and semesters already carrying a review or entitlement. Arbitrary placement fields cannot be submitted through the context endpoint. Existing approved placement-change workflows remain authoritative. Corrections to an established category and recovery of disabled scopes with existing records still need controlled resolution; they are deliberately not implemented as direct edits.

Validation: eight disposable roster scenarios pass. New checks exercise missing academics, actual context capture, immutable revision history, audit-failure rollback, retry conflicts/no-op saves, stale placement/revision, role denial, changed-course/category blocking and dependent-entitlement protection. A simulated successive semester starts with two unsubmitted documents and no copied receipts; the old checklist and academic history compare equal before and after. Same-course category provenance carries forward without manufacturing grades, admission records or eligibility. The simulation changes dates only inside the disposable fixture.

Browser checks use the Playwright skill. Staff sees Second year, school and course, the carried-forward category, separate next-semester COR/COG coverage, and preserved read-only earlier revisions. An unchanged save confirms that details are already recorded. Evidence: `output/playwright/phase06/academic-check.js`, `academic-history-check.js`, `academic-current.png`, `academic-preserved.png`. Application checks pass with 193 unit tests. All 38 regression suites passed, including 193 unit tests and encrypted backup/restore. All 427 source/build hashes verified; frozen evidence: `output/workflow-phase06/academic-context-uat/F36-report.json`. A Windows text-encoding issue in the history browser test was corrected and that check rerun successfully. Both browser fixtures were closed and their disposable databases cleaned up.

The core Phase 06 acceptance checks now pass: COR-only receipt leaves COG alone, and next-period preparation preserves earlier evidence. The phase remains In progress for complete controlled-review/recovery and final usability follow-ups. Phase 07 will add grade/enrollment/load assessment; Phase 08 will derive entitlements. Existing F00-F36 payout, reporting and audit paths remain supported, but they do not constitute delivery of the new semester policy path.

Recovery: disable the affected setup through the Coordinator action and preserve all revisions. Apply a forward correction; do not replace old snapshots, delete category provenance, or reactivate a used scope by rewriting its pointers. Human production acceptance remains pending.

## Ninth increment - Coordinator category recording-error correction

Implemented on 2026-10-07. In **Receive requirements -> Semester academic details**, a Coordinator can choose **Correct recorded category**. The exceptional form asks for the corrected category, the reason for the recording error, its supporting evidence reference, and confirmation that the course itself has not changed. Routine receiving and initial missing-category capture gain no mandatory inputs. Staff can read the correction history and are directed to the Coordinator; System Administrator technical access does not authorize the correction.

The endpoint uses the existing `academic.changes.approve` permission. It appends a semester revision with the unchanged academic placement and correction provenance, an atomic audit, and the retry result. The original category, actor and snapshot remain in history. A corrected inherited category no longer claims the predecessor as its current category source; the original inherited source remains in the preceding revision. Ordinary unchanged saves retain the correction evidence without creating another revision.

This corrects a recording mistake; it is not approval of a non-degree-to-degree shift or any course change. The service rejects changed/stale academic placement, unavailable/locked scope, unknown category, unchanged category, missing reason/evidence/review confirmation, existing academic review/entitlement, and a category already copied into another semester. Dependent records require coordinated review, not silent propagation. Those cases and used-scope recovery remain open follow-ups.

Changed files: `server/continuing/semester-academic.ts`, `semester-receiving-routes.ts`, `src/SemesterCategoryCorrection.tsx`, `SemesterAcademicDetails.tsx`, `ReceivingRequirements.tsx`, and the synthetic category/academic test helpers. There is no new migration, permission grant, runtime privilege or operational data change. Existing 33 migrations remain unchanged.

Targeted checks passed for Staff/Admin denial, required evidence, stale versions, locked/dependent records, audit-failure rollback, concurrent requests with one winner, exact retries/conflicts, original-revision preservation, unchanged placement/findings, and routine-save compatibility. Browser checks saved a correction as Coordinator and verified history with both categories/references; Staff had no correction action. Evidence: `output/playwright/phase06/category-correct.js`, `category-staff-check.js`, `category-corrected.png`, and `category-staff.yml`. The browser and disposable fixture were closed. Application checks passed with 193 unit tests. All 38 regression suites passed, including 193 unit tests and encrypted backup/restore. All 429 recorded source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/category-correction-uat/F36-report.json`. Human production acceptance remains separate.

Recovery: retain the appended correction, original revision, audit and command evidence. A further recording error can be corrected through a new authorized revision only while the same safeguards hold. For dependent or unavailable scopes, stop and use the forthcoming controlled reconciliation/recovery flow; do not overwrite snapshots or restore an older database over later work. Human production acceptance remains pending.

## Tenth increment - controlled recovery of used semester setups

Implemented on 2026-10-07. In **Continuing scholars -> accepted roster -> Semester setup**, the Coordinator now sees **Recover semester setup** when a disabled setup has existing scholar semester records. The screen shows the affected record count and requires a recovery reason and explicit confirmation of review. The ordinary enable action still rejects used setups. Staff and System Administrator cannot recover them.

Recovery rechecks roster acceptance, authority dates/scope, current semester and predecessor versions, open/unarchived period, applicable pinned document definitions, and the affected-record count. Every affected owner must retain accepted participation and match the same authority, document policy, predecessor and checklist semester version. Individual COR/COG definitions and explicit coverage must match. Academic reviews or entitlements block recovery for coordinated dependent-record review.

A successful command atomically appends an immutable policy revision carrying explicit recovery provenance and the authorized original scope IDs, an enabled scope revision, an audit and an idempotency result. Document rules and authority are retained. Original scholar ownership pointers, semester revisions, checklists, coverage, receipts and decisions are not changed. Shared scope checks allow those explicitly authorized original owners to resume under the latest enabled scope. Subsequent disabling blocks them again; repeated recovery revalidates them. This grants no payout entitlement and reopens no payroll.

Changes: `server/continuing/semester-recovery.ts`, `scope-access.ts`, setup service/routes, receiving and academic services, document-context guard, and `src/SemesterAvailability.tsx`. The setup read model now supplies affected counts. Existing policy/scope/command/audit structures and Coordinator permission are reused. No migration, role change, runtime privilege change or operational recovery was performed; all 33 migrations remain unchanged.

Tests: `scripts/test-semester-recovery-scenarios.ts` is included in the existing continuing-roster suite. It covers role denial, missing confirmation/reason/count, stale revision/count, inconsistent coverage, locks, entitlement dependency, audit-failure rollback, concurrent requests with one winner and safe retries/conflicts. It compares original owners, academic revisions and coverage before/after recovery, verifies duplicate preparation is avoided, resumes COR receiving, disables it again, and recovers a second time without changing the saved receipt. The final disposable fixture leaves a disabled used setup for browser testing.

Browser checks recovered that setup as Coordinator, preserved the previously received COR, and received the outstanding COG as Staff. An ambiguous text selector matching hidden historical rows was corrected in the test script; the completed recovery and Staff flow were then verified. Evidence: `output/playwright/phase06/recovery-check.js`, `recovery-continue.js`, `recovery-enabled.png`, `recovery-staff.png`. Browser and fixture were closed. Application checks passed with 193 unit tests. All 38 regression suites passed, including 193 unit tests and encrypted backup/restore. All 434 recorded source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/scope-recovery-uat/F36-report.json`. Human production acceptance remains pending.

Remaining limitations: recovery is limited to the current open semester under unchanged document policy, without dependent reviews/entitlements. It does not approve changed policy/course rules, reopen ended or locked periods, or reconcile financially dependent records. These remain blocked for their future controlled workflows. Phase 06 final integration/acceptance review remains open; Phase 07 compliance follows.

Recovery of this release: use the normal audited disable action to stop resumed document work while preserving all records. Retain recovery policy/scope history. Do not rewrite original scope IDs or drop records to make reactivation succeed. An older application will treat original owners as unavailable after recovery, so use a forward fix rather than silently restoring old source/database state over operational work. Human production acceptance remains pending.


## Final technical integration review - 2026-10-07

Phase 06 meets its receiving acceptance gate. Existing evidence was independently rechecked before Phase 07 changes: all 38 suites passed and all 434 frozen source/build hashes matched. COR-only receiving leaves COG unchanged; automatic successive-semester preparation preserves old checklists, receipt events and placement/category revisions. Staff has direct period-aware academic navigation and separate verification/correction history. No repeated admission or manual checklist-generation step is needed for accepted continuing scholars.

The [acceptance matrix](LDSS_WORKFLOW_PHASE06_ACCEPTANCE.md) records the exact boundaries. Used-scope recovery after dependent reviews/entitlements, policy/course changes and ended/locked-period recovery remain controlled follow-ups; they are not bypassed to declare acceptance. Phase 07 adds academic findings beside this accepted receiving path. This technical review does not provide human production sign-off.
