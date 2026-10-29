# LDSS — ADMIN-SYS-1A.3 COMPLETE ADMINISTRATOR BACKUP MANAGEMENT

## OBJECTIVE

Continue the LDSS Administrator development using the successfully provisioned and verified Windows backup-worker foundation.

Implement a functional Manual Backup and Backup History interface on the isolated 5181 UAT.

Do not repeat Windows account provisioning.

## 1. EXISTING VERIFIED FOUNDATION

The elevated V2 Apply and independent Verify both succeeded.

Confirmed:
- Worker: ldss_ipu_bkp
- apiTokenLimited: true
- workerServiceLogon: true
- workerAdministrator: false
- apiDenialsVerified: true
- workerProtectedPathDenialsVerified: true
- backupFeatureInstalled: false

Read AGENTS.md, ui-ux-pro-max, Playwright, BACKUP-1 and the ADMIN-SYS-1A through 1A.2 reports.

Reuse all accepted evidence. Do not repeat provisioning, ERD generation, migration investigations or unrelated financial tests.

## 2. TARGET

Frontend: http://127.0.0.1:5181/
API: http://127.0.0.1:3031
Database: ldss_restore_1793167108097_2b47a744

Expected schema: 149 tables, 3 views, 33 triggers, 67 migrations.

Protected primary: localhost:5173, 803 Paid records.

Operational LAN must remain untouched.

## 3. IMPLEMENT SECURE BACKUP WORKER

Use the existing dedicated Windows worker identity.

Implement:
- Restricted backup-worker runtime/service.
- Exact UAT database binding.
- Narrow source SQL/metadata access.
- Secure local IPC.
- Worker-only credentials and encryption key.
- Protected archive and job storage.
- Complete schema metadata visibility.
- Durable backup jobs and authenticated audit history.

Do not give the ordinary API privileged SQL credentials or access to the backup key.

Preserve existing BACKUP-1 encryption, archive format, capacity limits and complete verification logic.

Do not reuse the legacy API-readable backup key.

Prepare and verify protected off-host recovery custody for the new key before relying on new archives.

If elevated service installation is required, produce the exact reviewed, hash-checked operator command and stop at that gate. Do not bypass Windows authorization.

## 4. ADMINISTRATOR BACKUP PAGE

Add the fourth destination under Setup & Administration:

Accounts
Document Signatories
Program Settings
Backup, Restore & Updates

Use the existing action-first UI/UX principles.

The page must provide:
- Create Backup as the primary action.
- Backup History.
- Backup date and time.
- Archive size.
- Verification status.
- Inspect Details.
- Actual backup progress.
- Failed/interrupted recovery.

Use the existing loading system:
- Skeletons for reads.
- Button loading indicators.
- Protected progress dialogs.
- Durable exact retry.
- No duplicate submissions.
- No fake percentages or premature success messages.

Only currently authorized System Administrators may initiate backups. Staff and Coordinators must be denied.

Do not expose secret keys, raw SQL, private filesystem paths or technical JSON.

## 5. SECURITY AND TESTING

Use disposable copies for all mutation and failure tests.

Verify:
- Full encrypted backup creation.
- All schema objects and triggers captured.
- Full isolated database restoration.
- Account and payment evidence preservation.
- Administrator authorization.
- Staff/Coordinator denial.
- Secure IPC and filesystem permissions.
- Duplicate request prevention.
- Lost-response exact retry.
- Worker crash and restart recovery.
- Archive corruption rejection.
- Source-lock and disk-failure handling.
- Audit and job consistency.
- Historical evidence protection.

Use focused lint, typecheck, build and security tests.

Test the new page at 1440, 1024, 820, 375 and 320 CSS pixels.

Reuse unchanged accepted tests rather than repeating complete payroll or scholarship workflows.

## 6. ACTIVATION

Before 5181 installation, verify exact runtime identity, worker isolation, source integrity, encrypted recovery, current business-data preservation, command quiescence and application-only fallback.

Use fail-closed installation gates.

Activate only on 5181 after every mandatory gate passes.

Do not submit actual-UAT backup commands during browser acceptance unless specifically justified and safe.

Do not:
- Modify or restart primary 5173.
- Modify operational LAN.
- Restore an active database.
- Enable destructive Restore.
- Install update patches.
- Apply migrations.
- Reset historical financial records.
- Create desktop launchers.

## 7. COMPLETION REPORT

Create:

docs/requirements/ADMIN_SYS_1A_3_BACKUP_MANAGEMENT_REPORT.md

Report:
- Worker installation status.
- Windows and SQL isolation evidence.
- Backup API and durable-job behavior.
- Administrator interface.
- Encrypted backup and complete isolated restore results.
- Focused security/UI tests.
- UAT activation status.
- Primary/LAN preservation.
- Any remaining operator actions.
- Smallest next task.

Stop after successful verified 5181 installation or at a mandatory operator/security gate. Never claim an uninstalled feature is operational.