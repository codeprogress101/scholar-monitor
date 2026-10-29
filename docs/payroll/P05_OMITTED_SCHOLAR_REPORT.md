# P05 — Omitted Scholar and Individual OR + DV

Date: 22 October 2026 (Asia/Manila). Local development and disposable databases only. P01–P04 are accepted.

**P05 is implemented and locally verified: all 68 frozen UAT suites passed. Ready for office acceptance; approval is still required before P06. No P06–P10 or LAN/production deployment is authorized by this report.**

## A. Implementation

The **Individual Payments → Omitted Scholars** view supports two routes:

* Preparation Open: **Find Scholar → Record Omission → Add to Payroll**. The last action records reviewed origin metadata and validates the existing automatic candidate. It does not insert roster membership, allocate a stipend, clear deferrals or finalize payroll.
* Preparation Closed: **Record Omission → Request OR + DV → Coordinator Approves → Staff Prepares OR + DV**. Preparation creates an unpaid internal transaction, not documents, an official accounting number or payment.

Known identity, academic year, semester, source batch, approved PHP 5,000, actor and timestamps are derived automatically. Routine Staff actions need no extra approval or repeated entry of known information. Coordinator decisions and cancellation require reasons. Revisions, retry keys and fingerprints remain internal.

### Files and APIs

| Files | Purpose |
|---|---|
| [omission-model.ts](../../server/payments/omission-model.ts), [omission-reads.ts](../../server/payments/omission-reads.ts), [omission-source.ts](../../server/payments/omission-source.ts) | Strict commands, relational paged search, immutable case/history reads, reviewed origin and pre-entitlement reservation sources |
| [omission-service.ts](../../server/payments/omission-service.ts), [omission-routes.ts](../../server/payments/omission-routes.ts) | Recording, automatic destination validation, requested/approved/rejected OR + DV, preparation, cancellation and replacement lineage |
| [preparation.ts](../../server/payouts/preparation.ts), [submission-service.ts](../../server/payouts/submission-service.ts), [historical-setup.ts](../../server/payouts/historical-setup.ts) | Separate versioned preparation state and guarded numbered-window creation; narrow compatibility for an already-finalized historical first-semester root |
| [managed-payroll.ts](../../server/ovr/managed-payroll.ts), [service.ts](../../server/ovr/service.ts) | Shared entitlement approval writer; safe reuse after cancellation; fresh automatic review/finalization and preparation checks |
| [eligibility/service.ts](../../server/eligibility/service.ts), [semester-sources.ts](../../server/eligibility/semester-sources.ts), [model.ts](../../server/eligibility/model.ts), [cohort-reads.ts](../../server/eligibility/cohort-reads.ts) | Narrow validated omission context, historical destination provenance, active-route exclusion and one extra bounded source preload per ≤200 scholars |
| [individual-service.ts](../../server/payments/individual-service.ts), [individual-reads.ts](../../server/payments/individual-reads.ts), [individual-writes.ts](../../server/payments/individual-writes.ts) | Preserve P04 source identity and shared route exclusion; reuse a cleared route pointer after a cancelled omission later becomes a genuine payroll Unclaimed outcome |
| [OmittedScholars.tsx](../../src/OmittedScholars.tsx), [IndividualPayments.tsx](../../src/IndividualPayments.tsx), [omission-command-conflicts.ts](../../src/omission-command-conflicts.ts), [prior-command.ts](../../src/prior-command.ts) | Lazy integrated view, server pages, role-aware actions, responsive history, scoped refresh and exact retry across reload |
| [app.ts](../../server/app.ts), [config.ts](../../server/config.ts) | Protected routes and default-disabled P05 activation |
| [F49](../../db/migrations/20261022040000_f49_omitted_scholars.sql), [F50](../../db/migrations/20261022050000_f50_omission_approval_owner.sql), [schema-manifest.ts](../../server/schema-manifest.ts), [migration-lib.mjs](../../scripts/migration-lib.mjs) | Minimal source/owner constraints, migration fingerprints and SELECT/INSERT-only domain grants |
| [test-omission-payments.ts](../../scripts/test-omission-payments.ts), [historical tests](../../scripts/test-omission-historical.ts), [upgrade tests](../../scripts/test-omission-upgrade.ts), [migration test](../../scripts/test-omission-payments-migration-db.mjs), [unit tests](../../tests/omission-payments.test.ts) | Lifecycle, financial boundaries, permissions, concurrency, migrations, rollback and performance |
| Existing fixture drivers, [cohort tests](../../tests/cohort-reads.test.ts), `package.json`, `scripts/check-database.mjs` | Sixty-migration readiness, five additional registered UAT suites and retained bounded-query/point-read equivalence assertions |
| [eslint.config.js](../../eslint.config.js) | Excludes the newly installed `.agents` tooling bundle from application lint; application, server, scripts and tests retain lint coverage |

The [frozen candidate](../../output/p05-omitted-20261022/candidate-fingerprints.json) contains **631 source inputs, 237 build artifacts and 60 migrations**. Against accepted P04: **48 modified files, 15 added, none deleted**. Twenty-seven protected P01–P04/R01–R07 implementation files remain byte-identical. Four protected files necessarily change: managed payroll, eligibility service, semester sources and cohort preloads. Payment Recording, reconciliation, payment corrections, the eligibility engine/override decisions, request-cache implementation, automatic draft engine, report readers, Dashboard, notification readers and payroll renderers are preserved unless explicitly identified in the manifest.

New interfaces:

* `GET /api/v1/individual-payments/omissions/availability`
* `GET /api/v1/individual-payments/omissions/sources`
* `GET /api/v1/individual-payments/omissions?sourceBatchId=…&q=…&offset=…&limit=…`
* `GET /api/v1/individual-payments/omissions/:id` and `/:id/history`
* `POST /api/v1/individual-payments/omissions/commands`
* `GET` / `POST /api/v1/payout-cycles/:id/preparation`

Existing `ovr.process` permits Staff operations. Existing Coordinator `payroll.windows.manage` permits preparation changes and authorization/cancellation decisions. Staff cannot approve by supplying a role header; pure System Administrators receive no operational authority. Authorization is rechecked before journal replay. No new authorization framework, distinct-person policy, unrestricted roster insertion or independent eligibility engine was introduced.

Implementation details differing from earlier plan proposals: the canonical `payment_records` individual-source extension is deferred to separately authorized P07 settlement, since P05 prepares unpaid records only. This phase extends the existing unpaid P04 header instead. F50 is a forward constraint correction discovered during verification. The narrow historical-window compatibility change is necessary for an eligible later automatic batch; it does not relax destination timing or Coordinator finalization. No Word generation or individual payment API was added.

### Persistence justification

The [pre-implementation design](P05_IMPLEMENTATION_DESIGN.md) records the initial justification.

| Storage | Why existing storage is insufficient |
|---|---|
| `payroll_preparation_versions` | Submission windows describe receipt dates; closing a payout cycle or academic period would wrongly stop lawful payments/corrections. This append-only cycle/revision state records Open/Closed, reason, actor and time without changing those other states. No history means the existing Open workflow |
| `payroll_omissions` | A source omission can precede entitlement/payment creation. `ovr_entries` would fabricate original membership, and a P04 header requires a genuine payment. The immutable case has a finalized numbered source, unique permanent scholar/semester identity, annual identity and semester-owner FKs |
| `payroll_omission_events` | Journals/audits do not enforce case revisions, authorization owner or destination identity. These immutable events preserve origin review, requests, decisions, cancellation and source evidence. Existing journals and audits still commit atomically |
| Extended P04 header | A strict discriminator supports Unclaimed → DV and Omitted → OR + DV. Unclaimed still requires a real payment and forbids omission fields. Omitted requires a real case/approved entitlement event and forbids a fabricated payment. Original-request uniqueness is scoped by source, while the existing shared active-route primary/unique keys retain one active individual route per entitlement |
| F50 owner constraints | A reproduced SQL NULL edge in the initial new CHECK needed explicit non-NULL approval plus a composite authorization/semester-owner FK. This is a forward correction; F49 and every earlier applied checksum remain unchanged |

There is no second Paid ledger, fake payroll, duplicate entitlement, route transfer by deletion, separate retry framework or automatic historical backfill. Runtime domain tables are SELECT/INSERT only. The existing route pointer retains its narrow three-column UPDATE grant; financial event/header UPDATE and DELETE remain denied. New indexes support the declared uniqueness/FKs; no unrelated performance index or database tuning was added.

## B. Workflow verification

An omission references a real finalized numbered batch. Commands verify its frozen hash, original and effective absence by permanent identity, academic-year/semester scope, current official membership, academic/document eligibility, standing, claims, receipts, holds and existing routes. Absence alone never establishes eligibility. Search rows without a recorded case are explicitly **Eligibility not yet assessed**.

**Payroll first:** only a later same-cycle, same-semester Draft window is accepted. Future unopened windows and Coordinator deferrals cannot be bypassed. The command records a destination-origin event, then calls `managedCandidates()` for the selected annual. Failed validation rolls the metadata back. Normal whole-batch Staff review and fresh Coordinator finalization remain necessary, including cutoff completion and pending timely-submission controls. The ordinary allocator creates or safely reuses the unique entitlement; Staff metadata never allocates it.

**Historical compatibility:** a later window can follow an already-finalized, reviewed historical first-semester root without inventing an unrelated second payout mapping. Other normal mapping/version/date/window/Coordinator checks remain. A real three-member prior-approved Course pending fixture omits one member from its original frozen batch, then verifies that destination eligibility is blocked until an explicit origin link exists. The destination uses its own **on_time** receipt cutoff, not the old prior-approved deadline. It preserves the historical root, Course pending and original frozen bytes, and rejects changed source evidence. [Executed evidence](../../output/p05-omitted-20261022/historical.json).

**Preparation:** Coordinator close/reopen records immutable state/reason/actor/revision. Closed preparation blocks new ordinary windows, additions and draft review/finalization. It does not close a batch, cycle or academic period, alter payment dates, settle money or cancel requests. A real already-reviewed payroll competes with an OR + DV request under Closed preparation: the request succeeds and finalization returns `PREPARATION_CLOSED`. Reopening leaves existing requests/authorizations reserved; transfer remains blocked until reviewed cancellation.

**OR + DV:** a genuine claimable omission may request only while preparation is Closed. The request reserves permanent scholar/semester identity even before an entitlement exists. Coordinator authorization rechecks current facts and creates/reuses the canonical fixed entitlement with existing academic-review/authority FKs. Staff then prepares an unpaid internal `LDSS-OR-DV-…` transaction. Approval and preparation remain separate actions; no manual accounting fields are invented.

**Cancellation/replacement:** Staff requests cancellation and a Coordinator approves/rejects with a reason. The whole OR + DV is covered. Decisions preserve requests, approvals, headers, events and the original entitlement. Unsafe allocation/payment/pending-receipt/external-evidence conflicts block release. Rejection preserves the reservation. A new request and valid authorization are required before preparing a replacement, which gets a new internal reference linked to the cancelled header.

After approved cancellation, a later eligible ordinary payroll reuses the same entitlement at Coordinator finalization. A subsequent explicit original-payroll Unclaimed outcome can use P04's DV-only request/preparation without colliding with the retained cancelled OR + DV pointer. Tests distinguish that deliberately recorded Unclaimed outcome from document preparation, which creates no payment outcome.

## C. Financial integrity and migration

Existing unique scholar/semester/degree benefit, fixed PHP 5,000/currency, allocation uniqueness, frozen membership, payment corrections, paid-claim prevention and closure evidence remain authoritative. Omissions cannot replace existing Unclaimed/Withheld/Pending or unsupported legacy sources. Existing reprocessing and pending corrections/receipts are examined; a blank new route table is not proof of an uncommitted benefit.

All consequential writes use existing configuration-guard → actor → financial locks, current authorization and transaction-local reads. A failed audit rolls back case events, entitlement creation, transaction/route changes and journals together. Competing preparation commands have one winner; exact retries return the original receipt. No cross-request financial cache authorizes a transition.

Migration evidence:

* [58→60 restored-copy rehearsal](../../output/p05-omitted-20261022/migration.json): prior checksums/data, fresh upgrade, interrupted F49 CREATE containment, no false journal completion, exact retry and verified restore.
* [Populated P04 upgrade](../../output/p05-omitted-20261022/populated-p04-upgrade.json): real P04 headers, preparation/cancellation events, corrections, routes, payments and closure evidence survive with every original field preserved.
* [Local F49 application](../../output/p05-omitted-20261022/development-migration.json): verified backup and immediate before/after preservation of 132 existing business tables; no operation activated.
* [Local F50 forward correction](../../output/p05-omitted-20261022/development-f50.json): fresh verified backup, 135 business-table hashes unchanged, all 59 already-applied checksums preserved.
* [Filled P05 forward test](../../output/p05-omitted-20261022/filled-p05-forward-constraint.json): existing approvals, two linked prepared/cancelled transactions and source financial evidence survive F50 unchanged.
* [Before NULL probe](../../output/p05-omitted-20261022/null-approval-before.json) / [after constraint](../../output/p05-omitted-20261022/null-approval-probe.json): the privileged synthetic probe is fully rolled back; F50 rejects the NULL case. Registered database tests also reject wrong-owner authorization.

MariaDB CHECK failure is errno **4025**; this mysql2 version assigns it an unrelated MySQL symbolic name. Tests use the actual MariaDB number, together with FK errno 1452, rather than interpreting it as an InnoDB disk-setting failure.

Only local DEV received migrations. New operational routes remain off unless both `INDIVIDUAL_PAYMENTS_ENABLED=true` and `OMITTED_PAYMENTS_ENABLED=true` are explicitly configured. No real case/transaction or automatic omission was initialized.

**Independent development activity:** the initial preservation precheck detected separate authenticated login, qualification-selection, receiving/provisioning and verification activity in 20 tables. [Timestamped delta](../../output/p05-omitted-20261022/development-delta.json). No authoritative financial-table change was found. The precheck stopped before applying DDL; a fresh backup and immediate comparison preserved the new working state. These records were not reverted. Whole-turn zero-change to DEV is not claimed; immediate migration preservation and final financial/domain checks are reported separately.


Final read-only preservation check: **55 existing financial/frozen-source tables** match the starting row hashes; all three new P05 tables remain empty in DEV; all 59 previously applied migration checksums and the final 60 source hashes match. The 15 pre-existing schemas and 12 LDSS accounts remain, including the six pre-existing test databases. No task-owned fixture or runtime account remains. All 135 business-table row hashes match the immediate pre-F50 snapshot. The earlier independent activity in 20 tables remains documented separately; it did not change authoritative financial/frozen records. [Final integrity evidence](../../output/p05-omitted-20261022/final-integrity.json).

DDL implicitly commits. Failed/partial upgrades must preserve evidence and remain disabled. Use reviewed forward repair or a verified backup restored separately, reconcile intervening activity and authorize cutover; never edit applied checksums, disable FKs or discard populated P05 evidence. Test-only reconstruction of old schema boundaries is limited to owned synthetic databases with empty P05 structures; it is not a destructive live downgrade procedure.

## D. Performance

Final frozen-run operation measurements: [small fixture](../../output/p05-omitted-20261022/after-small.json), [835-row fixture](../../output/p05-omitted-20261022/after-835.json), [summary](../../output/p05-omitted-20261022/performance-summary.json), and [P04 comparison](../../output/p05-omitted-20261022/performance-comparison.json). All values below come from the fresh final gate, not the interrupted attempt.

Queue/search is a bounded relational projection: source identity plus COUNT and a 25-row page, without Registry loading, full candidate generation, per-row academic assessment or whole payment-history loading. The 835-person queue fixture contains three fully prepared source scholars and 832 deliberately unassessed search rows; it does not pretend that those extra rows are eligible. Only the genuine omitted member follows the financial workflow. The independent P02/P04/P03 full 835-approved-scholar regression retains its original 10 Unclaimed / 825 Paid scenario.

| P05 operation, 835-person search fixture | ms | SELECTs | SQL roundtrip ms | Final response bytes |
|---|---:|---:|---:|---:|
| Open / availability | 6.43 | 13 | 4.24 | 205 |
| Search one omitted scholar | 14.34 | 15 | 11.16 | 457 |
| First 25 search rows | 14.47 | 15 | 11.14 | 10395 |
| Next 25 search rows | 13.75 | 15 | 10.60 | 10396 |
| Record Omission (POST) | 48.03 | 120 | 38.36 | 106 |
| Add to Payroll (review + POST) | 171.49 | 351 | 140.35 | 215 |
| Close preparation (state + POST) | 23.09 | 32 | 16.62 | 80 |
| Request OR + DV (review + POST) | 90.27 | 244 | 71.11 | 110 |
| Coordinator approval (POST) | 47.62 | 121 | 37.74 | 107 |
| Prepare OR + DV (review + POST) | 99.42 | 246 | 81.19 | 231 |
| Approve whole cancellation (review + POST) | 92.67 | 149 | 80.41 | 100 |
| Reopen preparation (state + POST) | 19.87 | 33 | 14.45 | 78 |

Read medians use three warm-buffer samples. Consequential writes are single observations, not statistically established throughput. P05 measurements exercise complete authenticated HTTP injection, including session/RBAC/CSRF. The table labels distinguish a POST alone from a fresh detail/state review plus POST; payload bytes cover the final response only. The separately exercised concurrent already-reviewed payroll finalization versus individual request took **100.69 ms / 261 combined SELECTs**, returning one permitted request and one preparation-closed rejection. It is not a single-request benchmark. P04 comparison measurements below are instrumented service calls and must not be compared directly to P05 HTTP latency. Database milliseconds are client roundtrip, not server CPU; sampled memory can miss short synchronous spikes.

Equivalent existing full 835-scholar workflows, accepted P04 → frozen P05:

| Existing operation | Before → after ms | Before → after SELECTs | Response bytes after (unchanged) |
|---|---:|---:|---:|
| P02 roster page | 21.96 → 21.44 | 10 → 10 | 6185 |
| P02 search | 18.89 → 18.67 | 10 → 10 | 288 |
| P02 record 10 Unclaimed | 569.88 → 592.22 | 119 → 119 | 497 |
| P02 preview remaining 825 | 4279.35 → 4275.65 | 447 → 452 | 137078 |
| P02 record remaining 825 Paid | 5369.92 → 5276.63 | 454 → 459 | 499 |
| Existing full 835-member detail | 15085.68 → 14891.24 | 3143 → 3148 | 36110257 |
| P04 queue | 26.15 → 24.52 | 8 → 8 | 4744 |
| P04 search | 24.10 → 23.68 | 8 → 8 | 513 |
| P02 summary sampled in P04 suite | 16.53 → 25.68 | 13 → 13 | 419 |
| P03 reconciliation sampled in P04 suite | 18.00 → 20.11 | 20 → 20 | 925 |
| P04 replacement (single write) | 111.40 → 161.36 | 90 → 90 | 92 |

The 825-Paid commit retains **3,302 writes** and the 10-Unclaimed commit retains **42**. Their complete counts, outcomes, amounts, source/entitlement identities and frozen-history assertions pass; all paired measured response sizes above are unchanged. P02 roster/search and P04 queue retain their exact query budgets. Bulk preview/commit and the inherited full-detail path add **five** bounded omission preloads for 835 scholars, one per group of at most 200. This preserves the existing assessment engine and its fresh financial decisions; it is not an N+1 loop.

The comparison does not conceal slower observations: the P04-suite P02 summary increased **16.53 → 25.68 ms**, with unchanged 13 SELECTs and SQL roundtrip **14.88 → 23.91 ms**. The independent P02 suite's initial summary was **17.41 → 16.63 ms**; its post-write summary was **50.61 → 21.56 ms**. P04 replacement's single observation increased **111.40 → 161.36 ms**, retaining 90 SELECTs, while SQL roundtrip increased **46.97 → 87.97 ms**. These isolated timing changes include variable database/GC cost; unchanged query/payload budgets and passing outcome assertions do not establish a causal code slowdown or prove timing equivalence. No new per-scholar work was added to these summary/replacement readers. Repeated paired production-class load testing remains a capacity limitation.

Twenty sequential P05 page reads with forced GC stabilized at **77.75 → 77.51 MiB heap** (range **77.49–77.75 MiB**), sampled RSS at most **236.45 MiB**, and two total connections, all free after each read with no waiting request. P04's separate 20-read loop also stabilized: **147.40 → 147.24 MiB heap**, three total/free connections and no waiters or OOM. The accepted P04 equivalent was 148.21 → 148.04 MiB heap. RSS is process-history dependent: the existing full-detail peak rose **1420.43 → 1547.24 MiB**, sampled peak heap **414.30 → 479.49 MiB**, despite a similar elapsed time and unchanged 36,110,257-byte payload. Later P04 page-loop RSS remained at about 1,177.62 MiB versus 865.24 MiB in the accepted run, while post-GC live heap was slightly lower. The inherited R07 peak/retained-RSS risk remains open; this is not evidence of continuous live-heap growth or a memory-capacity certification.

The existing request-local cache is reused and cleared by writes. Workflow notifications refresh the scoped queue/history; obsolete detail reads are aborted. No independent cache framework or cross-request eligibility cache is introduced. Ordinary cohort paths add one omission-source query per ≤200 scholars; old point projections, empty groups, locks and bounded key counts remain tested. Consequential actions retain fresh canonical financial validation, including inherited full frozen-source/claim readers when required. No unrelated index or database setting changed.

Environment: Windows x64, Node 22.21.0, MariaDB 10.4.32, 15.92 GiB physical RAM, 16 logical CPUs, unchanged 16 MiB InnoDB buffer pool / 1 MiB packet setting. The pre-existing larger-roster evidence-size restriction and inherited full-detail memory/payload are tracked separately. A short 20-read test is not a long-duration or arbitrary-capacity guarantee.

## E. Quality gates and browser evidence

The final registered gate passed **all 68 suites**: the existing 63 plus five P05 suites (lifecycle, volume, historical origin, migration, populated P04 upgrade). The same run passed lint, all TypeScript checks, production build, secret scanning of **1,040 files**, and **553 unit tests in 90 files**. It ran from **2026-10-22T06:51:13.870Z to 2026-10-22T07:40:53.755Z** (49.66 minutes, UTC timestamps). [Full gate](../../output/p05-omitted-20261022/uat-r2/F36-report.json), [final summary](../../output/p05-omitted-20261022/final-acceptance.json), [fingerprint comparison](../../output/p05-omitted-20261022/final-fingerprints.json). Its 631 source inputs, 237 artifacts and 60 migrations match the frozen candidate exactly. The approved runner also took and verified a fresh backup/restore. The existing Vite main-chunk warning above 500 kB remains.

Coverage includes genuine/forged sources, original membership exclusion, ineligible/held cases, automatic later candidates, Coordinator finalization, preparation authority, closed-window blocking, active reservations after reopening, pre-entitlement approvals, no premature preparation, one-winner concurrency, cancellation/replacement, entitlement reuse, Staff denial, revoked-role replay, CSRF, exact retry, audit rollback, original frozen preservation, P04 compatibility and SQL NULL/owner fences. Existing full-gate financial/reconciliation/Registry/candidate/Dashboard/report/notification suites provide P01–P04 and R01–R07 regression coverage.

Actual Chromium checks at desktop and tablet viewport sizes use synthetic accounts and disposable databases. Staff keyboard search/Record Omission, automatic-draft inclusion, role explanations, Coordinator preparation controls, requested/authorized/prepared states, whole cancellation, replacement and reopening passed. A committed response replaced with HTTP 503 survives reload with the same payload/key, restores the correct workspace/source and prevents another financial action until resolved. Browser evidence verifies one recording event, no manually inserted roster row and no source frozen change. The final current-build proof verifies two linked prepared/cancelled OR + DV headers, zero payment rows, unchanged original membership, no automatic replacement and cleared pending-command storage. [Structured browser proof](../../output/p05-omitted-20261022/browser-proof.json).

Screenshots: [Staff search](../../output/playwright/p05-staff-omitted-search.png), [uncertain response](../../output/playwright/p05-uncertain-response.png), [recorded omission](../../output/playwright/p05-staff-recorded.png), [tablet](../../output/playwright/p05-staff-tablet.png), [authorization pending](../../output/playwright/p05-staff-authorization-pending.png), [Coordinator approval](../../output/playwright/p05-coordinator-authorized.png), [prepared OR + DV](../../output/playwright/p05-staff-or-dv-prepared.png), [prepared tablet](../../output/playwright/p05-or-dv-tablet.png), [cancelled/reopened](../../output/playwright/p05-coordinator-cancelled.png), [current-build final proof](../../output/playwright/p05-final-cancelled-proof.png). [Browser proof log](../../output/p05-omitted-20261022/browser-final-proof.log).

Failures and corrections are retained, rather than counted as passes: an initial source query used academic-year identity from the wrong table; the first standalone fixture invocation entered an unrelated next-year lifecycle while its new payroll remained open (the approved isolated-mode flag now avoids that auxiliary path); exact query-budget tests were updated for one bounded omission query while preserving all result/locking/key-limit assertions; and owned old-schema reconstruction required correctly rebuilding a source FK and removing leftover FK indexes. CLI locator/quoting/modal harness issues were corrected and independently verified. No financial rule or protected database invariant was loosened to make a test pass.

The first final-gate attempt was deliberately interrupted after the rolled-back NULL probe. Its 22 completed suite logs are **not** a full pass. [Interruption/owned-fixture cleanup](../../output/p05-omitted-20261022/uat-r1-interruption.json). F50 preserves F49's applied checksum. The fresh `uat-r2` gate completed all 68 suites against the new frozen candidate. No reconstructed partial gate is substituted for full verification.

Final local evidence is copied into the [frozen evidence manifest](../../output/p05-omitted-20261022/frozen-evidence-v2/manifest.json), including gate logs, source/build hashes, preservation proofs, measurements and screenshots. This archive records completed verification, not office or deployment approval.

No registered suite was skipped. LAN latency, physical tablet hardware, long-duration production load, official Word generation and individual settlement were not tested in this local P05 gate; they are outside its authorized scope or measurement limits.

## F. Follow-up and recommendation

**Q1 remains the existing policy boundary:** controlling Financial/Releasing Office cutoff and any authority/effect of a timely request after it. P05 invents no three-working-day calendar, holiday engine, forfeiture, retrospective request date or claim extension. Unknown/expired claim periods and conflicting financial evidence remain blocked under existing rules. Preparation closure is not an entitlement extension or payment authorization.

The source selector is bounded to the latest 100 finalized numbered batches; list/history endpoints are paged. Unreconciled legacy allocations or unmatched entitlements require existing controlled review rather than automatic repair. Consequential actions can still incur inherited frozen-history/claim-reader cost; the queue benchmark is not a scalability certification for very large historical roots.

P06 needs separate authorization. It should consume the common entitlement and explicit Unclaimed/Omitted source provenance, using replaceable editable **draft** DOCX prototypes based on the supplied screenshots until official templates are reviewed. Missing original editable Word files do not block P05 or prototype work. P07 must extend authoritative acknowledged individual settlement without fabricating payroll membership or creating another Paid ledger. These are later implementation dependencies, not newly unanswered policy choices about the agreed routes.

**P05 READY FOR ACCEPTANCE — P06 requires explicit approval.** All automated and focused browser gates passed. Default activation remains off. The inherited R07 memory/evidence-size limitations, short-run benchmark limits and existing Q1 claimability boundary above remain disclosed; no entitlement extension or capacity guarantee is implied. P06–P10 remain unstarted. No Word generation, individual cheque/payment recording, LAN deployment or production-data change was performed.
