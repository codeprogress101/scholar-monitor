# Phase 04 - Dormant additive data foundation

Date: 2026-10-06. Technically complete. Migration applied to local development and full regression validation passed. No operational activation or production sign-off.

## Delivered foundation

`20261006010000_f36_workflow_foundation.sql` adds 16 empty InnoDB tables. The `f36` filename suffix follows the existing migration loader convention; this is workflow-change Phase 04, not another original F-function.

| Tables | Purpose |
| --- | --- |
| `workflow_authority_versions`, `workflow_policy_versions` | Immutable reference identities/versions, real source metadata and authority linkage. No fabricated authority or seeded policies. |
| `workflow_scope_versions` | Explicit semester/cohort/policy designation; defaults to disabled. No scope is created by this migration. |
| `continuing_roster_batches`, `continuing_roster_entries`, `continuing_roster_decisions` | Source roster, resolved identity links and versioned acceptance snapshots for Phase 05. |
| `participations`, `participation_events` | Permanent-scholar participation basis and decision history, independent of annual applicant qualification. |
| `scholar_semesters`, `scholar_semester_revisions` | Unique scholar/semester identity, placement provenance and period snapshots. Missing category, enrollment, full load and year information remain unknown. |
| `requirement_coverage` | Separate instance-linked COR/COG coverage and admission-grade alternatives. |
| `semester_review_events` | Versioned findings and exact source snapshots linked to a semester revision and policy. |
| `semester_entitlements`, `semester_entitlement_events` | One degree benefit per scholar/semester, exact PHP 500000 centavos, review and approval provenance. |
| `entitlement_release_links` | One release linkage per entitlement and payment, with an event belonging to the same entitlement. |
| `workflow_commands` | Actor-scoped command idempotency records for future services. |

Existing tables, statuses, role permissions, APIs and UI behavior are unchanged. All 29 prior migrations remain immutable. Migration count advances to 30, reflected in existing disposable database fixtures and database checks.

## Dormancy and authority boundaries

No runtime grants were added for these tables: the application account cannot read, insert, update or delete them. No routes expose them. Scope/policy records are empty. Later delivery phases must introduce explicit service permissions and narrowly scoped grants alongside tests, not merely flip an enabled flag.

Rows are structured for append-only service use. This is enforced against the existing application account through denial of access; a migration/root operator still has privileged database access. Do not claim SQL tables prevent all privileged writes.

Constraints enforce uniqueness, restrictive foreign keys, record ownership where represented by composite keys, valid known-value domains, required authority for entitlement approval, and the full degree amount. They deliberately do not claim to prove policy compliance from foreign keys alone.

Before later services may use the foundation, they must enforce:

- Actual authority scope, validity and requestor/approver separation, with atomic audits.
- Roster acceptance snapshot membership, identity resolution, source reference validity and admission requirements.
- Annual scholarship/academic-record ownership, approved academic-change provenance and semester dates. Existing annual placement plus approved changes remains authoritative; semester revisions capture a snapshot rather than another independently editable placement source.
- COR/COG evidence ownership, predecessor-semester mapping, document versions, applicable grading rules and derived review outcomes. Receiving an instance does not imply compliance.
- Latest revisions and source freshness, effective dates, policy/cohort designation, period locks and legacy-payment reconciliation.
- Approval-event action and matching payment scholar/semester/amount/outcome before linking a release. The release link constrains duplication but is not itself an approval or a payment reservation.
- Concurrency-safe reservation across OVR drafts and atomic payment/release linking. No new release endpoint exists in this phase.

No legacy qualification, agreement, grade, shift-count, entitlement or payment data is backfilled. Existing services continue to own legacy behavior; the new engine is not enabled.

## Validation and evidence

`npm run test:workflow-foundation-db` creates an encrypted backup and restores it into a disposable database. Before local application, it simulated interruption after the first three table creations and verified that the migration runner completes safely and a second run is a no-op.

Verified on the restored copy:

- Existing rows, schema definitions and prior migration history unchanged; all additions empty.
- No existing runtime grants permit reads or mutations on the new tables.
- Duplicate participation, duplicate scholar-semester and duplicate semester benefits rejected.
- Foreign references and scope/semester mismatches rejected; referenced participation deletion rejected.
- Unknown placement/findings are not automatically populated as known values.
- Scope defaults to disabled; partial amounts/non-PHP currency rejected; entitlement approval requires authority.
- Synthetic probes rolled back, with the restored inventory unchanged afterward. Disposable database and test accounts cleaned up.

Evidence: `output/workflow-phase04/pre-migration-validation.json`, `foundation-validation.json`, and `local-migration.json`. The local comparison verified all 75 existing business tables unchanged; the 76th pre-existing table, `schema_migrations`, gained its expected migration entry. Existing schema/views/triggers stayed unchanged; all 16 additions remained empty.

The first full UAT attempt was interrupted before finalization; its logs are preserved at `output/workflow-phase04/interrupted-uat/` and are not a passing acceptance report. Final full gate: **36 suites passed**, including 188 unit tests, lint/type/build checks, database workflows, concurrency, reporting, encrypted backup/restore and the new foundation suite. Source/build hashes verified after completion. Frozen evidence: `output/workflow-phase04/validated-uat/F36-report.json` and adjacent logs. Application readiness: ready / database connected. The existing client bundle-size advisory remains non-blocking.

## Recovery

MariaDB DDL is not transactional. If creation is interrupted, inspect the partial table definitions against this migration before retrying. `IF NOT EXISTS` does not repair mismatched definitions; use a forward corrective migration for discrepancies. Never edit an applied migration or remove its checksum to force a rerun.

The encrypted pre-migration backup path is recorded in `pre-migration-validation.json`; its restored copy was verified before the local change. Preserve the existing backup key separately.

While the tables remain unused, an application-code rollback can leave the dormant tables in place; migration/check tooling must still recognize the applied migration. Do not delete tables or restore an older database over later operational work. Once future phases create records, disable new entry points and use a forward correction with reconciliation.

Next phase: continuing-scholar onboarding. Its API, review screens, permissions, audits and real operational acceptance are not delivered by this schema-only foundation.
