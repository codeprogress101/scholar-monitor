ALTER TABLE scholarship_records
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN IF NOT EXISTS status_version INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_effective_on DATE NULL,
  ADD CONSTRAINT IF NOT EXISTS ck_operational_status CHECK (
    (operational_status IS NULL AND status_version=0 AND status_effective_on IS NULL) OR
    (operational_status IS NOT NULL AND operational_status IN ('active','on_hold','suspended','graduated','dropped','withdrawn','disqualified','not_renewed') AND status_version>0 AND status_effective_on IS NOT NULL AND status='selected')
  );
-- statement-break
CREATE TABLE IF NOT EXISTS status_change_requests (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expected_version INT UNSIGNED NOT NULL,
  from_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  to_status VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind VARCHAR(10) NOT NULL,
  corrects_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  effective_on DATE NOT NULL,
  reason_code VARCHAR(60) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  FOREIGN KEY (scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (corrects_request_id) REFERENCES status_change_requests(id) ON DELETE RESTRICT,
  CONSTRAINT ck_status_request CHECK (expected_version>0 AND from_status<>to_status AND
    ((kind='change' AND corrects_request_id IS NULL AND
      ((from_status='active' AND to_status IN ('on_hold','suspended','graduated','dropped','withdrawn','disqualified','not_renewed')) OR
       (from_status IN ('on_hold','suspended') AND to_status IN ('active','graduated','dropped','withdrawn','disqualified','not_renewed')))) OR
     (kind='correction' AND corrects_request_id IS NOT NULL AND from_status IN ('graduated','dropped','withdrawn','disqualified','not_renewed') AND to_status IN ('active','on_hold','suspended')))),
  KEY ix_status_requests (scholarship_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS status_change_decisions (
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  decision VARCHAR(10) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_name VARCHAR(160) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  resulting_version INT UNSIGNED NULL,
  occurred_at DATETIME(6) NOT NULL,
  FOREIGN KEY (request_id) REFERENCES status_change_requests(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_status_decision CHECK ((decision='approve' AND resulting_version IS NOT NULL AND resulting_version>1) OR (decision IN ('reject','cancel') AND resulting_version IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS status_change_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  outcome VARCHAR(10) NOT NULL,
  PRIMARY KEY (actor_id,command_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (request_id) REFERENCES status_change_requests(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
