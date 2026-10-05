CREATE TABLE IF NOT EXISTS payout_cycles (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 code VARCHAR(60) NOT NULL UNIQUE,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 UNIQUE KEY uq_payout_period(id,semester_id),
 FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS payout_cycle_versions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version INT UNSIGNED NOT NULL,
 name VARCHAR(160) NOT NULL,
 target_date DATE NOT NULL,
 state ENUM('draft','open','locked','closed') NOT NULL,
 action ENUM('create','configure','open','lock','close') NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_payout_revision(cycle_id,version),
 UNIQUE KEY uq_payout_version_cycle(id,cycle_id),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(version>0),
 CHECK((action IN ('create','configure') AND state='draft') OR (action='open' AND state='open') OR (action='lock' AND state='locked') OR (action='close' AND state='closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS payout_requirements (
 cycle_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 definition_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 allow_waiver BOOLEAN NOT NULL,
 PRIMARY KEY(cycle_version_id,definition_version_id),
 FOREIGN KEY(cycle_version_id) REFERENCES payout_cycle_versions(id) ON DELETE RESTRICT,
 FOREIGN KEY(definition_version_id) REFERENCES requirement_definition_versions(id) ON DELETE RESTRICT,
 CHECK(allow_waiver IN (0,1))
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payout_cycle_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
ALTER TABLE requirement_checklists
 ADD COLUMN payout_cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN payout_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN context_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(payout_cycle_id IS NULL,CONCAT('S:',semester_id),CONCAT('P:',payout_cycle_id))) STORED,
 ADD KEY ix_requirement_annual(scholarship_record_id),
 ADD UNIQUE KEY uq_requirement_context(scholarship_record_id,context_key),
 ADD FOREIGN KEY(payout_cycle_id,semester_id) REFERENCES payout_cycles(id,semester_id) ON DELETE RESTRICT,
 ADD FOREIGN KEY(payout_version_id,payout_cycle_id) REFERENCES payout_cycle_versions(id,cycle_id) ON DELETE RESTRICT,
 ADD CHECK((payout_cycle_id IS NULL AND payout_version_id IS NULL) OR (payout_cycle_id IS NOT NULL AND payout_version_id IS NOT NULL)),
 DROP INDEX uq_requirement_checklist;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES('payouts.operate','Open, lock and close payout cycles','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES('coordinator','payouts.operate');
