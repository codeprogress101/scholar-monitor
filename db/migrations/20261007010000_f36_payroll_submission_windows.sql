-- Checkpoint A: setup only; no deadlines inferred for legacy batches and no financial activation.
CREATE TABLE IF NOT EXISTS regular_payout_periods (
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 term_number TINYINT UNSIGNED NOT NULL,
 semester_version INT UNSIGNED NOT NULL,
 year_version INT UNSIGNED NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_regular_year_term(academic_year_id,term_number),
 CHECK(term_number IN (1,2)),
 FOREIGN KEY(cycle_id,semester_id) REFERENCES payout_cycles(id,semester_id) ON DELETE RESTRICT,
 FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS semester_submission_versions (
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 deadline_on DATE NOT NULL,
 action ENUM('configure','extend') NOT NULL,
 previous_deadline_on DATE NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(cycle_id,revision),
 CHECK(revision>0),
 CHECK((action='configure' AND revision=1 AND previous_deadline_on IS NULL) OR (action='extend' AND revision>1 AND deadline_on>previous_deadline_on)),
 FOREIGN KEY(cycle_id) REFERENCES regular_payout_periods(cycle_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_submission_windows (
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_number INT UNSIGNED NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_window_sequence(cycle_id,batch_number),
 UNIQUE KEY uq_window_cycle(batch_id,cycle_id),
 CHECK(batch_number>0),
 FOREIGN KEY(batch_id) REFERENCES ovr_batches(id) ON DELETE RESTRICT,
 FOREIGN KEY(cycle_id) REFERENCES regular_payout_periods(cycle_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_submission_window_versions (
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 semester_deadline_revision INT UNSIGNED NOT NULL,
 opens_on DATE NOT NULL,
 cutoff_on DATE NOT NULL,
 previous_cutoff_on DATE NULL,
 action ENUM('open','extend') NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(batch_id,revision),
 CHECK(revision>0 AND cutoff_on>=opens_on),
 CHECK((action='open' AND revision=1 AND previous_cutoff_on IS NULL) OR (action='extend' AND revision>1 AND cutoff_on>previous_cutoff_on)),
 FOREIGN KEY(batch_id,cycle_id) REFERENCES payroll_submission_windows(batch_id,cycle_id) ON DELETE RESTRICT,
 FOREIGN KEY(cycle_id,semester_deadline_revision) REFERENCES semester_submission_versions(cycle_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('payroll.windows.manage','Configure regular payout periods and submission windows','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('coordinator','payroll.windows.manage');
