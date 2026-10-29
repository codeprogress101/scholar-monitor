-- P07: one canonical payment table, explicitly discriminated sources.
-- Existing payroll identities/values and both payroll uniqueness keys survive.
ALTER TABLE semester_entitlements ADD UNIQUE KEY uq_entitlement_payment_identity(id,scholar_id,semester_id);
-- statement-break
ALTER TABLE payout_cycles ADD UNIQUE KEY uq_cycle_payment_semester(id,semester_id);
-- statement-break
ALTER TABLE individual_payment_events MODIFY action ENUM('request_recorded','prepared','cancel_requested','cancel_rejected','cancelled','original_paid_cancelled','forwarded','paid','payment_corrected') NOT NULL;
-- statement-break
ALTER TABLE payment_records
 MODIFY batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY batch_revision INT UNSIGNED NULL,
 ADD source_kind ENUM('payroll','individual') NOT NULL DEFAULT 'payroll',
 ADD individual_transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD individual_revision INT UNSIGNED NULL,
 ADD entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD release_evidence JSON NULL,
 ADD UNIQUE KEY uq_payment_individual_transaction(individual_transaction_id),
 ADD UNIQUE KEY uq_payment_individual_owner(id,individual_transaction_id),
 ADD UNIQUE KEY uq_payment_payroll_owner(id,batch_id),
 ADD CONSTRAINT fk_payment_individual_owner FOREIGN KEY(individual_transaction_id,entitlement_id) REFERENCES individual_payment_transactions(id,entitlement_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_payment_individual_event FOREIGN KEY(individual_transaction_id,individual_revision) REFERENCES individual_payment_events(transaction_id,revision) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_payment_entitlement_identity FOREIGN KEY(entitlement_id,scholar_id,semester_id) REFERENCES semester_entitlements(id,scholar_id,semester_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_payment_annual_identity FOREIGN KEY(scholarship_id,scholar_id) REFERENCES scholarship_records(id,scholar_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_payment_cycle_semester FOREIGN KEY(cycle_id,semester_id) REFERENCES payout_cycles(id,semester_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_payment_source CHECK(
 (source_kind='payroll' AND batch_id IS NOT NULL AND batch_revision IS NOT NULL AND individual_transaction_id IS NULL AND individual_revision IS NULL AND entitlement_id IS NULL AND scholar_id IS NULL AND semester_id IS NULL AND release_evidence IS NULL)
 OR (source_kind='individual' AND batch_id IS NULL AND batch_revision IS NULL AND individual_transaction_id IS NOT NULL AND individual_revision IS NOT NULL AND individual_revision>0 AND entitlement_id IS NOT NULL AND scholar_id IS NOT NULL AND semester_id IS NOT NULL AND outcome='paid' AND amount=5000.00 AND unpaid_reason IS NULL AND effective_on IS NOT NULL AND release_evidence IS NOT NULL AND JSON_TYPE(release_evidence)='OBJECT' AND JSON_VALUE(release_evidence,'$.acknowledgedRelease') IS NOT NULL AND JSON_VALUE(release_evidence,'$.acknowledgedRelease')=1));
-- statement-break
-- Reuse P03 correction history. Individual revisions never masquerade as payroll revisions.
ALTER TABLE payment_corrections
 MODIFY batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 MODIFY batch_revision INT UNSIGNED NULL,
 ADD individual_transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD individual_revision INT UNSIGNED NULL,
 ADD UNIQUE KEY uq_individual_correction_revision(individual_transaction_id,individual_revision),
 ADD CONSTRAINT fk_correction_individual_payment FOREIGN KEY(payment_id,individual_transaction_id) REFERENCES payment_records(id,individual_transaction_id) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_correction_individual_event FOREIGN KEY(individual_transaction_id,individual_revision) REFERENCES individual_payment_events(transaction_id,revision) ON DELETE RESTRICT,
 ADD CONSTRAINT fk_correction_payroll_owner FOREIGN KEY(payment_id,batch_id) REFERENCES payment_records(id,batch_id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_correction_source CHECK((batch_id IS NOT NULL AND batch_revision IS NOT NULL AND individual_transaction_id IS NULL AND individual_revision IS NULL) OR (batch_id IS NULL AND batch_revision IS NULL AND individual_transaction_id IS NOT NULL AND individual_revision IS NOT NULL AND individual_revision>0));
