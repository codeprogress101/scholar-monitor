# Integrated, independently approvable enhancement backlog

24 October 2026, Philippine time. **All work below is proposed, not started.** Confirmed business intent, implemented capability and unresolved authority are distinguished in the [current-year evidence/traceability matrix](LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md). Exact test families and sequencing are in the [phased plan](LDSS_PHASED_IMPLEMENTATION_PLAN.md).

Priorities: **P1** essential source/model or high-risk readiness investigation; **P2** normal operational alignment/usability; **P3** small polish. Priority is not permission or a demand to bundle all P1 work into one release. No new critical financial/authorization defect was demonstrated by this planning review. Regression exposure is stated separately from priority.

**Recommended first code approval: B3a**, the small Payment Recording composition slice. It is independent of annual-model decisions and PB1/PB2/PB6, improves the already usable 800/200 daily task, and is reversible without data changes. Earlier B-O1 remains open as B1; newly explicit incomplete-registration visibility is a prerequisite to claiming the correct current-year default. This is a changed planning recommendation, not an implementation or policy change.

## Track A — Current-year academic workflow

### A1 — Individual New/Continuing annual registration / P1, proposed gap

- **Existing/gap:** manual identity/duplicates/ID creation exists; no annual classification input/API write. Annual `scholar_intakes` exists but requires import origin, school and year level.
- **Scope/schema/benefit:** `ScholarsPage.tsx`, `scholars/{model,validation,service}.ts`, annual intake projection in `registry-placement.ts`; approved DM-A extension/correction design in the [annual plan](LDSS_ANNUAL_CLASSIFICATION_AND_ROLLOVER_PLAN.md). **Schema proposal required**, no permanent person classification. Staff can record the correct current-year New/Continuing without fake history.
- **Exposure/dependencies:** Medium/High identity/admission/source risk; DM-A, A5's nullable initial facts and role/correction contract. No substantive scholarship-policy change supplied by the form.
- **Accept/tests/browser/performance:** T01/T03; one ID and annual fact, no automatic admission/payment, unknown placement truthful, role/duplicate/stale/retry/audit tests; manual Staff/Coordinator form and existing-person annual entry; bounded page refresh without full eligibility fan-out.
- **Rollback:** revert before writes; after writes stop new intake operations and preserve compatible annual/provenance readers, not person deletion.

### A2 — Mixed-classification imports and prior-review presentation / P2, partial

- **Existing/gap:** New/Continuing/Old per-row mixed simple imports already work. Two Staff-facing processed/incomplete labels and clearer selection-versus-document-review presentation are absent.
- **Scope/schema/benefit:** `ScholarImport.tsx`, `imports/{model,workbook,service}.ts`, `PriorBatchApproval.tsx`, `requirements/prior-approval-{service,source}.ts`; reuse reviewed previews/source pins. No schema for label-only intent if existing reference scope suffices; A5/DM-A required for new incomplete provenance storage. Reduce repetitive document checking through valid existing reviews.
- **Exposure/dependencies:** High if review intent becomes verification/admission; preserve Coordinator-only scoped adoption and separate current receiving. No new verification policy.
- **Accept/tests/browser/performance:** T02/T07; mixed classes, Old compatibility, missing/invalid labels, stale/wrong import, incomplete never verified, duplicate/retry/rollback. Browser both labels, coverage, accepted reference and unresolved exceptions; preserve <=1,500 import rows/current bounded validation.
- **Rollback:** revert labels/orchestration without removing accepted review/import evidence; keep new provenance readable if introduced.

### A3 — Digital-start-year and continuing onboarding / P1, supported with alignment checks

- **Existing/gap:** baseline Continuing review can establish prior participation without prior-year data. Earlier applicant/admission paths and display fallbacks can confuse first LDSS registration with first selection; Q14/Q18/Q37–Q39 handoffs have partial narrative/evidence mapping.
- **Scope/schema/benefit:** `ContinuingBaseline.tsx`, `ContinuingRostersPage.tsx`, `continuing/service.ts`, `masterlists/continuing-admission.ts`, `qualification/service.ts`, relevant profile help/source labels. Verify existing paths first; no schema by default. Provide a correct current-year entry route and map academic/leave/contact handoffs without unnecessary new modules.
- **Exposure/dependencies:** Medium/High if baseline acceptance becomes a waiver. N02/Q1/Q9 confirmed; mandatory academic/standing policy still controls.
- **Accept/tests/browser/performance:** T01/T02/T06: no N−1 rows/exams/shifts/grades manufactured; current grade coverage required; existing selection/continuing source combinations supported. Browser new digital Continuing, unresolved academic evidence and Coordinator escalation; scoped existing reads.
- **Rollback:** revert guidance/path composition; never reverse accepted baseline participation or rewrite previously approved source history.

### A4 — Reviewed annual rollover/reclassification / P1, confirmed behavioral reconciliation

- **Existing/gap:** year advance already auto-prepares some Continuing annual rows; person-level baseline roster cannot be repeated each year. Explicit annual review/confirmation and bounded preview are incomplete relative to N07.
- **Scope/schema/benefit:** `configuration/{rollover,service}.ts`, `continuing/{service,model,routes}.ts`, `masterlists/continuing-admission.ts`, Registry/roster UI. DM-R may require minimal annual review event/header/entry structure, not a duplicate participation system. Preserve old New class while recording reviewed next-year participation.
- **Exposure/dependencies:** High standing/renewal/transaction risk; A1/A3/A5, DM-R and available-year/closure controls. Preserve technical Administrator versus Coordinator business responsibility.
- **Accept/tests/browser/performance:** T04/T06/T07; pending/denied/graduate/restricted/future/conflicting cases, existing destination/legacy audit, exact/concurrent retry, no year-level increment/payment. Browser reviewed candidate list/decisions and calendar readiness; bounded UI discovery and measured complete command workload.
- **Rollback:** retain old/new rollover audit and readers; disable only new review writes/advances where needed. No annual/financial deletion or retroactive rejection of published history.

### A5 — Unknown initial information / P1, confirmed import restriction

- **Existing/gap:** identity accepts absent optional details; approved simple import requires school/year, with narrower Course pending exception. Initial incomplete intake must not be treated as an approved academic record.
- **Scope/schema/benefit:** `scholars` validation/model, `imports/{service,model,workbook}.ts`, intake schema/DM-A, `academic` completion and profile/Registry presentation. Nullable initial placement/provenance **requires explicit schema review**; retain complete academic/publication/payroll checks. Avoid fabricated values and keep pending people discoverable.
- **Exposure/dependencies:** High if completeness is confused with eligibility. A1/B1 year-association contract; existing controlled placement amendments remain for published/frozen data.
- **Accept/tests/browser/performance:** T01–T03, later semester completion, outage receipt timing, names-only/missing school/year, blocked publication/payment, no auto-Course-pending approval. Browser honest missing fields/action links; preserve import/page limits and exact retry.
- **Rollback:** retain incomplete registration facts and readers; do not fill blanks to satisfy old code or remove created people. Use controlled forward completion.

### A6 — Graduation Monitoring Registry tab / P1 model/evidence, P2 UI

- **Existing/gap:** formal graduation, corrections and final funded-semester protections exist; no authoritative duration or expected/delayed monitoring model/tab.
- **Scope/schema/benefit:** `ScholarWorkspace.tsx`, academic placement/reference and status/graduation readers, proposed scoped monitoring service/UI. DM-G1 duration and DM-G2 evidence stream are separately reviewed **schema proposals** if existing references/notes are insufficient. See [graduation design](LDSS_GRADUATION_MONITORING_PLAN.md). Support targeted follow-up without status automation.
- **Exposure/dependencies:** High if duration/name guesses alter standing/funds; A1/B1 annual scope, real applicable program evidence, role mapping and migration review. Unknown stays unknown; Dashboard count optional.
- **Accept/tests/browser/performance:** T05/T06/T10; all four labels, ambiguous/cohort duration, stale placement, formal correction/final stipend, zero financial effects, audit/retry/role tests. Browser tab/evidence/formal-workflow link; COUNT+page, selected history only.
- **Rollback:** disable new monitoring writes/derivation while retaining reference/event versions and existing formal graduation/payment readers.

## Track B — UI/UX

### B1 — Registry working-year default / P2, confirmed gap with source dependency

- **Existing/gap:** saved view and annual-linked filter exist; fresh default is empty/all, and that filter alone excludes some incomplete registrations.
- **Scope/schema/benefit:** `ScholarsPage.tsx`, `academic-year-options.ts`, `scholars/{service,registry-placement}.ts`, navigation tests. No schema for initialization alone; any new annual association relies on A1/A5/DM-A. Opens the correct daily cohort without hiding pending people.
- **Exposure/dependencies:** Medium scope/navigation risk; resolve registered/intake/annual association contract from existing facts and A1/A5 first. Do not reuse permanent first-entry year as annual participation.
- **Accept/tests/browser/performance:** T03; fresh, historical/All, missing/ambiguous configuration, saved filters, new incomplete entry/profile receiving/back/reload; one correct initial list request, no all-year flash or whole-cohort call.
- **Rollback:** revert default/query orchestration with compatible saved preferences; no data rollback or implicit association backfill.

### B2 — Registry layout/table simplification / P2, presentation

- **Existing/gap:** paged Registry/two tasks already exist; creation/search/filter/context/table hierarchy is dense. Graduation tab is A6, not a dummy tab in B2.
- **Scope/schema/benefit:** `ScholarWorkspace.tsx`, `ScholarsPage.tsx`, `ScholarAcademicSummary.tsx`, scoped CSS/shared table components. No schema. Clear primary name/ID, common filters and secondary actions.
- **Exposure/dependencies:** Medium navigation/receiving risk; preserve B1's explicit scope, existing tab/deep-link compatibility and action permissions.
- **Accept/tests/browser/performance:** T03/T10; active filters/Clear, complete long names, count/sort/page and saved context. Matched desktop/tablet/320px non-table captures with keyboard/name disclosure; no new eager profile/eligibility requests.
- **Rollback:** revert local presentation, retain old route/preference readers and pending command state.

### B3 — Payment Recording hierarchy / P2, first B3a slice recommended

- **Existing/gap:** recording/bulk/date/reconciliation/recovery already work; repeated parent/selected/task headings push the roster down.
- **Scope/schema/benefit:** `PayoutCyclesPage.tsx`, `OvrDrafts.tsx`, `PaymentRecording.tsx`, scoped CSS. **B3a:** heading/context/back-link/spacing only; later B3 can evaluate toolbar/refresh composition separately. No schema/backend/body/state-format changes. Less scanning/scrolling on real 800/200 workspaces.
- **Exposure/dependencies:** Medium financial UI regression exposure, independent of PB1/PB2/PB6. Preserve mounted controls, context/invalidation, accepted sets and uncertain navigation locks.
- **Accept/tests/browser/performance:** T08/T10; equivalent roster nearer task entry, all summaries/setup/returned verification/history/closure still accessible. 3011 read-only visuals, disposable 825/10 recording and stale/retry/concurrency/permissions; no extra request/full detail and no SQL speed claim.
- **Rollback:** isolated composition/CSS revert; no data, command receipt or retry-storage deletion.

### B4 — Masterlist/profile/current-workflow clarity / P2, partial

- **Existing/gap:** annual publication/amendments and profile sections exist; versions, imported groups, payroll references, pending placement and formal/monitoring status can be confused. V02 narrow standing fields is a local presentation defect.
- **Scope/schema/benefit:** `MasterlistsPage.tsx`, `ScholarsPage.tsx`, `AcademicPanel.tsx`, `ScholarRequirements.tsx`, `StatusPanel.tsx`; domain readers unchanged unless a separate proven gap. No schema for presentation. Explain current context, version provenance and actual next task.
- **Exposure/dependencies:** Medium official-history/standing misunderstanding; A3 handoff map/A6 integration where applicable, Q10 publication separation unchanged.
- **Accept/tests/browser/performance:** T02/T06/T07/T10; controlled additions keep prior publications/payrolls; compact profile with truthful unknowns; V02 complete labels. Browser role/version/current/historical/blocked views, no full history merely for a heading.
- **Rollback:** screen-local composition revert; preserve all original publication, academic and standing evidence.

### B5 — Individual Payments, Reports and Dashboard wording / P2, partial

- **Existing/gap:** four existing UAT individual features are enabled and functional; draft/history/report bases exist. Repeated Reports heading V01 and cheque-row/address-bar selection inconsistency remain; no activation implementation is needed.
- **Scope/schema/benefit:** `IndividualPayments.tsx`, `OmittedScholars.tsx`, `IndividualDocuments.tsx`, `IndividualSettlement.tsx`, `ReportsWorkspace.tsx`, `ReportsPage.tsx`, `FinancialReports.tsx`, `DashboardPage.tsx`. No schema for clarity/route correction. Accurate source/current status and predictable history/report navigation.
- **Exposure/dependencies:** Medium/High selection/retry/report risk; existing routes/flags/claimability retained, A1/A6/C1 before new counts. V01, route selection and copy changes may be approved as separate small slices.
- **Accept/tests/browser/performance:** T09/T10; selected transaction matches URL/reload, retained uncertain payload unaffected; original Unclaimed/later Paid and report scopes explicit; no routine forwarding, fabricated official values or extra eager documents/complete detail.
- **Rollback:** revert individual slices with compatible routes/pending requests; never undo legitimate individual outcomes or relabel drafts official.

### B6 — Tablet, accessibility and shared presentation / P2, broad shell exposure

- **Existing/gap:** drawer/focus/status/scroll/reduced motion already partly supported; tablet sidebar consumes width and full accessibility coverage is not established.
- **Scope/schema/benefit:** `App.tsx`, `FocusedDialog.tsx`, `WorkspaceUI.tsx`, table wrappers and scoped `styles.css`; no schema/framework/font install. Content reflows and navigation/controls remain accessible.
- **Exposure/dependencies:** Medium/High shared role/financial interaction reach; coordinate with B2–B5, keep existing <=650px drawer behavior.
- **Accept/tests/browser/performance:** full T10 matrix: 1440/1024/820, supported smaller widths, 200% native zoom, 320 CSS-pixel non-table reflow, focus/keyboard/drawer/labels/contrast/reduced motion and available screen reader. No hidden action or covered focus, layout-only metrics not service claims.
- **Rollback:** revert shell breakpoint/state/focus/styles together; preserve all public navigation and command recovery.

## Track C — Performance investigation, then separately approved remediation

### C1 — Dashboard investigation and bounded remediation proposal / P1

- **Existing/gap:** R03 aggregates/bounded derived evaluation work; P10 still reports ~7.44 s/580 SELECTs. Current root attribution and new-count cost unmeasured.
- **Scope/schema/benefit:** PERF01–02 in the [roadmap](../performance/LDSS_OPTIMIZATION_ROADMAP.md): Dashboard/shared authoritative readers and frontend load graph. No schema/index by default; any justified index/model needs separate review. Faster useful task/count display if proven.
- **Exposure/dependencies:** High count/scope risk; A1/A4 annual semantics and A6 before new derived counts, not prerequisites to profiling existing cards.
- **Accept/tests/browser/performance:** T11, independent all-card/role/source parity, matched SQL/CPU/memory and actual populated browser timings with accepted tradeoffs; no approximate counts. Investigation produces measured smallest proposal before fixes.
- **Rollback:** stop profiling safely; later revert isolated projection/UI optimization while retaining old output and source freshness.

### C2 — Payroll detail/query/memory and report profiling / P1

- **Existing/gap:** R04/R05 compact/lazy paths exist; complete detail still ~36.11 MB with high sampled RSS. Current retained/transient attribution and rendering headroom need measurement.
- **Scope/schema/benefit:** PERF06/09/11; `ovr` detail/complete readers, payroll detail components, report renderer/service. No schema unless separately justified. Avoid accidental heavy reads, reduce proven copies without losing evidence.
- **Exposure/dependencies:** High complete-output/history exposure; fixed limits and existing hashes/DTOs preserved.
- **Accept/tests/browser/performance:** T08/T09/T11 full-to-full/page-to-page parity, exact Original/Updated/export rows, role/stale/audit paths, pool return and measured RSS/heap. Browser changed lazy sections only; no full-detail request for routine recording.
- **Rollback:** restore compatible reader/renderer/dispatch, retain full endpoint and all frozen financial evidence.

### C3 — Registry/frontend request and bundle profiling / P1 investigation, P2 fixes

- **Existing/gap:** R01 bounded Registry and existing lazy modules; repeat permission/catalog reads and historical ~853 kB chunk warrant current attribution.
- **Scope/schema/benefit:** PERF03/04/07/10; App/Registry/Dashboard/context clients, Registry read/query model and build graph. No dependency/schema change presumed. Fewer duplicate display requests and measured route payload/parse improvements.
- **Exposure/dependencies:** High if permission freshness is lost; B1 association contract before scope changes, existing server revocation always authoritative.
- **Accept/tests/browser/performance:** T03/T10/T11; matched request graph/bundle and page output, role loss/logout/independent tabs/chunk failure/deep links, no unbounded Registry load or increased timeout concealment.
- **Rollback:** revert orchestrator/splits with compatible old assets/preferences; never introduce module-global financial caching.

### C4 — Multi-batch capacity, queues and growth / P1 before growth/release

- **Existing/gap:** two independent batches, source indexes and individual routes verified; 3–5 batches/concurrent host/growth not established. Backup SQL headroom is finite.
- **Scope/schema/benefit:** PERF05/08/11/12; historical context/candidates/payment queues/report sources, backup tools and a **new owned** synthetic scenario. No operational flags, schema/heap/packet/limit changes assumed. Establish supported workload and bottlenecks.
- **Exposure/dependencies:** High resource/source/race exposure; approved fixture/load window, real test facts and A2/A6 implementations before their new UI/model acceptance. Existing baseline tests can proceed independently under authorization.
- **Accept/tests/browser/performance:** T07/T09/T11/T12, distinct source rosters/entitlements, older frozen snapshots intact, exact totals and bounds; representative per-batch UI/concurrent users and monitored pool/RSS/SQL/backup recovery with explicit stop criteria.
- **Rollback:** stop only owned load/server processes, retain partial evidence and use reviewed exact-owner cleanup later. Never reset retained fixtures or change claiming dates to obtain a pass.

## Track D — Security and operational readiness

### D1 — Dependency advisory exposure review / P1, unresolved investigation

- **Existing/gap:** P10 recorded seven advisories, two critical; no current exploitability or updated advisory state is established by this plan.
- **Scope/schema/benefit:** current `package.json`/lockfile, actual server/client/build use and primary upstream advisories when the review is authorized. No schema, bulk upgrade or `audit fix`. Distinguish runtime/build/dev exposure and propose smallest tested remedy.
- **Exposure/dependencies:** High potential security/release relevance; current version/reachability evidence, separate remediation approval. A severity rating is not proof of exploitation or harmlessness.
- **Accept/tests/browser/performance:** T12 threat/exposure disposition, current checks, lockfile/secret/build provenance and relevant auth/financial tests after any approved change; browser only if affected runtime/UI. Compare bundle/startup/affected endpoint cost, no misleading blanket “secure.”
- **Rollback:** approved package/lockfile revert where data-compatible, with explicit exposure disposition; no stale deployment or weakened security control.

### D2 — Backup, off-host recovery and witnessed validation / P1 readiness

- **Existing/gap:** encrypted bounded backup/verified local restore and synthetic financial/document recovery exist. Off-host/key custody, retention, RPO/RTO, incident escalation and named witnessed record validation remain readiness decisions.
- **Scope/schema/benefit:** F35 runbook, `scripts/backup-lib.mjs`, documented operator procedures and approved isolated drill. No business schema/permission broadening by default. Administrator handles technical recovery; Coordinator validates restored office records (Q35).
- **Exposure/dependencies:** High loss/disclosure risk; agree objectives, owner/custody/storage/retention and safe drill authorization before touching backups/keys. Never put keys/credentials in reports.
- **Accept/tests/browser/performance:** T12 verified off-host round-trip, canonical table/constraint/audit/document/financial inventory, post-backup transaction reconciliation and witnessed sign-off; representative restored views only on owned fixture; measure growth, backup and restore against agreed targets/current limits.
- **Rollback:** no stale restore over current data; keep failed/restored copies for diagnosis, reverse operator setup only under an owned-resource plan. Preserve subsequent valid activity.

### D3 — Official OR/DV and payment-policy boundaries / P1 at affected boundary

- **Existing/gap:** individual DV/OR+DV, drafts and settlement work in UAT. Q28/Q29 timely physical receipt/late release, Q30 two-source late-recording evidence and PB6 official templates are distinct remaining authority/contracts.
- **Scope/schema/benefit:** retain old B-F1a (timeliness evidence), B-F1b (narrow continuation), B-F2 (Q30 evidence) and B-F3 (approved adapter) as **separate future proposals**. Affects existing individual/settlement/treasury/correction/document services/UI only after their own approvals; schema conditional on exact immutable evidence design. Enable legitimate supported office use without fabricated authority.
- **Exposure/dependencies:** High financial/legal/form-source risk; governing scope/limits, accepted dated evidence and actual approved forms/mappings/signatories. Q28 intent is confirmed, not to be reasked; missing authority remains.
- **Accept/tests/browser/performance:** T09/T12 guard matrix for regular payout/new request/timely request/late actual release/late encoding/closed/unavailable periods; ordinary Staff dates unchanged; draft promotion never watermark-only; fresh roles/source/retry/cancellation/reports. Rendering/source costs measured under current bounds.
- **Rollback:** compatible evidence/payment/template readers retained once new records exist; stop only new affected writes, forward repair, no history deletion/period extension/automatic downgrade.

### D4 — Office acceptance and separately authorized release planning / P1 release prerequisite

- **Existing/gap:** synthetic P10/later tests passed; named real-office workflow/form/recovery acceptance and target-host capacity/security release dispositions remain outstanding. Provisioning/offboarding/calendar/absence owners are confirmed Q34/Q40/Q43/Q44.
- **Scope/schema/benefit:** reviewable release/runbook/evidence package, Staff/Coordinator/Admin scenario sign-offs and later controlled updater plan. No schema change solely for acceptance, no actual deployment in this task. Turn tested software into a specifically accepted office workflow.
- **Exposure/dependencies:** High operational scope; completed approved batches, D1/D2/D3 at affected boundaries, canonical current source/build/migration/grant inventory. Do not erase P10's initial ordering-sensitive grant qualification using later evidence.
- **Accept/tests/browser/performance:** T12 named role-specific acceptance, current verified backup/recovery, maintenance/rollback/incident/feature scope; representative real forms/workstations without copying real data to UAT; agreed multi-session latency/memory/capacity. No WCAG/security/production certification from synthetic tests alone.
- **Rollback:** release approval must specify compatible updater rollback/forward repair and preserve all post-backup transactions. A plan/sign-off never automatically deploys or enables another feature.

## Earlier identifier cross-reference and completed work

| Earlier identifier | Integrated destination / current disposition |
|---|---|
| B-O1 / O01 | **B1**, still open; annual association visibility clarified, no longer assumed a complete UI-only default |
| B-O2 / O02 | **A1/A5**, with existing A2 import reuse; incomplete intake model review required |
| B-O3 / O03 | **A3/B4** academic-referral evidence mapping; dedicated module not presumed |
| B-O3 / O04 | **A3/A6/B4** leave/return/formal-graduation evidence; new graduation monitoring is separate |
| B-O3 / O05 | **A3/B4/B5** contact-record and requested-report handoffs; no routine messaging/transmission product |
| B-U1 / U01 | **B3**, first B3a slice recommended |
| B-U2 / U02 | **B2**, coordinating with B1/A1 |
| B-U3 / U03 | **B6**, existing drawer reused |
| B-U4 / U04–U05 | **B5 V01** and **B4 V02**, separate small reversible patches |
| B-U5 / U06 | **B4/B5/B6** precise wording/context/density by screen |
| B-P1 / P01 | **C1**, historical Dashboard cost remains investigation |
| B-P2 / P02 | **C2/C3**, complete detail/request boundaries remain |
| B-P3 / P03 | **C4/D2**, storage/evidence/backup capacity |
| B-S1 / S01 | **D1**, current exposure not newly assessed |
| B-S2 / S02 | **D2**, witnessed recovery/readiness |
| B-S3 / S03 | **D4**, canonical release evidence/office acceptance, grant qualification retained |
| B-F1a / G01, Q29 | **D3 evidence subproposal**, not implemented |
| B-F1b / G01, Q28 | **D3 continuation subproposal**, not implemented, authority gated |
| B-F2 / G02, Q30 | **D3 restricted evidence subproposal**, no ordinary Staff authority change |
| B-F3 / G03, PB6 | **D3 official adapter subproposal**, drafts remain drafts |
| V1/V2 historical second-import source blocker / fix plan | **Implemented for supported independent historical batches**, E3; do not reopen it as missing verification. Unknown/overlapping dates and stale/unsupported sources remain blocked. Additional 3–5 batch assessment is C4 |
| Individual activation default-off gap at 3011 | **Completed in owned localhost**, E4; main/LAN/production activation not approved. Preserve both retained fixtures |
| 206 lint / six TypeScript diagnostics | **Completed**, E5; no cleanup implementation backlog remains |

None of these rows starts a batch. UI composition, annual/schema design, financial authority changes, dependency remediation and deployment are separate approvals; a cosmetic patch cannot carry an unreviewed financial or permission change.
