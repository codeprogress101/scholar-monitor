# DB-COMPAT-1 — MariaDB 11.4 schema compatibility and isolated recovery

28 October 2026, Philippine time. **Complete 150-table recovery and isolated application/concurrency acceptance passed on genuine MariaDB 11.4.13 with five declared generated-expression corrections, an isolated JSON-text connector adapter and the tested existing BACKUP-1 client tools. These conditions are material: the stock application fails on the target, and the native 11.4 Windows import client is not byte-interchangeable with the accepted client. Primary upgrade and operational release remain NO-GO. No primary schema, app, dependency, configuration or process changed.**

This follows [SEC-3](../security/SEC_3_LOCKFILE_INTEGRITY_AND_ACTIVATION_REPORT.md), [SEC-1](../security/SEC_1_DEPENDENCY_AND_MARIADB_READINESS_REPORT.md), [SEC-2](../security/SEC_2_ISOLATED_DEPENDENCIES_ACTIVATION_REPORT.md), [FLOW-3](../acceptance/FLOW_3_PAYROLL_FINALIZATION_RELIABILITY_REPORT.md), [FLOW-2](../acceptance/FLOW_2_FINAL_OFFICE_UAT_REPORT.md) and [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). LAN-R2A remains paused. Rehearsal does not establish office financial authority.

## Actual baseline and fresh recovery

| Primary fact | Starting and final |
|---|---|
| Host / database runtime | DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Active release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028` |
| Controller / API / Vite | 65812 / 62376 / 31768; no restart |
| Schema / migrations | 150 tables / 67 original migrations including F57, exact |
| Official Batch 1 | Published v415 / 835 active members / 167 retained removals |
| PAY-001 / PAY-002 | Processed v805 / 800 Paid; processed v5 / 200 Pending |
| PAY-003 | Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review; no frozen roster/allocation/payment |
| Cutoffs / deadline | Original 21 / 23 / 27 October whole-day cutoffs; 31 October deadline revision 3 |
| F57 policy | Original synthetic-UAT-only five-choice rule, unchanged; no new office approval inferred |

All **800 Paid records** remain exact: two dated **2026-10-24** and 798 dated **2026-10-26**. The old two-Paid checkpoint was not used. Staging under `C:/Users/ADMIN/.ldss/db-compat-1-20261028/stage` used actual dirty source, accepted SEC-3 manifests and its own installed dependencies. Private configuration, Git HEAD and retained distribution were not substituted. [Inspection](../../output/db-compat-1-20261028/inspection.json), [starting files](../../output/db-compat-1-20261028/files-before.json).

Before compatibility changes, encrypted BACKUP-1 captured **99,334,548 SQL / 22,629,908 encrypted bytes**, SHA-256 `ec011d4c5c124978c418808f52bd2d47ca8945a72669db754a3c520ca5e859d3`. Complete restoration on a newly owned 10.4 target verified all 150 table values/counts/checksums, journal, objects, executable views and constraint probes. The target/account were removed. Source-schema READ locks, bounds and key custody were retained; nothing was restored over primary. [Fresh recovery](../../output/db-compat-1-20261028/recovery.json).

## Genuine independent target environments

Two independently initialized 11.4.13 processes used loopback **3337 / 3338**, separate datadirs/configuration/credentials and task-owned files outside webroot. No database files/system tables were shared with XAMPP or LAN. No Windows service was installed. Initialization measured **2.644 / 2.865 seconds**.

The retained vendor ZIP was rehashed against the current official checksum: `d62986d433eeebfde218560b276103831604a61e929e87f1a17f5aebd80257e2`. A fresh large download failed and was not accepted. All 616 initially used vendor files match the independently extracted archive; application acceptance used the task's dedicated executable copy. Only that owned rehearsal process was restarted. Source PID 4636 owns 3306; CIM withheld its executable/command fields, so those are not claimed as read. SQL version/datadir and port ownership were verified. [Current checksum](../../output/db-compat-1-20261028/vendor-checksum-current.txt), [vendor/file proof](../../output/db-compat-1-20261028/vendor-verification.json), [initial parity](../../output/db-compat-1-20261028/initial-vendor-identity.json), [runtime ownership/settings](../../output/db-compat-1-20261028/database-runtime-proof.json).

Source and target retain REPEATABLE-READ, utf8mb4/general server collation, original schema collations, **50-second** InnoDB lock wait and **1 MiB** packet limit. Target server timezone is UTC; app connections use UTC. Source SYSTEM/Asia-Singapore and all Manila cutoff evidence remain unchanged. These portable processes do not certify service hardening.

## F54 and other generated expressions

A fresh target reproduced **1901**, plus **1105: expression depends on PAD_CHAR_TO_FULL_LENGTH**, for F54's `COALESCE(semester_id, sentinel)` stored/indexed column. 10.4 accepts it with warnings. Explicit CAST still fails. MariaDB requires mode-consistent generated values. [Vendor rules](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns), [reproduction](../../output/db-compat-1-20261028/expression-probes.json).

F54 was the first sorted-dump failure, not the only incompatibility. Seven generated columns were inventoried; five need explicit CHAR-padding treatment:

| Table / column | Isolated correction |
|---|---|
| `graduation_monitoring_cases.scope_key` | `COALESCE(RTRIM(semester_id), sentinel)` |
| `individual_payment_transactions.request_entitlement` | RTRIM the selected entitlement ID; preserve unclaimed/replacement conditions |
| `individual_payment_transactions.omission_request` | RTRIM the selected omission ID; preserve omitted/replacement conditions |
| `payroll_reconciliation_events.original_closure_batch` | RTRIM the selected batch ID; preserve closed-only routing |
| `requirement_checklists.context_key` | RTRIM semester/cycle inputs and the cycle input in its NULL condition; preserve S:/P: prefixes |

Widths, ascii_bin, stored/virtual kinds, NULL routing and every key/FK/CHECK remain. Both runtimes were tested with NULL, mixed-case UUIDs, empty/short values, leading/trailing spaces, tabs and PAD modes. F54 relational probes verify per-owner/year NULL uniqueness, distinct ASCII case, padding/duplicate rejection, sentinel CHECK and missing-parent rejection, plus a populated forward rewrite.

**Exact limitation:** for short non-UUID CHAR inputs under PAD mode, the old VARCHAR context key can contain mode-dependent padding; the correction strips it. Ordinary source-mode results, full UUID values and every stored current value match. Universal expression-byte equivalence under all SQL modes is not claimed. Actual source has 1,835 checklists and zero rows in the other three affected tables; fictional workflow/relational tests supply their positive coverage. [Inventory](../../output/db-compat-1-20261028/schema-compatibility-inventory.json), [five-expression probes](../../output/db-compat-1-20261028/all-expression-probes.json), [relational probes](../../output/db-compat-1-20261028/f54-relational-probes.json).

## History-preserving transfer and forward proposal

All **67 historical SQL files, checksums, journal values and applied timestamps are immutable and exact**. The proposed F58 is outside `db/migrations`; no F58 journal entry was inserted. Four ALTER statements have implicit commits. The 10.4 drill inspected an intentional interruption after the first committed ALTER, completed forward and reran exactly, preserving all data/other objects. The proposal also reran on an owned corrected 11.4 copy without an inventory difference. This is explicit recoverability, not multi-statement atomicity or a power-loss test. [Forward proof](../../output/db-compat-1-20261028/forward-proposal-proof.json), [target ALTER proof](../../output/db-compat-1-20261028/target-alter-proof.json).

The versioned transfer receives an authenticated BACKUP-1 payload, pins five declarations and changes only them plus the explicit expected generation expressions. INSERTs, journal records and constraints are untouched. It rejects primary ports, non-owned datadirs, altered SQL hashes/expressions/inventory/version, creates a new scoped target/account and removes failures. The real source-executed journal transfers with a separate target-construction manifest; no native execution of old incompatible DDL is claimed. [Negative guards](../../output/db-compat-1-20261028/adapter-negative-tests.json).

Complete transfer took **10.183 seconds**. All **150 original table values/counts/checksums** match, including raw JSON text, microsecond dates, identities, annual/academic/import/document/approval evidence, Masterlists, frozen rosters, deferrals, entitlements, allocations, 800 payments and all audit/command histories. Compared structural inventory differs only in the five declared expressions. Existing BACKUP-1 rebinding replaces source definers with the newly owned restore account and normalizes database qualification in view comparisons; literal definer/schema names therefore differ too. This is recorded restore metadata, not whole-dump byte identity. INSERTs and stored JSON are never normalized. All indexes, **33 triggers**, three executable views and other definitions match. Independent scans verified **381 foreign keys, 223 CHECK constraints and 273 unique indexes**, plus functional rejection probes. The 150 include both preserved synthetic ownership tables; new application fixtures have 148. [Complete transfer](../../output/db-compat-1-20261028/target-transfer.json), [constraints](../../output/db-compat-1-20261028/all-schema-constraints.json).

## Application and recovery-tool conditions

The unmodified SEC-3 app authenticates on 11.4 but its roster GET returns **500**. New JSON metadata makes mysql2 return objects where 10.4 supplied text; 31 default inventory checksums differed for this decoding reason. Raw-text comparison proves stored values exact. The isolated **jsonStrings: true** adapter restores the accepted contract and exact sources/results. It must become a separately reviewed app/operator connection change before promotion, rather than a global production preload. [Stock failure](../../output/db-compat-1-20261028/stock-app-target.json), [protocol documentation](https://mariadb.com/docs/server/reference/clientserver-protocol/mariadb-protocol-differences-with-mysql), [mysql2 option](https://sidorares.github.io/node-mysql2/docs/documentation).

A separate Windows-client probe proves that 11.4 `mariadb.exe --binary-mode` preserves CRLF in piped SQL where the accepted client removes CR; literal text/trigger bytes can differ. The native-client transfer was rejected, not normalized into acceptance. Verified rehearsals explicitly use the unchanged **10.4 dump/mysql clients against 11.4**, with the raw-JSON adapter. Native-client replacement and packaged BACKUP-1 connection behavior remain separate review items. No backup format, bound or verification was bypassed. [Newline proof](../../output/db-compat-1-20261028/client-line-ending-probe.json), [target raw-text checkpoint/recovery](../../output/db-compat-1-20261028/target-checkpoint-recovery.json).

## Application, financial and FLOW-3 acceptance

**18 integration groups passed on each runtime:** auth/RBAC, requirement verification, full 835-person PAY-NEW, Masterlist drafts/workflow/amendments, academic/approved changes, graduation monitoring, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports. These cover submission/processing, payment/correction restrictions, historical pins, source changes, denials, rollback and exact retry. Graduation monitoring passed 54 assertions per runtime. Additional six-group deferred recovery and five-choice cutoff tests passed on each. [Commands/results](../../output/db-compat-1-20261028/regressions-verified.json), [original safety](../../output/db-compat-1-20261028/safety-before-results.json), [target safety](../../output/db-compat-1-20261028/safety-after-results.json).

Fresh target test schemas bootstrap by actually executing all original migrations unchanged on a new owned 10.4 schema, transferring its real journal/seeds to the empty 11.4 target, verifying parity, then removing the bootstrap. Business tests run on 11.4. Direct native historical-DDL provisioning and partial-upgrade suites on 11.4 are not certified. Three wrapper children initially omitted the connector adapter and failed; the isolated child preload was corrected and those exact suites reran successfully. Failures remain recorded. Assertions, source pins and predicates were not weakened.

Eight new FLOW-3 copies used the same accepted app, fixture-only Node/connection SQL time and unchanged lock limits. Each pair returned **one 200 / one 409**, one frozen roster, exactly N allocations, zero duplicates, exact winning retry and controlled losing retry. The 25-person cases additionally test stale evidence/versions, role revocation and late audit/ledger rollback. Original payments/activations stay exact. Complete 834-person frozen/source JSON is byte-identical across runtimes.

| People | 10.4 request 1 / 2 | 11.4 request 1 / 2 | Result |
|---|---:|---:|---|
| 25 | 15.367 / 35.084 s | 12.518 / 25.204 s | one frozen / 25 allocations / zero duplicates |
| 200 | 22.122 / 41.963 s | 13.528 / 25.093 s | one frozen / 200 allocations / zero duplicates |
| 834 | 23.039 / 43.578 s | 18.125 / 29.850 s | one frozen / 834 allocations / zero duplicates |
| 835 | 21.548 / 42.297 s | 17.180 / 28.417 s | one frozen / 835 allocations / zero duplicates |

[Original matrix](../../output/db-compat-1-20261028/matrix-before-results.json), [target matrix](../../output/db-compat-1-20261028/matrix-after-results.json), [complete financial/source parity](../../output/db-compat-1-20261028/financial-parity.json). SQL counts, phases, lock waits, CPU and memory are retained. **Same-account auth remains an acceptance limitation:** Coordinator probes took **20.040 / 15.653 seconds**, both above the unchanged [15-second browser account timeout](../../src/auth-api.ts). Internal probes eventually returned 200; they do not include the browser abort. No lock optimization or timeout increase occurred. [Auth evidence](../../output/db-compat-1-20261028/same-account-auth-limitation.json).

## Performance and clean second-server round trip

One sequential comparison used identical business data, app/dependencies, requests and fixture time. Full roster DTO/whole-scope hash and HTML match byte-for-byte; Word parts match with only allowed core timestamp normalization. Database caches/defaults differ; these are local samples, not capacity/general improvement claims.

| Operation | 10.4 | 11.4 | SQL calls, original / target | Target bytes |
|---|---:|---:|---:|---:|
| 25-row roster | 11.589 s | 6.932 s | 2939 / 2939 | 106,517 |
| 834-person HTML | 10.307 s | 7.149 s | 2945 / 2945 | 4,757,830 |
| 834-person Word | 11.235 s | 7.940 s | 2941 / 2941 | 184,741 |
| Authentication | 0.003 s | 0.003 s | 4 / 4 | 224 |

Concurrent same-actor auth during HTML took **8.11 / 4.04 ms**, both 200. Observed sequence peak RSS was **837.4 / 901.8 MiB**, not a memory bound/improvement. Schema-ready startup measured **164.79 / 159.31 ms**, excluding service supervision. [Original](../../output/db-compat-1-20261028/measure-before.json), [target](../../output/db-compat-1-20261028/measure-after.json), [parity](../../output/db-compat-1-20261028/performance-parity.json).

After target acceptance, encrypted BACKUP-1 capture and complete restoration into clean **3338** passed all 150 raw-value inventories, exact target objects, original 67-row journal, views/constraints, both-role roster reads and strict Staff/Coordinator financial rejections. Capture was **99,335,459 SQL / 22,630,302 encrypted bytes**; capture/restore plus application checks took **41.929 seconds**. Existing **128 MiB SQL / 192 MiB decoded / 96 MiB archive / 100,000 rows per table / 120-second tool** limits and key custody remain. Conditional success does not approve a native-client package. [Second-environment round trip](../../output/db-compat-1-20261028/roundtrip.json).

## Exact files, checks and preservation

**Five additions**, this report and task-local evidence; zero existing workspace-file changes:

| Proposed/isolated file |
|---|
| [scripts/database-compat/f54-logical-transfer.mjs](../../scripts/database-compat/f54-logical-transfer.mjs) |
| [scripts/database-compat/mysql2-json-text.mjs](../../scripts/database-compat/mysql2-json-text.mjs) |
| [scripts/database-compat/test-bootstrap.mjs](../../scripts/database-compat/test-bootstrap.mjs) |
| [scripts/database-compat/README.md](../../scripts/database-compat/README.md) |
| [db/proposed-migrations/20261028010000_f58_generated_char_determinism.sql](../../db/proposed-migrations/20261028010000_f58_generated_char_determinism.sql) |

The files provide the five-expression transfer, isolated connector adapter, test-only bootstrap, scope/recovery instructions and uninstalled four-ALTER SQL proposal. All **1,398 protected existing inputs, 310 retained distribution files and 288 compiled business server files** remain exact, including all original migrations, financial writers/readers/renderers, permission maps, dependencies, flags, launchers and private configuration. Active SEC-3 files/environment hashes match. Its primary runtime was not promoted/restarted. The bootstrap shim exists only in staging. [Source preservation](../../output/db-compat-1-20261028/source-preservation.json), [hashes](../../output/db-compat-1-20261028/candidate-files.json), [active runtime](../../output/db-compat-1-20261028/active-runtime-integrity.json).

Final lint, typecheck, build, **949 unit tests** and secrets checks exit 0 on matching staging. No existing test was changed. No UI change was made; no new visual/AT acceptance is claimed. [Normal checks](../../output/db-compat-1-20261028/checks-main.json), [unit log](../../output/db-compat-1-20261028/unit-final.log).

Final comparison preserves all primary business values/counts, schema/journal/grants, account/password/role data and complete original audit/financial histories. **All 20,304 original audits remain exact. A separate account recorded one login and one logout at 02:22:12.083 / 02:22:49.570 Philippine time on 28 October; both were preserved. Final audits are 20,306, sessions 131 to 132. This task performed no primary login, export or business command.** [Qualified authentication activity](../../output/db-compat-1-20261028/intervening-auth.json). All 800 Paid rows/dates and PAY-003's deferral/Draft v4 remain exact. Task-auth/export mutations occurred only on owned copies. All 15,438 retained inputs, 20,094 shared-dependency/profile inputs, 76 paused LAN-R2A artifacts and 16 earlier ML-1 files match. Owned schemas/accounts were removed and both 11.4 processes stopped; original listener owners remain. Private stopped system datadirs are retained. This is not an exhaustive new operational-database inventory. [Primary preservation](../../output/db-compat-1-20261028/final-preservation.json), [retained comparison](../../output/db-compat-1-20261028/retained-final.json), [cleanup/ownership](../../output/db-compat-1-20261028/delivery.json).

[Five-file ZIP](../../output/db-compat-1-20261028/candidate-source.zip), [additive patch](../../output/db-compat-1-20261028/DB_COMPAT_1_ISOLATED_PROPOSAL.patch) and [exact apply-roundtrip proof](../../output/db-compat-1-20261028/artifacts.json) exclude credentials, keys and database records. They are not an installable primary/LAN release. Never restore an old snapshot over later legitimate records.

## Remaining limits, authorizations and next package

The isolated compatibility gate passes only with the declared schema/connector/client conditions. Stock app JSON decoding, a reviewed binary-safe supported client/backup package, truthful native fresh provisioning and recoverable forward-migration journaling remain promotion requirements. Same-account auth delay, actual crash/power loss, independent human migration review and approved maintenance/rollback remain open. Dedicated service identity/ACLs, unattended startup, TLS/network controls, off-host witnessed recovery, RPO/RTO, office concurrency and financial-policy/source acceptance are not certified. [Vendor 11.4.13 release](https://mariadb.com/docs/release-notes/community-server/11.4/11.4.13).

The smallest next package is a **separately authorized migration/operator readiness package**: review the five-expression proposal/transfer manifest; implement explicit raw-JSON connection options in app/recovery/provisioning; resolve native-client byte fidelity; define fresh-bootstrap and interrupted-DDL/journal handling; repeat full current-data recovery, financial/concurrency and roundtrip gates; then approve cutover/reconciliation/rollback. Only further explicit authorization may install a migration, upgrade primary MariaDB, change primary app/runtime configuration or provision an operational service. No old-journal rewrite, downgrade, history deletion or stale restoration is appropriate.

**Primary upgrade and live-finance/LAN readiness remain NO-GO.** The [paused LAN plan](../deployment/LAN_R2_RELEASE_PREPARATION_PLAN.md) still requires complete packaging, pilot/security review, actual-target recovery and named office acceptance. No LAN-R2A resumption or operational installation change occurred.

**Stopped after isolated compatibility implementation, verification, cleanup and reporting. No primary schema/app/runtime/dependency change, payroll/payment action, cutoff amendment or operational LAN change occurred.**
