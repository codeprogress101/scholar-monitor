# XAMPP MariaDB / MySQL migration convention

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
