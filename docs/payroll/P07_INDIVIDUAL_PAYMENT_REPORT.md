# P07 — Individual Cheque Payment and Financial Settlement

Date: **22–23 October 2026, Philippine time**. Local implementation and disposable verification only. **Technical verification passed; ready for P07 acceptance review.** P08–P10, operational activation and LAN/production deployment are not authorized.

## A. Implementation and source identity

P07 adds **Individual Payments → Cheque Payments**. Staff searches a paginated queue, reviews the transaction, confirms actual cheque release and acknowledged receipt, then selects **Mark Paid**. Actual Payment Date defaults to Philippine today; an honest earlier date must pass existing semester and claimability checks. The server separately records the immutable recording timestamp and actor. No editable amount, entitlement, approval or source identity is accepted.

The five new `server/payments/settlement-{model,reads,source,service,routes}.ts` modules implement strict inputs, bounded authoritative reads, current-source validation and protected commands. `src/IndividualSettlement.tsx` is lazy-loaded from the existing workspace. Selected rows persist across searches/pages, up to 200 transactions in a reviewed operation. The preview lists conflicts; the user removes them and requests a fresh preview. The accepted set either commits in full or rolls back. Bulk requires an explicit unchecked scholar-personal receipt confirmation; representative collection is single only.

The existing `payment_records` table remains authoritative. Genuine payroll records retain their paired batch/revision; individual records have **NULL batch/revision**, an explicit `individual` source, the approved transaction and permanent scholar/semester entitlement. No artificial batch or independent Paid ledger is introduced. P03 `payment_corrections` and `payroll_reconciliation_events` retain correction/discrepancy history. P04/P05 services supply the consequential source checks; existing authorization, command journal, configuration guard, entitlement locks, audit writes and effective-payment logic are reused.

New API base: `/api/v1/individual-payments/settlement`.

| Method/path | Purpose |
|---|---|
| GET `availability` | Bounded default-disabled feature availability |
| GET `queue`, `summary` | Server-paged current transaction list and aggregate individual settlement counts |
| GET `transactions/:id`, `transactions/:id/corrections` | Selected detail and lazy, paginated canonical correction history |
| POST `preview`, `paid` | Reviewed single/bulk actual acknowledged release; one atomic accepted-set command |
| POST `commands` | Optional forwarding, discrepancy reporting/resolution and controlled date/outcome corrections |

Existing route sessions, CSRF and `ovr.process` authorization apply. Date correction uses existing `payments.correct`; separate Coordinator decisions use existing `payments.corrections.approve`. Pure Administrator access does not grant operational payment authority. `INDIVIDUAL_SETTLEMENT_ENABLED` defaults off and requires the existing individual route activation; no environment configuration is activated.

The [complete source/build inventory](../../output/p07-settlement-20261022/candidate-fingerprints.json) compares against the accepted P06 baseline, separating P07 work from the already-uncommitted repository. Existing integration changes are confined to application/configuration registration, P04/P05 review/cancellation helpers, P06 forwarding-source normalization, effective-payment/claim/managed-release readers, Registry/graduation guards, P03 source-aware corrections and contextual UI links. Existing test drivers advance their cumulative migration assertions and empty-source recovery boundaries without changing original business expectations. The canonical read-cache, cohort reader, authorization engine, grant generator and payroll/Word renderers remain unchanged.

## B. Financial behavior

**Unclaimed remains DV only; omitted remains authorized OR + DV.** Optional **Mark as Forwarded** records the authenticated actor, server time and available LDSS Word versions, without a manual reference. Forwarding does not establish external office acceptance and never creates Paid. Existing generated files remain valid after forwarding alone. Preparation, approval, generation, download and cheque issuance are not acknowledged payment evidence.

Representative collection has one single-payment physical attestation covering the signed authorization, scholar’s valid ID and representative’s valid ID, plus release and receipt. Only the attestation is retained. No representative name, contact, ID number, scan, upload or permanent recipient-type column is added. Bulk rejects representative input.

Commit repeats current authorization, prepared route, approved amount, entitlement, source review, financial availability, effective claims, pending corrections, holds/disputes and cancellation/replacement checks under existing locks. Preview pins include current financial/event/source/document revisions. A source change fails the operation rather than silently skipping a scholar. Original recording facts remain immutable through correction projections. Exact payload/key retries return the committed receipt after fresh authorization; an unknown response stays retained across reload.

P03 discrepancy evidence is reused for a cancelled original discovered actually Paid. The active replacement is blocked. A Coordinator must explicitly confirm acknowledged original release, reason and unpaid replacement voiding. An effective Paid replacement is not automatically cancelled. Forwarded history and the warning that LDSS cannot cancel an external cheque remain visible. Existing Coordinator-confirmed original-payroll payment still cancels an internal unpaid DV; actual conflicting payment evidence blocks that automatic path.

Staff retains ordinary open-period actual-date corrections. Closed/expired periods require a correction request and a different Coordinator decision; approval does not reopen payroll. A correction cannot authorize late collection or invent an unknown historical receipt date. Restoring Paid requires existing acknowledged evidence, explicit prior-receipt confirmation, current source checks and no competing effective claim.

Shared semester claim/duplicate guards, Registry, managed entitlement-release projection, graduation guards and current individual summary recognize canonical individual settlement. Original payroll payment rows, frozen forms and closure members remain historical batch-attempt evidence: an original **Unclaimed** and a later individual **Paid** are retained as separate facts. Counts use distinct entitlements and expose conflicting attempts. P08 combined report/export presentation remains deferred; existing original-payroll reports are not relabelled as combined settlement reports.

## C. Database and recovery

**F52 (`20261022070000_f52_individual_settlement.sql`) adds no table.**

| Existing structure extended | Necessary invariant |
|---|---|
| `payment_records` | Mutually exclusive payroll/individual sources; unique transaction payment; complete approved transaction, entitlement, annual/permanent scholar and cycle/semester ownership; acknowledged fixed full-stipend evidence |
| `payment_corrections` | P03 history supports the same exclusive source identity, individual event revision and canonical owner; a payroll correction cannot target an individual source |
| `individual_payment_events` | Existing append-only history recognizes forwarding, payment and correction events |
| Entitlement/cycle composite unique keys | Required FK ownership targets; existing single-column identity cannot enforce the corresponding multi-column invariant |

Prior payroll uniqueness keys, foreign-key enforcement, checks and restricted runtime grants are preserved. New uniqueness/indexes support identity constraints; no speculative performance index or additional runtime permission is introduced. No Paid backfill, new entitlement or fabricated cheque evidence is created.

MariaDB DDL is not transactional. The rehearsal deliberately interrupts F52, verifies it is not falsely journalled, then recovers using a fresh verified backup restore and controlled reapplication. The test-only reverse boundary refuses populated P07 evidence and is restricted to owned disposable schemas; it is not a live downgrade strategy. Populated recovery checks compare canonical payments/corrections, original financial data, P06 file bytes/metadata and constraints.

The local development upgrade ran after a fresh verified encrypted backup. All 137 existing business tables retained their original column values, all 61 accepted migration checksums remained exact, no payment was added and activation stayed off. Final inventory and backup reference are added with acceptance results below. No LAN/production database was changed.

## D. Performance evidence

Final frozen measurements are recorded below. The private evidence directory is `output/p07-settlement-20261022/`. Measurements use actual authorized disposable HTTP/service calls, warm read samples, single write observations, SELECT counts and client-observed SQL roundtrip time. P07 route counts include HTTP session authentication and service authorization; existing-path service observations exclude the HTTP session layer and are compared with corresponding service baselines. Client time is not MariaDB CPU. Explicit GC and sampled RSS do not establish a production capacity guarantee. Concurrent-request timings represent the competing pair, not one isolated command; response sizes sum actual HTTP bodies rather than serializing internal response objects.

An initial 835-scholar comparison found the existing P04 queue at 868.12 ms (8 SELECTs), versus the accepted P06 rerun's 40.01 ms. Acceptance run R1 was deliberately interrupted for investigation and is not a pass. On the same disposable data, the current single list query measured 435.09 ms median; reverting only correction precedence still measured 429.17 ms. Refreshing table statistics reduced the current query to 4.97 ms. The pre-P07 schema/original query measured 4.88 ms after that refresh; reapplying F52 changed the plan and measured 29.80 ms. These ordered experiments establish statistics-sensitive planning; they do not isolate schema impact from every prior statistics change.

P07 therefore drives the paid-elsewhere subquery from indexed permanent-scholar annual records using a targeted `STRAIGHT_JOIN`, with unchanged predicates and effective correction rules. It adds no tuning index and does not run ANALYZE during ordinary requests. A paired regression executes previous/current plans against the same financial rows, compares complete values/order, captures actual MariaDB ANALYZE plans and does not refresh statistics. Final measured results are recorded below. The original investigation and interrupted acceptance evidence remain private and intact.

Queues count/page in SQL; details/history are selected-transaction reads. No Registry/full-cohort load is added merely to display a button. Bulk source reads are bounded, current source services remain authoritative, request-local reuse is invalidated by writes, and there is no cross-request financial eligibility cache. Finalization checks remain fresh. The R01 cohort reader is unchanged from accepted P06; canonical claim preloads occur only where claims are needed, rather than loading them for unrelated Dashboard counts.

Known R07 full-detail peak-memory and larger-roster evidence-size limits, and the unchanged 64 MiB raw-SQL backup budget for document collections, remain separately tracked. P07 does not claim to resolve them or extend claimability.

The existing 835-member full-detail path still measured **15,566.53 ms, 3,188 SELECTs and 36,110,257 response bytes** (three warm observations). The existing paged roster measured 21.76 ms/10 SELECTs; its next page measured 21.97 ms/10 SELECTs. The original 825-member Mark All Remaining Paid commit took 5,458.07 ms/469 SELECTs in one observation, with exact retry and unchanged original outcomes. These remaining full-detail/bulk costs are not hidden by the lightweight P07 queue. The largest populated P07 fixture backup measured **57,093,029 raw SQL bytes**, leaving **10,015,835 bytes** below the unchanged 64 MiB cap. This is fixture headroom, not a capacity guarantee for future document/history growth.

The full-volume fixture has 835 original payroll members and ten genuinely Unclaimed source stipends. Initial P07 queue/detail measurements have one prepared individual transaction; the original P04 queue has ten Unclaimed sources. It then tests one initial single release, an eight-member accepted bulk set after explicit conflict removal, and one representative release. This is not an 835-prepared-individual-transaction capacity test. The 200-member input bound is enforced; a maximum-200 write soak is not claimed. Twenty sequential post-settlement Paid-queue/detail reads test retained heap and pool return, not repeated unpaid-source validation or long-term write capacity. Separate lock-wait duration and MariaDB CPU are not instrumented; concurrent-operation wall time includes serialization and is reported accordingly.


Final authorized P07 observations (warm read medians; single write/race observations):

| Fixture / operation | Samples | Median ms | SELECTs | SQL client ms | Response bytes |
|---|---:|---:|---|---:|---|
| unclaimed-2 / queue | 3 | 8.90 | 14 | 4.29 | 591 |
| unclaimed-2 / detail | 3 | 47.45 | 110 | 37.11 | 683 |
| unclaimed-2 / settlement_summary | 3 | 7.59 | 13 | 3.65 | 262 |
| unclaimed-2 / forward | 1 | 48.84 | 108 | 36.03 | 90 |
| unclaimed-2 / single_concurrent_payment | 1 | 89.86 | 113 | 145.61 | 609 |
| unclaimed-2 / staff_date_correction | 1 | 27.93 | 48 | 15.88 | 167 |
| unclaimed-2 / conflict_detection | 1 | 9.76 | 17 | 3.76 | 128 |
| unclaimed-2 / coordinator_conflict_resolution | 1 | 88.58 | 107 | 69.11 | 216 |
| omitted-3 / queue | 3 | 8.45 | 14 | 4.18 | 588 |
| omitted-3 / detail | 3 | 50.71 | 136 | 39.62 | 680 |
| omitted-3 / forward | 1 | 66.12 | 134 | 51.35 | 90 |
| omitted-3 / single_concurrent_payment | 1 | 60.65 | 144 | 94.48 | 607 |
| unclaimed-835 / queue | 3 | 9.83 | 14 | 5.06 | 608 |
| unclaimed-835 / detail | 3 | 149.40 | 110 | 78.74 | 700 |
| unclaimed-835 / settlement_summary | 3 | 7.87 | 13 | 3.72 | 262 |
| unclaimed-835 / forward | 1 | 184.38 | 108 | 100.94 | 90 |
| unclaimed-835 / single_concurrent_payment | 1 | 254.38 | 125 | 400.43 | 621 |
| unclaimed-835 / bulk_conflict_preview | 1 | 892.83 | 162 | 317.59 | 1339 |
| unclaimed-835 / bulk_accepted_preview | 1 | 954.75 | 161 | 385.93 | 1134 |
| unclaimed-835 / bulk_commit_8 | 1 | 1053.54 | 185 | 408.73 | 1028 |
| unclaimed-835 / representative_release | 1 | 181.10 | 108 | 89.42 | 180 |

`single_concurrent_payment` measures two competing requests, one successful. Its SELECT/SQL totals and response bytes cover the pair. Write observations are not medians of repeated releases. Source-check costs remain visible.

| Fixture | Post-GC read samples | Heap first → last MiB | Heap range MiB | Sampled retained RSS peak MiB | Pool connections |
|---|---:|---|---|---:|---|
| unclaimed-2 | 20 | 60.36 → 60.23 | 60.19–60.36 | 198.30 | 2 |
| omitted-3 | 20 | 61.74 → 61.58 | 61.56–61.74 | 194.77 | 2 |
| unclaimed-835 | 20 | 151.86 → 151.65 | 151.64–151.86 | 963.52 | 3 |

Each read sample returned all connections and left no queued waiter; no out-of-memory error occurred. RSS includes memory retained by the original financial fixture and is not attributed solely to P07. These checks do not establish multi-day stability or office concurrency capacity.

Final paired list-query benchmark: **449.98 → 11.24 ms**, with complete result/order equality, unchanged predicates and no statistics refresh. The JSON ANALYZE plans are retained in [paired evidence](../../output/p07-settlement-20261022/paired-queue-plan-835.json). This is one SQL list query, not the complete HTTP queue.

| Existing path | Accepted P06 ms | Final P07 ms | SELECTs before → after | Final response bytes |
|---|---:|---:|---|---|
| Existing 835 / queue | 40.01 | 25.01 | 8 → 8 | 4744 |
| Existing 835 / p02_summary | 29.68 | 20.93 | 13 → 13 | 419 |
| Existing 835 / p03_reconciliation | 23.10 | 19.46 | 20 → 20 | 925 |
| Existing P05 / page_835 | 16.09 | 13.95 | 15 → 15 | 10395 |
| Existing P05 / next_page_835 | 16.70 | 14.23 | 15 → 15 | 10396 |
| Existing P05 / prepare_or_dv | 113.93 | 104.66 | 246 → 251 | 231 |

P05 preparation uses five additional SELECTs for the canonical payment/history validation introduced by P07. This is additional consequential validation work, not a query-count improvement. Its response size remains unchanged; paged search still uses 15 SELECTs. No financial guard was removed to reduce this cost.

These existing-path timing samples are unpaired observations from different runs on a shared Windows/MariaDB host. They show actual latency and query counts, not a causal speedup claim. The P05 search fixture contains three genuine source scholars and 832 deliberately unassessed search rows; it does not establish 835 eligible omitted scholars. P07 adds bounded canonical-claim reads only to readers that require current settlement; the Dashboard/cohort cache engine is preserved. Original P02 roster pagination and bulk recording results remain unchanged. The final 835 fixture's original P02 measurements are retained in `existing-p02-835.json`; old full-detail response/peak-RSS costs remain visible there.

## E. Verification and limitations

Before P07 edits, all 649 accepted P06 source inputs and 245 build artifacts matched their frozen hashes. The local checks currently pass lint, 576 unit tests across 94 files, TypeScript, production build and secret scan. The existing Vite large-chunk warning remains visible.

Focused database checks cover both genuine routes, acknowledged release, exact lost-response retries, role revocation, one-winner payment races, audit rollback, unchanged fixed amount, cancellation/replacement conflicts, source revalidation, current settlement projections, date/outcome corrections, post-closure discrepancy reporting and immutable original closure evidence. The 835 fixture preserves its original 825 Paid/10 Unclaimed payroll rows; individual settlements are additional canonical attempts for the same entitlements. No real financial record is used for operational actions.

Browser checks use built local clients and owned synthetic fixtures. Search preserves selection, confirmations start unchecked, forwarding leaves the transaction unpaid, an injected post-commit 503 survives reload with the exact saved request/key, and retry leaves one canonical settlement. Missing CSRF is rejected. Representative collection uses keyboard activation and an earlier actual payment date distinct from recording time. The 820×1180 layout has no document horizontal overflow. Browser fixtures have one prepared transaction each; multi-entry atomicity/conflicts are verified on the actual 835-scholar API fixture, not claimed as a multi-page browser test.

Screenshots: [bulk review](../../output/playwright/p07-bulk-review.png), [uncertain response](../../output/playwright/p07-uncertain-response.png), [Paid and original Unclaimed history](../../output/playwright/p07-paid-history.png), [tablet](../../output/playwright/p07-tablet.png), [representative review](../../output/playwright/p07-representative-review.png), [representative Paid](../../output/playwright/p07-representative-paid.png). The representative screenshot uses the final compact header spacing; earlier screenshots precede that presentation-only adjustment.

Failures retained in private logs include an initial disposable migration CHECK syntax error, missing new-source SQL fixtures, an omitted backup negative probe matching zero rows, and a meaningful existing uncertain-conflict retry test. These were corrected within P07: original source checks/grants/financial expectations were preserved, the negative probe now performs a real constrained insert, and external evidence conflicts remain unresolved rather than being treated as safe new commands. An ANSI QA rewrite was repaired to UTF-8 without changing intended labels. CLI quoting, unsupported focus and relative-request-URL attempts failed in the QA harness and were replaced with documented file-based browser code, locator focus and the observed absolute fixture origin. No safeguard was weakened to make a test pass.

Acceptance R2 passed 24 suites, then stopped at an unexplained HTTP 500 in the existing 835-scholar concurrent prior-approval command, before that fixture's P07 settlement checks. Its SQL cause was not captured; no environmental or lock-timeout cause is asserted. The approval service/source, protected-document reader and authorization engine are unchanged from P06. An isolated diagnostic rerun passed the same concurrent approval without changing application source, financial rules, timeouts or expectations. The failed gate remains evidence, not a stitched pass; the fresh complete R4 result is below. R1 interruption also left an empty authentication fixture: its exact owned identity was confirmed from diagnostics, zero business/financial rows and no active connections before removal. Original schemas/accounts were preserved.

R3 passed the same Unclaimed-volume suite, then exposed an owned-fixture reversal defect in the old P04 migration rehearsal. In a restored post-F52 dump, removing new columns retained trimmed FK-support indexes; reapplying F52 collided with their names. The P07 test helper now restores the original single-column FK support and removes only recognized F52 support indexes inside an empty, owned fixture, with foreign-key enforcement still enabled. The actual F52 migration, installed development schema, permissions, business rules and financial assertions were not changed by this correction. Post-F52 restored migration/upgrade checks passed both focused reruns and the complete frozen R4 gate; R3 is retained as a failed run.

## F. Final acceptance evidence

**Passed: all 78 approved UAT suites**, including the 73 existing suites and five P07 additions. The frozen run started **2026-10-22T16:25:40.379Z** and finished **2026-10-22T17:38:23.151Z** UTC. [Complete gate evidence](../../output/p07-settlement-20261022/uat-r4/F36-report.json). Lint, **576 unit tests across 94 files**, TypeScript, production build and secret scan passed inside that run; existing build-size warnings were not suppressed. R1 was interrupted for SQL investigation and R2 failed at an unexplained legacy approval HTTP 500; neither is counted as a complete pass. R3 also exposed a disposable boundary-index cleanup defect, corrected only in its test helper. The isolated diagnostic rerun and this fresh full R4 used unchanged application source; no rule, timeout or original expectation was relaxed.

The gate covers P01–P06, F00–F36 regressions and R01–R07 parity/cache/pagination tests, ordinary payroll finalization, original 835/10/825 recording, P03 closures/corrections, P04 DV-only requests, P05 payroll-first/authorized OR+DV, P06 files and P07 canonical release/corrections. Both routes, actual cross-route races, exact retries, role revocation, audit/late-child rollback, cancelled-original conflict resolution, expiry restrictions and immutable post-closure evidence passed. Fresh and populated cumulative migrations, prepared P06 documents, interrupted-DDL rejection and verified restore/reapplication passed. The complete runner was not changed to omit suites.

Final verification reconciles **666 source inputs, 251 build artifacts and 62 migrations** against the gate/frozen manifest. All 61 accepted migration checksums and all original values in the 137 existing development business tables remain exact. The original 15 schemas and 12 LDSS accounts remain; no owned fixture schema/account remains. No main-development individual Paid row or operational activation was created. [Final inventory/fingerprints](../../output/p07-settlement-20261022/final-verification.json).

The [frozen local evidence archive](../../output/p07-settlement-20261022/frozen-evidence-r4/manifest.json) retains the exact source/build inputs, gate logs, measurements, screenshots, report and failed/interrupted-run evidence with file hashes. It is private QA evidence and is not a LAN release or an authorization to deploy.

Verified pre-F52 local backup: `C:/xampp/htdocs/scholar_monitor/output/backups/ldss-1792681463286-c74f6ec3.ldssbackup`; [verified restore report](../../output/backups/restore-1792681463402_16584c67.json). The upgrade preserved original rows, earlier checksums and empty P07 operational state. Separate populated disposable backup tests preserve actual canonical Paid/correction evidence and P06 bytes without weakening the 64 MiB SQL cap. The test archives with ephemeral keys are removed after verified recovery; their inventory/constraint reports remain.

**Recommendation: P07 is ready for local acceptance review and a separately authorized P08.** No office sign-off, external financial acceptance, production capacity certification or LAN deployment is implied.

## G. Follow-up

P08–P10 have not started. P08 must consume the canonical effective settlement and retain original Unclaimed/closure facts without double-counting entitlements. Official individual OR/DV layouts still require Scholarship Office approval. Forwarding/generation/download audits do not prove external acceptance or actual payment. An unknown/expired historical receipt remains a specific review blocker; no legal cutoff or entitlement extension is invented.

The unexplained R2 prior-approval HTTP 500 remains a diagnostic limitation despite the subsequent isolated and complete passing runs. If it recurs, capture its underlying SQL/lock timing before attributing a cause; this phase does not claim to have fixed it. Existing full-detail memory/latency and backup-capacity limits remain operational review items before activation.

Operational activation and any LAN rollout require separate authorization, a verified current backup, capacity review and approved downtime. **Stop for explicit P07 acceptance before P08.**
