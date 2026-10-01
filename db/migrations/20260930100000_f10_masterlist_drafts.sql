CREATE TABLE IF NOT EXISTS masterlist_versions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 academic_year_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 title VARCHAR(160) NOT NULL,
 status ENUM('draft') NOT NULL DEFAULT 'draft',
 version INT UNSIGNED NOT NULL DEFAULT 1,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_entries (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 snapshot JSON NOT NULL,
 award_number VARCHAR(60) NULL,
 removed_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_masterlist_scholar (masterlist_id,scholar_id),
 UNIQUE KEY uq_masterlist_award (masterlist_id,award_number),
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_versions(id) ON DELETE RESTRICT,
 FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS masterlist_commands (
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 masterlist_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 resulting_version INT UNSIGNED NOT NULL,
 PRIMARY KEY (actor_id,command_id),
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY (masterlist_id) REFERENCES masterlist_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
