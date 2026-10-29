#Requires -Version 5.1
<#
Operator-only OS FOUNDATION. No SQL, backup execution, web writer, service/task install or restart.
Plan is read-only. Apply/Verify/Rollback require an already elevated 64-bit Windows PowerShell.
See README.md before running. No execution-policy bypass or self-elevation is used.
#>
[CmdletBinding()]
param(
    [ValidateSet('Plan','Apply','Verify','Rollback')][string]$Mode = 'Plan',
    [Security.SecureString]$WorkerPassword,
    [switch]$ApproveWorkspaceCredentialGuard,
    [string]$ConfirmRollback
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Root = 'C:\ProgramData\LDSS-IPUAT-BackupWorker'
$script:PackageRoot = 'C:\ProgramData\LDSS-IPUAT-BackupProvisioning-v2'
$script:RegistrySubkey = 'SOFTWARE\LDSS_IPUAT_BackupFoundation_v1'
$script:RegistryPath = 'HKLM:\SOFTWARE\LDSS_IPUAT_BackupFoundation_v1'
$script:WorkerName = 'ldss_ipu_bkp'
$script:FutureService = 'LDSSIPUATBackup'
$script:RequiredRights = @('SeServiceLogonRight','SeDenyInteractiveLogonRight','SeDenyRemoteInteractiveLogonRight','SeDenyNetworkLogonRight','SeDenyBatchLogonRight')
$script:NativeHash = '466d15f822f8e613f0575e18004f6c41a53f2216e526f65224c53cfc3ea18711'
$script:ProfileHash = 'bcdbb67ee2b44e184658f3137178f88652a8c9cfeaaadf03b6716756525a3528'
$script:Version = 'ADMIN-SYS-1A.2/foundation-v2'

function Assert-Condition([bool]$Condition,[string]$Message) { if (-not $Condition) { throw $Message } }
function Get-Hash([string]$File) { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }
function Test-Elevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Assert-Elevated {
    Assert-Condition (Test-Elevated) 'ELEVATION_REQUIRED: reopen 64-bit Windows PowerShell as Administrator. No provisioning was attempted.'
    Assert-Condition ([Environment]::Is64BitProcess) '64-bit Windows PowerShell is required.'
    Assert-Condition ($PSVersionTable.PSEdition -eq 'Desktop') 'Use Windows PowerShell 5.1, not an unreviewed host.'
}
function Assert-NoReparse([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            Assert-Condition (-not ((Get-Item -Force -LiteralPath $current).Attributes -band [IO.FileAttributes]::ReparsePoint)) ('Reparse path refused: ' + $current)
        }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }; $current = $parent
    }
}
function Assert-RootPath([string]$Path) {
    $resolved = [IO.Path]::GetFullPath($Path).TrimEnd('\')
    Assert-Condition ($resolved -ieq 'C:\ProgramData\LDSS-IPUAT-BackupWorker') 'Unexpected destructive target.'
    Assert-NoReparse $resolved
}
function Get-Sddl([string]$Path) { (Get-Acl -LiteralPath $Path).Sddl }
function Find-WorkerAccount {
    try { return Get-LocalUser -Name $script:WorkerName -ErrorAction Stop }
    catch { if ($_.FullyQualifiedErrorId -like 'UserNotFound,*') {return $null}; throw }
}
function Find-WorkerService {
    try { return Get-Service -Name $script:FutureService -ErrorAction Stop }
    catch { if ($_.FullyQualifiedErrorId -like 'NoServiceFoundForGivenName,*') {return $null}; throw }
}
function Initialize-Native {
    $file = Join-Path $PSScriptRoot 'BackupFoundation.Native.cs'
    Assert-Condition ((Get-Hash $file) -eq $script:NativeHash) 'Native helper hash mismatch.'
    if (-not ('LdssBackupFoundation.Native' -as [type])) { Add-Type -TypeDefinition ([IO.File]::ReadAllText($file)) -Language CSharp }
}
function Get-Profile {
    $file = Join-Path $PSScriptRoot 'provision-profile.json'
    Assert-Condition ((Get-Hash $file) -eq $script:ProfileHash) 'Provisioning profile hash mismatch.'
    $profile = Get-Content -Raw -LiteralPath $file | ConvertFrom-Json
    Assert-Condition ($profile.version -ceq $script:Version) 'Profile version mismatch.'
    Assert-Condition ($env:COMPUTERNAME -ceq $profile.host) 'Wrong host.'
    Assert-Condition ($profile.database -ceq 'ldss_restore_1793167108097_2b47a744') 'Wrong database binding.'
    Assert-Condition ($profile.release -ceq 'C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release') 'Wrong release binding.'
    Assert-Condition ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value -ceq $profile.apiUserSid) 'Use the reviewed ADMIN operator identity; do not rebind private profiles.'
    return $profile
}
function Get-Target($Profile) {
    foreach ($file in @($Profile.release,($Profile.uatRoot + '/private/ownership.json'),($Profile.uatRoot + '/private/runtime-integrity.json'),'C:\ProgramData')) { Assert-NoReparse $file }
    Assert-Condition (([Environment]::GetFolderPath('CommonApplicationData')) -ieq 'C:\ProgramData') 'Unexpected ProgramData root.'
    Assert-Condition ((Get-Hash ($Profile.uatRoot + '/private/ownership.json')) -eq $Profile.ownershipSha256) 'UAT ownership configuration changed; refresh the reviewed profile.'
    Assert-Condition ((Get-Hash ($Profile.uatRoot + '/private/runtime-integrity.json')) -eq $Profile.integritySha256) 'UAT manifest changed.'
    Assert-Condition ((Get-Hash ($Profile.release + '/scripts/ip-uat1/api.mjs')) -eq $Profile.apiWrapperSha256) 'API wrapper changed.'
    Assert-Condition ((Get-Hash ($Profile.release + '/bin/node.exe')) -eq $Profile.nodeSha256) 'Node runtime changed.'
    Assert-Condition ((Get-Hash 'C:\xampp\htdocs\scholar_monitor\.env') -eq $Profile.workspaceEnvSha256) 'Workspace configuration changed; do not restore or overwrite it.'
    $ownership = Get-Content -Raw -LiteralPath ($Profile.uatRoot + '/private/ownership.json') | ConvertFrom-Json
    Assert-Condition ($ownership.database -ceq $Profile.database) 'UAT database configuration mismatch.'
    $running = Get-Content -Raw -LiteralPath ($Profile.uatRoot + '/state/running.json') | ConvertFrom-Json
    foreach ($pair in @(@(3031,[int]$running.apiPid),@(5181,[int]$running.webPid))) {
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $pair[0])
        Assert-Condition ($listeners.Count -eq 1 -and $listeners[0].LocalAddress -eq '127.0.0.1' -and $listeners[0].OwningProcess -eq $pair[1]) 'UAT listener owner mismatch.'
    }
    $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$running.apiPid)
    Assert-Condition ($null -ne $process -and [IO.Path]::GetFullPath($process.ExecutablePath) -ieq [IO.Path]::GetFullPath($Profile.release + '/bin/node.exe')) 'Wrong API executable.'
    Assert-Condition ($process.CommandLine -like '*scripts/ip-uat1/api.mjs*') 'Wrong API command.'
    return [int]$running.apiPid
}
function Get-Registration {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,[Microsoft.Win32.RegistryView]::Registry64)
    try { $key = $base.OpenSubKey($script:RegistrySubkey) } finally { $base.Dispose() }
    if ($null -eq $key) { return $null }
    try {
        $expected=[Security.AccessControl.RegistrySecurity]::new()
        $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        $expected.SetSecurityDescriptorSddlForm(('O:'+$owner+'G:BAD:P(A;CI;KA;;;SY)(A;CI;KA;;;BA)(A;CI;RC;;;OW)'))
        Assert-Condition (($key.GetAccessControl().GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::Access -bor [Security.AccessControl.AccessControlSections]::Owner -bor [Security.AccessControl.AccessControlSections]::Group)) -ceq $expected.Sddl) 'Ownership registry ACL differs; refuse reading/adopting its record.'
        $text = $key.GetValue('Record',$null)
        Assert-Condition ($null -ne $text) 'Unrecognized existing registry reservation; refuse adoption.'
        return ($text | ConvertFrom-Json)
    } finally { $key.Dispose() }
}
function Assert-UnusedFoundationTree {
    $allowedFiles=@(($script:Root+'\bin\acl-probe.dat'),($script:Root+'\secrets\backup.key'))
    foreach($entry in @(Get-ChildItem -LiteralPath $script:Root -Force)) {
        Assert-Condition ($entry.PSIsContainer -and $entry.Name -in @('bin','secrets','archives','jobs')) 'Unexpected foundation entry.'
        Assert-Condition (-not ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Reparse foundation directory refused before traversal.'
        foreach($item in @(Get-ChildItem -LiteralPath $entry.FullName -Force)) {
            Assert-Condition (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Reparse foundation file refused.'
            Assert-Condition (-not $item.PSIsContainer -and $item.FullName -in $allowedFiles) 'Foundation is in use or has added files. Use the later worker installer/health tooling.'
        }
    }
}
function Save-Registration($Record) {
    $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey($script:RegistrySubkey,$true)
    Assert-Condition ($null -ne $key) 'Ownership reservation disappeared.'
    try { $key.SetValue('Record',($Record | ConvertTo-Json -Depth 12 -Compress),[Microsoft.Win32.RegistryValueKind]::String); $key.Flush() } finally { $key.Dispose() }
}
function New-DirectorySddl([string]$Owner,[string]$WorkerSid,[string]$Rights) {
    $worker = if ($WorkerSid) { '(A;OICI;' + $Rights + ';;;' + $WorkerSid + ')' } else { '' }
    # OWNER RIGHTS suppresses the implicit WRITE_DAC of the same ADMIN SID that owns new files.
    'O:' + $Owner + 'G:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;RC;;;OW)' + $worker
}
function Set-ExactDirectoryAcl([string]$Path,[string]$Sddl) {
    $security = [Security.AccessControl.DirectorySecurity]::new()
    $security.SetSecurityDescriptorSddlForm($Sddl)
    Set-Acl -LiteralPath $Path -AclObject $security
}
function Assert-PrivatePackage {
    Assert-Condition ([IO.Path]::GetFullPath($PSScriptRoot) -ieq $script:PackageRoot) 'Use the reviewed protected-package bootstrap; do not elevate code in the API-writable workspace.'
    Assert-NoReparse $script:PackageRoot
    $expected=[Security.AccessControl.DirectorySecurity]::new()
    $expected.SetSecurityDescriptorSddlForm((New-DirectorySddl ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value) '' ''))
    Assert-Condition ((Get-Sddl $script:PackageRoot) -ceq $expected.Sddl) 'Unexpected protected package ACL.'
    $temp=$script:PackageRoot+'\tmp'
    Assert-NoReparse $temp
    Assert-Condition ($env:TEMP -ieq $temp -and $env:TMP -ieq $temp -and (Get-Sddl $temp) -ceq $expected.Sddl) 'Native compilation must use the protected temporary directory.'
    foreach($name in @('Provision-IpUatBackupFoundation.ps1','BackupFoundation.Native.cs','provision-profile.json')) {
        $file=Join-Path $script:PackageRoot $name;Assert-NoReparse $file
        $acl=Get-Acl -LiteralPath $file
        Assert-Condition (-not $acl.AreAccessRulesProtected -and @($acl.Access | Where-Object {-not $_.IsInherited}).Count -eq 0) 'Package file has unexpected explicit ACLs.'
    }
}
function Get-WorkerMemberships([string]$Sid) {
    $found = @()
    foreach ($group in Get-LocalGroup) {
        foreach ($member in @(Get-LocalGroupMember -SID $group.SID)) { if ($member.SID.Value -eq $Sid) { $found += $group.SID.Value } }
    }
    return $found
}
function Assert-Owned($Record,$Profile) {
    Assert-Condition ($Record.version -ceq $script:Version -and $Record.database -ceq $Profile.database -and $Record.root -ceq $script:Root) 'Wrong ownership record.'
    Assert-Condition ($Record.scriptHash -ceq (Get-Hash $PSCommandPath) -and $Record.profileHash -ceq $script:ProfileHash) 'Provisioning source changed; refuse automatic repair.'
    $account = Get-LocalUser -Name $script:WorkerName
    Assert-Condition ($Record.workerSid -and $account.SID.Value -ceq $Record.workerSid) 'Worker name/SID collision.'
    Assert-Condition ($account.Description -ceq ('LDSS IPUAT ' + $Record.owner)) 'Worker ownership marker mismatch.'
    $groups = @(Get-WorkerMemberships $Record.workerSid)
    Assert-Condition (@($groups | Where-Object { $_ -ne 'S-1-5-32-545' }).Count -eq 0) 'Unexpected worker group membership.'
    $rights = @([LdssBackupFoundation.Native]::Rights($Record.workerSid) | Sort-Object)
    Assert-Condition (($rights -join '|') -ceq (($script:RequiredRights | Sort-Object) -join '|')) 'Worker logon rights changed.'
    Assert-RootPath $script:Root
    foreach ($item in $Record.acls) { Assert-NoReparse $item.path; Assert-Condition ((Get-Sddl $item.path) -ceq $item.sddl) ('Unexpected ACL: ' + $item.path) }
    foreach ($item in $Record.files) { Assert-NoReparse $item.path; Assert-Condition ((Get-Hash $item.path) -ceq $item.sha256) ('Unexpected foundation file: ' + $item.path) }
    foreach ($guard in $Record.guards) { Assert-Condition ((Get-Sddl $guard.path) -ceq $guard.after) 'Credential guard changed; refuse repair.' }
    Assert-UnusedFoundationTree
    Assert-Condition ($null -eq (Find-WorkerService)) 'A service is already present; use its separately reviewed installer/uninstaller.'
}
function Assert-Probe($Token,[string]$Path,[uint32]$Access,[int]$Expected,[string]$Label) {
    $actual = [LdssBackupFoundation.Native]::Probe($Token,$Path,$Access)
    Assert-Condition ($actual -eq $Expected) ($Label + ': expected access result ' + $Expected + ', received ' + $actual)
}
function Test-Isolation($Record,$Profile,[int]$ApiPid,[Security.SecureString]$Password) {
    $api = [LdssBackupFoundation.Native]::ProcessToken($ApiPid)
    try {
        Assert-Condition ([LdssBackupFoundation.Native]::UserSid($api) -ceq $Profile.apiUserSid) 'API token owner changed.'
        Assert-Condition (-not [LdssBackupFoundation.Native]::Elevated($api)) 'API is elevated; deny activation instead of weakening ACLs.'
        Assert-Probe $api ($script:Root + '\secrets\backup.key') 1 5 'API key read'
        Assert-Probe $api ($script:Root + '\bin\acl-probe.dat') 2 5 'API code write'
        Assert-Probe $api ($script:Root + '\bin\acl-probe.dat') 0x40000 5 'API code ACL change'
        Assert-Probe $api ($script:Root + '\bin\acl-probe.dat') 0x10000 5 'API code deletion'
        Assert-Probe $api ($script:Root + '\bin') 2 5 'API code creation'
        Assert-Probe $api ($script:Root + '\archives') 1 5 'API archive listing'
        Assert-Condition ([LdssBackupFoundation.Native]::ProbeRegistry($api,$script:RegistrySubkey,1) -eq 5) 'API can read private ownership registration.'
        Assert-Condition ([LdssBackupFoundation.Native]::ProbeRegistry($api,$script:RegistrySubkey,2) -eq 5) 'API can modify ownership registration.'
    } finally { $api.Dispose() }
    $worker = [LdssBackupFoundation.Native]::ServiceToken($script:WorkerName,$Password)
    try {
        Assert-Condition ([LdssBackupFoundation.Native]::UserSid($worker) -ceq $Record.workerSid) 'Wrong worker logon token.'
        Assert-Condition (-not [LdssBackupFoundation.Native]::Administrator($worker)) 'Worker has Administrator authority.'
        Assert-Probe $worker ($script:Root + '\secrets\backup.key') 1 0 'Worker key read'
        Assert-Probe $worker ($script:Root + '\secrets\backup.key') 2 5 'Worker key overwrite'
        Assert-Probe $worker ($script:Root + '\bin\acl-probe.dat') 1 0 'Worker code read'
        Assert-Probe $worker ($script:Root + '\bin\acl-probe.dat') 2 5 'Worker code overwrite'
        Assert-Probe $worker ($script:Root + '\bin\acl-probe.dat') 0x40000 5 'Worker code ACL change'
        Assert-Probe $worker ($script:Root + '\jobs') 2 0 'Worker job creation permission'
        Assert-Probe $worker ($script:Root + '\archives') 2 0 'Worker archive creation permission'
        Assert-Probe $worker 'C:\xampp\htdocs\scholar_monitor\.env' 1 5 'Worker shared operator credential read'
        Assert-Probe $worker 'C:\xampp\htdocs\scholar_monitor' 0x40 5 'Worker shared credential deletion through parent'
        foreach ($file in $Profile.workerDeniedReadPaths) { Assert-NoReparse $file; Assert-Probe $worker $file 1 5 'Worker protected credential read' }
    } finally { $worker.Dispose() }
    return [ordered]@{ apiPid=$ApiPid; apiTokenLimited=$true; workerServiceLogon=$true; workerAdministrator=$false; apiDenialsVerified=$true; workerProtectedPathDenialsVerified=$true }
}
function Get-Password {
    if ($null -eq $WorkerPassword) { $script:WorkerPassword = Read-Host 'New/existing worker password from your password manager (32+ characters; never reused)' -AsSecureString }
    Assert-Condition ($WorkerPassword.Length -ge 32) 'Worker password must contain at least 32 characters.'
    return $WorkerPassword
}
function Apply-CredentialGuards($Record,$Profile) {
    foreach ($item in $Profile.guards) {
        Assert-Condition ((Get-Sddl $item.Path) -ceq $item.Sddl) 'Workspace ACL changed before provisioning.'
        $security = Get-Acl -LiteralPath $item.Path
        $permission = if ($item.Path.EndsWith('.env')) { [Security.AccessControl.FileSystemRights]::FullControl } else { [Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles }
        $rule = [Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($Record.workerSid),$permission,[Security.AccessControl.InheritanceFlags]::None,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Deny)
        $security.AddAccessRule($rule)
        $guard = [pscustomobject]@{path=$item.Path;before=$item.Sddl;after=$security.Sddl;rights=[int]$permission}
        $Record.guards += $guard; Save-Registration $Record # Persist intended delta before Set-Acl for crash refusal/rollback.
        Set-Acl -LiteralPath $item.Path -AclObject $security
        Assert-Condition ((Get-Sddl $item.Path) -ceq $guard.after) 'Credential guard failed.'
    }
}
function Invoke-Apply($Profile,[int]$ApiPid) {
    $existing = Get-Registration
    if ($null -ne $existing) {
        Assert-Condition ($existing.phase -ceq 'FoundationVerified') 'Incomplete owned setup exists. Review and roll it back; do not silently resume.'
        Assert-Owned $existing $Profile
        $proof = Test-Isolation $existing $Profile $ApiPid (Get-Password)
        return [ordered]@{status='Already provisioned; verified without reset';foundationOnly=$true;proof=$proof;workerInstalled=$false}
    }
    Assert-Condition (-not (Test-Path -LiteralPath $script:Root)) 'Unexpected existing worker directory.'
    Assert-Condition ($null -eq (Find-WorkerAccount)) 'Unexpected existing worker account.'
    Assert-Condition ($null -eq (Find-WorkerService)) 'Unexpected existing worker service.'
    Assert-Condition $ApproveWorkspaceCredentialGuard.IsPresent 'Review README and explicitly approve the two workspace credential deny ACEs.'
    foreach ($item in $Profile.guards) { Assert-NoReparse $item.Path; Assert-Condition ((Get-Sddl $item.Path) -ceq $item.Sddl) 'Workspace guard baseline changed.' }
    $api = [LdssBackupFoundation.Native]::ProcessToken($ApiPid)
    try { Assert-Condition (-not [LdssBackupFoundation.Native]::Elevated($api)) 'API is elevated; no provisioning allowed.'; Assert-Condition ([LdssBackupFoundation.Native]::UserSid($api) -ceq $Profile.apiUserSid) 'Wrong API token.' } finally { $api.Dispose() }
    $password = Get-Password
    Assert-Condition ((Get-Target $Profile) -eq $ApiPid) 'UAT owner changed while awaiting the password; no provisioning allowed.'
    $description = 'LDSS IPUAT ' + [guid]::Empty.ToString()
    $lengthRule = @((Get-Command New-LocalUser).Parameters['Description'].Attributes | Where-Object { $_ -is [Management.Automation.ValidateLengthAttribute] })
    Assert-Condition ($lengthRule.Count -eq 1 -and $description.Length -le $lengthRule[0].MaxLength) 'Account description exceeds installed command limit; nothing provisioned.'
    $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $registrySddl = 'O:'+$owner+'G:BAD:P(A;CI;KA;;;SY)(A;CI;KA;;;BA)(A;CI;RC;;;OW)'
    [LdssBackupFoundation.Native]::CreateRegistryExclusive($script:RegistrySubkey,$registrySddl)
    $record = [pscustomobject]@{version=$script:Version;owner=[guid]::NewGuid().ToString();database=$Profile.database;root=$script:Root;scriptHash=(Get-Hash $PSCommandPath);profileHash=$script:ProfileHash;phase='Provisioning';workerSid=$null;acls=@();files=@();guards=@();createdAt=[DateTime]::UtcNow.ToString('o');proof=$null}
    Save-Registration $record
    try {
        [LdssBackupFoundation.Native]::CreateDirectoryExclusive($script:Root,(New-DirectorySddl $owner '' ''))
        $account = New-LocalUser -Name $script:WorkerName -Password $password -Disabled -PasswordNeverExpires -UserMayNotChangePassword -Description ('LDSS IPUAT '+$record.owner)
        $record.workerSid = $account.SID.Value; Save-Registration $record
        [LdssBackupFoundation.Native]::SetRights($record.workerSid,$script:RequiredRights,$true)
        Assert-Condition (@(Get-WorkerMemberships $record.workerSid | Where-Object {$_ -ne 'S-1-5-32-545'}).Count -eq 0) 'Unexpected initial worker group.'
        Set-ExactDirectoryAcl $script:Root (New-DirectorySddl $owner $record.workerSid '0x1200a9')
        foreach ($name in @('bin','secrets','archives','jobs')) {
            $rights = if ($name -in @('archives','jobs')) { '0x1301bf' } else { '0x1200a9' }
            [LdssBackupFoundation.Native]::CreateDirectoryExclusive(($script:Root+'\'+$name),(New-DirectorySddl $owner $record.workerSid $rights))
        }
        $record.acls = @(@($script:Root)+@('bin','secrets','archives','jobs' | ForEach-Object {$script:Root+'\'+$_}) | ForEach-Object {[pscustomobject]@{path=$_;sddl=(Get-Sddl $_)}})
        Save-Registration $record
        $probe = $script:Root+'\bin\acl-probe.dat'
        $stream=[IO.File]::Open($probe,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
        try {$bytes=[Text.Encoding]::UTF8.GetBytes('LDSS non-executable ACL probe');$stream.Write($bytes,0,$bytes.Length)} finally {$stream.Dispose()}
        $keyPath = $script:Root+'\secrets\backup.key'
        $key = New-Object byte[] 32; $random=[Security.Cryptography.RandomNumberGenerator]::Create();$random.GetBytes($key);$random.Dispose()
        try {$stream=[IO.File]::Open($keyPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$stream.Write($key,0,$key.Length)}finally{$stream.Dispose()}}finally{[Array]::Clear($key,0,$key.Length)}
        $record.files = @($probe,$keyPath | ForEach-Object {[pscustomobject]@{path=$_;sha256=(Get-Hash $_)}});Save-Registration $record
        Apply-CredentialGuards $record $Profile
        Enable-LocalUser -SID $account.SID
        Assert-Owned $record $Profile
        $record.proof = Test-Isolation $record $Profile $ApiPid $password
        $record.phase = 'FoundationVerified';Save-Registration $record
        return [ordered]@{status='Windows foundation provisioned and verified';foundationOnly=$true;worker=$script:WorkerName;root=$script:Root;proof=$record.proof;newUatKeyLineage=$true;sqlConfigured=$false;workerInstalled=$false;backupFeatureInstalled=$false}
    } catch {
        if ($record.workerSid) { Disable-LocalUser -SID ([Security.Principal.SecurityIdentifier]::new($record.workerSid)) }
        $record | Add-Member -NotePropertyName failure -NotePropertyValue ([pscustomobject]@{errorId=$_.FullyQualifiedErrorId;exceptionType=$_.Exception.GetType().FullName;line=$_.InvocationInfo.ScriptLineNumber}) -Force
        $record.phase = 'FailedDisabled';Save-Registration $record
        throw 'Provisioning failed; owned worker remains disabled. Do not retry with a new identity. Review the protected registration and use guarded rollback. No backup feature was activated.'
    }
}
function Invoke-Rollback($Profile) {
    Assert-Condition ($ConfirmRollback -ceq 'REMOVE UNUSED IP-UAT BACKUP FOUNDATION') 'Explicit unused-foundation rollback phrase required.'
    $record = Get-Registration
    if ($null -eq $record) {
        Assert-Condition (-not (Test-Path -LiteralPath $script:Root) -and $null -eq (Find-WorkerAccount) -and $null -eq (Find-WorkerService)) 'Unregistered objects exist; refuse deletion.'
        return [ordered]@{status='Already absent; no change';databaseChanged=$false;runtimeChanged=$false}
    }
    Assert-Condition ($record.version -ceq $script:Version -and $record.database -ceq $Profile.database -and $record.root -ceq $script:Root -and $record.scriptHash -ceq (Get-Hash $PSCommandPath) -and $record.profileHash -ceq $script:ProfileHash) 'Ownership/source mismatch; refuse rollback.'
    Assert-RootPath $script:Root
    Assert-Condition ($null -eq (Find-WorkerService)) 'Service found; use its separately reviewed uninstaller.'
    $account = Find-WorkerAccount
    if ($account) {
        Assert-Condition ($account.Description -ceq ('LDSS IPUAT '+$record.owner)) 'Unexpected account ownership.'
        if ($record.workerSid) {Assert-Condition ($account.SID.Value -ceq $record.workerSid) 'SID changed.'} else {$record.workerSid=$account.SID.Value}
        Assert-Condition (@(Get-WorkerMemberships $record.workerSid | Where-Object {$_ -ne 'S-1-5-32-545'}).Count -eq 0) 'Repurposed account group membership; refuse deletion.'
        $ownedRights=@([LdssBackupFoundation.Native]::Rights($record.workerSid))
        Assert-Condition (@($ownedRights | Where-Object {$_ -notin $script:RequiredRights}).Count -eq 0) 'Additional rights found; refuse deleting a repurposed account.'
        $services=@(Get-CimInstance Win32_Service | Where-Object {$_.StartName -ieq ($env:COMPUTERNAME+'\'+$script:WorkerName) -or $_.StartName -ieq ('.\'+$script:WorkerName) -or $_.Name -eq $script:FutureService})
        Assert-Condition ($services.Count -eq 0) 'Service found; no automatic service stop/uninstall.'
        $processes=@(Get-Process -IncludeUserName | Where-Object {$_.UserName -ieq ($env:COMPUTERNAME+'\'+$script:WorkerName)})
        Assert-Condition ($processes.Count -eq 0) 'Worker process found; do not delete its state.'
    }
    $allowed=@(($script:Root+'\bin\acl-probe.dat'),($script:Root+'\secrets\backup.key'))
    if (Test-Path -LiteralPath $script:Root) {
        $entries=@(Get-ChildItem -LiteralPath $script:Root -Force)
        foreach ($entry in $entries) {
            Assert-Condition ($entry.PSIsContainer -and $entry.Name -in @('bin','secrets','archives','jobs')) 'Unexpected root entry; preserve it.'
            Assert-Condition (-not ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Rollback refuses reparse directories before traversal.'
        }
        foreach ($item in @($entries | ForEach-Object {Get-ChildItem -LiteralPath $_.FullName -Force})) {
            Assert-Condition (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Rollback refuses reparse entries.'
            Assert-Condition (-not $item.PSIsContainer -and $item.FullName -in $allowed) 'Later archive/job/configuration/code exists. Preserve it; refuse automatic rollback.'
        }
        foreach ($file in $record.files) {Assert-Condition ((Get-Hash $file.path) -ceq $file.sha256) 'Foundation file changed; refuse deletion.'}
    }
    foreach ($guard in $record.guards) {
        $current=Get-Sddl $guard.path
        Assert-Condition ($current -ceq $guard.before -or $current -ceq $guard.after) 'Later ACL changes found; do not overwrite them.'
    }
    if ($account) { Disable-LocalUser -SID $account.SID }
    foreach ($guard in $record.guards) {
        if ((Get-Sddl $guard.path) -ceq $guard.after) {
            $security=Get-Acl -LiteralPath $guard.path
            $rule=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($record.workerSid),[Security.AccessControl.FileSystemRights]$guard.rights,[Security.AccessControl.InheritanceFlags]::None,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Deny)
            $security.RemoveAccessRuleSpecific($rule);Set-Acl -LiteralPath $guard.path -AclObject $security
            Assert-Condition ((Get-Sddl $guard.path) -ceq $guard.before) 'Credential guard rollback differs; stop.'
        }
    }
    if ($account) {
        $rights=@([LdssBackupFoundation.Native]::Rights($record.workerSid))
        Assert-Condition (@($rights | Where-Object {$_ -notin $script:RequiredRights}).Count -eq 0) 'Additional rights found; refuse deleting a repurposed account.'
        if ($rights.Count) {[LdssBackupFoundation.Native]::SetRights($record.workerSid,$rights,$false)}
        Remove-LocalUser -SID $account.SID
    }
    # Validate the final absolute target immediately before recursive deletion.
    Assert-RootPath $script:Root
    if (Test-Path -LiteralPath $script:Root) { Remove-Item -LiteralPath 'C:\ProgramData\LDSS-IPUAT-BackupWorker' -Recurse -Force }
    Assert-Condition ($script:RegistryPath -ceq 'HKLM:\SOFTWARE\LDSS_IPUAT_BackupFoundation_v1') 'Wrong registry deletion target.'
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,[Microsoft.Win32.RegistryView]::Registry64)
    try {
        $check = Get-Registration
        Assert-Condition ($check.owner -ceq $record.owner) 'Registration changed before removal.'
        $key = $base.OpenSubKey($script:RegistrySubkey)
        try { Assert-Condition ($key.SubKeyCount -eq 0 -and ($key.GetValueNames() -join '|') -ceq 'Record') 'Unexpected registration contents; preserve.' } finally { $key.Dispose() }
        $base.DeleteSubKey($script:RegistrySubkey,$true)
    } finally { $base.Dispose() }
    return [ordered]@{status='Unused owned foundation removed';databaseChanged=$false;runtimeChanged=$false;laterDataDeleted=$false}
}
function Invoke-Foundation {
    if ($Mode -ne 'Plan') { Assert-Elevated } # FIRST mutation gate: before native compilation, prompts or provisioning.
    $profile = Get-Profile
    $apiPid = Get-Target $profile
    if ($Mode -eq 'Plan') {
        return [ordered]@{mode='Plan';elevated=(Test-Elevated);target=$profile.database;apiPid=$apiPid;worker=$script:WorkerName;root=$script:Root;registry=$script:RegistryPath;existingUser=[bool](Find-WorkerAccount);existingRoot=(Test-Path -LiteralPath $script:Root);creates=@('Nonadministrator service-logon account','Protected directories and ownership registry record','New 32-byte manual-UAT backup key','Non-executable ACL probe');changes=@('Deny only the new worker SID FullControl on workspace .env','Deny only that SID DeleteSubdirectoriesAndFiles on the workspace parent; no inheritance');doesNotCreate=@('SQL account or grant','Worker service/task or runtime binary','IPC/API/job/history/UI','Backup/archive','Primary/LAN changes');requires='Already elevated Windows PowerShell; password-manager generated 32+ character worker password; explicit workspace credential guard review';installed=$false}
    }
    Assert-PrivatePackage
    Initialize-Native
    $packageToken=[LdssBackupFoundation.Native]::ProcessToken($apiPid)
    try {
        Assert-Condition (-not [LdssBackupFoundation.Native]::Elevated($packageToken)) 'API is elevated.'
        foreach($name in @('Provision-IpUatBackupFoundation.ps1','BackupFoundation.Native.cs','provision-profile.json')) {
            Assert-Probe $packageToken (Join-Path $PSScriptRoot $name) 2 5 'API provisioning-code write'
            Assert-Probe $packageToken (Join-Path $PSScriptRoot $name) 0x40000 5 'API provisioning-code ACL change'
        }
        Assert-Probe $packageToken $PSScriptRoot 2 5 'API package creation'
        Assert-Probe $packageToken ($script:PackageRoot+'\tmp') 2 5 'API compiler-input creation'
    } finally {$packageToken.Dispose()}
    if ($Mode -eq 'Apply') { return Invoke-Apply $profile $apiPid }
    if ($Mode -eq 'Rollback') { return Invoke-Rollback $profile }
    $record = Get-Registration
    Assert-Condition ($null -ne $record -and $record.phase -ceq 'FoundationVerified') 'No completed foundation to verify.'
    Assert-Owned $record $profile
    return [ordered]@{status='Existing foundation verified';proof=(Test-Isolation $record $profile $apiPid (Get-Password));backupFeatureInstalled=$false}
}
if ($MyInvocation.InvocationName -ne '.') {
    try { Invoke-Foundation | ConvertTo-Json -Depth 12 }
    catch { Write-Error -Message $_.Exception.Message -ErrorAction Continue; exit 1 }
    finally { if ($null -ne $WorkerPassword) { $WorkerPassword.Dispose(); $WorkerPassword=$null } }
}
