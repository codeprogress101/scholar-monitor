#Requires -RunAsAdministrator
param([switch]$Renew)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = 'C:\ProgramData\LDSSProduction'
$privateDirectory = Join-Path $env:LOCALAPPDATA 'LDSSCertificate'
$env:POSHACME_HOME = Join-Path $privateDirectory 'acme'
$env:POSHACME_PLUGINS = Join-Path $privateDirectory 'plugins'
$caddy = Join-Path $root 'caddy-2.11.7\caddy.exe'
$certDirectory = Join-Path $root 'domain-certificate'
$origin = 'https://monitor.iskolarngdaet.app:3443'
$statusFile = Join-Path $privateDirectory 'renewal-status.json'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$changed = $false
$mutex = New-Object Threading.Mutex($false, 'Local\LDSSDomainCertificate')
if (-not $mutex.WaitOne(0)) { throw 'Another certificate operation is running.' }
function Restart-LDSSTask([string]$name) {
    Stop-ScheduledTask -TaskName $name
    for ($i=0; $i -lt 20; $i++) {
        if ((Get-ScheduledTask -TaskName $name).State -ne 'Running') { break }
        Start-Sleep -Milliseconds 500
    }
    if ((Get-ScheduledTask -TaskName $name).State -eq 'Running') { throw 'Task did not stop.' }
    $port=if($name -eq 'LDSS Production HTTPS'){3443}else{3002}
    for($i=0;$i -lt 30;$i++) {
        if(-not(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)){break}
        Start-Sleep -Milliseconds 500
    }
    if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){throw 'Owned child did not stop; refusing a competing server.'}
    Start-ScheduledTask -TaskName $name
}
function Read-DomainDns {
    $credential = Import-Clixml (Join-Path $privateDirectory 'namecheap-credential.xml')
    $publicIp = (& curl.exe --ipv4 --silent --max-time 15 https://api.ipify.org).Trim()
    if ($LASTEXITCODE -ne 0 -or $publicIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { throw 'IP lookup failed.' }
    $body = @{ApiUser=$credential.UserName;UserName=$credential.UserName;ApiKey=$credential.GetNetworkCredential().Password;ClientIp=$publicIp;Command='namecheap.domains.dns.getHosts';SLD='iskolarngdaet';TLD='app'}
    [xml]$result = (Invoke-WebRequest -UseBasicParsing -Uri 'https://api.namecheap.com/xml.response' -Method Post -Body $body -TimeoutSec 30).Content
    if ($result.ApiResponse.Status -ne 'OK') { throw 'DNS authentication failed. Check credentials and public-IP whitelist.' }
    return $result
}
function DnsSummary($document) {
    $zone=$document.ApiResponse.CommandResponse.DomainDNSGetHostsResult
    'EmailType=' + $zone.EmailType
    $zone.host | ForEach-Object { $_ | Select-Object Name,Type,Address,MXPref,TTL | ConvertTo-Json -Compress } | Sort-Object
}
try {
    foreach ($name in @('LDSS Production App','LDSS Production HTTPS')) {
        $task=Get-ScheduledTask -TaskName $name
        $component=if($name -eq 'LDSS Production HTTPS'){'HTTPS'}else{'App'}
        $launcher=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $arguments="-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\ProgramData\LDSSProduction\startup\supervise.ps1 -Component $component"
        $supervised=$task.Actions.Count -eq 1 -and $task.Actions[0].Execute -eq $launcher -and $task.Actions[0].Arguments -eq $arguments
        if (-not $supervised) { throw 'Expected the reviewed supervised production task. Inspect startup configuration before renewal.' }
    }
    Import-Module Posh-ACME -RequiredVersion 4.34.0
    Set-PAServer LE_PROD | Out-Null
    Set-PAOrder -Name 'ldss-office' | Out-Null
    if ($Renew) {
        $before=Read-DomainDns
        $before.Save((Join-Path $privateDirectory "renew-dns-before-$stamp.xml"))
        $credential=Import-Clixml (Join-Path $privateDirectory 'namecheap-credential.xml')
        try {
            Submit-Renewal -Name 'ldss-office' -PluginArgs @{NCUsername=$credential.UserName;NCApiKey=$credential.Password} | Out-Null
        } finally {
            $after=Read-DomainDns
            $after.Save((Join-Path $privateDirectory "renew-dns-after-$stamp.xml"))
            if (Compare-Object @(DnsSummary $before) @(DnsSummary $after)) { throw 'DNS changed unexpectedly; inspect snapshots.' }
        }
    }
    $certificate=Get-PACertificate
    $leaf=[Security.Cryptography.X509Certificates.X509Certificate2]::new($certificate.CertFile)
    if ($leaf.Subject -ne 'CN=monitor.iskolarngdaet.app' -or $leaf.NotAfter -lt (Get-Date).AddDays(1)) { throw 'Certificate identity or expiry invalid.' }
    if ($Renew -and (Test-Path "$certDirectory\fullchain.pem") -and ((Get-FileHash $certificate.FullChainFile).Hash -eq (Get-FileHash "$certDirectory\fullchain.pem").Hash)) {
        @{status='No renewal needed';checkedAt=(Get-Date).ToString('o');expires=$leaf.NotAfter.ToString('o')} | ConvertTo-Json | Set-Content $statusFile
        Write-Output 'Certificate is current; no service restart needed.'
        return
    }
    if (-not $Renew -and (Get-ScheduledTask -TaskName 'LDSS Certificate Renewal' -ErrorAction SilentlyContinue)) { throw 'Renewal task already exists; inspect before reinstalling.' }
    New-Item -ItemType Directory -Path $certDirectory -Force | Out-Null
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls.exe $certDirectory /inheritance:r /grant:r "*${sid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)RX' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Certificate permissions failed.' }
    $backup=Join-Path $privateDirectory "https-rollback-$stamp"
    New-Item -ItemType Directory -Path $backup | Out-Null
    Copy-Item "$root\Caddyfile","$root\production.env" -Destination $backup
    foreach ($file in @('fullchain.pem','key.pem')) { if(Test-Path "$certDirectory\$file"){Copy-Item "$certDirectory\$file" $backup} }
    $changed=$true
    Copy-Item $certificate.FullChainFile "$certDirectory\fullchain.pem" -Force
    Copy-Item $certificate.KeyFile "$certDirectory\key.pem" -Force
    if (-not $Renew) {
        $config=@'
{
    admin off
    auto_https disable_redirects
    skip_install_trust
    storage file_system {
        root C:/ProgramData/LDSSProduction/caddy-data
    }
}
https://monitor.iskolarngdaet.app:3443 {
    bind 192.168.0.16
    tls C:/ProgramData/LDSSProduction/domain-certificate/fullchain.pem C:/ProgramData/LDSSProduction/domain-certificate/key.pem
    reverse_proxy 127.0.0.1:3002
}
https://192.168.0.16:3443 {
    bind 192.168.0.16
    tls internal
    redir https://monitor.iskolarngdaet.app:3443{uri} 302
}
'@
        Set-Content "$root\Caddyfile" $config -Encoding ASCII
        $envText=Get-Content "$root\production.env" -Raw
        if ([regex]::Matches($envText,'(?m)^APP_ORIGIN=').Count -ne 1) { throw 'Unexpected origin configuration.' }
        $envText=[regex]::Replace($envText,'(?m)^APP_ORIGIN=[^\r\n]*',"APP_ORIGIN=$origin")
        [IO.File]::WriteAllText("$root\production.env",$envText,[Text.UTF8Encoding]::new($false))
    }
    & $caddy validate --config "$root\Caddyfile" --adapter caddyfile
    if ($LASTEXITCODE -ne 0) { throw 'Caddy validation failed.' }
    if (-not $Renew) { Restart-LDSSTask 'LDSS Production App' }
    Restart-LDSSTask 'LDSS Production HTTPS'
    $healthy=$false
    for($i=0;$i -lt 15;$i++) {
        $response=& curl.exe --silent --fail --max-time 5 --resolve 'monitor.iskolarngdaet.app:3443:192.168.0.16' "$origin/api/v1/health"
        if($LASTEXITCODE -eq 0){
            try { $health=$response | ConvertFrom-Json; if($health.status -eq 'ok' -and $health.database -eq 'connected'){$healthy=$true;break} } catch {}
        }
        Start-Sleep -Seconds 2
    }
    if(-not $healthy){throw 'Trusted HTTPS health check failed.'}
    if (-not $Renew) {
        Copy-Item -LiteralPath $PSCommandPath -Destination "$root\domain-https.ps1" -Force
        $owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
        $principal=New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Highest
        $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\ProgramData\LDSSProduction\domain-https.ps1 -Renew'
        $triggers=@((New-ScheduledTaskTrigger -AtLogOn -User $owner),(New-ScheduledTaskTrigger -Daily -At '10:00'))
        $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
        Register-ScheduledTask -TaskName 'LDSS Certificate Renewal' -Action $action -Principal $principal -Trigger $triggers -Settings $settings | Out-Null
    }
    @{status='Installed and HTTPS health passed';checkedAt=(Get-Date).ToString('o');expires=$leaf.NotAfter.ToString('o');origin=$origin} | ConvertTo-Json | Set-Content $statusFile
    $changed=$false
    Write-Output "Trusted HTTPS is ready: $origin"
    Write-Output 'Renewal checks run daily and at logon while this Windows user is signed in. Internet access and a current Namecheap public-IP whitelist are required.'
} catch {
    if ($changed) {
        Copy-Item "$backup\Caddyfile","$backup\production.env" -Destination $root -Force
        foreach($file in @('fullchain.pem','key.pem')) { if(Test-Path "$backup\$file"){Copy-Item "$backup\$file" $certDirectory -Force} }
        Restart-LDSSTask 'LDSS Production App'
        Restart-LDSSTask 'LDSS Production HTTPS'
    }
    @{status='Failed; inspect setup before retrying';checkedAt=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content $statusFile
    Write-Output 'HTTPS setup failed. Previous configuration was retained or restored. Sensitive exception details suppressed.'
    exit 1
} finally {
    Remove-Variable credential -ErrorAction SilentlyContinue
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
