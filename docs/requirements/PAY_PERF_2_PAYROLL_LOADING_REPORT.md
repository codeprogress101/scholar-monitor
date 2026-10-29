# PAY-PERF-2 — Payroll loading performance and UI correction

26 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/). PAY-003 remains Draft / revision 2: 834 included, one deferred, 1,000 blocked and zero awaiting review. All 800 Paid records and dates remain exact. No primary business command was submitted.** LAN-R2A remains paused.

The roster now shows a spinner, five skeleton rows and an aligned Search control. Read optimizations preserve all 1,835 original candidate results and fingerprints. Large assessments still take seconds. The additional development-startup evidence identifies a different, incompatible 63-migration environment; it does not establish the cause of the user's particular missing authentication response.

This preserves [PAY-FLOW-1](PAY_FLOW_1_EARLY_REVIEW_REPORT.md), [PAY-NEW-3.2](PAY_NEW_3_2_PREVIEW_DEFERRAL_RELIABILITY_REPORT.md), PAY-UI-1, PAY-NEW-2, ML-1.2 and BACKUP-1.

## Fresh primary inventory and recovery

| Item | Verified before -> final |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Frontend / API | Existing synthetic, loopback **5173 / 3001** |
| Controller / API / Vite | **38080 / 27808 / 29256 -> 62056 / 21968 / 49508** |
| Schema | **149 tables / 66 migrations**, original SQL checksums and applied timestamps |
| Working context | **TWO-BATCH-YEAR / TWO-FIRST**, cycle `829ae3dc-9b49-4d88-9dfe-0a7250b164c0` |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v2**, unchanged |
| PAY-003 current assessment | **834 included / 1 deferred / 1,000 blocked / 0 awaiting review**, unchanged |
| Window / final deadline | Opens **26 October**, cutoff **27 October / window v1**; final deadline **31 October / revision 3**, unchanged |
| Published Batch 1 | **Published v415 / 835 active members**, 167 retained removals, unchanged |
| PAY-001 / PAY-002 | **Processed v805 / 800 Paid**; **Processed v5 / 200 Pending**, unchanged |

The original committed deferral and command ledger remain exact. PAY-003 has no frozen entries, allocations or payments; the included roster is a current assessment. The starting inventory protects later legitimate activity rather than assuming the old two-Paid checkpoint. [Inspection](../../output/pay-perf-2-primary-20261026/inspection.json), [current payroll](../../output/pay-perf-2-primary-20261026/current-payroll.json), [preflight](../../output/pay-perf-2-primary-20261026/preflight.json).

Staging at `C:/xampp/htdocs/ldss_payperf2_primary_stage_20261026` used the actual dirty accepted workspace, excluding private configuration. Git HEAD and retained distribution were not substituted. Installed BACKUP-1 tooling passed complete isolated recovery twice:

| Checkpoint | Raw SQL bytes | Encrypted bytes | Complete recovery |
|---|---:|---:|---|
| Before source changes and fixture mutations | **93,895,426** | **20,737,622** | Passed; target/account removed |
| Before promotion, primary ports quiet | **93,896,344** | **20,738,031** | Passed; target/account removed |

Both restored every table's complete values/counts/checksums, schema/journal, columns, indexes, foreign keys/checks, triggers, executable views and rejection probes. The final archive SHA-256 is `a397547354b1282bf4d4e270c342eb03d1edfcf90f785cd01e3334982f7d27c9`. Keys and archives remain private. Existing finite capacities, source-schema READ locks and key custody are unchanged; nothing was restored over primary. [Initial recovery](../../output/pay-perf-2-primary-20261026/recovery.json), [quiet recovery](../../output/pay-perf-2-primary-20261026/activation-recovery.json).

## Actual loading costs and correction

The accepted included-page contract already returned 25 people, but assessed all 1,835 authoritative annual records before pagination. Search, page changes, exclusions and preview each repeat that assessment. The browser therefore waited for full financial/source validation even for one visible page.

Baseline tracing found **4,042 SQL calls** per included read, including **1,838 semester-clock reads** and remaining per-person reconciliation, document-evidence and entitlement lookups. CPU profiling also showed substantial structured-clone and date-validation work. The date helper constructed a new Manila formatter on every call; nested read adapters cloned the same raw rows repeatedly. React development effect replay started two initial roster requests, cancelling one after dispatch. Browser cancellation did not establish that the server had stopped its assessment.

The correction:

- Reuses the Manila formatter while calling `new Date()` on every invocation. It does not cache a date or extend a deadline.
- Batches three additional raw source shapes through the existing request-local adapter, preserving predicates, ordering, per-key limits and locking suffixes. Unrecognized reads still fall through.
- Uses one cloning boundary for managed cohort reads. Callers still receive independent rows; every write invalidates raw/derived caches. No eligibility decision survives a projection or request.
- Schedules the roster fetch with a cancellable zero-delay task. Development cleanup can cancel it before dispatch, avoiding the redundant initial assessment. In-flight lifecycle cancellation remains supported.

No eligibility shortcut, source-history pruning, increased safety bound or changed financial serialization was introduced. The live SQL clock checks remain; reducing those requires particular care at time boundaries. [Full parity and retry integration](../../output/pay-perf-2-primary-20261026/integration.json), [measurements](../../output/pay-perf-2-primary-20261026/performance-summary.json).

## Before/after observations

These are separate local samples, not medians, an office concurrency test or a latency SLA. The final page pair ran sequentially without builds/regression suites; initial exploratory samples were slower under other task activity. Full preview samples used the same unchanged 834-person disposable source copy. API instrumentation includes ordinary authentication and export-audit work.

| Read | Before | After | SQL calls before -> after | Response bytes |
|---|---:|---:|---:|---:|
| Included page, 25 of 834 | **15.40 s** | **10.33 s** | **4,042 -> 3,261** | **106,542**, unchanged |
| Draft HTML | **19.44 s** | **9.14 s** | **4,044 -> 3,263** | **4,757,830**, unchanged |
| Draft Word | **16.39 s** | **10.37 s** | **4,044 -> 3,263** | **184,742** in these samples |

Aggregate SQL elapsed time changes **5.60 -> 4.52 s** for the page, **5.77 -> 3.88 s** for HTML and **5.71 -> 3.96 s** for Word. SQL elapsed time is not CPU time. Equal Word ZIP sizes are not a byte-equivalence claim across generation times. Exact form values/order and all candidate fingerprints/decisions matched independently.

The actual Coordinator browser readiness observation changes **25.78 -> 14.43 s**, with **two -> one** initial candidate requests. Final Staff readiness was **12.30 s**, one request. These are after settling the startup conditions described below, not matched cold-start speedups. A separate first post-restart sample took **33.56 s** and is retained rather than excluded from the limitations.

The actual primary HTML preview returned **200**, **834 rows / 42 pages / 13,137 DOM nodes**, all marked **DRAFT — NOT FOR PAYMENT**. Its load duration was **13.56 s**, first response about **13.34 s**, and complete collector **13.80 s**. Assessment still dominates delivery. Concurrent account checks returned **200 in 8 ms on 3001 / 6 ms through 5173**. This generated one expected `payroll.export` audit, not a financial command. Preview remains an **audited GET**, not a write-free operation. The export authorization/audit contract and HTML/Word builders are unchanged. [Primary preview](../../output/pay-perf-2-primary-20261026/browser-results/primary-preview.json), [masked document](../../output/playwright/pay-perf-2-primary/primary-draft-preview.png).

The explicit compatibility/evidence endpoint can still return the complete approximately **10.1 MB** assessment when requested. The normal roster does not request it; its bounded page remains approximately **106 KB**, with a complete current summary/source hash. No second candidate table was restored.

## Development startup and authentication evidence

Plain **`npm run dev`** runs `tsx watch server/index.ts` and Vite using `.env`: **`ldss_scholar_monitor_dev` / `ldss_monitor_local`**. The accepted synthetic launcher explicitly selects **`ldss_primary_test_12676_61497616`** and its restricted runtime without rewriting `.env`.

`server/index.ts` performs `/api/v1/ready` before listening. Any non-200 produces the supplied generic release-readiness error. `database.check()` reports unavailable on connection/query failure or when `schemaReady` rejects the exact migration count/checksums or required parsed payroll signatories.

A fresh read-only reproduction establishes a sufficient current failure condition: the preserved development database has **63 migrations**, while current code requires **66**. The missing journal entries are **F54 graduation monitoring, F55 import/intake bindings and F56 supplied-text intake**. The synthetic database has all 66 and passes readiness. No migration, grant, setting or environment file was changed. [Startup/configuration evidence](../../output/pay-perf-2-primary-20261026/startup-readiness.json), [startup guard](../../server/index.ts), [readiness validator](../../server/schema-readiness.ts), [explicit profile](../../scripts/localhost-5173-api.ts).

Current 3001/5173 owners have the verified synthetic controller ancestry. The accepted API uses a single `tsx` import, not the development watcher. No simultaneous development watcher owning these ports was found. Vite uses `strictPort: true`. Historical source-edit restarts, HMR/Fast Refresh output and process termination do not establish a current port collision. The supplied historical log description lacks matching browser timestamps/request IDs/statuses; it cannot tie a particular authentication failure to a restart, timeout, revocation or payroll read.

Observed categories remain distinct:

- Baseline development browser navigation recorded **`net::ERR_ABORTED`** cancellations on several component reads, including the duplicate roster request. This is not evidence that that navigation's `/auth/me` failed.
- Owned-fixture transport failures exercised connection Retry while retaining the workspace and pending-command behavior. A failed period read remained **unconfirmed**, not zero periods.
- Genuine fixture logout and 31-minute idle expiry returned **401**; the browser still requires sign-in. Authentication, 30-minute idle/8-hour absolute defaults, CSRF, cookies and the 15-second account timeout remain unchanged. Background `/me` checks do not extend idle expiry.
- The first post-install primary proxy account probe took **28.82 s**, returning **200**. Saved runtime logs show initial Vite dependency scanning/bundling in that startup window; a full operator preservation inventory also overlapped. There is no matching per-hop trace proving a single cause. A 15-second browser call can time out under such latency; this sample is not certified as responsive.
- Once settled, repeated actual API/proxy probes and the real preview's concurrent probes returned 200 promptly. The owned revised preview's concurrent account probe was **7.7 ms / 200**; the baseline isolated preview was **17.3 ms / 200**. The user's original failure was not reproduced in those isolated samples.

No global timeout increase, readiness bypass, unrelated process restart or authentication relaxation was used. Cold dependency optimization/resource contention remains an explicit limitation. [Cold observation](../../output/pay-perf-2-primary-20261026/primary-cold-observation.json), [settled health](../../output/pay-perf-2-primary-20261026/account-health.json), [connection faults](../../output/pay-perf-2-primary-20261026/browser-results/fixture-read-states.json), [expiry](../../output/pay-perf-2-primary-20261026/auth-expiry.json).

## Loading and Search interface

The batch heading and known summary remain visible during page/search loading. Previously loaded counts are explicitly labelled **“Last loaded summary; current counts unconfirmed.”** No unavailable count becomes zero. A visible spinner, **five** skeleton rows with name/ID, year/status and action placeholders, and **“Loading included scholars...”** replace the stalled-looking paragraph. Placeholder rows are hidden from assistive technology; reduced-motion disables animation.

Controls requiring fresh roster data, including review and preview, are disabled until the current response arrives. The existing finite 120-second roster bound remains; failure removes skeletons and offers keyboard-accessible **Retry roster**. Search remains explicit server-side submission, with the same trim/160-character query and 25-row page semantics. Input/button height is **44 px**; button width is at least **72 px**, aligned at every requested width. Repeated Enter does not dispatch duplicate identical search requests. Search, pagination, empty results and failed loading were distinguished against real fixture responses.

Defer still uses its focused modal, original body/key, reason/confirmation, source/revision revalidation and exact retry. The lost-response fixture confirmed **two identical requests / one committed deferral**, then exact **834 included / one deferred / 1,000 blocked** counts. No original primary deferral was repeated. [Loading/search acceptance](../../output/pay-perf-2-primary-20261026/browser-results/fixture-loading-coordinator.json), [safe retry](../../output/pay-perf-2-primary-20261026/browser-results/fixture-lost-response.json).

## Before/after screenshots and acceptance

Actual primary captures use the same Draft v2 / 834 included state, role, period, default zoom and height 900. Names/IDs/account labels are masked. Primary was not reverted. Tables retain local horizontal scrolling on narrow screens.

| CSS width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-perf-2-primary/coordinator-before-1440.png) / [After](../../output/playwright/pay-perf-2-primary/primary-coordinator-after-1440.png) | [Before](../../output/playwright/pay-perf-2-primary/staff-before-1440.png) / [After](../../output/playwright/pay-perf-2-primary/primary-staff-after-1440.png) |
| 1024 | [Before](../../output/playwright/pay-perf-2-primary/coordinator-before-1024.png) / [After](../../output/playwright/pay-perf-2-primary/primary-coordinator-after-1024.png) | [Before](../../output/playwright/pay-perf-2-primary/staff-before-1024.png) / [After](../../output/playwright/pay-perf-2-primary/primary-staff-after-1024.png) |
| 820 | [Before](../../output/playwright/pay-perf-2-primary/coordinator-before-820.png) / [After](../../output/playwright/pay-perf-2-primary/primary-coordinator-after-820.png) | [Before](../../output/playwright/pay-perf-2-primary/staff-before-820.png) / [After](../../output/playwright/pay-perf-2-primary/primary-staff-after-820.png) |
| 375 | [Before](../../output/playwright/pay-perf-2-primary/coordinator-before-375.png) / [After](../../output/playwright/pay-perf-2-primary/primary-coordinator-after-375.png) | [Before](../../output/playwright/pay-perf-2-primary/staff-before-375.png) / [After](../../output/playwright/pay-perf-2-primary/primary-staff-after-375.png) |
| 320 | [Before](../../output/playwright/pay-perf-2-primary/coordinator-before-320.png) / [After](../../output/playwright/pay-perf-2-primary/primary-coordinator-after-320.png) | [Before](../../output/playwright/pay-perf-2-primary/staff-before-320.png) / [After](../../output/playwright/pay-perf-2-primary/primary-staff-after-320.png) |

[Actual loading skeleton](../../output/playwright/pay-perf-2-primary/primary-skeleton-1440.png), [835-person fixture](../../output/playwright/pay-perf-2-primary/fixture-coordinator-after-1440.png), [200% primary](../../output/playwright/pay-perf-2-primary/native-primary-coordinator-top.png), [200% deferral modal](../../output/playwright/pay-perf-2-primary/native-primary-coordinator-defer.png).

Both roles passed **1440 / 1024 / 820 / 375 / 320 CSS px**, including aligned Search, cancellation/focus and no page overflow. Native Chrome **200%**, viewport emulation disabled, passed at **712×424 CSS px / DPR 2**, with 44-pixel controls and 3-pixel keyboard focus. The 835-person owned fixture and actual primary were both exercised; native fixture Staff used the resulting 834-person state after the deliberate owned retry drill. Captures use the rendered viewport without resizing. Zoom returned to 100%; task windows closed. ui-ux-pro-max and Playwright workflows were used. Full AT/WCAG certification is not claimed. [Primary Coordinator](../../output/pay-perf-2-primary-20261026/browser-results/primary-coordinator.json), [Staff](../../output/pay-perf-2-primary-20261026/browser-results/primary-staff.json), [native Coordinator](../../output/pay-perf-2-primary-20261026/browser-results/native-primary-coordinator.json), [native Staff](../../output/pay-perf-2-primary-20261026/browser-results/native-primary-staff.json).

| Final validation | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0**, final matching staged source |
| Unit tests | **131 files / 848 tests passed**, one worker |
| Owned source/reliability integration | **Six groups passed**: all 1,835 original fingerprints/decisions/form rows; bounded/search/last/excluded pages; Staff denial; late-audit rollback; exact retry/stale/changed-input rejection; confirmed count refresh/835 roster; other-table preservation |
| Relevant disposable regressions | **Eight groups exit 0**: Masterlist workflow; Registry/main payroll/Treasury/parity; intake/import/receiving; historical/omitted payroll; Recording; reconciliation; individual settlement; financial reports |
| Browser faults/retry | Slow loading, abort/failure, reduced motion, empty search, Retry, account/period failure, real logout/401 and uncertain deferral passed on owned targets |
| Primary | Both roles, five widths, native zoom, real preview and account probes passed; **zero business-command attempts** |

All mutations and fault injection used newly owned protected copies of synthetic UAT. They contained synthetic UAT records, not a newly invented primary cohort. The integration's temporary restorations and deliberate deferral affected only its copy. Every original financial/source table stayed exact around those tests; both disposable targets and technical accounts were removed. Financial source pins, output checks, retry/atomicity and R01–R07 protections were retained. [Normal checks](../../output/pay-perf-2-primary-20261026/checks-main.json), [unit log](../../output/pay-perf-2-primary-20261026/unit-final.log), [eight regressions](../../output/pay-perf-2-primary-20261026/regressions-masterlist-workflow-registry-intake-import-historical-recording-reconciliation-individual-settlement-financial-reports-latest.json), [copy preservation](../../output/pay-perf-2-primary-20261026/fixture-preservation.json).

## Exact files and installation

**Six package files: five existing changes and one addition.**

| File | Change |
|---|---|
| `server/scholars/validation.ts` | Reuse the stateless date formatter; retain live clock/date semantics |
| `server/ovr/candidate-reads.ts` | Three raw-source batching rules and single clone boundary |
| `server/ovr/managed-payroll.ts` | Use the enclosing cohort cache for that boundary; allocation/entitlement writer suffix remains byte-exact |
| `src/PayrollDraftRoster.tsx` | Cancellable dispatch, skeleton/spinner, retained summary, fresh-data action guard, aligned search |
| `src/styles.css` | Append scoped loading/search/reduced-motion rules after the exact accepted prefix |
| New `tests/payroll-loading.test.tsx` | Live Manila midnight rollover and raw-source clone/predicate/order/write-invalidation checks |

**1,351 of 1,356 starting inputs remain exact**, with none missing. All **310 retained distribution files** remain exact. **280 of 283 compiled server files** match the accepted PAY-FLOW-1 review build; only the three declared read/date modules differ. All other financial/deferral writers, output builders, authorization/authentication, readiness/launchers, migrations, configuration, flags, dependencies, fonts and existing tests remain exact. No new endpoint, financial write contract, migration or permission expansion was needed. [Exact hashes](../../output/pay-perf-2-primary-20261026/candidate-files.json), [source boundary](../../output/pay-perf-2-primary-20261026/source-preservation.json), [writer/build comparison](../../output/pay-perf-2-primary-20261026/build-verification.json).

Final client assets change **1,528,910 -> 1,531,918 bytes**, **+3,008**: JavaScript **+1,109**, CSS **+1,899**; CSS gzip **51,370 -> 51,805**. No polling or new full-cohort browser fetch was added. [Bundle inventory](../../output/pay-perf-2-primary-20261026/bundle-impact.json).

All gates preceded promotion. Only the freshly verified primary controller tree was stopped; matching files were installed with 3001/5173 quiet, after fresh recovery acceptance, then started through the unchanged synthetic launcher. No retained/LAN process was restarted. [Maintenance](../../output/pay-perf-2-primary-20261026/maintenance.json), [installation](../../output/pay-perf-2-primary-20261026/promoted-files.json), [delivery](../../output/pay-perf-2-primary-20261026/delivery.json).

Staging caught a test mock that did not recognize the batching alias and a visually hidden helper using the wrong CSS utility. The mock and utility were corrected; final normal checks passed and matching visual acceptance was repeated. Earlier results and the cold-start observation are retained. No validator, test financial pin or permission was weakened.

## Preservation, limitations and stop

The final complete 149-table comparison preserves all starting business values/counts, schema objects, 66 migration rows/timestamps, accounts/passwords/roles, runtime grants and every original audit. This includes **1,835 scholars**, **14 accounts**, annual/academic/import/document/prior-approval evidence, **3 Masterlists / 2,002 stored entries / 1,835 activations**, the published 835-member list, all three payrolls, original deferral/ledger, entitlements, allocations and reconciliation.

All **800 Paid records** remain exact: **two dated 2026-10-24 / 798 dated 2026-10-26**. PAY-002 remains 200 Pending. PAY-003 stays Draft v2 with its original deferral and no frozen entries/allocations/payments. No roster, amount, cutoff, deadline, approval, source, Masterlist or payment command was submitted on primary.

All **20,218 starting audit rows** remain exact at full datetime precision. Two task logins/two logouts plus the one real preview export add **five** expected events: **20,223 total**. Sessions **83 -> 85**, with ordinary session/rate-limit activity. This is qualified authentication/export activity, not zero database writes. Both task sessions logged out with **204**; saved original cookies return **401**. The user's separate sessions were not revoked. [Full preservation](../../output/pay-perf-2-primary-20261026/final-preservation.json), [revocation/cleanup/readiness](../../output/pay-perf-2-primary-20261026/delivery.json).

The **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. Operational LAN services/configuration/database were untouched. This is not an exhaustive new inventory of every retained database.

Review artifacts: [patch](../../output/pay-perf-2-primary-20261026/PAY_PERF_2_PRIMARY.patch), [source ZIP](../../output/pay-perf-2-primary-20261026/candidate-source.zip), [compatible review build](../../output/pay-perf-2-primary-20261026/compatible-build.zip). Patch checking and an independent exact-byte apply round trip passed against the actual dirty baseline under `output/pay-perf-2-primary-20261026/baseline/`. Archives exclude credentials, keys, `.env` and database records. The review build omits server PDF/template assets and is **not a complete operational LAN package**. Rollback must preserve later legitimate source/data and BACKUP-1; no database restore or history deletion is appropriate.

Remaining limits: full authoritative assessment still runs for each page/search/excluded read and export, with over 3,000 SQL calls and multi-second latency. Unavailable responses and genuine lost command responses still need their explicit recovery paths. Cold dependency optimization/resource contention can exceed the account timeout; this task does not certify cold-start, maximum load, office concurrency, power loss or latency capacity. Narrow tables scroll locally; complete AT/WCAG acceptance is unverified. Existing build chunk warnings, deadline-authority disposition and financial policy/release gates remain.

LAN-R2A can consider the matching read/UI package only through separately authorized complete packaging, target recovery, workload/connection testing and office acceptance. No operational readiness or financial authority follows from local synthetic measurements.

**Stopped after PAY-PERF-2 installation, verification and reporting. No primary payroll creation, submission, finalization, processing, deferral, payment, approval renewal or deadline change occurred. No LAN-R2A resumption or operational LAN modification occurred.**
