-- Preserve original payments; a later attempt belongs to a different frozen batch.
ALTER TABLE payment_records
 ADD COLUMN IF NOT EXISTS unpaid_reason ENUM('did_not_claim','withheld','review') NULL,
 ADD UNIQUE KEY IF NOT EXISTS uq_payment_batch_scholarship(batch_id,scholarship_id),
 ADD KEY IF NOT EXISTS ix_payment_cycle(cycle_id),
 DROP INDEX IF EXISTS uq_payment_cycle_scholarship;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_unpaid_classifications (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 unpaid_reason ENUM('did_not_claim','withheld','review') NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_unpaid_classification(payment_id,revision),
 FOREIGN KEY(payment_id) REFERENCES payment_records(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_draft_deferrals (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 action ENUM('defer','restore') NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_draft_deferral(batch_id,scholarship_id,revision),
 FOREIGN KEY(batch_id) REFERENCES ovr_batches(id),
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_reprocessing (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 root_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 FOREIGN KEY(payment_id) REFERENCES payment_records(id),
 FOREIGN KEY(root_batch_id) REFERENCES ovr_finalizations(batch_id),
 FOREIGN KEY(source_batch_id) REFERENCES ovr_finalizations(batch_id),
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id),
 FOREIGN KEY(semester_id) REFERENCES semesters(id),
 FOREIGN KEY(entitlement_id) REFERENCES semester_entitlements(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_reprocessing_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 reprocessing_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 destination_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_reprocessing_event(reprocessing_id,revision),
 FOREIGN KEY(reprocessing_id) REFERENCES payroll_reprocessing(id),
 FOREIGN KEY(destination_batch_id) REFERENCES ovr_batches(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_reprocessing_attempts (
 reprocessing_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_reprocessing_attempt(batch_id,scholarship_id),
 FOREIGN KEY(reprocessing_id) REFERENCES payroll_reprocessing(id),
 FOREIGN KEY(batch_id) REFERENCES ovr_finalizations(batch_id),
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
