# ADMIN-SYS-1A.2 — Guarded recovery and corrected provisioning handoff

29 October 2026, Philippine time. **Prepared and fixture-tested; no privileged cleanup or provisioning executed.** The Registry path failure is reproduced. A separate early-failure cleanup script and separately sealed v2 provisioning package are ready for operator inspection. The protected ownership record remains unreadable to this session; **cleanup eligibility is not yet established on the real partial installation**.

Read with the [original handoff](ADMIN_SYS_1A_2_WINDOWS_BACKUP_WORKER_REPORT.md) and [first failure diagnosis](ADMIN_SYS_1A_2_PROVISIONING_FAILURE_DIAGNOSIS.md). Do not repeat the original Apply/Rollback commands or edit the old sealed package.

## Registry error and whether rollback changed state

The original `Get-Registration` first opens the key through .NET, then calls `Get-Sddl`, whose implementation is `Get-Acl -LiteralPath`. On this host's Windows PowerShell 5.1, **that Registry-provider LiteralPath operation raises `GetAcl_PathNotFound` even for the existing `HKLM:\SOFTWARE` key**. It also fails for the ownership key using HKLM, Registry:: and fully qualified provider spellings. A direct 64-bit .NET Registry handle successfully reads the ownership key's owner/group/DACL and reproduces the exact expected private ACL. This is a provider-path handling failure, not evidence that the key disappeared. No ACL relaxation is needed.

The original `Invoke-Rollback` calls `Get-Registration` before its account/ACL/directory/Registry removal steps. The reported failure at that check therefore precedes destructive rollback work. Bootstrap/native compilation can perform temporary-file housekeeping first; its protected temporary contents are unavailable here. There is no original elevated error trace or readable ownership record, so this report does not claim a byte-exact comparison of all protected contents.

The **13:39 Philippine-time** read-only recheck confirms the same visible state:

| Object | Result |
|---|---|
| Worker account/service | `ldss_ipu_bkp` absent; no reserved-name or worker-identity service. |
| Worker root | Same **12:59:21.0933175** creation time and exact initial protected ACL; no worker-SID ACE. Root listing remains denied to the limited token. |
| Original protected package | Same **12:40:08.2892592** creation time and protected ACL. Contents require elevated inspection. |
| Ownership registration | Exists; direct ACL-only read matches the original expected ACL. Record/phase/SID/deltas remain unavailable. |
| Workspace credential guards | Both SDDL values remain exactly the pinned pre-Apply baselines. |
| Runtime listeners | Primary **3001/39400, 5173/19292**; UAT **3031/7264, 5181/4136**; retained/LAN **3002/8620, 3443/14816**, unchanged (port/PID). |

No SQL connection, application login, business command, runtime restart, account change, key read or ACL mutation was performed against the real environments. Database/financial acceptance was not rerun or claimed. [Current metadata](../../output/admin-sys-1a-2-repair-20261029/current-inspection.json).

The **13:46:51 Philippine-time final recheck** still finds no worker account/service, unchanged credential guards, and no new protected v2 package or recovery-evidence directory. [Final limited inspection](../../output/admin-sys-1a-2-repair-20261029/final-inspection.json). Real protected cleanup/provisioning was not started.

## Corrections and safety boundaries

**Cleanup:** [Repair-EarlyFailedFoundation.ps1](../../scripts/backup-worker/recovery/Repair-EarlyFailedFoundation.ps1) defaults to Inspect. Cleanup accepts only the specific v1 `FailedDisabled` record with null worker SID/proof, zero recorded file/ACL/guard deltas, matching target/source pins and incident timing, absent account/service, unchanged workspace guards and the exact empty initial root/ACL/creation time. It verifies the original protected payload hashes/ACLs and current bound UAT metadata/processes. Any other partial state refuses; it does not adopt an account, repair permissions or truncate evidence.

After explicit confirmation, it creates protected **`C:/ProgramData/LDSS-IPUAT-BackupRecovery-20261029`**, saves the original ownership value and before-state metadata, rechecks the root/registration, deletes the **empty directory nonrecursively**, then deletes the exact childless Registry key using .NET. Root-removal and completion receipts are separate. Original protected package/temporary files are retained. No key/password/account/service manipulation occurs. This is not an atomic filesystem/Registry transaction. Existing recovery evidence or interruption causes refusal; inspect receipts and remaining state rather than deleting evidence or silently resuming.

**Provisioning v2:** [separate package](../../scripts/backup-worker/v2/README.md), protected destination **`C:/ProgramData/LDSS-IPUAT-BackupProvisioning-v2`**. The account description is **`LDSS IPUAT ` + full GUID = 47 characters**, consistently used by creation and both ownership checks. An installed-metadata length preflight runs before registration/root creation. Registry ACL checks and deletion use explicit 64-bit .NET handles; exact ACL comparison remains mandatory. Sanitized error classification/line is retained on future failure without arbitrary exception payloads. The bootstrap refuses legacy/partial state before staging; a completed matching v2 replay retains the original verify-without-reset behavior.

V2 uses the existing fixed worker name/root and Registry subkey; its record/profile version is **foundation-v2** and its source hashes differ. The private profile changes **only its version**; all existing host/database/release/configuration bindings remain exact. The original core, helper, profile and bootstrap remain unchanged. No previous ownership record is rewritten or reclassified as v2.

## Executed verification and limits

**38 checks passed** on an owned disposable output tree and nonce-scoped **HKCU** key: actual LiteralPath failure versus .NET access, owner/group/DACL validation, exact record/payload checks, empty-root cleanup and preserved evidence; rejection of foreign hashes/database, worker SID/account, recorded guard deltas, wrong phase/time, additional files/Registry values/subkeys, changed Registry ACL, wrong confirmation and pre-existing recovery evidence. Bootstrap fixtures cover legacy/incomplete refusal, absent-state admission, completed replay and missing-root refusal. All task-owned fixture folders/keys were removed.

The corrected account-call syntax passed a **mock SAM command** with the actual 48-character validation contract and disabled flag; no local account was created. Parser tests and independent Node SHA-256 checks passed. All three entry points refused the actual non-elevated token before protected mutations. The live ownership ACL also matches using an explicit read-permissions-only Registry handle. [Fixture results](../../output/admin-sys-1a-2-repair-20261029/fixture-tests.json), [independent seals](../../output/admin-sys-1a-2-repair-20261029/seal-checks.json).

These are **not** live elevated HKLM/SAM/LSA provisioning, worker service-logon or API/worker token-isolation acceptance. Those remain operator gates. Fixture ACLs grant the limited test identity control of its own HKCU/output objects; production ACLs were not relaxed. Initial fixture helpers needed an explicit write-DACL handle, an access-only ACL restore and separate Mode variable scope; final checks retain the full assertions. No application build, UI or financial regression rerun was warranted by these operator-only changes.

## Exact operator commands

Use **64-bit Windows PowerShell 5.1, Run as administrator, `-NoProfile`**, as the reviewed ADMIN identity. No automatic elevation or execution-policy bypass is supplied. Each block hashes the bytes it executes in memory; it does not re-read the script for execution. **Run one step at a time.** A mismatch, refusal or unexpected state means stop and preserve the output/state. Do not change a hash to make a command run.

### 1. Inspect only — run this first

```powershell
$bytes = [IO.File]::ReadAllBytes('C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/recovery/Repair-EarlyFailedFoundation.ps1')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($digest -cne 'fee07b7ce7ecfcd05ff04075a18dc612fb8baca84833bf8c37bed0806349c83d') { throw 'Recovery script hash mismatch.' }
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Inspect
```

It must return `safeEarlyState: true`, `rootEmpty: true`, `accountAbsent: true`, `changed: false`. If it refuses, **do not run steps 2 or 3**. In particular, an absent/malformed/mismatched record or nonempty root needs a reviewed recovery plan for that actual state, not forced cleanup.

### 2. Guarded cleanup — only after step 1 passes and operator approval

```powershell
$bytes = [IO.File]::ReadAllBytes('C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/recovery/Repair-EarlyFailedFoundation.ps1')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($digest -cne 'fee07b7ce7ecfcd05ff04075a18dc612fb8baca84833bf8c37bed0806349c83d') { throw 'Recovery script hash mismatch.' }
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Cleanup -ConfirmCleanup 'REMOVE ONLY VERIFIED EMPTY FAILED FOUNDATION'
```

Require `cleanupPerformed`, `rootRemoved`, `registrationRemoved` and `originalPackagePreserved` all true, plus the protected `complete.json` receipt. Cleanup needs **no password**. It deliberately refuses an already absent registration or existing recovery directory rather than treating unknown state as success. If interrupted, preserve `ownership-record.json`, `before.json`, any `root-removed.json`, the original package and all remaining objects for review.

### 3. Subsequent corrected provisioning — separate decision after completed cleanup

```powershell
$bytes = [IO.File]::ReadAllBytes('C:/xampp/htdocs/scholar_monitor/scripts/backup-worker/v2/Prepare-ProvisioningPackage.ps1')
$sha = [Security.Cryptography.SHA256]::Create()
try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($digest -cne '86fc82b5b942f8aec7a030772eb437edd50fb00b6361b05b16153cfb1ec17714') { throw 'V2 bootstrap hash mismatch.' }
& ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString($bytes))) -Mode Apply -ApproveWorkspaceCredentialGuard
```

The existing secure prompt is only for the intended worker's password-manager-generated **32+ character** Windows password; no password is required from the operator during this diagnosis. Do not send it in chat. The unchanged two workspace worker-deny ACEs still require the explicit guard switch. Successful output must confirm the real isolation proof and `foundationOnly: true`, `sqlConfigured: false`, `workerInstalled: false`, `backupFeatureInstalled: false`. Failure remains a stop, not authority to alter the source or retry with another identity. A later verification uses the same v2 hash-checked block with **`-Mode Verify`**, omitting the guard switch; this retains the existing secure worker-password requirement for actual service-token testing.

## Files, seals and preservation

New files: recovery script; v2 core, native-helper copy, bootstrap, README, [hash inventory](../../scripts/backup-worker/v2/handoff-pins.json) and private version-only profile; this report. `.gitignore` additionally excludes the new machine-bound profile; `.gitattributes` preserves new sealed payload line endings. Task-local drivers/evidence remain ignored. No existing provisioning package/source was edited.

| Payload | SHA-256 |
|---|---|
| Recovery script | `fee07b7ce7ecfcd05ff04075a18dc612fb8baca84833bf8c37bed0806349c83d` |
| V2 bootstrap | `86fc82b5b942f8aec7a030772eb437edd50fb00b6361b05b16153cfb1ec17714` |
| V2 core | `886a97f9dac0fa1663feb694934e38305c287122a18adb98e26c56b1fbf09f5b` |
| Native helper, unchanged | `466d15f822f8e613f0575e18004f6c41a53f2216e526f65224c53cfc3ea18711` |
| Private v2 profile | `bcdbb67ee2b44e184658f3137178f88652a8c9cfeaaadf03b6716756525a3528` |

Primary 5173, UAT 5181, operational LAN, database/schema/financial histories, application sessions, original ownership evidence and protected files were not modified. This does not claim a new complete database checksum acceptance. **Stopped before privileged changes.** No worker/service/backup feature was activated; LAN-R2A remains paused.
