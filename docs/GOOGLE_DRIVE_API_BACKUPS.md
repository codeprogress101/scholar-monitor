# Office Google Drive backups

This feature is installed in source, not connected or activated automatically. Production deployment and database creation are separate. Do not mark recovery ready until a real Drive download and isolated restore pass.

## Prepare the Windows operator

Use a dedicated Windows operator account for unattended backup tasks, with access to the local database tools. Keep its private configuration, archives, tokens and recovery key outside all web roots. Use separate directories exclusively for this feature; `init` restricts their inherited Windows permissions to the current operator and SYSTEM. Never point these directories at a user profile root, an existing shared folder or a general application directory.

Copy `config/drive-backup.example.json` to a private location such as `C:\ProgramData\LDSSBackupConfig\production.json`. Replace placeholders there, not in the repository. Configure the exact production database name and port. Configure any nonstandard web root with `webRoot`; archive, status and key paths must be outside it. The runtime application database account must not be used as the backup operator. Existing development backup commands retain their original guard.

Provision a dedicated database backup user with SELECT, SHOW VIEW, TRIGGER and LOCK TABLES on the specific source database only. This task does not create or grant access to a production account. Consistent backups briefly read-lock the source tables, pausing writes; avoid migrations while a backup runs. No global RELOAD grant is required by the explicit-target path. The current archive limits remain 64 MiB SQL and 100,000 rows per table; exceeding a limit fails visibly rather than silently omitting data. Larger deployments require a streaming backup upgrade.

## Connect the office account

1. Under the dedicated office Google account, configure a Google Cloud project with Drive API enabled and an OAuth **Desktop app** client. Configure the consent screen for production use, with `drive.file` only. An external OAuth application left in Testing can lose its refresh token after seven days. Follow Google's current publishing requirements; the local `googlePublishingStatus` field is an operator assertion, not a remote verification of the Cloud console.
2. Store client ID/secret in the private JSON configuration. Do not paste account passwords, OAuth tokens or recovery keys into chat or source files.
3. Run `npm run backup:drive -- init --config C:\ProgramData\LDSSBackupConfig\production.json` as the Windows backup operator. This creates a new key and refuses to replace an existing one. Preserve a separate protected key copy in the office recovery vault or encrypted offline medium; do not put it in the Drive backup folder.
4. Run `npm run backup:drive -- connect --config C:\ProgramData\LDSSBackupConfig\production.json`. Open the displayed URL on this host computer, choose the office Google account and approve access. The short-lived callback listens only on loopback and validates OAuth state and PKCE. Reconnecting uses the existing folder and fails if the selected account cannot access it.
5. A private **LDSS Backups** folder is created. `google.json` contains the refresh token and folder ID under the restricted backup directory. Do not share the folder or place it in a broadly shared parent. Changing Google accounts requires an explicit separate backup configuration/directory.

References: [desktop authorization](https://developers.google.com/identity/protocols/oauth2/native-app), [Drive scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [OAuth token lifetime](https://developers.google.com/identity/protocols/oauth2), [resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Run and schedule

```powershell
npm run backup:drive -- backup --config C:\ProgramData\LDSSBackupConfig\production.json
powershell -File scripts/install-drive-backup-task.ps1 -ConfigPath C:\ProgramData\LDSSBackupConfig\production.json
```

The installer securely prompts for the Windows task account and refuses to replace an existing task. Use the same operator that ran init/connect. The task runs at startup and every 30 minutes, recovering missed schedules. `tick` creates a backup when the newest completed one is at least four hours old and retries all pending uploads. The task can run without an interactive login. The host must remain powered on; no work runs while shut down.

Completed archives are authenticated and atomically renamed before queuing. Uploads persist a reserved Drive ID, resume interrupted transfers and compare remote size and MD5 against the encrypted archive; the local manifest also records SHA-256. A crash after remote completion is recognized on retry. Files are never automatically deleted. Monitor available local/Drive storage and define retention before growth becomes a problem. No quota-full condition is reported as success.

The runner uses an exclusive OS-owned loopback listener, derived from the private directory, to prevent concurrent command/task execution. The OS releases it after a crash or shutdown, so startup can recover without deleting lock files. A collision with another local service fails closed and needs operator investigation. No backup commands or data are exposed through that listener. Task timeout and last-run failures must be monitored; the Administrator panel flags a status report older than an hour.

Set `BACKUP_STATUS_FILE` in the application environment to the configured status file. Grant the application service account read-only access to that dedicated status directory **only**, not config, key, token or archive directories. The System Administrator can view **System status > Google Drive backups** and refresh it. Staff/Coordinator have no status endpoint permission and no archive/restore endpoints exist. The status target must match the running database/environment.

## Prove and perform recovery

Choose an uploaded backup ID from the private `manifest.json`. For the rehearsal, temporarily configure `restoreUser` and `restorePassword` for a local recovery administrator capable of creating and removing isolated databases/users. Those credentials are not needed by scheduled backup/upload tasks and should be removed from their configuration afterward.

```powershell
npm run backup:drive -- verify-drive --config C:\ProgramData\LDSSBackupConfig\production.json --id BACKUP_ID
```

This downloads the exact Drive archive, checks SHA-256 and authenticated encryption, restores into a new random `ldss_restore_*` schema using a disposable user with no source access, compares all table checksums/schema/constraints/triggers/views, runs rejection probes, and removes only its owned temporary schema/user. Successful reports remain in the private directory. **Restore verified** changes only after this completes. The source database is never the restore target. Wrong key, corrupted archive or mismatched source aborts before SQL execution.

For a replacement host, recover the application release, MariaDB tools, private configuration and separately protected key, reauthorize the same Google account, and recover the private manifest (preserve an encrypted offline copy with operational recovery material). If the manifest was lost, obtain the selected archive from the office Drive account and validate it with the recovery tooling before a separately reviewed cutover; this version does not automatically reconstruct lost local manifests from Drive. Application releases, account grants and OS configuration are not part of the database archive. Restore sessions must be revoked before opening any recovered deployment. Never overwrite the only current database as a recovery experiment.

The external hard drive can retain additional encrypted archives; keep its key copy separately protected. An uploaded backup proves storage, not recoverability. An old restore timestamp proves only that rehearsal, not every later backup. Run periodic restore rehearsals and after schema/release changes.
