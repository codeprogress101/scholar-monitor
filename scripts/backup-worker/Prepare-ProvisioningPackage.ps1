#Requires -Version 5.1
# Run the verified BYTES of this bootstrap from the operator instructions, not a second file read.
[CmdletBinding()]
param(
    [ValidateSet('Apply','Verify','Rollback')][string]$Mode='Apply',
    [switch]$ApproveWorkspaceCredentialGuard,
    [string]$ConfirmRollback
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'ELEVATION_REQUIRED: no package directory or account was created.'}
if(-not [Environment]::Is64BitProcess -or $PSVersionTable.PSEdition -ne 'Desktop'){throw 'Use already elevated 64-bit Windows PowerShell 5.1.'}
$source='C:\xampp\htdocs\scholar_monitor\scripts\backup-worker'
$destination='C:\ProgramData\LDSS-IPUAT-BackupProvisioning'
$savedModules=$env:PSModulePath;$savedTemp=$env:TEMP;$savedTmp=$env:TMP
try {
if([Environment]::GetFolderPath('Windows') -ine 'C:\Windows'){throw 'Unexpected Windows root.'}
$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules'
$pins=ConvertFrom-Json '{"Provision-IpUatBackupFoundation.ps1":"6efac29817d25105c718d8859fb808705e367a72112b0cca93ef1b7cfe70d1f1","BackupFoundation.Native.cs":"466d15f822f8e613f0575e18004f6c41a53f2216e526f65224c53cfc3ea18711","provision-profile.json":"692dd496ac846820eca78d72b8b413761447eab2019c7fa8e4b336b80289605b"}'
function Hash-Bytes([byte[]]$Bytes){$hash=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($hash.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant()}finally{$hash.Dispose()}}
function No-Reparse([string]$Path){$part=[IO.Path]::GetFullPath($Path);while($part){if(Test-Path -LiteralPath $part){if((Get-Item -Force -LiteralPath $part).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Reparse path refused.'}};$part=[IO.Path]::GetDirectoryName($part)}}
$payload=@{}
foreach($entry in $pins.PSObject.Properties){
    if($entry.Name -notin @('Provision-IpUatBackupFoundation.ps1','BackupFoundation.Native.cs','provision-profile.json')){throw 'Unexpected package entry.'}
    No-Reparse (Join-Path $source $entry.Name)
    $bytes=[IO.File]::ReadAllBytes((Join-Path $source $entry.Name))
    if((Hash-Bytes $bytes) -cne $entry.Value){throw 'Package source hash mismatch; nothing was provisioned.'}
    $payload[$entry.Name]=$bytes # Copy the validated bytes, never reread a mutable source.
}
if($payload.Count -ne 3){throw 'Incomplete package.'}
$profile=[Text.Encoding]::UTF8.GetString($payload['provision-profile.json']) | ConvertFrom-Json
if([Security.Principal.WindowsIdentity]::GetCurrent().User.Value -cne $profile.apiUserSid){throw 'Use the reviewed ADMIN operator identity.'}
No-Reparse $destination
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$security=[Security.AccessControl.DirectorySecurity]::new()
$security.SetSecurityDescriptorSddlForm(('O:'+$owner+'G:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;RC;;;OW)'))
function Ensure-PrivateDirectory([string]$Path){
    No-Reparse $Path
    if(-not (Test-Path -LiteralPath $Path)){[void][IO.Directory]::CreateDirectory($Path,$security)}
    if((Get-Acl -LiteralPath $Path).Sddl -cne $security.Sddl){throw 'Unexpected existing package ACL; refuse repair.'}
}
Ensure-PrivateDirectory $destination
foreach($item in @(Get-ChildItem -Force -LiteralPath $destination)){
    if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Package reparse entry refused.'}
    if($item.Name -eq 'tmp' -and $item.PSIsContainer){continue}
    if($item.PSIsContainer -or -not $payload.ContainsKey($item.Name)){throw 'Unexpected existing package contents; refuse deletion or adoption.'}
}
foreach($name in $payload.Keys){
    $target=Join-Path $destination $name
    if(Test-Path -LiteralPath $target){if((Hash-Bytes ([IO.File]::ReadAllBytes($target))) -cne $pins.$name){throw 'Existing package bytes differ; refuse overwrite.'}}
    else{$stream=[IO.File]::Open($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$stream.Write($payload[$name],0,$payload[$name].Length)}finally{$stream.Dispose()}}
    $acl=Get-Acl -LiteralPath $target
    if($acl.AreAccessRulesProtected -or @($acl.Access | Where-Object {-not $_.IsInherited}).Count){throw 'Unexpected package file ACL; refuse execution.'}
}
$temp=Join-Path $destination 'tmp';Ensure-PrivateDirectory $temp
if(@(Get-ChildItem -Force -LiteralPath $temp).Count){throw 'Protected compiler temporary directory is not empty. Review it; no automatic cleanup.'}
    $env:TEMP=$temp;$env:TMP=$temp
    $global:LASTEXITCODE=0
    & (Join-Path $destination 'Provision-IpUatBackupFoundation.ps1') -Mode $Mode -ApproveWorkspaceCredentialGuard:$ApproveWorkspaceCredentialGuard -ConfirmRollback $ConfirmRollback
    if($LASTEXITCODE -ne 0){throw 'Foundation command refused or failed. Do not continue installation.'}
}finally{$env:TEMP=$savedTemp;$env:TMP=$savedTmp;$env:PSModulePath=$savedModules}
# Keep this verified package as recovery evidence. Foundation rollback does not delete it.
