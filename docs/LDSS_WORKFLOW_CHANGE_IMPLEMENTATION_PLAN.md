# LDSS Workflow Change Implementation Plan and Tracker

Created: 2026-10-05
Updated: 2026-10-09
Status: localhost payroll consistency and signatory configuration implemented; final unchanged-source UAT passed (48/48 suites). Operator sign-off and LAN rollout remain separate.

## Localhost payroll consistency and one claim enforcement - 9 October 2026

The current increment adds shared permanent-scholar/semester payment resolution, paid precedence, separate academic/payment/inclusion presentation, complete receiving links, matching candidate filters and configurable four-slot signatories. Paid records show their frozen academic approval rather than asking a settled graduate to reopen receiving. Verified false-Paid reversals require Coordinator approval and preserve original outcomes; pending corrections block competing release. The shared business lock now precedes actor locks and authorization snapshots, fixing the cross-actor payment/correction race.

Migration 45 seeds current signatories without rewriting historical payroll. Draft review hashes include signatory revisions; finalization freezes them, and legacy frozen forms use historical constants. Administrator configuration does not confer payroll approval authority. Only localhost development settings/migration tables changed after backup and verified disposable restore; no working scholar/payment/date changes, sample reset, LAN installation or VPN continuation.

Focused disposable tests and Staff/Coordinator/Administrator browser checks passed, including cross-batch correction-versus-payment exclusion, false-Paid rollback/retry, linked reprocessing, Registry agreement and signatory revisions. Microsoft Word rendered and visually verified the one-page and 41-scholar three-page exports. Final unchanged-source UAT passed: 48/48 suites, 356 tests across 65 test files, with source fingerprints verified. Operator sign-off remains pending. See [dated report and coverage limits](../output/payroll-consistency-20261009/REPORT.md). Earlier evidence below is retained; this section supersedes its current migration count and payment/correction presentation conclusions only.

## Unclaimed reprocessing and draft deferral - 9 October 2026

Implemented in source: explicit unpaid reasons; same-semester reprocessing with linked original frozen evidence; automatic inclusion in a sole suitable draft; Coordinator destination selection when ambiguous; persistent Coordinator-only defer/restore; inclusive Philippine-time semester deadline at assignment, review, approval and collection; protection against duplicate payments and conflicting corrections. Historical generic unpaid records require Coordinator classification. Deferral does not change academic eligibility. A saved draft membership is released when deferred so it cannot block a later batch.

HTML/Word forms retain their pagination and show the previous batch. Reports separate attempts from unique stipends and money actually paid. History links now follow changes to the selected payroll without requiring reload. Ordinary payments remain PHP 5,000. This is another attempt to collect the same semester stipend, not a supplemental entitlement; supplemental, representative and non-degree workflows remain restricted.

Final `npm run test:uat` passed 48/48 suites, 353 unit tests, lint/type/build/secret checks, 44 migration checks and isolated 110-table recovery. All 455 tracked source inputs remained stable. Disposable database tests cover repeated unclaimed attempts, deferral persistence, races, rollback, deadlines, holds, corrections and historical preservation. Scoped Staff/Coordinator browser checks passed for the principal workflow, reload, history links and HTML/Word download. Microsoft Word visual rendering stalled and remains unverified; HTML inspection and DOCX structure checks passed. Evidence and coverage limits: `output/playwright/reprocessing-20261009/REPORT.md`.

Migration `20261009010000_f36_unclaimed_reprocessing.sql` was installed in local development after an encrypted backup and successful isolated restore. Verification confirmed unchanged original payment fields and other existing business records; the five added tables were empty. The installed production copy was not upgraded. Earlier readiness and receiving-context reports do not certify this change. Calendar confirmation, Word visual inspection and operator acceptance remain required. No real payment, reset, LAN installation or installed backup-task change is included.

## Previous status - 9 October 2026 receiving-context delivery


This summary supersedes older status, next-step and gap assessments below. The dated entries, phase tables and earlier reports are retained as implementation history, not a cumulative list of current defects. A check mark means the stated scoped delivery occurred; it does not authorize production use.

| Area | Implemented source | Verification / remaining acceptance |
| --- | --- | --- |
| Payroll forms | Draft and frozen official HTML previews, editable Word downloads, sample logos, continuous numbering, maximum 20 students per page, page totals and final-page signatories | Prior browser/installed Word rendering evidence: the dated payroll entry below. Current gate results recorded in the receiving-context report below. Earlier claims that previews/form export are missing are superseded. |
| Regular payments | Fixed PHP 5,000 paid stipend; not-paid outcomes zero; corrections and reconciled closure retained | Automated payment regressions; operator acceptance on the actual office process remains pending. Earlier claims that fixed amounts are not enforced are superseded. |
| Year rollover | Authorized opening of the next working year creates Continuing annual records for eligible published Active scholars; closed/reconciled cycles required; graduates excluded; fresh academic/document/approval requirements retained | Existing disposable API/browser evidence in `output/rollover-20261008/REPORT.md`; regression gate and scoped browser checks repeated for this change. No working year advanced here. |
| Receiving links | Separate year, semester and payroll-cycle context; receiving owner/period resolved from loaded records and API choices; unavailable/ambiguous links require selection; historical years read-only; bookmarks and profile-tab context preserved | Current disposable browser and unit evidence in `output/playwright/context-20261009/REPORT.md`. No migration or historical rewrite. |
| Official academic amendments | Staff request, sole Coordinator approval and publication; publication opens the returned official version and refreshes academic details; new form stays closed until Request another change | Current disposable Staff/Coordinator browser evidence in the same report. Scholar filtering no longer instructs a new form to open. |
| Other recent fixes | Compact Home actions, provisional academic details, distinct reference choices, graduation label, live storage health, Windows backup pipe lock | Prior evidence: `output/playwright/smoke-20261008/REPORT.md` and `output/smoke-fixes-report.md`. Earlier smoke findings remain preserved; current gate validates the revised source. |
| Backup installation / recovery | Source supports encrypted archives and desktop Drive staging; revised Windows runner locking is in source | Handover records the earlier downloaded 105-table restore and installed operator setup. No fresh cloud recovery or installed-task upgrade is claimed here; separate off-computer key custody remains pending. |
| Prepared production copy | Earlier release prepared on loopback as documented in `OFFICE_LAN_HANDOVER.md` | This task does not update that installed copy or backup tasks. Do not infer that current source fixes are installed. LAN remains paused. |
| Operator acceptance | Not complete | Real pilot, official policy/calendar confirmation, second-computer access, key custody and restart/recovery checks remain separate. The October 8 readiness report does not certify these later source changes. |

### Office decision: regular payroll only

Confirmed 9 October 2026: ordinary payroll and existing payment corrections remain supported. Supplemental payments, representative collection and non-degree benefits remain restricted/deferred. Their unchecked historical tasks are not blockers to the selected regular-payroll scope, and do not imply approval, entitlement rules or permission to enable them. Reconsideration or other exception paths remain restricted wherever existing policy gates require it.

### Current verification

Final `npm run test:uat`: 47/47 suites, 350 unit tests, lint/type/build/secret checks, 43 migration checks and isolated 105-table recovery passed; all 450 source-input hashes remained stable. Scoped browser tests passed for receiving links, read-only history, reload/navigation and Staff request through Coordinator publication. The explicit-selection/reload defect found during testing was fixed and retested. The earlier run passed its suites but was superseded because source changed during it. Results, first-attempt evidence and coverage limits: `output/playwright/context-20261009/REPORT.md`. No real scholar was changed; fixtures own their synthetic databases/users. No deployment, reset or installed backup-task change is part of this work.

## Preserved implementation history

All sections below describe their own implementation date/checkpoint. Their former not-started, missing, not-enforced, installation-pending and next-step claims are superseded where the current summary or later dated delivery provides evidence. Historical checkboxes are deliberately retained, including broad phases whose operator acceptance or deferred policy scope was never completed.

## Google Drive for desktop simplification - 2026-10-08

- [x] Selected desktop sync mode no longer requires custom OAuth credentials or publishing a website. Existing API mode remains compatible.
- [x] Only completed encrypted archives are staged; private key/config/status paths are excluded. Retry reuses identical copies and repairs missing copies without deleting private originals.
- [x] Administrator labels distinguish copied-to-sync-folder from confirmed upload. Downloaded-file restore testing does not claim cloud provenance.
- [x] 339 unit tests and explicit-target 105-table recovery passed; lint/type/build/secret checks recorded in output/drive-desktop-check.log. This scoped change does not reuse the earlier full-gate certification.
- [ ] Install/sign in to Drive for desktop, confirm a local synced folder, configure the separate production backup target and activate scheduling. No cloud copy or live sync verified yet.
- Updated guide: docs/GOOGLE_DRIVE_BACKUPS.md. Previous API guide retained separately.

## Encrypted Google Drive backups - 2026-10-08

- [x] Explicit backup database and schema-scoped backup credentials; original development guard retained. Atomic encrypted archives remain outside web roots.
- [x] Local desktop OAuth with state/PKCE, limited drive.file scope, offline authorization and private folder. No secrets in source, browser or public status.
- [x] Persisted remote file IDs, resumable uploads, checksum confirmation, retryable failures, exclusive OS-owned runner lock and no automatic retention deletion.
- [x] Windows task installer: startup/missed-run recovery, four-hour backup interval and 30-minute retry tick. Installer prepared, not registered without private configuration.
- [x] Administrator-only read-only status separates Backup created, Upload confirmed and Restore verified, with pending/error/stale indications.
- [x] Disposable explicit-target recovery passed all 105 tables using source-schema-only backup grants. Unit/API/browser checks cover failure states and status visibility.
- [x] Final full acceptance gate: 47/47 suites, 337 unit tests and stable source hashes; new explicit-target backup/restore and original development recovery regressions passed.
- [ ] Actual dedicated office Google authorization and cloud download/restore rehearsal: external setup required.
- [ ] Production target configuration, scheduled-task activation and separate recovery-key copy: operator setup required.
- Guide: docs/GOOGLE_DRIVE_BACKUPS.md. Evidence: output/drive-backup/REPORT.md.


## Payroll layout and Word download - 2026-10-08

- [x] Shared maximum-20 pagination, continuous printed award numbering and per-page totals; stored awards and frozen snapshots preserved.
- [x] Original sample logos embedded, 13 x 8.5-inch landscape, repeated headings, final-page-only borderless signatories and period/batch/page footer.
- [x] Optional HTML/DOCX endpoint format, server-side Word generation, draft/official download links and format-aware export audit; existing access checks preserved.
- [x] 1/20/21/40/41 students, 50 long entries and 20-row draft rendered in installed Microsoft Word and Chromium. Matching page counts, intact rows and final-page signatories verified.
- [x] 327 unit tests, lint, type checks, secret scan and build passed. Disposable automatic and managed payroll regressions passed, including permissions, DOCX downloads, audit and immutable official evidence. Browser download passed. No new full acceptance-gate claim. Evidence: `output/payroll-layout/REPORT.md`.

## In-app notifications and pending actions - 2026-10-08

- [x] Transactional, append-only workflow events with captured responsible account and personal read state. Current permissions govern counts, lists and mutations.
- [x] Source-derived pending work includes earlier requests, returned work and later publication/closure stages. Reading an update never resolves a business task.
- [x] Global unread bell, Home pending list, filtered full list, exact record links, visible polling, action/visibility refresh, error backoff and explicit stale/error states.
- [x] Existing admission, academic/standing, masterlist/roster, document, permitted override, payroll/amendment/correction, import/export and technical-account event mapping documented in `docs/NOTIFICATIONS_EVENT_MAP.md`.
- [x] Disposable API and browser checks cover two-way decisions, separate Coordinator read states, retries/concurrency, rollback, pre-feature pending discovery, permission revocation, reload, responsive layout and network errors.
- [x] Final source check plus all 44 disposable database suites passed (45 runner steps), with 322 unit tests and stable source hashes. Local 250-scholar/5,000-event benchmark: 12 samples, 88.5-196.1 ms, mean 126.0 ms. Existing grants and selected working row counts unchanged. Evidence and limits: `output/notifications-20261008/REPORT.md`.
- [x] User-authorized local activation completed: migration 43, scoped access to two notification tables, unchanged original table contents immediately after migration, live runtime/API checks and full 46/46 acceptance gate. Existing pending work is visible; no historical completed-event replay. Evidence: `output/notifications-activation-20261008/REPORT.md`. No production deployment or go-live claim.

## Simple scholar import, registry sorting and eligibility - 2026-10-08

- [x] Exact eight-column workbook, arbitrary single sheet name, case/space-insensitive headings, numeric/familiar year levels, Old normalization, optional Course, legacy template compatibility and 200-row limit.
- [x] Working-year preview and confirmation fence; grouped school/course reference matching; blocking duplicate review; atomic confirmation and safe retries.
- [x] Immutable intake stores supplied academic details/classification, spreadsheet row, actor and source job. New scholars enter validation; Continuing scholars form one pending Coordinator-review roster.
- [x] Current-year server-side sorting before pagination; authoritative academic records override provisional details. Completion links prefill known school/year details. Filters and selection survive profile navigation.
- [x] Bounded read-only eligibility endpoint uses Payroll rules; current open-period selection, reasons/actions, separate payment/inclusion labels and no-open-period state.
- [x] Disposable database and browser checks cover import, incomplete academic persistence/completion, retries/rollback, reference resolution, year changes, sorting, permissions and Payroll agreement.
- [x] Full acceptance gate: 45/45 suites, 322 unit tests, 42 migration checksums, stable source hashes and 103-table backup/restore. Evidence: `output/import-registry-20261008/REPORT.md`.

Template: `docs/templates/scholar-import-template.xlsx`. No real scholars imported, sample data deleted, calendar advanced or production deployment performed.

## Automatic New-to-Continuing rollover - 2026-10-08

- [x] Migration 41 adds a same-scholar prior-annual source and enforces exactly one Continuing source. Applied locally after verified encrypted backup/restore; AY2026-2027 and runtime grants retained.
- [x] Year creation/advance and switching to an existing later year now create Continuing annual records atomically after both semesters close and reconcile. Previous records remain unchanged.
- [x] Corrected graduation, restricted/conflicting standing and unpublished membership prevent automatic renewal. Existing destination records are preserved and incompatible records flagged.
- [x] Calendar totals and scholar links persist after reload. Annual/profile labels recognize rollover; prior academic details are suggestions, with no automatic promotion or copied verification/payment.
- [x] Disposable API checks: New and Continuing rollover, rollback, concurrent advance, retries, prior-record preservation, existing-year conflicts, provenance constraints, next-year COR/COG receiving, masterlist candidate admission, and blocked payroll before new-year approval/compliance.
- [x] Final full acceptance gate: 45/45 suites, 320 unit tests, 41 migration checksums, build/type/lint/secret checks and encrypted 102-table backup/restore passed. Three-role browser checks, actual year opening, reload, links, receiving and academic suggestions passed. Evidence: `output/rollover-20261008/REPORT.md`.

Operation: after both semesters' payroll cycles are formally closed/reconciled, System Administrator adds the next academic year under Configuration > Academic years. Rollover runs in that save transaction. Staff/Coordinator review the summary, confirm current academic information against COR, prepare and publish the new official masterlist through existing permissions, and complete semester compliance. Closing the last payroll alone does not advance the year. No import, reset or deployment is included.

The earlier production-readiness report predates this change and does not certify it.

## Production readiness validation - 2026-10-08

- [x] Full acceptance gate passed: 45 suites / 320 unit tests, stable source/build hashes, 40 migrations, 102-table backup/restore, permissions, imports, concurrency, payroll, graduation and reporting.
- [x] Corrected two obsolete test expectations caused by the fixed PHP 5,000 rule; first-run failures retained. Added automatic-payroll suite to the complete acceptance gate.
- [x] Built-app Staff/Coordinator/System Administrator browser smoke and limited 50-scholar/5-concurrent-request benchmark passed. Production dependency audit reported no known vulnerabilities.
- [x] Existing grants unchanged. Working rows changed during concurrent operator activity; audit evidence identifies Michael Opiana's receiving, verification, draft creation, export and payment actions. No sample reset performed.
- [ ] Production deployment target, HTTPS/configuration, real reference data, reset scope, scheduled/off-machine recovery and real-data/operator acceptance remain unresolved. Automated PASS is not a go-live claim.
- Evidence and precise limits: `output/readiness-20261008/REPORT.md`, `final-gate/F36-report.json`, `validated-build.sha256`.

## Graduate count reconciliation - 2026-10-08

- [x] Root cause traced to Diego Castillo (LDSS-2026-00090): approved status correction at 2026-10-08 08:37:32 Asia/Manila changed Graduated to Active using GRADUATION. That invalid combination is now blocked by status validation. The prior graduate correction was recognized in profile/renewal/eligibility but omitted from the reporting projection.
- [x] Dashboard and scholar report now use the corrected graduation status for its matching annual record; older academic-year statuses are preserved. No status decisions, historical payments or stored records were overwritten.
- [x] Live verification: 50 annual records = 45 active + 5 graduated; dashboard and report counts/source hash agree. Full checks (320 tests) and isolated dashboard/report/payment regressions pass.
- Evidence: `output/graduate-count-investigation.json`, `output/graduate-count-verification.json`, `output/graduate-count-check.log`, `output/graduate-count-dashboard.log`.

## Fixed stipend and routine input simplification - 2026-10-08

- [x] Paid degree stipend is exactly PHP 5,000.00 in both payment recording and payment-correction validation. UI amount fields are read-only. Not-paid outcomes remain zero with an explanation. Existing historical amounts are preserved.
- [x] Routine payroll submission, processing and payment recording no longer require typed reason/reference. The server supplies an explicitly internal workflow reference, never an invented voucher or receipt. Actual supplied references remain unchanged.
- [x] Shared routine evidence controls use optional Note / Supporting reference labels across scholar, academic, qualification, masterlist, requirements, eligibility, configuration and payroll forms. Exception reasons and policy/authority evidence remain required where applicable.
- [x] Full checks: 319 tests, lint, type checks, build and secret scan passed. Isolated payment/correction integration tests passed with blank routine evidence and partial-amount rejection. Browser confirmed fixed amount and collapsed optional controls without recording payment.
- Evidence: `output/fixed-stipend-check.log`, `output/fixed-stipend-payments.log`, `output/payroll-graduation/fixed-stipend.png`.

## Automatic current payroll draft and preview - 2026-10-08

- [x] Older unnumbered draft batches now show a live, read-only projection of eligible scholars and a printable sample-layout payroll preview. Manual Add is hidden; eligibility remains derived from existing authoritative records.
- [x] Submission captures the automatic roster atomically with audit evidence. Source hashes protect submission and approval; changed evidence requires returning to Draft. Finalization preserves a separate frozen legacy form without inventing managed-period entitlements or payment records.
- [x] Existing assignments to other batches are excluded. Frozen historical payrolls and actual payments are untouched. Numbered submission-window payrolls retain their existing cutoff/compliance/allocation rules.
- [x] Draft refreshes on returning focus; browser reload shows the same current candidates. Empty finalization/payment panels are hidden.
- [x] Disposable-database tests cover automatic inclusion without Add, preview, rollback, stale approval, same-Coordinator approval, duplicate exclusion and immutable finalization. Browser check confirms Francis in TEST1-1, preview HTTP 200 and persistence after reload. Evidence: `output/automatic-payroll-db.log`, `output/payroll-graduation/automatic-draft.png`.
- Operating flow: open Payroll > current batch > review automatic table / Preview payroll (draft) > Submit for review > Coordinator finalizes. Printing and approval do not mark a scholar paid.

## Single Coordinator, graduates and current sample COR repair - 2026-10-08

- [x] The sole Coordinator can explicitly approve/finalize their own submitted status, academic, roster, masterlist, payroll, amendment, payment-correction and permitted override requests. Removed actor-inequality restrictions, not approval permissions, evidence requirements, state/version checks or audit records. Staff/System Administrator approval remains denied. This supersedes older two-person approval instructions.
- [x] Approved graduation atomically removes membership from editable current/future drafts, increments draft revisions and writes audit evidence. Graduated candidates cannot be added back. Published masterlists and earned final-semester payrolls remain unchanged.
- [x] Removed all five sample graduates from the current **New Scholars AY2026-2027** draft through normal audited removal commands; scholar profiles and historical paid lists remain intact.
- [x] Rehearsed and applied a bounded local sample-data repair for the incomplete open payout policy: appended a policy version including COR and added four missing COR instances. Preserved original COG receipts, verification events, earlier policy versions and all payment records. Refuses real scholars or finalized payrolls; no production/general policy bypass. Backup and isolated restore validated before repair.
- [x] Francis's COG remains Verified; COR is now explicitly Not Submitted. Current masterlist is still Draft. Receiving/verification of COR and authorized masterlist approval/publication remain operator tasks; no fictional compliance or publication was entered.
- [x] Validation: 318 unit tests, lint/type/build/secrets, status, academic changes, official masterlists/amendments, continuing rosters, main payroll and release/graduation, payroll finalization/amendments, payment corrections and override database suites. Sole-Coordinator graduation removes a draft entry while retaining final-stipend eligibility. Browser confirms COR appears and saved COG verification remains.
- Evidence: `output/workflow-repair/`, `output/single-coordinator-*.log`, `output/single-test-*.log`. No schema migration or human account/grant changes.

## Payroll display and graduation consistency - 2026-10-08

- [x] Saved payrolls open with a searchable, paginated frozen roster and effective payment outcomes. Source checks, amendments, corrections and audit evidence remain accessible in collapsed sections; closed-period source warnings no longer dominate the page.
- [x] Archived graduates cannot receive new documents through the annual or semester path. Backend receipt/verification/generation checks enforce the same rule; previous academic-year documents remain readable. Unpaid, explicitly confirmed final-semester processing remains supported.
- [x] Removed the contradictory ?Final semester needs review? suffix when an archived graduate has no stipend due, and the masterlist-preparation prompt on graduate profiles.
- [x] Added Mark as Graduated, explicit before/after status preview, and matching reason selection. Backend rejects GRADUATION reasons targeting Active or other statuses, including approval of an invalid pending request. Duplicate graduation requests are rejected. Controlled corrections retain separate authority and history.
- [x] A retained no-stipend graduation correction remains authoritative when a later Active correction incorrectly used GRADUATION as its reason. Such inconsistent records cannot reopen receiving or payout eligibility. Existing recorded decisions were not deleted or overwritten; valid controlled corrections remain supported.
- [x] Validation: 318 unit tests; lint/type/build/secrets; isolated status and main payroll/release regressions; browser archived receiving/history, saved payroll table and graduate status actions. Evidence: `output/payroll-graduation/` and `output/payroll-graduation-*.log`.

## SAMPLE prior-year history - 2026-10-08

- [x] Added AY2025-2026 academic and individual COR/COG history for 20 continuing sample scholars and five sample graduates. Continuing prior year levels are one below their current level; graduates have final fourth-year sample records.
- [x] Four closed historical sample payrolls, two per cohort: 50 paid entries at PHP 5,000, PHP 250,000 total. Dates of simulated payment processing are 2026-10-08; semester coverage is historical. No real payment occurred.
- [x] AY2026-2027 remains the working year. Current documents, decisions and academic records are preserved; five graduates remain archived with no current entitlement. Current masterlists were not published by this task.
- [x] Encrypted backups and isolated restore checks completed. Graduate additions were rehearsed on a restored copy and imported as new rows only; existing locked records were not overwritten or unlocked. Staging database/user removed.
- [x] Count/amount/closure/working-year checks passed; resumable seeds checked for duplicate prevention. Evidence: `output/continuing-history/final-check.json`, `output/graduate-history/verification.json`. Operating guide: `output/demo-data-guide.md`.

## Receiving and academic-year navigation — 2026-10-08

- [x] Replace the misleading "Earlier annual records" receiving-system switch with **Earlier academic years**. Only years ending before the working year's start appear, most recent first. Current/future/overlapping training years are excluded; no historical records are invented. History is read-only and never auto-generates requirements.
- [x] Keep existing current-year annual documents on the main receiving screen, including accepted continuing scholars such as Francis. Use configured semester receiving for periods without annual-owned documents. Retain original checklist ownership, receipts and decisions; do not migrate or receive the same papers again.
- [x] Show completed Coordinator selection separately from pending published masterlist membership. Read publication from authoritative masterlist evidence. No approval, publication or activation is performed by opening receiving.
- [x] Shared semester receiving now accepts selected new scholars and accepted continuing admissions before masterlist publication. An accepted continuing baseline needs no invented annual record for document custody. Disabled/closed setup and existing ownership checks remain. Official membership and compliance still gate payroll.
- [x] Regression proves receipt, verification and compliance before publication cannot produce an eligible payroll candidate; publication later enables the ordinary eligible path without replacing documents. Existing release, hold and graduation tests pass.
- [x] Validation: 312 unit tests, type/lint/build/secrets; main payroll and continuing-roster database suites; browser current-document persistence, history navigation/read-only filtering and truthful status banner. Evidence: `output/receiving-workspace/`, `output/receiving-workspace-check.log`, `output/receiving-workspace-continuing.log`.
- No migration, masterlist publication or changes to existing scholar/verification data were made for this update. Existing cycle document policies remain pinned; incomplete document policy must be configured through its authorized setup rather than silently rewritten.

## Diagnostic remediation — 2026-10-08

- [x] QA-01: accepted continuing roster → audited annual admission basis → reviewed/published masterlist → shared official semester receiving → authoritative payroll eligibility. No fabricated examination or selection events.
- [x] QA-02: final-stipend pending label requires a real entitlement; otherwise show no approved stipend and eligibility review.
- [x] QA-03: require saved semester academic details/category before verification; permit linked re-verification of stale evidence without a new physical receipt.
- [x] QA-04: responsive search controls remain clickable at 933 px.
- [x] QA-06: payroll cycle/batch selection survives reload; update Home and workflow-guide admission instructions.
- [x] QA-05 first improvement: guarded transaction-local source reuse and cohort reads. At 1,000 scholars, median single-request payroll loading improved from 7.84 s to 3.69 s; dashboard from 7.70 s to 3.42 s.
- [ ] QA-05 follow-up: aggregate screens still take seconds and serialize overlapping work; do not label scalability resolved.
- [x] Migration 40 applied locally after encrypted backup and successful isolated restore. Existing business rows and canonically compared grants preserved.
- [x] Automated checks: 309 unit tests; lint/type/build/secrets; targeted continuing, verification, main payroll/release and dashboard/report DB suites. Browser search, payroll reload, and two-document stale re-verification with unchanged original custody/history passed.
- [ ] Human acceptance of current setup and real accounting reconciliation.

Details and operating steps: [Diagnostic fix delivery](LDSS_DIAGNOSTIC_FIXES_20261008.md). Evidence: `output/workflow-fixes-20261008/`. Earlier entries below describe their delivery dates; their outstanding continuing-masterlist bridge is superseded by this section.

## Admission simplification and historical graduate correction — 2026-10-07

- [x] User clarified that names entered into the system already passed the LGU examination and qualification. Daily screens now show For validation → Validated / for selection → Selected. Staff/Coordinator records one explicit prior-qualification validation; Coordinator selection, publication and payout checks remain separate. Existing history is retained without manufactured exam events.
- [x] Migration 39 adds the explicit validation event edge and an append-only historical-graduation correction table. Existing admission states are reused; runtime may only read the correction table. Encrypted backup/restore verified and pre-migration table contents preserved. Evidence: `output/admission-refinement/`.
- [x] User confirmed five sample graduates completed before AY2026-2027 with no stipend due. Audited corrections supersede erroneous first-semester sample assignments; original profiles, published snapshots and graduation events remain. No payment was created. They are searchable in Graduated / Archived, excluded from current scholars and blocked from current draft additions/renewal.
- [x] Continuing banner now states that admission is accepted, with historical notes collapsed. Empty receiving explains that Coordinator semester-receiving setup is required; a payroll cycle alone does not open receiving.
- [x] Validation: 306 unit tests, lint/type/build/secrets; 13 qualification scenarios, nine masterlist scenarios, and the 12-scenario eligibility/main-payroll integration run including managed release and graduation. Browser checks verified Staff validation, separate Coordinator bulk selection, simplified stage labels and reload persistence. Read-only verification confirms all five corrected graduate identities/history remain, current registry excludes them, new draft additions are blocked, and no payments exist for them (`output/admission-refinement/verification.json`).
- [ ] Human acceptance of the simplified validation/selection flow. Continuing-baseline-to-official-membership integration remains outstanding; this change does not invent admission history for continuing scholars or enable any semester automatically.

## Masterlist selection and issue navigation — 2026-10-07

- [x] Keep bulk selection actions visible while scrolling; review selected additions in an accessible dialog without jumping to the top. Cancel preserves selection; partial saves retain safe retry behavior. Select-all remains explicitly limited to eligible candidates on the current page.
- [x] Link masterlist validation/candidate problems to the relevant scholar tab and academic year. Show role guidance. Link payroll document/compliance problems to the affected semester's receiving workspace without bypassing closed-period restrictions.
- [x] Preserve draft, candidate search, tab and page in navigation; fix switching directly between draft URLs. Use compact stacked candidate rows on narrow screens.
- [x] Clarify operating rules: year level requires academic evidence; masterlists are annual; Staff records actual receipt/unclaimed outcomes against accounting evidence, separately from Coordinator approval.
- [x] Validation: 304 unit tests, lint/type/build/secrets and nine isolated masterlist database scenarios. Disposable-browser checks covered sticky actions, keyboard focus/Escape, busy dismissal protection, partial failure/retry, saved entries after reload, issue navigation and return, mobile confirmation, and page-local selection. Live scholar/masterlist data was not changed.
- [ ] Continuing-baseline-to-official-masterlist connection remains unfinished. Francis's missing annual-record blocker is not a missing-document finding; no exam history or approval has been fabricated to bypass it.

## Current testing cohort — 50 students

- [x] User confirmed that Juan Dela Cruz and James Patrick Villanueva were also samples. Removed all 13 old sample identities and dependent demo records after rollback rehearsal and encrypted backup/restore verification. Accounts, role permissions, audit history, ID sequences and AY2026-2027 setup were preserved (`output/sample-cleanup/applied.json`).
- [x] Seeded **25 new applicants**, **20 accepted continuing-baseline scholars**, and **5 confirmed graduates** under the single working year. All 50 have school/course/year-level records; sample labels and `example.invalid` emails distinguish test data. No continuing admission history was invented.
- [x] Original seed assigned graduates to the current semester with **Final stipend pending**. **Superseded by the user-confirmed correction above:** all five graduated before AY2026-2027 and have no stipend due. Original test events remain for audit; current display is archived and no payment was invented.
- [x] Updated `npm run demo:seed` to use `scripts/seed-sample-cohort.ts` with `output/sample-cohort-manifest.json`. Verified reruns do not duplicate completed samples. Existing period dates, receiving policy and submission windows were not altered.
- [x] Fresh smoke validation: 301 unit tests, lint/type/build/secrets, database checks, 15 isolated authentication scenarios and the main payroll integration smoke (including receiving, verification, holds, corrections and graduation). Browser checks covered 50-record pagination, 25/20/5 search, 25-person admission review, 20-person accepted roster, graduate filtering/profile reload, mobile layout and removal of old demo payrolls. See `output/sample-cleanup/` and [sample testing guide](../output/demo-data-guide.md).

This cohort is starting data for operational testing. Accepted baseline participation alone is not published annual membership or payroll eligibility. Current document-policy/setup and eligibility prerequisites remain enforced. The full financial smoke uses a disposable database so it leaves no artificial payments in this cohort. This refresh does not advance paused workflow phases or imply human acceptance.

## Current follow-up — administration, debugging and academic restrictions

This remains the single tracker. Added instruction: `C:\Users\ADMIN\.codex\attachments\eec6c8c1-d3d6-4a28-95f8-580514ffd0c0\Pasted text.txt`.

- [x] Consolidate continuing-roster preparation/review under **Scholar registry → Continuing roster review**. Permanent registry identities and old links remain; duplicate sidebar navigation is removed.
- [x] Add Administrator Home task cards and walkthrough; preserve technical/operational role separation. Fix continuing-roster toolbar overflow on mobile.
- [x] Designate **AY2026-2027** as the working year using a protected, audited existing setting. Retain other years and their history; no deletion or migration. Default new daily-work selections and current receiving/payroll lists to this year; keep explicit historical views.
- [x] Require exactly two retained semesters, every associated payroll cycle formally closed and financially reconciled, before starting the next year. Date passage alone does not suffice. Creating the year and advancing the setting is atomic and audited; third semesters and concurrent duplicate rollovers are rejected.
- [x] Encrypted backup/restore verified before authorized local adoption (`output/working-year-adoption.json`). The first semester's payroll is open; the second semester still needs real dates/configuration. Next-year creation remains blocked.
- [x] Harden INC clearance: require replacement receipt after the recorded INC evidence, currently verified COG coverage, and an explicit no-INC finding. Waivers, re-verification alone, unverified replacements and unknown answers cannot clear it. Failed/dropped findings remain independent; original assessments are immutable.
- [x] Show recorded enrollment, failed/dropped and INC findings in the semester workspace, label stale evidence, and link to document review. Clarify voluntary scholarship withdrawal in the existing Staff request/Coordinator approval form.
- [x] Focused checks: 301 unit tests in 54 files, lint/type/build/secrets; 14 configuration scenarios, 9 receiving scenarios and continuing-roster/compliance integration tests. Administrator calendar/save/reload/navigation and Staff registry/roster/mobile browser checks passed.
- [x] Full frozen-source regression gate: **43 suites passed**, including 301 unit tests, source/build fingerprints, migration preservation, encrypted backup/restore and database workflows. Archived report and logs: `output/admin-calendar-debug/F36-report.json`. Academic-summary browser checks also passed for enrollment/INC display, stale evidence, direct document-review navigation, reload persistence and mobile width (`output/playwright/academic-summary-verify.js`, `academic-standing-mobile.png`). Disposable fixtures were cleaned up.
- [x] Connect managed payroll processing to reserved allocations: fixed PHP 5,000 actual receipt, explicit receipt confirmation, unclaimed outcomes, Coordinator holds and separately approved corrections. Recheck authoritative academic/standing restrictions before unpaid release; preserve frozen membership and paid history.
- [x] Add Coordinator-only post-finalization academic review. Newly recorded restrictions withhold unpaid entries; they do not silently reverse payments. Genuine failed/dropped/INC findings retain their existing correction safeguards.
- [x] Require explicit final funded semester on Coordinator graduation approval. Support graduation before or after final receipt, pending-stipend labels, derived archival, searchable history and renewal prevention. Legacy graduation decisions are not backfilled.
- [x] Apply additive migration 38 after encrypted backup/restore and preservation checks: 99 existing business tables preserved. New append-only confirmation table and release-link INSERT grant; no scholarship role permissions added. Evidence: `output/managed-release/migration-local.json`.
- [x] Isolated release/graduation integration scenarios passed, including held/unclaimed benefits after closure, stale decisions, role denial, duplicate/concurrent payments, audit rollback, immutable snapshots and graduate search. Browser checks passed for Staff receipt, Coordinator hold clearance, explicit graduation approval, reload persistence, archive navigation and mobile width.
- [x] Final frozen-source regression gate: **44 suites passed**, including 301 unit tests, lint/type/build/secrets, migration preservation, database workflows and encrypted backup/restore. Archived report and logs: `output/managed-release/F36-report.json`. Disposable browser database cleaned up; live API/database and frontend health passed.
- [ ] Human operational acceptance.

### Approved decisions and unfinished work

| Work | Decision and current behavior | Remaining delivery |
| --- | --- | --- |
| Voluntary withdrawal | Existing request/different-Coordinator approval preserves effective date and history. Ordinary eligibility requires active standing. Document waivers are separate. | Treatment of previously approved but unclaimed benefits needs policy confirmation; never cancel them automatically. |
| Failed/dropped/stopped consideration | User requires a letter and compliance with reconsideration terms. Evidence alone does not establish approval authority. Earlier approved rules prohibit automating undefined genuine-failure exceptions. | **Policy clarification pending:** authorized LGU policy/decision, Coordinator authority and required reference/terms. No blanket override added. Eventual approval must name the scholar, semester and restrictions; cannot clear INC, documents or deadlines. |
| INC clearance | Hardened using existing receipt, verification and academic review events. Clearing INC preserves remaining failed/dropped restrictions and batch timing/finalization rules. | Automated and targeted browser validation passed; user testing pending. |
| Graduation | **Implemented:** Coordinator records the final funded semester with the approved decision. Its qualifying stipend is preserved; full actual receipt plus explicit graduation derives archival. Never infer graduation from year level/payment/course duration. | Human acceptance. Old decisions without final-semester evidence remain for controlled review; no guessed backfill. |
| Managed payroll release and holds | **Implemented:** reserved allocations connect to actual receipt, unclaimed outcomes, Coordinator holds and reviewed payment corrections. Closed-period holds can be resolved without reopening payroll or erasing closure evidence. | Human acceptance. Frozen membership amendments remain guarded; no held allocation is freed, no paid record is automatically reversed. |

### Remaining implementation order

1. Complete Staff/Coordinator operational acceptance using the [release/graduation walkthrough](../README.md#payroll-release-and-graduation). The supporting [delivery report](LDSS_MANAGED_RELEASE_DELIVERY.md) is evidence, not a second tracker.
2. Clarify the authorizing policy for failed/dropped/stopped reconsideration, Coordinator authority and required evidence/terms. A supporting letter alone never unlocks payment.
3. After that clarification, extend the existing exception services with restriction/semester scope and test the policy-dependent cases. Pending/rejected requests remain blocking; no INC shortcut.
4. Clarify treatment of previously approved, unclaimed benefits after voluntary withdrawal. They remain reserved and held; no automatic cancellation or release is authorized.

The earlier administrator/calendar gate introduced no migration; its live business configuration change was adopting AY2026-2027. This release subsequently applied migration 38 as described above. Synthetic release/graduation transactions were tested only in disposable databases, not against live scholar payment records.

## Current priority - main scholar-to-payroll workflow

This section supersedes earlier checkpoint sequencing and "financial activation pending" statements below, which describe previous deliveries. There is still **one working tracker**, this file; the supporting [delivery report](LDSS_MAIN_PAYROLL_DELIVERY.md) is evidence and a test guide, not a second plan.

User instruction: `C:\Users\ADMIN\.codex\attachments\1c77a7a1-da57-4386-9c09-e266599320e4\Pasted text.txt`. Deliver only: approved/published scholar -> semester receiving -> separate verification and academic compliance -> automatic payroll candidates -> Coordinator finalization -> official Payroll Form. The user explicitly confirmed using the four sample signatories.

- [x] Inspect existing services, permissions, schema and actual payroll sample; reuse existing `ovr_*` entities.
- [x] Connect existing published membership to semester receiving without fictional admission history.
- [x] Reuse distinct current COR/Certificate of Enrollment and preceding-semester COG obligations; retain authenticated receipt history, corrections and separate verification.
- [x] Extend the existing authoritative eligibility engine with semester academic, timing, standing and allocation evidence.
- [x] Show live batch candidates and sample-based draft form; require explicit Coordinator deferral of unresolved timely submissions.
- [x] Freeze membership/form data at finalization; reserve exactly one full PHP 5,000 ordinary degree stipend per scholar/semester using the existing entitlement constraint.
- [x] Generate official printable Payroll Form from frozen data and the confirmed sample signatories. Export does not record payment.
- [x] Test A-H in an isolated disposable database, including multi-member batches, audit failure, concurrency, stale hashes and retries.
- [x] Verify encrypted backup/restore and apply migration 37 locally; all rows in 97 existing business tables preserved, no business backfill.
- [x] Final gate: 43 suites passed, including 283 unit tests in 50 files, build/type/lint/secret checks, A-H database scenarios, recovery and migration preservation; browser and single/multi-page print checks passed. Archived evidence: `output/main-payroll/F36-report.json`.
- [ ] User operational acceptance (not inferred from automated success).

**Historical demo refresh, superseded:** The earlier 17-person F26 demo was replaced by 11 workflow examples, then those samples and the two separately confirmed test scholars were removed. The active testing cohort is now the **50-student set** at the top of this tracker. Old manifests and backups are retained only for recovery; the former two-person demo payroll is no longer current.

**Boundaries:** This delivery uses actual published annual membership. Names-only accepted rosters still require their separate publication bridge. Existing annual-owned document histories are not silently reassigned; conflicting same-semester legacy checklists require explicit reconciliation. Managed release is now connected to allocations by the follow-up above; managed membership amendments remain guarded. Existing legacy processing is preserved. Non-degree benefits, first-college-semester admission-grade alternatives, new ended-semester retroactive entitlements, and broader changes/new-applicant/report work remain outside this bounded delivery. A later claim of an already-approved unclaimed entitlement is supported through controlled correction and does not create retroactive eligibility. The form supports the sample's year columns I-V and prints blank award cells where no authorized award number exists.

## Workspace usability follow-up (2026-10-07)

**Current payroll first:** Payroll now defaults to periods containing today's Philippine date in their configured semester range. **Past periods & batches** opens ended semesters and retains the existing batch list/detail/preview route. Open financial processing does not make an ended semester current. Upcoming periods appear separately when present; All periods preserves access to undated records. Filtering covers all fetched API pages before display pagination, and back navigation returns to the chosen view. Validation: 297 unit tests in 54 files, lint/type/build/secret checks, isolated main-payroll A-H/11 eligibility scenarios, and desktop/mobile browser checks passed. Date rollover and over-100-record navigation were simulated only in browser read responses. No migration, backend rule or live data change; operational acceptance remains pending.

**Remove scholar follow-up:** Draft members now have a visible **Remove scholar** button beside View scholar, outside Edit entry. Confirmation identifies the name, Scholar ID, list and year; a removal reason is required and physical reference remains optional. Cancel leaves membership intact. Existing audited removal updates the count without deleting the profile or changing scholarship standing. Review/published/locked safeguards remain. Targeted lint/type/build, nine disposable masterlist scenarios and browser cancel/remove/reload/profile-preservation checks passed. No live data was edited; user acceptance remains pending.

**Latest refinement, ready for review:** Admission review restores the academic year, stage, search and page after reload while clearing checked names. Staff starts at examination recording; Coordinator starts at qualification review. Completed bulk decisions offer the next admission stage or Masterlists, without automatically selecting or approving anyone. Bulk confirmation shows the year/list context. Receiving opens document review after saving and provides a pending-document count and direct review button that remain accurate after reload. Browser checks passed role handoffs, three separately confirmed admission stages, interrupted masterlist-save retry, and independent COR verification/COG receiving persistence. Details and evidence: [UI delivery report](LDSS_UI_SIMPLIFICATION.md#navigation-and-document-review-refinement-2026-10-07). No migration, permission change or live business-data edit. User acceptance remains pending.

The user subsequently requested simpler navigation and less text across the system. This authorized UI delivery is complete; it does not resume unrelated workflow phases.

- [x] Group navigation by daily work and setup, respecting existing permissions; remove duplicate placeholder links.
- [x] Open Home after login and provide receiving, scholar lookup and payroll shortcuts.
- [x] Separate list browsing from selected scholar/masterlist/payroll work, with clear back actions.
- [x] Add searchable, paginated masterlist/payroll tables, candidate status filters and direct scholar receiving links.
- [x] Keep history, policy explanations and advanced actions expandable; retain visible validation failures and separate COR/COG records.
- [x] Apply shared layout improvements and verify Staff, Coordinator and technical-administrator views on desktop and mobile.
- [x] Pass lint, 283 unit tests, type/build/secret checks, isolated main-payroll database scenarios and browser checks.
- [ ] User usability acceptance.

**Receiving follow-up:** Current-year/current-semester defaults, explicit history selectors, persisted receiving URLs, distinct legacy document-context labels, links to other saved records and visible missing-approval guidance are delivered. Read-only checks found the reported Juan/Jessa receipts intact; neither record had the published active scholarship membership required for payroll. Validation: 287 unit tests, eight receiving database scenarios, 12 eligibility scenarios plus main-payroll A-H, and actual receive/reload/context-switch browser checks passed. No live approvals or document records were changed. Details are in the UI delivery report below.

**Annual-record/masterlist follow-up:** Fresh year choices, valid form defaults, clearer new-record state, persisted scholar tab/year, and explicit published-versus-draft guidance are delivered. Published lists offer the existing additional-draft path for newly selected scholars; empty drafts expose candidate entry and source-fix links. Jessa had subsequently reached Selected; the inspected target remained Published and ANOTHER remained a same-year draft. No live approvals were performed. Validation: 289 unit tests; 11 qualification, eight academic and nine official-masterlist database scenarios; actual browser creation of annual/academic records, selection and addition to a new draft with reload persistence. See the UI delivery report for scope and evidence. User acceptance remains pending.

**Open-period receiving follow-up (2026-10-07):** Receiving choices now show only current, open semester scopes. A sole open choice needs no dropdown; prior saved documents are separated into read-only Document history. Old links cannot silently redirect a receipt to another period. Existing semester-owned and payroll-specific document records stay distinct. Validation: 290 unit tests, lint/typecheck/build/secret checks, eight receiving database scenarios, and browser checks for open-only choices, receipt reload, historical links/history, sole-open selection and no-open state passed. Browser period-closure edge cases used intercepted responses against disposable data. No migration or live data change. User acceptance remains pending.

See [UI delivery and walkthrough](LDSS_UI_SIMPLIFICATION.md). Existing live demo data, accounts, database schema, backend permissions and scholarship rules were preserved. This file remains the only implementation tracker.

**Masterlist simplicity/rendering follow-up (2026-10-07):** Fixed a React key collision between the workflow panel and entries table. Masterlists now show one task table at a time (Scholars on list / Add scholars), ten candidates per page, direct one-click draft additions and collapsed blocker details. Optional award numbers remain editable through Edit entry; empty/invalid lists cannot submit through the UI. Review/approval remains one panel with the existing server controls. Validation: 290 unit tests; lint/typecheck/build/secret checks; nine isolated masterlist database scenarios; browser refresh/search, duplicate-click, add/reload, blocked-candidate, edit/cancel, submission and desktop/mobile checks passed. No migration or live data changes. Recovery: revert this increment in the two masterlist UI components together. User acceptance remains pending; broader phases remain paused.

## Latest delivery: workflow-wide simplicity (2026-10-07)

The user requested a review of every workflow and simplification wherever possible. This expands the usability work across existing screens, while leaving unrelated policy expansion paused.

- [x] Review registration/import, qualification, continuing rosters, academic records, receiving, verification, compliance, eligibility, masterlists, payroll, financial processing, corrections, status/graduation, reports, configuration, access and audit screens.
- [x] Use unambiguous current-year defaults and open current scholarship details automatically; retain explicit selection when calendars are ambiguous.
- [x] Hide optional new-registration details, completed requests and long histories behind expandable sections. Reuse saved semester academic details and continuing-roster names/row numbers.
- [x] Align legacy routine receipt inputs with simple receiving: optional storage/notes/reference, automatic routine evidence, authenticated actor/date and separate COR/COG records.
- [x] Bring explicitly opened action forms into view; replace manual status reason codes with categories plus an optional custom code. Preserve exceptional decision evidence.
- [x] Fix duplicate sibling component identities in profiles/payroll and stale registry navigation. Preserve report context across reload.
- [x] Test Staff/Coordinator principal routes and Administrator setup screens; exercise synthetic registration, annual/academic entries, tab switching, reload, document/status form focus, saved semester summaries, roster saving, eligible filtering and payroll preview.
- [x] Pass final frozen-source gate: 43 suites, 291 unit tests in 51 files, lint/type/build/secret checks, all database suites, encrypted backup/restore and source fingerprint verification. Archive: `output/workflow-ui/F36-report.json`. Browser fixture cleanup completed.
- [ ] User hands-on acceptance of the simplified workflows.

See the workflow matrix and specific browser coverage in [UI delivery and walkthrough](LDSS_UI_SIMPLIFICATION.md#workflow-wide-simplification-review-2026-10-07). This is automated and selected browser validation, not acceptance of every possible role/state combination. No live business records, permissions or database schemas changed. Recovery: revert this increment's UI/shared-hook changes and receipt validator/tests together; no database restore is required.

## Purpose and authorization

### Role guidance and bulk-operation follow-up (2026-10-07)

User request: identify account responsibilities at each step, verify received documents without a manual routing step, and support selecting several scholars for routine actions.

- [x] Add Admission review to daily navigation and Home. Show academic-year/stage/search filtering and page-scoped multi-select (up to 25). Staff/Coordinator records examination results; Coordinator confirms qualification and selection through separate reviewed commands.
- [x] Add select-many/select-all-eligible-on-page to masterlist candidate entry, with named confirmation and individual results. Reuse existing versioned/audited APIs; stop on the first uncertain or failed save and retry the exact command safely.
- [x] Offer Verify / Return for correction / Reject directly on Submitted and Resubmitted documents. Validate all original document checks. Preserve the old database transition contract by atomically recording automatic routing and the actual decision; no migration.
- [x] Include Submitted and Resubmitted in the verification report, keeping individual COR/COG records visible without manual routing.
- [x] Show signed-in role and prominent Coordinator handoffs for admission, masterlists, payroll and status/placement decisions. Preserve independent approvals and technical-administrator separation.
- [x] Check 292 unit tests, lint/type/build/secret checks; 12 qualification database scenarios, 10 verification scenarios, reports/payments regressions and main-payroll fixture scenarios.
- [x] Browser: three-person admission batches, Staff restrictions, three-person masterlist addition, lost-response retry without duplicates, receiving/direct verification/reload, and desktop/mobile layout. Disposable fixture cleaned up.
- [x] Final frozen-source acceptance gate: all 43 suites passed, including 292 unit tests in 52 files, lint/type/build/secret checks, database workflows, reports, concurrency, historical preservation and encrypted backup/restore. Source fingerprint unchanged throughout the final run. Archived evidence: `output/bulk-workflow/F36-report.json`. An earlier run completed its suites but required rerunning after the cleared-year UI fix.
- [ ] User operational acceptance.

Evidence and usage: [Role guidance, direct verification and bulk work](LDSS_UI_SIMPLIFICATION.md#role-guidance-direct-verification-and-bulk-work-2026-10-07). Bulk operations intentionally cover named records on the visible page, and do not bulk-grant exceptions or record unobserved document/payment outcomes. Masterlist approval/publication and payroll finalization already operate on whole lists/batches. Live records, approvals, permissions and schemas were preserved. Broader paused policy phases remain paused.

Extend the existing system in small, reversible releases. Preserve working services, individual documents, historical records, permissions, and audits while simplifying daily Staff work.

The user authorized starting implementation and subsequently authorized shared database-account recovery. Phase 01 preservation/recovery and Phase 02 control repairs are technically complete. Existing F00-F36 delivery records remain separate from this tracker. Phase numbers below are not new F-function numbers.

**Single working tracker:** This file now incorporates the later semester submission/payroll proposal and the user's payroll-preview request. It is the authoritative schedule and progress checklist for the workflow changes. Earlier phase reports, the original F00-F36 plan and diagrams remain supporting specifications/delivery history, not competing trackers. Preserve their historical evidence; use this merged scope for pending implementation.

The user authorized Checkpoint A and confirmed option 1: sequential, non-overlapping submission windows; financial processing may overlap. The subsequent "next" authorized B1 implementation; the latest bounded-delivery instruction above now governs sequencing. Unresolved policy is not implicitly approved by that continuation. For the current instruction, finish the complete bounded main workflow and its tests before stopping; broader checkpoints remain paused. Plan inclusion, automated success and human acceptance are separate. Prior shared database recovery authorization does not authorize repairing shared XAMPP/MariaDB system tables as part of this feature.

## Source references

- [Original implementation plan](../LDSS_Codex_Function_by_Function_Implementation_Plan.md)
- [End-to-end workflow reference](../LGU_Daet_Scholarship_End_to_End_Workflows.pdf)
- [Current README](../README.md)
- [F36 delivery evidence](F36-delivery.md)
- [F36 acceptance checklist](F36-acceptance-checklist.md)
- [Existing full-process diagrams](LDSS_FULL_PROCESS.md)
- Presentation reviewed: `C:\Users\ADMIN\Downloads\LGU_Daet_Expanded_Scholarship_Orange_Minimal_with_Agreement(1).pptx` (37 slides).
- User decisions and clarifications from the planning conversation.
- User task: `C:\Users\ADMIN\.codex\attachments\48088760-78e0-4f0e-bf3f-49a6546e6036\Pasted text.txt` - semester payout periods, deadlines, automatic candidates and sequential payroll batches; read-only assessment completed before this merge.
- Actual payroll template: `C:\Users\ADMIN\Downloads\payroll sample.docx`, inspected 2026-10-07. Use this sample, not an invented form.
- Subsequent user clarification: provide a live draft payroll-form preview and an immutable approved payroll preview; consolidate all pending work in this file.

The workflow PDF is a development reference, not a statement that every sentence is a verbatim legal requirement. The presentation combines ordinance excerpts, amendments, and agreement summaries. Record policy differences explicitly; do not claim legal compliance from terminology alone.

## Baseline findings (Phase 01 history)

- F00-F35 are recorded as accepted; F36 human acceptance and production readiness remain pending.
- Existing F36 automated evidence describes an earlier candidate. The read-only assessment found 15 changed recorded source files, three additional code files, and changed/missing build artifacts; the 29 recorded migration files were unchanged.
- Recent form-simplification and year-summary code already exists. Phase 01 must inspect and test what is actually present rather than assume it is new work or already accepted.
- Phase 01 preserved 344 source/reference files with verified archive hashes, preserved previous UAT evidence, created an encrypted 76-table application backup, and passed the standalone application checks and database checksum/grant checks.
- Initial restore verification failed on corrupted XAMPP account tables. Authorized recovery repaired `mysql.global_priv` and `mysql.proxies_priv`; extended checks, repeated account probes, and application restore now pass. All 76 application tables matched the initial backup after repair.
- UAT exposed a pre-existing status-approval race error-contract defect and an outdated qualification assertion. The narrow fix and regression coverage passed the complete 35-suite gate. All 390 recorded source/build hashes matched afterward; 29 migrations remain unchanged.
- Details: [Phase 01 baseline report](LDSS_WORKFLOW_PHASE01_BASELINE.md). No application migration, operational permission change, or live business-data edit has been made. Phase 02 passed its own 35-suite gate; Phase 03 now specifies the next additive changes. Human production sign-off remains pending.

## Progress overview

Use: Not started / In progress / Ready for review / Accepted / Blocked. Check a phase complete only when its acceptance gate and evidence are recorded. Keep technical validation distinct from human acceptance.

| Complete | Phase | Deliverable | Status | Evidence / acceptance |
| --- | --- | --- | --- | --- |
| [x] | 01 | Verified baseline and recovery point | Technically complete | [Baseline report](LDSS_WORKFLOW_PHASE01_BASELINE.md); 35 suites and recovery passed; not production acceptance |
| [x] | 02 | Small control repairs | Technically complete | [Control repairs](LDSS_WORKFLOW_PHASE02_CONTROLS.md); 35 suites and browser summary-refresh check passed |
| [x] | 03 | Policy and data specification | Specification complete; unresolved policy explicitly deferred | [Specification and source map](LDSS_WORKFLOW_PHASE03_SPECIFICATION.md) |
| [x] | 04 | Additive data foundation | Technically complete; dormant | [Foundation and recovery](LDSS_WORKFLOW_PHASE04_FOUNDATION.md); 36 suites passed |
| [ ] | 05 | Continuing-scholar onboarding | Roster and semester integration delivered; unknown shift-history enforcement remains Phase 10 work | [Roster workflow](LDSS_WORKFLOW_PHASE05_CONTINUING.md); latest integration evidence in Phase 06 |
| [x] | 06 | Simple semester workspace | Technically complete; human acceptance pending | [Final integration review](LDSS_WORKFLOW_PHASE06_ACCEPTANCE.md); prior 38-suite evidence and 434 hashes independently reverified before Phase 07 changes |
| [x] | 07 | Academic compliance assessment | Technically complete; human acceptance pending | [Compliance delivery and final review](LDSS_WORKFLOW_PHASE07_COMPLIANCE.md); 38 suites including 241 unit tests and database/browser checks passed; all 458 source/build hashes verified |
| [ ] | 08 | Semester windows, automatic candidates, draft preview and entitlements | Main published-scholar path technically complete; 43 suites passed; broader names-only publication bridge remains pending | [Checkpoint A](LDSS_WORKFLOW_PHASE08_WINDOWS.md), [enrollment](LDSS_WORKFLOW_PHASE08_DOCUMENTS.md) and [regular coverage](LDSS_WORKFLOW_PHASE08_COVERAGE.md); earlier [timing delivery](LDSS_WORKFLOW_PHASE08_TIMING.md); current [main-workflow delivery](LDSS_MAIN_PAYROLL_DELIVERY.md) adds authoritative candidates, ordinary allocations and frozen forms, with 43 suites passed |
| [ ] | 09 | Approved payroll preview/export, routing and actual release | Main draft/official printable form technically validated; routing/release paused | [Bounded delivery](LDSS_MAIN_PAYROLL_DELIVERY.md); no release is inferred from printing |
| [ ] | 10 | Changes, formal decisions, graduation, and closing | Not started | Pending |
| [ ] | 11 | Complete new-applicant journey | Not started | Pending |
| [ ] | 12 | Shared reports, pilot, UAT and gradual release | Not started; Checkpoint E pending | E validates the payroll scope; broader phase acceptance still required |

## Earlier functionality update - before the main-workflow priority change

These are the workflow-change phases, separate from the original F00-F36 delivery sequence.

- **Phases 01-04:** baseline/recovery, control repairs, policy specification and additive foundation are technically complete.
- **Phase 05:** names-only continuing rosters can be prepared, independently reviewed and accepted without inventing admission history. Document-arrival academic/category capture is now connected. Unknown prior course-shift enforcement remains a Phase 10 dependency.
- **Phase 06 (technically complete):** Coordinator semester setup, enabled/disabled scope control, automatic individual COR/COG preparation, simple Staff receiving, academic-year navigation, versioned semester placement/category and successive-period preservation are implemented. Coordinator category-error correction preserves prior values and evidence. Used setups can now be recovered under unchanged policy with history intact; changed-policy/ended-period and dependent-record review remain restricted.
- **Phase 07 (technically complete):** academic findings, Coordinator school grading rules, derived compliance, exact-version document links, stale-review detection and append-only INC resolution are implemented. Staff has no manual eligibility switch or routine reason/reference input. Coordinator grading-rule replacement now preserves policy history and makes affected assessments require re-review; shared financial dependencies block replacement. Coordinator can now append an academic-only review after semester end using verified COR/COG and the rule covering that semester. INC resolution preserves earlier findings and does not authorize late payment. Locked periods and dependent entitlements remain protected. Coordinator can correct explicitly reviewed failed/dropped recording errors while preserving the exact original review/field history. Genuine adverse findings and later new findings remain protected. Coordinator recovery now resolves all expired/conflicting grading-policy versions explicitly, preserves their history and requires fresh assessments; the final phase review and all 38 regression suites passed, including 241 unit tests. All 458 source/build hashes were verified.
- **Working daily path:** find the scholar, open Receive requirements, select the documents physically received, and save. COR and COG retain distinct coverage and statuses. Routine references/storage/remarks are optional. Verification is separate.
- **Year tracking:** the profile and receiving screen show recorded school, course and year level. Semester revisions preserve placement provenance. Year level is never automatically advanced. Known category carries forward only for the same course from the recorded predecessor.
- **Record protection:** role checks, retry protection, atomic audits and immutable history remain in place. Missing data is not treated as passing/compliant. Earlier receipts are not copied into a new semester.
- **Existing F00-F36 functions:** legacy qualification, academic changes, masterlists, eligibility/overrides, payroll, payment, dashboard/report/export, audit and backup paths remain available and covered by regression tests. They are distinct from the new semester-based policy path.
- **Phase 08 preview:** Collapsed payout-readiness check with current academic blockers, admission basis, financial reconciliation flags and actual legacy comparison; no financial mutation.
- **Phase 08 / A (technically complete):** Coordinator-only regular-semester mapping, final deadlines, sequential numbered payroll windows and audited extensions are implemented. Staff/Admin view setup without managing it. Submission and processing statuses stay separate; historical records are preserved. All 39 suites and 476 source/build hash checks passed. Receipt deadline enforcement and managed financial activation await B1/B2/C; see [delivery evidence](LDSS_WORKFLOW_PHASE08_WINDOWS.md).
- **Phase 08 / B1 (in progress):** One semester enrollment obligation accepts COR or Certificate of Enrollment, recording the actual paper for initial receipt and replacement. COG remains separate. Coordinator setup now automatically selects the mapped regular predecessor; missing/conflicting calendars and wrong COG coverage are blocked. Existing compatible document verification is preserved while changed calendar evidence makes academic assessment stale. No extra Staff field was added. The coverage release passed 40 suites and 486 hash checks. The subsequent read-only receipt-evidence increment passed 276 unit tests and focused database/Staff browser checks; physical date and automatic entry time are now clearly separated in document history. Timing and Coordinator late-encoding decisions passed all 41 suites, 280 unit tests, browser checks and 501 hash checks; reviewed/published membership and authoritative eligibility integration remain pending. [Timing delivery](LDSS_WORKFLOW_PHASE08_TIMING.md). [Enrollment evidence](LDSS_WORKFLOW_PHASE08_DOCUMENTS.md); [regular-coverage evidence and limits](LDSS_WORKFLOW_PHASE08_COVERAGE.md); [receipt evidence](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md).
- **Payroll forms:** User-facing wording is Payroll. Batch membership is viewable, but sample-form draft/approved previews and payroll generation are not implemented. B2 introduces the draft preview; D introduces the approved snapshot preview/export. No separate OVR form is planned.
- **Remaining in the new path:** Phase 08 checkpoints B1/B2/C; Phase 09 checkpoint D; Phase 10 enhanced shifts/status/graduation/closing; Phase 11 complete new-applicant journey; Phase 12 checkpoint E and broader pilot/release acceptance. No local operational roster, submission mapping or payroll was activated by Checkpoint A.

## Policy baseline and open decisions

### Working decisions from the user

- The examination in the proposed flow is the LGU scholarship qualifying examination.
- Passing does not guarantee selection. Record qualification, interview, and final selection; do not invent a numerical interview passing score.
- New applicants complete the agreement and notarization as part of admission, together with the authorized decision.
- Continuing scholars do not repeat initial admission. Only names in a hard-copy roster are currently available; historical details may be unknown.
- Degree scholars require applicable enrollment and grades evidence, full load, and an average of 2.50 or lower on the confirmed scale, with no failed, dropped, or unresolved incomplete subject. COR or Certificate of Enrollment are alternatives for one enrollment obligation, not two mandatory documents. Other grading schemes require approved equivalencies. The B1 enrollment alternative is technically validated for the explicit semester workflow; legacy annual definitions remain unchanged.
- A verified maintenance failure blocks payout; permanent suspension/cancellation/termination requires a formal decision. Do not automate an undefined exception.
- Continuing scholars use current-semester COR or Certificate of Enrollment and the immediately preceding completed semester's COG. New first-year scholars use the applicable admission-grade alternative where previous college COG does not exist; this requires integration with Phase 11 rather than inventing previous college grades.
- Transfers and shifts require prior approval. Course shifting is limited to once, no later than the beginning of the first semester of second year; non-degree-to-degree shifting is prohibited under the proposed rules. Unknown historical shift counts are not zero.
- Degree entitlement is one full PHP 5,000 stipend per eligible semester, with no arbitrary partial payment.
- Coordinator approves payout batches; Staff records actual release. Approval is not proof of release.
- Graduation prevents future participation but does not automatically erase a valid final-semester entitlement.
- The user's confirmation is understood as documented Coordinator decision authority. Capture its actual delegation/reference before enforcing the final authority model.
- Each academic year has two regular scholarship payout periods: first and second semester. Each semester may have multiple sequential payroll batches; do not create a cycle per scholar or require new documents per batch.
- Coordinator sets the semester final submission deadline and batch submission windows. Batch cutoff cannot exceed the semester deadline without an authorized extension. A one-week window is an example, not a fixed rule.
- Confirmed 2026-10-07: submission windows are sequential and cannot overlap; financial processing can overlap. Opening a later batch is not a reason to discard earlier valid semester documents.
- Complete on-time submissions may be verified after cutoff. Submission closure does not close financial processing, mark anyone paid, remove obligations or alter historical records.
- Staff must not manually generate payout checklists, toggle eligibility or add each eligible scholar to a separate queue. Reuse automatic semester provisioning and authoritative candidate queries.
- Payroll is the only generated payout form. Previewing a draft or approved payroll never authorizes payment or records release.

### Items requiring explicit resolution or restricted behavior

| Item | Treatment until resolved |
| --- | --- |
| Exam-first sequence versus preliminary qualification described in slides | Preserve the proposed sequence and flag the source difference for explicit approval before applicant implementation. |
| Exact delegated authority | Record the actual authority/reference; distinguish the person recording a decision from the authority issuing it. |
| Failure discovered after a previous stipend was paid | No automatic recovery, reversal, or historical eligibility rewrite. Define the period affected. |
| INC cleared after payroll closure | No automatic reopening or retroactive payment; supplemental payouts remain unavailable until authorized policy permits them. |
| Non-degree benefits | Track program category; no automatic inclusion in degree-stipend payroll. Financial workflow undecided. |
| Representative collection | Disabled or requires authorization until the required authorization/ID policy is established. |
| Unclaimed stipend | Preserve the entitlement/outcome; no automatic cancellation or forfeiture. |
| Grading equivalencies | Approved institution-specific equivalency; unknown equivalencies require review. |
| Unknown continuing-scholar history | Explicitly Not recorded; targeted review when a decision depends on it. |
| Additional presentation conditions | Review family-beneficiary limits, outside-municipality allocation, contract duration, other maintenance obligations, and conflicting income-document wording before claiming complete policy coverage. |

## Phase 01 - Establish the exact starting point

- [x] Identify and preserve the current source baseline, including recent simplification work.
- [x] Create an encrypted database backup and verify restoration.
- [x] Run existing checks against the exact current code. All 35 UAT suites passed; 390 frozen source/build files verified afterward.
- [x] Record migration versions, results, and outstanding defects.
- [x] Prepare isolated development/test data for implementation. Existing disposable database fixtures restored to operation; status suite passed using isolated data.

**Acceptance gate:** The starting system can be restored and its actual passing/failing checks are known. Earlier F36 evidence remains historical evidence.

## Phase 02 - Repair small control gaps

- [x] Block payout-cycle closure while required batch processing/reconciliation remains unfinished.
- [x] Require meaningful reasons for roster removals without restoring repetitive routine evidence fields.
- [x] Refresh the visible year-level summary after academic changes.
- [x] Test automatic routine evidence and mandatory exception evidence.

**Acceptance gate:** Existing workflows still pass; each repaired issue has focused regression coverage. Receiving remains simple.

## Phase 03 - Finalize policy and data specification

- [x] Define new-applicant and continuing-scholar journeys.
- [x] Define independent scholarship, semester-compliance, official-list, and payout states.
- [x] Specify COR/COG coverage, grading rules, and equivalencies.
- [x] Specify Coordinator authority and reusable supporting reference.
- [x] Specify continuing-scholar onboarding and treatment of unknown history.
- [x] Specify degree entitlement rules and restricted undecided actions.
- [x] Resolve or explicitly defer source conflicts, including examination order.
- [x] Map new behavior to existing services, APIs, tables, and screens.

**Acceptance gate:** Every enforced rule has a clear source or approved operational decision. No unknown rule becomes an invented default.

## Phase 04 - Add data records without replacing existing ones

Use forward-only migrations. Never edit applied migrations.

| Proposed addition | Purpose |
| --- | --- |
| Participation/admission record | Distinguish accepted continuing scholars from new applicants. |
| Scholar-semester record | Preserve enrollment, placement, year level, and compliance per period. |
| Semester review history | Retain academic findings and later corrections. |
| Policy/authority references | Reuse approved rules and authority without repeated typing. |
| Semester entitlement | Separate approved assistance from actual release. |

Phase 03 specified the data contracts; Phase 04 delivered the dormant tables described in the [foundation report](LDSS_WORKFLOW_PHASE04_FOUNDATION.md). No new workflow is enabled.

- [x] Reuse scholar identities, academic history, document instances, audit services, and approval mechanisms.
- [x] Define how semester placement relates to existing annual academic records; avoid competing sources of truth.
- [x] Preserve existing workflows while enabling new behavior only for a designated test period/cohort.
- [x] Test migrations against a restored database and compare historical data.

**Acceptance gate:** Existing records, official snapshots, and payments remain unchanged. New schema is compatible with the designated release and rollback approach.

## Phase 05 - Introduce continuing-scholar onboarding

- [x] Encode/import the hard-copy roster once and review duplicates.
- [x] Record roster source, authority, and acceptance once for the batch.
- [x] Mark accepted members as existing scholars with prior admission accepted.
- [x] Complete missing-data capture on document arrival: identity/school/course/year use existing forms; program category and versioned semester context are now connected to receiving. Unknown values remain unknown until recorded.
- [x] Retain unavailable historical details as Not recorded.
- [ ] Enforce targeted review when unknown course-shift history affects a new request. Unknown history is now recorded/displayed; policy enforcement across ordinary changes and amendments remains Phase 10 work.

**Acceptance gate:** Continuing scholars enter semester monitoring without repeating admission. No missing document history is fabricated; incomplete identity/category remains visible and cannot silently establish payout eligibility.

**Current evidence:** Roster preparation, separate Coordinator acceptance, baseline profile notice, concurrency protection and retries are validated. Phase 06 now connects the accepted baseline to receiving without fabricated qualification; Phase 10 must still enforce the unknown-shift-history gate. Phase 05 stays unchecked until these integration items are verified.

## Phase 06 - Build the simple semester workspace

Normal path: **Find scholar -> receive documents -> review -> see next action.**

First increment: existing annual-record receiving now shows school, course and year level for its selected academic year, with a direct academic-record action and no second year selector. Accepted continuing scholars without annual records are no longer directed to repeat admission setup. The baseline-to-semester receiving connection is still pending; this increment does not complete the acceptance gate.

Second increment: per-scholar year/period context survives visits to academic records within the registry. Unavailable saved selections require an explicit new choice instead of silently provisioning another period. Removed the duplicate profile year panel while receiving. Validated with 190 unit tests, seven receiving database scenarios and disposable browser navigation/stale-period checks. The continuing-semester ownership migration and coverage-aware services remain the next implementation work.

Third increment: the checklist ownership bridge is applied and validated. Checklists can reference exactly one annual or semester owner; wrong semesters, duplicates and legacy payout attachment are blocked for semester owners. Existing data was preserved, and all 38 UAT suites passed. No continuing-semester provisioning endpoint is enabled yet. Next: coverage-aware services, narrowly scoped runtime access and the Staff receiving connection.

Fourth increment: coverage-aware receipt/verification/waiver processing is implemented, with four narrowly scoped SELECT grants. COR uses the receiving semester; COG uses the recorded preceding completed semester and its academic year. Missing/conflicting coverage, stale context, later placement changes and disabled scopes block processing. All 38 suites passed, including 193 unit tests and recovery checks. No semester provisioning or scope activation is exposed yet; the Phase 06 acceptance gate remains open.

Fifth increment (validation recorded 2026-10-07): Coordinator can save disabled semester setup from an accepted continuing roster; Staff can view it. Authority and COR/COG policy are recorded once per roster/semester. Migration 33 adds Coordinator-only authorization, with append-only policy/scope runtime access. Existing business data/schema were preserved. Browser checks and all 38 UAT suites passed, including 193 unit tests and recovery checks. Controlled activation, semester provisioning and Staff receiving integration remain pending; saving setup does not create receipts or eligibility.

Sixth increment (2026-10-07): Coordinator enable/disable appends scope revisions with review, authorization/configuration checks, atomic audit and safe retries. Disabling requires a reason. Stale/concurrent changes and reactivation with existing semester records are blocked appropriately. Current setup is shown first; history is collapsed. Six roster database scenarios, browser checks and all 38 UAT suites passed, including 193 unit tests and recovery verification. No migration, permission change or operational activation occurred. Student provisioning and Staff receiving remain pending.

Seventh increment (2026-10-07): accepted continuing scholars now open semester receiving directly. Enabled setup automatically prepares separate, explicitly covered COR/COG records without annual admission history. Routine receiving keeps optional details collapsed, preserves the working period through academic navigation, and provides academic-context blockers before verification. Transaction, duplicate, authority, permission and disabled-history checks passed. Runtime gains append-only semester/revision/coverage access; no migration or operational scope activation occurred. All 38 suites passed, including 193 unit tests and backup/restore; all 423 recorded source/build hashes verified. Evidence: `output/workflow-phase06/provisioning-uat/F36-report.json` and `output/playwright/phase06/provision-*`. Semester-context capture and successive-period acceptance remain pending.

Eighth increment (2026-10-07): semester academic details reuse authoritative placement and append revisions when missing category or updated placement is recorded. Same-course category carries forward with provenance; year level never advances automatically. Changed-course/category and dependent-review/entitlement cases require controlled review. Successive-period tests preserve old checklists/revisions and create only unsubmitted new documents. Eight roster scenarios, browser checks and all 38 regression suites passed, including 193 unit tests and backup/restore. All 427 source/build hashes verified. Frozen evidence: `output/workflow-phase06/academic-context-uat/F36-report.json`. No migration or operational activation occurred. Remaining Phase 06 work is controlled-correction/recovery and final usability follow-up.

Ninth increment (2026-10-07): Coordinator can correct a category recording error for unchanged academic placement using evidence and an explicit review confirmation. A new revision preserves the original category, and the action cannot bypass locked scopes, dependent records or course-shift policy. Staff can read the correction history but cannot perform it. Database and browser checks and all 38 regression suites passed, including 193 unit tests and encrypted backup/restore. All 429 source/build hashes verified. Frozen evidence: `output/workflow-phase06/category-correction-uat/F36-report.json`. No migration, permission change or operational data edit occurred. Used-scope recovery and dependent-record reconciliation remain open.

Tenth increment (2026-10-07): Coordinator can recover disabled setups containing existing records after unchanged-policy, authority, coverage, period and dependency checks. Recovery appends authorization for the original immutable scope IDs; it never reassigns existing owners or resets receipts. Repeat disable/recovery and Staff receiving passed database/browser checks. No migration, permission or operational data changes occurred. All 38 regression suites passed, including 193 unit tests and encrypted backup/restore. All 434 source/build hashes were independently verified. Frozen evidence: `output/workflow-phase06/scope-recovery-uat/F36-report.json`. Ended/locked periods, changed policy and dependent financial/review records remain restricted for controlled reconciliation.

- [x] Show year level, school, course, working semester, and individual document statuses prominently. Compliance and entitlement statuses remain later phases.
- [x] Automatically provision applicable individual requirements for accepted continuing scholars under enabled Coordinator setup.
- [x] Keep COR and COG separate and label each document's coverage period.
- [x] Reuse receipt, correction, resubmission, permission, and audit behavior.
- [x] Carry period context between related actions and ask only for missing/changed information.
- [x] Complete the final technical blocker/acceptance review. [Review and scope boundaries](LDSS_WORKFLOW_PHASE06_ACCEPTANCE.md): receiving and successive-period preservation pass. Missing academics link to the correct year; Coordinator correction/recovery preserve history. Changed-course/policy, ended-period recovery and dependent-record reconciliation remain explicitly restricted follow-ups. Human production acceptance remains pending.
- [x] Prepare new-period records only for authorized continuing scholars; do not copy prior receipts as new submissions. Successive-period database checks preserve earlier checklists and academic revisions.

**Acceptance gate:** Staff can receive COR alone without changing COG. New-period preparation leaves earlier semesters untouched.

## Phase 07 - Add academic compliance beside document verification

- [x] Record the applicable average and approved school grading scheme, including native-scale equivalencies. Coordinator policy is recorded once per cohort/semester/school; unknown rules require review.
- [x] Record failed, dropped, and incomplete findings, enrollment, and required load. Unknown is distinct from No; clean COG uses one explicit subject-findings choice.
- [x] Link reviews to exact COR/COG event, coverage and placement versions; changed evidence makes the current assessment stale.
- [x] Derive compliance on the server from verified evidence and approved rules; no Staff result/eligibility toggle and no automatic scholarship-status decision.
- [x] Append updated findings after corrected/reverified COG for INC resolution; preserve the original review. Verified failed/dropped findings remain for controlled authorized review, without automatic exception.
- [x] Implement controlled current-period grading-rule replacement with Coordinator impact review, immutable lineage, stale-assessment detection and cohort-wide entitlement protection. Database/browser checks and all 38 suites passed; 221 unit tests and all 447 source/build hashes verified.
- [x] Implement Coordinator-only ended-semester academic review with verified separate COR/COG, a semester-covering grading rule, explicit academic-only confirmation and preserved history. Database/browser checks and all 38 regression suites passed; 227 unit tests and all 451 source/build hashes verified. Locked/archived periods, expired authority and dependent entitlements stay blocked. This action does not authorize late payment.
- [x] Implement Coordinator-only failed/dropped recording-error correction with exact affected review/field links, verified current evidence, reason/confirmation, preserved originals and independent handling of later adverse findings. Database/browser checks and all 38 regression suites passed; 233 unit tests and all 456 source/build hashes verified.
- [x] Implement controlled expired/conflicting grading-policy recovery with explicit history resolution, current authority, cohort-wide dependency checks and mandatory reassessment. Database/browser checks passed.
- [x] Finish the final Phase 07 integration review and regression gate. All 38 suites, 241 unit tests and 458 source/build hashes passed. [Completion review](LDSS_WORKFLOW_PHASE07_COMPLIANCE.md); frozen evidence: `output/workflow-phase07/final-uat/F36-report.json`. Human acceptance and broader rollout remain separate. No INC deadline or retroactive payment rule is invented.

Core delivery: [Phase 07 report](LDSS_WORKFLOW_PHASE07_COMPLIANCE.md). Database/browser checks and all 38 regression suites passed, including 215 unit tests and encrypted backup/restore. All 442 source/build hashes were independently verified. Frozen evidence: `output/workflow-phase07/compliance-uat/F36-report.json`. No schema migration or operational scholar/financial data change; local runtime gains append-only review access. Phase 08 eligibility is not yet connected.

| Finding | Result |
| --- | --- |
| Required evidence verified and applicable conditions met | Compliant |
| Missing/unverified evidence | Pending review/compliance |
| Failed/dropped subject, unresolved INC, or unmet maintenance condition | Noncompliant; payout blocked |
| Unknown equivalency or unresolved policy issue | Review required; no automatic eligibility |

**Acceptance gate:** A verified COG with unresolved INC does not establish normal eligibility. Resolution preserves the earlier evidence and decision.

## Phase 08 - Connect eligibility and semester entitlements

First increment: [read-only eligibility comparison and recovery](LDSS_WORKFLOW_PHASE08_ELIGIBILITY.md). Current academic findings are compared with actual legacy normal, override and saved results. Accepted continuing baselines need no fabricated annual admission. All 38 regression suites passed, including 254 unit tests and encrypted backup/restore; all 465 source/build hashes verified. Entitlement creation and financial integration remain open.

- [x] Compare the new calculation with the existing calculation on test records without authorizing payments through the new path.

The pending work below supersedes the earlier entitlement-only next-step ordering. Completed preview evidence remains historical; it does not establish that deadlines, automatic candidates, payroll-form previews or allocations are implemented.

### Integrated checkpoint sequence

These are sub-checkpoints of the existing phases, not new F-functions or a second tracker. Checkpoint A is technically complete; B1 is in progress; later checkpoints and all human acceptance remain pending.

| Checkpoint | Owning phase | Deliverable | Dependency / gate | Implementation | Human acceptance |
| --- | --- | --- | --- | --- | --- |
| A | 08 | Regular payout periods, semester/batch submission windows and extensions | Authorized; encrypted backup/verified restore and preservation passed | Technically complete; 39 suites and 476 hashes passed | Pending |
| B1 | 08 | Enrollment alternatives, receipt timing, official-membership bridge and shared eligibility | A passed; all three timing/membership decisions confirmed | In progress; timing decisions passed 41 suites; continuing membership/shared eligibility integration open | Pending |
| B2 | 08 | Automatic candidates, deferrals and live draft payroll-form preview | B1; approved pending-case guard | Not started | Pending |
| C | 08 | Semester entitlements, reservations and atomic payroll allocation/finalization | B2; standing/legacy financial reconciliation | Not started | Pending |
| D | 09 | Approved payroll preview/export, routing and individual release | C; actual routing/signatory decisions | Not started | Pending |
| E | 12 | Shared reporting, end-to-end checks and acceptance of this payroll scope | A-D; relevant unresolved dependencies resolved or explicitly restricted | Not started | Pending |

Phase 10 and Phase 11 retain their original scope and are not marked complete by A-E. E may validate the delivered payroll scope before the broader Phase 12 release gate; it does not bypass those remaining phases or authorize production deployment.

### Assessment baseline and reuse map - 2026-10-07

The first pass inspected source, migrations, live schema metadata and the actual DOCX. Read-only database connection, all 33 migration checksums and restricted-grant checks passed. At that assessment the local database contained 2 payout cycles, 7 payroll batches, 5 finalizations, 2 payment records and no operational scholar-semester/entitlement rows. No semester had multiple cycles, but the schema permits them. These are dated observations, not migration assumptions. The preceding 38-suite archive includes verified backup/restore; no fresh restore or implementation test ran during the read-only assessment.

| Reuse existing source / records | Confirmed behavior and integration gap |
| --- | --- |
| `server/configuration/{service,validation}.ts`; `academic_years`, `semesters` | Versioned dates/locks exist; regular term 1/2 identity and scholarship deadline controls do not. |
| `server/payouts/{service,validation,closure}.ts`; `payout_cycles`, `payout_cycle_versions` | Cycles belong to semesters; target date is not a submission deadline. Lock/close affects requirements and processing, so must not represent cutoff expiry. |
| `server/continuing/{semester-setup,semester-receiving}.ts`; `SemesterReceivingService.provision` | Automatically provisions one semester-owned checklist with individual COR/COG records. Existing legacy checklist ownership blocks duplicate provisioning; migration requires review, not silent replacement. |
| `server/requirements/{semester-context,receipt-service,workflow-service,workflow-state,waiver-service}.ts` | Separate receipt/verification/correction histories; physical date and system timestamp. No deadline or controlled late-encoding decision. Enrollment-certificate alternatives are not explicit. |
| `server/continuing/{semester-compliance,compliance-engine}.ts`; `loadSemesterCompliance` | Exact evidence and policy versions, grades/load/enrollment and correction links are checked. Ended academic-only reviews must not become automatic late-payment approvals. |
| `server/eligibility/{service,engine,override-service}.ts`; `eligibilityView` | Legacy standing/masterlist/cycle-document checks. New academic compliance and semester ownership must join the same authoritative financial assessment. |
| `server/continuing/semester-eligibility-{engine,preview}.ts` | Read-only comparison is not payroll authorization. Its broad existing-history and ended-period blockers require controlled reconciliation, not copying into automatic candidate rules unchanged. |
| `server/masterlists/{service,workflow-service}.ts`; publication/amendment records | Official membership currently depends on annual records. Accepted continuing rosters must not acquire fabricated qualification history or silently bypass official membership. |
| `server/ovr/{service,rules,amendment-service,amendment-state}.ts`; `validateOvr`, `effectiveRoster` | Reusable batch review, finalization, hashes and amendments. Entry/payment ownership is annual-record-based; current duplicates are cycle-scoped; individual additions remain manual. |
| `server/ovr/{processing-service,payment-correction-service}.ts`; `payment_records` | Individual payment evidence and reconciled closure exist. Generic submission/processing does not prove office-by-office routing; approved fixed amounts are not yet enforced. |
| `server/authorization/service.ts`, `configuration_guard`, command tables, `audit_logs` | Reuse permission checks, ordered locking, expected versions, idempotency and atomic audits. Staff's `ovr.prepare` alone must not authorize opening submission windows. |
| `server/reports/service.ts`, `server/dashboard/service.ts`, `server/exports/service.ts` | Shared report queries and audited exports exist. Extend them with the same candidate/allocated-row projection; sample-form payroll generation is missing. |

### Checkpoint A - Semester payout periods and submission windows

- [x] Map academic year + regular term number 1/2 to existing semesters and canonical payout cycles, with uniqueness checks. Do not destructively remove other academic calendars or guess ambiguous legacy mappings.
- [x] Add versioned semester final deadlines and batch opening/cutoff records attached to existing payroll batches; generate sequential batch numbers under a transaction, without reusing historical numbers.
- [x] Enforce Coordinator-only open/set/extend actions in backend commands; Staff/Admin cannot extend or open managed submission windows through legacy create routes.
- [x] Apply `Asia/Manila` consistently. A date-only deadline includes the whole local day: 2026-10-15 ends at the exclusive boundary 2026-10-16 00:00 +08:00 / 2026-10-15 16:00 UTC. Compare with `< boundary`; do not round to 23:59:59.
- [x] Require batch cutoff <= semester final deadline. Extension appends old/new values, actor, timestamp and reason; never updates finalized snapshots.
- [x] Derive Scheduled/Open/Cutoff reached on the backend independently of Draft/Review/Finalized/Submitted/Processed/Closed. Neither frontend visibility nor a scheduler alone enforces the cutoff.
- [x] Keep legitimate verification, payroll routing, payment and reconciliation available after submission cutoff; existing final financial locks remain separate.

**Gate:** Correct term mapping and Manila boundaries, concurrent numbering/extensions, permissions and unchanged legacy financial processing are verified. Receipt/candidate enforcement is completed in B1/B2 before the managed workflow is enabled operationally.

**Checkpoint A evidence:** [Delivery and recovery](LDSS_WORKFLOW_PHASE08_WINDOWS.md). All 39 suites passed, including 259 unit tests and encrypted backup/restore; 34 migrations and all 476 recorded source/build hashes verified. Frozen report: `output/workflow-phase08/windows-uat/F36-report.json`. New managed batches remain setup-only; later verification/financial integration is not claimed complete. Changed academic configuration and ambiguous mappings require review; mapping correction is not implemented. Human acceptance pending.

### Checkpoint B1 - Document timing and authoritative eligibility

Current increment: [receipt timing and late-encoding decisions](LDSS_WORKFLOW_PHASE08_TIMING.md), following the [receipt-evidence foundation](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md), regular-semester predecessor validation and [enrollment alternatives](LDSS_WORKFLOW_PHASE08_DOCUMENTS.md). Coordinator setup automatically selects the mapped regular predecessor; managed COG commands reject conflicting coverage without moving historical documents. Unmapped legacy setups retain their existing coverage path. [Coverage evidence and limits](LDSS_WORKFLOW_PHASE08_COVERAGE.md). The user confirmed all three decisions on 2026-10-07: Coordinator may approve claimed on-time receipt encoded late using evidence and a recorded decision; Staff may record custody after cutoff without qualifying for that closed cutoff; accepted continuing rosters may support a Coordinator-reviewed, published official masterlist without fabricated exam/selection history. These decisions authorize implementation, not automatic timing approval, publication or payment.

- [x] Support one enrollment obligation satisfied by COR OR Certificate of Enrollment, plus the applicable COG. Preserve individual documents and record the actual enrollment document type; do not introduce a generic completion checkbox.
- [x] Preserve explicit current-enrollment/prior-completed-semester grades coverage for mapped regular semesters. Validate the selected predecessor; earlier end date alone does not prove the correct immediately preceding semester. Restrict unresolved calendars/admission alternatives. Unmapped legacy compatibility is retained without automatic regular adoption or financial authorization; mapping correction/reconciliation remains restricted.
- [ ] Reuse automatic semester provisioning. Preserve valid evidence across batches; create separate obligations next semester with no carried-over satisfaction.
- [x] Preserve existing date-only physical receipt precision and the automatic system timestamp in current original/replacement evidence. Do not invent timestamps for historical date-only receipts or use verification dates as receipt dates. No physical time-of-day input was added; timing decisions and cutoff enforcement remain separate pending work.
- [ ] Complete authoritative cutoff integration in shared eligibility and financial commands. Initial receipt, batch receipt and resubmission now derive and audit timing against managed cutoffs; backdated editable dates require evidenced review and physically late replacements do not inherit earlier approval. Managed financial activation and broader ended-scope custody integration remain pending.
- [x] Implement the approved late-encoding procedure for available managed semester workflows: claimed physical timing + receiving-log/dated-acknowledgment evidence, automatic server recording time, Coordinator approve/reject decision and immutable history. Decisions bind to the current paper and cutoff/deadline versions; replacements and changed sources cannot inherit stale approval. Timing approval does not verify the document, waive academic rules or reopen finalized payroll.
- [ ] Establish the approved continuing-scholar official-membership/standing bridge without fake annual exam/selection records. Preserve current masterlist and admission checks where applicable.
- [ ] Integrate semester academic compliance, authoritative admission/standing/masterlist evidence and scoped exceptions into the existing eligibility service. Keep legacy historical calculations reproducible; do not create a competing financial eligibility engine.
- [ ] Preserve waiver/override scope. Neither automatically waives deadlines, academic evidence, duplicates or financial locks. Unresolved waiver-to-academic-evidence rules require review.
- [ ] Return source versions/hashes and reason codes usable by individual views, candidate lists, counters and finalization. Missing or stale evidence never implies eligibility.

**Gate:** Timing and document coverage are explainable, all command paths enforce the same rules, and the membership/eligibility integration cannot bypass existing safeguards.

**Enrollment increment evidence:** [Delivery and recovery](LDSS_WORKFLOW_PHASE08_DOCUMENTS.md). All 40 suites, 262 unit tests, Staff browser replacement/verification flow, encrypted backup/restore and 482 source/build hash checks passed; 35 migrations. Archived report: `output/workflow-phase08/documents-uat/F36-report.json`. This validates the first B1 item, not the whole B1 gate.

**Regular-coverage increment evidence:** [Delivery and limits](LDSS_WORKFLOW_PHASE08_COVERAGE.md). All 40 suites, 270 unit tests across 47 files, Coordinator browser flow, encrypted backup/restore and 486 independently verified source/build hashes passed. No migration or permission change; 35 migration checksums unchanged. Archive: `output/workflow-phase08/coverage-uat/F36-report.json`. This validates the scoped second B1 item. Timing, official membership, shared eligibility and human acceptance remain open.

**Receipt-evidence increment:** [Delivery and limits](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md). 276 unit tests across 48 files, lint/typecheck/build/secrets, requirement-workflow and continuing-roster MariaDB suites, and Staff browser checks passed. All 35 migration checksums are unchanged. Scoped manifest: `output/workflow-phase08/receipt-evidence-validation.json`. The preceding coverage UAT archive is historical evidence, not a full UAT run for this increment.

**Timing increment:** [Implementation, controls and recovery](LDSS_WORKFLOW_PHASE08_TIMING.md). Individual/batch receipt and resubmission now derive/audit per-batch timing without blocking custody merely because cutoff passed. Coordinator-only, evidence-backed decisions preserve original receipt and deadline snapshots. Local additive migration, Coordinator/Staff browser checks, all 41 suites and 501 independent source/build hash checks passed; 36 migrations. Frozen evidence: `output/workflow-phase08/timing-uat/F36-report.json`. Managed financial activation and the overall B1 gate remain pending.

### Checkpoint B2 - Automatic candidates and current payroll preview

- [ ] Derive proposed eligible, unallocated candidates automatically from B1; no individual checklist-generation, cycle-per-scholar, manual eligibility toggle or separate queue-add action.
- [ ] Refresh authoritative results after receipt, verification, correction, standing or approved-exception changes and on page refresh. Reads must not create entitlements or approvals.
- [ ] Display complete on-time submissions awaiting verification after cutoff; distinguish partial, correction, late, deferred and allocated cases without losing their history.
- [ ] Enforce the approved pending-case finalization guard: complete review OR Coordinator-recorded deferral with reason. Do not silently omit on-time pending scholars. If no later batch exists before the final deadline, show the unresolved disposition explicitly.
- [ ] Reuse valid semester documents in later batches even when received before the later window opens. The opening date must not force resubmission.
- [ ] Add **Preview payroll** for the selected current batch using the actual sample layout. Before finalization, show a live **DRAFT - NOT APPROVED** preview of eligible proposed rows, proposed amounts and totals; show pending/excluded cases separately with reasons.
- [ ] Use the same candidate query for the preview and list; include its as-of time and source revision. Refresh a stale draft rather than implying it is approved. Unknown Award Number, school/year or amount data must be visible, never fabricated.
- [ ] Reuse the preview renderer in D. Viewing a draft is read-only and does not reserve a scholar, create an entitlement, record approval or record payment. No separate OVR form.
- [ ] Keep Staff's normal path: Find scholar -> selected/current semester requirements -> Receive -> Verify -> eligibility and next action. Keep optional detail collapsed; significant exceptions require explanations.
- [ ] Coordinator path: academic year/semester -> open batch/cutoff -> automatic proposed payroll -> pending decisions -> finalize -> routing -> next batch. Show both semester deadline and selected batch window.
- [ ] Label counters by dimension: received, verified, timing, eligibility, candidacy, allocation, processing and payment. Overlapping populations must not appear to be mutually exclusive totals.

**Gate:** Candidate membership and draft preview agree, the sample layout is visually checked with synthetic data, pending cases remain accounted for, and no financial record is created by previewing.

### Checkpoint C - Entitlements and atomic payroll allocation

- [ ] Establish one full PHP 5,000 degree entitlement per eligible scholar-semester using existing `semester_entitlements`; exclude undecided non-degree benefits and unauthorized supplemental payments.
- [ ] Reconcile legacy requirements/standing/batches/payments before activation. Extend existing payroll entry/payment ownership to accept semester entitlements without duplicating batch tables or inventing annual admission records.
- [ ] Add database-enforced unique active entitlement allocation across all batches/cycles for the semester; legacy manual-add and amendment paths must honor it as well.
- [ ] On review submission, atomically create provisional reservations for eligible proposed members. Viewing/opening a draft creates no reservation. Permit competing draft previews but reject conflicting reservations with a clear stale/conflict result.
- [ ] Preserve the existing separate submitter/finalizer safeguard. Opening a submission window does not count as submitting the payroll for approval.
- [ ] Return-to-Draft releases provisional reservations through recorded history. Define approved cancellation/amendment release rules before allowing reallocation; never delete allocation history.
- [ ] Finalization rechecks deadline versions, exact document/review/standing/membership sources, exceptions, pending-case dispositions and allocations. A changed candidate set requires renewed review rather than silent inclusion or omission.
- [ ] Freeze membership and full payroll data, convert reservations to finalized allocations, and commit approval, audit and retry receipt atomically. Any required validation failure leaves no partial finalization.
- [ ] Newly eligible scholars stay out of finalized payrolls and remain candidates for a subsequent batch. Amendments use existing controlled review, source validation and immutable versions.
- [ ] Already allocated, paid or unclaimed entitlements cannot enter another ordinary payroll. Preserve cross-path duplicate-release protection when D connects actual payment.
- [ ] Preserve valid earned final-semester entitlement after graduation; distinguish ordinary on-time review completion from academic-only late review. Preserve closed payroll and historical calculations.

**Gate:** Concurrent finalization has at most one valid allocation winner; retries are stable; stale/audit/constraint failures roll back completely; original payrolls and earned final-semester rights remain intact.

**Acceptance gate:** Eligibility is explainable and cannot be manually toggled by Staff. Graduation does not erase a valid final entitlement. Old payments are not reinterpreted automatically.

## Phase 09 - Strengthen payout approval and release

Extend the existing payroll batch workflow. User clarification: Payroll is the only generated payout form; no separate OVR form or duplicate OVR preparation step. Existing internal batch identifiers and historical records remain compatible.

Template: `C:\Users\ADMIN\Downloads\payroll sample.docx` (reviewed 2026-10-07). Landscape 13 x 8.5 inches; award number, separate name columns, school, year levels I-V, amount, signature/date received, per-page totals and certification blocks. Use authoritative semester placement and approved amounts; do not copy sample scholars, year-level marks, hard-coded totals, officials or signatures into generated records. Exact print layout validation and configurable signatories remain part of payroll generation.

### Checkpoint D - Approved payroll preview, routing and release

- [ ] Reuse B2's renderer for an **Approved payroll** preview sourced only from C's exact approved snapshot or an approved amendment version. Make the displayed version explicit; subsequent live profile/policy/deadline edits cannot change that version.
- [ ] Generate only the payroll payout form using the supplied sample. Export approved roster/amount versions, calculated page totals and blank collection signatures. Audit the requester, snapshot version/hash, file hash, time and scope before download; audit failure blocks export.
- [ ] Map and visually verify the real DOCX's header/body merged-cell structure and pagination; do not infer a new field from its blank cells or hard-code its example per-page total.
- [ ] Confirm routing offices, permitted transitions, actors and return/resolution paths. Reference PDF page 5 describes Financial processing -> Accounting check -> Treasury check -> Approval signature -> Ready for release; existing code only records Submitted/Processed. Treat the document as a reference, not proof of approved institutional authority.
- [ ] Attach current routing stage, forwarding/receipt and issue-resolution events to existing batches. Batch 001 proceeds independently while Batch 002 receives submissions; cutoff expiry must not stop legitimate processing or release.
- [ ] Coordinator approval and Staff payment recording remain separate. Prefill the approved amount; block arbitrary partial degree payments and unauthorized representative collection.
- [ ] Keep forwarded, processed, approved/ready for release, released, withheld, unclaimed and closed facts distinct. Batch processing must not mark every member paid.
- [ ] Record individual release evidence and its actual recipient/releasing officer separately from the encoder; preserve existing corrections and original payment records.
- [ ] Link releases to approved entitlement/allocation evidence and enforce cross-batch/cycle duplicate protection. Unclaimed outcomes retain the existing entitlement and allocation.
- [ ] Reconcile every member, entitlement, payment/correction and unresolved outcome before closure. Coordinate broader semester-closing and graduation behavior with Phase 10.

### Payroll sample field mapping

| Sample content | Planned source / restriction |
| --- | --- |
| Academic year, semester and batch heading | Approved period/batch snapshot; draft preview labels its current proposed context. |
| Award number | Meaning requires confirmation; never assume it is the permanent Scholar ID. |
| Last, first and middle names | Separate identity fields frozen at approval, not a later live name lookup. |
| School | Authoritative semester placement frozen in the payroll snapshot. |
| Curriculum year I-V | Reviewed semester year level; unknown/out-of-range mapping requires resolution. No automatic annual advancement. |
| Amount | Approved entitlement amount; draft proposed value clearly marked unapproved. |
| Signature and date received | Blank on the release form; never fabricate a signature or pre-certify payment. |
| Page counts and totals | Derive from that page's approved rows, not sample constants. |
| Four certification blocks | Confirm signatory names/titles and template wording; freeze the selected version. Sample officials are not automatic current authorities. |

### Proposed compatibility structures for A-D

Reuse existing period/batch identities and add supporting records. Checkpoint A has added regular-period mappings and immutable deadline/window tables; see its delivery report. The remaining names/schema below are design targets subject to their checkpoint's migration review.

| Change | Required invariant |
| --- | --- |
| Regular-period mapping | Unique academic year + term 1/2; one mapped semester/canonical cycle. Existing extra/ambiguous cycles remain explicit legacy records. |
| Semester policy and batch-window versions | Immutable prior deadlines, opening/cutoff precision/timezone, revision, actor and extension reason; no historical guessed values. |
| Receipt timing evidence and decisions | Original physical precision plus server timestamp; late encoding/corrections linked to exact receipt/resubmission and approval evidence. |
| Candidate dispositions | Deferred case links scholar-semester, batch, reason, decision authority and source versions; no mutable Staff eligibility queue. |
| Existing entitlements plus allocation identity/events | Unique scholar-semester benefit and one active reservation/allocation per entitlement; append-only transitions preserve prior claims. |
| Existing entry/payment ownership bridge | Legacy annual owner or validated semester-entitlement owner, with consistent scholar/semester relationships and financial guards on every path. No parallel payroll module. |
| Extended finalization snapshots and routing events | Frozen payroll fields/amounts and approved version; office events linked to the same existing batch. |

### Policy decisions before dependent implementation

These are proposals/restrictions, not decisions silently approved by merging this plan.

| Decision | Recommended safe treatment / checkpoint |
| --- | --- |
| Continuing roster versus official masterlist | Confirmed 2026-10-07: accepted continuing rosters may support Coordinator-reviewed, published official membership without fabricated annual qualification. Preserve review/publication controls. B1 implementation pending. |
| Physical on-time receipt encoded after cutoff | Confirmed 2026-10-07: Coordinator may approve using a receiving log or dated acknowledgment, with evidence and recorded decision. Preserve both dates and original claim; approval does not verify documents or approve payment. B1 implementation delivered and validated; financial integration pending. |
| Corrected document after cutoff | Consider a later batch unless a scoped exception is approved; earlier invalid document does not satisfy timing. B1/B2. |
| Pending on-time review | Finish review or explicit Coordinator deferral; guard requires approval. B2. |
| Overlapping submission windows | Resolved 2026-10-07: user chose sequential non-overlapping windows while financial processing may overlap. Enforced in A. B2 must not confuse opening dates with a minimum receipt date or discard valid earlier evidence. |
| Extension effects on previously late/pending documents | Apply explicit scope to unfinalized work; preserve original timing classifications and finalized snapshots, with renewed review where required. A/B1. |
| No open batch / semester deadline passed | Confirmed 2026-10-07: Staff may record custody after cutoff, without eligibility for that closed cutoff; consider later batches only where permitted. Cutoff custody classification is implemented. Preserve final locks; after-semester-end/locked-period command handling and shared eligibility still need integration. |
| Preceding grades for irregular calendars, summer terms, leave, first-year scholars | Explicit coverage/admission evidence review; no nonexistent college COG or inferred period. B1; Phase 11 for new admission. |
| Waived documents and academic evidence | Preserve waiver scope; define what evidence supports academic assessment. No implicit deadline/duplicate exception. B1. |
| Finalized cancellation/reallocation | No general cancellation is currently implemented; require approved policy, amendment history and payment checks. C. |
| On-time work completed after semester end | Reconcile with academic-only review safeguards; do not invent retroactive payout authority. C; Phase 10. |
| Office ownership, return paths, signatories and Award Number | Confirm against actual practice/sample before enforcement or official export. D; unresolved fields visible in B2 draft preview. |

### Migration and recovery for A-D

- Add forward-only migrations and narrowly scoped grants; never edit applied migrations or existing permissions to grant Admin scholarship authority.
- Before authorized migration, verify a fresh encrypted backup/restore in isolation. If health/restore fails, report the blocker; do not repair shared system tables or reset the database as part of this feature.
- Inventory legacy cycles, checklists, memberships and payments again at migration time. No guessed deadlines, duplicate records, silent checklist merging or rewritten official/financial snapshots.
- Keep the managed workflow disabled until its period/cohort mapping, dependent policy decisions and migration checks pass. Mark unavailable historical deadlines explicitly unknown.
- Update old entry points as well as new ones so manual-add, amendments, receipt and payment APIs cannot bypass deadlines or allocation guards.
- Preserve all document versions, published masterlists, original finalizations, amounts, references, release/correction records and audits; compare them before/after migration on a restored copy.
- Before new business data exists, a compatible code rollback can disable the new path. Once reservations/entitlements/routing records exist, use a forward fix or disable commands: older code must not ignore new allocation protection. Never restore over later operational work merely to remove a feature.

**Acceptance gate:** Actual payment cannot silently differ from the approved amount, and every batch member is accounted for.

## Phase 10 - Extend changes, decisions, graduation, and closing

- [ ] Reuse controlled requests, approvals, and official amendments.
- [ ] Capture prior-approval evidence for school transfers/course shifts.
- [ ] Enforce approved shift restrictions consistently across ordinary and official-amendment paths.
- [ ] Keep subject dropping, withdrawal, leave, suspension, and termination distinct.
- [ ] Block payout on verified noncompliance without automatically terminating scholarship.
- [ ] Record graduation and stop future semester preparation while preserving approved final entitlements.
- [ ] Add semester-wide closing checks and authorized handling of unresolved cases.

**Acceptance gate:** Decisions remain attributed, placement history stays reconstructable, and future participation is controlled without rewriting earned entitlements.

## Phase 11 - Complete the new-applicant journey

Proposed path, subject to approved policy sequence:

**LGU examination -> initial requirements -> interview -> qualification/selection -> agreement/notarization -> authorized admission.**

- [ ] Resolve the examination-order policy difference before enforcing this sequence.
- [ ] Record examination results and interview decisions without invented interview scores or selection formulas.
- [ ] Keep selection distinct from passing the examination.
- [ ] Record final documents, notarized agreement, and authorized admission evidence.
- [ ] Reuse document/review/history services from earlier phases.
- [ ] Present a single applicant workspace with the next permitted action.

**Acceptance gate:** Passing alone cannot activate an applicant. Admission requires the approved evidence and decision sequence.

## Phase 12 - Pilot, document, validate, and release gradually

### Checkpoint E - Payroll reports and end-to-end acceptance

- [ ] Extend `readOperationalReport` and `DashboardService` with the same B2/C authoritative projections used by candidate lists and payroll previews; reconcile counters at the same scope/source version.
- [ ] Show timing, verification, candidacy, deferral, allocation and payment dimensions without adding overlapping totals together as though they were exclusive.
- [ ] Extend existing receiving, eligibility, payroll/finalization/amendment, payment, export and concurrency suites; use disposable/restored databases, never destructive tests on operational records.
- [ ] Run Staff and Coordinator browser journeys including draft preview, pending decisions, approved preview/export and concurrent batch processing. Verify technical Admin remains restricted.
- [ ] Record exact source/migration/build evidence for the approved candidate, update diagrams/documentation to tested behavior, and obtain explicit human acceptance of the payroll scope.

### Required checkpoint test matrix

| Coverage | Cases / expected evidence | Owning checkpoint |
| --- | --- | --- |
| Regular periods | Two regular payout periods per year; independent requirements/deadlines; unique mapping; ambiguous historical mappings rejected | A, B1 |
| Windows | Sequential numbered batches; configurable duration; batch cutoff cannot exceed semester deadline; audited extensions and concurrent version rejection | A |
| Manila timing | Whole local deadline day; exact exclusive boundary; UTC conversion; date-only versus timestamp precision; backend enforcement without scheduler | A, B1 |
| Enrollment/grades | COR or enrollment certificate satisfies one obligation; prior completed semester COG; invalid/missing coverage and unresolved alternatives blocked | B1 |
| Receipt/verification | Complete on-time documents verified before or after cutoff; receipt alone not eligible; partial submission completed after cutoff | B1, B2 |
| Corrections/late encoding | Replacement after cutoff cannot borrow old invalid receipt; backdating cannot bypass cutoff; approved/rejected late encoding preserves evidence | B1, B2 |
| Semester reuse | Valid submissions reused in later batches even before their opening; no first-semester satisfaction carried to second semester | B1, B2 |
| Exceptions | Waivers/overrides cannot waive unrelated timing, academic, allocation or payment controls | B1-C |
| Pending cases | On-time pending verification requires completed review or explicit deferral; no silent omissions, including changed sources and missing later batch | B2, C |
| Draft preview | Actual sample layout; same candidates/counts/amounts as shared query; DRAFT - NOT APPROVED visible; missing data explicit; refresh after changes; reads cause no financial writes | B2 |
| Allocations | Same scholar proposed in two drafts; concurrent reservation/finalization; return/cancellation/amendment rules; already-paid and unclaimed scholars excluded from duplicates | C |
| Atomicity/history | Idempotent retry/double-clicks; stale version/source rejection; audit/constraint failure leaves no partial finalization; prior deadlines and snapshots unchanged | A-D |
| Approved preview/export | Frozen names, school/year, membership and approved amounts survive profile/deadline changes; amendment version explicit; page totals correct; blank signatures; audit failure blocks download | C, D |
| Independent processing | Batch 001 processes while Batch 002 receives; submission cutoff does not prevent permitted verification, routing, individual release or reconciliation | A-D |
| Release/closure | Approved full amount, separate actual payment evidence; no automatic batch-wide paid action; withheld/unclaimed protected; graduation preserves earned final entitlement | C, D; Phase 10 integration |
| Permissions | Staff/Admin denied Coordinator window/extension/deferral/finalization actions, including legacy API bypass attempts | A-D |
| Reports/UAT | Shared lists, counters, previews, reports and dashboard reconcile; Staff/Coordinator acceptance separately recorded from automated success | E |

Existing reuse targets include `scripts/test-semester-coverage-scenarios.ts`, `scripts/test-semester-eligibility-scenarios.ts`, `scripts/test-ovr-finalization-scenarios.ts`, `scripts/test-ovr-processing-scenarios.ts`, amendment/report/export database suites and the concurrency/UAT gates. Test names may retain internal `ovr` compatibility identifiers; user-facing forms remain Payroll.

**Checkpoint E gate:** All approved A-D scope has passing exact-release evidence and explicit human acceptance. This does not itself close Phase 10/11 or authorize broader production rollout.

### Broader pilot and release gate

- [ ] Pilot with synthetic records, then an explicitly approved limited operational group.
- [ ] Staff tests receiving, review, and corrections.
- [ ] Coordinator tests decisions, exceptions, batches, and closing.
- [ ] Verify System Administrator technical access still does not grant scholarship approval.
- [ ] Update diagrams, README, and delivery documentation to describe tested behavior.
- [ ] Run full regression/UAT checks and freeze exact release evidence.
- [ ] Obtain Coordinator and technical-owner acceptance.
- [ ] Enable new workflows by designated period/cohort with a documented recovery plan.

**Acceptance gate:** Ordinary tasks require no unnecessary repeated input/navigation; historical records remain intact; the exact candidate is accepted before production use.

## Protection rules for every phase

1. Deliver one independently reviewable release at a time.
2. Use additive changes first; do not broadly rename existing statuses.
3. Never delete or silently convert historical records.
4. Never fabricate approvals, signatures, grades, or unknown history.
5. Preserve backend permissions, atomic audits, idempotency, version checks, and official snapshots.
6. Keep routine receiving simple and individual document records separate.
7. Do not run destructive tests against operational data.
8. Document compatibility and rollback for each release. A source rollback is not automatically safe after new data structures are used.
9. Once new operational records exist, prefer disabling new entry points and applying a corrective release over restoring a backup that discards later work.
10. Record acceptance separately from implementation and automated test success.
11. For merged checkpoints A-E, implement the authorized checkpoint, verify it, report outcomes and stop before the next checkpoint. A and then B1 were authorized after the merge; unresolved policy choices, human acceptance and B2-E remain separate.
12. Maintain this file as the single active workflow tracker. Other delivery documents preserve evidence; record future scope/status changes here rather than starting another competing plan.

## Progress log

| Date | Phase | Work performed | Validation / evidence | Decision / next step |
| --- | --- | --- | --- | --- |
| 2026-10-05 | Planning | Saved the agreed step-by-step proposal and tracker. No application/database implementation performed. | Documentation-only change. | Await authorization to begin Phase 01. |
| 2026-10-05 | 01 | Implementation authorized. Preserved source/previous evidence; created encrypted application backup; ran standalone checks. | 178 unit tests, lint, typecheck, build, secrets scan, and database checksum/grant checks passed. Restore failed: `mysql.global_priv` corrupt. | Phase 01 blocked on shared XAMPP account-table recovery; Phase 02 not started. See baseline report. |
| 2026-10-05 | 01 | Shared recovery authorized and performed; original application backup restored; baseline status-approval race defect repaired. | Seven account/grant integrity checks and five account probes passed; six grant-table hashes unchanged; 76 application tables unchanged; all 10 status scenarios passed. | Full UAT rerunning. Original source and failed-run evidence preserved. |
| 2026-10-06 | 01 / 02 | Recorded successful final baseline verification; began Phase 02 on user continuation. | 35 suites, verified encrypted restore, 390 matching source/build hashes, and post-suite system-table integrity checks passed. | Phase 01 technically complete; Phase 02 implementation underway. Host-generated artifact timestamps retained as evidence; this log uses the client date. |
| 2026-10-06 | 02 | Added atomic closure checks, mandatory roster-removal reasons, and profile summary refresh. | 35 suites including 188 unit tests, browser save/summary check, and backup/restore passed. | Technically complete; no migration or live business-data changes. [Details and recovery](LDSS_WORKFLOW_PHASE02_CONTROLS.md). Phase 03 next; human production acceptance pending. |
| 2026-10-06 | 03 | Specified journeys, independent state ownership, policy provenance, reusable authority, semester evidence, entitlements and additive data contracts. | Re-read supplied presentation/PDF; verified repository mappings and document links; application source hashes still match Phase 02. | [Specification](LDSS_WORKFLOW_PHASE03_SPECIFICATION.md) complete with explicit deferrals. No application or database changes. Phase 04 next. |
| 2026-10-06 | 04 | Added one forward migration with 16 dormant tables, no runtime grants/seeds/backfill; updated exact migration counts and added restored-copy regression. | Isolated partial-DDL/retry and preservation checks passed; local legacy data/schema unchanged; all 36 suites including 188 unit tests and backup/restore passed; frozen file hashes verified. | [Foundation report](LDSS_WORKFLOW_PHASE04_FOUNDATION.md). Phase 05 next. Human production acceptance remains pending. |
| 2026-10-06 | 05 | Delivered continuing-roster preparation, separate Coordinator decisions, immutable acceptance/authority evidence and profile notice; repaired save/detail-load retry behavior. | 37 suites, 188 unit tests, browser acceptance/profile/retry checks, verified backup/restore and frozen source/build hashes passed. Local business data unchanged. | [Delivery](LDSS_WORKFLOW_PHASE05_CONTINUING.md). Proceed to Phase 06; retain category/semester and shift-review integration items as open. Human production acceptance pending. |
| 2026-10-07 | 06 | Connected accepted continuing baselines to automatic semester provisioning and simple Staff receiving, with separate explicit COR/COG coverage and preserved legacy access. Applied append-only runtime grants; no new migration or operational activation. | Seven roster scenarios, Staff browser checks, 38 UAT suites including 193 unit tests and backup/restore; all 423 source/build hashes verified. [Delivery and recovery](LDSS_WORKFLOW_PHASE06_WORKSPACE.md). | Continue semester academic-context capture and successive-period preservation checks; Phase 06 and production acceptance remain open. |
| 2026-10-07 | 06 | Added versioned semester academic-context capture and same-course category carry-forward. Validated successive-period preservation without copying receipts or advancing year level. | Eight roster scenarios, Staff browser checks, 38 suites including 193 unit tests and backup/restore; all 427 hashes verified. [Delivery and recovery](LDSS_WORKFLOW_PHASE06_WORKSPACE.md). | Core receiving acceptance checks pass. Complete controlled-correction/recovery follow-ups before closing Phase 06; Phase 07 academic compliance follows. |
| 2026-10-07 | 06 | Delivered Coordinator-only category recording-error correction with immutable prior values, evidence and history. Routine Staff receiving is unchanged. | Category authorization, rollback, concurrency/retry, dependent-record and browser checks; all 38 suites including 193 unit tests and backup/restore passed; all 429 hashes verified. [Delivery and recovery](LDSS_WORKFLOW_PHASE06_WORKSPACE.md). | Next: controlled recovery of disabled setups with existing records. Dependent-record reconciliation remains restricted; Phase 06 stays In progress. |
| 2026-10-07 | 06 | Delivered Coordinator recovery of used disabled setups under unchanged document policy, preserving original ownership, coverage, academic history and receipts. | Authorization, rollback, concurrency/retry, repeat recovery, dependency and browser checks; all 38 suites including 193 unit tests and backup/restore passed; all 434 hashes verified. Evidence: `output/workflow-phase06/scope-recovery-uat/F36-report.json`. | Next: Phase 06 final integration/acceptance review, then Phase 07 academic compliance. Changed-policy, ended/locked-period and dependent-record reconciliation remain restricted. Human production acceptance remains pending. |
| 2026-10-07 | 06 / 07 | Completed Phase 06 technical integration review; implemented versioned academic compliance and reusable Coordinator grading rules beside existing receiving. | Phase 06 baseline: 38 suites, 434 hashes reverified. Phase 07: 215 unit tests, database concurrency/audit/evidence/INC checks and Staff/Coordinator browser checks passed. All 92 local application tables preserved during runtime grant update. | All 38 suites passed, including backup/restore; all 442 source/build hashes verified. Frozen evidence: `output/workflow-phase07/compliance-uat/F36-report.json`. Human acceptance, controlled Phase 07 follow-ups and Phase 08 eligibility remain. |
| 2026-10-07 | 07 | Added Coordinator grading-rule replacement with preserved versions, affected-record review and stale-assessment handling. Historical author display reads no longer participate in evidence/user lock deadlocks. | 221 unit tests; database role, lineage, stale/impact, cohort entitlement, audit rollback and concurrency checks; Coordinator replacement and Staff re-review browser checks passed. No migration, grants or operational record edits. | All 38 suites passed, including 221 unit tests and backup/restore; all 447 hashes verified. Frozen evidence: `output/workflow-phase07/grading-replacement-uat/F36-report.json`. Next: ended-period review and controlled failed/dropped recording-error reconciliation; expired/conflicting policies remain restricted. |
| 2026-10-07 | 07 | Added Coordinator-only ended-semester academic review with verified COR/COG, semester-covering grading rules, explicit academic-only history and preserved closed payroll. | 227 unit tests; database INC-resolution, roles, stale evidence, authority/coverage, locks/dependencies, audit rollback and concurrency checks; Coordinator/Staff browser checks passed. No migration, grant or operational record changes. | All 38 suites and backup/restore passed; all 451 hashes verified. Frozen evidence: `output/workflow-phase07/ended-review-uat/F36-report.json`. Next: controlled failed/dropped recording-error reconciliation and expired/conflicting-policy recovery, then Phase 08. Human acceptance pending. |
| 2026-10-07 | 07 | Added Coordinator-only failed/dropped recording-error correction with exact historical review/field links and recalculated compliance. Original reviews and independent later adverse findings remain protected. | 233 unit tests; database permission, evidence, partial-correction, lock/dependency, audit rollback, concurrent retry and ended-period checks; Coordinator correction and Staff follow-up browser checks passed. No migration, grant or operational data changes. | All 38 suites and encrypted backup/restore passed; all 456 hashes verified. Frozen evidence: `output/workflow-phase07/finding-correction-uat/F36-report.json`. Next: expired/conflicting-policy recovery and final Phase 07 integration review, then Phase 08. Human acceptance pending. |
| 2026-10-07 | 07 complete | Delivered explicit expired/conflicting grading-policy recovery, preserved authority expiry during replacement, and completed the Phase 07 integration review. | 241 unit tests; database lineage, authority, impact/dependency, rollback/concurrency and ended-period recovery; Coordinator recovery and Staff re-review browser checks passed. No migration, grant or operational business-data changes. | All 38 suites and encrypted backup/restore passed; all 458 source/build hashes verified. Frozen evidence: `output/workflow-phase07/final-uat/F36-report.json`. Phase 07 technically complete; next is Phase 08 read-only eligibility comparison, then controlled entitlement creation. Human production acceptance pending. |
| 2026-10-07 | 08 | Delivered read-only initial-entitlement preview using accepted participation, current compliance and standing/financial boundaries; compared actual legacy normal, override and saved results without fabricated admission history. | 254 unit tests; database role/input, evidence, legacy comparison, graduation/financial boundary and exact read-only preservation checks; Coordinator browser flow passed. All 38 suites and encrypted backup/restore passed; all 465 hashes verified, 33 migration checksums unchanged. | [Delivery and recovery](LDSS_WORKFLOW_PHASE08_ELIGIBILITY.md). Frozen evidence: `output/workflow-phase08/preview-uat/F36-report.json`. Phase 08 remains In progress: controlled entitlement creation, reconciliation and final-semester protection next. No migration, grant or operational business-data changes. |
| 2026-10-07 | Payroll clarification | User removed the separate OVR concept. Working UI, report headings, profile messages and new routine audit wording now say Payroll; the supplied DOCX was inspected and designated as the only payout form template for Phase 09. | Terminology-only application change: lint, 254 unit tests, typecheck, build, secrets scan and disposable database reports/finalization/payment-correction checks passed. Internal identifiers, permissions and historical evidence retained. Prior 38-suite archive describes the preceding preview release, not this wording patch. | Continue Phase 08 entitlements, then sample-based payroll generation in Phase 09. No payroll generator exists yet; no separate OVR form will be added. |
| 2026-10-07 | Plan merge / 08-09 and 12 | At the user's request, merged the read-only semester deadline/automatic candidate/sequential payroll assessment and draft/approved preview requirements into this single tracker. Added A/B1/B2/C under Phase 08, D under Phase 09 and E under Phase 12; preserved completed phases and pending Phase 10/11 work. | Documentation-only merge. New implementation, test matrix results and human acceptance remain pending; prior release evidence is not evidence of these new features. | Next: approval of Checkpoint A. Implement one approved checkpoint at a time and stop after validation/reporting. No source, migration, configuration or database changes in this merge. |
| 2026-10-07 | 08 / A complete | Implemented Coordinator-only regular-semester mapping, deadline/window history, sequential batch numbering and audited extensions. User confirmed non-overlapping submission windows. Applied forward migration `20261007010000_f36_payroll_submission_windows.sql` after encrypted backup, verified restore and preservation checks; four additive tables, no operational backfill. | All 39 suites, 259 unit tests, Coordinator/Staff browser checks and backup/restore passed. All 476 source/build hashes independently verified; 34 migrations. Existing business records preserved. [Changed files, limitations and recovery](LDSS_WORKFLOW_PHASE08_WINDOWS.md); frozen evidence: `output/workflow-phase08/windows-uat/F36-report.json`. | Next: B1 document timing and authoritative eligibility. New batches remain setup-only; receipt cutoff enforcement, candidates, entitlements and payroll-form preview are pending. Human acceptance remains pending. |
| 2026-10-07 | 08 / B1 enrollment | Added actual COR/Certificate of Enrollment evidence to individual/batch receiving and resubmission, retaining one enrollment obligation and separate COG. Verification records the latest actual type. Forward migration `20261007020000_f36_enrollment_document_evidence.sql` applied after encrypted restore and preservation checks; historical rows/schema and existing role policy unchanged. | All 40 suites, 262 unit tests, Staff browser replacement/verification and encrypted backup/restore passed. All 482 source/build hashes independently verified; 35 migrations. [Delivery and recovery](LDSS_WORKFLOW_PHASE08_DOCUMENTS.md); archive: `output/workflow-phase08/documents-uat/F36-report.json`. | B1 remains In progress. Three policy questions on late encoding, official membership and post-cutoff custody await answers. Stronger predecessor validation, timing enforcement and shared eligibility integration remain; B2/C/D are not activated. |

For each implementation release, append the changed files, migration identifiers (if any), tests and outcomes, unresolved issues, recovery procedure, and human acceptance. Update the overview and checkboxes only with evidence. Update the checkpoint status table and next-step pointer together; do not check a checkpoint human-accepted without explicit approval.
| 2026-10-07 | 08 / B1 regular coverage | Added canonical regular-term COG predecessor validation and automatic Coordinator selection. Shared guards cover provisioning and COG receipt/batch/resubmission/verification/waiver. Calendar hashes preserve evidence; compatible old papers remain verified while academic assessment becomes stale. | All 40 suites, 270 unit tests, Coordinator browser save/ambiguity checks and encrypted backup/restore passed. All 486 source/build hashes independently verified; 35 migrations unchanged. [Delivery and limits](LDSS_WORKFLOW_PHASE08_COVERAGE.md); archive: `output/workflow-phase08/coverage-uat/F36-report.json`. | B1 remains In progress: late encoding, post-cutoff custody, official membership and shared eligibility are pending. No migration, grant or operational business-data edit; no automatic historical remapping or managed financial activation. |
| 2026-10-07 | B1 policy decisions | User approved evidenced Coordinator late-encoding decisions, post-cutoff physical custody recording with no automatic closed-cutoff eligibility, and reviewed/published continuing masterlist membership without fabricated admission history. | Explicit responses to the three pending questions; no automatic business action or human release acceptance inferred. | Implementation authorized. Complete receipt-evidence groundwork, then timing decisions/cutoff integration and the membership bridge. |
| 2026-10-07 | 08 / B1 receipt evidence | Added read-only current physical receipt projection: original or latest replacement, exact source identity, date-only physical precision and separate automatic entry timestamp. Staff history shows Manila entry time without new inputs. | 276 tests across 48 files; lint/typecheck/build/secrets; requirement-workflow and continuing-roster database suites; Staff browser checks passed. 35 migration checksums unchanged. [Scoped evidence](LDSS_WORKFLOW_PHASE08_RECEIPT_EVIDENCE.md). No new full UAT run claimed. | All three timing/membership decisions are confirmed. Next: implement evidence-backed late-encoding decisions and cutoff/custody integration, then reviewed/published membership and shared eligibility. No migration, grant or business-data change in this increment. |
| 2026-10-07 | 08 / B1 receipt timing | Added per-batch timing to initial/batch/replacement receipt commands and immutable audits. Coordinator may append evidenced late-encoding decisions, pinned to exact receipt/cutoff/deadline sources; Staff records custody without approval fields. Existing document/status/financial boundaries remain separate. | Additive timing-decision migration applied after encrypted backup/verified restore; all 96 prior non-migration tables preserved. All 41 suites, 280 unit tests and Coordinator/Staff browser checks passed. All 501 source/build hashes verified; 36 migrations. [Delivery/recovery](LDSS_WORKFLOW_PHASE08_TIMING.md); archive: `output/workflow-phase08/timing-uat/F36-report.json`. | B1 remains In progress: reviewed/published continuing membership and shared financial eligibility integration next. Ended/locked document scopes retain restrictions; managed payroll remains financially disabled. Human acceptance pending. |
| 2026-10-08 | LAN preparation / direct academic entry | Provisioned the three authorized real identities with fresh activation required and the provisional AY2026-2027 calendar in the separate production database. Staff can type school/course names in academic records, change requests and simple imports; Administrator prelisting removed from UI. Downloaded archive restored with 105 tables verified. | Focused academic/import database tests and built-browser save/reload passed. Final acceptance passed all 47 suites and 340 unit tests with stable source hashes; 167 release artifacts verified. Evidence: output/lan-rollout/REPORT.md. | LAN activation, client trust, router reservation, off-computer key custody and real operator pilot remain pending. See OFFICE_LAN_HANDOVER.md. |
| 2026-10-08 | Profile transfer workflow | Added Record transfer / course shift in academic profiles. Unofficial records use academic changes; official records open the existing publication/lock/amendment workflow inline with the scholar pinned. Added typed school/course destinations to amendments. | Application check (340 unit tests, lint, types, build, secret scan), 8 academic-change and 16 amendment scenarios passed. Disposable Staff request and Coordinator approval/publication browser journey passed with reload; evidence output/profile-transfer-*. | Existing approval and historical snapshot protections retained. No working scholar changes or LAN installation performed. |

## Workflow consistency corrections � 8 October 2026

- Duplicate school/course names now display reference codes in typed-entry suggestions and submit the selected reference identity. Plain ambiguous names remain subject to server validation; no automatic merging.
- Profile academic summaries show year-matched provisional intake school/year/course details when no complete academic record exists, with Course needed and Complete academic details. Complete academic records retain precedence.
- Successful official amendment publication opens the returned official version and refreshes academic data immediately.
- Terminal-status correction instructions now reflect approval by the sole Coordinator.
- Validation: lint, 342 unit tests, type checks, build and secret scan passed. Disposable Staff request -> Coordinator approval -> publication browser check confirms academic summary refresh without reload; blank-course profile and completion navigation survive reload. Browser fixture logs and screenshots: output/consistency-*.
- Full acceptance gate passed all 47 suites; see output/workflow-consistency-report.md and output/consistency-acceptance-report.json. LAN installation remains paused. No working scholar records were changed by these checks.

## Smoke-test finding fixes — 8 October 2026

Windows backup lock now uses canonical-directory named pipes (cross-process exclusion and forced-exit recovery tested). Status transitions render arrows; storage status reflects API database health. Check gate passed 343 tests plus lint/type/build/secret checks; isolated Drive-backup database regression passed for 105 tables. Evidence: output/smoke-fixes-report.md. Installed task upgrades remain separate and require no old/new runner overlap; LAN deployment stays paused.


## 10 October 2026 remediation evidence

The A01-A08 remediation source and disposable verification are recorded in [the dated report](../output/readiness-remediation-20261010/REPORT.md). Earlier evidence is retained and superseded only where that report explicitly identifies a changed workflow. Legacy operational writes are now contained; historical corrections remain controlled. Treasury reconciliation, reviewed placement policy, exact schema readiness and consistent read snapshots are implemented locally. Final UAT status and coverage limits are authoritative in the dated report. LAN installation, verified controlling ordinance/calendar, recovery/key-custody checks and an uninterrupted office operator pilot remain separate pending acceptance.

Final result for this remediation: 51 configured UAT suites (45 distinct commands), 361 unit tests/66 files, lint/type check/build/secret scan passed on 483 unchanged inputs and 48 migrations. See the dated report for browser/Word evidence, release-review archive and coverage limits. Technical gate passed; office and LAN sign-off remain pending.

## 13 October 2026 additions to published masterlists

Implemented the separately authorized workflow for attaching an unpublished same-year draft to the latest published or locked masterlist, then using the existing verification, Coordinator approval and publication stages to create a combined revision. Existing members remain frozen; only additions activate. Target changes invalidate review, and later additions/amendments share one revision lineage. Ordinary independent drafts remain supported. Merging two published lists is outside this scope.

Migration 49 adds append-only target events and revision lineage seeded from existing amendment links. A restored development copy passed the additive migration with pre-existing table contents preserved, followed by localhost migration and runtime readiness verification. Disposable browser preparation, approval, publication, original-history navigation and duplicate blocking passed. Full final gate status, screenshots, operator procedure and coverage limits are maintained in [the feature delivery report](../output/masterlist-additions-20261013/REPORT.md). Earlier evidence remains intact. This work does not authorize or perform LAN deployment or alter real payments.

Final technical gate: all 51 configured suites passed with 365 unit tests across 67 files, 489 unchanged source/test/migration inputs and 49 migrations. Localhost readiness returned ready after the gate. Office sign-off and LAN rollout remain separate.

### 13 October 2026 - masterlist addition creation and published consolidation
Implemented atomic creation/attachment for additional drafts and a separate reviewed consolidation of two official same-year publications. Original snapshots and activations are retained; no working lists were automatically consolidated. Localhost migration 50 applied after restored-copy rehearsal. Evidence: output/masterlist-consolidation-20261013/REPORT.md. LAN rollout and operator publication remain separate. Final UAT status is recorded in that report and its uat-final/F36-report.json; earlier evidence is retained.
### 13 October 2026 - UI refinement and fast COR/COG review

Localhost now has direct Registry document navigation, a compact per-document five-check attestation, an atomic receipt-and-verification command, retained receipt-only and correction paths, and preserved payroll/masterlist context. Existing approval, compliance and one-claim controls remain authoritative. No migration or LAN rollout belongs to this change. Implementation, source references, browser evidence, measured interaction counts and explicit coverage limits are recorded in output/ui-refinement-20261013/REPORT.md. Its final gate record is output/ui-refinement-20261013/uat-final-2/F36-report.json; earlier evidence is retained, including the superseded source-changing run. Office pilot and native browser zoom checks remain separate.

Final technical result for UI refinement: all 51 configured UAT suites passed against unchanged source, including 365 unit tests across 67 files, lint/type/build/secret checks and disposable database regressions. Browser evidence includes two-click document processing, keyboard COG verification, stable uncertain-response retry, preserved payroll review context, and successful synthetic Treasury confirmation with restored search focus. Coverage limits and source fingerprints are in the dated report. Localhost readiness returned ready; LAN remains unchanged.
