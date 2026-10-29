-- P03 evidence only. Canonical payments, corrections and entitlements are unchanged.
CREATE TABLE payroll_reconciliation_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 batch_revision INT UNSIGNED NOT NULL,
 kind ENUM('verified','reported','dismissed','corrected','closed') NOT NULL,
 case_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 case_version TINYINT UNSIGNED NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 snapshot LONGTEXT NOT NULL CHECK(JSON_VALID(snapshot)),
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 PRIMARY KEY(id),
 UNIQUE KEY uq_reconciliation_revision(batch_id,revision),
 UNIQUE KEY uq_reconciliation_case(case_id,case_version),
 KEY ix_reconciliation_kind(batch_id,kind,revision),
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(case_id) REFERENCES payroll_reconciliation_events(id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0),
 CHECK((kind='reported' AND case_id=id AND case_version=1 AND scholarship_id IS NOT NULL)
  OR (kind IN ('dismissed','corrected') AND case_id IS NOT NULL AND case_version=2 AND scholarship_id IS NOT NULL)
  OR (kind IN ('verified','closed') AND case_id IS NULL AND case_version IS NULL AND scholarship_id IS NULL AND payment_id IS NULL))
) ENGINE=InnoDB;
-- statement-break
-- Report rows, never an alternative payment/entitlement ledger. No UPDATE/DELETE runtime grant.
CREATE TABLE payroll_closure_members (
 closure_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 position INT UNSIGNED NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 outcome ENUM('paid','unclaimed') NOT NULL,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 PRIMARY KEY(closure_id,position),
 UNIQUE KEY uq_closure_scholar(closure_id,scholarship_id),
 UNIQUE KEY uq_closure_payment(closure_id,payment_id),
 FOREIGN KEY(closure_id) REFERENCES payroll_reconciliation_events(id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT,
 CHECK(position>0)
) ENGINE=InnoDB;
