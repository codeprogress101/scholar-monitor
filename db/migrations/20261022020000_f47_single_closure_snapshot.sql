-- One original closure per batch, independently of application state checks.
-- Derived metadata does not rewrite any historical snapshot or payment.
ALTER TABLE payroll_reconciliation_events
 ADD COLUMN original_closure_batch CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
  GENERATED ALWAYS AS (CASE WHEN kind='closed' THEN batch_id ELSE NULL END) VIRTUAL,
 ADD UNIQUE KEY uq_payroll_original_closure(original_closure_batch);
