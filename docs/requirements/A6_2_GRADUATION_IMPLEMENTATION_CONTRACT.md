# A6.2 — Graduation Monitoring implementation contract

24 October 2026, Philippine time. **Design and planning only.** This contract recommends one coordinated implementation of [DM-G1 program duration](DM_G1_PROGRAM_DURATION_SPEC.md) and [DM-G2 monitoring evidence](DM_G2_GRADUATION_MONITORING_SPEC.md). No application code, migration, account, role, database, feature flag or running service was changed. All names/contracts below are proposed; none of the new write endpoints or permissions exists yet.

## Recommended bounded implementation

Implement one additive **F54 graduation-evidence package**: five immutable tables, four explicit business permissions, narrow runtime grants, shared exact-retry/audit infrastructure, DM-G1 source preparation/confirmation and DM-G2 evidence/follow-up/corrections. Extend the accepted A6.1 read projection and focused Registry review UI together. Validate a new owned copy under an isolated candidate source/build before requesting any primary-5173 upgrade or writes.

Preserve [A6.1](A6_1_GRADUATION_MONITORING_IMPLEMENTATION_REPORT.md), [current-year requirements](LDSS_CURRENT_YEAR_WORKFLOW_PLAN.md), [backlog](LDSS_INTEGRATED_ENHANCEMENT_BACKLOG.md), [phased plan](LDSS_PHASED_IMPLEMENTATION_PLAN.md), [earlier graduation proposal](LDSS_GRADUATION_MONITORING_PLAN.md) and [UI/UX direction](../uiux/LDSS_INTEGRATED_UI_UX_SIMPLIFICATION_PLAN.md). Earlier plans describing no tab are historical: the A6.1 implementation is the current baseline. Its documented 1,000 people, 800/200 Pending payrolls, 63 migrations and 654 passing tests are **dated acceptance evidence**, not fresh database observations by this design task.

Excluded: formal-standing redesign; graduation batch approval; automatic renewal, progression, termination or payment effects; academic/source/import promotion; A2/A4/B1/B2; Dashboard counts; external messaging; performance remediation; official financial forms; LAN/P11/release. No existing account is assigned a new role.

## Decisions fixed by this recommendation

| Engineering choice | Concrete contract |
|---|---|
| Storage | Two immutable root/event pairs plus one shared command-receipt table; no mutable academic/status columns or duplicated full profiles |
| Cohort/curriculum | Confirmed annual monitoring program context, source-backed and placement-pinned; never inferred from ID/entry year/classification |
| Duration | Exact decimal nominal years; separate source-backed annual final-year mapping; no name/default/rounding assumptions |
| Multiple sources | Require one applicable confirmed reference; overlaps/conflicts never use newest/specificity preference |
| Monitoring scope | Unique annual/semester case roots with generated non-NULL scope key; no mixing semester assessments in the All-semester view |
| Expected period | Year/term/date precision from source; unconfigured named future periods retain labels and NULL IDs without changing the calendar |
| Corrections | Append source-backed events; material corrections reviewed by Coordinator; routine new evidence/follow-up remains Staff work |
| Primary indicator | Formal Graduated first; unresolved/stale/duration-needed context withholds other automatic labels; fresh supported assessment then derived Potential |
| Access | Existing scholars.read for reads; four new operation permissions; pure Administrator technical-only |
| Release control | New optional `GRADUATION_MONITORING_WRITES_ENABLED`, effective default false, controls new writes only; all existing financial flags stay untouched |

Ordinary choices above are not an open questionnaire. Approval items at the end cover the concrete schema/authority/behavior package and affected operations.

## Schema and grant approval — proposed F54

Proposed file: **`db/migrations/20261024020000_f54_graduation_monitoring.sql`**, provided that sequence remains unused when implementation begins. Current source ends at F53/63 migrations; F54 would make **64**. No SQL file is created by this planning task.

| New table | Ownership / immutable data |
|---|---|
| `program_duration_references` | School/course root and creator |
| `program_duration_events` | Complete versioned source/scope/duration/review state; see DM-G1 field/constraint specification |
| `graduation_monitoring_cases` | Person/year/annual-or-semester owner; generated scope key; see DM-G2 |
| `graduation_monitoring_events` | Complete current semantic state plus linked evidence/follow-up/corrections, source pins and queryable head fields |
| `graduation_commands` | Successful exact receipts shared across both domains |

Use existing UUID/hash/text/time conventions and restrictive FKs. Add no-update/no-delete triggers to **all five** new tables. Event predecessors are same-root revision−1; revision 1 has no predecessor. Head selection is maximum revision; superseded/stale/rejected rows cannot be revived by selecting only approved-looking history. Event origin/pending/context pointers require validated same-case ownership. Canonical hash verification and transitions are enforced by services as well as DDL checks; JSON validity alone is not semantic validation.

`graduation_commands` columns: `actor_id` user FK, `command_id` UUID, `operation VARCHAR(60)`, `payload_hash CHAR(64)`, nullable `duration_reference_id` root FK, nullable `monitoring_case_id` root FK, `resulting_revision INT UNSIGNED`, `result JSON`, `response_status SMALLINT`, `recorded_at DATETIME(6)`. PK **`(actor_id,command_id)`** spans both domains. CHECK exactly one target FK is populated, resulting revision ≥1, supported operation, response status 200/201 and JSON valid. Keep target FKs root-only to avoid event/receipt circular insertion. The service requires the receipt's result revision/owner to match the committed event and audit. Failed commands create no receipt.

Operation catalog is `duration.create`, `duration.<append-action>` for the six non-create transitions in DM-G1, `monitoring.create.<first-event-kind>` for DM-G2's five allowed first kinds, and `monitoring.event.<event-kind>` for its ten event kinds. Reject other combinations; root creation uses its normalized owner tuple as the canonical command target, not a caller-supplied new UUID. The one successful receipt stores the server-created root UUID. DM-G1 `submit` is the create action; later edited proposals use `propose_correction`.

Runtime grant addition is **SELECT, INSERT only on these five tables**, to the exact reviewed application identity in its own schema. No UPDATE, DELETE, DDL, GRANT OPTION, global/schema-wide privilege, cross-schema access or new RBAC write grant. The migration operator seeds permission metadata through existing migration authority; the runtime cannot assign itself permission.

No old migration/checksum/trigger is edited. Generate `server/schema-manifest.ts` using the existing generator; do not hand-edit its checksums. Keep financial and academic schema/source/uniqueness constraints unchanged.

## Precise permission approval

Every new business write additionally requires `scholars.read` on the **same current access snapshot**. Role seed recommendation:

| Permission | Staff | Coordinator | Pure Administrator / unassigned |
|---|---:|---:|---:|
| `program.duration.prepare` | Yes | Yes | No |
| `program.duration.confirm` | No | Yes | No |
| `graduation.monitoring.record` | Yes | Yes | No |
| `graduation.monitoring.review` | No | Yes | No |
| Existing `scholarship.status.request` | Existing rule | Existing rule | No added authority |
| Existing `scholarship.status.approve` | **No** | Existing rule | No added authority |

That is **four new permission rows and six role-permission rows**, not four pre-existing powers. Prepare/confirm handles duration sources; record/review handles monitoring facts, material corrections and curriculum/cohort binding. Do not repurpose `configuration.manage`, `academic.edit`, `academic.changes.approve`, `continuing.approve`, `scholars.intakes.correct` or a role label. Combined roles retain their actual supported permission union; Administrator alone never gains business authority.

Source preparation and confirmation are distinct commands, but the Coordinator may perform both. Routine Staff Expected/Delayed/new-evidence/follow-up does not require another person to approve every note. Material correction/pending-dispute resolution is restricted as specified in DM-G2; Coordinator can directly record their own reviewed correction. Existing formal-standing request/approval rules and any operation-specific separation remain unchanged; no blanket two-person rule is introduced. Approvals wait during Coordinator absence under the existing office arrangement.

## Sources, freshness and safe derivation

### Canonical academic basis

Use the accepted `academicCurrent` semantics: immutable annual academic record, then latest approved placement change. Revision-zero canonical academic entry remains governed by existing accepted academic rules; do not introduce a new Masterlist/publication approval prerequisite merely to view monitoring. Pending changes and manual initial-intake facts are not approved placement.

The current Registry projection intentionally provides provisional fallback. It may display supplied initial details, but the new duration matcher must use **only canonical academic fields**, not `COALESCE` into initial/intake course values when the canonical course is unknown. A malformed approved snapshot is an integrity/re-review reason, not permission to borrow older placement. Implement a bounded projection with parity tests against `academicCurrent` for base, approved change, pending change, transfer, Course pending and malformed source cases. Do not refactor the financial reader to accommodate monitoring.

Source fingerprints include semantic academic IDs/approved revisions/effective fields, Course pending evidence where relevant, confirmed annual program context, duration root/revision/hash and applicable calendar scope dates. They exclude contact/profile versions, mutable display labels and financial outcome state. A phone update does not invalidate monitoring. A monitoring action changes **zero** person/academic/admission versions or financial source hashes.

Duration correction/dispute/retirement or approved placement/context changes are detected on the next authorized read, without a mass write to affected people. Stale Expected/Delayed is retained in history but withheld as current. No silent pin substitution or older-event fallback. Formal graduation/corrections use existing canonical standing semantics with A6.1 selected-year bounds; settlement/final-stipend history remains in its existing profile/payment readers.

### Missing-duration policy qualification

The older proposal allowed Expected without a mapped duration. The current attached request says missing duration/evidence remains unknown. **Recommended implementation follows the current conservative direction:** preserve expectation/delay evidence in the panel, but primary Expected/Delayed awaits resolved duration/applicability and necessary academic context. Formal Graduated remains authoritative independently. Approve this exact qualification as **AP3** before coding; do not silently adopt the older example or erase it.

Neither overdue expectation nor Year V/beyond-duration means Delayed automatically. Neither Potential, Expected, Delayed nor a review hold affects participation, membership, eligibility, claiming, entitlement, payroll or payments. The duration is a monitoring reference, **not a maximum funded period**. Valid final-semester stipend protections remain authoritative.

## Shared command, audit and exact-retry algorithm

All new APIs use existing session/CSRF/origin/error-envelope infrastructure. Validate UUID paths/keys, strict operation schemas, text bounds and 8,192-byte mutation bodies. GETs never create cases, receipts, review approvals or source facts. A view/source preview cannot itself authorize a write.

1. Normalize a fixed constructed input, including all optional NULLs, canonical source codes, decimal strings and typed periods. Build `{format:'graduation-command/v1',operation,target,input}` and SHA-256. Do not hash raw JSON property order or binary floating-point duration values. Server owns actor, states, source snapshots and real recording time.
2. Enter **`AuthorizationService.withPermission`** for the operation's strongest permission. The existing configuration guard precedes user/source locks. Check scholars.read and any additional needed permission from the same access snapshot; do not nest a second transaction/service write.
3. Lock/read `graduation_commands(actor,key)` **before** mutable calendar/head/source checks. Same operation/target/hash returns the exact committed response/status, including after a source change, year closure or write-gate disable. Changed payload/operation/target gives `IDEMPOTENCY_CONFLICT`. Authorization and CSRF still apply to every retry; a revoked actor cannot read a receipt through a write command.
4. For a fresh command, require the A6.2 write gate. Resolve available review/case year, selected semester and expected versions as specified in each model. Catalog reviews use an available working review year; locked historical scholar cases remain read-only. Lock root/reference/case owners in stable ID order under the shared guard. Validate current root/head/hash, referenced origin/pending events, predecessor and canonical state integrity. Broken history fails closed.
5. Recompute source pins and review preview/overlap hash on the same connection. Check academic source, same-school/course/cohort/year ownership, reference status and unresolved conflicts. The submitted expectedSourceHash is an optimistic comparison, never client-provided authority. No nested full-cohort eligibility or financial reads.
6. If creating, allocate the root UUID **after** successful receipt lookup and enforce its ownership unique key. A different key/actor racing on the same case gets `GRADUATION_CASE_EXISTS` with authorized context, not another root or an upsert. Duplicate references do not become confirmed by existence.
7. Append exactly the permitted event/state snapshot and immutable linked audit. Use canonical snapshot formats `program-duration/v1` and `graduation-monitoring/v1`, fixed keys and real operation/source IDs. Snapshot hash excludes nonsemantic display metadata/timestamp formatting; recording actor/time remain explicit immutable columns/audit. Validate immediate predecessor and every linked origin/review event; do not scan the full event history per list row. Dedicated integrity/upgrade tests verify complete chains in bounded chunks.
8. Insert the exact result/status receipt in the **same** transaction. Commit once. Any audit/event/receipt/constraint/source failure rolls back the root, state and receipt. Concurrent same-key commands have one committed response; lost-response retries never append another event.

Proposed audit prefixes `program.duration.*` and `graduation.monitoring.*` use the existing audit writer/table, actor/reason/request trace and bounded before/after/source identities. They do not impersonate `scholarship.status`, document verification or academic approval. The current notification capture trigger does not recognize these new prefixes. **Do not claim automatic notifications or edit that trigger**: review queues come from the new indexed heads in the tab. External notifications remain out of scope.

The UI uses a new **`ldss-graduation-command:<actor>`** session-storage namespace with exact path/operation/key/body/context. Reuse the existing shared pending-command guard and route `scholars`; do not modify financial recovery formats. An unresolved payroll/individual/annual command prevents a conflicting new monitoring action. Network/timeout/5xx remains uncertain and retries the saved command. Known definitive validation/source conflicts can release the draft; idempotency/history-integrity conflicts require investigation, not a second blind command. Successful save is announced only after confirmation; failed reread retains the saved result/ID and offers read retry.

## Read/query and UI performance contract

Keep A6.1 routes and limits, explicit year/context and `associated` inclusion semantics; B1/Registry defaults are unchanged. New fields/filters use the same deterministic source resolver for counts, page, category and returned rows. One identity must produce one result regardless of the number of case events, reference proposals or semesters.

Recommended SQL shape: selected-year associations/approved placement → current reference heads and annual program context → selected-scope case head → resolved applicability count/source → primary indicator/reasons → shared COUNT and stable ordered page. Use derived tables/CTEs and indexed maximum-revision/point joins compatible with the supported MariaDB deployment. Require exactly one applicable reference before selecting its ID; aggregate ambiguity explicitly instead of arbitrary `MIN`/latest selection. Validate SQL/TypeScript semantic parity, including source invalidation and ordinary correction cases.

Fetch referenced evidence for **selected page IDs as a set**, and history for the selected panel only. Reference/context choices and queues are paged, never loop all 1,000 full profiles into the browser. Avoid per-scholar `graduationRecords`, eligibility, payment-history or academic-history service calls. Shared readSnapshot performs fresh permission checks including the post-read revocation check; do not add authorization caches. No smaller export/output limit, evidence truncation, heap increase or R01–R07 bypass.

A6.1's nine-SELECT read-service samples are dated comparison inputs, not a fixed performance guarantee. Measure the new 25/50/100-row reads against matched source/role/filter/state, metadata separately, with repeated sequential samples, query count/rows/bytes and response parity. Reference/event query count must be bounded with page size, not grow by one round-trip per scholar. Any material regression requires a scoped query/index correction or explicit disposition; no unsupported speedup claim or automatic performance batch.

Keep the dark-green Registry task navigation and existing table columns. Shorten repeated warning copy to one compact status/help disclosure; use one concise row reason and a focused source/evidence panel. Proposed UI-only route fields `review=<personUUID>` and `duration=<referenceUUID>` must be parsed separately and stripped from the strict API query; preserve committed filters/search/year/page when opening/closing. Validate IDs and supported profile destinations. A record panel cannot bypass missing academic/source ownership.

Keyboard/close behavior must restore the row review trigger **after route remount/data load**, or focus the workspace heading if the row is no longer present. Do not assume an old DOM node survives the existing hash-keyed remount. Reuse FocusedDialog with local restoration logic, not an unrelated global dialog rewrite. Required controls start unselected/unchecked; source/review labels and error summaries are explicit. Test responsiveness, intentional table scrolling, readable long text, focus, Escape and announcements; do not infer WCAG certification from screenshots.

## Concrete future acceptance matrix

Actual mutations begin only in a **new owned disposable/copy fixture**. Declare explicitly fictional official-source packets and program/cohort facts before commands run; a fictional five-year course name by itself remains unknown. Use copies of the accepted 1,000-person source only after exact schema/ownership/source checks. Do not change the retained 5173/3011/3012/A–F/V1/V2 datasets to create screenshots.

| ID | Required positive and negative evidence |
|---|---|
| G01 Duration | IV + confirmed 4-year mapped program → Potential; IV + confirmed 5-year program → not final year; V + mapped 5-year program → Potential. Other integer durations, exact decimal duration without/with explicit final-level mapping, unsupported labels and beyond-duration levels |
| G02 Scope | Same course/different schools; curriculum/cohort-specific scopes; unknown/stale binding; pre-LDSS cohort without N−1. Broad/narrow overlap, conflicting identical/different durations, concurrent confirmations, archived/wrong refs, wrong year/calendar/hash; no specificity/newest fallback |
| G03 Unknowns | No reference, Course pending, missing academic record, initial intake with known-looking course, malformed approved placement, missing/unknown duration/mapping. Primary unknown and actionable source explanation; no fabricated approval |
| G04 Assessments | Source-backed Expected with year/term/date precision and nullable unconfigured future labels; Delayed with actual reason; ordinary follow-up/next action. Missing duration keeps the proposed primary unknown with evidence visible. Reject invented dates, status/payment fields and source-fingerprint reuse as a correction bypass |
| G05 Corrections | Staff material proposal, Coordinator apply/retain-current-revalidated/keep-review, direct Coordinator correction, routine new-evidence versus correction, pending-review bypass rejection; original values/source intact. Academic/reference/context changes invalidate applicability; new NULL-to-known reference never silently reapproves earlier evidence |
| G06 Context | Annual and semester roots, duplicate-NULL ownership race, wrong-parent semester, historical selection, All-semester ambiguity and no stale/annual fallback. Count/page/category parity, literal `%/_` search, school/course, stable sorting/pages, bounded reference/history queues and source-change/error/abort/retry |
| G07 Formal graduation | Existing approved graduation, actual final-semester evidence and valid unpaid final benefit; incorrect formal graduation corrected through existing controls; supported historical no-outstanding correction. Monitor follows authoritative standing without writing it. Do not manufacture Graduated by inserting a monitoring event |
| G08 Transactions/roles | Staff/Coordinator/pure Admin/unassigned/combined roles, forged actor/approval, CSRF and role revocation; same-key concurrent/lost-response retry, cross-operation changed key-body conflict, period closure/write-gate disable after successful receipt. Force event/audit/receipt failures: complete rollback, no orphan root/history or double event |
| G09 Preservation | Snapshot academic, intake, annual, participation, masterlist/publication, requirements/prior approval, historical setup/window, frozen evidence, entitlement/allocation, payment/individual/correction/Original records before/after **monitoring commands**: byte-identical. Separate legitimate formal-standing setup effects from this no-side-effect assertion |
| G10 Upgrade/recovery | Owned populated 63→64 copy, all old checksums/table hashes and accounts/roles preserved except the four/six approved RBAC additions; new tables empty at upgrade; exact new grants, immutable triggers/constraints and realistic backup/restore. Wrong host/schema/proof, partial DDL, stale backup and unsupported manifest must stop |
| G11 Browser | Staff source entry/routine assessment/follow-up; Coordinator source/binding/correction review; denied roles; compact populated/unknown/empty/error/stale/read-only/uncertain states. 1440/1024/820 and 375/320 reflow, supported native 200% zoom, keyboard horizontal scroll, source/history, focused close/Back/Forward/reload, exact uncertain-body recovery. Native zoom limitations must be reported rather than replaced by CSS zoom |
| G12 Financial regressions | Existing Registry/academic/status/graduation, historical independent batches/omission, Payment Recording/reconciliation, individual settlement/corrections/reports and upgrade/recovery suites appropriate to a schema/provenance change. Both copied payrolls retain 800/200 Pending/canRecord and exclusive PHP5,000 entitlements. No financial source pin is refreshed to hide a failure |

The first fresh copy remains all Pending while reference/monitoring examples are added through approved commands. Use a separate small owned scenario for mutation-heavy formal-standing/settlement cases where their own legitimate side effects need testing. Keep named office acceptance distinct from synthetic checks.

After implementation run existing `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run check:secrets`, new duration/monitoring/upgrade tests and relevant existing DB/browser suites. Record exact commands, exit codes, candidate source/schema/artifacts, fixture ownership and preservation. No tests, benchmark, browser or database commands were run for this planning task.

## Migration, release and compatible rollback

1. Preserve the actual dirty-worktree baseline/source/build and current launch manifests. Develop in an isolated candidate checkout copied from that baseline, **not HEAD alone**; do not hot-replace the primary Vite source/API while its database is still 63. Keep accepted 5173 and old-schema fixture artifacts available.
2. New migration preflight follows the existing PID-owned schema pattern. Fresh owned regression schemas have no scholar/financial payload; populated owned copies additionally require an exact loopback/server/schema/runtime identity manifest, fresh encrypted backup, verified isolated restore, immutable source/grant inventory and proof that the data still matches that checkpoint. Do not reuse an old F53 recovery marker as proof for today's F54 upgrade.
3. Hook `preflightGraduationMonitoring` into applyMigrations **before F54**. Default rejects retained/original/LAN targets; any later primary exception needs its explicit reviewed authorization/proof. No generic force/skip check. F53 preflight and all old checksums remain intact. Stop on source/history/schema/permission conflict.
4. MariaDB DDL is not assumed transactional. New tables/triggers and permission seeds have a documented step inventory. On partial failure, keep writes disabled, retain exact applied-object/checksum evidence and use reviewed forward repair or a separately restored owned copy. Do not edit an accepted checksum, drop populated event history, or blindly rerun CREATE statements over an unexplained partial state.
5. Add narrow grants only to the owned upgraded runtime and verify SELECT/INSERT successes, UPDATE/DELETE/DDL/cross-schema denials. Roles receive only the proposed six mappings; existing hashes/account IDs/session policy unchanged. Verify exact 64-entry readiness and old financial/source parity. New writes default off until the approved local test activation.
6. Exercise new feature commands/recovery in the isolated 64 fixture. Primary **`ldss_primary_test_12676_61497616`** remains 63 with its accepted server until a separately approved primary-UAT maintenance/upgrade/activation operation. Preserve original 212-person, 3011/3012/A–F/V1/V2 and feature flags. No `.env` repoint, reset or implicit startup migration.
7. Schema readiness is exact: the current reader requires manifest length/checksums to match. An old 63-only binary **cannot be assumed** to run a 64 database. Prepare a tested 64-compatible rollback build that keeps evidence readers and disables new writes, then forward-repair if necessary. Reverting UI/writers must not make already committed evidence unreadable or remove its permissions/history. Never restore a stale backup over valid later transactions.

The four/six RBAC additions and any actual source confirmations are separately reviewable from deployment. F54 authorizes storage/operational capabilities only; it does not supply actual school authority, real production durations, a graduation policy or a release permission.

## Exact expected file boundary

Names of new files are engineering recommendations. Anything outside the boundary that proves necessary requires a concrete delta review before broadening the implementation.

| Files | Expected work |
|---|---|
| New `db/migrations/20261024020000_f54_graduation_monitoring.sql` | Five tables, constraints/indexes, immutable triggers, four permission/six mapping seeds |
| New `scripts/graduation-monitoring-preflight.mjs`; `scripts/migration-lib.mjs` | Strict F54 owned/recovery preflight hook and five exact runtime grant additions |
| `server/schema-manifest.ts` via existing `scripts/generate-schema-manifest.mjs` | Generated 64-entry manifest; no generator rewrite |
| New `server/graduation/{duration-model,duration-validation,duration-source,duration-service,monitoring-model,monitoring-validation,monitoring-source,monitoring-service,commands,routes}.ts` | Evidence contracts, bounded sources, transitions, same-connection orchestration, receipts/audit and new routes |
| `server/app.ts`, `server/config.ts` | Wire services/routes and explicit default-off graduation write gate; no financial gate change |
| `server/authorization/policy.ts` | Recognize the four approved codes; no other permission remapping |
| `server/scholars/graduation-monitoring.ts`, `graduation-monitoring-model.ts`, `graduation-monitoring-routes.ts` | Source-backed A6.1 projection/filter/context/detail integration and conservative normalization; retain existing route/role behavior |
| `src/GraduationMonitoring.tsx`, new `src/GraduationReview.tsx`, `src/ProgramDurationReview.tsx`, `src/graduation-api.ts`, `src/graduation-navigation.ts`, scoped `src/styles.css` | Compact copy/filter/review UI, permission-aware forms, bounded history, parsed UI-only route state, local focus/recovery logic |
| `tests/graduation-monitoring.test.tsx`, new `tests/{program-duration,graduation-evidence,graduation-commands,graduation-monitoring-preflight,graduation-navigation}.test.ts` and `tests/graduation-review.test.tsx` | Actual validator/state/source/query/role/recovery/navigation contracts, not CSS-name-only tests |
| `scripts/test-graduation-monitoring-db.ts`; new `scripts/test-program-duration-db.ts`, `scripts/test-graduation-monitoring-upgrade-db.mjs`, `scripts/check-graduation-monitoring-db.mjs`; `package.json` scripts only | Owned integration/upgrade/recovery/grant checks and isolated evidence output; no fixture reset helper |
| `scripts/test-rbac-db.ts` | Expected permission matrix gets only the approved new codes/mappings; assertions remain exhaustive |

**Mechanical fresh-schema test compatibility:** the following current drivers explicitly assert 63 after applying *all* available migrations. Update those fresh-schema assertions to the generated `schemaManifest.length` (with the required type-only/value import as appropriate), preserving their scenario logic and role/financial expectations. Do not replace every historical 62/63 boundary or modify retained-fixture generation/resume scripts.

```text
scripts/test-academic-changes-db.ts    scripts/test-academic-db.ts
scripts/test-auth-db.ts                scripts/test-configuration-db.ts
scripts/test-continuing-rosters-db.ts   scripts/test-eligibility-db.ts
scripts/test-export-db.ts              scripts/test-graduation-monitoring-db.ts
scripts/test-import-db.ts              scripts/test-masterlist-amendments-db.ts
scripts/test-masterlist-workflow-db.ts  scripts/test-masterlists-db.ts
scripts/test-notifications-db.ts        scripts/test-payout-cycles-db.ts
scripts/test-qualification-db.ts        scripts/test-rbac-db.ts
scripts/test-receiving-db.ts            scripts/test-requirement-instances-db.ts
scripts/test-requirement-receipts-db.ts scripts/test-requirement-waivers-db.ts
scripts/test-requirement-workflow-db.ts scripts/test-requirements-db.ts
scripts/test-scholars-db.ts             scripts/test-status-db.ts
```

The existing `scripts/check-database.mjs` explicitly checks the original `.env` development identity and 63 schema. **Leave it intact for that preserved database**; use the new manifest-bound owned graduation checker for 64. Do not weaken its guard or migrate the original to make a candidate check pass. Existing historical upgrade/migration tests retain their intentional old-stage checks; extend only an actually affected boundary with its own compatibility evidence.

Read/regression dependencies, **not proposed edits**: `server/academic/*`, `server/status/*`, Registry identity/intake/import/masterlist/continuing writers, `server/eligibility/*`, prior-review/historical/payment services, R01–R07 readers, notification capture, `src/StatusPanel.tsx`, `src/FocusedDialog.tsx`, `src/prior-command.ts`, B3a components and retained fixture launchers. Reuse their documented interfaces, not their financial/standing semantics as new monitoring powers.

## Explicit approvals still needed

| ID | Recommended approval / boundary |
|---|---|
| **AP1 — Schema/grants** | One F54 migration with the five specified append-only tables, constraints/indexes/triggers, generated 64 manifest and SELECT/INSERT-only own-schema grants. No old-table financial/source migration |
| **AP2 — Business permissions** | Four named codes and six Staff/Coordinator mappings; source confirmation/material correction/program-context review scope exactly as specified. Administrator remains technical; no universal separate-person rule |
| **AP3 — Indicator/source contract** | Approve the explicit conservative missing-duration rule versus the earlier Expected-without-duration example; approve code-scoped applicability, conflict withholding, current interpreted historical reads and routine-new-evidence/material-correction distinction. Formal Graduated and valid benefits remain independent |
| **AP4 — Implementation/test scope** | Approve the bounded file changes, mechanical fresh-schema assertions, new default-off write gate and a new isolated candidate/owned 64 fixture. This is implementation authorization, not approval to mutate primary data |
| **AP5 — Later primary-UAT operation** | After evidence is reviewable: explicitly authorize exact primary 63→64 target, fresh verified recovery/grants, compatible rollback package, maintenance/restart and local graduation-write activation. Separately authorize any synthetic examples there. No reset, original/LAN upgrade or financial flag activation follows |
| **Affected source use** | Actual applicable school/curriculum/cohort and expectation/follow-up evidence must be supplied/reviewed before corresponding real records are asserted. Synthetic test packets remain visibly fictional and cannot become production policy |

No source ambiguity blocks producing this design. No new whole-system questionnaire is recommended. If implementation uncovers a genuine authority/model conflict, expose the exact case/delta rather than guessing or weakening safeguards.

## Design verification and stop

Inspected the five requested planning/implementation records and current A6.1 service/model/routes/UI, canonical academic and provisional Registry placement, configuration/calendar, formal standing/graduation/correction, permission/authorization, F53 ledger/preflight/grants, schema-readiness/generation, audit/notification capture and UI pending-command infrastructure. No applicable AGENTS.md was found in the checked workspace/ancestor/document paths. Existing UI/UX skill guidance on compact hierarchy, source visibility, focus and navigation was reused; no browser or design-system generation ran.

This task created **only these three requested design documents**, with task-local file manifests/check results. It ran no application test/build, database connection/query/migration, browser login, benchmark, fixture, restart or feature command. No live-data preservation/UAT result is newly claimed. A starting manifest protects **1,162 existing inputs**, including accepted application/build/schema/tests/scripts/docs, `.env` and retained launch/fixture manifests. Documentation verification: protected hashes unchanged and all local links valid; [evidence](../../output/a6-2-design-20261024/documentation-checks.json), [starting manifest](../../output/a6-2-design-20261024/preservation-before.json).

**Stop after the three design documents.** Recommended next approval is AP1–AP4 for this coordinated implementation, followed later by the separate AP5 primary-UAT decision. No implementation, permission assignment, source confirmation, schema change or activation has started.
