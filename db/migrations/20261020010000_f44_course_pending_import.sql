-- A partial placement is explicit evidence, never a fabricated course reference.
CREATE TABLE course_pending_exceptions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_row INT NOT NULL,
 approval_reference VARCHAR(200) NOT NULL,
 effective_on DATE NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_course_pending_year (scholar_id,academic_year_id),
 FOREIGN KEY (scholar_id) REFERENCES scholars(id),
 FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
 FOREIGN KEY (import_job_id) REFERENCES import_jobs(id),
 FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE course_pending_events (
 exception_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT NOT NULL,
 action ENUM('authorized','completed') NOT NULL,
 evidence JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY (exception_id,revision),
 FOREIGN KEY (exception_id) REFERENCES course_pending_exceptions(id),
 FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
ALTER TABLE academic_records
 MODIFY course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY course_code VARCHAR(60) NULL,
 MODIFY course_name VARCHAR(160) NULL,
 ADD course_pending_exception_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD FOREIGN KEY (course_pending_exception_id) REFERENCES course_pending_exceptions(id),
 ADD CONSTRAINT ck_academic_course_source CHECK (
 (course_id IS NOT NULL AND course_code IS NOT NULL AND course_name IS NOT NULL AND course_pending_exception_id IS NULL)
 OR (course_id IS NULL AND course_code IS NULL AND course_name IS NULL AND course_pending_exception_id IS NOT NULL));
-- statement-break
ALTER TABLE academic_changes MODIFY kind ENUM('course_shift','school_transfer','both','year_level_correction','course_completion') NOT NULL;
-- statement-break
CREATE TRIGGER course_pending_exceptions_no_update BEFORE UPDATE ON course_pending_exceptions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course pending evidence is immutable';
-- statement-break
CREATE TRIGGER course_pending_exceptions_no_delete BEFORE DELETE ON course_pending_exceptions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course pending evidence is immutable';
-- statement-break
CREATE TRIGGER course_pending_events_no_update BEFORE UPDATE ON course_pending_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course pending history is immutable';
-- statement-break
CREATE TRIGGER course_pending_events_no_delete BEFORE DELETE ON course_pending_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course pending history is immutable';
