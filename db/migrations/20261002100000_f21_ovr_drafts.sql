CREATE TABLE IF NOT EXISTS ovr_batches (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 code VARCHAR(60) NOT NULL,
 name VARCHAR(160) NOT NULL,
 created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_ovr_cycle_code(cycle_id,code),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS ovr_batch_events (
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 state VARCHAR(20) NOT NULL,
 action VARCHAR(30) NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 PRIMARY KEY(batch_id,revision),
 FOREIGN KEY(batch_id) REFERENCES ovr_batches(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0), CHECK(state IN ('draft','review','finalized','submitted','processed','closed'))
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS ovr_entries (
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_revision INT UNSIGNED NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(10) NOT NULL,
 evidence JSON NOT NULL,
 PRIMARY KEY(batch_id,batch_revision),
 KEY ix_ovr_membership(batch_id,scholarship_id,batch_revision),
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 CHECK(action IN ('add','remove'))
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS ovr_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
