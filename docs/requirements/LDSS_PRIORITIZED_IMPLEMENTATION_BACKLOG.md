# LDSS prioritized implementation backlog

Date: **24 October 2026, Philippine time**. **Planning only; no item is approved or implemented by this document.** Read with the [complete gap analysis](LDSS_COMPLETE_GAP_ANALYSIS.md), its Q1-Q45 and guide-to-code matrices, and the [batch plan](LDSS_TARGETED_ENHANCEMENT_PLAN.md).

## Ordering and evidence

Critical means a demonstrated financial/security/data-integrity exposure, High an affected essential workflow or readiness risk, Medium an operational/interaction improvement, and Low a small presentation issue. No new Critical defect was demonstrated. Historical critical-severity dependency advisories retain their severity, with **High exposure-review priority**, without asserting an exploit.

Each record separates inspected implementation from the precise remaining gap. Tests listed below are **required future validation**, not tests run for this analysis. Existing test files provide regression anchors; new tests should exercise actual behavior and failure boundaries rather than mirror CSS or parser implementation. Existing integration scripts may create fixtures and must run only under a separately authorized implementation/test scope.

The earlier decision-log G01-G13 are retained as history. The IDs below identify actionable planning records; G01-G03 keep their original policy topic names.

| Priority | Backlog item | Classification / batch |
|---|---|---|
| High, affected boundary | G01 — timely Unclaimed DV continuation | Confirmed Q28 conflict; B-F1a/B-F1b, policy gated |
| High, affected boundary | G02 — late-recording evidence | Partial Q30 evidence contract; B-F2, policy gated |
| High before official use | G03 — official OR/DV adapter | PB6 authority and draft-only implementation; B-F3 |
| Medium | O01 — current-year Registry default | Verified Q8 default gap; **B-O1 recommended first** |
| Medium | O02 — incomplete selected-group intake | Verified restriction in default approved import; B-O2 |
| Medium, raise only for essential blocker | O03 — academic concern referral | Partial Q14 handoff; B-O3 verification before design |
| Medium, policy scope dependent | O04 — leave/return and graduation evidence | Generic status paths exist; B-O3 |
| Medium, requirement location unconfirmed | O05 — external follow-up and report release records | External/manual practices; B-O3 |
| Medium | U01 — Payment Recording hierarchy | Guide UG02/UG03; B-U1 |
| Medium | U02 — Registry grouping/table readability | UG04-UG08; B-U2 |
| Medium | U03 — tablet shell and accessibility verification | UG18/UG19/UG21; B-U3 |
| Low | U04 — duplicated Reports heading | Confirmed V01; B-U4 |
| Low | U05 — standing-request reflow | Confirmed V02; B-U4, independently revertible |
| Medium | U06 — contextual labels and secondary density | UG11/UG14/UG22; B-U5 |
| High investigation | P01 — Home/Dashboard cost | Historical T01; B-P1 |
| High investigation | P02 — legacy full-detail/memory | Historical T02/T05; B-P2 |
| High before growth/activation | P03 — evidence/document/backup capacity | T03/T04; B-P3 |
| High review priority | S01 — dependency exposure | Historical S01; B-S1 |
| High before activation | S02 — operational recovery | Q35/S03; B-S2 |
| Medium evidence qualification; High release prerequisite | S03 — canonical release evidence and office acceptance | S02 grant qualification, account/calendar/absence handoffs; B-S3 |

## Financial-policy-dependent enhancements

### G01 — Timely Unclaimed DV continuation

**Requirement/current implementation:** Q27-Q29 distinguish a semester-end request cutoff from later release. Shared current-day/actual-date guards reject later release. Server request time and optional remarks exist; independently evidenced physical receipt is not modeled.

**Exact gap / files:** `server/ovr/reprocessing.ts:28`, `server/payments/individual-service.ts:47/74/110`, `server/payments/settlement-source.ts:24`, `server/payments/individual-model.ts:3`, `src/IndividualPayments.tsx`, `src/IndividualSettlement.tsx`, and affected event/evidence schemas. See [analysis G01](LDSS_COMPLETE_GAP_ANALYSIS.md#g01-timely-unclaimed-dv-requests--q27-q29) for the nested guards.

**Minimal proposed change:** First specify original physical receiving evidence and authoritative limits, then add only the necessary immutable evidence and narrowly scoped continuation decision. Separate recording time from physical receipt. Do not alter the shared guard for regular payroll/omitted/new late requests by default; no blanket semester extension.

**Security/financial risk:** High: forged/backfilled timeliness, duplicate settlement, replacement/cancellation races, improperly bypassed period locks. **UI/UX:** show request evidence, original entitlement and exact blocker near the transaction. **Performance:** include evidence in existing scoped reads/source hashes; no cross-request eligibility cache or unbounded receipt lookup.

**Required tests:** Extend `tests/individual-payments.test.ts`, `tests/individual-settlement.test.ts` and existing individual/omission settlement drivers. Test cutoff-day versus next-day receipt, post-cutoff encoding with genuine evidence, late actual release, still-blocked new late requests, missing authority, actual date versus server time, cycle/record locks, source changes, duplicate routes, representative release and exact retry. **Policy dependencies:** PB1 governing authority/reference, evidence acceptance/custody, processing limits and scope of availability after period closure. Q28's intent is already confirmed and must not be reasked.

### G02 — Q30's restricted late-recording evidence

**Current / exact gap:** `server/ovr/treasury-service.ts:28` already supports historical receipt requests and Coordinator review; `server/ovr/payment-correction-service.ts:323` retains earlier-release checks. Neither separately requires both dated signed release evidence and written Financial/Releasing Office confirmation. `server/payments/settlement-model.ts:20` permits empty priorReceiptEvidence and `settlement-service.ts:156` does not validate the text. Existing individual corrections require an existing payment.

**Minimal proposed change / affected modules:** Define the Q30 scenario explicitly, then extend its existing evidence contract/controls and UI in `TreasuryReconciliation.tsx`, `PaymentCorrections.tsx` and `IndividualSettlement.tsx` as applicable. Reuse reference/attestation patterns; do not require scans or create an unrestricted historical payment editor.

**Security/financial risk:** High at restricted boundaries; false historical dates or release authority. Preserve Original closure and different-person review where already required. **UI/UX:** one clear evidence checklist with the two distinct sources; ordinary Staff date correction remains simple. **Performance:** small evidence additions; preserve current hashes, paging and transaction ordering.

**Required tests:** Existing `tests/payment-corrections.test.ts`, `tests/payroll-reconciliation.test.ts`, `tests/individual-settlement.test.ts` plus treasury/historical drivers. Cover each missing evidence source, stale references, already-recorded versus initially unrecorded release, expired versus open periods, rejection/retry, immutable closure and ordinary date-authority parity. **Policy dependencies:** PB2 additional evidence/approval for the affected scenario; do not generalize Q30 to every historical/unknown-date case.

### G03 — Office-approved OR/DV documents

**Current / exact gap:** Versioned DOCX prototypes and bounded editable draft fields exist. `server/payments/document-model.ts:12`, `document-word.ts:14` and `document-service.ts:33` explicitly enforce draft templates. Official layout/mapping/signatory/numbering/accounting authority is not supplied.

**Minimal proposed change / files:** After approved copies arrive through the Coordinator, add a versioned official adapter and explicitly supported template status/contract. Preserve earlier draft artifacts, source pins, approved amount and current-version history. Affects document model/service/renderer/source, `src/IndividualDocuments.tsx`, template fingerprint/build support only where necessary; no payment logic rewrite.

**Security/financial risk:** High if sample data, arbitrary payee edits or generated documents imply official authorization/Paid. **UI/UX:** distinguish draft versus officially approved version and display provenance. **Performance:** retain 262,144-byte bound until capacity is assessed; render outside the publication transaction and recheck source/permission.

**Required tests:** `tests/individual-documents.test.ts`, `tests/document-command-conflicts.test.ts`, existing document generation/upgrade/backup drivers, native Word/PDF visual verification with actual approved forms. Confirm route-specific DV-only/OR+DV kinds, field mapping, unknown values, signatures/accounting sources, bounds and append-only history. **Policy dependencies:** PB6 actual approved copies/version, permitted edits and official source/signatory approval; no watermark-only promotion.

## Confirmed operational gaps and bounded verification

### O01 — Fresh working-year Registry default

**Current / gap / files:** `src/ScholarsPage.tsx:98-109` initializes yearFilter from saved preferences or an empty string. The request at line 189 already accepts scholarshipYearId; `server/scholars/service.ts:157` implements annual linkage. Fresh sessions consequently show all scholarship years; “Current scholars” is an archive/standing scope.

**Minimal proposed change:** Resolve the existing working-year metadata before the first default list read. Apply the current year only when no explicit/restored year choice exists. Keep historical and All filters, saved pagination and profile/receiving context. No new endpoint/schema/permission is indicated.

**Security/financial risk:** Low if limited to display scope; never filter an identity into a new membership or use cached view state for payment. **UI/UX:** list opens on the intended annual group. **Performance:** avoid an initial unfiltered request and duplicate refetch; preserve bounded eligibility reads and R01 behavior.

**Required tests:** Extend `tests/scholar-navigation.test.ts` or a focused Registry initialization test with current-year, explicit historical/All, absent/ambiguous year, load failure, reload/back navigation and API-query assertions. Retain `tests/registry-eligibility.test.ts`; later representative browser checks. **Policy dependencies:** none beyond Q8; use the existing working-year definition rather than guessing dates. **Batch:** B-O1.

### O02 — Names-only selected-group intake

**Current / gap:** Manual registration accepts unknown personal/academic details. Default simple import and already-approved selection import require school/year level/classification; approved Course pending is a narrower exception. `server/imports/service.ts:151-200`, `workbook.ts:98`, `src/ScholarImport.tsx:146`. Legacy/manual alternatives mean the whole intake feature is not missing.

**Minimal proposed change:** Design a names-only initial group path that reuses permanent registration and duplicate preview, stores only supplied selection provenance and leaves annual placement/admission pending. Do not silently set Selected or auto-verify documents. Reuse importer architecture; preserve existing Coordinator prior-batch approval restrictions.

**Security/financial risk:** Medium if incomplete identity accidentally creates eligibility or a duplicate. **UI/UX:** clearly show missing details and the next completion task. **Performance:** retain row bounds, validation batches and reviewed retry; do not allocate one new expensive eligibility calculation per preview row.

**Required tests:** `tests/imports.test.ts`, `tests/scholars.test.ts`, `tests/duplicates.test.ts`, existing import scenarios; verify blank academics stay unknown, matches stay pending, repeat confirmations remain exact and publication/payment still block. **Policy dependencies:** Q1-Q6 supply timing/minimum intent; original list authority/provenance must be identified for any new approval semantics. **Batch:** B-O2 after the intake contract is reviewed.

### O03 — Academic-concern handoff

**Current / gap / files:** `server/continuing/semester-compliance.ts:248-295` permits routine reviewed findings under requirements.verify, and formal standing decisions are separate. There is no dedicated receipt of a Staff referral to Coordinator. Existing notices and pending status work are available.

**Minimal proposed next step:** Verify whether recording a finding plus an existing request/deep link satisfies Q14. If not, propose a minimal source-linked referral/acknowledgment within existing work, rather than a new academic-case module or permission removal.

**Security/financial risk:** Medium: a referral must not waive a failed/INC restriction or automatically terminate. **UI/UX:** make the outstanding decision owner and current blocker clear. **Performance:** reuse bounded pending queries; avoid duplicate notification engines.

**Required tests:** `tests/semester-compliance.test.ts`, `tests/status.test.ts`, `tests/notification-queries.test.ts`, and a new handoff scenario only if implemented. **Policy dependencies:** mapping the confirmed handoff to existing office work; any substantive exception still needs authority. **Batch:** B-O3 verification first.

### O04 — Leave/return and graduation evidence mapping

**Current / gap / files:** `server/status/model.ts:19/32`, `validation.ts:32`, `service.ts:151/233`, `src/StatusPanel.tsx:348` support generic requests, reasons/references, hold/resumption, graduation and final funded semester. They do not enforce a distinct leave case, current-enrollment return evidence, typed duration or official-school evidence source.

**Minimal proposed next step:** Confirm which evidence belongs in existing physical references/narrative decisions. Use those where sufficient; add only needed case linkage/evidence controls. Do not invent a leave status, fixed maximum, automatic expiry/return, entitlement extension or new admission.

**Security/financial risk:** Medium/High if policy automation could override mandatory standing or final-semester benefits. **UI/UX:** show original decision, case conditions and return evidence in context. **Performance:** reuse paged standing history; no eligibility shortcut.

**Required tests:** `tests/status.test.ts`, `tests/graduation-correction.test.ts`, `tests/semester-compliance.test.ts` and approval/effective-date scenarios. **Policy dependencies:** Q18/Q38/Q39 operational intent plus applicable mandatory policy/delegation and actual case conditions. **Batch:** B-O3; no automatic implementation from this investigation.

### O05 — Follow-up and requested report disclosure

**Current / gap:** Internal notifications/deep links (`server/notifications/routes.ts:5`) and local audited report downloads (`server/payments/report-service.ts:26`) exist. No dedicated scholar-contact history or external report-send workflow was found. Q37 does not specify the record location; Q33 explicitly rejects routine forwarding.

**Minimal proposed next step:** Establish whether paper/office notes already satisfy contact history and Coordinator authorization for requested copies. If sufficient, document the handoff and add no feature. If an in-app log is requested, propose minimal dated channel/outcome/reference history without storing messages/IDs unnecessarily.

**Security/financial risk:** Personal-data disclosure; do not confuse Staff's internal download with external release or impose approval on every export. **UI/UX:** show follow-up next action only if needed; preserve Original/Updated meanings. **Performance:** source-linked, paged records; no automatic messaging/polling infrastructure.

**Required tests:** Existing `tests/notification-queries.test.ts`, `tests/financial-reports.test.ts`, `tests/exports.test.ts`; no test can prove an external office instruction occurred. **Policy dependencies:** clarify recording destination and actual requested-copy practice only if software scope depends on it. **Batch:** B-O3, verification only initially.

## UI/UX refinements

### U01 — Payment Recording hierarchy and context

**Current / gap / files:** `PayoutCyclesPage.tsx:274`, `OvrDrafts.tsx:263/345/348`, `PaymentRecording.tsx:77/84` render nested Payroll/Selected payroll/Payment Recording context, several refresh scopes and a wide Back action. The inspected 820px screenshot puts the roster below the viewport.

**Minimal proposed change:** Compose the recording view around one title, compact batch/year/semester/status context, summary, roster and nearby selection/action controls. Keep relevant setup/history/reconciliation reachable. Consolidate refresh only where its data dependencies are equivalent; do not delete a necessary refresh or silently change navigation state.

**Security/financial risk:** Medium regression exposure because parent state, accepted set and uncertain commands must survive. **UI/UX:** less scrolling to daily work. **Performance:** UI layout savings only; no claimed SQL speedup and no new eager full-detail load.

**Required tests:** `tests/payroll-workspace.test.ts`, `tests/payment-recording.test.ts`, `tests/saved-payroll.test.tsx`, related conflict/retry tests, then equivalent role/state screenshots and keyboard checks. **Policy dependencies:** none; preserve all financial semantics. **Batch:** B-U1, first UI batch.

### U02 — Registry grouping and table readability

**Current / gap / files:** Search/filter/sort/export/import/context controls are interleaved in `ScholarsPage.tsx:459-528`; tables lead with ID; `styles.css:2664-2682` has fixed widths and ellipsis. Keyboard expansion/full DOM text already exists.

**Minimal proposed change:** Group search/common filters and secondary actions, add a unified visible filter summary/clear behavior, then context selectors and paged results. Prefer name with secondary exact ID and readable school/amount/status columns. Keep long names keyboard/touch accessible and receiving context unambiguous.

**Security/financial risk:** Low/Medium selection/context regression; no data meaning changes. **UI/UX:** easier scanning and retained-filter discovery. **Performance:** retain server pagination and bounded row eligibility; do not fetch the whole cohort or add virtualization without need.

**Required tests:** Registry navigation/eligibility/receiving-context tests, full identifier/name visibility, historical/All restoration, 820/1024/1440px and zoom/reflow. **Policy dependencies:** none; O01 default is separate. **Batch:** B-U2.

### U03 — Tablet shell and targeted accessibility checks

**Current / gap:** Drawer, Escape, focus return and inert background exist at <=650px (`App.tsx:166-184/336`); 820px retains a 210px sidebar (`styles.css:1790`). Named financial scroll regions and focus/reduced-motion rules exist; consistent scroll hints and full accessibility coverage remain incomplete/unverified.

**Minimal proposed change:** Evaluate a content-appropriate tablet breakpoint using the existing drawer, retain every navigation destination and selected context, and provide missing scroll hints. Validate existing behavior before changing it. Do not make a second navigation framework or declare all intentional table scrolling a defect.

**Security/financial risk:** Medium shared-navigation/focus regression, particularly during uncertain writes. **UI/UX:** more usable tablet width. **Performance:** CSS/state changes should add no polling, data loads or animation library.

**Required tests:** Drawer open/close/Escape/resize/focus/inert, keyboard, zoom, reduced motion, surrounding 320px reflow, representative supported engines/screen reader and scoped contrast/target checks. `FocusedDialog.tsx` financial behavior must remain intact. **Policy dependencies:** none; no WCAG certification from source inspection. **Batch:** B-U3.

### U04 / U05 — Small verified presentation defects

**Current / gap / files:** U04 duplicates Reports headings in `ReportsWorkspace.tsx:7` and `ReportsPage.tsx:139` (V01). U05 uses three `col-md-4` controls in `StatusPanel.tsx:272-312`, truncating a placeholder when the persistent sidebar constrains tablet content (V02).

**Minimal proposed change:** U04 gives the shared workspace one main title and subordinate content. U05 stacks the existing fields by available width. Keep each change independently revertible; no new dialog/form data.

**Security/financial risk:** Low; preserve labels/required fields/permissions. **UI/UX:** cleaner hierarchy and readable controls. **Performance:** negligible; no backend change or speed claim.

**Required tests:** Existing report/standing regressions only as affected, plus representative direct/shared Reports and status-form captures at both widths, keyboard/zoom and all selected options. No CSS-mirroring unit tests. **Policy dependencies:** none. **Batch:** B-U4.

### U06 — Contextual labels and secondary density

**Current / gap / files:** Some screens retain command jargon and repeated bordered context; Dashboard's selected-cycle banner is large. Relevant `PayoutCyclesPage.tsx`, `OvrDrafts.tsx`, `StatusPanel.tsx`, `DashboardPage.tsx:84` and shared styles. Most blocked/loading/financial-state distinctions already exist.

**Minimal proposed change:** Replace only confusing action labels and trim secondary introduction/card spacing by screen. Preserve purpose-specific accessible names, error recovery, current context and visible unresolved work. No global font replacement, new stepper, decorative dashboard chart or broad redesign.

**Security/financial risk:** Medium if distinct commands are mislabeled as one or evidence disappears. **UI/UX:** clearer next action. **Performance:** do not present visual simplification as service optimization.

**Required tests:** Context/confirmation/error-feedback tests and affected role/state browser checks; verify each label against the actual command. **Policy dependencies:** none for wording; a changed business meaning requires a separate decision. **Batch:** B-U5 after U01-U03.

## Performance investigations

### P01 — Home/Dashboard and repeated access reads

**Current / exact gap:** P10 recorded Home 7.00 s and Dashboard 7.44 s/580 SELECTs on 835 scholars. `DashboardPage.tsx:38` and `App.tsx` both load permissions; authoritative reporting/count work remains substantial. No fresh timing or regression is established.

**Minimal proposed investigation / files:** Profile existing `server/dashboard/{service,summary}.ts`, report readers, `DashboardPage.tsx` and import boundaries under equivalent fixtures. Evaluate request consolidation only with current permission/role/state semantics.

**Security/financial risk:** High if stale access or fabricated counts replace fresh facts. **UI/UX:** truthful loading already exists; lower verified wait is the objective. **Performance:** measure service, SQL, HTTP, browser and memory separately; retain R01-R07 and cache invalidation.

**Required tests:** `tests/dashboard.test.ts`, `tests/dashboard-summary.test.ts`, `tests/read-cache.test.ts`, `tests/notification-queries.test.ts` and existing Dashboard parity drivers; complete-output, empty/error, scope and revoked-access equivalence. **Policy dependencies:** agree office response targets; no claiming policy dependency. **Batch:** B-P1; investigation precedes any fix proposal.

### P02 — Heavy legacy payroll detail and memory

**Current / exact gap:** P10 reported 15.21 s/3,188 SELECTs/36.11 MB and about 1,522 MiB sampled RSS. Existing compact readers are lighter; R07 stable retained memory did not remove transient-peak concerns.

**Minimal proposed investigation / files:** Trace consumers of `server/ovr/service.ts`, `server/ovr/detail-reads.ts:40/71`, `server/ovr/complete-detail.ts:18` and `src/OvrDrafts.tsx` without changing consequential checks. The inspected summary reader avoids full history expansion, while the complete-detail reader gathers payment/correction history. Prefer existing scoped reads where equivalent; prove a bounded output projection before replacing any full-evidence read.

**Security/financial risk:** High if sources/history are omitted or caches authorize writes. **UI/UX:** reduce unnecessary full-detail waiting without hiding evidence. **Performance:** profile peak/retained memory, serialization and shared-host concurrency; larger heap is not the proposed remedy.

**Required tests:** `tests/payroll-detail.test.ts`, candidate/cohort/cache regressions, existing complete-output parity and finalization/source-change drivers. **Policy dependencies:** target-host workload/response budget, no PB1 prerequisite. **Batch:** B-P2.

### P03 — Evidence, document/report and backup capacity

**Current / exact gap / files:** `server/stored-json.ts:25` enforces an 800,000-byte finalization envelope; `scripts/backup-lib.mjs:11` caps raw SQL at 64 MiB. `document-model.ts:15`, `report-reads.ts:15` and `report-service.ts:29` retain DOCX/report safety bounds. Larger historical fixture rejection and collection growth are documented limits, not new corruption.

**Minimal proposed investigation:** Estimate actual approved template/append-only history/audit growth, backup headroom, maximum intended batch/report size and restore behavior. Propose monitoring/stop thresholds and scoped storage changes only after evidence; retain valid smaller batches, all original evidence and current safety bounds.

**Security/financial risk:** High if truncation or unsupported restore loses evidence. **UI/UX:** explain capacity blockers before irreversible work. **Performance:** assess compressed/raw sizes, memory peaks, DB packets and recovery time separately.

**Required tests:** `tests/stored-json.test.ts`, `tests/backup.test.ts`, document/report tests and authorized growth/restore scenarios. **Policy dependencies:** workload/retention/recovery objectives; official template content for realistic form-size validation. **Batch:** B-P3.

## Security and operational readiness

### S01 — Current dependency exposure

**Current / gap / files:** P10 retains seven existing advisories including two critical; `package.json`/`package-lock.json` declare actual versions. Current exposure, reachable production/build paths and a tested upgrade set are not established by this planning review.

**Minimal proposed investigation:** Read the recorded advisory details, verify current dependency paths/official advisories, distinguish runtime/build/test exposure, and propose the smallest compatible updates. No install, audit network request or update was performed now.

**Security/financial risk:** High investigation priority; advisory severity remains, but no exploit is demonstrated here. **UI/UX:** avoid unrelated visual changes. **Performance:** upgrades may affect build/bundle/server behavior and need equivalent measurements if material.

**Required tests:** Targeted affected auth/server/build/export tests, lint/typecheck/build, relevant financial regressions and migration/runtime compatibility as warranted. **Policy dependencies:** technical scope authorization, deployment/activation separate. **Batch:** B-S1.

### S02 — Operational backup, recovery and incident ownership

**Current / gap / files:** `backup-lib.mjs`, `backup.mjs`, Drive backup helpers and backup-status tooling exist; P10's isolated restore is historical local evidence. Off-host/key custody, agreed retention/recovery targets, incident escalation, witnessed restore and Coordinator validation are not certified.

**Minimal proposed next step:** Assign operators/custodians and objectives, inspect configured procedures without exposing secrets, then arrange an isolated witnessed restore using current approved tooling. Do not restore over the only current database or infer an unsafe populated downgrade.

**Security/financial risk:** High: host/key loss, stale restore or erased later transactions. **UI/UX:** accurate backup status and recovery handoffs; no new admin dashboard required. **Performance:** growth/capacity validation coordinates with P03; local timings do not establish RTO.

**Required tests:** Existing backup/Drive tests, migration/recovery and individual-document/financial preservation drivers, then a separately authorized operational drill. **Policy dependencies:** Q35 owners plus retention, off-host custody, acceptable data loss/recovery time and sign-offs. **Batch:** B-S2.

### S03 — Release evidence and office handoffs

**Current / gap / files:** P10 canonical post-gate grant checks passed, but initial semantic equality cannot be reconstructed from raw hashes. Account disabling, role commands and calendar locks exist; Q34/Q40/Q43/Q44 specify office responsibility, not named operational sign-off.

**Minimal proposed next step:** Preserve that qualification; establish fresh canonical source/build/migration/grant evidence for a later authorized release. Document Coordinator notification/validation, supplied calendar sources, pending approval during absence, and training on actual date/entry time, Unclaimed/omitted and Original/Updated. Use existing command-based administration; no new permission/editor/fallback role.

**Security/financial risk:** High if a future release is treated as accepted by default; Medium documentation ambiguity. **UI/UX:** consistent terms and clear ownership. **Performance:** acceptance includes resolved capacity findings rather than cosmetic loading indicators.

**Required tests:** Existing authorization/revocation, configuration/locks, office-release and selected end-to-end workflows during an authorized release exercise. **Policy dependencies:** named office/technical acceptance, exact future maintenance window/package/backup and separate deployment/flag approvals. **Batch:** B-S3; not P11 authorization.

## Items deliberately excluded

No new portal, scoring/ranking/interview module, non-degree entitlement, compulsory scans, representative identity store, generic waiver, blanket second-person approval, universal report-download approval, automatic external messaging, framework migration or complete redesign is justified by these answers. Unknown facts stay unknown. A function available behind an intentional disabled flag is not “missing,” and this backlog never enables it.

No source/test/dependency/schema/permission/financial-record change or deployment is included in this delivery. Implement only after the user selects and explicitly approves a concrete batch.

