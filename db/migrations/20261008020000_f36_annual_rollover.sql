-- Provenance only: deployment does not advance the working year or renew scholars.
ALTER TABLE scholarship_records
  ADD COLUMN continuing_from_scholarship_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE KEY uq_annual_identity (id,scholar_id),
  DROP CONSTRAINT ck_annual_continuing,
  ADD CONSTRAINT ck_annual_continuing CHECK (
    (status='continuing' AND ((continuing_participation_id IS NOT NULL AND continuing_from_scholarship_id IS NULL)
      OR (continuing_participation_id IS NULL AND continuing_from_scholarship_id IS NOT NULL)))
    OR (status<>'continuing' AND continuing_participation_id IS NULL AND continuing_from_scholarship_id IS NULL)),
  ADD CONSTRAINT ck_annual_predecessor_not_self CHECK (continuing_from_scholarship_id IS NULL OR continuing_from_scholarship_id<>id);

-- statement-break
ALTER TABLE scholarship_records ADD CONSTRAINT fk_annual_predecessor FOREIGN KEY (continuing_from_scholarship_id,scholar_id) REFERENCES scholarship_records(id,scholar_id) ON DELETE RESTRICT;
