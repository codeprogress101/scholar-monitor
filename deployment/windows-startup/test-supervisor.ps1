param([ValidateSet('Database','Address')][string]$Dependency='Database')
$ErrorActionPreference='Stop'
$work=Join-Path ([IO.Path]::GetTempPath()) ('ldss-startup-test-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null
$node=(Get-Command node.exe).Source
$shell=Join-Path $PSHOME 'powershell.exe'
$script=Join-Path $PSScriptRoot 'supervise.ps1'
$childFile=Join-Path $work 'child.cjs'
@'
const fs=require('node:fs');
fs.appendFileSync('starts.txt',String(process.pid)+'\n');
console.log('synthetic stdout');console.error('synthetic stderr');
setInterval(()=>{},1000);
'@ | Set-Content -LiteralPath $childFile -Encoding ASCII
$gate=Join-Path $work 'dependency.ready'
$probeFile=Join-Path $work 'probe.cjs'
"process.exit(require('node:fs').existsSync('dependency.ready')?0:1);" | Set-Content -LiteralPath $probeFile -Encoding ASCII
$dependencyConfig=if($Dependency -eq 'Database'){@{Kind='Database';Arguments=('"'+$probeFile+'"')}}else{@{Kind='Address';Address='192.168.0.16'}}
$config=@{App=@{Executable=$node;Arguments=('"'+$childFile+'"');WorkingDirectory=$work;Mutex=('Local\LDSS-Test-'+[Guid]::NewGuid().ToString('N'));LogDirectory=$work;Port=0;Dependency=$dependencyConfig}}
$configFile=Join-Path $work 'startup.json'
$config | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configFile -Encoding UTF8
$wrapper=Join-Path $work 'run.ps1'
$wrapperContent=""
if($Dependency -eq 'Address'){
 $wrapperContent="function Get-NetIPAddress { if(Test-Path -LiteralPath '$($gate.Replace("'","''"))') { [pscustomobject]@{IPAddress='192.168.0.16';AddressState='Preferred'} } }`r`n"
}
$wrapperContent += "& '$($script.Replace("'","''"))' -Component App -ConfigPath '$($configFile.Replace("'","''"))'"
$wrapperContent | Set-Content -LiteralPath $wrapper -Encoding ASCII
$argsText='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$wrapper+'"'
$parent=$null;$duplicate=$null
function Starts {if(Test-Path (Join-Path $work 'starts.txt')){@(Get-Content (Join-Path $work 'starts.txt'))}else{@()}}
function Await-Starts([int]$count) {
 for($i=0;$i -lt 45;$i++){if(@(Starts).Count -ge $count){return};Start-Sleep -Seconds 1}
 throw "Expected $count starts. Inspect $work"
}
try {
 $parent=Start-Process $shell -ArgumentList $argsText -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $work 'supervisor-errors.txt')
 Start-Sleep -Seconds 7
 if(@(Starts).Count -ne 0 -or $parent.HasExited){throw 'Dependency wait failed'}
 Set-Content -LiteralPath $gate -Value ready
 Await-Starts 1
 $first=[int](@(Starts)[0])
 $duplicate=Start-Process $shell -ArgumentList $argsText -WindowStyle Hidden -PassThru
 if(-not $duplicate.WaitForExit(10000) -or @(Starts).Count -ne 1){throw 'Duplicate exclusion failed'}
 Stop-Process -Id $first -Force
 Await-Starts 2
 $second=[int](@(Starts)[1])
 if($second -eq $first){throw 'Process did not restart'}
 Stop-Process -Id $parent.Id -Force
 for($i=0;$i -lt 10;$i++){if(-not(Get-Process -Id $second -ErrorAction SilentlyContinue)){break};Start-Sleep -Milliseconds 500}
 if(Get-Process -Id $second -ErrorAction SilentlyContinue){throw 'Child survived abrupt supervisor termination'}
 if(-not(Select-String -LiteralPath (Join-Path $work 'App-stdout.log') -Pattern 'synthetic stdout' -Quiet)){throw 'Child stdout missing'}
 $result=@{dependencyKind=$Dependency;dependencySimulation=$true;dependencyWait=$true;automaticChildRestart=$true;duplicateExcluded=$true;forcedParentStopKillsChild=$true;stdoutCaptured=$true;testDirectory=$work;liveServicesChanged=$false}
 $result | ConvertTo-Json
} finally {
 foreach($p in @($parent,$duplicate)){if($p -and -not $p.HasExited){Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue}}
}
