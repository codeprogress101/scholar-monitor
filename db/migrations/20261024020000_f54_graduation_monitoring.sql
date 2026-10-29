-- F54: approved AP1-AP4; append-only monitoring evidence, never standing or financial authority.
CREATE TABLE program_duration_references (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY, school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, created_at DATETIME(6) NOT NULL,
 KEY ix_duration_owner(school_id,course_id,id),FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE program_duration_events (
 reference_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, revision INT UNSIGNED NOT NULL, previous_revision INT UNSIGNED NULL,
 before_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL, snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action ENUM('submit','confirm','reject','withdraw','propose_correction','dispute','retire') NOT NULL, state ENUM('proposed','confirmed','rejected','withdrawn','disputed','retired') NOT NULL,
 scope_kind ENUM('all','curriculum','cohort','curriculum_cohort') NOT NULL,
 curriculum_code VARCHAR(80) COLLATE utf8mb4_bin NULL, cohort_code VARCHAR(80) COLLATE utf8mb4_bin NULL,
 applies_from_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, applies_through_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, review_academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 duration_years DECIMAL(4,2) NULL, final_year_level SMALLINT UNSIGNED NULL,
 level_basis ENUM('annual_year_number','no_annual_mapping') NOT NULL,
 source_type ENUM('official_curriculum','official_program_notice','official_school_confirmation') NOT NULL,
 source_issuer VARCHAR(160) NOT NULL, source_reference VARCHAR(300) NOT NULL, source_location VARCHAR(300) NULL, source_issued_on DATE NULL,
 scope_dates_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, snapshot JSON NOT NULL,
 reason VARCHAR(500) NOT NULL, actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(reference_id,revision),UNIQUE KEY uq_duration_command(actor_id,command_id,reference_id),KEY ix_duration_state(state,reference_id,revision),
 FOREIGN KEY (reference_id) REFERENCES program_duration_references(id) ON DELETE RESTRICT,FOREIGN KEY (reference_id,previous_revision) REFERENCES program_duration_events(reference_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY (applies_from_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,FOREIGN KEY (applies_through_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,FOREIGN KEY (review_academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK (revision>=1 AND ((revision=1 AND previous_revision IS NULL AND before_hash IS NULL AND action='submit') OR (revision>1 AND previous_revision IS NOT NULL AND before_hash IS NOT NULL AND previous_revision=revision-1 AND before_hash REGEXP '^[0-9a-f]{64}$' AND action<>'submit'))),
 CHECK(snapshot_hash REGEXP '^[0-9a-f]{64}$' AND scope_dates_hash REGEXP '^[0-9a-f]{64}$'),
 CHECK((scope_kind='all' AND curriculum_code IS NULL AND cohort_code IS NULL) OR (scope_kind='curriculum' AND curriculum_code IS NOT NULL AND cohort_code IS NULL) OR (scope_kind='cohort' AND curriculum_code IS NULL AND cohort_code IS NOT NULL) OR (scope_kind='curriculum_cohort' AND curriculum_code IS NOT NULL AND cohort_code IS NOT NULL)),
 CHECK((curriculum_code IS NULL OR CHAR_LENGTH(TRIM(curriculum_code))>=1) AND (cohort_code IS NULL OR CHAR_LENGTH(TRIM(cohort_code))>=1)),
 CHECK(duration_years IS NULL OR duration_years>0), CHECK(state<>'confirmed' OR duration_years IS NOT NULL),
 CHECK((level_basis='no_annual_mapping' AND final_year_level IS NULL) OR (level_basis='annual_year_number' AND final_year_level IS NOT NULL AND final_year_level BETWEEN 1 AND 100)),
 CHECK(CHAR_LENGTH(TRIM(reason))>=5 AND CHAR_LENGTH(TRIM(source_reference))>=3 AND CHAR_LENGTH(TRIM(source_issuer))>=2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE graduation_monitoring_cases (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY, scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 scope_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (COALESCE(semester_id,'00000000-0000-0000-0000-000000000000')) STORED,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_graduation_owner(scholar_id,academic_year_id,scope_key),KEY ix_graduation_scope(academic_year_id,scope_key,scholar_id,id),
 FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(semester_id IS NULL OR semester_id<>'00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE graduation_monitoring_events (
 case_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, revision INT UNSIGNED NOT NULL, previous_revision INT UNSIGNED NULL,
 before_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,event_kind ENUM('record_expected','record_delayed','follow_up','flag_review','propose_correction','review_correction','correct_assessment','revalidate_assessment','record_program_context','review_program_context') NOT NULL,
 assessment_kind ENUM('none','expected','delayed','needs_review') NOT NULL,assessment_revision INT UNSIGNED NULL,
 review_required BOOLEAN NOT NULL,pending_review_revision INT UNSIGNED NULL,
 program_context_state ENUM('none','proposed','confirmed','disputed') NOT NULL,program_context_revision INT UNSIGNED NULL,
 curriculum_code VARCHAR(80) COLLATE utf8mb4_bin NULL,cohort_code VARCHAR(80) COLLATE utf8mb4_bin NULL,
 placement_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,duration_reference_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,duration_revision INT UNSIGNED NULL,duration_snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 corrects_revision INT UNSIGNED NULL,reviews_revision INT UNSIGNED NULL,snapshot JSON NOT NULL,
 source_reference VARCHAR(300) NOT NULL,reason VARCHAR(500) NOT NULL,actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(case_id,revision),UNIQUE KEY uq_monitoring_command(actor_id,command_id,case_id),
 KEY ix_monitoring_assessment(assessment_kind,case_id,revision),KEY ix_monitoring_review(review_required,case_id,revision),
 FOREIGN KEY (case_id) REFERENCES graduation_monitoring_cases(id) ON DELETE RESTRICT,FOREIGN KEY (case_id,previous_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY (case_id,assessment_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,FOREIGN KEY (case_id,pending_review_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,FOREIGN KEY (case_id,program_context_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY (case_id,corrects_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,FOREIGN KEY (case_id,reviews_revision) REFERENCES graduation_monitoring_events(case_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY (duration_reference_id,duration_revision) REFERENCES program_duration_events(reference_id,revision) ON DELETE RESTRICT,FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>=1 AND ((revision=1 AND previous_revision IS NULL AND before_hash IS NULL) OR (revision>1 AND previous_revision IS NOT NULL AND before_hash IS NOT NULL AND previous_revision=revision-1 AND before_hash REGEXP '^[0-9a-f]{64}$'))),
 CHECK(snapshot_hash REGEXP '^[0-9a-f]{64}$'), CHECK(review_required IN(0,1)),
 CHECK(assessment_revision IS NULL OR assessment_revision BETWEEN 1 AND revision),CHECK(pending_review_revision IS NULL OR pending_review_revision BETWEEN 1 AND revision),CHECK(program_context_revision IS NULL OR program_context_revision BETWEEN 1 AND revision),
 CHECK(corrects_revision IS NULL OR corrects_revision BETWEEN 1 AND revision-1),CHECK(reviews_revision IS NULL OR reviews_revision BETWEEN 1 AND revision-1),
 CHECK((duration_reference_id IS NULL AND duration_revision IS NULL AND duration_snapshot_hash IS NULL) OR (duration_reference_id IS NOT NULL AND duration_revision IS NOT NULL AND duration_snapshot_hash IS NOT NULL AND duration_revision>=1 AND duration_snapshot_hash REGEXP '^[0-9a-f]{64}$')),
 CHECK(CHAR_LENGTH(TRIM(reason))>=5 AND CHAR_LENGTH(TRIM(source_reference))>=3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE graduation_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,operation VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 duration_reference_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,monitoring_case_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,resulting_revision INT UNSIGNED NOT NULL,result JSON NOT NULL,response_status SMALLINT NOT NULL,recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(actor_id,command_id),FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,FOREIGN KEY (duration_reference_id) REFERENCES program_duration_references(id) ON DELETE RESTRICT,FOREIGN KEY (monitoring_case_id) REFERENCES graduation_monitoring_cases(id) ON DELETE RESTRICT,
 CHECK((duration_reference_id IS NULL)<>(monitoring_case_id IS NULL)),CHECK(resulting_revision>=1 AND response_status IN(200,201)),
 CHECK(payload_hash REGEXP '^[0-9a-f]{64}$'),CHECK(operation IN('duration.create','duration.confirm','duration.reject','duration.withdraw','duration.propose_correction','duration.dispute','duration.retire','monitoring.create.record_expected','monitoring.create.record_delayed','monitoring.create.follow_up','monitoring.create.flag_review','monitoring.create.record_program_context','monitoring.event.record_expected','monitoring.event.record_delayed','monitoring.event.follow_up','monitoring.event.flag_review','monitoring.event.propose_correction','monitoring.event.review_correction','monitoring.event.correct_assessment','monitoring.event.revalidate_assessment','monitoring.event.record_program_context','monitoring.event.review_program_context'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TRIGGER program_duration_references_no_update BEFORE UPDATE ON program_duration_references FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER program_duration_references_no_delete BEFORE DELETE ON program_duration_references FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER program_duration_events_no_update BEFORE UPDATE ON program_duration_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER program_duration_events_no_delete BEFORE DELETE ON program_duration_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_monitoring_cases_no_update BEFORE UPDATE ON graduation_monitoring_cases FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_monitoring_cases_no_delete BEFORE DELETE ON graduation_monitoring_cases FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_monitoring_events_no_update BEFORE UPDATE ON graduation_monitoring_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_monitoring_events_no_delete BEFORE DELETE ON graduation_monitoring_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_commands_no_update BEFORE UPDATE ON graduation_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
CREATE TRIGGER graduation_commands_no_delete BEFORE DELETE ON graduation_commands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Graduation evidence and command history are immutable';
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('program.duration.prepare','Prepare program-duration evidence','Graduation monitoring'),('program.duration.confirm','Confirm program-duration evidence','Graduation monitoring'),('graduation.monitoring.record','Record graduation monitoring evidence','Graduation monitoring'),('graduation.monitoring.review','Review graduation monitoring corrections','Graduation monitoring');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('staff','program.duration.prepare'),('coordinator','program.duration.prepare'),('coordinator','program.duration.confirm'),('staff','graduation.monitoring.record'),('coordinator','graduation.monitoring.record'),('coordinator','graduation.monitoring.review');
