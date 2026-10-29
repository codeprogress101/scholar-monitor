-- Preserve all earlier admission events; add an explicit external-validation edge.
ALTER TABLE qualification_events DROP CONSTRAINT ck_qualification_edge,
 ADD CONSTRAINT ck_qualification_edge CHECK (
   (action='create' AND from_status IS NULL AND to_status='applicant' AND resulting_version=1) OR
   (action='exam-passed' AND from_status IS NOT NULL AND from_status='applicant' AND to_status='exam_passed' AND resulting_version>1) OR
   (action='qualify' AND from_status IS NOT NULL AND from_status='exam_passed' AND to_status='qualified' AND resulting_version>1) OR
   (action='validate' AND from_status IS NOT NULL AND from_status IN ('applicant','exam_passed') AND to_status='qualified' AND resulting_version>1) OR
   (action='select' AND from_status IS NOT NULL AND from_status='qualified' AND to_status='selected' AND resulting_version>1) OR
   (action='not-select' AND from_status IS NOT NULL AND from_status IN ('applicant','exam_passed','qualified') AND to_status='not_selected' AND resulting_version>1)
 );
-- statement-break
-- Append-only correction evidence. No fictional payment or alteration of the original confirmation.
CREATE TABLE IF NOT EXISTS graduation_record_corrections (
 request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 graduated_before_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 no_outstanding_stipend BOOLEAN NOT NULL CHECK (no_outstanding_stipend=1),
 operator_reference VARCHAR(300) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 FOREIGN KEY(request_id) REFERENCES graduation_confirmations(request_id) ON DELETE RESTRICT,
 FOREIGN KEY(graduated_before_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
