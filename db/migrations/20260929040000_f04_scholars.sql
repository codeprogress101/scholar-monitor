CREATE TABLE IF NOT EXISTS scholars (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL,
  suffix VARCHAR(30) NOT NULL DEFAULT '',
  birth_date DATE NULL,
  academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  barangay_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE RESTRICT,
  KEY ix_scholar_name (last_name,first_name),
  CONSTRAINT ck_scholar_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_id_sequences (
  entry_year SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT ck_sequence_year CHECK (entry_year BETWEEN 1900 AND 9999),
  CONSTRAINT ck_sequence_number CHECK (last_number BETWEEN 0 AND 99999)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_identifiers (
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  entry_year SMALLINT UNSIGNED NOT NULL,
  sequence_no INT UNSIGNED NOT NULL,
  human_id VARCHAR(15) CHARACTER SET ascii COLLATE ascii_bin AS (CONCAT('LDSS-',entry_year,'-',LPAD(sequence_no,5,'0'))) PERSISTENT,
  UNIQUE KEY uq_human_id (human_id),
  UNIQUE KEY uq_year_number (entry_year,sequence_no),
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
  CONSTRAINT ck_identifier_year CHECK (entry_year BETWEEN 1900 AND 9999),
  CONSTRAINT ck_identifier_number CHECK (sequence_no BETWEEN 1 AND 99999)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_contacts (
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  address_line VARCHAR(300) NOT NULL DEFAULT '',
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  resulting_version INT UNSIGNED NOT NULL,
  PRIMARY KEY (actor_id,request_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
