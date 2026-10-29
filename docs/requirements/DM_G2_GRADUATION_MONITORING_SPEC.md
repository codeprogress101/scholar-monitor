# DM-G2 — Graduation evidence, follow-up and corrections

24 October 2026, Philippine time. **Design and planning only. No monitoring writes, tables, permissions or UAT data changes have started.** Use with [DM-G1 duration](DM_G1_PROGRAM_DURATION_SPEC.md) and [the shared implementation contract](A6_2_GRADUATION_IMPLEMENTATION_CONTRACT.md).

## Current boundary and recommended approach

[A6.1](A6_1_GRADUATION_MONITORING_IMPLEMENTATION_REPORT.md) has the read-only screen and valid formal-standing links. Existing [status commands](../../server/status/service.ts), [graduation/correction reader](../../server/status/graduation.ts), academic records and prior reviews remain authoritative for their own purposes. They are not a supported Expected/Delayed/follow-up ledger. A generic status request, contact note, intake classification or internal notification must not be promoted into such a ledger.

Add an immutable monitoring case and append-only event stream. A case records evidence and the office's monitoring interpretation, never scholarship standing. Potential remains derived from DM-G1; Graduated remains external formal evidence. No monitoring command calls academic, membership, eligibility, entitlement, payment, calendar or rollover writers, increments a person/academic/admission version, or refreshes a frozen financial source pin.

## Case ownership and context

Use one case per **permanent person + selected academic year + review scope**. Scope is either annual or one existing semester of that year. Opening a panel/GET does not create a case. The first authorized evidence command creates its root and first event atomically. Initial registration is a valid discoverable association, not proof of academic readiness; an incomplete person may have an evidence-needs-review case without receiving an effective graduation indicator.

An annual case may additionally hold reviewed curriculum/cohort context needed by a scoped DM-G1 reference. This is a monitoring-only binding to the current academic placement, not a new admission year or academic placement revision. It can be established from an actual current school source even when the cohort predates LDSS. Only Coordinator review confirms it. Semester cases reuse the matching annual program context, not a separately invented cohort. A confirmed all-scope duration reference needs no artificial binding/case for every person.

### Annual/semester reads

- With an explicit semester, use that case's material assessment/review state if present; otherwise an applicable annual assessment may be shown, labelled **Annual review**. A stale/disputed semester assessment cannot fall back to a more convenient older/annual assessment.
- Without a semester, show the annual assessment. If material semester assessments/review holds also exist, use **Choose semester / needs context** for the combined view rather than merge different periods or pick the latest timestamp. Follow-up-only notes do not create this ambiguity.
- The unfiltered/unknown view keeps those people discoverable. When a category filter excludes semester-specific cases due to missing selected context, show a contextual instruction and an exact bounded-query count of cases needing semester selection; do not imply that no evidence exists.
- Case/history detail always states its year/scope. The existing formal-graduation projection retains precedence in every view. Historical year means that year's current interpreted evidence plus immutable recorded history, not an undocumented “as of” snapshot.

## Necessary evidence and precision

| Fact | Rule |
|---|---|
| Scholar/year/scope | Existing person/year IDs; semester must belong to that year; server owns case identity |
| Source | Type, issuer/reference, optional custody/location and actual known source date; source date may remain NULL |
| Expected completion | Supported precision `academic_year`, `semester` or `date`; never force an exact day |
| Delayed finding | Actual documented finding/follow-up and reason; no inference from Year V, an elapsed date or scholarship duration |
| Follow-up | Brief result, method and optional next follow-up date; not a substitute for academic verification |
| Academic basis | Current canonical annual academic record, effective approved-change ID/version, school/course/year and Course pending source where applicable, represented by compact server-built pins |
| Duration/program basis | Current applicable confirmed reference ID/revision/hash and confirmed annual curriculum/cohort context, or explicit unresolved NULLs |
| Correction | Exact earlier event/revision, reason, retained original facts and the reviewed replacement/disposition |
| Actor/time | Current session actor and actual server UTC recording time; source dates are separate |

Expected-period object is exactly one of:

```text
{precision:'academic_year', academicYearId:UUID|null, label:sourceText}
{precision:'semester', academicYearId:UUID|null, semesterId:UUID|null, label:sourceText}
{precision:'date', date:YYYY-MM-DD, label:sourceText|null}
```

Labels are 1–160 characters, normalized text. Use existing configured IDs where the source names an existing period; parent IDs must agree. An evidenced future named year/term not yet configured may retain its exact label with NULL IDs. Do not create a calendar year, guess its dates, assume a term end, or reconstruct N−1 to satisfy a monitoring form. Such a label cannot drive date arithmetic/reminders until its dates are genuinely known. Future expectation is not an entitlement extension. A supported past expected date can be recorded as evidence; its passage creates only a **Follow-up due** annotation, not Delayed or Graduated.

Expected requires a supported nonempty period. Delayed may reference a previous expectation without inventing a new forecast. Routine follow-up can leave the expected period unchanged. Evidence needs review may retain proposed expectation facts without presenting them as accepted/current.

No scans, ID photos, full COR/COG copies, contact-address duplication, grades or full academic snapshots. Use actual existing receiving/evidence references where they exist; a source location is not an assertion that a new requirements receipt/verification row was created.

## Proposed schema — two case tables plus shared receipts

### `graduation_monitoring_cases`

Immutable columns: `id` UUID PK; `scholar_id`, `academic_year_id` NOT NULL FKs; nullable `semester_id` FK; `created_by` user FK; actual `created_at`. Add stored generated `scope_key = COALESCE(semester_id,'00000000-0000-0000-0000-000000000000')` with ASCII binary collation and **UNIQUE `(scholar_id,academic_year_id,scope_key)`**. This deliberately avoids MySQL's multiple-NULL uniqueness trap. A CHECK on this new table rejects a non-NULL semester ID equal to the sentinel; do not alter/delete an existing semester to satisfy it. Add `(academic_year_id,scope_key,scholar_id,id)` for scoped reads. Parent year matching is rechecked under configuration guard before insertion; never move a root to another person/year/semester.

### `graduation_monitoring_events`

Composite PK `(case_id,revision)`; root FK; same-case composite predecessor FK; revision 1/NULL predecessor versus revision−1/required before-hash CHECK; 64-hex `before_hash`/`snapshot_hash`. Event kinds:

`record_expected`, `record_delayed`, `follow_up`, `flag_review`, `propose_correction`, `review_correction`, `correct_assessment`, `revalidate_assessment`, `record_program_context`, `review_program_context`.

Each row also contains:

| Column group | Recommended fields |
|---|---|
| Queryable current assessment | `assessment_kind` (`none/expected/delayed/needs_review`), nullable `assessment_revision`, `review_required BOOLEAN`, nullable `pending_review_revision` |
| Queryable annual program context | `program_context_state` (`none/proposed/confirmed/disputed`), nullable `program_context_revision`, nullable curriculum/cohort codes (same exact encoding as DM-G1) |
| Effective basis | Nullable `placement_hash`, `duration_reference_id`, `duration_revision`, `duration_snapshot_hash`; composite FK to the specific duration event when supplied |
| Operation links | Nullable `corrects_revision`, `reviews_revision`, with same-case FKs and earlier-revision checks |
| Evidence/state | `snapshot JSON NOT NULL`, format `graduation-monitoring/v1`, containing the compact complete assessment/program-context state, typed period object, source facts, pins, follow-up and explicit unresolved reason codes |
| Trace | `source_reference VARCHAR(300)` (3–300), `reason VARCHAR(500)` (5–500), user `actor_id` FK, UUID `command_id`, real `recorded_at DATETIME(6)` |

`assessment_revision`, pending-review and context pointers must reference the same case's origin/review event or the new event itself, and must match its kind/content. They are server-computed, not accepted client fields. Annual context is only allowed on the annual root; semester writes cannot insert it. Cross-row ownership and transition checks belong in the service in addition to DDL FKs/CHECKs. Every snapshot retains both state parts; a follow-up cannot clear an assessment/context by omitting it. Do not store an unbounded accumulated list of notes in the head: older notes remain individual events in paginated history.

Index `(assessment_kind,case_id,revision)` and `(review_required,case_id,revision)` alongside the PK. Use a latest-head join before evaluating those columns; an old Expected row cannot make the current head Expected. All root/event tables get no-update/no-delete triggers. Runtime needs SELECT/INSERT only. Shared `graduation_commands`, audits and hashes are defined in the contract; no new payment/academic/status table column is needed.

## Permission and operation rules

Every operation also requires `scholars.read`. Proposed **`graduation.monitoring.record`** is seeded to Staff and Coordinator; **`graduation.monitoring.review`** to Coordinator only. Neither exists today. Pure Administrator/unassigned receive neither. No role label substitutes for permission checks.

| Action | Record permission | Review permission / precise limit |
|---|---|---|
| Record supported Expected or actual Delayed finding | Staff/Coordinator can record routine **new evidence**, after explicit source review | No separate Coordinator approval for every initial/routine assessment |
| Routine follow-up | Append result/source/optional next action; preserves accepted facts | Does not approve graduation or silently revise a source/date |
| Evidence requiring review / dispute | Record actual unresolved finding with cause and source; withhold automatic use as applicable | Coordinator resolves a material dispute against fresh sources |
| Correct an earlier accepted period, basis, kind or source | Staff proposes a linked material correction; it remains pending and marks the interpretation for review | Coordinator accepts/rejects/revalidates with source/reason and expected head; may directly append their own reviewed correction |
| Fix free-text follow-up wording | Staff appends a note correcting the identified note | Cannot alter classification, expected period, source ownership or previous text |
| Curriculum/cohort binding | Staff supplies proposed codes and actual school source, pinned to current placement | Coordinator confirms/rejects applicability; no implied academic edit |
| Revalidate an unchanged earlier assessment | Staff can collect supporting follow-up; cannot silently update its old pins | Coordinator uses `revalidate_assessment` with fresh review-source hash and actual source review; no replacement period/kind/source facts accepted. Pending material correction still requires its own review |
| Formal graduation | Existing `scholarship.status.request` workflow | Existing `scholarship.status.approve`; Staff still cannot approve |

**New information versus correction:** a routine reassessment identifies a distinct new source fingerprint/version and links the assessment it supersedes; it does not claim the older record was wrong. The server hashes the canonical source identity/version/date/reference, not a checkbox. Reusing the same source fingerprint with different material facts, explicitly correcting an earlier event, changing a scope/binding, or resolving disputed evidence requires the correction/review path. Physical-source truth remains accountable office review, not something a hash proves. A pending material correction cannot be bypassed by submitting a routine reassessment. All prior facts stay readable.

For a material correction, the existing interpretation is visibly withheld while disputed; the panel shows old and proposed facts. Review dispositions are `apply_replacement`, `retain_current_revalidated`, or `keep_needs_review`. Retaining current facts requires fresh validation and an appended review event; rejection alone cannot silently resurrect a stale record. A new accepted state points to its actual reviewed origin. No universal distinct-person rule: Coordinator may prepare and review their own monitoring correction. Existing formal-standing rules continue separately.

## Freshness and indicator precedence

### Current-request interpretation requiring implementation approval

The earlier graduation proposal explicitly allowed Expected evidence without a mapped duration. The current request instead says missing duration/evidence remains **Cannot Determine Automatically**. Recommend the conservative contract below: **keep supported expectation/delay evidence in the panel/history, but withhold its primary indicator until program applicability/duration and necessary academic context are resolved**. This change is visible in the implementation approval matrix; it does not rewrite the older plan or affect formally approved Graduated status.

| Precedence | Primary result |
|---|---|
| 1 | Existing valid **formal Graduated** source wins, including approved corrections. Missing duration/monitoring evidence never hides that formal fact or cancels a final stipend |
| 2 | Missing/ambiguous context, stale placement/binding/reference, unresolved material correction, contradictory evidence, or missing duration/applicability → **Cannot Determine Automatically**, with specific Needs re-review/source-needed detail |
| 3 | Current supported Expected/Delayed assessment in the selected scope → the respective indicator |
| 4 | No current material assessment/review hold; unique confirmed applicable duration + mapped final year equals normalized current level → **Potentially Graduating** |
| 5 | Known mapped program and lower current level → **Not in confirmed final year** explanation; unknown/beyond/unrecognized levels need review, never automatic Delayed |

A current direct assessment can describe a supported completion expectation even outside the usual derived final-year position; it does not authorize an academic exception. Expected/Delayed is never proof of actual graduation, academic compliance or a stipend entitlement.

The separate **final-year mapping** is required for derived Potential, not for a direct school-supported Expected/Delayed finding. A uniquely applicable confirmed nominal duration with `no_annual_mapping` may accompany a current direct assessment. Missing canonical academic record/school/course or unresolved curriculum/cohort still withholds the assessment; an unnormalizable year label alone prevents derivation rather than inventing academic progression. This distinction does not relax the missing-duration rule.

Pin semantic placement (`academicRecordId`, effective approved-change ID/revision, effective school/course/year and Course pending identity/revision), annual program-context revision/hash, selected scope/calendar semantic dates and duration reference revision/hash. Do **not** pin a whole person's contact/version, mutable display name or financial history: a phone correction must not invalidate monitoring, and a monitoring correction must not invalidate financial prior approval. Server builds every pin from authoritative readers on the guarded connection; client hashes are optimistic checks only.

On any material basis change, the read becomes Needs re-review immediately. Preserve old evidence; do not silently swap pins, carry a cohort across a shift, borrow another year's assessment or revive an older valid-looking event. A previously unresolved NULL duration becoming known does not silently reapprove an earlier expectation: re-review binds it to that reference. Derivation for people with no assessment may update from a newly confirmed valid duration, because Potential is a read-only candidate calculation.

## Proposed API and validation

Extend the existing A6.1 GET list/context contracts compatibly. Add `needs_review`, `unknown_duration` and `follow_up` filters; keep existing names/parameters and 25/50/100 limits. `durationSourceAvailable`/`reviewSourceAvailable` become capability booleans; record-level availability is explicit and never inferred from the flag. Return primary indicator, one concise reason, current source IDs/revisions, supported period label and context-needed annotation, without entire event histories.

| Route | Proposed purpose |
|---|---|
| GET `/api/v1/scholars/:id/graduation-monitoring?academicYearId=…&semesterId=…` | Read selected case/current program context, source freshness, role-allowed operations and existing profile/status destinations; no case creation |
| GET `/api/v1/graduation-monitoring-cases/:id/history?offset=0&limit=25` | Paginated immutable events/source/corrections; max 100 |
| POST `/api/v1/graduation-monitoring-cases` | Atomic root + first event, scoped owner and initial `expectedRevision:0`; HTTP 201 |
| POST `/api/v1/graduation-monitoring-cases/:id/events` | One guarded event/correction/review; HTTP 200; no PATCH/DELETE |

Both POSTs use strict discriminated Zod schemas, session/CSRF, 8,192-byte body limit and UUID Idempotency-Key. Common input: `{operation,expectedRevision,expectedSnapshotHash,academicYearVersion,semesterVersion?,expectedSourceHash,reason,details}`. Create also accepts `{scholarId,academicYearId,semesterId:null|UUID}` and no expected hash. Year/scope comes from an existing root thereafter; attempts to change it reject. Expected hashes cannot supply official source snapshots or bypass missing evidence.

Operation-specific `details` contains only the permitted period/source/finding/follow-up/context/correction-review fields. Record/review actions require explicit `reviewed:true`; it attests actual checking, not academic/payment approval. Source text/reference and reason are required; method and next follow-up date are optional. Unknown optional dates/IDs normalize to NULL. Review accepts an exact pending target and a server-built review-source hash; direct correction accepts an earlier material target and the replacement facts. Actor, timestamps, state pointers, placement/reference snapshots, imported approvals and financial fields are server-owned/rejected in input.

A first case event may be `record_expected`, `record_delayed`, `follow_up`, `flag_review` or `record_program_context`; correction/review/revalidation cannot create a case without an earlier target. Source evidence submitted before academic/applicability prerequisites are complete is retained with explicit `effect:'needs_review'` and proposed facts; it is not silently accepted as a current assessment. A later Coordinator revalidation can use that exact source after the prerequisites resolve. Routine follow-up never clears a review hold. Revalidation has no replacement-facts payload and cannot bypass a pending material correction.

Writes require an available unarchived/unlocked selected case year and, for a semester case, an available semester of that year, with expected versions. Use actual recording time; do not backdate to make a closed case writable. Historical locked cases remain read-only; a current open-year follow-up may cite their history without modifying them. No new general closed-period exception. Exact previously successful retries after closure can return their original receipt under fresh authorization, with no new write.

Errors: `GRADUATION_CASE_EXISTS` (read existing owner), `GRADUATION_VERSION_CONFLICT`, `MONITORING_SOURCE_CHANGED`, `MONITORING_CORRECTION_REQUIRED`, `MONITORING_REVIEW_PENDING`, `PROGRAM_CONTEXT_REQUIRED`, `GRADUATION_PERIOD_UNAVAILABLE`, `GRADUATION_HISTORY_INTEGRITY`, plus existing authorization/CSRF/idempotency codes. Missing duration on a list is an explained successful read, not a failed service or numeric zero.

## Compact review UI and continuation handoff

Keep the A6.1 tab/route and table columns. Replace the large repeated warning with a short context statement and a **How indicators work** disclosure. Use compact filter labels: Potential, Expected, Delayed / follow-up, Confirmed Graduates, Unknown duration, Needs review and All; present full accessible descriptions. Keep Final-Year Review Candidates explicitly a Year IV/V discovery filter.

One **Review** action opens a focused panel/dialog at `#scholars?task=graduation&…&review=<personUUID>` with the selected year/semester and committed filters retained. It shows current placement/duration, supported completion period, latest source/freshness, routine evidence/follow-up form and paginated history. A permission-gated reference action opens DM-G1 source review. A separate existing Scholarship link handles actual graduation/standing. Do not add permanent evidence/date/source columns across Registry, a sticky toolbar, another sidebar module or generic approval buttons.

Initially unselected assessment type, honest unknowns, explicit source review, inline validation and a focusable error summary are required. Escape/cancel returns focus to the actual row trigger; pending/uncertain requests preserve exact body/key and prevent navigation through the shared guard. The panel is read-only when the year/permission/source is unavailable and explains the owner/next step. Reflow at 320 CSS pixels; table scrolling stays intentional. No automatic external messages.

Continuing Roster may receive a valid context-preserving link to this review and an explanation of unresolved evidence. It cannot consume a monitoring label as approval/denial, create N+1 intake, advance year level or bypass `preventGraduateRenewal`. Formal graduates retain the existing roster and final-semester safeguards. The separate A4/DM-R persistence and new status-policy decisions remain outside A6.2.

## Approval and acceptance handoff

Approve the case/event structures, record/review role mapping, source-freshness/withholding rules and the stated missing-duration precedence before implementation. Test supported Expected, actual Delayed, follow-up, pending/material correction, revalidation after placement/duration change, annual-versus-semester context, exact retries, audit/transaction failures and zero financial/status/membership effects. The combined contract supplies concrete fixtures, file boundaries, migration/recovery and permission approval IDs. No monitoring fact was written by this design.
