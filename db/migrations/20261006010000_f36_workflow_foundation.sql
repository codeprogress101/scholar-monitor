-- Phase 04 dormant foundation. No policy seeds, backfill, runtime grants or activation.
-- Services in later phases must validate cross-record policy, authority and evidence.
CREATE TABLE IF NOT EXISTS workflow_authority_versions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  issuer VARCHAR(200) NOT NULL,
  reference_text VARCHAR(300) NOT NULL,
  scope JSON NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NULL,
  source_location VARCHAR(500) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_workflow_authority (code,revision),
  CHECK (revision>0),
  CHECK (CHAR_LENGTH(TRIM(issuer))>0 AND CHAR_LENGTH(TRIM(reference_text))>0),
  CHECK (valid_until IS NULL OR valid_until>=valid_from),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS workflow_policy_versions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  authority_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_reference VARCHAR(500) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE NULL,
  rules JSON NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_workflow_policy (code,revision),
  CHECK (revision>0),
  CHECK (CHAR_LENGTH(TRIM(source_reference))>0),
  CHECK (effective_until IS NULL OR effective_until>=effective_from),
  FOREIGN KEY (authority_version_id) REFERENCES workflow_authority_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS workflow_scope_versions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  cohort_code VARCHAR(60) NOT NULL,
  revision INT UNSIGNED NOT NULL,
  mode ENUM('disabled','shadow','enabled') NOT NULL DEFAULT 'disabled',
  policy_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_workflow_scope (semester_id,cohort_code,revision),
  UNIQUE KEY uq_workflow_scope_period (id,semester_id),
  CHECK (revision>0 AND CHAR_LENGTH(TRIM(cohort_code))>0),
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (policy_version_id) REFERENCES workflow_policy_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS continuing_roster_batches (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  source_reference VARCHAR(500) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  CHECK (CHAR_LENGTH(TRIM(source_reference))>0),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS continuing_roster_entries (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_row INT UNSIGNED NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  identity_evidence JSON NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_roster_member (batch_id,scholar_id),
  UNIQUE KEY uq_roster_row (batch_id,source_row),
  UNIQUE KEY uq_roster_identity (id,scholar_id),
  CHECK (source_row>0 AND CHAR_LENGTH(TRIM(original_name))>0),
  FOREIGN KEY (batch_id) REFERENCES continuing_roster_batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS continuing_roster_decisions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  decision ENUM('accepted','rejected','returned') NOT NULL,
  authority_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  snapshot JSON NOT NULL,
  reason VARCHAR(500) NOT NULL,
  effective_on DATE NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_roster_decision (batch_id,revision),
  CHECK (revision>0),
  FOREIGN KEY (batch_id) REFERENCES continuing_roster_batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (authority_version_id) REFERENCES workflow_authority_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS participations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  entry_basis ENUM('new_applicant','continuing_baseline') NOT NULL,
  roster_entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_participation_scholar (id,scholar_id),
  CHECK ((entry_basis='continuing_baseline' AND roster_entry_id IS NOT NULL) OR (entry_basis='new_applicant' AND roster_entry_id IS NULL)),
  FOREIGN KEY (scholar_id) REFERENCES scholars(id) ON DELETE RESTRICT,
  FOREIGN KEY (roster_entry_id,scholar_id) REFERENCES continuing_roster_entries(id,scholar_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS participation_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  participation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  action ENUM('accepted','rejected','standing_decision','correction') NOT NULL,
  authority_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  effective_on DATE NOT NULL,
  snapshot JSON NOT NULL,
  corrects_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reason VARCHAR(500) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_participation_revision (participation_id,revision),
  UNIQUE KEY uq_participation_event_owner (id,participation_id),
  CHECK (revision>0),
  FOREIGN KEY (participation_id) REFERENCES participations(id) ON DELETE RESTRICT,
  FOREIGN KEY (authority_version_id) REFERENCES workflow_authority_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (corrects_event_id,participation_id) REFERENCES participation_events(id,participation_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_semesters (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  participation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholarship_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  scope_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_scholar_semester (scholar_id,semester_id),
  UNIQUE KEY uq_semester_identity (id,scholar_id,semester_id),
  FOREIGN KEY (participation_id,scholar_id) REFERENCES participations(id,scholar_id) ON DELETE RESTRICT,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (scope_version_id,semester_id) REFERENCES workflow_scope_versions(id,semester_id) ON DELETE RESTRICT,
  FOREIGN KEY (scholarship_record_id) REFERENCES scholarship_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS scholar_semester_revisions (
  scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  academic_record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  academic_change_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  placement_snapshot JSON NOT NULL,
  predecessor_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  program_category ENUM('degree','non_degree','unknown') NOT NULL DEFAULT 'unknown',
  year_level VARCHAR(60) NULL,
  normalized_year_level SMALLINT UNSIGNED NULL,
  enrolled BOOLEAN NULL,
  full_load BOOLEAN NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  PRIMARY KEY (scholar_semester_id,revision),
  CHECK (revision>0),
  CHECK (normalized_year_level IS NULL OR normalized_year_level>0),
  CHECK (enrolled IS NULL OR enrolled IN (0,1)),
  CHECK (full_load IS NULL OR full_load IN (0,1)),
  CHECK (academic_change_id IS NULL OR academic_record_id IS NOT NULL),
  FOREIGN KEY (scholar_semester_id) REFERENCES scholar_semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_record_id) REFERENCES academic_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_change_id) REFERENCES academic_changes(id) ON DELETE RESTRICT,
  FOREIGN KEY (predecessor_semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS requirement_coverage (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  requirement_instance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  document_kind ENUM('cor','cog','admission_grades','other') NOT NULL,
  coverage_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  admission_basis VARCHAR(300) NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_requirement_coverage (scholar_semester_id,requirement_instance_id,revision),
  CHECK (revision>0),
  CHECK ((document_kind IN ('cor','cog') AND coverage_semester_id IS NOT NULL AND admission_basis IS NULL) OR (document_kind='admission_grades' AND coverage_semester_id IS NULL AND admission_basis IS NOT NULL AND CHAR_LENGTH(TRIM(admission_basis))>0) OR document_kind='other'),
  FOREIGN KEY (scholar_semester_id) REFERENCES scholar_semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (requirement_instance_id) REFERENCES requirement_instances(id) ON DELETE RESTRICT,
  FOREIGN KEY (coverage_semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS semester_review_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  semester_revision INT UNSIGNED NOT NULL,
  policy_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  average_value DECIMAL(10,4) NULL,
  grading_rule_key VARCHAR(100) NULL,
  has_failed BOOLEAN NULL,
  has_dropped BOOLEAN NULL,
  has_incomplete BOOLEAN NULL,
  result ENUM('pending','review_required','compliant','noncompliant') NOT NULL,
  source_snapshot JSON NOT NULL,
  source_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  supersedes_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_semester_review (scholar_semester_id,revision),
  UNIQUE KEY uq_review_owner (id,scholar_semester_id),
  CHECK (revision>0),
  CHECK (has_failed IS NULL OR has_failed IN (0,1)),
  CHECK (has_dropped IS NULL OR has_dropped IN (0,1)),
  CHECK (has_incomplete IS NULL OR has_incomplete IN (0,1)),
  FOREIGN KEY (scholar_semester_id,semester_revision) REFERENCES scholar_semester_revisions(scholar_semester_id,revision) ON DELETE RESTRICT,
  FOREIGN KEY (policy_version_id) REFERENCES workflow_policy_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_id,scholar_semester_id) REFERENCES semester_review_events(id,scholar_semester_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS semester_entitlements (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholar_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  benefit_type ENUM('degree_stipend') NOT NULL,
  amount_centavos INT UNSIGNED NOT NULL,
  currency CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_semester_benefit (scholar_id,semester_id,benefit_type),
  UNIQUE KEY uq_entitlement_owner (id,scholar_semester_id),
  CHECK (amount_centavos=500000 AND currency='PHP'),
  FOREIGN KEY (scholar_semester_id,scholar_id,semester_id) REFERENCES scholar_semesters(id,scholar_id,semester_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS semester_entitlement_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scholar_semester_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  action ENUM('assessed','approved','withheld','unclaimed','correction') NOT NULL,
  review_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  authority_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  snapshot JSON NOT NULL,
  reason VARCHAR(500) NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_entitlement_revision (entitlement_id,revision),
  UNIQUE KEY uq_entitlement_event_owner (id,entitlement_id),
  CHECK (revision>0),
  CHECK (action NOT IN ('approved','withheld','correction') OR authority_version_id IS NOT NULL),
  FOREIGN KEY (entitlement_id,scholar_semester_id) REFERENCES semester_entitlements(id,scholar_semester_id) ON DELETE RESTRICT,
  FOREIGN KEY (review_event_id,scholar_semester_id) REFERENCES semester_review_events(id,scholar_semester_id) ON DELETE RESTRICT,
  FOREIGN KEY (authority_version_id) REFERENCES workflow_authority_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS entitlement_release_links (
  entitlement_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  approved_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  release_evidence JSON NOT NULL,
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  FOREIGN KEY (entitlement_id) REFERENCES semester_entitlements(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_event_id,entitlement_id) REFERENCES semester_entitlement_events(id,entitlement_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS workflow_commands (
  actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  command_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operation VARCHAR(80) NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result JSON NOT NULL,
  recorded_at DATETIME(6) NOT NULL,
  PRIMARY KEY (actor_id,command_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
