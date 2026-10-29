# P01 — Payment workflow foundation

Date: 21 October 2026 (Asia/Manila). Scope: P01 only, localhost/disposable tests.

Status: **P01 final verification passed locally: all 57 UAT suites and focused browser smoke checks. Awaiting explicit P02 approval.** P02–P10 and LAN deployment remain unstarted. The gate retains its Coordinator/technical-owner sign-off fields as pending; no office sign-off is invented here.

## A. Implementation summary

The revised [implementation plan](PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md) is the scope authority. Its permanent P01–P10 acceptance standards were updated **before code changes**: simple accessible Staff workflows, minimal clicks/typing, known-field population, familiar terminology, bounded reads, R01–R07 preservation, cache correctness, measured regressions and financial/audit integrity. P09 does not defer usability work from earlier phases.

The foundation adds no financial behavior or public interface. No existing server module or frontend source was edited. Existing working-tree changes were retained.

| File | Change |
|---|---|
| [contracts.ts](../../server/payments/contracts.ts) | Internal existing-state/date/outcome aliases, distinct future Unclaimed DV-only versus omitted OR + DV origin types, complete financial-evidence input contract and strictly validated snapshot-only financial-basis output |
| [financial-basis.ts](../../server/payments/financial-basis.ts) | `existingFinancialBasis()` and `existingPaymentProjection()`; pure, inactive adapters over already-loaded canonical evidence. No SQL, connection, cache, mutation or eligibility engine |
| [payment-foundation.test.ts](../../tests/payment-foundation.test.ts) | 18 new unit cases, including cohort-size parameterization, old reconciliation compatibility, pending corrections, unknown dates, source invalidation, partial/cross-batch rejection and no mutation/retained cache |
| [synthetic fixture](../../tests/fixtures/payment-foundation.ts) | Loaded synthetic evidence for 0–1,200 rows; 835 includes ten Unclaimed and 825 Paid. This is a test fixture, not payment authorization |
| [integration assertions](../../scripts/test-payment-foundation.ts) | Compares adapter output to the existing authorized API detail in the same snapshot; no additional queries or HTTP requests |
| [existing DB harness](../../scripts/test-eligibility-db.ts) | Optional `--payment-foundation` test hook on successful existing full-detail GETs |
| [package.json](../../package.json) | Existing `test:payments-db` adds that hook, so the existing configured UAT gate includes the new integration assertions |
| [implementation plan](PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md) | Mandatory standards, P01 status and implementation/acceptance record |

Local evidence and the reproducible microbenchmark live under [output/p01-foundation-20261021](../../output/p01-foundation-20261021). No credentials were read from the IDE's account-activation tab.

### Contracts and reuse

- Existing batch states are represented without adding transitions. `ExistingProcessingAction` derives from the existing `processingTransition` signature; there is no parallel state machine.
- `PaymentDateFacts` preserves nullable actual dates separately from immutable recording timestamps. No date-correction command or changed claimability rule is implemented.
- The evidence contract requires original/effective payments, corrections, amendments, original/effective frozen references, Treasury evidence and historical receipts. Missing sources are rejected rather than assumed empty; cross-batch or mismatched payment identities are rejected.
- `existingPaymentProjection()` returns the existing payment arrays/corrections unchanged and calls **the existing `reconcilePayments()`**. Existing `paymentRecords()`/`effectivePayments()` retain correction and unpaid-classification precedence. In particular, current withheld/review completion semantics remain unchanged; P03's stricter completion rule is not enabled.
- The fingerprint pins financial sources and verified frozen hashes without serializing full frozen eligibility/cohort graphs. Object insertion order is normalized; roster/payment order is retained. Current classification writes also advance the batch event revision, which is included. Pending/approved/rejected historical sources and Treasury revisions are included independently because those writers do not necessarily advance the batch revision.
- Every basis declares `freshness: snapshot_only` and `authorizesPayment: false`. Its schema rejects claims of payment authority, partial-page scope and unknown fields. It is not a command, fresh permission check or evidence of eligibility.
- Callers must obtain complete server-side evidence through the existing `AuthorizationService.readSnapshot()` or `withPermission()` transaction and verified roster readers. No browser-supplied or cross-request cached graph may authorize a write. This phase adds no new loader; future P02 summary/search must not call heavy full-detail reconstruction merely to use the adapter.
- Existing `assertNoPaidClaim`, `requireClaimOpen`, `managedRelease`, current permission checks, configuration lock, journals and atomic audits remain the consequential-write boundary. They were not replaced, wrapped in a second engine or weakened.

### Scope/deviations

No deviation from the revised no-DDL P01 scope. There are **zero** new/modified migrations, tables, columns, indexes, permission seeds, runtime grants, backfills, activation records, public routes, Staff screens, Word templates or operational payment commands. Existing migrations/grants were used only by the existing disposable test harnesses to create isolated fixtures. Real financial records were not changed.

## B. Financial integrity

All existing financial writers remain byte-identical. Authorization, CSRF, user revocation checks, shared `configuration_guard` ordering, transactions, unique entitlement/allocation/payment constraints, exact retry receipts and append-only audits/corrections are unchanged.

Executed disposable tests cover Staff/Coordinator/System Administrator boundaries, source/revision conflicts, concurrent finalization, cross-batch correction-versus-payment races, completed retries, audit-failure rollback, withheld/Unclaimed distinctions, original release links, historical unknown dates, expired release denial, immutable snapshots and legacy containment. The new adapter neither changes eligibility nor approves an individual financial route.

Across the two P01-enabled DB runs, complete current-output equivalence passed for **93 snapshots**: 64 payment/reprocessing and 29 Treasury snapshots. These contained 37 payment rows and 12 correction observations in total, two historical-receipt observations and ten closed-batch snapshots. Counts describe observations across checkpoints, not unique payments/scholars. Adapter work added zero SELECTs/writes.

## C. Performance preservation

There is **no runtime hot-path performance change**: production routes do not import the new modules. The only existing code modifications are test wiring. Existing source checks and newly executed parity tests protect:

| Optimization | Preserved mechanism / evidence |
|---|---|
| R01 | Registry scoped reads, derived source reuse and automatic draft context; Registry/legacy-draft parity in Dashboard and payroll-detail suites |
| R02 | Shared candidate sources, maps, publication index and bounded preloads; 65 complete candidate states and 180 R07 eligibility comparisons in the Dashboard run; further candidate comparisons in payroll-detail tests |
| R03 | Lightweight authoritative Dashboard summaries; parity with existing full-report results across workflow changes |
| R04 | Lazy scoped payroll sections and server pages; complete/scoped/API parity across draft, review, finalized, submitted, processed and legacy cases |
| R05 | Server report pagination, global counts/fingerprints, independent lifecycle fixtures, 235-scholar paging and filtered Excel output |
| R06 | Scoped notification reads/current-state checks invoked by report-pagination lifecycle tests; no notification source or query change |
| R07 | 200-key cohort grouping, exact SQL/binding request-local reuse, write invalidation of ordinary/prepared/computed caches, same-snapshot fresh finalization; unit tests and independent pre-R07 source oracle |

No SQL, query plan, index or cache was added/changed. The adapter has no pool/connection and retains no cross-call result. Tests verify the next call sees changed input and reject partial evidence. No existing query-count or HTTP-latency improvement is claimed; those hot paths are unchanged. The initial foundation pass did not rerun the full 57-suite gate; the subsequent final acceptance run did, as recorded in section F. The original restored 835/1,200-cohort SQL timing benchmarks were not rerun.

### Measured adapter cost

[Benchmark source](../../output/p01-foundation-20261021/benchmark.ts) and [raw results](../../output/p01-foundation-20261021/benchmark.json). Same loaded synthetic records, ten warmups, five samples of twenty calls; median milliseconds per call. Original operation is existing reconciliation alone; foundation operation adds complete evidence checking/fingerprinting and calls that same reconciliation. This measures **additional foundation work**, not an equivalent-feature speedup or LAN response time. Neither operation issues SQL or HTTP requests.

| Loaded rows | Existing reconciliation ms | Foundation projection ms | SELECTs before / adapter | Reconciliation output |
|---:|---:|---:|---:|---|
| 25 | 0.011 | 0.292 | 0 / 0 | Exact |
| 100 | 0.057 | 1.036 | 0 / 0 | Exact |
| 835 | 2.603 | 10.751 | 0 / 0 | Exact |
| 1,200 | 4.771 | 16.323 | 0 / 0 | Exact |

Final timing ran after all validation runners finished, on Windows/Node v22.21.0. Ranges and twenty sequential 835-row post-GC observations are in the raw JSON. Retained heap was **11.266→11.267 MiB**, a net **832 bytes**; the post-GC range was 11.263–11.293 MiB. Maximum sampled RSS was **110.14 MiB**; process high-water RSS was **111.73 MiB**, including the earlier benchmark/warmup. No OOM occurred. The adapter opens no database connection, so it cannot itself retain one. This short loaded-evidence sample is not a long-duration service stress test. Do not compare it with R07's full database/service memory workload or claim an application speedup.

### Remaining performance concerns

- Existing reconciliation still contains repeated membership searches. P01 preserves its semantics/implementation; it does not optimize that unrelated hot path.
- Fingerprinting has nonzero CPU/allocation cost. Future phases must compute/reuse one complete basis per protected operation, not once per scholar or on every table-row render. Summary/search remains lightweight and paginated.
- Batch revision is conservative evidence: non-payment batch events may also invalidate the basis. P03 must design returned-verification storage so verification does not immediately stale itself, while retaining all financial source/version checks. P01 does not register such a writer.
- Existing R07 transient peak RSS increased roughly 402→449 MiB in its accepted service benchmark. That limitation remains unresolved; this pass does not establish office-wide memory capacity or claim to fix it.
- Vite's existing >500-kB chunk warning remains. Existing client bundle hashes are unchanged; no new frontend asset is introduced.

## D. Verification results

Exact commands were executed from the project root; output logs are retained in the linked evidence directory (PowerShell UTF-16 logs).

| Command/check | Executed result |
|---|---|
| `npm test -- --run tests/ovr-processing.test.ts tests/payment-corrections.test.ts tests/reprocessing.test.ts tests/read-cache.test.ts tests/cohort-reads.test.ts tests/payroll-detail.test.ts` | Pre-code baseline: 6 files / 33 tests passed |
| `npm test -- --run tests/payment-foundation.test.ts` | 18 new tests passed |
| `npm run typecheck` | Passed |
| `npm run check` | Passed: lint, 85 files / 503 unit tests, all TypeScript checks, production build and secret scan |
| `npm run test:payments-db` | Passed; 64 P01 equivalence snapshots, reprocessing/correction races, immutable history, retries and rollback |
| `node node_modules/tsx/dist/cli.mjs scripts/test-eligibility-db.ts --main-payroll --treasury --payment-foundation` | Passed; 29 P01 snapshots, two historical-receipt observations, Treasury revisions and expired-period safeguards |
| `npm run test:audit-db` | Passed; 13 eligibility scenarios including F31 audit/permission/transaction checks |
| `npm run test:dashboard-db` | Passed; Registry, candidate, Dashboard and R07 source parity, 15 eligibility scenarios |
| `npm run test:payroll-detail-db` | Passed; three independent Treasury/reprocessing/legacy fixtures, scoped/complete parity and API permissions |
| `npm run test:report-pagination-db` | Passed; three independent Treasury/override/reprocessing fixtures, report/API/notification-current checks and 235-scholar export matrix |
| `npm run test:concurrency-db` | Passed, all six suites; includes 835-row import, prior approval/finalization, receiving, identity, correction/payment and amendment races |
| `node --expose-gc --import tsx output/p01-foundation-20261021/benchmark.ts` | Passed; final isolated timing/equivalence sample and twenty sequential memory observations above |
| Scoped `git diff --check` | Passed |

All listed validation commands completed with exit code zero. The production build emitted the existing chunk-size warning; exit code was zero. No dependency was installed or upgraded. The six-suite concurrency runner's 835-row prior-approval segment took approximately 297 seconds; this is a newly executed functional result, not an isolated before/after timing comparison.

### UI/UX assessment

P01 has no new Staff interface, steps, labels, forms or selection workflow. All existing frontend source and client artifacts remain unchanged. Existing operational API/role/history tests passed. The initial pass did not rerun browser checks; section F now records the focused browser, keyboard, narrower-layout and screenshot verification. This is not a complete accessibility/device matrix. P02 must test its actual short routine journey, focus/error handling, paging selection and uncertain-result recovery from its first delivery.

### Preservation and cleanup

Baseline/source checks are recorded in [baseline.json](../../output/p01-foundation-20261021/baseline.json) and [scope-verification.json](../../output/p01-foundation-20261021/scope-verification.json). Compared with the accepted R07 manifest, only intended test wiring differs among its 577 existing source inputs; all 211 existing compiled artifacts and 55 migration hashes match. New foundation modules are additional compiled modules, unused by current routes. Existing frontend, financial writers, authorization, configuration and deployment sources remain unchanged.

Each DB runner creates uniquely named localhost fixtures/accounts, asserts its ownership and drops them in `finally`. Final [read-only cleanup verification](../../output/p01-foundation-20261021/cleanup.json) found only the same six older test schemas already documented as preserved by R07, and six older temporary accounts. Their table creation/account timestamps predate the P01 baseline; no new fixture remains. Those pre-existing schemas/accounts were deliberately left untouched. No browser fixture/listener was started and no existing service was stopped. No LAN/production deployment or application-data repair occurred.

## E. Next steps and boundaries

P01 establishes contracts and compatibility evidence, not a deployed feature. Await explicit approval before P02. Recommended P02 scope is the plan's short Payment Recording flow: lightweight server summary/search/page reads, retained ten-Unclaimed selection, one reviewed 825-Paid operation, internal concurrency/idempotency, honest date handling, optimized atomic writes and existing authoritative guard reuse. Do not use the heavy full-detail test boundary to implement ordinary table loading.

Remaining policy boundaries are unchanged: Financial/Releasing Office claiming cutoff versus current semester-end restriction, extra closed/expired-period date-correction requirements, and eventual P06 prototype/form-field approval. Missing original Word templates do not block P01–P05; screenshot-based editable drafts are P06 work only.

No individual payment, bulk payment command, automatic approval, new permission or Word prototype is implemented. P02 remains unstarted.

## F. Final acceptance gate and browser verification — 21 October 2026

### Frozen candidate and approved procedure

After the user's provisional acceptance, ran the existing unmodified sequential gate from the project root:

```powershell
$env:LDSS_UAT_OUTPUT = 'output/p01-final-acceptance-20261021/uat'
npm run test:uat
```

The directory was new. No source edits, additional tests, browser fixture or rebuild ran concurrently with the gate. No fixes were needed. Execution was **23:06:30–23:37:56 Philippine time**, **1,886.095 seconds (31 minutes 26.095 seconds)**. Exit code zero; **57/57 suites passed**. The gate's `check` suite passed lint, **503 tests in 85 unit files**, all TypeScript checks, production build and secret scan.

Authoritative evidence: [complete gate report](../../output/p01-final-acceptance-20261021/uat/F36-report.json), [console log](../../output/p01-final-acceptance-20261021/uat-console.log), and [all suite logs](../../output/p01-final-acceptance-20261021/uat). Gate report SHA-256: `a76346f7ddacbf99984892dacbca962af0e40416f93b10b59ac5d6b5ef970c6e`.

The approved runner backed up the development database into an authenticated encrypted archive and restored an isolated copy: **128 tables**, **2,145,275 archive bytes**, restore **3.223 seconds**, `retained: false`. See the [restore evidence](../../output/backups/restore-1792595193717_7f38ae60.json). The source was `ldss_scholar_monitor_dev`; LAN data was not imported, repaired or deployed. Existing migrations were exercised only through the approved test/restore procedure; no migration/schema/grant source changed.

| Acceptance area | Executed evidence / result |
|---|---|
| Financial workflow compatibility | Payroll preparation/finalization, managed release, Treasury evidence, fixed full receipts, Unclaimed/reprocessing, cross-batch duplicate prevention and frozen source tests passed |
| Permissions and audits | Authentication/RBAC, Staff/Coordinator/Admin separation, CSRF, source/revision checks, atomic audit rollback and exact concurrent retries passed; all six concurrency suites passed |
| Corrections/reconciliation/history | Open/closed correction histories, original release links, current versus original totals, historical receipt proof, unknown dates, expiry restrictions and legacy read-only/conversion cases passed |
| Documents/academic/masterlists | COR/COG, ordinary and prior-batch approval, Course pending, standing/graduation, official membership/amendments, obsolete placeholders and immutable financial evidence passed |
| P01 adapter compatibility | Gate payment suite reran all **64** same-snapshot payment/reprocessing comparisons, including **12** correction observations and **10** closed-batch observations; zero adapter SELECTs/writes |
| R01–R07 preservation | Registry/candidate/Dashboard/detail/report/notification parity, bounded paging/preloads, request isolation and fresh source-change checks passed. No performance-sensitive runtime source changed |
| Cache invalidation | Unit cases explicitly passed populated/empty preload invalidation after writes, caller/request isolation, grouped SQL+binding/execute/query identity and clock bypass across cutoffs. New adapter remains cache-free and unused by live routes |

This is compatibility evidence, not a new performance-optimization claim. Original R07 SQL timing/peak-memory experiments were not repeated; the known roughly 402→449-MiB peak-RSS limitation remains unresolved. The existing Vite chunk-size warning remains unchanged and did not fail the build.

### Fingerprint reconciliation

[Pre-gate candidate manifest](../../output/p01-final-acceptance-20261021/candidate-baseline.json) and [final comparison](../../output/p01-final-acceptance-20261021/fingerprint-comparison.json):

- **582 source inputs** matched the frozen P01 candidate throughout the gate and again after browser testing.
- Against accepted R07's 577 inputs, differences are exactly the approved two test-wiring edits (`package.json`, `scripts/test-eligibility-db.ts`) and five added foundation/test files. No existing server runtime, frontend, permission or deployment source changed.
- **213 build artifacts** match the gate afterward. All **211 pre-existing R07 artifacts** remain byte-identical; additions are only `dist/server/payments/contracts.js` and `dist/server/payments/financial-basis.js`.
- All **55 migration names and SHA-256 hashes** match the accepted baseline. No schema changes were introduced to obtain a pass.

### Focused browser smoke checks

After the gate, used the Playwright CLI skill with a separate headed browser/session and the unchanged built client. Port **127.0.0.1:3003** was free before starting the existing disposable fixture:

```text
node node_modules/tsx/dist/cli.mjs scripts/test-eligibility-db.ts --main-payroll --browser-release --browser
```

The fixture had two frozen synthetic members, valid Treasury evidence and one Coordinator hold. Synthetic Staff/Coordinator logins were used; no LAN accounts or real claims were changed. [Machine-readable results](../../output/p01-final-acceptance-20261021/browser-smoke-results.json), [fixture log](../../output/p01-final-acceptance-20261021/browser-fixture.log), [network observations](../../output/p01-final-acceptance-20261021/browser-network.txt), and [snapshots/screenshots](../../output/playwright/p01-final-acceptance-20261021).

| Check | Result |
|---|---|
| Staff Payroll list, processed/draft navigation and frozen roster | **Passed**; list and selected batch loaded |
| Search and keyboard | **Passed**; Tab reached the matching scholar, Enter opened the receipt form |
| Receipt attestation and Paid update | **Passed**; checkbox initially unchecked and required; explicit synthetic receipt recorded once; refreshed total PHP 5,000 |
| Hold and Unclaimed handling | **Passed**; held member stayed withheld, ordinary Released option disabled, no Staff hold-clear control; explicit Unclaimed recorded zero paid amount |
| Reconciliation and role boundary | **Passed**; Staff saw two recorded outcomes, one Paid/one Unclaimed/Pending 0, with no Close Payroll control; Coordinator could close after the initially unchecked required reconciliation confirmation |
| Closed history/correction form | **Passed**; original/current totals shown, fixed PHP 5,000 read-only, reason/reference fields present; form cancelled without submitting a correction |
| Direct link, reload, Back/Forward | **Passed**; selected closed batch restored at revision 12 with both outcomes intact |
| Layout/console | **Passed** for 1440×1000 and 1024×900; narrow page width 1009 ≤ viewport 1024. Post-reload console: zero errors/warnings |
| Frozen evidence after browser writes | **Passed**; original frozen hash unchanged, exactly one Paid PHP 5,000 and one Not paid PHP 0, closed revision 12, no correction submitted |

Screenshot examples: [Payroll list](../../output/playwright/p01-final-acceptance-20261021/staff-payroll-batches.png), [unchecked receipt/focus](../../output/playwright/p01-final-acceptance-20261021/staff-receipt-unchecked.png), [Unclaimed form](../../output/playwright/p01-final-acceptance-20261021/staff-unclaimed-form.png), [Staff reconciliation](../../output/playwright/p01-final-acceptance-20261021/staff-reconciled.png), [Coordinator closure confirmation](../../output/playwright/p01-final-acceptance-20261021/coordinator-closure-unchecked.png), [closed reconciliation](../../output/playwright/p01-final-acceptance-20261021/coordinator-closed-reconciliation.png), [correction request](../../output/playwright/p01-final-acceptance-20261021/closed-correction-request.png), [narrow layout](../../output/playwright/p01-final-acceptance-20261021/closed-tablet.png). Representative receipt and closed-reconciliation screenshots were visually inspected.

### Failures, limits and cleanup

- **No application regression or failed acceptance suite was reproduced. No application/test/schema fix was made during this final verification.**
- Initial signed-out `/auth/me` returned the expected 401 before login. No unexpected application console error was observed. One CLI layout-measurement expression failed to parse; an explicit arrow-function retry succeeded. This was a tooling invocation error, not a product change/failure.
- Browser coverage is a focused two-member synthetic workflow, not a full-835 browser load/soak test or complete cross-browser/accessibility matrix. Native 200% zoom was not tested. Correction approval/rejection/races are covered by the full gate; browser smoke opened/cancelled the form and did not submit a correction.
- The owned browser and fixture stopped cleanly. [Final read-only cleanup](../../output/p01-final-acceptance-20261021/cleanup-final.json) matched the exact pre-gate **15 schema names and 12 LDSS database accounts**; pre-existing test resources remain preserved. No new test schema/account or port-3003 listener remains.
- Gate Coordinator/technical-owner sign-offs remain pending; these automated/browser checks do not invent operational approval or authorize production use.

**Final recommendation: P01 verification is complete and ready for P02 review. Do not start P02 without explicit approval.** No LAN/production deployment, new business rule, schema change, individual route or bulk-payment feature was introduced.
