# F14 delivery - Requirement Instance Generation

Release 0.15.0, completed 2026-10-01 on XAMPP MariaDB. F00-F13 accepted; F14 semester generation implemented and tested, ready for acceptance. Next: F15 physical requirement receiving.

## Delivered behavior

Staff and Coordinators open a scholar profile, select an annual scholarship record, and use **Semester requirement checklists**. Select an open semester belonging to that annual record, review its start date, and supply a generation reason and physical policy reference. Every generated obligation begins **Not Submitted**.

The server chooses applicable semester definitions using the semester start date, captures the date and period labels, and pins every instance to its immutable F13 version ID. Wrong-year semesters, missing references, stale semester revisions, closed/archived periods and client-supplied policy dates, versions, actors or statuses are rejected. Only the matching scope/recurrence and effective range can generate; payout-only, future, expired, archived and other-semester policies are excluded.

A checklist is generated once per annual scholarship record and semester. Repeated commands, including different users and new command keys, return the existing checklist without adding obligations or another generation audit. Exact retries return their saved result. Policy edits, later policy additions or semester date/name changes never reinterpret or extend an existing checklist. Historical reads remain available when periods close. A completed exact retry remains safe after closure; new commands are blocked.

No applicable definitions produces a clear error and saves no empty checklist, allowing policy configuration before retry. No selection, activation or eligibility condition is invented: an existing F06 annual record is required, and generation does not alter qualification or operational status. Document receipt, verification and waiver remain subsequent checkpoints.

## Scope and integration boundary

F14 delivers the semester path now. The authoritative payout model is introduced in F18, so payout-specific generation is deferred to that integration; no synthetic payout IDs or guessed payout dates are accepted. The F13 payout policies remain configurable and previewable but are not instantiated by semester generation. F18 must introduce payout identity/uniqueness and locked-period guards, resolve its authoritative policy date, and preserve existing semester obligations.

This release freezes the complete checklist at generation. Changing an existing checklist requires a future controlled correction workflow; rerunning generation is not a policy refresh. Bulk generation is not exposed. F15 should add receipt events/status transitions via a new migration and retain immutable instance identity, version links, captured period context and generation history.

## API and data

- `GET /api/v1/scholarships/:id/requirements`: lists checklists for an annual record, including pinned definition content, initial status, captured period/date, creator, reason/reference and current period availability. Requires `scholars.read`.
- `POST /api/v1/scholarships/:id/requirements/generate`: accepts only `semesterId`, `expectedSemesterVersion`, `reason`, and `reference`. Requires `requirements.generate`, same-origin/CSRF protection and a UUID `Idempotency-Key`. Returns `{ id, created, count }`.

`requirements.generate` is granted explicitly to Staff and Coordinator policy. System Administrators configure definitions but cannot generate or read individual checklists. Individual role assignments and accounts are unchanged.

`20261001100000_f14_requirement_instances.sql` adds `requirement_checklists`, `requirement_instances` and `requirement_generation_commands`. Unique annual-record/semester and checklist/definition-version keys prevent duplicates. F06 already guarantees one scholar/year record. Restrictive foreign keys preserve dependencies. All three tables receive SELECT/INSERT-only runtime grants; no UPDATE/DELETE. Initial status is constrained to `not_submitted` pending the next workflow migration.

Generation locks the common configuration guard, rechecks current references and saves the checklist, every instance, audit event and receipt in one transaction. Audit failure rolls everything back. Reads used for generation are current locking reads because authorization can establish an older repeatable-read snapshot before the guard is acquired. F13's applicability resolver and command checks were hardened accordingly; original migrations and policy rows remain unchanged.

## Implementation and verification

Core files: `server/requirements/instances-{model,validation,service,routes}.ts`, `src/RequirementInstances.tsx`, profile integration in `src/QualificationPanel.tsx`, F13 resolver adjustments, new migration/runtime grants, permission policy and release/readiness updates. Tests: `tests/requirement-instances.test.ts` and `scripts/test-requirement-instances-db.ts`.

- `npm run check`: 93 portable tests, lint, typechecks, build and secret scan passed. Build was repeated after correcting the profile's React component key collision.
- 56 database scenarios passed: F14 generation 12, F13 definitions 11, RBAC 10, configuration 13 and qualification 10. Coverage includes concurrency, old authorization snapshots, immutable history, wrong period, eligibility-state preservation, forged fields, empty-policy handling, rollback/retry, uniqueness, grants and period closure.
- Browser: Staff opened a profile/annual record, generated three obligations, refreshed and retained exactly one panel and checklist. Desktop/mobile screenshots visually inspected; no horizontal overflow. Artifacts: ignored `output/playwright/f14-checklist-desktop.png` and `f14-checklist-mobile.png`. Disposable fixture stopped and removed.
- Local XAMPP migration applied; `test:db` passed all fourteen migration checksums and restricted grants. API health reports F14/0.15.0 with connected database; readiness passed. No real scholar checklist or sample policy was generated by tests.
