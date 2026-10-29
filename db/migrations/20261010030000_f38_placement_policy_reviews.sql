-- No historical shift count is inferred or backfilled.
CREATE TABLE placement_policy_reviews (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  academic_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_hash CHAR(64) NOT NULL,
  proposal_hash CHAR(64) NOT NULL,
  snapshot LONGTEXT NOT NULL CHECK(JSON_VALID(snapshot)),
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  FOREIGN KEY(academic_record_id) REFERENCES academic_records(id),
  FOREIGN KEY(actor_id) REFERENCES users(id),
  INDEX placement_policy_lookup(academic_record_id,proposal_hash,source_hash)
) ENGINE=InnoDB;
