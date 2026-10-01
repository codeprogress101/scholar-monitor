ALTER TABLE masterlist_versions MODIFY status ENUM('draft','for_verification','submitted_for_approval','approved','published','locked') NOT NULL DEFAULT 'draft';
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_workflow_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(40) NOT NULL,
 from_status VARCHAR(40) NOT NULL,
 to_status VARCHAR(40) NOT NULL,
 resulting_version INT UNSIGNED NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 snapshot JSON NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_masterlist_event (masterlist_id,resulting_version),
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_versions(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_publications (
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 effective_on DATE NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 published_at DATETIME(6) NOT NULL,
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_versions(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_activations (
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 effective_on DATE NOT NULL,
 activated_at DATETIME(6) NOT NULL,
 FOREIGN KEY (scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_publications(masterlist_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TRIGGER protect_masterlist_entry_insert BEFORE INSERT ON masterlist_entries FOR EACH ROW
BEGIN
 IF (SELECT status FROM masterlist_versions WHERE id=NEW.masterlist_id) <> 'draft' THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only draft entries may be inserted';
 END IF;
END;
-- statement-break
CREATE TRIGGER protect_masterlist_entry_update BEFORE UPDATE ON masterlist_entries FOR EACH ROW
BEGIN
 IF (SELECT status FROM masterlist_versions WHERE id=OLD.masterlist_id) <> 'draft' THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Submitted or official entries are immutable';
 END IF;
END;
-- statement-break
CREATE TRIGGER protect_masterlist_state BEFORE UPDATE ON masterlist_versions FOR EACH ROW
BEGIN
 IF OLD.status='locked' OR (OLD.status='published' AND NEW.status<>'locked') THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published masterlists can only be locked';
 END IF;
END;
