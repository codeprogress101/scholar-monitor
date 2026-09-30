CREATE TABLE IF NOT EXISTS scholarship_records (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  last_effective_on DATE NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_scholarship_year (scholar_id,academic_year_id),
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  CONSTRAINT ck_scholarship_status CHECK (status IN ('applicant','exam_passed','qualified','selected','not_selected')),
  CONSTRAINT ck_scholarship_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS qualification_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  from_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NULL,
  to_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  resulting_version INT UNSIGNED NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  effective_on DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_qualification_version (scholarship_id,resulting_version),
  FOREIGN KEY (scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_qualification_edge CHECK (
    (action='create' AND from_status IS NULL AND to_status='applicant' AND resulting_version=1) OR
    (action='exam-passed' AND from_status IS NOT NULL AND from_status='applicant' AND to_status='exam_passed' AND resulting_version>1) OR
    (action='qualify' AND from_status IS NOT NULL AND from_status='exam_passed' AND to_status='qualified' AND resulting_version>1) OR
    (action='select' AND from_status IS NOT NULL AND from_status='qualified' AND to_status='selected' AND resulting_version>1) OR
    (action='not-select' AND from_status IS NOT NULL AND from_status IN ('applicant','exam_passed','qualified') AND to_status='not_selected' AND resulting_version>1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS qualification_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  resulting_version INT UNSIGNED NOT NULL,
  resulting_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (actor_id,request_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
