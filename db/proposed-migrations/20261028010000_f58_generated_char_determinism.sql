-- PROPOSAL ONLY: DB-COMPAT-1; not in db/migrations and not authorized for primary.
-- Execute only after pinned full inventory/backup and source-value equivalence checks.
-- ALTER TABLE is implicit-commit DDL: no transaction-wide atomicity is claimed on 10.4.
-- On interrupted/uncertain delivery inspect SHOW CREATE TABLE and the full inventory.
-- If original expression remains, retry this exact ALTER after inspection. If corrected,
-- verify data/objects and record migration only through separately approved migration tooling.
-- Never rewrite any original journal row or run a downgrade.
ALTER TABLE graduation_monitoring_cases
  MODIFY COLUMN scope_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
  GENERATED ALWAYS AS
    (COALESCE(RTRIM(semester_id),'00000000-0000-0000-0000-000000000000')) STORED;

-- statement-break
ALTER TABLE individual_payment_transactions
 MODIFY COLUMN request_entitlement CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
 AS (IF(source_kind='unclaimed' AND replacement_of IS NULL,RTRIM(entitlement_id),NULL)) VIRTUAL,
 MODIFY COLUMN omission_request CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
 AS (IF(source_kind='omitted' AND replacement_of IS NULL,RTRIM(omission_id),NULL)) VIRTUAL;
-- statement-break
ALTER TABLE payroll_reconciliation_events
 MODIFY COLUMN original_closure_batch CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
 AS (CASE WHEN kind='closed' THEN RTRIM(batch_id) ELSE NULL END) VIRTUAL;
-- statement-break
ALTER TABLE requirement_checklists
 MODIFY COLUMN context_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin
 AS (IF(RTRIM(payout_cycle_id) IS NULL,CONCAT('S:',RTRIM(semester_id)),CONCAT('P:',RTRIM(payout_cycle_id)))) STORED;
