# Phase 07 - Academic compliance delivery

Date: 2026-10-07. Status: core implementation delivered and validated; controlled follow-ups remain before broader rollout. Human operational acceptance remains pending.

## Working path

Open **Scholar registry -> scholar -> Receive requirements**. Continue receiving COR and COG individually. Verify documents through the existing verification section, then open **Review academic findings** in the academic compliance panel.

Routine review uses enrollment, required full load, average on COG, and one clean-subjects choice. Individual failed/dropped/INC questions expand only when needed. Unknown answers remain unknown. There is no routine reason/reference text box. Existing findings are reused only when their supporting document version is unchanged, with explicit review confirmation before saving. A direct **Review COR/COG documents** button opens verification/correction history.

The Coordinator records the school's approved grading rule once per roster, receiving semester and COG school. The native rule is 1-best, range 1-5, inclusive average threshold 2.50. Approved equivalent native scales capture direction, range, inclusive threshold and precision without conversion or rounding. Authority and approved source are recorded once and reused. Staff and System Administrator cannot configure this policy. Unknown equivalents remain Review required; no policy is seeded or assumed for operational schools.

## Behavior and preservation

- The server derives Pending review, Review required, Compliant or Noncompliant. Neither the API nor Staff can submit a result or manually set payout eligibility.
- Current COR supplies enrollment/full-load findings; preceding completed-semester COG supplies average and failed/dropped/unresolved INC findings. Missing or stale verification cannot establish compliance. Waiver does not substitute for verified academic evidence.
- Exactly 2.50 passes the confirmed native rule; 2.5001 fails. Higher-is-better equivalents are compared on their approved native scale. Unsupported precision/range requires review, with no favorable rounding.
- Verified adverse findings block normal compliance. Unknown category/equivalency requires review. Non-degree/TESDA records do not silently inherit degree grade rules or stipend entitlement.
- Each review appends its findings, policy, placement revision, exact document/event/coverage versions, source hash, predecessor review, actor and timestamp. Enrollment/load findings live in the immutable review snapshot; semester placement columns are not overwritten.
- Changed evidence invalidates the current assessment's freshness. The old assessment remains in history. INC resolution uses return for correction -> resubmit -> verify -> append updated findings.
- A verified failed/dropped finding cannot be cleared by submitting a later grade document. Genuine exception/reinstatement remains restricted to approved policy; recording-error reconciliation is available under the fourth-increment controls below. This screen never suspends, terminates or reinstates a scholar.
- Changing already recorded findings against the same document requires Coordinator correction authority and a meaningful reason. Adding previously unknown findings remains an ordinary review. In ordinary review, clearing an adverse subject finding requires corrected COG evidence; a sequence through null cannot erase an earlier adverse finding against the same document.
- Current scope, accepted participation, authority/policy validity, semester version, identity/placement, coverage and source freshness are rechecked transactionally. Locked/unavailable periods and dependent entitlements block new reviews. History remains readable.
- Ordinary Staff reviews operate within the current receiving semester. Coordinator-only academic review after semester end is available under the third-increment controls below. Current-period grading-policy replacement remains available. There is no invented INC cure deadline or forfeiture rule, and no closed payroll is reopened.
- Compliance remains separate from scholarship standing, official membership, payout eligibility and payment. Phase 08 must connect this evidence to the new eligibility/entitlement path; legacy F00-F36 payment behavior is unchanged.

## Files, APIs and database

| Layer | Change |
| --- | --- |
| Derivation | `server/continuing/compliance-engine.ts`: exact decimal comparison, nullable findings, all blockers and explicit result precedence. |
| Service | `server/continuing/semester-compliance.ts`: authoritative evidence snapshot, policy registration, append-only review, history, stale-source detection, guarded writes and atomic audit/idempotency. |
| Shared evidence | `server/requirements/workflow-service.ts` exports the existing authoritative verification-context resolver. Existing receipt/verification transitions are unchanged. |
| API | GET/POST `/api/v1/scholars/:id/semester-requirements/:semester/compliance`; POST its `/grading-rule` subresource. GET uses `scholars.read`, review uses `requirements.verify`, grading setup uses Coordinator `semesters.configure`. No new role permission is added. |
| Interface | `src/SemesterCompliance.tsx`, `SemesterGradingRule.tsx`, `ReceivingRequirements.tsx`. Routine review is collapsed; policy setup is Coordinator-only and reused. |
| Storage | Existing `semester_review_events`, `workflow_policy_versions`, `workflow_authority_versions`, `workflow_commands`, `audit_logs`. Existing owner, placement, coverage, requirement and participation tables supply authoritative evidence. |
| Runtime access | `scripts/migration-lib.mjs` adds INSERT to the already-readable review table. UPDATE/DELETE remain denied. No schema migration; all 33 existing migration checksums remain unchanged. |
| Tests | `tests/semester-compliance.test.ts`, `scripts/test-semester-compliance-scenarios.ts`, integrated into the existing roster suite; foundation suite checks append-only grants. |

An encrypted local backup preceded the grant update. Database inventory before/after matched across all 92 application tables and schema metadata. Evidence: `output/workflow-phase07/grant-preservation.json`. No operational scholar, grading rule, review, roster activation, entitlement or payment was created.

## First increment validation

- Application checks passed with 215 unit tests across 40 files, type checking, lint, build and secret scanning. The existing bundle-size advisory remains.
- Disposable XAMPP/MariaDB integration: unauthorized roles, strict payloads, unknown grading, unverified favorable findings, inclusive native threshold, once-only grading policy, concurrent policy/review saves, exact retries/conflicts, stale source/revision, atomic rollback on audit failure, INC correction/resubmission, immutable old reviews, locked periods and entitlement dependencies passed.
- Verified failed/dropped findings remain blocked after a later verified COG; no automatic exception, status mutation or payment is created.
- An initial review concurrency test exposed a repeatable-read stale snapshot. Current review/policy reads now take locking reads under the existing shared configuration guard; rerun concurrency checks produce one winner and one conflict.
- Playwright browser: Staff views Noncompliant, reuses exact-version findings, saves a review, opens document verification directly and reads history. Staff has no Coordinator correction action; Coordinator can record a justified average transcription correction while adverse subject findings remain Noncompliant. Screenshots/scripts: `output/playwright/phase07/`. The only browser console error was the expected unauthenticated `/auth/me` 401 before login. Browser and disposable fixture were closed and cleaned up.
- Final regression gate: all 38 suites passed, including 215 unit tests, legacy payout/payment/reporting flows and encrypted backup/restore. All 442 recorded source/build hashes were independently verified. All 33 migrations remain unchanged. Frozen evidence: `output/workflow-phase07/compliance-uat/F36-report.json`. Human production acceptance remains pending.

## Recovery and next steps

Do not delete reviews or rewrite original records to roll back. Keep the previous Phase 06 evidence archive. If disabling a workflow with new reviews, keep it read-only and use a forward fix; old recovery correctly blocks dependent reviews. If returning to prior application code, preserve review data and revoke only the newly added runtime INSERT grant if needed. A prior application does not expose the new review panel. Existing baseline payments and document history remain unchanged.

Before claiming production acceptance, review these screens with the Coordinator/Staff, exercise the approved equivalent-school policy in the pilot, validate ended-period academic review and resolve formal academic-decision reconciliation through controlled follow-ups, and complete Phase 08 entitlement integration. New-first-year admission-grade alternatives remain Phase 11 work; non-degree financial policy and late-INC retroactivity remain undecided/restricted.


## Second increment - controlled grading-rule replacement

Date: 2026-10-07. Implemented and validated: database/browser checks and all 38 regression suites passed, including 221 unit tests. All 447 source/build hashes independently verified. Human production acceptance remains pending.

The Coordinator can open **Academic compliance -> Coordinator: change the approved grading rule -> Review affected records**. Existing rule, source and authority fields are prefilled. The Coordinator changes only what is needed, records the replacement reason and explicitly confirms the affected records and approved authority/source. Staff's routine academic review form is unchanged.

A replacement appends a new `workflow_policy_versions` row under the existing policy code with revision +1, a link to the predecessor, new authority provenance, replacement reason and reviewed impact hash/counts. The original policy, review snapshots, document evidence, owners and payments are unchanged. Latest-policy selection requires one complete, contiguous predecessor chain; gaps, competing roots and forks fail closed. Readable history displays both the original and each replacement.

Existing review source hashes retain the same structure. Adding history display alone does not invalidate reviews. A successful replacement changes the selected policy ID, making affected assessments stale until a new explicit review. Findings remain reusable only against their unchanged supporting document versions. Policy replacement cannot clear failed/dropped findings, bypass correction authority or grant payout eligibility.

Before saving, the server rechecks the current enabled semester, policy revision, source evidence and the current affected-record digest. The impact includes semester owners, academic revisions, review IDs and entitlement IDs across the roster/semester. Any entitlement in that roster/semester conservatively blocks shared policy replacement, even when it belongs to another scholar; financial reconciliation remains a prerequisite. Source changes, new owners/reviews, ended/locked scopes and no-change submissions are rejected. Expired or conflicting policy lineages are not repaired automatically by this action.

Permission remains Coordinator `semesters.configure`. New endpoints are GET `.../compliance/grading-rule/replacement-context` and POST `.../compliance/grading-rule/replace`. No migration, runtime grant or application role change was required. No operational rules or scholar records were edited.

### Implementation and validation

- `server/continuing/grading-policy.ts`: immutable lineage resolution, history and cohort-wide impact calculation.
- `server/continuing/semester-compliance.ts` and receiving routes: replacement authorization, stale checks, atomic audit and retry protection. Historical author display names are now loaded separately from locked evidence rows to avoid a deadlock with another authorized request holding its own user row.
- `src/SemesterGradingReplacement.tsx`, `SemesterGradingRule.tsx`, `SemesterCompliance.tsx`: Coordinator impact review and prefilled replacement form; shared read-only policy history.
- `tests/grading-policy.test.ts`: original/successor selection and rejection of conflicting, incomplete or forked histories. Application checks passed with 221 tests across 41 files.
- `scripts/test-grading-replacement-scenarios.ts`, integrated into the roster suite: unauthorized roles, missing review/reason, no-op and stale rejection, another review/owner invalidating impact, another scholar's entitlement blocking replacement, audit-failure rollback, concurrent one-winner behavior, exact retries/conflicts, immutable original policy/reviews, repeated replacement and mandatory re-review. A synthetic additional owner was inserted only in the disposable database to exercise the broad dependency boundary, then removed.
- Browser: Coordinator replaced an approved equivalent threshold with authority prefilled; history retained four versions. Staff had no replacement action and re-reviewed the same document findings under the new policy. Failed/dropped findings remained Noncompliant. Evidence: `output/playwright/phase07/grading-open.js`, `grading-flow.js`, `grading-before.yml`, `grading-replaced.png`, `grading-staff-review.png`. Browser/fixture closed and cleaned up. Expected unauthenticated `/auth/me` 401 was the only console error.
- All 38 regression suites passed, including 221 unit tests, existing operational flows and encrypted backup/restore. All 447 source/build hashes were independently verified; 33 migration checksums remain unchanged. Frozen evidence: `output/workflow-phase07/grading-replacement-uat/F36-report.json`.

### Remaining restrictions and recovery

Ended-period review was delivered in the third increment below. Recording-error reconciliation was delivered in the fourth increment below; expired/conflicting policy recovery is delivered in the fifth increment below. No INC deadline, exception/reinstatement policy or retroactive payout is invented. Phase 08 eligibility/entitlement integration remains separate.

Preserve all policy revisions and audit evidence. A previous application version treats multiple policies as conflicting, so use a forward fix or keep the scope read-only if rolling back application code. Never delete a replacement to make old code select its predecessor. This change has no schema/grant rollback requirement.


## Third increment - ended-semester academic review

Date: 2026-10-07. Implemented and validated: 227 unit tests, isolated database scenarios, Coordinator/Staff browser checks and all 38 regression suites passed. All 451 source/build hashes were independently verified. Production acceptance remains pending.

### Workflow and boundaries

For an existing accepted continuing-scholar semester, open **Receive requirements**, select the ended semester, then open **Review ended semester (academic only)**. The Coordinator reviews the prefilled findings, records a reason and confirms that the review does not authorize late payment. Staff can still receive corrected documents and verify them under the existing document controls; only the Coordinator can save the ended-semester academic review. No repeated authority/reference input is added to routine receiving.

- Both individual current COR and preceding-semester COG must be verified against their exact current identity, placement and coverage. INC resolution still requires return for correction, resubmission and verification of the corrected COG. Old documents/reviews are retained.
- Ending the semester does not itself expire its academic evidence or create an INC cure deadline. A grading rule whose applicability ended with that semester can be used if it covers the entire semester. Its authority and the receiving scope's authority/policy must still be valid. Conflicting, insufficiently covering or expired-authority rules remain blocked; this action does not replace or repair them.
- Locked/archived semesters or academic years, disabled/unavailable scopes, changed setup/academic evidence, missing category and any dependent entitlement still block the review. Existing failed/dropped evidence cannot be cleared through this action or interpreted as reinstatement.
- Every new review appends `academicOnly: true`, purpose `academic_only_after_period`, the semester end date, exact evidence, policy, findings, reason, actor/time and predecessor. The audit event is `semester.compliance.ended_review`; stale-source/version checks, atomic audit and retry protection apply.
- Academic compliance is separate from payout entitlement. A closed legacy payroll remains byte-for-byte unchanged. No entitlement, release, eligibility, scholarship status or payment is created or edited. Phase 08 must explicitly honor the academic-only marker and must not turn it into automatic retroactive entitlement. Any later supplemental-payment policy needs a separate authorized workflow.

### Files and storage

- `server/continuing/compliance-period.ts`: applies an ended semester's recorded grading coverage without inventing a cure deadline.
- `server/continuing/semester-compliance.ts`: separate ended-review blockers, Coordinator authorization, immutable review marker and audit. Existing review snapshots and source-policy shapes remain intact.
- `server/continuing/semester-receiving-routes.ts`: POST `.../compliance/ended-review`, using existing `academic.changes.approve`. The ordinary review endpoint still rejects ended-semester submissions.
- `src/SemesterCompliance.tsx`: one progressive form, exceptional reason/confirmation, history labels and Staff read-only academic review.
- `tests/compliance-period.test.ts`, `scripts/test-ended-compliance-scenarios.ts`, and the existing compliance scenario runner: boundary, authorization, evidence, history and financial-preservation checks.
- Existing review/audit/command tables only. No migration, grant or role change; no operational roster, scholar, grading or financial record was changed.

### Validation and recovery

Application checks passed: 227 unit tests across 42 files, lint, type checking, build and secret scan. The existing bundle-size advisory remains. Disposable XAMPP tests cover expired applicability versus authority, incomplete policy coverage, role denial, strict confirmation/reason, stale evidence/revisions, year/semester locks and archive, disabled scope, dependent entitlement, concurrent one-winner saves, exact retries/conflicts, audit rollback and INC resolution after semester end. Original review rows and all captured payout/eligibility/entitlement/payment/status rows were identical afterward. Synthetic date changes and closed-payroll fixtures exist only in the disposable test database; they are not operational updates.

Browser checks: Coordinator saved an ended-semester academic-only review with same-document findings preserved; Staff saw the result and labeled history with no ended-review form. Failed/dropped findings remained Noncompliant. Evidence: `output/playwright/phase07/ended-open.js`, `ended-flow.js`, `ended-coordinator.png`, `ended-staff.png`. The only console error was the expected unauthenticated `/auth/me` 401 before login. Browser and fixture were closed and cleaned up.

Full regression evidence: all 38 suites passed, including 227 unit tests and encrypted backup/restore. All 451 recorded source/build hashes were independently verified; all 33 migration checksums remain unchanged. Frozen report: `output/workflow-phase07/ended-review-uat/F36-report.json`. Preserve the earlier `grading-replacement-uat` archive. If reverting application code, retain every new review and audit event; earlier code will block ended-period writes and may not display the academic-only label. Prefer a forward fix or read-only operation rather than deleting records. There is no schema/grant rollback.

Recording-error reconciliation is delivered below. Policy recovery and the final integration review are recorded below; operational acceptance remains pending. Phase 08 eligibility/entitlement integration remains next; late-INC retroactivity and non-degree financial policy are still undecided.


## Fourth increment - failed/dropped recording-error correction

Date: 2026-10-07. Implemented and validated: 233 unit tests, isolated database/browser checks and all 38 regression suites passed. All 456 source/build hashes independently verified. Human production acceptance remains pending.

### Coordinator workflow

Under **Receive requirements -> Academic compliance**, open **Coordinator: correct a failed/dropped recording error**. Select only the erroneous finding, inspect its affected review numbers, actors and COG versions, explain the error and confirm that the entries were recording errors. The existing COG evidence is linked automatically; there is no repeated reference/authority text box. Routine receiving and Staff review retain their existing controls.

The action requires verified COR/COG, an approved applicable grading rule and a fresh academic review against the current evidence. If a document or rule changed, re-review its findings first. A transcription mistake against already verified evidence does not force a fabricated document resubmission. The Coordinator must establish that it was a recording mistake; a genuine failed/dropped subject later passed or excused is not a recording correction. No automatic exception or reinstatement is implemented.

### Preservation and safeguards

- Each correction appends a new academic review with `correction.kind = recording_error` and exact `{reviewId, field}` targets. Every earlier review row remains unchanged. Selected findings become No; average, enrollment, full load, INC and unselected findings retain the latest reviewed values. Compliance is recalculated by the server, not supplied by the client.
- Ordinary adverse-finding guards honor only explicitly corrected earlier review/field pairs. Correcting Failed leaves Dropped active. A later new adverse finding cannot reuse an earlier correction as an exemption. The history displays the correction and its original review references.
- Existing `academic.changes.approve` permission is required at the route and transaction. Staff, System Administrator and unassigned accounts are denied. Strict input, source/revision checks, atomic audit, configuration locking and idempotency remain enforced.
- Locked/archived/unavailable periods, unverified or stale evidence, missing policy and dependent entitlements block the action. After semester end, the same correction remains academic-only and requires explicit acknowledgement; it cannot authorize late payment. No financial record or scholarship-standing decision is written.
- Storage uses existing review JSON, audit and command tables. No migration, grant or role change. No operational roster, scholar, grading rule, entitlement or payment was edited.

### Implementation and evidence

`server/continuing/finding-corrections.ts` resolves exact correction targets in revision order. `semester-compliance.ts` exposes unresolved findings/blockers, appends the correction and applies it to ordinary review guards. POST `.../compliance/correct-recording` is registered in `semester-receiving-routes.ts`. `src/SemesterFindingCorrection.tsx` provides the collapsed Coordinator form; `SemesterCompliance.tsx` displays correction history. Audit event: `semester.compliance.correct_recording`.

`tests/finding-corrections.test.ts` covers selective correction, unknown answers, unrelated records and later adverse evidence. `scripts/test-finding-correction-scenarios.ts`, integrated into the roster suite, verifies permission denial, strict inputs, unverified/stale evidence, locks and entitlement dependencies, partial correction, original-row preservation, audit-failure rollback, concurrent one-winner saves, safe retries, independent later findings and ended-period academic-only handling. All 233 unit tests across 43 files, lint, type checking, build and secret scanning passed before the final regression gate; the existing bundle-size advisory remains.

Browser checks confirmed Coordinator save and recalculation to Compliant when all other conditions passed, Staff exclusion while the finding was unresolved, and subsequent Staff re-review preserving the correction. Evidence: `output/playwright/phase07/correction-flow.js`, `correction-form.png`, `correction-staff.png`, `correction-saved.png`. Expected pre-login `/auth/me` 401 was the only console error. Browser and disposable fixture were closed and cleaned up.

Full regression evidence: all 38 suites passed, including 233 unit tests and encrypted backup/restore. All 456 source/build hashes independently verified; 33 migration checksums unchanged. Frozen evidence: `output/workflow-phase07/finding-correction-uat/F36-report.json`.

### Recovery and next step

Preserve every correction and original review. Older application code does not understand correction metadata and its ordinary review guards would treat historical adverse findings as unresolved again; use a forward fix or read-only operation rather than deleting reviews. There is no schema/grant rollback. Phase 08 must derive eligibility from the authoritative reconciled review and retain the academic-only boundary; it must not scan raw historical flags without their correction links.

Policy recovery and final Phase 07 integration review are delivered below; Phase 08 eligibility/entitlements follows the final regression gate. Genuine academic exceptions, late-INC retroactive payments and non-degree financial policy remain undecided/restricted.


## Fifth increment - grading-policy recovery and Phase 07 completion review

Date: 2026-10-07. Phase 07 technically complete. All 38 regression suites, 241 unit tests, disposable database checks and Coordinator/Staff browser checks passed; all 458 source/build hashes independently verified. Human production acceptance remains pending.

### Recovery workflow

For an unavailable grading policy, the Coordinator opens **Receive requirements -> Academic compliance -> Recover unavailable grading policy**, reviews every prior rule and the affected-record counts, then explicitly chooses a rule as a starting point. Existing scale/source/authority details are prefilled. The Coordinator records the currently valid authority and expiry, explains the recovery and confirms that the rule applies to the covered semester. Authority dates are not silently renewed; ordinary rule replacement now preserves the previous expiry.

Recovery appends a new policy root and authority. Its `recoveryOf` list names every previous policy version for that school, cohort and semester. The resolver requires exact coverage: incomplete lists, self/duplicate references, new unrelated policies and ambiguous competing histories fail closed. Recovered roots support normal append-only replacements and later explicit recovery. History is displayed chronologically, with recovery links; original policies, authorities and reviews are retained.

The existing global configuration lock, Coordinator `semesters.configure` permission, current source/context hash, cohort-wide owner/review/academic/entitlement checks, atomic audit and retry protection apply. A new owner, review or policy invalidates an earlier impact review. Any entitlement in the cohort/semester blocks recovery. Disabled/locked/archived scopes and invalid receiving authority are not repaired by this grading-policy action. Missing initial rules still use initial setup; current unambiguous rules use ordinary replacement.

After recovery, the new policy ID makes previous assessments stale. Staff must review the current evidence again. Ended, unlocked semesters can recover a rule with explicit academic-only acknowledgement, but subsequent review remains Coordinator-only. Recovery never clears failed/dropped findings, creates a scholarship exception, alters standing, grants an entitlement or reopens payroll.

### Implementation and validation

- `server/continuing/grading-policy.ts`: exact recovery coverage, chronological history and full-policy/cohort impact hash.
- `server/continuing/semester-compliance.ts`: recovery context/command, renewed authority, preserved expiry during ordinary replacement, immutable recovery and atomic audit.
- `server/continuing/semester-receiving-routes.ts`: GET `.../compliance/grading-rule/recovery-context`, POST `.../compliance/grading-rule/recover`, both Coordinator-only.
- `src/SemesterGradingRecovery.tsx`, `SemesterGradingRule.tsx`, `SemesterCompliance.tsx`: progressive history/impact review, explicit template choice, prefilled form and mandatory reassessment notice.
- `tests/grading-policy.test.ts` and `scripts/test-grading-recovery-scenarios.ts`: expired/conflicting roots, exact lineage coverage, stale impact, role denial, bad input, another scholar's financial dependency, locked period, atomic rollback, concurrency/retry, preserved original rows, normal successors and repeated ended-period recovery.
- Application checks passed with 241 unit tests across 43 files, lint, type checking, build and secret scan. The existing bundle-size advisory remains.
- Browser: Staff had no recovery action while the rule was unavailable. Coordinator saw the prior expiry, explicitly renewed the authority and preserved nine policy versions. The result required re-review; Staff re-review retained the existing failed finding as Noncompliant. Evidence: `output/playwright/phase07/recovery-flow.js`, `recovery-form.png`, `recovery-saved.png`, `recovery-staff-review.png`. Only the expected pre-login `/auth/me` 401 appeared. Browser and disposable fixture were cleaned up.
- No migration, runtime grant or role change. All synthetic expiry/conflict/date manipulation occurred only in the disposable database. No operational roster, scholar, policy, entitlement or payment was changed.

Final regression evidence: `output/workflow-phase07/final-uat/F36-report.json`. All 38 suites passed, including 241 unit tests and encrypted backup/restore. All 458 source/build hashes independently verified; 33 migration checksums unchanged. Source/build inputs remained frozen throughout the gate.

### Final integration review

| Phase 07 requirement | Delivered behavior and evidence |
| --- | --- |
| Separate academic/document decisions | Individual COR and COG retain their receipt, verification and coverage histories; compliance links exact versions. Receiving/coverage/database and browser scenarios pass. |
| Grading and maintenance | Approved native/equivalent rules, exact decimal comparison, average/full load/enrollment and nullable failed/dropped/INC findings derive the result; unknown data never implies compliance. Unit and integration scenarios pass. |
| INC resolution | Corrected/reverified COG permits an appended assessment, including controlled academic-only review after semester end; original evidence remains. No cure deadline or retroactive entitlement is invented. |
| Genuine adverse findings versus recording error | Ordinary later grades cannot erase a genuine failed/dropped finding. Coordinator recording-error correction links exact original review/field pairs. Independent later findings remain protected. |
| Reusable approved rules | Initial setup, versioned replacement and explicit expired/conflicting-policy recovery preserve history, require valid authority and stale affected assessments. No routine repeated Staff authority input. |
| Permissions and transactions | Technical Admin has no scholarship-decision authority. Role denial, concurrency, stale/retry checks, audit rollback and dependency tests pass across all increments. |
| Historical and financial boundaries | Locked/unavailable records and existing entitlements block applicable changes. Reviews and grading operations do not mutate standing, eligibility, payroll or payments. Ended reviews retain the academic-only marker. |
| Usability | Routine receiving remains simple. Same-document findings are reused; exceptions and policy forms are collapsed, Coordinator-only and prefilled where appropriate. Browser flows pass. |

The final regression gate passed on unchanged source/build inputs, completing the Phase 07 technical gate. Human Coordinator/Staff acceptance and production enablement are not implied by automated success.

### Phase 08 handoff and recovery

Start Phase 08 with read-only comparison on synthetic records. Derive the new result from accepted participation/admission, exact current semester evidence, reconciled findings, approved policy and recorded standing. Explain differences from the legacy annual-record calculation; names-only continuing baselines must not acquire fabricated annual admission records. Only after comparison validation add one PHP 5,000 degree entitlement per eligible semester, duplicate-payment protections and preservation of earned final-semester entitlements after graduation.

The next phase must respect academic-only review markers and correction links. Historical adverse flags cannot be scanned without their correction decisions, and historical Compliant results cannot be reused after source/policy changes. Non-degree financial benefits and retroactive INC payment remain restricted until policy is authorized. Existing finalized payroll is not recalculated silently.

For recovery from this release, retain every policy and review. Older resolver code treats recovered multi-root histories as conflicting; use a forward fix or read-only operation instead of deleting roots to force an older rule to win. There is no schema/grant rollback. The expired-policy recovery path concerns grading rules; it does not authorize changes to semester document setup, locked records or financially dependent history.
