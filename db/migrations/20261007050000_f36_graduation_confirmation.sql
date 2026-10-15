-- Additive evidence only; existing graduation decisions remain unaltered.
CREATE TABLE IF NOT EXISTS graduation_confirmations (
 request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 FOREIGN KEY(request_id) REFERENCES status_change_decisions(request_id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
