# AUTH-REL-2 — Session-bound authentication

28 October 2026, Philippine time. **Implemented and verified only in isolated staging on MariaDB 10.4.32 and 11.4.13. Primary remains unchanged and is not activated. Stopped after acceptance, cleanup and reporting.** P1 introduces coherent passive authentication snapshots. M1 binds guarded authorization to the actual validated session. Financial writers, command bodies, ledgers, permissions and frontend code remain unchanged. LAN-R2A remains paused.

This implements only the P1/M1 contract explicitly authorized after [AUTH-REL-1](AUTH_REL_1_FINANCIAL_SESSION_CONSISTENCY_REPORT.md). It retains the accepted [DB-COMPAT-2 foundation](../database/DB_COMPAT_2_MIGRATION_OPERATOR_READINESS_REPORT.md), [DB-REL-1 optimization](../database/DB_REL_1_MARIADB_FINANCIAL_CONCURRENCY_REPORT.md), SEC-3 graph and BACKUP-1 safeguards. The candidate is **not a complete primary or LAN installation package**.

## Primary baseline and recovery

| Fresh primary fact | Observation |
|---|---|
| Host / database | DESKTOP-BPLJKRP / `127.0.0.1:3306` / MariaDB **10.4.32** |
| Schema / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Active release | `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec3-20261028` |
| Controller / API / Vite | **65812 / 62376 / 31768**, loopback 3001/5173 |
| Schema journal | **150 tables / 67 migrations**; F57 present, F58 absent |
| PAY-001 / PAY-002 | Processed **v805 / 800 Paid**; processed **v5 / 200 Pending** |
| PAY-003 | **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 persisted state | **834 proposed entries; zero frozen rosters, allocations or payments** |
| Official Batch 1 | Published **v415 / 835 active members**, 167 retained removals |
| Windows / deadline | Original whole-day **21 / 23 / 27 October**; final deadline **31 October / revision 3** |
| Existing payments | **800**: two dated **2026-10-24**, 798 dated **2026-10-26** |
| Starting audits / sessions | **20,306 / 132** |

The actual dirty source and the unchanged active SEC-3 reader were used. No primary login, export, business command, account mutation or service restart was needed. The five-choice synthetic timed rule is preserved; this task adds no office-policy authority. [Inspection](../../output/auth-rel-2-20261028/inspection.json), [actual roster](../../output/auth-rel-2-20261028/current-state.json), [starting file hashes](../../output/auth-rel-2-20261028/files-before.json).

The authorized checkpoint-reuse gate passed a fresh complete **150-table** value/schema inventory, journal and grants comparison against AUTH-REL-1. Its encrypted archive was rehashed: **99,335,300 SQL bytes / 22,630,406 encrypted bytes**, SHA-256 `7959682ce259f488da2bae7cfe66ea2fdf1b9aa106c5cd49c4bc142896252152`. Complete new owned restorations preceded mutation tests. No archive was restored over primary. Existing finite BACKUP-1 bounds and key custody remain unchanged. [Freshness/reuse proof](../../output/auth-rel-2-20261028/checkpoint-reuse.json).

New loopback instances used separate owned datadirs, passwords and verified binaries: **10.4.32 / 3338** and **11.4.13 / 3337**. The 11.4 copies reuse the accepted native, binary-safe archive with its genuine F58 journal; no expression/transport investigation or primary migration was repeated. Source 67-row history and the target's accepted 68-row history remain distinct. Test setup and clock simulation are never primary changes.

## Implemented P1 and M1 contract

**P1 applies only to `/auth/me` and `/me/permissions`.** Every request establishes a new UTC, REPEATABLE READ, consistent READ ONLY snapshot. Account identity/version/disabled state, presented session/owner/revocation/expiry and assigned roles/permissions come from that one committed view. Snapshot establishment is its linearization point. Backend time checks absolute and idle expiry after assembling the tuple. There are no dirty reads, last-seen touches or cross-request authorization caches.

A security change committed before snapshot establishment is observed. A read already established before a later security commit may return its earlier coherent tuple; the response can arrive after that commit. Every following request validates a fresh view. This permitted overlap is not authority for a financial command.

**M1 retains configuration guard → account row → presented session row locking.** Successful server-side session validation admits only the validated actor ID, token digest, account version and configured idle interval into an isolated request scope. These fields are not accepted from command bodies or serialized to clients. Before a guarded callback or protected ledger result, authorization rechecks current ownership, revocation, absolute/idle expiry, disabled state, account version and roles/permissions. Expiry is checked again after access assembly. Existing source/version/business checks then run unchanged.

A security change committed before guarded authorization denies the operation. A transaction securely authorized first may complete while a later security writer waits. Expiry after that point does not create unsupported mid-transaction cancellation. Protected exact retry also requires current valid session and authority; a fresh authorized session can retrieve the original actor/key/payload-bound result.

Application construction captures a fail-closed web mode in every default/nested authorization service. Lost or missing asynchronous request context cannot silently select an actor-ID-only web path. Separately constructed trusted local/operator services retain their established non-HTTP controls. Stateful session admission/touch, login, logout, reset consumption and role/account writers keep their original transactions.

**Connection isolation is necessary too.** A controlled test filled all four business connections with ordinary authenticated requests queued behind an account lock. Lock-free P1 on that same pool could not finish before release. The database factory therefore supplies a separate **two-connection / sixteen-queued-acquisition** passive pool with the same restricted database identity and connection safeguards. The business pool remains **four / one hundred**. In the final controlled test, passive authentication completed before release in **170.7 ms**. No grant, account, server setting or timeout was changed. [Pool evidence](../../output/auth-rel-2-20261028/auth-pool-contention-after.json), [full contract](../../output/auth-rel-2-20261028/IMPLEMENTED_CONSISTENCY_CONTRACT.md).

These pools are finite. Database failure, overload and event-loop starvation can still prevent timely responses. Stateful login/security writers and business operations retain required serialization; their latency is not guaranteed by P1.

## Guarded entry-point coverage and security races

Static inspection inventories **195 guarded calls across 65 server files**, including Payments (43), OVR (15), Payouts (11), Masterlists (15), Requirements (26), and the remaining Registry/import/academic/standing/configuration/read services. All default and nested application authorization constructors are covered by the factory scope. Import, annual-intake and batch-document child adapters retain their already-authorized parent transaction and actor/permission checks. `requirements/policy-reset` remains a privileged local-only workflow, not a web route. No existing financial/background worker was found requiring an actor-ID web exception. [Complete caller inventory](../../output/auth-rel-2-20261028/guarded-entrypoints.json).

On **both engines**, the final candidate passes **12 queued/ordering cases**, **nine additional authorization-first cases** and **four passive coherence/isolation cases**. The real Fastify HTTP tests place barriers after admission and before the real guarded service, or after secure authorization before protected result delivery. SQL observations prove the later security writer's account query is pending; a timer alone is not the ordering proof.

| Security change committed before guarded authorization | Queued command | Fresh passive read |
|---|---:|---:|
| Logout, explicit revocation, reset consumption, replacement session | **401**, no command/deferral delta | **401** |
| Absolute or idle expiry | **401**, no command/deferral delta | **401** |
| Account disabling | **403**, no command/deferral delta | **403** |
| Role or permission removal | **403**, no command/deferral delta | **200**, coherent current account/access tuple |

AUTH-REL-1's admitted logout/reset/expiry deferrals committed with **200**; those reproduced gaps now reject before business work. Existing disabled/role denials remain intact. In the opposite ordering, one real fixture deferral establishes a durable result. Subsequent protected exact replays authorize first, return that unchanged result, and let the later logout/revocation/reset/disable/role/permission/replacement writer complete. Following commands are denied. Absolute/idle expiry orderings are covered without additional financial writes. No duplicate deferral, allocation or payment appears.

P1 cases prove uncommitted disable rollback does not expose dirty state, an earlier snapshot can overlap logout, a role change cannot produce a mixed-generation tuple, expiry during a delayed read returns 401, twelve parallel reads retain actor isolation, and missing/lost request context fails closed. Session-principal secrets never enter the three-key public Session JSON.

[10.4 queued cases](../../output/auth-rel-2-20261028/security-races-3338.json), [11.4 queued cases](../../output/auth-rel-2-20261028/security-races-3337.json), [10.4 authorization-first](../../output/auth-rel-2-20261028/security-after-authorization-3338.json), [11.4 authorization-first](../../output/auth-rel-2-20261028/security-after-authorization-3337.json), [10.4 passive cases](../../output/auth-rel-2-20261028/passive-races-3338.json), [11.4 passive cases](../../output/auth-rel-2-20261028/passive-races-3337.json).

## Real browser and financial acceptance

Playwright and installed Chrome execute the **unchanged actual `auth-api.ts`**, including its **15-second** timeout, against owned Fastify. Each engine runs competing 835-person finalizations with separate Coordinator and Staff browser contexts. Three paired samples per engine return **200**:

| Observation | 10.4.32 | 11.4.13 |
|---|---:|---:|
| Coordinator browser `/auth/me` during finalization run | **5.6–9.3 ms** | **3.2–5.1 ms** |
| Staff browser `/auth/me` during finalization run | **6.5–10.5 ms** | **3.7–4.6 ms** |
| Winning finalization response | **22.57 s** | **20.33 s** |
| Competing finalization responses | **200 / 409** | **200 / 409** |

The 11.4 marker is emitted after the real financial guard/session lock; monotonic timestamps prove all six browser samples fall inside the guarded transaction. The 10.4 samples are from the concurrent finalization run; its earlier marker is not represented as the same stronger per-sample overlap proof. AUTH-REL-1's unchanged-client controlled hold timed out at **15,012 ms**, and its real same-Coordinator financial waits were **23.03 / 21.93 seconds**. These are observed workloads, not paired quiet benchmarks or an office latency SLA. No browser timeout was increased. [10.4 browser](../../output/auth-rel-2-20261028/browser-auth-original.json), [11.4 browser](../../output/auth-rel-2-20261028/browser-auth-target.json), [guard overlap](../../output/auth-rel-2-20261028/browser-financial-overlap.json).

The actual existing React command hook, recovery dialog, auth client and styles also run in a small **test-only owned-copy shell**. A real deferral commits, its response is deliberately lost, and two immediate Enter presses produce one initial command. Escape and navigation remain blocked, focus stays in the dialog, and the original body/key/version remain retained. Logout makes the protected retry return **401** without clearing the uncertain command. Fresh authentication updates CSRF; the exact retry returns the original result. **Three exact requests / one deferral / one command / one version event**, with all original financial/source tables and 800 payments exact. This is not a new primary UI or a new recovery backend. [Browser acceptance](../../output/auth-rel-2-20261028/browser-recovery.json), [copy preservation](../../output/auth-rel-2-20261028/browser-recovery-preservation.json), [actual unchanged dialog screenshot](../../output/playwright/auth-rel-2/owned-recovery.png).

A separate actual-browser check returns **200 before expiry / 401 after the backend expiry boundary** using the unchanged auth client. Only the owned session receives a short future expiry; no workstation or database-global clock changes. [Browser expiry](../../output/auth-rel-2-20261028/browser-expiry.json).

The UI/UX skill and Playwright were applied to affected focus, status and recovery behavior. All frontend source and **18 built client files** are byte-exact. As explicitly requested, the five-width/native-200% sweep was not repeated for this backend-only change. Full assistive-technology certification is not claimed. Recovery remains the existing workspace-memory convention, backed by durable server results; this task does not introduce browser-restart persistence.

Both engines pass **25- and 835-person** finalization. Negative checks cover Staff denial, stale version/hash, an actual changed identity source, late audit and ledger rollback, queued role loss, competing finalizations and winning/losing exact retries. Each positive finalization has one frozen roster, exactly the intended allocations and **no new payments**. Original payment and official activation rows remain exact.

The new engines' **complete source wrappers, review entries and fingerprints match exactly** for each controlled cohort. For 835, frozen JSON is **6,741,385 bytes**, SHA-256 `da9991d4aa1848720e44ec601b14c032044ff9d44018e0f6a2faac5c52834688`; financial-child projection is **4,231,438 bytes**. Both are byte-identical across engines **and to AUTH-REL-1**. The old whole-scope wrapper token differed because its setup used a live administrative restoration timestamp. This task aligns only the new fixture's administrative and application connection clocks; no stored source token is rewritten. [Exact parity](../../output/auth-rel-2-20261028/financial-parity.json), [10.4 835](../../output/auth-rel-2-20261028/original-835.json), [11.4 835](../../output/auth-rel-2-20261028/target-835.json), [10.4 negatives](../../output/auth-rel-2-20261028/negative-acceptance-3338.json), [11.4 negatives](../../output/auth-rel-2-20261028/negative-acceptance-3337.json).

## Validation, reuse and retained failures

The [evidence-reuse/test-impact matrix](../../output/auth-rel-2-20261028/EVIDENCE_REUSE_AND_TEST_IMPACT.md) preceded implementation. Focused security acceptance passed before financial expansion.

| Final matching-candidate check | Result |
|---|---|
| Lint, typecheck, build, secrets | **All exit 0** |
| Unit tests, one worker | **140 files / 970 tests passed**; all 954 accepted assertions retained, 16 added |
| Dependency tree, full and production audits | **Exit 0**, zero reported vulnerabilities; exact accepted SEC-3 manifest/lock |
| Focused security | **25 cases per engine**, plus bounded-pool contention/unit checks |
| Browser | Repeated actual-client reads, real lost-response recovery, revoked-session rejection, focus/navigation protection |
| Financial regression gate | **18 suites per engine / 36 successful final suite results**, including 835-person prior-approval exact concurrency |
| Deferred restoration | **Four groups per engine**, including restoration, Review return, Staff denial, audit rollback, exact retry and preservation |

[Final acceptance and exact suite commands](../../output/auth-rel-2-20261028/FINAL_ACCEPTANCE.json), [10.4 restore](../../output/auth-rel-2-20261028/deferred-original.json), [11.4 restore](../../output/auth-rel-2-20261028/deferred-target.json), [normal commands/exits](../../output/auth-rel-2-20261028/checks-main.json), [unit log](../../output/auth-rel-2-20261028/unit-final.log), [security/tree checks](../../output/auth-rel-2-20261028/security.json). The isolated graph was installed into a new task-owned dependency tree/cache. Shared/primary dependencies were never repaired, replaced or relinked.

The full relevant suite comprises graduation, authentication, RBAC, requirements, 835-person prior-approval same-key concurrency, Masterlist drafts/workflow/amendments, academic records/approved changes, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted payroll, Payment Recording, reconciliation, Individual Settlement and financial reports. The focused restore drill preserves Draft/Review return restrictions, Coordinator/Staff separation, audit rollback, exact retry, correct source/count refresh and every other inventoried financial/source row. The downstream individual-payment suites retain their established authorization, duplicate-payment and report assertions.

Reused: original lock/defect traces, accepted MariaDB compatibility/F58/binary-transport evidence, immutable package repair evidence and unchanged financial baselines. Newly executed: fresh restorations, P1/M1 races, browser/25/835 acceptance, impacted suites on both engines, normal checks and preservation. Intentionally skipped: original-defect reruns, new package repair, expression investigations, full UI width sweeps, and redundant 200/834 finalizations. M1 executes once per guarded command; 25/835 cover bounded rollback and large financial writes, while the unchanged writers retain DB-REL-1's prior 25/200/834/835 matrix.

Failure evidence is retained. A new mock test initially had an unused parameter; lint caught it and final normal checks passed after correction. A proposed new React unit helper required an unavailable testing package; no dependency was added, and actual-browser recovery supplies the relevant acceptance instead. Reusing a heavily exercised fixture hit the unchanged login limit; a fresh owned fixture passed. Early ordering instrumentation could not prove a wait through `INNODB_LOCK_WAITS`; server-query barriers replaced that assumption. A past-expiry fixture violated the existing session constraint and was replaced by a natural short future expiry. No security limit/constraint was relaxed.

One uninstrumented initial 835-person attempt returned internal error during review before finalization. Its cause cannot be reconstructed from that collector. It is retained as failed evidence, not counted as a pass or claimed fixed. The fresh instrumented 835 runs on both engines pass with no SQL errors and exact financial outputs; review this residual observation before activation. Browser-shell fixes concerned absolute font paths, registering test routes before Fastify readiness and using the actual visible **Retry Exact Action** control. The prior-approval harness initially referenced a missing copied baseline path; its optional original oracle now resolves lazily to the accepted DB-REL-1 baseline. The first 10.4 matrix has 17 passes and that startup failure; its one missing 835-person suite was then run successfully, while 11.4 passed all 18. The full suites were not repeated. A cleanup count query initially used a reserved SQL alias; it stopped before shutdown, the alias was corrected, and final empty-schema/account and stopped-listener checks pass. No original assertion or application validator was weakened.

## Exact source boundary and preservation

**Ten package files: six existing changes, two new backend modules, two new unit files.** These links identify the isolated candidate, not the unchanged primary source:

| Candidate file | Scope |
|---|---|
| [server/auth/request-context.ts](../../output/auth-rel-2-20261028/candidate/server/auth/request-context.ts), new | Server-owned request principal and fail-closed construction scope |
| [server/authorization/access-rows.ts](../../output/auth-rel-2-20261028/candidate/server/authorization/access-rows.ts), new | Original role/permission SQL shared by coherent readers |
| [server/auth/service.ts](../../output/auth-rel-2-20261028/candidate/server/auth/service.ts) | P1 reader; server principal after normal session admission |
| [server/auth/routes.ts](../../output/auth-rel-2-20261028/candidate/server/auth/routes.ts) | Explicit passive-route wiring |
| [server/authorization/service.ts](../../output/auth-rel-2-20261028/candidate/server/authorization/service.ts) | M1 current-session/version/expiry check at shared authorization |
| [server/authorization/routes.ts](../../output/auth-rel-2-20261028/candidate/server/authorization/routes.ts) | Same-snapshot permission projection |
| [server/database.ts](../../output/auth-rel-2-20261028/candidate/server/database.ts) | Bounded dedicated passive pool; close both pools |
| [server/app.ts](../../output/auth-rel-2-20261028/candidate/server/app.ts) | Application/request scope and pool wiring |
| [tests/session-bound-auth.test.ts](../../output/auth-rel-2-20261028/candidate/tests/session-bound-auth.test.ts), new | Fifteen session/context/coherence/guard tests |
| [tests/passive-auth-pool.test.ts](../../output/auth-rel-2-20261028/candidate/tests/passive-auth-pool.test.ts), new | Pool identity, bounds, options and cleanup |

**651 other accepted application/source/test/schema inputs are exact.** All old tests and frontend files are unchanged. Nineteen existing auth/authorization methods outside the permitted reader/snapshot changes compare byte-exact, including security writers and guarded transaction methods. Of **288** baseline compiled server JavaScript files, **282** remain exact, six change and two modules are added. Financial business modules, original prior-approval optimization, schema SQL, permissions, output builders, dependencies, configuration and launcher are preserved. [Hashes](../../output/auth-rel-2-20261028/candidate-files.json), [source/method proof](../../output/auth-rel-2-20261028/source-preservation.json), [compiled comparison](../../output/auth-rel-2-20261028/build-verification.json).

The working candidate is under `C:/Users/ADMIN/.ldss/auth-rel-2-20261028/stage`; normal checks use matching `check-stage` and the task's own dependencies. Two task-only operator-port adaptations and separate diagnostic drivers are outside this ten-file application package. The accepted DB-COMPAT-2 and DB-REL-1 foundation remains a prerequisite; this incremental patch must not be applied blindly to the older active release.

The final complete comparison preserves **all 150 tables**, every original business value/count, schema object, **67 migration checksums/timestamps**, application accounts/password hashes/roles, runtime grants, command ledgers, imports, document/prior-approval evidence, official activations, frozen payrolls, entitlements, allocations, payments and histories. The primary facts in the opening table are unchanged. All **800 Paid rows and their exact dates** remain intact. All **20,306 audits / 132 sessions** remain exact, with **zero primary task login, export or business command** and no observed intervening change. [Final preservation](../../output/auth-rel-2-20261028/final-preservation.json).

All **1,407 protected workspace inputs**, including **310 retained distribution files**, remain exact. The active SEC-3 release's **21,394 immutable files** and environment hash pass. **15,438 retained inputs / 20,094 shared dependency files**, their junction targets, **76 paused LAN-R2A artifacts / 16 earlier ML-1 evidence files** remain exact. Primary and retained process commands, ancestry, listeners, source database settings and readiness are unchanged. This is not an exhaustive new inventory of every retained or operational database. [Active runtime](../../output/auth-rel-2-20261028/active-runtime-integrity.json), [retained/shared proof](../../output/auth-rel-2-20261028/retained-final.json), [delivery](../../output/auth-rel-2-20261028/delivery.json).

All task-owned application schemas/accounts are removed, both owned database processes are stopped, temporary ports **3026/3027/3028/3337/3338** are quiet, and task browser contexts are closed. Private initialized datadirs and restricted diagnostic/recovery evidence are retained; disk erasure is not claimed. Primary, older retained targets and operational LAN were not stopped or reset. [Verified cleanup](../../output/auth-rel-2-20261028/cleanup.json).

Review artifacts: [ten-file source ZIP](../../output/auth-rel-2-20261028/candidate-source.zip), [isolated patch](../../output/auth-rel-2-20261028/AUTH_REL_2_ISOLATED.patch), [byte-exact patch round trip](../../output/auth-rel-2-20261028/patch-verification.json). They exclude credentials, keys, `.env` and database records. CRLF text produces Git whitespace warnings during review; the independent apply round trip preserves exact bytes. These artifacts do not contain the full compatibility/runtime/operator installation package.

## Activation boundary and smallest next task

**Primary still runs the unchanged SEC-3 authentication implementation.** Passing isolated acceptance does not repair its known ordering defects. No schema migration or new permission is required by P1/M1, but primary activation remains explicitly unauthorized.

The smallest next task is a bounded security/release review of this exact candidate and the retained initial review-error observation, followed—only if separately authorized—by a controlled primary synthetic installation. That task must verify then-current data/source identity, preserve legitimate intervening activity, take or freshly validate complete BACKUP-1 recovery, carry the accepted compatibility/DB-REL-1 and SEC-3 prerequisites, review the additional two-connection budget, verify all current guarded constructors/callers, coordinate matching backend installation/readiness and repeat target-specific session/recovery acceptance. MariaDB 11.4 migration/F58/runtime switch, operational LAN release and office financial-policy approval remain separate decisions.

No maximum-load, power-loss, off-host recovery, office concurrency, full accessibility or absolute latency certification is supplied. The first unclassified review error remains a disclosed investigation limit. Financial writers retain their locks; genuine uncertain results still require supported exact retry. No mid-transaction security cancellation, persistent browser command store, new financial writer or financial-policy exception has been introduced.

**Stopped after isolated implementation, acceptance and reporting. No primary activation, migration/F58 installation, account change, financial outcome, timeout increase, database upgrade, retained restart, LAN-R2A resumption or operational LAN change occurred. The known primary authentication ordering remains unchanged pending separate authorization.**
