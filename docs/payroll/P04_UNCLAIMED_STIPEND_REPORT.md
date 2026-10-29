# P04 — Unclaimed Stipend Processing

Date: 22 October 2026 (Asia/Manila). Scope: P04 only, local development and disposable databases.

**P04 implemented and verified locally; ready for office acceptance review. All 63 frozen UAT suites and 546 unit tests passed. P05 and deployment remain unauthorized. New operational routes are disabled by default.**

## A. Implementation

P04 adds an **Individual Payments → Unclaimed Stipends** workspace. The ordinary Staff path is **Find Unclaimed Scholar → Record Payment Request → Prepare DV**. Known identity, semester, original batch and approved amount are server-derived. Preparation means an unpaid LDSS transaction; it neither generates Word documents nor establishes payment. No official DV number, accounting code, payment, entitlement extension, omitted-scholar workflow or future inactive tabs are invented.

The [accepted implementation plan](PAYMENT_PROCESSING_IMPLEMENTATION_PLAN.md), accepted P01–P03 reports and the user-supplied P04 authorization were reviewed. Existing uncommitted work was preserved. Comparison is against the accepted P03 source manifest, rather than against the older Git HEAD.

| Files | P04 change |
|---|---|
| [individual-model.ts](../../server/payments/individual-model.ts), [individual-reads.ts](../../server/payments/individual-reads.ts) | Strict request/state contracts; relational effective-outcome queue/search/pages; current blockers; separate cancelled-history filter; bounded verified event history |
| [individual-service.ts](../../server/payments/individual-service.ts), [individual-writes.ts](../../server/payments/individual-writes.ts), [individual-routes.ts](../../server/payments/individual-routes.ts) | Fresh guarded requests, unpaid preparation, cancellation decisions/replacements, immutable evidence/audit, route exclusion and original-payment cancellation synchronization |
| [effective-payment-sql.ts](../../server/payments/effective-payment-sql.ts), [recording-reads.ts](../../server/payments/recording-reads.ts) | Share the existing correction/classification precedence with P02; no alternate eligibility engine or changed payment outcome calculation |
| [IndividualPayments.tsx](../../src/IndividualPayments.tsx), [App.tsx](../../src/App.tsx), [prior-command.ts](../../src/prior-command.ts), [individual-command-conflicts.ts](../../src/individual-command-conflicts.ts) | Permission-aware navigation, lazy workspace loading, keyboard search, 25-row pages, simple actions, history, cancelled view, exact uncertain-response recovery across reload and release of the browser retry lock after a definitively uncommitted source conflict |
| [service.ts](../../server/ovr/service.ts), [reprocessing.ts](../../server/ovr/reprocessing.ts), [processing-service.ts](../../server/ovr/processing-service.ts), [treasury-service.ts](../../server/ovr/treasury-service.ts) | Preserve existing processing/reprocessing, adding the shared individual-route exclusion at consequential payroll review/finalization, reprocessing assignment and actual/historical payment entry |
| [payment-correction-service.ts](../../server/ovr/payment-correction-service.ts) | Coordinator-confirmed original Paid corrections atomically cancel the active unpaid internal request/DV; preserve the established P03 correction, claimability and closed-period controls |
| [app.ts](../../server/app.ts), [config.ts](../../server/config.ts) | Register permission-protected APIs; new operational commands remain disabled unless `INDIVIDUAL_PAYMENTS_ENABLED=true` is explicitly supplied |
| [F48 migration](../../db/migrations/20261022030000_f48_individual_unclaimed.sql), [schema-manifest.ts](../../server/schema-manifest.ts), [migration-lib.mjs](../../scripts/migration-lib.mjs), [check-database.mjs](../../scripts/check-database.mjs) | Three additive tables, migration fingerprint and restricted grants/probes |
| [test-individual-payments.ts](../../scripts/test-individual-payments.ts), [migration test](../../scripts/test-individual-payments-migration-db.mjs), [unit tests](../../tests/individual-payments.test.ts), `package.json` | Focused/835-member, authorization, concurrency, audit rollback, performance, recovery and state tests; three new acceptance suites |
| [Retry-conflict unit tests](../../tests/individual-command-conflicts.test.ts) | Definitive stale-source conflicts release the browser retry lock; server/network uncertainty, permission revocation and key/evidence conflicts remain retained |
| Existing DB fixture drivers | Migration expectation 57→58, opt-in P04 fixture hooks and a fresh revision before the existing P02 closure after synthetic P04 corrections |

The [frozen manifest](../../output/p04-unclaimed-20261022/candidate-fingerprints.json) enumerates the exact delta: **616 source inputs, 230 build artifacts, 58 migrations; 39 modified and 13 added source files, none deleted**. Most modified files are fixture migration-count updates. All **57 previously applied migration hashes** remain unchanged. Thirty-one protected P01/P02/P03 and R01–R07 implementation files, including the request-local cache, cohort readers, automatic candidates, managed release, Registry, Dashboard, reports and notification readers, match the accepted P03 fingerprints.

### Persistence justification

| New table | Why existing storage cannot safely enforce this invariant |
|---|---|
| `individual_payment_transactions` | `payment_records` requires a real frozen payroll outcome, and `payroll_reprocessing` requires an existing payroll attempt. Neither can represent an unpaid request/DV and replacement lineage without fabricating a payment or batch. Immutable headers reference the existing entitlement, payment and frozen source batch. A generated unique request key permits one original request per entitlement; composite self-FKs keep replacements/request ancestry on that entitlement |
| `individual_payment_events` | Existing command journals/audits provide retry and attribution but do not enforce a transaction FK plus unique domain revision and valid P04 action vocabulary. This append-only relation preserves request, preparation, cancellation request/decision and original-Paid cancellation evidence, with content hashes |
| `entitlement_payment_routes` | Existing allocations protect a finalized payroll, and release links preserve the first release. Neither reserves an unpaid individual route. Its entitlement primary key and unique transaction pointer enforce one active route; composite FKs pin owner and immutable event. Only this pointer can change; all changes also retain event/journal/audit evidence |

There is **no second Paid ledger, new request table, new command journal, extra route-event table, new permission seed, rewritten historical evidence or old-table index change**. Existing `ovr_commands` and `audit_logs` are reused. Runtime headers/events allow SELECT/INSERT only. Routes allow SELECT/INSERT and UPDATE of **transaction_id, event_transaction_id and event_revision only**; no runtime DELETE or entitlement-key UPDATE is granted.

Business-rule deviations: **none** to scholarship eligibility, document/academic decisions, benefit amount, existing claim deadline or historical payment authority. The intentional additions are the requested unpaid-route reservation/exclusion, cancellation lifecycle and Coordinator-confirmed original-payment synchronization.

### APIs and existing logic reused

- `GET /api/v1/individual-payments/availability`
- `GET /api/v1/individual-payments/queue?view=unclaimed|cancelled&q=…&offset=…&limit=…`
- `GET /api/v1/individual-payments/payments/:paymentId`
- `GET /api/v1/individual-payments/entitlements/:entitlementId/history`
- `POST /api/v1/individual-payments/commands`, with an actor-bound idempotency key.

Staff operations use existing `ovr.process`; cancellation approval/rejection uses existing `payments.corrections.approve`. Pure System Administrator/unassigned accounts receive no operational authority. Authorization is rechecked before a completed command can be replayed.

Consequential work reuses `AuthorizationService.withPermission`, the existing global configuration guard and actor/entitlement locks, `assertNoPaidClaim`, `claimDeadline`/`requireClaimOpen`, `effectiveRoster`, `managedRelease`, the canonical correction writer and existing request-local cache invalidation. The lock order is unchanged: global business guard before actor/financial locks. No cross-request eligibility cache or new caching framework is added.

## B. Workflow results

The queue derives effective payment outcomes using the established latest applied/approved correction and later unpaid-classification precedence. It excludes Paid, Withheld/Review, Pending, absent payment/entitlement and omitted cases from the actionable Unclaimed view. A Paid attempt elsewhere for the permanent scholar/semester also excludes the old unpaid source. Unknown/unreliable legacy sources are not automatically assigned a financial identity.

Requests record authenticated actor and server UTC timestamp; the input rejects backdating, supplied amounts, official voucher numbers and future payment/document actions. The event retains source batch/payment/entitlement, batch revision, approved amount, the semester-end guard and semester revision, plus any blockers. An expired or otherwise blocked genuine Unclaimed request is retained honestly and cannot prepare a DV. Repeated clicks/keys reuse the original request.

A conflict-free request selects the DV-only route, preventing a competing payroll assignment while Staff prepares the DV. A blocked request does not take another route's ownership. Preparation rechecks current standing, original/effective roster, holds, document/academic restrictions, effective payments, pending corrections/receipts, discrepancies, deadline and reprocessing assignments under the same transaction. It creates no new entitlement or payment and grants no extra collection authority.

Existing reprocessing assignments/frozen attempts remain authoritative. They are displayed as blockers and are never implicitly transferred or cancelled. The existing payroll reprocessing workflow remains available for compatibility cases; once the individual route is selected, competing assignment/finalization/payment commands reject it. The concurrency fixture exercises the real assignment API against replacement preparation, with one winner. Explicit withdrawal evidence used for test cleanup exists only in a disposable compatibility fixture, not in development/office data.

Staff requests cancellation with a reason; a Coordinator approves/rejects with a reason. Rejection retains the active prepared DV. Approval retains the original header/events and clears only the active pointer. Replacement creates a new internal LDSS reference linked to the cancelled transaction and original request, reuses the original entitlement and revalidates all restrictions. Older/superseded transaction revisions cannot be resurrected.

P03 Paid→Unclaimed correction restores queue visibility where appropriate without creating a DV. Coordinator confirmation of the original Unclaimed→Paid outcome atomically cancels its active unpaid internal route and removes it from the actionable queue. A later reversed outcome does not resurrect the cancelled DV; a fresh eligible replacement is required. The cancelled-history view remains available even after the original outcome is Paid. Original payment rows, correction history, original closure evidence and frozen forms are preserved. No externally forwarded/document-generated/cheque/Paid transition exists in P04; external conflicts cannot be silently treated as cancelled.

## C. Financial integrity, migration and recovery

The existing unique permanent-scholar/semester/degree entitlement and PHP 5,000 amount remain authoritative. Existing Paid, historical-receipt, pending-correction, allocation, hold, frozen-membership and one-claim guards remain in force. The new route table is **not** treated as proof of absence of older commitments: preparation checks the existing canonical sources as well.

An audit failure rolls back headers, events, route pointers, journals and any related correction. Tested concurrency uses the same global lock and fresh reads, rather than a cached authorization decision. Original-payment cancellation and P03 correction commit or roll back together. Cancelled route history is never deleted to permit replacement.

The [populated migration rehearsal](../../output/p04-unclaimed-20261022/migration.json) verifies a real 57→58 boundary, preservation of existing business data and historical closures, no generated requests/DVs/routes and exact retry applying zero migrations. It deliberately interrupts F48 after its first CREATE: the runner rejects retry rather than falsely journaling a completed migration, and all original business hashes remain unchanged. Repair/removal of the **empty owned fixture table** is a disposable test operation, not a live rollback recipe.

The [local development migration evidence](../../output/p04-unclaimed-20261022/development-migration.json) records a fresh verified backup/restore before applying F48 locally: **129 original business tables and all 57 previous checksums unchanged**, three empty new tables, restricted grants and operational activation still disabled. No LAN/production schema or data was changed. Filled P04 evidence also passes through the existing populated P03 backup/restore verification in the focused fixture.

MariaDB DDL implicitly commits. A failure between CREATE statements can leave partial structures without a migration journal row. Do not edit old checksums, disable FKs, discard nonempty evidence or blindly repeat an installer. Preserve the failed state and use reviewed forward repair or restore a verified pre-update backup into a separate database, verify constraints/history, reconcile post-backup activity and perform a separately authorized cutover. No destructive automatic down migration or old-binary rollback is supplied.

## D. Performance

Measurements below come from the final frozen v2 gate and [performance summary](../../output/p04-unclaimed-20261022/performance-summary.json). Existing-flow comparisons use the retained accepted P03 835-scholar fixture, with 825 Paid and 10 Unclaimed, and equivalent P04 fixtures. They are independent runs, not a paired speedup experiment. Read timings are medians of three samples; consequential writes have one sample each. Times exclude synthetic fixture creation. Query counts include service authorization; payloads are serialized response bytes. SQL time is client-observed database roundtrip, not database CPU.

| Existing 835-scholar operation | Accepted P03 ms | P04 ms | SELECTs before → after | Response bytes before / after |
|---|---:|---:|---|---|
| Payment Recording roster page | 22.85 | 21.96 | 10 → 10 | 6,185 / 6,185 |
| Payment Recording search | 19.49 | 18.89 | 10 → 10 | 288 / 288 |
| Payment Recording next page | 22.45 | 21.90 | 10 → 10 | 6,196 / 6,196 |
| Payment Recording post-payment summary | 17.05 | 16.53 | 13 → 13 | 419 / 419 |
| Reconciliation summary | 18.31 | 18.00 | 20 → 20 | 925 / 925 |
| Preview 10 Unclaimed | 539.68 | 550.24 | 92 → 92 | 1,851 / 1,851 |
| Commit 10 Unclaimed | 631.42 | 569.88 | 119 → 119 | 497 / 497 |
| Preview remaining 825 Paid | 4,555.12 | 4,279.35 | 442 → 447 | 137,078 / 137,078 |
| Commit remaining 825 Paid | 5,410.51 | 5,369.92 | 449 → 454 | 499 / 499 |

The five additional bulk SELECTs check individual-route ownership in bounded chunks; they are not one query per scholar. The 825-member commit retains 3,302 writes and the original transactional payment/evidence path. Its database roundtrip total changed from 2,381.89 to 2,516.93 ms; elapsed time changed by less than 1%. No throughput improvement is claimed from these single writes. One immediate refresh measured 50.61 ms versus 15.63 ms previously, with the same 13 SELECTs and 419 bytes; three repeated post-payment summaries above did not reproduce that latency. This isolated slower sample remains recorded rather than discarded.

| New P04 operation | Fixture / samples | Elapsed ms | SELECTs | Bytes |
|---|---|---:|---:|---:|
| Queue | 2 scholars / 3 | 16.47 | 8 | 496 |
| Queue, 10 Unclaimed | 835 scholars / 3 | 26.15 | 8 | 4,744 |
| Search | 835 scholars / 3 | 24.10 | 8 | 513 |
| Nonempty next page, 5 rows | 835 scholars / 1 | 26.40 | 8 | 2,393 |
| Offset beyond last Unclaimed | 835 scholars / 3 | 24.03 | 8 | 46 |
| Routine request | 2 scholars / 1 | 69.13 | 76 | 111 |
| Routine Staff Prepare DV | 2 scholars / 1 | 41.38 | 78 | 92 |
| Cancellation request / approval | 2 scholars / 1 each | 7.01 / 9.70 | 9 / 9 | 103 / 90 |
| Routine replacement | 2 scholars / 1 | 39.57 | 78 | 92 |
| Truthful expired request retained | 835 scholars / 1 | 173.34 | 87 | 813 |
| Cancellation request / approval | 835 scholars / 1 each | 7.35 / 8.65 | 9 / 9 | 103 / 90 |
| Replacement after source revalidation | 835 scholars / 1 | 111.40 | 90 | 92 |
| Simultaneous payroll assignment versus DV | 2 scholars / 1 pair | 255.07 | 288 combined | 322 combined |

The successful routine benchmark uses the frozen v1 backend, whose complete backend/schema fingerprints equal v2; v2 changes only frontend conflict recovery and its unit tests. The concurrency pair uses v2 real HTTP handlers, session authorization, CSRF and restricted grants. DV preparation succeeded and payroll assignment returned `409 INDIVIDUAL_ROUTE_ACTIVE`; payment rows remained unchanged. Summed overlapping database roundtrips were 332.41 ms, so they must not be interpreted as sequential wall time. Full 835-member tests also exercise Staff preparation, cancellation/replacement, competing requests, audit rollback and correction synchronization, without asserting that each measured expired-source write is the ordinary path.

Twenty sequential queue reads after explicit GC stabilized on the 835-member fixture: heap **148.21 → 148.04 MiB**, range 148.02–148.21 MiB; RSS stayed **865.24 MiB**. All three pooled connections were free after every read, with zero queued waiters and no OOM. The two-member fixture retained two free connections and heap 59.47 → 59.31 MiB. These are short-run stability checks, not a long-duration load guarantee.

The pre-existing full-detail comparison still returns **36,110,257 bytes and 3,143 SELECTs**, with median 16,404.58 → 15,085.68 ms. Sampled peak RSS increased **1,297.26 → 1,420.43 MiB** across those independent full-detail runs, despite essentially unchanged peak heap (414.23 → 414.30 MiB). The new workspace does not request that endpoint; its 835-member queue reads peaked at 844.73 MiB in the already-populated test process. Peak RSS remains a material existing R07 limitation; P04 does not claim to resolve it or equate process RSS with endpoint-only allocation.

Environment: Windows x64, Node 22.21.0, MariaDB 10.4.32, **15.92 GiB RAM**, 16 logical CPUs, existing 16 MiB InnoDB buffer pool and 1 MiB max packet. No database/Node tuning was changed. Warm-buffer synthetic measurements are not LAN response-time promises. Timer-sampled peaks can miss synchronous spikes.

The queue uses two relational data queries plus authorization, independent of page size; it does not call Registry loading, full-cohort eligibility, payroll draft generation or per-row reconciliation. Expensive restrictions are loaded on an individual review/action. Search and history are server-paged; the UI requests 25 rows and caps are server-validated. Shared outcome SQL preserves existing precedence rather than implementing a new eligibility calculator.

Writes invalidate existing request-local caches. Frontend mutation notifications refresh the scoped queue/history, abort obsolete detail loads and avoid a duplicate explicit queue refresh. Availability is checked separately (authorization-only) before queue loading. All reported service SELECT counts must be read with that extra availability call and common navigation/session requests excluded.

## E. Verification and limitations

The repository-approved `npm run test:uat` completed on frozen v2: **63/63 suites passed**, including `check`, database readiness and every registered `test:*-db` suite. It ran from **12:32:31 to 1:21:48 PM Philippine time** (49 minutes 17 seconds); the wrapper also recorded exit code 0. [Full gate report](../../output/p04-unclaimed-20261022/uat-r2/F36-report.json), [check log](../../output/p04-unclaimed-20261022/uat-r2/check.log), and [wrapper exit](../../output/p04-unclaimed-20261022/uat-r2-runner-exit.json). Office/technical sign-off fields remain pending; automated success is not production authorization.

| Gate | Final result |
|---|---|
| Unit tests | 546 passed across 89 files, including 15 new P04 validation/retry cases |
| Lint, TypeScript, production build | Passed; existing Vite main-chunk warning above 500 kB remains |
| Secret scan | Passed for 943 source/build files |
| Focused P04 and 835-member P04/P02/P03 | Passed: 10 Unclaimed / 825 Paid, route conflicts, Staff preparation, cancellation/replacement, corrections, preserved frozen evidence |
| Permissions, exact retry, stale revisions, concurrency, audit rollback | Passed, including permission revocation and single-winner route reservation |
| Fresh/populated/interrupted migration and backup restore | Passed; 57 prior checksums preserved, no fabricated historical rows |
| R01–R07 / financial regressions | All registered Registry, automatic payroll, Dashboard, detail, reporting/pagination, notifications, reconciliation, historical/legacy and financial suites passed |
| Frozen source/build/schema | 616 source inputs / 230 artifacts / 58 migrations unchanged throughout final gate; 31 protected accepted implementation files match P03 |
| Final development integrity | All 129 existing business-table hashes unchanged; all three P04 tables empty; no task-owned schema/account left |

The [final integrity evidence](../../output/p04-unclaimed-20261022/final-integrity.json) confirms the original 15 schemas and 12 LDSS database accounts, retaining all six pre-existing test databases. F48 was applied to local DEV only after its verified backup; no real Unclaimed case was enrolled, prepared, cancelled or paid. Operational activation remains off. The final source/build comparison is in [final fingerprints](../../output/p04-unclaimed-20261022/final-fingerprints.json). Critical P04 verification is complete; outstanding limitations are explicitly listed below.

Browser verification uses synthetic accounts and disposable fixtures, including the frozen production build. The Staff path uses keyboard search, one request action and one Prepare DV action. A completed response is deliberately replaced with HTTP 503; the exact saved request/key survives reload, the right scholar is reopened even when the restored page starts at another row, and retry does not create another event. Staff cancellation, Coordinator decision/replacement, cancelled history and existing closed Payroll/Reconciliation screens were checked. Desktop/tablet screenshots are retained in `output/playwright/`.

An initial browser assertion helper completed its checks, then failed to write its proposed JSON file because the Playwright VM does not support that dynamic import. The harness was corrected to return its result through the CLI and let the host write it. A fresh frozen disposable fixture then passed the [read-only final browser proof](../../output/p04-unclaimed-20261022/browser-proof.json): one original request, original/replacement preparation only, retained cancellation, no new payment, unchanged Closed state and immutable Original reconciliation. That proof is separate from the earlier actual keyboard/lost-response UI journey captured in screenshots/snapshot logs. The failed helper is retained. Expected authentication probes and deliberately injected HTTP 503 responses are distinguished from application errors; no unexpected browser console error remained after the final successful action.

Problems found and corrected before freezing: wrong academic-year join in the new queue; an upsert requiring entitlement-key UPDATE privilege (replaced by locked INSERT/UPDATE without broadening grants); a misleading retry success label/selection (now based on the saved action/payment); and test-only synchronous-disabled-call and stale post-correction closure-revision assumptions. Early failed logs are retained in `output/p04-unclaimed-20261022/`. No business rule or constraint was loosened to pass them.

Final review also corrected an uncertain-response edge: a retry that definitively fails because another operator changed the source now releases the browser retry lock and permits fresh review. The server checks its command journal before returning these specific 409s; an already committed key still returns its receipt. Network/server errors, permission revocation, key/payload conflicts and integrity failures are not treated as proof of absence. Eight additional unit cases and the [v2 browser conflict proof](../../output/p04-unclaimed-20261022/browser-definitive-conflict.json) verify this distinction. No backend business logic or schema changed for this correction.

The [explicit queue negative matrix](../../output/p04-unclaimed-20261022/queue-negative-checks.json) additionally verifies live Withheld/Review/Paid exclusions, missing payment and forged omitted-origin rejection, and invalid-calendar rejection. The first private assertion expected an actual NULL end date, but this MariaDB session coerced the fault to `0000-00-00`; the guard correctly classified it as expired and blocked preparation. The diagnostic and failed harness logs are retained. The corrected assertion records the actual raw dates and requires a blocked command; neither application rules, schema nor SQL mode was changed to pass it. The owned fixture calendar, including its timestamp, was restored. The genuine NULL-end behavior is separately covered by unit tests.

Reviewable screenshots: [Staff request recorded](../../output/playwright/p04-frozen-request-recorded.png), [DV prepared on desktop](../../output/playwright/p04-frozen-prepared-desktop.png), [tablet layout](../../output/playwright/p04-frozen-tablet.png), [cancelled history](../../output/playwright/p04-frozen-cancelled-history.png), [Coordinator cancellation](../../output/playwright/p04-coordinator-cancelled.png), [uncertain response](../../output/playwright/p04-uncertain.png), and [definitively rejected retry unlocked](../../output/playwright/p04-v2-definitive-conflict.png). The initial full UI journey uses frozen v1; v2 preserves that page/layout and adds the separately browser-tested conflict classification. The final full gate targets v2.

The first full-gate attempt was interrupted by the host restart at **12:13:49 PM Philippine time**. Its parent runner disappeared and its report remained `running`; its 39 completed suite logs are retained and **do not count as a complete acceptance pass**. Only its verified inactive synthetic fixture/account were removed, preserving the six pre-existing test databases. [Interruption and cleanup evidence](../../output/p04-unclaimed-20261022/uat-r1-interruption.json). The fresh v2 gate then completed all 63 suites independently. A brief final polling race prompted an incorrect interruption concern in commentary; the subsequently persisted full report, final suite log and wrapper exit confirm normal completion. No reconstructed or partially resumed gate is presented as the final pass.

Remaining limits: sampled RSS can miss short synchronous peaks; SQL milliseconds measure client-observed roundtrips rather than MariaDB CPU; 835-member tests do not prove arbitrary capacity or long-duration behavior on a 16 GB host; existing R07 full-detail peak memory and the pre-existing larger-roster evidence-size restriction are not changed. Whole historical/managed financial source readers are still used when an individual consequential action requires authoritative validation. The queue improvement is not a claim that those broader readers were optimized.

## F. Policy and next phase

**Q1 remains unresolved:** the Financial/Releasing Office's controlling legal/operational collection cutoff and any authority/effect of a timely request after it. P04 invents no three-working-day counter, holiday calendar, automatic forfeiture or late-payment extension. The existing inclusive Philippine semester-end guard remains; unknown/expired periods block new preparation/release, and existing documented prior-receipt correction controls remain unchanged. Recording a request is not payment authority.

P05 requires separate approval. Its omitted-scholar path must retain later eligible same-semester payroll first, then Coordinator-approved OR + DV after preparation closes; this is not a new unanswered route-policy question. P05 must extend the minimal source/route identity safely for pre-entitlement omissions and reuse fresh automatic candidate validation/Coordinator finalization. P06 owns replaceable draft DOCX templates; P07 owns acknowledged cheque/payment recording and any external-document conflict transitions. None is implemented here.

The pre-P04 upgrade fixture deliberately refuses to discard nonempty P04 structures in a restored source. Once local DEV contains real P04 evidence or later migrations, future phase tests must construct the upgrade from the retained verified pre-P04 backup rather than stripping populated tables. Filled P04 backup/restore is tested separately. This is a preservation safeguard, not a supported destructive downgrade.

No deployment, automatic approval, Word generation or individual payment recording occurred. P05 remains unstarted.

**Recommendation: P04 is ready for acceptance review.** Preserve default-disabled operational activation and the Q1 cutoff guard. Stop for explicit P05 authorization; this report does not approve deployment or later phases.
