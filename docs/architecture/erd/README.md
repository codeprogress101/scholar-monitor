# LDSS database ERD and dictionary

29 October 2026. Read-only live metadata documentation.

- **Primary:** ldss_primary_test_12676_61497616 — 150 tables, 3 views, 381 FKs, 67 migrations.
- **5181:** ldss_restore_1793167108097_2b47a744 — 149 tables, 3 views, 381 FKs, 67 migrations.
- Host: DESKTOP-BPLJKRP, MariaDB 10.4.32-MariaDB, 127.0.0.1:3306.
- Captured: primary 2026-10-29T02:24:40.676Z; 5181 2026-10-29T02:24:45.333Z (UTC).

## Start here

1. [System overview and module guide](LDSS_SYSTEM_OVERVIEW.md).
2. [Full physical ERD source](LDSS_COMPLETE_ERD.mmd) / [SVG](exports/LDSS_COMPLETE_ERD.svg): **154 union objects**, including 151 base tables and 3 views. This includes environment-only markers from both targets.
3. [Data dictionary](LDSS_DATA_DICTIONARY.md): every column, key, index, CHECK, default, nullable field, view definition and DDL reference.
4. [Relationship inventory](LDSS_RELATIONSHIPS.md): all FKs and separately marked INFERRED relationships.
5. [Schema comparison](LDSS_SCHEMA_COMPARISON.md) and [completion report](../LDSS_DB_ERD_1_REPORT.md).

## Reading the physical diagrams

Cardinality describes declared constraints, not observed row counts. Parent end: exactly one when all child FK columns are NOT NULL and the target tuple is unique; otherwise nullable composite FKs allow no parent. Child end: zero-to-one when a child unique key is contained in the FK tuple; otherwise zero-to-many. No FK requires a parent to have a child. All composite columns are kept together. PK-containing FK tuples use solid identifying lines; other links use dotted lines. Composite unique keys are not mislabelled as individually unique columns. 0 FK targets lack a demonstrated unique target tuple.

Nullable CHECK expressions may further restrict allowed row combinations; no attempt is made to prove arbitrary expressions or application policy. Column-declared optionality is shown conservatively. MATCH/NULL behavior and exact CHECK clauses are in the dictionary. No row-level orphan or business-authority audit was performed. Notation follows [Mermaid ER documentation](https://mermaid.js.org/syntax/entityRelationshipDiagram.html).

Entity attributes deliberately include PK/FK fields rather than all non-key payload columns. Full SQL types and every field are in the dictionary. Views with no keys appear as independent named entities. Edge labels are exact FK names; child/parent column order and referential actions are in the relationship inventory. Inspect composite links there instead of interpreting each component as an independent FK.

The large complete SVG is a technical index, not the only readable visual. Use the 13 smaller module sources/exports for focused review. No PDF is required to use these scalable sources.

## Reproducibility and scope

Machine-readable [primary metadata](schema/primary.json), [5181 metadata](schema/ip-uat.json), [relationship/module metadata](schema/relationships.json), [comparison](schema/comparison.json) and [validation](schema/validation.json) accompany the sources.

The offline generator is [tools/generate.mjs](tools/generate.mjs), with [domain/description mapping](tools/domains.mjs). Run node docs/architecture/erd/tools/generate.mjs output/db-erd-1-20261029 from the repository root to regenerate from the captured metadata. It does not connect to a database. It overwrites only this generated documentation tree; do not point it at historical evidence. The fresh capture driver is [capture-schema.mjs](../../../output/db-erd-1-20261029/capture-schema.mjs); its outputs use exclusive creation and will refuse an existing snapshot. A future refresh should use a newly reviewed task output directory and preserve this dated capture.

No business, account, session, payment, signatory-value or document rows were read. Only information_schema and migration-journal metadata were queried. Consistent read-only transactions were used; information_schema is not MVCC-protected against concurrent DDL, so validation repeats the metadata checks before completion. No readiness/authenticated API, backup capture, restore, migration, build or financial test was needed.
