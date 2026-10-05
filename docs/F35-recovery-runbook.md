# F35 — Backup and recovery runbook

Applies to v0.36.0 and the local XAMPP MariaDB database. Backup commands are local administrator tooling, with the same OS/database administrator trust boundary as account provisioning and migrations. There is no browser endpoint; the Staff and Coordinator roles receive no backup privileges. Restrict Windows access to this workspace and administrator credentials to designated system operators.

## Commands

Run PowerShell from `C:\xampp\htdocs\scholar_monitor`, with MySQL running in XAMPP:

```powershell
# One time only. F35 has already initialized this computer's key.
npm run backup -- init-key

# Create an encrypted full database backup.
npm run backup -- create

# Substitute the file returned by create. Verify and remove the temporary copy.
npm run backup -- verify --file "output/backups/FILE.ldssbackup"

# Recover into a new, isolated database and retain it for administrator inspection.
npm run backup -- verify --file "output/backups/FILE.ldssbackup" --keep
```

The key is `%USERPROFILE%\.ldss-backup\key.bin`, outside the web root. Initialization refuses to overwrite it. On this Windows computer, the key directory grants access only to the current OS account and SYSTEM. Back up the key separately to an administrator-controlled password vault or offline encrypted medium. Never commit, email or place the key beside the archives. Losing the key makes these backups unrecoverable; losing this computer before a separate recovery copy is secured remains a risk. No external copy or upload has been performed.

Archives and restore reports go into ignored `output/backups/`, protected from Apache by the workspace denial rule. Archive SQL and inventory metadata are gzip-compressed and encrypted using AES-256-GCM with a random 96-bit nonce and a 256-bit key; the format identifier is authenticated. Plaintext SQL is held in process memory and never written to disk. Authentication and SQL digest validation finish before restore SQL runs. SQL/passwords are not printed, and database passwords are passed through the child process environment rather than command arguments.

## Scope and limits

The archive contains table definitions and all rows, including authentication data, migration history, official records, audit evidence, triggers and views. It does not contain MariaDB users/grants, XAMPP binaries/configuration, the application source/build, `.env` or the encryption key. Recover these separately from trusted installation/release material and the operator's secret store. Restored sessions and reset records must be revoked before opening a recovered application to users.

This release deliberately supports only the configured loopback development database. It refuses other application environments/databases. It supports InnoDB, a maximum 64 MiB SQL dump and 100,000 rows per table; larger deployments need reviewed streaming/physical backup tooling. Unexpected stored routines/events fail the backup rather than being silently omitted. The current schema has neither. MariaDB tools have a 120-second process timeout.

Creating a backup takes a server-wide read lock while collecting the inventory and dump, briefly pausing writes on this XAMPP instance. Run during a quiet period with no migrations/imports in progress. The lock is released even if creation fails. This choice makes the dump and verification inventory refer to the same state. Do not use this small local-database procedure unchanged on a busy shared production server.

Restore always creates a fresh `ldss_restore_...` database. It never accepts an existing destination and never switches the application database. Import runs as a generated local SQL account with privileges only on that new database, local file import disabled and client shell commands disabled. Dump metadata definers are rebound to that account; data values are not rewritten. Cross-database SQL cannot access the live database.

Verification compares every table's count and SHA-256 digest of logical row values, including generated columns and full datetime precision. It also compares columns, generation expressions, indexes, foreign keys, check constraints, trigger definitions and view definitions, executes each view, and probes unique/FK/check rejection inside a rolled-back transaction. Physical `CHECKSUM TABLE` was unsuitable for the generated-column role table, so it is not used to decide recovery success.

Without `--keep`, the new database and generated SQL account are removed after verification. Failed restores are also removed. With `--keep`, both remain, and the report records their names. The generated password is not persisted or printed. The account remains a definer for restored objects; removing it breaks those objects. It is not an application runtime account. An administrator must inspect the copy, provision restricted runtime credentials and plan any cutover separately.

## Retention and recovery targets

Owner: designated System Administrator. Proposed production targets are **RPO 24 hours** and **RTO 4 hours**, subject to F36 operational acceptance. RPO assumes at least one successful backup every day; the measured local restore time alone does not demonstrate the end-to-end RTO.

| Copy | Schedule | Retention |
| --- | --- | --- |
| Daily | Each day at 20:00 Asia/Manila, after work | Latest 14 successful daily backups |
| Weekly | Preserve Sunday's daily copy | Latest 8 weekly copies |
| Monthly | Preserve the last successful copy of the month | Latest 12 monthly copies |
| Before change | Before migrations, releases or bulk administrative changes | Until change acceptance and two subsequent successful daily backups |

Store one encrypted copy off this computer in a separately controlled location; store the recovery key separately. Test a restore monthly and after schema/recovery-tool changes. Review command exit status and restore reports. A failed or missing backup must be investigated that day. Never delete the last verified recovery copy or its key. Retention is an operator procedure in this release: no scheduled Windows task, automatic pruning, offsite storage or alerts have been installed. The administrator must establish those before treating the 24-hour RPO as operational.

## Disaster recovery sequence

1. Stop application writes and record the incident time. Preserve the damaged database for diagnosis; do not overwrite it.
2. On an isolated recovery computer, install the matching application release/dependencies and compatible XAMPP MariaDB. Restore the administrator's configuration and key through a private channel. Establish the expected local development configuration; no live production connection is supported by this command.
3. Identify the newest complete archive before the incident. Run `verify --file ... --keep`. A wrong key, changed ciphertext, failed SQL import or inventory mismatch is a failed recovery: do not cut over.
4. Review the generated report. Check the exact migration history, scholar/official masterlist/OVR/audit totals, recent expected transactions and scholarship workflow behavior. Estimate any loss since `backupCreatedAt`. The isolated test does not send notifications or payments.
5. Have the database administrator provision a dedicated restricted runtime account for the recovered schema using the reviewed grant procedure in `scripts/migration-lib.mjs`; keep migration/admin credentials separate. Preserve/reassign the restored object definers deliberately. Invalidate recovered sessions/reset links before enabling access.
6. Obtain operational acceptance of the recovered records, configure the deployment for the recovered database, and run readiness plus Staff/Coordinator/System Administrator smoke tests. Production network/TLS/MFA requirements from F34 still apply. Cutover is a separate administrative action, not automated here.
7. Record actual recovery time/data loss, create a fresh encrypted backup, resume the schedule, and retain incident evidence. Dispose of temporary databases/accounts only after checking their exact names and confirming they are not the active database.

## Completed local drill

On 2026-10-04, the current 76-table local database was backed up and restored to a generated disposable database. All logical data digests/schema comparisons and constraint probes passed, including populated audit, masterlist and OVR history. Verification took **1.289 seconds**, excluding host provisioning, human review and application cutover. The disposable copy/account were removed; the live data and demo accounts were preserved.

- Archive: `output/backups/ldss-1791126602517-9e9e07d3.ldssbackup` (150,534 bytes).
- Evidence: `output/backups/restore-1791126608820_4686359a.json`.
- Tampered archive, wrong key and attempted cross-database access were separately tested and rejected.

The [MariaDB dump documentation](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump) describes logical backup/restore options; the implementation uses the installed XAMPP client and explicitly verifies this application's restored objects.
