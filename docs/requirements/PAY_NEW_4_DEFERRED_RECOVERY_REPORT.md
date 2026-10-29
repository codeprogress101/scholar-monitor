# PAY-NEW-4 — Individual Payments and deferred scholar recovery

27 October 2026, Philippine time. **Implemented and verified on primary synthetic [localhost:5173](http://127.0.0.1:5173/#individual-payments). Deferred scholars now have a compact review of Restore to Original Payroll, Review for Another Payroll and Review Individual Payment. These use existing guarded workflows; unavailable paths explain their restriction. PAY-003 remains Draft v4 / 834 included / one deferred. All 800 Paid records and dates remain exact. No primary business command was submitted.** LAN-R2A remains paused.

This extends the [completed discovery delivery](PAY_NEW_4_UNASSIGNED_DEFERRED_SCHOLARS_REPORT.md), preserving PAY-TIME-4 and earlier accepted work. The prior report remains a historical checkpoint. No migration, permission, financial-policy change or new business-write route was introduced.

## Current primary and recovery checkpoints

| Item | Fresh starting → final observation |
|---|---|
| Host / MariaDB | DESKTOP-BPLJKRP / 127.0.0.1:3306 |
| Database / restricted runtime | `ldss_primary_test_12676_61497616` / `ldss_primary_12676_61497616@localhost` |
| Application | Existing synthetic / loopback 5173 / 3001 |
| Schema | **150 tables / 67 accepted migrations**, original checksums and applied timestamps exact |
| PAY-003 | `7f337596-c36d-41d7-b715-368fd4633b1d`, **Draft v4 / 834 included / one deferred / 1,000 blocked / zero awaiting review** |
| PAY-003 stored roster / allocation / payment | **834 / 0 / 0**, unchanged |
| PAY-001 / PAY-002 | Processed **v805 / 800 Paid**, and processed **v5 / 200 Pending**, unchanged |
| Official Batch 1 | Published **v415 / 835 active members / 167 retained removals**, unchanged |
| Primary omissions / individual transactions | **0 / 0**, unchanged |
| Existing entitlements / allocations | **1,000 / 1,000**, unchanged |
| Controller / API / Vite | **50656 / 56392 / 59480 → 55820 / 60856 / 60368** |

The actual baseline includes **800 Paid records: two dated 2026-10-24 and 798 dated 2026-10-26**. All remain exact. The original deferral's identity, reason, timestamp and command history are preserved. Both roles' actual APIs reproduce that deferral and still return `payable: false`, despite Complete requirements. Scholar names, permanent IDs and private financial evidence are excluded from this report and masked in captures. [Inspection](../../output/pay-new-4-recovery-primary-20261027/inspection.json), [API parity](../../output/pay-new-4-recovery-primary-20261027/api-oracles.json), [payment comparisons](../../output/pay-new-4-recovery-primary-20261027/financial-after.json).

F57 remains `b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e`. The immutable synthetic rule remains revision 1, valid **27–31 October**, with **12:00 / 15:00 / 17:00 default / 19:00 / 23:59 Asia/Manila**, hash `828cb0cc87fd2f90a492f9e0a893af4ac72e2305aff626381266c6107bcea49c`. PAY-001/PAY-002/PAY-003 retain their original **21/23/27 October whole-day cutoffs**. The recorded final deadline remains **31 October / revision 3**. No new office-policy authority is inferred.

Isolated staging at `C:/xampp/htdocs/ldss_paynew4_recovery_stage_20261027` used the actual dirty workspace. Saved starting inputs are at `C:/xampp/htdocs/ldss_paynew4_recovery_baseline_20261027`. Git HEAD, old data and private configuration were not substituted. **1,383 existing inputs** were inventoried.

| BACKUP-1 checkpoint | SQL / encrypted bytes | Complete isolated recovery |
|---|---:|---|
| Before source changes and mutation tests | **99,318,470 / 22,625,450** | Passed |
| Before promotion, primary ports quiet | **99,319,388 / 22,625,644** | Passed |

Archive hashes are respectively `0a235f3b84d1809980a728c8cc5acaf20602c2a117c795fa4764e9a37662cb88` and `372fef1cc6bd9a2a7b2a5e35a775bfbdb8d8826a68e945cebfc4a7feed743a4b`. Both restored all 150 tables' complete values/counts/checksums, journal, schema, indexes, foreign keys/checks, triggers, executable views and rejection probes. Owned restore targets/accounts were removed. Nothing was restored over primary. Existing finite backup limits, source READ-lock semantics and private key/archive custody remain unchanged. The snapshots include intervening task authentication and are not asserted identical. [Preflight](../../output/pay-new-4-recovery-primary-20261027/preflight.json), [initial recovery](../../output/pay-new-4-recovery-primary-20261027/recovery.json), [quiet recovery](../../output/pay-new-4-recovery-primary-20261027/activation-recovery.json).

## Existing workflow contracts and recovery findings

| Option | Existing contract and installed presentation |
|---|---|
| **Restore to Original Payroll** | Coordinator **`ovr.finalize`**, editable unfrozen Draft, available cycle, open preparation and claim period. The review links to the original payroll, selects Changes & deferrals, opens its existing section and focuses the exact Restore control. Confirmation uses its original endpoint. |
| **Original payroll in Review** | Coordinator must use existing **Return Payroll to Draft** first. The review explains this and links to that payroll; no automatic transition or subsequent restoration occurs. Staff receives the Coordinator explanation and a read-only original-payroll link. |
| **Finalized / Submitted / Processed / frozen** | No direct restoration is offered. Original financial and source-review navigation remains; frozen rosters are not edited. Direct protected-state commands were denied on owned fixtures. |
| **Review for Another Payroll** | On explicit review, inspect at most ten later ordinary Drafts in the same cycle. Their displayed condition comes from the existing **`managedCandidates(..., [annualId])`** assessment, including timing, sources, reservations and destination deferral. Links review the destination; they transfer nothing. |
| **Review Individual Payment** | Requires an actual finalized numbered source and the original omission assessment. Original/effective roster absence, source ownership, current eligibility, prior history, holds/reservations, claim period, preparation state and approval remain authoritative. A Draft/Review deferral alone supplies none of this authority. |

The actual primary has **no later ordinary Draft**. Its original PAY-003 remains Draft, so **Individual Payment is unavailable** for the deferred scholar. The UI states the finalized-source requirement without displaying a disabled payment button. An authorized Coordinator can now reach the supported original Draft restoration form; this task only opened and cancelled it.

The restoration endpoint remains **`POST /api/v1/ovr-batches/:id/restore`**. The backend and all financial writers are byte-identical. It reauthorizes, checks the existing actor/key ledger, current state/version, preparation/claim availability and current deferral, then appends the restoration, batch event, audit and durable result atomically. Exact committed retry returns its original result. Restoration does not finalize, allocate or pay.

The existing generic restore contract removes a deferral; it does **not** promise that the scholar passes every eligibility condition. It reloads current managed sources, but does not compare the supplied source hash for `restore` as it does for review/finalization/deferral. Current assessment determines inclusion afterward, and review/finalization retain their independent source checks. No new conditional-restoration write contract is claimed. On an owned copy, restoration produced **835 dynamically included / zero deferred** while the restored person remained unrecorded in the stored roster until another review submission. Discovery correctly distinguishes these facts.

Unclaimed Stipends still requires its existing allocation and unclaimed/not-paid outcome; unassigned is not unclaimed. Existing omission preparation remains **later eligible payroll first while preparation is open**, or **request → Coordinator approval → unpaid OR/DV preparation** after preparation closes. Cheque processing and actual release retain their original controls. No deferral is automatically converted into a case, entitlement, DV or payment.

A fictional later PAY-004 demonstrated a genuine restriction: its existing candidate reader reported **“Existing finalized payroll/payment history reserves this semester”**, with the normal ineligible summary. The explicit existing omission-transfer command also rejected with `OMISSION_DESTINATION_BLOCKED`; it did not bypass the guard. This is a tested negative case, not proof that every deferred scholar has the same restriction. The actual primary has no such destination. [Later-source parity/rejection](../../output/pay-new-4-recovery-primary-20261027/followup.json).

The existing `add-to-payroll` omission contract remains available when its own prerequisites pass; there is no general direct-reassignment command in this delivery. Forcing a source-blocked transfer would require separate investigation of the actual binding/reservation evidence and a separately authorized source/write-contract proposal if a change is justified. **That override portion is stopped; no guard was weakened.** No migration or permission expansion has been established as necessary for the installed discovery/navigation work.

## Discovery, loading and command recovery

The four existing workspaces remain **Not Yet on Payroll, Unclaimed Stipends, Omitted Scholars and Cheque Payments**. Within discovery, **All / Deferred / Needs Review** share one paginated roster; the retained **On payroll / reserved** filter explains exclusions. Current primary returns **one unassigned, one deferred and 1,834 recorded assignments/reservations**. All and Deferred overlap intentionally. Requirements Complete never means individually payable.

Normal discovery still selects/counts recorded scope before assessing only its displayed page. It does not assess or download 1,835 browser records. Page size remains **25**, maximum **100**; search **160 characters**, offset **100,000**. Latest modern/legacy Restore precedence, official Active participation, permanent-identity semester relationships and existing reservations remain intact.

**Needs Review** is opt-in. It assesses at most **100 matching unassigned identities**, applies the existing current review conditions, then paginates the exact filtered result. A broader match rejects and requires narrower search; it neither truncates nor filters only the visible page. This is a bounded review feature, not an unrestricted global eligibility search. The 100-match rejection and narrowed-search result were tested on an owned copy. [Boundary acceptance](../../output/pay-new-4-recovery-primary-20261027/review-boundary.json).

The single new endpoint is read-only **GET `/api/v1/individual-payments/discovery/recovery`**, with exact source-payroll and annual IDs. It uses existing `ovr.process`, Individual Payments activation, a consistent read-only snapshot and post-read authorization. It rechecks that the selected deferral is current. Latest source state/version are projected without downloading all source roster-history snapshots. Destination assessment reuses original business readers. Existing decoded-query limits **5,000 rows / 32 MiB**, period/payroll bounds and explicit failures remain; more than ten later Drafts rejects without omission.

Read loading remains inline, cancellable and retryable. The restoration form is a focused native modal using the existing **`usePriorCommand`** hook and its **300-second bounded command/recovery convention**. Its button shows Restoring; uncertain outcomes retain the exact body/key/version, block edits/dismissal/conflicting navigation and offer **Retry Exact Restoration**. No new command-state backend or global timeout change exists. The original generic reprocessing form's other actions remain unchanged.

## Exact files and automated acceptance

**12 package files: eight existing changes and four additions.**

| File | Change |
|---|---|
| `server/app.ts` | Register the new GET under existing authority/activation |
| `server/payments/discovery-model.ts`, `discovery-service.ts` | Add explicit bounded Needs Review; share the existing decoded-read guard |
| New `server/payments/deferred-recovery.ts` | Read-only source state, role/period advice and existing destination assessments |
| `src/IndividualPaymentDiscovery.tsx` | Filter and recovery-dialog handoff; retain original source-assessment navigation |
| New `src/DeferredRecoveryDialog.tsx` | Three compact recovery choices, restrictions and existing-workflow links |
| `src/PayrollReprocessing.tsx` | Focused restoration form, exact retry and busy-state propagation using the existing writer |
| `src/OvrDrafts.tsx`, `src/payroll-navigation.ts` | Preserve recovery context, select Changes & deferrals and expose the original control |
| `src/styles.css` | Append scoped dialog sizing/focus rules after the exact accepted prefix |
| New `tests/deferred-recovery.test.tsx`, `scripts/test-deferred-recovery-db.ts` | Read/navigation boundaries and guarded owned-copy recovery acceptance |

**1,375 of 1,383 starting inputs remain exact**, none missing. Original restoration/deferral, eligibility, managed-payroll, omission, payment and document writers, command-recovery hook, permissions, SQL migrations, configuration, dependencies, fonts, flags and launcher remain exact. The entire original IndividualPayments/Unclaimed and Omitted Scholars implementations remain exact. All **310 retained distribution files** are preserved. Compiled server JavaScript changes **287→288**: three existing read/wiring files differ, one is added and the other **284** match. [12-file hashes](../../output/pay-new-4-recovery-primary-20261027/candidate-files.json), [source boundary](../../output/pay-new-4-recovery-primary-20261027/source-boundary.json), [compiled proof](../../output/pay-new-4-recovery-primary-20261027/build-verification.json).

| Validation | Result |
|---|---|
| Lint, typecheck, build, secrets | Final matching staged commands exit **0** |
| Unit tests, one worker | **137 files / 945 tests passed** |
| Owned recovery integration | **Six groups passed**, final driver exit **0** |
| Additional owned cases | Needs Review bound/narrowing; later-source parity/rejection; finalized/processed restoration denials; lost-response browser and preservation passed |
| Existing integrations | **Seven groups exit 0**: Masterlist workflow, Registry/main payroll/Treasury, historical/omitted, Recording, reconciliation, individual settlement, financial reports |

The owned recovery run covers authorized restoration, Staff denials, Review return requirement, late-audit failure with rollback, exact retry/changed-key-input rejection, source changes, search/empty/pagination, latest Restore precedence and the original finalized-source OR/DV path. It finalized **808** fictional members after controlled deferrals, then exercised existing closed-preparation request/Coordinator approval and **one unpaid OR/DV transaction**, with **zero new payments**. Exactly four expected workflow notifications were asserted, with original notification/payment rows preserved. All mutating and fault probes ran only on disposable synthetic copies. [Commands](../../output/pay-new-4-recovery-primary-20261027/checks-main.json), [unit log](../../output/pay-new-4-recovery-primary-20261027/unit-final.log), [six groups](../../output/pay-new-4-recovery-primary-20261027/integration.json), [driver exit](../../output/pay-new-4-recovery-primary-20261027/integration-exit.json), [protected states](../../output/pay-new-4-recovery-primary-20261027/protected-states.json), [seven regressions](../../output/pay-new-4-recovery-primary-20261027/regressions-masterlist-workflow-registry-historical-recording-reconciliation-individual-settlement-financial-reports-latest.json).

The browser deliberately lost the first **successful committed restoration response** on an owned copy. Two identical body/key requests produced **one command, one restoration and one revision increment (4→5)**. Escape, edits, double-click and conflicting navigation were blocked while uncertain; exact retry confirmed the stored result. All other business tables/schema and all 800 payments remained exact. A later fixture-only deferral through the original command supplied final read-only UI acceptance; no primary attempt was repeated. [Lost response](../../output/pay-new-4-recovery-primary-20261027/browser-results/browser-lost-restore.json), [owned preservation](../../output/pay-new-4-recovery-primary-20261027/browser-restore-preservation.json).

## Performance and UI evidence

Owned measurements use one warm-up and three full Fastify-injection samples. Original versus revised Unclaimed, All, Deferred and Reserved responses are **byte-identical**. Each GET includes the ordinary authentication session touch; it is not a zero-SQL-write measurement.

| API read | Before milliseconds | After milliseconds | SELECTs / response bytes after |
|---|---|---|---|
| Unclaimed | 17.55 / 17.92 / 16.52 | 15.10 / 14.20 / 14.95 | **14 / 44** |
| All, one unassigned row | 417.61 / 442.24 / 382.17 | 434.70 / 426.87 / 434.82 | **125 / 1,449** |
| Deferred, one row | 376.99 / 370.35 / 387.07 | 283.62 / 378.56 / 335.42 | **125 / 1,447** |
| Reserved, 25 rows | 283.68 / 230.19 / 214.27 | 271.77 / 224.90 / 205.11 | **38 / 15,295** |
| New Needs Review, one row | Not present | 626.42 / 515.27 / 540.12 | **125 / 1,445** |
| New recovery advice | Not present | 12.45 / 9.16 / 12.61 | **22 / 768** |

All's aggregate instrumented SQL time is **374.34/366.99/376.84 ms**, decoding **2,071 rows / 3,518,409 bytes**, including unchanged shared authoritative evidence. Recovery advice uses **9.19/6.53/9.87 ms SQL**, **141 decoded rows / 15,902 bytes**. These are elapsed SQL observations, not CPU or worst-case memory bounds. No default-route speedup is claimed. [Full measurements and body hashes](../../output/pay-new-4-recovery-primary-20261027/performance.json), [summary](../../output/pay-new-4-recovery-primary-20261027/performance-summary.json).

Actual-primary cache-disabled document reloads, one warm-up plus three samples, measured **1713/1647/1655 ms before → 1701/1632/1139 ms after**. Each has **nine successful API GETs / 6,940 bytes**. Recovery advice is fetched only when explicitly opened; there are no per-scholar HTTP calls or new polling. Host contention varied; these samples do not certify cold-start, concurrency or a latency SLA. [Before](../../output/pay-new-4-recovery-primary-20261027/browser-results/timing-before.json), [after](../../output/pay-new-4-recovery-primary-20261027/browser-results/timing-after.json).

Client assets grow **1,553,032→1,561,059 bytes**, **+8,027**: JavaScript +7,439; CSS +588. CSS gzip **52,921→53,014**; fonts/dependencies remain unchanged. [Bundle inventory](../../output/pay-new-4-recovery-primary-20261027/bundle-impact.json).

Matched actual-primary captures use the same one-deferral state, roles, default zoom and 900-pixel height. Identity/account names and free-text reasons are masked without image resizing.

| CSS width | Coordinator before / after | Staff before / after |
|---|---|---|
| 1440 | [Before](../../output/playwright/pay-new-4-recovery-primary/before-coordinator-1440.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-1440.png) | [Before](../../output/playwright/pay-new-4-recovery-primary/before-staff-1440.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-staff-1440.png) |
| 1024 | [Before](../../output/playwright/pay-new-4-recovery-primary/before-coordinator-1024.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-1024.png) | [Before](../../output/playwright/pay-new-4-recovery-primary/before-staff-1024.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-staff-1024.png) |
| 820 | [Before](../../output/playwright/pay-new-4-recovery-primary/before-coordinator-820.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-820.png) | [Before](../../output/playwright/pay-new-4-recovery-primary/before-staff-820.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-staff-820.png) |
| 375 | [Before](../../output/playwright/pay-new-4-recovery-primary/before-coordinator-375.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-375.png) | [Before](../../output/playwright/pay-new-4-recovery-primary/before-staff-375.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-staff-375.png) |
| 320 | [Before](../../output/playwright/pay-new-4-recovery-primary/before-coordinator-320.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-320.png) | [Before](../../output/playwright/pay-new-4-recovery-primary/before-staff-320.png) / [After](../../output/playwright/pay-new-4-recovery-primary/primary-staff-320.png) |

Both roles passed filters, all four workspaces, empty search/recovery and Reserved page 2 of 74. Coordinator opened/cancelled the original restoration form; no primary command was attempted. Read faults on an owned copy proved inline skeletons, unconfirmed errors, keyboard Retry and genuine logout/401 sign-in behavior. [Coordinator](../../output/pay-new-4-recovery-primary-20261027/browser-results/primary-coordinator.json), [Staff](../../output/pay-new-4-recovery-primary-20261027/browser-results/primary-staff.json), [workspace acceptance](../../output/pay-new-4-recovery-primary-20261027/browser-results/workspaces-coordinator.json), [read/auth faults](../../output/pay-new-4-recovery-primary-20261027/browser-results/browser-read-states.json).

Native Chrome **200%**, viewport emulation disabled, passed at **712×424 CSS pixels / DPR 2**, with keyboard opening/cancellation, restored focus, **44-pixel** controls and **3-pixel** outlines. No page/dialog horizontal overflow was found; tables retain local scrolling. Captures use the direct rendered viewport. The installed ui-ux-pro-max and Playwright workflows were used, including reduced-motion checks. Full assistive-technology/WCAG certification is not claimed. [Desktop recovery](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-recovery-1440.png), [mobile recovery](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-recovery-320.png), [existing restoration form](../../output/playwright/pay-new-4-recovery-primary/primary-coordinator-restore-320.png), [native Coordinator](../../output/playwright/pay-new-4-recovery-primary/native-primary-coordinator.png), [native Staff](../../output/playwright/pay-new-4-recovery-primary/native-primary-staff.png).

## Installation, preservation, limits and stop

After acceptance, a fresh preservation check and two zero-write-quiescence observations passed. Only the verified primary controller tree was stopped. Twelve reviewed files were installed with 3001/5173 quiet, after another complete isolated recovery. The unchanged synthetic launcher restarted matching API/UI; both readiness probes return 200. Retained/LAN listener owners and all 310 old distribution files remain exact. [Maintenance](../../output/pay-new-4-recovery-primary-20261027/maintenance.json), [installed files](../../output/pay-new-4-recovery-primary-20261027/promoted-files.json), [startup](../../output/pay-new-4-recovery-primary-20261027/startup.json).

The final 150-table comparison preserves all original business values, schema/journal, accounts/password hashes/roles, grants and command ledgers. It covers 1,835 scholars, 14 accounts, annual/academic/import/document/prior-approval evidence, published Masterlists/activations, frozen payrolls, entitlements, allocations, reconciliation and every payment/date. **No later legitimate business activity was overwritten.** All **20,263 starting audit rows** remain exact. Three task logins, including one normal Staff-session renewal after 401, and two explicit task logouts produce **20,268** audits; sessions **108→111**, with ordinary session/rate-limit activity. The Coordinator session remained valid; no authentication policy was changed or installation-related cause inferred from the Staff 401.

Both final task sessions signed out by keyboard with **204**, then **401**; their saved cookies also return 401. Zoom returned to 100%, task browsers closed, temporary ports are quiet and owned fixture/recovery targets/accounts are removed. The user's separate account/profile was untouched. All **76 paused LAN-R2A artifacts and 16 earlier ML-1 investigation files** remain exact. [Final preservation](../../output/pay-new-4-recovery-primary-20261027/final-preservation.json), [delivery/revocation/cleanup](../../output/pay-new-4-recovery-primary-20261027/delivery.json).

Staging caught the hidden Changes & deferrals panel, duplicate Close control, inherited button sizing and native Chrome's requirement for a persistent test profile. Helpers were corrected for the dynamic-versus-recorded roster distinction, the newer fixture revision after return/restoration, expected notification additions and valid foreign-key-backed probe versions. The later-transfer test correctly retained its actual source rejection rather than forcing success. No integrity constraint, validator, permission or financial test pin was relaxed.

Remaining limits: Needs Review requires narrowing above 100 matches; destination advice is bounded to ten later Drafts. Advice is not a reserved eligibility result. The original restoration section still uses its existing larger reprocessing read when explicitly navigated to; that legacy response was not converted into a new paginated write-review contract. Full accessibility, maximum capacity, cold-start, office concurrency and operational acceptance remain unverified; the existing build chunk warning remains. New office financial/source decisions and existing Q28–Q31 gates are not supplied by technical acceptance.

LAN-R2A may consider matching API/UI only through a separately authorized complete release, pilot-boundary classification, target recovery and office acceptance. Schema 67 and existing grants suffice for this installed read/navigation package; no operational LAN change occurred. Rollback must preserve later legitimate edits/data and coordinate matching source; no database restore, downgrade or history deletion is appropriate.

**Stopped after implementation, primary verification and reporting. No primary deferral was restored or replayed, no transfer/request/OR-DV/payroll/payment was created, and no cutoff, policy or historical evidence changed. LAN-R2A remains paused.**
