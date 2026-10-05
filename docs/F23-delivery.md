# F23 delivery — OVR Submission, Processing and Closure

Release 0.24.0, completed 2026-10-03 using XAMPP MariaDB. F00–F22 accepted; F23 implemented and tested, ready for acceptance. Next: F24 OVR amendments.

## Delivered

- Coordinator administrative submission of finalized batches; Staff/Coordinator processing with explicit dates, reasons and references.
- Initial immutable payment outcomes for every frozen member: Paid requires positive two-decimal money; Not paid requires zero and an explanation. Unique scholarship/cycle outcomes prevent duplicate payment records.
- Coordinator closure requires all outcomes and explicit reconciliation. The closure stores exact totals, counts, actor and processing evidence. Not-paid outcomes remain visible; closure does not assert everyone was paid.
- Current revision, chronological nonfuture dates, strict server input, role checks, CSRF and idempotent retries protect each command. Shared transactional locking serializes competing updates. Audit failure rolls back lifecycle events, outcomes and command receipts together.
- The F22 frozen roster/hash is preserved and verified before processing. Later source changes remain visible separately. Closed batches reject ordinary changes with `OVR_ALREADY_CLOSED`; closed/unavailable cycles block processing with `RECORD_LOCKED`. Completed exact retries remain available.
- Processing panel shows lifecycle metadata, missing members, outcomes and reconciliation totals. Closure controls stay disabled until every member has an outcome and disappear after closure.

## Files and database

Added `server/ovr/processing-{model,state,service,routes}.ts`, `src/OvrProcessingPanel.tsx`, portable rule tests and isolated database scenarios. Integrated OVR detail/history, route registration, authorization, runtime grants, readiness, release labels and documentation.

Migration `20261003090000_f23_ovr_processing.sql` adds `payment_records`, Coordinator `ovr.submit` and Staff/Coordinator `ovr.process`. Existing `ovr.close` remains Coordinator-only. Runtime receives SELECT/INSERT only on payment records. All 23 migrations and checksums verified on the local development database. Personal account credentials and roles were not changed.

## Verification

- `npm run check`: lint, 126 portable tests across 25 files, complete typechecking, production build and secret scan.
- `npm run test:ovr-processing-db`: 25 isolated scenarios (11 eligibility, 8 finalization, 6 processing), including authorization, invalid dates/amounts, frozen-roster membership, incomplete reconciliation, concurrent outcomes, audit rollback, duplicate prevention, closed mutations and retry conflicts.
- `npm run test:ovr-finalization-db`: 20 regression scenarios.
- `npm run test:rbac-db`: 10 scenarios including all 132 permission decisions across 33 permissions and four account types.
- `npm run test:db`: local connectivity, all migration checksums and restricted grants.
- Browser: Coordinator records Paid 1234.56 and explained Not paid 0.00, then confirms closure. Closure is disabled after only one outcome; no processing mutation controls remain after closure. Reviewed 1440×1000 desktop and 390×844 mobile screenshots with no horizontal overflow. Browser fixture and its disposable database/user were cleaned up.
- Local health reports F23/0.24.0 connected; readiness reports ready.

## Scope

Processing is available in open or locked cycles with available academic periods. Close batches before closing their cycle. Closing a batch does not close its entire payout cycle. F23 captures initial outcomes needed for reconciliation; F24 adds OVR amendments and F25 adds controlled payment corrections. No automatic payments or external disbursement integration are implemented.
