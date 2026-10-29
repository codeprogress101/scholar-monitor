#Requires -Version 5.1
# Exact incident recovery only. No password, key read, account mutation, service or SQL.
[CmdletBinding()]
param([ValidateSet('Inspect','Cleanup')][string]$Mode='Inspect',[string]$ConfirmCleanup)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$script:Root='C:\ProgramData\LDSS-IPUAT-BackupWorker'
$script:OriginalPackage='C:\ProgramData\LDSS-IPUAT-BackupProvisioning'
$script:Evidence='C:\ProgramData\LDSS-IPUAT-BackupRecovery-20261029'
$script:Subkey='SOFTWARE\LDSS_IPUAT_BackupFoundation_v1'
$script:RequiredCreation='2026-10-29T04:59:21.0933175Z'
$script:Pins=@{
    'Provision-IpUatBackupFoundation.ps1'='6efac29817d25105c718d8859fb808705e367a72112b0cca93ef1b7cfe70d1f1'
    'BackupFoundation.Native.cs'='466d15f822f8e613f0575e18004f6c41a53f2216e526f65224c53cfc3ea18711'
    'provision-profile.json'='692dd496ac846820eca78d72b8b413761447eab2019c7fa8e4b336b80289605b'
}
function Require([bool]$Value,[string]$Message){if(-not $Value){throw $Message}}
function Hash-Bytes([byte[]]$Bytes){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
function Hash-File([string]$Path){Hash-Bytes ([IO.File]::ReadAllBytes($Path))}
function No-Reparse([string]$Path){
    $part=[IO.Path]::GetFullPath($Path)
    while($part){
        if(Test-Path -LiteralPath $part){Require (-not ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Reparse path refused.'}
        $part=[IO.Path]::GetDirectoryName($part)
    }
}
function Expected-DirectoryAcl([string]$Sid){
    $a=[Security.AccessControl.DirectorySecurity]::new()
    $a.SetSecurityDescriptorSddlForm(('O:'+$Sid+'G:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;RC;;;OW)'))
    return $a
}
function Expected-RegistryAcl([string]$Sid){
    $a=[Security.AccessControl.RegistrySecurity]::new()
    $a.SetSecurityDescriptorSddlForm(('O:'+$Sid+'G:BAD:P(A;CI;KA;;;SY)(A;CI;KA;;;BA)(A;CI;RC;;;OW)'))
    return $a
}
function Open-RegistryBase { [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine,[Microsoft.Win32.RegistryView]::Registry64) }
function Read-Registration([string]$Sid){
    $base=Open-RegistryBase
    try{
        $key=$base.OpenSubKey($script:Subkey)
        Require ($null -ne $key) 'Registration missing. Do not adopt or delete unregistered objects.'
        try{
            $sections=[Security.AccessControl.AccessControlSections]::Access -bor [Security.AccessControl.AccessControlSections]::Owner -bor [Security.AccessControl.AccessControlSections]::Group
            $actual=$key.GetAccessControl($sections).GetSecurityDescriptorSddlForm($sections)
            Require ($actual -ceq (Expected-RegistryAcl $Sid).Sddl) 'Registration ACL differs.'
            Require ($key.SubKeyCount -eq 0 -and ($key.GetValueNames() -join '|') -ceq 'Record') 'Unexpected registration contents.'
            Require ($key.GetValueKind('Record') -eq [Microsoft.Win32.RegistryValueKind]::String) 'Wrong record type.'
            $raw=[string]$key.GetValue('Record')
            Require ($raw.Length -le 65536) 'Oversized ownership record.'
            return [pscustomobject]@{raw=$raw;record=($raw|ConvertFrom-Json);sddl=$actual}
        }finally{$key.Dispose()}
    }finally{$base.Dispose()}
}
function Assert-NoWorker {
    try{$null=Get-LocalUser -Name ldss_ipu_bkp -ErrorAction Stop;throw 'Worker account exists; this early-failure recovery refuses it.'}
    catch{if($_.FullyQualifiedErrorId -notlike 'UserNotFound,*'){throw}}
    $services=@(Get-CimInstance Win32_Service | Where-Object {$_.Name -eq 'LDSSIPUATBackup' -or $_.StartName -match '(^|\\)ldss_ipu_bkp$'})
    Require ($services.Count -eq 0) 'Worker service exists; preserve it.'
}
function Assert-OriginalPackage([string]$Sid){
    No-Reparse $script:OriginalPackage
    Require ((Get-Acl -LiteralPath $script:OriginalPackage).Sddl -ceq (Expected-DirectoryAcl $Sid).Sddl) 'Original package ACL differs.'
    foreach($entry in @(Get-ChildItem -LiteralPath $script:OriginalPackage -Force)){
        Require (-not ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)) 'Reparse package entry.'
        Require (($entry.Name -eq 'tmp' -and $entry.PSIsContainer) -or (-not $entry.PSIsContainer -and $script:Pins.ContainsKey($entry.Name))) 'Unexpected original package entry; preserve.'
    }
    foreach($name in $script:Pins.Keys){
        $p=Join-Path $script:OriginalPackage $name
        No-Reparse $p
        Require ((Hash-File $p) -ceq $script:Pins[$name]) 'Original payload hash differs.'
        $a=Get-Acl -LiteralPath $p
        Require (-not $a.AreAccessRulesProtected -and @($a.Access|Where-Object {-not $_.IsInherited}).Count -eq 0) 'Original payload ACL differs.'
    }
    $temp=Join-Path $script:OriginalPackage 'tmp'
    No-Reparse $temp
    Require ((Get-Acl -LiteralPath $temp).Sddl -ceq (Expected-DirectoryAcl $Sid).Sddl) 'Original compiler directory ACL differs.'
    # Compiler leftovers are preserved, never deleted by this recovery.
}
function Assert-EarlyRecord($Registration,$Profile){
    $r=$Registration.record
    Require ($r.version -ceq 'ADMIN-SYS-1A.2/foundation-v1' -and $r.database -ceq $Profile.database -and $r.root -ceq $script:Root) 'Ownership target mismatch.'
    Require ($r.scriptHash -ceq $script:Pins['Provision-IpUatBackupFoundation.ps1'] -and $r.profileHash -ceq $script:Pins['provision-profile.json']) 'Ownership source mismatch.'
    $owner=[guid]::Empty
    Require ([guid]::TryParseExact([string]$r.owner,'D',[ref]$owner) -and $owner -ne [guid]::Empty) 'Invalid ownership marker.'
    Require ($r.phase -ceq 'FailedDisabled' -and $null -eq $r.workerSid -and $null -eq $r.proof) 'Not the account-absent early failure; preserve.'
    Require (@($r.acls).Count -eq 0 -and @($r.files).Count -eq 0 -and @($r.guards).Count -eq 0) 'Later provisioning deltas exist; preserve.'
    $created=[DateTime]::Parse($r.createdAt,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
    $rootTime=[DateTime]::Parse($script:RequiredCreation).ToUniversalTime()
    Require ($created -le $rootTime -and ($rootTime-$created).TotalSeconds -le 60) 'Incident timing differs.'
}
function Assert-EmptyRoot([string]$Sid){
    Require ([IO.Path]::GetFullPath($script:Root) -ceq $script:Root) 'Root path not canonical.'
    No-Reparse $script:Root
    $item=Get-Item -LiteralPath $script:Root -Force
    Require ($item.PSIsContainer -and $item.CreationTimeUtc.ToString('o') -ceq $script:RequiredCreation) 'Root identity/time differs.'
    Require ((Get-Acl -LiteralPath $script:Root).Sddl -ceq (Expected-DirectoryAcl $Sid).Sddl) 'Initial root ACL differs.'
    Require (@(Get-ChildItem -LiteralPath $script:Root -Force).Count -eq 0) 'Root is not empty; do not delete any contents.'
}
function Assert-Target($Profile){
    Require ($env:COMPUTERNAME -ceq $Profile.host -and $Profile.database -ceq 'ldss_restore_1793167108097_2b47a744') 'Wrong host/database binding.'
    Require ($Profile.release -ceq 'C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release') 'Wrong release binding.'
    foreach($pair in @(@(($Profile.uatRoot+'/private/ownership.json'),$Profile.ownershipSha256),@(($Profile.uatRoot+'/private/runtime-integrity.json'),$Profile.integritySha256),@(($Profile.release+'/scripts/ip-uat1/api.mjs'),$Profile.apiWrapperSha256),@(($Profile.release+'/bin/node.exe'),$Profile.nodeSha256),@('C:\xampp\htdocs\scholar_monitor\.env',$Profile.workspaceEnvSha256))){
        No-Reparse $pair[0];Require ((Hash-File $pair[0]) -ceq $pair[1]) 'Bound target file changed; refuse recovery.'
    }
    $ownership=Get-Content -Raw -LiteralPath ($Profile.uatRoot+'/private/ownership.json')|ConvertFrom-Json
    Require ($ownership.database -ceq $Profile.database) 'UAT ownership differs.'
    foreach($guard in $Profile.guards){Require ((Get-Acl -LiteralPath $guard.path).Sddl -ceq $guard.sddl) 'Workspace credential guard changed; preserve.'}
    $running=Get-Content -Raw -LiteralPath ($Profile.uatRoot+'/state/running.json')|ConvertFrom-Json
    foreach($pair in @(@(3031,[int]$running.apiPid),@(5181,[int]$running.webPid))){
        $listeners=@(Get-NetTCPConnection -State Listen -LocalPort $pair[0])
        Require ($listeners.Count -eq 1 -and $listeners[0].LocalAddress -ceq '127.0.0.1' -and $listeners[0].OwningProcess -eq $pair[1]) 'UAT listener mismatch.'
    }
    $process=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$running.apiPid)
    Require ($null -ne $process -and [IO.Path]::GetFullPath($process.ExecutablePath) -ieq [IO.Path]::GetFullPath($Profile.release+'/bin/node.exe') -and $process.CommandLine -like '*scripts/ip-uat1/api.mjs*') 'Wrong UAT process.'
}
function Write-NewMetadata([string]$Path,[string]$Text){
    $stream=[IO.File]::Open($Path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try{$bytes=[Text.Encoding]::UTF8.GetBytes($Text);$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
}
function Invoke-Recovery {
    $who=[Security.Principal.WindowsIdentity]::GetCurrent()
    Require (([Security.Principal.WindowsPrincipal]::new($who)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -and [Environment]::Is64BitProcess -and $PSVersionTable.PSEdition -eq 'Desktop') 'Use already elevated 64-bit Windows PowerShell 5.1; nothing changed.'
    Invoke-RecoveryChecks $who.User.Value
}
function Invoke-RecoveryChecks([string]$Sid){
    Assert-OriginalPackage $Sid
    $profile=Get-Content -Raw -LiteralPath (Join-Path $script:OriginalPackage 'provision-profile.json')|ConvertFrom-Json
    Require ($Sid -ceq $profile.apiUserSid) 'Wrong operator identity.'
    Assert-Target $profile
    Assert-NoWorker
    $registration=Read-Registration $Sid
    Assert-EarlyRecord $registration $profile
    Assert-EmptyRoot $Sid
    if($Mode -eq 'Inspect'){return [ordered]@{safeEarlyState=$true;phase=$registration.record.phase;rootEmpty=$true;accountAbsent=$true;changed=$false;cleanupPerformed=$false}}
    Require ($ConfirmCleanup -ceq 'REMOVE ONLY VERIFIED EMPTY FAILED FOUNDATION') 'Explicit cleanup phrase required.'
    No-Reparse $script:Evidence
    Require (-not (Test-Path -LiteralPath $script:Evidence)) 'Recovery evidence already exists; inspect its receipt. Do not overwrite or silently resume.'
    # Preserve original ownership evidence BEFORE deletion. No source/package is overwritten.
    [void][IO.Directory]::CreateDirectory($script:Evidence,(Expected-DirectoryAcl $Sid))
    Require ((Get-Acl -LiteralPath $script:Evidence).Sddl -ceq (Expected-DirectoryAcl $Sid).Sddl) 'Recovery evidence ACL mismatch.'
    Write-NewMetadata (Join-Path $script:Evidence 'ownership-record.json') $registration.raw
    $snapshot=[ordered]@{version='early-failure-recovery-v1';capturedAt=[DateTime]::UtcNow.ToString('o');recordSha256=(Hash-Bytes ([Text.Encoding]::UTF8.GetBytes($registration.raw)));registrySddl=$registration.sddl;root=$script:Root;rootCreated=$script:RequiredCreation;rootSddl=(Get-Acl -LiteralPath $script:Root).Sddl;pins=$script:Pins}
    Write-NewMetadata (Join-Path $script:Evidence 'before.json') ($snapshot|ConvertTo-Json -Depth 8)
    Assert-NoWorker;Assert-EmptyRoot $Sid
    $again=Read-Registration $Sid
    Require ($again.raw -ceq $registration.raw) 'Ownership record changed; preserve all objects.'
    # Nonrecursive delete: a concurrently added child causes refusal, not data deletion.
    [IO.Directory]::Delete($script:Root,$false)
    Write-NewMetadata (Join-Path $script:Evidence 'root-removed.json') '{"rootRemoved":true}'
    Assert-NoWorker
    $again=Read-Registration $Sid
    Require ($again.raw -ceq $registration.raw) 'Ownership record changed after root removal; stop and inspect evidence.'
    $base=Open-RegistryBase
    try{$base.DeleteSubKey($script:Subkey,$true)}finally{$base.Dispose()}
    Write-NewMetadata (Join-Path $script:Evidence 'complete.json') '{"rootRemoved":true,"registrationRemoved":true,"accountNeverExisted":true,"originalPackagePreserved":true}'
    return [ordered]@{cleanupPerformed=$true;rootRemoved=$true;registrationRemoved=$true;originalPackagePreserved=$true;evidence=$script:Evidence;databaseChanged=$false;runtimeChanged=$false}
}
if($MyInvocation.InvocationName -ne '.'){
    $saved=$env:PSModulePath
    try{$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules';Invoke-Recovery|ConvertTo-Json -Depth 6}
    finally{$env:PSModulePath=$saved}
}
