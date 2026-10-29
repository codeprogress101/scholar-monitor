# PAY-PERF-3 — Payroll roster and preview assessment optimization

27 October 2026, Philippine time. **Installed and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#payouts). Source-equivalent read optimizations reduce warm isolated-copy medians from 11.51→8.80 seconds for the included roster, 10.72→9.06 seconds for HTML and 11.94→9.93 seconds for Word. The five-second target is not met.** Actual primary document loading remains slower than these injected API measurements.

**PAY-003 remains Draft v4: 834 included, one deferred, 1,000 blocked and zero awaiting review. All 800 Paid records and dates remain exact.** No primary preparation, review, finalization, deferral/restoration, processing, payment, deadline or policy command was submitted. One actual draft preview generated its expected export audit. LAN-R2A remains paused.

This preserves accepted [PAY-PERF-2](PAY_PERF_2_PAYROLL_LOADING_REPORT.md), [PAY-FLOW-2](PAY_FLOW_2_FINALIZATION_AND_PROGRESS_REPORT.md), PAY-UX-2, [PAY-TIME-4](PAY_TIME_4_PRIMARY_SYNTHETIC_ACTIVATION_REPORT.md), [PAY-NEW-4 recovery](PAY_NEW_4_DEFERRED_RECOVERY_REPORT.md) and [BACKUP-1](../deployment/BACKUP_1_RECOVERY_CAPACITY_REPORT.md). The historical financial-report race is classified below; its fixture assertion remains unchanged and must not be called fixed merely because normal regressions passed.

## Current primary and recovery

| Item | Fresh verification |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic, loopback 5173 / 3001 |
| Controller / API / Vite | **55820 / 60856 / 60368 → 64684 / 9520 / 63928** |
| Schema | **150 tables / 67 migrations**, including F57; original SQL checksums and applied timestamps exact |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft / revision 4** |
| PAY-003 evidence | **834 active proposed entries; zero finalizations, allocations or payments**; original deferral and command evidence exact |
| Period | TWO-BATCH-YEAR / TWO-FIRST; TWO-BATCH-CYCLE, open v2 |
| Existing financial batches | PAY-001 processed **v805 / 800 Paid**; PAY-002 processed **v5 / 200 Pending** |
| Official Batch 1 | Published **v415 / 835 active members**, with 167 retained removals |
| Cutoffs | PAY-001 **21 October**, PAY-002 **23 October**, PAY-003 **27 October** retain whole-day semantics |
| Recorded configuration | Final deadline **31 October / revision 3**; immutable synthetic timed-cutoff rule **revision 1** unchanged |

The timed rule retains its five Asia/Manila choices—12:00, 15:00, 17:00 default, 19:00 and 23:59—and its original authority/source evidence. This performance task supplies no new office-policy approval. No intervening primary business delta was found. [Inspection](../../output/pay-perf-3-primary-20261027/inspection.json), [final current-state read](../../output/pay-perf-3-primary-20261027/current-state.json).

Staging at `C:/xampp/htdocs/ldss_payperf3_primary_stage_20261027` used the actual dirty workspace. **1,388 starting inputs** were protected; neither Git HEAD nor an older distribution replaced accepted source. Private configuration was excluded from staging. All **310 retained distribution files** remain exact.

| Fresh BACKUP-1 checkpoint | Raw SQL / encrypted bytes | Result |
|---|---:|---|
| Before source changes and fixture mutations | **99,320,438 / 22,626,069** | Complete isolated restoration passed |
| Before installation, primary ports quiet | **99,321,356 / 22,626,507** | Complete isolated restoration passed |

Both recoveries verified every table's complete values/counts/checksums, migration journal, schema inventory, indexes, constraints, triggers, executable views and rejection probes. Owned recovery targets/accounts were removed. Nothing was restored over primary. Existing encrypted format, finite BACKUP-1 limits, key custody and source-schema READ-lock behavior remain. The quiet archive SHA-256 is `e7554edbdac67c90153796555deba7d7d2094a9b980327f25b1aeff81202ef00`. Distinct snapshots are not claimed to have identical SQL hashes. [Preflight](../../output/pay-perf-3-primary-20261027/preflight.json), [initial recovery](../../output/pay-perf-3-primary-20261027/recovery.json), [quiet recovery](../../output/pay-perf-3-primary-20261027/activation-recovery.json).

Only the freshly reverified primary controller tree was stopped. Source/business gates and two write-quiescence samples preceded maintenance. Matching files were installed while 3001/5173 were quiet, then started through the unchanged `node scripts/localhost-5173-profile.mjs synthetic` launcher. Both readiness checks return 200. No development watcher, migration, environment rewrite or readiness bypass was used. [Maintenance](../../output/pay-perf-3-primary-20261027/maintenance.json), [installed hashes](../../output/pay-perf-3-primary-20261027/promoted-files.json), [startup](../../output/pay-perf-3-primary-20261027/startup.json).

## Verified bottlenecks and correction

The normal roster already returns 25 rows. It still needs all **1,835** authoritative assessments to supply complete counts and the current source hash. Search and paging therefore repeat full server assessment; moving pagination ahead of validation would change this contract. No such shortcut or cross-request eligibility cache was introduced.

Two measured costs were addressed:

1. **Empty owner/document chunk combinations.** Two compound coverage reads expanded the owner and document key sets into a Cartesian sequence. On this copy, their **380** calls become **38** nonempty original reads plus **20** bounded pair-index reads. The pair index includes malformed/cross-owner relationships too; it skips only combinations proven empty in the same consistent snapshot. Original predicates, ordering and per-key limits still select the returned rows. Each metadata query has at most 200 owner keys; metadata exceeding **20,000 decoded rows** discards the optimization and falls back to the complete original query sequence. It never truncates financial evidence.
2. **Repeated raw-row copying.** Nested caches and the batching adapter cloned intermediate row collections before the final caller boundary. Internal handoff now avoids those intermediate copies; metadata removal copies its row first. Public results remain independent. Proven flat scalar/date rows use an independent row/date copy; nested, aliased and unusual values retain `structuredClone`. Existing raw/derived cache limits and write invalidation remain.

**Empty-combination skipping is restricted to actual read-only snapshot adapters**, identified internally through their cache chain. A client cannot enable it. Financial commands retain their original assessment query/lock sequence. An independent, separate-process writable-path comparison matched **all 13,874 query/execute calls**, their bindings and order, including **8,138 statements with locking clauses**, and every candidate/form value. This is a guarded assessment trace, not a claim that every statement of every financial command was newly profiled. [Writable-path parity](../../output/pay-perf-3-primary-20261027/write-lock-parity.json).

The remaining **1,838 live semester-clock reads** are preserved. They are not cached across a cutoff/day boundary. Complete source construction, approval/publication proofs and financial reservations remain significant work. Adopting a different assessment-clock contract or a shared mutable assessment cache would require separate correctness review. Word's unchanged builder also retains a roughly one-second synchronous phase. No index migration, query hint, timeout increase or financial-lock removal was installed.

## Comparable performance observations

Final series use the same newly owned restored data, source versions, request order and bounded API contracts, in separate Node processes. Regression jobs and task browsers were stopped during each final series. Checks ran between series; database buffers, optimizer state and garbage collection were not forced equal. These are repeatable local observations, not an office capacity benchmark or latency SLA.

The table reports medians of **two warm roster** and **three warm HTML/Word** requests. Fastify injection includes authentication, serialization and the existing export audit, but excludes network transfer/browser rendering. Instrumentation adds overhead. SQL milliseconds are driver-observed roundtrip/decode time, not isolated database CPU; application CPU is measured separately and cannot simply be subtracted from wall time.

| Read | API seconds before → after | Query/execute calls | SQL roundtrip seconds | Application CPU seconds |
|---|---:|---:|---:|---:|
| Included, 25 of 834 | **11.51 → 8.80** | **3,261 → 2,939** | **5.10 → 4.03** | **8.59 → 6.46** |
| Draft HTML, 834 rows | **10.72 → 9.06** | **3,263 → 2,941** | **4.94 → 4.17** | **7.27 → 5.97** |
| Draft Word, 834 rows | **11.94 → 9.93** | **3,263 → 2,941** | **4.96 → 4.11** | **9.35 → 7.61** |

Transaction-method controls add **7** statements to roster samples and **9** to exports on both versions: total observed statements are **3,268→2,946** and **3,272→2,950**. Query-count reduction and user-visible latency are distinct measurements.

| Additional path | Before seconds | After seconds | Response bytes |
|---|---|---|---:|
| Included page 2 | **12.10 / 10.80** | **9.78 / 9.96** | **106,835** |
| Submitted scholar-ID search | **10.96 / 11.29** | **9.31 / 9.88** | **106,688** |
| Excluded/deferred review | **10.81 / 10.53** | **8.63 / 9.33** | **157,243** |

The first page-2 sample is that process's first assessment. The main first-assessment observations are **12.04→10.39 seconds**; these are not physical cold-database measurements. True cold-start acceptance remains unverified.

The included response remains **106,688 bytes / 25 rows**. HTML remains **4,757,830 bytes**; Word is **184,743–184,744 bytes** in the final series. Pair metadata increases decoded raw data from **72,818,995→73,757,851 bytes** for a page, a deliberate tradeoff for fewer roundtrips. Maximum sampled process RSS over the ordered main series is approximately **1,277→1,134 MiB**. RSS includes preceding allocations/instrumentation; 20 ms sampling can miss synchronous peaks. This does not establish a memory ceiling. [Complete measurement summary](../../output/pay-perf-3-primary-20261027/performance-summary.json).

Concurrent owned-copy probes sampled throughout HTML and Word generation. All authentication and independent payout-period reads returned **200**. Revised maximum injected `/auth/me` times were **20.8 ms during HTML / 30.1 ms during Word**; independent-period reads reached **85.4 / 85.9 ms**. However, Word event-loop delay still reached **1.28 seconds**, with delayed probe scheduling. Small injected request durations do not mean the Node event loop was continuously available. Read-only snapshot assessment, post-read authorization and the separate fresh export-audit guard are preserved.

Actual primary readiness was **12.04 seconds Coordinator / 12.97 seconds Staff**, with one initial candidate request each. Observed response-to-first-row readiness was **343 / 322 ms**, including automation observation overhead. Earlier browser baselines were **15.56 / 17.58 seconds** under other verification work; they do not establish a matched browser speedup.

The actual primary HTML document returned **200**, all **834 students / 42 pages / 13,137 DOM nodes**, with 42 **DRAFT — NOT FOR PAYMENT** marks. Navigation load was **14.32 seconds**: response started at **14.109 seconds**, transfer took approximately **146.5 ms**, and DOM interactive followed response completion by approximately **60 ms**. Server assessment remains dominant. This was one audited export, not a write-free GET or financial command. [Primary preview](../../output/pay-perf-3-primary-20261027/browser-results/primary-preview.json), [masked capture](../../output/playwright/pay-perf-3-primary/primary-preview.png).

## Exact source, output and regression acceptance

Independent accepted-source comparisons pass for explicitly selected **25**, **835** and complete **1,835** assessment scopes. Every candidate field, classification, inclusion/exclusion, deferral, reason, source fingerprint, reference, roster ordering and form value matches. Historical PAY-001's 1,835-record projection and PAY-002's 200-record projection also match. Changed identity, academic placement and receipt probes reject identically; their source changes were restored on the owned copy. Final actual Staff/Coordinator DTOs match the accepted baseline. [Source parity](../../output/pay-perf-3-primary-20261027/source-parity.json), [actual primary parity](../../output/pay-perf-3-primary-20261027/primary-oracles.json).

HTML bytes and Word document XML match exactly. All **23 Word ZIP members** match across corresponding samples, normalizing only the generated `dcterms:created` and `dcterms:modified` values in core properties. Headers, footers, images, styles, numbering, relationships, financial values and signatories remain exact. ZIP container timestamps/compression are not asserted byte-identical. Renderers/templates are unchanged. [Document equivalence](../../output/pay-perf-3-primary-20261027/document-parity.json).

| Final validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0** on final matching staging |
| Unit tests | **137 files / 949 tests passed**, one worker |
| Existing disposable regressions | **13 groups exit 0**: Masterlist drafts/workflow/amendments; academic/approved changes; notifications; Registry/eligibility/main payroll/Treasury; intake/import/receiving; historical/omitted; Recording; reconciliation; individual settlement; financial reports |
| Fresh independent cohorts | **25 and 835 people**, five correction/workflow groups each: original approval/publication sources, negative evidence, roles, new windows, retry and rollback |
| Deferred recovery | **Six groups passed**: original restoration/Review-return restrictions, Staff denial, late-audit rollback, durable exact retry, changed-input rejection, bounded discovery and separate finalized-source OR + DV route |
| Cutoff and receipt uncertainty | Current five-time rule and original whole-day windows preserved; roles, stale rule, invalid time, exact retry and microsecond boundary checked; date-only same-day receiving remains unconfirmed |
| Export guards | Deliberate audit failure prevents delivery; mid-snapshot permission revocation returns **403 PERMISSION_CHANGED** without an export audit; restored role/business/schema data exact |

The cutoff drill deliberately retains the Draft-state guard after the boundary; it does not claim a finalized timed batch. Existing financial suites exercise finalization, duplicate reservations, retries, rollback and outputs. No financial pin or validator was relaxed. All mutations, source faults, concurrency and interrupted-read tests used newly owned synthetic targets. [Normal commands](../../output/pay-perf-3-primary-20261027/checks-main.json), [unit log](../../output/pay-perf-3-primary-20261027/unit-final.log), [13 exact commands/exits](../../output/pay-perf-3-primary-20261027/regressions-all-latest.json), [cohorts](../../output/pay-perf-3-primary-20261027/additional-cohorts.json), [deferred drill](../../output/pay-perf-3-primary-20261027/deferred-integration.json), [cutoff drill](../../output/pay-perf-3-primary-20261027/cutoff-integration.json), [export guards](../../output/pay-perf-3-primary-20261027/export-guards.json).

### Financial-report race finding

The original concurrent closure/correction test permits either serialized winner. A task-local fixture copy forced both legal orders while retaining the original assertions:

| Order | Race result | Final canonical state / original assertion |
|---|---|---|
| Closure first | Closure **200**, competing correction **409** | One Paid witness remains; suite exits **0** |
| Correction first | Closure **409**, correction **200**; fresh verified closure succeeds | A later report-export probe changes the other Paid outcome back to Unclaimed; **zero canonical Paid outcomes** remain; `assert.ok(paidIdentity)` exits **1** |

Original payment rows—including the original Paid row—remain intact. The original/updated report, source-change export rejection and reconciliation assertions pass before that final assertion. The defect is an **incorrect fixture precondition after legitimate competing transaction ordering**, not evidence that a committed payment row disappeared. Both effective outcomes may legally be Unclaimed in this fictional scenario.

Production financial semantics and the existing regression files remain unchanged. The unmodified financial-report suite passed, but that is not resolution of the intermittent assertion. Minimum separate test remediation is to establish an independent canonical Paid witness immediately before its positive duplicate-claim test, or move that test before intentionally removing the last witness, while retaining both ordering cases and original-history assertions. [Controlled reproduction commands/results](../../output/pay-perf-3-primary-20261027/race-results.json), [correction-first failure](../../output/pay-perf-3-primary-20261027/race-correction.log).

## Interface preservation and screenshots

**No frontend file changed; client assets remain byte-identical at 1,561,059 bytes.** The included roster, 25-row server pagination, Search, five skeleton rows, spinners, unconfirmed-summary label, Retry, focused Defer modal and PAY-UX-2 recovery conventions remain. Read loading does not open a blocking command dialog. Owned-browser delay/abort tests preserve keyboard Retry and reduced motion; a genuine logout produces 401 and sign-in. [Read/expiry acceptance](../../output/pay-perf-3-primary-20261027/browser-results/browser-faults.json).

The ui-ux-pro-max existing-interface checklist and focused loading-feedback guidance were applied with Playwright. Both primary roles passed **1440 / 1024 / 820 / 375 / 320 CSS px**, 900 high, without page overflow. Tables scroll locally. Search remains 44 pixels high; search, pagination, empty results, excluded counts and Coordinator modal cancellation/focus passed. These are preservation captures, not a redesign.

| Width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-perf-3-primary/before-coordinator-1440.png) / [After](../../output/playwright/pay-perf-3-primary/after-coordinator-1440.png) | [Before](../../output/playwright/pay-perf-3-primary/before-staff-1440.png) / [After](../../output/playwright/pay-perf-3-primary/after-staff-1440.png) |
| 1024 | [Before](../../output/playwright/pay-perf-3-primary/before-coordinator-1024.png) / [After](../../output/playwright/pay-perf-3-primary/after-coordinator-1024.png) | [Before](../../output/playwright/pay-perf-3-primary/before-staff-1024.png) / [After](../../output/playwright/pay-perf-3-primary/after-staff-1024.png) |
| 820 | [Before](../../output/playwright/pay-perf-3-primary/before-coordinator-820.png) / [After](../../output/playwright/pay-perf-3-primary/after-coordinator-820.png) | [Before](../../output/playwright/pay-perf-3-primary/before-staff-820.png) / [After](../../output/playwright/pay-perf-3-primary/after-staff-820.png) |
| 375 | [Before](../../output/playwright/pay-perf-3-primary/before-coordinator-375.png) / [After](../../output/playwright/pay-perf-3-primary/after-coordinator-375.png) | [Before](../../output/playwright/pay-perf-3-primary/before-staff-375.png) / [After](../../output/playwright/pay-perf-3-primary/after-staff-375.png) |
| 320 | [Before](../../output/playwright/pay-perf-3-primary/before-coordinator-320.png) / [After](../../output/playwright/pay-perf-3-primary/after-coordinator-320.png) | [Before](../../output/playwright/pay-perf-3-primary/before-staff-320.png) / [After](../../output/playwright/pay-perf-3-primary/after-staff-320.png) |

Both roles passed **native Chrome 200%**, viewport emulation disabled, at **712×424 CSS px / DPR 2**. Keyboard search, 44-pixel targets, 3-pixel focus and Coordinator modal Escape/focus restoration passed. Accepted native images are direct viewport captures without resizing; identities are masked. Zoom returned to 100%, task windows closed. Full assistive-technology/WCAG certification is not claimed. [Coordinator](../../output/pay-perf-3-primary-20261027/browser-results/native-coordinator.json), [Staff](../../output/pay-perf-3-primary-20261027/browser-results/native-staff.json), [200% modal](../../output/playwright/pay-perf-3-primary/native-coordinator-modal.png).

## Exact files, preservation and stop

**Five existing files changed; no new application file.**

| File | Change |
|---|---|
| `server/authorization/read-snapshot.ts` | Internal weak identity marker for the existing read-only adapter; its SQL restrictions and transaction owner remain |
| `server/read-cache.ts` | Isolated public row copies, internal cache handoff and snapshot-chain identification |
| `server/ovr/candidate-reads.ts` | Read-only bounded coverage-pair index and safe metadata copying; original financial-query path retained |
| `tests/read-cache.test.ts` | Nested-cache isolation/invalidation and flat/date/nested/aliased clone equivalence |
| `tests/candidate-reads.test.ts` | Cross-owner coverage, snapshot-only optimization, overflow fallback and original writable-query assertions |

**1,383 of 1,388 starting inputs remain exact**, with none missing. All other source, migrations, financial writers/builders, permissions, dependencies, configuration, flags, fonts, launcher and BACKUP-1 files remain exact. Of **288 compiled server JavaScript files**, only the matching three modules change. Client bytes and all retained distribution files are unchanged. This report and task-local drivers/evidence are additions. Launcher-generated running-profile metadata records the new PIDs; it is not a configuration change. [Manifest](../../output/pay-perf-3-primary-20261027/candidate-files.json), [source boundary](../../output/pay-perf-3-primary-20261027/source-boundary.json), [compiled proof](../../output/pay-perf-3-primary-20261027/build-verification.json), [assets](../../output/pay-perf-3-primary-20261027/bundle-impact.json).

The final **150-table** comparison preserves complete original business values/counts, schema objects, 67 journal rows/timestamps, accounts/passwords/roles, grants and command ledgers. This includes **1,835 scholars / 14 accounts / 1,835 annual records**, **3 Masterlists / 2,002 stored entries / 1,835 activations**, all imports/documents/approvals/academic evidence, **1,000 entitlements/allocations**, frozen payrolls and financial histories. PAY-003's original proposed roster and deferral remain exact. All **800 Paid records** retain their full evidence: **two dated 2026-10-24 and 798 dated 2026-10-26**. Both roles' four historical payment-summary responses are byte-equivalent before/after. [Final preservation](../../output/pay-perf-3-primary-20261027/final-preservation.json), [financial comparison](../../output/pay-perf-3-primary-20261027/financial-after.json).

All **20,268 starting audit rows** remain exact at full datetime precision. Four task logins, two task logouts and one expected draft-export audit bring the total to **20,275**. Sessions **111→115** include normal renewal of the two initially expired task tokens; expiry was not attributed to the restart. Ordinary last-seen/revocation/rate-limit activity is qualified, not described as zero database writes. Both final keyboard logouts returned **204**, then `auth/me` **401**; all four saved task cookies also return 401. The user's separate session was not targeted. Owned fixtures/recovery accounts and temporary services were removed; retained/LAN listener owners and **76 paused LAN-R2A / 16 earlier ML-1 evidence artifacts** remain exact. This is not a new exhaustive inventory of every retained database. [Delivery](../../output/pay-perf-3-primary-20261027/delivery.json), [export audit](../../output/pay-perf-3-primary-20261027/export-audit.json), [cookie checks](../../output/pay-perf-3-primary-20261027/task-session-proof.json), [owned recovery-target cleanup](../../output/pay-perf-3-primary-20261027/cleanup-all.json).

Initial instrumentation retained a failed dual-source full locking collector that exhausted array-buffer allocation. Separate processes with bounded per-statement digests replaced that collector and proved the exact original trace; no heap limit or application safeguard was raised. An initial cutoff fixture assumed one candidate instead of its actual 835; a fresh owned target tested the correct scope while retaining the Draft-state guard. Earlier CLI collectors accepted `--filename=...` but omitted metadata archival; their successful CLI summaries were transcribed with that qualification, screenshots retained, and final primary/native results archived through the corrected collector. A final read-only cleanup collector also needed a reserved SQL alias renamed and automatic-restore reports? intentionally null, already-cleaned definer names handled before successful verification. No API response or scholar evidence was fabricated.

Review artifacts: [patch](../../output/pay-perf-3-primary-20261027/PAY_PERF_3_PRIMARY.patch), [five-file source ZIP](../../output/pay-perf-3-primary-20261027/candidate-source.zip), [compatible review build](../../output/pay-perf-3-primary-20261027/compatible-build.zip), [byte-exact apply proof](../../output/pay-perf-3-primary-20261027/artifacts.json). Patch checking and an independent apply round trip passed against the actual dirty baseline, saved under `output/pay-perf-3-primary-20261027/baseline/`. Archives exclude credentials, keys, `.env` and database records. The build is not a complete operational LAN release. Rollback must coordinate compatible source and preserve later legitimate edits/data; no database restore or history deletion is appropriate.

Remaining limits: full assessment still runs for every roster/search/page/export; the five-second target, physical cold-start behavior, worst-case memory, office concurrency and LAN capacity remain unverified. Word retains synchronous rendering delay. Narrow tables require local scrolling. The known financial fixture precondition still needs separate repair. The existing build chunk warning remains. LAN-R2A can consider this package only through separately authorized complete inclusion, target recovery, source/policy review and office acceptance; existing financial-policy/forms gates remain separate.

**Stopped after verified implementation, primary installation, acceptance and reporting. No primary payroll, payment, deferral, approval, Masterlist, source or cutoff rule changed. No operational LAN modification or LAN-R2A resumption occurred.**
