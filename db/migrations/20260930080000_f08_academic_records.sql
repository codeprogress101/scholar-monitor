CREATE TABLE IF NOT EXISTS academic_records (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  course_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  year_level VARCHAR(60) NOT NULL,
  year_code VARCHAR(60) NOT NULL,
  year_name VARCHAR(160) NOT NULL,
  school_code VARCHAR(60) NOT NULL,
  school_name VARCHAR(160) NOT NULL,
  course_code VARCHAR(60) NOT NULL,
  course_name VARCHAR(160) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_academic_scholar_year (scholar_id,academic_year_id),
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_academic_level CHECK (CHAR_LENGTH(TRIM(year_level))>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS academic_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  academic_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (actor_id,request_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_record_id) REFERENCES academic_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
