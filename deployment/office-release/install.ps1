#Requires -RunAsAdministrator
param(
 [Parameter(Mandatory=$true)][string]$Release,
 [Parameter(Mandatory=$true)][string]$LaunchFile
)
$ErrorActionPreference='Stop'
$productionRoot='C:\ProgramData\LDSSProduction'
$releasePath=(Resolve-Path -LiteralPath $Release).Path
if (-not $releasePath.StartsWith($productionRoot+'\',[StringComparison]::OrdinalIgnoreCase) -or (Split-Path $releasePath -Leaf) -notmatch '^release-\d{8}(-[a-z0-9-]+)?$') { throw 'Unexpected release path' }
$node='C:\Program Files\nodejs\node.exe'
$helper=Join-Path $releasePath 'deployment\office-release\release-helper.mjs'
$launchPath=(Resolve-Path -LiteralPath $LaunchFile).Path
& $node $helper preflight $launchPath
if ($LASTEXITCODE -ne 0) { throw 'Artifact, rehearsal, acceptance or launch prerequisites failed; no services changed' }
$appName='LDSS Production App'
$httpsName='LDSS Production HTTPS'
$backupName='LDSS Google Drive Backup'
$appTask=Get-ScheduledTask -TaskName $appName
$httpsTask=Get-ScheduledTask -TaskName $httpsName
$backupTask=Get-ScheduledTask -TaskName $backupName
if ($backupTask.State -eq 'Running') { throw 'Backup running; wait before cutover' }
if ($appTask.Actions.Count -ne 1 -or $appTask.Actions[0].Arguments -notlike '*supervise.ps1*App*' -or $httpsTask.Actions[0].Arguments -notlike '*supervise.ps1*HTTPS*') { throw 'Expected supervised tasks; inspect exact actions' }
if ($appTask.Principal.UserId -notin @('S-1-5-19','LOCAL SERVICE','NT AUTHORITY\LOCAL SERVICE')) { throw 'Unexpected application task identity' }
if (-not $appTask.Settings.Enabled -or -not $backupTask.Settings.Enabled) { throw 'Expected enabled tasks; investigate before cutover' }
$startupPath=Join-Path $productionRoot 'startup\startup.json'
$startup=Get-Content -LiteralPath $startupPath -Raw | ConvertFrom-Json
$manifest=Get-Content -LiteralPath (Join-Path $releasePath 'release-manifest.json') -Raw | ConvertFrom-Json
if ([IO.Path]::GetFullPath($startup.App.WorkingDirectory) -ne [IO.Path]::GetFullPath($manifest.previousRelease) -or $startup.App.Port -ne 3002 -or $startup.HTTPS.Port -ne 3443) { throw 'Installed baseline changed; repeat rehearsal' }
$stamp=Get-Date -Format 'yyyyMMddTHHmmss'
$capture=Join-Path $productionRoot ('go-live-20261019\cutover-'+$stamp)
New-Item -ItemType Directory -Path $capture | Out-Null
& icacls.exe $capture /inheritance:r /grant:r "$env:USERDOMAIN\$env:USERNAME`:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Private evidence ACL failed' }
Copy-Item -LiteralPath $startupPath -Destination (Join-Path $capture 'startup-before.json')
Copy-Item -LiteralPath (Join-Path $productionRoot 'backup-tick.ps1') -Destination (Join-Path $capture 'backup-tick-before.ps1')
foreach ($name in @($appName,$httpsName,$backupName,'LDSS Certificate Renewal')) { Export-ScheduledTask -TaskName $name | Set-Content -LiteralPath (Join-Path $capture ($name+'.xml')) -Encoding Unicode }
$oldHttps=($startup.HTTPS | ConvertTo-Json -Depth 10 -Compress)
$migrationAttempted=$false
try {
 Disable-ScheduledTask -TaskName $backupName | Out-Null
 Disable-ScheduledTask -TaskName $appName | Out-Null
 Stop-ScheduledTask -TaskName $appName
 for($i=0;$i -lt 30;$i++){if(-not(Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue)){break};Start-Sleep -Seconds 1}
 if(Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue){throw 'Application listener remains; migration not started'}
 $migrationAttempted=$true
 & $node $helper migrate $launchPath
 if($LASTEXITCODE -ne 0){throw 'Migration/backup/preservation failed; keep application stopped and inspect evidence'}
 $startup.App.WorkingDirectory=$releasePath
 if(($startup.HTTPS | ConvertTo-Json -Depth 10 -Compress) -ne $oldHttps){throw 'HTTPS configuration changed'}
 $temporary=$startupPath+'.next'
 $startup | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temporary -Encoding UTF8
 Move-Item -LiteralPath $temporary -Destination $startupPath -Force
 $tick=@"
`$ErrorActionPreference='Stop'
Set-Location '$releasePath'
& '$node' '$releasePath\deployment\office-release\backup-watch.mjs' tick
exit `$LASTEXITCODE
"@
 $tick | Set-Content -LiteralPath (Join-Path $productionRoot 'backup-tick.ps1') -Encoding ASCII
 # Keep identity, triggers, arguments and HTTPS supervisor; only backup working directory changes.
 $action=New-ScheduledTaskAction -Execute $backupTask.Actions[0].Execute -Argument $backupTask.Actions[0].Arguments -WorkingDirectory $releasePath
 Set-ScheduledTask -TaskName $backupName -Action $action | Out-Null
 Enable-ScheduledTask -TaskName $appName | Out-Null
 Start-ScheduledTask -TaskName $appName
 $healthy=$false
 for($i=0;$i -lt 30;$i++){
   try{$response=Invoke-WebRequest -Uri 'https://monitor.iskolarngdaet.app:3443/api/v1/ready' -UseBasicParsing -TimeoutSec 5;if($response.StatusCode -eq 200 -and ($response.Content | ConvertFrom-Json).status -eq 'ready'){$healthy=$true;break}}catch{}
   Start-Sleep -Seconds 1
 }
 if(-not $healthy){throw 'Trusted HTTPS readiness failed'}
 & $node $helper verify
 if($LASTEXITCODE -ne 0){throw 'Installed runtime verification failed'}
 if((Get-ScheduledTask -TaskName $appName).Actions[0].Arguments -ne $appTask.Actions[0].Arguments){throw 'Supervisor action changed'}
 @{installedAt=(Get-Date).ToUniversalTime().ToString('o');release=$releasePath;httpsReady=$true;pilot='pending';reboot='pending';officeWide='not approved';evidence=$capture} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $capture 'installed.json') -Encoding UTF8
 Write-Output "Installed for restricted pilot acceptance. Reboot, second-PC and office-wide sign-off remain pending. Evidence: $capture"
}catch{
 Stop-ScheduledTask -TaskName $appName -ErrorAction SilentlyContinue
 if($migrationAttempted){Disable-ScheduledTask -TaskName $appName -ErrorAction SilentlyContinue | Out-Null}
 else{Enable-ScheduledTask -TaskName $appName | Out-Null;Start-ScheduledTask -TaskName $appName}
 throw
}finally{
 Enable-ScheduledTask -TaskName $backupName | Out-Null
}
