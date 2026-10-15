import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { SemesterEligibilityPreview } from "../server/continuing/semester-eligibility-preview.js";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance.js";

export async function testSemesterEligibility({ admin, request, path, scholar, semesterId, actor }: {
  admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
  path: string; scholar: string; semesterId: string; actor: string;
}) {
  const ok = async (p: Promise<LightMyRequestResponse>) => { const r = await p; assert.equal(r.statusCode, 200, r.body); return r; };
  const preview = async (suffix = "") => (await ok(request("staff", path + "/eligibility-preview" + suffix))).json<SemesterEligibilityPreview>();
  const compliance = async () => (await ok(request("staff", path))).json<SemesterComplianceView>();
  const initial = await preview(); assert.equal(initial.candidate, false); assert.equal(initial.comparison.kind, "not_comparable"); assert.equal(initial.paymentAuthorized, false);
  for (const role of ["system_admin", "unassigned"]) assert.equal((await request(role, path + "/eligibility-preview")).statusCode, 403);
  assert.equal((await request("staff", path + "/eligibility-preview?candidate=true")).statusCode, 422);
  assert.equal((await request("staff", path + "/eligibility-preview?cycleId=" + randomUUID())).statusCode, 409);
  assert.equal((await request("staff", path + "/eligibility-preview", { candidate: true })).statusCode, 404);
  const correct = async () => {
    const v = await compliance();
    await ok(request("coordinator", path + "/correct-recording", { sourceHash: v.sourceHash, expectedRevision: v.revision, fields: [...new Set(v.unresolvedFindings.map((t) => t.field))], reason: "Synthetic eligibility comparison: verified recording error", recordingErrorConfirmed: true, academicOnly: v.ended }));
  };
  await correct();
  const accepted = await preview(); assert.equal(accepted.candidate, true); assert.equal(accepted.comparison.kind, "not_comparable"); assert.equal(accepted.proposedAmountCentavos, 500000);
  assert.notEqual(accepted.sourceHash, initial.sourceHash);
  await admin.execute("UPDATE semesters SET locked_at=UTC_TIMESTAMP(6) WHERE id=?", [semesterId]);
  try { const locked = await preview(); assert.equal(locked.candidate, false); assert.ok(locked.reasons.some((r) => r.code === "PERIOD_UNAVAILABLE")); }
  finally { await admin.execute("UPDATE semesters SET locked_at=NULL WHERE id=?", [semesterId]); }
  const entitlement = randomUUID();
  await admin.execute("INSERT INTO semester_entitlements(id,scholar_semester_id,scholar_id,semester_id,benefit_type,amount_centavos,currency,actor_id,recorded_at) VALUES(?,?,?,?,'degree_stipend',500000,'PHP',?,UTC_TIMESTAMP(6))", [entitlement, accepted.sources.semesterOwnerId, scholar, semesterId, actor]);
  try { assert.ok((await preview()).reasons.some((r) => r.code === "ENTITLEMENT_ALREADY_EXISTS")); }
  finally { await admin.execute("DELETE FROM semester_entitlements WHERE id=?", [entitlement]); }

  // Explicit legacy comparison fixtures only: never fabricate these rows for operational continuing scholars.
  const annual = randomUUID(), cycle = randomUUID(), cycleVersion = randomUUID(), masterlist = randomUUID(), checklist = randomUUID(), instance = randomUUID();
  await admin.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,operational_status,status_version,status_effective_on,created_at,updated_at) VALUES(?,?,?,'selected',1,'2026-10-01','active',1,'2026-10-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [annual, scholar, accepted.sources.academicYearId]);
  assert.match((await preview()).comparison.message, /No legacy payout cycle/);
  await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,'PREVIEW-PAYROLL',?)", [cycle, semesterId]);
  await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,'Synthetic comparison payroll','2026-10-07','open','open','Synthetic fixture','TEST-PREVIEW',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [cycleVersion, cycle, actor]);
  const legacyBlocked = await preview(); assert.equal(legacyBlocked.candidate, true); assert.equal(legacyBlocked.comparison.kind, "differs");
  await admin.execute("INSERT INTO masterlist_versions(id,academic_year_id,title,status,version,actor_id,created_at,updated_at) VALUES(?,?,'Synthetic comparison masterlist','published',1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [masterlist, accepted.sources.academicYearId, actor]);
  await admin.execute("INSERT INTO masterlist_publications(masterlist_id,snapshot,snapshot_hash,effective_on,actor_id,actor_name,published_at) VALUES(?,? ,?,'2026-10-01',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [masterlist, JSON.stringify({ academicYearId: accepted.sources.academicYearId, masterlistId: masterlist, entries: [{ scholarId: scholar, snapshot: { scholarshipId: annual } }] }), "a".repeat(64), actor]);
  await admin.execute("INSERT INTO masterlist_activations(scholarship_id,masterlist_id,effective_on,activated_at) VALUES(?,?,'2026-10-01',UTC_TIMESTAMP(6))", [annual, masterlist]);
  const [[source]] = await admin.execute<RowDataPacket[]>("SELECT c.id,i.definition_version_id FROM requirement_checklists c JOIN requirement_instances i ON i.checklist_id=c.id WHERE c.scholar_semester_id=? ORDER BY i.id LIMIT 1", [accepted.sources.semesterOwnerId]);
  await admin.execute("INSERT INTO payout_requirements(cycle_version_id,definition_version_id,allow_waiver) VALUES(?,?,0)", [cycleVersion, source.definition_version_id]);
  await admin.execute("INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at,payout_cycle_id,payout_version_id) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic legacy comparison','TEST-PREVIEW',actor_id,actor_name,UTC_TIMESTAMP(6),?,? FROM requirement_checklists WHERE id=?", [checklist, annual, cycle, cycleVersion, source.id]);
  await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,created_at) VALUES(?,?,?,UTC_TIMESTAMP(6))", [instance, checklist, source.definition_version_id]);
  await admin.execute("INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,details,actor_id,actor_name,recorded_at) VALUES(?,?,3,'verify','for_verification','verified','2026-10-07','Synthetic legacy fixture','TEST-PREVIEW','{}',?,'Synthetic Staff',UTC_TIMESTAMP(6))", [randomUUID(), instance, actor]);
  const conflicted = await preview(); assert.equal(conflicted.candidate, false);
  assert.ok(conflicted.sources.compliance.blockers.some(b=>/reconciliation/.test(b)));
  const reconciliationPath = `/api/v1/scholars/${scholar}/semester-requirements/${semesterId}/shared-documents`;
  const sources = (await ok(request("coordinator", reconciliationPath))).json();
  const selected = sources.documents.find((d: {definitionVersionId:string})=>d.definitionVersionId===source.definition_version_id);
  const reconcileBody = { sourceHash:sources.sourceHash, legacyId:instance, sourceId:selected.id, expectedRevision:0, reviewed:true, reason:"Synthetic explicit duplicate review", reference:"TEST-RECONCILIATION" };
  for(const role of ["staff","system_admin"]) assert.equal((await request(role,reconciliationPath+"/reconcile",reconcileBody)).statusCode,403);
  assert.equal((await request("coordinator",reconciliationPath+"/reconcile",{...reconcileBody,reviewed:false})).statusCode,422);
  assert.equal((await request("coordinator",reconciliationPath+"/reconcile",{...reconcileBody,sourceHash:"0".repeat(64)})).statusCode,409);
  const key=randomUUID();
  const beforeEvents=(await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_workflow_events WHERE instance_id IN (?,?) ORDER BY id",[instance,selected.id]))[0];
  await admin.query("CREATE TRIGGER reject_shared_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.documents.reconcile' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic rollback'; END IF; END");
  try { assert.equal((await request("coordinator",reconciliationPath+"/reconcile",reconcileBody,key)).statusCode,500); }
  finally { await admin.query("DROP TRIGGER reject_shared_audit"); }
  assert.equal((await admin.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM semester_document_reconciliations WHERE legacy_instance_id=?",[instance]))[0][0].n,0);
  const race=await Promise.all([request("coordinator",reconciliationPath+"/reconcile",reconcileBody,key),request("reviewer",reconciliationPath+"/reconcile",reconcileBody,randomUUID())]);
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[200,409]);
  if(race[0].statusCode===200) assert.deepEqual((await ok(request("coordinator",reconciliationPath+"/reconcile",reconcileBody,key))).json(),race[0].json());
  assert.deepEqual((await admin.execute<RowDataPacket[]>("SELECT * FROM requirement_workflow_events WHERE instance_id IN (?,?) ORDER BY id",[instance,selected.id]))[0],beforeEvents);
  const changed=await compliance(); assert.equal(changed.stale,true);
  await ok(request("coordinator",path,{sourceHash:changed.sourceHash,expectedRevision:changed.revision,findings:changed.history[0].findings,reviewed:true,reason:"Synthetic review after source reconciliation"}));
  const matching = await preview(); assert.equal(matching.candidate, true); assert.equal(matching.comparison.kind, "matches");
  assert.ok("normalEligible" in matching.comparison && matching.comparison.normalEligible);
  const legacyPath = `/api/v1/payout-cycles/${cycle}/scholarships/${annual}/eligibility`;
  await ok(request("staff", legacyPath + "/calculate", { expectedRevision: 0, expectedSourceHash: matching.comparison.sourceHash, reason: "Synthetic saved comparison baseline", reference: "TEST-PREVIEW" }));
  assert.ok((await preview()).comparison.kind !== "not_comparable");
  const c = await compliance();
  await ok(request("coordinator", path, { sourceHash: c.sourceHash, expectedRevision: c.revision, findings: { ...c.history[0].findings, hasIncomplete: true }, reviewed: true, reason: "Synthetic unresolved INC for comparison" }));
  const difference = await preview(); assert.equal(difference.candidate, false); assert.equal(difference.comparison.kind, "differs");
  assert.ok("normalEligible" in difference.comparison && difference.comparison.normalEligible && difference.comparison.saved?.eligible);
  assert.ok(difference.sources.compliance.blockers.some((b) => /incomplete/.test(b)));
  const legacyExact = (await ok(request("staff", legacyPath))).json();
  assert.equal(difference.comparison.sourceHash, legacyExact.current.sourceHash); assert.deepEqual(difference.comparison.effective, legacyExact.effective);

  const secondCycle = randomUUID(), secondVersion = randomUUID();
  await admin.execute("INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,'PREVIEW-SECOND',?)", [secondCycle, semesterId]);
  await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,'Synthetic second comparison','2026-10-07','draft','create','Synthetic fixture','TEST-PREVIEW',?,'Synthetic Coordinator',UTC_TIMESTAMP(6))", [secondVersion, secondCycle, actor]);
  assert.equal((await preview()).comparison.kind, "not_comparable");
  assert.equal((await preview(`?cycleId=${cycle}`)).comparison.kind, "differs");
  const hashBefore = (await preview(`?cycleId=${cycle}`)).sourceHash;
  await admin.execute("UPDATE scholarship_records SET operational_status='graduated' WHERE id=?", [annual]);
  try { const graduated = await preview(`?cycleId=${cycle}`); assert.ok(graduated.reasons.some((r) => r.code === "FINAL_SEMESTER_REVIEW_REQUIRED")); assert.notEqual(graduated.sourceHash, hashBefore); }
  finally { await admin.execute("UPDATE scholarship_records SET operational_status='active' WHERE id=?", [annual]); }
  // Existing batch membership requires reconciliation even before a payment is recorded.
  const batch = randomUUID();
  await admin.execute("INSERT INTO ovr_batches(id,cycle_id,code,name,created_by,created_at) VALUES(?,?,'PREVIEW-BATCH','Synthetic comparison',?,UTC_TIMESTAMP(6))", [batch, cycle, actor]);
  await admin.execute("INSERT INTO ovr_batch_events(batch_id,revision,state,action,snapshot,actor_id,occurred_at) VALUES(?,1,'draft','create','{}',?,UTC_TIMESTAMP(6))", [batch, actor]);
  await admin.execute("INSERT INTO ovr_entries(batch_id,batch_revision,scholarship_id,action,evidence) VALUES(?,1,?,'add','{}')", [batch, annual]);
  assert.ok((await preview(`?cycleId=${cycle}`)).reasons.some((r) => r.code === "LEGACY_FINANCIAL_RECONCILIATION"));
  await admin.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) SELECT ?,cycle_id,2,name,target_date,'closed','close',reason,reference_text,actor_id,actor_name,UTC_TIMESTAMP(6) FROM payout_cycle_versions WHERE id=?", [randomUUID(), secondVersion]);
  assert.ok((await preview(`?cycleId=${cycle}`)).reasons.some((r) => r.code === "PROTECTED_PAYROLL"));
  const tables = ["scholars", "scholarship_records", "participations", "participation_events", "scholar_semesters", "scholar_semester_revisions", "semester_review_events", "workflow_policy_versions", "workflow_authority_versions", "workflow_commands", "audit_logs", "payout_cycles", "payout_cycle_versions", "payout_eligibility", "payment_records", "semester_entitlements", "semester_entitlement_events", "ovr_entries", "ovr_batch_events", "masterlist_publications", "requirement_checklists", "requirement_workflow_events"];
  const snapshot = async () => Promise.all(tables.map(async (table) => (await admin.query<RowDataPacket[]>(`SELECT * FROM ${table}`))[0].map((r) => JSON.stringify(r)).sort()));
  const before = await snapshot();
  const repeat = await Promise.all([preview(`?cycleId=${cycle}`), preview(`?cycleId=${cycle}`), ok(request("coordinator", path + `/eligibility-preview?cycleId=${cycle}`))]);
  assert.equal(repeat[0].sourceHash, repeat[1].sourceHash); assert.equal(repeat[0].entitlementCreationEnabled, false);
  assert.deepEqual(await snapshot(), before);
  console.log("PASS Semester eligibility preview: accepted baseline, fresh/corrected evidence, actual legacy matches/differences, saved results, explicit cycle selection, standing/financial boundaries and read-only preservation");
}
