# FLOW-2 — Final synthetic office UAT and release readiness

27 October 2026, Philippine time. **The fresh 835-person fictional workflow passed from intake through payment recording, reconciliation, corrections and reporting. The financial race fixture is corrected. Primary business data remain exact. Restricted office LAN pilot: NO-GO. Live financial operations: NO-GO.** Large concurrent finalization still produces a lock-wait failure, the payroll response target remains unmet, and security/deployment and office-policy gates remain open. This is not all-green office release acceptance.

Only one existing **test script** changed. No production reader/writer, validator, UI, financial policy, migration, permission, dependency, configuration or launcher changed. No primary business command was submitted. LAN-R2A remains paused. This preserves [PAY-PERF-3](../requirements/PAY_PERF_3_PAYROLL_ASSESSMENT_OPTIMIZATION_REPORT.md), PAY-FLOW-1/2, PAY-UX-2, PAY-TIME-4, PAY-NEW-4 and earlier work. AGENTS.md, the installed ui-ux-pro-max Quick Reference and Playwright CLI workflow were applied.

## Verified primary and recovery

| Item | Starting → final result |
|---|---|
| Host / MariaDB | **DESKTOP-BPLJKRP / 127.0.0.1:3306** |
| Database / restricted runtime | **`ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost`** |
| Application | **synthetic / loopback 5173 / API 3001** |
| Controller / API / Vite | **64684 / 9520 / 63928**, ancestry/commands unchanged; no restart |
| Schema | **150 tables / 67 accepted migrations**, F57 installed; SQL hashes/timestamps exact |
| Working context | **TWO-BATCH-YEAR / TWO-FIRST**, cycle `829ae3dc-9b49-4d88-9dfe-0a7250b164c0`, open / v2 |
| Batch 1 | `a6f45315-4b8b-46f8-b91d-bedc58cd6cc2`, **Published / v415 / 835 active members**, 167 retained removals |
| PAY-001 | `608d5a04-34e1-4eeb-8c00-5fd40ad2d44b`, **processed / v805 / 800 Paid** |
| PAY-002 | `9cc2e740-061e-4667-98cc-bc1532032408`, **processed / v5 / 200 Pending** |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft / v4 / 834 included / 1 deferred / 1,000 blocked / 0 awaiting review** |
| PAY-003 proposal / frozen / allocations / payments | **834 / 0 / 0 / 0**, unchanged; proposal is not finalization |
| Legacy cutoffs | PAY-001 **21 October**, PAY-002 **23 October**, PAY-003 **27 October**, original whole-day semantics |
| Deadline / synthetic rule | **31 October / revision 3**; unchanged five-time rule, **12:00 / 15:00 / 17:00 default / 19:00 / 23:59**, Asia/Manila, valid **27–31 October** |
| Actual payments | **800 exact Paid rows: 2 dated 2026-10-24; 798 dated 2026-10-26** |

The actual dirty workspace supplied staging at `C:/xampp/htdocs/ldss_flow2_primary_stage_20261027` and a matching external baseline. **1,389 existing inputs** were checkpointed; private configuration was excluded from staging. Accepted PAY-PERF-3 hashes matched. Git HEAD and older builds/data were not substituted. [Inspection](../../output/flow-2-primary-20261027/inspection.json), [preflight](../../output/flow-2-primary-20261027/preflight.json), [current state](../../output/flow-2-primary-20261027/current-state.json), [starting hashes](../../output/flow-2-primary-20261027/files-before.json).

Before fixture mutations, BACKUP-1 captured **99,323,311 SQL bytes / 22,626,801 encrypted bytes**, SHA-256 `db9c5a4f3290ae2fdeead11e3114793dfa63ae1257e1f2fbbfb02d761b7cdd1d`. Complete newly owned isolated restoration verified all values/counts/checksums, schema/journal, indexes, foreign keys/checks, triggers, executable views and rejection probes. Coverage includes accounts/roles, scholar/academic/document/import/approval evidence, activations, frozen rosters, payments/dates, audits, ledgers and cutoff history. Target/account were removed. **Nothing was restored over primary.**

Schema-scoped READ locks and existing bounds remain: **128 MiB SQL / 192 MiB decoded envelope / 96 MiB archive / 100,000 rows per table / 120-second tool limits**. This approximately 94.7 MiB SQL checkpoint does not certify future growth, off-host recovery, power loss or office RPO/RTO. Keys/archives remain private. [Recovery proof](../../output/flow-2-primary-20261027/recovery.json).

## Complete synthetic workflow

All mutations, faults and uncertain/concurrent responses used newly owned disposable targets. The main intake used **835 newly fictional scholars and fresh accounts**. Restricted copies of synthetic UAT supplied current-state/deferral diagnostics. No operational LAN data were used.

| Stage | Fresh result |
|---|---|
| Registration/import | Reviewed New/Continuing intake, permanent IDs, workbook preservation and current-year placement pass; **380 course-pending exceptions / 455 recorded courses**. Duplicate identity and missing/wrong-year placement reject in accompanying suites. |
| Documents/prior approval | **835 COR individual verifications / 835 applicable COG prior-attestation decisions**. All original approval snapshots survive 835 legitimate activations. Missing prior-year individual COG placement still rejects; no history, grades or GPA are invented. |
| Source changes | Changed identity, placement, receipt, adverse/subsequent standing, unavailable authority and corrupt publication proof invalidate evidence. No renewal/rehashing workaround. |
| Masterlists | Reviewed cross-page atomic addition, review/approval/publication pass. Fresh suites cover activation exclusion, conflict diagnostics, **1/25/167/200** removals, bounds, stale proof, roles, rollback and retry; official history stays protected. |
| Payroll | Own numbered Draft/window assesses **835 eligible / 0 blocked / 0 allocated**. Early Review succeeds, early finalization rejects, Coordinator Return to Draft and resubmission pass. |
| Finalize/submit/process | **835 entitlements / 835 allocations / one frozen roster**. After processing: **835 Pending / 0 Paid / 0 payment records**. |
| Record outcomes | Confirmed fictional **10 Unclaimed + 825 Paid**. Late audit failure rolls back all children. Exact replay after ignored committed response returns the original result. Amount/date/source/role/duplicate guards remain. |
| Reconcile/report | Returned verification, discrepancies, corrections, closure, immutable original/current distinctions, HTML/Word/XLSX/PDF pass at **835 members**. Observed final canonical result: **826 Paid / 9 Unclaimed**, after supported fictional corrections. All **835 original payment rows** remain exact. Fictional total **PHP 4,175,000.00**. |
| Individual/deferred | Six owned-copy groups pass discovery/paging, restoration, required return from Review, Staff denial, stale sources, rollback and retry. Unsupported Draft/historical routes remain blocked. Approved finalized-source omission and **one unpaid OR + DV transaction** create no payment authority or outcome. |

A separate **25-person** preliminary run passed. Final sequential 835 driver exits **0**: seven forward groups plus full payment/reconciliation/report assertions. Its approximately **1,018 seconds** include repeated negatives, legacy full-detail baselines and export/stability checks; it is not operator throughput. [Workflow summary](../../output/flow-2-primary-20261027/workflow-summary.json), [driver exit](../../output/flow-2-primary-20261027/sequential-835-exit.json), [full log](../../output/flow-2-primary-20261027/sequential-835.log), [deferred recovery](../../output/flow-2-primary-20261027/deferred-integration.json).

Cutoff progression used only **fixture Node Date and connection-local SQL timestamps**, with fresh fictional sessions. Machine/database-global clocks, primary receipts, windows and payment dates stayed unchanged. This was not an actual overnight office run.

## Concurrency finding and cutoff sequencing

The first 835-person competing-finalization run returned **200 / 500**, failing its expected **200 / 409** assertion. Its failure remains recorded; sequential success does not erase it. [Original commands/results](../../output/flow-2-primary-20261027/forward-results.json), [failure log](../../output/flow-2-primary-20261027/forward-835.log).

Fresh instrumented reproduction on a current-state copy established:

| Observation | Result |
|---|---|
| Winning 834-member finalization | **200 / 78,786.7 ms** |
| Competing request | **500 / INTERNAL_ERROR / 51,106.7 ms** |
| Driver failure | **ER_LOCK_WAIT_TIMEOUT / 1205**, on `SELECT id FROM configuration_guard WHERE id=1 FOR UPDATE` |
| Global lock wait / packet limit | **50 seconds / 1,048,576 bytes**, read without modification |
| Persisted result | **One frozen roster / 834 allocations**, no competing finalization |
| Winning exact retry | Original success |
| Losing original body/key retry | **409**, no additional allocation |

This proves the cause for the **instrumented reproduction**. The original uninstrumented 835 response cannot retrospectively be assigned an exact SQL error. Normal checks were also running during the diagnostic; this is contended-host evidence. **It is a high-priority operational blocker, not concurrency acceptance.** No lock, source guard, database limit or timeout was weakened. No duplicate allocation or original-payment change was demonstrated. [Diagnostic](../../output/flow-2-primary-20261027/finalization-concurrency.json), [runtime inventory](../../output/flow-2-primary-20261027/runtime-inventory.json).

The later timed window initially assessed 835 candidates, but Review correctly rejected **834 DUPLICATE_ENTRY** issues: those people were still proposed in the original Draft. After that **copy** finalized, timed reassessment included **one** remaining scholar, who completed authorized Review/finalization with one allocation. This is a supported later ordinary-payroll path, not individual-payment authority or permission to delete the original proposal. Earlier other-draft explanations would improve usability. [Rejection](../../output/flow-2-primary-20261027/timed-overlap-rejection.json).

Current-rule tests pass invalid time/stale rule rejection, exact creation retry, default **17:00 PHT / 09:00 UTC**, and checks before, at and one microsecond after the inclusive boundary. **Date-only same-day physical receiving stays review-required.** All five form choices were exercised without primary submission; unit tests cover their conversions. Legacy windows remain exact. No office approval or receipt-time attestation rule was fabricated. [Cutoff integration](../../output/flow-2-primary-20261027/cutoff-integration.json).

## Financial race-fixture correction

Both documented legal orders reproduced before correction: closure-first passes; correction-first reaches the unchanged final `paidIdentity` assertion with no current Paid witness after the intentional report-source correction. Original Paid history remains present. The test precondition is defective.

The **16-line test-only addition** establishes a separately declared fictional Paid witness through existing discrepancy and Coordinator correction commands, after original report-preservation checks. It checks exact retry, current Paid presence, original payment and closure rows/totals, and frozen-source preservation. The original positive duplicate-claim and other-semester assertions remain unchanged.

**Three closure-first and three correction-first deterministic runs pass.** They deliberately schedule each lawful serialization; the unchanged concurrent race also runs in regressions. No production writer, validator or report source pin changed. [Before](../../output/flow-2-primary-20261027/race-results.json), [six corrected runs](../../output/flow-2-primary-20261027/race-after-results.json), [patch](../../output/flow-2-primary-20261027/FLOW_2_TEST_FIXTURE.patch).

## Roles, failures and test commands

Actual primary Staff has **22 permissions**, Coordinator **42**, both assignment version **3**, unchanged. [Actual permissions](../../output/flow-2-primary-20261027/actual-permissions.json).

| Operation | Enforced authority |
|---|---|
| Scholar/document/Masterlist preparation and payroll review | Existing Staff/Coordinator permissions |
| Masterlist approval/publication, window creation, finalization and official submission | Coordinator; Staff and pure technical Administrator denied |
| Processing and ordinary payment recording | Existing `ovr.process`; explicit evidence/outcome confirmation required |
| Corrections/individual routes | Existing request/approval/date/source/closure and OR/DV restrictions; deferral supplies no payment authority |
| Reports/exports | Authorized business roles; pure technical Administrator denied |

Fresh authentication **15 scenarios** and RBAC **10** pass, including expiry/revocation, CSRF/session controls, role serialization, disabled accounts, audit rollback and restricted grants. Owned browser logout yields real **204 → 401**. Renderer/export-audit failure, changed export sources, discrepancies, stale versions/hashes, invalid windows, duplicate claims, transaction failure and competing financial commands are exercised. The large lock-wait failure remains open.

| Validation | Final result |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:secrets` | Matching staging: **all exit 0** |
| `npm test -- --maxWorkers=1` | **137 files / 949 tests passed** |
| Existing integrated regressions | **13 exit 0**: Masterlist drafts/workflow/amendments, academic/changes, notifications, Registry/main payroll/Treasury, intake/import, historical/omitted payroll, Recording, reconciliation, individual settlement, financial reports |
| Additional integrated suites | **6 exit 0**: Masterlist selection, conflict removal, document workflow, authentication, RBAC, Individual Payments |
| Current-state diagnostic / deferred drivers | Both exit **0**; diagnostic explicitly retains the unresolved 500 |

[Normal commands](../../output/flow-2-primary-20261027/checks-main.json), [unit log](../../output/flow-2-primary-20261027/unit-final.log), [13 exact commands/results](../../output/flow-2-primary-20261027/regressions-all-latest.json), [six additional commands/results](../../output/flow-2-primary-20261027/extra-results.json), [diagnostic/deferred commands](../../output/flow-2-primary-20261027/remaining-results.json).

Initial task-driver typing/lint errors were corrected without weakening checks. A sequential financial attempt correctly stopped at the report suite's fixture-name guard; the successful fresh run uses supported newly owned `ldss_import_test_…` naming. That guard was unchanged. UI probes needed the visible entry region/correct heading; colliding screenshot names were separated and roster captures repeated. The preservation helper needed the actual `auth_sessions.token_hash` key and correctly stopped for the separate login below. These are orchestration qualifications, not grounds for primary repair.

## Performance and interface acceptance

Quiet read series: accepted source on a newly owned synthetic copy, retained services running, other task test jobs/browsers stopped. No physical-cold reset or matched GC. SQL milliseconds are **client-observed roundtrip/decode**, not MariaDB CPU. Counts are query/execute calls; transaction controls are separate. All measured responses returned 200.

| Read | API ms | SQL calls / SQL ms | Response bytes |
|---|---:|---:|---:|
| Registry list, 25 rows, median of 3 | **131** | **21 / 127** | **36,160** |
| Registry eligibility, 25 people, median of 3 | **3,336** | **2,205 / 1,761** | **29,587** |
| Current official-list candidate page, median of 3 | **99** | **247 / 91** | **18,004** |
| Fresh 835-person selection review, 3 samples | **49.7–51.3** | **25 SELECTs / 38.7–39.1** | **5,161** |
| Deferred discovery, one match, median of 3 | **330** | **131 / 277** | **1,447** |
| Included roster, two warm observations | **9,894 / 9,563** | **2,939 each / 4,433 / 3,930** | **106,688** |
| Page 2 / search / excluded page | **9,204 / 9,034 / 9,306** | **2,939 each / 3,809 / 3,569 / 4,065** | **106,835 / 106,688 / 157,243** |
| Draft HTML | **8,118** | **2,941 / 3,133** | **4,757,830** |
| Draft Word | **10,532** | **2,941 / 3,438** | **184,744** |

First included assessment: **13,499 ms**. Payroll page reads add seven transaction controls, exports nine. Selection review's one write is session activity. Positive selection measurements use a fresh fictional cohort; current official-list candidates include activation context. Word ZIP metadata can vary across generation times.

Read-series sampled maximum RSS reached approximately **985 MiB**, not a memory bound or paired improvement. The successful large workflow's legacy full-detail baseline returned **40,565,006 bytes** and took **53.59 / 55.50 / 55.11 seconds**. Normal paged roster/recording use other contracts; remaining expanded legacy views need workload acceptance. Saved official Masterlist detail still transfers its full stored membership for client paging, although 25 rows render.

Concurrent HTML/Word probes all returned 200. Maximum dispatched auth-call times: **28.6 / 22.1 ms**; period calls **83.1 / 90.1 ms**. Word still produced a **1,252 ms event-loop pause** and **1,124 ms delayed probe dispatch**. Same-process injection cannot establish continuously responsive external HTTP traffic or office concurrency. [Measurements/conditions](../../output/flow-2-primary-20261027/performance-summary.json), [read-series commands](../../output/flow-2-primary-20261027/performance-exits.json).

Actual primary HTML preview returned **200 / 834 students / 42 DRAFT pages / 13,137 DOM nodes / 4,757,830 bytes**, document load **10.38 seconds**. Response headers arrived around **10.19 seconds**, transfer **113 ms**, response-end to DOM interactive approximately **61 ms**. It added one expected export audit and no allocation/payment: an audited GET, not a write-free request. [Actual preview](../../output/flow-2-primary-20261027/browser-results/primary-preview.json).

**The five-second payroll target remains unmet.** Full assessment repeats for search/paging; traversing 34 pages serially can consume several minutes of server wait. Loading feedback does not remove that cost. FLOW-2 made no optimization or timeout increase.

Both primary roles passed **1440 / 1024 / 820 / 375 / 320 CSS px**, height 900, on roster, windows, discovery/recovery, Registry and official Masterlist. Roster readiness was **16.58 / 25.92 seconds** during fixture work; Registry **9.54 / 8.80 seconds**, official-list detail **4.22 / 3.74 seconds**. These are task-load observations, not matched speedup measurements.

The primary roster returns/renders 25 rows, exclusions stay secondary, and search/paging work. Defer/restore forms focus immediately and cancel without commands. Coordinator creation opens the existing form; Staff gets an authority explanation. PAY-003's tracker retains the 27 October whole-day cutoff and 28 October normal-finalization date. Tables scroll locally; sampled pages/dialogs have no horizontal page overflow.

Owned browser Review and **200-member bulk recording** tests deliberately lost committed success responses: **two identical requests / one commit**, double-click/navigation/Escape prevention and exact recovery. Blocking progress reflows at all widths; reduced-motion spinner animation is **none**. Delayed/aborted reads use non-blocking skeletons and real keyboard Retry; unavailable results are not zero. [Review recovery](../../output/flow-2-primary-20261027/browser-results/review-progress.json), [payment recovery](../../output/flow-2-primary-20261027/browser-results/payment-progress.json), [read/auth failures](../../output/flow-2-primary-20261027/browser-results/discovery-read-faults.json).

Native Chrome **200%**, viewport emulation disabled, passed both roles at **712×424 CSS px / DPR 2**, with keyboard focus, **44-pixel Search / 3-pixel outline**, Coordinator modal cancellation and focus restoration. Zoom returned to 100%; task windows closed. Full AT/WCAG, maximum load, cold-start and office-concurrency certification are not claimed.

Masked current acceptance captures; no UI redesign occurred:

| View | Desktop / mobile or native |
|---|---|
| Coordinator roster | [1440](../../output/playwright/flow-2-primary/roster-coordinator-1440.png) / [320](../../output/playwright/flow-2-primary/roster-coordinator-320.png) |
| Staff roster | [1440](../../output/playwright/flow-2-primary/after-staff-1440.png) / [320](../../output/playwright/flow-2-primary/after-staff-320.png) |
| Existing creation form | [1440](../../output/playwright/flow-2-primary/window-after-coordinator-1440.png) / [320](../../output/playwright/flow-2-primary/window-after-coordinator-320.png) |
| Recovery | [1440](../../output/playwright/flow-2-primary/primary-coordinator-recovery-1440.png) / [320](../../output/playwright/flow-2-primary/primary-coordinator-recovery-320.png) |
| Owned progress | [Review 320](../../output/playwright/flow-2-primary/review-progress-320.png) / [Payment 320](../../output/playwright/flow-2-primary/payment-progress-320.png) |
| Native primary | [Coordinator modal](../../output/playwright/flow-2-primary/native-coordinator-modal.png) / [Staff search](../../output/playwright/flow-2-primary/native-staff-search.png) |

[Coordinator roster](../../output/flow-2-primary-20261027/browser-results/roster-coordinator.json), [Staff roster](../../output/flow-2-primary-20261027/browser-results/roster-staff.json), [Coordinator office views](../../output/flow-2-primary-20261027/browser-results/office-views-coordinator.json), [Staff office views](../../output/flow-2-primary-20261027/browser-results/office-views-staff.json), [native Coordinator](../../output/flow-2-primary-20261027/browser-results/native-roster-coordinator.json), [native Staff](../../output/flow-2-primary-20261027/browser-results/native-roster-staff.json).

## Readiness and prioritized next steps

| Classification | Finding / disposition |
|---|---|
| Critical defect | No data-loss/duplicate-payment defect demonstrated in exercised paths; bounded synthetic evidence, not exhaustive proof. |
| High-priority operational blocker | Large guarded finalization exceeds the lock wait and produces an uncertain 500. Preserve serialization/exact recovery; separately address command duration and a precise supported busy/rejection outcome. Do not mask it with higher timeouts. |
| Performance limitation | Slow assessment/search/export, Word event-loop stalls and large legacy details need realistic office-workload acceptance. |
| Office-policy decision | Genuine deadline authority, operational permitted-time policy, same-day receiving uncertainty evidence, prior-approval applicability and release authority remain distinct. Q28–Q31 decisions remain open. |
| Deployment/security requirement | Dependency findings, unsupported database series, complete schema-67 packaging/upgrade rehearsal, server-enforced pilot boundary, HTTPS/network/session controls and off-host recovery need disposition. |
| Optional improvement | Earlier other-draft diagnostics, further bounded legacy projections and broader assistive-technology/usability review. No unrelated redesign. |

Fresh `npm audit --omit=dev --json` exits **1**: **3 affected package entries — 1 high, 1 moderate, 1 low**. Full `npm audit --json` exits **1**: **9 — 2 critical, 3 high, 3 moderate, 1 low**, including production entries. These are package findings, not distinct exploit demonstrations. Production findings include Zod, fast-uri and Fastify; the full tree also includes shell-quote/concurrently and development tooling. No dependency/lockfile changed. [Audit results](../../output/flow-2-primary-20261027/dependency-audit.json), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

The current server is **MariaDB 10.4.32**. Community maintenance for 10.4 ended **18 June 2024**, per the [MariaDB maintenance policy](https://mariadb.org/about/#maintenance-policy). Separately authorize a supported-runtime selection and compatible migration/recovery rehearsal. No XAMPP/database upgrade occurred.

| Target | Assessment |
|---|---|
| **A. Primary synthetic technical UAT** | **CONDITIONAL GO for controlled serial technical UAT only.** Positive workflows, preservation and recovery pass; large concurrent financial acceptance and response target remain open. This is not unrestricted final office sign-off or authorization for task-authored primary writes. |
| **B. Restricted office LAN pilot** | **NO-GO.** Resolve dependency/runtime and pilot-boundary gates; rehearse complete matching package and retained-data upgrade; verify office accounts, HTTPS/network controls, recovery and witnessed acceptance. |
| **C. Live financial operations** | **NO-GO.** Pilot/security/recovery/performance gates plus documented office policy, source/forms and release authority are required. Synthetic confirmations supply none of those approvals. |

The recorded **31 October deadline** and five-time rule remain synthetic configuration evidence. No supporting signed office approval for the prior extension was established here. The time rule itself supplies no office approval and expires with its scope. Same-day date-only receiving remains blocked pending supported evidence. Existing [Q28–Q31 boundaries](../requirements/LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md) cover timely-request/late-release treatment, physical receiving, late encoding and office-approved forms.

Smallest separately authorized next package: investigate the large-command reliability finding and office latency budget; review compatible dependency/supported-runtime changes; refresh the complete **67-migration/F57** release and existing-data upgrade rehearsal; implement/verify the restricted server command boundary and operator tooling; obtain genuine policy/source approval and witnessed target recovery/UAT. The [paused LAN plan](../deployment/LAN_R2_RELEASE_PREPARATION_PLAN.md) contains older 66-schema assumptions requiring review. Its protected artifacts were not edited. Synthetic records/policy authority must not become genuine operational evidence.

## Exact changes, preservation and stop

| Existing file changed | Scope |
|---|---|
| [scripts/test-payroll-reconciliation.ts](../../scripts/test-payroll-reconciliation.ts) | Independent fictional Paid witness after report-source mutation, using existing correction and preservation/retry assertions |

This report and task-local drivers/evidence are additions. **1,388 of 1,389 starting inputs remain exact**, none missing. Every production module, writer/validator/report builder, migration, role mapping, dependency, flag, launcher, private configuration and BACKUP-1 input remains exact. All **310 retained distribution files**, **288 compiled server JavaScript files** and final client files match the accepted build. JS/CSS/fonts remain **1,561,059 bytes**. The verified test script was applied by atomic rename after source checks; no application activation/restart was needed. [Source preservation](../../output/flow-2-primary-20261027/source-preservation.json), [hashes](../../output/flow-2-primary-20261027/candidate-files.json), [applied correction](../../output/flow-2-primary-20261027/promoted-files.json), [build comparison](../../output/flow-2-primary-20261027/build-verification.json).

The complete final **150-table** comparison preserves every starting business value/count, schema object, 67 migration rows/timestamps, account/password/role, runtime grant and original command ledger. Coverage includes **1,835 scholars / 14 accounts**, annual/academic/import/document/approval evidence, **3 Masterlists / 2,002 stored entries / 1,835 activations**, PAY-003's exact proposal/deferral, **1,000 entitlements/allocations**, frozen payrolls, reconciliation and all **800 payments/dates**. Both roles' four payment summaries are byte-equivalent before/after. [Full preservation](../../output/flow-2-primary-20261027/final-preservation.json), [financial comparisons](../../output/flow-2-primary-20261027/financial-after.json).

All **20,275 original audit rows** remain exact at full datetime precision. Four task logins, including two normal renewals after expiry, two final logouts and one real preview export add **seven task events**. One separate login at **16:58:23.096 PHT** adds the eighth: **20,283 final audits**. Sessions **115→120** account for four task logins and that separate login, with normal last-seen/revocation/rate-limit activity. Only `audit_logs`, `auth_sessions` and `auth_rate_limits` differ. This is qualified authentication/export activity, not zero database writes. The exact separate audit and matching session were verified without a broad audit exception. [Intervening authentication](../../output/flow-2-primary-20261027/intervening-authentication.json).

Both final task sessions signed out by keyboard: **204**, then **401**. All four saved task tokens return 401; the separate user account/profile was not targeted or revoked by this task. Eight explicitly recorded recovery/copy/cohort schemas and recorded technical accounts are absent; regression helpers also complete owned-target cleanup. Temporary ports are quiet, native zoom reset, task browsers closed, and primary/retained/LAN listener owners unchanged. **76 paused LAN-R2A artifacts and 16 earlier ML-1 evidence files** remain exact. This is not an exhaustive retained/operational-database inventory. [Cleanup](../../output/flow-2-primary-20261027/cleanup-all.json), [task-token proof](../../output/flow-2-primary-20261027/task-session-proof.json), [delivery](../../output/flow-2-primary-20261027/delivery.json).

[Patch](../../output/flow-2-primary-20261027/FLOW_2_TEST_FIXTURE.patch) and [one-file source ZIP](../../output/flow-2-primary-20261027/candidate-source.zip) exclude credentials, keys and database records. Independent byte-exact patch application against the actual dirty baseline passed. These are test-review artifacts, not an operational release. [Artifact proof](../../output/flow-2-primary-20261027/artifacts.json). Any fixture rollback must preserve later legitimate edits; no database restoration, downgrade or history deletion is appropriate.

**Stopped after FLOW-2 testing, authorized fixture correction and reporting. No primary payroll, payment/correction, Masterlist, approval, academic/document record, cutoff or deadline changed. No LAN-R2A resumption or operational LAN modification occurred.**
