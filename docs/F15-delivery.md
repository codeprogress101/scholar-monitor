# F15 delivery - Physical Requirement Receiving

Release 0.16.0, completed 2026-10-01 on XAMPP MariaDB. F00-F14 accepted; F15 implemented and tested, ready for acceptance. Next: F16 requirement verification and correction loop.

## Delivered behavior

Staff or Coordinator opens **Scholar registry -> profile -> annual scholarship record -> Semester requirement checklists** and chooses **Receive [code] hard copy** on a Not Submitted obligation. Record the received date, physical folder/box/storage location and audit reason. Physical reference and remarks are optional. The receiver is the signed-in individual; no arbitrary receiver field or file upload is accepted.

Saving records immutable custody history and displays **Submitted**, following the plan's Not Submitted -> Submitted -> For Verification sequence. Receipt does not verify a document, activate a scholarship or establish payout eligibility. Details include received date, receiver, storage location, optional reference/remarks, reason and the server-recorded timestamp.

Only an initial receipt is exposed. A second command with a new key is rejected clearly; the UI no longer offers receiving after receipt. Original details cannot be casually edited or overwritten. Exact retries return the original result without duplicate receipts/audits. Changed retries conflict. Concurrent receivers have one winner.

Received dates cannot be future dates or earlier than 1900. Historical receipt dates may precede checklist generation or semester start because physical documents can be logged later. The authenticated recorder remains the receiver; this release does not allow impersonating another receiving staff member.

## API and storage

`POST /api/v1/requirement-instances/:id/receive` requires `requirements.receive`, same-origin/CSRF protection, and a UUID `Idempotency-Key`. Body: `expectedVersion`, `receivedOn`, nullable `physicalReference`, `storageLocation`, nullable `remarks`, and `reason`. Initial state has revision 0; recorded receipt has revision 1. Extra actor, status, upload or definition-version fields are rejected.

`GET /api/v1/scholarships/:id/requirements` includes each obligation's projected status/revision and nullable receipt metadata. Reads remain Staff/Coordinator only through `scholars.read`. Existing role permissions are reused; no account or role assignments changed.

Migration `20261001110000_f15_requirement_receiving.sql` adds append-only `requirement_receipts` and `requirement_receipt_commands`, with SELECT/INSERT-only runtime grants. A unique instance key ensures one initial receipt; restrictive foreign keys preserve instance and receiver links. The receipt, before/after audit and retry receipt commit together under the shared configuration guard. Current locking reads prevent stale concurrent receipts. Audit failure rolls back all writes.

The F14 instance remains an immutable generation record whose initial database status is Not Submitted. The current read model derives Submitted from its immutable receipt; definition-version links and generation metadata remain untouched. Later policy retirement or repeated checklist generation cannot erase custody history.

## Boundaries for subsequent checkpoints

Locked or archived semesters/academic years block new receipt commands. History remains readable and exact completed retries remain safe after closure. Payout-specific receipt/lock integration belongs to F18, when authoritative payout-backed checklists exist; no payout lock behavior is claimed here.

F16 must extend the current status/revision projection and add explicit verification, correction and resubmission events while preserving the initial receipt. Initial receiving must continue to require the true Not Submitted state; never reopen Verified, Waived or already-received requirements through this endpoint. Verified and Waived are not yet available in this checkpoint. F17 waiver integration must participate in the same current-state guard. There is no generic receipt-edit, replacement, relocation, verification or waiver command in F15.

## Files and validation

Core: `server/requirements/receipt-{validation,service,routes}.ts`, receipt projection in `instances-service.ts`/`instances-model.ts`, `src/RequirementReceiptForm.tsx` and checklist integration. Migration/grants, schema readiness, release badges and migration-count expectations are updated. Earlier applied SQL remains unchanged.

- `npm run check`: lint, 95 portable tests, client/server/tool/test typechecks, production build and secret scan passed.
- 31 database scenarios passed: nine F15 receiving, twelve F14 generation regressions and ten RBAC regressions. Includes authorization/forged fields, initial receipt audit, safe retry/duplicates, concurrent receivers, optional metadata/historical dates, atomic rollback, pinned policy preservation, restricted grants/uniqueness/CSRF and closed-period guards.
- Browser: Staff recorded a physical receipt, observed Submitted and attributed storage details, refreshed with metadata preserved and no second receive action. Desktop/mobile screenshots were visually inspected with no horizontal overflow. Artifacts: ignored `output/playwright/f15-receipt-desktop.png` and `f15-receipt-mobile.png`. Disposable fixture stopped and cleaned up.
- Local migration applied. `npm run test:db` passed connectivity, fifteen migration checksums and denied history mutations. Health reports F15/0.16.0 with database connected; readiness passed. No real scholar receipt was created by verification.
