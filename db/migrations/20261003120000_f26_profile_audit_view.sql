CREATE SQL SECURITY DEFINER VIEW scholar_profile_audit AS
SELECT id,event_type,entity_type,entity_id,action,actor_id,occurred_at FROM audit_logs
WHERE entity_type IN ('scholar','scholarship','status_request','academic_record','requirement_instance','requirement_checklist');
