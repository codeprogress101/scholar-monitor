-- P05 forward correction: SQL CHECK treats NULL as unknown/accepted. Require
-- an explicit approved entitlement and bind its owner to the immutable case.
-- F49 and all previously applied checksums remain unchanged. Existing valid
-- approvals/history are preserved; inconsistent evidence must stop migration.
ALTER TABLE payroll_omission_events
 ADD CONSTRAINT ck_omission_approval_nonnull CHECK(
  action<>'approved' OR (entitlement_id IS NOT NULL AND authorized_entitlement_id IS NOT NULL AND entitlement_id=authorized_entitlement_id)
 ),
 ADD CONSTRAINT fk_omission_authorized_owner FOREIGN KEY(authorized_entitlement_id,scholar_semester_id) REFERENCES semester_entitlements(id,scholar_semester_id) ON DELETE RESTRICT;
