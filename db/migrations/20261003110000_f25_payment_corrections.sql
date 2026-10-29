CREATE TABLE payment_corrections (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version INT UNSIGNED NOT NULL,
 payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_revision INT UNSIGNED NOT NULL,
 state VARCHAR(20) NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 PRIMARY KEY(id,version),
 UNIQUE KEY uq_payment_correction_event(batch_id,batch_revision),
 FOREIGN KEY(payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(state IN ('pending','applied','approved','rejected')), CHECK(version IN (1,2))
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('payments.correct','Correct payment outcomes and request closed-period corrections','Payouts'),('payments.corrections.approve','Decide closed-period payment corrections','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('staff','payments.correct'),('coordinator','payments.correct'),('coordinator','payments.corrections.approve');
