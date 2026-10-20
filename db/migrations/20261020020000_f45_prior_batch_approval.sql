-- Prior decisions are evidence, not fabricated individual findings or receipts.
CREATE TABLE prior_batch_approvals (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 authority_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 approval_on DATE NULL,
 deadline_on DATE NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 source_location VARCHAR(500) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_prior_batch_revision(import_job_id,semester_id,revision),
 FOREIGN KEY(import_job_id) REFERENCES import_jobs(id),
 FOREIGN KEY(semester_id) REFERENCES semesters(id),
 FOREIGN KEY(authority_version_id) REFERENCES workflow_authority_versions(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE prior_batch_members (
 approval_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 review_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 snapshot JSON NOT NULL,
 PRIMARY KEY(approval_id,scholar_semester_id),
 FOREIGN KEY(approval_id) REFERENCES prior_batch_approvals(id),
 FOREIGN KEY(scholar_semester_id) REFERENCES scholar_semesters(id),
 FOREIGN KEY(review_event_id,scholar_semester_id) REFERENCES semester_review_events(id,scholar_semester_id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE prior_batch_documents (
 approval_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 decision_version INT UNSIGNED NOT NULL,
 retained_individual BOOLEAN NOT NULL,
 PRIMARY KEY(approval_id,instance_id),
 FOREIGN KEY(approval_id,scholar_semester_id) REFERENCES prior_batch_members(approval_id,scholar_semester_id),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE prior_batch_waiver_corrections (
 approval_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 waiver_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 PRIMARY KEY(approval_id,waiver_id),
 UNIQUE KEY uq_prior_waiver_correction(waiver_id),
 FOREIGN KEY(approval_id,instance_id) REFERENCES prior_batch_documents(approval_id,instance_id),
 FOREIGN KEY(waiver_id) REFERENCES requirement_waivers(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE historical_payout_setups (
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 deadline_on DATE NOT NULL,
 reported_release_on DATE NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(cycle_id,revision),
 UNIQUE KEY uq_historical_payout_batch(batch_id),
 FOREIGN KEY(cycle_id) REFERENCES regular_payout_periods(cycle_id),
 FOREIGN KEY(import_job_id) REFERENCES import_jobs(id),
 FOREIGN KEY(batch_id) REFERENCES payroll_submission_windows(batch_id),
 FOREIGN KEY(actor_id) REFERENCES users(id),
 CHECK(reported_release_on>=deadline_on)
) ENGINE=InnoDB;
