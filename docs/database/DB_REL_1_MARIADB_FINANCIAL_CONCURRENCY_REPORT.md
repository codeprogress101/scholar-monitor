# DB-REL-1 - MariaDB financial concurrency and authentication reliability

28 October 2026, Philippine time. **The 835-person concurrent prior-approval failure is reproduced and corrected in isolated staging. Authentication reliability remains OPEN: the same Coordinator's account read still exceeds the unchanged 15-second browser timeout during financial finalization. No primary application, schema, dependency, configuration or business record was changed. Primary upgrade/promotion remains NO-GO.** LAN-R2A remains paused.

This follows [DB-COMPAT-2](DB_COMPAT_2_MIGRATION_OPERATOR_READINESS_REPORT.md), [DB-COMPAT-1](DB_COMPAT_1_MARIADB_11_4_RECOVERY_REPORT.md), [SEC-3](../security/SEC_3_LOCKFILE_INTEGRITY_AND_ACTIVATION_REPORT.md), [FLOW-3](../acceptance/FLOW_3_PAYROLL_FINALIZATION_RELIABILITY_REPORT.md), [FLOW-2](../acceptance/FLOW_2_FINAL_OFFICE_UAT_REPORT.md) and [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). This report separates the verified approval improvement from the authorization-contract boundary that prevents declaring the whole task resolved.

## Current primary and encrypted recovery

| Fresh primary fact | Starting and final |
|---|---|
| Host / database | DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB **10.4.32** |
| Schema / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Active release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028` |
| Controller / API / Vite | **65812 / 62376 / 31768**, unchanged; no restart |
| Tables / journal | **150 / 67**, F57 present; F58 absent; original SQL hashes and timestamps exact |
| Official Batch 1 | Published v415 / **835 active members**, 167 retained removals |
| PAY-001 | Processed v805 / **800 Paid**, original two 24 October and 798 26 October dates |
| PAY-002 | Processed v5 / **200 Pending** |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 financial state | 834 proposed entries; no frozen roster, allocation or payment |
| Existing cutoffs / final deadline | 21 / 23 / **27 October whole-day** windows; **31 October revision 3**, unchanged |
| Timed rule | Original synthetic-only F57 five-choice rule, unchanged; no new office policy |

An independent current projection used the **unchanged active SEC-3 compiled reader**, its existing authorization and consistent READ ONLY adapter. It returned the actual 25-row included page and complete 1,835-person assessment counts above. The October 27 cutoff is now reached; that clock-dependent observation does not transition the Draft automatically. No primary login, export or business command was used. [Inspection](../../output/db-rel-1-20261028/inspection.json), [current projection](../../output/db-rel-1-20261028/current-state.json).

Before experiments, installed BACKUP-1 captured **99,335,300 SQL bytes / 22,630,406 encrypted bytes**, archive SHA-256 **`bae1008e922a5906552da8a12c9f216643bcb484b510d12cfe113184a1cfa6f4`**. Complete restoration into a newly owned isolated schema passed all 150 table values/counts/checksums, journal, structural inventory, executable views and constraint rejection probes; target/account were removed. This initial recovery used the established 10.4 restore tooling. Nothing was restored over primary. Schema READ locks, encryption/key custody and finite BACKUP-1 limits remain unchanged. [Recovery proof](../../output/db-rel-1-20261028/recovery.json).

## Isolated source and database conditions

The actual dirty workspace supplied staging under `C:/Users/ADMIN/.ldss/db-rel-1-20261028/`. Verified DB-COMPAT-2 candidate files were then overlaid, with the exact SEC-3 package/lock and a fresh private dependency installation. Git HEAD, old primary checkpoints and shared `node_modules` were not substituted. A saved comparison stage retains the unoptimized reader.

Independently initialized **10.4.32 on 3338** and **11.4.13 on 3337** used separate task-owned binaries, datadirs, credentials and loopback processes. No Windows service or shared system datadir was used. Both retain REPEATABLE READ, **50-second InnoDB lock wait / 1 MiB packet limit / 128 MiB buffer pool**. Primary retains its existing **16 MiB** pool. No global clock, timeout, packet or primary setting changed. The comparison is between owned instances; primary's differing buffer pool is not concealed in a performance claim.

The five corrected expressions and truthful F58 history, explicit JSON-as-text connections and binary-result-file/native-client transport remain the accepted DB-COMPAT-2 design. A fresh full-data owned 10.4 restore underwent the real F58 forward procedure, verified recovery/no-op and native transfer to 11.4: **150 tables / 68 journal rows**, with all original data and 67 historical rows retained. No historical SQL was rewritten. Fresh target fixtures execute historical construction on the owned 10.4 instance before verified native transfer; they do not claim native execution of incompatible historical DDL on 11.4.

The native vendor copy and retained ZIP were rehashed. The existing generated-column/PAD-mode limitations, read bounds and encrypted transport limits are not broadened. No accepted schema, connector or SQL transport implementation changed in DB-REL-1; the conditional repeat of every DB-COMPAT-2 transport/interruption case was therefore not triggered. Full fresh recovery/transfer and raw source parity were nevertheless repeated. [Transfer](../../output/db-rel-1-20261028/target-transfer.json), [forward recovery](../../output/db-rel-1-20261028/forward-recovery.json), [vendor](../../output/db-rel-1-20261028/vendor-verification.json), [query/settings comparison](../../output/db-rel-1-20261028/query-plan-summary.json).

## Reproduced prior-approval failure

The original simultaneous **same actor / same key / same body** request pair was preserved. On quiet 11.4 rehearsal, bounded SQL traces and InnoDB lock samples establish:

- Winning request: **200 / 61,828.8 ms**; one approval, 835 member snapshots and one actor/key ledger result committed.
- Contender: **500 / approximately 50,024.9 ms**. Its exact failed SQL is `SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE`, with **ER_LOCK_WAIT_TIMEOUT**, driver-observed wait **50,001.0 ms**.
- Lock samples link waiting transaction **963 / connection 11** to holding transaction **962 / connection 9**, on `configuration_guard`'s PRIMARY record **1**, exclusive record locks. The observed wait graph has no cycle.
- The winner acquired the guard promptly and held it about **61,812 ms**. It spent approximately **39,772 ms** in assessment before approval writes and **22,040 ms** in the later phase.
- Repeating the original body/key after both responses returned **200 with the original durable result**. The failed contender did not imply that the shared command key had no committed outcome.

The authoritative wrapper explicitly rolls back its failed transaction. The winner committed independently. Both HTTP requests shared **one** original command key; this is not evidence of two approvals or two independent durable command outcomes. Actor, key, canonical payload digest, exact SQL bindings/fingerprints, transaction samples, original responses and saved sources remain restricted. [Public reproduction](../../output/db-rel-1-20261028/prior-before-target.json), [restricted trace](../../output/db-rel-1-20261028/private/before-target-835.jsonl), [restricted lock samples](../../output/db-rel-1-20261028/private/before-target-locks.jsonl).

An unmodified 10.4 control returned **200/200**, with a roughly **36,373 ms** guard wait. The captured failure is an excessive lock **hold** exhausting the existing wait, rather than a demonstrated broken ledger order, missing primary index or deadlock. MariaDB documents the diagnostic [lock-wait mapping](https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-innodb-tables/information-schema-innodb_lock_waits-table) and [timeout behavior](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-system-variables); application rollback and durable state were verified separately here.

## Small source-equivalent correction

**One staged application file changes:** `server/requirements/prior-approval-service.ts`.

`loadPriorBatch` obtains matching annual IDs in **at most 200-person chunks**, then reuses the existing `candidateReads` raw-source adapter for its assessment. It retains original predicates, ordering, per-owner limits, locking suffixes and live fallback for unsupported/missing keys. No scholar is declared eligible by a SQL shortcut. No source check, protection check, issue or hash component is omitted.

The local adapter is discarded before approval writes. **The complete `record` method is byte-identical**, including fresh authorization, configuration/user locks, ledger-first retry, source/version checks, individual fresh source checks, deadline checks, authority/review/document writes, audit and ledger transaction. Nothing moved outside that transaction. No timeout, business writer, command key, endpoint, permission or approval predicate changed.

On the same 835-person sources, the optimized preview deep-matches the saved original reader for every member, document decision, issue and source/scope hash. Independent restored-cohort trials on both engines also preserve all 835 raw saved member source hashes/snapshot columns byte for byte. Eight representative source-query plans and raw row comparisons were captured on equivalent copies without optimizer changes. Different plans/timings alone are not treated as proof of an engine defect. [Source parity](../../output/db-rel-1-20261028/source-parity-835.json), [writer proof](../../output/db-rel-1-20261028/writer-boundary.json), [complete concurrent evidence](../../output/db-rel-1-20261028/prior-concurrency-summary.json).

| 11.4 winning observation | Original | Revised |
|---|---:|---:|
| HTTP time | 61.83 s | 16.77 s |
| Guard hold | 61.81 s | 16.75 s |
| Assessment span | 39.77 s | 3.02 s |
| Driver SQL calls | 57,861 | 22,075 |
| Aggregate driver SQL elapsed | 47.96 s | 11.05 s |
| Concurrent same-key pair | 200 / 500 | 200 / 200 |

These are instrumented local samples from independent equivalent fictional cohorts. Caches, host work and allocation/GC state varied; synchronous bounded tracing has overhead. SQL elapsed includes client/driver handling, not database CPU. The unchanged write-phase timing varied too; no write optimization is claimed. Query-count reduction and exact output/source equality provide the stronger evidence.

The later 11.4 load repeat records **9.375 seconds of process CPU for its traced request pair** and **279.6 MiB sampled peak RSS**. The 835-person finalization two-request/probe sequences record **21.453 / 21.859 CPU seconds** and **952.3 / 900.1 MiB peak RSS** on 10.4 / 11.4. These scopes and preceding allocations differ; they are observations, not a paired memory improvement or worst-case bound. CPU and SQL wall time overlap and must not be added. Earlier approval process CPU counters include fixture construction and are explicitly labelled cumulative. Raw metrics remain available in the linked concurrency/financial evidence.

## Independent concurrent acceptance

| Trial / runtime | HTTP responses | Completion seconds (min / max) | Winner guard seconds | Winning SQL calls |
| --- | --- | --- | --- | --- |
| before-target-835 | 200 / 500 | 50.025 / 61.829 | 61.812 | 57,861 |
| before-original-835 | 200 / 200 | 36.399 / 36.401 | 36.379 | 57,861 |
| after-target-835 | 200 / 200 | 16.768 / 16.770 | 16.754 | 22,075 |
| repeat-target-quiet-1 | 200 / 200 | 16.007 / 16.008 | 15.991 | 22,075 |
| repeat-target-quiet-2 | 200 / 200 | 16.565 / 16.567 | 16.538 | 22,075 |
| repeat-original-quiet-1 | 200 / 200 | 20.061 / 20.062 | 20.008 | 22,075 |
| repeat-target-load-1 | 200 / 200 | 17.995 / 17.997 | 17.970 | 22,075 |
| repeat-original-load-1 | 200 / 200 | 16.256 / 16.257 | 16.230 | 22,075 |
| repeat-target-load-2 | 200 / 200 | 17.204 / 17.206 | 17.178 | 22,075 |

Opening reviews did not replace the concurrent Promise.all request assertion. The revised 11.4 tests include the first full scenario, **two independent quiet restores and two independent load restores**. The documented load repeats ran an indexed document/event aggregation loop with **747 / 723** completed competing reads, alongside the separate full workflow; the 10.4 load repeat completed **685**. Restores, actors and exact source data are independent per trial; no result cache persists across requests.

Every revised pair returns **200/200**, one approval, 835 members and one command result. Exact retries match; changed-payload reuse and a new-key stale source reject with 409; Staff, technical Administrator and unassigned accounts reject with 403. Small **25- and 200-person** original scenarios also pass on both engines. Late ledger fault injection at full 835 scope rolls back approval, members, review/document writes, audit and ledger; removal of the injected fault permits the **same original key/body** to commit once. Authentication's ordinary request touch is separated from business rollback evidence.

The original ordered scenario retains intake/COR verification, COG prior attestation, publication compatibility and adverse/source-change tests. The first deliberate audit rollback and subsequent same-key race assertions were not reduced to serial success. Planned audit/ledger failures and permission rejections remain expected negatives.

## Authentication boundary: still unresolved

The same-account wait is captured in the unchanged session validator's **user-row FOR UPDATE** path, shared with account disable/reset and guarded business authorization. Session expiry/revocation is then checked under its session-row lock. Passive `/auth/me` uses `touch=false` and makes no last-seen update, but still takes both locks. Permission reads additionally obtain a current user/role/permission snapshot. Removing only a lock would change how these reads serialize with account/security operations.

The real 835-person finalization probes return eventual 200 after **16,856.0 ms on 10.4 / 17,037.1 ms on 11.4**. Both exceed the existing browser limit. Unrelated Staff remains responsive in those samples. A separate Playwright/installed Chrome test executes the **unchanged actual `auth-api.ts` client**, compiled as a fixture test module, against an owned copy. During a controlled 20-second guard/user lock: Coordinator aborts at **15,001.1 ms with TimeoutError**, Staff returns 200 in **6.4 ms**, and the same Coordinator token returns 200 after release. Both fixture sessions subsequently log out with 204 and their saved cookies return 401; the copy's original business tables and 800 payments remain exact.

That controlled browser hold is not labelled an actual financial finalization. The real finalization waits are measured separately. There is no claim that a specific historical primary browser/token failure was recovered. No UI, account-client timeout, CSRF, cookie, expiry or permission code changed. All client build bytes are exact. Conditional responsive/native-zoom acceptance for changed authentication or visible feedback was not triggered; this task makes no new full-UI or accessibility certification claim. [Actual finalization auth probes](../../output/db-rel-1-20261028/same-account-auth-limitation.json), [browser client timeout](../../output/db-rel-1-20261028/browser-auth-timeout.json), [owned browser preservation](../../output/db-rel-1-20261028/auth-browser-preservation.json).

**Stopped portion:** the request states, "If independent safe authentication requires a new authorization/transaction contract, report that boundary and do not implement it without separate approval." A separately reviewed current-committed account/session/permission read contract is needed to provide independent passive reads while specifying revocation, disable/reset, expiry, CSRF and in-flight role-change ordering. Existing financial mutation reauthorization/locks must remain. This task does not assume that a snapshot or a larger timeout supplies that contract. No authentication correction is represented as delivered.

## Financial and source regression

Both engines pass all **18 integration groups**: graduation, authentication, RBAC, requirements, full PAY-NEW correction, Masterlist drafts/workflow/amendments, academic records/approved changes, notifications, Registry/main payroll/Treasury, intake/import/receiving, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports.

Separate full **835-person ordered financial runs** pass intake -> COR verification/prior COG attestation -> publication -> independent Draft -> review/return -> authorized post-cutoff finalization -> submission -> processing -> payment recording -> reconciliation/corrections -> HTML/Word/XLSX/PDF. Each retains original approvals and all 835 original payment rows. Final fictional outcomes are **826 Paid / nine Unclaimed**, total **PHP 4,175,000.00**, after the supported correction drill. These are fictional results, not primary payability or release authority.

Fixture time progression changes only Node Date and connection-local SQL timestamp, with fresh fictional sessions. The machine/database-global clock, primary receipts/deadlines and historical windows remain unchanged. Deferred recovery, omitted/unclaimed, individual OR/DV, financial-source pins, role denials, stale versions/sources, exact retry, rollback and original/current reconciliation remain enforced. [Both integration command sets](../../output/db-rel-1-20261028/regressions-verified.json), [full financial results](../../output/db-rel-1-20261028/full-workflow-summary.json), [additional safety](../../output/db-rel-1-20261028/safety-summary.json).

| Runtime | People | Winner seconds / 200 | Contender seconds / 409 | Allocations / frozen |
| --- | --- | --- | --- | --- |
| 10.4.32 | 25 | 14.92 | 29.30 | 25 / 1 |
| 10.4.32 | 200 | 14.12 | 26.75 | 200 / 1 |
| 10.4.32 | 834 | 18.47 | 31.35 | 834 / 1 |
| 10.4.32 | 835 | 18.38 | 31.21 | 835 / 1 |
| 11.4.13 | 25 | 12.95 | 25.32 | 25 / 1 |
| 11.4.13 | 200 | 13.35 | 25.54 | 200 / 1 |
| 11.4.13 | 834 | 19.03 | 30.94 | 834 / 1 |
| 11.4.13 | 835 | 18.54 | 29.90 | 835 / 1 |

All eight FLOW-3 pairs preserve one frozen roster, exactly N allocations, one winning 200, one authoritative 409, exact winning retry and a controlled losing retry. The 25-person negatives include Staff denial, source/version mismatch, queued role revocation, late audit/ledger failure and rollback. Original 800 payments and official activations remain exact. No new payment is produced by finalization.

The complete **834-person frozen JSON: 6,733,274 bytes / SHA-256 `da8f9f3b235564e6d255b7c0dfdacf26d6b95badd948fe19f0cb4196f9fb82da`**; reviewed sources: **7,293,559 bytes / `cb05b5384830e85669dd81dfc41a7451b7c908daca3f5058f6b6764d9e4538ba`**. Both match across engines and the accepted earlier evidence. The joined 834-person entitlement/allocation/event source projection also matches **4,226,355 bytes**; generated transaction UUIDs are verified through their actual relationships rather than falsely described as identical across independent transactions. No financial discrepancy was normalized away. Full fresh 835 fixtures have separate generated identities; their totals/invariants are compared, with exact identity/snapshot parity established separately on the identical restored cohort. [Full financial parity](../../output/db-rel-1-20261028/financial-parity.json).

## Gates, files and review artifacts

| Gate | Result |
|---|---|
| Lint / typecheck / build / secrets | All exit 0 on matching isolated source |
| Unit baseline | **138 files / 954 tests passed**, one worker; no existing test changed |
| Dependencies | Fresh owned install; SEC-3 manifest/lock exact; tree, production/full audits exit 0, zero known findings |
| Integration suites | **18/18 on each engine** |
| Concurrent approval | Small/200 cases plus repeated 835 cases pass; original failure retained |
| FLOW-3 | **8/8** strict race cases pass |
| Additional safety | Deferred recovery and five-time/legacy-cutoff checks pass on both |
| Remaining reliability gate | **Authentication >15 seconds: OPEN** |

[Normal checks](../../output/db-rel-1-20261028/checks-main.json), [unit log](../../output/db-rel-1-20261028/unit-final.log), [security proof](../../output/db-rel-1-20261028/security.json), [all command executions/failures](../../output/db-rel-1-20261028/execution-ledger.json).

The exact application candidate is [the review copy](../../output/db-rel-1-20261028/candidate-source/server/requirements/prior-approval-service.ts), SHA-256 **`3397ef4ce93595e6310b4d7272db0092d15b696808175b46e90f14750b004865`**. Only this existing application file differs from the accepted isolated base. Two staged operator/test adaptations bind F56 admission and historical construction to the new **owned 3338 datadir**, retaining version/ownership checks; they do not expand primary migration authority. Four new task-only TypeScript drivers add tracing, original-scenario observation, repeat/fault acceptance and full forward testing. Task-local orchestration/evidence are additions, not deployed modules. [Application hashes](../../output/db-rel-1-20261028/candidate-files.json), [tooling hashes](../../output/db-rel-1-20261028/tooling-files.json), [source boundary](../../output/db-rel-1-20261028/source-preservation.json).

Of **291 matching server build files**, **290 remain exact**; only the reader output differs; all **18 client assets** remain exact. Authentication, financial writers, output builders, migrations, permissions and UI feedback are unchanged. [Build proof](../../output/db-rel-1-20261028/build-verification.json).

Review artifacts: [one-file source ZIP](../../output/db-rel-1-20261028/candidate-source.zip), [binary patch](../../output/db-rel-1-20261028/DB_REL_1_ISOLATED_READ_OPTIMIZATION.patch), [rehearsal sources](../../output/db-rel-1-20261028/rehearsal-source.zip). Independent exact-byte patch application passed with text conversion disabled. Archives exclude private credentials/settings, keys and database records. They are not a complete primary/LAN release or authority to edit the immutable SEC-3 directory. [Artifact hashes](../../output/db-rel-1-20261028/artifacts.json).

The original reproduced 500 is retained. An initial owned-bootstrap attempt correctly failed F56's old fixed-3306 admission; the new target/datadir guard resolved that environment mismatch, with owned partial construction removed. A task patch-generator syntax error occurred before any application edit and was corrected. Queue prerequisite observation was extended before child commands started; no SQL/client timeout changed. Expected fault-injection failures remain recorded. No assertion, financial safeguard, permission, lock or capacity bound was weakened.

## Preservation, limitations and next authorization

Final full comparison preserves **all 150 primary tables' business values/counts**, schema objects, 67 journal hashes/timestamps, accounts/passwords/roles, runtime grants and original audits. This includes all scholarship/annual/academic/import/document/prior-approval evidence, three Masterlists / 2,002 stored entries / 1,835 activations, original entitlements/allocations, frozen sources, deferrals, payments/dates, command ledgers and reconciliation. **All 20,306 audits and 132 sessions remain unchanged.** No primary task authentication/export event was appended. [Final preservation](../../output/db-rel-1-20261028/final-preservation.json).

All **1,405 existing protected root inputs**, **310 retained distribution files**, **21,394 active SEC-3 files and actual environment hash**, **20,094 shared dependency/profile inputs**, **15,438 retained inputs**, **76 paused LAN-R2A artifacts** and **16 earlier ML-1 files** remain exact. Primary and retained listeners keep their owners. All recorded owned application schemas/accounts are removed; task database processes and temporary browser service are stopped. Private encrypted evidence and stopped initialized system datadirs remain restricted; secure erasure and an exhaustive operational-database inventory are not claimed. [Runtime integrity](../../output/db-rel-1-20261028/active-runtime-integrity.json), [retained proof](../../output/db-rel-1-20261028/retained-final.json), [cleanup](../../output/db-rel-1-20261028/cleanup.json), [delivery](../../output/db-rel-1-20261028/delivery.json).

These local, partly profiled and partly competing-load runs do not certify a latency SLA, maximum office concurrency, cold-start behavior, power loss, off-host recovery, full accessibility or operational release. Request-local read optimization reduces the demonstrated long hold; it does not remove necessary financial serialization. Uncertain business outcomes still require the original exact recovery body/key.

**Smallest next package:** separately authorize the passive authentication read contract and security/concurrency acceptance first. Specify its linearization point and exact disable/reset/session/role revocation behavior, retain mutation reauthorization/locks and prove browser responsiveness without raising timeouts. Review the one-file approval candidate for inclusion with the accepted compatibility/runtime work. Any later primary application activation requires a new complete owned release, then-current backup/recovery, preservation and explicit promotion authorization. F58/engine migration requires its own reviewed authorization and operator gates. Office financial source/forms/policy and LAN release acceptance remain separate.

**Stopped after isolated correction, testing and reporting. Authentication remains unresolved; no primary activation, F58 installation, MariaDB/XAMPP upgrade, financial-history change, operational LAN modification or LAN-R2A resumption occurred.**
