# DM-G1 — Authoritative program-duration references

24 October 2026, Philippine time. **Design and planning only. No implementation, migration, permission assignment or database operation is authorized by this document.** This is the recommended duration half of [the A6.2 implementation contract](A6_2_GRADUATION_IMPLEMENTATION_CONTRACT.md); scholar monitoring evidence is specified separately in [DM-G2](DM_G2_GRADUATION_MONITORING_SPEC.md).

## Accepted baseline and exact gap

[A6.1](A6_1_GRADUATION_MONITORING_IMPLEMENTATION_REPORT.md) already supplies the Registry tab, explicit year/semester context, bounded list/count, search, pagination, profile links and formal-graduation projection. Its live duration is deliberately NULL; Potential, Expected and Delayed filters are empty. The current [service](../../server/scholars/graduation-monitoring.ts) and [model](../../server/scholars/graduation-monitoring-model.ts) do not query a duration source.

`schools`/`courses` store identity, labels and configuration lifecycle, not curriculum duration. [Academic references](../../server/academic/references.ts) may also be created through existing authorized academic entry. Neither configuration ownership nor the existence of an ID proves curriculum duration. `academicCurrent` selects the canonical annual academic record plus its latest **approved** placement change; Registry initial-intake fallback remains provisional. No durable curriculum/cohort fact currently links each person to a scoped duration reference.

Reuse configuration **IDs**, authorization transactions, reference validation, audit and exact-retry patterns. Do not add a duration column to `courses`, place academic decisions in `system_settings`, repurpose a school name, or use the configuration-management permission as academic authority. Preserve the older [graduation plan](LDSS_GRADUATION_MONITORING_PLAN.md) as proposal history; A6.1 is the later implementation baseline.

## Recommended evidence and applicability contract

One reference belongs to an exact existing **school + course** pair. The supporting source must identify the program/curriculum and the intended scope: an official school curriculum, official program notice, or documented official school confirmation. A title/checkbox alone is not evidence. Record issuer, traceable reference and custody/location where available; issued date is nullable when genuinely unknown. No scans, student IDs or duplicate academic histories are required.

Staff prepares the source. Coordinator confirms its content and applicability under the proposed permission below. This is the office review of a reference, not independent statutory authority, accreditation certification, entitlement-duration policy or permission to override academic rules. Unsupported/disputed sources stay unconfirmed.

### Duration and final-year mapping

Store `duration_years DECIMAL(4,2)` as an exact **decimal string** in HTTP/JSON, positive up to 99.99 when confirmed. This storage range is an engineering bound, not a scholarship benefit limit. It supports four, five and other evidenced durations without binary floating-point calculations. Unknown duration is NULL, never zero or a default four.

Store a separate nullable `final_year_level SMALLINT UNSIGNED` (1–100) and `level_basis = annual_year_number | no_annual_mapping`. An annual mapping requires the source-backed final numeric year level; the Coordinator confirms it explicitly. An unmapped structure retains known nominal duration but cannot derive Potential. A fractional duration, trimester structure or modular curriculum does **not** receive an inferred ceiling/final level. Example: a 4.50-year source without an evidenced final-year mapping stays unmapped. If its official curriculum explicitly identifies Year V as the final year, record that mapping with the source.

Extend the monitoring normalizer only to explicit numeric/ordinal year labels within 1–100 and established Roman/word aliases; keep one shared SQL/TypeScript mapping and parity tests. Unknown, ambiguous, stage-based or out-of-range labels stay unknown. Do not modify stored academic year levels or infer progression from elapsed years.

### Scope

Each reference revision declares:

| Fact | Exact meaning |
|---|---|
| `scopeKind=all` | Source expressly covers all curricula/cohorts for this school/course within the selected applicability interval; no implicit default |
| `curriculum` | Exact source curriculum code is required |
| `cohort` | Exact source cohort code is required |
| `curriculum_cohort` | Both exact codes are required |
| `appliesFromYearId`, optional `appliesThroughYearId` | Inclusive configured academic-year interval; NULL through means open-ended applicability **expressly confirmed**, not infinite scholarship support |
| `reviewAcademicYearId` | Available working year in which this catalog review is performed; separate from the reference's historical applicability or publication date |

Codes are 1–80 characters, Unicode NFC/trimmed, case-sensitive, with no control characters. No fuzzy matching, inferred aliases, code splitting or conversion of a cohort label to a past LDSS academic year. A pre-LDSS cohort may be recorded verbatim from the school source without creating N−1. Applicability-year order uses the actual configured periods; pin their IDs and a semantic dates hash. A name-only configuration edit does not invalidate a reference; a material dates/scope change does require review.

For scoped references, use the **reviewed annual program context** in DM-G2, pinned to the current academic placement. Staff may supply curriculum/cohort evidence; Coordinator confirms that binding. A confirmed all-scope reference does not require an artificial per-person cohort entry. Do not derive a binding from Scholar ID year, registration date, annual New/Continuing, Year I, prior system presence or imagined admission history.

### Deterministic resolution

1. Resolve the selected year's canonical academic placement and latest approved change. Initial intake alone, pending course or missing school/course cannot resolve a program reference. Pending changes do not replace the current accepted placement.
2. Resolve a confirmed annual program context only where the reference needs curriculum/cohort facts. Absent/stale context produces `PROGRAM_CONTEXT_REQUIRED`, not an assumed broad match.
3. Select references for the exact school/course, applicable year interval and proven scope. A reference must have a current **confirmed** head, current semantic scope pins and no dispute/withdrawal/retirement.
4. Exactly one applicable confirmed reference is required. Zero means unknown; more than one means `DURATION_REFERENCE_CONFLICT`, even if numeric durations happen to agree. Do not pick newest, shortest, longest or most specific.
5. A known nominal duration without a final-year mapping is displayed as known duration, while automatic final-year classification remains unavailable.
6. Derive Potential only when the normalized current level equals the confirmed final-year level. A lower level means **Not in confirmed final year**, an explanation rather than a new standing. A level beyond the mapping needs review; it never automatically creates Delayed.

Confirmation rejects overlapping approved scopes for the same school/course/year interval. `all` overlaps any scoped reference; a curriculum scope overlaps a matching curriculum/cohort scope. Different established curriculum/cohort codes can be disjoint. Retire/review the broad source before confirming a conflicting narrow source; there is no specificity override. Check the overlap set under the existing configuration guard, so concurrent confirmations cannot create two winners. Reads must still fail closed if conflicting data is encountered.

For overlap checking, an absent scope dimension means the source expressly covers all values of that dimension: intervals intersect **and** `(A.curriculum IS NULL OR B.curriculum IS NULL OR A.curriculum=B.curriculum)` **and** the equivalent cohort condition. Thus a curriculum-only source and a cohort-only source can overlap; differing scope-kind strings do not establish disjointness.

## Proposed schema — two of five new tables

All UUID columns use the repository's `CHAR(36) CHARACTER SET ascii COLLATE ascii_bin`; hashes use ASCII `CHAR(64)`; timestamps are real UTC `DATETIME(6)`. Text uses utf8mb4, exact scope codes use binary collation. InnoDB, restrictive FKs, immutable triggers and SELECT/INSERT-only runtime access apply. Full migration/receipts are specified in the contract.

### `program_duration_references`

Immutable root columns: `id` PK; `school_id` and `course_id` NOT NULL FKs; `created_by` user FK; `created_at`. Index `(school_id,course_id,id)`. School/course ownership never changes in place. A source attributed to the wrong pair requires a new root and linked retirement/dispute of the old one; do not reassign its identity. Allow multiple proposed roots, but enforce conflict detection at confirmation and read time.

### `program_duration_events`

| Columns | Constraint / purpose |
|---|---|
| `reference_id`, `revision` | Composite PK; root FK; revision ≥1 |
| `previous_revision`, `before_hash`, `snapshot_hash` | Revision 1 has NULL predecessor/hash; later revision has predecessor = revision−1, same-root composite predecessor FK and a 64-hex hash |
| `action` | `submit`, `confirm`, `reject`, `withdraw`, `propose_correction`, `dispute`, `retire` |
| `state` | `proposed`, `confirmed`, `rejected`, `withdrawn`, `disputed`, `retired` |
| `scope_kind`, `curriculum_code`, `cohort_code` | CHECK exact required/NULL combinations; no empty-string wildcard |
| `applies_from_year_id`, `applies_through_year_id`, `review_academic_year_id` | Year FKs; ordered interval and review-year availability validated transactionally |
| `duration_years`, `final_year_level`, `level_basis` | NULL allowed for incomplete proposals; confirmation needs positive duration and coherent explicit mapping/no-mapping choice |
| `source_type`, `source_issuer`, `source_reference`, `source_location`, `source_issued_on` | Traceable source; issuer 2–160, reference 3–300, optional location ≤300, source date nullable and never fabricated |
| `scope_dates_hash`, `snapshot JSON` | Server-built canonical semantic state and provenance, format `program-duration/v1`; no client-built authority snapshot |
| `reason`, `actor_id`, `command_id`, `recorded_at` | Reason 5–500; user FK; caller command UUID; actual server recording time |

Index `(state,reference_id,revision)` and retain the composite PK for head/point/history reads. Unique `(actor_id,command_id,reference_id)` prevents duplicate event creation for a receipt. Required text, enum/range and predecessor shape checks live in DDL; same-owner transitions, source applicability, interval overlap and canonical hash checks live in the guarded service. Both root and event tables reject UPDATE/DELETE with triggers.

Each event is a complete semantic reference snapshot, not a patch that can lose scope when replayed. Head is maximum revision, never the latest *approved-looking* older row. Preserve a linked previous confirmation for display, but do not silently reuse it after a later material dispute/proposal/retirement. A rejected or withdrawn material correction does not resurrect the old source: Coordinator must explicitly reconfirm the retained facts with a new event. This temporarily affects monitoring only, not finances.

## State changes and proposed permissions

| Command | Allowed actor / transition |
|---|---|
| Submit new source or corrected source | `program.duration.prepare` — Staff and Coordinator; append proposed facts with source/reason |
| Confirm/reconfirm | `program.duration.confirm` — Coordinator; current expected revision/hash, source/overlap preview hash and `reviewed:true`; proposed/disputed facts become confirmed |
| Reject | Coordinator confirmation permission; append reason; source remains unavailable |
| Withdraw own unconfirmed proposal | Prepare permission; creator only unless Coordinator also has confirm permission; no withdrawal of another person's confirmed source |
| Dispute a confirmed source | Prepare permission with actual contrary evidence; append disputed head, retain the earlier approval visibly, notify through the tab's review queue; no financial invalidation |
| Retire an obsolete/wrong source | Coordinator confirmation permission; append reason/source; retain all earlier uses/history |

Every operation also requires `scholars.read`. Neither permission currently exists. Seed Staff with prepare and Coordinator with both **only after approval**. Pure Administrator/unassigned get neither. Coordinator may prepare and confirm their own source; no universal distinct-person rule is added. Existing per-operation formal-standing separation remains untouched.

Transition allowlist: creation `submit → proposed`; `propose_correction` from any non-retired head → proposed; `dispute` only confirmed → disputed; `confirm` only proposed/disputed → confirmed; `reject` only proposed/disputed → rejected; creator withdrawal only proposed → withdrawn; Coordinator retirement from any non-retired head → retired. Retired is terminal for that root. Rejected/withdrawn content needs a new explicit proposal followed by confirmation before reuse. No-op and unsupported edges reject.

Global reference review occurs in an available working review year even when the source concerns older cohorts. It may change the current monitoring interpretation of older evidence, with a withdrawal/re-review explanation; it does not append corrections to locked scholar cases or rewrite their recorded history. New scholar-case writes remain separately period-guarded in DM-G2. This catalog behavior is part of the requested implementation approval, not a financial closed-period exception.

## Proposed API contracts

Base **`/api/v1/program-duration-references`**. These routes do not exist yet. Existing session/CSRF/error-envelope patterns apply; mutation body limit 8,192 bytes; Idempotency-Key UUID is required. Unknown/forged actor/state/revision/hash/approval fields are rejected.

| Method / suffix | Contract |
|---|---|
| GET base | `schoolId?`, `courseId?`, `academicYearId?`, `state?`, `q?`, `offset`, `limit≤100`; count/page same predicate; scholars.read |
| GET `/:id` | Current head, retained prior confirmation, source, scope, unresolved cause and expected revision/hash; no full usage histories |
| GET `/:id/history` | Stable revision order, 25 default/100 max; source/actor/action/time and replaced state |
| GET `/:id/review` | Confirmation authority; server-built current source/overlap/configuration preview and `reviewSourceHash`; affected usage count plus a bounded page, never full profiles |
| POST base | Create immutable owner + revision 1; return 201 with root/head/source; no automatic confirmation or scholar-case creation |
| POST `/:id/events` | Append one of the authorized actions; return 200 with exact stored result; no PATCH/DELETE |

Create body: `{schoolId,courseId,reviewContext:{academicYearId,academicYearVersion,workingSettingId,workingSettingVersion},facts:{scopeKind,curriculumCode,cohortCode,appliesFromYearId,appliesThroughYearId,durationYears,finalYearLevel,levelBasis,source:{type,issuer,reference,location,issuedOn}},reason}`. Optional facts normalize to explicit NULL. Initial scope must still be explicit; incomplete duration may be NULL pending evidence.

Append body: `{action,expectedRevision,expectedSnapshotHash,reviewContext,reason,...}`. `propose_correction/dispute` accepts the relevant full facts/source; `submit` belongs to root creation only. `confirm` accepts `reviewSourceHash,reviewed:true` and does **not** accept replacement facts. Reject/withdraw/retire require their own reason/reference and expected head. Review of different content requires a new proposed event, not an approval payload that silently edits it. Guard review-year/calendar/source versions on a fresh command. Exact completed retries are handled first after current authorization, as specified in the shared contract.

Errors use structured codes: `DURATION_SOURCE_CHANGED`, `DURATION_SCOPE_CONFLICT`, `PROGRAM_CONTEXT_REQUIRED`, `DURATION_MAPPING_REQUIRED`, `GRADUATION_VERSION_CONFLICT`, `GRADUATION_PERIOD_UNAVAILABLE`, and the existing authorization/idempotency envelope. An unavailable automatic classification is usually a successful read with a reason, not a service failure or zero substituted for unknown.

## Read integration, UI and validation handoff

Join bounded current reference heads to the selected-year placement/program-context projection. Use the same reference-resolution expression for COUNT, filters, sort and returned rows. Hydrate source/history for the selected review panel only. No per-person `academicCurrent`/eligibility/financial-history loop for the cohort. Reference review lists may page affected cases, but must not rewrite those cases or frozen payroll evidence en masse.

Within Graduation Monitoring, use a compact **Program duration references** action with searchable bounded sources. The source dialog shows school/course, actual applicability, duration/final-year mapping, provenance and pending/conflict state. Confirmation is visible only to the proper permission and requires source review. Staff sees the pending/escalation destination rather than a fake approval button. Unknown duration remains a normal review state. No new top-level sidebar module or additional permanent Registry columns.

Future tests must cover 4/4, 4/5, 5/5, other/fractional/missing mappings, two schools sharing one course, overlapping scopes, unknown cohort, pre-LDSS cohort evidence without older digital years, pending/disputed/rejected/retired references, exact source/hash/config changes, same/concurrent retry, audit rollback, role loss and protected history. See the contract for the combined acceptance matrix and migration procedure.

## Approval and stop

Approve the two tables, constraints/immutable triggers, narrow grants and exact prepare/confirm role mapping as part of the single proposed F54 migration. Actual office sources and reviewed scope remain necessary before assigning real durations. No existing fixture name or unit-test input supplies that authority. No code/table/permission/source data was changed by this design. Implementation, any primary-UAT upgrade and write activation require the approvals listed in [the contract](A6_2_GRADUATION_IMPLEMENTATION_CONTRACT.md).
