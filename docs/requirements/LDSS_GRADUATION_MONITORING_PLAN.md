# Graduation Monitoring in Scholar Registry

24 October 2026, Philippine time. **Design and migration proposal only.** N08–N10, Q14–Q16/Q38–Q39 and historical B02/B04/B05/B07/B08 apply. Track A6 is defined in the [integrated backlog](LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md); implementation needs separate approval.

## Current capability and exact gap

`src/ScholarWorkspace.tsx` already wraps All Scholars and Continuing roster review. `src/StatusPanel.tsx` and `server/status/{model,service,graduation}.ts` implement formal standing requests/decisions, graduation corrections, final funded semester and archival/payment protection. `server/academic/changes-service.ts` resolves approved current placement; Registry has provisional intake fallback. None of these is an expected-graduation monitoring ledger or a paginated potential-graduate tab.

`courses` and `schools` configuration currently contains references, names and archive/version metadata, not authoritative duration. `server/continuing/semester-academic.ts` stores degree/non-degree/unknown **category**, not years of study. `year_level` is not a completion percentage. The `years` constants in `scripts/uat-two-batch-variety.ts` are explicitly fictional fixture facts; a course name containing “five-year” does not establish a production rule. No existing official duration dataset was supplied or queried.

## Proposed information model

| Label | Required basis / behavior |
|---|---|
| **Potentially Graduating** | Current approved placement and normalized current year level equals a current, evidenced program-duration reference applicable to that scholar's school/program/cohort. This is a derived review candidate, not a status decision |
| **Expected to Graduate** | A current Staff-reviewed school/office evidence reference supporting the expected completion period; never assigned from year level alone |
| **Graduation Delayed / Continue Monitoring** | A recorded supported review that completion remains unconfirmed/delayed and follow-up is needed; no inferred failure, termination or automatic calendar expiry |
| **Graduated** | Existing formal approved standing/graduation reader, supported by Q16 official school evidence and applicable decision controls; not a new monitoring-command value |
| Cannot determine / Needs re-review | Explanations, not extra permanent scholarship statuses. Missing/ambiguous duration, placement, semester context or stale evidence must remain visible |

Examples: Year IV + known four-year program → Potentially Graduating; Year IV + known five-year program → not automatically a final-year candidate; Year V + known five-year program → Potentially Graduating. Unknown program duration or Course pending → “Cannot determine automatically — confirm program and duration.” A year level beyond the known duration prompts placement/completion review; it does not automatically create a delayed finding. A supported school expected-completion notice can justify Expected even when duration is not yet mapped; show that missing duration separately.

Use a documented precedence: formal Graduated first; then latest applicable evidence-supported expected/delayed review; then derived Potentially Graduating; otherwise explain missing basis. Preserve all prior review events. A stale or disputed review must not silently appear current or turn into a formal decision.

## Duration evidence proposal, DM-G1

Recommend a minimal **versioned duration-reference structure**, separately approved before migration. Candidate fields: reference identity/revision; school and course FK; applicable curriculum/cohort or academic-year range; integer expected study years; source issuer/reference/location; effective scope; actor/recorded timestamp; reviewed decision/source version; supersession/reason. Exact DDL, indices, runtime grants and operation permissions must be reviewed in A6 before implementation.

Do not alter course names to encode duration or set every degree to four years. Generic course names shared by schools may have different curricula; exact school/course alone is insufficient if evidence specifies a cohort or curriculum. Multiple applicable conflicting references mean unresolved, not “take latest.” No reference means unknown. Do not automatically migrate the fixture's eight programs into office reference data.

Proposed responsibility: Staff supplies a traceable official-school/program reference; Coordinator confirms academic applicability within existing operational authority. System Administrator may administer technical configuration only; configuring a reference does not originate an academic policy. Approve the precise permission mapping against existing `academic.changes.approve`/configuration controls before coding; this proposal grants nobody a new permission. Authority/content unavailable blocks automatic classification for that program, not unrelated registration or payment.

Corrections append a version with its reason and scope; never edit a reference used by an earlier review in place. This model supports monitoring only in the first scope. It must not become a new academic eligibility or scholarship-duration limit without separate policy approval.

## Monitoring evidence proposal, DM-G2

First reuse existing physical evidence references and current placement/standing readers. Generic status requests should not be abused to store Expected or Delayed, because doing so can imply a formal standing transition. If expected period and review history cannot be recorded/queryable safely in existing structures, propose one append-only **graduation monitoring event** stream keyed to permanent scholar and academic year, with semester when applicable.

Minimal event data: proposed monitoring review kind; supported expected completion period (term/year or exact date only if supplied); evidence reference/custody location; brief follow-up/result; current academic-record/approved-change identity and revision; applicable duration-reference revision where used; actor, real recording time, source/evidence date where known; expected prior revision; reason and command idempotency identity. No invented graduation day, grade history, document scan or representative identity is needed. Use existing transaction/audit/command infrastructure where its contract fits; otherwise include the smallest ownership/uniqueness constraints in the migration proposal.

Only the supported Expected/Delayed/follow-up facts are stored here. Potential is derived; Graduated comes from the existing standing service. Placement/course/cohort changes invalidate applicability of a prior monitoring assessment and show **Needs re-review**, retaining its old source. Duration corrections re-evaluate potential candidates and flag affected reviews without altering standing or finances. A verified formal graduation correction must flow through the existing graduation reader, not an inconsistent cached monitoring flag.

## Proposed tab and Staff workflow

Registry navigation: **All Scholars | Continuing Roster | Graduation Monitoring**. Reuse `ScholarWorkspace`, existing `filter-pills` navigation and normal hash routing; preserve `#continuing`, receiving/profile and roster deep links. A proposed new `#scholars?task=graduation` route is a design proposal, not an existing supported link. No new sidebar application module is needed.

One compact context row selects working year and relevant semester; explicit historical access remains. Provide search, monitoring category, school and a “Needs evidence/re-review” filter, result count and bounded pagination. Names lead, permanent IDs remain. Display school/course, current year level/known duration, academic year/semester, monitoring label, supported completion period and evidence/follow-up status. Show details in a row review panel rather than every narrative/history field in the table. Include incomplete final-year candidates in a reviewable “cannot determine” scope without claiming they are potential graduates.

1. Staff reviews derived candidates or searches a known scholar.
2. Review current placement and applicable duration/evidence; explain gaps rather than infer completion.
3. Record supported Expected/Delayed or follow-up information with real source and period; unsupported values cannot be saved as an approved fact.
4. Receive actual official graduation evidence through existing receiving/reference custody controls; attach its reference to the proper existing status request.
5. Use the existing authorized formal graduation review/decision workflow. A monitor button may navigate there with scholar/year context; it cannot approve the decision itself.
6. Revisit uncertain/potential cases during annual continuation review. Pending monitoring alone does not deny continuation; formal standing and current evidence remain authoritative.

Read access follows existing scholar/academic visibility. Routine evidence recording follows the approved operational role mapping; formal status approval remains `scholarship.status.approve`, and Staff cannot approve through a monitoring action. Pure Administrator access never implies scholarship decision authority. When Coordinator is absent, approvals wait under Q44; Staff can continue authorized evidence collection.

## Bounded queries and Dashboard

Propose a dedicated authorized, year-scoped COUNT + ordered page read using existing annual placement/classification sources and reviewed duration/reference facts. Hydrate evidence/history for selected rows only. Do not call `graduationRecords` and per-scholar full eligibility for the whole Registry just to fill this tab. Existing `graduationRecords` also resolves final stipend state and may be expensive; reuse its authoritative semantics through scoped readers or a verified equivalent bounded projection, never replace it with stored `operational_status` alone.

Start with a plain Dashboard link. Add an authoritative scoped review count only after profiling proves it inexpensive and tests reconcile it to the tab. Missing/unavailable count stays unavailable, not zero. Define whether it counts Potential, overdue supported Expected, unresolved evidence, or their distinct union; do not sum overlapping categories. No full history load or cross-request financial cache for this number.

## Financial separation

Monitoring never changes academic standing, official membership, eligibility, entitlement, allocation, payroll roster, payment or actual graduation date. Preserve `preventGraduateRenewal`, corrected graduation views, original decisions, final funded semester and valid final-semester stipend protections. An approved formal graduate may still have an outstanding valid final benefit; show that separately using existing release projections. Year V, an expected date passing or a monitoring note cannot cancel it. No generic waiver, new duration-based termination rule or automatic graduation batch is proposed.

## Acceptance and rollback

T05/T06 tests must include four/five-year known programs; unknown/conflicting/cohort-mismatched duration; Course pending; unrecognized year labels; current approved placement versus stale intake; year beyond duration; supported Expected without a mapped duration; stale review after shift/reference correction; real graduation/correction and final funded semester; and person visibility across years. Assert zero changes to financial and official-membership rows during monitoring commands, single-winner revisions, exact retries, role/CSRF denial and atomic audit rollback.

Extend `tests/{academic-summary,configuration,status,graduation-correction,graduate-receiving,dashboard-summary}.test.ts` as relevant, plus new actual monitoring source/query/event tests. Financial regression anchors include Registry/eligibility, historical omitted routes, payment recording/reconciliation and individual settlement. Browser evidence covers all four labels, unresolved explanations, evidence entry, navigation to real status review, keyboard/focus/320px non-table reflow and 820/1024/1440px table behavior. Expected dates use Asia/Manila; calendar midnight cannot auto-change formal status.

Schema/permission work remains DM-G1/DM-G2 approval gated. An initial read-only design/prototype may proceed after implementation authorization without an official duration list by truthfully showing unknown/reference-needed states. Automatic candidates require real applicable duration evidence. Rollback disables new monitoring writes/derivation release and retains versioned references/events and compatible readers. It never clears formal graduation, reverses payment, deletes audit or silently rewrites historic source scope.
