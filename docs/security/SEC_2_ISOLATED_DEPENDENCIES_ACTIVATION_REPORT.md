# SEC-2 — Isolated dependencies and security update activation

27–28 October 2026, Philippine time. **Dedicated runtime isolation is implemented and tested in owned staging. PRIMARY ACTIVATION IS BLOCKED.** The reviewed SEC-1 lockfile contains five pre-existing package-identity inconsistencies. A fresh-cache installation fails against the registry, and the candidate's final `npm ls --all --json` exits 1. The original primary controller, API, Vite, shared dependencies and retained environments remain unchanged. No primary business command was submitted.

This follows [SEC-1](SEC_1_DEPENDENCY_AND_MARIADB_READINESS_REPORT.md), [FLOW-3](../acceptance/FLOW_3_PAYROLL_FINALIZATION_RELIABILITY_REPORT.md), [FLOW-2](../acceptance/FLOW_2_FINAL_OFFICE_UAT_REPORT.md), [PAY-PERF-3](../requirements/PAY_PERF_3_PAYROLL_ASSESSMENT_OPTIMIZATION_REPORT.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md) and repository AGENTS.md. No financial writer, schema, permission, cutoff policy, XAMPP/MariaDB installation or operational LAN configuration changed. LAN-R2A remains paused.

## Actual primary and recovery checkpoint

| Item | Fresh starting/final result |
|---|---|
| Host / server | **DESKTOP-BPLJKRP / 127.0.0.1:3306 / MariaDB 10.4.32** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application | Existing **synthetic / loopback 5173 / 3001** |
| Controller / API / Vite | **61556 / 29024 / 57228**, unchanged; original commands and ancestry exact |
| Schema | **150 tables / 67 accepted migrations**, including F57; values/checksums/timestamps exact |
| PAY-001 | **Processed v805 / 800 Paid**, unchanged |
| PAY-002 | **Processed v5 / 200 Pending**, unchanged |
| PAY-003 | **Draft v4 / 834 proposed entries / one deferred / zero frozen, allocated or paid**, unchanged |
| Current official Batch 1 | **Published v415 / 835 active members**, unchanged |
| Existing windows | Whole-day cutoffs **21 / 23 / 27 October**, unchanged |
| Recorded final deadline / synthetic timed rule | **31 October, revision 3 / one existing synthetic rule**, unchanged |

The actual dirty workspace matched all **1,391** SEC-1 starting inputs. The new checkpoint protects **1,392** existing files, including SEC-1's report. All eight requested SEC-1 artifacts were hashed; candidate manifests matched their independently checked original/candidate hashes. Git HEAD and older data were not substituted. [Artifact verification](../../output/sec-2-primary-20261027/accepted-artifacts.json), [inspection](../../output/sec-2-primary-20261027/inspection.json), [preflight](../../output/sec-2-primary-20261027/preflight.json), [starting files](../../output/sec-2-primary-20261027/files-before.json).

Before source/runtime changes or fixture mutations, BACKUP-1 captured **99,329,622 SQL bytes / 22,628,231 encrypted bytes**, archive SHA-256 **`30429b68a2a38fd802d40972abd9663e845fc83aee44679ed0b151af1e1b8cc3`**. Complete isolated restoration passed all 150 tables, values/counts/checksums, 67-row journal, schema objects, constraints, indexes, triggers, executable views and rejection probes. The initial unretained target/account were automatically removed. Existing encryption, custody, source-schema READ locks and finite bounds were retained; no global lock or primary restoration occurred. [Recovery](../../output/sec-2-primary-20261027/recovery.json).

No quiet-port promotion checkpoint or primary maintenance occurred because the dependency gate failed first. This archive predates the task's authentication events; a later activation requires a fresh checkpoint and complete restoration.

## Retained boundary and chosen isolation

The shared-dependency hazard is confirmed. Current retained processes **32096 / 34360** execute `scripts/local-individual-uat.ts` on **3011 / 3012**; **28956** executes the annual-intake server on **3013**. Their scripts import shared application modules. Ten additional retained candidate directories resolve `node_modules` through junctions to the workspace tree. Replacing that tree could affect later resolution even without restarting a listener.

The task protected **20,094 shared inputs**—20,091 dependency files plus the original profile metadata and two shared entry scripts—and **15,438 retained source/build/configuration inputs**. Their final bytes and dependency targets match. Named retained Node commands/ancestry and all recorded listener owners, including LAN, match. Append-only request logs were excluded from the retained file hash set. This is not an exhaustive inventory of retained or operational databases. [Import evidence](../../output/sec-2-primary-20261027/retained-dependency-boundary.json), [directory inventory](../../output/sec-2-primary-20261027/retained-inventory.json), [final hashes](../../output/sec-2-primary-20261027/retained-after.json), [process/listener proof](../../output/sec-2-primary-20261027/delivery.json).

The implemented model is a complete dedicated tree outside webroot:

| Location | Purpose |
|---|---|
| `C:/Users/ADMIN/.ldss/primary-runtime/releases/sec2-20261027` | Current dirty source, exact SEC-1 candidate manifests, own `node_modules`, matching build and copied Node binary; **blocked candidate** |
| `C:/Users/ADMIN/.ldss/primary-runtime/baselines/sec2-20261027` | Matching original source/build and independently installed original dependencies for comparison |
| `C:/Users/ADMIN/.ldss/primary-runtime/private/sec2-20261027` | Restricted effective configuration, logs and owned rehearsal state; excluded from review archives |

The API uses compiled local server modules. Vite uses the same release's source, configuration and dependencies. Each has its own Node **v22.21.0** binary, SHA-256 **`47cd67453da180a39cdf5daedb89862667b8e627e60c116607874633450cd30d`**, identical to the installed binary. No Node/npm upgrade occurred.

The controller verifies a file manifest before starting children, checks port availability and requires both readiness responses. The module hook rejects resolved files outside the release and rejects unexpected module protocols, working directories, Node executable paths and inherited `NODE_PATH`/`NODE_OPTIONS`. Children receive a small OS environment and the private parsed application configuration. No setup/root password is copied. Mutable Vite caches stay inside the dedicated tree. **21,393** candidate runtime files were inventoried without symlinks/junctions. This is an application resolution boundary, not a sandbox against a malicious local administrator.

The effective primary configuration round-trips exactly through the accepted configuration schema: target, restricted account, origin, flags, session bounds and proxy setting are preserved. The existing launcher and `.env` remain exact. Owned rehearsals alone substitute their explicitly owned database/account and ports **3026 / 3028**. [Configuration proof](../../output/sec-2-primary-20261027/configuration-parity.json), [manifest](../../output/sec-2-primary-20261027/runtime-manifest-rehearsal.json), [positive/negative resolution probes](../../output/sec-2-primary-20261027/guard-tests.json).

## Package changes and the promotion blocker

The dedicated candidate contains exactly SEC-1's five direct changes: **Fastify ^5.12.6, Zod ^4.6.6, concurrently ^10.0.6, Vite ^8.3.3 and Vitest ^5.0.5**. Its 17 changed lock entries retain the accepted exact versions, including fast-uri **3.1.9 / 4.2.3**, shell-quote **1.12.0** and source-map-js **1.2.2**. All 17 changed entries' integrity metadata matched current registry responses, and their installed manifests match their expected versions. No force fix, suppression, peer bypass or dependency sweep was used. [Registry checks](../../output/sec-2-primary-20261027/registry-integrity.json), [17 installed identities](../../output/sec-2-primary-20261027/installed-changed-packages.json).

Candidate SHA-256:

- `package.json`: `926d4ed157e7a1f1bb089d8f49d53d55aaef783c734d0892ed686313dd018f88`
- `package-lock.json`: `19ff3ca4f0e2f1b26845e7d418797195742d54017d9f675153f5b0b1c19aa207`

**S20 — Package identity/reproducibility blocker.** The initial cache-backed `npm ci` and immediate tree check exited 0. A subsequent full tree check exposed an invalid ESLint installation. Independent inspection found five discrepancies already present in both the shared installation/lock and SEC-1 candidate:

| Package | Reviewed lock version | Installed manifest version |
|---|---:|---:|
| `@eslint/config-helpers` | 0.17.0 | **0.7.0** |
| `@humanfs/types` | 0.17.0 | **0.15.0** |
| `emoji-regex` | 10.17.0 | **10.6.0** |
| `eslint` | 10.17.0 | **10.11.0** |
| `ret` | 0.17.0 | **0.5.0** |

Current metadata endpoints for all five locked versions return **404**. The installed versions' metadata returns **200**, and their published integrity values match the lock's integrity values. The ESLint locked tarball also returns 404. A separate installation with an **empty, task-owned cache** fails in **18.905 seconds**, including a registry 404 for `ret-0.17.0.tgz`. The shared cache was not cleared. No installed manifest was rewritten to conceal the discrepancy. Its historical origin and any malicious cause are **not established**. [Complete identity/registry evidence](../../output/sec-2-primary-20261027/package-identity-investigation.json), [fresh-cache result](../../output/sec-2-primary-20261027/fresh-cache-install.json), [install log](../../output/sec-2-primary-20261027/fresh-cache-install.log).

The cache-backed install therefore does not establish registry-reproducible installation. The lock's version, resolved artifact and integrity fields must be coherent; npm documents these separately in its [lockfile specification](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json/). The required [clean-install workflow](https://docs.npmjs.com/cli/v10/commands/npm-ci/) cannot currently complete from the registry with an empty cache.

| Final command | Shared installation | Dedicated candidate |
|---|---|---|
| `npm audit --omit=dev --json` | Exit **1**, **3** reported entries | Exit **0**, **0** reported entries |
| `npm audit --json` | Exit **1**, **9** reported entries | Exit **0**, **0** reported entries |
| `npm ls --all --json` | Exit **0** | **Exit 1, ELSPROBLEMS / invalid ESLint** |
| Empty-cache `npm ci` | Not attempted on shared tree | **Failed / registry 404** |

Empty advisory reports do not cure incorrect package identities or certify complete advisory coverage for mislabeled entries. Even the shared tree command's zero exit did not reveal its five manifest discrepancies. SEC-1's initial cached checks must be read with this additional evidence. **The aggregate final dependency gate is FAILED.** [Final audits](../../output/sec-2-primary-20261027/final-audits.json).

The rehearsal manifest has `primaryActivationAllowed: false`. Primary-mode manifest generation rejects the identity failure. An owned-credential probe proves the controller rejects an unapproved primary-mode start before opening a database connection or port. **No primary stop/start or promotion was attempted.** Correcting the five identities/constraints and rebuilding their affected lock graph would exceed installation of the exact reviewed SEC-1 lock; that portion is stopped for separate review. [Activation gate](../../output/sec-2-primary-20261027/activation-gate-test.json).

## Actual module paths and source boundary

| Package | Current primary/shared version | Owned candidate version |
|---|---:|---:|
| Fastify | 5.12.5 | **5.12.6** |
| Zod | 4.6.5 | **4.6.6** |
| fast-uri | 3.1.8 / 4.2.1 | **3.1.9 / 4.2.3** |
| Vite | 8.3.1 | **8.3.3** |
| Vitest | 5.0.2 | **5.0.5** |
| concurrently | 10.0.5 | **10.0.6** |

Primary remains on `C:/xampp/htdocs/scholar_monitor/node_modules`, supported by its unchanged launcher ancestry and static resolution evidence. The **owned running processes** recorded actual loaded module paths under their dedicated release; Fastify/Zod/fast-uri and Vite were loaded there. Vitest and other unused tooling have installed-path/version evidence; they are not claimed to execute in the API. There is no post-activation primary module proof because activation did not occur. [Original owned runtime](../../output/sec-2-primary-20261027/module-paths-before.json), [patched owned runtime](../../output/sec-2-primary-20261027/module-paths-after.json), [Vite proof](../../output/sec-2-primary-20261027/web-module-paths-after.json), [unchanged primary resolution](../../output/sec-2-primary-20261027/delivery.json).

**Four new workspace startup files; zero existing workspace-file changes.**

| File | Scope |
|---|---|
| [guard.mjs](../../scripts/isolated-primary/guard.mjs) | Dedicated path/environment/module boundary and dependency evidence |
| [api.mjs](../../scripts/isolated-primary/api.mjs) | Compiled API, explicit target identity and existing readiness checks |
| [web.mjs](../../scripts/isolated-primary/web.mjs) | Own Vite, source and loopback proxy |
| [controller.mjs](../../scripts/isolated-primary/controller.mjs) | Manifest/activation gate, supervised children, readiness and private state |

Only the two manifests differ in the dedicated source copy. All **291** compiled server files match accepted SEC-1 bytes. Every existing financial writer, output builder, validator, migration, permission, existing test, font, flag and launcher remains exact. Task-only drivers/evidence and this report are additions. [Six-file inventory](../../output/sec-2-primary-20261027/isolation-files.json), [source/build parity](../../output/sec-2-primary-20261027/build-source-parity.json).

## Financial, concurrency and recovery acceptance

| Check | Result |
|---|---|
| Lint, typecheck, build, secrets | Initial matching-stage commands exit **0**; final startup-wiring lint also exits **0** |
| Unit suite | **137 files / 949 tests passed**, one worker; existing assertions unchanged |
| Integrated regressions | **17 groups passed**, including the qualified full-cohort rerun below |
| Deferred recovery | **Six groups passed**, original payments/source/schema preserved |
| Cutoffs | Default 17:00 and alternative 19:00 creation on owned data; five configured choices, stale/invalid time, Staff denial, exact retry and legacy windows checked |
| Framework/payment parser parity | Six transport cases and **11** actual financial schema cases retain exact public decisions/errors |

The 17 integrated groups cover authentication, RBAC, requirement/document workflow, the complete **835-person** import/prior-approval/publication correction workflow, Masterlist drafts/workflow/amendments, academic records/approved changes, notifications, Registry/main payroll/Treasury, intake/import/receiving, historical/omitted payroll, Recording, reconciliation, individual settlement and financial reports. Existing cutoff/receipt boundary tests are included in the 949-test suite. [Normal results](../../output/sec-2-primary-20261027/checks-main.json), [unit log](../../output/sec-2-primary-20261027/unit-final.log), [initial integrated results](../../output/sec-2-primary-20261027/regressions-auth-rbac-requirements-pay-new-masterlist-drafts-masterlist-workflow-masterlist-amendments-academic-academic-changes-notifications-registry-intake-import-historical-recording-reconciliation-individual-settlement-financial-reports-latest.json), [full-cohort rerun](../../output/sec-2-primary-20261027/regressions-pay-new-latest.json), [deferred recovery](../../output/sec-2-primary-20261027/deferred-recovery.json), [cutoff regression](../../output/sec-2-primary-20261027/cutoff-regression.json), [parser parity](../../output/sec-2-primary-20261027/parser-validation-parity.json).

The first 835-person prior-approval test returned **500** during concurrent exact requests while other heavy suites were running. The unchanged serial rerun passed all five groups in **221.061 seconds**. No underlying SQL trace establishes the initial cause; contention is not presented as proven causation. This limits load/reliability acceptance. No timeout, transaction limit or assertion was relaxed.

FLOW-3 candidate observations:

| Members | Winner / competing 409 | Winner guard held | Winner SQL calls | Observed process peak RSS |
|---:|---:|---:|---:|---:|
| 25 | **22.179 / 47.639 s** | **22.159 s** | **14,299** | **1,056 MiB** |
| 200 | **20.725 / 42.732 s** | **20.701 s** | **15,988** | **1,095 MiB** |
| 834 | **24.833 / 45.570 s** | **24.790 s** | **22,444** | **903 MiB** |
| 835 | **23.803 / 45.064 s** | **23.766 s** | **22,450** | **1,016 MiB** |

Every cohort commits exactly one finalization/frozen roster, with exactly N allocations and no new payment. The competing command and its original retry return 409; the winner's exact retry returns its committed result. A discarded committed result exercises durable recovery. The 25-person negatives retain Staff denial, stale version/hash and changed identity rejection, late audit **and ledger** rollback and queued role revocation **403**.

The new baseline 834-person comparison also returns **200/409**. Complete reviewed entries/source hash and the **6,733,274-byte** frozen snapshot match candidate bytes and accepted SEC-1/FLOW-3 evidence; SHA-256 **`da8f9f3b235564e6d255b7c0dfdacf26d6b95badd948fe19f0cb4196f9fb82da`**. No source pin or financial assertion changed. [Matrix](../../output/sec-2-primary-20261027/matrix-results.json), [negative checks](../../output/sec-2-primary-20261027/negative-acceptance.json), [new before/after parity](../../output/sec-2-primary-20261027/before-after-financial-parity.json), [accepted-source parity](../../output/sec-2-primary-20261027/financial-parity-834.json).

All mutations used newly owned synthetic targets. Controlled Node Date and connection-local SQL timestamps were confined to fixtures. Machine/global database clocks, primary receipts and financial dates were not changed.

## Performance and interface preservation

Matched 834-included source-copy reads used compiled code and a fixed owned clock. These are individual local observations, not a latency SLA or controlled capacity benchmark:

| Operation | Original → candidate | SQL calls / response bytes |
|---|---:|---:|
| Authentication | **3.23 → 2.86 ms** | **4 / 224**, both |
| Included roster, 25 rows | **11.752 → 10.767 s** | **2,939 / 106,517**, both |
| HTML draft export | **10.848 → 10.252 s** | **2,945 / 4,757,830**, including account probe |
| Word draft export | **12.156 → 11.258 s** | **2,941 / 184,741**, both |
| Same-actor auth during HTML export | **9.11 → 7.86 ms**, both 200 | Existing read/export lock separation retained |

Roster DTO/full-scope hash and complete HTML bytes match. Every Word part matches after normalizing only core creation/modification timestamps. HTML aggregate SQL elapsed time was **5.914 → 5.121 seconds**; Word **6.117 → 5.374 seconds**. Peak RSS across each separate read sequence reached approximately **1,075 / 918 MiB**; preceding allocations and GC differ. No memory or speed improvement is certified. [Measurements](../../output/sec-2-primary-20261027/measure-before.json), [candidate](../../output/sec-2-primary-20261027/measure-after.json), [complete output parity](../../output/sec-2-primary-20261027/performance-parity.json).

Dedicated controller readiness, including file verification, measured **22.605 / 44.817 seconds** for baseline/candidate; after file verification, child readiness measured **2.379 / 2.281 seconds**. Cache/load/sequence differ. The new baseline 834 winner guard held about **22.034 seconds**, versus **24.790** in the candidate observation. These are not evidence of a dependency speedup. **Same-account authentication during the 835-person financial finalization still waited 22.293 seconds**, returning 200. That exceeds the existing browser account-read timeout; the open issue is not fixed by this task. [Startup before](../../output/sec-2-primary-20261027/startup-before.json), [after](../../output/sec-2-primary-20261027/startup-after.json), [baseline finalization](../../output/sec-2-primary-20261027/before-834.json), [835 probes](../../output/sec-2-primary-20261027/after-835.json).

No UI redesign occurred. The installed ui-ux-pro-max and Playwright workflows checked both roles on the **same owned browser-copy data**, original versus patched dependencies. Both passed **1440 / 1024 / 820 / 375 / 320 CSS px**, height 900, bounded 25-row loading, server paging/search, exclusions, keyboard focus and permitted modal cancellation. Tables retain local horizontal scrolling. All intercepted business-command attempt lists are empty.

These are **isolated baseline/candidate screenshots**, not primary-after-installation evidence. Names/IDs are masked; primary was not reverted or promoted.

| Width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/sec-2-isolated/before-coordinator-1440.png) / [After](../../output/playwright/sec-2-isolated/after-coordinator-1440.png) | [Before](../../output/playwright/sec-2-isolated/before-staff-1440.png) / [After](../../output/playwright/sec-2-isolated/after-staff-1440.png) |
| 1024 | [Before](../../output/playwright/sec-2-isolated/before-coordinator-1024.png) / [After](../../output/playwright/sec-2-isolated/after-coordinator-1024.png) | [Before](../../output/playwright/sec-2-isolated/before-staff-1024.png) / [After](../../output/playwright/sec-2-isolated/after-staff-1024.png) |
| 820 | [Before](../../output/playwright/sec-2-isolated/before-coordinator-820.png) / [After](../../output/playwright/sec-2-isolated/after-coordinator-820.png) | [Before](../../output/playwright/sec-2-isolated/before-staff-820.png) / [After](../../output/playwright/sec-2-isolated/after-staff-820.png) |
| 375 | [Before](../../output/playwright/sec-2-isolated/before-coordinator-375.png) / [After](../../output/playwright/sec-2-isolated/after-coordinator-375.png) | [Before](../../output/playwright/sec-2-isolated/before-staff-375.png) / [After](../../output/playwright/sec-2-isolated/after-staff-375.png) |
| 320 | [Before](../../output/playwright/sec-2-isolated/before-coordinator-320.png) / [After](../../output/playwright/sec-2-isolated/after-coordinator-320.png) | [Before](../../output/playwright/sec-2-isolated/before-staff-320.png) / [After](../../output/playwright/sec-2-isolated/after-staff-320.png) |

Native Chrome **200%**, viewport emulation disabled, passed both roles at **712×424 CSS px / DPR 2**. Search has **44-pixel** height and **3-pixel** focus. Coordinator modal reason focus, Escape and trigger restoration passed; Staff has no Defer control. Captures use the rendered viewport without resizing. Zoom returned to 100% and task browsers closed. [Desktop acceptance](../../output/sec-2-primary-20261027/browser-results/after-coordinator.json), [Staff](../../output/sec-2-primary-20261027/browser-results/after-staff.json), [native checks](../../output/sec-2-primary-20261027/native-acceptance.json), [native modal](../../output/playwright/sec-2-isolated/native-coordinator-modal.png). Existing pending/retry conventions retain their unit/integration coverage; no primary command or primary lost-response experiment occurred. Full AT/WCAG and office acceptance remain unverified.

## Primary preservation, cleanup and fallback

Both actual primary roles passed authenticated read/source/permission checks, Masterlist **Published v415 / 835** and read-only Individual Payments discovery of the **one deferred** scholar with `payable: false`. The 25 visible fingerprints and whole-1,835 scope hash match before/after reads. Four payment-summary hashes—two roles, two payrolls—match. Only login/logout POSTs were permitted by the primary HTTP helper. [Primary parity/revocation](../../output/sec-2-primary-20261027/http-after.json), [Masterlist/discovery](../../output/sec-2-primary-20261027/discovery-after.json).

The final complete comparison preserves all starting business values, schema/journal objects, application accounts/password hashes/roles, runtime grants and ledgers. This includes **1,835 scholars / 14 accounts / 1,835 annual records**, **3 Masterlists / 2,002 entries / 1,835 activations**, **1,000 entitlements / 1,000 allocations**, PAY-003's proposal/deferral history and every frozen/import/document/academic/prior-approval/reconciliation source. All **800 Paid records** remain exact: **two dated 24 October / 798 dated 26 October**.

All **20,291 original audit rows** match at full datetime precision. Two task logins/two logouts append four events. During final reporting, a **separate Coordinator logged in at 00:15:06.547 Philippine time on 28 October**; that exact audit append and session were retained. Final totals are **20,296 audits / 127 sessions**, from **20,291 / 124**. Both task logouts return **204** and subsequent saved-token probes **401**. No non-task business delta was found; the user's separate sessions were not targeted. This is qualified authentication activity, not zero database writes. The date rolled naturally to 28 October; PAY-003 retains its original whole-day rule and Draft v4, with no automatic financial transition. [Qualified intervening login](../../output/sec-2-primary-20261027/intervening-authentication.json), [full preservation](../../output/sec-2-primary-20261027/final-preservation.json), [final state](../../output/sec-2-primary-20261027/current-state.json).

All **1,392 starting files**, **310 retained distribution files**, **76 paused LAN-R2A artifacts** and **16 earlier ML-1 evidence files** remain exact. Eleven explicitly recorded BACKUP-1 restore targets are absent; their recorded retained definers and all SEC2 runtime accounts are absent. Normal regression helpers clean their own targets. Temporary listeners **3026 / 3027 / 3028 / 3337** are quiet. The blocked release, baseline and private evidence remain for review outside webroot. Raw task-owned CLI snapshots were placed under restricted evidence; shared screenshots are masked. [Delivery/cleanup](../../output/sec-2-primary-20261027/delivery.json), [retained files](../../output/sec-2-primary-20261027/retained-after.json), [private capture custody](../../output/sec-2-primary-20261027/private-captures.json).

No fallback was executed or required. The original accepted launcher/source/dependencies are still running. For any later authorized activation, first reverify current data/source/dependencies, take and completely restore a fresh checkpoint, establish quiescence, verify exact controller ownership and stop only that primary tree. A failed new release requires stopping only its verified dedicated tree, checking ports quiet and original source/config/dependency hashes, then starting the original `node scripts/localhost-5173-profile.mjs synthetic` from the workspace. Preserve all later data and retained processes. **Never restore this database checkpoint, delete history or replace shared dependencies as an application fallback.** The old runtime retains its known security findings and is not a patched release.

Review artifacts: [six-file hashes](../../output/sec-2-primary-20261027/isolation-files.json), [blocked-candidate patch](../../output/sec-2-primary-20261027/SEC_2_BLOCKED_CANDIDATE.patch), [source ZIP](../../output/sec-2-primary-20261027/candidate-source.zip), [blocked review build](../../output/sec-2-primary-20261027/blocked-review-build.zip), [independent byte-exact patch round trip](../../output/sec-2-primary-20261027/artifacts.json). Archives exclude private configuration, credentials, keys and records. They are **not install instructions or a complete operational LAN release**.

Final report verification found **90 existing local link targets**. Secret scans pass for **1,430 workspace** and **1,347 staged source/build files**. Helper issues are retained: an initial fixture driver referenced the wrong staging path; a cutoff helper used a Windows path instead of a file URL; a comparison helper had a syntax error; cleanup verification initially assumed the automatically removed restore account would retain a name. These were corrected without changing application safeguards or accepted financial assertions. Failed attempts were isolated, and owned targets were cleaned. The last freshness check correctly stopped on the separate Coordinator login; only its exact verified audit hash was qualified before repeating preservation successfully.

## Remaining approvals and stop

**Primary security activation remains NO-GO.** The smallest next package is a separately reviewed, dedicated-only correction of the five pre-existing identity/constraint inconsistencies and their affected lock graph. Do not simply relabel installed files or edit five version numbers while leaving incompatible dependency metadata. Use verified registry artifacts, preserve the exact intended security patches, produce a coherent reviewed manifest/lock and prove installation with an empty owned cache. Repeat real manifest/tree identity checks, both audits, 949 baseline tests, relevant integrations, FLOW-3 source/frozen parity and current preservation/recovery gates before reconsidering promotion. Do not alter the shared installation.

MariaDB **F54 compatibility remains blocked** exactly as established in SEC-1: the unchanged generated `graduation_monitoring_cases.scope_key` expression fails the genuine 11.4.13 logical restore with error **1901**, with SQL-mode-dependent expression warning **1105**. SEC-2 did not start that target, fix the expression, run migrations or upgrade XAMPP. Source lock wait remains **50 seconds**, packet limit **1 MiB**. A separately authorized schema compatibility/forward-migration or transfer design and complete target restoration/application/recovery acceptance are still required. Passing 10.4 synthetic tests does not establish 11.4 compatibility. [Retained F54 failure](../../output/sec-1-primary-20261027/target-restore-failure.json).

**Operational LAN pilot: NO-GO. Live finance: NO-GO.** Dependency identity/reproducibility, supported-database compatibility, same-account waits, contended-cohort reliability, complete target packaging/recovery, office source/forms/policy authority and witnessed acceptance remain separate gates. Existing Q28–Q31 policy boundaries remain. No office authority is inferred from the recorded synthetic cutoff rule or deadline extension. No load, cold-start, power-loss, off-host recovery or service-identity certification is supplied.

**Stopped after isolated implementation, tests, blocked-activation investigation, preservation and reporting. No primary runtime/security activation, payroll/payment command, schema/role/cutoff change, MariaDB upgrade, LAN-R2A resumption or operational LAN modification occurred.**
