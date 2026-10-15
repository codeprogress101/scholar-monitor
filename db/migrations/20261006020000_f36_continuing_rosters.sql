INSERT INTO permissions(code,label,category) VALUES
('continuing.prepare','Prepare continuing-scholar baseline rosters','Scholars'),
('continuing.approve','Review continuing-scholar baseline rosters','Scholars');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES
('staff','continuing.prepare'),('coordinator','continuing.prepare'),('coordinator','continuing.approve');
