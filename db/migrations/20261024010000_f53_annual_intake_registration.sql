-- F53: supplied annual registration facts; never admission or financial approval.
-- applyMigrations performs ownership/compatibility preflight before this DDL.
ALTER TABLE scholar_intakes
 ADD COLUMN origin_kind ENUM('import','manual') NOT NULL DEFAULT 'import',
 ADD COLUMN source_reference VARCHAR(300) NULL DEFAULT NULL,
 MODIFY school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY year_level VARCHAR(60) NULL,
 MODIFY import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY source_row INT NULL,
 ADD KEY ix_intake_associated_year (academic_year_id,scholar_id),
 ADD CONSTRAINT ck_intake_classification CHECK (classification IN ('new','continuing')),
 ADD CONSTRAINT ck_intake_initial_year CHECK (year_level IS NULL OR CHAR_LENGTH(TRIM(year_level)) BETWEEN 1 AND 60),
 ADD CONSTRAINT ck_intake_origin CHECK (
  (origin_kind='import' AND import_job_id IS NOT NULL AND source_row IS NOT NULL AND source_row>=2 AND school_id IS NOT NULL AND year_level IS NOT NULL AND CHAR_LENGTH(TRIM(year_level)) BETWEEN 1 AND 60)
  OR (origin_kind='manual' AND import_job_id IS NULL AND source_row IS NULL AND source_reference IS NOT NULL AND CHAR_LENGTH(TRIM(source_reference)) BETWEEN 3 AND 300)
 );
-- statement-break
CREATE TABLE scholar_intake_revisions (
 intake_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 action ENUM('supplement_initial_details','correct_classification') NOT NULL,
 classification ENUM('new','continuing') NOT NULL,
 school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 year_level VARCHAR(60) NULL,
 before_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reason VARCHAR(500) NOT NULL,
 source_reference VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY (intake_id,revision),
 UNIQUE KEY uq_intake_revision_command (actor_id,command_id),
 FOREIGN KEY (intake_id) REFERENCES scholar_intakes(id) ON DELETE RESTRICT,
 FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
 FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT ck_intake_revision CHECK (revision>=2),
 CONSTRAINT ck_intake_revision_class CHECK (classification IN ('new','continuing')),
 CONSTRAINT ck_intake_revision_year CHECK (year_level IS NULL OR CHAR_LENGTH(TRIM(year_level)) BETWEEN 1 AND 60),
 CONSTRAINT ck_intake_revision_evidence CHECK (CHAR_LENGTH(TRIM(reason))>=5 AND CHAR_LENGTH(TRIM(source_reference))>=3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE annual_intake_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 operation ENUM('register_new_identity','register_existing_identity','supplement_initial_details','correct_classification') NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 intake_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 resulting_revision INT UNSIGNED NOT NULL,
 result JSON NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY (actor_id,command_id),
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY (intake_id) REFERENCES scholar_intakes(id) ON DELETE RESTRICT,
 CONSTRAINT ck_annual_command_revision CHECK (resulting_revision>=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TRIGGER scholar_intake_revisions_no_update BEFORE UPDATE ON scholar_intake_revisions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Annual intake history is immutable';
-- statement-break
CREATE TRIGGER scholar_intake_revisions_no_delete BEFORE DELETE ON scholar_intake_revisions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Annual intake history is immutable';
-- statement-break
CREATE TRIGGER annual_intake_commands_no_update BEFORE UPDATE ON annual_intake_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Annual intake receipts are immutable';
-- statement-break
CREATE TRIGGER annual_intake_commands_no_delete BEFORE DELETE ON annual_intake_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Annual intake receipts are immutable';
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('scholars.intakes.correct','Correct supplied annual intake classification','Scholar records');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('coordinator','scholars.intakes.correct');
