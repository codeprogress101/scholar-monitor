# XAMPP MariaDB / MySQL migration convention

### Diagnostic workflow repair (migration 40)

`20261008010000_f36_workflow_diagnostic_fixes.sql` adds nullable continuing-participation provenance to annual scholarship records and an explicit continuing admission state. Existing rows remain unchanged. Verified-to-verified decisions require a link to the prior event; backend authorization and freshness checks limit this to a genuine recheck of changed evidence. Original receipt and workflow events remain immutable. No new table grants or role permissions are required. Local application followed encrypted backup, successful isolated restore, row preservation and canonical grant-hash comparison (`output/workflow-fixes-20261008/local-migration.json`). Do not edit the applied migration or restore an older backup over newer operational work.

The user chose XAMPP first on 2026-09-29, overriding the source plan's PostgreSQL choice. Local verification uses XAMPP MariaDB 10.4.32. Use InnoDB, UTF-8 (`utf8mb4`), foreign keys, explicit constraints, and UTC timestamps.

F00 adds only `schema_migrations`. Run `npm run setup:local` once on a fresh local setup; it creates a dedicated development database and a runtime identity initially limited to SELECT on this metadata table. It refuses an existing database, user, or `.env`, and does not overwrite them. Then run `npm run db:migrate` for F01 account/session, F02 permission, F03 reference configuration, F04 scholar tables, F06 annual qualification tables, F07 status-change history, and F08 academic records with narrow runtime grants.

- Name migrations `YYYYMMDDHHMMSS_fNN_description.sql`, in UTC order. Applied files are immutable; corrections use a new migration.
- Track SHA-256 checksums in `schema_migrations`. The F01 `db:migrate` runner verifies every applied checksum, serializes runs with an advisory lock, and applies pending files in order. The F00 bootstrap still applies only its named baseline migration.
- MariaDB DDL can implicitly commit: do not claim a multi-statement schema migration is atomic. Keep migrations small and forward-recoverable, document partial-failure recovery, and back up before production changes. Business mutations and their audit events must share an InnoDB transaction.
- Run DDL with a separate migration identity. Never grant CREATE, ALTER, DROP, GRANT, or access to unrelated databases to the application identity. Runtime startup must not apply migrations.
- There is no PostgreSQL RLS here. Future functions must use server-derived identities and default-deny permission checks, parameterized SQL, restricted grants/views/procedures as applicable, and negative authorization tests. Do not claim database row-level policy coverage that does not exist.
- Add constraints and permissions before exposing mutations. Preserve history; never weaken constraints to accommodate UI.
- Keep development, staging, and production databases and credentials separate. This XAMPP setup is local development only.
- F01 now enforces individual accounts; later business routes must retain the shared authentication guard. No browser may connect directly to MariaDB.

## F01 migration and grants

`20260929010000_f01_authentication.sql` adds users, sessions, reset tokens, rate-limit counters, and audit records. Its CREATE TABLE IF NOT EXISTS statements allow a partial initial run to resume after inspecting its state. The runner records the checksum only after all statements succeed. Existing mismatched schemas must be repaired explicitly, not silently accepted. F00 remains unchanged. The local migration command reapplies narrow runtime grants after checksum validation and refuses staging/production. Runtime has no DDL, identity-delete, or audit-update/delete privileges. MariaDB DDL is not transactional; back up deployed systems and use forward corrective migrations.

## F02 migration and grants

`20260929020000_f02_permissions.sql` adds roles, permissions, role_permissions, user_roles, and role_change_commands. It seeds three roles and the explicit permission matrix. The generated `active_role` column and unique `(user_id, active_role)` key prevent duplicate active grants while retaining revoked rows. Foreign keys restrict destructive deletion. The runtime gets SELECT on the four policy/assignment tables; the local command history has no runtime grants. Existing F00/F01 migrations are unchanged.

The migration runner records the checksum after all statements succeed. CREATE IF NOT EXISTS and conflict-safe seed inserts allow an interrupted initial migration to resume after schema inspection; these statements do not repair a mismatched existing table or reseed edited policy. Repair discrepancies explicitly with a forward migration. Do not remove migration history or edit applied SQL to force a rerun. Role assignment is a separate audited transaction, not an implicit migration default.

## F03 migration and grants

`20260929030000_f03_configuration.sql` adds academic_years, semesters, barangays, schools, courses, system_settings, configuration_guard, and configuration_commands. Only the singleton configuration lock row is seeded; real reference lists start empty. Codes are unique even after archive. Semesters have a restrictive foreign key to their academic year. Start/end date order and setting value types have database constraints; cross-record dates, archive state, and period locks are enforced transactionally by the service.

The runtime may SELECT/INSERT references and UPDATE only name, version, archive/update timestamps, period dates/locks, and setting type/value as appropriate. Permanent IDs, codes, parent IDs, and created timestamps cannot be updated. It may SELECT the guard and SELECT/INSERT retry records. It cannot delete reference/history records or edit retry results. No additional role permissions are granted to users.

As before, DDL is not atomic. If this migration fails partway, inspect the new tables/constraints before rerunning; CREATE IF NOT EXISTS does not repair mismatched tables. The checksum is recorded only after all statements succeed, and the runner can resume an interrupted initial creation. Never edit an applied migration; use a forward correction. F00/F01/F02 files remain unchanged.

## F04 migration and grants

`20260929040000_f04_scholars.sql` adds scholars, scholar_identifiers, scholar_contacts, scholar_id_sequences, and scholar_commands. UUID primary keys and restrictive reference foreign keys preserve identity. Generated human IDs and the `(entry_year, sequence_no)` pair have unique constraints. Counters are bounded to 99999 per year; transactional allocation uses locks and rolls back with a failed mutation. No sample scholars or reference data are seeded.

Runtime may SELECT/INSERT these tables and UPDATE only mutable scholar/contact fields, profile version/timestamps, and counter last_number. Identifier rows, entry years, UUIDs, and retry history cannot be updated. No DELETE grants are added. API permissions remain Staff/Coordinator only; the migration does not grant roles to users.

DDL is not atomic. Inspect partial schema creation before resuming an interrupted migration; CREATE IF NOT EXISTS cannot repair a mismatched table. Checksums are recorded only after successful completion. Applied files remain immutable; corrections require a new migration. F00 through F03 SQL is unchanged.

## F06 migration and grants

`20260930060000_f06_qualification.sql` adds scholarship_records, qualification_events, and qualification_commands. F05 required no migration. The unique scholar/year key prevents duplicate annual records; restrictive foreign keys retain identities. State and event-edge constraints prevent unsupported qualification values. Active is deliberately excluded until the authoritative masterlist integration is implemented.

Runtime gets SELECT/INSERT on these tables and UPDATE only status, version, last_effective_on, and updated_at on scholarship_records. It cannot change scholar/year identity or rewrite/delete events and command history. Current-state updates and append-only history/audit inserts share one transaction. No new role assignments or permission grants are introduced.

As with earlier migrations, DDL is not atomic. Inspect partial tables/constraints before resuming; CREATE IF NOT EXISTS does not repair schema mismatches. Checksums are recorded after completion. Never edit applied SQL; use a forward migration. All earlier SQL remains unchanged.

## F07 migration and grants

`20260930070000_f07_status_changes.sql` adds nullable operational_status, status_version, and status_effective_on to scholarship_records, leaving F06 qualification status and its constraint unchanged. Existing rows remain unactivated (null/0/null). It adds status_change_requests, status_change_decisions, and status_change_commands. A decision is unique per request; requests, decisions, and retries are insert-only for runtime. Status projection columns alone gain UPDATE grants. No Active records, role assignments, or reference values are seeded.

The operational constraint requires qualification Selected for any activated state. Request-edge checks protect normal transitions and the correction shape. The service additionally validates correction linkage, distinct approver, current versions, chronology, and periods. No migration weakens earlier identity or history constraints. MariaDB DDL is not atomic; inspect partial additions before rerunning the resumable migration. Never edit applied SQL.

## F08 migration and grants

`20260930080000_f08_academic_records.sql` adds academic_records and academic_commands. A unique scholar/year key enforces one authoritative initial entry per year. Required school/course/year references use restrictive foreign keys; reference names/codes are snapshotted for historical display. Runtime gets SELECT/INSERT only, with no UPDATE/DELETE on either table. No academic data or roles are seeded.

Creation, audit, and retry history commit together under the configuration writer lock. Qualification uses the same transaction guard and requires a complete same-year academic entry. F09 must introduce explicit versioned placement-change commands rather than weakening history protection. Applied SQL remains immutable; inspect partial DDL before resuming after a migration failure, since MariaDB DDL is not atomic.

## Bootstrap recovery procedure

The local setup preflights collisions before changes and never drops existing resources. If it fails partway, it prints a generic failure and leaves any created database/user for inspection. Do not blindly rerun or delete existing resources. Inspect only `ldss_scholar_monitor_dev` and `ldss_monitor_local`, establish whether they were created by the failed bootstrap, then repair or explicitly remove those empty resources before retrying. The bootstrap writes `.env` only after verifying the restricted account can read the baseline table.

## F09 migration and grants

`20260930090000_f09_academic_changes.sql` adds append-only `academic_changes`, `academic_change_decisions`, and `academic_change_commands`. Current placement is derived from the latest approved revision; F08 initial entries remain immutable. All three tables receive SELECT/INSERT only. One decision per request and one approved revision number per academic record are enforced by unique keys.

The migration adds `academic.changes.approve` to the Coordinator policy only; individual role assignments and passwords are unchanged. Requests use `academic.edit`. Permissions, shared configuration locking, current-version checks, decisions, audit and retry receipts run transactionally. Academic-year locks and activated scholarship states block direct changes. F11 must extend the guard to official masterlist membership before publication is implemented.

## F10 migration and grants

`20260930100000_f10_masterlist_drafts.sql` adds `masterlist_versions`, `masterlist_entries`, and `masterlist_commands`. Draft status is the only supported state. Scholar/draft uniqueness prevents duplicate entries. Award numbers are nullable and unique within each draft; audited removal clears the award number and retains the entry. Draft counts are computed from entries whose `removed_at` is null.

Runtime can INSERT/SELECT these tables, update only draft revision/timestamp and entry snapshot/award/removal/timestamp, and cannot UPDATE official status, entry identity, retry receipts or DELETE records. No account or policy changes are seeded. Authoritative source reads, optimistic draft revision, audit and retry receipts are coordinated through the shared configuration guard.

F11 must introduce official status transitions and immutable snapshots with new migrations, revalidate current source records transactionally before approval/publication, and extend F09's official-record amendment guard to masterlist membership. Current schema has no official publication or activation command.

## F11 migration and grants

`20260930110000_f11_official_masterlists.sql` expands the masterlist status enum and adds append-only workflow events, official publication snapshots and scholarship activation links. Runtime receives SELECT/INSERT only on these three tables and status-column UPDATE on `masterlist_versions`. Existing entry identity protections and no-delete grants remain. Database triggers reject entry INSERT/UPDATE outside Draft and reopening/modification of locked masterlists; published masterlists can only transition to Locked.

Publication saves the exact JSON snapshot and SHA-256 fingerprint, adds unique scholarship activation links, changes eligible annual operational status to Active and appends audit/workflow/command records in one transaction. No user roles or operational data are seeded. F09 now checks approved/published/locked membership under the shared configuration guard. F12 must append amendment versions without altering an existing publication or resetting activation/status history.

## F12 migration and grants

`20260930120000_f12_masterlist_amendments.sql` adds append-only `masterlist_amendments`, `masterlist_amendment_decisions`, `masterlist_amendment_versions`, and `masterlist_amendment_commands`. Runtime receives SELECT/INSERT only. Unique parent and root/revision keys prevent branching official history; one decision and one publication per amendment prevent repeated finalization.

Publication creates a new locked child and immutable snapshot, links its predecessor and amendment, and appends academic change/approval history when applicable. All records, audit and retry receipt commit together under the shared writer guard. Existing publications, activation links and operational status remain untouched. No roles, accounts or operational sample records are seeded. Earlier migration files remain unchanged. MariaDB DDL is not atomic; inspect partial schema before resuming a failed migration and use forward migrations for corrections.

## F13 migration and grants

`20261001090000_f13_requirement_definitions.sql` adds `requirement_definitions`, `requirement_definition_versions`, and `requirement_definition_commands`. All receive SELECT/INSERT only. Permanent codes, version IDs, content, effective dates, attribution and receipts cannot be updated/deleted by runtime. Unique definition/revision and definition/start-date keys protect history; restrictive foreign keys preserve scopes and actors. No policy or account data is seeded.

Revisions/archive/restore append new rows in chronological order. The resolver selects the latest version starting on/before the authoritative policy date, then checks active state, exclusive expiry, recurrence and scope. New inactive or out-of-scope versions never fall back to old rows. F14 must pin a restrictive foreign key to the selected immutable version and generate inside the same guarded transaction. Initial creation, versions, audit and receipt commit together. Applied earlier SQL remains unchanged; inspect partial DDL before retrying an interrupted migration and use forward migrations for corrections.

## F14 migration and grants

`20261001100000_f14_requirement_instances.sql` adds immutable `requirement_checklists`, `requirement_instances` and `requirement_generation_commands`, with SELECT/INSERT-only runtime grants. Annual-record/semester and checklist/definition-version unique keys prevent duplicates; restrictive foreign keys preserve the exact policy version. Initial status is constrained to `not_submitted`. The migration grants `requirements.generate` to Staff and Coordinator policy, without changing individual role assignments.

Generation captures the semester start as policy date, resolves applicable semester policies using current locking reads under the configuration guard, and commits checklist, instances, audit and receipt together. Repeated generation returns the original complete checklist; future policy changes do not reinterpret it. No real policy or scholar data is seeded. F15 must add controlled receipt/status history with forward migrations; F18 must add authoritative payout identity/date and generation guards. Earlier SQL remains unchanged. MariaDB DDL is not atomic; inspect partial schema before retrying a failed migration and use forward corrections for applied changes.

## F15 migration and grants

`20261001110000_f15_requirement_receiving.sql` adds immutable `requirement_receipts` and `requirement_receipt_commands`, each with SELECT/INSERT-only runtime access. Unique instance/receipt and actor/command keys prevent duplicate initial receipts and retry records. Restrictive foreign keys retain instance and receiver identity. No operational data or role changes are seeded.

The current requirement status derives Submitted from the immutable receipt; the F14 initial generation row and exact policy version remain unchanged. Receipt, audit and retry receipt commit atomically under the shared writer guard with current locking reads and open-period checks. F16/F17 must extend the authoritative state projection and guard to prevent initial receiving of verified/waived or already-received obligations. Preserve original receipt metadata when adding controlled correction/resubmission history. Earlier applied SQL is unchanged. Inspect partial DDL before retrying interrupted migration; corrections to applied schema require a forward migration.

## F16 migration and grants

`20261001120000_f16_requirement_verification.sql` adds append-only `requirement_workflow_events` and `requirement_workflow_commands`, each with SELECT/INSERT-only runtime grants. Unique instance/revision keys, constrained transition edges, explicit correction-link shape and restrictive foreign keys protect history. No role assignments, permissions or operational sample data are seeded.

The shared requirement projection derives current state from ordered workflow events, falling back to immutable initial receipt/generation. F15 uses that projection for its initial-receipt guard. Verification stores source identity, academic/period/policy context and affirmative physical-document checks; reopening Verified links the prior verification, and resubmission appends new custody metadata. Every event, audit and receipt commits under the configuration guard in one transaction with current locking reads. F17 must extend this shared projection/normal-rule helper for Waived; F18 adds payout guards. Applied earlier SQL remains unchanged. Inspect partial DDL before retrying failed migration; changes to applied schema require forward corrections.

## F17 migration and grants

`20261001130000_f17_requirement_waivers.sql` adds append-only `requirement_waivers` and `requirement_waiver_commands` with SELECT/INSERT-only runtime grants. A unique instance key prevents duplicate waivers; restrictive foreign keys retain actor/instance identity. Checks constrain source states, revision and mandatory reason/authority. No account, role or operational sample changes are seeded. Earlier applied SQL remains unchanged.

The shared state projection gives a recorded waiver its own Waived status and metadata while preserving all prior receipts and workflow history. Waiver, audit and retry receipt commit atomically under the writer guard with current locking reads, optimistic revisions and open semester/year checks. F18 must integrate payout-specific locking and policy; `satisfiesNormalRequirement(status, allowWaiver)` supports an explicit server-side policy exclusion. Inspect partial DDL before retrying interrupted migration; applied-schema corrections require a forward migration.

## F18 migration and grants

`20261001140000_f18_payout_cycles.sql` adds immutable `payout_cycles`, `payout_cycle_versions`, `payout_requirements` and `payout_cycle_commands`, with SELECT/INSERT-only runtime access. It seeds `payouts.operate` for Coordinator; System Administrator retains `configuration.manage` for draft configuration. No individual account assignments or operational cycles are seeded.

The forward alteration adds nullable cycle/version links to requirement checklists. A generated context key (`S:` semester or `P:` payout cycle) and unique annual-record/context key preserve semester uniqueness and add independent payout uniqueness. Composite foreign keys enforce matching cycle/semester and cycle/version; the null-pair check prevents incomplete context. Existing semester records retain their IDs, policy dates, requirements and history. Earlier applied SQL is unchanged.

Cycle commands append full policy snapshots with reason/reference and atomic audit/retry records under the writer guard. Opening validates applicable definitions at the configured target date; subsequent lifecycle changes copy that frozen policy. Generation and all receipt/workflow/waiver paths read current cycle state under the same guard. Locked/closed cycles block new mutations while historical reads and exact completed retries remain available. F19 must use the pinned payout policy and authoritative per-instance result in eligibility calculation. Inspect partially applied DDL before retrying; applied changes require forward correction migrations.


## F19 migration and grants

`20261002090000_f19_payout_eligibility.sql` adds append-only `payout_eligibility` snapshots and `payout_eligibility_commands` retry receipts with SELECT/INSERT-only runtime grants. Unique cycle/annual-record/revision and actor/command keys, restrictive foreign keys, and value checks preserve evidence. The `eligibility.calculate` permission is granted to Staff and Coordinator; account role assignments remain unchanged.

Calculations preserve engine version, source fingerprint, reason codes and full source versions. Current locking reads under the shared configuration guard prevent stale authorization snapshots from hiding source changes. Expected revision/fingerprint checks, audit and retry receipt are atomic. Reports use the same server evaluator; GET requests never save results. F20 must retain normal calculations separately from approved overrides and respect source staleness. Earlier SQL is unchanged; inspect partial DDL before retrying and use forward migrations for applied-schema corrections.


## F20 migration and grants

`20261002093000_f20_eligibility_overrides.sql` adds immutable request headers, ordered `eligibility_override_events`, and `eligibility_override_commands`. All three tables have SELECT/INSERT-only runtime grants. Foreign keys retain source calculations and identities, unique request/revision keys serialize event history, and action/state checks constrain stored combinations. Existing F02 override request/approval permissions are reused; no personal role changes or sample records are seeded.

Commands serialize under the shared writer guard and current locking reads. The latest saved normal calculation is pinned at request/re-evaluation; original evidence is retained. Source changes block submission and approval. Re-evaluation returns the request to Draft, requiring resubmission. A separate Coordinator decides; audit and retries commit atomically. Locked/closed cycles block new commands. Effective eligibility uses only the latest approval while its fingerprint matches current normal sources; it never falls back to an older approval. F21 must consume and validate this shared effective result. Earlier migrations remain immutable; inspect partial DDL before retrying failures.


## F21 migration and grants

`20261002100000_f21_ovr_drafts.sql` adds immutable `ovr_batches`, `ovr_batch_events`, `ovr_entries`, and `ovr_commands` with SELECT/INSERT-only runtime grants. Unique cycle/code and batch/revision keys, restrictive foreign keys and lifecycle/action checks preserve command and membership evidence. Existing `ovr.prepare` authority is reused; no operational data or role assignments are seeded.

Membership is projected from the latest add/remove event using direct current locking reads. Duplicate checks cover every active batch membership in the payout cycle under the shared writer guard; nested snapshot aggregates are deliberately avoided. Additions recompute eligibility and enforce mandatory OVR document/status/membership rules plus pending-override guards. Batch revision, entry evidence, audit and retry receipt commit atomically. Validation stores structured current issues without finalizing. F22 must freshly validate and freeze the roster atomically, using the shared helpers and non-Draft guard. Applied earlier migrations remain immutable; inspect partial DDL before retrying failures.


## F22 migration and grants

`20261002110000_f22_ovr_finalization.sql` adds one immutable `ovr_finalizations` record per batch, linked to the exact batch revision and finalizer. It preserves the full roster, current source evidence, cycle, validation, submitter/finalizer metadata and SHA-256 snapshot hash. Positive entry counts and restrictive foreign keys protect metadata. Runtime grants are SELECT/INSERT only; prior migration SQL and personal role assignments remain unchanged.

Submission and finalization use the shared current-source validator inside the guarded transaction. Review locks membership; Coordinator return restores Draft editing. Finalization requires a separate individual and commits its state event, snapshot, audit and retry receipt atomically. One invalid entry or an audit failure leaves no partial finalized state. F23 must retain this snapshot and use separate processing/payment records. Inspect partial DDL before retrying failures and use forward migrations for applied-schema corrections.

## F23 migration and grants

`20261003090000_f23_ovr_processing.sql` adds append-only payment records with unique scholarship/cycle outcomes and foreign keys to frozen batches and lifecycle events. Runtime receives SELECT/INSERT only. Coordinator receives `ovr.submit`; Staff and Coordinator receive `ovr.process`; existing Coordinator `ovr.close` governs reconciled closure. All commands share the writer guard and commit lifecycle event, outcome, audit and retry receipt together. Processing preserves the F22 snapshot hash, checks chronology/revision, and permits open/locked available cycles only. Closed batches reject ordinary mutations; exact completed retries remain valid. F25 will add controlled corrections, never UPDATE/DELETE of original outcomes.

## F24 migration and grants

`20261003100000_f24_ovr_amendments.sql` adds append-only request/decision snapshots tied to OVR batch revisions. Runtime receives SELECT/INSERT only. Staff and Coordinator receive `ovr.amendments.request`; Coordinator receives `ovr.amendments.approve`. Separate-actor approval, shared transaction guard, fresh eligibility/duplicate checks, current revision and audit/retry atomicity preserve original and approved roster versions. Processing resolves the latest approved snapshot and refuses pending amendments. Approval requires administrative resubmission; amendments cannot change processed/closed batches or locked/closed cycles.

## F25 migration and grants

`20261003110000_f25_payment_corrections.sql` adds append-only correction request/decision snapshots linked to the original unique payment and batch event. Runtime receives SELECT/INSERT only. Staff/Coordinator receive `payments.correct`; Coordinator receives `payments.corrections.approve`. Pre-closure corrections apply atomically; closed-period corrections require separate approval. Original payment rows, roster snapshots and closure reconciliation are preserved. Effective totals use the latest applied/approved correction. Shared locking, revision checks, strict input and audit/retry atomicity protect commands. No destructive payment updates or deletes are granted.

## F26 profile read model

`20261003120000_f26_profile_audit_view.sql` creates a SQL SECURITY DEFINER view containing only scholar-related audit IDs, types, actions, actors and timestamps. Runtime receives SELECT on this view, never raw audit SELECT or mutation privileges on the view. The profile endpoint separately enforces scholar read permission, entity scope and own/all audit permission. Current source reads use the shared transaction guard. Profile reads do not create or change domain or audit records. No historical data is rewritten.

### F27 Excel import staging

`20261004090000_f27_excel_import.sql` adds `import_jobs` and `import_confirmations`. Runtime has SELECT/INSERT only. Immutable previews retain normalized row data, errors/warnings and a content fingerprint; confirmations uniquely reference their job and retain per-row results. Both tables link the authenticated actor. No existing scholar data or personal accounts are changed. Confirmation runs the original scholar/academic domain operations, ID allocation, receipts and audit writes in one database transaction.

### F28 Excel exports

`20261004093000_f28_excel_exports.sql` adds the `scholars.export` permission for Staff/Coordinator and the `export_audit_metadata` SQL SECURITY DEFINER view. The runtime receives SELECT on the view only; no raw audit SELECT or audit-history mutation grant is added. The existing System Administrator-only `audit.export` permission is retained. Export events are written through existing append-only audit INSERT access.

### F31 audit viewer

`20261004180000_f31_audit_viewer.sql` adds nullable actor-role snapshots and time/actor indexes to audit_logs. A BEFORE INSERT trigger captures active roles using MariaDB-compatible JSON_QUOTE/GROUP_CONCAT; old events retain NULL. The audit_event_view exposes recorded event evidence through runtime SELECT only. Raw audit SELECT, UPDATE and DELETE remain denied. Own/all scope is enforced inside authenticated service transactions. The export metadata view remains unchanged.

### Workflow Phase 06 checklist ownership bridge

`20261006030000_f36_semester_checklist_owner.sql` permits a checklist to reference either its existing annual scholarship record or a scholar-semester record, never both or neither. The semester owner must match the checklist semester. A unique owner/context key prevents duplicate semester checklists; semester-owned checklists cannot attach to legacy payout cycles. Existing annual ownership, documents and receipts are not converted. No new runtime grants, role permissions, data backfill or scope activation are included. The semester provisioning and coverage-aware service path remains pending; schema support alone does not enable continuing-scholar receiving. Both DDL statements support retries on the supported XAMPP MariaDB version. Preserve the forward migration after use; do not restore over newer operational data to undo this additive bridge.

### Workflow Phase 06 semester setup authorization

`20261006040000_f36_semester_setup.sql` adds `semesters.configure` for Coordinator only. The setup service records authority, document-policy and disabled scope versions for one accepted roster and semester. Staff reads setup; System Administrator technical access does not authorize it. Runtime policy/scope access is SELECT/INSERT only; semester records and document coverage remain read-only. Saving setup creates no receiving records, receipts or entitlements and cannot activate a scope. Correction and controlled activation remain future steps. The local migration was preceded by encrypted backup, verified restore and restored-copy preservation checks.

### Workflow Phase 08 / Checkpoint A submission windows

`20261007010000_f36_payroll_submission_windows.sql` adds regular first/second-semester mappings, versioned semester deadlines, numbered payroll submission windows and their extension history. The four new tables receive runtime SELECT/INSERT only. Only Coordinator receives `payroll.windows.manage`; technical administration does not confer this permission. Mapping pins academic configuration versions. Submission dates use whole days in Asia/Manila, with sequential non-overlapping windows and separate financial processing status. Commands serialize through the existing writer guard and commit history, audit and retry receipts atomically. Legacy records are not backfilled or relabeled. Managed batches remain setup-only until the later receipt, candidate and allocation checkpoints; this migration does not enforce receipt deadlines or enable payment. Local application followed an encrypted backup, verified isolated restore, partial-DDL retry and historical-data/schema preservation checks. Retain the applied forward migration and histories; do not restore an old backup over newer business data to undo it.

### Workflow Phase 08 / Checkpoint B1 enrollment evidence

`20261007020000_f36_enrollment_document_evidence.sql` adds append-only actual-document evidence linked to an initial requirement receipt or a resubmission event. Runtime receives SELECT/INSERT only; existing role permissions are unchanged. A semester enrollment obligation accepts COR or Certificate of Enrollment; COG remains a separate obligation. Each new receipt/resubmission pins the paper actually received. Historical receipts are not relabeled or backfilled. Receipt, document evidence, audit and retry receipt commit atomically. Verification records the current document type alongside existing coverage/placement context. This increment does not activate deadline enforcement, official-membership bridging or financial processing. Local application followed encrypted backup, verified isolated restore, DDL retry and unchanged historical-row/schema checks.


### Managed release and graduation confirmation

`20261007050000_f36_graduation_confirmation.sql` adds an immutable final-funded-semester link to an approved graduation decision. It does not backfill earlier decisions or alter existing business rows. Runtime receives SELECT/INSERT for this table and the existing entitlement_release_links table, with no UPDATE/DELETE. Existing Coordinator status/finalization/correction permissions and Staff processing permissions are reused. Payment holds and unclaimed outcomes append existing entitlement events; original allocations, payment records and finalizations remain immutable. Local application passed encrypted backup/restore, repeatable migration and preservation checks (`output/managed-release/migration-local.json`).


### Annual New-to-Continuing rollover

`20261008020000_f36_annual_rollover.sql` adds nullable `continuing_from_scholarship_id`, a same-scholar composite foreign key and mutually exclusive Continuing provenance checks. Existing Continuing roster sources remain valid. No historical rows or working-year setting are changed by migration. Runtime uses existing annual INSERT and append-only audit INSERT grants; source IDs are not updateable through runtime grants. Year advancement writes individual outcomes/evidence and a reloadable summary to existing append-only audit records.

Migration 42 (`20261008030000_f36_scholar_intake.sql`) adds immutable year-specific spreadsheet intake provenance. It grants no admission or eligibility and creates no scholar or calendar data. Runtime access is SELECT/INSERT only.

## In-app notifications (migration 43)

`20261008040000_f37_notifications.sql` adds immutable `notification_events` and personal `notification_reads`. An AFTER INSERT audit trigger captures the supported workflow transitions in the same transaction. Event IDs are the immutable audit IDs; requester ownership is captured at that transition. Runtime reads events and can update only the separate personal read-state table through authenticated, owner-scoped endpoints. No role/approval grants are introduced.

Existing pending requests are projected from source tables without replaying completed history. See `docs/NOTIFICATIONS_EVENT_MAP.md` for actual transitions and limits. No pending-task status is persisted in the notification tables.

This migration is validated in disposable databases but is not automatically applied to the working database in this delivery. Activation uses the existing backup/restore and `npm run db:migrate` procedure, followed by `npm run test:db` and the full acceptance gate. The runtime needs SELECT on `notification_events` and SELECT/INSERT/UPDATE/DELETE on `notification_reads`; `grantAuthRuntime` includes these narrowly scoped table grants. Existing business permissions are unchanged. Do not expose a new client against an older schema when activating the release.
