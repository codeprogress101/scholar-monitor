CREATE TABLE IF NOT EXISTS roles (
  code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  description VARCHAR(300) NOT NULL,
  CONSTRAINT ck_role_code CHECK (code IN ('staff','coordinator','system_admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS permissions (
  code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS role_permissions (
  role_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  permission_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (role_code,permission_code),
  FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE RESTRICT,
  FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  role_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  granted_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  active_role VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin AS (IF(revoked_at IS NULL,role_code,NULL)) PERSISTENT,
  UNIQUE KEY uq_active_user_role (user_id,active_role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE RESTRICT,
  CONSTRAINT ck_role_revocation CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS role_change_commands (
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  resulting_version INT UNSIGNED NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
INSERT INTO roles (code,label,description) VALUES
('staff','Staff','Prepares scholarship records and requests controlled approvals.'),
('coordinator','Coordinator','Operates scholarship workflows and approves official decisions.'),
('system_admin','System Administrator','Manages technical administration without implicit scholarship authority.')
ON DUPLICATE KEY UPDATE code=VALUES(code);
-- statement-break
INSERT INTO permissions (code,label,category) VALUES
('scholars.read','View scholar records','Scholar records'),
('scholars.create','Create scholar records','Scholar records'),
('scholars.update','Edit scholar records','Scholar records'),
('academic.edit','Record academic history and changes','Scholar records'),
('requirements.receive','Receive physical requirements','Requirements'),
('requirements.verify','Verify physical requirements','Requirements'),
('requirements.waive','Authorize requirement waivers','Requirements'),
('masterlists.prepare','Prepare masterlists','Masterlists'),
('masterlists.approve','Approve masterlists','Masterlists'),
('masterlists.publish','Publish masterlists','Masterlists'),
('masterlists.lock','Lock masterlists','Masterlists'),
('masterlists.amendments.request','Request masterlist amendments','Masterlists'),
('masterlists.amendments.approve','Approve masterlist amendments','Masterlists'),
('scholarship.status.request','Request scholarship status changes','Scholarship status'),
('scholarship.status.approve','Approve controlled or terminal status changes','Scholarship status'),
('eligibility.overrides.request','Request eligibility overrides','Payouts'),
('eligibility.overrides.approve','Approve eligibility overrides','Payouts'),
('ovr.prepare','Prepare OVR batches','Payouts'),
('ovr.finalize','Finalize OVR batches','Payouts'),
('ovr.close','Close OVR batches','Payouts'),
('users.manage','Manage individual accounts','Administration'),
('roles.manage','Manage role assignments','Administration'),
('configuration.read','Read reference configuration','Administration'),
('configuration.manage','Manage system configuration','Administration'),
('audit.view_limited','View audit within limited scope','Audit'),
('audit.view_all','View audit across the program','Audit'),
('audit.export','Export audit records','Audit')
ON DUPLICATE KEY UPDATE code=VALUES(code);
-- statement-break
INSERT INTO role_permissions (role_code,permission_code)
SELECT 'staff',code FROM permissions WHERE code IN (
'scholars.read','scholars.create','scholars.update','academic.edit',
'requirements.receive','requirements.verify','masterlists.prepare','masterlists.amendments.request',
'scholarship.status.request','eligibility.overrides.request','ovr.prepare','configuration.read','audit.view_limited')
ON DUPLICATE KEY UPDATE role_code=VALUES(role_code);
-- statement-break
INSERT INTO role_permissions (role_code,permission_code)
SELECT 'coordinator',code FROM permissions WHERE code IN (
'scholars.read','scholars.create','scholars.update','academic.edit',
'requirements.receive','requirements.verify','requirements.waive',
'masterlists.prepare','masterlists.approve','masterlists.publish','masterlists.lock',
'masterlists.amendments.request','masterlists.amendments.approve',
'scholarship.status.request','scholarship.status.approve',
'eligibility.overrides.request','eligibility.overrides.approve',
'ovr.prepare','ovr.finalize','ovr.close','configuration.read','audit.view_all')
ON DUPLICATE KEY UPDATE role_code=VALUES(role_code);
-- statement-break
INSERT INTO role_permissions (role_code,permission_code)
SELECT 'system_admin',code FROM permissions WHERE code IN (
'users.manage','roles.manage','configuration.read','configuration.manage','audit.view_all','audit.export')
ON DUPLICATE KEY UPDATE role_code=VALUES(role_code);
