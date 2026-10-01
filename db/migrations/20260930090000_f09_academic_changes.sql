CREATE TABLE IF NOT EXISTS academic_changes (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  academic_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expected_version INT UNSIGNED NOT NULL,
  kind ENUM('course_shift','school_transfer','both','year_level_correction') NOT NULL,
  before_value JSON NOT NULL,
  after_value JSON NOT NULL,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  effective_on DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  remarks VARCHAR(1000) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  KEY ix_academic_change_record (academic_record_id,created_at),
  FOREIGN KEY (academic_record_id) REFERENCES academic_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS academic_change_decisions (
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  academic_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  decision ENUM('approve','reject','cancel') NOT NULL,
  resulting_version INT UNSIGNED NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_academic_revision (academic_record_id,resulting_version),
  FOREIGN KEY (request_id) REFERENCES academic_changes(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_record_id) REFERENCES academic_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_academic_decision_version CHECK ((decision='approve' AND resulting_version IS NOT NULL AND resulting_version>0) OR (decision<>'approve' AND resulting_version IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS academic_change_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  PRIMARY KEY (actor_id,command_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (request_id) REFERENCES academic_changes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions (code,label,category) VALUES ('academic.changes.approve','Approve academic placement changes','Academic records');
-- statement-break
INSERT INTO role_permissions (role_code,permission_code) VALUES ('coordinator','academic.changes.approve');
