# ADMIN-SYS-1A — Manual encrypted backups and verified history

29 October 2026, Philippine time. **Stopped at the section 7 security gate. No backup page, API, trusted worker, capability, job ledger or backup-history service was installed on 5181.** The required complete capture needs metadata authority beyond a read-only source identity. A disposable test demonstrated that the source-scoped `TRIGGER` privilege also permits trigger creation. That privilege/security decision remains unapproved. No primary or operational LAN change was made.

**Evidence-integrity incident:** an imported historical inspection helper accidentally overwrote two original IP-UX-2 evidence files. Exact originals were not recovered. Their paths now explicitly report invalidation; the overwritten contents were retained privately and the helper was sealed. This is a material evidence limitation, separate from the successful current database/runtime preservation checks below.

## Current target and preservation

The [reuse/change-impact matrix](../../output/admin-sys-1a-20261029/EVIDENCE_REUSE_AND_CHANGE_IMPACT.md) preceded implementation work. The accepted [ADMIN-UX-1](../uiux/ADMIN_UX_1_ADMINISTRATOR_WORKSPACE_REDESIGN_REPORT.md), [ADMIN-SYS-1 plan](ADMIN_SYS_1_BACKUP_RESTORE_UPDATES_PLAN.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md), [ADMIN-ACCT-2](ADMIN_ACCT_2_SECURE_ACCOUNT_MANAGEMENT_REPORT.md) and [AUTH-REL-3.1](../security/AUTH_REL_3_1_PRIMARY_ACTIVATION_RETRY_REPORT.md) supplied the existing contracts. Current records and manifests were independently inspected; old reports were not substituted for current state.

| Item | Fresh starting and final result |
|---|---|
| Host / database server | DESKTOP-BPLJKRP / 127.0.0.1:3306, MariaDB 10.4.32 |
| Actual target | **5181 frontend / 3031 API**, loopback |
| UAT database | **`ldss_restore_1793167108097_2b47a744`**, **149 tables / 67 migrations** |
| UAT release | **`C:/Users/ADMIN/.ldss/ip-uat-1-20261028/release`** |
| Main / account SQL identities | `ldss_ipu_cb1da15ff3ac@localhost` / `ldss_acct_69bae605b8ae@localhost`; grants unchanged |
| UAT controller / API / web | **30244 / 7264 / 4136**, unchanged |
| UAT payrolls | PAY-001 **Processed v11**; PAY-002 **Review v3**; PAY-003 **Draft v2**, exact |
| UAT payments | Three original rows: payroll **Not Paid/Unclaimed**, payroll **Paid 2026-10-19**, individual **Paid 2026-10-28** |
| Effective UAT Paid | **2 / PHP 10,000.00**; the historical Unclaimed row is not another unpaid effective obligation |
| Accounts / signatories | Original **three accounts**, credentials and **19 signatory rows / version 1** exact |
| Protected primary | **5173/3001**, `ldss_primary_test_12676_61497616`, **150 tables / 67 migrations** |
| Primary release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/authrel3-20261028` |
| Primary payrolls | PAY-001 **Processed v805**; PAY-002 **Processed v8**; PAY-003 **Draft v4**, exact |
| Primary Paid records | **803** exact: **2 dated 24 October / 798 dated 26 October / 3 dated 28 October 2026** |

The user's original individual transaction **`8b20c2a7-74b8-4276-859b-3dc3906760aa`** and its Paid date remain exact. Complete inventory comparisons also cover its original stored OR/DV contents and metadata, source references, approvals, signatory history, accounts, sessions and command ledgers. No document was regenerated or financial outcome changed for acceptance. The baseline includes **367 UAT audits**, rather than ADMIN-UX-1's earlier 366; the already-recorded authentication activity was retained.

All **149 UAT / 150 primary tables**, schema objects, journals and original audit records match the independent current-task baseline. UAT audits remain **367**, primary audits **20,320**. No application login/logout, export audit, manual backup or business command was submitted by this task. Existing runtime/capability grants and protected private configuration hashes match. All **21,393 UAT / 21,258 primary manifest-listed release files** match; no runtime rebuild, dependency installation or restart occurred. Readiness on **3031, 5181, 3001 and 5173** returned **200** before and after. Retained LAN listeners **3002/3443** retain owners **8620/14816**. These are targeted preservation checks, not an exhaustive new inventory of every LAN database. [Initial inspection](../../output/admin-sys-1a-20261029/inspection.json), [final preservation](../../output/admin-sys-1a-20261029/final-preservation.json).

## Demonstrated privilege boundary

The actual UAT contains **33 triggers / zero routines / zero events**, as observed through the established operator read connection. Its restricted application identity sees **zero triggers / zero routines / zero events**. `backup-lib.mjs` inventories trigger bodies through `information_schema.TRIGGERS`, dumps with `--triggers`, and rejects unsupported routines/events. A metadata result of zero from an underprivileged identity cannot prove absence.

A newly owned disposable schema contained one trigger, one invoker-only procedure and one disabled event. A separate random test identity received `SELECT`, `SHOW VIEW` and `LOCK TABLES` only on that schema:

| Probe | Result |
|---|---|
| Operator visibility | **1 trigger / 1 routine / 1 event** |
| Source read/lock identity visibility | **0 / 0 / 0** |
| Trigger creation before added privilege | Denied |
| After source-scoped `TRIGGER`, on a fresh connection | Existing trigger visible; **creating another trigger succeeded** |
| Routine/event visibility after `TRIGGER` | Still **0 / 0** |

Thus a read-only worker could silently omit required schema evidence, while simply adding `TRIGGER` grants genuine source DDL authority. Visibility of unexpected unsupported objects also needs an independently trusted check. This is not a recommendation to expand the web runtime or account-administration capability. Neither received any grant. No operator credential was wrapped in a web endpoint.

The task explicitly directs: **“If a safe privilege, trusted-worker or durable-job contract requires a significant new schema/security authorization decision, STOP that portion and report the minimum proposal.”** The interpretation of *significant* here is grounded in the demonstrated ability to create source triggers, plus the metadata visibility gap. The general authorization to design a narrow backup capability does not specifically approve that DDL-capable identity or a privileged metadata broker.

The first disposable probe needed a new connection after the grant because the existing connection did not reflect the updated visibility. The corrected probe passed. Both attempts cleaned up their own objects/accounts; a final server metadata read found **zero** task probe schemas or users. No source schema/grant was changed. [Probe evidence](../../output/admin-sys-1a-20261029/privilege-probe.json), [cleanup](../../output/admin-sys-1a-20261029/probe-cleanup.json).

## Minimum separately reviewable implementation proposal

The following is a proposal, **not installed behavior or acceptance**:

1. **Approve a precise local-worker security design.** Choose a distinct UAT-only source identity with explicitly acknowledged source-scoped trigger authority and a trustworthy unsupported-object check, or a narrowly reviewed privileged metadata/capture broker. Specify exact SQL grants and OS credential/key/process custody. Do not expose root, reuse the account capability or give the browser paths, SQL, credentials, keys or database selection. The browser submits only the fixed operation, reason and exact retry identifiers.
2. **Bind admission to current authority and environment.** Reuse session-bound System Administrator reauthorization, CSRF/origin checks, a separately scoped backup capability, actor/request/reason, the exact UAT database/release/schema and source versions. Staff, Coordinator, revoked/expired sessions and mismatched environments must reject. No permission expansion is implemented here.
3. **Review durable cross-resource recovery.** Evaluate the existing transaction/command ledger plus a private authenticated job journal before proposing schema changes; no migration necessity has been demonstrated. A durable ID must bind the exact request/body/key, actor and environment before worker dispatch. Database admission/audit and filesystem archive creation are not one atomic transaction. Specify crash points, orphan/quarantine handling and ledger/audit reconciliation; an archive must not become Verified merely because a rename or file write occurred.
4. **Implement truthful states and inventory.** Accepted, In progress, Archive verified, Failed and Interrupted/Recovering require durable worker evidence. Exact retries look up the original job/result under fresh authority rather than dispatch another capture. Store bounded metadata and private artifact identity; page history server-side. Validate owned location, authenticated format, database, hash, size and metadata. Missing, corrupt, unsupported and interrupted artifacts remain distinct. Archive authentication and **Complete isolated recovery verified** are separate assertions.
5. **Prove the full requested matrix on disposable targets**, including worker interruption/restart, lost response after completion, duplicate requests, changed-key payloads, audit/ledger failure, revoked sessions, disk failure and complete isolated restoration. Only then integrate the fourth working destination, compact Create Backup/progress view and history, test responsive/keyboard behavior, establish quiescence and consider 5181-only activation through a fresh preservation/recovery gate.

The review must approve worker/metadata authority, job-journal ownership, crash/audit semantics and finite job/history/storage capacity. No retention-based deletion, archive export, restore or update permission follows. Document these decisions before implementation; do not solve the gap by marking a partial schema inventory complete.

## Reused backup contract and unexecuted gates

| Existing accepted contract | Preserved boundary |
|---|---|
| Raw SQL / decoded envelope / encrypted archive | **128 / 192 / 96 MiB** |
| Table inventory | **100,000 rows per table**, reject excess |
| Child process / source metadata-lock wait | **120 seconds / 10 seconds** |
| Destination free-space preflight | At least **128 MiB** in the installed path; subsequent disk exhaustion must still fail safely |
| Archive | **LDSSB001**, envelope v1, gzip, **AES-256-GCM**, authenticated header, 12-byte nonce, 16-byte tag |
| Key custody | Existing private **32-byte** key; no rotation, browser exposure or key copy |
| Consistency | Source-schema READ locks across inventory/dump, independent of browser connection; no global lock |
| Native SQL transport | Verified **MariaDB 11.4.13** client; installed hash **`db4bde74fc1e7a8e644bc3eda7128515d12f3b3c31c86932784f1cbbfba2dd3d`** |
| Recovery | Complete table values/counts/checksums, journal, columns/indexes/constraints, triggers/views and rejection probes on newly owned targets |

The [previous ADMIN-UX-1 recovery evidence](../../output/admin-ux-1-20261028/recovery.json) and [activation recovery](../../output/admin-ux-1-20261028/activation-recovery.json) are reused as historical evidence for the unchanged library. **No new source backup, source-lock capture or complete isolated restore was executed in this task.** Section 10's new-backup recovery acceptance therefore remains unmet; historical recovery is not claimed as acceptance of a nonexistent worker. No archive was created on actual 5181.

A database archive includes stored database document contents/metadata, but excludes matching application binaries/dependencies, external runtime configuration, TLS material and private key custody. It must never be labelled a complete system image. No backup limits, SQL transport, encryption, retention or restore semantics were changed.

## Independent release-gate failure injection

The requested section 12 check was completed independently of the blocked feature. A task-local orchestrator requires every gate's **`passed === true`**, propagates rejection/nonzero process exit, and rechecks the source after asynchronous gates before invoking any action. Tests use owned temporary files and recorded service-action callbacks; they do not stop/start real services.

**Nine tests passed:** nonzero child exit, rejected promise, false result, missing result, truthy unverified result, later preservation failure, changed source baseline, empty gate set, and a positive owned-file control. Every refusal preserved the exact target bytes and recorded **zero service actions**. The positive control demonstrates ordering only inside the disposable file fixture. This helper is not a production release manager or an assurance against all filesystem races. [Orchestrator](../../output/admin-sys-1a-20261029/release-gates.mjs), [tests](../../output/admin-sys-1a-20261029/release-gates.test.mjs), [TAP results](../../output/admin-sys-1a-20261029/release-gates.tap).

## Historical-evidence incident and exact changes

The new task runner was initially named `inspect.mjs` and imported exports from the older IP-UX-2 helper. The old helper checked only whether the entry filename ended in `inspect.mjs`; it consequently ran its CLI body on import. It performed operator read-only captures and release/readiness checks, then overwrote **`output/ip-ux-2-20261028/private/before.json`** and **`output/ip-ux-2-20261028/inspection.json`** at **06:32:14 Philippine time, 29 October**. It did not issue application logins, exports, backup commands, business writes or runtime changes.

Recovery searched 102 accessible output ZIPs, retained-stage file inventory and scoped historical session records. An unrelated long-path traversal error limits completeness. A partial original console read survives; later pre-install/final snapshots also survive. None is an exact replacement for either original file. No snapshot was reconstructed from present-day data and no later snapshot was relabelled as the original baseline. This was not exhaustive disk/volume-snapshot recovery.

The overwritten newer versions and original helper bytes are retained in restricted current-task evidence. Both old JSON paths now contain explicit invalidation notices; an adjacent [integrity notice](../../output/ip-ux-2-20261028/EVIDENCE_INTEGRITY_NOTICE.md) prevents reliance on them as original IP-UX-2 evidence. The old helper now checks the exact entry URL and refuses direct execution into its sealed historical directory. Current-task functions were isolated into a module with no CLI body. Two focused checks prove same-basename import does not execute the CLI and direct execution refuses before capture/writes, preserving the invalidated artifacts. [Incident record](../../output/admin-sys-1a-20261029/evidence-incident.json), [focused results](../../output/admin-sys-1a-20261029/focused-checks.json).

Exact change boundary:

| Files | Status |
|---|---|
| This report | Added |
| `output/admin-sys-1a-20261029/` | Added current-task inspection, privilege/gate tests, incident/recovery helpers, results and restricted snapshots; [file inventory](../../output/admin-sys-1a-20261029/deliverable-files.json) |
| `output/ip-ux-2-20261028/private/before.json`, `inspection.json` | Original evidence lost through overwrite; replaced with explicit invalidation notices |
| `output/ip-ux-2-20261028/inspect.mjs` | Historical helper guard corrected and CLI sealed; original bytes retained privately |
| `output/ip-ux-2-20261028/EVIDENCE_INTEGRITY_NOTICE.md` | Added incident notice |
| Application source, releases, private runtime configuration, grants | **No changes** |

## Acceptance, activation and remaining work

The installed ui-ux-pro-max and Playwright guidance was read. No frontend was implemented, so unchanged UI screenshots were not repeated. Existing Administration remains **Accounts → Document Signatories → Program Settings**. [Accepted desktop](../../output/playwright/admin-ux-1/after-accounts-1440.png) and [mobile](../../output/playwright/admin-ux-1/after-accounts-320.png) captures are historical reuse only, not new backup-page screenshots. There is no new 1440/1024/820/375/320, keyboard or native-200% backup-page acceptance to claim. No empty fourth page or fake backup control was added.

Executed checks: disposable metadata/privilege probe, nine gate tests, two evidence-helper guard checks, release-manifest verification, full current-task database/grant/configuration preservation, readiness/listener checks and probe cleanup. Content/link and secret checks are recorded in [report checks](../../output/admin-sys-1a-20261029/report-checks.json). Application builds, broad unit/financial/document suites and the proposed backup authorization/job/failure browser matrix were not run for an unimplemented feature. They are not represented as passing.

**5181 activation: NOT PERFORMED. ADMIN-SYS-1A functionality is incomplete.** The smallest next task is review and authorization of the source-worker/metadata privilege design and durable job/audit recovery contract described above, followed by isolated implementation and all unmet acceptance gates. Backup inventory, manual creation, interruption recovery and complete new-archive restore acceptance remain future work.

ADMIN-SYS-1B backup import/quarantine/rehearsal and export policy, ADMIN-SYS-1C signed update inspection/staging, active database restoration, migrations and operational deployment remain separately authorized stages. No uploaded package, archive export, active restore, migration, database upgrade or policy change was performed. **Primary 5173 and operational LAN remain preserved; LAN-R2A remains paused. Stopped after investigation, independent gate testing, incident disclosure and reporting.**
