# P02 — Dedicated Payment Recording

Date: 22 October 2026. Status: **Final focused verification passed. Recommendation: P02 ACCEPT — Ready for P03. Awaiting user approval; not deployed.**

## 1. Scope and implementation

P02 adds a Payment Recording view inside the existing Payroll module. Staff and Coordinators with `ovr.process` can open it directly from a numbered processed batch. It uses compact summary and server-side roster/search pages, persistent selection across searches/pages, selected Paid/Unclaimed actions, and one reviewed Mark All Remaining Paid operation. Approved amounts come from the allocated entitlement; the browser cannot supply an authoritative amount.

No P03–P10 workflow is activated. In particular, this does not add Returned Payroll Verified, new closure rules/snapshots, discrepancy resolution, individual payments, DV/OR queues/documents or reconciliation exports. Existing specialized Treasury, historical processing, correction and closure tools remain available.

### Changed files

| Files | Purpose |
|---|---|
| `server/payments/recording-model.ts`, `recording-reads.ts`, `recording-service.ts`, `recording-routes.ts` | Strict input/output contracts, scoped aggregate/page reads, reviewed bulk operations and actor-bound recovery |
| `server/payments/processing-evidence.ts` | Versioned compact child-event storage and checked validation references |
| `server/ovr/processing-service.ts` | Reuses the authoritative processing validation/writer; validates the entire reviewed set before invoking child writers |
| `server/ovr/managed-release.ts`, `reprocessing.ts` | Reusable existing release/claim guards with transaction-local source reuse; default callers retain their existing queries and decisions |
| `server/ovr/service.ts`, `model.ts` | Additive compact-event decoding/model compatibility |
| `server/ovr/payment-correction-service.ts`, `payment-correction-routes.ts` | Narrow audited Staff date-only correction in open, available periods |
| `server/app.ts` | Registers the new routes with existing permissions |
| `src/PaymentRecording.tsx`, `OvrDrafts.tsx`, `PayoutCyclesPage.tsx`, `prior-command.ts`, `configuration-api.ts`, `styles.css` | Payment view, direct batch entry, reviewed confirmations, retained selections, date corrections, protected exact-request recovery, read-only preview notification control and scoped responsive styling |
| `tests/payment-recording.test.ts` | Strict contracts, unchanged claim/release guards and compact-evidence regression tests |
| `scripts/test-payment-recording.ts`, `test-payment-recording-large.ts` | Disposable financial/API, performance, rollback, concurrency, retry and scale checks |
| `scripts/test-managed-release-scenarios.ts`, `test-import-db.ts`, `test-prior-batch-scenarios.ts`, `test-document-batch-scenarios.ts`, `package.json` | Reuses existing fixture lifecycles, parameterizes optional volume assertions without changing ordinary 835-row checks, and adds the P02 test command |

### APIs

- `GET /api/v1/ovr-batches/:id/payment-summary`
- `GET /api/v1/ovr-batches/:id/payment-roster?q=...&offset=...&limit=...`
- `POST /api/v1/ovr-batches/:id/payment-operations/preview`
- `POST /api/v1/ovr-batches/:id/payment-operations`
- `GET /api/v1/payment-operations/:key`
- `POST /api/v1/ovr-batches/:id/payment-corrections/date-only`

The reads/operations use existing `ovr.process`; date correction uses existing `payments.correct`. Pure System Administrator access does not grant those permissions. Existing authentication, CSRF/origin checks and JSON/body bounds apply.

## 2. Financial integrity and compatibility

- The ordinary lifecycle remains Draft → Review → Finalized → Submitted → Processed → Closed. New recording is restricted to processed numbered payrolls in an available, unexpired financial period.
- The approved P02 acknowledgement basis is explicit Staff confirmation of actual receipt. It does not manufacture returned Treasury evidence. The existing single-payment endpoint retains its Treasury revision and lifecycle-date requirements.
- Actual Paid dates may precede encoding/processing within the approved semester. Recording timestamps remain database-generated UTC timestamps. Unclaimed records have no fabricated actual payment date.
- The new date-only command derives outcome, amount, identity, payment route, remarks and original reference from the existing Paid record. It appends existing correction evidence, requires a reason and cannot create eligibility or turn Unclaimed into Paid. Closed, expired, unavailable and pending-correction cases retain existing reviewed safeguards; no unrestricted historical-date policy is introduced.
- Existing standing, compliance, document, hold, allocation, reprocessing and duplicate-claim guards remain authoritative. P01's financial basis is reused as snapshot-only evidence; it never authorizes payment. Confirmation rebuilds sources under the existing `configuration_guard` and authorization transaction.
- Preview identifies conflicts. Confirmation requires the exact reviewed accepted set, rejects stale/changed sets and refuses to silently skip conflicts. Staff must explicitly remove conflicts and obtain a fresh review.
- Each child retains a distinct batch revision, canonical payment row, entitlement link/event and per-scholar audit. One parent operation uses the existing `ovr_commands` journal and an additional audited operation receipt. All children, audits and the journal commit or roll back together.
- Completed retries are resolved after current authorization and before stale/state/expiry checks. Changed payloads using the same key conflict. The UI retains the exact request/key in the existing command mechanism and same-tab session storage, warns before unloading and protects navigation while unresolved.
- Paid, Unclaimed, Withheld and Review remain distinct. Mark All Remaining Paid considers only missing outcomes and cannot overwrite a recorded outcome or bypass a current hold/conflict.
- Compact events use `payment-processing/v1`, with an immutable base revision and validation hash. Current lifecycle reads reconstruct the current validation; historical compact children retain references instead of multiplying the entire validation graph in HTTP history. Previously saved snapshots remain unchanged.

### Database and locking

**Zero migrations, new tables, columns, indexes, seeds or grant changes.** Existing finalized membership/allocation and reprocessing relations serve bounded reads; existing payment rows, correction history, batch events, entitlement relations, command journals and audits enforce the required invariants. No foreign key, uniqueness, append-only protection or amount constraint is weakened.

The write transaction still takes the shared configuration guard before user locks. Source batching keeps the original locking read semantics. All source reuse is limited to that snapshot/transaction and the existing cache invalidates ordinary/prepared/derived reads on writes. No cross-request eligibility cache or separate payment ledger is introduced. Amended historical or incomplete allocation/entitlement cases fail closed in the new view and retain their existing reviewed tools; consequential writes verify the full frozen hash and membership.

Existing indexed batch, allocation, entitlement and payment identities are reused. No query-plan-driven need for an additional index was demonstrated, so none was added. This report does not claim an exhaustive EXPLAIN/optimizer study.

## 3. Measurements and functional evidence

Evidence directory: [local P02 evidence](../../output/p02-payment-recording-20261022/). Tests use synthetic owned databases and restricted runtime accounts on Windows, Node.js 22.21.0 and local MariaDB. These are warm-buffer local measurements, not a LAN latency or production capacity guarantee. SQL milliseconds below measure client-observed roundtrips, not MariaDB CPU time.

### Read paths: frozen compiled build, 835 scholars

Three interleaved runs per case, explicit GC before each run, no concurrent gate/benchmark workload. Median service times exclude HTTP transport and JSON serialization; payload sizes are serialized bytes. Source: [final read benchmark](../../output/p02-payment-recording-20261022/final-835-read-benchmark.json).

| Read | Median ms | SELECTs | Median DB ms | Payload bytes |
|---|---:|---:|---:|---:|
| Existing full-detail compatibility reference | 20,061.35 | 3,143 | 12,017.84 | 36,110,257 |
| New Payment Recording summary | 63.22 | 14 | 60.73 | 412 |
| New roster, first 25 | 39.72 | 10 | 35.50 | 6,185 |
| New Scholar ID search | 19.28 | 10 | 16.69 | 288 |
| New roster, next 25 | 22.79 | 10 | 20.11 | 6,196 |

The full-detail reference returns substantially more evidence than the new screen needs. This is an architectural comparison, **not an identical-payload benchmark or a claim that the previous lazy R04 screen always took 20 seconds**. All 835 paged roster identities matched frozen membership exactly, with no missing/duplicated scholars; summary totals and entitlement amounts agreed with authoritative records. Opening the new view does not call Registry, automatic candidates, full processing/Treasury hydration or full payment history.

Initial two-member before/after observations are retained in `baseline.json` and `after-2.json`. Early P02 diagnostics found repeated JSON decoding in the first roster implementation. It was replaced with scoped finalized allocation/reprocessing relations. Bulk validation also repeated entitlement-event, claim, duplicate and release-link reads. Bounded transaction-local reads now supply the existing guards; no new eligibility engine or shared cache was added.

### Financial operations: frozen browser application, 835 scholars

These are single observed HTTP handler samples, including response serialization, not medians or network roundtrip times. Each authenticated request includes one existing session-maintenance write; preview itself makes **zero financial writes**. Sources: [ten-Unclaimed socket retry](../../output/p02-payment-recording-20261022/browser-unclaimed-socket-retry.json) and [825-Paid recovery](../../output/p02-payment-recording-20261022/browser-frozen-evidence.json).

| Operation | Handler ms | SELECTs | DB ms | Financial DML | Response bytes |
|---|---:|---:|---:|---:|---:|
| Review ten Unclaimed | 796.22 | 100 | 543.62 | 0 | 1,858 |
| Commit ten Unclaimed | 681.20 | 127 | 449.29 | 42 | 497 |
| Exact completed Unclaimed retry | 8.36 | 11 | 5.92 | 0 | 497 |
| Review all 825 remaining Paid | 4,829.78 | 457 | 1,648.01 | 0 | 137,071 |
| Commit 825 Paid | 5,843.06 | 464 | 2,750.85 | 3,302 | 499 |
| Exact completed Paid recovery | 15.98 | 11 | 11.10 | 0 | 499 |
| Date-only correction after 835 outcomes | 1,010.80 | 3,443 | 722.21 | 5 | 65 |

There is no pre-P02 equivalent atomic 825-payment command. Existing per-scholar payment behavior remains the validation authority; extrapolating hundreds of old HTTP calls would not be a measured baseline. Per-scholar canonical payment/event/audit/release writes remain deliberate. Date correction still exercises older shared financial guards with repeated classification reads; **not all per-payment SQL has been eliminated**.

In the final browser session after commit, a summary refresh took 38.67 ms (19 SELECTs, 419 bytes), and the first 25 outcome rows took 78.20 ms (16 SELECTs, 7,145 bytes). Counts changed immediately without restarting or clearing a shared cache. Service measurements above omit route authentication overhead, hence their lower query counts.

### Memory, connections and contention

- During the final 825 preview, heap was 38,107,880 before and 189,633,744 bytes after; RSS was 90,910,720 before and 404,107,264 bytes after. Commit heap was 39,849,368 before and 189,352,064 after; RSS was 102,895,616 before and 379,187,200 after. These endpoint observations are **not absolute peak RSS**. Twenty-millisecond sampled peaks in `large-835.json` can miss short synchronous peaks.
- The separate 835-fixture stability run repeated summary plus page reads 20 times after all payments. Post-GC heap changed from 150,629,016 to 150,329,248 bytes; RSS from 475,541,504 to 476,880,896 bytes. All three pool connections were free after every iteration; queue length remained zero. No out-of-memory or leaked connection was observed. This covers repeated reads, not 20 complete 825-write transactions.
- Compact child events were at most 1,558 serialized bytes in that scale run. They retain immutable validation references instead of storing the cohort graph 835 times. Browser ledger checks verified that the frozen finalization hash remained byte-equivalent to its original event.
- The earlier in-process scale harness sampled a maximum commit RSS of **755,400,704 bytes (720.4 MiB)** and heap of 301,421,856 bytes. It ran after heavy fixture construction/full-detail baselines and before the final bounded entitlement-event preload. Those are retained observations, not the isolated final browser process's peak. Final-build absolute process peaks and a full 16-GB host capacity/load test remain unavailable.
- Concurrent commands against the same Staff/batch produced one winner and one stale/conflict result, without duplicate payment. Existing configuration locking serializes financial writers. The 825 commit handler took about 5.84 seconds; exact guard-hold time was not separately instrumented. No large multi-office contention benchmark or lock-wait percentile was collected.
- R07's previously reported transient peak-memory limitation is **not resolved** by these observations.

### 835 / ten / 825 functional result

The fixture was created through existing import, prior-approval, masterlist, finalization, submission and processing commands, including 380 Course pending records. Staff selected five scholars on one page, three on another and two through name search. Ten remained selected across page/search changes. Unclaimed review controls were initially unchecked; Unclaimed created no actual payment date. Mark All Remaining Paid correctly reviewed the entire 825 pending set even while search showed only a subset.

Final independent [read-only ledger verification](../../output/p02-payment-recording-20261022/browser-ledger-verification.json):

| Fact | Result |
|---|---:|
| Unique original outcomes / distinct child revisions | 835 / 835 |
| Paid / Unclaimed / Pending / Needs resolution | 825 / 10 / 0 / 0 |
| Approved total / Paid / Unclaimed entitlement | PHP 4,175,000 / 4,125,000 / 50,000 |
| Per-scholar processing audits / parent audits / parent receipts | 835 / 2 / 2 |
| Paid entitlement-release links | 825 |
| Fabricated Treasury evidence / confirmations / reprocessing requests | 0 / 0 / 0 |

The batch remained Processed. No automatic closure, returned-payroll verification or DV work occurred. One Staff correction changed an actual Paid date from 22 to 21 October with a mandatory reason; the original row retained 22 October, and outcome, amount, reference, remarks and receipt acknowledgement remained intact.

The browser test deliberately lost the ten-Unclaimed successful response at the socket; Chrome retried the identical request and received the journal result. For the 825 commit, a test-only hook replaced the successful response with HTTP 503 to force a visible uncertain state. Reload retained the exact operation payload/key, navigation away was protected, and explicit Retry recovered the original receipt without extra payments. Hooks existed only in disposable harnesses, not the production build.

### Browser usability and evidence

Browser CLI smoke tests used the frozen compiled app and a separately restricted disposable runtime. Staff/Coordinator could use Payment Recording; pure System Administrator received 403. Existing Payroll details, Treasury, corrections and reconciliation remained accessible to their authorized roles; reconciliation agreed on all 835 outcomes. No unhandled application JavaScript exception was observed. Deliberate 403 and simulated network errors were expected test results.

The native dialog focused an initially unchecked confirmation on an incomplete submit without sending a financial command. Date defaults used the Philippine day; known batch reference/reason were automatic. Desktop and 1,024-by-900 tablet layout checks found contained table scrolling (document width 1,009 pixels), readable wrapping and no page-wide overflow. This was a focused keyboard/focus/responsive smoke test, not an exhaustive screen-reader/device certification.

Screenshots: [cross-page selection](../../output/playwright/p02-payment-recording-20261022/ten-selected-across-search-pages.png), [unchecked review of 825](../../output/playwright/p02-payment-recording-20261022/825-paid-review-unchecked.png), [uncertain response](../../output/playwright/p02-payment-recording-20261022/uncertain-after-paid-commit.png), [recovered request after reload](../../output/playwright/p02-payment-recording-20261022/reload-retains-exact-command.png), [Coordinator final counts](../../output/playwright/p02-payment-recording-20261022/coordinator-payment-summary.png), [tablet](../../output/playwright/p02-payment-recording-20261022/tablet-payment-recording.png), [Administrator denied](../../output/playwright/p02-payment-recording-20261022/pure-administrator-denied.png), [existing reconciliation](../../output/playwright/p02-payment-recording-20261022/existing-reconciliation-consistent.png).

## 4. Verification

### Completed focused checks

- `npm run check`: lint, all TypeScript configurations, **520 unit tests in 86 files**, production client/server build, and secret scan passed. The existing Vite warning for a minified chunk above 500 kB remains. It is not a build failure.
- `npm run test:payment-recording-db`: passed bounded/search-restricted roster reads, Admin denial, pre-return receipt acknowledgement, individual/selected outcomes, fixed amounts, exact retries/recovery, changed-key rejection, conflicts, stale previews, same-Staff concurrent one-winner behavior and complete-detail compatibility.
- Final coverage review found that selected-Paid validation had been exercised, while successful Paid commits in the main fixtures used all-remaining mode. Two supplemental automated fixtures therefore explicitly committed **two selected Paid scholars together** and **two individual selected-Paid operations**. Both passed reviewed-set amounts/dates, exact retries, canonical totals and full-detail compatibility. They reused the existing disposable fixture lifecycle through output-local harness copies, without modifying the frozen application or gate inputs. Reproduce with `node output/p02-payment-recording-20261022/selected-paid-runner.mjs` and the same command with `--p02-selected-single`; results are `selected-paid-bulk.json` and `selected-paid-single.json`. These are supplemental checks, not extra suites hidden inside the 58-suite total.
- Withheld/Review remained distinct from Unclaimed and could not be overwritten by remaining-Paid. Expired/closed date corrections returned 423; the existing historical route remained intact. Completed exact retries still recovered after closure.
- The 835 scale harness forced failure of the parent operation audit after ten child outcomes/journal were staged. All child payments, entitlement events, audits and journal entries rolled back. Repeating correctly then succeeded. Full P01 financial projection agreed with canonical reconciliation.
- Unchanged accepted P01 contracts, financial-basis adapter, unit fixtures and DB harness were fingerprint-checked. All **55 migration hashes** remain identical to accepted P01. No database constraint, grant, seed or table was altered.
- R01–R07 mechanisms remain in place: Registry/candidate complete-output comparisons, scoped payroll-detail parity, report pagination, notification freshness and read-cache invalidation run through the approved gate. The new read view uses authoritative relational aggregates/pages and the existing scoped mutation notifications. The entire earlier seven-stage, full-volume timing campaign was not repeated; P02 adds the focused frozen 835-read/write measurements above and reruns the existing regression checks rather than presenting old timing numbers as newly measured results.

### Frozen full gate

`LDSS_UAT_OUTPUT=output/p02-payment-recording-20261022/uat npm run test:uat` **passed all 58 suites**: the existing 57 plus the new P02 suite. It ran sequentially from **01:40:42 to 02:12:21 Philippine time, 22 October 2026**, about 31 minutes 39 seconds. There were no failed or skipped suites in the final run and no source fix during the gate. Its status is deliberately `automated_passed_awaiting_signoff`; Coordinator/technical-owner release sign-offs are not fabricated.

- [Full gate report](../../output/p02-payment-recording-20261022/uat/F36-report.json), SHA-256 `23185abeb3d7eddc2a1168051a734c0631017be0ed53e3e5ac13b84271da7937`.
- [Frozen candidate manifest](../../output/p02-payment-recording-20261022/candidate-fingerprints.json), SHA-256 `d48b76c1addbb6bf729d7d88710d6f654d9eca5d82425582afeaafedd75dda69`.
- **591 source inputs, 218 compiled artifacts and 55 migrations** matched exactly between freeze, completed gate and post-gate reconciliation. Relative to accepted P01: 18 modified and nine added source inputs, zero deleted inputs; all five P01 foundation files and all migration hashes remained unchanged. Existing unrelated R01–R07 working-tree changes were preserved.
- The gate's development-only encrypted backup is `output/backups/ldss-1792604445374-4e0270ea.ldssbackup` (128 tables, 2,145,426 bytes). Its isolated restore verified counts/checksums, columns/indexes, foreign keys/checks, triggers, view execution and rejection probes in **3.376 seconds**. The temporary restore and definer account were removed. This is local development recovery evidence, not a new LAN/off-host recovery certification.
- [Final acceptance/cleanup record](../../output/p02-payment-recording-20261022/final-acceptance.json) verified the same **15 schemas and 12 LDSS accounts** as the accepted P01 inventory after the gate and supplemental fixtures. Pre-existing unrelated fixtures were preserved. Test servers on ports 3003/3004 were stopped, and the owned browser session was closed. No real scholar/payment data was changed.

The full run included existing payment corrections, reconciliation, finalization/duplicate prevention, all six concurrency groups, audit rollback, Treasury and legacy containment, P01 foundation, Registry/candidate/dashboard parity, notification source freshness and paginated report parity. Unit, TypeScript, lint, production build and secret checks also passed within this frozen gate.

### Failures encountered and resolution/containment

- An early query prototype used `WITH`, which the existing restricted read adapter rejected; another used unavailable MariaDB `JSON_TABLE`. Both were removed in favor of supported SELECT-only relational projections. Focused and frozen build/browser checks were rerun successfully.
- Early 1,200-row setup failed a fixed 835 fixture assertion. Only the optional fixture-size parameter was generalized; ordinary checks still default to 835. Subsequent attempts imported 1,200 and recorded synthetic receipts, but existing finalization rejected the compressed frozen evidence: **"Compressed evidence exceeds the safe database packet budget; use smaller reviewed payroll batches."** The unchanged `server/stored-json.ts` envelope guard is 800,000 bytes. One diagnostic attempt also failed during prior-approval retry without a captured root cause; it is not counted as a pass. Logs preserve all attempts.
- Consequently, **no 1,200-row P02 payment transaction was executed or certified**. The input bound is not a guaranteed supported payroll capacity. The failure depends on evidence content, not a universal 1,200-scholar limit. No packet budget, constraint, eligibility rule or schema was relaxed to bypass it. All these attempts used disposable databases.

## 5. Limits and next phase

- No LAN/production deployment or real financial record changes are authorized by this phase.
- R07's previously reported transient peak-memory limitation remains unresolved. Fixture/process peaks must not be presented as a production capacity guarantee for the 16-GB Windows/XAMPP host.
- The operation input accepts at most 1,200 reviewed scholars; roster pages are capped at 100 and the UI uses 25. This is an input bound, **not verified 1,200-scholar payroll capacity**. The 835 workflow passed; the 1,200 fixture could not pass existing frozen-evidence finalization, so its payment transaction is unverified. Larger accepted sets require separate explicit selected operations.
- Existing full-detail compatibility/evidence screens still perform expensive complete graph reads. They are not used by ordinary Payment Recording summary/search/page loading.
- Existing claim-cutoff policy questions remain restricted to their approved historical boundary. P02 does not invent an entitlement extension or three-working-day/holiday workflow.
- P03 requires separate explicit approval. Stop after P02 final verification and reporting.

The initial implementation recommendation was to review and accept the verified 835-scholar workflow. The following final focused review supersedes that recommendation. No P03–P10 work, deployment, commit or push was performed.

## 6. Final focused verification — 22 October 2026

Evidence is isolated in [the final verification directory](../../output/p02-final-verification-20261022/). Earlier evidence in sections 1–5 remains the initial implementation run, not a newly executed result.

### 1,200-scholar root cause and provenance

The failure came from **`encodeStoredJson()` in `server/stored-json.ts`**, not a P02 payment limit or an eligibility rejection. Large finalization evidence is encoded inside `OvrService.command()` while inserting immutable lifecycle, finalization, audit and command-retry evidence. The earlier diagnostic recorded the error at the test's `/finalize` request, before submission/processing or any P02 payment operation. Its generic HTTP 500 does not mean that a payment was attempted.

| Boundary | Existing behavior |
|---|---|
| Plain JSON | Values of at most 350,000 bytes remain unchanged |
| Expanded evidence | Maximum 64 MiB; decoding retains the same expansion bound and SHA-256 integrity validation |
| Compressed storage | Gzip first; if its serialized envelope exceeds 800,000 bytes, try Brotli quality 4/window 24. Reject if the complete second envelope still exceeds 800,000 bytes |
| Local MariaDB packet setting | Global and session `max_allowed_packet` both 1,048,576 bytes, measured read-only in this review |

The envelope includes base64 compressed data, its digest and SQL-visible metadata/roster/protected references. The 800,000-byte application guard leaves headroom below the database packet setting; increasing either limit is **not** a P02 fix. A finalization can contain evidence in both entries and validation, plus the frozen form and related provenance. Row count alone does not determine its encoded size.

[Preflight provenance](../../output/p02-final-verification-20261022/preflight.json) verifies:

- The encoder's exact SHA-256 is `669f075c7bdeae4780ad4757b3ebbfc66ddce9bb6d26bddcd3f08bc92d02a519`, identical to accepted P01.
- The encoder and the entire `async command()` finalization method also match the committed pre-P02 ancestor `89cba417442219f3839e59766e19b62fa744b944` (line endings normalized for the ancestor comparison).
- Before the search correction, all 591 source inputs and 218 compiled artifacts matched accepted P02. Afterward, `src/PaymentRecording.tsx` is the **only changed application source**. Every server artifact and all 55 migrations remain identical.

Standalone deterministic [codec probes](../../output/p02-final-verification-20261022/codec-probe.json) execute current and pre-P02 encoders against exactly the same values:

| Synthetic encoder probe | Expanded bytes | Result in both versions |
|---|---:|---|
| 835 rows, high-entropy notes | 976,763 | Accepted; complete stored envelope 725,231 bytes |
| 1,200 rows, high-entropy notes | 1,404,213 | Rejected with the identical packet-budget error; Brotli base64 data alone is 907,508 bytes |
| 1,200 rows, repeated notes | 1,404,213 | Accepted; complete stored envelope 85,974 bytes |

These are **encoder probes, not eligible payrolls or a reconstruction of the failed financial payload**. They prove identical behavior and the content-dependent boundary. The original failed payload was not retained; its exact compressed byte count and the particular encoded argument that crossed the guard cannot be recovered from the old generic diagnostic. No unrecorded byte count is asserted.

**Finding:** the limit predates P02; P02 introduced no finalization/storage regression. It can affect a real finalization whose evidence exceeds the budget, including a smaller cohort with unusually large histories. The successful 835 fixture certifies that scenario, not every possible 835-row evidence graph, and the input allowance of 1,200 does not certify 1,200-row finalization capacity.

**Recommended separate change, not implemented:** add an actionable evidence-capacity preflight at draft review and design a versioned compact finalization representation that safely references/deduplicates immutable evidence while reproducing the exact expanded model/digest, preserving SQL-visible protected references, historical renderers, audits, retries and recovery. Prove fresh/legacy compatibility, tamper rejection and transaction rollback before rollout. Use existing controlled smaller same-semester batches where necessary; do not bypass automatic candidate validation or Coordinator finalization. This is outside P02 and requires separate approval. No limit, evidence validation or database constraint was weakened.

### P02 correction identified and retested

An unchanged empty or ID search at offset zero called `setPage(null)` while leaving all read-effect dependencies unchanged. React did not rerun the request, leaving the UI at **Loading payroll scholars...**. The defect was reproduced on the accepted compiled UI.

`searchSubmit()` now returns immediately when query and offset are unchanged. Loaded rows and selections remain visible and no redundant request is made; changing the query or returning from another page still performs the existing bounded read. The explicit Refresh payments action remains available. No financial handler, cache, permission, schema or eligibility decision changed.

The compiled-browser [regression check](../../output/p02-final-verification-20261022/search-regression.log) passed three repeated empty searches and three repeated ID searches, with zero roster/summary requests for unchanged criteria, retained selection across changed searches, both rows restored and no lingering loading state. Screenshots: [before](../../output/playwright/p02-final-verification-20261022/repeated-search-before.png) and [after](../../output/playwright/p02-final-verification-20261022/repeated-search-after.png). Test-tool quoting/ref errors and expected connection-refused polling after the owned fixture stopped were tooling/teardown events, not additional application regressions.

### Renewed execution status

The fresh focused DB suite, `npm run check`, fresh 835-scholar browser/performance checks and independent ledger verification passed. A **new complete 58-suite gate also passed against the corrected frozen candidate**. This is separate from the initial gate in section 4. Final source/build and cleanup reconciliation passed; details follow below.

### Fresh 835 / ten / 825 workflow and integrity

- Rebuilt the mixed fixture through authorized import, physical receiving, reviewed prior approval, official publication, finalization and processing. The 835-member frozen finalization occupied **624,988 stored bytes** under the unchanged guard. All 380 Course pending records retained their explicit basis.
- Staff selected **five** scholars on page one, **three** on page two, and **two** through name search. Returning to the first page preserved its five checked rows; the final selected count was ten. Roster pages remained 25 rows. Three repeated empty searches preserved rows with zero redundant reads.
- The initially unchecked ten-Unclaimed review showed zero Paid amount and required confirmation. An unchecked attempt emitted **zero** commit requests. One reviewed UI request recorded the ten Unclaimed, with no fabricated actual payment dates.
- With the name filter still active, Mark All Remaining Paid reviewed **825**, PHP **4,125,000**, final Unclaimed **10**, final Pending **0**, and two initially unchecked attestations. One reviewed UI submission recorded all 825. Staff never selected those 825 individually.
- The exact completed 825 request replayed successfully with **200**, the same outcome/counts and no additional financial writes. A changed payload under the same key returned **409**. The earlier test-client replay omitted Origin and was correctly rejected before processing; the corrected same-origin replay retained the application's CSRF/origin protections. No server relaxation was made.
- Staff corrected a supported actual Paid date from 22 to 21 October with a mandatory reason. Independent SQL verification confirmed that the original payment row kept 22 October; amount, Paid outcome, original reference and remarks remained unchanged.
- [Independent ledger verification](../../output/p02-final-verification-20261022/browser-ledger-verification.json) confirmed **835 unique outcomes/revisions, 825 Paid, ten Unclaimed, 825 release links, 835 child audits, two parent audits and two operation receipts**. The original finalization digest still matched its immutable finalize event. No Treasury evidence, confirmation, reprocessing request or automatic closure was manufactured.
- The fresh focused DB suite also passed holds/conflict removal and renewed preview, no silent skip, stale reviews, exact retry/recovery, changed-key conflicts, concurrent one-winner behavior, pure-Administrator denial, preserved receipt provenance and closed/expired date-correction rejection. The original audit-failure scale evidence remains valid because all server artifacts are byte-identical; the renewed full gate additionally reruns its existing audit rollback/financial cases.

Evidence: [selection and unchecked review](../../output/p02-final-verification-20261022/835-select-review.log), [ten-Unclaimed commit and global 825 review](../../output/p02-final-verification-20261022/835-confirm-unclaimed.log), [completed 825 replay](../../output/p02-final-verification-20261022/835-paid-retry.log), [date correction](../../output/p02-final-verification-20261022/date-correction-after.txt), and [final compiled handler metrics](../../output/p02-final-verification-20261022/browser-frozen-evidence.json). Screenshots: [ten selected](../../output/playwright/p02-final-verification-20261022/ten-selected.png), [825 review](../../output/playwright/p02-final-verification-20261022/825-paid-review.png), [final results](../../output/playwright/p02-final-verification-20261022/835-final-counts.png), [Staff date correction](../../output/playwright/p02-final-verification-20261022/staff-date-correction.png).

One first browser harness attempt counted filtered checkboxes before the new page finished rendering. It timed out at eight selections without submitting any financial command. The harness was corrected to await visible rows and the complete workflow then passed. A CLI VM import limitation also required generating the replay script outside the browser VM. These are preserved test-harness failures, not hidden application passes; logs remain in the evidence directory. The only application defect found was the unchanged-search loading issue above.

### Fresh performance comparison and R01–R07 preservation

Source: [paired measurements](../../output/p02-final-verification-20261022/performance-comparison.json). The same fixture shape, frozen compiled application and restricted-runtime approach were used; randomized synthetic identities differ. No gate or other benchmark ran during measurement. Read times are medians of three interleaved service calls, excluding HTTP/serialization. Financial times are single observed HTTP handler samples, including serialization. DB time remains client-observed SQL roundtrip time, not MariaDB CPU.

| Read | Accepted ms → fresh ms | SELECTs, accepted → fresh | Payload bytes, accepted → fresh |
|---|---:|---:|---:|
| Full-detail compatibility reference | 20,061.35 → 15,247.09 | 3,143 → 3,143 | 36,110,257 → 36,110,257 |
| Payment summary | 63.22 → 54.08 | 14 → 14 | 412 → 412 |
| Roster, first 25 | 39.72 → 36.17 | 10 → 10 | 6,185 → 6,185 |
| Scholar ID search | 19.28 → 19.00 | 10 → 10 | 288 → 288 |
| Next 25 | 22.79 → 22.13 | 10 → 10 | 6,196 → 6,196 |

The full-detail reference remains a larger compatibility graph, not an identical-work alternative to the compact view. Complete paged membership matched the frozen 835 roster exactly, with no missing or duplicated scholars and no business writes. Purely local timings do not certify LAN/network or multi-office latency.

| Financial operation | Accepted ms → fresh ms | SELECTs, accepted → fresh | DB ms, accepted → fresh | Fresh financial DML |
|---|---:|---:|---:|---:|
| Preview ten Unclaimed | 796.22 → 743.82 | 100 → 100 | 543.62 → 519.64 | 0 |
| Commit ten Unclaimed | 681.20 → 807.33 | 127 → 127 | 449.29 → 576.20 | 42 |
| Preview 825 Paid | 4,829.78 → 4,510.58 | 457 → 457 | 1,648.01 → 1,519.08 | 0 |
| Commit 825 Paid | 5,843.06 → 5,486.18 | 464 → 464 | 2,750.85 → 2,460.65 | 3,302 |
| Completed 825 retry | 15.98 → 8.16 | 11 → 11 | 11.10 → 4.39 | 0 |
| Staff date correction | 1,010.80 → 1,084.87 | 3,443 → 3,447 | 722.21 → 792.61 | 5 |

Every authenticated handler also performed its existing session-maintenance write, excluded from financial DML above. Commit replies remained 497/499 bytes; preview size differed by one byte (1,858 → 1,857 for ten, 137,071 → 137,072 for 825). The accepted and fresh date-correction samples selected different scholars/placement evidence; the fresh four-extra-SELECT observation is disclosed, not treated as an identical-source microbenchmark. The existing date-correction N+1 work remains a limitation and was not optimized outside this review.

**Slower observations are retained:** ten-Unclaimed commit was 126.13 ms slower, with unchanged SQL count and 126.91 ms more measured DB roundtrip time; non-DB handler time was essentially unchanged. Date correction was 74.07 ms slower with the different selected source. Main read counts/payloads and bulk 825 query counts did not increase. All server artifacts are byte-identical to accepted P02, so no new server query/computation path was introduced. These small single-sample increases are not concealed as universal speedups.

Memory observations also require qualification:

- Fresh 825 commit ended at **262,394,384 heap bytes / 644,313,088 RSS bytes**, versus accepted endpoint observations of **189,352,064 / 379,187,200**. The fresh peak sampler observed essentially the same RSS; the earlier browser run did not collect a comparable absolute peak. This is a **higher transient memory observation**, not proof of improved peak memory or a certified fixed bound.
- Before the subsequent successful retry, the same fresh server had returned to **53,580,328 heap bytes / 128,327,680 RSS bytes**. Memory did not remain at the bulk-operation level. GC timing/process history can affect endpoint snapshots; this review does not claim to isolate those effects statistically.
- In a separate cold restricted process, 20 post-payment summary/page cycles had post-GC heap **20,048,664 → 20,326,552 bytes**, with the last eight samples within roughly 24 KiB, RSS **79,589,376 → 80,875,520 bytes**, one connection returned after every cycle and zero queued connections. No OOM or leak was observed. These cold-process values are not directly comparable to the earlier fixture-heavy 150-MB retained-heap run.
- The larger full-detail reference also sampled higher peak RSS (700,944,384 → 780,980,224 bytes). The ordinary compact Payment Recording screen does not request that full graph. R07's unresolved transient-peak concern remains explicit; the 16-GB Windows/XAMPP host has not received a new capacity or concurrency certification.

The UI fix uses the existing React state/read effect and prevents clearing unchanged results. It adds no request, deduplication layer, cache or cohort calculation. Query batching, request-local cache invalidation, scoped write notifications, lazy full-detail sections and existing R01–R07 server modules remain unchanged. Fresh controls and ledger reads updated immediately after payment and date correction. The renewed gate passed Registry/candidate/dashboard complete-output parity, scoped payroll pages, notification freshness, report pagination and cache/unit regressions.

### Completed frozen gate and cleanup

The new sequential gate ran from **07:16:29 to 07:47:48 Philippine time on 22 October 2026** (about 31 minutes 18 seconds). All **58 suites** passed, including **520 unit tests in 86 files**, lint, all TypeScript checks, production build, secret checks, financial processing/corrections, all six concurrency groups, audit rollback, Treasury/legacy containment, migration compatibility and R01–R07 regressions. No suite failed or was skipped in this final run. The known Vite large-chunk warning remains a warning, not a failed check.

- [New full gate](../../output/p02-final-verification-20261022/uat/F36-report.json), SHA-256 `cdbcfafd0f5ffec244db7cea71f1ab9288fdf6d4f501df6c8d1a9af352160446`.
- [Corrected frozen candidate](../../output/p02-final-verification-20261022/candidate-fingerprints.json), SHA-256 `44a4c08984bb1a6fe7b4171eddcfcaa324d063c8d3cdbad20ba07a7d2e1d8e04`.
- [Post-gate fingerprints](../../output/p02-final-verification-20261022/final-fingerprints.json) verified all **591 source inputs / 218 artifacts / 55 migration hashes** against that candidate. All server artifacts and five accepted P01 foundation files remain identical. [Exact UI change proof](../../output/p02-final-verification-20261022/ui-change-proof.json) reconstructs the previous accepted source hash by reversing only the search guard.
- The local encrypted development backup `output/backups/ldss-1792624592457-92f78cc5.ldssbackup` contains 128 tables (2,145,569 bytes). Isolated restoration and integrity/constraint checks completed in **3.024 seconds**; the temporary restore and its account were removed. This does not certify LAN/off-host backup delivery.
- [Final acceptance inventory](../../output/p02-final-verification-20261022/final-acceptance.json) confirms the exact **15 schemas and 12 LDSS accounts** in the accepted pre-existing inventory. All owned fixtures/runtime accounts were removed, unrelated existing fixtures preserved, test listeners on 3003/3004 stopped and the owned browser closed. No production data was modified.

The gate remains `automated_passed_awaiting_signoff`, with production authorization false and Coordinator/technical-owner release sign-offs pending. This recommendation does not manufacture those approvals.

### Acceptance recommendation

**P02 ACCEPT — Ready for P03.**

The required 835/10/825 workflow, financial integrity, permissions, history, retries and performance mechanisms passed verification. One P02 UI defect was corrected and retested. **No financial-rule, evidence-storage, database-schema, grant, permission or cache-framework correction was needed or made.** No further P02 correction is indicated by these checks.

The 1,200-row financial transaction remains uncertified because of the pre-existing, content-dependent finalization budget. Larger-capacity evidence storage is a separate proposed change, not an unimplemented P02 financial fix. The disclosed transient-memory variation, existing full-detail/date-correction query costs and absence of multi-office capacity certification remain risks; they are not represented as resolved. Acceptance here covers the verified P02 workflow and does not promise unconditional 1,200-scholar or 16-GB-host capacity.

No P03 or later work, LAN/production deployment, commit or push was performed. **Stop and await the user's explicit approval before beginning P03.**
