INSERT INTO permissions(code,label,category) VALUES
('semesters.configure','Authorize continuing-scholar semester setup','Scholars');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES
('coordinator','semesters.configure');
