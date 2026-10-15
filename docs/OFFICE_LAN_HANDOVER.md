# Office LAN installation and remaining acceptance

Prepared on 8 October 2026. This is not yet an approved production go-live.

## LAN release refreshed - 9 October 2026, 19:52 Asia/Manila

The October 9 release is installed at C:\ProgramData\LDSSProduction\release-20261009. An encrypted production backup passed isolated recovery before migration 44 was applied; existing business records were preserved. All 362 application/test/migration inputs checked against the successful earlier acceptance run were unchanged, and all 169 installed build files matched the fresh build. Local HTTPS at the new IP identity passed: frontend/health/readiness 200, unauthenticated backup status 401, .env 404. Evidence: output/lan-refresh-20261009/.

The installer has been updated and its temporary hold removed, with a validation prerequisite. The operator may now run the Administrator PowerShell command in section 2. Startup tasks and LAN firewall are not installed by this preparation; the preview still binds loopback. The backup runner now points to the October 9 release. The production schema is at 44 migrations. Second-computer trust/access, restart recovery, operator acceptance and separate key custody remain pending.

The previous status below is retained as history and superseded where it describes the installer hold or old release.

## Current LAN status - 9 October 2026

Ethernet reservation confirmed by the operator and Windows: 192.168.0.16/24, gateway 192.168.0.1, MAC 30-56-0F-08-92-C9. Intended URL is now https://192.168.0.16:3443. The private environment, Caddy site address and installer subnet were updated; rollback copies remain in the protected deployment directory. Caddy is still configured to bind loopback; the new IP certificate has not yet been issued or tested. No LDSS startup tasks are installed.

The prepared release is still release-20261008-r2 and does not certify the latest application fixes. The installer now refuses execution until that release and production schema are refreshed and validated. Do not run the installation command below yet. This session is not elevated; installing firewall rules and startup tasks will require Administrator PowerShell after preparation. Next: back up and refresh the LAN release/schema, validate locally, then enable LAN access and test HTTPS from a second computer. No production database changes, service starts or firewall changes occurred in this address update.

The October 8 notes below are historical preparation details. Their old address and ready-to-install instructions are superseded by this status. Namecheap deployment remains paused.

## Prepared host

- Host: DESKTOP-BPLJKRP; Ethernet address 30-56-0F-08-92-C9.
- Intended URL: https://192.168.110.115:3443. Port 443 remains owned by the existing Apache installation.
- Production database: ldss_scholar_monitor_production. Development data is retained separately.
- Production identities: the three real Michael Opiana identities from the test workspace, retaining System Administrator, Coordinator and Staff roles. Demo identities were excluded. No passwords or sessions were copied; activation is required.
- Provisional semesters: 1 August–31 December 2026 and 1 January–30 April 2027. April 31 is invalid. The academic-year envelope ends 31 July 2027, before the next August start; confirm the official calendar before operation.
- Staff types school/course details in academic records or simple Excel imports. No Administrator school/course prelisting is needed. Existing complete records and the Coordinator's approval workflow remain authoritative.
- The production preview currently listens only on loopback. Do not distribute the intended LAN URL as a working service yet.

## 1. Reserve the host address

The office router administrator must reserve 192.168.110.115 for Ethernet MAC 30-56-0F-08-92-C9. The host currently uses DHCP. Do not set an arbitrary static address on Windows or assume the router reservation exists. If the office chooses a different address, revise APP_ORIGIN, the Caddy site address, binding, firewall scope and these instructions before installation.

## 2. Install the prepared Windows tasks

After the router reservation is confirmed, open PowerShell **as Administrator** and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\LDSSProduction\install-lan.ps1 -AddressReserved
```

Review the script first. It installs app/HTTPS startup tasks under LocalService, allows HTTPS only from the office subnet, blocks remote database access, registers the MariaDB startup service without stopping the existing XAMPP process, and disables sleep while on AC power. It refuses to replace existing tasks. This Codex session is not elevated and has not run the installer.

The backup task uses the current Windows operator's interactive logon because Google Drive for desktop needs that signed-in session. It checks every 30 minutes and makes a local encrypted archive when the latest is at least four hours old. This setup does **not** promise Drive sync before Windows sign-in or while the host is off. Configure a dedicated unattended operator separately if that is required.

## 3. Trust HTTPS and activate accounts

Distribute only the public certificate output/lan-rollout/LDSS-Office-Root.crt to office clients. Do not distribute the Caddy data directory or any private key. Certificate-file SHA-256:

`ADE4498CC65390ED2CCD0022AB22D341D75FAA363EC3FB5CF1F04B92B9676228`

On each office Windows user account, import this certificate into the current user's Trusted Root Certification Authorities store. Verify the fingerprint against the host copy through the office operator. Then visit the intended HTTPS URL and confirm there is no certificate warning. Do not bypass browser certificate errors.

Issue fresh, short-lived production activation links once that URL is reachable by running `node C:\ProgramData\LDSSProduction\activate-accounts.mjs` as the host operator. This writes 15-minute links into the restricted C:\ProgramData\LDSSAccountActivation directory and skips accounts already activated. Deliver each link only to its account owner. The development account command intentionally remains development-only; do not relabel production as development to bypass it.

## 4. Confirm recovery custody and operating setup

The user-identified Drive download, C:\Users\ADMIN\Documents\backup\ldss-1791463670111-00c3adea.ldssbackup, restored successfully into an isolated database with 105 tables verified. This was the earlier empty production archive. A newer encrypted archive includes production account identities and the provisional calendar and has been staged for desktop sync; its cloud upload is not automatically confirmed by the application.

The recovery key remains protected at C:\ProgramData\LDSSBackupKeys\key.bin. A separate protected off-computer copy is still required. The Documents folder on the same computer is not protection against loss of this host. Never store the unprotected recovery key alongside Drive archives. Retain the private manifest and release/recovery instructions separately as well.

Confirm official dates, COR/COG coverage, waiver policy and the payout target date before opening receiving/payroll. No scholars, masterlist, payments or automatic eligibility have been fabricated in production. A small real pilot roster is still needed; school and course names can now be entered with the scholars.

## 5. Operator acceptance before go-live

From another office computer: verify HTTPS trust, activate and log in with the intended roles, import or enter a small real pilot, complete Coordinator review and publication, receive/verify the correct semester documents, confirm eligibility and automatic draft inclusion, inspect the payroll preview and Word download, and confirm the payment workflow with the operator. Do not mark a real stipend paid as a test.

Schedule a host restart with the office. Verify database, app and HTTPS startup, reconnection from the second computer, signed-in Drive synchronization, backup task history and another downloaded-archive recovery rehearsal after real data is introduced. No forced reboot or disruption of the current XAMPP services was performed during preparation.

Go-live remains blocked until router reservation, elevated installation, client trust/access, off-computer key custody and the operator pilot/restart checks are complete.


## 10 October 2026 source remediation - not installed

The new localhost remediation release expects 48 migrations and exact schema checksums. It has not been installed on LAN or applied to the existing development database. Keep the installed release and its environment intact until separate deployment authorization and target-backup recovery rehearsal. [Current source evidence and outstanding office acceptance](../output/readiness-remediation-20261010/REPORT.md) supersedes earlier technical acceptance only for the new source. Do not use an older readiness result to approve the new release.

## 12 October 2026 - installed release and startup repair preparation

The elevated release refresh completed: release-20261012, 48 migrations and trusted
HTTPS were verified by the installer. Production has two Staff accounts, one
Coordinator and one System Administrator. Account activation remains individual.
This supersedes the older not-installed release status above.

After the 12 October restart, the database and application were running but no
HTTPS process/listener existed. Manual recovery restored port 3443. The underlying
startup failure cause is not yet confirmed because the current non-elevated session
cannot read the protected scheduled-task results/history.

The supervised startup repair is prepared in deployment/windows-startup, with a
staged installer at C:\ProgramData\LDSSProduction\startup-repair-20261012.
It must be installed from Administrator PowerShell. Preparation is not proof of
installation: check startup-repair-evidence/status.json for the live result.
It waits for database/address availability, retries child exits, and owns child
processes using Windows Job Objects so task termination does not orphan servers.
Certificate renewal recognizes the supervised tasks; backup/renewal retain their
existing ADMIN interactive sign-in requirement. No application data is changed.

See deployment/windows-startup/README.txt for installation, rollback, diagnostics
and a supervised reboot procedure. Until the second-PC test passes before host
Windows sign-in, mark automatic restart recovery unverified. Do not reboot the
host automatically or represent the temporary recovery process as a permanent fix.
