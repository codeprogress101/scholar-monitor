-- No office policy is seeded by this migration. Existing windows keep full days.
CREATE TABLE IF NOT EXISTS payroll_cutoff_rule_versions (
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 permitted_times LONGTEXT NOT NULL,
 valid_from DATE NOT NULL,
 valid_through DATE NOT NULL,
 time_zone VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 boundary_rule VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 authority_reference VARCHAR(500) NOT NULL,
 source_location VARCHAR(500) NOT NULL,
 approved_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 approved_at DATETIME(6) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(cycle_id,revision),
 CHECK(revision>0 AND valid_from<=valid_through),
 CHECK(OCTET_LENGTH(permitted_times)<=2048 AND JSON_VALID(permitted_times) AND JSON_TYPE(permitted_times)='ARRAY' AND JSON_LENGTH(permitted_times) BETWEEN 1 AND 48),
 CHECK(time_zone='Asia/Manila' AND boundary_rule='inclusive_microsecond_v1'),
 CHECK(CHAR_LENGTH(authority_reference)>=5 AND CHAR_LENGTH(source_location)>=5),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TRIGGER IF NOT EXISTS preserve_payroll_cutoff_rule_update BEFORE UPDATE ON payroll_cutoff_rule_versions
 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Recorded cutoff rules are immutable; preserve history';
-- statement-break
CREATE TRIGGER IF NOT EXISTS preserve_payroll_cutoff_rule_delete BEFORE DELETE ON payroll_cutoff_rule_versions
 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Recorded cutoff rules are immutable; preserve history';
-- statement-break
ALTER TABLE payroll_submission_window_versions
 ADD COLUMN IF NOT EXISTS cutoff_policy VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'whole_day_v1',
 ADD COLUMN IF NOT EXISTS cutoff_local_time TIME(6) NULL,
 ADD COLUMN IF NOT EXISTS cutoff_time_zone VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'Asia/Manila',
 ADD COLUMN IF NOT EXISTS cutoff_at_utc DATETIME(6) NULL,
 ADD COLUMN IF NOT EXISTS cutoff_rule_revision INT UNSIGNED NULL,
 ADD COLUMN IF NOT EXISTS cutoff_rule_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;
-- statement-break
ALTER TABLE payroll_submission_window_versions
 ADD CONSTRAINT IF NOT EXISTS ck_window_cutoff_policy CHECK(
 cutoff_time_zone='Asia/Manila' AND (
 (cutoff_policy='whole_day_v1' AND cutoff_local_time IS NULL AND cutoff_at_utc IS NULL AND cutoff_rule_revision IS NULL AND cutoff_rule_hash IS NULL)
 OR (cutoff_policy IN ('manila_1700_v1','manila_time_v1') AND cutoff_local_time IS NOT NULL AND cutoff_local_time>='00:00:00' AND cutoff_local_time<'24:00:00' AND SECOND(cutoff_local_time)=0 AND MICROSECOND(cutoff_local_time)=0 AND (cutoff_policy<>'manila_1700_v1' OR cutoff_local_time='17:00:00') AND cutoff_at_utc IS NOT NULL AND cutoff_at_utc=TIMESTAMP(cutoff_on,cutoff_local_time)-INTERVAL 8 HOUR AND cutoff_rule_revision IS NOT NULL AND cutoff_rule_hash IS NOT NULL))),
 ADD FOREIGN KEY IF NOT EXISTS fk_window_cutoff_rule(cycle_id,cutoff_rule_revision) REFERENCES payroll_cutoff_rule_versions(cycle_id,revision) ON DELETE RESTRICT;
