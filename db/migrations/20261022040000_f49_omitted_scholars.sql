-- P05: separate preparation control; never changes payout/academic/payment state.
CREATE TABLE payroll_preparation_versions (
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 state ENUM('open','closed') NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(cycle_id,revision),
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0)
) ENGINE=InnoDB;
-- statement-break
-- An absent source roster member is not a payment or entitlement.
CREATE TABLE payroll_omissions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_omission_identity(scholar_id,semester_id),
 UNIQUE KEY uq_omission_origin(id,source_batch_id),
 UNIQUE KEY uq_omission_owner(id,scholar_semester_id),
 FOREIGN KEY(scholarship_id,scholar_id) REFERENCES scholarship_records(id,scholar_id) ON DELETE RESTRICT,
 FOREIGN KEY(scholar_semester_id,scholar_id,semester_id) REFERENCES scholar_semesters(id,scholar_id,semester_id) ON DELETE RESTRICT,
 FOREIGN KEY(scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
 FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
 FOREIGN KEY(source_batch_id) REFERENCES ovr_finalizations(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE payroll_omission_events (
 omission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action ENUM('recorded','payroll_refreshed','requested','approved','rejected','prepared','cancel_requested','cancel_rejected','cancelled') NOT NULL,
 state ENUM('recorded','payroll','requested','approved','rejected','prepared','cancel_requested','cancelled') NOT NULL,
 destination_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 authorized_entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reason VARCHAR(500) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(omission_id,revision),
 UNIQUE KEY uq_omission_authorization(omission_id,revision,authorized_entitlement_id),
 KEY ix_omission_destination(destination_batch_id,omission_id),
 FOREIGN KEY(omission_id,scholar_semester_id) REFERENCES payroll_omissions(id,scholar_semester_id) ON DELETE RESTRICT,
 FOREIGN KEY(destination_batch_id) REFERENCES payroll_submission_windows(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(entitlement_id,scholar_semester_id) REFERENCES semester_entitlements(id,scholar_semester_id) ON DELETE RESTRICT,
 FOREIGN KEY(authorized_entitlement_id) REFERENCES semester_entitlements(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0),
 CHECK((action='approved' AND authorized_entitlement_id IS NOT NULL AND authorized_entitlement_id=entitlement_id) OR (action<>'approved' AND authorized_entitlement_id IS NULL))
) ENGINE=InnoDB;
-- statement-break
-- Preserve P04 source requirements with an explicit, independently constrained
-- omitted source. No payment rows, entitlements or omissions are backfilled.
ALTER TABLE individual_payment_transactions
 ADD COLUMN source_kind ENUM('unclaimed','omitted') NOT NULL DEFAULT 'unclaimed',
 ADD COLUMN omission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN approval_revision INT UNSIGNED NULL,
 MODIFY COLUMN source_payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY COLUMN request_entitlement CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(source_kind='unclaimed' AND replacement_of IS NULL,entitlement_id,NULL)) VIRTUAL,
 ADD COLUMN omission_request CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(source_kind='omitted' AND replacement_of IS NULL,omission_id,NULL)) VIRTUAL,
 ADD UNIQUE KEY uq_omission_individual_request(omission_request),
 ADD CONSTRAINT fk_individual_omission_approval FOREIGN KEY(omission_id,approval_revision,entitlement_id) REFERENCES payroll_omission_events(omission_id,revision,authorized_entitlement_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_individual_omission_origin FOREIGN KEY(omission_id,source_batch_id) REFERENCES payroll_omissions(id,source_batch_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_individual_source CHECK(
  (source_kind='unclaimed' AND source_payment_id IS NOT NULL AND omission_id IS NULL AND approval_revision IS NULL) OR
  (source_kind='omitted' AND source_payment_id IS NULL AND omission_id IS NOT NULL AND approval_revision IS NOT NULL)
 );
