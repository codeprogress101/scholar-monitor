CREATE TABLE IF NOT EXISTS requirement_definitions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 code VARCHAR(40) NOT NULL UNIQUE,
 created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_definition_versions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 definition_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 name VARCHAR(160) NOT NULL,
 instructions VARCHAR(2000) NOT NULL,
 applies_to ENUM('semester','payout') NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 semester_code VARCHAR(60) NULL,
 semester_name VARCHAR(160) NULL,
 effective_from DATE NOT NULL,
 effective_until DATE NULL,
 active BOOLEAN NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_revision(definition_id,revision),
 UNIQUE KEY uq_requirement_date(definition_id,effective_from),
 FOREIGN KEY(definition_id) REFERENCES requirement_definitions(id) ON DELETE RESTRICT,
 FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision > 0),
 CHECK(effective_until IS NULL OR effective_until > effective_from),
 CHECK(active IN (0,1)),
 CHECK((semester_id IS NULL AND semester_code IS NULL AND semester_name IS NULL) OR (semester_id IS NOT NULL AND semester_code IS NOT NULL AND semester_name IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_definition_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
