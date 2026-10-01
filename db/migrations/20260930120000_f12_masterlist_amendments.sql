CREATE TABLE IF NOT EXISTS masterlist_amendments (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 kind VARCHAR(40) NOT NULL,
 before_value JSON NOT NULL,
 after_value JSON NOT NULL,
 source_value JSON NOT NULL,
 effective_on DATE NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_publications(masterlist_id) ON DELETE RESTRICT,
 FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_amendment_decisions (
 amendment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 decision ENUM('approve','reject','cancel') NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 FOREIGN KEY (amendment_id) REFERENCES masterlist_amendments(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_amendment_versions (
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 root_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 amendment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 academic_change_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 UNIQUE KEY uq_amendment_parent(parent_id),
 UNIQUE KEY uq_amendment_publication(amendment_id),
 UNIQUE KEY uq_amendment_revision(root_id,revision),
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_publications(masterlist_id) ON DELETE RESTRICT,
 FOREIGN KEY (parent_id) REFERENCES masterlist_publications(masterlist_id) ON DELETE RESTRICT,
 FOREIGN KEY (root_id) REFERENCES masterlist_publications(masterlist_id) ON DELETE RESTRICT,
 FOREIGN KEY (amendment_id) REFERENCES masterlist_amendments(id) ON DELETE RESTRICT,
 FOREIGN KEY (academic_change_id) REFERENCES academic_changes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_amendment_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 amendment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 result JSON NOT NULL,
 PRIMARY KEY(actor_id,command_id),
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(amendment_id) REFERENCES masterlist_amendments(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
