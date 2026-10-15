-- Preserve existing participation facts while allowing published approval as provenance.
ALTER TABLE participations
  MODIFY entry_basis ENUM('new_applicant','continuing_baseline','official_masterlist') NOT NULL,
  DROP CONSTRAINT IF EXISTS CONSTRAINT_1,
  DROP CONSTRAINT IF EXISTS ck_participation_basis,
  ADD CONSTRAINT ck_participation_basis CHECK
    ((entry_basis='continuing_baseline' AND roster_entry_id IS NOT NULL)
      OR (entry_basis IN ('new_applicant','official_masterlist') AND roster_entry_id IS NULL));
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_deferrals (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_payroll_deferral(batch_id,scholarship_id,revision),
 CHECK(revision>0 AND CHAR_LENGTH(TRIM(reason))>=5),
 FOREIGN KEY(batch_id) REFERENCES payroll_submission_windows(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS payroll_allocations (
 entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 approved_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_payroll_allocation(batch_id,scholarship_id),
 FOREIGN KEY(entitlement_id) REFERENCES semester_entitlements(id) ON DELETE RESTRICT,
 FOREIGN KEY(batch_id) REFERENCES ovr_finalizations(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(approved_event_id,entitlement_id) REFERENCES semester_entitlement_events(id,entitlement_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- statement-break
-- One reviewed batch revision may snapshot many scholars. Existing entry rows are unchanged.
ALTER TABLE ovr_entries DROP PRIMARY KEY, ADD PRIMARY KEY(batch_id,batch_revision,scholarship_id);
