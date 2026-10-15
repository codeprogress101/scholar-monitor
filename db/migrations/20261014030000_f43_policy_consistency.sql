-- Explicit calendar and document semantics. Legacy rows remain unclassified.
ALTER TABLE semesters ADD term_kind ENUM('first','second','other') NULL;
-- statement-break
ALTER TABLE requirement_definition_versions ADD document_kind ENUM('enrollment','grades','other') NULL;
