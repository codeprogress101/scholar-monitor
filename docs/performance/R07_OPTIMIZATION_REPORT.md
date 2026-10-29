# R07 - Chunked cohort preloads and in-memory grouping

Date: 21 October 2026. Scope: R07 only, localhost disposable databases. No LAN deployment, production writes, migration, index, endpoint, permission or eligibility-rule change. R08 is not started.

## Status

R07 implemented locally. All functional acceptance checks passed, but the audit's no-memory-regression target remains unmet because transient heap/RSS peaks increased. R08 and LAN deployment remain unstarted.

## Confirmed root causes and change

The current R06 source still discarded all preloaded annual rows above 1,000 records and fell back to point reads. For smaller cohorts, seven source result sets were repeatedly filtered once per annual or scholar. R02's candidate adapter already used bounded batches and keyed groups; it was preserved. R01, R03, R04, R05 and R06 functionality remains in place.

Production changes are limited to `server/eligibility/cohort-reads.ts` and `server/read-cache.ts`. Explicit annual scopes are deduplicated and loaded in groups of at most 200, always constrained to the requested academic year. Subsequent source preloads use the same 200-record bound with the original fixed parameters, projections, sort clauses, per-key history limit and locking suffixes. One Map per source result replaces repeated array scans. Empty known groups remain explicit empty results. Unknown query shapes, IDs, cycles and semesters still use the underlying reader.

The existing unscoped annual discovery SQL is retained, including its locking semantics. It still materializes that year's annual rows; this change bounds subsequent query key counts and explicit-ID discovery, not total cohort memory. Source rows can also include many historical events per key. Retained request data grows with cohort size. No fixed upper memory bound or unlimited-cohort capacity is claimed.

Prepared cache entries now group by exact SQL and then exact serialized bindings, keeping the SQL string once per projection rather than once per annual key. Execute/query identity, clock bypass, caller-row cloning and live fallbacks remain unchanged. This follows a provisional chunk-only run that showed stable retained heap but higher transient peaks; that provisional build is not the final acceptance candidate. All optimized measurements are rerun after this cache-key change.

The cache remains projection-local and uses the existing `cachedReads`/`primeRead` mechanisms. Every write through the adapter clears prepared, ordinary and computed caches. No cache persists across requests or replaces fresh finalization checks. Locks are retained; chunking changes the acquisition sequence and now preloads source locks above 1,000 instead of acquiring them during later point reads. Existing mutation configuration guards, transaction boundaries, snapshot isolation, audit journaling and financial constraints are unchanged.

Regression changes: `tests/cohort-reads.test.ts`, `tests/read-cache.test.ts`, frozen `tests/fixtures/legacy-cohort-reads.ts`, and `scripts/test-candidate-parity.ts`. The existing candidate lifecycle test now compares complete eligibility views with an independent pre-R07 preload oracle, covering history, overrides, document outcomes, standing and reservations in the same authorized snapshot.

## Measurement conditions

Baseline is the complete acceptance-tested R06 working tree, based on Git `89cba417442219f3839e59766e19b62fa744b944`. All 576 source input hashes and 211 artifacts were verified against its 57-suite acceptance report before edits. The complete baseline build was copied outside the web root. Uncommitted R01-R06 work and unrelated local files were preserved.

The verified encrypted 835-scholar backup was restored to an isolated database with a restricted runtime account. A separate scale fixture adds 365 synthetic people/annual records, with no fabricated masterlist membership, academic approval, course, receipts, document verification or payments. The original 835 records and publication hashes remain intact. The 1,200-record full cohort therefore has 835 eligible and 365 legitimately blocked records. Prefix scopes of 500, 835, 1,000, 1,001 and 1,200 use identical IDs in both builds.

Service measurements include fresh authorization, read snapshot and permission recheck. Times exclude HTTP, browser rendering, final JSON serialization and evidence I/O. SELECT round-trip durations are measured client-side, not MariaDB execution/CPU. Explicit GC runs before and after each sample; 20 ms intervals sample process heap/RSS. Database and OS buffers are warm and not flushed. Three samples per timing cell; medians and ranges are reported. No other test/build benchmark runs concurrently with accepted timing samples. The initial candidate pass was superseded by the matched sequential comparison because a targeted test briefly overlapped its final samples.

## Performance and equivalence

### Nine preloaded source projections

| Records | Before median ms (range) | After median ms (range) | SELECTs before -> after | Output |
|---:|---:|---:|---:|---|
| 500 | 55.36 (54.55-99.52) | 48.84 (48.34-87.99) | 19 -> 35 | Exact, all 3 pairs |
| 835 | 92.46 (91.91-96.21) | 71.72 (70.48-72.95) | 19 -> 51 | Exact, all 3 pairs |
| 1,000 | 141.53 (122.97-148.88) | 80.28 (80.16-80.31) | 19 -> 51 | Exact, all 3 pairs |
| 1,001 | 1,553.63 (1,538.47-1,646.65) | 83.88 (79.78-84.99) | 9,021 -> 59 | Exact, all 3 pairs |
| 1,200 | 1,832.57 (1,829.84-1,852.14) | 90.32 (89.47-91.20) | 10,812 -> 59 | Exact, all 3 pairs |

### Complete automatic payroll candidates

| Records | Before median ms (range) | After median ms (range) | SELECTs before -> after | Output |
|---:|---:|---:|---:|---|
| 500 | 3,633.10 (3,563.25-3,880.33) | 3,588.00 (3,552.40-3,909.23) | 2,812 -> 2,828 | Exact, all 3 pairs |
| 835 | 5,839.41 (5,831.99-5,872.49) | 5,828.90 (5,792.05-5,848.97) | 4,711 -> 4,743 | Exact, all 3 pairs |
| 1,000 | 5,938.51 (5,936.23-5,967.36) | 5,894.33 (5,890.83-5,915.35) | 4,957 -> 4,989 | Exact, all 3 pairs |
| 1,001 | 7,265.73 (7,217.37-7,389.53) | 5,978.57 (5,950.52-6,076.70) | 11,517 -> 5,023 | Exact, all 3 pairs |
| 1,200 | 7,719.74 (7,674.68-7,761.98) | 6,113.49 (6,104.64-6,135.15) | 13,144 -> 5,365 | Exact, all 3 pairs |

### R01 Registry regression

| Records | Before median ms (range) | After median ms (range) | SELECTs before -> after | Output |
|---:|---:|---:|---:|---|
| 25 | 744.77 (693.26-936.05) | 802.79 (799.57-977.01) | 2,063 -> 2,063 | Exact, all 3 pairs |
| 100 | 2,836.71 (2,808.31-2,846.59) | 2,802.39 (2,792.51-2,864.32) | 8,169 -> 8,169 | Exact, all 3 pairs |

### Full 1,200-record candidate metrics

| Metric (median) | Before | After |
|---|---:|---:|
| Summed client-observed SELECT round-trip ms | 4,114.84 | 2,738.93 |
| Node CPU ms | 6,421.00 | 5,093.00 |
| SQL rows returned | 61,998.00 | 60,279.00 |
| Eligible scholars | 835.00 | 835.00 |
| Uncompressed result bytes | 4,601,415.00 | 4,601,415.00 |

All five candidate cohorts retain the same candidate lists, order, form rows, amounts, issues, evidence and source hash. The full 1,200-record result has 835 eligible scholars and 365 blocked synthetic records; its complete payload SHA256 is `c2a6309f0d13210c958aff93a1fc1ce6b335be6a1ed3d39caf1d6f6938a7d681`. The 835-record scope retains the original full candidate payload SHA256 `f40b2032a8c11a327526bedf3e107fc3d47d660d9dee41738e5d5a12fa9c44d9`.

Below the former cutoff, bounded preloads add round trips: these are reported even where end-to-end time does not improve. R07 removes the demonstrated 1,001-record cliff; it does not promise every smaller-cohort timing is faster.

### Twenty sequential full-cohort generations per build

Both builds use the same 1,200-record fixture and exact payload. These dedicated runs skip oracle JSON parsing and payload-file writes, avoiding their impact on retained heap. Each run releases its result, collects garbage and records pool occupancy. No out-of-memory error or database connection leak occurred.

| Memory metric | Before | After |
|---|---:|---:|
| Retained heap, runs 6-10 median MiB | 29.68 | 29.80 |
| Retained heap, runs 16-20 median MiB | 29.88 | 30.05 |
| Retained growth between these windows MiB | 0.21 | 0.25 |
| Median sampled peak heap MiB | 141.16 | 168.72 |
| Maximum sampled peak heap MiB | 179.06 | 190.42 |
| Median sampled peak RSS MiB | 321.79 | 399.94 |
| Maximum sampled peak RSS MiB | 401.99 | 448.78 |

**Memory limitation:** retained heap is stable and nearly equal, but transient memory did regress: maximum sampled heap increased from 179.06 to 190.42 MiB and maximum RSS from 401.99 to 448.78 MiB; median peaks also increased. The audit's broad no-memory-regression target is therefore not fully met. Reduced query work and compact preload keys do not establish lower total peak memory. This is acceptable only as a disclosed local review candidate, not evidence of office-wide concurrent capacity.

Stability criteria: final-five retained-heap median within 1 MiB of runs 6-10, final-15 trend no more than 128 KiB/run, 20 successful generations, identical outputs and all connections returned with zero queue. These are short controlled observations, not a concurrent-office capacity or multi-day leak guarantee. Peak RSS reflects the Node allocator, JIT and garbage collector as well as request data; the raw per-run observations are retained. Any higher transient maximum is not described as a memory improvement.

### R03-R05 regressions

| Reader | Before median ms | After median ms | SELECTs before -> after | Equivalence |
|---|---:|---:|---:|---|
| Dashboard (1,200 records) | 5,084.11 | 5,047.21 | 639 -> 639 | All 3 pairs |
| Payroll summary | 9.07 | 11.58 | 14 -> 14 | All 3 pairs |
| Report scholars, first 25 | 16.06 | 20.72 | 13 -> 13 | Exact stable fields |
| Report scholars, first 50 | 14.36 | 14.08 | 13 -> 13 | Exact stable fields |
| Report scholars, first 100 | 13.94 | 14.38 | 13 -> 13 | Exact stable fields |
| Report eligibility, first 25 | 366.20 | 354.44 | 114 -> 114 | Exact stable fields |
| Report eligibility, first 50 | 490.06 | 478.32 | 116 -> 116 | Exact stable fields |
| Report eligibility, first 100 | 740.14 | 716.14 | 119 -> 119 | Exact stable fields |

The 25-row Registry median was higher in this run (744.77 to 802.79 ms), with overlapping observed ranges and unchanged query counts; no speed improvement is claimed there. The 100-row median and Dashboard were essentially unchanged.

Registry responses are compared in full. Dashboard compares all cards and context/scope, excluding request-time metadata. Report pages exclude only checkedAt/generatedAt; counts, rows, ordering and source fingerprints are compared. Payroll summary uses its existing normalization for request-time fields. No transport/browser latency is inferred from these service measurements.


## Validation and limitations

Final acceptance **passed: 57/57 suites**, including lint, **485 unit tests in 84 files**, all TypeScript checks, production build, secret scan, authorization/audit, imports, masterlist, OVR, academic, payments, reprocessing, exports, migration/backup and concurrency suites. The sequential frozen-source gate ran from `2026-10-21T11:40:03.064Z` to `2026-10-21T12:10:44.737Z` (1841.7 seconds). All 577 source inputs, 211 compiled artifacts and 55 migration hashes match the accepted fingerprints. Only the two documented server artifacts changed relative to R06; client artifacts remain identical. No source changes or competing builds/benchmarks occurred during the gate.

Targeted tests passed before the gate:

- `npm run check`: lint, 485 unit tests, TypeScript, build, secrets. An initial test-helper TypeScript error was corrected before this final passing run.
- `npm run test:candidates-db`: 35 candidate states and 90 complete preloader eligibility-view comparisons.
- `npm run test:course-pending-db -- --registry-parity --candidate-parity`: 66 candidate states and 183 preloader eligibility-view comparisons. These include preserved frozen evidence, course completion, corrections, waivers/overrides, paid/held membership, reprocessing, stale sources, exact retries and rollback.
- `node output/r07-cohort-20261021/transaction.mjs`: real 1,200-record mutation transaction, blocked competitor, fresh source after write, rollback restoration.
- New cohort regressions passed at 500/1,000/1,001/1,201 records, including all nine point projections, per-key 50-history limit, empty groups, scoped year/IDs, deduplication, lock suffixes, caller isolation and cache invalidation. Replacing the production preloader with the original reader produced five failing regressions; restoring R07 passed. Exact SQL/bindings, method identity and clock bypass remain covered.

Executed measurement commands (sequential; each helper uses the owned restored database, never LAN):

```powershell
node output/r07-cohort-20261021/fixture.mjs restore
node --expose-gc output/r07-cohort-20261021/fixture.mjs before --reuse --controlled
node output/r07-cohort-20261021/expand.mjs
node --expose-gc output/r07-cohort-20261021/benchmark.mjs before sources
node --expose-gc output/r07-cohort-20261021/benchmark.mjs before candidates
node output/r07-cohort-20261021/run-benchmarks.mjs
node output/r07-cohort-20261021/run-final-benchmarks.mjs
node output/r07-cohort-20261021/verify-inventory.mjs
node output/r07-cohort-20261021/cleanup.mjs
$env:LDSS_UAT_OUTPUT = 'output/qa-r07-cohort-20261021/uat-r1'
npm run test:uat
```

The original baseline candidate timing pass was repeated without overlapping tests; provisional chunk-only optimized results are retained under `initial-chunk-only/`. Final optimized results all come from the accepted build. Baseline and measured artifacts are preserved outside the web root; credentials and raw scholar payloads remain in the restricted local fixture directory, not the report or Git.

Cleanup: the owned restored database and both runtime/definer accounts were removed after inventory equality and no-active-connection checks. All six preexisting test databases were preserved. No browser fixture or service was started. Existing LAN listeners and working records were untouched. The full acceptance runner also cleaned up its own disposable fixtures; a [post-gate metadata check](../../output/r07-cohort-20261021/post-gate-cleanup.json) confirmed only the same six preexisting test databases remain.

Evidence: [accepted gate](../../output/qa-r07-cohort-20261021/uat-r1/F36-report.json), [final verification](../../output/r07-cohort-20261021/final-verification.json), [source preservation](../../output/r07-cohort-20261021/source-preservation.json), [baseline fingerprints](../../output/r07-cohort-20261021/baseline-manifest.json), [equivalence and memory](../../output/r07-cohort-20261021/equivalence-and-memory.json), [source baseline](../../output/r07-cohort-20261021/before-sources.json), [source optimized](../../output/r07-cohort-20261021/after-sources.json), [candidate baseline](../../output/r07-cohort-20261021/before-candidates.json), [candidate optimized](../../output/r07-cohort-20261021/after-candidates.json), [memory baseline](../../output/r07-cohort-20261021/before-memory.json), [memory optimized](../../output/r07-cohort-20261021/after-memory.json), [transaction test](../../output/r07-cohort-20261021/transaction.json), [fixture/oracle verification](../../output/r07-cohort-20261021/oracle-and-fixture-verification.json), [read-only inventory](../../output/r07-cohort-20261021/inventory-verification.json), [cleanup](../../output/r07-cohort-20261021/cleanup.json), [failing-before regressions](../../output/r07-cohort-20261021/failing-before.log).

Gate SHA256: `888ef8be0b1e86be3ad8fa93d00ca8e36d9d025c3a0a81d10f547a2963259bea`. R07 is ready for review; no deployment or later optimization is authorized by this report.

No browser UI or route changes were made. Physical second-PC testing and browser rendering latency are not measured by these service benchmarks. Full office concurrency capacity, cold-server behavior and multi-day memory stability remain unproven. Source grouping improves the demonstrated cutoff; the 1,200-record projection still executes 5,365 SELECTs and takes about 6.11 seconds. Remaining eligibility/document/academic/payment source work in the existing services and R02 adapter is outside this bounded preloader change. No new row-level SQL attribution or server-side execution profiling was added in R07, so a finer claim about which remaining query dominates would be speculative. The unscoped annual discovery and all prepared results remain linear in cohort size; many history rows per scholar can still increase memory. No new index was justified by the repeated-query evidence, and none was added. No loading indicator or stale cross-request cache conceals that work.
