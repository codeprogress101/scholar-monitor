# F16 delivery - Requirement Verification and Correction Loop

Release 0.17.0, completed 2026-10-01 on XAMPP MariaDB. F00-F15 accepted; F16 implemented and tested, ready for acceptance. Next: F17 requirement waiver.

## Delivered workflow

In a scholar's annual record and semester checklist, Staff/Coordinator can use these explicit actions:

- Submitted or Resubmitted -> **Send for verification** -> For Verification.
- For Verification -> **Verify document** -> Verified.
- For Verification -> **Return for correction** -> For Correction.
- Verified -> **Reopen verified requirement** -> For Correction, linked to the exact latest verification event.
- For Correction -> **Record resubmission** -> Resubmitted, recording the corrected hard copy's received date, storage location and optional physical reference.
- For Verification -> **Reject requirement** -> Rejected. Rejection is terminal in this checkpoint; no implicit rejection reversal is exposed.

Every command records effective date, reason, reference, optional remarks, authenticated actor, server timestamp and before/after state. Dates cannot be future dates or precede the latest receipt/decision. Resubmission uses the effective date as the corrected hard-copy receipt date. Initial receipt and all earlier decisions remain unchanged.

Verified meets the normal requirement rule through `satisfiesNormalRequirement`; all other implemented states fail it. This is a requirement-level result, not full payout eligibility. Returning a Verified record for correction immediately removes that satisfaction until it is verified again. No qualification or scholarship operational status changes occur.

## Verification evidence and authority

Verification loads current identity and same-year academic placement, displays the permanent Scholar ID, name, academic year/semester, school/course and pinned policy version, and requires five explicit checks: identity, period, placement, policy applicability and physical document validity/completeness/legibility. This records the human review of hard copies; the system does not inspect/upload document files.

The server rechecks the scholar, period, school/course, identity revision, academic revision and exact definition version transactionally. Wrong year/semester returns `REQUIREMENT_WRONG_PERIOD`; wrong scholar/placement, stale context and inapplicable policy produce distinct conflicts. Missing annual academic data blocks verification. Verification cannot predate the academic placement being verified. Reloading context resets all check confirmations.

Applicability is evaluated against the immutable definition version and policy date pinned at generation, rather than today's latest policy. Later policy edits do not rewrite historical meaning. The verification event preserves source identity/placement labels and revisions plus confirmed document checks.

`requirements.verify` authorizes sending, verification, correction and rejection; `requirements.receive` authorizes physical resubmission. Both roles already hold these permissions. System Administrator/unassigned users are denied. No new role assignments or permission grants are introduced. The plan permits Staff and Coordinator verification; it does not require a different verifier from the receiver, so no additional approval policy was invented.

## API and immutable storage

`GET /api/v1/requirement-instances/:id/verification-context` returns authoritative review context. `POST /api/v1/requirement-instances/:id/{send-for-verification,verify,return-for-correction,resubmit,reject}` records commands. All writes require origin/CSRF protection and UUID `Idempotency-Key`.

Common fields: matching `action`, `expectedVersion`, `effectiveOn`, `reason`, `reference`, and nullable `remarks`. Verify additionally requires `document` context identifiers/revisions (`scholarId`, `scholarVersion`, `academicYearId`, `semesterId`, `schoolId`, `courseId`, `academicVersion`, `definitionVersionId`) and five true `checks`. Return-for-correction requires `correctionOf`: the latest verification event ID when reopening Verified, otherwise null. Resubmit requires `storageLocation` and nullable `physicalReference`.

Checklist reads now include the shared current status/revision projection, decision history and normal-rule satisfaction. Initial Not Submitted is revision 0; receipt creates Submitted revision 1; workflow events append revisions 2 onward. F15 initial receiving uses the same projection and rejects already-received/advanced states.

Migration `20261001120000_f16_requirement_verification.sql` adds `requirement_workflow_events` and `requirement_workflow_commands`. Both have SELECT/INSERT-only runtime grants. Database checks constrain transition edges, correction linkage shape and revision bounds; unique instance/revision keys prevent duplicate state history. Restrictive foreign keys retain instance, actor and linked verification. Earlier SQL, generated instances and receipts remain unchanged.

The common configuration guard, current locking reads and optimistic revisions serialize transitions and source validation. Event, audit and retry receipt commit atomically. Exact retries return the recorded result; changed retries conflict. Audit failure rolls back all writes. Locked/archived semester or academic-year periods block new decisions/context; historical reads remain available and exact completed retries remain safe.

## Subsequent integration

F17 must extend the shared `requirementState` projection and normal-rule evaluation for an explicit Waived state and enforce Coordinator authority; waiver must not masquerade as Verified. Preserve all receipt, correction and verification history. F18 must add authoritative payout locks/context when payout-backed checklists are introduced. No payout integration, waiver, general document upload, arbitrary state-edit or history-delete endpoint is exposed in F16.

## Files and verification

Core: `server/requirements/workflow-{model,validation,state,service,routes}.ts`, shared projection integration in instance reads/F15 receiving, `src/RequirementWorkflow.tsx`, checklist/receipt display integration, new migration, runtime grants and release/readiness updates. Tests: `tests/requirement-workflow.test.ts` and `scripts/test-requirement-workflow-db.ts`.

- `npm run check`: lint, 99 portable tests, complete typechecks, production build and secret scan passed.
- 40 database scenarios passed: F16 workflow 9, F15 receiving 9, F14 generation 12 and RBAC 10. New coverage includes authority, missing academic data, wrong period/source context, explicit state edges, linked reopening, preserved original verification bytes/receipt, normal-rule satisfaction, rejection, retry/concurrency, rollback, grants/CSRF and period locks.
- Browser: Staff sent a received obligation for review, confirmed all five checks, verified, reopened with a linked correction, recorded corrected custody, resent and re-verified. After refresh, all six decisions and the corrected storage details remained visible. Desktop/mobile screenshots visually checked with no horizontal overflow: ignored `output/playwright/f16-verification-desktop.png` and `f16-verification-mobile.png`. Disposable fixture removed.
- XAMPP migration applied. `npm run test:db` passed connectivity, sixteen migration checksums and restricted grants. API health reports F16/0.17.0 with connected database; readiness passed. Verification used synthetic data only; real scholarship records/accounts were not changed.
