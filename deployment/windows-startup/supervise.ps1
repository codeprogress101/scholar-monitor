param(
 [Parameter(Mandatory=$true)][ValidateSet('App','HTTPS')][string]$Component,
 [string]$ConfigPath = 'C:\ProgramData\LDSSProduction\startup\startup.json'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$item = $config.$Component
if (-not $item -or -not [IO.Path]::IsPathRooted($item.Executable) -or -not (Test-Path -LiteralPath $item.WorkingDirectory)) { throw 'Invalid startup configuration.' }
Add-Type -Path (Join-Path $PSScriptRoot 'OwnedProcess.cs')
$mutex = [Threading.Mutex]::new($false, $item.Mutex)
$owns = $false
$job = $null
$lastState = ''
function Write-State([string]$message) {
 $file = Join-Path $item.LogDirectory "$Component-supervisor.log"
 if ((Test-Path -LiteralPath $file) -and (Get-Item -LiteralPath $file).Length -gt 2MB) { Move-Item -LiteralPath $file -Destination "$file.previous" -Force }
 Add-Content -LiteralPath $file -Value ("{0} {1}" -f [DateTime]::UtcNow.ToString('o'),$message)
}
function Rotate-ChildLogs {
 foreach ($kind in @('stdout','stderr','probe')) {
  $file = Join-Path $item.LogDirectory "$Component-$kind.log"
  if ((Test-Path -LiteralPath $file) -and (Get-Item -LiteralPath $file).Length -gt 5MB) { Move-Item -LiteralPath $file -Destination "$file.previous" -Force }
 }
}
try {
 try { $owns=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owns=$true }
 if (-not $owns) { exit 0 }
 $job=[LdssProcessJob]::new()
 Write-State ('supervisor started; identity='+[Security.Principal.WindowsIdentity]::GetCurrent().Name)
 while ($true) {
  $ready=$true
  if ($item.Dependency.Kind -eq 'Address') {
   $ready=@(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -eq $item.Dependency.Address -and $_.AddressState -eq 'Preferred' }).Count -gt 0
  } elseif ($item.Dependency.Kind -eq 'Database') {
   $probeLog=Join-Path $item.LogDirectory "$Component-probe.log"
   $probe=$job.Start($item.Executable,$item.Dependency.Arguments,$item.WorkingDirectory,$probeLog,$probeLog)
   try {if (-not $probe.Wait(10000)) { $probe.Stop();$ready=$false } else { $ready=$probe.ExitCode -eq 0 }} finally { $probe.Dispose() }
  } else { throw 'Unknown dependency type.' }
  if ($ready -and $item.Port) {
   $ready=@(Get-NetTCPConnection -State Listen -LocalPort $item.Port -ErrorAction SilentlyContinue).Count -eq 0
   if (-not $ready -and $lastState -ne 'occupied') {Write-State 'port occupied; refusing duplicate process';$lastState='occupied'}
  }
  if (-not $ready) {
   if ($lastState -notin @('waiting','occupied')) {Write-State 'waiting for dependency';$lastState='waiting'}
   Start-Sleep -Seconds 5
   continue
  }
  Rotate-ChildLogs
  $child=$null
  try {
   $child=$job.Start($item.Executable,$item.Arguments,$item.WorkingDirectory,(Join-Path $item.LogDirectory "$Component-stdout.log"),(Join-Path $item.LogDirectory "$Component-stderr.log"))
   Write-State ("child started; pid="+$child.Id)
   $lastState='running'
   while (-not $child.Wait(1000)) { }
   Write-State ("child exited; code="+$child.ExitCode+"; retry in 10 seconds")
  } catch { Write-State ('child launch failed; type='+$_.Exception.GetType().Name+'; retry in 10 seconds') }
  finally {if ($child) {$child.Stop();$child.Dispose()}}
  Start-Sleep -Seconds 10
 }
} finally {
 if ($job) {$job.Dispose()}
 if ($owns) {$mutex.ReleaseMutex()}
 $mutex.Dispose()
}
