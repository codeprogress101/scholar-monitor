CREATE TABLE ovr_amendments (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version INT UNSIGNED NOT NULL,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_revision INT UNSIGNED NOT NULL,
 state VARCHAR(20) NOT NULL,
 snapshot JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 occurred_at DATETIME(6) NOT NULL,
 PRIMARY KEY(id,version),
 UNIQUE KEY uq_ovr_amendment_event(batch_id,batch_revision),
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK(state IN ('pending','approved','rejected')), CHECK(version IN (1,2))
) ENGINE=InnoDB;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('ovr.amendments.request','Request OVR amendments','Payouts'),('ovr.amendments.approve','Decide OVR amendments','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('staff','ovr.amendments.request'),('coordinator','ovr.amendments.request'),('coordinator','ovr.amendments.approve');
