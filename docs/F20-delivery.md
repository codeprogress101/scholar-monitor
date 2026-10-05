# F20 delivery - Eligibility Override Request and Approval

Release 0.21.0, completed 2026-10-02 on XAMPP MariaDB. F00-F19 accepted; F20 implemented and tested, ready for acceptance. Next: F21 OVR Draft Batch and Entries.

## Delivered workflow

Open **Payout cycles > Eligibility > Review eligibility** or an annual record's payout checklist. The eligibility panel now displays the effective result separately from its unchanged normal calculation. Staff and Coordinators with the existing request permission can create an override against a fresh saved normal calculation. Required evidence: requested Eligible/Not Eligible result, reason code, justification, authority reference, action reason and reference. Reason codes are explicit uppercase identifiers; no invented policy catalogue or authority is seeded.

- **Request** creates a Draft. At most one Draft/Pending request is allowed for a scholarship and cycle.
- **Submit for review** moves a requester's Draft to Pending.
- **Approve/Reject** requires the existing Coordinator approval permission and a different individual from the requester, including when the requester is also a Coordinator. Decisions are terminal.
- **Re-evaluate** binds a Draft/Pending request to a fresh saved normal calculation, retains the original calculation forever, and returns the request to Draft for explicit resubmission. Its requested result and original justification remain immutable; cancel and create a new request to change them.
- **Cancel** is available only to the requester while Draft/Pending. Cancellation appends history.

Submission and approval recompute current authoritative sources. Any mismatch produces `ELIGIBILITY_DATA_CHANGED`. Merely recalculating does not rebind a pending request: the requester must re-evaluate and submit it again. All new override commands require an open payout cycle and available academic period. Locked/closed cycles retain read/history access and exact completed retries.

An approved exception is labeled **Eligible - Override Approved** or **Not Eligible - Override Approved** in both individual eligibility and the cycle report. Both use the same server-owned effective-result resolver. Draft, Pending, Rejected and Cancelled requests do not change the effective result. The latest approval supersedes previous approvals; a new pending or rejected request does not revoke an existing valid approval. If the latest approval's source fingerprint becomes stale, it is not applied and the current normal result is displayed with a warning. An older approval is never resurrected. A new approved request is needed to replace a stale approval. Cycle lifecycle changes are part of the F19 fingerprint and therefore also invalidate matching approvals conservatively.

The original calculation, all re-evaluation baselines, actors, timestamps, evidence, decisions and revisions remain readable. Saving an override does not authorize payment or create an OVR entry. System Administrators remain excluded from scholarship decisions; no personal role assignments were changed.

## API and storage

Existing eligibility reads now return `effective` and append-only `overrides` history; cycle report rows return the same `effective` result alongside `current`, `latest` and `stale` normal evidence. No read writes a calculation or decision.

Base: `/api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility/overrides`.

- `POST` base creates a request. Body: `expectedRevision: 0`, `calculationId`, `expectedSourceHash`, `requestedEligible`, `reasonCode`, `justification`, `authorityReference`, `reason`, `reference`.
- `POST /:overrideId/submit-review`, `/approve`, `/reject`, `/cancel`: `expectedRevision`, `reason`, `reference`.
- `POST /:overrideId/reevaluate`: the same command evidence plus `calculationId` and `expectedSourceHash`.

All commands require allowed Origin, CSRF and UUID Idempotency-Key; strict validation rejects forged outcome/state/actor fields. The route and service both enforce permissions. Reads retain `scholars.read` authorization. Requests cannot be operated through a different cycle or annual-record path.

Migration `20261002093000_f20_eligibility_overrides.sql` adds immutable `eligibility_overrides`, `eligibility_override_events`, and `eligibility_override_commands`. Runtime grants are SELECT/INSERT only. Foreign keys preserve source calculations and identities; unique request/revision and actor/command keys protect ordering and retries. Event action/state constraints reject invalid stored combinations. The earlier F02 request/approval permissions are reused without changing assignments or broadening roles. Applied older SQL is unchanged.

All business reads use current locking reads under the shared configuration guard. Request/event, audit (`eligibility.override`) and retry receipt commit atomically. Expected revisions prevent competing decisions; audit failure rolls everything back. Exact retries return the recorded command result even after payout closure; changed retries conflict. F21 should consume the shared effective result and validate it against current sources rather than infer eligibility from a normal snapshot alone.

Core files: `server/eligibility/override-{model,state,service,routes}.ts`, existing eligibility service/model, `src/EligibilityOverrides.tsx`, individual/report integration, migration and grant/readiness updates. Tests: `tests/eligibility-overrides.test.ts`, `scripts/test-override-scenarios.ts` using the full F19 fixture through `npm run test:overrides-db`.

## Validation

- `npm run check`: lint, 116 portable tests in 23 files, complete typechecks, production build and source/bundle secret scan passed.
- 40 isolated MariaDB scenarios: F19/F20 combined (19: 11 normal eligibility plus 8 override/guard scenarios), payout cycles (11), RBAC (10). Includes fresh evidence, input/role denials, self-approval, explicit re-evaluation/resubmission, original calculation preservation, approved-source invalidation, rejection/cancellation, concurrent decisions, audit rollback, idempotency, immutable grants, CSRF and locked/closed payouts. RBAC includes 124 permission decisions.
- Browser: Staff cancelled a pending synthetic request, created a new Not Eligible exception with complete evidence, and submitted it without approval controls. A separate Coordinator approved it; individual and report views both immediately showed **Not Eligible - Override Approved**. Desktop 1440x1000 and mobile 390x844 screenshots were visually inspected; no horizontal overflow. Evidence: ignored `output/playwright/f20-overrides-{desktop,mobile}.png`.
- Migration 20 applied to local XAMPP. `npm run test:db` passed checksums and restricted grants. Health reports F20/0.21.0 with a connected database; readiness passed and the app responds on port 5173. Disposable fixtures were cleaned up. No real scholar records or account credentials were edited; browser and database validation used disposable synthetic fixtures.

History is currently returned per scholarship/cycle without pagination. This is suitable for the local MVP; pagination should precede large-volume use. No external communications, policy assumptions, payout scheduling defaults or payment actions were introduced.
