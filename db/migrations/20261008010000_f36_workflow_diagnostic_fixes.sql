-- Accepted continuing admission remains distinct from new-applicant selection.
-- Existing annual records and historical snapshots are not rewritten.
ALTER TABLE scholarship_records
  DROP CONSTRAINT ck_scholarship_status,
  DROP CONSTRAINT ck_operational_status,
  ADD COLUMN continuing_participation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD CONSTRAINT fk_annual_continuing FOREIGN KEY (continuing_participation_id,scholar_id) REFERENCES participations(id,scholar_id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_scholarship_status CHECK (status IN ('applicant','exam_passed','qualified','selected','not_selected','continuing')),
  ADD CONSTRAINT ck_annual_continuing CHECK ((status='continuing' AND continuing_participation_id IS NOT NULL) OR (status<>'continuing' AND continuing_participation_id IS NULL)),
  ADD CONSTRAINT ck_operational_status CHECK (
    (operational_status IS NULL AND status_version=0 AND status_effective_on IS NULL) OR
    (operational_status IN ('active','on_hold','suspended','graduated','dropped','withdrawn','disqualified','not_renewed') AND status_version>0 AND status_effective_on IS NOT NULL AND status IN ('selected','continuing')));
-- statement-break
-- Recheck changed context without inventing another physical receipt.
ALTER TABLE requirement_workflow_events
  DROP CONSTRAINT CONSTRAINT_2,
  DROP CONSTRAINT CONSTRAINT_3,
  ADD CONSTRAINT ck_requirement_workflow_edge CHECK (
    (action='send-for-verification' AND from_status IN ('submitted','resubmitted') AND to_status='for_verification') OR
    (action='verify' AND from_status IN ('for_verification','verified') AND to_status='verified') OR
    (action='return-for-correction' AND from_status IN ('for_verification','verified') AND to_status='for_correction') OR
    (action='resubmit' AND from_status='for_correction' AND to_status='resubmitted') OR
    (action='reject' AND from_status='for_verification' AND to_status='rejected')),
  ADD CONSTRAINT ck_requirement_correction_link CHECK (
    (from_status='verified' AND action IN ('return-for-correction','verify') AND correction_of IS NOT NULL) OR
    (from_status<>'verified' AND correction_of IS NULL));
