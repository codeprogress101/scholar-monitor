INSERT INTO permissions(code,label,category) VALUES('scholars.export','Export minimal scholar registry','Scholar records');
-- statement-break
INSERT INTO role_permissions(role_code,permission_code) VALUES('staff','scholars.export'),('coordinator','scholars.export');
-- statement-break
CREATE SQL SECURITY DEFINER VIEW export_audit_metadata AS
SELECT id,event_type,entity_type,action,actor_id,occurred_at,request_id FROM audit_logs;
