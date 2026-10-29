# ADMIN-SYS-1A.1 — Secure backup worker and manual backup UI

29 October 2026, Philippine time. **Stopped at the OS isolation gate. No backup worker, SQL capability, permission mapping, durable-job service, history API or UI was installed.** The new request authorizes the metadata-capable worker deferred by ADMIN-SYS-1A; that authorization is accepted. The remaining blocker is execution and credential isolation on this host, not a renewed request for SQL-policy approval.

The actual 5181 controller, API and web process all run as **ADMIN**. This execution session also runs as ADMIN with a **non-elevated token**. No target-configured backup-worker principal or service was found. Existing private key access allows ADMIN and SYSTEM. An ordinary separate Node child under ADMIN would therefore not make ADMIN-readable worker secrets inaccessible to the ADMIN API. The existing controller uses normal `spawn`, with no separate credential or restricted-token launch. Its environment filtering is useful, but does not establish a distinct filesystem/process principal.

Section 4 requires **“Privileged database credential accessible only to the worker”** and directs **“If OS-level isolation or source authority cannot be bounded sufficiently, stop before activation with the exact unresolved risk.”** Section 15 directs **“STOP after verified UAT-only activation or the first mandatory failed gate.”** The current worker-isolation preflight did not pass. Application development, provisioning and activation were stopped rather than presenting a same-identity process as the requested boundary.

No Windows user/service creation, scheduled task, elevation attempt, new SQL identity/grant, migration, key rotation, source backup or restore was performed. The non-elevated token and same-owner processes are observed facts; no failed service-creation syscall or universal impossibility of another isolation design is claimed. A suitable operator-provisioned isolation boundary has not been established for this task.

## Verified current environment

The [evidence-reuse/change-impact matrix](../../output/admin-sys-1a-1-20261029/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded implementation. The accepted [ADMIN-SYS-1A findings](ADMIN_SYS_1A_MANUAL_BACKUP_AND_HISTORY_REPORT.md), [ADMIN-SYS-1 plan](ADMIN_SYS_1_BACKUP_RESTORE_UPDATES_PLAN.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md), [ADMIN-UX-1](../uiux/ADMIN_UX_1_ADMINISTRATOR_WORKSPACE_REDESIGN_REPORT.md), [ADMIN-ACCT-2](ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md) and [AUTH-REL-3.1](../security/AUTH_REL_3_1_PRIMARY_ACTIVATION_RETRY_REPORT.md) were reviewed. Their historical counts were not assumed current.

| Boundary | Fresh observation / preservation result |
|---|---|
| Host / database server | **DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32** |
| Actual UAT | **5181 frontend / 3031 API**, `ldss_restore_1793167108097_2b47a744` |
| UAT release | **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`** |
| UAT schema | **149 tables / 67 migrations** |
| Controller / API / web | **30244 / 7264 / 4136**, all ADMIN; unchanged |
| UAT payrolls | PAY-001 **Processed v11**, PAY-002 **Review v3**, PAY-003 **Draft v2**, exact |
| UAT payments | Original payroll **Not Paid/Unclaimed**, payroll **Paid 2026-10-19**, individual **Paid 2026-10-28**, exact |
| UAT signatories | **19 rows / version 1**, exact |
| UAT audits | **368**, preserved; previous task ended at 367 |
| Protected primary | **5173/3001**, `ldss_primary_test_12676_61497616`, **150 tables / 67 migrations** |
| Primary payrolls | PAY-001 **Processed v805**, PAY-002 **Processed v8**, PAY-003 **Draft v4**, exact |
| Primary payments / audits | **803 Paid / 20,320 audits**, exact |
| Readiness | **3031, 5181, 3001 and 5173: HTTP 200** before and after |

The additional existing UAT event is `auth.login`, recorded **29 October 2026, 09:22:41.819494 Philippine time**. It predates this task's snapshots; this task performed no application login/logout. Current counts and all original rows were preserved rather than reverting to the older audit checkpoint. The original individual Paid transaction and stored OR/DV evidence remain exact. No payment/document generation command was used for acceptance.

Preflight verified **21,393 UAT and 21,258 primary manifest-listed release files** against their accepted manifests. Subsequent work wrote only new task artifacts and this report; no application source, release, manifest, runtime profile or dependency file was replaced. Final comparison covers every UAT/primary table and schema-inventory section, journal, runtime/account-capability grants, current payrolls and payments. Protected UAT private configuration, credentials, capability/key material and existing backup-key hashes match. Controller state and UAT/primary/LAN listener ownership match. [Preflight](../../output/admin-sys-1a-1-20261029/preflight.json), [final preservation](../../output/admin-sys-1a-1-20261029/preservation.json).

## Worker boundary and next required procedure

The completed ADMIN-SYS-1A privilege probes were reused, not repeated. Current authoritative operator reads confirm **33 triggers / zero routines / zero events**. No underprivileged zero-object result was accepted. The ordinary runtime and account-administration capability received no additional authority.

The [existing account module](ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md) explicitly provides module/SQL separation inside one API process, not OS isolation. Reusing that pattern or merely adding another ADMIN child would not meet this request's worker-only credential requirement. The installed controller's ordinary spawn is in [controller.mjs](C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release/scripts/ip-uat1/controller.mjs:3). A new connection object hidden from route code would not resolve the filesystem principal issue.

The smallest continuation is an **operator-assisted worker-isolation setup and verification**, under the already authorized UAT scope:

1. Use an elevated local operator context to establish a dedicated noninteractive worker principal/service identity, or supply an already provisioned equivalent broker with a documented boundary. Do not elevate the ordinary API, frontend or controller. No additional metadata-policy authorization is being requested here.
2. Separate worker secrets, encrypted archives and authenticated job storage from API-readable paths. Ensure the API identity cannot read the selected privileged credential/key or change worker code, dependencies, native tools or control configuration. A separate SID alone is insufficient if its code/tools remain writable by the web principal. Check every copy of the selected credential; a newly restricted copy does not revoke an older readable copy.
3. Pin the exact UAT database, release/schema binding, BACKUP-1 engine and native client. Choose the reviewed operator broker or source-scoped capture identity without new global grants, GRANT OPTION, account-capability reuse or a generic SQL interface. Explicitly document any DDL-capable authority and independently prove complete metadata visibility and unsupported-object refusal.
4. Verify access denials using the actual API execution identity/token, plus worker code/tool integrity, permitted IPC identity and a fixed operation allowlist. Restrict IPC to the reviewed backup operation and bounded metadata; no caller-selected SQL, database, executable, directory or key. Record the residual trust in the local elevated operator.
5. Continue isolated implementation only after that gate passes: current-session Administrator admission with a specific backup capability; existing ledger plus authenticated private job journal if sufficient; audited admission/final result; one dispatch; interruption reconciliation; exact retry; bounded history. Then complete the requested fault matrix, new-archive isolated restore, UI/role acceptance, current-state recovery and gated 5181 activation.

This task did not provision that OS boundary, test a different principal, implement jobs or prove IPC security. The proposal is not an installed design or claim of successful security acceptance. No database migration has been shown necessary or approved.

## Historical evidence protection and focused tests

Before running reusable helpers, their source and import behavior were inspected. No archived CLI with writable top-level behavior was imported. Current reusable helpers have no CLI body and write only inside **`output/admin-sys-1a-1-20261029/`**, using exclusive creation. Existing task baselines cannot be overwritten. Canonical parent-path checks also refuse junction redirection outside that directory.

**752 existing files** under `docs`, IP-UX-2, ADMIN-SYS-1A and ADMIN-UX-1 evidence were inventoried and rehashed. **Zero changed.** The two invalidated IP-UX-2 paths, original incident notices, sealed helper, surviving later snapshots and all ADMIN-SYS-1A evidence remain byte-exact. No original was reconstructed, backdated, relabelled or substituted. Historical paths are read-only to the current helpers; existing OS ACLs/attributes were not altered. This is a tested task-write restriction, not a claim of OS enforcement against arbitrary ADMIN processes.

| Focused check | Result |
|---|---|
| Nine accepted ADMIN-SYS-1A release-gate cases | **9 passed**, exact existing test source reused |
| Current worker-isolation refusal / injected primary-preservation refusal | **2 passed**; zero provisioning, replacement or service-action callbacks |
| Historical path/traversal refusal | Passed; original file hash retained |
| Existing owned baseline replacement | Refused by exclusive creation |
| Junction to an owned external temporary directory | Refused before creating any file |
| Reusable helper import from a matching `inspect.mjs` basename | No CLI execution, new artifact or historical change |
| Full current-state preservation and readiness | Passed |

**15 focused tests passed.** File/junction fixtures were task-owned and removed after resolved-path checks; no disposable database was needed because there were no SQL mutations or backup-worker fault tests. The gate callbacks are test records, not real worker/service operations. [TAP results](../../output/admin-sys-1a-1-20261029/focused-tests.tap), [test summary](../../output/admin-sys-1a-1-20261029/focused-tests.json).

The original IP-UX-2 evidence loss remains unresolved as recorded in its [integrity notice](../../output/ip-ux-2-20261028/EVIDENCE_INTEGRITY_NOTICE.md). This task preserved that limitation exactly and introduced no new historical-evidence incident.

## Source, acceptance and activation status

**Zero existing files changed.** Additions are this report and the [task-local inventory](../../output/admin-sys-1a-1-20261029/files.json): matrix, safe read/write helpers, preflight/preservation tools, focused tests/results and restricted snapshots. No worker credential, SQL grant, permission row, API route, navigation destination, archive/job storage, manifest update, application build or installation was created. Normal and account SQL identities retain their original grants.

ui-ux-pro-max, Playwright and security-best-practices guidance was read; React/general frontend references were available, with no Fastify-specific security reference in that skill. There was no frontend change after the failed gate. Consequently no new backup-page screenshot, responsive/keyboard/native-200% acceptance or Administrator backup command is claimed. Existing Administration still has its three working destinations. No empty fourth page or nonfunctional Restore/Update/Download button was added.

BACKUP-1 remains unchanged: **128 MiB SQL / 192 MiB envelope / 96 MiB archive / 100,000 rows per table / 120-second child tool / existing metadata-lock limits**, authenticated AES-256-GCM and the accepted native transport. No new archive was captured or restored. Captured, Authenticated archive verified and Complete isolated restoration verified are future distinct worker states; none was fabricated in history. The new complete-backup/restore gate, durable-job crash/fault matrix and full UI acceptance remain unmet.

Report links, task syntax, public artifact secrecy and the repository secret scan are checked in [report checks](../../output/admin-sys-1a-1-20261029/report-checks.json). Application builds, broad financial/document suites, metadata privilege reprobes and unrelated UI sweeps were not rerun. Primary was neither modified nor restarted; retained/LAN listeners were not restarted or reconfigured. No active restoration, migration, update package, desktop launcher, financial operation or policy change occurred.

**Activation status: NOT INSTALLED; feature incomplete. Stopped at the first mandatory failed OS isolation gate.** Continue through the operator-assisted isolation procedure above before implementing and activating the worker/jobs/UI. Import/export, active restoration, patch inspection/activation and LAN operation remain future separately scoped work. **LAN-R2A remains paused.**
