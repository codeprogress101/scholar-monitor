CREATE TABLE masterlist_consolidations (
 draft_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 source_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_version INT NOT NULL,
 source_hash CHAR(64) NOT NULL,
 target_version INT NOT NULL,
 target_hash CHAR(64) NOT NULL,
 FOREIGN KEY(draft_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(source_id) REFERENCES masterlist_versions(id)
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE masterlist_consolidation_links (
 source_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 successor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 FOREIGN KEY(source_id) REFERENCES masterlist_versions(id),
 FOREIGN KEY(successor_id) REFERENCES masterlist_versions(id)
) ENGINE=InnoDB;
