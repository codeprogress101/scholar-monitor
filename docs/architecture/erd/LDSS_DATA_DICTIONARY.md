# LDSS data dictionary

29 October 2026. Live metadata from both named synthetic schemas. **151 distinct base tables + 3 views**, covering primary 150+3 and 5181 149+3. Search by table, column, FK or index name. No business rows or configuration values are included.

SQL defaults are the exact information_schema representation: a metadata NULL means SQL NULL or no explicit default (the metadata does not distinguish declaration spelling). Quoted SQL literals, expressions, generated-column formulas, full SQL types and collations are retained. PK/UK flags on a component name its constraint, not individual-column uniqueness. CHECK clauses are verbatim schema expressions. Existing schema comments are empty except the engine-provided VIEW marker; no business comments were invented.

## Object index

| Object | Type | Present | Module | Description |
|---|---|---|---|---|
| [_ip_uat1_owner](#-ip-uat1-owner) | BASE TABLE | 5181 only | 13-environment | Dedicated Individual Payments UAT ownership marker. Not a backup-job/history table. |
| [_ldss_annual_uat_owner](#-ldss-annual-uat-owner) | BASE TABLE | Primary only | 13-environment | Primary annual-intake UAT recovery/ownership marker. Not a backup-job/history table. |
| [_ldss_uat_owner](#-ldss-uat-owner) | BASE TABLE | Primary only | 13-environment | Primary synthetic-UAT ownership/purpose marker. No ownership token/hash value is exported. |
| [academic_change_commands](#academic-change-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [academic_change_decisions](#academic-change-decisions) | BASE TABLE | Both | 03-academic | Decision on an academic-change request and resulting placement version. |
| [academic_changes](#academic-changes) | BASE TABLE | Both | 03-academic | Requested academic change with before/after values, expected version and evidence. |
| [academic_commands](#academic-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [academic_records](#academic-records) | BASE TABLE | Both | 03-academic | Annual school/course placement with saved reference labels and optional supported course-pending exception. |
| [academic_years](#academic-years) | BASE TABLE | Both | 02-scholars | Versioned academic-year reference with dates, archive and lock state. |
| [annual_intake_commands](#annual-intake-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [audit_event_view](#audit-event-view) | VIEW | Both | 12-audit-commands | SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys. |
| [audit_logs](#audit-logs) | BASE TABLE | Both | 12-audit-commands | Application audit envelope with entity discriminator/identifier, actor, request, reason and details. No audit rows are exported. |
| [auth_rate_limits](#auth-rate-limits) | BASE TABLE | Both | 01-authentication | Hashed rate-limit buckets, attempt counts and window timestamps. |
| [auth_sessions](#auth-sessions) | BASE TABLE | Both | 01-authentication | Hashed session-token identifiers, account ownership and expiry/revocation timestamps. |
| [barangays](#barangays) | BASE TABLE | Both | 02-scholars | Versioned barangay reference. |
| [configuration_commands](#configuration-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [configuration_guard](#configuration-guard) | BASE TABLE | Both | 11-configuration | Singleton transaction-serialization guard identity. |
| [continuing_roster_batches](#continuing-roster-batches) | BASE TABLE | Both | 02-scholars | Continuing-roster source batch identity and reference. |
| [continuing_roster_decisions](#continuing-roster-decisions) | BASE TABLE | Both | 02-scholars | Versioned roster decisions with authority and snapshots. |
| [continuing_roster_entries](#continuing-roster-entries) | BASE TABLE | Both | 02-scholars | Original roster row and identity evidence for a scholar. |
| [course_pending_events](#course-pending-events) | BASE TABLE | Both | 03-academic | Versioned action/evidence for a course-pending exception. |
| [course_pending_exceptions](#course-pending-exceptions) | BASE TABLE | Both | 03-academic | Annual course-pending exception and approval/import evidence. |
| [courses](#courses) | BASE TABLE | Both | 03-academic | Versioned course reference. |
| [eligibility_override_commands](#eligibility-override-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [eligibility_override_events](#eligibility-override-events) | BASE TABLE | Both | 06-masterlists | Versioned override action/state and calculation snapshot. |
| [eligibility_overrides](#eligibility-overrides) | BASE TABLE | Both | 06-masterlists | Eligibility override request identity for a cycle and annual scholar record. |
| [entitlement_payment_routes](#entitlement-payment-routes) | BASE TABLE | Both | 10-individual-documents | Entitlement reservation on an Individual Payment transaction/event. |
| [entitlement_release_links](#entitlement-release-links) | BASE TABLE | Both | 09-payments | Entitlement-to-payment release with approved event and release evidence. |
| [entrant_grading_card_reviews](#entrant-grading-card-reviews) | BASE TABLE | Both | 04-documents | Versioned entrant grading-card review and issuing/period/source evidence. |
| [export_audit_metadata](#export-audit-metadata) | VIEW | Both | 12-audit-commands | SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys. |
| [graduation_commands](#graduation-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [graduation_confirmations](#graduation-confirmations) | BASE TABLE | Both | 03-academic | Graduation request confirmation and final funded semester association. |
| [graduation_monitoring_cases](#graduation-monitoring-cases) | BASE TABLE | Both | 03-academic | Scholar/year/semester graduation-monitoring case and scope identity. |
| [graduation_monitoring_events](#graduation-monitoring-events) | BASE TABLE | Both | 03-academic | Versioned graduation assessment/review and program-context source evidence. |
| [graduation_record_corrections](#graduation-record-corrections) | BASE TABLE | Both | 03-academic | Graduation correction evidence for earlier-year participation and outstanding-stipend disposition. |
| [historical_payout_setups](#historical-payout-setups) | BASE TABLE | Both | 07-payroll-windows | Recorded historical source/import/batch/deadline setup snapshot. |
| [import_confirmations](#import-confirmations) | BASE TABLE | Both | 02-scholars | Recorded import confirmation and resulting source bindings; exact linkage is in the FK inventory. |
| [import_intake_bindings](#import-intake-bindings) | BASE TABLE | Both | 02-scholars | Import-row to annual-intake binding. |
| [import_jobs](#import-jobs) | BASE TABLE | Both | 02-scholars | Import job identity and persisted import/source assessment fields. See exact columns for the stored contract. |
| [individual_document_contents](#individual-document-contents) | BASE TABLE | Both | 10-individual-documents | Persisted document bytes linked to their exact document version/owner. |
| [individual_document_versions](#individual-document-versions) | BASE TABLE | Both | 10-individual-documents | Versioned Individual Payment document source/configuration/field snapshot and output identity. |
| [individual_payment_events](#individual-payment-events) | BASE TABLE | Both | 10-individual-documents | Versioned Individual Payment actions with snapshots and hashes. |
| [individual_payment_transactions](#individual-payment-transactions) | BASE TABLE | Both | 10-individual-documents | Individual disbursement transaction, entitlement/source route, omission authorization and replacement lineage. |
| [masterlist_activations](#masterlist-activations) | BASE TABLE | Both | 06-masterlists | Annual scholarship activation by official Masterlist and effective/recorded dates. |
| [masterlist_addition_events](#masterlist-addition-events) | BASE TABLE | Both | 06-masterlists | Addition-draft action and resulting target/version evidence. |
| [masterlist_amendment_commands](#masterlist-amendment-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [masterlist_amendment_decisions](#masterlist-amendment-decisions) | BASE TABLE | Both | 06-masterlists | Recorded amendment decision and evidence. |
| [masterlist_amendment_versions](#masterlist-amendment-versions) | BASE TABLE | Both | 06-masterlists | Resulting amendment lineage and optional academic-change association. |
| [masterlist_amendments](#masterlist-amendments) | BASE TABLE | Both | 06-masterlists | Source-backed proposed member amendment with before/after/source values. |
| [masterlist_commands](#masterlist-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [masterlist_consolidation_links](#masterlist-consolidation-links) | BASE TABLE | Both | 06-masterlists | Published source-to-successor consolidation linkage. |
| [masterlist_consolidations](#masterlist-consolidations) | BASE TABLE | Both | 06-masterlists | Consolidation source/target versions and hashes. |
| [masterlist_entries](#masterlist-entries) | BASE TABLE | Both | 06-masterlists | Draft/list scholar entry, saved snapshot, award number and soft-removal timestamp. |
| [masterlist_publications](#masterlist-publications) | BASE TABLE | Both | 06-masterlists | Publication snapshot/hash, effective date and publication actor/time. |
| [masterlist_revisions](#masterlist-revisions) | BASE TABLE | Both | 06-masterlists | Masterlist parent/root lineage and revision kind. |
| [masterlist_versions](#masterlist-versions) | BASE TABLE | Both | 06-masterlists | Masterlist header identity, academic year, title, workflow status and version. |
| [masterlist_workflow_events](#masterlist-workflow-events) | BASE TABLE | Both | 06-masterlists | Masterlist workflow transition and resulting version with complete snapshot/evidence. |
| [notification_events](#notification-events) | BASE TABLE | Both | 12-audit-commands | Typed source/action notification envelope and optional owner. |
| [notification_reads](#notification-reads) | BASE TABLE | Both | 12-audit-commands | User-to-notification read acknowledgement. |
| [ovr_amendments](#ovr-amendments) | BASE TABLE | Both | 08-payroll-entitlements | Payroll amendment case, batch revision, state and snapshot. |
| [ovr_batch_events](#ovr-batch-events) | BASE TABLE | Both | 08-payroll-entitlements | Versioned Payroll batch workflow action/state and snapshot. |
| [ovr_batches](#ovr-batches) | BASE TABLE | Both | 08-payroll-entitlements | Payroll batch identity, cycle and code/name. |
| [ovr_commands](#ovr-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [ovr_entries](#ovr-entries) | BASE TABLE | Both | 08-payroll-entitlements | Proposed/frozen Payroll batch-revision entries and evidence. |
| [ovr_finalizations](#ovr-finalizations) | BASE TABLE | Both | 08-payroll-entitlements | Finalized roster snapshot/hash, entry count and actor/time. |
| [participation_events](#participation-events) | BASE TABLE | Both | 02-scholars | Versioned participation action, authority, snapshot and correction evidence. |
| [participations](#participations) | BASE TABLE | Both | 02-scholars | Scholar participation identity and entry basis, optionally linked to a continuing roster entry. |
| [password_resets](#password-resets) | BASE TABLE | Both | 01-authentication | Hashed reset-token identifiers, account ownership, expiry and consumption timestamps. |
| [payment_corrections](#payment-corrections) | BASE TABLE | Both | 09-payments | Versioned payment correction state/snapshot for Payroll or Individual Payments. |
| [payment_records](#payment-records) | BASE TABLE | Both | 09-payments | Recorded payment outcome, amount, effective date, source route and release evidence; recording is distinct from processing. |
| [payout_cycle_commands](#payout-cycle-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [payout_cycle_versions](#payout-cycle-versions) | BASE TABLE | Both | 07-payroll-windows | Versioned payroll-cycle configuration, target date and workflow state. |
| [payout_cycles](#payout-cycles) | BASE TABLE | Both | 07-payroll-windows | Payroll cycle identity and semester association. |
| [payout_eligibility](#payout-eligibility) | BASE TABLE | Both | 07-payroll-windows | Versioned eligibility calculation, engine/source hash and assessment. |
| [payout_eligibility_commands](#payout-eligibility-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [payout_requirements](#payout-requirements) | BASE TABLE | Both | 07-payroll-windows | Cycle-version to requirement-definition-version mapping and waiver allowance. |
| [payroll_allocations](#payroll-allocations) | BASE TABLE | Both | 08-payroll-entitlements | Entitlement reservation on a Payroll batch and annual record, with approved entitlement event. |
| [payroll_closure_members](#payroll-closure-members) | BASE TABLE | Both | 09-payments | Positioned closure member outcome and snapshot/hash. |
| [payroll_cutoff_rule_versions](#payroll-cutoff-rule-versions) | BASE TABLE | Both | 07-payroll-windows | Versioned permitted cutoff-time rules and authority evidence; this dictionary contains no policy row values. |
| [payroll_deferrals](#payroll-deferrals) | BASE TABLE | Both | 07-payroll-windows | Versioned payroll deferral source hash and reason. |
| [payroll_draft_deferrals](#payroll-draft-deferrals) | BASE TABLE | Both | 07-payroll-windows | Versioned draft deferral/restoration actions and reasons. |
| [payroll_historical_receipts](#payroll-historical-receipts) | BASE TABLE | Both | 09-payments | Versioned historical receipt review and evidence snapshot. |
| [payroll_legacy_conversions](#payroll-legacy-conversions) | BASE TABLE | Both | 09-payments | Source/destination Payroll legacy conversion snapshot and source hash. |
| [payroll_omission_events](#payroll-omission-events) | BASE TABLE | Both | 09-payments | Versioned omission decision, destination and entitlement authorization snapshot. |
| [payroll_omissions](#payroll-omissions) | BASE TABLE | Both | 09-payments | Scholar/semester omission identity and historical source-batch/annual context. |
| [payroll_preparation_versions](#payroll-preparation-versions) | BASE TABLE | Both | 07-payroll-windows | Versioned cycle preparation state and reason. |
| [payroll_reconciliation_events](#payroll-reconciliation-events) | BASE TABLE | Both | 09-payments | Versioned Payroll reconciliation/correction/closure evidence and snapshots. |
| [payroll_reprocessing](#payroll-reprocessing) | BASE TABLE | Both | 09-payments | Original unpaid payment reprocessing identity with root/source batch and entitlement snapshot. |
| [payroll_reprocessing_attempts](#payroll-reprocessing-attempts) | BASE TABLE | Both | 09-payments | Association of a reprocessing case with a destination batch and annual record. |
| [payroll_reprocessing_events](#payroll-reprocessing-events) | BASE TABLE | Both | 09-payments | Versioned reprocessing destination/reason evidence. |
| [payroll_submission_window_versions](#payroll-submission-window-versions) | BASE TABLE | Both | 07-payroll-windows | Versioned window dates, legacy/timed cutoff policy, local time/timezone, UTC boundary and rule binding. |
| [payroll_submission_windows](#payroll-submission-windows) | BASE TABLE | Both | 07-payroll-windows | Batch-to-cycle numbered submission-window identity. |
| [payroll_treasury_confirmations](#payroll-treasury-confirmations) | BASE TABLE | Both | 09-payments | Payment/batch confirmation against Treasury evidence revision and optional historical request. |
| [payroll_treasury_evidence](#payroll-treasury-evidence) | BASE TABLE | Both | 09-payments | Versioned Payroll reference and office receipt evidence. |
| [payroll_unpaid_classifications](#payroll-unpaid-classifications) | BASE TABLE | Both | 09-payments | Versioned unpaid-reason classification for a payment. |
| [permissions](#permissions) | BASE TABLE | Both | 01-authentication | Permission codes, labels and categories. |
| [placement_policy_reviews](#placement-policy-reviews) | BASE TABLE | Both | 03-academic | Placement review source/proposal hashes and saved snapshot. |
| [prior_batch_approvals](#prior-batch-approvals) | BASE TABLE | Both | 05-semester-approval | Prior-batch import/semester attestation with authority, revision and approval/deadline evidence. |
| [prior_batch_documents](#prior-batch-documents) | BASE TABLE | Both | 05-semester-approval | Document decision version and retained-individual basis under a prior approval. |
| [prior_batch_members](#prior-batch-members) | BASE TABLE | Both | 05-semester-approval | Member source hash/snapshot and review-event linkage under a prior approval. |
| [prior_batch_waiver_corrections](#prior-batch-waiver-corrections) | BASE TABLE | Both | 05-semester-approval | Prior approval waiver-correction linkage. |
| [program_duration_events](#program-duration-events) | BASE TABLE | Both | 03-academic | Versioned program-duration scope, dates, curriculum/cohort, authority and assessment snapshot. |
| [program_duration_references](#program-duration-references) | BASE TABLE | Both | 03-academic | School/course program-duration reference identity. |
| [qualification_commands](#qualification-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [qualification_events](#qualification-events) | BASE TABLE | Both | 02-scholars | Recorded qualification transition with before/after status and resulting version. |
| [regular_payout_periods](#regular-payout-periods) | BASE TABLE | Both | 07-payroll-windows | Recorded cycle/year/semester term mapping and source versions. |
| [requirement_checklists](#requirement-checklists) | BASE TABLE | Both | 04-documents | Annual/semester requirement checklist and its saved period/payout context. |
| [requirement_coverage](#requirement-coverage) | BASE TABLE | Both | 04-documents | Versioned COR/COG covered-period and admission-basis association. |
| [requirement_definition_commands](#requirement-definition-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [requirement_definition_versions](#requirement-definition-versions) | BASE TABLE | Both | 04-documents | Versioned requirement policy, document kind, applicability, instructions and effective dates. |
| [requirement_definitions](#requirement-definitions) | BASE TABLE | Both | 04-documents | Stable requirement-definition identity and code. |
| [requirement_document_evidence](#requirement-document-evidence) | BASE TABLE | Both | 04-documents | Document evidence linking instance, receipt and workflow/entrant review. |
| [requirement_generation_commands](#requirement-generation-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [requirement_instances](#requirement-instances) | BASE TABLE | Both | 04-documents | Individual requirement instance under a checklist and exact definition version. |
| [requirement_receipt_commands](#requirement-receipt-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [requirement_receipts](#requirement-receipts) | BASE TABLE | Both | 04-documents | Document receipt evidence; physical received date is separate from recorded timestamp. |
| [requirement_timing_decisions](#requirement-timing-decisions) | BASE TABLE | Both | 04-documents | Batch-specific receipt timing decision with current source hash and evidence. |
| [requirement_waiver_commands](#requirement-waiver-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [requirement_waivers](#requirement-waivers) | BASE TABLE | Both | 04-documents | Requirement waiver authority and before-status evidence. |
| [requirement_workflow_commands](#requirement-workflow-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [requirement_workflow_events](#requirement-workflow-events) | BASE TABLE | Both | 04-documents | Versioned document status transitions, correction reference and saved details. |
| [role_change_commands](#role-change-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [role_permissions](#role-permissions) | BASE TABLE | Both | 01-authentication | Role-to-permission mapping. |
| [roles](#roles) | BASE TABLE | Both | 01-authentication | Role codes, labels and descriptions. |
| [schema_migrations](#schema-migrations) | BASE TABLE | Both | 13-environment | Applied migration version, checksum and application timestamp journal. |
| [scholar_commands](#scholar-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [scholar_contacts](#scholar-contacts) | BASE TABLE | Both | 02-scholars | Scholar contact fields, keyed by scholar. |
| [scholar_id_sequences](#scholar-id-sequences) | BASE TABLE | Both | 02-scholars | Last identifier sequence number per entry year. |
| [scholar_identifiers](#scholar-identifiers) | BASE TABLE | Both | 02-scholars | Scholar human identifier and entry-year sequence assignment. |
| [scholar_intake_revisions](#scholar-intake-revisions) | BASE TABLE | Both | 02-scholars | Versioned intake placement/classification changes and source/reason evidence. |
| [scholar_intake_text_events](#scholar-intake-text-events) | BASE TABLE | Both | 02-scholars | Versioned supplied school/course text with intake-basis hashes and source evidence. |
| [scholar_intakes](#scholar-intakes) | BASE TABLE | Both | 02-scholars | Annual intake identity and source/import association, placement/classification and supplied-details fields. |
| [scholar_profile_audit](#scholar-profile-audit) | VIEW | Both | 12-audit-commands | SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys. |
| [scholar_semester_revisions](#scholar-semester-revisions) | BASE TABLE | Both | 05-semester-approval | Versioned semester placement, program category, enrollment and load source context. |
| [scholar_semesters](#scholar-semesters) | BASE TABLE | Both | 05-semester-approval | Scholar/semester participation and annual/scope identity. |
| [scholars](#scholars) | BASE TABLE | Both | 02-scholars | Person/Registry identity, name and birth-date columns, original year/barangay references and version. |
| [scholarship_records](#scholarship-records) | BASE TABLE | Both | 02-scholars | Scholar annual scholarship record; qualification and operational standing have separate version/date fields. |
| [schools](#schools) | BASE TABLE | Both | 03-academic | Versioned school reference. |
| [semester_document_reconciliations](#semester-document-reconciliations) | BASE TABLE | Both | 04-documents | Source-backed reconciliation of legacy and source requirement instances. |
| [semester_entitlement_events](#semester-entitlement-events) | BASE TABLE | Both | 08-payroll-entitlements | Versioned entitlement decisions linked to semester review and authority. |
| [semester_entitlements](#semester-entitlements) | BASE TABLE | Both | 08-payroll-entitlements | Scholar/semester benefit entitlement, amount in centavos and currency. |
| [semester_review_events](#semester-review-events) | BASE TABLE | Both | 05-semester-approval | Semester review findings, policy/grade basis, source snapshot/hash and supersession. |
| [semester_submission_versions](#semester-submission-versions) | BASE TABLE | Both | 07-payroll-windows | Versioned semester submission deadline and previous-deadline/action evidence. |
| [semesters](#semesters) | BASE TABLE | Both | 02-scholars | Versioned semester reference with dates, academic-year ownership, term kind, archive and lock state. |
| [status_change_commands](#status-change-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [status_change_decisions](#status-change-decisions) | BASE TABLE | Both | 02-scholars | Recorded status-request decision and resulting annual version. |
| [status_change_requests](#status-change-requests) | BASE TABLE | Both | 02-scholars | Requested annual scholarship status transition, expected version and source/reason evidence. |
| [system_settings](#system-settings) | BASE TABLE | Both | 11-configuration | Versioned typed configuration values, including reserved FIN_SIGN_* rows. No configuration values are exported. |
| [user_roles](#user-roles) | BASE TABLE | Both | 01-authentication | User-to-role assignments with grant/revocation timestamps and the generated active-role field. |
| [users](#users) | BASE TABLE | Both | 01-authentication | Application account identities, password-hash column, disabled state and version. No account values are exported. |
| [workflow_authority_versions](#workflow-authority-versions) | BASE TABLE | Both | 11-configuration | Versioned authority issuer/reference, scope and validity evidence. |
| [workflow_commands](#workflow-commands) | BASE TABLE | Both | 12-audit-commands | Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior. |
| [workflow_policy_versions](#workflow-policy-versions) | BASE TABLE | Both | 11-configuration | Versioned rules and authority/effective-date association. |
| [workflow_scope_versions](#workflow-scope-versions) | BASE TABLE | Both | 11-configuration | Versioned semester/cohort workflow mode and policy association. |

<a id="-ip-uat1-owner"></a>

## _ip_uat1_owner

Dedicated Individual Payments UAT ownership marker. Not a backup-job/history table.

**Present:** 5181 only. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `int(11)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | — |
| `token_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `purpose` | `varchar(200)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="-ldss-annual-uat-owner"></a>

## _ldss_annual_uat_owner

Primary annual-intake UAT recovery/ownership marker. Not a backup-job/history table.

**Present:** Primary only. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `int(11)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | — |
| `recovery_verified` | `int(11)` | NO | NULL / no explicit default | — | — | — |
| `token_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="-ldss-uat-owner"></a>

## _ldss_uat_owner

Primary synthetic-UAT ownership/purpose marker. No ownership token/hash value is exported.

**Present:** Primary only. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | utf8mb4_unicode_ci |
| `purpose` | `varchar(100)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `token_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="academic-change-commands"></a>

## academic_change_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930090000_f09_academic_changes.sql:41](../../../db/migrations/20260930090000_f09_academic_changes.sql#L41)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_change_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | academic_change_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_change_commands_ibfk_2 [1] | academic_change_commands_ibfk_2: academic_changes (id) / RESTRICT / RESTRICT | ascii_bin |
| `outcome` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |
| `request_id` | NO | `request_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="academic-change-decisions"></a>

## academic_change_decisions

Decision on an academic-change request and resulting placement version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930090000_f09_academic_changes.sql:24](../../../db/migrations/20260930090000_f09_academic_changes.sql#L24)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `request_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_change_decisions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | academic_change_decisions_ibfk_1: academic_changes (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_record_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_change_decisions_ibfk_2 [1]; UNIQUE uq_academic_revision [1] | academic_change_decisions_ibfk_2: academic_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `decision` | `enum('approve','reject','cancel')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `resulting_version` | `int(10) unsigned` | YES | `NULL` | UNIQUE uq_academic_revision [2] | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_change_decisions_ibfk_3 [1] | academic_change_decisions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `request_id A` | BTREE | — |
| `uq_academic_revision` | YES | `academic_record_id A, resulting_version A` | BTREE | — |

### CHECK constraints

- `ck_academic_decision_version`: ``decision` = 'approve' and `resulting_version` is not null and `resulting_version` &gt; 0 or `decision` &lt;&gt; 'approve' and `resulting_version` is null`

<a id="academic-changes"></a>

## academic_changes

Requested academic change with before/after values, expected version and evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930090000_f09_academic_changes.sql:1](../../../db/migrations/20260930090000_f09_academic_changes.sql#L1), [20261020010000_f44_course_pending_import.sql:41](../../../db/migrations/20261020010000_f44_course_pending_import.sql#L41)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `academic_record_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_changes_ibfk_1 [1] | academic_changes_ibfk_1: academic_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `expected_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `kind` | `enum('course_shift','school_transfer','both','year_level_correction','course_completion')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `before_value` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `after_value` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `school_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_changes_ibfk_2 [1] | academic_changes_ibfk_2: schools (id) / RESTRICT / RESTRICT | ascii_bin |
| `course_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_changes_ibfk_3 [1] | academic_changes_ibfk_3: courses (id) / RESTRICT / RESTRICT | ascii_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `remarks` | `varchar(1000)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_changes_ibfk_4 [1] | academic_changes_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `course_id` | NO | `course_id A` | BTREE | — |
| `ix_academic_change_record` | NO | `academic_record_id A, created_at A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `school_id` | NO | `school_id A` | BTREE | — |

### CHECK constraints

- `after_value`: `json_valid(`after_value`)`
- `before_value`: `json_valid(`before_value`)`

<a id="academic-commands"></a>

## academic_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930080000_f08_academic_records.sql:28](../../../db/migrations/20260930080000_f08_academic_records.sql#L28)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | academic_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `academic_record_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_commands_ibfk_2 [1] | academic_commands_ibfk_2: academic_records (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_record_id` | NO | `academic_record_id A` | BTREE | — |
| `PRIMARY` | YES | `actor_id A, request_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="academic-records"></a>

## academic_records

Annual school/course placement with saved reference labels and optional supported course-pending exception.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930080000_f08_academic_records.sql:1](../../../db/migrations/20260930080000_f08_academic_records.sql#L1), [20261020010000_f44_course_pending_import.sql:31](../../../db/migrations/20261020010000_f44_course_pending_import.sql#L31)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_records_ibfk_1 [1]; UNIQUE uq_academic_scholar_year [1] | academic_records_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_records_ibfk_2 [1]; UNIQUE uq_academic_scholar_year [2] | academic_records_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `school_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_records_ibfk_3 [1] | academic_records_ibfk_3: schools (id) / RESTRICT / RESTRICT | ascii_bin |
| `course_id` | `char(36)` | YES | `NULL` | FOREIGN KEY academic_records_ibfk_4 [1] | academic_records_ibfk_4: courses (id) / RESTRICT / RESTRICT | ascii_bin |
| `year_level` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `year_code` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `year_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `school_code` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `school_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `course_code` | `varchar(60)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `course_name` | `varchar(160)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY academic_records_ibfk_5 [1] | academic_records_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `course_pending_exception_id` | `char(36)` | YES | `NULL` | FOREIGN KEY academic_records_ibfk_6 [1] | academic_records_ibfk_6: course_pending_exceptions (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `course_id` | NO | `course_id A` | BTREE | — |
| `course_pending_exception_id` | NO | `course_pending_exception_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `school_id` | NO | `school_id A` | BTREE | — |
| `uq_academic_scholar_year` | YES | `scholar_id A, academic_year_id A` | BTREE | — |

### CHECK constraints

- `ck_academic_course_source`: ``course_id` is not null and `course_code` is not null and `course_name` is not null and `course_pending_exception_id` is null or `course_id` is null and `course_code` is null and `course_name` is null and `course_pending_exception_id` is not null`
- `ck_academic_level`: `char_length(trim(`year_level`)) &gt; 0`

<a id="academic-years"></a>

## academic_years

Versioned academic-year reference with dates, archive and lock state.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:1](../../../db/migrations/20260929030000_f03_configuration.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `starts_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `ends_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `locked_at` | `datetime(6)` | YES | `NULL` | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

- `ck_dates`: ``ends_on` &gt;= `starts_on``

<a id="annual-intake-commands"></a>

## annual_intake_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024010000_f53_annual_intake_registration.sql:44](../../../db/migrations/20261024010000_f53_annual_intake_registration.sql#L44), [20261025020000_f56_intake_supplied_text.sql:36](../../../db/migrations/20261025020000_f56_intake_supplied_text.sql#L36)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY annual_intake_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | annual_intake_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `operation` | `enum('register_new_identity','register_existing_identity','supplement_initial_details','correct_classification','record_supplied_text','correct_supplied_text')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `intake_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY annual_intake_commands_ibfk_2 [1] | annual_intake_commands_ibfk_2: scholar_intakes (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_revision` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `intake_id` | NO | `intake_id A` | BTREE | — |
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `ck_annual_command_revision`: ``resulting_revision` &gt;= 1`
- `result`: `json_valid(`result`)`

<a id="audit-event-view"></a>

## audit_event_view

SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys.

**Present:** Both. **Type:** VIEW. **Engine/collation:** N/A / N/A. **Schema comment:** `VIEW`.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `event_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `action` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |
| `actor_kind` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_roles` | `longtext` | YES | `NULL` | — | — | utf8mb4_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `request_id` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `details` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| — | — | No declared index | — | — |

### CHECK constraints

None declared.

### View definition

Security: DEFINER; check option: NONE; updatable metadata: YES. No definer account is exported.

```sql
select `ldss_primary_test_12676_61497616`.`audit_logs`.`id` AS `id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`event_type` AS `event_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`entity_type` AS `entity_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`entity_id` AS `entity_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`action` AS `action`,`ldss_primary_test_12676_61497616`.`audit_logs`.`actor_id` AS `actor_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`actor_kind` AS `actor_kind`,`ldss_primary_test_12676_61497616`.`audit_logs`.`actor_roles` AS `actor_roles`,`ldss_primary_test_12676_61497616`.`audit_logs`.`occurred_at` AS `occurred_at`,`ldss_primary_test_12676_61497616`.`audit_logs`.`request_id` AS `request_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`reason` AS `reason`,`ldss_primary_test_12676_61497616`.`audit_logs`.`details` AS `details` from `ldss_primary_test_12676_61497616`.`audit_logs`
```

5181 definition differs only in its explicit database qualifier.

<a id="audit-logs"></a>

## audit_logs

Application audit envelope with entity discriminator/identifier, actor, request, reason and details. No audit rows are exported.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929010000_f01_authentication.sql:42](../../../db/migrations/20260929010000_f01_authentication.sql#L42), [20261004180000_f31_audit_viewer.sql:1](../../../db/migrations/20261004180000_f31_audit_viewer.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `event_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `action` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_audit_actor [1] | fk_audit_actor: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_kind` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `operator_reference` | `varchar(160)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `request_id` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `details` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_roles` | `longtext` | YES | `NULL` | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_audit_actor_time` | NO | `actor_id A, occurred_at A, id A` | BTREE | — |
| `ix_audit_entity` | NO | `entity_id A, occurred_at A` | BTREE | — |
| `ix_audit_time` | NO | `occurred_at A, id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `actor_roles`: `json_valid(`actor_roles`)`
- `details`: `json_valid(`details`)`

<a id="auth-rate-limits"></a>

## auth_rate_limits

Hashed rate-limit buckets, attempt counts and window timestamps.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929010000_f01_authentication.sql:36](../../../db/migrations/20260929010000_f01_authentication.sql#L36)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `bucket_hash` | `char(64)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `attempts` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `window_started_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `bucket_hash A` | BTREE | — |

### CHECK constraints

None declared.

<a id="auth-sessions"></a>

## auth_sessions

Hashed session-token identifiers, account ownership and expiry/revocation timestamps.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929010000_f01_authentication.sql:13](../../../db/migrations/20260929010000_f01_authentication.sql#L13)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `token_hash` | `char(64)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `user_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_session_user [1] | fk_session_user: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `last_seen_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `expires_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `revoked_at` | `datetime(6)` | YES | `NULL` | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_sessions_user` | NO | `user_id A` | BTREE | — |
| `PRIMARY` | YES | `token_hash A` | BTREE | — |

### CHECK constraints

- `ck_session_expiry`: ``expires_at` &gt; `created_at``

<a id="barangays"></a>

## barangays

Versioned barangay reference.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:33](../../../db/migrations/20260929030000_f03_configuration.sql#L33)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="configuration-commands"></a>

## configuration_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:88](../../../db/migrations/20260929030000_f03_configuration.sql#L88)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY configuration_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | configuration_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, request_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="configuration-guard"></a>

## configuration_guard

Singleton transaction-serialization guard identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:80](../../../db/migrations/20260929030000_f03_configuration.sql#L80)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `tinyint(4)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `ck_single_guard`: ``id` = 1`

<a id="continuing-roster-batches"></a>

## continuing_roster_batches

Continuing-roster source batch identity and reference.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:58](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L58)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE code [1] | — | utf8mb4_unicode_ci |
| `source_reference` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_batches_ibfk_1 [1] | continuing_roster_batches_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `code` | YES | `code A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: `char_length(trim(`source_reference`)) &gt; 0`

<a id="continuing-roster-decisions"></a>

## continuing_roster_decisions

Versioned roster decisions with authority and snapshots.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:86](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L86)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_decisions_ibfk_1 [1]; UNIQUE uq_roster_decision [1] | continuing_roster_decisions_ibfk_1: continuing_roster_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_roster_decision [2] | — | — |
| `decision` | `enum('accepted','rejected','returned')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `authority_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_decisions_ibfk_2 [1] | continuing_roster_decisions_ibfk_2: workflow_authority_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_decisions_ibfk_3 [1] | continuing_roster_decisions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `authority_version_id` | NO | `authority_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_roster_decision` | YES | `batch_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="continuing-roster-entries"></a>

## continuing_roster_entries

Original roster row and identity evidence for a scholar.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:68](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L68)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_roster_identity [1] | — | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_entries_ibfk_1 [1]; UNIQUE uq_roster_member [1]; UNIQUE uq_roster_row [1] | continuing_roster_entries_ibfk_1: continuing_roster_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_entries_ibfk_2 [1]; UNIQUE uq_roster_identity [2]; UNIQUE uq_roster_member [2] | continuing_roster_entries_ibfk_2: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_row` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_roster_row [2] | — | — |
| `original_name` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `identity_evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY continuing_roster_entries_ibfk_3 [1] | continuing_roster_entries_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_id` | NO | `scholar_id A` | BTREE | — |
| `uq_roster_identity` | YES | `id A, scholar_id A` | BTREE | — |
| `uq_roster_member` | YES | `batch_id A, scholar_id A` | BTREE | — |
| `uq_roster_row` | YES | `batch_id A, source_row A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``source_row` &gt; 0 and char_length(trim(`original_name`)) &gt; 0`
- `identity_evidence`: `json_valid(`identity_evidence`)`

<a id="course-pending-events"></a>

## course_pending_events

Versioned action/evidence for a course-pending exception.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020010000_f44_course_pending_import.sql:19](../../../db/migrations/20261020010000_f44_course_pending_import.sql#L19)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `exception_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_events_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | course_pending_events_ibfk_1: course_pending_exceptions (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(11)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `action` | `enum('authorized','completed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_events_ibfk_2 [1] | course_pending_events_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `exception_id A, revision A` | BTREE | — |

### CHECK constraints

- `evidence`: `json_valid(`evidence`)`

<a id="course-pending-exceptions"></a>

## course_pending_exceptions

Annual course-pending exception and approval/import evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020010000_f44_course_pending_import.sql:2](../../../db/migrations/20261020010000_f44_course_pending_import.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_exceptions_ibfk_1 [1]; UNIQUE uq_course_pending_year [1] | course_pending_exceptions_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_exceptions_ibfk_2 [1]; UNIQUE uq_course_pending_year [2] | course_pending_exceptions_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `import_job_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_exceptions_ibfk_3 [1] | course_pending_exceptions_ibfk_3: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_row` | `int(11)` | NO | NULL / no explicit default | — | — | — |
| `approval_reference` | `varchar(200)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY course_pending_exceptions_ibfk_4 [1] | course_pending_exceptions_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `import_job_id` | NO | `import_job_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_course_pending_year` | YES | `scholar_id A, academic_year_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="courses"></a>

## courses

Versioned course reference.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:55](../../../db/migrations/20260929030000_f03_configuration.sql#L55)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="eligibility-override-commands"></a>

## eligibility_override_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002093000_f20_eligibility_overrides.sql:31](../../../db/migrations/20261002093000_f20_eligibility_overrides.sql#L31)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_override_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | eligibility_override_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="eligibility-override-events"></a>

## eligibility_override_events

Versioned override action/state and calculation snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002093000_f20_eligibility_overrides.sql:13](../../../db/migrations/20261002093000_f20_eligibility_overrides.sql#L13)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `sequence` | `bigint(20) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | auto_increment |
| `override_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_override_events_ibfk_1 [1]; UNIQUE uq_override_revision [1] | eligibility_override_events_ibfk_1: eligibility_overrides (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_override_revision [2] | — | — |
| `action` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `state` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `calculation_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_override_events_ibfk_2 [1] | eligibility_override_events_ibfk_2: payout_eligibility (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_override_events_ibfk_3 [1] | eligibility_override_events_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `calculation_id` | NO | `calculation_id A` | BTREE | — |
| `PRIMARY` | YES | `sequence A` | BTREE | — |
| `uq_override_revision` | YES | `override_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``action` in ('request','reevaluate') and `state` = 'draft' or `action` = 'submit-review' and `state` = 'pending' or `action` = 'approve' and `state` = 'approved' or `action` = 'reject' and `state` = 'rejected' or `action` = 'cancel' and `state` = 'cancelled'`
- `snapshot`: `json_valid(`snapshot`)`

<a id="eligibility-overrides"></a>

## eligibility_overrides

Eligibility override request identity for a cycle and annual scholar record.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002093000_f20_eligibility_overrides.sql:1](../../../db/migrations/20261002093000_f20_eligibility_overrides.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_overrides_ibfk_1 [1] | eligibility_overrides_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_overrides_ibfk_2 [1] | eligibility_overrides_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `requester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY eligibility_overrides_ibfk_3 [1] | eligibility_overrides_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_override_context` | NO | `cycle_id A, scholarship_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `requester_id` | NO | `requester_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="entitlement-payment-routes"></a>

## entitlement_payment_routes

Entitlement reservation on an Individual Payment transaction/event.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022030000_f48_individual_unclaimed.sql:41](../../../db/migrations/20261022030000_f48_individual_unclaimed.sql#L41)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `entitlement_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_payment_routes_ibfk_1 [1]; FOREIGN KEY entitlement_payment_routes_ibfk_2 [2]; FOREIGN KEY entitlement_payment_routes_ibfk_3 [2]; PRIMARY KEY PRIMARY [1] | entitlement_payment_routes_ibfk_1: semester_entitlements (id) / RESTRICT / RESTRICT; entitlement_payment_routes_ibfk_2: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT; entitlement_payment_routes_ibfk_3: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `transaction_id` | `char(36)` | YES | `NULL` | FOREIGN KEY entitlement_payment_routes_ibfk_2 [1]; UNIQUE transaction_id [1] | entitlement_payment_routes_ibfk_2: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `event_transaction_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_payment_routes_ibfk_3 [1]; FOREIGN KEY entitlement_payment_routes_ibfk_4 [1] | entitlement_payment_routes_ibfk_3: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT; entitlement_payment_routes_ibfk_4: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `event_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY entitlement_payment_routes_ibfk_4 [2] | entitlement_payment_routes_ibfk_4: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `event_transaction_id` | NO | `event_transaction_id A, entitlement_id A` | BTREE | — |
| `event_transaction_id_2` | NO | `event_transaction_id A, event_revision A` | BTREE | — |
| `PRIMARY` | YES | `entitlement_id A` | BTREE | — |
| `transaction_id` | YES | `transaction_id A` | BTREE | — |
| `transaction_id_2` | NO | `transaction_id A, entitlement_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``transaction_id` is null or `transaction_id` = `event_transaction_id``

<a id="entitlement-release-links"></a>

## entitlement_release_links

Entitlement-to-payment release with approved event and release evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:271](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L271)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `entitlement_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_release_links_ibfk_1 [1]; FOREIGN KEY entitlement_release_links_ibfk_3 [2]; PRIMARY KEY PRIMARY [1] | entitlement_release_links_ibfk_1: semester_entitlements (id) / RESTRICT / RESTRICT; entitlement_release_links_ibfk_3: semester_entitlement_events (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `payment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_release_links_ibfk_2 [1]; UNIQUE payment_id [1] | entitlement_release_links_ibfk_2: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `approved_event_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_release_links_ibfk_3 [1] | entitlement_release_links_ibfk_3: semester_entitlement_events (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `release_evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entitlement_release_links_ibfk_4 [1] | entitlement_release_links_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `approved_event_id` | NO | `approved_event_id A, entitlement_id A` | BTREE | — |
| `payment_id` | YES | `payment_id A` | BTREE | — |
| `PRIMARY` | YES | `entitlement_id A` | BTREE | — |

### CHECK constraints

- `release_evidence`: `json_valid(`release_evidence`)`

<a id="entrant-grading-card-reviews"></a>

## entrant_grading_card_reviews

Versioned entrant grading-card review and issuing/period/source evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261014020000_f42_entrant_grading_cards.sql:4](../../../db/migrations/20261014020000_f42_entrant_grading_cards.sql#L4)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entrant_grading_card_reviews_ibfk_1 [1]; UNIQUE uq_entrant_card_revision [1] | entrant_grading_card_reviews_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_entrant_card_revision [2] | — | — |
| `decision` | `enum('approved','revoked')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `issuing_school` | `varchar(200)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `school_year` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `grading_period` | `varchar(100)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `period_end` | `date` | NO | NULL / no explicit default | — | — | — |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY entrant_grading_card_reviews_ibfk_2 [1] | entrant_grading_card_reviews_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_entrant_card_revision` | YES | `instance_id A, revision A` | BTREE | — |

### CHECK constraints

- `evidence`: `json_valid(`evidence`)`

<a id="export-audit-metadata"></a>

## export_audit_metadata

SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys.

**Present:** Both. **Type:** VIEW. **Engine/collation:** N/A / N/A. **Schema comment:** `VIEW`.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `event_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `action` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `request_id` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| — | — | No declared index | — | — |

### CHECK constraints

None declared.

### View definition

Security: DEFINER; check option: NONE; updatable metadata: YES. No definer account is exported.

```sql
select `ldss_primary_test_12676_61497616`.`audit_logs`.`id` AS `id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`event_type` AS `event_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`entity_type` AS `entity_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`action` AS `action`,`ldss_primary_test_12676_61497616`.`audit_logs`.`actor_id` AS `actor_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`occurred_at` AS `occurred_at`,`ldss_primary_test_12676_61497616`.`audit_logs`.`request_id` AS `request_id` from `ldss_primary_test_12676_61497616`.`audit_logs`
```

5181 definition differs only in its explicit database qualifier.

<a id="graduation-commands"></a>

## graduation_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024020000_f54_graduation_monitoring.sql:66](../../../db/migrations/20261024020000_f54_graduation_monitoring.sql#L66)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | graduation_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `operation` | `varchar(60)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `duration_reference_id` | `char(36)` | YES | `NULL` | FOREIGN KEY graduation_commands_ibfk_2 [1] | graduation_commands_ibfk_2: program_duration_references (id) / RESTRICT / RESTRICT | ascii_bin |
| `monitoring_case_id` | `char(36)` | YES | `NULL` | FOREIGN KEY graduation_commands_ibfk_3 [1] | graduation_commands_ibfk_3: graduation_monitoring_cases (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_revision` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `response_status` | `smallint(6)` | NO | NULL / no explicit default | — | — | — |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `duration_reference_id` | NO | `duration_reference_id A` | BTREE | — |
| `monitoring_case_id` | NO | `monitoring_case_id A` | BTREE | — |
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``duration_reference_id` is null &lt;&gt; (`monitoring_case_id` is null)`
- `CONSTRAINT_2`: ``resulting_revision` &gt;= 1 and `response_status` in (200,201)`
- `CONSTRAINT_3`: ``payload_hash` regexp '^[0-9a-f]{64}$'`
- `CONSTRAINT_4`: ``operation` in ('duration.create','duration.confirm','duration.reject','duration.withdraw','duration.propose_correction','duration.dispute','duration.retire','monitoring.create.record_expected','monitoring.create.record_delayed','monitoring.create.follow_up','monitoring.create.flag_review','monitoring.create.record_program_context','monitoring.event.record_expected','monitoring.event.record_delayed','monitoring.event.follow_up','monitoring.event.flag_review','monitoring.event.propose_correction','monitoring.event.review_correction','monitoring.event.correct_assessment','monitoring.event.revalidate_assessment','monitoring.event.record_program_context','monitoring.event.review_program_context')`
- `result`: `json_valid(`result`)`

<a id="graduation-confirmations"></a>

## graduation_confirmations

Graduation request confirmation and final funded semester association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007050000_f36_graduation_confirmation.sql:2](../../../db/migrations/20261007050000_f36_graduation_confirmation.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `request_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_confirmations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | graduation_confirmations_ibfk_1: status_change_decisions (request_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_confirmations_ibfk_2 [1] | graduation_confirmations_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_confirmations_ibfk_3 [1] | graduation_confirmations_ibfk_3: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_confirmations_ibfk_4 [1] | graduation_confirmations_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `request_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="graduation-monitoring-cases"></a>

## graduation_monitoring_cases

Scholar/year/semester graduation-monitoring case and scope identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024020000_f54_graduation_monitoring.sql:33](../../../db/migrations/20261024020000_f54_graduation_monitoring.sql#L33)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_monitoring_cases_ibfk_1 [1]; UNIQUE uq_graduation_owner [1] | graduation_monitoring_cases_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_monitoring_cases_ibfk_2 [1]; UNIQUE uq_graduation_owner [2] | graduation_monitoring_cases_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY graduation_monitoring_cases_ibfk_3 [1] | graduation_monitoring_cases_ibfk_3: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `scope_key` | `char(36)` | YES | `NULL` | UNIQUE uq_graduation_owner [3] | — | STORED GENERATED; coalesce(`semester_id`,'00000000-0000-0000-0000-000000000000'); ascii_bin |
| `created_by` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_monitoring_cases_ibfk_4 [1] | graduation_monitoring_cases_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `created_by` | NO | `created_by A` | BTREE | — |
| `ix_graduation_scope` | NO | `academic_year_id A, scope_key A, scholar_id A, id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_graduation_owner` | YES | `scholar_id A, academic_year_id A, scope_key A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``semester_id` is null or `semester_id` &lt;&gt; '00000000-0000-0000-0000-000000000000'`

<a id="graduation-monitoring-events"></a>

## graduation_monitoring_events

Versioned graduation assessment/review and program-context source evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024020000_f54_graduation_monitoring.sql:42](../../../db/migrations/20261024020000_f54_graduation_monitoring.sql#L42)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `case_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_monitoring_events_ibfk_1 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_2 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_3 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_4 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_5 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_6 [1]; FOREIGN KEY graduation_monitoring_events_ibfk_7 [1]; PRIMARY KEY PRIMARY [1]; UNIQUE uq_monitoring_command [3] | graduation_monitoring_events_ibfk_1: graduation_monitoring_cases (id) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_2: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_3: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_4: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_5: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_6: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT; graduation_monitoring_events_ibfk_7: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `previous_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_2 [2] | graduation_monitoring_events_ibfk_2: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `before_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `event_kind` | `enum('record_expected','record_delayed','follow_up','flag_review','propose_correction','review_correction','correct_assessment','revalidate_assessment','record_program_context','review_program_context')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `assessment_kind` | `enum('none','expected','delayed','needs_review')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `assessment_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_3 [2] | graduation_monitoring_events_ibfk_3: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `review_required` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |
| `pending_review_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_4 [2] | graduation_monitoring_events_ibfk_4: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `program_context_state` | `enum('none','proposed','confirmed','disputed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `program_context_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_5 [2] | graduation_monitoring_events_ibfk_5: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `curriculum_code` | `varchar(80)` | YES | `NULL` | — | — | utf8mb4_bin |
| `cohort_code` | `varchar(80)` | YES | `NULL` | — | — | utf8mb4_bin |
| `placement_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |
| `duration_reference_id` | `char(36)` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_8 [1] | graduation_monitoring_events_ibfk_8: program_duration_events (reference_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `duration_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_8 [2] | graduation_monitoring_events_ibfk_8: program_duration_events (reference_id, revision) / RESTRICT / RESTRICT | — |
| `duration_snapshot_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |
| `corrects_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_6 [2] | graduation_monitoring_events_ibfk_6: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `reviews_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY graduation_monitoring_events_ibfk_7 [2] | graduation_monitoring_events_ibfk_7: graduation_monitoring_events (case_id, revision) / RESTRICT / RESTRICT | — |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `source_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_monitoring_events_ibfk_9 [1]; UNIQUE uq_monitoring_command [1] | graduation_monitoring_events_ibfk_9: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_monitoring_command [2] | — | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `case_id` | NO | `case_id A, previous_revision A` | BTREE | — |
| `case_id_2` | NO | `case_id A, assessment_revision A` | BTREE | — |
| `case_id_3` | NO | `case_id A, pending_review_revision A` | BTREE | — |
| `case_id_4` | NO | `case_id A, program_context_revision A` | BTREE | — |
| `case_id_5` | NO | `case_id A, corrects_revision A` | BTREE | — |
| `case_id_6` | NO | `case_id A, reviews_revision A` | BTREE | — |
| `duration_reference_id` | NO | `duration_reference_id A, duration_revision A` | BTREE | — |
| `ix_monitoring_assessment` | NO | `assessment_kind A, case_id A, revision A` | BTREE | — |
| `ix_monitoring_review` | NO | `review_required A, case_id A, revision A` | BTREE | — |
| `PRIMARY` | YES | `case_id A, revision A` | BTREE | — |
| `uq_monitoring_command` | YES | `actor_id A, command_id A, case_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt;= 1 and (`revision` = 1 and `previous_revision` is null and `before_hash` is null or `revision` &gt; 1 and `previous_revision` is not null and `before_hash` is not null and `previous_revision` = `revision` - 1 and `before_hash` regexp '^[0-9a-f]{64}$')`
- `CONSTRAINT_10`: `char_length(trim(`reason`)) &gt;= 5 and char_length(trim(`source_reference`)) &gt;= 3`
- `CONSTRAINT_2`: ``snapshot_hash` regexp '^[0-9a-f]{64}$'`
- `CONSTRAINT_3`: ``review_required` in (0,1)`
- `CONSTRAINT_4`: ``assessment_revision` is null or `assessment_revision` between 1 and `revision``
- `CONSTRAINT_5`: ``pending_review_revision` is null or `pending_review_revision` between 1 and `revision``
- `CONSTRAINT_6`: ``program_context_revision` is null or `program_context_revision` between 1 and `revision``
- `CONSTRAINT_7`: ``corrects_revision` is null or `corrects_revision` between 1 and `revision` - 1`
- `CONSTRAINT_8`: ``reviews_revision` is null or `reviews_revision` between 1 and `revision` - 1`
- `CONSTRAINT_9`: ``duration_reference_id` is null and `duration_revision` is null and `duration_snapshot_hash` is null or `duration_reference_id` is not null and `duration_revision` is not null and `duration_snapshot_hash` is not null and `duration_revision` &gt;= 1 and `duration_snapshot_hash` regexp '^[0-9a-f]{64}$'`
- `snapshot`: `json_valid(`snapshot`)`

<a id="graduation-record-corrections"></a>

## graduation_record_corrections

Graduation correction evidence for earlier-year participation and outstanding-stipend disposition.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_general_ci. **Schema comment:** none.

**DDL evidence:** [20261007060000_f36_admission_validation.sql:13](../../../db/migrations/20261007060000_f36_admission_validation.sql#L13)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `request_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_record_corrections_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | graduation_record_corrections_ibfk_1: graduation_confirmations (request_id) / RESTRICT / RESTRICT | ascii_bin |
| `graduated_before_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY graduation_record_corrections_ibfk_2 [1] | graduation_record_corrections_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `no_outstanding_stipend` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |
| `operator_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_general_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_general_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `graduated_before_year_id` | NO | `graduated_before_year_id A` | BTREE | — |
| `PRIMARY` | YES | `request_id A` | BTREE | — |

### CHECK constraints

- `no_outstanding_stipend`: ``no_outstanding_stipend` = 1`

<a id="historical-payout-setups"></a>

## historical_payout_setups

Recorded historical source/import/batch/deadline setup snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020020000_f45_prior_batch_approval.sql:55](../../../db/migrations/20261020020000_f45_prior_batch_approval.sql#L55)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY historical_payout_setups_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | historical_payout_setups_ibfk_1: regular_payout_periods (cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `import_job_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY historical_payout_setups_ibfk_2 [1] | historical_payout_setups_ibfk_2: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY historical_payout_setups_ibfk_3 [1]; UNIQUE uq_historical_payout_batch [1] | historical_payout_setups_ibfk_3: payroll_submission_windows (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `deadline_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reported_release_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY historical_payout_setups_ibfk_4 [1] | historical_payout_setups_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `import_job_id` | NO | `import_job_id A` | BTREE | — |
| `PRIMARY` | YES | `cycle_id A, revision A` | BTREE | — |
| `uq_historical_payout_batch` | YES | `batch_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``reported_release_on` &gt;= `deadline_on``
- `snapshot`: `json_valid(`snapshot`)`

<a id="import-confirmations"></a>

## import_confirmations

Recorded import confirmation and resulting source bindings; exact linkage is in the FK inventory.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261004090000_f27_excel_import.sql:15](../../../db/migrations/20261004090000_f27_excel_import.sql#L15)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `job_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_confirmations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | import_confirmations_ibfk_1: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_confirmations_ibfk_2 [1]; UNIQUE uq_import_confirm [1] | import_confirmations_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_import_confirm [2] | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `confirmed_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `job_id A` | BTREE | — |
| `uq_import_confirm` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="import-intake-bindings"></a>

## import_intake_bindings

Import-row to annual-intake binding.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261025010000_f55_import_intake_bindings.sql:2](../../../db/migrations/20261025010000_f55_import_intake_bindings.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `import_job_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_intake_bindings_ibfk_1 [1]; UNIQUE uq_import_binding_intake [1]; UNIQUE uq_import_binding_row [1] | import_intake_bindings_ibfk_1: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_row` | `int(11)` | NO | NULL / no explicit default | UNIQUE uq_import_binding_row [2] | — | — |
| `intake_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_intake_bindings_ibfk_2 [1]; UNIQUE uq_import_binding_intake [2] | import_intake_bindings_ibfk_2: scholar_intakes (id) / RESTRICT / RESTRICT | ascii_bin |
| `person_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `intake_revision` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `intake_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `raw_row_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `identity_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `binding_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_intake_bindings_ibfk_3 [1] | import_intake_bindings_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `ix_binding_intake` | NO | `intake_id A, recorded_at A, id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_import_binding_intake` | YES | `import_job_id A, intake_id A` | BTREE | — |
| `uq_import_binding_row` | YES | `import_job_id A, source_row A` | BTREE | — |

### CHECK constraints

- `ck_import_binding_hashes`: ``intake_hash` regexp '^[a-f0-9]{64}$' and `raw_row_hash` regexp '^[a-f0-9]{64}$' and `binding_hash` regexp '^[a-f0-9]{64}$'`
- `ck_import_binding_reference`: `char_length(trim(`identity_reference`)) &gt;= 3`
- `ck_import_binding_scope`: ``source_row` &gt;= 2 and `person_version` &gt;= 1 and `intake_revision` &gt;= 1`
- `snapshot`: `json_valid(`snapshot`)`

<a id="import-jobs"></a>

## import_jobs

Import job identity and persisted import/source assessment fields. See exact columns for the stored contract.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261004090000_f27_excel_import.sql:1](../../../db/migrations/20261004090000_f27_excel_import.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY import_jobs_ibfk_1 [1]; UNIQUE uq_import_stage [1] | import_jobs_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_import_stage [2] | — | ascii_bin |
| `file_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `file_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `raw_rows` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `preview` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `preview_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_import_stage` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `preview`: `json_valid(`preview`)`
- `raw_rows`: `json_valid(`raw_rows`)`

<a id="individual-document-contents"></a>

## individual_document_contents

Persisted document bytes linked to their exact document version/owner.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022060000_f51_individual_documents.sql:28](../../../db/migrations/20261022060000_f51_individual_documents.sql#L28)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `transaction_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_document_contents_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | individual_document_contents_ibfk_1: individual_document_versions (transaction_id, document_kind, revision, document_hash) / RESTRICT / RESTRICT | ascii_bin |
| `document_kind` | `enum('OR','DV')` | NO | NULL / no explicit default | FOREIGN KEY individual_document_contents_ibfk_1 [2]; PRIMARY KEY PRIMARY [2] | individual_document_contents_ibfk_1: individual_document_versions (transaction_id, document_kind, revision, document_hash) / RESTRICT / RESTRICT | utf8mb4_unicode_ci |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY individual_document_contents_ibfk_1 [3] | individual_document_contents_ibfk_1: individual_document_versions (transaction_id, document_kind, revision, document_hash) / RESTRICT / RESTRICT | — |
| `document_hash` | `char(64)` | NO | NULL / no explicit default | FOREIGN KEY individual_document_contents_ibfk_1 [4] | individual_document_contents_ibfk_1: individual_document_versions (transaction_id, document_kind, revision, document_hash) / RESTRICT / RESTRICT | ascii_bin |
| `content_base64` | `mediumtext` | NO | NULL / no explicit default | — | — | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `transaction_id A, document_kind A` | BTREE | — |
| `transaction_id` | NO | `transaction_id A, document_kind A, revision A, document_hash A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: `from_base64(`content_base64`) is not null and octet_length(from_base64(`content_base64`)) between 1 and 262144`
- `CONSTRAINT_2`: `convert(sha2(from_base64(`content_base64`),256) using ascii) collate ascii_bin = `document_hash``

<a id="individual-document-versions"></a>

## individual_document_versions

Versioned Individual Payment document source/configuration/field snapshot and output identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022060000_f51_individual_documents.sql:4](../../../db/migrations/20261022060000_f51_individual_documents.sql#L4)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `transaction_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_document_versions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1]; UNIQUE uq_document_content_owner [1] | individual_document_versions_ibfk_1: individual_payment_transactions (id, source_kind) / RESTRICT / RESTRICT | ascii_bin |
| `document_kind` | `enum('OR','DV')` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; UNIQUE uq_document_content_owner [2] | — | utf8mb4_unicode_ci |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [3]; UNIQUE uq_document_content_owner [3] | — | — |
| `generation_id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `source_kind` | `enum('unclaimed','omitted')` | NO | NULL / no explicit default | FOREIGN KEY individual_document_versions_ibfk_1 [2] | individual_document_versions_ibfk_1: individual_payment_transactions (id, source_kind) / RESTRICT / RESTRICT | utf8mb4_unicode_ci |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `source` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `template` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `fields` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `document_hash` | `char(64)` | NO | NULL / no explicit default | UNIQUE uq_document_content_owner [4] | — | ascii_bin |
| `content_bytes` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_document_versions_ibfk_2 [1] | individual_document_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `ix_document_generation` | NO | `transaction_id A, revision A` | BTREE | — |
| `PRIMARY` | YES | `transaction_id A, document_kind A, revision A` | BTREE | — |
| `transaction_id` | NO | `transaction_id A, source_kind A` | BTREE | — |
| `uq_document_content_owner` | YES | `transaction_id A, document_kind A, revision A, document_hash A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0 and `content_bytes` &gt; 0 and `content_bytes` &lt;= 262144`
- `CONSTRAINT_2`: ``document_kind` = 'DV' or `source_kind` = 'omitted'`
- `CONSTRAINT_3`: ``source_hash` regexp '^[0-9a-f]{64}$' and `document_hash` regexp '^[0-9a-f]{64}$'`
- `fields`: `json_valid(`fields`)`
- `source`: `json_valid(`source`)`
- `template`: `json_valid(`template`)`

<a id="individual-payment-events"></a>

## individual_payment_events

Versioned Individual Payment actions with snapshots and hashes.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022030000_f48_individual_unclaimed.sql:25](../../../db/migrations/20261022030000_f48_individual_unclaimed.sql#L25), [20261022070000_f52_individual_settlement.sql:7](../../../db/migrations/20261022070000_f52_individual_settlement.sql#L7)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `transaction_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_payment_events_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | individual_payment_events_ibfk_1: individual_payment_transactions (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `action` | `enum('request_recorded','prepared','cancel_requested','cancel_rejected','cancelled','original_paid_cancelled','forwarded','paid','payment_corrected')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_payment_events_ibfk_2 [1] | individual_payment_events_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `transaction_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="individual-payment-transactions"></a>

## individual_payment_transactions

Individual disbursement transaction, entitlement/source route, omission authorization and replacement lineage.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022030000_f48_individual_unclaimed.sql:2](../../../db/migrations/20261022030000_f48_individual_unclaimed.sql#L2), [20261022040000_f49_omitted_scholars.sql:64](../../../db/migrations/20261022040000_f49_omitted_scholars.sql#L64), [20261022060000_f51_individual_documents.sql:2](../../../db/migrations/20261022060000_f51_individual_documents.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_individual_document_source [1]; UNIQUE uq_individual_owner [1] | — | ascii_bin |
| `entitlement_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_individual_omission_approval [3]; FOREIGN KEY individual_payment_transactions_ibfk_1 [1]; FOREIGN KEY individual_payment_transactions_ibfk_4 [2]; FOREIGN KEY individual_payment_transactions_ibfk_5 [2]; UNIQUE uq_individual_owner [2] | fk_individual_omission_approval: payroll_omission_events (omission_id, revision, authorized_entitlement_id) / RESTRICT / RESTRICT; individual_payment_transactions_ibfk_1: semester_entitlements (id) / RESTRICT / RESTRICT; individual_payment_transactions_ibfk_4: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT; individual_payment_transactions_ibfk_5: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `source_payment_id` | `char(36)` | YES | `NULL` | FOREIGN KEY individual_payment_transactions_ibfk_2 [1] | individual_payment_transactions_ibfk_2: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_individual_omission_origin [2]; FOREIGN KEY individual_payment_transactions_ibfk_3 [1] | fk_individual_omission_origin: payroll_omissions (id, source_batch_id) / RESTRICT / RESTRICT; individual_payment_transactions_ibfk_3: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `request_transaction_id` | `char(36)` | YES | `NULL` | FOREIGN KEY individual_payment_transactions_ibfk_4 [1] | individual_payment_transactions_ibfk_4: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `replacement_of` | `char(36)` | YES | `NULL` | FOREIGN KEY individual_payment_transactions_ibfk_5 [1] | individual_payment_transactions_ibfk_5: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `internal_reference` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE internal_reference [1] | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY individual_payment_transactions_ibfk_6 [1] | individual_payment_transactions_ibfk_6: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `request_entitlement` | `char(36)` | YES | `NULL` | UNIQUE uq_individual_request [1] | — | VIRTUAL GENERATED; if(`source_kind` = 'unclaimed' and `replacement_of` is null,`entitlement_id`,NULL); ascii_bin |
| `source_kind` | `enum('unclaimed','omitted')` | NO | `'unclaimed'` | UNIQUE uq_individual_document_source [2] | — | utf8mb4_unicode_ci |
| `omission_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_individual_omission_approval [1]; FOREIGN KEY fk_individual_omission_origin [1] | fk_individual_omission_approval: payroll_omission_events (omission_id, revision, authorized_entitlement_id) / RESTRICT / RESTRICT; fk_individual_omission_origin: payroll_omissions (id, source_batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `approval_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY fk_individual_omission_approval [2] | fk_individual_omission_approval: payroll_omission_events (omission_id, revision, authorized_entitlement_id) / RESTRICT / RESTRICT | — |
| `omission_request` | `char(36)` | YES | `NULL` | UNIQUE uq_omission_individual_request [1] | — | VIRTUAL GENERATED; if(`source_kind` = 'omitted' and `replacement_of` is null,`omission_id`,NULL); ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `fk_individual_omission_approval` | NO | `omission_id A, approval_revision A, entitlement_id A` | BTREE | — |
| `fk_individual_omission_origin` | NO | `omission_id A, source_batch_id A` | BTREE | — |
| `internal_reference` | YES | `internal_reference A` | BTREE | — |
| `ix_individual_entitlement` | NO | `entitlement_id A, recorded_at A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `replacement_of` | NO | `replacement_of A, entitlement_id A` | BTREE | — |
| `request_transaction_id` | NO | `request_transaction_id A, entitlement_id A` | BTREE | — |
| `source_batch_id` | NO | `source_batch_id A` | BTREE | — |
| `source_payment_id` | NO | `source_payment_id A` | BTREE | — |
| `uq_individual_document_source` | YES | `id A, source_kind A` | BTREE | — |
| `uq_individual_owner` | YES | `id A, entitlement_id A` | BTREE | — |
| `uq_individual_request` | YES | `request_entitlement A` | BTREE | — |
| `uq_omission_individual_request` | YES | `omission_request A` | BTREE | — |

### CHECK constraints

- `ck_individual_source`: ``source_kind` = 'unclaimed' and `source_payment_id` is not null and `omission_id` is null and `approval_revision` is null or `source_kind` = 'omitted' and `source_payment_id` is null and `omission_id` is not null and `approval_revision` is not null`
- `CONSTRAINT_1`: ``replacement_of` is null and `request_transaction_id` is null or `replacement_of` is not null and `request_transaction_id` is not null`

<a id="masterlist-activations"></a>

## masterlist_activations

Annual scholarship activation by official Masterlist and effective/recorded dates.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930110000_f11_official_masterlists.sql:33](../../../db/migrations/20260930110000_f11_official_masterlists.sql#L33)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_activations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_activations_ibfk_1: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_activations_ibfk_2 [1] | masterlist_activations_ibfk_2: masterlist_publications (masterlist_id) / RESTRICT / RESTRICT | ascii_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `activated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `masterlist_id` | NO | `masterlist_id A` | BTREE | — |
| `PRIMARY` | YES | `scholarship_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-addition-events"></a>

## masterlist_addition_events

Addition-draft action and resulting target/version evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261013010000_f39_masterlist_additions.sql:16](../../../db/migrations/20261013010000_f39_masterlist_additions.sql#L16)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `draft_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_addition_events_ibfk_1 [1]; UNIQUE uq_addition_version [1] | masterlist_addition_events_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_version` | `int(11)` | NO | NULL / no explicit default | UNIQUE uq_addition_version [2] | — | — |
| `target_id` | `char(36)` | YES | `NULL` | FOREIGN KEY masterlist_addition_events_ibfk_2 [1] | masterlist_addition_events_ibfk_2: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `action` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_addition_events_ibfk_3 [1] | masterlist_addition_events_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `target_id` | NO | `target_id A` | BTREE | — |
| `uq_addition_version` | YES | `draft_id A, resulting_version A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-amendment-commands"></a>

## masterlist_amendment_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930120000_f12_masterlist_amendments.sql:49](../../../db/migrations/20260930120000_f12_masterlist_amendments.sql#L49)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_amendment_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `amendment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_commands_ibfk_2 [1] | masterlist_amendment_commands_ibfk_2: masterlist_amendments (id) / RESTRICT / RESTRICT | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `amendment_id` | NO | `amendment_id A` | BTREE | — |
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="masterlist-amendment-decisions"></a>

## masterlist_amendment_decisions

Recorded amendment decision and evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930120000_f12_masterlist_amendments.sql:20](../../../db/migrations/20260930120000_f12_masterlist_amendments.sql#L20)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `amendment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_decisions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_amendment_decisions_ibfk_1: masterlist_amendments (id) / RESTRICT / RESTRICT | ascii_bin |
| `decision` | `enum('approve','reject','cancel')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_decisions_ibfk_2 [1] | masterlist_amendment_decisions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `amendment_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-amendment-versions"></a>

## masterlist_amendment_versions

Resulting amendment lineage and optional academic-change association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930120000_f12_masterlist_amendments.sql:32](../../../db/migrations/20260930120000_f12_masterlist_amendments.sql#L32)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_versions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_amendment_versions_ibfk_1: masterlist_publications (masterlist_id) / RESTRICT / RESTRICT | ascii_bin |
| `parent_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_versions_ibfk_2 [1]; UNIQUE uq_amendment_parent [1] | masterlist_amendment_versions_ibfk_2: masterlist_publications (masterlist_id) / RESTRICT / RESTRICT | ascii_bin |
| `root_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_versions_ibfk_3 [1]; UNIQUE uq_amendment_revision [1] | masterlist_amendment_versions_ibfk_3: masterlist_publications (masterlist_id) / RESTRICT / RESTRICT | ascii_bin |
| `amendment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendment_versions_ibfk_4 [1]; UNIQUE uq_amendment_publication [1] | masterlist_amendment_versions_ibfk_4: masterlist_amendments (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_amendment_revision [2] | — | — |
| `academic_change_id` | `char(36)` | YES | `NULL` | FOREIGN KEY masterlist_amendment_versions_ibfk_5 [1] | masterlist_amendment_versions_ibfk_5: academic_changes (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_change_id` | NO | `academic_change_id A` | BTREE | — |
| `PRIMARY` | YES | `masterlist_id A` | BTREE | — |
| `uq_amendment_parent` | YES | `parent_id A` | BTREE | — |
| `uq_amendment_publication` | YES | `amendment_id A` | BTREE | — |
| `uq_amendment_revision` | YES | `root_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-amendments"></a>

## masterlist_amendments

Source-backed proposed member amendment with before/after/source values.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930120000_f12_masterlist_amendments.sql:1](../../../db/migrations/20260930120000_f12_masterlist_amendments.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendments_ibfk_1 [1] | masterlist_amendments_ibfk_1: masterlist_publications (masterlist_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendments_ibfk_2 [1] | masterlist_amendments_ibfk_2: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `kind` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `before_value` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `after_value` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `source_value` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_amendments_ibfk_3 [1] | masterlist_amendments_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `masterlist_id` | NO | `masterlist_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_id` | NO | `scholar_id A` | BTREE | — |

### CHECK constraints

- `after_value`: `json_valid(`after_value`)`
- `before_value`: `json_valid(`before_value`)`
- `source_value`: `json_valid(`source_value`)`

<a id="masterlist-commands"></a>

## masterlist_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930100000_f10_masterlist_drafts.sql:29](../../../db/migrations/20260930100000_f10_masterlist_drafts.sql#L29)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_commands_ibfk_2 [1] | masterlist_commands_ibfk_2: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `masterlist_id` | NO | `masterlist_id A` | BTREE | — |
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-consolidation-links"></a>

## masterlist_consolidation_links

Published source-to-successor consolidation linkage.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261013020000_f40_masterlist_consolidation.sql:12](../../../db/migrations/20261013020000_f40_masterlist_consolidation.sql#L12)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `source_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_consolidation_links_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_consolidation_links_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `successor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_consolidation_links_ibfk_2 [1]; UNIQUE successor_id [1] | masterlist_consolidation_links_ibfk_2: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `source_id A` | BTREE | — |
| `successor_id` | YES | `successor_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-consolidations"></a>

## masterlist_consolidations

Consolidation source/target versions and hashes.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261013020000_f40_masterlist_consolidation.sql:1](../../../db/migrations/20261013020000_f40_masterlist_consolidation.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `draft_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_consolidations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_consolidations_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_consolidations_ibfk_2 [1] | masterlist_consolidations_ibfk_2: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_version` | `int(11)` | NO | NULL / no explicit default | — | — | — |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `target_version` | `int(11)` | NO | NULL / no explicit default | — | — | — |
| `target_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `draft_id A` | BTREE | — |
| `source_id` | NO | `source_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-entries"></a>

## masterlist_entries

Draft/list scholar entry, saved snapshot, award number and soft-removal timestamp.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930100000_f10_masterlist_drafts.sql:14](../../../db/migrations/20260930100000_f10_masterlist_drafts.sql#L14)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_entries_ibfk_1 [1]; UNIQUE uq_masterlist_award [1]; UNIQUE uq_masterlist_scholar [1] | masterlist_entries_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_entries_ibfk_2 [1]; UNIQUE uq_masterlist_scholar [2] | masterlist_entries_ibfk_2: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `award_number` | `varchar(60)` | YES | `NULL` | UNIQUE uq_masterlist_award [2] | — | utf8mb4_unicode_ci |
| `removed_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_id` | NO | `scholar_id A` | BTREE | — |
| `uq_masterlist_award` | YES | `masterlist_id A, award_number A` | BTREE | — |
| `uq_masterlist_scholar` | YES | `masterlist_id A, scholar_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="masterlist-publications"></a>

## masterlist_publications

Publication snapshot/hash, effective date and publication actor/time.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930110000_f11_official_masterlists.sql:21](../../../db/migrations/20260930110000_f11_official_masterlists.sql#L21)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_publications_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_publications_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_publications_ibfk_2 [1] | masterlist_publications_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `published_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `masterlist_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="masterlist-revisions"></a>

## masterlist_revisions

Masterlist parent/root lineage and revision kind.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261013010000_f39_masterlist_additions.sql:1](../../../db/migrations/20261013010000_f39_masterlist_additions.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_revisions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | masterlist_revisions_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `parent_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_revisions_ibfk_2 [1]; UNIQUE parent_id [1] | masterlist_revisions_ibfk_2: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `root_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_revisions_ibfk_3 [1]; UNIQUE uq_masterlist_revision [1] | masterlist_revisions_ibfk_3: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(11)` | NO | NULL / no explicit default | UNIQUE uq_masterlist_revision [2] | — | — |
| `kind` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `parent_id` | YES | `parent_id A` | BTREE | — |
| `PRIMARY` | YES | `masterlist_id A` | BTREE | — |
| `uq_masterlist_revision` | YES | `root_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-versions"></a>

## masterlist_versions

Masterlist header identity, academic year, title, workflow status and version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930100000_f10_masterlist_drafts.sql:1](../../../db/migrations/20260930100000_f10_masterlist_drafts.sql#L1), [20260930110000_f11_official_masterlists.sql:1](../../../db/migrations/20260930110000_f11_official_masterlists.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_versions_ibfk_1 [1] | masterlist_versions_ibfk_1: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `title` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `status` | `enum('draft','for_verification','submitted_for_approval','approved','published','locked')` | NO | `'draft'` | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_versions_ibfk_2 [1] | masterlist_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="masterlist-workflow-events"></a>

## masterlist_workflow_events

Masterlist workflow transition and resulting version with complete snapshot/evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930110000_f11_official_masterlists.sql:3](../../../db/migrations/20260930110000_f11_official_masterlists.sql#L3)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `masterlist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_workflow_events_ibfk_1 [1]; UNIQUE uq_masterlist_event [1] | masterlist_workflow_events_ibfk_1: masterlist_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `action` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `from_status` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `to_status` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_masterlist_event [2] | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY masterlist_workflow_events_ibfk_2 [1] | masterlist_workflow_events_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_masterlist_event` | YES | `masterlist_id A, resulting_version A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="notification-events"></a>

## notification_events

Typed source/action notification envelope and optional owner.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261008040000_f37_notifications.sql:1](../../../db/migrations/20261008040000_f37_notifications.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY notification_events_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | notification_events_ibfk_1: audit_logs (id) / RESTRICT / RESTRICT | ascii_bin |
| `kind` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `action` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `metadata` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |
| `owner_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_notice_owner` | NO | `owner_id A, occurred_at A, id A` | BTREE | — |
| `ix_notice_source` | NO | `kind A, source_id A, occurred_at A` | BTREE | — |
| `ix_notice_time` | NO | `occurred_at A, id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `metadata`: `json_valid(`metadata`)`

<a id="notification-reads"></a>

## notification_reads

User-to-notification read acknowledgement.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261008040000_f37_notifications.sql:16](../../../db/migrations/20261008040000_f37_notifications.sql#L16)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `user_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY notification_reads_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | notification_reads_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `event_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY notification_reads_ibfk_2 [1]; PRIMARY KEY PRIMARY [2] | notification_reads_ibfk_2: notification_events (id) / RESTRICT / RESTRICT | ascii_bin |
| `read_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `event_id` | NO | `event_id A` | BTREE | — |
| `PRIMARY` | YES | `user_id A, event_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="ovr-amendments"></a>

## ovr_amendments

Payroll amendment case, batch revision, state and snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261003100000_f24_ovr_amendments.sql:1](../../../db/migrations/20261003100000_f24_ovr_amendments.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_amendments_ibfk_1 [1]; UNIQUE uq_ovr_amendment_event [1] | ovr_amendments_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `batch_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY ovr_amendments_ibfk_1 [2]; UNIQUE uq_ovr_amendment_event [2] | ovr_amendments_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `state` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_amendments_ibfk_2 [1] | ovr_amendments_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A, version A` | BTREE | — |
| `uq_ovr_amendment_event` | YES | `batch_id A, batch_revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``state` in ('pending','approved','rejected')`
- `CONSTRAINT_2`: ``version` in (1,2)`
- `snapshot`: `json_valid(`snapshot`)`

<a id="ovr-batch-events"></a>

## ovr_batch_events

Versioned Payroll batch workflow action/state and snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002100000_f21_ovr_drafts.sql:13](../../../db/migrations/20261002100000_f21_ovr_drafts.sql#L13)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_batch_events_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | ovr_batch_events_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `state` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `action` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_batch_events_ibfk_2 [1] | ovr_batch_events_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``state` in ('draft','review','finalized','submitted','processed','closed')`
- `snapshot`: `json_valid(`snapshot`)`

<a id="ovr-batches"></a>

## ovr_batches

Payroll batch identity, cycle and code/name.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002100000_f21_ovr_drafts.sql:1](../../../db/migrations/20261002100000_f21_ovr_drafts.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_batches_ibfk_1 [1]; UNIQUE uq_ovr_cycle_code [1] | ovr_batches_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_ovr_cycle_code [2] | — | utf8mb4_unicode_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_by` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_batches_ibfk_2 [1] | ovr_batches_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `created_by` | NO | `created_by A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_ovr_cycle_code` | YES | `cycle_id A, code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="ovr-commands"></a>

## ovr_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002100000_f21_ovr_drafts.sql:40](../../../db/migrations/20261002100000_f21_ovr_drafts.sql#L40)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | ovr_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="ovr-entries"></a>

## ovr_entries

Proposed/frozen Payroll batch-revision entries and evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002100000_f21_ovr_drafts.sql:27](../../../db/migrations/20261002100000_f21_ovr_drafts.sql#L27), [20261007040000_f36_payroll_workflow.sql:43](../../../db/migrations/20261007040000_f36_payroll_workflow.sql#L43)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_entries_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | ovr_entries_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `batch_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY ovr_entries_ibfk_1 [2]; PRIMARY KEY PRIMARY [2] | ovr_entries_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_entries_ibfk_2 [1]; PRIMARY KEY PRIMARY [3] | ovr_entries_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `action` | `varchar(10)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_ovr_membership` | NO | `batch_id A, scholarship_id A, batch_revision A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A, batch_revision A, scholarship_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``action` in ('add','remove')`
- `evidence`: `json_valid(`evidence`)`

<a id="ovr-finalizations"></a>

## ovr_finalizations

Finalized roster snapshot/hash, entry count and actor/time.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002110000_f22_ovr_finalization.sql:1](../../../db/migrations/20261002110000_f22_ovr_finalization.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_finalizations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | ovr_finalizations_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `batch_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY ovr_finalizations_ibfk_1 [2] | ovr_finalizations_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `entry_count` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `finalized_by` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY ovr_finalizations_ibfk_2 [1] | ovr_finalizations_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `finalized_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `batch_id` | NO | `batch_id A, batch_revision A` | BTREE | — |
| `finalized_by` | NO | `finalized_by A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``entry_count` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="participation-events"></a>

## participation_events

Versioned participation action, authority, snapshot and correction evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:118](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L118)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_participation_event_owner [1] | — | ascii_bin |
| `participation_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY participation_events_ibfk_1 [1]; FOREIGN KEY participation_events_ibfk_3 [2]; UNIQUE uq_participation_event_owner [2]; UNIQUE uq_participation_revision [1] | participation_events_ibfk_1: participations (id) / RESTRICT / RESTRICT; participation_events_ibfk_3: participation_events (id, participation_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_participation_revision [2] | — | — |
| `action` | `enum('accepted','rejected','standing_decision','correction')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `authority_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY participation_events_ibfk_2 [1] | participation_events_ibfk_2: workflow_authority_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `corrects_event_id` | `char(36)` | YES | `NULL` | FOREIGN KEY participation_events_ibfk_3 [1] | participation_events_ibfk_3: participation_events (id, participation_id) / RESTRICT / RESTRICT | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY participation_events_ibfk_4 [1] | participation_events_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `authority_version_id` | NO | `authority_version_id A` | BTREE | — |
| `corrects_event_id` | NO | `corrects_event_id A, participation_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_participation_event_owner` | YES | `id A, participation_id A` | BTREE | — |
| `uq_participation_revision` | YES | `participation_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="participations"></a>

## participations

Scholar participation identity and entry basis, optionally linked to a continuing roster entry.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:104](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L104), [20261007040000_f36_payroll_workflow.sql:2](../../../db/migrations/20261007040000_f36_payroll_workflow.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_participation_scholar [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY participations_ibfk_1 [1]; FOREIGN KEY participations_ibfk_2 [2]; UNIQUE scholar_id [1]; UNIQUE uq_participation_scholar [2] | participations_ibfk_1: scholars (id) / RESTRICT / RESTRICT; participations_ibfk_2: continuing_roster_entries (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `entry_basis` | `enum('new_applicant','continuing_baseline','official_masterlist')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `roster_entry_id` | `char(36)` | YES | `NULL` | FOREIGN KEY participations_ibfk_2 [1] | participations_ibfk_2: continuing_roster_entries (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY participations_ibfk_3 [1] | participations_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `roster_entry_id` | NO | `roster_entry_id A, scholar_id A` | BTREE | — |
| `scholar_id` | YES | `scholar_id A` | BTREE | — |
| `uq_participation_scholar` | YES | `id A, scholar_id A` | BTREE | — |

### CHECK constraints

- `ck_participation_basis`: ``entry_basis` = 'continuing_baseline' and `roster_entry_id` is not null or `entry_basis` in ('new_applicant','official_masterlist') and `roster_entry_id` is null`

<a id="password-resets"></a>

## password_resets

Hashed reset-token identifiers, account ownership, expiry and consumption timestamps.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929010000_f01_authentication.sql:25](../../../db/migrations/20260929010000_f01_authentication.sql#L25)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `token_hash` | `char(64)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `user_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_reset_user [1] | fk_reset_user: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `expires_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `consumed_at` | `datetime(6)` | YES | `NULL` | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `ix_resets_user` | NO | `user_id A` | BTREE | — |
| `PRIMARY` | YES | `token_hash A` | BTREE | — |

### CHECK constraints

- `ck_reset_expiry`: ``expires_at` &gt; `created_at``

<a id="payment-corrections"></a>

## payment_corrections

Versioned payment correction state/snapshot for Payroll or Individual Payments.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261003110000_f25_payment_corrections.sql:1](../../../db/migrations/20261003110000_f25_payment_corrections.sql#L1), [20261022070000_f52_individual_settlement.sql:32](../../../db/migrations/20261022070000_f52_individual_settlement.sql#L32)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `payment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_correction_individual_payment [1]; FOREIGN KEY fk_correction_payroll_owner [1]; FOREIGN KEY payment_corrections_ibfk_1 [1] | fk_correction_individual_payment: payment_records (id, individual_transaction_id) / RESTRICT / RESTRICT; fk_correction_payroll_owner: payment_records (id, batch_id) / RESTRICT / RESTRICT; payment_corrections_ibfk_1: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_correction_payroll_owner [2]; FOREIGN KEY payment_corrections_ibfk_2 [1]; UNIQUE uq_payment_correction_event [1] | fk_correction_payroll_owner: payment_records (id, batch_id) / RESTRICT / RESTRICT; payment_corrections_ibfk_2: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `batch_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY payment_corrections_ibfk_2 [2]; UNIQUE uq_payment_correction_event [2] | payment_corrections_ibfk_2: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `state` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payment_corrections_ibfk_3 [1] | payment_corrections_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `individual_transaction_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_correction_individual_event [1]; FOREIGN KEY fk_correction_individual_payment [2]; UNIQUE uq_individual_correction_revision [1] | fk_correction_individual_event: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT; fk_correction_individual_payment: payment_records (id, individual_transaction_id) / RESTRICT / RESTRICT | ascii_bin |
| `individual_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY fk_correction_individual_event [2]; UNIQUE uq_individual_correction_revision [2] | fk_correction_individual_event: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `fk_correction_individual_payment` | NO | `payment_id A, individual_transaction_id A` | BTREE | — |
| `fk_correction_payroll_owner` | NO | `payment_id A, batch_id A` | BTREE | — |
| `PRIMARY` | YES | `id A, version A` | BTREE | — |
| `uq_individual_correction_revision` | YES | `individual_transaction_id A, individual_revision A` | BTREE | — |
| `uq_payment_correction_event` | YES | `batch_id A, batch_revision A` | BTREE | — |

### CHECK constraints

- `ck_correction_source`: ``batch_id` is not null and `batch_revision` is not null and `individual_transaction_id` is null and `individual_revision` is null or `batch_id` is null and `batch_revision` is null and `individual_transaction_id` is not null and `individual_revision` is not null and `individual_revision` &gt; 0`
- `CONSTRAINT_1`: ``state` in ('pending','applied','approved','rejected')`
- `CONSTRAINT_2`: ``version` in (1,2)`
- `snapshot`: `json_valid(`snapshot`)`

<a id="payment-records"></a>

## payment_records

Recorded payment outcome, amount, effective date, source route and release evidence; recording is distinct from processing.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261003090000_f23_ovr_processing.sql:1](../../../db/migrations/20261003090000_f23_ovr_processing.sql#L1), [20261009010000_f36_unclaimed_reprocessing.sql:2](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L2), [20261010020000_f38_treasury_reconciliation.sql:15](../../../db/migrations/20261010020000_f38_treasury_reconciliation.sql#L15), [20261022070000_f52_individual_settlement.sql:9](../../../db/migrations/20261022070000_f52_individual_settlement.sql#L9)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_payment_individual_owner [1]; UNIQUE uq_payment_payroll_owner [1] | — | ascii_bin |
| `batch_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payment_records_ibfk_1 [1]; FOREIGN KEY payment_records_ibfk_2 [1]; UNIQUE uq_payment_batch_revision [1]; UNIQUE uq_payment_batch_scholarship [1]; UNIQUE uq_payment_payroll_owner [2] | payment_records_ibfk_1: ovr_finalizations (batch_id) / RESTRICT / RESTRICT; payment_records_ibfk_2: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `batch_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY payment_records_ibfk_2 [2]; UNIQUE uq_payment_batch_revision [2] | payment_records_ibfk_2: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_payment_cycle_semester [1]; FOREIGN KEY payment_records_ibfk_3 [1] | fk_payment_cycle_semester: payout_cycles (id, semester_id) / RESTRICT / RESTRICT; payment_records_ibfk_3: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_payment_annual_identity [1]; FOREIGN KEY payment_records_ibfk_4 [1]; UNIQUE uq_payment_batch_scholarship [2] | fk_payment_annual_identity: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT; payment_records_ibfk_4: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `outcome` | `varchar(20)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `amount` | `decimal(12,2)` | NO | NULL / no explicit default | — | — | — |
| `effective_on` | `date` | YES | `NULL` | — | — | — |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `remarks` | `varchar(1000)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payment_records_ibfk_5 [1] | payment_records_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `unpaid_reason` | `enum('did_not_claim','withheld','review')` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `source_kind` | `enum('payroll','individual')` | NO | `'payroll'` | — | — | utf8mb4_unicode_ci |
| `individual_transaction_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_payment_individual_event [1]; FOREIGN KEY fk_payment_individual_owner [1]; UNIQUE uq_payment_individual_owner [2]; UNIQUE uq_payment_individual_transaction [1] | fk_payment_individual_event: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT; fk_payment_individual_owner: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `individual_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY fk_payment_individual_event [2] | fk_payment_individual_event: individual_payment_events (transaction_id, revision) / RESTRICT / RESTRICT | — |
| `entitlement_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_payment_entitlement_identity [1]; FOREIGN KEY fk_payment_individual_owner [2] | fk_payment_entitlement_identity: semester_entitlements (id, scholar_id, semester_id) / RESTRICT / RESTRICT; fk_payment_individual_owner: individual_payment_transactions (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_payment_annual_identity [2]; FOREIGN KEY fk_payment_entitlement_identity [2] | fk_payment_annual_identity: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT; fk_payment_entitlement_identity: semester_entitlements (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_payment_cycle_semester [2]; FOREIGN KEY fk_payment_entitlement_identity [3] | fk_payment_cycle_semester: payout_cycles (id, semester_id) / RESTRICT / RESTRICT; fk_payment_entitlement_identity: semester_entitlements (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `release_evidence` | `longtext` | YES | `NULL` | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `fk_payment_annual_identity` | NO | `scholarship_id A, scholar_id A` | BTREE | — |
| `fk_payment_cycle_semester` | NO | `cycle_id A, semester_id A` | BTREE | — |
| `fk_payment_entitlement_identity` | NO | `entitlement_id A, scholar_id A, semester_id A` | BTREE | — |
| `fk_payment_individual_event` | NO | `individual_transaction_id A, individual_revision A` | BTREE | — |
| `fk_payment_individual_owner` | NO | `individual_transaction_id A, entitlement_id A` | BTREE | — |
| `ix_payment_cycle` | NO | `cycle_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_payment_batch_revision` | YES | `batch_id A, batch_revision A` | BTREE | — |
| `uq_payment_batch_scholarship` | YES | `batch_id A, scholarship_id A` | BTREE | — |
| `uq_payment_individual_owner` | YES | `id A, individual_transaction_id A` | BTREE | — |
| `uq_payment_individual_transaction` | YES | `individual_transaction_id A` | BTREE | — |
| `uq_payment_payroll_owner` | YES | `id A, batch_id A` | BTREE | — |

### CHECK constraints

- `ck_payment_source`: ``source_kind` = 'payroll' and `batch_id` is not null and `batch_revision` is not null and `individual_transaction_id` is null and `individual_revision` is null and `entitlement_id` is null and `scholar_id` is null and `semester_id` is null and `release_evidence` is null or `source_kind` = 'individual' and `batch_id` is null and `batch_revision` is null and `individual_transaction_id` is not null and `individual_revision` is not null and `individual_revision` &gt; 0 and `entitlement_id` is not null and `scholar_id` is not null and `semester_id` is not null and `outcome` = 'paid' and `amount` = 5000.00 and `unpaid_reason` is null and `effective_on` is not null and `release_evidence` is not null and json_type(`release_evidence`) = 'OBJECT' and json_value(`release_evidence`,'$.acknowledgedRelease') is not null and json_value(`release_evidence`,'$.acknowledgedRelease') = 1`
- `CONSTRAINT_1`: ``outcome` = 'paid' and `amount` &gt; 0 or `outcome` = 'not_paid' and `amount` = 0`
- `release_evidence`: `json_valid(`release_evidence`)`

<a id="payout-cycle-commands"></a>

## payout_cycle_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001140000_f18_payout_cycles.sql:40](../../../db/migrations/20261001140000_f18_payout_cycles.sql#L40)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_cycle_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payout_cycle_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="payout-cycle-versions"></a>

## payout_cycle_versions

Versioned payroll-cycle configuration, target date and workflow state.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001140000_f18_payout_cycles.sql:9](../../../db/migrations/20261001140000_f18_payout_cycles.sql#L9)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_payout_version_cycle [1] | — | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_cycle_versions_ibfk_1 [1]; UNIQUE uq_payout_revision [1]; UNIQUE uq_payout_version_cycle [2] | payout_cycle_versions_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_payout_revision [2] | — | — |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `target_date` | `date` | NO | NULL / no explicit default | — | — | — |
| `state` | `enum('draft','open','locked','closed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `action` | `enum('create','configure','open','lock','close')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_cycle_versions_ibfk_2 [1] | payout_cycle_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_payout_revision` | YES | `cycle_id A, version A` | BTREE | — |
| `uq_payout_version_cycle` | YES | `id A, cycle_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``version` &gt; 0`
- `CONSTRAINT_2`: ``action` in ('create','configure') and `state` = 'draft' or `action` = 'open' and `state` = 'open' or `action` = 'lock' and `state` = 'locked' or `action` = 'close' and `state` = 'closed'`

<a id="payout-cycles"></a>

## payout_cycles

Payroll cycle identity and semester association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001140000_f18_payout_cycles.sql:1](../../../db/migrations/20261001140000_f18_payout_cycles.sql#L1), [20261022070000_f52_individual_settlement.sql:5](../../../db/migrations/20261022070000_f52_individual_settlement.sql#L5)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_cycle_payment_semester [1]; UNIQUE uq_payout_period [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE code [1] | — | utf8mb4_unicode_ci |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_cycles_ibfk_1 [1]; UNIQUE uq_cycle_payment_semester [2]; UNIQUE uq_payout_period [2] | payout_cycles_ibfk_1: semesters (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `code` | YES | `code A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_cycle_payment_semester` | YES | `id A, semester_id A` | BTREE | — |
| `uq_payout_period` | YES | `id A, semester_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payout-eligibility"></a>

## payout_eligibility

Versioned eligibility calculation, engine/source hash and assessment.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002090000_f19_payout_eligibility.sql:1](../../../db/migrations/20261002090000_f19_payout_eligibility.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_eligibility_ibfk_1 [1]; UNIQUE uq_eligibility_revision [1] | payout_eligibility_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_eligibility_ibfk_2 [1]; UNIQUE uq_eligibility_revision [2] | payout_eligibility_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_eligibility_revision [3] | — | — |
| `engine_version` | `varchar(40)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `eligible` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `assessment` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_eligibility_ibfk_3 [1] | payout_eligibility_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `calculated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_eligibility_revision` | YES | `cycle_id A, scholarship_id A, revision A` | BTREE | — |

### CHECK constraints

- `assessment`: `json_valid(`assessment`)`
- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``eligible` in (0,1)`

<a id="payout-eligibility-commands"></a>

## payout_eligibility_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261002090000_f19_payout_eligibility.sql:22](../../../db/migrations/20261002090000_f19_payout_eligibility.sql#L22)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_eligibility_commands_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payout_eligibility_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="payout-requirements"></a>

## payout_requirements

Cycle-version to requirement-definition-version mapping and waiver allowance.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001140000_f18_payout_cycles.sql:30](../../../db/migrations/20261001140000_f18_payout_cycles.sql#L30)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_requirements_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payout_requirements_ibfk_1: payout_cycle_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `definition_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payout_requirements_ibfk_2 [1]; PRIMARY KEY PRIMARY [2] | payout_requirements_ibfk_2: requirement_definition_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `allow_waiver` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `definition_version_id` | NO | `definition_version_id A` | BTREE | — |
| `PRIMARY` | YES | `cycle_version_id A, definition_version_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``allow_waiver` in (0,1)`

<a id="payroll-allocations"></a>

## payroll_allocations

Entitlement reservation on a Payroll batch and annual record, with approved entitlement event.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007040000_f36_payroll_workflow.sql:26](../../../db/migrations/20261007040000_f36_payroll_workflow.sql#L26)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `entitlement_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_allocations_ibfk_1 [1]; FOREIGN KEY payroll_allocations_ibfk_4 [2]; PRIMARY KEY PRIMARY [1] | payroll_allocations_ibfk_1: semester_entitlements (id) / RESTRICT / RESTRICT; payroll_allocations_ibfk_4: semester_entitlement_events (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_allocations_ibfk_2 [1]; UNIQUE uq_payroll_allocation [1] | payroll_allocations_ibfk_2: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_allocations_ibfk_3 [1]; UNIQUE uq_payroll_allocation [2] | payroll_allocations_ibfk_3: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `approved_event_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE approved_event_id [1]; FOREIGN KEY payroll_allocations_ibfk_4 [1] | payroll_allocations_ibfk_4: semester_entitlement_events (id, entitlement_id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_allocations_ibfk_5 [1] | payroll_allocations_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `approved_event_id` | YES | `approved_event_id A` | BTREE | — |
| `approved_event_id_2` | NO | `approved_event_id A, entitlement_id A` | BTREE | — |
| `PRIMARY` | YES | `entitlement_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_payroll_allocation` | YES | `batch_id A, scholarship_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-closure-members"></a>

## payroll_closure_members

Positioned closure member outcome and snapshot/hash.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022010000_f46_payroll_reconciliation.sql:32](../../../db/migrations/20261022010000_f46_payroll_reconciliation.sql#L32)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `closure_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_closure_members_ibfk_1 [1]; PRIMARY KEY PRIMARY [1]; UNIQUE uq_closure_payment [1]; UNIQUE uq_closure_scholar [1] | payroll_closure_members_ibfk_1: payroll_reconciliation_events (id) / RESTRICT / RESTRICT | ascii_bin |
| `position` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_closure_members_ibfk_2 [1]; UNIQUE uq_closure_scholar [2] | payroll_closure_members_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `payment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_closure_members_ibfk_3 [1]; UNIQUE uq_closure_payment [2] | payroll_closure_members_ibfk_3: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `outcome` | `enum('paid','unclaimed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `payment_id` | NO | `payment_id A` | BTREE | — |
| `PRIMARY` | YES | `closure_id A, position A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_closure_payment` | YES | `closure_id A, payment_id A` | BTREE | — |
| `uq_closure_scholar` | YES | `closure_id A, scholarship_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``position` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-cutoff-rule-versions"></a>

## payroll_cutoff_rule_versions

Versioned permitted cutoff-time rules and authority evidence; this dictionary contains no policy row values.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261027010000_f57_payroll_cutoff_policy.sql:2](../../../db/migrations/20261027010000_f57_payroll_cutoff_policy.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_cutoff_rule_versions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_cutoff_rule_versions_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `permitted_times` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `valid_from` | `date` | NO | NULL / no explicit default | — | — | — |
| `valid_through` | `date` | NO | NULL / no explicit default | — | — | — |
| `time_zone` | `varchar(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `boundary_rule` | `varchar(40)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `authority_reference` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_location` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `approved_by` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_cutoff_rule_versions_ibfk_2 [1] | payroll_cutoff_rule_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `approved_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `approved_by` | NO | `approved_by A` | BTREE | — |
| `PRIMARY` | YES | `cycle_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0 and `valid_from` &lt;= `valid_through``
- `CONSTRAINT_2`: `octet_length(`permitted_times`) &lt;= 2048 and json_valid(`permitted_times`) and json_type(`permitted_times`) = 'ARRAY' and json_length(`permitted_times`) between 1 and 48`
- `CONSTRAINT_3`: ``time_zone` = 'Asia/Manila' and `boundary_rule` = 'inclusive_microsecond_v1'`
- `CONSTRAINT_4`: `char_length(`authority_reference`) &gt;= 5 and char_length(`source_location`) &gt;= 5`

<a id="payroll-deferrals"></a>

## payroll_deferrals

Versioned payroll deferral source hash and reason.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007040000_f36_payroll_workflow.sql:10](../../../db/migrations/20261007040000_f36_payroll_workflow.sql#L10)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_deferrals_ibfk_1 [1]; UNIQUE uq_payroll_deferral [1] | payroll_deferrals_ibfk_1: payroll_submission_windows (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_deferrals_ibfk_2 [1]; UNIQUE uq_payroll_deferral [2] | payroll_deferrals_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_payroll_deferral [3] | — | — |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_deferrals_ibfk_3 [1] | payroll_deferrals_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_payroll_deferral` | YES | `batch_id A, scholarship_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0 and char_length(trim(`reason`)) &gt;= 5`

<a id="payroll-draft-deferrals"></a>

## payroll_draft_deferrals

Versioned draft deferral/restoration actions and reasons.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261009010000_f36_unclaimed_reprocessing.sql:21](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L21)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_draft_deferrals_ibfk_1 [1]; UNIQUE uq_draft_deferral [1] | payroll_draft_deferrals_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_draft_deferrals_ibfk_2 [1]; UNIQUE uq_draft_deferral [2] | payroll_draft_deferrals_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_draft_deferral [3] | — | — |
| `action` | `enum('defer','restore')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_draft_deferrals_ibfk_3 [1] | payroll_draft_deferrals_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_draft_deferral` | YES | `batch_id A, scholarship_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-historical-receipts"></a>

## payroll_historical_receipts

Versioned historical receipt review and evidence snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261010020000_f38_treasury_reconciliation.sql:29](../../../db/migrations/20261010020000_f38_treasury_reconciliation.sql#L29)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_historical_receipts_ibfk_1 [1] | payroll_historical_receipts_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_historical_receipts_ibfk_2 [1] | payroll_historical_receipts_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `state` | `enum('pending','approved','rejected')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_historical_receipts_ibfk_3 [1] | payroll_historical_receipts_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `batch_id` | NO | `batch_id A` | BTREE | — |
| `PRIMARY` | YES | `id A, version A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-legacy-conversions"></a>

## payroll_legacy_conversions

Source/destination Payroll legacy conversion snapshot and source hash.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261010040000_f38_legacy_conversion.sql:1](../../../db/migrations/20261010040000_f38_legacy_conversion.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `source_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_legacy_conversions_ibfk_1 [1]; UNIQUE source_batch_id [1] | payroll_legacy_conversions_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `destination_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_legacy_conversions_ibfk_2 [1] | payroll_legacy_conversions_ibfk_2: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_legacy_conversions_ibfk_3 [1] | payroll_legacy_conversions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `destination_batch_id` | NO | `destination_batch_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `source_batch_id` | YES | `source_batch_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-omission-events"></a>

## payroll_omission_events

Versioned omission decision, destination and entitlement authorization snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022040000_f49_omitted_scholars.sql:36](../../../db/migrations/20261022040000_f49_omitted_scholars.sql#L36), [20261022050000_f50_omission_approval_owner.sql:5](../../../db/migrations/20261022050000_f50_omission_approval_owner.sql#L5)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `omission_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omission_events_ibfk_1 [1]; PRIMARY KEY PRIMARY [1]; UNIQUE uq_omission_authorization [1] | payroll_omission_events_ibfk_1: payroll_omissions (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; UNIQUE uq_omission_authorization [2] | — | — |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_omission_authorized_owner [2]; FOREIGN KEY payroll_omission_events_ibfk_1 [2]; FOREIGN KEY payroll_omission_events_ibfk_3 [2] | fk_omission_authorized_owner: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT; payroll_omission_events_ibfk_1: payroll_omissions (id, scholar_semester_id) / RESTRICT / RESTRICT; payroll_omission_events_ibfk_3: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `action` | `enum('recorded','payroll_refreshed','requested','approved','rejected','prepared','cancel_requested','cancel_rejected','cancelled')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `state` | `enum('recorded','payroll','requested','approved','rejected','prepared','cancel_requested','cancelled')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `destination_batch_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_omission_events_ibfk_2 [1] | payroll_omission_events_ibfk_2: payroll_submission_windows (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `entitlement_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_omission_events_ibfk_3 [1] | payroll_omission_events_ibfk_3: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `authorized_entitlement_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_omission_authorized_owner [1]; FOREIGN KEY payroll_omission_events_ibfk_4 [1]; UNIQUE uq_omission_authorization [3] | fk_omission_authorized_owner: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT; payroll_omission_events_ibfk_4: semester_entitlements (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omission_events_ibfk_5 [1] | payroll_omission_events_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `entitlement_id` | NO | `entitlement_id A, scholar_semester_id A` | BTREE | — |
| `fk_omission_authorized_owner` | NO | `authorized_entitlement_id A, scholar_semester_id A` | BTREE | — |
| `ix_omission_destination` | NO | `destination_batch_id A, omission_id A` | BTREE | — |
| `omission_id` | NO | `omission_id A, scholar_semester_id A` | BTREE | — |
| `PRIMARY` | YES | `omission_id A, revision A` | BTREE | — |
| `uq_omission_authorization` | YES | `omission_id A, revision A, authorized_entitlement_id A` | BTREE | — |

### CHECK constraints

- `ck_omission_approval_nonnull`: ``action` &lt;&gt; 'approved' or `entitlement_id` is not null and `authorized_entitlement_id` is not null and `entitlement_id` = `authorized_entitlement_id``
- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``action` = 'approved' and `authorized_entitlement_id` is not null and `authorized_entitlement_id` = `entitlement_id` or `action` &lt;&gt; 'approved' and `authorized_entitlement_id` is null`
- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-omissions"></a>

## payroll_omissions

Scholar/semester omission identity and historical source-batch/annual context.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022040000_f49_omitted_scholars.sql:16](../../../db/migrations/20261022040000_f49_omitted_scholars.sql#L16)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_omission_origin [1]; UNIQUE uq_omission_owner [1] | — | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_1 [1] | payroll_omissions_ibfk_1: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_1 [2]; FOREIGN KEY payroll_omissions_ibfk_2 [2]; FOREIGN KEY payroll_omissions_ibfk_3 [1]; UNIQUE uq_omission_identity [1] | payroll_omissions_ibfk_1: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT; payroll_omissions_ibfk_2: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT; payroll_omissions_ibfk_3: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_2 [3]; FOREIGN KEY payroll_omissions_ibfk_4 [1]; UNIQUE uq_omission_identity [2] | payroll_omissions_ibfk_2: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT; payroll_omissions_ibfk_4: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_5 [1]; UNIQUE uq_omission_origin [2] | payroll_omissions_ibfk_5: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_2 [1]; UNIQUE uq_omission_owner [2] | payroll_omissions_ibfk_2: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_omissions_ibfk_6 [1] | payroll_omissions_ibfk_6: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A, scholar_id A` | BTREE | — |
| `scholar_semester_id` | NO | `scholar_semester_id A, scholar_id A, semester_id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `source_batch_id` | NO | `source_batch_id A` | BTREE | — |
| `uq_omission_identity` | YES | `scholar_id A, semester_id A` | BTREE | — |
| `uq_omission_origin` | YES | `id A, source_batch_id A` | BTREE | — |
| `uq_omission_owner` | YES | `id A, scholar_semester_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-preparation-versions"></a>

## payroll_preparation_versions

Versioned cycle preparation state and reason.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022040000_f49_omitted_scholars.sql:2](../../../db/migrations/20261022040000_f49_omitted_scholars.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_preparation_versions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_preparation_versions_ibfk_1: payout_cycles (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `state` | `enum('open','closed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_preparation_versions_ibfk_2 [1] | payroll_preparation_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `cycle_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`

<a id="payroll-reconciliation-events"></a>

## payroll_reconciliation_events

Versioned Payroll reconciliation/correction/closure evidence and snapshots.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261022010000_f46_payroll_reconciliation.sql:2](../../../db/migrations/20261022010000_f46_payroll_reconciliation.sql#L2), [20261022020000_f47_single_closure_snapshot.sql:3](../../../db/migrations/20261022020000_f47_single_closure_snapshot.sql#L3)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reconciliation_events_ibfk_1 [1]; UNIQUE uq_reconciliation_revision [1] | payroll_reconciliation_events_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_reconciliation_revision [2] | — | — |
| `batch_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY payroll_reconciliation_events_ibfk_1 [2] | payroll_reconciliation_events_ibfk_1: ovr_batch_events (batch_id, revision) / RESTRICT / RESTRICT | — |
| `kind` | `enum('verified','reported','dismissed','corrected','closed')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `case_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_reconciliation_events_ibfk_2 [1]; UNIQUE uq_reconciliation_case [1] | payroll_reconciliation_events_ibfk_2: payroll_reconciliation_events (id) / RESTRICT / RESTRICT | ascii_bin |
| `case_version` | `tinyint(3) unsigned` | YES | `NULL` | UNIQUE uq_reconciliation_case [2] | — | — |
| `scholarship_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_reconciliation_events_ibfk_3 [1] | payroll_reconciliation_events_ibfk_3: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `payment_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_reconciliation_events_ibfk_4 [1] | payroll_reconciliation_events_ibfk_4: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reconciliation_events_ibfk_5 [1] | payroll_reconciliation_events_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `original_closure_batch` | `char(36)` | YES | `NULL` | UNIQUE uq_payroll_original_closure [1] | — | VIRTUAL GENERATED; case when `kind` = 'closed' then `batch_id` else NULL end; ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `batch_id` | NO | `batch_id A, batch_revision A` | BTREE | — |
| `ix_reconciliation_kind` | NO | `batch_id A, kind A, revision A` | BTREE | — |
| `payment_id` | NO | `payment_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_payroll_original_closure` | YES | `original_closure_batch A` | BTREE | — |
| `uq_reconciliation_case` | YES | `case_id A, case_version A` | BTREE | — |
| `uq_reconciliation_revision` | YES | `batch_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``kind` = 'reported' and `case_id` = `id` and `case_version` = 1 and `scholarship_id` is not null or `kind` in ('dismissed','corrected') and `case_id` is not null and `case_version` = 2 and `scholarship_id` is not null or `kind` in ('verified','closed') and `case_id` is null and `case_version` is null and `scholarship_id` is null and `payment_id` is null`
- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-reprocessing"></a>

## payroll_reprocessing

Original unpaid payment reprocessing identity with root/source batch and entitlement snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261009010000_f36_unclaimed_reprocessing.sql:36](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L36)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `payment_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE payment_id [1]; FOREIGN KEY payroll_reprocessing_ibfk_1 [1] | payroll_reprocessing_ibfk_1: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `root_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_ibfk_2 [1] | payroll_reprocessing_ibfk_2: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `source_batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_ibfk_3 [1] | payroll_reprocessing_ibfk_3: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_ibfk_4 [1] | payroll_reprocessing_ibfk_4: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_ibfk_5 [1] | payroll_reprocessing_ibfk_5: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `entitlement_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_reprocessing_ibfk_6 [1] | payroll_reprocessing_ibfk_6: semester_entitlements (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_ibfk_7 [1] | payroll_reprocessing_ibfk_7: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `entitlement_id` | NO | `entitlement_id A` | BTREE | — |
| `payment_id` | YES | `payment_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `root_batch_id` | NO | `root_batch_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `source_batch_id` | NO | `source_batch_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="payroll-reprocessing-attempts"></a>

## payroll_reprocessing_attempts

Association of a reprocessing case with a destination batch and annual record.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261009010000_f36_unclaimed_reprocessing.sql:70](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L70)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `reprocessing_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_attempts_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_reprocessing_attempts_ibfk_1: payroll_reprocessing (id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_attempts_ibfk_2 [1]; UNIQUE uq_reprocessing_attempt [1] | payroll_reprocessing_attempts_ibfk_2: ovr_finalizations (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_attempts_ibfk_3 [1]; UNIQUE uq_reprocessing_attempt [2] | payroll_reprocessing_attempts_ibfk_3: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_attempts_ibfk_4 [1] | payroll_reprocessing_attempts_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `reprocessing_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |
| `uq_reprocessing_attempt` | YES | `batch_id A, scholarship_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-reprocessing-events"></a>

## payroll_reprocessing_events

Versioned reprocessing destination/reason evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261009010000_f36_unclaimed_reprocessing.sql:56](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L56)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `reprocessing_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_events_ibfk_1 [1]; UNIQUE uq_reprocessing_event [1] | payroll_reprocessing_events_ibfk_1: payroll_reprocessing (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_reprocessing_event [2] | — | — |
| `destination_batch_id` | `char(36)` | YES | `NULL` | FOREIGN KEY payroll_reprocessing_events_ibfk_2 [1] | payroll_reprocessing_events_ibfk_2: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_reprocessing_events_ibfk_3 [1] | payroll_reprocessing_events_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `destination_batch_id` | NO | `destination_batch_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_reprocessing_event` | YES | `reprocessing_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-submission-window-versions"></a>

## payroll_submission_window_versions

Versioned window dates, legacy/timed cutoff policy, local time/timezone, UTC boundary and rule binding.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007010000_f36_payroll_submission_windows.sql:48](../../../db/migrations/20261007010000_f36_payroll_submission_windows.sql#L48), [20261027010000_f57_payroll_cutoff_policy.sql:30](../../../db/migrations/20261027010000_f57_payroll_cutoff_policy.sql#L30), [20261027010000_f57_payroll_cutoff_policy.sql:38](../../../db/migrations/20261027010000_f57_payroll_cutoff_policy.sql#L38)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_window_versions_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_submission_window_versions_ibfk_1: payroll_submission_windows (batch_id, cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_window_cutoff_rule [1]; FOREIGN KEY payroll_submission_window_versions_ibfk_1 [2]; FOREIGN KEY payroll_submission_window_versions_ibfk_2 [1] | fk_window_cutoff_rule: payroll_cutoff_rule_versions (cycle_id, revision) / RESTRICT / RESTRICT; payroll_submission_window_versions_ibfk_1: payroll_submission_windows (batch_id, cycle_id) / RESTRICT / RESTRICT; payroll_submission_window_versions_ibfk_2: semester_submission_versions (cycle_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `semester_deadline_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_window_versions_ibfk_2 [2] | payroll_submission_window_versions_ibfk_2: semester_submission_versions (cycle_id, revision) / RESTRICT / RESTRICT | — |
| `opens_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `cutoff_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `previous_cutoff_on` | `date` | YES | `NULL` | — | — | — |
| `action` | `enum('open','extend')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_window_versions_ibfk_3 [1] | payroll_submission_window_versions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `cutoff_policy` | `varchar(32)` | NO | `'whole_day_v1'` | — | — | ascii_bin |
| `cutoff_local_time` | `time(6)` | YES | `NULL` | — | — | — |
| `cutoff_time_zone` | `varchar(64)` | NO | `'Asia/Manila'` | — | — | ascii_bin |
| `cutoff_at_utc` | `datetime(6)` | YES | `NULL` | — | — | — |
| `cutoff_rule_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY fk_window_cutoff_rule [2] | fk_window_cutoff_rule: payroll_cutoff_rule_versions (cycle_id, revision) / RESTRICT / RESTRICT | — |
| `cutoff_rule_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `batch_id` | NO | `batch_id A, cycle_id A` | BTREE | — |
| `cycle_id` | NO | `cycle_id A, semester_deadline_revision A` | BTREE | — |
| `fk_window_cutoff_rule` | NO | `cycle_id A, cutoff_rule_revision A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A, revision A` | BTREE | — |

### CHECK constraints

- `ck_window_cutoff_policy`: ``cutoff_time_zone` = 'Asia/Manila' and (`cutoff_policy` = 'whole_day_v1' and `cutoff_local_time` is null and `cutoff_at_utc` is null and `cutoff_rule_revision` is null and `cutoff_rule_hash` is null or `cutoff_policy` in ('manila_1700_v1','manila_time_v1') and `cutoff_local_time` is not null and `cutoff_local_time` &gt;= '00:00:00' and `cutoff_local_time` &lt; '24:00:00' and second(`cutoff_local_time`) = 0 and microsecond(`cutoff_local_time`) = 0 and (`cutoff_policy` &lt;&gt; 'manila_1700_v1' or `cutoff_local_time` = '17:00:00') and `cutoff_at_utc` is not null and `cutoff_at_utc` = timestamp(`cutoff_on`,`cutoff_local_time`) - interval 8 hour and `cutoff_rule_revision` is not null and `cutoff_rule_hash` is not null)`
- `CONSTRAINT_1`: ``revision` &gt; 0 and `cutoff_on` &gt;= `opens_on``
- `CONSTRAINT_2`: ``action` = 'open' and `revision` = 1 and `previous_cutoff_on` is null or `action` = 'extend' and `revision` &gt; 1 and `cutoff_on` &gt; `previous_cutoff_on``

<a id="payroll-submission-windows"></a>

## payroll_submission_windows

Batch-to-cycle numbered submission-window identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007010000_f36_payroll_submission_windows.sql:34](../../../db/migrations/20261007010000_f36_payroll_submission_windows.sql#L34)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_windows_ibfk_1 [1]; PRIMARY KEY PRIMARY [1]; UNIQUE uq_window_cycle [1] | payroll_submission_windows_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_windows_ibfk_2 [1]; UNIQUE uq_window_cycle [2]; UNIQUE uq_window_sequence [1] | payroll_submission_windows_ibfk_2: regular_payout_periods (cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_number` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_window_sequence [2] | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_submission_windows_ibfk_3 [1] | payroll_submission_windows_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A` | BTREE | — |
| `uq_window_cycle` | YES | `batch_id A, cycle_id A` | BTREE | — |
| `uq_window_sequence` | YES | `cycle_id A, batch_number A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``batch_number` &gt; 0`

<a id="payroll-treasury-confirmations"></a>

## payroll_treasury_confirmations

Payment/batch confirmation against Treasury evidence revision and optional historical request.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261010020000_f38_treasury_reconciliation.sql:17](../../../db/migrations/20261010020000_f38_treasury_reconciliation.sql#L17)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `payment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_confirmations_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_treasury_confirmations_ibfk_1: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_confirmations_ibfk_2 [1] | payroll_treasury_confirmations_ibfk_2: payroll_treasury_evidence (batch_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `evidence_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_confirmations_ibfk_2 [2] | payroll_treasury_confirmations_ibfk_2: payroll_treasury_evidence (batch_id, revision) / RESTRICT / RESTRICT | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_confirmations_ibfk_3 [1] | payroll_treasury_confirmations_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `confirmed_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `historical_request_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `batch_id` | NO | `batch_id A, evidence_revision A` | BTREE | — |
| `PRIMARY` | YES | `payment_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-treasury-evidence"></a>

## payroll_treasury_evidence

Versioned Payroll reference and office receipt evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261010020000_f38_treasury_reconciliation.sql:2](../../../db/migrations/20261010020000_f38_treasury_reconciliation.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_evidence_ibfk_1 [1]; PRIMARY KEY PRIMARY [1] | payroll_treasury_evidence_ibfk_1: ovr_batches (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `payroll_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `office_received_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_treasury_evidence_ibfk_2 [1] | payroll_treasury_evidence_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `batch_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="payroll-unpaid-classifications"></a>

## payroll_unpaid_classifications

Versioned unpaid-reason classification for a payment.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261009010000_f36_unclaimed_reprocessing.sql:8](../../../db/migrations/20261009010000_f36_unclaimed_reprocessing.sql#L8)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `payment_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_unpaid_classifications_ibfk_1 [1]; UNIQUE uq_unpaid_classification [1] | payroll_unpaid_classifications_ibfk_1: payment_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_unpaid_classification [2] | — | — |
| `unpaid_reason` | `enum('did_not_claim','withheld','review')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY payroll_unpaid_classifications_ibfk_2 [1] | payroll_unpaid_classifications_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_unpaid_classification` | YES | `payment_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="permissions"></a>

## permissions

Permission codes, labels and categories.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929020000_f02_permissions.sql:8](../../../db/migrations/20260929020000_f02_permissions.sql#L8)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `code` | `varchar(80)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `label` | `varchar(120)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `category` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="placement-policy-reviews"></a>

## placement_policy_reviews

Placement review source/proposal hashes and saved snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261010030000_f38_placement_policy_reviews.sql:2](../../../db/migrations/20261010030000_f38_placement_policy_reviews.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `academic_record_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY placement_policy_reviews_ibfk_1 [1] | placement_policy_reviews_ibfk_1: academic_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `proposal_hash` | `char(64)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY placement_policy_reviews_ibfk_2 [1] | placement_policy_reviews_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `placement_policy_lookup` | NO | `academic_record_id A, proposal_hash A, source_hash A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="prior-batch-approvals"></a>

## prior_batch_approvals

Prior-batch import/semester attestation with authority, revision and approval/deadline evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020020000_f45_prior_batch_approval.sql:2](../../../db/migrations/20261020020000_f45_prior_batch_approval.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `import_job_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_approvals_ibfk_1 [1]; UNIQUE uq_prior_batch_revision [1] | prior_batch_approvals_ibfk_1: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_approvals_ibfk_2 [1]; UNIQUE uq_prior_batch_revision [2] | prior_batch_approvals_ibfk_2: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_prior_batch_revision [3] | — | — |
| `authority_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_approvals_ibfk_3 [1] | prior_batch_approvals_ibfk_3: workflow_authority_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `approval_on` | `date` | YES | `NULL` | — | — | — |
| `deadline_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_location` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_approvals_ibfk_4 [1] | prior_batch_approvals_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `authority_version_id` | NO | `authority_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_prior_batch_revision` | YES | `import_job_id A, semester_id A, revision A` | BTREE | — |

### CHECK constraints

None declared.

<a id="prior-batch-documents"></a>

## prior_batch_documents

Document decision version and retained-individual basis under a prior approval.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020020000_f45_prior_batch_approval.sql:34](../../../db/migrations/20261020020000_f45_prior_batch_approval.sql#L34)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `approval_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY prior_batch_documents_ibfk_1 [1] | prior_batch_documents_ibfk_1: prior_batch_members (approval_id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_documents_ibfk_1 [2] | prior_batch_documents_ibfk_1: prior_batch_members (approval_id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; FOREIGN KEY prior_batch_documents_ibfk_2 [1] | prior_batch_documents_ibfk_2: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `decision_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `retained_individual` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `approval_id` | NO | `approval_id A, scholar_semester_id A` | BTREE | — |
| `instance_id` | NO | `instance_id A` | BTREE | — |
| `PRIMARY` | YES | `approval_id A, instance_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="prior-batch-members"></a>

## prior_batch_members

Member source hash/snapshot and review-event linkage under a prior approval.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020020000_f45_prior_batch_approval.sql:22](../../../db/migrations/20261020020000_f45_prior_batch_approval.sql#L22)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `approval_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY prior_batch_members_ibfk_1 [1] | prior_batch_members_ibfk_1: prior_batch_approvals (id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; FOREIGN KEY prior_batch_members_ibfk_2 [1]; FOREIGN KEY prior_batch_members_ibfk_3 [2] | prior_batch_members_ibfk_2: scholar_semesters (id) / RESTRICT / RESTRICT; prior_batch_members_ibfk_3: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `review_event_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_members_ibfk_3 [1] | prior_batch_members_ibfk_3: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `approval_id A, scholar_semester_id A` | BTREE | — |
| `review_event_id` | NO | `review_event_id A, scholar_semester_id A` | BTREE | — |
| `scholar_semester_id` | NO | `scholar_semester_id A` | BTREE | — |

### CHECK constraints

- `snapshot`: `json_valid(`snapshot`)`

<a id="prior-batch-waiver-corrections"></a>

## prior_batch_waiver_corrections

Prior approval waiver-correction linkage.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261020020000_f45_prior_batch_approval.sql:45](../../../db/migrations/20261020020000_f45_prior_batch_approval.sql#L45)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `approval_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY prior_batch_waiver_corrections_ibfk_1 [1] | prior_batch_waiver_corrections_ibfk_1: prior_batch_documents (approval_id, instance_id) / RESTRICT / RESTRICT | ascii_bin |
| `waiver_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; FOREIGN KEY prior_batch_waiver_corrections_ibfk_2 [1]; UNIQUE uq_prior_waiver_correction [1] | prior_batch_waiver_corrections_ibfk_2: requirement_waivers (id) / RESTRICT / RESTRICT | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY prior_batch_waiver_corrections_ibfk_1 [2] | prior_batch_waiver_corrections_ibfk_1: prior_batch_documents (approval_id, instance_id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `approval_id` | NO | `approval_id A, instance_id A` | BTREE | — |
| `PRIMARY` | YES | `approval_id A, waiver_id A` | BTREE | — |
| `uq_prior_waiver_correction` | YES | `waiver_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="program-duration-events"></a>

## program_duration_events

Versioned program-duration scope, dates, curriculum/cohort, authority and assessment snapshot.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024020000_f54_graduation_monitoring.sql:8](../../../db/migrations/20261024020000_f54_graduation_monitoring.sql#L8)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `reference_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY program_duration_events_ibfk_1 [1]; FOREIGN KEY program_duration_events_ibfk_2 [1]; UNIQUE uq_duration_command [3] | program_duration_events_ibfk_1: program_duration_references (id) / RESTRICT / RESTRICT; program_duration_events_ibfk_2: program_duration_events (reference_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `previous_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY program_duration_events_ibfk_2 [2] | program_duration_events_ibfk_2: program_duration_events (reference_id, revision) / RESTRICT / RESTRICT | — |
| `before_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `action` | `enum('submit','confirm','reject','withdraw','propose_correction','dispute','retire')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `state` | `enum('proposed','confirmed','rejected','withdrawn','disputed','retired')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `scope_kind` | `enum('all','curriculum','cohort','curriculum_cohort')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `curriculum_code` | `varchar(80)` | YES | `NULL` | — | — | utf8mb4_bin |
| `cohort_code` | `varchar(80)` | YES | `NULL` | — | — | utf8mb4_bin |
| `applies_from_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_events_ibfk_3 [1] | program_duration_events_ibfk_3: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `applies_through_year_id` | `char(36)` | YES | `NULL` | FOREIGN KEY program_duration_events_ibfk_4 [1] | program_duration_events_ibfk_4: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `review_academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_events_ibfk_5 [1] | program_duration_events_ibfk_5: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `duration_years` | `decimal(4,2)` | YES | `NULL` | — | — | — |
| `final_year_level` | `smallint(5) unsigned` | YES | `NULL` | — | — | — |
| `level_basis` | `enum('annual_year_number','no_annual_mapping')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_type` | `enum('official_curriculum','official_program_notice','official_school_confirmation')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_issuer` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_location` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `source_issued_on` | `date` | YES | `NULL` | — | — | — |
| `scope_dates_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_events_ibfk_6 [1]; UNIQUE uq_duration_command [1] | program_duration_events_ibfk_6: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_duration_command [2] | — | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `applies_from_year_id` | NO | `applies_from_year_id A` | BTREE | — |
| `applies_through_year_id` | NO | `applies_through_year_id A` | BTREE | — |
| `ix_duration_state` | NO | `state A, reference_id A, revision A` | BTREE | — |
| `PRIMARY` | YES | `reference_id A, revision A` | BTREE | — |
| `reference_id` | NO | `reference_id A, previous_revision A` | BTREE | — |
| `review_academic_year_id` | NO | `review_academic_year_id A` | BTREE | — |
| `uq_duration_command` | YES | `actor_id A, command_id A, reference_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt;= 1 and (`revision` = 1 and `previous_revision` is null and `before_hash` is null and `action` = 'submit' or `revision` &gt; 1 and `previous_revision` is not null and `before_hash` is not null and `previous_revision` = `revision` - 1 and `before_hash` regexp '^[0-9a-f]{64}$' and `action` &lt;&gt; 'submit')`
- `CONSTRAINT_2`: ``snapshot_hash` regexp '^[0-9a-f]{64}$' and `scope_dates_hash` regexp '^[0-9a-f]{64}$'`
- `CONSTRAINT_3`: ``scope_kind` = 'all' and `curriculum_code` is null and `cohort_code` is null or `scope_kind` = 'curriculum' and `curriculum_code` is not null and `cohort_code` is null or `scope_kind` = 'cohort' and `curriculum_code` is null and `cohort_code` is not null or `scope_kind` = 'curriculum_cohort' and `curriculum_code` is not null and `cohort_code` is not null`
- `CONSTRAINT_4`: `(`curriculum_code` is null or char_length(trim(`curriculum_code`)) &gt;= 1) and (`cohort_code` is null or char_length(trim(`cohort_code`)) &gt;= 1)`
- `CONSTRAINT_5`: ``duration_years` is null or `duration_years` &gt; 0`
- `CONSTRAINT_6`: ``state` &lt;&gt; 'confirmed' or `duration_years` is not null`
- `CONSTRAINT_7`: ``level_basis` = 'no_annual_mapping' and `final_year_level` is null or `level_basis` = 'annual_year_number' and `final_year_level` is not null and `final_year_level` between 1 and 100`
- `CONSTRAINT_8`: `char_length(trim(`reason`)) &gt;= 5 and char_length(trim(`source_reference`)) &gt;= 3 and char_length(trim(`source_issuer`)) &gt;= 2`
- `snapshot`: `json_valid(`snapshot`)`

<a id="program-duration-references"></a>

## program_duration_references

School/course program-duration reference identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024020000_f54_graduation_monitoring.sql:2](../../../db/migrations/20261024020000_f54_graduation_monitoring.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `school_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_references_ibfk_1 [1] | program_duration_references_ibfk_1: schools (id) / RESTRICT / RESTRICT | ascii_bin |
| `course_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_references_ibfk_2 [1] | program_duration_references_ibfk_2: courses (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_by` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY program_duration_references_ibfk_3 [1] | program_duration_references_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `course_id` | NO | `course_id A` | BTREE | — |
| `created_by` | NO | `created_by A` | BTREE | — |
| `ix_duration_owner` | NO | `school_id A, course_id A, id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="qualification-commands"></a>

## qualification_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930060000_f06_qualification.sql:42](../../../db/migrations/20260930060000_f06_qualification.sql#L42)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY qualification_commands_ibfk_1 [1] | qualification_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY qualification_commands_ibfk_2 [1] | qualification_commands_ibfk_2: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `resulting_status` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, request_id A` | BTREE | — |
| `scholarship_id` | NO | `scholarship_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="qualification-events"></a>

## qualification_events

Recorded qualification transition with before/after status and resulting version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930060000_f06_qualification.sql:17](../../../db/migrations/20260930060000_f06_qualification.sql#L17), [20261007060000_f36_admission_validation.sql:2](../../../db/migrations/20261007060000_f36_admission_validation.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY qualification_events_ibfk_1 [1]; UNIQUE uq_qualification_version [1] | qualification_events_ibfk_1: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `action` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `from_status` | `varchar(20)` | YES | `NULL` | — | — | ascii_bin |
| `to_status` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_qualification_version [2] | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY qualification_events_ibfk_2 [1] | qualification_events_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_qualification_version` | YES | `scholarship_id A, resulting_version A` | BTREE | — |

### CHECK constraints

- `ck_qualification_edge`: ``action` = 'create' and `from_status` is null and `to_status` = 'applicant' and `resulting_version` = 1 or `action` = 'exam-passed' and `from_status` is not null and `from_status` = 'applicant' and `to_status` = 'exam_passed' and `resulting_version` &gt; 1 or `action` = 'qualify' and `from_status` is not null and `from_status` = 'exam_passed' and `to_status` = 'qualified' and `resulting_version` &gt; 1 or `action` = 'validate' and `from_status` is not null and `from_status` in ('applicant','exam_passed') and `to_status` = 'qualified' and `resulting_version` &gt; 1 or `action` = 'select' and `from_status` is not null and `from_status` = 'qualified' and `to_status` = 'selected' and `resulting_version` &gt; 1 or `action` = 'not-select' and `from_status` is not null and `from_status` in ('applicant','exam_passed','qualified') and `to_status` = 'not_selected' and `resulting_version` &gt; 1`

<a id="regular-payout-periods"></a>

## regular_payout_periods

Recorded cycle/year/semester term mapping and source versions.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007010000_f36_payroll_submission_windows.sql:2](../../../db/migrations/20261007010000_f36_payroll_submission_windows.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY regular_payout_periods_ibfk_1 [1] | regular_payout_periods_ibfk_1: payout_cycles (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY regular_payout_periods_ibfk_1 [2]; UNIQUE semester_id [1] | regular_payout_periods_ibfk_1: payout_cycles (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY regular_payout_periods_ibfk_2 [1]; UNIQUE uq_regular_year_term [1] | regular_payout_periods_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `term_number` | `tinyint(3) unsigned` | NO | NULL / no explicit default | UNIQUE uq_regular_year_term [2] | — | — |
| `semester_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `year_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY regular_payout_periods_ibfk_3 [1] | regular_payout_periods_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `cycle_id` | NO | `cycle_id A, semester_id A` | BTREE | — |
| `PRIMARY` | YES | `cycle_id A` | BTREE | — |
| `semester_id` | YES | `semester_id A` | BTREE | — |
| `uq_regular_year_term` | YES | `academic_year_id A, term_number A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``term_number` in (1,2)`

<a id="requirement-checklists"></a>

## requirement_checklists

Annual/semester requirement checklist and its saved period/payout context.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001100000_f14_requirement_instances.sql:1](../../../db/migrations/20261001100000_f14_requirement_instances.sql#L1), [20261001140000_f18_payout_cycles.sql:49](../../../db/migrations/20261001140000_f18_payout_cycles.sql#L49), [20261006030000_f36_semester_checklist_owner.sql:5](../../../db/migrations/20261006030000_f36_semester_checklist_owner.sql#L5)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholarship_record_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_checklists_ibfk_1 [1]; UNIQUE uq_requirement_context [1] | requirement_checklists_ibfk_1: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_requirement_semester_owner [2]; FOREIGN KEY requirement_checklists_ibfk_2 [1]; FOREIGN KEY requirement_checklists_ibfk_4 [2] | fk_requirement_semester_owner: scholar_semesters (id, semester_id) / RESTRICT / RESTRICT; requirement_checklists_ibfk_2: semesters (id) / RESTRICT / RESTRICT; requirement_checklists_ibfk_4: payout_cycles (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `policy_date` | `date` | NO | NULL / no explicit default | — | — | — |
| `year_code` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `year_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `semester_code` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `semester_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `semester_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_checklists_ibfk_3 [1] | requirement_checklists_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `payout_cycle_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_checklists_ibfk_4 [1]; FOREIGN KEY requirement_checklists_ibfk_5 [2] | requirement_checklists_ibfk_4: payout_cycles (id, semester_id) / RESTRICT / RESTRICT; requirement_checklists_ibfk_5: payout_cycle_versions (id, cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `payout_version_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_checklists_ibfk_5 [1] | requirement_checklists_ibfk_5: payout_cycle_versions (id, cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `context_key` | `varchar(40)` | YES | `NULL` | UNIQUE uq_requirement_context [2]; UNIQUE uq_requirement_semester_owner [2] | — | STORED GENERATED; if(`payout_cycle_id` is null,concat('S:',`semester_id`),concat('P:',`payout_cycle_id`)); ascii_bin |
| `scholar_semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_requirement_semester_owner [1]; UNIQUE uq_requirement_semester_owner [1] | fk_requirement_semester_owner: scholar_semesters (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `fk_requirement_semester_owner` | NO | `scholar_semester_id A, semester_id A` | BTREE | — |
| `ix_requirement_annual` | NO | `scholarship_record_id A` | BTREE | — |
| `payout_cycle_id` | NO | `payout_cycle_id A, semester_id A` | BTREE | — |
| `payout_version_id` | NO | `payout_version_id A, payout_cycle_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_requirement_context` | YES | `scholarship_record_id A, context_key A` | BTREE | — |
| `uq_requirement_semester_owner` | YES | `scholar_semester_id A, context_key A` | BTREE | — |

### CHECK constraints

- `ck_requirement_one_owner`: ``scholarship_record_id` is not null and `scholar_semester_id` is null or `scholarship_record_id` is null and `scholar_semester_id` is not null`
- `ck_requirement_semester_no_payout`: ``scholar_semester_id` is null or `payout_cycle_id` is null`
- `CONSTRAINT_1`: ``semester_version` &gt; 0`
- `CONSTRAINT_2`: ``payout_cycle_id` is null and `payout_version_id` is null or `payout_cycle_id` is not null and `payout_version_id` is not null`

<a id="requirement-coverage"></a>

## requirement_coverage

Versioned COR/COG covered-period and admission-basis association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:184](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L184)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_coverage_ibfk_1 [1]; UNIQUE uq_requirement_coverage [1] | requirement_coverage_ibfk_1: scholar_semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `requirement_instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_coverage_ibfk_2 [1]; UNIQUE uq_requirement_coverage [2] | requirement_coverage_ibfk_2: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_requirement_coverage [3] | — | — |
| `document_kind` | `enum('cor','cog','admission_grades','other')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `coverage_semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_coverage_ibfk_3 [1] | requirement_coverage_ibfk_3: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `admission_basis` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_coverage_ibfk_4 [1] | requirement_coverage_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `coverage_semester_id` | NO | `coverage_semester_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `requirement_instance_id` | NO | `requirement_instance_id A` | BTREE | — |
| `uq_requirement_coverage` | YES | `scholar_semester_id A, requirement_instance_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``document_kind` in ('cor','cog') and `coverage_semester_id` is not null and `admission_basis` is null or `document_kind` = 'admission_grades' and `coverage_semester_id` is null and `admission_basis` is not null and char_length(trim(`admission_basis`)) &gt; 0 or `document_kind` = 'other'`

<a id="requirement-definition-commands"></a>

## requirement_definition_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001090000_f13_requirement_definitions.sql:36](../../../db/migrations/20261001090000_f13_requirement_definitions.sql#L36)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY requirement_definition_commands_ibfk_1 [1] | requirement_definition_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="requirement-definition-versions"></a>

## requirement_definition_versions

Versioned requirement policy, document kind, applicability, instructions and effective dates.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001090000_f13_requirement_definitions.sql:7](../../../db/migrations/20261001090000_f13_requirement_definitions.sql#L7), [20261014030000_f43_policy_consistency.sql:4](../../../db/migrations/20261014030000_f43_policy_consistency.sql#L4)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `definition_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_definition_versions_ibfk_1 [1]; UNIQUE uq_requirement_date [1]; UNIQUE uq_requirement_revision [1] | requirement_definition_versions_ibfk_1: requirement_definitions (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_requirement_revision [2] | — | — |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `instructions` | `varchar(2000)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `applies_to` | `enum('semester','payout')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_definition_versions_ibfk_2 [1] | requirement_definition_versions_ibfk_2: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_code` | `varchar(60)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `semester_name` | `varchar(160)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `effective_from` | `date` | NO | NULL / no explicit default | UNIQUE uq_requirement_date [2] | — | — |
| `effective_until` | `date` | YES | `NULL` | — | — | — |
| `active` | `tinyint(1)` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_definition_versions_ibfk_3 [1] | requirement_definition_versions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `document_kind` | `enum('enrollment','grades','other')` | YES | `NULL` | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_requirement_date` | YES | `definition_id A, effective_from A` | BTREE | — |
| `uq_requirement_revision` | YES | `definition_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``effective_until` is null or `effective_until` &gt; `effective_from``
- `CONSTRAINT_3`: ``active` in (0,1)`
- `CONSTRAINT_4`: ``semester_id` is null and `semester_code` is null and `semester_name` is null or `semester_id` is not null and `semester_code` is not null and `semester_name` is not null`

<a id="requirement-definitions"></a>

## requirement_definitions

Stable requirement-definition identity and code.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001090000_f13_requirement_definitions.sql:1](../../../db/migrations/20261001090000_f13_requirement_definitions.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(40)` | NO | NULL / no explicit default | UNIQUE code [1] | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `code` | YES | `code A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="requirement-document-evidence"></a>

## requirement_document_evidence

Document evidence linking instance, receipt and workflow/entrant review.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007020000_f36_enrollment_document_evidence.sql:2](../../../db/migrations/20261007020000_f36_enrollment_document_evidence.sql#L2), [20261014020000_f42_entrant_grading_cards.sql:2](../../../db/migrations/20261014020000_f42_entrant_grading_cards.sql#L2), [20261014020000_f42_entrant_grading_cards.sql:24](../../../db/migrations/20261014020000_f42_entrant_grading_cards.sql#L24)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_document_evidence_ibfk_1 [1] | requirement_document_evidence_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `receipt_id` | `char(36)` | YES | `NULL` | UNIQUE receipt_id [1]; FOREIGN KEY requirement_document_evidence_ibfk_2 [1] | requirement_document_evidence_ibfk_2: requirement_receipts (id) / RESTRICT / RESTRICT | ascii_bin |
| `workflow_event_id` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_document_evidence_ibfk_3 [1]; UNIQUE workflow_event_id [1] | requirement_document_evidence_ibfk_3: requirement_workflow_events (id) / RESTRICT / RESTRICT | ascii_bin |
| `document_type` | `enum('cor','certificate_of_enrollment','cog','shs_grading_card')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_document_evidence_ibfk_4 [1] | requirement_document_evidence_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `entrant_review_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_document_entrant_review [1] | fk_document_entrant_review: entrant_grading_card_reviews (id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `fk_document_entrant_review` | NO | `entrant_review_id A` | BTREE | — |
| `instance_id` | NO | `instance_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `receipt_id` | YES | `receipt_id A` | BTREE | — |
| `workflow_event_id` | YES | `workflow_event_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``receipt_id` is not null and `workflow_event_id` is null or `receipt_id` is null and `workflow_event_id` is not null`

<a id="requirement-generation-commands"></a>

## requirement_generation_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001100000_f14_requirement_instances.sql:34](../../../db/migrations/20261001100000_f14_requirement_instances.sql#L34)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY requirement_generation_commands_ibfk_1 [1] | requirement_generation_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="requirement-instances"></a>

## requirement_instances

Individual requirement instance under a checklist and exact definition version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001100000_f14_requirement_instances.sql:23](../../../db/migrations/20261001100000_f14_requirement_instances.sql#L23)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `checklist_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_instances_ibfk_1 [1]; UNIQUE uq_requirement_instance [1] | requirement_instances_ibfk_1: requirement_checklists (id) / RESTRICT / RESTRICT | ascii_bin |
| `definition_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_instances_ibfk_2 [1]; UNIQUE uq_requirement_instance [2] | requirement_instances_ibfk_2: requirement_definition_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `status` | `enum('not_submitted')` | NO | `'not_submitted'` | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `definition_version_id` | NO | `definition_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_requirement_instance` | YES | `checklist_id A, definition_version_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="requirement-receipt-commands"></a>

## requirement_receipt_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001110000_f15_requirement_receiving.sql:17](../../../db/migrations/20261001110000_f15_requirement_receiving.sql#L17)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY requirement_receipt_commands_ibfk_1 [1] | requirement_receipt_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="requirement-receipts"></a>

## requirement_receipts

Document receipt evidence; physical received date is separate from recorded timestamp.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001110000_f15_requirement_receiving.sql:1](../../../db/migrations/20261001110000_f15_requirement_receiving.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_receipts_ibfk_1 [1]; UNIQUE uq_initial_requirement_receipt [1] | requirement_receipts_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `received_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `physical_reference` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `storage_location` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `remarks` | `varchar(1000)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_receipts_ibfk_2 [1] | requirement_receipts_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_initial_requirement_receipt` | YES | `instance_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="requirement-timing-decisions"></a>

## requirement_timing_decisions

Batch-specific receipt timing decision with current source hash and evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007030000_f36_requirement_timing_decisions.sql:2](../../../db/migrations/20261007030000_f36_requirement_timing_decisions.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_timing_decisions_ibfk_1 [1]; UNIQUE uq_requirement_timing_revision [1] | requirement_timing_decisions_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `batch_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_timing_decisions_ibfk_2 [1]; UNIQUE uq_requirement_timing_revision [2] | requirement_timing_decisions_ibfk_2: payroll_submission_windows (batch_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_requirement_timing_revision [3] | — | — |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `decision` | `enum('approve','reject')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `evidence_kind` | `enum('receiving_log','dated_acknowledgment')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `evidence_reference` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_timing_decisions_ibfk_3 [1] | requirement_timing_decisions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(200)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `batch_id` | NO | `batch_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_requirement_timing_revision` | YES | `instance_id A, batch_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `snapshot`: `json_valid(`snapshot`)`

<a id="requirement-waiver-commands"></a>

## requirement_waiver_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001130000_f17_requirement_waivers.sql:22](../../../db/migrations/20261001130000_f17_requirement_waivers.sql#L22)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY requirement_waiver_commands_ibfk_1 [1] | requirement_waiver_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="requirement-waivers"></a>

## requirement_waivers

Requirement waiver authority and before-status evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001130000_f17_requirement_waivers.sql:1](../../../db/migrations/20261001130000_f17_requirement_waivers.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_waivers_ibfk_1 [1]; UNIQUE uq_requirement_waiver_instance [1] | requirement_waivers_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `from_status` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `authority_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `remarks` | `varchar(1000)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_waivers_ibfk_2 [1] | requirement_waivers_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_requirement_waiver_instance` | YES | `instance_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``version` &gt;= 1`
- `CONSTRAINT_2`: ``from_status` in ('not_submitted','submitted','for_verification','for_correction','resubmitted','rejected')`
- `CONSTRAINT_3`: `char_length(trim(`reason`)) &gt;= 5`
- `CONSTRAINT_4`: `char_length(trim(`authority_reference`)) &gt;= 3`

<a id="requirement-workflow-commands"></a>

## requirement_workflow_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001120000_f16_requirement_verification.sql:26](../../../db/migrations/20261001120000_f16_requirement_verification.sql#L26)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY requirement_workflow_commands_ibfk_1 [1] | requirement_workflow_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="requirement-workflow-events"></a>

## requirement_workflow_events

Versioned document status transitions, correction reference and saved details.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261001120000_f16_requirement_verification.sql:1](../../../db/migrations/20261001120000_f16_requirement_verification.sql#L1), [20261008010000_f36_workflow_diagnostic_fixes.sql:15](../../../db/migrations/20261008010000_f36_workflow_diagnostic_fixes.sql#L15)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_workflow_events_ibfk_1 [1]; UNIQUE uq_requirement_workflow_version [1] | requirement_workflow_events_ibfk_1: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `version` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_requirement_workflow_version [2] | — | — |
| `action` | `enum('send-for-verification','verify','return-for-correction','resubmit','reject')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `from_status` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `to_status` | `varchar(30)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `remarks` | `varchar(1000)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `correction_of` | `char(36)` | YES | `NULL` | FOREIGN KEY requirement_workflow_events_ibfk_2 [1] | requirement_workflow_events_ibfk_2: requirement_workflow_events (id) / RESTRICT / RESTRICT | ascii_bin |
| `details` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY requirement_workflow_events_ibfk_3 [1] | requirement_workflow_events_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `correction_of` | NO | `correction_of A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_requirement_workflow_version` | YES | `instance_id A, version A` | BTREE | — |

### CHECK constraints

- `ck_requirement_correction_link`: ``from_status` = 'verified' and `action` in ('return-for-correction','verify') and `correction_of` is not null or `from_status` &lt;&gt; 'verified' and `correction_of` is null`
- `ck_requirement_workflow_edge`: ``action` = 'send-for-verification' and `from_status` in ('submitted','resubmitted') and `to_status` = 'for_verification' or `action` = 'verify' and `from_status` in ('for_verification','verified') and `to_status` = 'verified' or `action` = 'return-for-correction' and `from_status` in ('for_verification','verified') and `to_status` = 'for_correction' or `action` = 'resubmit' and `from_status` = 'for_correction' and `to_status` = 'resubmitted' or `action` = 'reject' and `from_status` = 'for_verification' and `to_status` = 'rejected'`
- `CONSTRAINT_1`: ``version` &gt;= 2`
- `details`: `json_valid(`details`)`

<a id="role-change-commands"></a>

## role_change_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929020000_f02_permissions.sql:35](../../../db/migrations/20260929020000_f02_permissions.sql#L35)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `user_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY role_change_commands_ibfk_1 [1] | role_change_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `request_id A` | BTREE | — |
| `user_id` | NO | `user_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="role-permissions"></a>

## role_permissions

Role-to-permission mapping.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929020000_f02_permissions.sql:14](../../../db/migrations/20260929020000_f02_permissions.sql#L14)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `role_code` | `varchar(32)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY role_permissions_ibfk_1 [1] | role_permissions_ibfk_1: roles (code) / RESTRICT / RESTRICT | ascii_bin |
| `permission_code` | `varchar(80)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2]; FOREIGN KEY role_permissions_ibfk_2 [1] | role_permissions_ibfk_2: permissions (code) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `permission_code` | NO | `permission_code A` | BTREE | — |
| `PRIMARY` | YES | `role_code A, permission_code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="roles"></a>

## roles

Role codes, labels and descriptions.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929020000_f02_permissions.sql:1](../../../db/migrations/20260929020000_f02_permissions.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `code` | `varchar(32)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `label` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `description` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `code A` | BTREE | — |

### CHECK constraints

- `ck_role_code`: ``code` in ('staff','coordinator','system_admin')`

<a id="schema-migrations"></a>

## schema_migrations

Applied migration version, checksum and application timestamp journal.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929000000_f00_baseline.sql:1](../../../db/migrations/20260929000000_f00_baseline.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `version` | `varchar(80)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `checksum` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `applied_at` | `datetime(6)` | NO | `current_timestamp(6)` | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `version A` | BTREE | — |

### CHECK constraints

None declared.

<a id="scholar-commands"></a>

## scholar_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929040000_f04_scholars.sql:46](../../../db/migrations/20260929040000_f04_scholars.sql#L46)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_commands_ibfk_1 [1] | scholar_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_commands_ibfk_2 [1] | scholar_commands_ibfk_2: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `resulting_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, request_id A` | BTREE | — |
| `scholar_id` | NO | `scholar_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="scholar-contacts"></a>

## scholar_contacts

Scholar contact fields, keyed by scholar.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929040000_f04_scholars.sql:38](../../../db/migrations/20260929040000_f04_scholars.sql#L38)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_contacts_ibfk_1 [1] | scholar_contacts_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `email` | `varchar(254)` | NO | `''` | — | — | utf8mb4_unicode_ci |
| `phone` | `varchar(40)` | NO | `''` | — | — | utf8mb4_unicode_ci |
| `address_line` | `varchar(300)` | NO | `''` | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `scholar_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="scholar-id-sequences"></a>

## scholar_id_sequences

Last identifier sequence number per entry year.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929040000_f04_scholars.sql:19](../../../db/migrations/20260929040000_f04_scholars.sql#L19)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `entry_year` | `smallint(5) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | — |
| `last_number` | `int(10) unsigned` | NO | `0` | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `entry_year A` | BTREE | — |

### CHECK constraints

- `ck_sequence_number`: ``last_number` between 0 and 99999`
- `ck_sequence_year`: ``entry_year` between 1900 and 9999`

<a id="scholar-identifiers"></a>

## scholar_identifiers

Scholar human identifier and entry-year sequence assignment.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929040000_f04_scholars.sql:26](../../../db/migrations/20260929040000_f04_scholars.sql#L26)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_identifiers_ibfk_1 [1] | scholar_identifiers_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `entry_year` | `smallint(5) unsigned` | NO | NULL / no explicit default | UNIQUE uq_year_number [1] | — | — |
| `sequence_no` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_year_number [2] | — | — |
| `human_id` | `varchar(15)` | YES | `NULL` | UNIQUE uq_human_id [1] | — | STORED GENERATED; concat('LDSS-',`entry_year`,'-',lpad(`sequence_no`,5,'0')); ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `scholar_id A` | BTREE | — |
| `uq_human_id` | YES | `human_id A` | BTREE | — |
| `uq_year_number` | YES | `entry_year A, sequence_no A` | BTREE | — |

### CHECK constraints

- `ck_identifier_number`: ``sequence_no` between 1 and 99999`
- `ck_identifier_year`: ``entry_year` between 1900 and 9999`

<a id="scholar-intake-revisions"></a>

## scholar_intake_revisions

Versioned intake placement/classification changes and source/reason evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261024010000_f53_annual_intake_registration.sql:18](../../../db/migrations/20261024010000_f53_annual_intake_registration.sql#L18)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `intake_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_intake_revisions_ibfk_1 [1] | scholar_intake_revisions_ibfk_1: scholar_intakes (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `action` | `enum('supplement_initial_details','correct_classification')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `classification` | `enum('new','continuing')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `school_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_intake_revisions_ibfk_2 [1] | scholar_intake_revisions_ibfk_2: schools (id) / RESTRICT / RESTRICT | ascii_bin |
| `course_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_intake_revisions_ibfk_3 [1] | scholar_intake_revisions_ibfk_3: courses (id) / RESTRICT / RESTRICT | ascii_bin |
| `year_level` | `varchar(60)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `before_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_intake_revisions_ibfk_4 [1]; UNIQUE uq_intake_revision_command [1] | scholar_intake_revisions_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_intake_revision_command [2] | — | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `course_id` | NO | `course_id A` | BTREE | — |
| `PRIMARY` | YES | `intake_id A, revision A` | BTREE | — |
| `school_id` | NO | `school_id A` | BTREE | — |
| `uq_intake_revision_command` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `ck_intake_revision`: ``revision` &gt;= 2`
- `ck_intake_revision_class`: ``classification` in ('new','continuing')`
- `ck_intake_revision_evidence`: `char_length(trim(`reason`)) &gt;= 5 and char_length(trim(`source_reference`)) &gt;= 3`
- `ck_intake_revision_year`: ``year_level` is null or char_length(trim(`year_level`)) between 1 and 60`

<a id="scholar-intake-text-events"></a>

## scholar_intake_text_events

Versioned supplied school/course text with intake-basis hashes and source evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261025020000_f56_intake_supplied_text.sql:2](../../../db/migrations/20261025020000_f56_intake_supplied_text.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `intake_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_intake_text_events_ibfk_1 [1]; FOREIGN KEY scholar_intake_text_events_ibfk_2 [1] | scholar_intake_text_events_ibfk_1: scholar_intakes (id) / RESTRICT / RESTRICT; scholar_intake_text_events_ibfk_2: scholar_intake_text_events (intake_id, revision) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `previous_revision` | `int(10) unsigned` | YES | `NULL` | FOREIGN KEY scholar_intake_text_events_ibfk_2 [2] | scholar_intake_text_events_ibfk_2: scholar_intake_text_events (intake_id, revision) / RESTRICT / RESTRICT | — |
| `before_hash` | `char(64)` | YES | `NULL` | — | — | ascii_bin |
| `action` | `enum('registered','completed','corrected')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `school_text` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_bin |
| `course_text` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_bin |
| `basis_intake_revision` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `basis_intake_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `source_reference` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `snapshot_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_intake_text_events_ibfk_3 [1]; UNIQUE uq_intake_text_command [1] | scholar_intake_text_events_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_intake_text_command [2] | — | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `intake_id` | NO | `intake_id A, previous_revision A` | BTREE | — |
| `PRIMARY` | YES | `intake_id A, revision A` | BTREE | — |
| `uq_intake_text_command` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `ck_intake_text_course`: ``course_text` is null or char_length(trim(`course_text`)) between 1 and 300`
- `ck_intake_text_evidence`: `char_length(trim(`source_reference`)) &gt;= 3 and char_length(trim(`reason`)) &gt;= 5`
- `ck_intake_text_predecessor`: ``revision` = 1 and `previous_revision` is null and `before_hash` is null or `revision` &gt; 1 and `previous_revision` = `revision` - 1 and `before_hash` is not null`
- `ck_intake_text_registered`: ``action` &lt;&gt; 'registered' or `revision` = 1`
- `ck_intake_text_revision`: ``revision` &gt;= 1 and `basis_intake_revision` &gt;= 1`
- `ck_intake_text_school`: ``school_text` is null or char_length(trim(`school_text`)) between 1 and 300`
- `snapshot`: `json_valid(`snapshot`)`

<a id="scholar-intakes"></a>

## scholar_intakes

Annual intake identity and source/import association, placement/classification and supplied-details fields.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261008030000_f36_scholar_intake.sql:2](../../../db/migrations/20261008030000_f36_scholar_intake.sql#L2), [20261024010000_f53_annual_intake_registration.sql:3](../../../db/migrations/20261024010000_f53_annual_intake_registration.sql#L3)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_intakes_ibfk_1 [1]; UNIQUE uq_intake_year [1] | scholar_intakes_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_intakes_ibfk_2 [1]; UNIQUE uq_intake_year [2] | scholar_intakes_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `school_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_intakes_ibfk_3 [1] | scholar_intakes_ibfk_3: schools (id) / RESTRICT / RESTRICT | ascii_bin |
| `course_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_intakes_ibfk_4 [1] | scholar_intakes_ibfk_4: courses (id) / RESTRICT / RESTRICT | ascii_bin |
| `year_level` | `varchar(60)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `classification` | `enum('new','continuing')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `supplied_details` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `import_job_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_intakes_ibfk_5 [1] | scholar_intakes_ibfk_5: import_jobs (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_row` | `int(11)` | YES | `NULL` | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_intakes_ibfk_6 [1] | scholar_intakes_ibfk_6: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `origin_kind` | `enum('import','manual')` | NO | `'import'` | — | — | utf8mb4_unicode_ci |
| `source_reference` | `varchar(300)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `course_id` | NO | `course_id A` | BTREE | — |
| `import_job_id` | NO | `import_job_id A` | BTREE | — |
| `ix_intake_associated_year` | NO | `academic_year_id A, scholar_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `school_id` | NO | `school_id A` | BTREE | — |
| `uq_intake_year` | YES | `scholar_id A, academic_year_id A` | BTREE | — |

**5181 difference:** the standalone nonunique `academic_year_id (academic_year_id)` index exists only in primary. Both have ix_intake_associated_year (academic_year_id, scholar_id). All other indexes for this table match.

### CHECK constraints

- `ck_intake_classification`: ``classification` in ('new','continuing')`
- `ck_intake_initial_year`: ``year_level` is null or char_length(trim(`year_level`)) between 1 and 60`
- `ck_intake_origin`: ``origin_kind` = 'import' and `import_job_id` is not null and `source_row` is not null and `source_row` &gt;= 2 and `school_id` is not null and `year_level` is not null and char_length(trim(`year_level`)) between 1 and 60 or `origin_kind` = 'manual' and `import_job_id` is null and `source_row` is null and `source_reference` is not null and char_length(trim(`source_reference`)) between 3 and 300`
- `supplied_details`: `json_valid(`supplied_details`)`

<a id="scholar-profile-audit"></a>

## scholar_profile_audit

SQL audit projection; exact view definition appears below. Views have no declared primary/foreign keys.

**Present:** Both. **Type:** VIEW. **Engine/collation:** N/A / N/A. **Schema comment:** `VIEW`.

**DDL evidence:** No creation/alteration statement found in repository migrations; live schema remains authoritative. Environment ownership markers are operator-fixture metadata, not backup jobs.

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `event_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_type` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `entity_id` | `char(36)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `action` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | YES | `NULL` | — | — | ascii_bin |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| — | — | No declared index | — | — |

### CHECK constraints

None declared.

### View definition

Security: DEFINER; check option: NONE; updatable metadata: YES. No definer account is exported.

```sql
select `ldss_primary_test_12676_61497616`.`audit_logs`.`id` AS `id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`event_type` AS `event_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`entity_type` AS `entity_type`,`ldss_primary_test_12676_61497616`.`audit_logs`.`entity_id` AS `entity_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`action` AS `action`,`ldss_primary_test_12676_61497616`.`audit_logs`.`actor_id` AS `actor_id`,`ldss_primary_test_12676_61497616`.`audit_logs`.`occurred_at` AS `occurred_at` from `ldss_primary_test_12676_61497616`.`audit_logs` where `ldss_primary_test_12676_61497616`.`audit_logs`.`entity_type` in ('scholar','scholarship','status_request','academic_record','requirement_instance','requirement_checklist')
```

5181 definition differs only in its explicit database qualifier.

<a id="scholar-semester-revisions"></a>

## scholar_semester_revisions

Versioned semester placement, program category, enrollment and load source context.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:157](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L157)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY scholar_semester_revisions_ibfk_1 [1] | scholar_semester_revisions_ibfk_1: scholar_semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `academic_record_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_semester_revisions_ibfk_2 [1] | scholar_semester_revisions_ibfk_2: academic_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_change_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_semester_revisions_ibfk_3 [1] | scholar_semester_revisions_ibfk_3: academic_changes (id) / RESTRICT / RESTRICT | ascii_bin |
| `placement_snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `predecessor_semester_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_semester_revisions_ibfk_4 [1] | scholar_semester_revisions_ibfk_4: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `program_category` | `enum('degree','non_degree','unknown')` | NO | `'unknown'` | — | — | utf8mb4_unicode_ci |
| `year_level` | `varchar(60)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `normalized_year_level` | `smallint(5) unsigned` | YES | `NULL` | — | — | — |
| `enrolled` | `tinyint(1)` | YES | `NULL` | — | — | — |
| `full_load` | `tinyint(1)` | YES | `NULL` | — | — | — |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semester_revisions_ibfk_5 [1] | scholar_semester_revisions_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_change_id` | NO | `academic_change_id A` | BTREE | — |
| `academic_record_id` | NO | `academic_record_id A` | BTREE | — |
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `predecessor_semester_id` | NO | `predecessor_semester_id A` | BTREE | — |
| `PRIMARY` | YES | `scholar_semester_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``normalized_year_level` is null or `normalized_year_level` &gt; 0`
- `CONSTRAINT_3`: ``enrolled` is null or `enrolled` in (0,1)`
- `CONSTRAINT_4`: ``full_load` is null or `full_load` in (0,1)`
- `CONSTRAINT_5`: ``academic_change_id` is null or `academic_record_id` is not null`
- `placement_snapshot`: `json_valid(`placement_snapshot`)`

<a id="scholar-semesters"></a>

## scholar_semesters

Scholar/semester participation and annual/scope identity.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:139](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L139), [20261006030000_f36_semester_checklist_owner.sql:2](../../../db/migrations/20261006030000_f36_semester_checklist_owner.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_scholar_semester_period [1]; UNIQUE uq_semester_identity [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semesters_ibfk_1 [2]; UNIQUE uq_scholar_semester [1]; UNIQUE uq_semester_identity [2] | scholar_semesters_ibfk_1: participations (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semesters_ibfk_2 [1]; FOREIGN KEY scholar_semesters_ibfk_3 [2]; UNIQUE uq_scholar_semester [2]; UNIQUE uq_scholar_semester_period [2]; UNIQUE uq_semester_identity [3] | scholar_semesters_ibfk_2: semesters (id) / RESTRICT / RESTRICT; scholar_semesters_ibfk_3: workflow_scope_versions (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `participation_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semesters_ibfk_1 [1] | scholar_semesters_ibfk_1: participations (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholarship_record_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholar_semesters_ibfk_4 [1] | scholar_semesters_ibfk_4: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `scope_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semesters_ibfk_3 [1] | scholar_semesters_ibfk_3: workflow_scope_versions (id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholar_semesters_ibfk_5 [1] | scholar_semesters_ibfk_5: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `participation_id` | NO | `participation_id A, scholar_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholarship_record_id` | NO | `scholarship_record_id A` | BTREE | — |
| `scope_version_id` | NO | `scope_version_id A, semester_id A` | BTREE | — |
| `semester_id` | NO | `semester_id A` | BTREE | — |
| `uq_scholar_semester` | YES | `scholar_id A, semester_id A` | BTREE | — |
| `uq_scholar_semester_period` | YES | `id A, semester_id A` | BTREE | — |
| `uq_semester_identity` | YES | `id A, scholar_id A, semester_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="scholars"></a>

## scholars

Person/Registry identity, name and birth-date columns, original year/barangay references and version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929040000_f04_scholars.sql:1](../../../db/migrations/20260929040000_f04_scholars.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `first_name` | `varchar(100)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `middle_name` | `varchar(100)` | NO | `''` | — | — | utf8mb4_unicode_ci |
| `last_name` | `varchar(100)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `suffix` | `varchar(30)` | NO | `''` | — | — | utf8mb4_unicode_ci |
| `birth_date` | `date` | YES | `NULL` | — | — | — |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholars_ibfk_1 [1] | scholars_ibfk_1: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `barangay_id` | `char(36)` | YES | `NULL` | FOREIGN KEY scholars_ibfk_2 [1] | scholars_ibfk_2: barangays (id) / RESTRICT / RESTRICT | ascii_bin |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `barangay_id` | NO | `barangay_id A` | BTREE | — |
| `ix_scholar_name` | NO | `last_name A, first_name A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `ck_scholar_version`: ``version` &gt;= 1`

<a id="scholarship-records"></a>

## scholarship_records

Scholar annual scholarship record; qualification and operational standing have separate version/date fields.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930060000_f06_qualification.sql:1](../../../db/migrations/20260930060000_f06_qualification.sql#L1), [20260930070000_f07_status_changes.sql:1](../../../db/migrations/20260930070000_f07_status_changes.sql#L1), [20261008010000_f36_workflow_diagnostic_fixes.sql:3](../../../db/migrations/20261008010000_f36_workflow_diagnostic_fixes.sql#L3), [20261008020000_f36_annual_rollover.sql:2](../../../db/migrations/20261008020000_f36_annual_rollover.sql#L2), [20261008020000_f36_annual_rollover.sql:13](../../../db/migrations/20261008020000_f36_annual_rollover.sql#L13)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_annual_identity [1] | — | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY fk_annual_continuing [2]; FOREIGN KEY fk_annual_predecessor [2]; FOREIGN KEY scholarship_records_ibfk_1 [1]; UNIQUE uq_annual_identity [2]; UNIQUE uq_scholarship_year [1] | fk_annual_continuing: participations (id, scholar_id) / RESTRICT / RESTRICT; fk_annual_predecessor: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT; scholarship_records_ibfk_1: scholars (id) / RESTRICT / RESTRICT | ascii_bin |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY scholarship_records_ibfk_2 [1]; UNIQUE uq_scholarship_year [2] | scholarship_records_ibfk_2: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `status` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `last_effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `operational_status` | `varchar(20)` | YES | `NULL` | — | — | ascii_bin |
| `status_version` | `int(10) unsigned` | NO | `0` | — | — | — |
| `status_effective_on` | `date` | YES | `NULL` | — | — | — |
| `continuing_participation_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_annual_continuing [1] | fk_annual_continuing: participations (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |
| `continuing_from_scholarship_id` | `char(36)` | YES | `NULL` | FOREIGN KEY fk_annual_predecessor [1] | fk_annual_predecessor: scholarship_records (id, scholar_id) / RESTRICT / RESTRICT | ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `fk_annual_continuing` | NO | `continuing_participation_id A, scholar_id A` | BTREE | — |
| `fk_annual_predecessor` | NO | `continuing_from_scholarship_id A, scholar_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_annual_identity` | YES | `id A, scholar_id A` | BTREE | — |
| `uq_scholarship_year` | YES | `scholar_id A, academic_year_id A` | BTREE | — |

### CHECK constraints

- `ck_annual_continuing`: ``status` = 'continuing' and (`continuing_participation_id` is not null and `continuing_from_scholarship_id` is null or `continuing_participation_id` is null and `continuing_from_scholarship_id` is not null) or `status` &lt;&gt; 'continuing' and `continuing_participation_id` is null and `continuing_from_scholarship_id` is null`
- `ck_annual_predecessor_not_self`: ``continuing_from_scholarship_id` is null or `continuing_from_scholarship_id` &lt;&gt; `id``
- `ck_operational_status`: ``operational_status` is null and `status_version` = 0 and `status_effective_on` is null or `operational_status` in ('active','on_hold','suspended','graduated','dropped','withdrawn','disqualified','not_renewed') and `status_version` &gt; 0 and `status_effective_on` is not null and `status` in ('selected','continuing')`
- `ck_scholarship_status`: ``status` in ('applicant','exam_passed','qualified','selected','not_selected','continuing')`
- `ck_scholarship_version`: ``version` &gt;= 1`

<a id="schools"></a>

## schools

Versioned school reference.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:44](../../../db/migrations/20260929030000_f03_configuration.sql#L44)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

None declared.

<a id="semester-document-reconciliations"></a>

## semester_document_reconciliations

Source-backed reconciliation of legacy and source requirement instances.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261014010000_f41_shared_semester_documents.sql:2](../../../db/migrations/20261014010000_f41_shared_semester_documents.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_document_reconciliations_ibfk_1 [1] | semester_document_reconciliations_ibfk_1: scholar_semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `legacy_instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_document_reconciliations_ibfk_2 [1]; UNIQUE uq_document_reconciliation [1] | semester_document_reconciliations_ibfk_2: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_instance_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_document_reconciliations_ibfk_3 [1] | semester_document_reconciliations_ibfk_3: requirement_instances (id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_document_reconciliation [2] | — | — |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `evidence` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_document_reconciliations_ibfk_4 [1] | semester_document_reconciliations_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_semester_id` | NO | `scholar_semester_id A` | BTREE | — |
| `source_instance_id` | NO | `source_instance_id A` | BTREE | — |
| `uq_document_reconciliation` | YES | `legacy_instance_id A, revision A` | BTREE | — |

### CHECK constraints

- `evidence`: `json_valid(`evidence`)`

<a id="semester-entitlement-events"></a>

## semester_entitlement_events

Versioned entitlement decisions linked to semester review and authority.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:249](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L249)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_entitlement_event_owner [1] | — | ascii_bin |
| `entitlement_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlement_events_ibfk_1 [1]; UNIQUE uq_entitlement_event_owner [2]; UNIQUE uq_entitlement_revision [1] | semester_entitlement_events_ibfk_1: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlement_events_ibfk_1 [2]; FOREIGN KEY semester_entitlement_events_ibfk_2 [2] | semester_entitlement_events_ibfk_1: semester_entitlements (id, scholar_semester_id) / RESTRICT / RESTRICT; semester_entitlement_events_ibfk_2: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_entitlement_revision [2] | — | — |
| `action` | `enum('assessed','approved','withheld','unclaimed','correction')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `review_event_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlement_events_ibfk_2 [1] | semester_entitlement_events_ibfk_2: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `authority_version_id` | `char(36)` | YES | `NULL` | FOREIGN KEY semester_entitlement_events_ibfk_3 [1] | semester_entitlement_events_ibfk_3: workflow_authority_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlement_events_ibfk_4 [1] | semester_entitlement_events_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `authority_version_id` | NO | `authority_version_id A` | BTREE | — |
| `entitlement_id` | NO | `entitlement_id A, scholar_semester_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `review_event_id` | NO | `review_event_id A, scholar_semester_id A` | BTREE | — |
| `uq_entitlement_event_owner` | YES | `id A, entitlement_id A` | BTREE | — |
| `uq_entitlement_revision` | YES | `entitlement_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``action` not in ('approved','withheld','correction') or `authority_version_id` is not null`
- `snapshot`: `json_valid(`snapshot`)`

<a id="semester-entitlements"></a>

## semester_entitlements

Scholar/semester benefit entitlement, amount in centavos and currency.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:232](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L232), [20261022070000_f52_individual_settlement.sql:3](../../../db/migrations/20261022070000_f52_individual_settlement.sql#L3)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_entitlement_owner [1]; UNIQUE uq_entitlement_payment_identity [1] | — | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlements_ibfk_1 [1]; UNIQUE uq_entitlement_owner [2] | semester_entitlements_ibfk_1: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `scholar_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlements_ibfk_1 [2]; UNIQUE uq_entitlement_payment_identity [2]; UNIQUE uq_semester_benefit [1] | semester_entitlements_ibfk_1: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlements_ibfk_1 [3]; UNIQUE uq_entitlement_payment_identity [3]; UNIQUE uq_semester_benefit [2] | semester_entitlements_ibfk_1: scholar_semesters (id, scholar_id, semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `benefit_type` | `enum('degree_stipend')` | NO | NULL / no explicit default | UNIQUE uq_semester_benefit [3] | — | utf8mb4_unicode_ci |
| `amount_centavos` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `currency` | `char(3)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_entitlements_ibfk_2 [1] | semester_entitlements_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_semester_id` | NO | `scholar_semester_id A, scholar_id A, semester_id A` | BTREE | — |
| `uq_entitlement_owner` | YES | `id A, scholar_semester_id A` | BTREE | — |
| `uq_entitlement_payment_identity` | YES | `id A, scholar_id A, semester_id A` | BTREE | — |
| `uq_semester_benefit` | YES | `scholar_id A, semester_id A, benefit_type A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``amount_centavos` = 500000 and `currency` = 'PHP'`

<a id="semester-review-events"></a>

## semester_review_events

Semester review findings, policy/grade basis, source snapshot/hash and supersession.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:203](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L203)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_review_owner [1] | — | ascii_bin |
| `scholar_semester_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_review_events_ibfk_1 [1]; FOREIGN KEY semester_review_events_ibfk_3 [2]; UNIQUE uq_review_owner [2]; UNIQUE uq_semester_review [1] | semester_review_events_ibfk_1: scholar_semester_revisions (scholar_semester_id, revision) / RESTRICT / RESTRICT; semester_review_events_ibfk_3: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_semester_review [2] | — | — |
| `semester_revision` | `int(10) unsigned` | NO | NULL / no explicit default | FOREIGN KEY semester_review_events_ibfk_1 [2] | semester_review_events_ibfk_1: scholar_semester_revisions (scholar_semester_id, revision) / RESTRICT / RESTRICT | — |
| `policy_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_review_events_ibfk_2 [1] | semester_review_events_ibfk_2: workflow_policy_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `average_value` | `decimal(10,4)` | YES | `NULL` | — | — | — |
| `grading_rule_key` | `varchar(100)` | YES | `NULL` | — | — | utf8mb4_unicode_ci |
| `has_failed` | `tinyint(1)` | YES | `NULL` | — | — | — |
| `has_dropped` | `tinyint(1)` | YES | `NULL` | — | — | — |
| `has_incomplete` | `tinyint(1)` | YES | `NULL` | — | — | — |
| `result` | `enum('pending','review_required','compliant','noncompliant')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `source_snapshot` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `source_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `supersedes_id` | `char(36)` | YES | `NULL` | FOREIGN KEY semester_review_events_ibfk_3 [1] | semester_review_events_ibfk_3: semester_review_events (id, scholar_semester_id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_review_events_ibfk_4 [1] | semester_review_events_ibfk_4: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `policy_version_id` | NO | `policy_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `scholar_semester_id` | NO | `scholar_semester_id A, semester_revision A` | BTREE | — |
| `supersedes_id` | NO | `supersedes_id A, scholar_semester_id A` | BTREE | — |
| `uq_review_owner` | YES | `id A, scholar_semester_id A` | BTREE | — |
| `uq_semester_review` | YES | `scholar_semester_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``has_failed` is null or `has_failed` in (0,1)`
- `CONSTRAINT_3`: ``has_dropped` is null or `has_dropped` in (0,1)`
- `CONSTRAINT_4`: ``has_incomplete` is null or `has_incomplete` in (0,1)`
- `source_snapshot`: `json_valid(`source_snapshot`)`

<a id="semester-submission-versions"></a>

## semester_submission_versions

Versioned semester submission deadline and previous-deadline/action evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261007010000_f36_payroll_submission_windows.sql:18](../../../db/migrations/20261007010000_f36_payroll_submission_windows.sql#L18)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `cycle_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY semester_submission_versions_ibfk_1 [1] | semester_submission_versions_ibfk_1: regular_payout_periods (cycle_id) / RESTRICT / RESTRICT | ascii_bin |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | — |
| `deadline_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `action` | `enum('configure','extend')` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `previous_deadline_on` | `date` | YES | `NULL` | — | — | — |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semester_submission_versions_ibfk_2 [1] | semester_submission_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `cycle_id A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: ``action` = 'configure' and `revision` = 1 and `previous_deadline_on` is null or `action` = 'extend' and `revision` &gt; 1 and `deadline_on` &gt; `previous_deadline_on``

<a id="semesters"></a>

## semesters

Versioned semester reference with dates, academic-year ownership, term kind, archive and lock state.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:16](../../../db/migrations/20260929030000_f03_configuration.sql#L16), [20261014030000_f43_policy_consistency.sql:2](../../../db/migrations/20261014030000_f43_policy_consistency.sql#L2)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `starts_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `ends_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `locked_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `academic_year_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY semesters_ibfk_1 [1] | semesters_ibfk_1: academic_years (id) / RESTRICT / RESTRICT | ascii_bin |
| `term_kind` | `enum('first','second','other')` | YES | `NULL` | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `academic_year_id` | NO | `academic_year_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

- `ck_dates`: ``ends_on` &gt;= `starts_on``

<a id="status-change-commands"></a>

## status_change_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930070000_f07_status_changes.sql:50](../../../db/migrations/20260930070000_f07_status_changes.sql#L50)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY status_change_commands_ibfk_1 [1] | status_change_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `request_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY status_change_commands_ibfk_2 [1] | status_change_commands_ibfk_2: status_change_requests (id) / RESTRICT / RESTRICT | ascii_bin |
| `outcome` | `varchar(10)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |
| `request_id` | NO | `request_id A` | BTREE | — |

### CHECK constraints

None declared.

<a id="status-change-decisions"></a>

## status_change_decisions

Recorded status-request decision and resulting annual version.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930070000_f07_status_changes.sql:36](../../../db/migrations/20260930070000_f07_status_changes.sql#L36)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `request_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY status_change_decisions_ibfk_1 [1] | status_change_decisions_ibfk_1: status_change_requests (id) / RESTRICT / RESTRICT | ascii_bin |
| `decision` | `varchar(10)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY status_change_decisions_ibfk_2 [1] | status_change_decisions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `resulting_version` | `int(10) unsigned` | YES | `NULL` | — | — | — |
| `occurred_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `request_id A` | BTREE | — |

### CHECK constraints

- `ck_status_decision`: ``decision` = 'approve' and `resulting_version` is not null and `resulting_version` &gt; 1 or `decision` in ('reject','cancel') and `resulting_version` is null`

<a id="status-change-requests"></a>

## status_change_requests

Requested annual scholarship status transition, expected version and source/reason evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260930070000_f07_status_changes.sql:10](../../../db/migrations/20260930070000_f07_status_changes.sql#L10)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `scholarship_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY status_change_requests_ibfk_1 [1] | status_change_requests_ibfk_1: scholarship_records (id) / RESTRICT / RESTRICT | ascii_bin |
| `expected_version` | `int(10) unsigned` | NO | NULL / no explicit default | — | — | — |
| `from_status` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `to_status` | `varchar(20)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `kind` | `varchar(10)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `corrects_request_id` | `char(36)` | YES | `NULL` | FOREIGN KEY status_change_requests_ibfk_3 [1] | status_change_requests_ibfk_3: status_change_requests (id) / RESTRICT / RESTRICT | ascii_bin |
| `effective_on` | `date` | NO | NULL / no explicit default | — | — | — |
| `reason_code` | `varchar(60)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reason` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY status_change_requests_ibfk_2 [1] | status_change_requests_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `corrects_request_id` | NO | `corrects_request_id A` | BTREE | — |
| `ix_status_requests` | NO | `scholarship_id A, created_at A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |

### CHECK constraints

- `ck_status_request`: ``expected_version` &gt; 0 and `from_status` &lt;&gt; `to_status` and (`kind` = 'change' and `corrects_request_id` is null and (`from_status` = 'active' and `to_status` in ('on_hold','suspended','graduated','dropped','withdrawn','disqualified','not_renewed') or `from_status` in ('on_hold','suspended') and `to_status` in ('active','graduated','dropped','withdrawn','disqualified','not_renewed')) or `kind` = 'correction' and `corrects_request_id` is not null and `from_status` in ('graduated','dropped','withdrawn','disqualified','not_renewed') and `to_status` in ('active','on_hold','suspended'))`

<a id="system-settings"></a>

## system_settings

Versioned typed configuration values, including reserved FIN_SIGN_* rows. No configuration values are exported.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929030000_f03_configuration.sql:66](../../../db/migrations/20260929030000_f03_configuration.sql#L66)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_code [1] | — | ascii_general_ci |
| `name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `archived_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `value_type` | `varchar(10)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `setting_value` | `varchar(1000)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_code` | YES | `code A` | BTREE | — |

### CHECK constraints

- `ck_setting_type`: ``value_type` in ('text','date')`

<a id="user-roles"></a>

## user_roles

User-to-role assignments with grant/revocation timestamps and the generated active-role field.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929020000_f02_permissions.sql:22](../../../db/migrations/20260929020000_f02_permissions.sql#L22)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `user_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_active_user_role [1]; FOREIGN KEY user_roles_ibfk_1 [1] | user_roles_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `role_code` | `varchar(32)` | NO | NULL / no explicit default | FOREIGN KEY user_roles_ibfk_2 [1] | user_roles_ibfk_2: roles (code) / RESTRICT / RESTRICT | ascii_bin |
| `granted_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `revoked_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `active_role` | `varchar(32)` | YES | `NULL` | UNIQUE uq_active_user_role [2] | — | STORED GENERATED; if(`revoked_at` is null,`role_code`,NULL); ascii_bin |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `role_code` | NO | `role_code A` | BTREE | — |
| `uq_active_user_role` | YES | `user_id A, active_role A` | BTREE | — |

### CHECK constraints

- `ck_role_revocation`: ``revoked_at` is null or `revoked_at` &gt;= `granted_at``

<a id="users"></a>

## users

Application account identities, password-hash column, disabled state and version. No account values are exported.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20260929010000_f01_authentication.sql:1](../../../db/migrations/20260929010000_f01_authentication.sql#L1)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `email` | `varchar(254)` | NO | NULL / no explicit default | UNIQUE uq_users_email [1] | — | ascii_general_ci |
| `full_name` | `varchar(160)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `password_hash` | `varchar(255)` | YES | `NULL` | — | — | ascii_bin |
| `disabled_at` | `datetime(6)` | YES | `NULL` | — | — | — |
| `version` | `int(10) unsigned` | NO | `1` | — | — | — |
| `created_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |
| `updated_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_users_email` | YES | `email A` | BTREE | — |

### CHECK constraints

None declared.

<a id="workflow-authority-versions"></a>

## workflow_authority_versions

Versioned authority issuer/reference, scope and validity evidence.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:3](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L3)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_workflow_authority [1] | — | utf8mb4_unicode_ci |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_workflow_authority [2] | — | — |
| `issuer` | `varchar(200)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `reference_text` | `varchar(300)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `scope` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `valid_from` | `date` | NO | NULL / no explicit default | — | — | — |
| `valid_until` | `date` | YES | `NULL` | — | — | — |
| `source_location` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY workflow_authority_versions_ibfk_1 [1] | workflow_authority_versions_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_workflow_authority` | YES | `code A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: `char_length(trim(`issuer`)) &gt; 0 and char_length(trim(`reference_text`)) &gt; 0`
- `CONSTRAINT_3`: ``valid_until` is null or `valid_until` &gt;= `valid_from``
- `scope`: `json_valid(`scope`)`

<a id="workflow-commands"></a>

## workflow_commands

Command/request payload-hash record. The exact result/version fields are listed below; schema presence alone does not prove retry or authorization behavior.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:284](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L284)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `actor_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; FOREIGN KEY workflow_commands_ibfk_1 [1] | workflow_commands_ibfk_1: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `command_id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [2] | — | ascii_bin |
| `operation` | `varchar(80)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `payload_hash` | `char(64)` | NO | NULL / no explicit default | — | — | ascii_bin |
| `result` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `PRIMARY` | YES | `actor_id A, command_id A` | BTREE | — |

### CHECK constraints

- `result`: `json_valid(`result`)`

<a id="workflow-policy-versions"></a>

## workflow_policy_versions

Versioned rules and authority/effective-date association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:22](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L22)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1] | — | ascii_bin |
| `code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_workflow_policy [1] | — | utf8mb4_unicode_ci |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_workflow_policy [2] | — | — |
| `authority_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY workflow_policy_versions_ibfk_1 [1] | workflow_policy_versions_ibfk_1: workflow_authority_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `source_reference` | `varchar(500)` | NO | NULL / no explicit default | — | — | utf8mb4_unicode_ci |
| `effective_from` | `date` | NO | NULL / no explicit default | — | — | — |
| `effective_until` | `date` | YES | `NULL` | — | — | — |
| `rules` | `longtext` | NO | NULL / no explicit default | — | — | utf8mb4_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY workflow_policy_versions_ibfk_2 [1] | workflow_policy_versions_ibfk_2: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `authority_version_id` | NO | `authority_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_workflow_policy` | YES | `code A, revision A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0`
- `CONSTRAINT_2`: `char_length(trim(`source_reference`)) &gt; 0`
- `CONSTRAINT_3`: ``effective_until` is null or `effective_until` &gt;= `effective_from``
- `rules`: `json_valid(`rules`)`

<a id="workflow-scope-versions"></a>

## workflow_scope_versions

Versioned semester/cohort workflow mode and policy association.

**Present:** Both. **Type:** BASE TABLE. **Engine/collation:** InnoDB / utf8mb4_unicode_ci. **Schema comment:** none.

**DDL evidence:** [20261006010000_f36_workflow_foundation.sql:41](../../../db/migrations/20261006010000_f36_workflow_foundation.sql#L41)

| Column | SQL type | Nullable | Default metadata | PK / UK / FK membership | Reference / UPDATE / DELETE | Extra / generated / collation / comment |
|---|---|---|---|---|---|---|
| `id` | `char(36)` | NO | NULL / no explicit default | PRIMARY KEY PRIMARY [1]; UNIQUE uq_workflow_scope_period [1] | — | ascii_bin |
| `semester_id` | `char(36)` | NO | NULL / no explicit default | UNIQUE uq_workflow_scope [1]; UNIQUE uq_workflow_scope_period [2]; FOREIGN KEY workflow_scope_versions_ibfk_1 [1] | workflow_scope_versions_ibfk_1: semesters (id) / RESTRICT / RESTRICT | ascii_bin |
| `cohort_code` | `varchar(60)` | NO | NULL / no explicit default | UNIQUE uq_workflow_scope [2] | — | utf8mb4_unicode_ci |
| `revision` | `int(10) unsigned` | NO | NULL / no explicit default | UNIQUE uq_workflow_scope [3] | — | — |
| `mode` | `enum('disabled','shadow','enabled')` | NO | `'disabled'` | — | — | utf8mb4_unicode_ci |
| `policy_version_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY workflow_scope_versions_ibfk_2 [1] | workflow_scope_versions_ibfk_2: workflow_policy_versions (id) / RESTRICT / RESTRICT | ascii_bin |
| `actor_id` | `char(36)` | NO | NULL / no explicit default | FOREIGN KEY workflow_scope_versions_ibfk_3 [1] | workflow_scope_versions_ibfk_3: users (id) / RESTRICT / RESTRICT | ascii_bin |
| `recorded_at` | `datetime(6)` | NO | NULL / no explicit default | — | — | — |

### Indexes and unique constraints

| Index | Unique | Ordered columns (prefix length if any) | Type | Comment |
|---|---|---|---|---|
| `actor_id` | NO | `actor_id A` | BTREE | — |
| `policy_version_id` | NO | `policy_version_id A` | BTREE | — |
| `PRIMARY` | YES | `id A` | BTREE | — |
| `uq_workflow_scope` | YES | `semester_id A, cohort_code A, revision A` | BTREE | — |
| `uq_workflow_scope_period` | YES | `id A, semester_id A` | BTREE | — |

### CHECK constraints

- `CONSTRAINT_1`: ``revision` &gt; 0 and char_length(trim(`cohort_code`)) &gt; 0`

## Foreign-key MATCH metadata

All inspected foreign keys report MATCH_OPTION = NONE. The diagrams use declared column nullability conservatively; CHECK clauses and application rules can impose additional conditions. Exact MATCH metadata accompanies each relationship in schema/relationships.json.
