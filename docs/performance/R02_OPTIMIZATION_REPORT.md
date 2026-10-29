# R02 — Payroll candidate generation optimization

Date: 21 October 2026. Scope: R02 only, local validation. No deployment, production-data changes, migration, index change, new endpoint or permission change.

## Result and acceptance

The full 835-scholar candidate projection decreased from **26.03 seconds to 6.02 seconds median**, with **60,133 → 4,712 SELECTs (92.16% fewer)**. All 835 eligible candidates, their order, issues, evidence, amounts, form and source fingerprint were identical. This remains a multi-second calculation; it is not an immediate full-page load.

The final targeted lifecycle regressions, lint, **443 unit tests across 79 files**, TypeScript checks, production build and secret scan passed. **All 55 configured acceptance suites passed**, sequentially from 10:31:35 to 10:57:04 Philippine time on 21 October 2026. Final checks confirmed all **553 source files and 205 build artifacts** match acceptance fingerprints, with no application/test changes during or after the gate. Production authorization remains false; R02 is ready for user review.

Baseline: the acceptance-tested **R01 working tree**, based on Git `89cba417442219f3839e59766e19b62fa744b944`, with its uncommitted R01 improvements. The Git commit alone is not the R02 baseline. The complete R01 compiled server was frozen outside the web root before any R02 edit. All **199 frozen server artifacts** were independently hash-checked against R01 acceptance; all matched. Its 546-file acceptance manifest is retained locally. Existing unrelated changes, `.vscode/` and the workflow PDF were preserved.

## Confirmed causes in current code

Inspection covered `automatic-draft.ts`, `managed-payroll.ts`, `ovr/service.ts`, `cohort-reads.ts`, eligibility/semester sources, read caching, reprocessing, publication/academic readers, routes and relevant schema/index definitions.

- R01 correctly removed full candidate generation from Registry. That improvement remains in place.
- The active 835-scholar setup uses **`managedCandidates`**, not the historical `automaticDraft` path. Both use the same authoritative eligibility services. Profiling the current path, rather than assuming the old audit still described it, found approximately 72 SELECTs per evaluated scholar.
- The existing cohort preloader covers a limited set of point queries. Subsequent semester compliance, document verification, prior approval, placement, timing, deferral and claim readers still perform many point reads. The request SQL cache also evicts shared configuration queries during large projections.
- Official publication snapshots were repeatedly cloned/parsed and searched for membership and award numbers. Reprocessing insertion also used repeated linear searches of candidate arrays.
- EXPLAIN samples showed existing keys available for the measured source reads. Repetition and repeated document joins were the demonstrated problem; no new index was justified or added.
- OVR detail still assembles other financial and validation views. This report measures candidate generation, not the complete OVR HTTP response or screen. No R03/dashboard, R04/detail splitting or later remediation was implemented.

## Implementation and modified files

Production files:

| File | Change |
|---|---|
| `server/ovr/candidate-reads.ts` (new) | Projection-local source adapter; selected annual/scholar/academic/owner/document key sets; bulk predicates of at most 200 keys per dimension; keyed result groups |
| `server/ovr/automatic-draft.ts` | Uses the source adapter and publication award index; Set lookup for retry duplication; original eligibility and form logic retained |
| `server/ovr/managed-payroll.ts` | Uses the same adapter; Map lookup for retry replacement; original issues, pending/deferred decisions, form ordering and fingerprint retained |
| `server/read-cache.ts` | `indexedRead` reuses a transaction-local index while cloning only the requested value; existing write invalidation also clears these indexes |
| `server/eligibility/publication-index.ts` (new) | Membership/award maps; first duplicate award preserved; invalid-publication metadata and existing short-circuit behavior retained |
| `server/eligibility/official-membership.ts` | Uses the indexed publication lookup, retaining its existing validity checks |
| `server/eligibility/semester-sources.ts` | Uses the indexed award lookup; no compliance, verification or allocation decision changed |

Regression/configuration files: `scripts/test-candidate-parity.ts`, `scripts/test-eligibility-db.ts`, `scripts/test-registry-parity.ts`, `package.json`, `tests/candidate-reads.test.ts`, `tests/publication-index.test.ts`, and frozen pre-R02 function oracles `tests/fixtures/legacy-automatic-draft.ts` / `legacy-managed-payroll.ts`. This report is the only new project documentation file.

The adapter batches **raw rows**, not decisions. It preserves original filters, fixed parameters, ORDER BY, per-key LIMIT and lock suffixes. Compound owner/document keys and the existing alternative checklist-ownership predicate retain both constraints. Unsupported aggregates, outer ORs, offsets, unknown IDs and unsupported query shapes fall back to the original read. SQL shapes are parsed once per projection. No separate eligibility engine, persisted projection or cross-request cache was introduced.

## Measured performance

Three runs per implementation and scenario, sequentially, without competing test/build processes. The final comparison uses the frozen R01 build and the final R02 build against the same owned restore of the verified 835-scholar backup.

| Candidate workset | Before median | After median | SELECTs before → after | Evaluated / eligible, both | Uncompressed result bytes |
|---:|---:|---:|---:|---:|---:|
| 25 | 1,070.39 ms | 260.02 ms | 1,855 → 244 | 25 / 25 | 110,284 |
| 100 | 3,169.16 ms | 897.39 ms | 7,244 → 614 | 100 / 100 | 439,431 |
| **835, full cohort** | **26,029.54 ms** | **6,018.76 ms** | **60,133 → 4,712** | **835 / 835** | **3,666,760** |

The smaller scenarios are controlled candidate/preloader annual-result worksets over the **same 835-row database and shared snapshots**, enforced identically by the measurement adapter. They are not independent 25-/100-scholar databases or new API options. The 835 run uses the unmodified full cohort. The initial before-edit full baseline was 26,466.18 ms median; the table uses the later matched garbage-collection-controlled comparison, not a selected fastest run.

For the full cohort:

| Metric, median | Before | After |
|---|---:|---:|
| Summed client-observed SELECT round-trip duration | 19,032.28 ms | 2,556.69 ms |
| Node process CPU | 15,938 ms | 5,265 ms |
| Sampled peak JS heap | 70.55 MiB | 164.60 MiB |
| Retained JS heap after explicit GC, result retained | 29.65 MiB | 39.10 MiB |
| Sampled peak process RSS | 148.40 MiB | 398.18 MiB |

**Memory tradeoff:** batching retains more raw rows during a projection. Peak heap/RSS increased despite lower CPU, query count and duration. Retained heap was about 9.45 MiB higher in this measurement. These are sampled process figures, not exact per-request allocations or a proven concurrent-user memory bound. Earlier non-controlled observations were substantially noisier and are retained locally; no memory improvement is claimed.

Timing includes authorization, consistent snapshot, cycle/batch reads, candidate computation and post-read permission recheck. It excludes HTTP/network/browser rendering and final JSON serialization. SELECT counts include authorization. Database time is client-observed round-trip time, not isolated MariaDB execution/CPU; it overlaps process CPU and must not be added to it. Actual rows examined, server CPU/I/O, lock waits and pool occupancy were not measured. EXPLAIN estimates are not runtime row counts.

`node --expose-gc` collected garbage before each controlled sample and after timing; DB/OS buffers were not flushed. These are warmed shared-host observations, not cold-server guarantees. All ranges and iterations are retained; no outliers were dropped.

## Equivalence and R01 preservation

All **nine candidate comparisons** had identical complete JSON SHA-256 and deep-equal outputs. Full-cohort source fingerprint: `938db0c7c4a5521cb5c1b722ff8e1a37039d72543c4baea9831a7cfa371b92dd`. Full payload SHA-256: `f40b2032a8c11a327526bedf3e107fc3d47d660d9dee41738e5d5a12fa9c44d9`.

On this managed fixture, `automaticDraft` correctly returns null in both builds because a submission window exists. Its guard was not bypassed to manufacture a legacy benchmark. Non-null legacy automatic compatibility was compared on valid disposable historical-format fixtures. The full 835 performance result belongs to the active managed generator.

| R01 Registry displayed rows | Frozen R01 median | R02 median | SELECTs before → after | Complete response |
|---:|---:|---:|---:|---|
| 25 | 840.18 ms | 749.26 ms | 2,065 → 2,059 | Identical, all three pairs |
| 100 | 3,378.12 ms | 2,853.52 ms | 8,193 → 8,165 | Identical, all three pairs |

These are fresh R01-vs-R02 service observations, not the original pre-R01 timings. The instrument's raw `scholarsEvaluated=0` field is inapplicable to Registry; that counter observes the full candidate query, which Registry does not execute. Displayed rows and returned statuses are used here. Original R01 bounded-selection, empty-metadata, timeout and navigation code is unchanged.

## Regression and transaction safety

Executed targeted results:

- `npm run test:candidates-db`: passed; **35 complete-output states**, 29 managed and five non-null legacy automatic projections.
- `npm run test:course-pending-db -- --registry-parity --candidate-parity`: passed; **66 complete-output states**, 60 managed and five non-null legacy automatic projections.
- `npm run check`: passed lint, 443 unit tests, all configured TypeScript checks, production build and secret scan. Existing client chunk-size advisory remains; no client bundling optimization was included.
- `npm run test:uat`: **55/55 suites passed**, including all six concurrency suites, the 835-scholar import/prior-approval/finalization lifecycle, authorization/audit checks, financial/history/export regressions and migration/backup compatibility. The full import fixture finalized 835 allocations without recording payments. All 55 migration fingerprints remain unchanged.
- Unit regressions cover per-key limits/order, empty groups, compound predicates, repeated ownership parameters, 401-key chunking, lock suffixes, write invalidation, nested queries/literal question marks, unsupported-query fallbacks, publication identity pairs, first duplicate awards, invalid publication metadata and scoped cache isolation.

The DB lifecycles cover eligible/ineligible records, missing/stale/corrected documents, academic compliance, waivers/overrides, course-pending completion, masterlist amendments, deferral/reservation, existing/paid/held allocations, pending payment corrections, unclaimed reprocessing, frozen evidence, stale hashes, exact retries, audit rollback, authorization and concurrent finalization. Complete comparisons include issues and fingerprints, not merely candidate counts. Full-cohort comparison also uses the frozen **entire pre-R02 server**, independently of the permanent function oracles' shared service imports.

No transaction boundary, isolation mode or financial constraint changed. The configuration guard and existing finalization/current-source checks remain. Bulk queries retain their original locking clauses; mapping reads add shared locks. Lock acquisition happens earlier, and removing a global LIMIT in favor of per-key selection can lock additional historical rows. This is not claimed to be an identical lock acquisition sequence. Existing guarded mutations serialize through their configuration lock; the sequential acceptance gate includes the concurrency suites. Normal `readSnapshot` continues using its existing read-only snapshot and lock-clause handling. Every write through the adapter invalidates its raw groups and ordinary/derived caches.

## Remaining work, limitations and evidence

- Full candidate generation still takes about six seconds locally. Required live eligibility, coverage/provenance hashing, historical evidence and clock-sensitive checks remain. In particular, per-scholar deadline clock queries were deliberately not memoized across a cutoff.
- Some shared configuration SQL is still repeated after cache eviction. Payment/reprocessing readers retain their authoritative validation. Entire OVR detail, Home, reports and notification loading were not optimized or benchmarked here.
- R02 was measured through 835 scholars. The shared preloader's inherited >1,000 behavior remains unchanged; larger fully prepared cohorts and concurrent-user peak memory need separate measurements. No R07-wide cache/preloader rewrite was performed.
- No full browser or second-PC/LAN latency run was performed for this backend-only change. R01 API behavior/performance and its unit regressions were rerun; no claim is made about full-screen rendering time.
- Owned restored benchmark data was inventory-checked before/after and its database/runtime/definer accounts removed. Final verification found **zero owned fixture databases remaining**; the six pre-existing fixture databases were preserved. Source/artifact hashes match the frozen acceptance run. The seven R01-specific source/test files are byte-for-byte unchanged; all other baseline differences are the 15 intended R02 code/test files listed above. Existing working records and accounts were not repaired or changed.

Local evidence directory: `output/r02-payroll-20261021/`. It contains `before-controlled.json`, `after-controlled.json`, `before-registry.json`, `after-registry.json`, `performance-summary.json`, SQL/count/EXPLAIN samples without bound values, check/lifecycle logs, cleanup evidence and frozen-source manifests. Raw payloads, fixture credentials and the frozen baseline are protected outside the web root. Evidence is local and excluded from publication; this report contains aggregate results only.

Final acceptance evidence: `uat-r1/F36-report.json`, `acceptance-summary.json`, `source-freeze.json`, `baseline-integrity.json`, and `cleanup.json`. Gate report SHA-256: `a0abdf51ffaa707f2df9c4cbc7d2edfdf3cf38b9622ee509394c7cab668d68ff`. `git diff --check` passed. No source files were deleted.

Commands used for the final comparison and checks:

```powershell
node --expose-gc output/r02-payroll-20261021/benchmark.mjs before --reuse --controlled
node --expose-gc output/r02-payroll-20261021/benchmark.mjs after --controlled --keep
node output/r02-payroll-20261021/benchmark.mjs before --reuse --registry
node output/r02-payroll-20261021/benchmark.mjs after --registry
npm run test:candidates-db
npm run test:course-pending-db -- --registry-parity --candidate-parity
npm run check
$env:LDSS_UAT_OUTPUT = 'output/r02-payroll-20261021/uat-r1'
npm run test:uat
node output/r02-payroll-20261021/record-state.mjs verify
```

Initial development checks caught an unused test-oracle import and test-mock TypeScript typing errors; both were corrected. The first correct-output batching prototype still took about 18 seconds because compound coverage predicates caused redundant batches; profiling drove the final grouping correction. Those intermediate logs are retained, not counted as the final result.

R02 is complete locally. Work stops here awaiting user approval. No GitHub push, LAN package/deployment, R03 or later implementation was performed.
