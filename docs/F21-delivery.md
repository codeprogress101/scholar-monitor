# F21 delivery - OVR Draft Batch and Entries

Release 0.22.0, completed 2026-10-02 on XAMPP MariaDB. F00-F20 accepted; F21 implemented and tested, ready for acceptance. Next: F22 OVR Review and Atomic Finalization.

## Delivered workflow

Staff and Coordinators open **Payout cycles > OVR drafts**, create a named batch with a unique code for that cycle, search same-year scholarship records, and add/remove entries with reasons and references. The existing `ovr.prepare` permission protects all OVR reads and commands. System Administrators and unassigned users are denied; no individual account roles were changed.

Adding an entry always evaluates current server sources under the shared writer guard. It does not trust browser eligibility or a saved calculation alone. Admission requires the shared F19/F20 effective result to be eligible, Active scholarship status, valid current official membership, and a complete cycle-specific checklist whose documents are Verified or policy-accepted Waived. Draft/Pending overrides and stale approved overrides block admission. F21's explicit mandatory status/document requirements remain enforced even if a current approved override makes the effective result Eligible. A current negative override blocks admission.

A scholarship can belong to only one active OVR membership across the same payout cycle, including across batches. Removing it appends a removal event and releases membership; re-adding captures fresh eligibility evidence. The earlier addition and removal remain immutable. The UI identifies the scholar in membership history and shows the captured eligibility label alongside the current assessment.

Every detail read checks the current roster again. It returns timestamped, structured issues for empty batches, unavailable cycles, ineligible records, incomplete documents, invalid statuses, official membership problems, unresolved/stale overrides, duplicate entries and changed source fingerprints. Changed sources remain visible even if the scholar still qualifies; review, remove and re-add the entry to refresh its evidence. **Record draft validation** saves either a passing result or the identified issues as an attributed batch revision. It does not finalize or authorize payment.

All commands require an open payout cycle and available academic period. Only Draft membership may change. Read/history access and exact completed retries remain available after lock/close. F21 does not expose submission, finalization, payment or processing commands. The non-Draft guard is already enforced for later lifecycle integration.

## API and data

- `GET /api/v1/payout-cycles/:cycleId/ovr-batches`: searchable, paginated batch list (`q`, `offset`, `limit`), plus current cycle context.
- `POST` the same URL: `expectedRevision: 0`, `expectedCycleVersion`, `code`, `name`, `reason`, `reference`.
- `GET /api/v1/ovr-batches/:id`: current batch, active entries, live validation, immutable revision history and edit availability.
- `POST /api/v1/ovr-batches/:id/entries/add` and `/entries/remove`: `expectedRevision`, `scholarshipId`, `reason`, `reference`.
- `POST /api/v1/ovr-batches/:id/validate`: `expectedRevision`, `reason`, `reference`; appends a validation revision even when issues are found.

All commands require allowed Origin, CSRF and a UUID Idempotency-Key. Strict input validation rejects client-computed eligibility and forged lifecycle fields. Main errors include `OVR_ENTRY_INELIGIBLE`, `OVR_DUPLICATE_ENTRY`, `OVR_ENTRY_NOT_FOUND`, `OVR_NOT_DRAFT`, `OVR_CODE_EXISTS`, and revision/retry conflicts. Cross-year entries are rejected by the common eligibility source reader. Validation returns issue codes and scholarship IDs for individual entries.

Migration `20261002100000_f21_ovr_drafts.sql` adds `ovr_batches`, `ovr_batch_events`, `ovr_entries` and `ovr_commands`. All four tables have SELECT/INSERT-only runtime grants. Unique cycle/code and batch/revision keys, foreign keys to scholarship/actor/cycle identities and parent events, and lifecycle/action checks retain history. Entry events store the full normal assessment, effective override result and source fingerprint. A removal preserves the evidence it removes. Batch events retain actor, time, reason, reference, entry identity and recorded validation where applicable. Earlier applied SQL remains unchanged.

Membership, batch revision, audit (`ovr.draft`) and retry receipt commit atomically. A common guard serializes source changes and membership commands; expected revisions reject competing edits. Direct current locking reads project the latest entry event rather than relying on a nested aggregate that could retain an older repeatable-read snapshot. A database concurrency test caught that MariaDB behavior during implementation and now verifies one winner across different batches. Exact retries return the original command result; changed retries conflict, and audit failure rolls back all writes.

Core files: `server/ovr/{model,rules,service,routes}.ts`, `src/OvrDrafts.tsx`, payout-page integration, migration/grants/readiness updates. `validateOvr`, `ovrEntries`, and the shared eligibility reader are available for F22 to reuse inside its finalization transaction. F22 must perform fresh validation and freeze membership atomically; a stored F21 validation is not authorization to finalize.

## Validation

- `npm run check`: lint, 120 portable tests in 24 files, complete typechecks, production build and source/bundle secret scan passed.
- `npm run test:ovr-db`: 20 isolated MariaDB scenarios, comprising 11 normal-eligibility prerequisites and 9 F21 cases. Coverage includes successful admission, duplicate/cross-batch races, revision conflicts, audit rollback, exact/changed retries, pending overrides, positive/negative approved outcomes, mandatory document guards, stale-entry validation, removal history, non-Draft guards, restricted grants, CSRF and locked/closed payouts.
- Regression suites: `test:overrides-db` (19 scenarios including the shared 11 F19 cases) and `test:payout-cycles-db` (11) passed. This is 50 scenario executions across the three suites, with shared prerequisites deliberately repeated in disposable databases.
- Browser: Staff created a batch, saw the empty-roster issue, added an eligible scholar, recorded passing validation, inspected attributed revision history and removed the entry; the roster returned to the empty-batch issue. Desktop 1440x1000 and mobile 390x844 screenshots were visually checked with no horizontal overflow. Ignored evidence: `output/playwright/f21-ovr-{desktop,mobile}.png`.
- Migration 21 applied to local XAMPP and `npm run test:db` passed checksums and restricted grants. Health reports F21/0.22.0 with a connected database; readiness passed and the app responds on port 5173. Disposable fixtures were cleaned up. Real account credentials and scholarship records were not edited. Tests use disposable synthetic databases; a fixture-only finalization event validates the future non-Draft guard without exposing finalization in the application.

Batch lists and candidate search are paginated. Per-batch membership and history are currently loaded in full for the local MVP; large-roster performance and history pagination remain future scaling work.
