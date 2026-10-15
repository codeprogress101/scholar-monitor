import { digest } from "../server/auth/crypto.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { unusedPlaceholders } from "../server/requirements/unused-placeholders.js";

type Request = (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse>;
export async function testUnusedPlaceholderEvidence({admin,request,scholar,semester,ownerId,instanceId,batchId,wrongSemesterId,day}: {admin:Connection;request:Request;scholar:string;semester:string;ownerId:string;instanceId:string;batchId:string;wrongSemesterId:string;day:string}) {
  const [[owner]]=await admin.execute<RowDataPacket[]>('SELECT ss.id,p.rules FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE ss.id=?',[ownerId]);
  const [[actor]]=await admin.execute<RowDataPacket[]>("SELECT id,full_name FROM users WHERE email='coordinator@example.invalid'");
  const classify=()=>unusedPlaceholders(admin as never,scholar,semester,owner.rules);
  assert.ok((await classify()).includes(instanceId));
  const check=async(label:string)=>assert.ok(!(await classify()).includes(instanceId),label);
  const [[definition]]=await admin.execute<RowDataPacket[]>('SELECT definition_version_id FROM requirement_instances WHERE id=?',[instanceId]);
  await admin.execute("UPDATE requirement_instances SET status='submitted' WHERE id=?",[instanceId]);await check('noninitial status');await admin.execute("UPDATE requirement_instances SET status='not_submitted' WHERE id=?",[instanceId]);
  const receipt=randomUUID();await admin.execute("INSERT INTO requirement_receipts(id,instance_id,received_on,physical_reference,storage_location,reason,actor_id,actor_name,recorded_at) VALUES(?,?,?,'Synthetic original receipt','','Synthetic receipt evidence',?,?,UTC_TIMESTAMP(6))",[receipt,instanceId,day,actor.id,actor.full_name]);await check('receipt with inconsistent initial state');await admin.execute('DELETE FROM requirement_receipts WHERE id=?',[receipt]);
  await admin.execute('UPDATE requirement_definition_versions SET document_kind=NULL WHERE id=?',[definition.definition_version_id]);await check('unspecified document kind');await admin.execute("UPDATE requirement_definition_versions SET document_kind='enrollment' WHERE id=?",[definition.definition_version_id]);
  await admin.execute("UPDATE requirement_definition_versions SET applies_to='payout' WHERE id=?",[definition.definition_version_id]);await check('payout-scoped policy');await admin.execute("UPDATE requirement_definition_versions SET applies_to='semester' WHERE id=?",[definition.definition_version_id]);
  const unrelated=await request('system_admin','/api/v1/requirement-definitions',{action:'create',code:'UNRELATED-PAYOUT-COR',expectedVersion:0,fields:{documentKind:'enrollment',name:'Certificate of Registration',instructions:'Separate synthetic payout obligation',appliesTo:'payout',semesterId:semester,effectiveFrom:day,effectiveUntil:null}});
  assert.equal(unrelated.statusCode,200,unrelated.body);
  await admin.execute('UPDATE requirement_instances SET definition_version_id=? WHERE id=?',[unrelated.json().id,instanceId]);await check('distinct unrelated payout definition');await admin.execute('UPDATE requirement_instances SET definition_version_id=? WHERE id=?',[definition.definition_version_id,instanceId]);
    const waiver=randomUUID();await admin.execute("INSERT INTO requirement_waivers(id,instance_id,version,from_status,effective_on,reason,authority_reference,actor_id,actor_name,recorded_at) VALUES(?,?,1,'not_submitted',?,'QA waiver evidence','QA-AUTH',?,?,UTC_TIMESTAMP(6))",[waiver,instanceId,day,actor.id,actor.full_name]);await check('waiver-only evidence');await admin.execute('DELETE FROM requirement_waivers WHERE id=?',[waiver]);
    const event=randomUUID();await admin.execute("INSERT INTO requirement_workflow_events(id,instance_id,version,action,from_status,to_status,effective_on,reason,reference_text,details,actor_id,actor_name,recorded_at) VALUES(?,?,2,'send-for-verification','submitted','for_verification',?,'QA workflow evidence','QA-REF','{}',?,?,UTC_TIMESTAMP(6))",[event,instanceId,day,actor.id,actor.full_name]);await check('workflow-only evidence with inconsistent initial status');await admin.execute('DELETE FROM requirement_workflow_events WHERE id=?',[event]);
    const timing=randomUUID();await admin.execute("INSERT INTO requirement_timing_decisions(id,instance_id,batch_id,revision,source_hash,decision,evidence_kind,evidence_reference,reason,snapshot,actor_id,actor_name,recorded_at) VALUES(?,?,?,1,?,'approve','receiving_log','QA receiving log','QA timing evidence','{}',?,?,UTC_TIMESTAMP(6))",[timing,instanceId,batchId,'0'.repeat(64),actor.id,actor.full_name]);await check('timing-only evidence');await admin.execute('DELETE FROM requirement_timing_decisions WHERE id=?',[timing]);
    const reconciliation=randomUUID();await admin.execute("INSERT INTO semester_document_reconciliations(id,scholar_semester_id,legacy_instance_id,source_instance_id,revision,source_hash,evidence,reason,reference_text,actor_id,recorded_at) VALUES(?,?,?,?,1,?,'{}','QA existing reconciliation','QA-REF',?,UTC_TIMESTAMP(6))",[reconciliation,owner.id,instanceId,instanceId,'0'.repeat(64),actor.id]);await check('reconciliation-link evidence');await admin.execute('DELETE FROM semester_document_reconciliations WHERE id=?',[reconciliation]);
    const coverage=randomUUID();await admin.execute("INSERT INTO requirement_coverage(id,scholar_semester_id,requirement_instance_id,revision,document_kind,coverage_semester_id,actor_id,recorded_at) VALUES(?,?,?,1,'cor',?,?,UTC_TIMESTAMP(6))",[coverage,owner.id,instanceId,wrongSemesterId,actor.id]);await check('conflicting explicit coverage');await admin.execute('DELETE FROM requirement_coverage WHERE id=?',[coverage]);
  assert.ok((await classify()).includes(instanceId),'Removing temporary fixture evidence restores candidate classification');
  console.log('PASS unused-placeholder negative matrix: workflow, waiver, timing, reconciliation and conflicting coverage stay protected');
}

export async function testUnusedPlaceholderRaces({admin,request,year,semester,template,definition,school,course,day}: {admin:Connection;request:Request;year:string;semester:string;template:string;definition:string;school:string;course:string;day:string}) {
  const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r.json();};
  for(const [n,name] of ['Racelia','Racebertha','Raceceline','Racedaphne'].entries()) {
    const person=await ok(request('staff','/api/v1/scholars',{expectedVersion:0,fields:{firstName:name,lastName:name+' Synthetic',academicYearId:year,contact:{}}}));
    await ok(request('staff',`/api/v1/scholars/${person.id}/academic-records`,{academicYearId:year,schoolId:school,courseId:course,yearLevel:'Third year'}));
    const annual=await ok(request('staff',`/api/v1/scholars/${person.id}/scholarships`,{academicYearId:year,expectedVersion:0,effectiveOn:day}));
    await ok(request('staff',`/api/v1/scholarships/${annual.id}/qualification/validate`,{expectedVersion:1,effectiveOn:day,priorQualificationConfirmed:true}));
    await ok(request('coordinator',`/api/v1/scholarships/${annual.id}/qualification/select`,{expectedVersion:2,effectiveOn:day}));
    const checklist=randomUUID(),oldId=randomUUID();
    await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic race placeholder','TEST-RACE',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[checklist,annual.id,template]);
    await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[oldId,checklist,definition]);
    const provisionKey=randomUUID(),receiptKey=randomUUID();
    const prepare=()=>request('staff',`/api/v1/scholars/${person.id}/semester-requirements/provision`,{periodId:semester},provisionKey);
    const receive=()=>request('staff',`/api/v1/requirement-instances/${oldId}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null},receiptKey);
    const pair=n%2?await Promise.all([receive(),prepare()]):await Promise.all([prepare(),receive()]);
    const [provision,receipt]=n%2?[pair[1],pair[0]]:pair;
    const [[counts]]=await admin.execute<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM scholar_semesters WHERE scholar_id=? AND semester_id=?) AS owners,(SELECT COUNT(*) FROM requirement_receipts WHERE instance_id=?) AS receipts',[person.id,semester,oldId]);
    if(provision.statusCode===200){assert.equal(receipt.statusCode,409,receipt.body);assert.equal(receipt.json().error.code,'DOCUMENT_SOURCE_REPLACED');assert.equal(counts.owners,1);assert.equal(counts.receipts,0);assert.deepEqual((await prepare()).json(),provision.json());}
    else {assert.equal(provision.statusCode,409,provision.body);assert.equal(provision.json().error.code,'LEGACY_RECEIVING_EXISTS');assert.equal(receipt.statusCode,200,receipt.body);assert.equal(counts.owners,0);assert.equal(counts.receipts,1);assert.deepEqual((await receive()).json(),receipt.json());}
  }
  console.log('PASS unused-placeholder race: both initiation orders serialize receipt/provisioning and exact winner retries');
}

export async function testFrozenPlaceholderEvidence({admin,request,batch,annual,sourcePath,ids}: {admin:Connection;request:Request;batch:string;annual:string;sourcePath:string;ids:string[]}) {
  const [[stored]]=await admin.execute<RowDataPacket[]>('SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[batch]);
  const original=typeof stored.snapshot==='string'?stored.snapshot:JSON.stringify(stored.snapshot);
  const read=async()=>{const response=await request('staff',sourcePath);assert.equal(response.statusCode,200,response.body);return response.json();};
  const snapshot=JSON.parse(original) as {entries:{scholarshipId:string;evidence:{current:{sources:{requirements?:{instanceId:string|null}[]}}}}[]};
  const entry=snapshot.entries.find(e=>e.scholarshipId===annual)!;assert.ok(entry);assert.ok(Array.isArray(entry.evidence.current.sources.requirements));
  try {
    entry.evidence.current.sources.requirements!.push({instanceId:ids[0]});
    let text=JSON.stringify(snapshot);await admin.execute('UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?',[text,digest(text),batch]);
    const referenced=await read();assert.ok(!referenced.unusedPlaceholderIds.includes(ids[0]),'Explicit frozen instance reference must remain protected');assert.ok(referenced.unusedPlaceholderIds.includes(ids[1]),'Unrelated empty instance remains excluded');
    const protectedWrite=await request('staff',`/api/v1/requirement-instances/${ids[0]}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null});
    assert.equal(protectedWrite.statusCode,409,protectedWrite.body);assert.equal(protectedWrite.json().error.code,'DOCUMENT_SOURCE_REVIEW_REQUIRED');

    delete entry.evidence.current.sources.requirements;
    text=JSON.stringify(snapshot);await admin.execute('UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?',[text,digest(text),batch]);
    const incomplete=await read();assert.equal(incomplete.unusedPlaceholderIds.length,0,'Incomplete frozen document references fail closed');
    const rejected=await request('staff',`/api/v1/requirement-instances/${ids[1]}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null});
    assert.equal(rejected.statusCode,409,rejected.body);assert.equal(rejected.json().error.code,'DOCUMENT_SOURCE_REVIEW_REQUIRED');
  } finally {await admin.execute('UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?',[original,stored.snapshot_hash,batch]);}
  const missingTarget=JSON.parse(original) as {entries:{scholarshipId:string}[]};
  missingTarget.entries=missingTarget.entries.filter(e=>e.scholarshipId!==annual);
  const missingText=JSON.stringify(missingTarget);
  const [[membership]]=await admin.execute<RowDataPacket[]>('SELECT e.batch_revision,e.action FROM ovr_entries e JOIN ovr_finalizations f ON f.batch_id=e.batch_id WHERE e.batch_id=? AND e.scholarship_id=? AND e.batch_revision<=f.batch_revision ORDER BY e.batch_revision DESC LIMIT 1',[batch,annual]);
  try {
    await admin.execute('UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?',[missingText,digest(missingText),batch]);
    assert.equal((await read()).unusedPlaceholderIds.length,0,'Missing target entry in protected frozen membership fails closed');
    // Synthetic remove-before-finalization history: a removed candidate is not a frozen member.
    await admin.execute("UPDATE ovr_entries SET action='remove' WHERE batch_id=? AND batch_revision=?",[batch,membership.batch_revision]);
    const removed=await read();assert.ok(ids.every(id=>removed.unusedPlaceholderIds.includes(id)),'Removed-before-finalization candidate is not blocked by another member snapshot');
  } finally {
    await admin.execute('UPDATE ovr_entries SET action=? WHERE batch_id=? AND batch_revision=?',[membership.action,batch,membership.batch_revision]);
    await admin.execute('UPDATE ovr_finalizations SET snapshot=?,snapshot_hash=? WHERE batch_id=?',[original,stored.snapshot_hash,batch]);
  }
  const [[event]]=await admin.execute<RowDataPacket[]>('SELECT e.id,e.snapshot FROM payroll_allocations a JOIN semester_entitlement_events e ON e.id=a.approved_event_id WHERE a.batch_id=? AND a.scholarship_id=?',[batch,annual]);
  const originalEvent=typeof event.snapshot==='string'?event.snapshot:JSON.stringify(event.snapshot);
  const eventSnapshot=JSON.parse(originalEvent) as {evidence:{current:{sources:{requirements?:{instanceId:string|null}[]}}}};
  try {
    eventSnapshot.evidence.current.sources.requirements!.push({instanceId:ids[0]});
    await admin.execute('UPDATE semester_entitlement_events SET snapshot=? WHERE id=?',[JSON.stringify(eventSnapshot),event.id]);
    const referenced=await read();assert.ok(!referenced.unusedPlaceholderIds.includes(ids[0]));assert.ok(referenced.unusedPlaceholderIds.includes(ids[1]),'Entitlement protection is document-specific');
    delete eventSnapshot.evidence.current.sources.requirements;
    await admin.execute('UPDATE semester_entitlement_events SET snapshot=? WHERE id=?',[JSON.stringify(eventSnapshot),event.id]);
    assert.equal((await read()).unusedPlaceholderIds.length,0,'Incomplete entitlement references fail closed');
  } finally {await admin.execute('UPDATE semester_entitlement_events SET snapshot=? WHERE id=?',[originalEvent,event.id]);}
  const restored=await read();assert.ok(ids.every(id=>restored.unusedPlaceholderIds.includes(id)));
  console.log('PASS frozen document references: exact instance protection, unrelated placeholders excluded, incomplete historical references fail closed');
}
