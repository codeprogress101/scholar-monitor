CREATE TABLE IF NOT EXISTS payout_eligibility (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 engine_version VARCHAR(40) NOT NULL,
 eligible BOOLEAN NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 assessment JSON NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 calculated_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_eligibility_revision(cycle_id,scholarship_id,revision),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0), CHECK(eligible IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS payout_eligibility_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES('eligibility.calculate','Calculate payout eligibility snapshots','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES('staff','eligibility.calculate'),('coordinator','eligibility.calculate');
