# Google Drive for desktop backups

This is the selected setup. No custom OAuth app, public website, privacy-policy hosting or client secret is needed. The previous API setup is retained in GOOGLE_DRIVE_API_BACKUPS.md.

## Next steps

1. Install Google Drive for desktop from https://www.google.com/drive/download/ and sign in with the office Google account.
2. Create a dedicated local folder, for example C:/LDSS-Drive-Sync. In Drive Preferences, add that folder and choose **Sync with Google Drive**. Do not sync the live database or the project folder.
3. Keep that Windows account signed in and Drive running for uploads. Locking the screen is fine. Backups can run without a login, but desktop synchronization waits until Drive runs again.
4. Verify a harmless test file appears on Drive web. Provide the exact local synced-folder path for configuration.

## Private configuration and scheduling

Copy config/drive-backup.example.json outside the project/web root, for example C:/ProgramData/LDSSBackupConfig/production.json. Set mode to desktop and syncDirectory to the confirmed local folder. No Google OAuth fields are required.

The production database must be provisioned separately. Configure its exact name and dedicated backup credentials with SELECT, SHOW VIEW, TRIGGER and LOCK TABLES on that database only. Keep directory, keyFile, statusFile and the configuration outside the synced folder. Only encrypted archives are copied; keys, credentials and private manifests must never be synced.

Run these commands as the chosen Windows backup operator:

    npm run backup:drive -- init --config C:/ProgramData/LDSSBackupConfig/production.json
    npm run backup:drive -- backup --config C:/ProgramData/LDSSBackupConfig/production.json
    powershell -File scripts/install-drive-backup-task.ps1 -ConfigPath C:/ProgramData/LDSSBackupConfig/production.json

Init restricts dedicated private directories and creates a recovery key without overwriting an existing key. Use dedicated nested directories, never general shared folders or profile roots. Preserve a separately protected recovery-key copy. The task creates backups every four hours and retries copies every 30 minutes, with startup recovery. Its Windows account must have access to the configured local sync folder and private backup files.

Completed archives are copied through a temporary file and checked before final rename. Identical copies are reused, missing copies repaired, and corrupt copies fail visibly. Drive may briefly see a .partial file containing only encrypted bytes; it is not a completed backup. Archives are retained independently in the private local directory; no automatic deletion occurs.

## Status and recovery

Set BACKUP_STATUS_FILE on the application to the private status file. Give the application account read-only access to that status directory only. The Administrator panel shows Backup created, Copied to sync folder, Awaiting local copy and Archive restore tested.

**A local copy does not prove upload.** Check Drive's sync status and the archive on Drive web before shutdown. Offline, paused, signed-out or quota-full conditions may prevent syncing. This mode never reports automatic cloud confirmation.

To test recovery, download a completed archive from Drive web into a separate local folder. Temporarily configure restoreUser and restorePassword for a local recovery administrator, then run:

    npm run backup:drive -- verify-drive --config C:/ProgramData/LDSSBackupConfig/production.json --file C:/RecoveryDownloads/YOUR-BACKUP.ldssbackup

The command authenticates the archive and restores it to an isolated temporary database, checks records/schema/constraints/triggers/views, and removes only its own test resources. It records Archive restore tested, not proof of cloud provenance. Confirm that provenance by actually downloading from Drive web. Remove recovery credentials from the routine configuration afterward.

The existing 64 MiB SQL and 100,000 rows-per-table limits remain. Capture briefly pauses source writes. The archive does not include application binaries, account grants, Windows configuration or recovery keys. Keep those recovery materials separately. An external-drive copy remains useful as an additional offline copy.

No production database, Google sign-in or scheduled task has been activated by this change.

For the host-specific production preparation and remaining operational checks, see [Office LAN handover](OFFICE_LAN_HANDOVER.md).


## Backup runner locking and upgrades

On Windows the runner uses an exclusive named pipe based on the canonical private-directory path. It does not allocate a TCP port. The OS releases the pipe when the runner exits or is killed, so a crash leaves no stale lock file. Failure to acquire the lock stops the run and reports an OS error code; investigate another runner or operator permissions rather than bypassing the lock. Other platforms retain a loopback lock listener.

Before upgrading from the TCP-lock version, stop scheduled backup tasks and wait for existing backup commands to finish. Start the updated runner only after the old runners have stopped: the two lock mechanisms must not run concurrently. Updating source does not replace or restart installed tasks.
