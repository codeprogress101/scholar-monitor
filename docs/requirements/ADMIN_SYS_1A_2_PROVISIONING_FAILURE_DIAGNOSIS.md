# ADMIN-SYS-1A.2 — Failed Windows provisioning diagnosis

29 October 2026, Philippine time. **Diagnosis only. A deterministic account-description validation defect was found. The worker account is absent; protected provisioning and worker-root directories exist. No Apply, Verify, Rollback, account/ACL mutation, service installation or password prompt was executed during this investigation.** The protected ownership record still needs elevated read-only inspection before cleanup is approved.

Reviewed the [original handoff report](ADMIN_SYS_1A_2_WINDOWS_BACKUP_WORKER_REPORT.md), [operator README](../../scripts/backup-worker/README.md), core provisioning script, bootstrap and native helper. The earlier report's absence statements describe its pre-operator checkpoint; they are not the current partial-installation state.

## Cause and failure sequence

At [core line 253](../../scripts/backup-worker/Provision-IpUatBackupFoundation.ps1:253), account creation supplies `-Description ('LDSS IP-UAT Backup '+$record.owner)`. The prefix has **19 characters**, and the GUID has **36**, giving **55 characters**. This host's installed `New-LocalUser` command exposes a `ValidateLengthAttribute` with **maximum 48** on `Description`. Microsoft's [Windows PowerShell 5.1 documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.localaccounts/new-localuser?view=powershell-5.1#-description) confirms that limit.

Consequently, that argument cannot pass parameter validation; account creation cannot reach its Windows account-writing operation. This is an implementation defect, not evidence of a wrong worker password. The live state is consistent with the ordered code: registration reservation/save → worker-root creation → rejected account command → failure handler. The root was created at **12:59:21.0933175 Philippine time**. No account is currently present through either `Get-LocalUser` or a second CIM account query.

The [catch at lines 277–280](../../scripts/backup-worker/Provision-IpUatBackupFoundation.ps1:277) replaces the underlying exception with the reported generic message. It attempts to record `FailedDisabled`; it only disables an account if a worker SID was recorded. **“Owned worker remains disabled” does not prove an account exists.** There is no saved exception/step in that record format. The original error record and protected phase were unavailable to this non-elevated session, so their exact contents and any intervening operator activity are not claimed as recovered. The 55-versus-48 defect is established independently by source and installed command metadata.

## Actual inspected state

Observed beginning **13:01 Philippine time**, on DESKTOP-BPLJKRP, Windows PowerShell **5.1.26100.9711**, with a non-elevated token. [Restricted inspection evidence](../../output/admin-sys-1a-2-diagnosis-20261029/inspection.json) contains metadata only.

| Object | Confirmed result / limit |
|---|---|
| `ldss_ipu_bkp` | Not found by both local-account readers. No password or password hash was inspected. |
| Ownership registration | `HKLM:\SOFTWARE\LDSS_IPUAT_BackupFoundation_v1` exists: an explicit READ_CONTROL-only open retrieved its ACL. Reading `Record` was denied. Phase, ownership GUID, stored SID and recorded deltas remain unconfirmed. No ACL bypass was attempted. |
| Registration ACL | Protected; SYSTEM and Administrators have full key rights; OWNER RIGHTS has ReadControl. Consistent with the intended private registration. |
| Protected package | `C:\ProgramData\LDSS-IPUAT-BackupProvisioning` exists, created **12:40:08.2892592**. ACL metadata is readable; listing/file access is denied. Its installed payload bytes and compiler-temp contents remain unverified. |
| Worker root | `C:\ProgramData\LDSS-IPUAT-BackupWorker` exists. ACL has SYSTEM/Administrators FullControl and OWNER RIGHTS ReadControl, with no worker-SID ACE. Listing is denied. This matches the initial root ACL before account creation. |
| `bin`, `secrets`, `archives`, `jobs` | Direct child-path probes returned ItemNotFound. Because root listing is denied, elevated enumeration must confirm the complete tree and absence of unexpected objects. No key was opened or hashed. |
| Existing credential guards | Workspace directory and `.env` SDDL exactly match the pinned pre-Apply baselines. Neither proposed worker-deny ACE is present. `.env` contents were not read. |
| Worker service | No service with reserved name `LDSSIPUATBackup` or the worker's local logon identity found. No service action performed. |
| Workspace sealed payloads | Core `6efac298…0d1f1`, native helper `466d15f8…18711`, bootstrap `c43e5ae9…1379e` remain exact. They were not edited. Protected-copy comparison requires elevation. |

Current listener owners remain the accepted ones: primary **3001/39400, 5173/19292**; UAT **3031/7264, 5181/4136**; retained/LAN **3002/8620, 3443/14816** (port/PID). No runtime was restarted, no application session was used, and no SQL connection or application business command was issued. This is a read-only OS diagnosis, **not a new full financial-table preservation or backup acceptance run**. Historical evidence and the original failed package remain untouched.

## Exact next safe operator action: elevated inspection only

Open **64-bit Windows PowerShell 5.1 as Administrator, with `-NoProfile`**. Paste this read-only block directly. It does not invoke the provisioning package, compile a helper, request a password, read key/credential contents, change ACLs or delete anything. Return its metadata output; do not send passwords, private profiles or key files.

```powershell
$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal]::new(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -or
    -not [Environment]::Is64BitProcess -or $PSVersionTable.PSEdition -ne 'Desktop') {
    throw 'Use already elevated 64-bit Windows PowerShell 5.1.'
}
if ($env:COMPUTERNAME -cne 'DESKTOP-BPLJKRP') { throw 'Wrong host.' }
# If this is the ORIGINAL failed shell, report only error classification.
$Error | Where-Object { $_.FullyQualifiedErrorId -like '*NewLocalUser*' } |
    Select-Object -First 3 FullyQualifiedErrorId,
        @{n='ExceptionType';e={$_.Exception.GetType().FullName}},
        @{n='Line';e={$_.InvocationInfo.ScriptLineNumber}}
$subkey = 'SOFTWARE\LDSS_IPUAT_BackupFoundation_v1'
$key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($subkey)
if ($null -eq $key) { throw 'Ownership registration absent; preserve objects.' }
try {
    $text = $key.GetValue('Record', $null)
    if ($null -eq $text) { throw 'Record missing; preserve reservation.' }
    $r = $text | ConvertFrom-Json
    [pscustomobject]@{
        Version=$r.version; Phase=$r.phase; CreatedAt=$r.createdAt
        Database=$r.database; Root=$r.root; WorkerSid=$r.workerSid
        AclCount=@($r.acls).Count; FileCount=@($r.files).Count
        GuardCount=@($r.guards).Count; ProofPresent=($null -ne $r.proof)
        CorePinMatches=($r.scriptHash -ceq '6efac29817d25105c718d8859fb808705e367a72112b0cca93ef1b7cfe70d1f1')
        ProfilePinMatches=($r.profileHash -ceq '692dd496ac846820eca78d72b8b413761447eab2019c7fa8e4b336b80289605b')
    } | Format-List
} finally { $key.Dispose() }
Get-Acl -LiteralPath ('Registry::HKEY_LOCAL_MACHINE\'+$subkey) |
    Select-Object Path,Sddl | Format-List
try {
    Get-LocalUser -Name ldss_ipu_bkp -ErrorAction Stop |
        Select-Object Name,Enabled,SID,Description | Format-List
} catch {
    if ($_.FullyQualifiedErrorId -like 'UserNotFound,*') { 'Worker account absent.' }
    else { throw }
}
foreach ($root in @('C:\ProgramData\LDSS-IPUAT-BackupProvisioning',
                    'C:\ProgramData\LDSS-IPUAT-BackupWorker')) {
    $item = Get-Item -LiteralPath $root -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'Reparse root: stop; do not traverse.'
    }
    Get-Acl -LiteralPath $root | Select-Object Path,Sddl | Format-List
    Get-ChildItem -LiteralPath $root -Force |
        Select-Object FullName,PSIsContainer,Length,Attributes | Format-Table -AutoSize
}
$package = 'C:\ProgramData\LDSS-IPUAT-BackupProvisioning'
foreach ($name in @('Provision-IpUatBackupFoundation.ps1',
                    'BackupFoundation.Native.cs','provision-profile.json')) {
    $file = Join-Path $package $name
    if ((Get-Item -LiteralPath $file -Force).Attributes -band
        [IO.FileAttributes]::ReparsePoint) { throw 'Reparse payload: stop.' }
    Get-FileHash -LiteralPath $file -Algorithm SHA256 |
        Select-Object Path,Hash | Format-List
}
Get-CimInstance Win32_Service | Where-Object {
    $_.Name -eq 'LDSSIPUATBackup' -or $_.StartName -match '(^|\\)ldss_ipu_bkp$'
} | Select-Object Name,State,StartName | Format-Table -AutoSize
```

Expected early-failure evidence is `FailedDisabled`, null worker SID, zero ACL/file/guard records, no proof, original source pins, an empty worker root and absent account/service. **These registry/tree values are expectations to check, not observations already obtained.** Any different state requires review; do not force cleanup or adopt it.

## Smallest correction and rollback disposition

Recommend a separately reviewed patch that uses a full ownership GUID with a shorter prefix, for example **`LDSS IPUAT ` + GUID = 47 characters**. Change creation and both ownership-description comparisons together. Add a metadata-based length preflight before registry/root creation, and preserve a sanitized failure-step/error classification without passwords, key material or arbitrary error payloads. Reseal the revised core/bootstrap and test their revised handoff on an authorized disposable target. **No such patch or resealing was performed here.**

The partial foundation must not be resumed with Apply: the existing implementation deliberately rejects an incomplete registration. **Guarded cleanup is needed before a future clean provisioning attempt, but execution is pending ownership/empty-tree confirmation and separate authorization.** If elevated inspection confirms exactly the early unused state, the original unchanged package's guarded Rollback is the smallest existing cleanup path; it does not require a worker password when no account exists. Use the original sealed package for that future cleanup, not a patched source whose hash differs from the ownership record. Retain the protected package as evidence. If the record is absent/mismatched or unexpected files/state exist, preserve them and review a specific recovery procedure instead. Do not manually delete the root/registry, create another identity, reset a password or retry Apply now.

**Stopped after diagnosis.** Only this report and task-local metadata evidence were added. No provisioning source, account, ACL, registry value, service, key, database, financial record, primary/UAT release or operational LAN configuration was changed. LAN-R2A remains paused.
