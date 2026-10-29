-- F56: original supplied wording, independent of academic references and F53 hashes.
CREATE TABLE scholar_intake_text_events (
 intake_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 previous_revision INT UNSIGNED NULL,
 before_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 action ENUM('registered','completed','corrected') NOT NULL,
 school_text VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
 course_text VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
 basis_intake_revision INT UNSIGNED NOT NULL,
 basis_intake_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_reference VARCHAR(300) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(intake_id,revision),
 UNIQUE KEY uq_intake_text_command(actor_id,command_id),
 FOREIGN KEY(intake_id) REFERENCES scholar_intakes(id) ON DELETE RESTRICT,
 FOREIGN KEY(intake_id,previous_revision) REFERENCES scholar_intake_text_events(intake_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT ck_intake_text_revision CHECK(revision>=1 AND basis_intake_revision>=1),
 CONSTRAINT ck_intake_text_predecessor CHECK((revision=1 AND previous_revision IS NULL AND before_hash IS NULL) OR (revision>1 AND previous_revision=revision-1 AND before_hash IS NOT NULL)),
 CONSTRAINT ck_intake_text_registered CHECK(action<>'registered' OR revision=1),
 CONSTRAINT ck_intake_text_school CHECK(school_text IS NULL OR CHAR_LENGTH(TRIM(school_text)) BETWEEN 1 AND 300),
 CONSTRAINT ck_intake_text_course CHECK(course_text IS NULL OR CHAR_LENGTH(TRIM(course_text)) BETWEEN 1 AND 300),
 CONSTRAINT ck_intake_text_evidence CHECK(CHAR_LENGTH(TRIM(source_reference))>=3 AND CHAR_LENGTH(TRIM(reason))>=5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TRIGGER scholar_intake_text_no_update BEFORE UPDATE ON scholar_intake_text_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Supplied text history is immutable';
-- statement-break
CREATE TRIGGER scholar_intake_text_no_delete BEFORE DELETE ON scholar_intake_text_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Supplied text history is immutable';
-- statement-break
ALTER TABLE annual_intake_commands MODIFY operation ENUM('register_new_identity','register_existing_identity','supplement_initial_details','correct_classification','record_supplied_text','correct_supplied_text') NOT NULL;
-- statement-break
UPDATE permissions SET label='Correct supplied annual intake facts' WHERE code='scholars.intakes.correct';
