# XAMPP MariaDB / MySQL migration convention

The user chose XAMPP first on 2026-09-29, overriding the source plan's PostgreSQL choice. Local verification uses XAMPP MariaDB 10.4.32. Use InnoDB, UTF-8 (`utf8mb4`), foreign keys, explicit constraints, and UTC timestamps.

F00 adds only `schema_migrations`. Run `npm run setup:local` once on a fresh local setup; it creates a dedicated development database and a runtime identity initially limited to SELECT on this metadata table. It refuses an existing database, user, or `.env`, and does not overwrite them. Then run `npm run db:migrate` for F01 account/session, F02 permission, F03 reference configuration, and F04 scholar tables with narrow runtime grants.

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

## Bootstrap recovery procedure

The local setup preflights collisions before changes and never drops existing resources. If it fails partway, it prints a generic failure and leaves any created database/user for inspection. Do not blindly rerun or delete existing resources. Inspect only `ldss_scholar_monitor_dev` and `ldss_monitor_local`, establish whether they were created by the failed bootstrap, then repair or explicitly remove those empty resources before retrying. The bootstrap writes `.env` only after verifying the restricted account can read the baseline table.
