# P03 — Payroll Reconciliation and Corrections

22 October 2026 (Asia/Manila). **Final recommendation: P03 ACCEPT — Ready for P04. Awaiting explicit user authorization; not deployed.**

P01/P02 were accepted by the office. This implements only authorized P03. P04–P10, DV/OR processing, downloadable reconciliation exports and LAN/production deployment are excluded. Payment tests used synthetic disposable databases. The rehearsed additive migrations were applied to local development, preserving its business records.

## Result and workflow

The existing P02 Payment Recording tab now leads to **Verify Returned Payroll → Coordinator Close Payroll**. Staff confirms once that the returned official payroll was received and compared; the original recorder may verify. Actor/time are server-derived. Relevant financial changes show **Re-verification Required**; reads, navigation and discrepancy dismissal do not invalidate it. New verification after closure is rejected.

**Payment Recording Complete** requires every finalized scholar to have Paid or Unclaimed, zero Pending/Withheld/Review and matching counts/amounts. It does not automatically close payroll. Staff can report discrepancies on finalized/submitted/processed/closed payrolls. Coordinator can dismiss with a reason or correct Paid↔Unclaimed, with optional atomic case resolution. Direct correction does not require a case.

Closure requires current verification or an explicit Coordinator verification-only override with a reason. The override cannot bypass incomplete outcomes, discrepancies, pending corrections or financial conflicts. New closures preserve an immutable ordered Original Reconciliation. Later authorized corrections leave Closed state and Original unchanged, while Updated Reconciliation shows effective outcomes. No stipend is counted twice.

## Baseline, files and reuse

The [accepted P02 fingerprints](../../output/p03-reconciliation-20261022/accepted-baseline.json) were checked before edits. Existing uncommitted R01–R07/P01/P02 changes were preserved. The candidate has **603 source inputs, 223 build artifacts, 57 migrations; 42 modified and 12 added files, none deleted**, relative to accepted P02. Documentation/private evidence are outside this count. [Exact file delta and hashes](../../output/p03-reconciliation-20261022/candidate-fingerprints.json).

| Area | Files |
|---|---|
| New backend | `server/payments/reconciliation-{model,reads,writes,service,routes}.ts` |
| Existing financial services | `server/ovr/processing-service.ts`, `payment-correction-service.ts`, `processing-state.ts` |
| Registration/readiness | `server/app.ts`, `server/schema-manifest.ts`, `scripts/migration-lib.mjs`, `scripts/check-database.mjs` |
| UI | New `src/PayrollReconciliation.tsx`; changed `OvrDrafts.tsx`, `OvrProcessingPanel.tsx`, `PaymentRecording.tsx`, `prior-command.ts`, `styles.css` |
| Tests | New `tests/payroll-reconciliation.test.ts`, `scripts/test-payroll-reconciliation.ts`, `test-payroll-reconciliation-db.mjs`, `test-p03-recovery.mjs`; correction units, P02/managed fixtures and `package.json` |
| Fixture compatibility | Disposable drivers expect 57 migrations; existing managed tests explicitly satisfy new closure requirements; duplicate-claim assertions use canonical effective payments after legitimate corrections |
| DDL | `20261022010000_f46_payroll_reconciliation.sql`, `20261022020000_f47_single_closure_snapshot.sql` |

Canonical payment records/corrections, unpaid classification history, entitlements/releases, batch lifecycle, configuration guard/locks, authorization, journals and audits are reused. Correct delegates to `PaymentCorrectionService`; Close delegates to `OvrProcessingService`. The P01 adapter remains snapshot-only evidence, never payment authority. P02 lightweight search/summary are unchanged.

Confirmed gaps: Treasury evidence was not aggregate returned verification; closure totals did not preserve closure-time rows; correction requests could not represent discrepancy observations; completion could include Withheld/Review; classifications were read once per payment.

### APIs

Under `/api/v1/ovr-batches/:id`:

| Method/path | Purpose |
|---|---|
| GET `/reconciliation-summary` | Totals, completion, verification, action permissions and blockers |
| GET `/reconciliation?basis=provisional|original|updated` | Bounded member pages; `auto` selects the valid basis, `current` supports closed operational review before a correction exists |
| GET `/discrepancies` | Paginated unresolved cases |
| GET `/reconciliation-history` | Paginated actor/time/reason history without hashes or revisions |
| POST `/reconciliation-commands` | Strict Verify/Report/Dismiss/Correct/Close with current permission/source checks inside guarded transactions |

The old close endpoint accepts additive optional source/evidence/override fields and enforces P03 conditions. An older client cannot bypass the new server checks.

P03 evidence has an independent revision: verification/report/dismiss do not advance financial revisions or stale verification themselves. The token pins batch revision/state, frozen hash/count, Treasury and historical sources. Verification/closure additionally reconstruct complete P01 financial evidence inside the transaction. Source changes reject stale commands; exact retries require current authorization and identical input.

### Business-rule compatibility

- No scholarship, academic, COR/COG, eligibility, masterlist, stipend amount, one-claim, reprocessing or finalization rule changed. Printed payroll/frozen forms are unchanged.
- Approved P03 changes are reviewed verification, Paid/Unclaimed completion, Coordinator-only outcome changes, discrepancies, guarded closure and immutable reconciliation evidence.
- Staff ordinary open-period date correction remains available with a reason. Closed batch/expired/unavailable-period restrictions retain the existing documented request/Coordinator approval path; plan Q2 remains unresolved.
- Direct Coordinator correction only permits Paid↔Unclaimed. Withheld/Review, arbitrary amounts and expired/unavailable financial periods retain established reviewed handling. It does not authorize late collection.
- Both directions preserve competing payment/historical evidence. Paid→Unclaimed does not erase Paid history or create a DV. Unclaimed→Paid retains release/claim/hold checks. DV cancellation belongs to P04/P07.
- The legacy endpoint requires Coordinator authority for outcome **or unpaid-classification** changes, even if raw `not_paid` is unchanged. Staff date/metadata compatibility is preserved.

## Schema and preservation

Two new relations store evidence, not another payment ledger:

| Relation | Why existing storage cannot enforce the invariant safely |
|---|---|
| `payroll_reconciliation_events` | Corrections require a payment and fixed request/decision semantics; they cannot truthfully represent Staff observations, verification or closure. `ovr_commands` is an actor/key retry journal without indexed batch/case membership. Lifecycle events are not indexed cases, and financial revision changes for verification would stale it. New evidence has batch/revision, actor/scholar/payment FKs, unique case/evidence revisions, self-referenced reports, constrained kinds and hashes |
| `payroll_closure_members` | Old closure totals and original payment rows omit pre-closure corrections/placement. Mutable joins cannot reconstruct historical rows. A compressed whole-cohort event defeats bounded paging. Members reference canonical payments/closure evidence with unique position/scholar/payment keys and hashes pinned by the ordered closure header |

F47 adds a virtual derived key and unique index enforcing **one original closure per batch**, independently of app state. It was added separately rather than rewriting applied F46. Runtime grants on both tables are **SELECT/INSERT only**. Existing constraints and all 55 prior migration hashes are unchanged. Migrations **55→57**, tables **128→130**; no seeds/backfill/new permission codes/DV tables.

| Executed local step | Result/evidence |
|---|---|
| Restored backup, F46 rehearsal | 39.78 ms; all 127 old business tables retained exact counts/hashes; replay applied nothing. [Rehearsal](../../output/p03-reconciliation-20261022/migration-rehearsal.json) |
| Verified backup/restore, DEV-only F46 | Backup `ldss-1792631041265-be291ba0.ldssbackup`; restore 3.312 s; migration 62.33 ms; 127 old business tables unchanged. [Evidence](../../output/p03-reconciliation-20261022/development-migration.json) |
| Restored-copy F47 rehearsal, DEV-only application | Backup `ldss-1792631316894-572ed97c.ldssbackup`; restore 3.196 s; rehearsal 298.73 ms, local migration 397.98 ms; 129 existing business tables unchanged. Temporary restore/definer removed. [Evidence](../../output/p03-reconciliation-20261022/closure-constraint.json) |
| Populated synthetic P03 backup/restore | 130 tables, 155,990-byte encrypted test archive; restore 2.206 s; uniqueness, member hashes/history/constraints/views verified. Disposable archive/restore removed. [Recovery](../../output/p03-reconciliation-20261022/recovery/filled-P03.json) |

No LAN connection, deployment or real payment/verification/closure occurred. Development changes were additive DDL, migration journal and new evidence grants; no business history repair/backfill.

MariaDB DDL can implicitly commit: replay/rehearsal does not certify every interruption point. A future rollout needs verified recovery, exact readiness/grants, preservation and separate authorization. Never restore over the only current database. An old binary is not safe merely because DDL is additive: it lacks P03 closure enforcement.

## Functional and integrity results

Focused normal/override tests passed on fresh two-member databases and passed again in the frozen full gate, together with the complete 835-member scenario.

| Area | Executed assertions |
|---|---|
| Verification | Same recorder allowed; server actor/time/frozen hash; false/forged/stale inputs rejected; reads stable; date/classification invalidation; no new verification after closure |
| Discrepancies | Staff reports before processing completion and after closure; members only; Coordinator reasoned dismissal; history retained; cases block normal/override closure |
| Corrections | Staff/pure Administrator denied; Coordinator Paid↔Unclaimed; existing engine/entitlements; atomic case resolution; current revisions and historical/payment conflicts; expired-period safeguards |
| Completion/closure | Pending/Withheld/Review blocked; exact counts/amounts; Coordinator only; normal verified close and reasoned verification-only override; pending requests/evidence cannot be waived |
| Original/Updated | All closure members once/in order; frozen identity/placement/amount/date provenance; Original snapshot rows/totals byte-identical after correction; Updated changes, state remains Closed; exact close retry does not duplicate snapshot/audit |
| DB integrity | Runtime UPDATE/DELETE denied; unique original DB rejection; synthetic root position/snapshot tampering fails closed, then exact evidence restored; unsupported old Original not fabricated |
| Concurrency/rollback | Correction-vs-closure has one winner; stale loser rejected; audit/member-insert failures roll back lifecycle/evidence/audit/journal; exact retries and changed-input rejection |
| Authority | Staff/Coordinator/Admin, mixed roles, disabled/revoked users, CSRF/current permission on retries; Staff ordinary date correction; denied legacy classification command leaves financial/journal/audit counts unchanged |
| Financial compatibility | Original payment rows/finalization unchanged; Treasury unchanged, never inferred; duplicate/historical guards retained; no DV/OR/settlement processing |

The 835 scenario begins with **10 Unclaimed and 825 Paid** through P02 reviewed commands. Deliberate later corrections change current totals for testing; final totals are not claimed to remain 825/10. Original payment rows and frozen finalization hash remain unchanged.

## Browser and usability

Chromium used compiled code and restricted disposable runtime accounts. Owned servers/tabs/accounts/fixtures were removed. [Workflow traces](../../output/p03-reconciliation-20261022/browser-small2-evidence.json), [independent ledger check](../../output/p03-reconciliation-20261022/browser-ledger-verification.json), [835-member evidence](../../output/p03-reconciliation-20261022/browser-closed835-evidence.json).

- P02 search/selection and Unclaimed→Mark All Remaining Paid remain usable. Three unchanged empty searches made **zero extra summary/roster reads**. Confirmations start unchecked and block unchecked submission.
- One batch Staff verification, original-recorder authority, keyboard Space/Escape and role-visible actions passed. Discrepancy/dismissal/correction/invalidation/normal close/override UI passed; unresolved cases disable closure.
- Deterministic HTTP 503 after commit tested visible in-dialog exact-key/payload retry, navigation fencing and no duplicate verification. Retry was moved inside the active native dialog. Session-storage retention was inspected; a separate reload/reopen recovery scenario was not executed.
- A socket-drop harness initially timed out because Chromium automatically retried. Traces verified exact replay with one event; the later 503 tested visible uncertainty recovery.
- Original/Updated/history and non-overlapping 25-row next/back pages passed for 835 members. At 480 pixels, the focusable table scroller worked with keyboard without page overflow. UI reconciliation pages do not change 20 scholars per printed payroll page.
- Independent ledger check: two preserved original payment rows; three explicitly performed verifications despite transport retries; two corrections; two reports (one dismissed, one corrected); one closure. Original 2 Paid/0 Unclaimed, Updated 1 Paid/1 Unclaimed; Closed state and hashes retained; no fabricated Treasury evidence.

Screenshots: [payment recording](../../output/playwright/p03-reconciliation-20261022/p02-compatible-recording.png), [uncertain retry](../../output/playwright/p03-reconciliation-20261022/uncertain-verification.png), [closure confirmation](../../output/playwright/p03-reconciliation-20261022/close-reviewed.png), [Original](../../output/playwright/p03-reconciliation-20261022/original-closed.png), [Updated](../../output/playwright/p03-reconciliation-20261022/updated-after-correction.png), [835-member Original](../../output/playwright/p03-reconciliation-20261022/835-original.png), [narrow viewport](../../output/playwright/p03-reconciliation-20261022/updated-mobile.png). Browser client files remain unchanged in final code. Later backend authorization/schema hardening is checked by the final database gate, not a claim every browser journey was repeated. This is focused QA, not full accessibility or office-load certification.

## Performance and cache evidence

Warm synthetic fixtures; fresh authorization/transaction; three read samples/median, single observed writes. Service time excludes HTTP/serialization; bytes measured separately. SQL time is client-observed round trip, not DB CPU. Baseline counted all SQL round trips; P03 focused timing counts SELECTs only, so those timing columns are not identical metrics. Twenty-ms memory samples may miss synchronous peaks. Raw conditions/readings are retained.

The frozen 835-member suite passed. [Raw P03 readings](../../output/p03-reconciliation-20261022/after-835-normal.json), [P02 baseline](../../output/p03-reconciliation-20261022/before-835.json), [computed medians and ranges](../../output/p03-reconciliation-20261022/performance-summary.json).

| 835-member operation | P02 median ms | P03 median ms | SELECTs before → after | JSON bytes before → after |
|---|---:|---:|---|---|
| Payment summary | 21.80 | 19.70 | 13 → 13 | 419 → 419 |
| Payment page (25) | 42.45 | 34.87 | 10 → 10 | 7130 → 7130 |
| Existing reconciliation section | 237.22 | 103.48 | 851 → 21 | 2701 → 2701 |

| New 835-member operation | Samples | Service ms | SELECTs | SELECT round-trip ms | JSON bytes |
|---|---:|---:|---:|---:|---:|
| reconciliation_summary | 3 | 21.95 | 20 | 19.54 | 925 |
| provisional_page | 3 | 45.94 | 22 | 41.56 | 8560 |
| verify_returned | 1 | 111.69 | 31 | 31.26 | 144 |
| report_discrepancy | 1 | 30.56 | 22 | 22.43 | 144 |
| dismiss_discrepancy | 1 | 25.35 | 22 | 20.74 | 145 |
| coordinator_correct | 1 | 481.69 | 103 | 174.96 | 65 |
| close_payroll | — | Not isolated: closure won concurrent race | — | — | — |
| original_page | 3 | 27.37 | 23 | 22.47 | 13691 |
| updated_page | 3 | 47.40 | 24 | 43.22 | 8994 |

| Fixture: 20 summary/page cycles, post-GC | Heap range MiB | Heap delta MiB | RSS range MiB | RSS delta MiB | Connections/free/queue |
|---|---:|---:|---:|---:|---|
| before-835 | 143.74–143.91 | -0.15 | 909.80–909.80 | 0.00 | 3 / all free true / 0 |
| after-835-normal | 147.11–147.14 | -0.01 | 1145.62–1145.63 | 0.00 | 3 / all free true / 0 |
| after-2-normal | 59.14–59.17 | 0.02 | 182.29–183.89 | -0.55 | 2 / all free true / 0 |
| after-2-override | 59.17–59.21 | 0.02 | 187.68–189.82 | -0.25 | 2 / all free true / 0 |

Three-sample reads use medians; writes have one sample. Query reduction for the existing reconciliation section is **97.53%**, observed median service time reduction **56.38%**, with identical response size. Small summary/page differences are not claimed as new optimizations: query/payload behavior is preserved.

Closure won the actual concurrent 835-member race, so standalone closure latency/query counts were not isolated there. Browser normal closure on two members measured **42.62 ms, 61 SELECTs, 22.74 ms SELECT round trips, 81 response bytes**, including HTTP handling. The supplemental isolated 835-member closure measurement passed after the gate: **597.28 ms, 98 SELECTs, 90.97 ms SELECT round trips, 82 response bytes; sampled peak 951.09 MiB RSS / 248.29 MiB heap**. It completed correction first and rejected a stale close, then measured a fresh close alone; this is deliberately not claimed as a second concurrent race. The original frozen gate separately tested real concurrency. It used disposable copies of fixture drivers, retained the same application source/rules/locks, and did not modify release inputs. [Supplemental readings](../../output/p03-reconciliation-20261022/isolated-close/after-835-normal.json).

P02 bulk recording still performs the same authoritative workflow. Single Unclaimed commit **637.17→584.57 ms, 119→119 SELECTs**. Paid commit for the other 825 **4,997.20→5,548.58 ms, 458→449 SELECTs**; preview **4,430.91→4,712.16 ms, 451→442 SELECTs**. The roughly **11% higher single Paid-commit time** is disclosed. These individual runs do not establish a statistical regression/improvement; fewer queries do not guarantee lower elapsed time. P02 recording backend files are byte-identical to the accepted baseline. A second independent 835 fixture during isolated-closure verification measured Paid commit **5338.89 ms / 449 SELECTs**. Both P03 observations and their limits are retained; two runs do not establish a statistical performance guarantee. No safeguards were removed for timings.

No OOM or connection leak occurred; retained heap stabilized during the repeated read cycles. Aggregate memory is **not unchanged**: after additional full-detail/closure/correction activity, P03's process retained about **236 MiB more RSS**, despite only about 3.4 MiB more post-GC heap than the P02 process. In the frozen 835 run, sampled P03-operation peaks were **1,174.54 MiB RSS / 213.37 MiB heap**; the separate isolated-closure process measurements are reported above. Allocator retention and the earlier full-detail graph remain material limitations, not a claim of clean-process memory or office-load certification.

The full run preserved Original **825 Paid / 10 Unclaimed**, PHP 4,125,000 / 50,000. A deliberate post-closure correction produced Updated **826 / 9**, PHP 4,130,000 / 45,000. Both total PHP 4,175,000. Original payment rows, frozen roster and closure snapshot remain unchanged.

No new cross-request caching. Summaries/history/cases are lazy; existing write invalidation remains; commands use fresh locked sources. The shared payment reader uses latest classifications in groups ≤200; original reads omit unused classifications. Submit/mark-processed/close no longer calculate unused whole managed-release findings, but retain fresh allocation membership checks. Consequential corrections keep authoritative release checks.

Accepted P02 full-detail baseline median: **15.05 s, 3,143 SELECTs, 36,110,257 bytes**, sampled maximum RSS **1,321.02 MiB**. P03 does not call this path to open reconciliation and does not claim to optimize that full graph. R07 peak-memory and content-dependent 1,200-row finalization evidence-size limitations remain separate. No office-capacity guarantee.

## Quality gate and fingerprints

`npm run check` passed lint, **531 tests/87 files**, all TypeScript projects, production build and secret scan (**922 source/build files**). Existing Vite >500-kB advisory remains; successful exit.

Frozen full gate: `LDSS_UAT_OUTPUT=output/p03-reconciliation-20261022/uat-r2`, `npm run test:uat`. **60 suites** (accepted 58 + focused P03 + 835 P03). [Report](../../output/p03-reconciliation-20261022/uat-r2/F36-report.json), [console](../../output/p03-reconciliation-20261022/uat-r2-console.log). **All 60 suites passed**. Wall time 41.94 minutes, from 2026-10-22T01:27:07.037Z to 2026-10-22T02:09:03.434Z (UTC); summed suite time 41.83 minutes. The gate status is `automated_passed_awaiting_signoff`; Coordinator/technical-owner sign-offs remain pending. It includes financial corrections, reprocessing, reconciliation, permissions, audit, concurrency, imports, masterlists, academic/document rules, export/backup/restore and R01–R07 parity/behavior checks. Automated success does not supply office/deployment sign-off.

The final source/build/migration manifest exactly matches both the frozen candidate and full-gate manifest, also after the supplemental benchmark. [Final per-file fingerprints](../../output/p03-reconciliation-20261022/final-fingerprints.json), [release proof and manifest digests](../../output/p03-reconciliation-20261022/release-proof.json). All 55 accepted migration hashes and protected P01 foundation/P02 backend/R01–R07 optimized modules remain unchanged.

Final preservation checks retained the original **15 database schemas and 12 LDSS database accounts** and confirmed the two new development evidence tables remain empty. **120 of 127 pre-existing tables match exact baseline counts/hashes, including all original financial tables. Seven tables differ**, consistent with a development login at 01:48:07 UTC and one qualification validation at 02:12:18 UTC by the same account that existed before this task. The differences are audit logs (+2), auth sessions (+1), rate-limit buckets (2 changed), notifications (+1), qualification command/event (+1 each) and one scholarship status/version header. A verified restore of the pre-update backup confirmed all original audit rows remain unchanged. This activity occurred outside the task's disposable fixtures; its operator is not inferred. No claim is made that the entire development database stayed byte-identical throughout the run. No current record was deleted/reverted to satisfy this check. The migrations themselves previously preserved all then-existing rows exactly. [Activity comparison](../../output/p03-reconciliation-20261022/development-activity.json), [final preservation](../../output/p03-reconciliation-20261022/final-preservation.json).

All task-owned disposable schemas/accounts/servers/tabs were removed; pre-existing fixtures and development servers were retained.

Failures/corrections disclosed:

1. Initial unregenerated migration manifest: corrected through existing generator, no readiness bypass.
2. Measurement proxy TypeScript callable-union issue: corrected typed invocation.
3. Old test selected raw Paid after valid correction: now canonical effective payments, same duplicate-claim guard asserted.
4. Browser socket-loss wait timed out on transparent Chrome retry; exact replay confirmed and deterministic 503 recovery passed.
5. First full UAT deliberately aborted for semantic unpaid-classification authority review; preserved as aborted, not passed. Predicate and tests tightened; new gate is `uat-r2`.
6. Abort cleanup helper's metadata-key error failed before deletion; fixed and only newly owned inactive fixtures removed. [Preservation evidence](../../output/p03-reconciliation-20261022/abort-cleanup.json).

## Remaining boundaries and recommendation

**Recommend accepting P03 locally. It is ready for P04 planning/implementation only after explicit user approval.** The frozen gate, financial preservation and source checks passed; no P03 application correction is outstanding. The seven-table development-activity difference above remains disclosed, so whole-development zero-difference verification is not claimed. No financial policy invented. Q2 restricted Staff date corrections, Q1 claiming cutoff and Q6 official form approval remain at their stated boundaries. Legacy detailed Originals are unavailable when evidence is insufficient. Full-detail cost, large evidence-size limits, long office concurrency, cold-start target-host behavior and exhaustive accessibility remain limitations. Downloadable reconciliation belongs to P08.

**P04 has not started. LAN/production has not been deployed or modified. Stop after P03 for explicit review/approval.**


## Final acceptance verification — 22 October 2026

**P03 ACCEPT — Ready for P04** is the technical recommendation from this focused verification. It does not authorize P04 execution or LAN/production deployment. No application source, migration, grant, financial business rule or operational data was changed in this verification pass. Only isolated test probes/evidence and this report were added or revised. [Acceptance proof](../../output/p03-final-acceptance-20261022/acceptance-proof.json).

### Development activity: exact attribution and isolation

A new verified restore of the pre-P03 backup was compared with a consistent, read-only development snapshot. The same **seven tables** differ; the other **120 tables, including 46 financial/payroll/entitlement/Treasury/masterlist tables, retain their complete row hashes**. This is now a transaction-level match, rather than a conclusion based only on row counts:

- The added auth session belongs to the pre-existing actor in the login audit; its creation time matches that login. Both existing rate-limit bucket identities are preserved; only their window timestamps changed. The earlier exploratory evidence's suggestion of changed bucket identities was a row-pairing artifact, corrected by matching the actual bucket primary key.
- The qualification audit's idempotency key identifies the new qualification command. Actor, scholarship, resulting version/status, the qualification event and current header all agree. The only scholarship transition was **Applicant → Qualified, version 1 → 2**; other header fields remain unchanged except effective/update dates.
- The new admission notification has exactly the qualification audit's ID, actor, action, source and timestamp. It was generated by the existing F37 audit trigger, not a P03 notification writer.
- All original audit rows remain unchanged. No payment, correction, entitlement, allocation, frozen payroll or historical closure row changed. No record was reverted to force a clean comparison. The human operator is not inferred from an authenticated account.

Qualification is an authoritative business input and can legitimately affect that scholar's future eligibility; it is not described as having no business effect. It did **not** alter recorded financial outcomes or contaminate the tests. The tests use separate generated fixture schemas, explicit database-bound pools and newly created synthetic actors; they do not select the development scholarship/payment data. [Causality and preservation evidence](../../output/p03-final-acceptance-20261022/activity-causality.json).

### Migration and historical-closure acceptance

The populated **55-migration** backup was restored into an isolated schema and upgraded through **F46 and F47 to 57 migrations**, taking 79.78 ms in this rehearsal. All **127 pre-existing business tables** retained exact row counts/hashes, including **4 historical closed payrolls** and their complete event histories/finalizations. Exact migration replay applied nothing. Both new evidence tables stayed empty: no historical Original was fabricated. The generated unique original-closure index was present. [Migration rehearsal](../../output/p03-final-acceptance-20261022/migration-final.json).

F46 only adds the two evidence tables and their constraints; F47 alters only the new event table to add the generated key/unique index. Neither updates old business rows or relaxes existing constraints. The existing grant generator permits SELECT/INSERT only on new evidence. Fresh runtime denial tests and duplicate-original rejection passed.

Recovery of populated P03 evidence was repeated: **130 tables**, 154,608 bytes, verified restore in **2.358 s**. The backup library compares complete table checksums, columns/indexes, FKs/checks, triggers and views, including the generated uniqueness key, with rejection probes. This covers closure members and verification/discrepancy/correction histories. [Filled recovery](../../output/p03-final-acceptance-20261022/recovery/filled-P03.json).

**Recovery is not an automatic destructive down-migration.** Preserve the current database/evidence, restore the verified pre-update backup into another schema, validate it, reconcile every post-backup transaction and perform an explicitly controlled cutover. An older binary lacks P03 closure enforcement and must not be switched in merely because DDL is additive. MariaDB DDL implicitly commits; interruption between F46's statements can leave partial DDL, and F47 must abort if duplicate historical closure evidence exists. These conditions require inspection/forward repair or verified recovery, never dropping evidence or rewriting checksums. Every crash interruption point was not simulated. No operational rollback was executed.

### Fresh functional checks

| Requested check | Final finding |
|---|---|
| Returned Payroll Verification | Original recorder and other authorized Staff can attest once; actor/time/basis are server-derived; stale/forged inputs rejected; financial/date/classification changes require re-verification; ordinary reads do not; new verification after closure rejected |
| Discrepancies | Staff reports before and after closure; Coordinator reasoned dismissal/correction retains the report and decisions |
| Coordinator corrections | Paid↔Unclaimed only through existing financial authority; Staff direct outcomes denied; audit rollback, stale revisions, duplicate/competing historical evidence and restricted-period rules remain enforced |
| Closure | Every member needs Paid/Unclaimed with accurate totals; Pending/Withheld/Review, pending corrections/historical evidence and every unresolved discrepancy block closure |
| Verification override | Requires explicit reason and does not bypass unresolved cases or financial/completion blockers; both normal and override closure variants passed again |
| Post-closure behavior | Staff reporting remains available; Coordinator correction leaves Closed state and Original rows/totals intact; Updated reflects the new effective outcome; exact retry adds no second closure |
| Historical absence | A read-only simulation of absent pre-P03 row evidence returns readable Current reconciliation and explicit Original unavailable, creates no snapshot and leaves existing financial/snapshot evidence intact; actual old closure preservation was independently verified in the populated migration rehearsal |
| Concurrency/integrity | One winner for competing close/correction; fresh authorization on retries; audit/member-write failures roll back; member position/hash tampering fails closed; FK and uniqueness enforcement retained |
| P02 | Fresh **835 scholars: 10 Unclaimed + 825 Paid**, zero Pending/Review, PHP 50,000 Unclaimed and PHP 4,125,000 Paid. Lost-response retry, atomic parent-audit rollback, unique child revisions, immutable original payments and roster hash all passed |

P02 single observed commits: ten Unclaimed **631.42 ms / 119 SELECTs**; remaining 825 Paid **5410.51 ms / 449 SELECTs**. Later deliberate P03 corrections change current totals without rewriting the original P02 payment rows. These timings are observations, not throughput guarantees. [Focused normal](../../output/p03-final-acceptance-20261022/focused-normal-r2.log), [override](../../output/p03-final-acceptance-20261022/focused-override.log), [835 workflow](../../output/p03-final-acceptance-20261022/volume-835.log).

### Equivalent-condition query verification

The pre-optimization payment reader was reconstructed and verified against its **exact accepted P02 file SHA-256**, not approximated with a different eligibility engine. The service and detail readers also match accepted P02. Both implementations ran three interleaved reads on the **same committed 835-member batch, actor, MariaDB schema/indexes and permissions**, with fresh authorization/read snapshots/request caches. Both ran on the current additive schema; the only comparison difference was the old versus optimized payment reader. Explicit GC preceded measurements. [Reconstruction proof](../../output/p03-final-acceptance-20261022/setup-proof.json), [paired raw results](../../output/p03-final-acceptance-20261022/paired-835.json).

| Same-fixture reconciliation read | Accepted P02 | Optimized |
|---|---:|---:|
| SELECTs, every sample | 851 | 21 |
| Classification SELECTs | 835 | 5 |
| Median service ms | 245.40 | 87.42 |
| Median SQL round-trip ms | 161.65 | 18.56 |
| Response bytes | 2701 | 2701 |
| Writes | 0 | 0 |

**Complete returned objects and output hashes matched across all six reads.** Thus the **851→21** reduction is independently confirmed under equivalent data/conditions. Timings exclude HTTP/serialization and describe loopback service execution; SQL round trips are not database CPU. R01–R07 protected modules and the P02 recording backend remain byte-identical to the accepted baseline. Pagination/caching unit tests passed; no cross-request cache or weaker finalization check was introduced.

### Gate, failures and remaining boundaries

- Fresh verification passed **531 tests in 87 files**, lint, all TypeScript checks, production build and the 922-file secret scan. Both focused P03 database variants, the full 835 scenario and new paired/migration/recovery probes passed. [Fresh check](../../output/p03-final-acceptance-20261022/check.log).
- The prior **60-suite frozen UAT** result remains valid because **all 603 source inputs, 223 build artifacts and 57 migration fingerprints still match exactly** after this pass. That complete gate was inspected, not claimed to have been rerun in this focused pass. Prior browser evidence was inspected; a new browser journey was not repeated. No application correction was necessary.
- Two added supplemental probes initially failed: a synthetic historical-absence probe attempted deletion blocked by the evidence self-FK, and a historical-state query assumed state lived on the batch header rather than its event history. Both were probe defects; the first was replaced by read-only absence projection and the second corrected to the existing event model. Constraints were never disabled; only disposable restores/fixtures were affected. Their failed logs remain retained. Rechecks passed.
- No unresolved P03 financial conflict remains in the tested fixtures. Deliberate conflict cases stayed blocked until their explicit reviewed resolution. This is not a certification of every operational record or approval of the separate development qualification decision.
- Known memory/full-detail cost, content-dependent 1,200-scholar evidence limits, restricted-period Staff date corrections (Q2), claiming cutoff authority (Q1) and official P06 form approval (Q6) remain unchanged. No entitlement extension, policy answer or official form approval was invented. Original detailed reconciliation remains unavailable where historical evidence is insufficient.
- All task fixtures/restore accounts were removed; the original 15 schemas/12 LDSS database accounts remain. Pre-existing development servers/fixtures were left intact. New development reconciliation tables remain empty. No financial data repair, LAN/production deployment or P04–P10 implementation occurred.

**Recommendation: P03 ACCEPT — Ready for P04. STOP and wait for explicit user approval before starting P04.**
