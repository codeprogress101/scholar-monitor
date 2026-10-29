CREATE TABLE IF NOT EXISTS notification_events (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 kind VARCHAR(40) NOT NULL,
 source_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 action VARCHAR(80) NOT NULL,
 metadata JSON NOT NULL,
 actor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 owner_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 occurred_at DATETIME(6) NOT NULL,
 KEY ix_notice_source(kind,source_id,occurred_at),
 KEY ix_notice_time(occurred_at,id),
 KEY ix_notice_owner(owner_id,occurred_at,id),
 FOREIGN KEY(id) REFERENCES audit_logs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- statement-break
CREATE TABLE IF NOT EXISTS notification_reads (
 user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 read_at DATETIME(6) NOT NULL,
 PRIMARY KEY(user_id,event_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 FOREIGN KEY(event_id) REFERENCES notification_events(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- statement-break
CREATE TRIGGER IF NOT EXISTS notification_event_capture AFTER INSERT ON audit_logs FOR EACH ROW
BEGIN
 DECLARE source_kind VARCHAR(40) DEFAULT NULL;
 DECLARE source_id CHAR(36) DEFAULT NULL;
 DECLARE source_owner CHAR(36) DEFAULT NULL;
 SET source_id=NEW.entity_id;
 IF NEW.event_type LIKE 'academic.change.%' THEN
  SET source_kind='academic'; SET source_id=JSON_UNQUOTE(JSON_EXTRACT(NEW.details,'$.requestId'));
 ELSEIF NEW.event_type='scholarship.status' THEN SET source_kind='standing';
 ELSEIF NEW.event_type IN ('masterlist.submit-verification','masterlist.submit-approval','masterlist.approve','masterlist.publish','masterlist.lock','masterlist.return-draft') THEN SET source_kind='masterlist';
 ELSEIF NEW.event_type LIKE 'masterlist.amendment.%' THEN SET source_kind='masterlist-amendment';
 ELSEIF NEW.event_type='continuing.roster' THEN SET source_kind='roster';
 ELSEIF NEW.event_type='qualification.changed' AND NEW.action IN ('validate','select','not-select') THEN SET source_kind='admission';
 ELSEIF NEW.event_type IN ('account.created','account.enabled','account.disabled','account.roles_changed') THEN SET source_kind='account';
 ELSEIF NEW.event_type='data.exported' THEN SET source_kind='export';
 ELSEIF NEW.event_type IN ('requirements.workflow','requirements.waiver','requirements.timing') THEN SET source_kind='document';
 ELSEIF NEW.event_type='eligibility.override' AND NEW.action IN ('submit-review','approve','reject','cancel') THEN SET source_kind='override';
 ELSEIF NEW.event_type='ovr.draft' AND NEW.action IN ('submit-review','return-to-draft','finalize') THEN SET source_kind='payroll';
 ELSEIF NEW.event_type='ovr.processing' AND NEW.action IN ('submit','mark-processed','close') THEN SET source_kind='payroll';
 ELSEIF NEW.event_type='ovr.amendment' THEN
  SET source_kind='payroll-amendment'; SET source_id=JSON_UNQUOTE(JSON_EXTRACT(NEW.details,'$.amendmentId'));
 ELSEIF NEW.event_type='payment.correction' THEN
  SET source_kind='payment-correction'; SET source_id=JSON_UNQUOTE(JSON_EXTRACT(NEW.details,'$.correctionId'));
 ELSEIF NEW.event_type='scholars.import' AND NEW.action='confirm' THEN SET source_kind='import';
 END IF;
 IF source_kind IS NOT NULL AND source_id IS NOT NULL THEN
  CASE source_kind
   WHEN 'academic' THEN SET source_owner=(SELECT actor_id FROM academic_changes WHERE id=source_id);
   WHEN 'standing' THEN SET source_owner=(SELECT actor_id FROM status_change_requests WHERE id=source_id);
   WHEN 'admission' THEN SET source_owner=(SELECT actor_id FROM qualification_events WHERE scholarship_id=source_id AND action IN ('validate','create') ORDER BY resulting_version DESC LIMIT 1);
   WHEN 'masterlist' THEN SET source_owner=COALESCE((SELECT actor_id FROM masterlist_workflow_events WHERE masterlist_id=source_id AND action='submit-verification' ORDER BY resulting_version DESC LIMIT 1),(SELECT actor_id FROM masterlist_versions WHERE id=source_id));
   WHEN 'masterlist-amendment' THEN SET source_owner=(SELECT actor_id FROM masterlist_amendments WHERE id=source_id);
   WHEN 'roster' THEN SET source_owner=(SELECT actor_id FROM continuing_roster_batches WHERE id=source_id);
   WHEN 'document' THEN SET source_owner=(SELECT actor_id FROM requirement_receipts WHERE instance_id=source_id);
   WHEN 'override' THEN SET source_owner=(SELECT requester_id FROM eligibility_overrides WHERE id=source_id);
   WHEN 'payroll' THEN SET source_owner=COALESCE((SELECT actor_id FROM ovr_batch_events WHERE batch_id=source_id AND action='submit-review' ORDER BY revision DESC LIMIT 1),(SELECT created_by FROM ovr_batches WHERE id=source_id));
   WHEN 'payroll-amendment' THEN SET source_owner=(SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.requestedBy')) FROM ovr_amendments WHERE id=source_id ORDER BY version LIMIT 1);
   WHEN 'payment-correction' THEN SET source_owner=(SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot,'$.requestedBy')) FROM payment_corrections WHERE id=source_id ORDER BY version LIMIT 1);
   ELSE SET source_owner=NEW.actor_id;
  END CASE;
  INSERT INTO notification_events(id,kind,source_id,action,metadata,actor_id,owner_id,occurred_at)
   VALUES(NEW.id,source_kind,source_id,NEW.action,IF(source_kind='export',JSON_OBJECT('report',JSON_UNQUOTE(JSON_EXTRACT(NEW.details,'$.report'))),JSON_OBJECT()),NEW.actor_id,source_owner,NEW.occurred_at);
 END IF;
END;
-- statement-break
CREATE TRIGGER IF NOT EXISTS notification_events_no_update BEFORE UPDATE ON notification_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Notification events are immutable';
-- statement-break
CREATE TRIGGER IF NOT EXISTS notification_events_no_delete BEFORE DELETE ON notification_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Notification events are immutable';
