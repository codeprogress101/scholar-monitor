ALTER TABLE audit_logs ADD COLUMN actor_roles JSON NULL;
-- statement-break
CREATE INDEX ix_audit_time ON audit_logs(occurred_at,id);
-- statement-break
CREATE INDEX ix_audit_actor_time ON audit_logs(actor_id,occurred_at,id);
-- statement-break
CREATE TRIGGER audit_capture_roles BEFORE INSERT ON audit_logs FOR EACH ROW
SET NEW.actor_roles = IF(NEW.actor_id IS NULL, JSON_ARRAY(),
  COALESCE((SELECT CONCAT('[',GROUP_CONCAT(DISTINCT JSON_QUOTE(role_code) ORDER BY role_code SEPARATOR ','),']') FROM user_roles WHERE user_id=NEW.actor_id AND revoked_at IS NULL),JSON_ARRAY()));
-- statement-break
CREATE SQL SECURITY DEFINER VIEW audit_event_view AS
SELECT id,event_type,entity_type,entity_id,action,actor_id,actor_kind,actor_roles,
occurred_at,request_id,reason,details FROM audit_logs;
