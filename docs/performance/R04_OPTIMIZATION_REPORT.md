# R04 - Payroll Detail Loading Optimization

Date: 21 October 2026, Asia/Manila. Scope: R04 only, localhost. **Passed: 56/56 configured suites.** Source remained unchanged throughout the gate.

## Result

Selected payrolls now request a small authorized summary, then a 25-record candidate or saved-roster page. Complete review, payments, corrections, amendments, reconciliation, reprocessing, validation and history load separately on request. Initial summary medians were **7.98 ms Draft, 13.09 ms Review and 63.34 ms Finalized**, versus waiting for the previous 5.36-46.37 second complete response.

The complete legacy endpoint remains available and produces equivalent evidence. Financial commands, the authoritative validator, eligibility service, payment service, authorization implementation and payroll renderers are unchanged. No schema, migrations, indexes, grants, dependencies or lock protocol changed. No LAN/production deployment, real-record repair, payment recording or R05 work occurred.

## Confirmed root causes and changes

1. The selected-batch GET assembled all history, candidate evidence, full validation, claims, deferrals, release findings, corrections and Treasury information before returning a heading. The frontend also mounted supporting components immediately. Summary SQL now selects only the latest event's scalar metadata, exact historical submission metadata and inexpensive membership counts. It removes compressed payload/evidence fields in SQL; it does not decompress entire histories to display a title. `sourceValidation: not_loaded` distinguishes metadata from current financial validation.
2. Full-cohort `draftDeferral()` probes performed up to two SELECTs per annual record, even without deferrals. The read projection now uses bounded groups of 200 and keyed latest-decision maps. Modern Restore wins over legacy decisions; absent modern events retain the original legacy fallback. Mutation guards still use the original authoritative reader.
3. `semesterClaim()` repeated the same semester batch/payment/correction history reads for each member. The detail projection now reads those histories once per relevant batch, maps cross-year scholar identities in groups of 200 and preserves first-paid and pending-correction ordering. The original claim checks on writes remain intact.
4. Complete release/validation reads repeated raw source queries. A read-only projection reuses R02's source adapter in windows of at most 100 annual identities. Unknown identities and unsupported SQL shapes fall back to original queries. Existing validators still decide every result; no second eligibility engine or cache of eligibility decisions was added. All caches belong to one authorized consistent snapshot.
5. Candidate generation can now receive an optional explicit annual-ID scope. Its default whole-batch path, order and fingerprints are unchanged. New page reads evaluate only the requested IDs with existing services. They deliberately return no whole-batch approval hash or form. Overall counts, deferrals and submission require the complete review; finalization independently recalculates and validates the entire batch.
6. Candidate, payment-history and event-history queries use validated SQL LIMIT/OFFSET, capped at 100; the UI requests 25. List headings use latest-event metadata rather than full batch histories. A frozen roster still verifies its complete immutable snapshot before slicing: compressed immutable evidence cannot safely be independently SQL-paged without changing persistence/integrity guarantees.
7. Corrections need to know whether the batch has managed releases, not all 835 current release findings. That section now reads the existing managed-window/allocation identity and retains the same approval mode; the full release checker still runs for processing and financial writes.

## Measurement method

The R03 successful gate was fingerprint-verified (558 sources, 207 artifacts), and its compiled release copied into an ACL-protected local baseline before edits. Baseline gate SHA-256: `c1deb163816faa796fb0f03d875853c0627a0d3802e8c9c09462e6590399b40f`.

The existing encrypted 835-scholar archive was restored into independent disposable Draft, Review and Finalized databases. Review/finalization preparation used the frozen R03 service's real guarded commands. Read benchmarks used restricted runtime grants, a two-connection pool, an authorized Coordinator and consistent snapshots. Before/after inventories were unchanged. A fourth disposable restore supported browser mutations. No working LAN records were used as a write target.

Windows x64, Node v22.21.0, 15.92 GiB installed RAM, 16 logical CPUs, local XAMPP/MariaDB. Each table entry is the median of three samples, with explicit GC before each sample, fresh request-local caches and warm/unflushed database/OS buffers. Queries are physical SELECT calls observed at the connection boundary, including authorization/revocation rechecks. DB milliseconds are summed client-observed execution round trips, including transfer/deserialization/waits, **not server CPU time**. Service elapsed time excludes HTTP and JSON serialization; JSON bytes are measured separately. Memory is process-wide, not incremental per request, and sampling can miss brief peaks.

## Before and after

The previous initial/basic batch load used the complete endpoint, so its initial wait equals the Before complete time. New Summary, Page and Complete are separate operations; do not add all three as an initial-screen requirement. Page = first 25 candidates for Draft/Review, or first 25 saved members for Finalized.

| State / read | Time ms | SELECTs | DB round-trip ms | JSON bytes | Unique scholars evaluated |
| --- | --- | --- | --- | --- | --- |
| before draft full | 5,359.46 | 3,039 | 1,741.37 | 3,669,089 | 835 |
| before review full | 28,466.50 | 62,796 | 20,662.76 | 16,203,592 | 835 |
| before finalized full | 46,366.54 | 109,961 | 38,822.12 | 28,971,857 | 835 |
| after draft summary | 7.98 | 14 | 6.28 | 1,467 | 0 |
| after draft page | 679.66 | 153 | 553.06 | 102,086 | 25 |
| after draft full | 5,040.46 | 1,377 | 1,644.53 | 3,669,089 | 835 |
| after review summary | 13.09 | 15 | 11.09 | 1,661 | 0 |
| after review page | 684.49 | 154 | 552.16 | 102,086 | 25 |
| after review full | 13,050.97 | 3,105 | 6,191.33 | 16,203,592 | 835 |
| after finalized summary | 63.34 | 15 | 61.79 | 1,924 | 0 |
| after finalized page | 84.15 | 11 | 6.97 | 93,177 | 0 |
| after finalized full | 17,153.58 | 3,257 | 9,687.15 | 28,971,857 | 835 |

Complete payload bytes remain unchanged deliberately for compatibility. The new Summary reduces opening payloads to 1.4-1.9 KB; requested pages are approximately 93-102 KB. Initial summaries evaluate zero scholars. Frozen pages decode/hash-check saved evidence but perform no new eligibility evaluations.

Browser observations (individual samples, not controlled medians): Staff Review summary 66.5 ms / first candidate page 1,407.9 ms; Finalized summary 121.6 ms / roster page 134.7 ms. The Staff observation overlapped the separate memory soak. These are loopback results, not office-PC/LAN speed guarantees. First-page candidate reads still have work to do; the summary target was met without claiming all data loads instantly.

## Memory and stability

Three-sample complete-read medians, including the retained compatibility response:

| Read | Before peak heap MiB | After peak heap MiB | Before peak RSS MiB | After peak RSS MiB |
| --- | --- | --- | --- | --- |
| draft complete | 261.28 | 233.57 | 573.99 | 511.38 |
| review complete | 273.22 | 425.12 | 542.84 | 896.15 |
| finalized complete | 270.48 | 628.81 | 580.69 | 1,524.89 |

**The monolithic Review/Finalized compatibility read still has a significant memory cost, and its measured peak increased.** The Finalized controlled sample reached a median 1,524.89 MiB RSS versus 580.69 MiB before. It returns approximately 29 MB of repeated historical/current evidence and uses bulk source graphs. This tradeoff is not hidden by the fast summary. The new initial screen never requests that complete object.

Additional natural-GC soak tests discarded each response after hashing it, with explicit GC only before/after each series:

| 20-run series | Sampled peak heap MiB | OS peak RSS MiB | Retained heap MiB | Retained change MiB |
| --- | --- | --- | --- | --- |
| Summary + 25 candidates | 60.10 | 136.87 | 20.97 | -0.61 |
| Complete finalized detail | 336.57 | 944.18 | 26.72 | 1.71 |

Both series completed 20 sequential reads with identical normalized outputs, zero out-of-memory errors, zero active borrowed connections after every run, one maximum simultaneously borrowed connection and one returned/free pooled connection. The final diagnostic retained heap stayed within the predefined 16 MiB growth allowance. Heavy-read natural heap/RSS rose and fell with GC rather than growing continuously. These are sequential stability tests, not proof of safety at high parallel full-detail concurrency on a 16 GB host.

## Interfaces and frontend

Additive GET routes, all protected by existing `ovr.prepare`, no-store responses and the existing post-read permission recheck:

- `/payout-cycles/:cycleId/ovr-batch-summaries`
- `/ovr-batches/:id/summary`
- `/ovr-batches/:id/candidates`
- `/ovr-batches/:id/roster`
- `/ovr-batches/:id/payment-history`
- `/ovr-batches/:id/history`
- `/ovr-batches/:id/sections/:section`, where section is candidates, processing, corrections, amendments, reconciliation, reprocessing or validation.

Original endpoints and financial request contracts remain compatible. New types describe summary counts, current-validation availability, scoped sections and paged responses. Summary counts explicitly distinguish annual candidate scope, saved submitted membership and frozen membership; an annual count is not an eligible count.

The screen renders heading/status/recorded submission/finalization metadata first. Supporting disclosures load on first open; closing retains their mounted forms and retry keys. Page navigation makes bounded reads. Known section refreshes do not load never-opened sections. Timeout/backend failures stop loading indicators and show an explicit retry. Current source validation and global approval actions require the separate complete review. Commands still perform fresh complete checks with original revisions, source hashes, idempotency, audit and transaction boundaries.

## Equivalence and regression validation

- Independent frozen R03 binary vs current complete outputs: all three samples for all three 835-member states matched after removing live checkedAt/generatedAt fields. Full normalized SHA-256: Draft `7e91d553c78b5d4415a71bfa8f58e6e377253a4b7534b368c2684c639e469737`; Review `71b448865d3f5e5a148b5ad64cec182625c73f9861d471f4036c832ce0d987f1`; Finalized `49aceea9b95994840ee72a87cc5f193ec953bf06c94892bc1e2e162bd6327045`.
- The configured R04 suite passed 113 R03-reader oracle checkpoints across Draft, Review, Finalized, Submitted, Processed and Closed. These comparisons remove **only the live top-level validation clock**, preserving historical/frozen clocks. They compare complete membership, evidence, reasons, amounts, hashes, history, processing/Treasury data, receipts, corrections, reconciliation, claims and paged entries across genuine lifecycle fixtures. Closed-state coverage includes 10 checkpoints on 1-2 member fixtures. No 835-member Closed fixture existed; no fictitious payments/closure were created to fill that gap.
- Existing compiled `OvrService.command`, `form`, `reprocessingCommand` and `validateOvr` bodies match R03 exactly. Compiled eligibility, processing service, release checker, authorization/snapshot implementation and HTML/Word renderers also match. See `financial-preservation.json`.
- Nine focused unit tests cover metadata-only reads, exact historical submit metadata, missing/frozen records, bounded candidate evaluation without a partial approval hash, cross-year claim mapping, empty claims, modern Restore precedence and bounded source windows.
- The new configured `test:payroll-detail-db` suite runs independent Treasury, reprocessing and legacy-containment lifecycles, alongside R01-R03 oracle checks. It covers verification/waivers/overrides, missing documents, holds, stale evidence, publication amendments, unclaimed outcomes, payment corrections, concurrent/retried commands, audit rollback and finalization. All 13 new read paths reject unauthorized Administrator/unassigned roles; forged/invalid page queries are rejected.

R01-R03 paired reruns used the frozen R03 binary versus R04 on the same 835-member Draft database. Full outputs, ordering, reasons, amounts and fingerprints matched. Dashboard comparisons include card source hashes and hash basis, not only totals. The 25/100 candidate worksets use identical bounded annual-result subsets over the unchanged 835-row database; they are not separate smaller physical databases.

| R01-R03 path / size | Before ms | After ms | SELECTs before / after |
| --- | --- | --- | --- |
| registry / 25 | 902.97 | 908.41 | 2059 / 2059 |
| registry / 100 | 3,464.63 | 3,472.98 | 8165 / 8165 |
| candidates / 25 | 589.41 | 459.90 | 244 / 244 |
| candidates / 100 | 1,135.72 | 1,071.40 | 614 / 614 |
| candidates / 835 | 6,053.04 | 6,029.68 | 4712 / 4712 |
| dashboard / 835 | 5,306.44 | 5,367.60 | 620 / 620 |

Query counts are unchanged for these existing paths; small timing differences are measurement variation, not new R01-R03 performance claims.

## Browser evidence

Final-source Chromium checks passed on the disposable 835-member database:

- Summary plus 25-row page initially; no unopened section/legacy complete-detail request.
- Next/Previous; explicit simulated 503 page/section errors and successful Retry; no indefinite loading state.
- History and complete-review close/reopen do not duplicate requests; focus refresh requests the loaded review once; hidden validation remains unloaded.
- Keyboard disclosure toggling and preservation of an unsubmitted deferral form across close/reopen.
- Lost response **after successful review commit**: Escape could not dismiss the unresolved-command guard; retry sent exactly the same payload/key and returned the same revision (two HTTP attempts, one revision).
- Staff can read without finalization controls; Administrator summary request returns 403; Coordinator review controls remain separated.
- Direct link, Back/Forward and reload; 800-pixel tablet layout without document overflow.
- Frozen 835-member roster pages; empty payment/correction states; reconciliation still correctly requires 835 outcomes. No payment was recorded.

Screenshots: [Staff Review](../../output/playwright/r04/staff-review.png), [tablet](../../output/playwright/r04/staff-tablet.png), [page error](../../output/playwright/r04/candidate-error.png), [complete review](../../output/playwright/r04/complete-review.png), [uncertain response](../../output/playwright/r04/lost-response.png), [finalized roster](../../output/playwright/r04/finalized-roster.png), [lazy finalized sections](../../output/playwright/r04/finalized-lazy-sections.png). These private local artifacts are excluded from Git. The earlier `initial-payroll.png` is prototype evidence, not the final-source screenshot.

## Automated acceptance and reproducibility

Gate: `automated_passed_awaiting_signoff`; 567 source fingerprints, 210 built artifacts and 55 migration checksums. Gate report SHA-256: `b2b9a669e28c24d38dadacd4b79fdab246cf541fb5ca10e863bd72ac65697eb4`.

Executed commands (PowerShell; outputs retained under `output/r04-payroll-detail-20261021/`):

```powershell
npm run test -- --run tests/payroll-detail.test.ts
npm run test:payroll-detail-db
npm run lint
npm run build
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs before draft
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs before review
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs before finalized
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs after draft
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs after review
node --expose-gc output/r04-payroll-detail-20261021/benchmark.mjs after finalized
node --expose-gc output/r04-payroll-detail-20261021/memory.mjs
node --expose-gc output/r04-payroll-detail-20261021/memory-heavy.mjs
node --expose-gc output/r04-payroll-detail-20261021/fixture.mjs before --reuse --controlled
node --expose-gc output/r04-payroll-detail-20261021/fixture.mjs after --controlled --keep
node --expose-gc output/r04-payroll-detail-20261021/fixture.mjs before --reuse --registry
node --expose-gc output/r04-payroll-detail-20261021/fixture.mjs after --registry --keep
node --expose-gc output/r04-payroll-detail-20261021/dashboard.mjs before
node --expose-gc output/r04-payroll-detail-20261021/dashboard.mjs after
node output/r04-payroll-detail-20261021/preservation.mjs
node output/r04-payroll-detail-20261021/cleanup-all.mjs
$env:LDSS_UAT_OUTPUT = 'output/r04-payroll-detail-20261021/uat-r1'
npm run test:uat
```

Benchmark setup/restoration/state preparation and browser commands are in the local evidence scripts/logs. Recreate disposable restores with `fixture.mjs restore`, save their named fixture configurations and prepare Review/Finalized with `prepare-state.mjs` before repeating measurements; cleanup intentionally removed those databases. The protected connection files are local evidence, not portable credentials. Browser automation used the Playwright CLI skill with an isolated `r04` session; after initial npx discovery, the cached CLI entry point was used directly. Tooling-only selector/encoding failures were corrected and rerun; they are retained in intermediate logs, not counted as application passes. Two reproduced projection/UI failures found during development were fixed before the final run: omitted saved-entry semester-payment context in Review, and loaded-review refresh behavior. Source was frozen before acceptance; no parallel rebuild or edits to gate inputs occurred during it. The check suite passed lint, 463 unit tests in 82 files, TypeScript checks, production build and secret scanning. The pre-existing Vite bundle-size warning remains.

## Changed files

Relative to the accepted R03 fingerprint set (16 changed, 9 added):

- `package.json`
- `scripts/test-eligibility-db.ts`
- `server/ovr/automatic-draft.ts`
- `server/ovr/managed-payroll.ts`
- `server/ovr/processing-state.ts`
- `server/ovr/reprocessing.ts`
- `server/ovr/routes.ts`
- `server/ovr/service.ts`
- `src/AutomaticPayrollDraft.tsx`
- `src/OvrAmendments.tsx`
- `src/OvrDrafts.tsx`
- `src/OvrProcessingPanel.tsx`
- `src/PaymentCorrections.tsx`
- `src/PayrollCandidates.tsx`
- `src/PayrollReprocessing.tsx`
- `src/TreasuryReconciliation.tsx`
- `src/PayrollDetailBoundary.tsx`
- `src/PayrollPagedDetails.tsx`
- `server/ovr/complete-detail.ts`
- `server/ovr/detail-model.ts`
- `server/ovr/detail-reads.ts`
- `scripts/test-payroll-detail-db.mjs`
- `scripts/test-payroll-detail-parity.ts`
- `tests/fixtures/legacy-ovr-detail.ts`
- `tests/payroll-detail.test.ts`

`source-change-manifest.json` records before/after hashes. Prior R01-R03 edits, local IDE files, workflow PDF, private QA evidence and working records were preserved. No commit/push was performed.

## Cleanup, limitations and next decision

Four owned restored databases and their restricted runtime/definer accounts were removed after browser/memory checks. The owned browser/server stopped; port 3137 has no listener. Six pre-existing test databases were retained. Raw comparison bodies and fixture connection files remain ACL-protected; backup/recovery material was not exposed. See `cleanup-all.json` and read-only inventory assertions in each benchmark.

Remaining costs are real: complete review/finalization evaluates the entire cohort; processing can require full release evidence; the compatibility response remains large and memory intensive; frozen roster integrity checks still decode the full snapshot; outside-year reprocessing candidates can require additional work. First candidate pages still issue roughly 153-154 SELECTs and were not instant. These were not replaced by stale approval caches or weakened rules. Sequential soak tests do not establish high-concurrency or second-PC LAN capacity. Native print/Word rendering, 200% zoom and 835-member Closed performance were not rerun for this read-only scope; unchanged renderer fingerprints and existing acceptance coverage are the evidence used.

R04 stops here. R05 and LAN/production rollout require a separate user decision.
