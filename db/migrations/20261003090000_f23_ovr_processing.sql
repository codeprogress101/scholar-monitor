CREATE TABLE IF NOT EXISTS payment_records (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 batch_revision INT UNSIGNED NOT NULL,
 cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 outcome VARCHAR(20) NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 effective_on DATE NOT NULL,
 reference_text VARCHAR(300) NOT NULL,
 remarks VARCHAR(1000) NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_name VARCHAR(160) NOT NULL,
 recorded_at DATETIME(6) NOT NULL,
 UNIQUE KEY uq_payment_cycle_scholarship(cycle_id,scholarship_id),
 UNIQUE KEY uq_payment_batch_revision(batch_id,batch_revision),
 FOREIGN KEY(batch_id) REFERENCES ovr_finalizations(batch_id) ON DELETE RESTRICT,
 FOREIGN KEY(batch_id,batch_revision) REFERENCES ovr_batch_events(batch_id,revision) ON DELETE RESTRICT,
 FOREIGN KEY(cycle_id) REFERENCES payout_cycles(id) ON DELETE RESTRICT,
 FOREIGN KEY(scholarship_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
 FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
 CHECK((outcome='paid' AND amount>0) OR (outcome='not_paid' AND amount=0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
INSERT INTO permissions(code,label,category) VALUES ('ovr.submit','Submit finalized OVR for administration','Payouts'),('ovr.process','Record OVR processing and initial payment outcomes','Payouts');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES ('coordinator','ovr.submit'),('staff','ovr.process'),('coordinator','ovr.process');
