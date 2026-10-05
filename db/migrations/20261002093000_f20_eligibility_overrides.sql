CREATE TABLE IF NOT EXISTS eligibility_overrides (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 requester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 KEY ix_override_context(cycle_id,scholarship_id),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS eligibility_override_events (
 sequence BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 override_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 action VARCHAR(20) NOT NULL,
 state VARCHAR(20) NOT NULL,
 calculation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 snapshot JSON NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_override_revision(override_id,revision),
 FOREIGN KEY(override_id) REFERENCES eligibility_overrides(id) ON DELETE RESTRICT,
 FOREIGN KEY(calculation_id) REFERENCES payout_eligibility(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0),
 CHECK((action IN ('request','reevaluate') AND state='draft') OR (action='submit-review' AND state='pending') OR (action='approve' AND state='approved') OR (action='reject' AND state='rejected') OR (action='cancel' AND state='cancelled'))
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS eligibility_override_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
