# PAY-NEW-4 — Individual Payments discovery and deferred scholars

27 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#individual-payments). Individual Payments now opens Not Yet on Payroll, with a compact Deferred filter and the existing Unclaimed Stipends, Omitted Scholars and Cheque Payments workspaces. The preserved PAY-003 deferral is discoverable; it is not individually payable. No primary business command was submitted.** LAN-R2A remains paused.

This preserves accepted PAY-TIME-4, PAY-UX-2, PAY-PERF-2, PAY-FLOW-1 and earlier work. Discovery is read-only and compatible with schema 67. No financial writer, migration, permission, policy or eligibility override was introduced.

## Fresh primary state and preservation

| Item | Verified starting → final state |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic / loopback 5173 / 3001 |
| Schema | **150 tables / 67 migrations**, all original values, SQL checksums and applied timestamps exact |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review**, unchanged |
| PAY-003 recorded roster / financial records | **834 stored roster additions / no allocation or payment**, unchanged |
| PAY-001 | Processed **v805 / 800 Paid / zero Pending**, unchanged |
| PAY-002 | Processed **v5 / 200 Pending**, unchanged |
| Official Batch 1 | Published **v415 / 835 active members / 167 retained removals**, unchanged |
| Existing allocations / entitlements | **1,000 / 1,000**, unchanged |
| Primary omissions / individual transactions | **0 / 0**, unchanged |

All **800 Paid records** remain exact: **two dated 2026-10-24 and 798 dated 2026-10-26**. The older two-Paid checkpoint was not substituted. Both roles' four payment summaries are byte-identical before/after. The complete comparison also preserves 1,835 scholars, 14 accounts, annual/academic/import/document/approval evidence, 2,002 Masterlist entries, 1,835 activations, frozen payrolls, reconciliation, original command ledgers, grants and schema objects. [Inspection](../../output/pay-new-4-primary-20261027/inspection.json), [final preservation](../../output/pay-new-4-primary-20261027/final-preservation.json), [payment comparisons](../../output/pay-new-4-primary-20261027/financial-after.json).

F57 remains `b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e`. The single immutable **synthetic-only** cutoff rule remains revision 1, valid 27–31 October, permitting 12:00, 15:00, 17:00 default, 19:00 and 23:59 Asia/Manila. Its hash remains `828cb0cc87fd2f90a492f9e0a893af4ac72e2305aff626381266c6107bcea49c`. PAY-001/PAY-002/PAY-003 retain whole-day cutoffs, respectively 21/23/27 October; the recorded final deadline remains 31 October / revision 3. No office-policy authority is inferred from synthetic activation.

A separate Coordinator login at **11:00:47.803 Philippine time** occurred after the starting snapshot. Its exact audit and normal session effects were preserved, not reset. All **20,257 original audit rows** remain exact. That one non-task authentication event and two task logins/two task logouts produce **20,262** total audits; sessions **104→107**, with ordinary session/rate-limit activity. Only these authentication tables differ. This is qualified authentication activity, not zero database writes or an assertion that every original session remained unrevoked. [Intervening comparison](../../output/pay-new-4-primary-20261027/intervening-preservation.json).

## Existing pathways and the actual deferred scholar

| Existing pathway | Required distinction retained |
|---|---|
| Unclaimed Stipends | Uses an existing allocation and recorded unclaimed/not-paid outcome. Being unassigned or deferred does not create such an outcome. |
| Omitted Scholars | Requires an applicable finalized numbered source, absence from its effective roster, current source-backed eligibility and no conflicting reservation/payment. Historical ownership, import/approval pins and omission-origin guards remain. |
| Preparation still open | The existing later eligible same-semester payroll route takes precedence. Discovery does not authorize an OR/DV shortcut. |
| Preparation closed | Existing request → Coordinator approval → authorized unpaid OR/DV preparation remains required. Approval, entitlement/reservation and actual payment remain separate decisions. |
| Cheque Payments | Retains its existing document and actual-release workflow; discovery creates no cheque, release or Paid outcome. |

The current scholar's original **PAY-003 deferral reason, identity and timestamp** match the saved record exactly in both roles' actual API responses. Requirements are Complete, but the response explicitly returns **`payable: false`**. PAY-003 is still Draft and is not a valid finalized omission source. Its direct assessment rejects with `OMISSION_SOURCE_INVALID`; an unrelated historical PAY-001 source also remains blocked. There is no current omission case or financial entitlement for this deferral. [Both-role source/API parity](../../output/pay-new-4-primary-20261027/api-oracles.json).

The correct present destination is **Review originating payroll**, with a separate Review scholar link. Any restoration, later preparation, finalization, supported omission or payment decision must use its authorized original workflow. The recorded deferral reason supplies no individual-payment authority. Names, permanent IDs and exact private record mappings are excluded from this report and masked in captures.

On an owned copy only, the original source was legitimately advanced through existing review/finalization after controlled fixture deferrals, freezing **808** members. Closing preparation then allowed the original omission request, Coordinator approval and **one unpaid OR + DV transaction** for a supported deferred member. **Zero new payments** resulted. This proves a conditional existing route; it does not convert the primary Draft deferral into an omission or authorize its future payment.

## Implemented discovery and read safeguards

The existing Individual Payments workspace now has four destinations: **Not Yet on Payroll**, Unclaimed Stipends, Omitted Scholars and Cheque Payments. An unresolved existing financial command retains its recovery view rather than being displaced by the new default.

One roster combines academic year/semester, name or permanent-ID search, server pagination and three filters:

- **Not yet assigned:** officially activated, currently Active scholars without a recorded roster assignment or same-semester stipend reservation. Current primary returns **one** scholar.
- **Deferred:** current recorded deferrals, optionally limited by originating payroll; current primary returns **one**. The row retains original payroll, reason/time in Philippine time, current requirements/review conditions and next action. A later changed standing does not hide its deferral history.
- **On payroll / reserved:** recorded assignments and financial reservations, including Paid explanations. Current primary returns **1,834**, paged 25 at a time. These people are absent from the normal unassigned roster.

The scope is explicitly **recorded assignment**. Dynamic Draft candidates are not frozen assignments; an unrecorded candidate can therefore remain discoverable while its current draft assessment is shown. Latest Restore/deferral evidence takes precedence over legacy rows. A Draft deferral can override a retained draft entry, but cannot override a frozen roster, entitlement, allocation or payment reservation. Same-scholar/permanent-identity semester relationships are considered across annual records. Complete requirements never produce payment permission.

New GETs are `/api/v1/individual-payments/discovery/context`, `/discovery`, and `/omissions/assessment`. They reuse existing **`ovr.process`**, Individual Payments activation checks, consistent read-only snapshots and post-read authorization. Unauthenticated and technical/unassigned business-role access remain denied. The omission assessment calls the **unchanged existing assessor**, returning source blockers/preparation state and `paymentAuthorized: false`; its modal creates nothing. A supported result links to the original Omitted Scholars form with exact source and scholar search, where every command revalidates independently.

Count/page selection uses set-based recorded assignment/reservation reads. Only displayed unassigned/deferred identities enter existing candidate/cohort/eligibility assessment; there is no per-scholar HTTP call or full-cohort eligibility download. Request-local source reuse does not persist mutable financial eligibility across requests.

| Read boundary | Contract |
|---|---|
| Page | Default **25**, maximum **100**; bounded offset **100,000** |
| Search | Maximum **160 characters** |
| Decoded source query | Maximum **5,000 rows / 32 MiB**; excess fails explicitly |
| Period context | Maximum **100 years / 200 semesters** |
| Relevant payroll context / page deferrals | Maximum **200 / 200**, explicit rejection rather than silent truncation |

Loading uses existing inline spinner/skeleton patterns. Failed results are unconfirmed, not zero, with real read Retry. Search remains editable during a read; no blocking command dialog or timeout increase was added. The read-only omission modal supports Escape, focus restoration and source-error Retry. All financial actions remain in original guarded workflows.

## Recovery, staged acceptance and installation

The actual dirty workspace supplied isolated staging at `C:/xampp/htdocs/ldss_paynew4_primary_stage_20261027`, with saved starting inputs at `C:/xampp/htdocs/ldss_paynew4_baseline_20261027`. Private configuration was not substituted into the candidate. A fresh inventory protects **1,377 existing inputs**; Git HEAD and old builds were not used as the current source.

| BACKUP-1 checkpoint | SQL / encrypted bytes | Complete isolated restoration |
|---|---:|---|
| Before source work/fixture mutations | **99,316,058 / 22,624,463** | Passed |
| Before promotion, primary ports quiet | **99,317,438 / 22,624,696** | Passed |

Archive hashes are respectively `47ab749fbb65aced3d456e7e59b643f07da8cbed3d35df93d6b68109da42bc2f` and `ef828883c1e352ee4dc79f380ebb42900baf52fb8d841a221a62a4c767229e07`. Both verified all 150 tables' complete values/counts/checksums, journal, schema, indexes, foreign keys/checks, triggers, executable views and rejection probes. Owned restore accounts/schemas were removed; nothing was restored over primary. Existing finite backup bounds, source READ-lock semantics and private archive/key custody remain. [Initial recovery](../../output/pay-new-4-primary-20261027/recovery.json), [quiet recovery](../../output/pay-new-4-primary-20261027/activation-recovery.json).

After staging checks, fresh source/data comparison and two zero-write-quiescence observations, only the verified primary controller tree was stopped. Matching sources were installed atomically per file while 3001/5173 were quiet, then the unchanged `node scripts/localhost-5173-profile.mjs synthetic` launcher restarted. Controller/API/Vite changed **44080/24684/55872 → 50656/56392/59480**. Both readiness probes return 200. Retained/LAN listener owners remain exact; no root distribution was replaced. [Maintenance](../../output/pay-new-4-primary-20261027/maintenance.json), [installed hashes](../../output/pay-new-4-primary-20261027/promoted-files.json), [delivery](../../output/pay-new-4-primary-20261027/delivery.json).

## Exact package and verification

**11 package files: six existing changes and five additions.**

| Files | Scope |
|---|---|
| `server/app.ts` | Register discovery GETs under existing authority/activation checks |
| `server/payments/omission-service.ts`, `omission-routes.ts` | Add read-only candidate assessment using the original assessor |
| New `server/payments/discovery-model.ts`, `discovery-service.ts` | Validated bounded read contracts, recorded-scope paging and current source projection |
| `src/IndividualPayments.tsx` | Lazy discovery/default navigation; preserve pending-command recovery and existing workspaces |
| `src/OmittedScholars.tsx` | Initialize original source and search from discovery navigation |
| New `src/IndividualPaymentDiscovery.tsx` | Single roster, filters, loading/retry and read-only route modal |
| `src/styles.css` | Append scoped compact/mobile controls after exact accepted prefix |
| New `tests/individual-discovery.test.tsx`, `scripts/test-individual-discovery-db.ts` | Focused contracts/UI and guarded owned-copy acceptance |

**1,371 of 1,377 starting inputs remain exact**, with none missing. Original omission assessor/financial writer bodies, UnclaimedPayments function, omitted command handlers and existing tests remain byte-identical. All **310 retained distribution files** remain exact. Compiled server files change 285→287: three existing read/wiring files differ, two are added and the other **282** match. No migration, permission, dependency, font, flag, launcher, private configuration, financial builder or existing source-validation rule changed. [Hash inventory](../../output/pay-new-4-primary-20261027/candidate-files.json), [source/writer boundary](../../output/pay-new-4-primary-20261027/source-boundary.json), [compiled comparison](../../output/pay-new-4-primary-20261027/build-verification.json).

| Final check | Result |
|---|---|
| Lint, typecheck, build, secrets | All exit **0** on matching isolated staging |
| Unit tests, one worker | **136 files / 936 tests passed** |
| New owned integration | **Five groups passed**, exit **0** |
| Existing disposable regressions | **Seven groups exit 0**: Masterlist workflow; Registry/main payroll/Treasury; historical/omitted; Recording; reconciliation; individual settlement; financial reports |
| Primary | Both-role API parity, five widths, native zoom, keyboard, payment summaries and complete preservation passed |

Owned tests cover current deferral identity/history, unsupported Draft and unrelated historical sources, unassigned/allocated/Paid distinctions, role/auth denials, search/empty/invalid bounds, 25+3 pagination, legacy/modern Restore precedence and changed-source review. The controlled finalized-source route retains Coordinator approval denial for Staff and all duplicate-stipend/reservation guards. Exactly two expected workflow notifications were appended during fixture review/finalization, with all original notification rows and all 800 original payments exact. Financial suites retain their existing source pins, retry/rollback, reconciliation and output assertions. All mutation tests used disposable synthetic copies; none used primary or LAN. [Checks](../../output/pay-new-4-primary-20261027/checks-main.json), [unit log](../../output/pay-new-4-primary-20261027/unit-final.log), [five groups](../../output/pay-new-4-primary-20261027/integration.json), [driver exit](../../output/pay-new-4-primary-20261027/integration-exit.json), [seven regressions](../../output/pay-new-4-primary-20261027/regressions-masterlist-workflow-registry-historical-recording-reconciliation-individual-settlement-financial-reports-latest.json).

## Performance and interface evidence

Owned API observations use one warm-up and three complete Fastify-injection samples, including authentication's ordinary one session touch. SQL duration is aggregate instrumented elapsed time, not CPU time.

| Read | API milliseconds, three samples | SELECTs / response bytes |
|---|---|---|
| Original empty Unclaimed queue | **16.59 / 14.93 / 16.46** | **14 / 44** |
| Retained Unclaimed queue after change | **16.67 / 14.62 / 14.31** | **14 / 44**, exact original response |
| Original PAY-003 reprocessing/history, one deferral plus stored roster | **95.18 / 142.95 / 96.83** | **36 / 3,240,474** |
| New unassigned, one assessed row | **547.79 / 488.79 / 504.56** | **125 / 1,449** |
| New deferred, one assessed row | **289.31 / 437.97 / 319.14** | **125 / 1,447** |
| Reserved, 25 displayed rows | **318.39 / 260.03 / 244.22** | **38 / 15,295** |
| Owned unassigned positive fixture, 25 assessed rows | **921.96 / 916.73 / 954.47** | **126 / 16,106** |

The history-only route and fresh discovery do different work; **no API speedup is claimed against history**. First unassigned SQL time is 480.54 ms, decoding 2,071 rows / 3,518,409 bytes, including shared authoritative publication evidence. The positive 25-row page decodes 3,543 rows / 4,366,043 bytes, with SQL 708.26–747.84 ms. Query count remains nearly constant from one to 25 assessed rows; the browser receives only the displayed page. [All observations](../../output/pay-new-4-primary-20261027/performance.json), [positive-page measurements](../../output/pay-new-4-primary-20261027/performance-page25.json).

Actual-primary cache-disabled document reloads use one warm-up plus three samples: original Unclaimed **1173/626/658 ms**, retained Unclaimed **641/574/642 ms**, both nine successful GETs / 4,862 bytes; new default discovery **1174/1693/1760 ms**, nine successful GETs / 6,940 bytes. The old empty default and new assessed default are different workloads. An initial post-restart navigation timed out; subsequent accepted reloads passed. No trace establishes its cause. [Before](../../output/pay-new-4-primary-20261027/browser-results/timing-before-unclaimed.json), [retained view](../../output/pay-new-4-primary-20261027/browser-results/timing-after-unclaimed.json), [new default](../../output/pay-new-4-primary-20261027/browser-results/timing-after-discovery.json).

Client assets change **1,538,338→1,553,032 bytes**, **+14,694**: JavaScript +12,637, CSS +2,057; CSS gzip **52,568→52,921**. Fonts/dependencies remain exact. These samples establish neither maximum load nor office concurrency/cold-start capacity. [Bundle inventory](../../output/pay-new-4-primary-20261027/bundle-impact.json).

Matched primary screenshots use the same data, roles, default zoom and 900-pixel height. Before shows the old empty Unclaimed default; after shows the new discovery default. Scholar identity, account name and free-text deferral reasons are masked without resizing.

| CSS width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-new-4-primary/before-coordinator-1440.png) / [After](../../output/playwright/pay-new-4-primary/primary-coordinator-1440.png) | [Before](../../output/playwright/pay-new-4-primary/before-staff-1440.png) / [After](../../output/playwright/pay-new-4-primary/primary-staff-1440.png) |
| 1024 | [Before](../../output/playwright/pay-new-4-primary/before-coordinator-1024.png) / [After](../../output/playwright/pay-new-4-primary/primary-coordinator-1024.png) | [Before](../../output/playwright/pay-new-4-primary/before-staff-1024.png) / [After](../../output/playwright/pay-new-4-primary/primary-staff-1024.png) |
| 820 | [Before](../../output/playwright/pay-new-4-primary/before-coordinator-820.png) / [After](../../output/playwright/pay-new-4-primary/primary-coordinator-820.png) | [Before](../../output/playwright/pay-new-4-primary/before-staff-820.png) / [After](../../output/playwright/pay-new-4-primary/primary-staff-820.png) |
| 375 | [Before](../../output/playwright/pay-new-4-primary/before-coordinator-375.png) / [After](../../output/playwright/pay-new-4-primary/primary-coordinator-375.png) | [Before](../../output/playwright/pay-new-4-primary/before-staff-375.png) / [After](../../output/playwright/pay-new-4-primary/primary-staff-375.png) |
| 320 | [Before](../../output/playwright/pay-new-4-primary/before-coordinator-320.png) / [After](../../output/playwright/pay-new-4-primary/primary-coordinator-320.png) | [Before](../../output/playwright/pay-new-4-primary/before-staff-320.png) / [After](../../output/playwright/pay-new-4-primary/primary-staff-320.png) |

Both roles passed all widths without page-level overflow, with compact mobile controls, visible next actions, correct links, search and reserved pagination. No per-scholar HTTP request or primary business-command attempt occurred. Delayed/aborted reads on an owned copy showed nonblocking skeletons, unconfirmed errors and keyboard Retry; real logout/reload produced the genuine 401 sign-in state. [Coordinator](../../output/pay-new-4-primary-20261027/browser-results/browser-primary-coordinator.json), [Staff](../../output/pay-new-4-primary-20261027/browser-results/browser-primary-staff.json), [read/auth states](../../output/pay-new-4-primary-20261027/browser-results/browser-read-states.json).

Native Chrome **200%**, viewport emulation disabled, passed both roles at **712×424 CSS pixels / DPR 2**. Wrapped actions retain at least 44-pixel targets and 3-pixel keyboard outlines; local table scrolling remains available. Native captures use the direct rendered viewport: [Coordinator](../../output/playwright/pay-new-4-primary/native-primary-coordinator.png), [Staff](../../output/playwright/pay-new-4-primary/native-primary-staff.png). Zoom returned to 100%. The owned supported-source modal passed desktop/mobile, Escape/focus return and exact handoff to the original Omitted Scholars search: [desktop](../../output/playwright/pay-new-4-primary/owned-omission-modal-1440.png), [mobile](../../output/playwright/pay-new-4-primary/owned-omission-modal-320.png), [acceptance](../../output/pay-new-4-primary-20261027/browser-results/browser-omission.json). The installed ui-ux-pro-max and Playwright workflows were used, including reduced-motion checks; full assistive-technology/WCAG certification is not claimed.

## Limitations, cleanup and stop

Source-query/context bounds are rejection limits, not maximum-capacity certification. The existing Omitted Scholars source selector retains its original 100-source limit; the new discovery context has an explicit 200-payroll bound. Long period options can visually elide in compact controls, while full period text remains available in options/results. Local table scrolling remains at zoom. No timeouts, financial validation or historical evidence were weakened.

Staging caught SELECT-only snapshot rejection of a CTE; the query was rewritten as derived SELECTs without weakening the adapter. Helpers were corrected for actual decimal types, expected workflow notifications, asynchronous rendering and clean Node exit collection. Early screenshot masks and the inherited native-output directory were corrected; accepted captures are masked and stored in this task's folder. Initial logs are retained. These corrections required no primary data repair.

Both task sessions signed out by keyboard with **204**, followed by **401**; their saved cookies also return 401. Task browsers closed, zoom reset, temporary 3026/3027/3028 ports are quiet, and owned fixture/recovery schemas/accounts are removed. User authentication activity was preserved. All **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. Listener preservation is not a new exhaustive inventory of every retained database. [Delivery/revocation/cleanup](../../output/pay-new-4-primary-20261027/delivery.json).

No new write-contract, schema or permission approval is needed for this installed discovery package. A future primary correction still requires the authorized actual payroll/omission workflow, genuine supporting evidence and separate financial decisions. Deferral, complete requirements, successful publication and this technical acceptance grant no payment authority. Existing Q28–Q31 and source/forms/office-policy gates remain; receipt-time uncertainty and the synthetic cutoff rule's limited validity are unchanged.

LAN-R2A can consider matching read API/UI only through separately authorized complete packaging, pilot-boundary review, actual-target recovery and office acceptance. No operational LAN service, database, configuration or policy changed. Rollback must preserve legitimate later source/data and coordinate the matching API/UI; no database restore, downgrade or history deletion is appropriate for this discovery change.

**Stopped after PAY-NEW-4 installation, verification and reporting. PAY-003 and its original deferral, all 800 Paid records/dates, financial histories and cutoff evidence remain unchanged. No primary request, DV, entitlement, allocation, payroll or payment was created; no LAN-R2A resumption occurred.**
