# F31 — Audit Log and Event Viewer

Implemented in v0.32.0. Next checkpoint: F32 concurrency, idempotency and locking.

## Delivered

- Audit events navigation, default month-to-date Manila date range, pagination, and optional exact event/action/entity/actor/request filters. Date windows are capped at 31 inclusive days; page sizes at 100.
- `GET /api/v1/audit-events` returns event metadata and a scoped count. `GET /api/v1/audit-events/:id` returns the recorded reason, context and supporting JSON evidence. Neither endpoint mutates events.
- Staff with `audit.view_limited` see their own actor ID only, including on direct detail requests. Foreign event IDs return 404. Coordinator/System Administrator `audit.view_all` permits program-wide viewing. Accounts without either permission are denied. Permissions and scope are rechecked in the read transaction.
- Detail panels show recorded states, period IDs, references and remarks where present; original structured payloads remain inspectable. Recursive credential-key redaction protects password/token/secret/cookie/authorization/session-ID fields. React escapes event text.
- System Administrators can use the existing F28 audit metadata export; export scope and payload remain unchanged. Full detail viewing can contain personal information already recorded by authorized workflows; metadata exports continue to exclude it.

## Storage and provenance

Migration `20261004180000_f31_audit_viewer.sql` adds `actor_roles`, time indexes and `audit_event_view`. Runtime receives SELECT on the view, retains INSERT-only audit table access, and has no audit UPDATE/DELETE privileges. A BEFORE INSERT trigger snapshots active actor roles using MariaDB-compatible JSON construction, overriding caller-supplied role values.

Historical rows retain NULL role snapshots; their roles are not inferred from today's assignments. Events without recorded context display “Not recorded.” The viewer does not claim to reconstruct omitted historical evidence. Local operator events retain their actor kind; this view does not expose operator-reference strings.

New eligibility override audit payloads include from/to state, original calculation and current calculation. New OVR amendment payloads include before/after evidence alongside their existing hashes. These additions occur inside the original business transactions. Existing historical audit JSON is not rewritten.

The application has no audit editing/deletion API. This is application/runtime-level tamper resistance, not protection against a privileged database administrator. Pagination is deterministically ordered by timestamp and ID; refresh can include newer events.

## Validation

- `npm run check`: lint, **155 unit tests / 34 files**, type checks, production build and secrets scan passed.
- `npm run test:audit-db`: own/all scope, direct foreign-ID denial, exact filters, pagination, strict validation, insert-time role capture, credential redaction, mutation-route absence, raw audit SELECT denial, table/view UPDATE/DELETE denial, and business-plus-audit rollback verified in disposable MariaDB.
- `npx tsx scripts/test-eligibility-db.ts --amendments --audit`: F19/F22/F24 regression, including audit-failure rollback and amendment concurrency, passed.
- `npm run test:exports-db`: all four export integration groups passed.
- Browser: Staff sees one synthetic event while administrator sees both; filters, event details, redaction and mobile page width verified. Artifacts: `output/playwright/f31-event.png`, `f31-mobile.png`.
- Local migration applied; `npm run test:db` confirms all **29** migration checksums and restricted grants.

## Files

`server/audit/{service,routes}.ts`, `src/AuditPage.tsx`, app navigation/registration, F31 migration and runtime grants/readiness, override/amendment audit evidence, `scripts/test-audit-scenarios.ts`, fixture migration counts and audit test script, `tests/audit.test.ts`, release metadata and documentation.

Personal accounts, activation files and demo records were not changed.
