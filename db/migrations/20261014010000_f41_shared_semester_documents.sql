-- Append-only provenance. No document, verification, policy or payment backfill.
CREATE TABLE semester_document_reconciliations (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 legacy_instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 evidence LONGTEXT NOT NULL CHECK (JSON_VALID(evidence)),
 reason VARCHAR(500) NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_document_reconciliation(legacy_instance_id,revision),
 FOREIGN KEY (scholar_semester_id) REFERENCES scholar_semesters(id) ON DELETE RESTRICT,
 FOREIGN KEY (legacy_instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY (source_instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
