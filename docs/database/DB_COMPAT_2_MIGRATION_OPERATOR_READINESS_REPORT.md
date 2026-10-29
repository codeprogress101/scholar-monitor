# DB-COMPAT-2 - MariaDB migration and operator readiness

28 October 2026, Philippine time. **Isolated implementation and recovery rehearsals completed. Primary remains MariaDB 10.4.32 / 150 tables / 67 migrations on its unchanged SEC-3 runtime. No primary schema, application, dependency, configuration, process or financial record changed. Upgrade remains NO-GO.**

The package resolves the explicit JSON-text and Windows transport conditions and supplies guarded forward recovery and truthful fresh provisioning. **Financial acceptance is incomplete: the target's 835-person concurrent prior-approval test repeatedly returns HTTP 500 / ER_LOCK_WAIT_TIMEOUT. The separate FLOW-3 finalization matrix passes.** No financial writer or timeout was changed to force acceptance. LAN-R2A remains paused.

Context: [DB-COMPAT-1](DB_COMPAT_1_MARIADB_11_4_RECOVERY_REPORT.md), [SEC-3](../security/SEC_3_LOCKFILE_INTEGRITY_AND_ACTIVATION_REPORT.md), [SEC-1](../security/SEC_1_DEPENDENCY_AND_MARIADB_READINESS_REPORT.md), [FLOW-3](../acceptance/FLOW_3_PAYROLL_FINALIZATION_RELIABILITY_REPORT.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md) and the [paused LAN plan](../deployment/LAN_R2_RELEASE_PREPARATION_PLAN.md). Technical acceptance does not establish office financial authority.

## Primary baseline and encrypted checkpoint

| Fresh primary fact | Starting and final |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 / 10.4.32 |
| Database / runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Active release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028` |
| Controller / API / Vite | 65812 / 62376 / 31768; 3001/5173, no restart |
| Schema / journal | 150 tables / 67 original migrations, F57 included, exact |
| Official Batch 1 | Published v415 / 835 active members / 167 retained removals |
| PAY-001 / PAY-002 | Processed v805 / 800 Paid; processed v5 / 200 Pending |
| PAY-003 | Draft v4 / 834 proposed entries / one deferred; no frozen roster/allocation/payment |
| Existing windows / deadline | 21 / 23 / 27 October whole-day cutoffs; 31 October revision 3, unchanged |
| Existing F57 rule | Synthetic UAT rule unchanged; no office policy inserted |

Staging under `C:/Users/ADMIN/.ldss/db-compat-2-20261028/stage` used the actual dirty source and exact accepted SEC-3 manifests, with its own dependencies. Git HEAD, old builds and private configuration were not substituted. All **1,404 protected existing root files / 310 retained distribution files** remain exact. [Inspection](../../output/db-compat-2-20261028/inspection.json), [preflight](../../output/db-compat-2-20261028/preflight.json), [starting hashes](../../output/db-compat-2-20261028/files-before.json).

Before experiments, installed BACKUP-1 captured **99,335,300 SQL / 22,630,406 encrypted bytes**, SHA-256 `8517e627f6f9d8b9afbe9eb8b664f81b95cf6108ce4c5c616b7347a77b8c220f`. Complete restoration into a newly owned 10.4 target took **11.251 seconds** and verified all 150 values/counts/checksums, exact journal, schema objects, executable views and rejection probes. Target/account were removed. Source-schema READ locks briefly serialize writes; no global lock, capacity increase, key rotation or primary stop occurred. Nothing was restored over primary. Archives/keys remain restricted. [Recovery](../../output/db-compat-2-20261028/recovery.json).

## Five expressions and the proposed F58

All **67 historical SQL files and original journal rows/timestamps remain immutable**. The unchanged proposed F58 stays outside `db/migrations`, SHA-256 `40ddbc2e89e512e78d59dafa26779bb1c4cdcfaaa4168819d4811eb7f48d7a95`. Its four ALTERs change only these five generated expressions:

| Column | Treatment |
|---|---|
| `graduation_monitoring_cases.scope_key` | RTRIM semester before COALESCE; retain sentinel/NULL routing |
| `individual_payment_transactions.request_entitlement` | RTRIM selected entitlement; preserve unclaimed/replacement predicates |
| `individual_payment_transactions.omission_request` | RTRIM selected omission; preserve omitted/replacement predicates |
| `payroll_reconciliation_events.original_closure_batch` | RTRIM closed-only batch input |
| `requirement_checklists.context_key` | RTRIM semester/cycle and the cycle NULL condition; retain S:/P: routing |

Both engines independently tested NULL/full/short CHAR, case, leading/trailing spaces, tabs and PAD modes: **32 samples per expression/runtime**. Original expressions are rejected on 11.4; corrected ones are accepted. Relational probes retain uniqueness, ASCII-case distinction, sentinel CHECK and FK rejection. All **1,835 original checklists** retain complete values. The other currently affected business tables are empty; fictional workflows/relational fixtures supply positive coverage.

**Semantic exception:** short non-UUID CHAR inputs under PAD mode can yield padded old VARCHAR context keys; the correction strips that padding. Universal byte equivalence under every mode is not claimed. Normal source mode, full UUIDs and every current stored value match. Strict-mode probes reject over-width/non-ASCII input; original permissive mode can truncate over-width input with warning 1265. CHAR is not a UUID validator. Existing API/FK/CHECK guards were not broadened. [Expression matrix](../../output/db-compat-2-20261028/all-expression-probes.json), [relational proof](../../output/db-compat-2-20261028/f54-relational-probes.json), [malformed boundaries](../../output/db-compat-2-20261028/malformed-char-boundaries.json), [proposed SQL](../../output/db-compat-2-20261028/candidate-source/db/proposed-migrations/20261028010000_f58_generated_char_determinism.sql).

## Forward execution, journal and interrupted recovery

The runner pins F58's exact digest and all 67 repository migration hashes, verifies the historical journal/full baseline, and uses the existing schema-migration advisory lock. It admits owned disposable schemas and explicitly rejects primary. The private operator plan binds restore/archive/baseline hashes, runtime and datadir. A fsynced append-only hash chain records intent, observed prefix and verification. Independently anchor that chain; it is not a signature against a malicious local administrator.

**Six full-data interruption scenarios passed**, repeated after refinement: before first ALTER, after each of four ALTERs, and final verification. The final verification probe adds an unreviewed index on its owned copy: comparison rejects it with no F58 success row. Only that injected index is removed before explicit recovery. Fresh connections observe committed prefixes; recovery completes only the reviewed suffix. Every original value/constraint/history row survives, and F58 is inserted once only after complete verification. Completed rerun is a verified no-op. Wrong schema/runtime/baseline, log tampering and an actually altered historical checksum are refused; the checksum probe rolls back. Completed-state inspection also passes on 11.4.

This is controlled interruption recovery, **not transaction-wide multi-ALTER atomicity or physical power-loss proof**. No fabricated success row or original journal rewrite occurred. New F58 records describe actual execution on owned 10.4 construction/restores; transfer preserves that truthful history. [Final interruption proof](../../output/db-compat-2-20261028/forward-recovery-final.json), [operator tests](../../output/db-compat-2-20261028/operator-acceptance.json), [final checksum/forward guards](../../output/db-compat-2-20261028/final-forward-guards.json), [11.4 no-op](../../output/db-compat-2-20261028/target-forward-noop.json).

## Explicit JSON and Windows byte contract

`jsonStrings:true` is explicit in application, operator/recovery, provisioning and fixture factories. **No operational preload, prototype mutation or global mysql2 patch is used.** Raw JSON is not reserialized to make fingerprints agree. Both engines test nested JSON, distinct JSON/SQL NULL, large numeric JSON text, DECIMAL strings, UTF-8, microsecond dates and malformed JSON. Complete 150-table raw-value comparisons preserve approval/source hashes and financial evidence. Staged readiness accepts the exact original 67-row manifest with only the exact optional single F58 row; unknown/duplicate/changed entries reject.

The selected Windows pair is **11.4.13 `mariadb-dump.exe --result-file` plus `mariadb.exe --binary-mode --local-infile=0`**, through binary Node pipes. Result-file prevents stdout newline expansion; it does not normalize stored evidence. Both engines preserve LF, CRLF, literal CR, UTF-8, escaped SQL/JSON, BLOB bytes, a 200 KB value/large INSERT, exact amounts/microseconds, LF/CRLF trigger bodies and executable views. Full current-data recovery covers the real larger statements. Actual executable paths, versions and hashes are recorded. [Native matrix](../../output/db-compat-2-20261028/binary-json-contract.json), [vendor identity](../../output/db-compat-2-20261028/vendor-verification.json). Vendor references: [Windows result-file behavior](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump), [mysql2 JSON strings](https://sidorares.github.io/node-mysql2/docs/documentation).

New authenticated version-1 envelopes add `sqlTransport: binary-result-file/v1`. Restoration requires the reviewed native tool through context or `LDSS_BINARY_MYSQL_TOOL`; absent/old tools reject before target creation. Old untagged CRLF archives retain their established old-client recovery route into an isolated target, followed by a new binary capture. **These clients/archive paths are not interchangeable.** No SQL/data newline replacement is performed.

The staged tool temporarily writes raw SQL only in restricted user-profile `.ldss-backup-scratch`, outside webroot, with Windows inheritance removed and operator/SYSTEM access. Successful/failed files are removed; final scratch is empty. Crash leftovers require custodian quarantine/cleanup; secure erasure is not claimed. Preflight reserves 128 MiB disk space. AES-GCM/key custody, source authentication and **128 MiB SQL / 192 MiB envelope / 96 MiB archive / 100,000 rows / 120-second tool** limits remain. Private plaintext scratch is a material operator/custody review item, not installed primary BACKUP-1 behavior.

Initial capacity testing caught partial scratch cleanup; it was fixed. New binary dumps with the old import client then failed trigger parity. Transport binding and explicit native configuration resolved that mismatch; affected suites reran successfully. An interrupted import observed a real partial catalog, recorded no success, removed only its owned target/account and requires a complete restore into a new target. [Interrupted transfer](../../output/db-compat-2-20261028/interrupted-transfer.json). Malformed UTF-8 and authenticated unknown/old-client transport probes reject before accepting a backup or creating a restore target: [negative transport tests](../../output/db-compat-2-20261028/transport-negative.json).

## Runtimes, fresh provisioning, transfer and second restore

Two independent 11.4.13 processes used new executables/datadirs/configuration/credentials and loopback **3337 / 3338**, outside webroot. The retained official ZIP SHA-256 `d62986d433eeebfde218560b276103831604a61e929e87f1a17f5aebd80257e2` was rehashed and freshly extracted; **616 vendor files** match. No XAMPP/system tables were reused and no Windows service was installed/replaced. Source 3306 remains PID 4636; CIM withheld its executable/command, so no source executable hash is claimed. [Ownership/settings](../../output/db-compat-2-20261028/database-runtime-proof.json).

Both preserve accepted SQL mode, isolation/schema collations, **50-second** lock wait and **1 MiB** packet limit. Target server time is UTC; app connections use UTC. Source timezone and Manila evidence are unchanged. Configured buffer pools are **16 MiB / 128 MiB**; caches and source co-tenancy differ; samples are not general speedup/capacity certification.

Fresh provisioning uses a guarded compatibility bootstrap: actually execute all 67 unchanged historical migrations on an owned empty 10.4 construction schema, execute/verify F58, transfer its real catalog/seeds/journal to empty 11.4, verify and remove construction. **This is not native execution of all incompatible historical DDLs on 11.4.** It requires a controlled 10.4 construction runtime; removing that dependency needs a reviewed native baseline. Partial historic-migration options refuse rather than invent success.

Fresh source/target each have **148 application tables / 68 truthful journal rows / zero scholars, users, imports, Masterlists, payrolls or payments**. Primary's two technical ownership tables explain its legacy 150 count and are preserved there. Original fresh construction plus F58 took **59.718 s**; target bootstrap/transfer **78.848 s**. These are different models, not equal native-DDL workloads. [Fresh provisioning](../../output/db-compat-2-20261028/fresh-provision.json).

Legacy migration restored the fresh 10.4 checkpoint, actually executed F58, then restored with native tools to 11.4 in **9.677 s**. All **150 original table values / 67 original journal rows and timestamps** match, plus genuine F58. Expected catalog changes are the five expressions; established definer rebinding/view qualification still apply, so literal definer/schema names are not claimed identical. All **381 FKs / 223 CHECKs / 273 unique indexes / 33 triggers / three executable views** pass inventory, complete scans and rejection probes. [Transfer](../../output/db-compat-2-20261028/target-transfer.json), [constraints](../../output/db-compat-2-20261028/all-schema-constraints.json). Both target catalogs also verify that every FK references its own schema and all trigger/view definers are the scoped restore account: [reference scope](../../output/db-compat-2-20261028/schema-reference-scope.json).

A native encrypted target backup restored completely into independently initialized 3338: **99,439,082 SQL / 22,633,551 encrypted bytes**. Capture/restore plus both-role application checks took **41.138 s**, not pure import time. All 150 tables, 68-row history and target objects match. Both roles read 834 included; Staff finalization rejects 403 and Coordinator stale finalization 409. Mutations/authentication were confined to copies. [Second-server restoration](../../output/db-compat-2-20261028/roundtrip.json).

## Application, financial, concurrency and performance acceptance

Final staged lint/typecheck/build, **138 files / 954 unit tests** and secrets exit 0. Accepted SEC-3 manifests/lock remain exact; own install/tree and production/full audits exit 0 with zero dated known-advisory findings. Shared dependencies were not replaced. [Commands](../../output/db-compat-2-20261028/checks-main.json), [unit log](../../output/db-compat-2-20261028/unit-final.log), [security](../../output/db-compat-2-20261028/security.json).

The 18 groups cover auth/RBAC, requirements, PAY-NEW, Masterlist drafts/workflow/amendments, academics/approved changes, graduation, notifications, Registry/Treasury, import/receiving, historical/omitted, Recording, reconciliation, individual settlement and financial reports. **Original: 18/18 pass. Target: 17/18 pass.** Deferred/unclaimed/omitted recovery, OR/DV, corrections, financial pins, HTML/Word/XLSX/PDF and timing/physical-receipt uncertainty retain existing assertions. Additional deferred and cutoff drills pass on both copies. No actual payment authority or receipt time is inferred. [All commands/results and initial attempts](../../output/db-compat-2-20261028/regressions-verified.json), [source safety](../../output/db-compat-2-20261028/safety-before-results.json), [target safety](../../output/db-compat-2-20261028/safety-after-results.json).

**Open failure:** three fresh 835-person target PAY-NEW attempts fail the unchanged concurrent prior-approval assertion expecting two successful same-key responses. At least one is HTTP 500; diagnostics capture `ER_LOCK_WAIT_TIMEOUT`. The last run had no competing database rehearsal; this is not dismissed as host contention. The precise failed SQL statement/per-request durable outcome was not separately retained before disposable teardown. No JSON decoding error is established. That suite stops before its later ordered publication/source/window assertions; those unexecuted parts are not counted as passed. No raised timeout, serial replacement race or financial writer change was used. **Full 11.4 application/financial compatibility is not established.** [Initial attempt log](../../output/db-compat-2-20261028/regressions-target-graduation-pay-new-masterlist-drafts-masterlist-workflow-masterlist-amendments-academic-academic-changes-notifications-registry-intake-import-historical-recording-reconciliation-individual-settlement-financial-reports-1793128189789/pay-new.log), [final diagnostic index](../../output/db-compat-2-20261028/regressions-target-pay-new-latest.json), [unshared rerun collector](../../output/db-compat-2-20261028/target-paynew-idle.log).

Native historical partial-upgrade execution on 11.4 is not certified; vendor-incompatible old DDL and partial bootstrap options remain unsupported. Initial unit, tool/configuration and helper failures/reruns are retained. The [execution census](../../output/db-compat-2-20261028/failures-reruns.json) lists all 44 integration command executions, including 9 failed attempts: three source recovery/client mismatches, three target missing-tool refusals, and three target 835-person prior-approval failures. Expected negative refusals are not counted as failed test commands. Malformed-binding probes initially expected a parser error; actual 1210 corrected that helper. A copied deferred harness needed its actual owned port. No financial assertion/source pin was weakened. No UI source changed; new browser visual/AT acceptance is not claimed.

**Separate FLOW-3 matrix: all eight races pass**, one 200 / one 409, stable winning retry, controlled loser, N allocations, one frozen roster, zero new payments. The 25-person negatives retain stale evidence/version, queued role revocation and late audit/ledger rollback. Complete 834-person frozen and reviewed-source JSON are byte-identical across engines.

| People | 10.4 winner / competitor | 11.4 winner / competitor | Allocations / frozen / duplicate payments |
|---|---:|---:|---:|
| 25 | 14.298 / 34.197 s | 12.303 / 24.094 s | 25 / 1 / 0 |
| 200 | 22.350 / 35.164 s | 12.811 / 23.871 s | 200 / 1 / 0 |
| 834 | 21.484 / 40.958 s | 19.022 / 29.957 s | 834 / 1 / 0 |
| 835 | 22.163 / 41.345 s | 17.152 / 28.227 s | 835 / 1 / 0 |

[Source matrix](../../output/db-compat-2-20261028/matrix-before-results.json), [target matrix](../../output/db-compat-2-20261028/matrix-after-results.json), [complete financial/source parity](../../output/db-compat-2-20261028/financial-parity.json). **Same-account auth delay remains open:** measured Coordinator probes took **20.656 / 15.618 seconds**, both above the unchanged 15-second browser limit. Eventual internal 200 does not prove the browser avoids its unchanged 15-second abort. No auth/guard/timeout correction occurred. [Actual auth probes](../../output/db-compat-2-20261028/same-account-auth-limitation.json).

| Read on matched owned copies | API 10.4 / 11.4 | SQL calls | SQL elapsed 10.4 / 11.4 | Bytes |
|---|---:|---:|---:|---:|
| authentication | 0.003 / 0.003 s | 4 / 4 | 0.002 / 0.002 s | 224 / 224 |
| roster | 11.283 / 6.694 s | 2939 / 2939 | 6.821 / 2.191 s | 106,517 / 106,517 |
| html-preview | 9.570 / 6.411 s | 2945 / 2945 | 5.282 / 2.042 s | 4,757,830 / 4,757,830 |
| word-preview | 10.528 / 7.384 s | 2941 / 2941 | 5.125 / 2.030 s | 184,741 / 184,741 |

Roster DTO and whole-scope hash agree; all 1,835 sources are assessed and 25 returned. HTML is byte-identical; Word parts match with allowed core timestamp normalization. Observed read-sequence peak RSS was 962.4 / 941.8 MiB; these are not paired memory guarantees. Full SQL/CPU/RSS/phase/probe/resource observations are retained. Cache/defaults, process histories and shared-source workloads differ. Internal Fastify requests exclude browser/network latency. These are not cold-start/load/concurrency/memory bounds. [Read parity](../../output/db-compat-2-20261028/performance-parity.json), [source metrics](../../output/db-compat-2-20261028/measure-before.json), [target metrics](../../output/db-compat-2-20261028/measure-after.json), [DB resources](../../output/db-compat-2-20261028/resources-final.json).

## Operator, fallback and exact package

The [runbook](../../output/db-compat-2-20261028/candidate-source/docs/database/DB_COMPAT_2_OPERATOR_RUNBOOK.md) covers ownership/preflight, source/checkpoint pinning, version selection, guarded execution, partial-DDL inspection/resume, JSON/client configuration, reconciliation, interrupted import, cutover and failure handling. Its reviewed private-plan CLI deliberately rejects primary.

Future cutover requires separate authority for the actual service/OS identity, complete matching app/operator package, least-privilege accounts, quiescence/maintenance owner, then-current verified backup, independent reconciliation, witnessed/off-host recovery and explicit go/no-go. Original SEC-3 is not an accepted 11.4 fallback because of JSON; it also expects 67 journal rows. Retain a tested 68-compatible app, including for 10.4. Never downgrade F58/rewrite history or restore this stale checkpoint over later legitimate financial activity. Recovery uses a new target and authorized reconciliation before switching.

**70 staged package files: 65 existing changes / five additions; zero existing root/primary changes.**

| Files | Staged scope |
|---|---|
| `server/database.ts`, `schema-readiness.ts` | Explicit JSON pool; exact optional F58 readiness |
| `scripts/backup-lib.mjs` | JSON connections, private bounded binary dump and authenticated native-client binding |
| `scripts/migration-lib.mjs` | JSON option, guarded test bootstrap and exact known F58 journal acceptance |
| 60 other existing connection/tool/fixture scripts | Explicit JSON text option; no business predicates/assertions changed |
| New `database-compat/f58-forward.mjs`, `provision.mjs`, `operator.mjs` | Forward recovery/guards, truthful bootstrap and isolated operator entry |
| Existing `backup-capacity.test.ts`; new `database-forward-contract.test.ts` | Preserve archive-failure checks, add raw failure coverage/disk fixture and forward readiness boundaries |
| New operator runbook | Cutover/recovery limits and byte-exact review procedure |

Unchanged F58 SQL/expression manifest are two support inputs. The old DB-COMPAT-1 preload is historical evidence, not an operational dependency. [Authoritative file hashes](../../output/db-compat-2-20261028/candidate-files.json), [readable diff](../../output/db-compat-2-20261028/DB_COMPAT_2_REVIEW.diff), [binary-safe patch](../../output/db-compat-2-20261028/DB_COMPAT_2_ISOLATED_CANDIDATE.patch), [source ZIP](../../output/db-compat-2-20261028/candidate-source.zip), [independent exact-byte apply](../../output/db-compat-2-20261028/artifacts.json). Archives exclude credentials, keys and records. An initial text round trip exposed Git newline conversion; final proof disables conversion in an owned clone and preserves actual mixed endings. This incremental package is not a complete primary/LAN release.

All frontend source remains exact. **286 of 288 compiled server files** match SEC-3; only database/readiness differ in staging. Financial writers, permissions, renderers, 67 historical migrations, primary flags/launcher/configuration and dependencies remain untouched. [Source boundary](../../output/db-compat-2-20261028/source-preservation.json).

## Final preservation and release gates

Complete comparison preserves every primary business value/count, schema object, historical migration timestamp, account/password/role, runtime grant and command ledger. Coverage includes 1,835 scholars, 14 application accounts, 1,835 annual/intake/academic records, three Masterlists, 2,002 stored Masterlist entries, 1,835 activations, 1,000 original entitlements/allocations, imports/documents/approvals, frozen payrolls and reconciliation. All **800 Paid rows** remain exact: **two dated 2026-10-24 / 798 dated 2026-10-26**. All **20,306 original audits** match at full precision; final audits **20,306**, sessions **132 to 132**. No task primary login, export or business command occurred. Disposable schemas/accounts and source READ locks are not zero database-server writes/activity. [Full primary comparison](../../output/db-compat-2-20261028/final-preservation.json).

The **21,394 immutable SEC-3 runtime files/actual environment hash, 15,438 retained inputs, 20,094 shared dependency/profile inputs, 76 paused LAN artifacts and 16 earlier ML-1 files** remain exact. Primary/retained listener owners/ancestry are unchanged. Recorded owned schemas/accounts were removed, both 11.4 servers stopped, 3337/3338 quiet and raw scratch empty. Private stopped system datadirs remain; secure erasure/exhaustive operational database inventory are not claimed. [Active runtime](../../output/db-compat-2-20261028/active-runtime-integrity.json), [retained comparison](../../output/db-compat-2-20261028/retained-final.json), [cleanup](../../output/db-compat-2-20261028/cleanup.json), [delivery](../../output/db-compat-2-20261028/delivery.json).

| Separate gate | Disposition |
|---|---|
| 1. Expressions / forward recovery | Pass for current valid sources; PAD exception and controlled-interruption limits documented |
| 2. Explicit JSON | Pass on tested raw values/source/output contracts; staged only |
| 3. Windows native byte fidelity | Pass with result-file/native pair and explicit transport; old archives retain distinct recovery |
| 4. Current legacy transfer/recovery | Pass: 150 original tables, genuine 68-row target history |
| 5. Fresh provisioning | Pass only via 10.4 construction/bootstrap; native historical-DDL independence not certified |
| 6. Financial/concurrency | **NOT PASSED**: 835-person prior approval timeout; FLOW-3 passes, same-account auth delay open |
| 7. Operator/cutover/failure | Isolated controls tested/runbook supplied; human, off-host, service and power-loss acceptance pending |
| 8. Primary upgrade | **Not authorized / NO-GO** |
| 9. Operational LAN upgrade | **Not authorized / NO-GO**, LAN-R2A paused |
| 10. Live financial authority | **Not granted**; existing source/forms/policy gates remain |

Next separately authorized work: diagnose/correct the target 835-person prior-approval workload and existing same-account wait with original concurrency assertions, source freshness, atomic audit and exact retry intact; repeat full ordered target acceptance under controlled/competing load. Do not raise timeouts or silently serialize the race. Only then consider a separately approved complete matching app/schema/service cutover rehearsal and operator/custody review. Office/LAN/live finance remain separate.

**Stopped after isolated implementation, testing, cleanup and reporting. No primary F58, MariaDB upgrade, app/runtime activation, financial/cutoff change, LAN-R2A resumption or operational LAN modification occurred.**
