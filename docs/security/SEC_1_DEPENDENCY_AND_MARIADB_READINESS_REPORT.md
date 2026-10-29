# SEC-1 — Dependency security and MariaDB readiness

27 October 2026, Philippine time. **Compatible dependency fixes are implemented and verified in isolated staging, with zero production/full npm audit findings. They are NOT installed on primary: its dependency directory is shared by retained servers, so the safe-maintenance gate is blocked. MariaDB 11.4.13 actually ran in isolation, but exact recovery failed on F54's generated column. Database migration readiness is NO-GO.** Primary remains on its accepted packages and MariaDB 10.4.32. No primary business command, schema change, runtime upgrade, operational LAN change or LAN-R2A resumption occurred.

This preserves [FLOW-3](../acceptance/FLOW_3_PAYROLL_FINALIZATION_RELIABILITY_REPORT.md), [FLOW-2](../acceptance/FLOW_2_FINAL_OFFICE_UAT_REPORT.md), [PAY-PERF-3](../requirements/PAY_PERF_3_PAYROLL_ASSESSMENT_OPTIMIZATION_REPORT.md), [PAY-NEW-4 recovery](../requirements/PAY_NEW_4_DEFERRED_RECOVERY_REPORT.md), [PAY-TIME-4](../requirements/PAY_TIME_4_PRIMARY_SYNTHETIC_ACTIVATION_REPORT.md), [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md) and the paused [LAN-R2 plan](../deployment/LAN_R2_RELEASE_PREPARATION_PLAN.md). AGENTS.md, security-best-practices, Playwright and the installed UI/UX checklist were applied. The security skill has general frontend/React guidance but no Fastify-specific backend reference; Fastify's security policy and release notes supplied framework-specific evidence. This is a dependency/runtime assessment, not a comprehensive penetration test.

## Verified primary and protected baseline

| Item | Fresh result, preserved through completion |
|---|---|
| Host / server | DESKTOP-BPLJKRP / 127.0.0.1:3306 / **10.4.32-MariaDB** |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Accepted synthetic launcher; loopback **5173 / API 3001** |
| Controller / API / Vite | **61556 / 29024 / 57228**, commands/ancestry unchanged; no restart |
| Schema | **150 tables / 67 migrations**, F57 installed; SQL hashes and applied timestamps exact |
| Official Batch 1 | `a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`, **Published v415 / 835 members / 167 retained removals** |
| PAY-001 | `608d5a04-34e1-4eeb-8c00-5fd40ad2d44b`, **Processed v805 / 800 Paid** |
| PAY-002 | `9cc2e740-061e-4667-98cc-bc1532032408`, **Processed v5 / 200 Pending** |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 proposal / frozen / allocations / payments | **834 / 0 / 0 / 0** |
| Legacy cutoffs | **21 / 23 / 27 October**, original whole-day semantics |
| Deadline / synthetic rule | **31 October / revision 3**; existing immutable five-time synthetic rule unchanged |
| Actual payments | **800 exact Paid rows: two dated 24 October, 798 dated 26 October** |
| Tools used | **Node 22.21.0 / npm 10.9.4 / mysql2 3.24.4**, unchanged |

No later primary business delta was found. All **1,390 accepted FLOW-3 inputs** matched their accepted hashes, including its service change and FLOW-2's test correction. A fresh checkpoint protects **1,391 current inputs**, including **310 retained distribution files**. Actual dirty source supplied `C:/xampp/htdocs/ldss_sec1_primary_stage_20261027` and a matching external baseline. Private configuration was excluded; staging has independent installed dependencies. Git HEAD and older builds/data were not substituted. [Inspection](../../output/sec-1-primary-20261027/inspection.json), [accepted-source parity](../../output/sec-1-primary-20261027/accepted-source-parity.json), [starting hashes](../../output/sec-1-primary-20261027/files-before.json).

Before dependency changes or migration tests, BACKUP-1 captured **99,328,134 SQL bytes / 22,627,813 encrypted bytes**, SHA-256 **`21fdf6e0083a8f14b2c1a15cd86ac2729425493d8cbb3e2cd0e874aad5318261`**. Complete isolated restoration on the existing runtime passed all 150 tables' full values/counts/checksums, 67-row journal, schema/indexes/FKs/checks/triggers, executable views and rejection probes. Initial restore took **10.741 seconds**; its target/account were removed. Nothing was restored over primary. Source-schema READ locks, restricted key/archive custody and existing **128 MiB SQL / 192 MiB decoded envelope / 96 MiB archive / 100,000 rows per table / 120-second tool** limits remain unchanged. This is local restoration evidence, not off-host recovery certification. [Recovery](../../output/sec-1-primary-20261027/recovery.json), [preflight](../../output/sec-1-primary-20261027/preflight.json).

## Dependency findings and disposition

Fresh commands were `npm audit --omit=dev --json`, `npm audit --json`, `npm outdated --json` and `npm ls --all --json`. Full outputs are ACL-restricted under task `private/`. Audit/outdated exit 1 denotes findings/updates; the original dependency tree exits 0.

| Tree | Production audit | Full audit |
|---|---|---|
| Starting installed primary | **3 affected entries: 1 high / 1 moderate / 1 low** | **9 affected entries: 2 critical / 3 high / 3 moderate / 1 low** |
| Final clean-installed candidate | **0** | **0** |
| Installed primary at stop | **Unchanged: 3** | **Unchanged: 9** |

Fresh final audits repeated both trees and confirmed these counts. [Final audit results](../../output/sec-1-primary-20261027/final-audits.json).

Nine package entries represent **16 unique GHSA advisories**, not nine independent exploits. Concurrently inherits shell-quote's finding. Audit severity does not establish LDSS exploitability. No advisory was suppressed. **Every advisory below is fixed in the isolated candidate and unresolved in installed primary pending safe dependency isolation.** Ranges below describe the installed branches; other affected branches are in the [complete disposition](../../output/sec-1-primary-20261027/advisory-disposition.json).

| Finding / severity | Installed package; relationship / exposure | Affected range → first patched version; candidate | Advisory / condition |
|---|---|---|---|
| S01 **Critical** | shell-quote **1.9.0**, inherited by direct concurrently **10.0.5**; transitive / dev | `>=1.8.4 <1.11.0` → **1.11.0**; **1.12.0** | [GHSA-pqg4-j6r4-53mv / CVE-2026-102422](https://github.com/advisories/GHSA-pqg4-j6r4-53mv): comment-token/line-terminator command injection |
| S02 **High** | zod **4.6.5**; direct / production and client build | `<4.6.6` → **4.6.6**; **4.6.6** | [GHSA-mrhx-c7xc-m3w5 / CVE-2023-54404](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): oversized constrained-collection memory exhaustion |
| S03 **High** | source-map-js **1.2.1**; transitive / dev | `>=1.0.0 <1.2.2` → **1.2.2**; **1.2.2** | [GHSA-68fv-2mgg-jv7q / CVE-2026-93749](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): indexed source-map event-loop DoS |
| S04 **High** | vite **8.3.1**; direct / dev server used on primary | `>=8.3.0 <=8.3.2` → **8.3.3**; **8.3.3** | [GHSA-587h-7wmj-h5pm / CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm): Windows editor-launch existence-check bypass |
| S05 **Moderate** | vite **8.3.1**; direct / dev server | Same Vite range → **8.3.3** | [GHSA-698v-4r3x-3vcv / CVE-2026-112943](https://github.com/advisories/GHSA-698v-4r3x-3vcv): Windows percent escaping |
| S06 **Moderate** | vite **8.3.1**; direct / dev server | Same Vite range → **8.3.3** | [GHSA-r825-w8mm-5pxw / CVE-2026-112944](https://github.com/advisories/GHSA-r825-w8mm-5pxw): editor CLI flag injection |
| S07 **Moderate** | vite **8.3.1**; direct / dev server | Same Vite range → **8.3.3** | [GHSA-rq7h-c2jc-7f22 / CVE-2026-112946](https://github.com/advisories/GHSA-rq7h-c2jc-7f22): non-Windows path/allowlist mismatch |
| S08 **Moderate** | vite **8.3.1**; direct / dev server | Same Vite range → **8.3.3** | [GHSA-vfpm-58rq-9qcg / CVE-2026-112947](https://github.com/advisories/GHSA-vfpm-58rq-9qcg): wasm request exposes four bytes outside filesystem boundary |
| S09 **Moderate** | @vitest/mocker **5.0.2**, direct vitest **5.0.2**; transitive + direct / dev | `>=5.0.0-beta.1 <5.0.3` → **5.0.3**; **5.0.5** | [GHSA-qxg6-89mg-rqv8 / CVE-2026-112949](https://github.com/advisories/GHSA-qxg6-89mg-rqv8): unauthenticated mock registration/code injection |
| S10 **Moderate** | @vitest/mocker **5.0.2**, direct vitest **5.0.2**; transitive + direct / dev | `>=5.0.0-rc.2 <5.0.3` → **5.0.3**; **5.0.5** | [GHSA-xp26-3454-mjgp / CVE-2026-112950](https://github.com/advisories/GHSA-xp26-3454-mjgp): Windows backslash mock-redirect traversal |
| S11 **Moderate** | fast-uri **3.1.8 / 4.2.1**; transitive / production | `>=3.0.0 <3.1.9`, `>=4.0.0 <4.2.3` → **3.1.9 / 4.2.3**, both installed in candidate | [GHSA-w74x-v6f9-j3xg / CVE-2026-110306](https://github.com/advisories/GHSA-w74x-v6f9-j3xg): encoded URI-scheme spoofing |
| S12 **Moderate** | fast-uri **3.1.8 / 4.2.1**; transitive / production | `>=3.1.3 <3.1.9`, `>=4.0.1 <4.2.3` → **3.1.9 / 4.2.3** | [GHSA-wjr9-j795-jxcr / CVE-2026-110180](https://github.com/advisories/GHSA-wjr9-j795-jxcr): host canonicalization confusion |
| S13 **Low** | fast-uri **3.1.8 / 4.2.1**; transitive / production | Same installed-branch ranges as S11 → **3.1.9 / 4.2.3** | [GHSA-xhq7-xmqj-769h / CVE-2026-110095](https://github.com/advisories/GHSA-xhq7-xmqj-769h): relative-reference normalization |
| S14 **Low** | fast-uri **3.1.8 / 4.2.1**; transitive / production | Same installed-branch ranges as S11 → **3.1.9 / 4.2.3** | [GHSA-333x-w4r6-6crp / CVE-2026-110725](https://github.com/advisories/GHSA-333x-w4r6-6crp): suffix colon injects scheme |
| S15 **Low** | fastify **5.12.5**; direct / production | `>=5.12.2 <5.12.6` → **5.12.6**; **5.12.6** | [GHSA-389g-gv7q-r4x8 / CVE-2026-107832](https://github.com/advisories/GHSA-389g-gv7q-r4x8): header propertyNames enum/const normalization |
| S16 **Low** | vite **8.3.1**; direct / dev server | Same Vite range → **8.3.3** | [GHSA-9jrq-w75r-8gcw / CVE-2026-112945](https://github.com/advisories/GHSA-9jrq-w75r-8gcw): cross-origin development-middleware script execution |

S01's potential impact is arbitrary shell-command execution when the required attacker-controlled token sequence reaches `quote()`. LDSS development commands are fixed scripts; that untrusted path was not demonstrated. Source-map-js is used by tooling; no uploaded LDSS document-to-source-map consumer path was found. The Vite listener is real and loopback-bound; Windows editor conditions are relevant, S07's non-Windows condition is not demonstrated on this host, and no exploit request was sent to primary. These observations do not waive any installed advisory.

Vitest is run as unit tooling; [vite.config.ts](../../vite.config.ts), lines 1–12, does not register a mocker/interceptor plugin. An exposed mock registration endpoint was not demonstrated. Both fast-uri branches exist through AJV/serialization dependencies; LDSS schemas are application-owned, and an untrusted schema/redirect authorization path was not found. No header `propertyNames` allow/deny schema was found for S15; origin/CSRF checks are explicit application comparisons. Zod is demonstrably used by actual request/financial validators. Existing HTTP/array bounds reduce exposure, but no production exhaustion attack was attempted. [Vendor advisory records](../../output/sec-1-primary-20261027/vendor-advisories.json), [initial command results](../../output/sec-1-primary-20261027/audit-command-results.json).

## Candidate implementation and contract acceptance

Only **two existing package files differ in staging**:

| Manifest entry | Installed → reviewed candidate |
|---|---|
| `dependencies.fastify` | `^5.12.5` → **`^5.12.6`**, locked 5.12.6 |
| `dependencies.zod` | `^4.6.5` → **`^4.6.6`**, locked 4.6.6 |
| `devDependencies.concurrently` | `^10.0.5` → **`^10.0.6`**, locked 10.0.6 |
| `devDependencies.vite` | `^8.3.1` → **`^8.3.3`**, locked 8.3.3 |
| `devDependencies.vitest` | `^5.0.2` → **`^5.0.5`**, locked 5.0.5 |
| `package-lock.json` | **17 package-node version changes**, including both fast-uri branches, source-map-js and concurrently's required shell-quote 1.12.0 |

No application major version was migrated. Vitest 5.0.5's required transitive development changes include obug 2→3, chai 6.3 and its pinned why-is-node-running 3.2.1; these were not independently forced into application runtime dependencies. Other direct packages, including React, mysql2, cookie/static plugins, ExcelJS, document/PDF libraries and TypeScript, retain their installed versions. Nonsecurity updates were not swept in. The ExcelJS/uuid override is unchanged. [Complete lock delta](../../output/sec-1-primary-20261027/lock-delta.json), [exact hashes](../../output/sec-1-primary-20261027/candidate-files.json).

[Fastify 5.12.6](https://github.com/fastify/fastify/releases/tag/v5.12.6), [Zod 4.6.6](https://github.com/colinhacks/zod/releases/tag/v4.6.6), [Vite 8.3.3](https://github.com/vitejs/vite/releases/tag/v8.3.3), [Vitest 5.0.5](https://github.com/vitest-dev/vitest/releases/tag/v5.0.5) and [concurrently 10.0.6](https://github.com/open-cli-tools/concurrently/releases/tag/v10.0.6) notes were reviewed. Vite includes the bundled editor fixes. Zod's note describes reverted compromised Git commits and states none reached npm; this task used npm artifacts/integrity, not that Git branch. Both fast-uri branch and source-map-js notes were also captured. [Release evidence](../../output/sec-1-primary-20261027/release-notes.json).

A fresh **`npm ci`** reproduced the candidate without changing manifest/lock hashes. `npm ls --all` and both final audits exit **0**. All 17 changed lock-node integrity strings match official npm metadata; npm's clean install verifies artifacts against lock integrities. This is not universal supply-chain attestation. No `audit fix --force`, peer-check bypass, suppression, timeout increase or permission change was used. [Reproducible install](../../output/sec-1-primary-20261027/reproducible-install.json), [registry integrity](../../output/sec-1-primary-20261027/registry-integrity.json).

Original/candidate Fastify parsers match for valid JSON, malformed JSON, `__proto__`, constructor-prototype input, oversized body and unsupported media type: **200 / 400 / 400 / 400 / 413 / 415**. Actual payment schemas retain decisions for duplicate/empty IDs, unsupported amount fields, invalid outcome/date combinations, future dates, 1,201 IDs, evidence bounds and receipt confirmation. Public `422 VALIDATION_FAILED` responses are exact. Zod now aborts an oversized array before a redundant custom refinement; internal issue lists differ intentionally while the operation stays rejected. No financial predicate was edited. [Parser/payment-schema parity](../../output/sec-1-primary-20261027/parser-validation-parity.json); [payment schema](../../server/payments/recording-model.ts), lines 6–19; [body limit](../../server/app.ts), line 147; [origin/CSRF](../../server/auth/routes.ts), lines 27–85.

| Validation on candidate / existing MariaDB | Result |
|---|---|
| Lint / typecheck / build / secrets | **All exit 0** |
| Unit tests, one worker | **137 files / 949 tests passed** |
| Existing financial/integration suites | **13 groups exit 0**: Masterlist drafts/workflow/amendments, academic/approved changes, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted, Recording, reconciliation, individual settlement, financial reports |
| Additional auth/RBAC/document/approval suites | **Four commands exit 0**: auth, RBAC, individual document workflow, PAY-NEW correction; its five ordered approval/publication/source/window groups pass |
| FLOW-3 current-copy matrix | **25 / 200 / 834 / 835**, each one **200**, one **409**, exact committed retry, one frozen roster, exact allocation count |
| Fault/authority drills | Staff denied; stale version/hash and changed identity rejected; late audit/ledger failures fully roll back; queued role revocation returns **403** |
| Deferred recovery on owned copy | **Six groups pass**: restore, review/return restriction, Staff denial, rollback, exact retry/key conflict, bounded discovery, finalized-source omission and unpaid individual route; all 800 original payments exact |
| Financial/source parity | Entire **6,733,274-byte** 834-person frozen snapshot equals accepted FLOW-3 byte-for-byte; original payment/official activation rows exact in each matrix copy |
| Roster response | Full DTO, full-scope source hash and first 25 fingerprints match original/patched on the same fresh copy |

Every mutation/failure/retry test used newly owned synthetic targets. The matrix discards a committed API result and repeats its exact body/key; it is not a newly simulated browser network loss. Financial suites retain HTML/Word/XLSX/PDF, original source pins and R01–R07 assertions. Existing application/tests/SQL are unchanged. The task-only deferred driver changes only its owned-runtime username-prefix check. [Final checks](../../output/sec-1-primary-20261027/checks-final.json), [unit log](../../output/sec-1-primary-20261027/unit-final.log), [13 results](../../output/sec-1-primary-20261027/regressions-all-latest.json), [four extra results](../../output/sec-1-primary-20261027/regressions-auth-rbac-requirements-pay-new-latest.json), [matrix](../../output/sec-1-primary-20261027/matrix-results.json), [negative acceptance](../../output/sec-1-primary-20261027/negative-acceptance.json), [deferred recovery](../../output/sec-1-primary-20261027/deferred-recovery.json), [frozen parity](../../output/sec-1-primary-20261027/financial-parity-834.json), [read parity](../../output/sec-1-primary-20261027/read-parity.json).

## Browser, startup and resource observations

Both roles passed existing-primary and staged-candidate checks at **1440 / 1024 / 820 / 375 / 320 CSS pixels**: paging/search, 25-row roster, exclusion counts, keyboard access and permitted Defer opening/cancellation retain their behavior. Primary browser guards recorded **zero business-command attempts**; exports were blocked during these checks. Candidate origin 3028 proxied only to its restricted owned API at 3026. No UI redesign or new action was introduced.

Both roles passed **native Chrome 200%**, viewport emulation disabled: **712×424 CSS pixels / DPR 2**. Search stays 44 px high with a 3 px focus outline; Coordinator modal focus/cancellation and Staff's missing unauthorized control pass. Direct rendered captures are masked, not resized. Zoom returned to 100%; only task browsers closed. This is focused acceptance, not full AT/WCAG certification. Narrow tables retain local horizontal scrolling and the existing long mobile roster height.

| Evidence | Original primary / isolated candidate |
|---|---|
| Coordinator desktop | [Before](../../output/playwright/sec-1-primary/before-coordinator-1440.png) / [Candidate](../../output/playwright/sec-1-primary/staged-coordinator-1440.png) |
| Coordinator 320 px | [Before](../../output/playwright/sec-1-primary/before-coordinator-320.png) / [Candidate](../../output/playwright/sec-1-primary/staged-coordinator-320.png) |
| Staff desktop | [Before](../../output/playwright/sec-1-primary/before-staff-1440.png) / [Candidate](../../output/playwright/sec-1-primary/staged-staff-1440.png) |
| Staff 320 px | [Before](../../output/playwright/sec-1-primary/before-staff-320.png) / [Candidate](../../output/playwright/sec-1-primary/staged-staff-320.png) |
| Native candidate 200% | [Coordinator modal](../../output/playwright/sec-1-primary/native-coordinator-modal.png) / [Staff search](../../output/playwright/sec-1-primary/native-staff-search.png) |

These compare environments, not a claimed primary installation. All five widths are retained. [Primary Coordinator](../../output/sec-1-primary-20261027/browser-results/before-coordinator.json), [primary Staff](../../output/sec-1-primary-20261027/browser-results/before-staff.json), [candidate Coordinator](../../output/sec-1-primary-20261027/browser-results/staged-coordinator.json), [candidate Staff](../../output/sec-1-primary-20261027/browser-results/staged-staff.json), [native Coordinator](../../output/sec-1-primary-20261027/browser-results/native-coordinator.json), [native Staff](../../output/sec-1-primary-20261027/browser-results/native-staff.json).

Single original/patched owned-server observations: startup/readiness **10.576 / 1.746 s**; 25-row roster **19.417 / 14.823 s**, both **106,688 bytes**; `/auth/me` **5.59 / 5.77 ms**. Baseline transpilation was cold and contention differed; these do **not** establish a dependency performance improvement. Staged browser first-roster readiness was **10.885 s Coordinator / 9.915 s Staff**; primary pre-change samples were **21.175 / 12.438 s**. These are not matched latency benchmarks. [Original reads](../../output/sec-1-primary-20261027/read-before.json), [patched reads](../../output/sec-1-primary-20261027/read-after.json), [original startup](../../output/sec-1-primary-20261027/server-before.json), [patched startup](../../output/sec-1-primary-20261027/server-after.json).

| Cohort | Winner / losing 409, seconds | Winning guard hold | Winning SQL calls | Observed process peak RSS |
|---|---:|---:|---:|---:|
| 25 | 20.913 / 47.397 | 20.899 s | 14,299 | 804 MiB |
| 200 | 19.543 / 33.358 | 19.528 s | 15,988 | 1,098 MiB |
| 834 | 29.381 / 51.733 | 29.341 s | 22,444 | 1,046 MiB |
| 835 | 23.129 / 53.814 | 23.095 s | 22,450 | 796 MiB |

Queries, transaction validation and locks remain as accepted FLOW-3. **Same-account authentication still waited 21.623 seconds** in the 835 test, returning 200; it remains beyond the browser's ordinary 15-second read timeout. Unrelated Staff probes stayed 200; observed maxima for the 834/835 sequences were 35.0 / 15.7 ms. This does not resolve that wait, certify worst-case memory or establish office capacity. [Measured matrix](../../output/sec-1-primary-20261027/performance-summary.json).

All **291 compiled server files**, including 288 JavaScript files, match the accepted FLOW-3 build. Client output has 18 files on each side, with changed bundle hashes/index references; CSS/fonts are unchanged. Whole-client bytes **1,572,104 → 1,572,271 (+167)**, including HTML/assets. This is an asset inventory, not a speed claim. All 310 installed retained distribution files remain exact. [Build comparison](../../output/sec-1-primary-20261027/build-verification.json).

## Supported MariaDB selection and failed genuine rehearsal

**S17 — High deployment risk: the installed 10.4 series ended Community maintenance on 18 June 2024.** Selected rehearsal target: **MariaDB Community 11.4.13 Windows x64**, GA **24 August 2026**, with 11.4 Community maintenance through **29 May 2029**. Selection favors an available mature Windows LTS with a longer Community horizon than 11.8; it is not a support subscription or operational approval. [Official maintenance table](https://mariadb.org/about/#maintenance-policy), [11.4.13 release notes](https://mariadb.com/docs/release-notes/community-server/11.4/11.4.13).

The vendor Windows ZIP was actually downloaded and its published SHA-256 verified: **95,024,126 bytes**, **`d62986d433eeebfde218560b276103831604a61e929e87f1a17f5aebd80257e2`**. It ran at **127.0.0.1:3337**, server ID **313337**, with **`C:/xampp/htdocs/ldss_sec1_mariadb_20261027/data/`**, independent configuration/process/root credential/disposable restore accounts. No primary files or system grant tables were copied. No Windows service was installed or modified; the portable process used the task OS operator. Dedicated operational OS service identity/hardening was not rehearsed. [Vendor ZIP instructions](https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/installing-mariadb-windows-zip-packages), [download proof](../../output/sec-1-primary-20261027/runtime-download.json), [actual runtime](../../output/sec-1-primary-20261027/runtime-start.json).

The attempted route was **logical application-schema restore into newly initialized target system tables**, not in-place XAMPP upgrade or shared-datadir reuse. MariaDB documents cross-version logical transfer subject to SQL compatibility. No intermediate physical-upgrade route was assumed/executed. [Vendor logical backup guidance](https://mariadb.com/docs/server/server-usage/backup-and-restore/backup-and-restore-overview).

**S18 — Blocking compatibility finding:** unchanged BACKUP-1 restoration into 11.4.13 failed at dump line 919 while creating `graduation_monitoring_cases`:

```sql
scope_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
  GENERATED ALWAYS AS
  (COALESCE(semester_id,'00000000-0000-0000-0000-000000000000')) STORED
```

The target returns **1901**, followed by **1105: expression depends on `PAD_CHAR_TO_FULL_LENGTH`**. An independent probe reproduces it. The expression originates in [F54](../../db/migrations/20261024020000_f54_graduation_monitoring.sql), line 35. MariaDB rejects stored/indexed generated expressions whose values depend on SQL mode; permissive 10.4 behavior does not establish 11.4 compatibility. [Vendor generated-column rules](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns), [exact probe/warning](../../output/sec-1-primary-20261027/target-runtime-probes.json).

The unchanged helper initially withheld raw SQL/errors. A task-local diagnostic copy retained stderr privately without changing timeout, limits, import, inventory, rejection assertions or cleanup. The second attempt identified the same failure; both failed targets/accounts were removed. It failed in about **2.96 seconds**, so there is no successful target migration duration. No SQL rewrite, `--force`, skipped constraint, relaxed comparison, edited applied migration or primary schema repair was used.

| Target-runtime check | Actual result |
|---|---|
| Vendor binary / independent listener / mysql2 protocol | **Passed**; actual server reports 11.4.13 |
| Exact 150-table recovery / 67-row journal / full financial-source equivalence | **FAILED / NOT VERIFIED**, stopped at F54 DDL |
| Standalone types/constraints/transactions | **Passed** in tiny fictional schemas: utf8mb4, exact DECIMAL string, DATETIME(6), unique/FK/check rejection, rollback |
| Standalone locking | **1205** at deliberately lowered one-second session wait; opposing updates produce one **1213** deadlock victim, both rolled back |
| Full LDSS target auth/import/Masterlist/academic/payroll/payment/deferred/reconciliation/export/cutoff suites | **BLOCKED / NOT RUN** because exact schema could not restore |
| FLOW-3 finalization / application idempotency on 11.4 | **NOT TESTED**; passing matrix above used 10.4.32 |
| Target backup → target restore round trip | **NOT TESTED** on a complete LDSS database; original target import is blocked |

[Type/constraint probes](../../output/sec-1-primary-20261027/target-runtime-probes.json), [deadlock probe](../../output/sec-1-primary-20261027/target-deadlock.json), [restore failure](../../output/sec-1-primary-20261027/target-restore-failure.json). Unchanged [mysql2 documentation](https://sidorares.github.io/node-mysql2/docs/documentation) includes MariaDB types/exact DECIMAL behavior; small probes do not substitute for application certification.

Target settings matched source **utf8mb4 / utf8mb4_general_ci**, **REPEATABLE-READ**, observed SQL mode, **50-second** lock wait and **1 MiB** packet limit. Application schema collations were carried by the unchanged dump. Target server timezone was explicitly UTC; LDSS sets connection UTC. Source reports `SYSTEM / Asia/Singapore`; neither it nor workstation time changed. Stored Manila cutoff evidence was not reinterpreted. InnoDB was retained. Complete target trigger/view/index/FK/check definitions and payment/date equivalence stay blocked, rather than inferred from a probe. Modern `mariadb-dump` also introduces sandbox/client-version considerations: future packaging must pair tested clients and repeat BACKUP-1 capture/restoration. [Source settings](../../output/sec-1-primary-20261027/runtime-source.json), [vendor client compatibility note](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump).

## Primary promotion blocker, artifacts and next authorized work

**S19 — Installation boundary:** three retained processes—**32096 / 34360 / 28956**—execute existing workspace scripts importing its shared server modules/dependencies. Replacing `scholar_monitor/node_modules` is not confined to the accepted 5173 tree. Loaded modules and later lazy resolutions can differ; unchanged listener PIDs would not prove those environments unchanged. SEC-1 does not authorize reconfiguring/restarting unrelated environments. **The dependency candidate remains staged.** No root manifest/lock, installed packages, accepted launcher or distribution was replaced. [Concrete import/process evidence](../../output/sec-1-primary-20261027/retained-dependency-boundary.json).

The smallest next application package is a reviewed **dedicated dependency/runtime location for primary synthetic UAT**, retaining exact database/grants/flags/readiness, or separately authorized coordinated shared-tree maintenance with retained-environment acceptance. After that boundary is established, repeat current-source comparison, fresh encrypted checkpoint plus full isolated restoration, quiescence, approved maintenance, matching API/UI activation, both-role reads, audits and financial preservation. Do not restore this checkpoint over later activity. These patches require no new financial writer or policy change.

Database advancement needs a **separately reviewed schema compatibility/migration package**. Determine a deterministic F54 expression; prove NULL/UUID values, unique/index semantics and sources unchanged. Explicit trim/cast is a proposal, not approved SQL. Check all other generated expressions; F54 was the first failure, not an exhaustive verdict. Preserve all 67 immutable applied SQL files/hashes; use an approved forward migration and/or versioned bootstrap/logical-transfer adapter. Repeat all 150-table comparisons and complete target suites before any upgrade decision. Operational service identity, security layout, target recovery/rollback and maintenance authority remain separate.

Executable rehearsal tooling is retained under `output/sec-1-primary-20261027/`: `runtime-start.mjs`, `target-restore.mjs`, `target-probes.mjs`, `target-deadlock.mjs` and `target-stop.mjs`. It pins the synthetic source/owned port and uses private credentials, never a primary restore target. Startup is a **first-run initializer**, not an instruction to overwrite its retained datadir. A repeat requires newly inventoried owned directory/port/account names; unchanged `target-restore.mjs` will continue rejecting the current F54 dump. After approved schema compatibility, require successful full restore before running regression children with the isolated port/admin/runtime credentials. No generic `npm run dev`, primary `db:migrate`, service replacement or copying of system tables belongs in this procedure.

Review artifacts: [two-file hashes](../../output/sec-1-primary-20261027/candidate-files.json), [manifest/lock patch](../../output/sec-1-primary-20261027/SEC_1_DEPENDENCY_CANDIDATE.patch), [source ZIP](../../output/sec-1-primary-20261027/candidate-source.zip), [compatible review build](../../output/sec-1-primary-20261027/compatible-review-build.zip), [artifact checks](../../output/sec-1-primary-20261027/artifacts.json). Independent exact-byte apply round trip passes against the saved dirty baseline. Archives exclude `.env`, credentials, keys, backups and records. The build lacks installed runtime, approved configuration and operational acceptance; it is not a complete LAN release. No primary rollback is needed because nothing was installed. No database restore/downgrade/history deletion is appropriate for this package.

Exact existing-file changes: **zero on primary; two in isolated candidate (`package.json`, `package-lock.json`)**. This report and task-local audit/rehearsal/test/evidence files are additions. No application source, financial predicate, output builder, permission, migration, existing regression, configuration, flag or launcher changed. Temporary staging Vite configuration and copied test driver were never installed. [Source boundary](../../output/sec-1-primary-20261027/source-boundary.json), [exact task-helper inventory](../../output/sec-1-primary-20261027/helper-files.json).

## Preservation, limitations and stop

Final comparison preserves every starting business value/count, schema object, migration row/timestamp, account/password/role, runtime grant, original ledger and original audit. This covers **1,835 scholars / 14 accounts / 1,835 annual-intake-academic records**, **three Masterlists / 2,002 entries / 1,835 activations**, frozen payrolls, imports/documents/approvals, entitlements/allocations, payment dates, reconciliation, deferrals and immutable cutoff policy. Both roles' four payment-summary hashes, PAY-003 scope hash and first-page fingerprints are exact before/after. **All 800 Paid records retain complete original evidence.**

All **20,287 starting audits** remain exact at full datetime precision. Only **two task logins and two logouts** append: **20,291 total**, sessions **122→124**, with ordinary last-seen/revocation/rate-limit activity. No non-task business delta was found. Logouts returned **204**, saved original cookies subsequently **401**; the user's separate session was not targeted. This is qualified authentication activity, not zero database writes. [Final preservation](../../output/sec-1-primary-20261027/final-preservation.json), [both-role parity/revocation](../../output/sec-1-primary-20261027/http-after.json), [current state](../../output/sec-1-primary-20261027/current-state.json).

All **1,391 starting inputs / 310 retained distribution files**, **76 paused LAN-R2A artifacts / 16 earlier ML-1 files** remain exact. Primary/retained listener owners and ancestry are unchanged; readiness is 200. Five task-owned restored synthetic copies and their explicitly owned runtime/definer accounts were removed. Initial recovery was automatically removed; failed 11.4 targets and standalone probe schemas/accounts are absent. Temporary listeners **3026 / 3028 / 3337** stopped. After shutdown, the owned portable installation was moved outside webroot to **`C:/Users/ADMIN/.codex/ldss-rehearsals/sec-1-20261027`**, with restricted ACLs; the recorded execution path above is historical. Its configuration retains the old execution paths and is not a ready-to-restart service. A repeat requires fresh reviewed paths/configuration. This is not an exhaustive retained/operational database inventory. [Delivery](../../output/sec-1-primary-20261027/delivery.json), [explicit five-target/port verification](../../output/sec-1-primary-20261027/cleanup-verification.json), [browser-copy cleanup](../../output/sec-1-primary-20261027/cleanup-browser.json), [target cleanup](../../output/sec-1-primary-20261027/target-cleanup.json).

Exploratory issues are qualified: initial broad resolution was replaced by the smaller candidate; npm 10.9.4's optional-peer resolver failed for Vitest 5.0.3, so compatible 5.0.5 resolved without bypass flags. An exploratory module directory inside staging made lint inspect dependency configs; moving that owned directory out restored normal lint. The internal-Zod-error oracle was too broad; final checks assert the expected diagnostic change and identical public financial rejection. A browser sample preceded animation-frame focus handoff; final checks wait for actual focus. Native settings required a persistent task profile. A text-normalized patch failed on lockfile line endings; the final binary-aware Git patch and exact round trip pass. Source checks distinguish rebuilt staging distribution from untouched installed distribution. A read-only cleanup helper initially used a reserved SQL alias; corrected aliases passed exact absence checks. No financial assertion, safeguard or recovery bound was weakened.

**Remaining installed security findings: 3 production / 9 total package entries, plus unsupported MariaDB 10.4.** Clean candidate audits are not deployment approval. Same-account auth waiting, large-assessment latency/memory, complete target-schema/application/recovery compatibility, off-host recovery, Windows/service/Node binary hardening and office policy gates remain open. No broad major dependency migration was required. Deprecated transitives and non-npm platform components are not certified secure by an empty audit.

**Restricted operational LAN pilot: NO-GO. Live finance: NO-GO.** Complete packaging, isolated dependencies, reviewed schema compatibility, target recovery, server-side pilot controls and documented office authority remain prerequisites. LAN-R2A stays paused.

**Stopped after staged dependency remediation, genuine failed supported-runtime rehearsal, isolated regressions, preservation and reporting. No primary dependency installation, MariaDB/XAMPP upgrade, schema/role/cutoff change, payroll/payment command or operational LAN modification occurred.**
