# IP-UAT backup Windows foundation — operator handoff

**Prepared, not applied.** This package establishes the OS foundation only. It does not install a worker service, connect to SQL, create a backup, change LDSS permissions, or add the Backup History page. The current session cannot perform elevated provisioning. ADMIN-SYS-1A.2 explicitly stops at this gate.

The machine-bound `provision-profile.json` is intentionally excluded from Git. A clone is not a complete provisioning package: the reviewed private profile and its exact pinned hash are required. Do not generate a replacement profile or change the seals merely to make provisioning run.

## Review the exact effects

Fixed target: **DESKTOP-BPLJKRP**, UAT **5181/3031**, database `ldss_restore_1793167108097_2b47a744`, accepted release `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`. No caller chooses a database, executable, directory or SQL command.

The bootstrap creates an operator-only handoff directory at `C:/ProgramData/LDSS-IPUAT-BackupProvisioning`, containing the three hash-verified payload files and an empty protected compiler `tmp` directory. Source bytes are validated once and those same bytes are copied; mismatched existing files/ACLs are refused, not repaired. System-only PowerShell module lookup and protected TEMP/TMP are scoped to the invocation and restored afterward.

Apply then creates:

- **Local Windows account:** `ldss_ipu_bkp`, initially disabled, never added to Administrators. Only default Users membership is tolerated; actual service-logon token must also be nonadministrator.
- **Direct logon rights:** `SeServiceLogonRight`; deny ordinary interactive, Remote Desktop, network and batch logon. No backup/restore/debug/Tcb privilege is granted. Local/group policy can still prevent setup; the script will stop rather than override it.
- **Worker root:** `C:/ProgramData/LDSS-IPUAT-BackupWorker`, with `bin`, `secrets`, `archives` and `jobs`. Worker can read code/secrets and modify only archive/job storage. Code and key overwrite/ACL changes are checked separately.
- **One fresh 32-byte key:** `secrets/backup.key`, for prospective manual-UAT archives only. The existing shared BACKUP-1 key and all existing archives remain untouched. This is a new key lineage, not a copy/rotation of the API-readable legacy key. BACKUP-1 already accepts an explicit key argument; the future worker must bind this key explicitly.
- **One inert file:** `bin/acl-probe.dat`; not an executable or fake worker.
- **Private ownership registration:** `HKLM:/SOFTWARE/LDSS_IPUAT_BackupFoundation_v1`, binding version, source hashes, target, owner marker, SID, ACL/file hashes and setup phase. This is operator setup metadata, not a backup-job ledger.

**Two existing workspace ACL changes require the explicit guard switch:**

1. Add a non-inheriting **Deny FullControl** ACE for the new worker SID on `C:/xampp/htdocs/scholar_monitor/.env`.
2. Add a non-inheriting **Deny DeleteSubdirectoriesAndFiles** ACE for that SID on `C:/xampp/htdocs/scholar_monitor`, preventing deletion of the guarded credential through parent-directory rights.

No existing allow ACE, owner, file content or primary/LAN runtime profile is intentionally changed. Neither new ACE is inherited. The current workspace ACLs are pinned in `provision-profile.json`; changed ACLs/configuration cause refusal. These two metadata changes are part of the operator's concrete review, not hidden side effects. Without the switch, no worker account/root is provisioned.

Private-directory ACLs allow SYSTEM and **elevated** local Administrators, plus the worker's narrow rights. There is no explicit allow for the ordinary ADMIN user SID. OWNER RIGHTS limits implicit owner permissions; otherwise the same ADMIN SID could retain WRITE_DAC despite a protected DACL. Trusted local SYSTEM/elevated administrators remain inside the recovery trust boundary. This is not isolation from a malicious local administrator. [Microsoft SID documentation](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers).

## First: read-only Plan

In ordinary Windows PowerShell:

```powershell
& 'C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/Provision-IpUatBackupFoundation.ps1' -Mode Plan
```

Plan verifies target ownership/source pins and the actual loopback listener owners; it makes no provisioning changes. It does not prove that elevated ACL application or worker logon has passed.

## Exact elevated setup

Open **64-bit Windows PowerShell 5.1 as ADMIN, using Run as administrator and `-NoProfile`**. There is no automatic elevation or execution-policy bypass. Review this file and the [completion report](../../docs/requirements/ADMIN_SYS_1A_2_WINDOWS_BACKUP_WORKER_REPORT.md) first.

Run this block. It hashes the same bytes it executes, so an API-writable workspace file is not re-read after validation. The bootstrap then executes only the protected copy with pinned dependencies.

```powershell
$bytes = [IO.File]::ReadAllBytes('C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/Prepare-ProvisioningPackage.ps1')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($digest -cne 'c43e5ae959ec4b00188b56ebf9b51c6fde13f4fa602b71fede488972d591379e') { throw 'Provisioning bootstrap hash mismatch' }
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Apply -ApproveWorkspaceCredentialGuard
```

The secure prompt needs a **new password-manager-generated 32+ character password for this Windows worker only**. Keep it in operator custody for later Verify/service installation. Do not reuse the Administrator, application or SQL password. The script never prints/saves the password; the temporary native password buffer is cleared. It does not request a primary/LAN/SQL credential. [Microsoft service-logon contract](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-logonuserw), [account-right assignment](https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsaaddaccountrights).

Successful output says **Windows foundation provisioned and verified**, with `foundationOnly: true`, `sqlConfigured: false`, `workerInstalled: false`, and `backupFeatureInstalled: false`. Anything else is not permission to continue installation. Do not send passwords, key contents or private profile files with the result.

## What elevated verification actually tests

- Actual live API process token: expected SID, limited token, key/archive read denied; code creation/write/delete/WRITE_DAC denied; provisioning source/temp modification denied; private registry read/write denied.
- Actual worker **service-type** logon: expected SID and no Administrator authority; code/key read allowed; code/key overwrite and code WRITE_DAC denied; job/archive creation permission allowed.
- Worker read denied for the shared operator `.env`, primary private profile, original UAT ownership/account capability and legacy backup key. The parent-directory delete route is also denied.
- Every result is an actual Windows access result. Only `ERROR_ACCESS_DENIED` (5) counts as a denial; missing paths or sharing errors do not masquerade as protection.

These elevated tests are **pending**, not already passed by the development session. This is not a universal sandbox or a host-wide LAN credential audit. No primary/LAN credential is supplied to the worker. Final worker activation still needs its own source-scoped SQL authority, immutable runtime/dependency/native-tool package, restricted IPC and all remaining gates.

Run the same verified-bytes block with **`-Mode Verify`**, omitting the guard switch, for a fresh check. Repeating **Apply** on the exact owned completed setup verifies it without recreating the account, resetting the password, regenerating the key or reapplying ACLs. Unexpected source/SID/rights/group/ACL/file differences are refused.

## Failure and rollback

New accounts remain disabled until deny rights and credential guards are in place. A later failure disables the owned worker and records `FailedDisabled`; no service is installed or started. Partial setup is never silently adopted. A process interruption before the first ownership record may leave an unrecognized empty registry reservation; it requires operator inspection, not a force/adopt switch.

For an **unused** owned foundation, run the verified-bytes block with its last line changed to:

```powershell
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Rollback -ConfirmRollback 'REMOVE UNUSED IP-UAT BACKUP FOUNDATION'
```

Rollback checks the protected ownership record, SID/description, source pins, account groups/rights, actual processes/services, fixed absolute root, no reparse entries and exact allowed unused files. **Any archive, job, added configuration/runtime code, running worker or later ACL delta stops removal.** It removes only the two recorded deny ACEs, the owned unused account/rights/root/key and ownership registration. It does not restore a stale whole ACL, restore any database or delete later financial evidence. An already-absent foundation is a no-op only when no unregistered account/root/service remains.

The protected provisioning package is deliberately retained as recovery evidence. Do not delete it or its temporary contents automatically if review is required. No failed command may be followed by service activation; the bootstrap checks the core exit result explicitly.

## Remaining development after the operator gate

No worker runtime/service, SQL credential/grant, backup permission, authenticated IPC, durable backup jobs, archive inventory, history UI or Create Backup endpoint exists in this package. Do not try to start the reserved service name. After actual foundation proof is reviewed, continue isolated implementation and disposable capture/recovery/fault tests, then create a separately verified elevated runtime-install handoff and consider 5181-only activation. Primary and operational LAN remain protected.
