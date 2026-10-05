# F24 delivery — OVR Amendment

Release 0.25.0, completed 2026-10-03 on XAMPP MariaDB. F00–F23 accepted; F24 implemented and tested, ready for acceptance. Next: F25 payment records and reconciliation.

## Delivered

- Staff/Coordinator requests one member addition, removal or batch-name correction. A different Coordinator approves or rejects with reason/reference and recorded identity/timestamps.
- Request and decision snapshots preserve old/proposed/approved membership and source evidence. Original F22 snapshots and earlier approved versions remain intact.
- Pending amendments pause administrative processing. Approval validates the entire proposed roster again, including current eligibility, source fingerprints and duplicate membership, then creates a new effective version and requires administrative resubmission.
- Processing and reconciliation use the latest approved roster. Membership event history continues to enforce cycle-wide uniqueness.
- Amendments require finalized/submitted batches and open, available payout cycles. Processing, closed batches and locked/closed cycles prevent amendments. Post-processing payment corrections remain F25.
- Shared transaction locking, current revision, strict server input, role checks, CSRF and idempotency protect commands. Roster changes, amendment evidence, lifecycle events, audit and retry receipts commit atomically.
- The browser presents original and effective rosters, before/proposed comparisons, decision history, request forms and separate approval controls.

## Files and migration

Added `server/ovr/amendment-{state,service,routes}.ts`, `src/OvrAmendments.tsx`, unit tests and isolated MariaDB scenarios. Updated OVR detail, processing, authorization, grants, readiness and release documentation.

`20261003100000_f24_ovr_amendments.sql` adds append-only `ovr_amendments` snapshots and two permissions. Runtime receives SELECT/INSERT only; no UPDATE/DELETE. All 24 local migrations and checksums verified. Personal account credentials and roles were not changed.

## Verification

- `npm run check`: lint, 129 portable tests across 26 files, client/server/tools typechecking, production build and secret scan.
- `npm run test:ovr-amendments-db`: 26 isolated scenarios (11 eligibility, 8 finalization, 7 amendment), covering authority, self-approval, rejection, pending processing blocks, rollback, concurrent approval, immutable originals, stale additions, resubmission and payment reconciliation using the approved roster.
- `npm run test:ovr-processing-db`: 25 regression scenarios.
- `npm run test:rbac-db`: 10 scenarios including all 140 permission decisions across 35 permissions and four account types.
- `npm run test:db`: local connectivity, all migration checksums and restricted grants.
- Browser: Coordinator approves a pending Staff removal; effective roster becomes one member while original two-member snapshot remains available. Approval controls disappear and administrative resubmission becomes available. Desktop 1440×1000 and mobile 390×844 screenshots reviewed; no horizontal overflow. Disposable fixture cleaned up.

Use **Payout cycles → OVR drafts → Open OVR → OVR amendments**. API commands are POST `/api/v1/ovr-batches/:id/amendments/request`, `/approve`, and `/reject`.
