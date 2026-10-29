-- New evidence is append-only; existing payment date values remain unchanged.
CREATE TABLE payroll_treasury_evidence (
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  payroll_reference VARCHAR(300) NOT NULL,
  office_received_on DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  PRIMARY KEY(batch_id, revision),
  FOREIGN KEY(batch_id) REFERENCES ovr_batches(id),
  FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
ALTER TABLE payment_records MODIFY effective_on DATE NULL;
-- statement-break
CREATE TABLE payroll_treasury_confirmations (
  payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_revision INT UNSIGNED NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  confirmed_at DATETIME(6) NOT NULL,
  historical_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  FOREIGN KEY(payment_id) REFERENCES payment_records(id),
  FOREIGN KEY(batch_id,evidence_revision) REFERENCES payroll_treasury_evidence(batch_id,revision),
  FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE payroll_historical_receipts (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version INT UNSIGNED NOT NULL,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  state ENUM('pending','approved','rejected') NOT NULL,
  snapshot LONGTEXT NOT NULL CHECK(JSON_VALID(snapshot)),
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  PRIMARY KEY(id,version),
  FOREIGN KEY(batch_id) REFERENCES ovr_batches(id),
  FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id),
  FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
