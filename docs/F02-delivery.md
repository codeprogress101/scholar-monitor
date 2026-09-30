# F02 — RBAC Permission Engine

Implemented on 2026-09-29 against XAMPP MariaDB 10.4.32. Release 0.3.0. F01 was accepted when the user confirmed successful login and requested continuation. F02 is implemented and tested, awaiting user review; F03 is next.

## Result

Michael Opiana's existing account has only the System Administrator role, as explicitly requested. His password and sessions were preserved. This grants six technical/audit permissions and no scholar editing, requirement verification, masterlist approval, or OVR finalization authority.

The **My access** page displays current server-derived roles and permissions. System Administrators can also read the role directory. Permissions describe authority for the planned modules; this release does not implement scholarship workflows or web account editing. Role assignment currently uses the local audited command.

## Database and API

- New immutable migration: `20260929020000_f02_permissions.sql`; roles, permissions, role_permissions, user_roles, and role_change_commands. Three roles, 27 permission definitions; Staff 13 grants, Coordinator 22, System Administrator 6.
- Active role assignments are unique per user/role. Revoked assignments remain in history. Role changes lock the user row, require the expected account version, retain an idempotency record, and write before/after audit data in the same transaction. An audit failure rolls back the change.
- The HTTP runtime has read-only grants on policy/assignments and no access to local command history. Local maintenance uses the separate loopback development administrator connection.
- `GET /api/v1/me/permissions` uses the authenticated session's user ID. Browser role claims and actor IDs do not affect authorization. Own-access reads do not extend idle expiry.
- `GET /api/v1/admin/role-catalog` requires `roles.manage`. It lists roles/permissions, not user accounts.
- New API routes without explicit permission or authenticated-only metadata return 403. Existing login/recovery/health exceptions remain explicit. Unknown authenticated API paths retain 404.
- Effective permissions are fetched on each protected request. Role revocation affects the existing session on the next request; role names alone grant nothing.
- Future business mutations must use `AuthorizationService.withPermission` and perform data/audit writes with its transaction connection. The user-row lock serializes authorization and the mutation with role revocation/account disable. The HTTP guard alone is a request-time check, not a substitute for that transactional service boundary.

MariaDB has no PostgreSQL RLS. Server checks, restricted database grants, constraints, and negative tests implement the authorized XAMPP amendment. Record scope and domain transition rules must be added with their future functions. Staff's limited audit scope remains a future F31 requirement; no audit viewer is exposed now.

## Verification

- `npm run check`: 31 portable tests, lint, TypeScript across application/tools/tests, production build, and secret scan.
- `npm run test:auth-db`: 15 isolated MariaDB authentication regression scenarios.
- `npm run test:rbac-db`: 10 isolated MariaDB scenarios, including all 108 role/permission decisions (27 permissions across Staff, Coordinator, System Administrator, and an unassigned account).
- Direct API probes prove Staff cannot approve masterlists, Coordinator can, and System Administrator cannot finalize OVR. The probes exist only in the isolated test application; they do not pretend to implement later business workflows.
- Covered forged browser role/actor values, default deny, protected catalog, disabled accounts, fresh permission reads after revocation, mixed explicit roles, stale versions, retry conflicts, uniqueness/history, audit failure rollback, guarded mutation rollback, and serialization with revocation.
- `npm run test:db`: actual local connection, three applied checksums, denied role/audit/identity/system-table writes, and restricted runtime grants.
- Playwright: synthetic System Administrator login, My access and role directory, refresh, logout, and the unassigned-account empty state without a role directory. Desktop 1440×1000 and mobile 390×844; mobile has no horizontal overflow. Local screenshots are in ignored `output/playwright/f02-access-desktop.png` and `f02-access-mobile.png`. The initial anonymous `/auth/me` 401 is expected. The browser fixture was stopped and its database/user removed afterward.

Database tests create and remove only uniquely named disposable databases/users. The optional browser fixture's stop endpoint exists only in the test process. No synthetic accounts are added to the real development database.

## Use and next checkpoint

Open `http://127.0.0.1:5173/#access`. Use `npm run roles -- show --email person@example.com` before replacing roles with `npm run roles -- set --email person@example.com --roles staff --expected-version N --reason "Authorized staff assignment"`. `none` revokes all roles; comma-separated roles explicitly combine permissions. The README documents retries and account maintenance.

Next: **F03 — Reference Data and Academic Period Configuration**, using the new read/manage configuration permissions. No F03 tables or endpoints are included in this checkpoint.

Implementation references: [Fastify route metadata](https://fastify.dev/docs/latest/Reference/Routes/) and [MariaDB generated columns](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns).
