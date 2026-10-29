-- P04: unpaid preparation evidence only. No Paid ledger or entitlement creation.
CREATE TABLE individual_payment_transactions (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 replacement_of CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 internal_reference VARCHAR(60) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 request_entitlement CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(replacement_of IS NULL,entitlement_id,NULL)) VIRTUAL,
 UNIQUE KEY uq_individual_request(request_entitlement),
 UNIQUE KEY uq_individual_owner(id,entitlement_id),
 KEY ix_individual_entitlement(entitlement_id,recorded_at),
 FOREIGN KEY(entitlement_id) REFERENCES semester_entitlements(id) ON DELETE RESTRICT,
 FOREIGN KEY(source_payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(source_batch_id) REFERENCES ovr_finalizations(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(request_transaction_id,entitlement_id) REFERENCES individual_payment_transactions(id,entitlement_id) ON DELETE RESTRICT,
 FOREIGN KEY(replacement_of,entitlement_id) REFERENCES individual_payment_transactions(id,entitlement_id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK((replacement_of IS NULL AND request_transaction_id IS NULL) OR (replacement_of IS NOT NULL AND request_transaction_id IS NOT NULL))
) ENGINE=InnoDB;
-- statement-break
CREATE TABLE individual_payment_events (
 transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 revision INT UNSIGNED NOT NULL,
 action ENUM('request_recorded','prepared','cancel_requested','cancel_rejected','cancelled','original_paid_cancelled') NOT NULL,
 snapshot JSON NOT NULL,
 snapshot_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 PRIMARY KEY(transaction_id,revision),
 FOREIGN KEY(transaction_id) REFERENCES individual_payment_transactions(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(revision>0)
) ENGINE=InnoDB;
-- statement-break
-- Only the active pointer is mutable. Every change has an immutable domain event
-- and journal/audit in the same guarded transaction. No runtime DELETE grant.
CREATE TABLE entitlement_payment_routes (
 entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
 event_transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_revision INT UNSIGNED NOT NULL,
 FOREIGN KEY(entitlement_id) REFERENCES semester_entitlements(id) ON DELETE RESTRICT,
 FOREIGN KEY(transaction_id,entitlement_id) REFERENCES individual_payment_transactions(id,entitlement_id) ON DELETE RESTRICT,
 FOREIGN KEY(event_transaction_id,entitlement_id) REFERENCES individual_payment_transactions(id,entitlement_id) ON DELETE RESTRICT,
 FOREIGN KEY(event_transaction_id,event_revision) REFERENCES individual_payment_events(transaction_id,revision) ON DELETE RESTRICT,
 CHECK(transaction_id IS NULL OR transaction_id=event_transaction_id)
) ENGINE=InnoDB;
