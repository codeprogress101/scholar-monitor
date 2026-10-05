# F25 delivery — Payment Record and Reconciliation

Release 0.26.0, completed 2026-10-03 on XAMPP MariaDB. F00–F24 accepted; F25 implemented and tested, ready for acceptance. Next: F26 scholar profile timeline.

## Delivered

- Staff/Coordinator can correct existing outcomes before closure, recording status, amount, effective date, remarks, reason, reference and actor. Paid requires positive two-decimal money; Not paid requires zero and an explanation.
- Closed batch/cycle or unavailable academic-period corrections require a request and approval by a different Coordinator. Requests and rejections leave effective outcomes unchanged. One pending request per payment prevents conflicting proposals.
- Original payment identity remains unique per scholarship/cycle. Corrections append evidence instead of updating or deleting original payment rows.
- Effective reconciliation resolves applied/approved outcomes, retains exact decimal totals and still detects missing required roster outcomes. Original closure totals, batch state and frozen roster remain intact after correction approval.
- Current revision, strict server input, CSRF, role checks, shared writer locking and idempotency protect commands. Audit failure rolls back correction, lifecycle event and retry receipt together.
- Browser panel shows original outcomes, effective payments, original closure totals, corrected totals, before/proposed evidence and decision history. System Administrator has no payment-operation authority.

## Files and migration

Added `server/ovr/payment-correction-{state,service,routes}.ts`, `src/PaymentCorrections.tsx`, unit tests and MariaDB scenarios. Integrated effective payment projection into OVR detail/closure reconciliation and updated authorization, runtime grants, readiness and release documentation.

Migration `20261003110000_f25_payment_corrections.sql` adds append-only correction snapshots and two permissions. Runtime receives SELECT/INSERT only. All 25 migration checksums and local restricted grants verified. Personal account credentials and roles were not changed.

## Verification

- `npm run check`: lint, 132 portable tests in 27 files, full typechecking, production build and secret scan.
- `npm run test:payments-db`: 28 isolated scenarios (11 eligibility, 8 finalization, 6 processing, 3 correction). Covers duplicate/missing payments, pre-closure corrections, invalid input, audit rollback, independent closed-period approval, rejection, concurrent decisions, immutable originals/closure totals and safe retries.
- `npm run test:ovr-amendments-db`: 26 regression scenarios.
- `npm run test:rbac-db`: 10 scenarios including all 148 permission decisions across 37 permissions and four account types.
- `npm run test:db`: local connectivity, 25 migration checksums and restricted grants.
- Browser: Coordinator approval changes effective total from 1500.25 to 1750.50; original payment 1234.56 and closure total 1500.25 remain visible. Approval controls disappear after decision. Reviewed desktop 1440×1000 and mobile 390×844 screenshots; no horizontal overflow. Disposable fixture cleaned up.
- Local health: F25/0.26.0 connected; readiness ready.

Use **Payout cycles → OVR drafts → Open OVR → Payment evidence and corrections**. Corrections are recordkeeping; no external disbursement or bank transfer is performed.
