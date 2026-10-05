CREATE TABLE IF NOT EXISTS requirement_waivers (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version INT UNSIGNED NOT NULL,
 from_status VARCHAR(30) NOT NULL,
 effective_on DATE NOT NULL,
 reason VARCHAR(500) NOT NULL,
 authority_reference VARCHAR(300) NOT NULL,
 remarks VARCHAR(1000) NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_requirement_waiver_instance(instance_id),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(version>=1),
 CHECK(from_status IN ('not_submitted','submitted','for_verification','for_correction','resubmitted','rejected')),
 CHECK(CHAR_LENGTH(TRIM(reason))>=5),
 CHECK(CHAR_LENGTH(TRIM(authority_reference))>=3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_waiver_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
