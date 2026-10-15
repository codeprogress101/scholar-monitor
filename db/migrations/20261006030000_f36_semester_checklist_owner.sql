-- Compatibility bridge only. No backfill, scope activation or receipt creation.
ALTER TABLE scholar_semesters
 ADD UNIQUE KEY IF NOT EXISTS uq_scholar_semester_period(id,semester_id);
-- statement-break
ALTER TABLE requirement_checklists
 MODIFY COLUMN scholarship_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN IF NOT EXISTS scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD UNIQUE KEY IF NOT EXISTS uq_requirement_semester_owner(scholar_semester_id,context_key),
 ADD CONSTRAINT fk_requirement_semester_owner FOREIGN KEY IF NOT EXISTS (scholar_semester_id,semester_id) REFERENCES scholar_semesters(id,semester_id) ON DELETE RESTRICT,
 ADD CONSTRAINT IF NOT EXISTS ck_requirement_one_owner CHECK ( (scholarship_record_id IS NOT NULL AND scholar_semester_id IS NULL) OR (scholarship_record_id IS NULL AND scholar_semester_id IS NOT NULL) ),
 ADD CONSTRAINT IF NOT EXISTS ck_requirement_semester_no_payout CHECK (scholar_semester_id IS NULL OR payout_cycle_id IS NULL);
