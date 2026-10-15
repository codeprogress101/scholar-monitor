# Phase 03 - Workflow, policy, and data specification

Date: 2026-10-06. Specification complete with explicit deferrals. This describes planned behavior, not functionality already delivered or a legal-compliance certification. Phase 04 may add dormant structures; unresolved rules must not be enabled by default.

## 1. Sources and precedence

- **U:** User decisions recorded in the [implementation tracker](LDSS_WORKFLOW_CHANGE_IMPLEMENTATION_PLAN.md). Later decisions supersede earlier statements, particularly automatic removal for failed grades.
- **P:** Supplied 37-slide presentation, `LGU_Daet_Expanded_Scholarship_Orange_Minimal_with_Agreement(1).pptx`. Slide numbers below refer to the presentation, not independent verification of the controlling ordinance and amendments.
- **W:** [End-to-end workflow reference](../LGU_Daet_Scholarship_End_to_End_Workflows.pdf), seven pages. Its workflow names and suggested controls are not automatically legal requirements.
- **C:** Current repository after Phase 02. Existing F00-F36 behavior remains the compatibility baseline.
- **D:** Engineering design in this specification. These choices must not be presented as ordinance provisions.

The supplied presentation and PDF were re-read for this specification. No new legal interpretation is needed to add inactive data structures. Before operational enforcement, policy versions must identify the actual approved source, scope, effective date, and authority. Source disagreement is retained as a review item, not resolved through an undocumented code default.

## 2. Policy register

| ID | Rule and provenance | Implementation treatment |
| --- | --- | --- |
| R01 | Passing the LGU qualifying exam is distinct from selection (U; P24-25; W2-3). | Record examination outcome, interview evidence, qualification and selection separately. No invented interview score, passing score, ranking formula, or quota. |
| R02 | New scholars need selection, final verified documents, completed/notarized agreement, and authorized admission (U; P26,35-36; W3). | Agreement custody/verification is separate from selection and from the approval decision. An encoder is not assumed to be the signatory. |
| R03 | Existing scholars need not repeat admission (U; P28 allows an authorized transition). | Coordinator-reviewed baseline roster establishes accepted prior participation, not fabricated exam, agreement, or document history. Record transition authority once per roster batch. |
| R04 | Continuing: current COR and immediately preceding completed semester COG. New first-year: admission-grade alternative when no college semester exists (U implementation rule). | Explicit document coverage and predecessor relation; do not infer coverage from upload/receipt date or payout number. |
| R05 | Degree average must be 2.50 or lower on the confirmed scale, with no failed/dropped/unresolved INC subjects; full load (U; P22,27). | Derive compliance from verified findings and approved grading version. Unknown findings are not false/zero. An equivalent scale requires approved mapping, never an improvised conversion. |
| R06 | Maintenance failure blocks payout; termination requires a formal authorized decision (U; P19,22; W4). | Subject failure does not write a terminal scholarship status. No automatic failed-subject exception or reinstatement. |
| R07 | Prior permission for transfers/shifts; one course shift, by beginning of first semester of second year; non-degree to degree prohibited (U; P27). | Check every ordinary and official-amendment path. Unknown prior shift history or boundary date requires review. No one-transfer limit is invented. |
| R08 | One full PHP 5,000 degree entitlement per eligible semester (U; P28). | Amount in integer centavos: 500000. Uniqueness is scholar + semester + benefit type, independent of annual application, cycle, or batch. |
| R09 | Non-degree benefits are scholastic fees, with applicable TESDA grade exemption (U; P23,28). | Keep category explicit. No automatic degree stipend; fee workflow and exact exemption scope remain restricted. |
| R10 | Coordinator batch approval and Staff recording of actual release (U; W5-6). | Approval never creates a paid record. Preserve actual recipient, releasing officer and evidence separately from encoder. |
| R11 | Unclaimed is not forfeited; graduation preserves earned final-semester entitlement (U). | No automatic cancellation of unclaimed assistance. Graduation excludes future periods; final-semester rights use period-specific evidence. |
| R12 | Separate states, individual documents, immutable history, technical-only admin (U; W6-7; C). | Reuse permissions, immutable snapshots, optimistic versions, idempotency and atomic audits. |

## 3. Two journeys with one semester workspace

### Continuing scholars

1. Staff encodes/imports names from the hard-copy roster. Reuse duplicate review and permanent scholar identity; ambiguous matches require resolution, never automatic merging.
2. Coordinator accepts the reviewed roster with its actual source and authority reference. Each member links to that batch decision. Names-only records can remain incomplete; acceptance is not payout eligibility.
3. Staff finds the scholar and selects the working semester. The system prepares the semester context and applicable individual documents once, with safe retries. Prior receipts are never copied into the new semester.
4. Receive COR and/or COG. Enter only new or changed information from the documents. Current year level, school, course, and remaining requirements are visible together.
5. Verify each document and record academic findings. The server derives compliance and explains blockers. Correction/resubmission replaces no evidence: a new receipt/review links to the earlier one.
6. Eligible degree entitlements feed the OVR draft. Coordinator approves; Staff records release. Reconcile outcomes, then close the cycle/semester. Carry unresolved cases as explicit follow-up records.

Unknown birth dates, placement, category, prior shifts and historical grades remain Not recorded. Do not synthesize dates, mark admission documents Verified, create fake qualification events, or reset shift counts to zero. Before money can be approved, identity must be sufficiently resolved to prevent duplicate payment and current required evidence must be complete.

### New applicants

Proposed user path: application/exam registration -> LGU examination -> initial-document review -> interview -> qualification -> selection -> final documents/agreement/notarization -> authorized admission -> official membership -> semester monitoring.

Keep an explicit pending-selection stage and NOT QUALIFIED versus NOT SELECTED outcomes. Existing `qualified` may support a derived For selection work queue; do not rename stored history merely to match the PDF. New examination/interview/admission evidence must be additive.

**Sequence gate:** P20-21,24 and W1-2 describe preliminary review before examination. The user proposes document completion after examination. Store independent milestone evidence first; do not enforce or enable a new applicant sequence until the authorized operating sequence is recorded. No made-up annual exam schedule or automatic next-year application is created.

## 4. Independent state ownership

Names below are conceptual for new records; they do not authorize renaming existing status values.

| Dimension | Owner and meaning | Must not imply |
| --- | --- | --- |
| Applicant qualification | Existing annual `scholarship_records` / `qualification_events`, supplemented by milestone evidence | Exam passed or Selected is not admission or payout eligibility. |
| Participation/admission | New participation decision history: pending / accepted / rejected, entry basis new / continuing baseline | Baseline acceptance does not assert missing historic documents exist. |
| Scholarship standing | Existing status requests/decisions, with a documented cross-year participation projection | Failed subject is not existing `dropped` program status. Leave/review is not automatic termination. |
| Semester compliance | New versioned review: pending / review_required / compliant / noncompliant | Verified COG only confirms document verification; it does not guarantee acceptable grades. |
| Official masterlist | Existing draft/review/approval/publication/version history | Official membership is not a payout-specific list or proof of payment. |
| Eligibility | Server-owned assessment using pinned authoritative inputs | Staff cannot force an eligible flag. |
| Entitlement | One semester benefit with versioned approval/hold history | Approval is not release; holding does not delete the entitlement. |
| Batch processing | Existing OVR draft/review/finalized/submitted/processed/closed | Processed is not released. |
| Individual payout | Release / unclaimed / withheld information associated with the entitlement | Existing `not_paid` is not silently converted to unclaimed; its reason may differ. |

W4's masterlist description resembles a payout roster. C keeps annual official membership separate from OVR. Retain that separation: the OVR is the eligible payment list, and the annual masterlist remains the official membership source. No circular rule requiring payout eligibility to establish the membership needed for eligibility.

Legacy operational standing is annual. A future participation projection must link explicit accepted/current decisions across years; do not create fake Selected events for continuing scholars or infer graduation from an older unrelated annual row. Never introduce two independently writable current-status fields.

## 5. Semester evidence and academic rules

- Each working semester has an explicit academic year, dates, ordinal where known, and predecessor semester. Irregular/summer calendars need an approved predecessor mapping; no subtraction from a semester label.
- COR coverage is the working semester. COG coverage is its immediately preceding completed semester. A newly admitted college-level student still supplies previous college grades; first-year alternatives depend on actual academic history, not simply being a new scholarship applicant.
- Give each document a stable requirement-instance ID and versioned coverage link. An admission-grade alternative is recorded as the applicable requirement, not as a falsely Verified college COG. Legitimate reuse across contexts links the same verified evidence; it does not duplicate physical receipts.
- Enrollment, school, course and year level come from current evidence. Do not automatically increment year level with the calendar. Preserve existing free-text year labels; add normalized level only when confirmed. A normalized second-year rule cannot rely on arbitrary string matching.
- Annual `academic_records` plus approved `academic_changes` remain the placement authority. A semester stores a snapshot and provenance pointing to that approved placement revision. A changed school/course goes through existing approval/amendment logic; receipt alone cannot silently approve a transfer. Within-year year-level changes likewise require recorded evidence and controlled revision.
- Academic review records average, grading-policy version, failed/dropped/INC findings, enrollment and full-load findings, coverage semester, and exact document versions. Boolean findings are nullable until checked. Prefer yes/no findings and counts only when needed; do not demand encoding every subject on a clean COG.
- Compare the grade on its approved native scale. Preserve original value and approved rule, including direction, valid range, equivalent threshold, precision and boundary treatment. No conversion formula or rounding advantage is assumed. Unknown scheme or incomplete mapping yields review_required.
- Derivation order: verified disqualifying findings produce noncompliant; otherwise unresolved policy/placement produces review_required; missing/unverified evidence produces pending; only all applicable checks satisfied produces compliant. Return all blockers even when one determines the headline state.
- Changed or corrected documents invalidate current review/eligibility freshness. A replacement review references its predecessor and supporting revisions; prior findings and finalized snapshots remain readable.
- Waiver remains a distinct authorized document decision. It cannot by itself establish a passing average, full load, permitted shift or admission. A positive eligibility override cannot bypass mandatory academic rules without separately established authority and permitted policy scope.

## 6. Authority and practical input rules

Keep Staff, Coordinator and System Administrator boundaries from C. Preserve existing separation between requestor and approver where enforced. A Coordinator role is application permission, not proof of committee delegation (P19,26-27 versus W6).

Add a reusable authority reference with issuer, actual reference identifier, covered decision kinds, effective dates, source location, and approved version. Record it once per authorized policy/roster/batch where applicable; individual decisions link to it. Record actor, authority, actual decision date, affected period and recording timestamp separately. An expired/inapplicable authority blocks new decisions without invalidating historical snapshots automatically.

Admin may maintain technical configuration but cannot approve the policy authority, scholar, waiver, entitlement or payout by that access alone. Any new permission/grant must be explicit, default-deny and tested in its delivery phase.

| Routine operation | Staff input | Automatic/reused information |
| --- | --- | --- |
| Receive hard-copy documents | Select documents physically received; date defaults to today; location/note only if needed | Scholar, working period, applicable checklist, receiver, timestamp, audit description |
| Record placement | Missing/changed school, course, year level | Identity and period context; no repeated name/address entry |
| Verify clean documents | Confirm document checks and academic findings once | Document coverage, existing placement, selected approved grading policy |
| Return/reject/remove/override | Meaningful reason; actual exceptional authority where needed | Suggested reason choices, actor/time, internal reference |
| Approve batch | Review frozen roster, amount and blockers; choose applicable authority | Total and individual PHP 5,000 amounts, linked source versions |
| Release stipend | Confirm actual recipient/release date and real release evidence | Approved amount, batch and scholar context; encoder attribution |

Never automatically check that a physical document was reviewed. Use progressive disclosure for optional notes and reuse authority links; an internal generated reference must not masquerade as a notarial, committee or treasury reference.

## 7. Additive data contract for Phase 04

Proposed names below are design targets, not tables already present. Final SQL may split records into identity/event/command tables to follow repository conventions.

| Proposed record | Minimum contents and invariants |
| --- | --- |
| `workflow_policy_versions` | Immutable source, rule payload/version, effective period, approver and authority. Unresolved settings remain absent/restricted. No default enabled policy. |
| `workflow_authority_versions` | Actual issuer/reference, decision scope, validity, approval provenance. Never seed fictitious delegated authority. |
| `participations` and participation events | Stable scholar FK; entry basis; accepted/rejected decision history; baseline roster or admission evidence link; effective date; category/contract details when known. Unknown history explicitly tagged. |
| `continuing_roster_batches` and entries | Batch source/authority, reviewed identity links, original name text, acceptance snapshot and duplicate-resolution provenance. Accepted member cannot be silently reassigned. |
| `scholar_semesters` and revisions | Unique scholar + semester; participation FK; compatible annual-record link nullable during transition; approved placement snapshot/revision; current enrollment/year evidence; revision and policy links. No fabricated annual qualification row. |
| `requirement_coverage` | Requirement-instance/evidence links, document kind, coverage semester or admission evidence basis, revision. Separate COR/COG; no mutable generic completeness checkbox. |
| `semester_review_events` | Scholar-semester FK, findings, policy version, source document/placement revisions, derived result, superseded-review link, actor/time. Append-only. |
| `semester_entitlements` and events | Unique scholar + semester + benefit type, PHP currency, exact amount, assessment/review provenance, holds/approvals, graduation-period handling. No uniqueness based solely on cycle. |
| Entitlement-to-OVR/payment links | Approved amount and roster revision; stable entitlement link and release reservation. Enforce one full release across all batches/cycles transactionally. |
| Cohort/period workflow designation | Explicit test scope and engine version; default remains legacy. Once used, changes require recorded transition, not an unrestricted toggle. |

Use restrictive foreign keys, fixed-precision financial storage, unique constraints, actor-scoped idempotency keys and expected versions. Execute each command, source checks, resulting events, and audit in one transaction. Maintain consistent shared-lock ordering with existing services.

Do not auto-backfill participation, zero shift counts, document coverage, release outcomes or entitlements from incomplete legacy records. Phase 04 adds structures dormant; subsequent phases populate only reviewed/synthetic records. Legacy payments must be reconciled before a real cohort is designated, so the new engine cannot pay an existing semester again.

## 8. Repository integration map

All listed existing API paths use `/api/v1`; new paths are proposals.

| Capability | Existing files / API | Existing tables / screen | Planned extension |
| --- | --- | --- | --- |
| Identity/import | `server/scholars/service.ts`, `server/imports/service.ts`; `/scholars` | `scholars`, `scholar_identifiers`, `import_jobs`; `ScholarsPage.tsx`, `ScholarImport.tsx` | Reviewed continuing-roster import and participation link; retain duplicate handling. |
| Admission/selection | `server/qualification/service.ts`; `/scholars/:id/scholarships`, `/scholarships/:id/qualification/:action` | `scholarship_records`, `qualification_events`; `QualificationPanel.tsx` | Milestones, agreement/admission evidence; proposed `/participations` commands. |
| Placement/year | `server/academic/service.ts`, `server/academic/changes-service.ts`; `/scholars/:id/academic-records` | `academic_records`, `academic_changes`, `academic_change_decisions`; `AcademicPanel.tsx`, `AcademicChanges.tsx`, `ScholarAcademicSummary.tsx` | Semester snapshot and provenance; consistent shift controls through amendments too. |
| Standing | `server/status/service.ts`; `/scholarships/:id/status/requests` | `scholarship_records`, `status_change_requests`, `status_change_decisions`; `StatusPanel.tsx` | Cross-year participation projection; formal leave/withdrawal/graduation treatment. |
| Official membership | `server/masterlists/service.ts`, workflow/amendment services | `masterlist_versions`, `masterlist_entries`, `masterlist_publications`, `masterlist_amendment_versions`; `MasterlistsPage.tsx` | Accepted continuing participation can qualify for a new reviewed membership path without fake exam events. |
| Receipt/verification | `server/requirements/instances-service.ts`, `receipt-service.ts`, `workflow-service.ts`; `/scholarships/:id/requirements/provision`, `/requirement-checklists/:id/receive` | `requirement_instances`, `requirement_receipts`, `requirement_workflow_events`, `requirement_waivers`; `ReceivingRequirements.tsx`, `RequirementWorkflow.tsx` | Coverage links, first-year alternatives and semester review; keep automatic provisioning. |
| Eligibility | `server/eligibility/engine.ts`, `service.ts`, `override-service.ts` | `payout_eligibility`, `eligibility_overrides`; `EligibilityPanel.tsx`, `EligibilityReport.tsx` | Versioned semester engine, proposed `/scholar-semesters/:id/reviews`; compare against legacy without authorizing new payments initially. |
| Finance/release | `server/ovr/service.ts`, `processing-service.ts`, `payment-correction-service.ts` | `ovr_batches`, `ovr_finalizations`, `payment_records`, `payment_corrections`; `OvrDrafts.tsx`, `OvrProcessingPanel.tsx` | Frozen entitlement amounts, release evidence, unclaimed/withheld separation, duplicate-release prevention. |
| Closing/reporting | `server/payouts/closure.ts`, `server/dashboard/service.ts`, `server/reports/service.ts`, `server/audit/service.ts` | `payout_cycle_versions`, `audit_logs`; `PayoutCyclesPage.tsx`, `DashboardPage.tsx`, `ReportsPage.tsx`, `ScholarTimeline.tsx` | Semester-wide reconciliation and explicit unresolved-case reporting; preserve current cycle guard. |

The current engine checks active standing, official membership and satisfied cycle documents. It does not yet enforce the proposed academic findings or semester entitlement. The current release amount remains flexible until Phase 09. Do not present this specification as a completed policy change.

## 9. Restricted decisions and differences

| Issue | Safe behavior now / resolution gate |
| --- | --- |
| Examination order | Record difference described in section 3; operational sequence approval before Phase 11 activation. |
| Committee versus Coordinator authority | No fabricated delegation; actual reference and scope before new approval functions operate. |
| INC cleared after closed payroll | No reopening or supplemental release. Preserve corrected evidence; future retroactive policy must authorize a distinct versioned process. |
| Failure discovered after payment | Do not reverse payment or rewrite historical eligibility. Record finding/affected period for authorized review. |
| Leave, termination, reinstatement | Distinguish subject findings from program decisions. Unknown leave/reinstatement rules remain for review; no automatic terminal action. |
| Transfer/shift override suggested by W4 | Do not allow generic override to bypass R07. Approved exception policy would be required; none is assumed. |
| Family-beneficiary limit, outside-Daet allocation, income wording, contract duration, orientation/community obligations | P9,12-15,24,27,33-34 need explicit operational interpretation and supporting data. Track unresolved checks; do not claim full ordinance coverage or silently mark them satisfied. |
| Payment collection by representative | Disabled in new release path until authorization/ID policy is recorded. |
| Non-degree fees and TESDA exemption scope | No automatic degree entitlement; retain review/category data for later approved benefit workflow. |
| Accounting/treasury/signature stages in W5 | Preserve existing submitted/processed evidence. Do not claim it proves each institutional check; define actual checkpoints and owners before enforcing extra steps. |
| Existing locked cycle with unfinished batches | Remains blocked from closure. Phase 10 must design an authorized append-only recovery mechanism; never directly edit its prior state. |
| Legacy payment overlap at cutover | Require reconciliation of historical payments and unresolved batches before enabling real entitlements; ambiguous cases remain blocked. |

## 10. Verification and delivery gates

Phase 04 must test: new migrations on an isolated restored copy; old row/schema checksums for unchanged objects; existing runtime grants and 35-suite regression compatibility; restrictive FKs and duplicate constraints; safe partial-DDL recovery on MariaDB. Never modify one of the 29 applied migrations. Update fixture migration-count expectations only for new migrations actually delivered.

Later acceptance scenarios:

1. Names-only accepted continuing scholar enters semester monitoring without invented exam/agreement history; incomplete current evidence still blocks payout.
2. COR alone leaves COG missing. Wrong-semester COG cannot satisfy coverage. New first-year admission alternative is visible and auditable.
3. Exactly 2.50 passes the confirmed scale; worse than 2.50 fails; unknown equivalency blocks automatic eligibility. Verified INC remains noncompliant until verified resolution.
4. Failed subject blocks payment without changing program status. Waiver/override cannot bypass a non-overridable maintenance rule.
5. Transfer and shift restrictions apply to both ordinary changes and official amendments. Unknown shift history requires review.
6. Concurrent entitlement creation yields one record. Two batches/cycles cannot release two semester stipends; partial degree amounts fail.
7. Graduation stops future preparation while a valid final-semester entitlement remains payable under its frozen authority/evidence.
8. Staff cannot approve batches; Admin cannot approve scholarships; requestor/approver separation and expired authority checks hold.
9. Corrections preserve original documents/reviews/official snapshots. Closed periods never reopen automatically.
10. Staff receiving needs one scholar/semester context and selected physical documents, with no manual generation or repeated reason/reference entry.

Phase 03 validation is document/source mapping and link checks, not a rerun of application UAT. No application code, migration, permission, or business-data change is part of this phase. Phase 02's successful gate remains historical evidence for the unchanged application. Next: implement the additive foundation in isolated test scope, retaining the restrictions above.
