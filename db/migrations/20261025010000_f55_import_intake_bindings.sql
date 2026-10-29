-- A2.1: append import source membership without changing annual root ownership.
CREATE TABLE import_intake_bindings (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 import_job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_row INT NOT NULL,
 intake_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 person_version INT UNSIGNED NOT NULL,
 intake_revision INT UNSIGNED NOT NULL,
 intake_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 raw_row_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 identity_reference VARCHAR(300) NOT NULL,
 binding_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_import_binding_row (import_job_id,source_row),
 UNIQUE KEY uq_import_binding_intake (import_job_id,intake_id),
 KEY ix_binding_intake (intake_id,recorded_at,id),
 FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE RESTRICT,
 FOREIGN KEY (intake_id) REFERENCES scholar_intakes(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT ck_import_binding_scope CHECK (source_row>=2 AND person_version>=1 AND intake_revision>=1),
 CONSTRAINT ck_import_binding_reference CHECK (CHAR_LENGTH(TRIM(identity_reference))>=3),
 CONSTRAINT ck_import_binding_hashes CHECK (intake_hash REGEXP '^[a-f0-9]{64}$' AND raw_row_hash REGEXP '^[a-f0-9]{64}$' AND binding_hash REGEXP '^[a-f0-9]{64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TRIGGER import_intake_bindings_no_update BEFORE UPDATE ON import_intake_bindings FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Import intake bindings are immutable';
-- statement-break
CREATE TRIGGER import_intake_bindings_no_delete BEFORE DELETE ON import_intake_bindings FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Import intake bindings are immutable';
