-- Intake records preserve supplied information without granting admission or payment.
CREATE TABLE scholar_intakes (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 year_level VARCHAR(60) NOT NULL,
 classification ENUM('new','continuing') NOT NULL,
 supplied_details JSON NOT NULL,
 import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_row INT NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_intake_year (scholar_id,academic_year_id),
 FOREIGN KEY (scholar_id) REFERENCES scholars(id),
 FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
 FOREIGN KEY (school_id) REFERENCES schools(id),
 FOREIGN KEY (course_id) REFERENCES courses(id),
 FOREIGN KEY (import_job_id) REFERENCES import_jobs(id),
 FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TRIGGER scholar_intakes_no_update BEFORE UPDATE ON scholar_intakes FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Intake provenance is immutable';
-- statement-break
CREATE TRIGGER scholar_intakes_no_delete BEFORE DELETE ON scholar_intakes FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Intake provenance is immutable';
