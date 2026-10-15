#Requires -RunAsAdministrator
param([switch]$Rollback,[switch]$Verify)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$root='C:\ProgramData\LDSSProduction'
$runtime=Join-Path $root 'startup'
$evidence=Join-Path $root 'startup-repair-evidence'
$shell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$node='C:\Program Files\nodejs\node.exe'
$caddy=Join-Path $root 'caddy-2.11.7\caddy.exe'
$origin='https://monitor.iskolarngdaet.app:3443'
$names=@('LDSS Production App','LDSS Production HTTPS')
$mutex=[Threading.Mutex]::new($false,'Global\LDSSStartupRepair')
$owns=$false
$changed=$false
$backup=$null
$maintenanceStates=@{}
function Save-Json($value,[string]$path) { $value | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $path -Encoding UTF8 }
function Port-Free([int]$port) { return @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue).Count -eq 0 }
function Await-Free([int]$port) {
 for($i=0;$i -lt 30;$i++){if(Port-Free $port){return};Start-Sleep -Milliseconds 500}
 throw "Port $port did not stop. Refusing to start a competing server."
}
function Stop-Tasks {
 foreach($name in $names){Disable-ScheduledTask -TaskName $name | Out-Null;Stop-ScheduledTask -TaskName $name}
}
function Trusted-Health {
 for($i=0;$i -lt 30;$i++){
  try {
   $r=Invoke-WebRequest -UseBasicParsing -Uri "$origin/api/v1/ready" -TimeoutSec 3
   if($r.StatusCode -eq 200 -and ($r.Content | ConvertFrom-Json).status -eq 'ready'){
    $page=Invoke-WebRequest -UseBasicParsing -Uri "$origin/" -TimeoutSec 3
    if($page.StatusCode -eq 200){return}
   }
  }catch{}
  Start-Sleep -Seconds 2
 }
 throw 'Trusted HTTPS readiness did not recover.'
}
function Restore-Tasks([string]$folder) {
 if(-not $folder.StartsWith($evidence+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unexpected rollback location.'}
 Stop-Tasks
 Await-Free 3002;Await-Free 3443
 foreach($name in $names){
  $file=if($name -eq $names[0]){'app.xml'}else{'https.xml'}
  $xml=Get-Content -LiteralPath (Join-Path $folder $file) -Raw
  Register-ScheduledTask -TaskName $name -Xml $xml -Force | Out-Null
 }
 Copy-Item -LiteralPath (Join-Path $folder 'domain-https.ps1') -Destination (Join-Path $root 'domain-https.ps1') -Force
 foreach($name in $names){Enable-ScheduledTask -TaskName $name | Out-Null;Start-ScheduledTask -TaskName $name}
 Trusted-Health
}
try {
 try {$owns=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$owns=$true}
 if(-not $owns){throw 'Another startup repair is running.'}
 New-Item -ItemType Directory -Path $evidence -Force | Out-Null
 if($Rollback){
  $state=Get-Content -LiteralPath (Join-Path $evidence 'rollback.json') -Raw | ConvertFrom-Json
  Restore-Tasks $state.directory
  Save-Json @{status='rolled_back';at=[DateTime]::UtcNow.ToString('o')} (Join-Path $evidence 'status.json')
  Write-Output 'Previous task configuration restored; HTTPS verified.'
  return
 }
 if($Verify){
  Trusted-Health
  foreach($name in $names){$task=Get-ScheduledTask -TaskName $name;if($task.State -ne 'Running' -or -not $task.Settings.Enabled){throw "Task not running: $name"}}
  $boot=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')
  Save-Json @{status='current_health_verified';at=[DateTime]::UtcNow.ToString('o');boot=$boot;beforeSignInSecondPc='requires operator observation'} (Join-Path $evidence 'verification.json')
  Write-Output 'Current HTTPS and tasks verified. Record the separate second-PC check before host sign-in; this command alone does not prove it.'
  return
 }
 if(Test-Path -LiteralPath (Join-Path $evidence 'status.json')){
  $status=Get-Content -LiteralPath (Join-Path $evidence 'status.json') -Raw | ConvertFrom-Json
  if($status.status -eq 'installed_awaiting_reboot'){throw 'Repair already installed. Use -Verify or -Rollback.'}
 }
 $manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'payload-manifest.json') -Raw | ConvertFrom-Json
 foreach($f in $manifest.files){if((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $f.name) -Algorithm SHA256).Hash -ne $f.sha256){throw "Payload mismatch: $($f.name)"}}
 if((Get-FileHash -LiteralPath (Join-Path $root 'domain-https.ps1')).Hash -ne $manifest.originalRenewalSha256){throw 'Renewal script changed since repair preparation. Review compatibility before installing.'}
 $app=Get-ScheduledTask -TaskName $names[0]
 $https=Get-ScheduledTask -TaskName $names[1]
 if($app.Actions.Count -ne 1 -or $https.Actions.Count -ne 1){throw 'Expected one action per production task.'}
 if($app.Actions[0].Execute -ne $node -or $app.Actions[0].Arguments -ne '--env-file=C:\ProgramData\LDSSProduction\production.env dist/server/index.js'){throw 'Unexpected app action.'}
 if($https.Actions[0].Execute -ne $caddy -or $https.Actions[0].Arguments -ne 'run --config C:\ProgramData\LDSSProduction\Caddyfile --adapter caddyfile'){throw 'Unexpected HTTPS action.'}
 $release=$app.Actions[0].WorkingDirectory
 if(-not $release.StartsWith($root+'\release-',[StringComparison]::OrdinalIgnoreCase) -or -not(Test-Path -LiteralPath (Join-Path $release 'dist\server\index.js'))){throw 'Unexpected release directory.'}
 foreach($task in @($app,$https)){if($task.Principal.UserId -notin @('S-1-5-19','NT AUTHORITY\LOCAL SERVICE','LOCAL SERVICE')){throw 'Review unexpected service account before repair.'}}
 if((Get-CimInstance Win32_Service -Filter "Name='LDSSMariaDB'").StartMode -ne 'Auto'){throw 'MariaDB Automatic service setting must be reviewed.'}
 foreach($name in @('LDSS Certificate Renewal','LDSS Google Drive Backup')){if((Get-ScheduledTask -TaskName $name).State -eq 'Running'){throw "$name is running; wait and retry."}}
 # Capture metadata and task diagnostics before any replacement.
 $backup=Join-Path $evidence ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
 New-Item -ItemType Directory -Path $backup | Out-Null
 Export-ScheduledTask -TaskName $names[0] | Set-Content -LiteralPath (Join-Path $backup 'app.xml') -Encoding Unicode
 Export-ScheduledTask -TaskName $names[1] | Set-Content -LiteralPath (Join-Path $backup 'https.xml') -Encoding Unicode
 Copy-Item -LiteralPath (Join-Path $root 'domain-https.ps1') -Destination $backup
 Save-Json @($names | ForEach-Object {Get-ScheduledTaskInfo -TaskName $_ | Select-Object TaskName,LastRunTime,LastTaskResult,NextRunTime}) (Join-Path $backup 'task-results.json')
 try {
  $events=Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-TaskScheduler/Operational';StartTime=(Get-Date).AddDays(-2)} -MaxEvents 3000 -ErrorAction Stop | Where-Object {$_.Message -match 'LDSS Production (App|HTTPS)'} | Select-Object TimeCreated,Id,Message
  Save-Json @($events) (Join-Path $backup 'task-events.json')
 } catch {Set-Content -LiteralPath (Join-Path $backup 'task-events-unavailable.txt') -Value 'Task history unavailable or no matching recent events; failure cause remains unconfirmed.'}
 Save-Json @{directory=$backup} (Join-Path $evidence 'rollback.json')
 New-Item -ItemType Directory -Path $runtime -Force | Out-Null
 foreach($f in @('supervise.ps1','OwnedProcess.cs','database-ready.mjs')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $f) -Destination $runtime -Force}
 $log=Join-Path $root 'logs\startup'
 New-Item -ItemType Directory -Path $log -Force | Out-Null
 & icacls.exe $runtime /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
 if($LASTEXITCODE -ne 0){throw 'Startup read ACL failed.'}
 & icacls.exe $log /grant '*S-1-5-19:(OI)(CI)M' | Out-Null
 if($LASTEXITCODE -ne 0){throw 'Startup logging ACL failed.'}
 $config=@{
  App=@{Executable=$node;Arguments='--env-file=C:\ProgramData\LDSSProduction\production.env dist/server/index.js';WorkingDirectory=$release;Mutex='Global\LDSSProductionAppSupervisor';LogDirectory=$log;Port=3002;Dependency=@{Kind='Database';Arguments='C:\ProgramData\LDSSProduction\startup\database-ready.mjs'}}
  HTTPS=@{Executable=$caddy;Arguments='run --config C:\ProgramData\LDSSProduction\Caddyfile --adapter caddyfile';WorkingDirectory=$root;Mutex='Global\LDSSProductionHTTPSSupervisor';LogDirectory=$log;Port=3443;Dependency=@{Kind='Address';Address='192.168.0.16'}}
 }
 Save-Json $config (Join-Path $runtime 'startup.json')
 # Resolve the temporary recovery by exact executable/config and current owner.
 $temporary=@(Get-CimInstance Win32_Process -Filter "Name='caddy.exe'" | Where-Object {$_.ExecutablePath -eq $caddy -and $_.CommandLine -match '\brun\b' -and $_.CommandLine -match [regex]::Escape('C:\ProgramData\LDSSProduction\Caddyfile')} | ForEach-Object {
  $owner=Invoke-CimMethod -InputObject $_ -MethodName GetOwner
  if(($owner.Domain+'\'+$owner.User) -eq [Security.Principal.WindowsIdentity]::GetCurrent().Name){$_}
 })
 foreach($name in @('LDSS Certificate Renewal','LDSS Google Drive Backup')){
  $maintenance=Get-ScheduledTask -TaskName $name
  $maintenanceStates[$name]=$maintenance.Settings.Enabled
  Disable-ScheduledTask -TaskName $name | Out-Null
  if((Get-ScheduledTask -TaskName $name).State -eq 'Running'){throw 'A maintenance task started during preparation; wait for it to complete.'}
 }
 $changed=$true
 Stop-Tasks
 foreach($p in $temporary){
  $current=Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ProcessId)" -ErrorAction SilentlyContinue
  if($current -and $current.CreationDate -eq $p.CreationDate -and $current.ExecutablePath -eq $caddy){Stop-Process -Id $p.ProcessId -Force}
 }
 Await-Free 3002;Await-Free 3443
 $principal=New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
 foreach($component in @('App','HTTPS')){
  $taskName=if($component -eq 'App'){$names[0]}else{$names[1]}
  $action=New-ScheduledTaskAction -Execute $shell -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\ProgramData\LDSSProduction\startup\supervise.ps1 -Component $component" -WorkingDirectory $root
  Set-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Trigger (New-ScheduledTaskTrigger -AtStartup) | Out-Null
 }
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'domain-https.patched.ps1') -Destination (Join-Path $root 'domain-https.ps1') -Force
 foreach($name in $names){Enable-ScheduledTask -TaskName $name | Out-Null;Start-ScheduledTask -TaskName $name}
 Trusted-Health
 # Check actual service-account ownership before testing supervised recovery.
 foreach($port in @(3002,3443)){
  $listener=@(Get-NetTCPConnection -State Listen -LocalPort $port)
  if($listener.Count -ne 1){throw "Unexpected listeners on $port"}
  $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)"
  $owner=Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid
  if($owner.Sid -ne 'S-1-5-19'){throw "Unexpected runtime owner on $port"}
 }
 $httpsPid=(Get-NetTCPConnection -State Listen -LocalPort 3443).OwningProcess
 $owned=Get-CimInstance Win32_Process -Filter "ProcessId=$httpsPid"
 if($owned.ExecutablePath -ne $caddy){throw 'HTTPS recovery probe refused unexpected executable.'}
 Stop-Process -Id $httpsPid -Force
 Trusted-Health
 if((Get-NetTCPConnection -State Listen -LocalPort 3443).OwningProcess -eq $httpsPid){throw 'HTTPS child did not restart.'}
 # Verify Task Scheduler termination closes the job and therefore the listener.
 foreach($pair in @(@{Name=$names[1];Port=3443},@{Name=$names[0];Port=3002})){
  Stop-ScheduledTask -TaskName $pair.Name
  Await-Free $pair.Port
  for($i=0;$i -lt 20;$i++){if((Get-ScheduledTask -TaskName $pair.Name).State -ne 'Running'){break};Start-Sleep -Milliseconds 500}
  Start-ScheduledTask -TaskName $pair.Name
  Trusted-Health
 }
 Save-Json @{status='installed_awaiting_reboot';installedAt=[DateTime]::UtcNow.ToString('o');boot=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o');release=$release;httpsReady=$true;localServiceOwnership=$true;httpsCrashRecovery=$true;taskStopKillsChildren=$true;rebootVerified=$false;secondPcBeforeSignInVerified=$false;rollback=$backup} (Join-Path $evidence 'status.json')
 Write-Output 'Startup repair installed. HTTPS, LocalService ownership, crash recovery and task stop/start passed.'
 Write-Output 'No reboot was performed. Save work and arrange a second-PC test after reboot, before signing into this PC.'
} catch {
 Write-Output ('Startup repair stopped: '+$_.Exception.Message)
 if($changed -and $backup){
  try {Restore-Tasks $backup;Write-Output 'Previous task configuration restored and HTTPS is working.'}
  catch {Write-Output 'Automatic rollback could not restore access. Keep the backup and inspect startup-repair-evidence before retrying.'}
 }
 exit 1
} finally {
 foreach($name in $maintenanceStates.Keys){if($maintenanceStates[$name]){Enable-ScheduledTask -TaskName $name | Out-Null}}
 if($owns){$mutex.ReleaseMutex()};$mutex.Dispose()
}
