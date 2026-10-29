# DB-ERD-1 — Complete database ERD and data dictionary

29 October 2026, Philippine time. **Completed read-only schema documentation for both synthetic UAT databases.** Deliverables include the overview, full physical ERD, 13 modular ERDs, 15 SVG exports, a complete searchable Markdown dictionary, FK inventory, schema comparison and reproducible metadata/generator files. No application, database, account, grant, service or runtime configuration was changed.

Start at the [ERD guide](erd/README.md), [overview](erd/LDSS_SYSTEM_OVERVIEW.md), [dictionary](erd/LDSS_DATA_DICTIONARY.md) or [complete SVG](erd/exports/LDSS_COMPLETE_ERD.svg).

## Authoritative inventories

| Live target | Primary synthetic UAT | Individual Payments UAT |
|---|---|---|
| Database | `ldss_primary_test_12676_61497616` | `ldss_restore_1793167108097_2b47a744` |
| Host / engine | DESKTOP-BPLJKRP / MariaDB 10.4.32 | Same server |
| SQL endpoint | 127.0.0.1:3306 | 127.0.0.1:3306 |
| Base tables | **150** | **149** |
| Views | **3** | **3** |
| Columns, including views | **1,250** | **1,246** |
| FK constraints | **381** | **381** |
| CHECK constraints | **223** | **223** |
| Index definitions | **539** | **537** |
| Applied migrations | **67** | **67** |

The combined ERD contains **151 distinct base tables plus 3 views = 154 objects**. This is a union of two schemas, not a claim that either database contains 154 tables. Every declared primary key and FK component appears in the physical sources. Non-key payload fields and all unique/index/check definitions are retained in the dictionary and metadata.

The existing trusted operator connection was reused, with explicit target names and read-only transactions. The BACKUP-1 inventory implementation was inspected but not executed: it reads business rows unnecessarily for this task. Instead, the new capture reads `information_schema` and the migration journal only. No credentials, password-hash values, tokens, account records, scholar records, payment rows, document contents or configuration values were exported. Column names such as `password_hash` describe the schema, not stored values.

## Diagrams, dictionary and relationships

The 13 modules cover:

1. Accounts, roles and authentication.
2. Scholars, annual records and participation.
3. Academic placement and graduation.
4. COR/COG, receiving and requirement evidence.
5. Semester assessment and prior-batch approval.
6. Masterlists, activation and amendments.
7. Payroll periods, cutoffs and preparation.
8. Payroll batches, frozen rosters and entitlements.
9. Payments, corrections, omissions and reconciliation.
10. Individual disbursements and stored documents.
11. Signatory storage, configuration and authority.
12. Audit, notifications and command ledgers.
13. Migration journal and UAT ownership markers.

Each FK occurs in the module owning its child. Referenced parent objects are repeated as context; this does not imply duplicate storage. The [module guide](erd/LDSS_SYSTEM_OVERVIEW.md) lists core/context counts and source/export links. The overview intentionally shows selected actual FK groups, while the complete ERD and inventory contain all 381.

The [relationship inventory](erd/LDSS_RELATIONSHIPS.md) preserves ordered composite mappings, constraint names, parent keys and UPDATE/DELETE actions. FK count means constraints, not individual component rows. All 381 target column sets have an independently demonstrated unique key. Parent optionality uses child nullability; child maximum uses whether the FK tuple contains a unique child key. No FK requires every parent to have a child. Nullable composite/conditional CHECK constraints and application rules are documented conservatively, without asserting unproven row-level business cardinality.

**Three INFERRED application linkages are separated from the physical FK diagrams:** polymorphic audit entity IDs, typed notification source IDs, and reserved signatory-setting codes. The first two are not universal FKs to every possible business target. The last describes the installed 5181 implementation, not a separate signatory table or proof of current configuration values. One evidence link points to that accepted local release because the workspace source does not contain its signatory module; its portability limitation is explicit.

The dictionary covers **1,253 distinct columns** across the union, including views. It includes SQL types, nullability, exact default metadata, primary/unique/FK memberships, ordered indexes, checks, generated expressions, collations, view definitions and source DDL references. Existing business comments are absent; descriptions are supplied separately from schema comments and tied to live fields and migration evidence. Command tables have a deliberately bounded description: schema presence alone does not certify idempotency or authorization semantics. Environment-marker creation details outside migrations are not invented.

There is **no dedicated backup-job/history table** in these inspected schemas. Ownership/recovery marker tables are not backup jobs. No new backup entity, signatory table or document-template table was fabricated. Private external job journals, if any, are outside this schema-only inspection.

## Schema differences

The [complete comparison](erd/LDSS_SCHEMA_COMPARISON.md) records:

- **Primary only:** `_ldss_uat_owner` and `_ldss_annual_uat_owner`.
- **5181 only:** `_ip_uat1_owner`.
- **One shared-table index difference:** primary retains nonunique `scholar_intakes.academic_year_id (academic_year_id)`; 5181 lacks it. Both retain `ix_intake_associated_year (academic_year_id, scholar_id)`. The history causing the standalone index difference was not reconstructed or guessed.
- **No shared-object column, PK/unique/check/FK or referential-action differences.** The three views and 33 trigger definitions match after self-database qualifier normalization; raw qualifiers remain in the metadata. No view or trigger was executed.
- **All 67 migration versions and checksums match.** All 67 application timestamps differ. Applied repository migration files reproduce those checksums, with no mismatches or unapplied SQL migration file in the inspected repository inventory. Timestamp differences are not schema checksum drift.

Nothing was reconciled, migrated, renamed or repaired.

## Validation and export quality

[Final validation](../../output/db-erd-1-20261029/validation-final.json) passed:

| Focused check | Result |
|---|---|
| Actual objects in full source | **154/154** |
| FK endpoints, ordered mappings and actions | **381/381** |
| Independent cardinality check | Passed using constraints/key-column metadata, separate from generator index helpers |
| Dictionary coverage | **1,253/1,253 columns** |
| Module coverage | Every object assigned; every FK included under its child module |
| Mermaid parse and SVG generation | **15/15** |
| Exported ER entity names | Exact complete/module membership; no invented entities |
| Repeated live metadata / journal comparison | **11 metadata sections per target**, unchanged |
| Known-secret, path/link and syntax checks | [Final checks](../../output/db-erd-1-20261029/final-checks.json) |

Information-schema metadata is not MVCC-protected against concurrent DDL, so a second live read compared the captured sections rather than treating the read-only transaction alone as a schema freeze. No difference was found. These checks do not claim a business-row integrity audit, orphan-data scan or financial acceptance.

Visual samples of the [overview](../../output/db-erd-1-20261029/visual/LDSS_SYSTEM_OVERVIEW.png) and [authentication module](../../output/db-erd-1-20261029/visual/01-authentication.png) were inspected. An older Mermaid renderer silently interpreted `direction LR` as two entities; visual review caught it, the directive was removed, all exports were regenerated, and validation now compares rendered names to the schema. An initial local-file navigation was refused by the Playwright CLI; rendering instead used an offline blank document and local script injection. No application page or temporary HTTP server was used. Export browser sessions were closed.

The complete SVG is approximately **5,745 × 31,277 units** and requires pan/zoom. Some payment/audit modules remain long and dense; edge labels can overlap. Exact mappings remain accessible as searchable text. The overview and module exports avoid making that enormous SVG the only deliverable. No fit-to-page PDF or universal accessibility certification is claimed. [Export guide](erd/exports/README.md), [renderer provenance](../../output/db-erd-1-20261029/renderer/provenance.json), [render results](../../output/db-erd-1-20261029/render-results.json).

## Exact additions and preservation

All deliverables are new files. The [file manifest](../../output/db-erd-1-20261029/deliverables.json) lists exact paths, sizes and hashes.

| Location | Added content |
|---|---|
| `docs/architecture/erd/` | README, overview Markdown/source, complete ERD, relationships, dictionary and comparison |
| `docs/architecture/erd/modules/` | 13 Mermaid sources |
| `docs/architecture/erd/exports/` | 15 SVGs and export guide |
| `docs/architecture/erd/schema/` | Primary/IP metadata, relationship/module inventory, comparison and generator validation JSON |
| `docs/architecture/erd/tools/` | Offline generator and domain/description mapping |
| `docs/architecture/LDSS_DB_ERD_1_REPORT.md` | This report |
| `output/db-erd-1-20261029/` | Exclusive schema captures, metadata-only capture/validation tools, render tooling/provenance, diagnostic screenshots and checks |

No existing historical report, incident notice, baseline manifest, application source, package/lockfile, runtime release or private configuration was rewritten. The renderer library was stored only as task-local documentation tooling; it was not installed into LDSS dependencies. No application build, backup capture, restore, migration, account/grant change, payroll workflow, worker provisioning, patch activation or service restart occurred. The only database-table reads were migration-journal metadata. Operational LAN databases were neither inspected nor modified. **Primary 5173 and UAT 5181 runtime/data remain untouched by this documentation task; LAN-R2A remains paused.**

**Stopped after documentation and focused read-only validation.**
