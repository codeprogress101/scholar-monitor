# F36 — UAT and production release preparation

Candidate v0.37.0. F35 accepted by continuation. F36 implementation and technical checks are prepared; the plan's Coordinator and technical-owner acceptance gate is still pending. No production deployment occurred.

## Delivered

- `npm run test:uat`: fail-fast sequential acceptance runner, new encrypted backup and isolated restore, complete `check`, live migration/grant verification and every `test:*-db` suite. It records source/dependency/migration/build SHA-256 values, rejects input changes during testing and saves current plus timestamped reports and suite logs in ignored `output/uat/`.
- Explicit regression assertions for an exam-passed scholar with missing grades remaining ineligible, and a new semester/checklist preserving earlier paid outcomes, corrections, reconciliation and finalized evidence. Live eligibility can update with policy; persisted financial history must remain unchanged.
- Separate synthetic role browser checks: Staff receiving, Coordinator Masterlists navigation, System Administrator configuration and operational scholar-access denial. Real accounts and demo data were not reset. The fixture and browser were closed afterward.
- [Human acceptance checklist](F36-acceptance-checklist.md) maps all nine mandatory scenarios to technical evidence and leaves each human result unsigned.
- [Release/rollback runbook](F36-release-runbook.md) defines migration freeze, pre-release backup, deployment checks, rollback triggers, prior artifact retention and reconciliation after backup-time data loss.

## Validation and evidence

The final gate passed all **35 suites**, including the **178-test unit suite**, all database workflows, concurrency, role/security checks, exports, reports, dashboard, profile, audit and recovery. Exact results and durations are in `output/uat/F36-report.json`; its status is `automated_passed_awaiting_signoff`. A subsequent integrity check matched all **386 recorded source/build files**, with no changed or missing files. Do not reuse evidence after modifying the candidate.

The gate's encrypted backup is `output/backups/ldss-1791127528063-4a31a552.ldssbackup`. Its 76-table restore passed in 1.422 seconds; evidence is `output/backups/restore-1791127528077_bd58fdbf.json`. The disposable recovery database was removed. Both added F36 regressions passed in the final gate: incomplete exam-passed scholars remain ineligible, and creating a new semester/checklist leaves previous payment history unchanged.

Browser screenshots are listed in the acceptance checklist. Browser coverage is a smoke check; full approval and concurrency behavior was exercised through real Fastify routes and disposable MariaDB databases. No visual redesign was introduced. The initial logged-out identity lookup produced an expected HTTP 401.

The frozen migration set remains 29 files through `20261004180000_f31_audit_viewer.sql`. No new migration or runtime grant change is required. The pre-release backup and successful restore report are linked by path in the gate report; secrets and SQL are excluded from that report.

## Outstanding acceptance and deployment work

The Coordinator and technical owner must review actual workflows and sign the exact candidate. Production hosting/TLS, network isolation, secrets, MFA policy, scheduled/offsite backups and a verified previous application artifact are not established by local test success. These are explicit release conditions in the checklist. No human decision is fabricated and no production readiness approval is inferred from the request to continue implementation.
