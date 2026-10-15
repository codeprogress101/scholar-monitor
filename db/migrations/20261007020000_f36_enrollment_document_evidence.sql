-- B1 enrollment alternatives: append evidence, never relabel historical receipts.
CREATE TABLE IF NOT EXISTS requirement_document_evidence (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 receipt_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
 workflow_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
 document_type ENUM('cor','certificate_of_enrollment','cog') NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 CHECK((receipt_id IS NOT NULL AND workflow_event_id IS NULL) OR (receipt_id IS NULL AND workflow_event_id IS NOT NULL)),
 FOREIGN KEY(instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
 FOREIGN KEY(receipt_id) REFERENCES requirement_receipts(id) ON DELETE RESTRICT,
 FOREIGN KEY(workflow_event_id) REFERENCES requirement_workflow_events(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
