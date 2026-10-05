# F32 — Concurrency, Idempotency and Locking

Implemented and verified in v0.33.0. Next checkpoint: F33 error contract and validation UX.

## Change

Completed import confirmation previously returned its saved result before checking whether the provided confirmation key belonged to another import. The key lookup now precedes the saved-result return. A key already bound to a different import returns `409 IDEMPOTENCY_CONFLICT`, whether the target import is pending or completed. Same-job exact retries still return the original durable result. Existing job-level deduplication remains: a fresh unused key for an already confirmed job can retrieve the saved result without executing it again.

Added `npm run test:concurrency-db`, a fail-fast runner for six disposable MariaDB integration suites. Suites run sequentially; concurrent requests inside each suite exercise races. The runner invokes Node/tsx directly without a shell. Existing personal and demo records are not used.

Finalization regression now sends three simultaneous exact retries after a competing-key finalization race, comparing each response with the original result and asserting one finalization and no additional audit event. Import regression also covers retry-key collisions between two already completed jobs in both directions and three simultaneous exact retries.

## Existing contract verified

| Concern | Protection and evidence |
| --- | --- |
| Scholar ID allocation | Transactional sequence row, unique constraints and cross-user race tests yield distinct permanent IDs. Failure rolls back sequence allocation. |
| Concurrent profile edits | Expected version checked against a locked current record; one winner, stale write returns 409 `VERSION_CONFLICT`. |
| Stale approvals | Academic change requests capture the source version; approval rechecks current placement and period locks. Competing independent approvers commit one change. |
| Double receiving | Checklist identity is unique; batch receiving, source versions, receipts, retry record and audits commit together or all roll back. |
| Import confirmation | Actor-owned immutable preview hash acts as expected state; current references/duplicates are revalidated. Confirmation identity and stored result survive service recreation. |
| OVR finalization | Guarded transaction revalidates all members and sources, expected revision, independent approval and unique finalization. Audit failure rolls back snapshot/state/retry receipt. |
| Payments/amendments | Current revision and immutable source evidence, separate approval, guarded reconciliation and durable command receipts preserve one effective outcome. |
| Period locks | Commands re-read authoritative academic-year/cycle locks before new changes. Exact committed retries return their stored results without reopening the period. |
| Permission changes | Authorization rechecks and locks the user row inside each guarded mutation; a retry is not a permission bypass. |

Wire fields retain established names (`expectedVersion` or `expectedRevision`), with UUID `Idempotency-Key` scoped to actor and command family. Conflicting payloads are rejected. Import previews use their immutable content hash instead of a mutable row version; checklist provisioning uses deterministic period identity. No incompatible blanket renaming was introduced.

Authentication/session operations and generated exports retain their existing semantics: secrets are not replay-cached, and each generated export is independently audited. F32 focuses on persisted scholarship/configuration workflow commands and the plan's critical-race acceptance gate.

The shared configuration guard intentionally serializes many operational writes. This favors correctness for the local MVP; these race tests are not a throughput benchmark. No broad automatic database retries were added, which avoids concealing an uncertain commit. Clients must reuse their original command key when retrying uncertain workflow responses.

## Validation

- `npm run test:concurrency-db`: all **six suites passed**: scholars, academic changes, receiving, imports, finalization/payments, and amendments. Includes injected failure rollback, period locks, stale evidence and duplicate-command cases.
- `npm run check`: lint, **155 unit tests / 34 files**, type checks, production build and secrets scan passed.
- No migration or new grants; the 29 applied migrations are unchanged.

## Files

`server/imports/service.ts`, `scripts/test-import-db.ts`, `scripts/test-ovr-finalization-scenarios.ts`, `scripts/test-concurrency.mjs`, package script/release metadata, implementation plan and README. No new form or workflow step is required.
