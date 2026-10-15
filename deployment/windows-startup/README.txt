LDSS startup repair - 12 October 2026

Scope: Windows deployment supervision only. No application release, database,
account, calendar, firewall, DNS or certificate changes. No automatic reboot.

INSTALL (Administrator PowerShell, brief planned application interruption):
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\ProgramData\LDSSProduction\startup-repair-20261012\install-startup-repair.ps1"

The installer captures original scheduled-task XML, last task results and available
task-history events. Task history may be unavailable; do not claim a proven boot
failure cause merely from missing HTTPS. It leaves MariaDB Automatic, backup and
renewal triggers/identities intact, and restores their enabled state after repair.

App and HTTPS tasks run PowerShell supervisors as LocalService at startup. App
waits for the current release's real database/schema readiness. HTTPS waits for
192.168.0.16 to become Preferred. Dependency polling is 5 seconds; child restart
delay is 10 seconds; a failed supervisor gets Task Scheduler retries each minute.
No sign-in, plaintext Windows password or GUI window is required for serving LDSS.

An exclusive component mutex and occupied-port checks prevent duplicate launches.
Children start suspended, enter a non-inheritable Windows Job Object configured
KILL_ON_JOB_CLOSE, then resume. Task termination closes the job and kills children.
stdout/stderr and state logs live in C:\ProgramData\LDSSProduction\logs\startup.
Supervisor logs rotate at 2 MB; child logs rotate at 5 MB between launches.

The certificate-renewal script's exact task validation recognizes the new launcher.
Its stop/start routine waits for the corresponding listener to disappear. Renewal
is not requested or forced by this repair; existing ADMIN sign-in is still required.

The existing release remains configured in startup\startup.json, App.WorkingDirectory.
Future reviewed deployments must update that path while App is stopped and verify
the new schema/release, rather than replace the task with a direct node launch.
Do not rerun an old one-shot release installer: its direct-action guard will reject
these supervised tasks. This intentionally avoids silently discarding supervision.

VALIDATION:
The elevated installer checks LocalService listener ownership, HTTPS readiness,
login page, HTTPS child crash recovery, and complete App/HTTPS task stop/start.
The isolated test-supervisor.ps1 exercises simulated delayed DB/network inputs,
duplicate exclusion, child restart and force-killed supervisor cleanup, without
stopping live services or modifying any database/network adapter.

ROLLBACK (Administrator PowerShell):
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\ProgramData\LDSSProduction\startup-repair-20261012\install-startup-repair.ps1" -Rollback
Rollback restores the captured task XML and renewal script, then starts and verifies
the original services. The original startup weakness may return after a reboot.
Backups are under C:\ProgramData\LDSSProduction\startup-repair-evidence.
If installation fails, automatic rollback attempts the same recovery. It never
restores a database or replaces certificates. If recovery also fails, preserve logs.

REBOOT ACCEPTANCE (not automated):
1. Save open work and arrange the restart with office users.
2. Restart the host normally. Leave Windows at the sign-in screen.
3. On a second office PC, open https://monitor.iskolarngdaet.app:3443 and sign in.
4. Record tester, time, browser result, and whether the host was still signed out.
5. Sign into ADMIN for Drive/renewal, then use Administrator PowerShell:
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\ProgramData\LDSSProduction\startup-repair-20261012\install-startup-repair.ps1" -Verify
6. Inspect logs and record restart recovery only after steps 2-4 pass. A post-login
health check alone cannot prove pre-login availability. Keep host awake on mains.

Current preparation does NOT itself install privileged tasks or prove reboot
recovery. status.json from the elevated installer records live acceptance separately.
