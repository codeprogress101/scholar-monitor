-- Append-only reviewed alternative coverage; no historical evidence backfill.
ALTER TABLE requirement_document_evidence MODIFY document_type ENUM('cor','certificate_of_enrollment','cog','shs_grading_card') NOT NULL;
-- statement-break
CREATE TABLE entrant_grading_card_reviews (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 decision ENUM('approved','revoked') NOT NULL,
 issuing_school VARCHAR(200) NOT NULL,
 school_year VARCHAR(80) NOT NULL,
 grading_period VARCHAR(100) NOT NULL,
 period_end DATE NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 evidence LONGTEXT NOT NULL CHECK(JSON_VALID(evidence)),
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_entrant_card_revision(instance_id,revision),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
ALTER TABLE requirement_document_evidence
 ADD entrant_review_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD CONSTRAINT fk_document_entrant_review FOREIGN KEY(entrant_review_id) REFERENCES entrant_grading_card_reviews(id) ON DELETE RESTRICT;
