CREATE TABLE IF NOT EXISTS academic_years (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  locked_at DATETIME(6) NULL,
  CONSTRAINT ck_dates CHECK (ends_on >= starts_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS semesters (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  locked_at DATETIME(6) NULL,
  CONSTRAINT ck_dates CHECK (ends_on >= starts_on),
  academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS barangays (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS schools (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS courses (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS system_settings (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  name VARCHAR(160) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_code (code),
  value_type VARCHAR(10) NOT NULL,
  setting_value VARCHAR(1000) NOT NULL,
  CONSTRAINT ck_setting_type CHECK (value_type IN ('text','date'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS configuration_guard (
  id TINYINT NOT NULL PRIMARY KEY,
  CONSTRAINT ck_single_guard CHECK (id=1)
) ENGINE=InnoDB;

-- statement-break
INSERT INTO configuration_guard (id) VALUES (1) ON DUPLICATE KEY UPDATE id=VALUES(id);
-- statement-break
CREATE TABLE IF NOT EXISTS configuration_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (actor_id,request_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
