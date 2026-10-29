# LDSS measured optimization roadmap

24 October 2026, Philippine time. **Investigation and implementation proposals only.** No benchmark, service, database, build, index, cache, package or limit was changed for this plan. Use with the [batch backlog](../requirements/LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md) and [future test protocol](../requirements/LDSS_PHASED_IMPLEMENTATION_PLAN.md). Figures below are dated existing evidence, not a new baseline or promised improvement.

## Preserve accepted R01–R07 behavior

| Evidence | Accepted change / limitation to retain |
|---|---|
| [R01](../../output/r01-registry-20261021/REPORT.md) | Requested-ID Registry evaluation and empty metadata path; bounded timeout/navigation. No full candidate/form generation for a visible page |
| [R02](R02_OPTIMIZATION_REPORT.md) | Bounded candidate/source reuse, authoritative full output parity; 835 historical candidate median 26.03→6.02 s and 60,133→4,712 SELECTs were that comparison, not today's result |
| [R03](R03_OPTIMIZATION_REPORT.md) | Cards use aggregates/one bounded authoritative derived evaluation rather than full reports. Historical service 21,612.74→5,288.30 ms, 56,451→620 SELECTs; higher bulk memory is not a memory improvement |
| [R04](R04_OPTIMIZATION_REPORT.md) | Summary first, 25-row candidate/frozen pages, lazy complete detail/sections. Complete frozen evidence still verified; no truncated financial history |
| [R05](R05_OPTIMIZATION_REPORT.md) | Actual pagination/scoped source hydration; complete report/source-hash semantics and ordered output preserved. Earlier 835 eligibility HTTP comparison 98,582.68→269.37 ms is historical and excludes unrelated routes |
| [R06](R06_OPTIMIZATION_REPORT.md) | Purpose-specific notification count/page/pending/period projections with exact audience and read-state semantics; no return to whole notification-center loading for a badge |
| [R07](R07_OPTIMIZATION_REPORT.md) | <=200-record bulk source groups, keyed maps, safe fallback for unsupported query shapes and write invalidation; removes >1,000 cliff. Retained-heap stability did not remove increased transient heap/RSS or unscoped annual materialization |

`server/read-cache.ts` is request/projection-local, not a financial authorization cache across requests. Keep current SQL bindings, source scopes, clock freshness, immutable row protection, cache invalidation, lock order and transaction boundaries. Reuse values only where their scope/permission/source contract is identical. A warm display count never authorizes an academic, publication or payment command.

## Historical baseline register

| ID | Existing observation and conditions | Source / qualification |
|---|---|---|
| H1 | P10 Home navigation median **7,002 ms**; Registry **1,885 ms to 25 real rows**; isolated Dashboard **7,435.44 ms / 580 SELECTs** on the same 835 fixture | [P10 §6](../payroll/P10_INTEGRATION_UAT_REPORT.md). Three warm medians; browser navigation and restricted-runtime service timings have different boundaries |
| H2 | P10 legacy complete detail **15,211.89 ms / 3,188 SELECTs / 36,110,257 decoded bytes**; sampled peak RSS **1,522.52 MiB** | P10, not normal compact recording latency; do not use a frozen page as a comparable “after” for this response |
| H3 | Recent V3 historical context reads **four historical SELECTs** at 25/50/200 live assessed members; total 188/231/500 SELECTs, approximately 998/1,362/3,005 ms | [Historical multi-batch report](../testing/LDSS_HISTORICAL_MULTI_BATCH_IMPLEMENTATION_REPORT.md); single local observations; constant context work, remaining authoritative per-member pipeline not eliminated |
| H4 | V3 frozen 25/50-row reads **11 SELECTs**; payment summaries **14 SELECTs**, about 83 ms for 800 and 37 ms for 200 | Same report; different states/projections from H3 and single observations |
| H5 | Screenshot review Registry Enter search: six API responses; fresh imported Registry: sixteen, small cohorts. Some Home/recording flows had two `me/permissions` responses | [Visual review](../audits/LDSS_UI_UX_VISUAL_REVIEW.md); scope/redaction/observer windows prevent declaring all repeated paths redundant |
| H6 | P10 individual Unclaimed queue 28.57→38.74 ms in another fixture state; report PDF about 1.93 s; main minified client chunk about 853 kB | P10 reported observations/qualifications. Current clean build still warns above 500 kB; no current bundle analysis or causal regression reproduced here |
| H7 | Verified 1,000-member synthetic baseline backup **53,481,501 raw SQL bytes** | [Activation report](../testing/LDSS_LOCALHOST_INDIVIDUAL_PAYMENTS_ACTIVATION_REPORT.md); about 13,627,363 bytes remained under 64 MiB at that point, not a growth/capacity guarantee |
| H8 | Prior large scenario rejected before finalization at the unchanged stored-evidence ceiling | P10/readiness; cannot raise a limit, truncate evidence or directly insert allocations to claim successful larger tests |

Do not compare these rows as though they were one benchmark. The latest 835 integration run establishes behavior and records observations, not a paired optimization experiment. Its ~19–20 s full-detail observations do not alone prove a new regression on identical conditions.

## Optimization proposals

Every item starts by collecting a current comparable baseline. “Expected benefit” is a hypothesis to test; it is not a claimed result. C1–C4 are independent investigation approvals; any source/index/schema change needs its own bounded implementation decision after profiling.

### PERF01 — Dashboard service and pending work / C1

- **Baseline:** H1. **Root cause:** confirmed remaining whole-year derived eligibility/document work; precise current CPU/SQL split still needs measurement.
- **Scope:** `server/dashboard/{service,summary}.ts`, `eligibility/{service,cohort-reads}.ts`, `reports/requirement-workload.ts`, `src/DashboardPage.tsx`.
- **Smallest proposal:** profile each requested card and dependencies; skip only unrequested projections, share identical current-source reads within one snapshot, investigate set-based workload counts only with exact semantic equivalence. Split fast summary from an explicitly loading expensive assessment only if both remain authoritative and complete.
- **Benefit:** less repeated work/time-to-useful-task. New/Continuing totals depend on A1/A4's annual definition; graduation starts as a link, not an eager expensive count.
- **Tests/risk:** all role/cycle/academic/document/payment counts, unknown/not-generated versus missing, graduation corrections and snapshot hashes must match an independent current oracle; risk High for misleading count semantics. Browser measures actual populated settle.
- **Rollback:** revert isolated reader/UI changes with old DTO support; no cached financial decision survives. Do not suppress cards by presenting zero.

### PERF02 — Dashboard SQL query count / C1

- **Baseline:** H1's 580 physical SELECTs, supplemented by a new per-query family/timing/row profile. **Hypothesis:** repeated shared readers and derived per-owner calls remain after accepted batching.
- **Scope/change:** shared R01/R02/R07 reader adapters and Dashboard only where the call profile proves repetition; preload supported identical source shapes in <=200 groups with safe fallback. Do not remove authorization/revocation checks or turn a query estimate into an actual examined-row metric.
- **Benefit/tests:** lower physical calls with identical counts, reasons and scope, including invalidated documents, unavailable periods and role loss. Compare SQL count, rows, client round-trip and Node CPU separately; no fixed SELECT reduction promised.
- **Risk/rollback:** High shared-reader exposure; revert adapter dispatch while retaining default authoritative fallback and current invalidation tests. Any proposed index requires measured query-plan evidence and a separately reviewed additive migration.

### PERF03 — Registry initial request orchestration / C3 with B1

- **Baseline:** H1/H5 plus current network dependency trace; `ScholarsPage` fetches permissions, list, year/barangay catalogs together after access and repeats catalogs on list dependencies.
- **Scope/change:** `ScholarsPage.tsx`, `RegistryEligibility.tsx`, `academic-year-options.ts`, App access context. Resolve the authoritative working-year choice before the first default scoped list read; separate stable catalogs from search/page state within the mounted authorized session. Preserve explicit saved All/historical choice and incomplete-registration visibility contract.
- **Benefit/tests:** one correct initial page rather than an all-year flash/refetch; no repeated catalog load on every search if freshness permits. Assert request graph, failed/ambiguous year handling, revoke/relogin, abort/timeout and profile/receiving context.
- **Risk/rollback:** Medium; stale metadata/scope can hide people. Revert orchestration together with compatible saved-view readers; never clear pending financial commands or silently reinterpret stored preferences.

### PERF04 — Registry search and pagination / C3

- **Baseline:** H5 and R01 requested-ID comparisons; current page sizes 25/50/100. **Hypothesis:** avoidable metadata/refetch/render work, not permission to skip per-row authoritative checks.
- **Scope/change:** `scholars/{service,registry-placement,registry-eligibility,registry-drafts}.ts`, `ScholarsPage.tsx`; retain COUNT/ordered LIMIT, visible-ID evaluation and search cancel. Examine plans for approved year/class filters only after A1/B1 define exact association semantics.
- **Benefit/tests:** bounded work and stable responsiveness with 1,000+ records; exact complete page/count/order/unknown classification/source/reason parity and no whole-cohort browser request. Test empty scopes, last page, filter changes, long names and source invalidation.
- **Risk/rollback:** Medium/High if SQL changes cohort identity; revert scoped projection/plan and preserve historical/All paths. No automatic year-index or virtualization dependency is approved.

### PERF05 — Historical multi-batch candidates / C4

- **Baseline:** H3, currently two imports; 3–5 import result is **unmeasured**. **Hypothesis:** context/member-map parsing and source pin construction grow with source batches even without a per-member historical query loop.
- **Scope/change:** `payouts/historical-context.ts`, `historical-append.ts`, `eligibility/semester-sources.ts`, `ovr/{managed-payroll,detail-reads,managed-release}.ts`; profile per-batch lookups and clone/map allocation. Optimize only proven repeated context work; retain earliest stable root and batch-specific pins.
- **Benefit/tests:** bounded metadata cost across paged/full/fresh-payment reads. Assert exact selected import roster, wrong/stale source rejection, genuine omission destination, first-batch frozen bytes and source hashes after later appends. Existing four historical SELECTs are a comparison anchor, not permission to ignore real extra source checks.
- **Risk/rollback:** High source/financial exposure. Stop new appends if necessary, retain compatible readers for already appended records and never switch legacy root to newest revision or delete ledger history.

### PERF06 — Complete payroll detail response / C2

- **Baseline:** H2. **Root cause:** intentionally broad complete source/evidence/financial response still expensive; accepted R04 compact projections already exist.
- **Scope/change:** `ovr/{detail-reads,complete-detail,detail-model}.ts`, `PayrollDetailBoundary.tsx`, `PayrollPagedDetails.tsx`, `OvrDrafts.tsx`. First verify routine screens stay on summary/pages and lazy sections; only then profile redundant assembly/serialization inside the explicitly requested complete DTO.
- **Benefit/tests:** avoid unintended expensive loads and reduce copies/peak memory where proven; preserve every original field, ordering, source hash and frozen verification. Compare complete-to-complete and page-to-page separately, including Draft/Review/Processed/Closed and correction states.
- **Risk/rollback:** High output-completeness exposure. Keep old complete endpoint/contract available until compatibility approved; revert reader assembly, never omit evidence or silently page a supposedly complete export.

### PERF07 — Repeated permission/context reads / C3

- **Baseline:** H5 two observed access responses, not every repeated URL. **Scope:** App, Dashboard, Registry and `configuration-api.ts`.
- **Proposal:** share already available display permissions/working-context state inside the appropriate mounted boundary; explicitly refresh on session/role/source/context changes. Keep every backend command/read authorization and post-snapshot revocation check.
- **Benefit/tests:** fewer duplicate identical display calls; test two actors, role revocation, logout/login, independent tabs, delayed responses, no unauthorized stale controls/data and source-context changes. Compare exact request URLs/queries/roles before declaring duplication.
- **Risk/rollback:** High disclosure risk if transformed into an indefinite global permission cache. Revert shared frontend orchestration to existing reads; no new cross-request server authorization caching framework.

### PERF08 — Individual queues / C4 with B5

- **Baseline:** H6; E4 functional 3012 queue is tiny, not 1,000 prepared transactions. **Scope:** `payments/{individual-reads,omission-reads,settlement-reads}.ts`, individual UI.
- **Proposal:** profile actual queue count/page plans and correction/route predicates at representative transaction counts; retain existing relational paging and indexed paid-elsewhere semantics. Fetch selected detail/history only when requested, preserve request-local reuse/fresh writes.
- **Benefit/tests:** predictable pages without Registry/full-detail fan-out; complete order/status/blocker/source parity for Paid/Unclaimed/review/cancelled/replacement and role restrictions. Repeat reads at bounded page sizes; no statistics tuning as an ordinary-request side effect.
- **Risk/rollback:** High if effective payment precedence changes. Revert query/projection only after proving exact outputs; retain canonical settlement/correction/history and data ownership.

### PERF09 — Reports/render/export / C2/C4

- **Baseline:** H6; E4 Provisional 800/200 exports and separately tested Original/Updated/individual bases. **Scope:** `payments/report-{reads,service,export}.ts`, `reports/{service,requirement-workload}.ts`, `FinancialReports.tsx`.
- **Proposal:** profile row assembly, renderer and publication rechecks separately; reduce duplicate temporary transformations or eager UI exports only where complete rows/hash/order survive. Rendering remains outside the publication transaction with fresh source/permission recheck.
- **Benefit/tests:** lower peak allocation and clearer loading without partial files. Parse XLSX numeric values/counts and PDF text/layout, compare all bases/unique-entitlement totals, wrong/stale source, audit failure and renderer failure; no automatic forwarding.
- **Risk/rollback:** High accounting presentation exposure; retain old renderer version/DTO compatibility, reject oversized output explicitly, no count-only preview used as complete export source.

### PERF10 — Frontend chunk/request graph / C3

- **Baseline:** H6 chunk warning; current exact contribution/decode/parse time is **unmeasured**. **Scope:** App and route/component imports, report/document/client dependency graph, Vite output.
- **Proposal:** inspect build manifest/module contribution, avoid pulling heavy unused feature modules into initial route and add only justified existing lazy split points. No new bundler/framework, arbitrary package upgrade or warning-limit increase.
- **Benefit/tests:** smaller initial transfer/parse and fewer irrelevant requests; measure compressed/decoded bytes and real cold/fresh route settle, including recovery/offline chunk failures, deep links and role gates. Local service time is not LCP/INP.
- **Risk/rollback:** Medium route-loading/recovery exposure; revert split/import changes with compatible assets/release packaging. Never strand an uncertain payment behind a missing lazy chunk.

### PERF11 — Memory, evidence and storage / C2/C4/D2

- **Baseline:** H2/H7/H8 and R07 stable retained heap but increased transient peaks. **Scope:** source-map lifetime, stored/frozen JSON, DOCX latest content/version metadata, audit growth, backup/recovery tools.
- **Proposal:** profile retained versus transient allocations at request release and repeated representative use; forecast actual serialized SQL growth from current DOCX content, append-only version/audit metadata and payroll evidence. Measure backup/restore time/headroom with real anticipated approved template sizes.
- **Benefit/tests:** fewer unnecessary clones and an explicit capacity disposition/stop threshold; 20-release/pool-return stability where comparable, controlled overlap at agreed host capacity, exact data/export/evidence parity and verified recovery. No leak claim from RSS alone.
- **Risk/rollback:** High evidence-loss exposure; retain **800,000-byte stored envelope, 64 MiB SQL backup, 262,144-byte DOCX, 5,000 report-source and 16 MiB download** limits. No heap/packet/cap increase, history deletion or evidence truncation. New storage formats require an independently reviewed migration/compatible-reader and forward recovery plan.

### PERF12 — Three-to-five-batch resource assessment / C4

- **Baseline:** E3/E4 two processed imports; five same-semester payrolls not verified. **Scope:** approved future isolated fixture, historical/annual sources, reporting, pools/host resources and the previous items under realistic concurrency.
- **Proposal:** use 3–5 actual source-bound batches in one year/semester/cycle, not five labels on one payroll. Profile sequential independent appends, candidate pages, summaries, selected complete detail, recording and reports; then representative multiple Staff sessions in a separately approved host window.
- **Benefit/tests:** evidence-based batch/workload guidance and readiness, not an invented office count. Assert no cross-import absorption/duplicate entitlement, stable earlier frozen history and correct annual-version membership; independently test unavailable dates, overlapping windows and report/backup bounds.
- **Risk/rollback:** High resource and financial-source exposure. Never mutate/reset 3011/3012/A–F; stop only owned test processes on thresholds, retain partial evidence and dispose only explicitly owned resources after reviewed cleanup. No change to office dates or live feature flags.

## Comparable measurement and decision protocol

1. Obtain separate investigation/fixture authorization. Freeze the **current dirty worktree** source/build inputs and fixture manifest/state, role, year/semester/batch/source selection, process/runtime/host configuration and active flags. Use synthetic data and restricted runtime credentials; keep secrets out of artifacts.
2. Separate correctness mutation runs from timing runs. Reuse matched isolated data; no tests/builds/backups run concurrently with accepted sequential before/after timing samples. Record warm-up/buffer/GC conditions. Cold/fresh-browser and warm service measurements are different series. Concurrent capacity runs are deliberately separate.
3. Use repeated paired observations (at least three for small stable comparisons, more when variance warrants), medians/ranges and tail samples/p95 only with enough observations. Record service, actual HTTP and browser action-to-real-content boundaries separately; no “settled” assertion with zero expected rows.
4. Capture physical SELECTs, rows returned, client-observed SQL time, Node CPU, decoded and compressed response sizes, heap/RSS peaks and post-GC retained memory, pool/queue return, rendering and error rate. State unmeasured DB CPU/rows examined rather than substitute estimates.
5. Compare entire stable outputs, source hashes, eligibility reasons, ordering, amounts, roles and scoped financial effects against an independent baseline. New metadata/time fields need explicit permitted comparison normalization, not discarded substantive differences. Include stale sources/revocation/write invalidation and ordinary historical/omitted routes.
6. Agree task-specific budgets **after a current baseline**. Acceptance requires parity and measured benefit in the intended operation, no unexplained material latency/query/memory regression in protected flows, and an explicit documented disposition for tradeoffs. Do not invent an office SLA or claim a speedup from denser layout. Field Web Vitals, if later collected, are browser metrics distinct from endpoint budgets.
7. Approve the smallest justified change or reject the hypothesis. Retain failed/interrupted samples separately; never select only faster runs. Release/rollback needs reviewed compatible source/build artifacts and the data constraints in each proposal; a benchmark pass is not deployment or financial activation approval.
