param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [string]$TaskName = 'LDSS Google Drive Backup'
)
$ErrorActionPreference = 'Stop'
$configFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$scriptFile = Join-Path $PSScriptRoot 'drive-backup.mjs'
$nodeFile = (Get-Command node.exe).Source
if ($configFile.Contains('"') -or $scriptFile.Contains('"')) { throw 'Invalid path' }
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { throw 'Task already exists. Review its configuration before replacing it.' }
$action = New-ScheduledTaskAction -Execute $nodeFile -Argument ('"' + $scriptFile + '" tick --config "' + $configFile + '"') -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30)
$startup = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# The dedicated Windows operator must be able to read private config/key/token paths.
# Prompt securely: never store a Windows password in the script or command arguments.
$credential = Get-Credential -Message 'Windows account for unattended LDSS backups (same account used for init/connect)'
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($repeat,$startup) -Settings $settings -User $credential.UserName -Password $credential.GetNetworkCredential().Password -Description 'Creates encrypted backup when four hours overdue; retries uploads every 30 minutes. No retention deletion.' | Out-Null
Write-Output 'Backup task registered. Check LastTaskResult and Administrator backup status after its first run.'
