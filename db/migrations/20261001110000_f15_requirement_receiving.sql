CREATE TABLE IF NOT EXISTS requirement_receipts (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 received_on DATE NOT NULL,
 physical_reference VARCHAR(300) NULL,
 storage_location VARCHAR(300) NOT NULL,
 remarks VARCHAR(1000) NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_initial_requirement_receipt(instance_id),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_receipt_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
