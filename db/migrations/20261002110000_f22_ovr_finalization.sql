CREATE TABLE IF NOT EXISTS ovr_finalizations (
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 batch_revision INT UNSIGNED NOT NULL,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 entry_count INT UNSIGNED NOT NULL,
 finalized_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 finalized_at DATETIME(6) NOT NULL,
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(finalized_by) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(entry_count>0)
) ENGINE=InnoDB;
