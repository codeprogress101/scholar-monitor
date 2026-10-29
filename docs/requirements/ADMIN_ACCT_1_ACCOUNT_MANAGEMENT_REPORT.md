# ADMIN-ACCT-1 — Account management and verified startup procedures

28 October 2026, Philippine time. **Account-management implementation stopped at the required runtime-permission gate. No Account Management page or account-write API was installed. Both primary 5173 and isolated UAT 5181 remain available and unchanged.** The actual 5181 runtime deliberately lacks the SQL privileges required to create users, assign/revoke roles, update profiles/status or issue password-reset tokens. Existing local-operator methods are not authorized web account-management contracts.

The request explicitly requires: **“Do not grant new permissions merely to make the interface function”** and **“If a necessary schema, permission or security-contract change exceeds authorized scope, STOP that portion and document the smallest proposal.”** No grants were expanded, operator credentials placed in the web application, or existing safeguards bypassed. The minimum proposed extension is documented below for separate review. The independent startup documentation was completed through source inspection, accepted startup evidence and non-mutating checks; neither application was restarted.

## Current environments and preservation

| Item | Protected primary | Isolated development target |
|---|---|---|
| Frontend / API | **5173 / 3001**, both readiness **200** | **5181 / 3031**, both readiness **200** |
| Database | `ldss_primary_test_12676_61497616` | `ldss_restore_1793167108097_2b47a744` |
| Runtime account | `ldss_primary_12676_61497616@localhost` | `ldss_ipu_cb1da15ff3ac@localhost` |
| Release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/authrel3-20261028` | `C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release` |
| Schema | **150 tables / 67 migrations** | **149 tables / 67 migrations** |
| Manifest files verified | **21,258** | **21,348** |
| PAY-001 / PAY-002 / PAY-003 | **Processed v805 / Processed v8 / Draft v4** | **Processed v11 / Review v3 / Draft v2** |
| Existing Paid evidence | **803**: two dated 24 October, 798 dated 26 October, three dated 28 October | Payroll Paid **19 October** and individual Paid **28 October**, plus the original payroll Not Paid/unclaimed outcome |

Host/database server remains DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32. Current release integrity and readiness passed. The existing UAT Administrator, Coordinator and Staff identities remain present with their existing roles. Original individual payment, generated DV, approvals, payrolls, signatory history and corrected Program Settings source remain intact. [Actual inspection and privilege inventory](../../output/admin-acct-1-20261028/inspection.json).

The complete before/after inventories match for **all 150 primary and 149 UAT tables**, schema objects and migration journal. Accounts, sessions, audit rows and financial/document histories are exact; no task login/logout or business command occurred. The existing private `UAT_LOGIN.txt` bytes and both manifest files are unchanged. Listener owners for **3001/5173, 3031/5181 and retained LAN 3002/3443** match the starting inventory. No exhaustive new LAN database inventory is claimed. [Preservation](../../output/admin-acct-1-20261028/preservation.json).

## Existing account/security contract inventory

| Operation | Existing implementation | Why a new browser form alone is insufficient |
|---|---|---|
| Account creation | `AuthService.createAccount`; local `scripts/account.ts` | Operator transaction/audit, email normalization and account awaiting activation; no current-session Administrator authorization, atomic role/setup command or durable creation retry contract |
| Profile editing | No general web account-profile writer found | No supported versioned name/email operation to expose |
| Disable/reactivate | `AuthService.setDisabled` | Operator method revokes sessions and consumes resets; no web authorization, expected-version/ledger, self-disable or last-Administrator safeguard |
| Role replacement | `AuthorizationService.setRoles`; local `scripts/roles.ts` | Existing expected-version, audit and `role_change_commands` replay; explicitly **local operator only**, without session-authorized web actor, self-change/last-Administrator protections |
| Reset issuance | `AuthService.issueReset`; operator CLI | One-time token, stored hash, 15-minute expiry, prior tokens consumed; no supported Administrator web issuance or secure delivery/outbox/recovery contract |
| Password activation | Public `POST /api/v1/auth/reset-password` | Existing token consumption, password rules/hashing, expiry, single use, audit, version change and session revocation; retain this implementation |
| Catalog / own access | `GET /admin/role-catalog`, `/me/permissions`, My access UI | Catalog/own-permission inspection; not an account-management listing/editor |
| Financial authorization | Accepted AUTH-REL-3 P1/M1 session-bound guarded authorization | Remains unchanged; a new account-security writer must invalidate affected sessions consistently and be tested against this guard |

Login remains an ASCII email address, not an independent username column. Passwords use the existing scrypt implementation and **15–128-character** rule. Approved role codes remain Staff, Coordinator and System Administrator. Actual System Administrator assignments already have **`users.manage` and `roles.manage`**; neither permission is assigned to Staff/Coordinator. No new application permission code or role is demonstrated necessary.

The local account/role CLI scripts are pinned to **`ldss_scholar_monitor_dev`** and use operator authority. They are not safe substitute commands for this restored 5181 database. Their development-database guard must not be disabled or satisfied through misleading environment changes.

### Confirmed blocking privilege boundary

The actual restricted UAT account has:

- `users`: SELECT and UPDATE of **password_hash, version, updated_at** only.
- `user_roles`: SELECT only.
- `password_resets`: SELECT and UPDATE of **consumed_at** only.
- No applicable INSERT authority for `users`, `user_roles`, `password_resets` or `role_change_commands`; no role-revocation UPDATE authority.
- No broader schema/global privilege supplying these missing operations.

This independently matches the source comment: **“Local operator only. The web runtime has no INSERT/UPDATE rights on RBAC tables.”** Direct grant metadata was read without printing authentication strings or credential hashes. No denied write was experimentally attempted on actual UAT. A new UI routed to these methods would fail; using root credentials in the API would defeat the existing boundary.

## Minimum separately approvable extension

This is a proposal, not an installed contract or permission grant.

1. Authorize an **5181-only account-administration privilege design**. If using the existing runtime, review narrowly scoped INSERT columns for new `users`, `user_roles` and `password_resets`; UPDATE of `users.full_name/email/disabled_at` and `user_roles.revoked_at`; and the required role-command ledger rights. Keep permission catalogs, role-permission mappings, DDL and grant authority read-only/unavailable. Alternatively review a narrowly privileged administrative service/routine; that is also a security-contract change, not an implicit workaround.
2. Define one bounded, current-session-authorized account command adapter using existing **`users.manage` / `roles.manage` plus Administrator role**. Reuse password/hash/reset primitives and transactional role logic; do not expose unguarded operator methods as routes. Bind actor, target, expected version, reason and exact request to an audited durable result. Confirm whether an existing ledger can represent all results safely before proposing any schema addition.
3. Add atomic **self-role/self-disable and last-authentication-capable-Administrator guards**, serialized against competing changes. An unactivated second Administrator must not be treated as protection against locking out the only usable Administrator. Session invalidation, account-version changes, reset invalidation and administrative audit must commit with the change; failures roll back. The Administrator still receives no financial authority.
4. Approve a **private password-setup/reset handoff**. Existing reset consumption can be retained, but issuance delivery must not return tokens to normal UI, log them, or invent an email service. Define private operator delivery and exact-recovery behavior before exposing Reset Password/Create Account as complete operations. No universal temporary password or View Password feature.
5. After that approval, implement the requested compact listing/editor with bounded search/role/status pagination and authoritative activity data. Test role denials, all three creation roles, duplicate email, edits, disable/reactivate, reset expiry/single use, security invalidation before financial authorization, last/self Administrator restrictions, concurrency, audit rollback, stale versions and lost-response exact retry on newly owned disposable copies.

No schema requirement has yet been established. The privilege expansion is established; the secure reset-delivery and general account command contracts are missing. These decisions must be resolved before promising a complete account editor. No read-only placeholder or nonfunctional Create Account form was installed and presented as completion.

## Verified PowerShell startup and stop procedures

Run from **PowerShell** on this host. The wrappers use the existing dedicated releases/private profiles; do not use `npm run dev`, change database variables or invoke the raw primary controller without its private JSON argument.

The earlier undefined-path error arose because the primary controller resolves its required settings-file argument. It also requires its own Node and release working directory. The accepted start helper supplies all three. The UAT controller has a different contract: its ownership/environment paths are built into the reviewed UAT wrapper/controller; do not pass it the primary settings file.

Before stopping, finish all pending/uncertain commands and pause operator activity. The quiet check rejects observed active transactions/requests; it is not a new application-wide maintenance barrier.

### Primary 5173 / API 3001

**Check the current running primary without changing it:**

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
node .\output\admin-acct-1-20261028\startup-check.mjs primary
```

**Start only when offline.** The first command fails closed if ports are occupied or a matching primary instance is active. Both instances are currently running, so do not execute this start sequence now:

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
node .\output\admin-acct-1-20261028\startup-check.mjs primary --offline
if ($LASTEXITCODE -ne 0) { throw 'Primary is running, occupied or failed verification. Do not start another instance.' }
node .\output\primary-startup-20261028\start-runtime.mjs primary 'C:/Users/ADMIN/.ldss/primary-runtime/releases/authrel3-20261028'
if ($LASTEXITCODE -ne 0) { throw 'Primary startup failed; inspect the private controller log.' }
```

The accepted helper starts the release's own `bin/node.exe`, invokes `scripts/isolated-primary/controller.mjs` with **`C:/Users/ADMIN/.ldss/primary-runtime/private/authrel3-20261028/primary.json`**, sanitizes the child environment and detaches the controller. After the helper reports readiness, **the PowerShell terminal may close**. No credentials appear in these commands.

**Readiness:**

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3001/api/v1/ready').StatusCode
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5173/api/v1/ready').StatusCode
```

Both must return **200**. Open `http://127.0.0.1:5173/`.

**Controlled stop:** check-only is the default; the separate `-Stop` switch is required to stop the freshly verified primary tree:

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
powershell.exe -NoProfile -File .\output\admin-acct-1-20261028\primary-stop.ps1
```

Only when an intentional primary stop is authorized and users have paused:

```powershell
powershell.exe -NoProfile -File .\output\admin-acct-1-20261028\primary-stop.ps1 -Stop
```

This rechecks the reviewed manifest/private environment, exact database/account/schema, current ports, Node paths, profile argument, parent/child PIDs and command quiescence before targeting the controller tree. **The `-Stop` path was not executed during ADMIN-ACCT-1.** Its ownership/quiescence preconditions were executed successfully; actual primary startup is reused from the [completed startup restoration](../../output/primary-startup-20261028/final.json). The new guard normalizes Windows path separators; its initial conservative rejection was corrected and the non-mutating check repeated.

### Individual Payments UAT 5181 / API 3031

**Check:**

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
node .\output\admin-acct-1-20261028\startup-check.mjs uat
```

**Start only when offline:**

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
node .\output\admin-acct-1-20261028\startup-check.mjs uat --offline
if ($LASTEXITCODE -ne 0) { throw '5181 is running, occupied or failed verification. Do not start another instance.' }
node .\output\ip-uat-1-20261028\control.mjs start
if ($LASTEXITCODE -ne 0) { throw 'UAT startup failed; inspect its private state logs.' }
```

This existing wrapper uses **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/private/ownership.json`**, its accepted **`private/environment.json`**, current **`private/runtime-integrity.json`**, dedicated Node and `scripts/ip-uat1/controller.mjs`. It detaches the UAT; **the terminal may close after readiness**.

**Readiness:**

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3031/api/v1/ready').StatusCode
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5181/api/v1/ready').StatusCode
```

Both must return **200**. Open `http://127.0.0.1:5181/`.

**Controlled UAT stop, only when intended:**

```powershell
Set-Location -LiteralPath 'C:\xampp\htdocs\scholar_monitor'
node .\output\admin-acct-1-20261028\startup-check.mjs uat --quiet
if ($LASTEXITCODE -ne 0) { throw 'UAT verification or command quiescence failed; do not stop it.' }
node .\output\ip-uat-1-20261028\control.mjs stop
```

The existing wrapper verifies database ownership, active transactions, exact executable and current process ancestry. Do **not** run its separate `reset` action: that would replace later legitimate UAT history. Its accepted start/stop behavior is reused from SIGN-UX-1/IP-UAT-1; no new stop/start was performed here.

The new read-only startup guard pins this task's reviewed manifest fingerprints and current database identities. A later authorized release or UAT database change should make it refuse until its baseline is reviewed; do not disable that check. No extra permissions are granted by the helper.

## Evidence reuse, checks, files and stop

The [evidence-reuse/change-impact matrix](../../output/admin-acct-1-20261028/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) was prepared before any application changes. Source identities match the accepted [SIGN-UX-1](../uiux/SIGN_UX_1_RESERVED_SIGNATORY_SETTINGS_REPORT.md), [SIGN-1](SIGN_1_ADMINISTRATOR_DOCUMENT_SIGNATORIES_REPORT.md), [AUTH-REL-3.1](../security/AUTH_REL_3_1_PRIMARY_ACTIVATION_RETRY_REPORT.md) and [IP-UAT-1](../acceptance/IP_UAT_1_INDIVIDUAL_PAYMENTS_TEST_ENVIRONMENT_REPORT.md) releases/evidence.

**Newly executed:** current source/manifest/database/privilege inventory; all four readiness checks; primary and UAT non-mutating startup checks; primary stop preconditions in **check-only** mode; refusal of duplicate primary startup preconditions while already running; JavaScript syntax checks; complete before/after data, credential-file and process/listener preservation.

**Reused, not claimed as new acceptance:** existing three-role authentication and Staff/Coordinator restrictions; AUTH-REL-3 session-bound security/races; SIGN-1 reset activation, rollback and document output; SIGN-UX-1 signatory navigation/reserved-row protection; actual primary startup/module proof; existing UAT start/stop proof. No account-create/reset/role mutation test ran because implementation stopped before the permission gate. No fresh Account Management screenshots or native-200% result exists because no page was built. Existing UI/UX/Playwright evidence does not certify a nonexistent new page.

**Files changed:** no existing application, dependency, configuration, migration, deployment, role or financial file. Additions only: this report and task-local matrix, read-only inspection/preservation/startup-check drivers, check-only-by-default PowerShell stop wrapper and evidence under `output/admin-acct-1-20261028/`. The primary stop wrapper is an operator procedure, not an installed application writer. It requires explicit `-Stop` for future mutation and was tested without that switch.

No application build, dependency installation, lint/unit/integration/financial suite, BACKUP-1 capture/restore or fixture provisioning was justified for this blocked read-only disposition. Mandatory mutation/recovery/installation gates were **not reached**, rather than bypassed. No 5181 activation or fallback was attempted; both accepted releases stay active.

**Recommended next task:** separately authorize the narrow UAT-only SQL privilege and account-command/reset-delivery design above, including last-Administrator/self-change protections, then implement and test on owned restores before 5181 installation. Administrator financial permissions must remain unchanged. No primary or operational LAN authority follows from that proposal.

**Stopped at the required account-management permission/security-contract boundary, with startup documentation completed. No accounts, passwords, roles, grants, sessions, signatories, documents, financial records, source releases or running services were changed. Primary remains ready; LAN-R2A remains paused.**
