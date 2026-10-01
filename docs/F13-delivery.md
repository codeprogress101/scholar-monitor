# F13 delivery - Requirement Definition Versioning

Release 0.14.0, completed 2026-10-01 on XAMPP MariaDB. F00-F12 accepted; F13 implemented and tested, ready for acceptance. Next: F14 requirement instance generation.

## Behavior

Open **Requirement definitions** (`/#requirements`). System Administrators create hard-copy requirement policies such as COR or COG/Grades. Staff and Coordinators have read-only access to definitions, history and applicability preview. No user roles were changed and no real policies were seeded.

Each definition has a permanent unique code and immutable version IDs. Versions contain name, physical-document instructions, recurrence (`semester` or `payout`), optional specific semester scope, effective dates, enabled/archive state, reason, policy reference and authenticated actor/time. Blank scope means all semesters. Separate codes can represent separate requirements or concurrent policies; changing a version's scope replaces its earlier scope, rather than adding an override.

Create establishes version 1. Revise/restore appends an enabled version; archive appends an inactive version. Earlier rows are never edited or deleted. The list shows the latest recorded version, including future or archived policies; use the preview for the policy applicable on a particular date.

## Effective-date contract

- Start dates are inclusive and optional end dates are exclusive.
- The latest version starting on or before the policy date wins. A later version supersedes an earlier version from its start date, including changes of scope or recurrence. An inactive, expired or out-of-scope winner never falls back to an older version.
- Initial policies can record a historical start date. Subsequent versions must start strictly after the latest scheduled version and no earlier than today in Asia/Manila. Existing schedules cannot be overwritten or backdated; append a later corrective version. Only one version per definition/start date is allowed.
- A scoped enabled policy and the applicability resolver require an existing, active, unlocked semester and academic year. Archiving can withdraw a policy whose original scope has since closed. Historical definition content remains readable regardless of period closure.
- Preview dates are explicit policy dates; they are not constrained to semester start/end dates because payout schedules may differ. The future generation workflow must select an authoritative period/payout date.

## Integration and API

`GET /api/v1/requirement-definitions` lists latest versions with literal code/name search (`q`), `limit` (1-100, default 25) and `offset`. Archived and scheduled definitions remain visible. `GET /api/v1/requirement-definitions/:id` returns immutable version history.

`GET /api/v1/requirement-definitions/applicable?semesterId=...&appliesTo=semester|payout&effectiveOn=YYYY-MM-DD` provides a read-only applicability preview. It creates no scholar obligations and calculates no payout eligibility.

`POST /api/v1/requirement-definitions` accepts `action: create`, `code`, `expectedVersion: 0`, `reason`, `reference`, and `fields`. Fields contain `name`, `instructions`, `appliesTo`, nullable `semesterId`, `effectiveFrom`, and nullable `effectiveUntil`. `POST /api/v1/requirement-definitions/:id` accepts `revise` with full fields and current `expectedVersion`, or `archive` with `effectiveFrom`, current revision, reason and reference. Restore uses `revise`. Code and actor fields cannot be overridden.

Writes require current `configuration.manage`, a UUID `Idempotency-Key`, origin and CSRF validation. Reads require `configuration.read`. Permission checks, writer guard, optimistic revision checks, immutable inserts, before/after audit and retry receipt share one transaction. Exact retries return their recorded result; changed retries conflict. Concurrent revision commands have one winner. Audit failure rolls back all changes.

F14 must call `applicableRequirements` from `server/requirements/service.ts` inside its generation transaction while holding `configuration_guard`, using the authoritative period/payout date. Persist the returned **version ID** with a restrictive foreign key. Read existing instances through that pinned version; never resolve them again against latest policy. F13 tests demonstrate pinned historical references in a disposable fixture. Actual scholar requirement instances and their generation remain F14; payout records remain F18. No document uploads are introduced.

## Files and migration

- `server/requirements/{model,validation,service,routes}.ts`: contracts, policy history, applicability and audited commands.
- `src/RequirementsPage.tsx`, `src/App.tsx`: configuration editor, version history, preview, navigation and release status.
- `db/migrations/20261001090000_f13_requirement_definitions.sql`: definitions, immutable versions and command receipts. SELECT/INSERT-only runtime grants; no UPDATE/DELETE. All earlier applied SQL is unchanged.
- `scripts/test-requirements-db.ts`, `tests/requirements.test.ts`: database workflow and validation coverage. Migration-count expectations/readiness updated to thirteen migrations.

The F13 migration and narrow grants are applied to the local XAMPP database. `npm run test:db` passed all thirteen checksums, connectivity and denied mutation grants. No real accounts or scholarship records were changed.

## Validation

- `npm run check`: lint, 91 portable tests, client/server/tool/test typechecks, production build and secret scan passed.
- 50 database scenarios passed: 11 new requirement scenarios, 13 configuration, 10 RBAC and 16 F12/prerequisite scenarios. Other earlier suites were not rerun for this checkpoint.
- New coverage includes future-version boundaries, unchanged pinned historical meaning, archive/restore, exclusive expiry, no fallback to superseded policies, scope/recurrence, stale/concurrent commands, actor forgery, rollback, retry conflict, restricted grants, CSRF, pagination and unavailable references.
- Browser verified Administrator create/revise/archive/restore, versions 1-4 retained, policy-date preview, and Staff read-only access. Desktop/mobile history inspected; no horizontal overflow or replacement-character text remained. Screenshots: ignored `output/playwright/f13-requirements-desktop.png` and `f13-requirements-mobile.png`. Disposable fixture removed afterward.
