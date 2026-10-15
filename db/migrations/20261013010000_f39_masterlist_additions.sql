CREATE TABLE masterlist_revisions (
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 root_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT NOT NULL,
 kind VARCHAR(20) NOT NULL,
 UNIQUE KEY uq_masterlist_revision(root_id,revision),
 FOREIGN KEY(masterlist_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(parent_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(root_id) REFERENCES masterlist_versions(id)
) ENGINE=InnoDB;
-- statement-break
INSERT INTO masterlist_revisions(masterlist_id,parent_id,root_id,revision,kind)
SELECT masterlist_id,parent_id,root_id,revision,'amendment' FROM masterlist_amendment_versions;
-- statement-break
CREATE TABLE masterlist_addition_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 draft_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 resulting_version INT NOT NULL,
 target_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 action VARCHAR(20) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_addition_version(draft_id,resulting_version),
 FOREIGN KEY(draft_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(target_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
