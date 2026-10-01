CREATE TABLE IF NOT EXISTS requirement_workflow_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version INT UNSIGNED NOT NULL,
 action ENUM('send-for-verification','verify','return-for-correction','resubmit','reject') NOT NULL,
 from_status VARCHAR(30) NOT NULL,
 to_status VARCHAR(30) NOT NULL,
 effective_on DATE NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 remarks VARCHAR(1000) NULL,
 correction_of CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 details JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_workflow_version(instance_id,version),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(correction_of) REFERENCES requirement_workflow_events(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(version>=2),
 CHECK((action='send-for-verification' AND from_status IN ('submitted','resubmitted') AND to_status='for_verification') OR (action='verify' AND from_status='for_verification' AND to_status='verified') OR (action='return-for-correction' AND from_status IN ('for_verification','verified') AND to_status='for_correction') OR (action='resubmit' AND from_status='for_correction' AND to_status='resubmitted') OR (action='reject' AND from_status='for_verification' AND to_status='rejected')),
 CHECK((from_status='verified' AND action='return-for-correction' AND correction_of IS NOT NULL) OR (from_status<>'verified' AND correction_of IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_workflow_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
