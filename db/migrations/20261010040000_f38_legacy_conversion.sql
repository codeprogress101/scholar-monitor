CREATE TABLE payroll_legacy_conversions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 source_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 destination_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_hash CHAR(64) NOT NULL,
 snapshot LONGTEXT NOT NULL CHECK(JSON_VALID(snapshot)),
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 FOREIGN KEY(source_batch_id) REFERENCES ovr_batches(id),
 FOREIGN KEY(destination_batch_id) REFERENCES ovr_batches(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
