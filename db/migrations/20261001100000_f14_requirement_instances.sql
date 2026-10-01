CREATE TABLE IF NOT EXISTS requirement_checklists (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 scholarship_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 policy_date DATE NOT NULL,
 year_code VARCHAR(60) NOT NULL,
 year_name VARCHAR(160) NOT NULL,
 semester_code VARCHAR(60) NOT NULL,
 semester_name VARCHAR(160) NOT NULL,
 semester_version INT UNSIGNED NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_checklist(scholarship_record_id,semester_id),
 FOREIGN KEY(scholarship_record_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(semester_version>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_instances (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 checklist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 definition_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 status ENUM('not_submitted') NOT NULL DEFAULT 'not_submitted',
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_instance(checklist_id,definition_version_id),
 FOREIGN KEY(checklist_id) REFERENCES requirement_checklists(id) ON DELETE RESTRICT,
 FOREIGN KEY(definition_version_id) REFERENCES requirement_definition_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_generation_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES('requirements.generate','Generate requirement checklists','Requirements');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES('staff','requirements.generate'),('coordinator','requirements.generate');
