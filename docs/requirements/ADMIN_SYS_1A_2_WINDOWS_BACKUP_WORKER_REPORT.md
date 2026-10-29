# ADMIN-SYS-1A.2 — Windows backup-worker provisioning handoff

29 October 2026, Philippine time. **Delivered a concrete operator provisioning package; stopped at the elevated setup gate. Nothing was installed on 5181.** The current session remains non-elevated and no appropriate worker account/service is present. The task expressly requires a reviewable idempotent script and exact elevated command in this situation. No UAC bypass, silent elevation or application activation was attempted.

The package prepares a restricted Windows account and protected storage, including actual API-token access tests for the operator to execute. **It does not yet implement a running worker, SQL capability, IPC, durable backup jobs, archive history, backup API or Administrator page.** No fourth navigation destination or nonfunctional backup control was added. The roadmap continues only after the operator foundation proof and the remaining implementation/recovery gates.

## Evidence reuse and current target

The [reuse/change-impact matrix](../../output/admin-sys-1a-2-20261029/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded script development. [ADMIN-SYS-1A.1](ADMIN_SYS_1A_1_SECURE_BACKUP_WORKER_REPORT.md), [ADMIN-SYS-1A](ADMIN_SYS_1A_MANUAL_BACKUP_AND_HISTORY_REPORT.md), [the plan](ADMIN_SYS_1_BACKUP_RESTORE_UPDATES_PLAN.md), [ADMIN-UX-1](../uiux/ADMIN_UX_1_ADMINISTRATOR_WORKSPACE_REDESIGN_REPORT.md), [ADMIN-ACCT-2](ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md) and [DB-ERD-1](../architecture/LDSS_DB_ERD_1_REPORT.md) were reviewed. Their accepted metadata experiments, schema documentation, recovery and UI evidence were reused, not repeated as new acceptance.

| Current boundary | Verified observation |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306 / 10.4.32** |
| UAT | **5181 / 3031**, `ldss_restore_1793167108097_2b47a744` |
| Accepted UAT release | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release` |
| UAT schema | **149 tables / 67 migrations / 33 triggers / 3 views / 0 routines/events** |
| UAT payrolls | PAY-001 **Processed v11**, PAY-002 **Review v3**, PAY-003 **Draft v2** |
| UAT payment evidence | Original payroll Not Paid/Unclaimed; payroll Paid **2026-10-19**; individual Paid **2026-10-28**, exact |
| UAT accounts / signatories | Original **3 accounts / 19 signatory rows, version 1**, unchanged |
| Controller / API / web | **30244 / 7264 / 4136**, unchanged; actual API token owner matches the fixed ADMIN SID and is limited |
| Primary | **5173/3001**, `ldss_primary_test_12676_61497616`, **150 tables / 67 migrations / 803 Paid** |
| Primary payrolls | PAY-001 **Processed v805**, PAY-002 **Processed v8**, PAY-003 **Draft v4**, exact |

The ordinary UAT SQL identity and account-administration capability remain unchanged. The selected release manifest, ownership profile, API wrapper and Node hashes bind the handoff to this target. No old ZIP, Git HEAD, primary profile or development launcher was substituted. [Starting inspection](../../output/admin-sys-1a-2-20261029/inspection.json).

## Exact Windows setup proposed

Five new operator files are under [scripts/backup-worker](../../scripts/backup-worker/README.md):

| File | Purpose |
|---|---|
| [Prepare-ProvisioningPackage.ps1](../../scripts/backup-worker/Prepare-ProvisioningPackage.ps1) | Verify the same bytes being copied; prepare protected operator staging and compiler storage; invoke only the fixed core and check failure before continuation |
| [Provision-IpUatBackupFoundation.ps1](../../scripts/backup-worker/Provision-IpUatBackupFoundation.ps1) | Read-only Plan; elevated Apply, Verify and guarded unused-foundation Rollback |
| [BackupFoundation.Native.cs](../../scripts/backup-worker/BackupFoundation.Native.cs) | Bounded Windows token, access-probe, exclusive-object and LSA-right primitives; no listener, SQL or process launcher |
| [provision-profile.json](../../scripts/backup-worker/provision-profile.json) | Fixed host/database/release/SID, source hashes, current workspace ACLs and denied credential paths; no passwords or keys |
| [README.md](../../scripts/backup-worker/README.md) | Complete effects, elevated procedure, password custody, verification, interruption limits and rollback |

The bootstrap pins the three payload files. Core pins the native helper/profile. The operator hashes the bootstrap bytes in memory before execution; it is not subsequently re-read from the API-writable workspace. The protected package is placed at **`C:/ProgramData/LDSS-IPUAT-BackupProvisioning`**. Its ACL excludes the limited API from data/code writes, and OWNER RIGHTS suppresses the same ADMIN owner's implicit WRITE_DAC. Compiler TEMP/TMP are protected; module discovery is restricted to Windows system modules for the invocation. Environment variables are restored afterward. Trusted SYSTEM/elevated local administrators remain within the recovery trust boundary; this is not isolation from a malicious local administrator.

Apply creates **`ldss_ipu_bkp`**, initially disabled. It permits service logon, explicitly denies interactive, Remote Desktop, network and batch logon, does not add Administrator membership and checks the actual service token. No SeBackup/SeRestore/SeDebug/Tcb right is granted. The worker root **`C:/ProgramData/LDSS-IPUAT-BackupWorker`** has read-only code/secret directories and worker-writable archive/job storage. A non-executable probe file allows access checks without installing dummy worker code.

A **new 32-byte manual-UAT backup key** is generated only during elevated Apply. The legacy shared key is API-readable, so copying it would not provide worker-only custody. The new key is a separate prospective lineage; the existing key/archives remain unchanged. BACKUP-1's existing explicit key argument supports this without changing its format or limits. Off-host key custody and recovery acceptance remain later gates; no key export is implemented.

A protected **`HKLM:/SOFTWARE/LDSS_IPUAT_BackupFoundation_v1`** ownership record binds the target, owner GUID, SID, source hashes, ACL/file fingerprints and setup phase. It is not a database migration, backup-job ledger or purported transactional rollback of filesystem/SAM work.

**Explicit existing-file metadata proposal:** the guard switch adds only a new-worker-SID Deny FullControl ACE to the repository operator `.env`, plus a Deny DeleteSubdirectoriesAndFiles ACE on its parent workspace. Both are non-inheriting. Existing allows/owners/content are preserved. These two workspace ACL changes are disclosed for operator review and are **not applied in this task**. No primary private-profile or LAN ACL change is in the script. Without the guard switch, new-account/root provisioning is refused.

The operator's actual limited API token must be denied key/archive access, code modification/creation/deletion/WRITE_DAC, provisioning-code/temp modification and ownership-registry access. The actual worker service token must read its key/code, be denied their overwrite/ACL changes, have job/archive creation permission and be denied the shared operator environment, primary profile, existing UAT credentials/capability and legacy key. A missing file or sharing error does not count as an access denial. **Those elevated acceptance tests remain pending.** No source-scoped SQL identity or primary/LAN database credential is provided by this foundation.

## Exact elevated operator command

First review the [full operator instructions and rollback](../../scripts/backup-worker/README.md). A normal read-only preview is:

```powershell
& 'C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/Provision-IpUatBackupFoundation.ps1' -Mode Plan
```

Then open **64-bit Windows PowerShell 5.1 as ADMIN using Run as administrator and `-NoProfile`**. No execution-policy bypass is needed or supplied. Run:

```powershell
$bytes = [IO.File]::ReadAllBytes('C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/Prepare-ProvisioningPackage.ps1')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($digest -cne 'c43e5ae959ec4b00188b56ebf9b51c6fde13f4fa602b71fede488972d591379e') { throw 'Provisioning bootstrap hash mismatch' }
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Apply -ApproveWorkspaceCredentialGuard
```

Use a new password-manager-generated **32+ character Windows worker password** at the secure prompt. The script does not print/save it or request existing Administrator, application or SQL passwords. Retain it in operator custody for Verify and eventual service installation; never send it or key contents back in chat.

Successful output explicitly says `foundationOnly: true`, `sqlConfigured: false`, `workerInstalled: false`, `backupFeatureInstalled: false`. Return only the non-secret status/proof for review. Repeating Apply on the exact completed unused foundation verifies it without password reset, key regeneration or ACL reapplication. Unknown accounts/services, source/version changes, altered ACLs/rights/groups, reparse points, added files or in-use storage are refused rather than repaired.

To verify, run the same hash-checked block with final invocation **`-Mode Verify`**. For an unused foundation only, change the invocation to **`-Mode Rollback -ConfirmRollback 'REMOVE UNUSED IP-UAT BACKUP FOUNDATION'`**. Rollback refuses later archive/job/configuration/runtime files, active services/processes and later ACL deltas. It removes only owned unused objects and the exact two deny ACEs; it never restores whole old ACLs or databases. The protected handoff package is retained as recovery evidence. An interrupted empty registry reservation before the first ownership record requires manual inspection, not automatic adoption.

## Focused tests and actual installation status

| Executed check | Result |
|---|---|
| Final PowerShell AST/SDDL/parameter/command assertions, native C# compilation and actual limited API-token owner/elevation reads | **21 assertions passed** |
| Core Apply / Verify / Rollback under current token | All **3 refused before provisioning** |
| Bootstrap under current token | Refused before protected staging/account creation |
| Modified copied target profile | Hash refusal before admission |
| Accepted release-gate tests | **9 passed**, existing exact source reused |
| Final payload hashes / operator instructions | Final sealed bytes match [handoff pins](../../output/admin-sys-1a-2-20261029/handoff-final-pins.json) |
| Live elevated Apply, idempotent replay, actual worker logon/file denials and rollback mutations | **NOT RUN — operator gate** |

[Final handoff acceptance](../../output/admin-sys-1a-2-20261029/handoff-acceptance-final.json) separates executed checks from pending elevated tests. Parser/compiler tests are not presented as proof of actual OS isolation. A path-separator comparison in the first target probe was corrected before sealing. A nested-shell test command initially expanded its own PowerShell variables; parser checks were moved into the test file. No elevated action was attempted in either case. Intermediate pins/test outputs remain task-local development evidence; the final pins and final acceptance are authoritative for this handoff.

No affected React/TypeScript/server change exists, so application builds, broad financial suites, duplicate ERD/metadata privilege experiments and unchanged UI screenshots were not rerun. ui-ux-pro-max, Playwright and security guidance were reviewed, but no new page exists for responsive/keyboard/native-zoom acceptance. BACKUP-1 capture/isolated restore, SQL metadata authority, Administrator/Staff/Coordinator authorization, CSRF, IPC, durable jobs, exact retry, lost-response/crash/disk/contention tests and the four-destination UI remain **unmet feature gates**. The existing backup engine's 128/192/96 MiB, 100,000-row and 120-second bounds remain unchanged.

## Preservation and legitimate concurrent activity

The fresh baseline contained **369 UAT audits**, not the earlier 368. During this task a separate application login was recorded at **29 October 2026, 11:55:09.222498 Philippine time**. The blanket unchanged-state check correctly refused: UAT `audit_logs`, `auth_sessions` and `auth_rate_limits` advanced, audits **369→370**, sessions **57→58**. This task made **zero application logins or business commands**.

An independent consistent read reproduced the full canonical checksum of all **369 original audit rows**, including microsecond timestamps, and identified the one additional `auth.login`. All other **146 UAT tables**, schema sections, journals and runtime/capability grants match. Original accounts/roles/passwords, documents/DV history, signatories, payrolls and all three UAT payment rows remain exact. No authentication state was restored or repaired, and no byte-identical claim is made for the three changed authentication tables. The original failed blanket check is retained alongside the [qualified preservation evidence](../../output/admin-sys-1a-2-20261029/qualified-preservation.json); it is not relabelled as all activation gates passing.

All **150 primary tables**, schema/journal/grants and **20,320 audits** match exactly. Its **803 Paid records** retain their dates: 2 on 24 October, 798 on 26 October and 3 on 28 October 2026. Both applications' current payroll states remain exact. Original private configuration, credential/capability files and legacy backup key hashes match. Both proposed workspace ACLs remain unchanged. Controller state/listener owners match, including retained 3002/3443 owners. **3001/5173/3031/5181 readiness all return 200**. [Preservation checkpoint and OS absence](../../output/admin-sys-1a-2-20261029/preservation.json).

No new worker account/service, ProgramData worker/staging directory or ownership registry key exists. **470 protected historical files**—including IP-UX-2 invalidation notices, ADMIN-SYS-1A/1A.1 and ERD documentation—remain exact. The earlier evidence loss was neither reconstructed nor hidden. Only new operator-package files, this report and [task-local files](../../output/admin-sys-1a-2-20261029/files.json) were added. [Content, links and augmented secret checks](../../output/admin-sys-1a-2-20261029/report-checks.json) include PowerShell/C# files that the ordinary JavaScript-oriented scanner does not cover.

**Actual status: prepared handoff only; Windows provisioning and the backup feature are NOT installed.** The next step is the reviewed elevated foundation command and its real proof, followed by isolated SQL/IPC/jobs/backup-history implementation and recovery acceptance. No primary restart, migration, restore, update, desktop launcher or operational LAN change occurred. **LAN-R2A remains paused. Stopped at the expressly requested operator provisioning gate.**
