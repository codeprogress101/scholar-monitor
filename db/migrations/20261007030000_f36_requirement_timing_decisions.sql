-- B1: append-only, batch- and receipt-specific late-encoding decisions.
CREATE TABLE IF NOT EXISTS requirement_timing_decisions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 decision ENUM('approve','reject') NOT NULL,
 evidence_kind ENUM('receiving_log','dated_acknowledgment') NOT NULL,
 evidence_reference VARCHAR(500) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(200) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_timing_revision(instance_id,batch_id,revision),
 CHECK(revision>0),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(batch_id) REFERENCES payroll_submission_windows(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
