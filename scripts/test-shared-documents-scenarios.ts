import { testUnusedPlaceholderRaces } from "./test-unused-placeholder-scenarios.js";
import { OFFICIAL_COHORT } from "../server/continuing/official-cohort.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { today } from "../server/scholars/validation.js";

export async function testSharedDocuments({ admin, request }: { admin: Connection; request: (role: string, path: string, body?: object, key?: string) => Promise<LightMyRequestResponse> }) {
  const ok = async (r: Promise<LightMyRequestResponse>) => { const v=await r; assert.equal(v.statusCode,200,v.body); return v.json(); };
  const day=today(), year=Number(day.slice(0,4));
  const config=async(kind:string,fields:object)=>ok(request("system_admin",`/api/v1/configuration/${kind}`,{action:"create",expectedVersion:0,fields}));
  const y=await config("academic-years",{code:"UNIFIED-YEAR",name:"Synthetic unified year",startsOn:`${year}-01-01`,endsOn:`${year}-12-31`});
  const previous=await config("semesters",{code:"UNIFIED-PRIOR",name:"Synthetic preceding semester",academicYearId:y.id,startsOn:`${year}-01-01`,endsOn:`${year}-06-30`});
  const term=await config("semesters",{code:"UNIFIED-CURRENT",name:"Synthetic shared semester",academicYearId:y.id,startsOn:`${year}-07-01`,endsOn:`${year}-12-31`});
  const p=await ok(request("staff","/api/v1/scholars",{expectedVersion:0,fields:{firstName:"Unified",lastName:"Synthetic",academicYearId:y.id,contact:{}}}));
  const roster=await ok(request("staff","/api/v1/continuing-rosters",{sourceReference:"Synthetic shared policy",entries:[{scholarId:p.id,version:1,sourceRow:1,originalName:"Unified Synthetic"}]}));
  await ok(request("coordinator",`/api/v1/continuing-rosters/${roster.id}/decision`,{expectedRevision:0,decision:"accepted",effectiveOn:day,issuer:"Synthetic committee",reference:"TEST-UNIFIED",reviewed:true}));
  const defs: {id:string}[]=[];
  for(const kind of ["COR","COG"]) defs.push(await ok(request("system_admin","/api/v1/requirement-definitions",{action:"create",code:`UNIFIED-${kind}`,expectedVersion:0,fields:{documentKind:kind==="COR"?"enrollment":"grades",name:`Synthetic ${kind}`,instructions:"Synthetic policy introduced after semester start",appliesTo:"semester",semesterId:term.id,effectiveFrom:day,effectiveUntil:null}})));
  const path=`/api/v1/continuing-rosters/${roster.id}/semester-setup`;
  const current=await ok(request("staff",`${path}?semesterId=${term.id}`));
  assert.ok(defs.every(d=>current.definitions.some((v:{id:string})=>v.id===d.id)));
  assert.ok((await ok(request("staff",`${path}?semesterId=${term.id}&policyDate=${year}-07-01`))).definitions.every((v:{id:string})=>!defs.some(d=>d.id===v.id)));
  const body={semesterId:term.id,expectedSemesterVersion:term.version,coverageReason: "Synthetic explicitly reviewed predecessor calendar", predecessorSemesterId:previous.id,corDefinitionVersionId:defs[0].id,cogDefinitionVersionId:defs[1].id,issuer:"Synthetic committee",reference:"TEST-UNIFIED",sourceReference:"Synthetic shared policy",reviewed:true};
  assert.equal((await request("coordinator",path,{...body,policyDate:`${year+1}-01-01`})).statusCode,422);
  const key=randomUUID(), setup=await ok(request("coordinator",path,body,key));
  assert.deepEqual(await ok(request("coordinator",path,body,key)),setup);
  const saved=(await ok(request("coordinator",path))).setups[0]; assert.equal(saved.policyDate,day);
  await ok(request("coordinator",path+"/availability",{scopeId:setup.id,expectedRevision:1,mode:"enabled",expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
  const receive=`/api/v1/scholars/${p.id}/semester-requirements`;
  const prepared=await ok(request("staff",receive+"/provision",{periodId:term.id}));
  const before=(await ok(request("staff",receive))).items[0]; assert.equal(before.policyDate,day);
  const scope=(await ok(request("coordinator",path))).setups.find((s:{current:boolean})=>s.current);
  const revised=await ok(request("coordinator",path,{...body,policyDate:day,expectedScopeId:scope.id,expectedScopeRevision:scope.revision,reference:"TEST-REVISED"}));
  assert.equal((await ok(request("staff",receive))).items[0].periodUnavailable,true);
  assert.equal((await request("coordinator",path,{...body,policyDate:day,expectedScopeId:scope.id,expectedScopeRevision:scope.revision})).statusCode,409);
  await ok(request("coordinator",path+"/availability",{scopeId:revised.id,expectedRevision:scope.revision+1,mode:"enabled",expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
  const after=(await ok(request("staff",receive))).items[0]; assert.equal(after.id,prepared.id); assert.deepEqual(after.items,before.items); assert.equal(after.periodUnavailable,false);
  const sharedPath=`/api/v1/continuing-rosters/${OFFICIAL_COHORT}/semester-setup`;
  const sharedOptions=await ok(request('coordinator',`${sharedPath}?semesterId=${term.id}`));
  const reusable=sharedOptions.reusableSetups.find((s:{sourceReference:string})=>s.sourceReference===body.sourceReference);
  assert.ok(reusable);
  const newPeople=[];
  const newSchool=await config('schools',{code:'SHARED-NEW-SCHOOL',name:'Synthetic shared school'}),newCourse=await config('courses',{code:'SHARED-NEW-COURSE',name:'Synthetic shared course'});
  for(const name of ['New Alpha','New Beta','Empty Import']) {
    const person=await ok(request('staff','/api/v1/scholars',{expectedVersion:0,fields:{firstName:name,lastName:'Shared Synthetic',academicYearId:y.id,contact:{}}}));
    await ok(request('staff',`/api/v1/scholars/${person.id}/academic-records`,{academicYearId:y.id,schoolId:newSchool.id,courseId:newCourse.id,yearLevel:'Third year'}));
    const annual=await ok(request('staff',`/api/v1/scholars/${person.id}/scholarships`,{academicYearId:y.id,expectedVersion:0,effectiveOn:day}));
    await ok(request('staff',`/api/v1/scholarships/${annual.id}/qualification/validate`,{expectedVersion:1,effectiveOn:day,priorQualificationConfirmed:true}));
    await ok(request('coordinator',`/api/v1/scholarships/${annual.id}/qualification/select`,{expectedVersion:2,effectiveOn:day}));
    newPeople.push(person);
    assert.equal((await request('staff',`/api/v1/scholars/${person.id}/semester-requirements/provision`,{periodId:term.id})).statusCode,423,'Cohort approval must not silently become shared approval');
  }
  const sharedBody={...body,reuseScopeId:reusable.id,reuseScopeRevision:reusable.revision};
  assert.equal((await request('staff',sharedPath,sharedBody)).statusCode,403);
  assert.equal((await request('coordinator',sharedPath,{...sharedBody,reuseScopeRevision:reusable.revision+1})).statusCode,409);
  const sharedKey=randomUUID(), sharedSetup=await ok(request('coordinator',sharedPath,sharedBody,sharedKey));
  assert.deepEqual(await ok(request('coordinator',sharedPath,sharedBody,sharedKey)),sharedSetup);
  assert.equal(sharedSetup.mode,'disabled');
  assert.equal((await request('staff',`/api/v1/scholars/${newPeople[0].id}/semester-requirements/provision`,{periodId:term.id})).statusCode,423);
  await ok(request('coordinator',sharedPath+'/availability',{scopeId:sharedSetup.id,expectedRevision:1,mode:'enabled',expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
  if(!process.argv.includes('--browser')) await testUnusedPlaceholderRaces({admin,request,year:y.id,semester:term.id,template:prepared.id,definition:defs[0].id,school:newSchool.id,course:newCourse.id,day});
  for(const person of newPeople) {
    const receivePath=`/api/v1/scholars/${person.id}/semester-requirements`;
    let emptyIds: string[] = [];
    if (person === newPeople[2]) {
      const [[annual]] = await admin.execute<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?',[person.id,y.id]);
      const checklist=randomUUID(); emptyIds=[randomUUID(),randomUUID()];
      await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Empty imported placeholders','TEST-EMPTY',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[checklist,annual.id,prepared.id]);
      for(let n=0;n<2;n++) await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[emptyIds[n],checklist,defs[n].id]);
    }
    if (emptyIds.length) {
      assert.equal((await request('system_admin',receivePath+'/provision',{periodId:term.id})).statusCode,403);
      await admin.query("CREATE TRIGGER empty_provision_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.provision' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic empty preparation failure'; END IF; END");
      try { assert.equal((await request('staff',receivePath+'/provision',{periodId:term.id})).statusCode,500); }
      finally { await admin.query('DROP TRIGGER empty_provision_audit_failure'); }
      const [[rolledBack]]=await admin.execute<RowDataPacket[]>('SELECT COUNT(*) AS n FROM scholar_semesters WHERE scholar_id=? AND semester_id=?',[person.id,term.id]);
      assert.equal(rolledBack.n,0,'Preparation and audit roll back together');
    }
    const [preparedNew, concurrentNew]=await Promise.all([ok(request('staff',receivePath+'/provision',{periodId:term.id})),ok(request('staff',receivePath+'/provision',{periodId:term.id}))]);
    assert.equal(preparedNew.id,concurrentNew.id);
    assert.equal((await ok(request('staff',receivePath+'/provision',{periodId:term.id}))).id,preparedNew.id);
    const docs=(await ok(request('staff',receivePath))).items[0];
    assert.equal(docs.items.length,2);
    if (emptyIds.length) {
      const review=await ok(request('staff',`${receivePath}/${term.id}/shared-documents`));
      assert.deepEqual(review.unusedPlaceholderIds.sort(),emptyIds.sort()); assert.equal(review.unresolved.length,0);
      assert.ok(docs.items.every((i:{receivingBlocked:unknown})=>!i.receivingBlocked));
      const [[audit]]=await admin.execute<RowDataPacket[]>("SELECT details FROM audit_logs WHERE entity_id=? AND event_type='semester.provision'",[review.ownerId]);
      const details=typeof audit.details==='string'?JSON.parse(audit.details):audit.details;
      assert.deepEqual(details.excludedPlaceholderIds.sort(),emptyIds.sort());
      assert.equal((await request('coordinator',`${receivePath}/${term.id}/shared-documents/reuse`,{mode:'automatic',sourceHash:review.sourceHash})).statusCode,409);
      if(process.argv.includes('--browser')) console.log(`Empty placeholder browser scholar=${person.id} semester=${term.id} year=${y.id}`);
      for(const id of emptyIds) assert.equal((await request('staff',`/api/v1/requirement-instances/${id}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null})).statusCode,409);
      const receiptBody={items:docs.items.map((i:{id:string})=>({id:i.id,expectedVersion:0})),physicalReference:null,storageLocation:null,remarks:null};
      const receiptKey=randomUUID(); if(!process.argv.includes('--browser')) { const received=await ok(request('staff',`/api/v1/requirement-checklists/${docs.id}/receive`,receiptBody,receiptKey));
      assert.deepEqual(await ok(request('staff',`/api/v1/requirement-checklists/${docs.id}/receive`,receiptBody,receiptKey)),received); }
      console.log('PASS empty imported placeholders: staff preparation, no reconciliation, old IDs rejected, atomic batch receiving and exact retry');
    }
    assert.ok(docs.items.every((i:{receipt:unknown;status:string})=>i.receipt===null&&i.status==='not_submitted'));
    assert.equal(docs.items.find((i:{coverage:{kind:string}})=>i.coverage.kind==='cog').coverage.semesterName,previous.name);
  }
  const [[dedicatedOwner]]=await admin.execute<RowDataPacket[]>('SELECT scope_version_id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?',[p.id,term.id]);
  assert.notEqual(dedicatedOwner.scope_version_id,sharedSetup.id,'Dedicated scope remains intact');
  // Legacy fixtures are created only in this disposable schema.
  const reusePerson=newPeople[0], reuseRoot=`/api/v1/scholars/${reusePerson.id}/semester-requirements`, reusePath=`${reuseRoot}/${term.id}/shared-documents`;
  const [[annualReuse]]=await admin.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?",[reusePerson.id,y.id]);
  const [[ownerReuse]]=await admin.execute<RowDataPacket[]>("SELECT id,actor_id FROM scholar_semesters WHERE scholar_id=? AND semester_id=?",[reusePerson.id,term.id]);
  const reuseList=(await ok(request('staff',reuseRoot))).items[0];
  const legacyChecklist=randomUUID(), legacyCor=randomUUID(), legacyCog=randomUUID();
  await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic legacy evidence','TEST-LEGACY',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[legacyChecklist,annualReuse.id,reuseList.id]);
  for(const [id,definition] of [[legacyCor,defs[0].id],[legacyCog,defs[1].id]]) await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[id,legacyChecklist,definition]);
  // Historical evidence predates the new routing guard; seed it only in this disposable fixture.
  for (const id of [legacyCor,legacyCog]) await admin.execute(`INSERT INTO requirement_receipts(id,instance_id,received_on,physical_reference,storage_location,reason,actor_id,actor_name,recorded_at) SELECT ?,?,?,'Original receipt reference','','Synthetic historical receipt',actor_id,actor_name,UTC_TIMESTAMP(6) FROM requirement_checklists WHERE id=?`,[randomUUID(),id,day,legacyChecklist]);
  const [[originalReceipt]]=await admin.execute<RowDataPacket[]>('SELECT * FROM requirement_receipts WHERE instance_id=?',[legacyCor]);
  let sourceReview=await ok(request('coordinator',reusePath));
  assert.equal(sourceReview.checks.filter((c:{automatic:boolean})=>c.automatic).length,0,'No inferred coverage from names');
  const blockedSlot=reuseList.items.find((i:{coverage:{kind:string}})=>i.coverage.kind==='cor');
  assert.equal((await request('staff',`/api/v1/requirement-instances/${blockedSlot.id}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null})).statusCode,409,'Unresolved source blocks duplicate receiving');
  assert.equal((await request('coordinator',reusePath+'/reuse',{mode:'automatic',sourceHash:sourceReview.sourceHash})).statusCode,409);
  await admin.execute("INSERT INTO requirement_coverage(id,scholar_semester_id,requirement_instance_id,revision,document_kind,coverage_semester_id,actor_id,recorded_at) VALUES(?,?,?,1,'cor',?,?,UTC_TIMESTAMP(6))",[randomUUID(),ownerReuse.id,legacyCor,term.id,ownerReuse.actor_id]);
  sourceReview=await ok(request('coordinator',reusePath));
  assert.equal(sourceReview.checks.find((c:{id:string})=>c.id===legacyCor).automatic,true);
  const autoBody={mode:'automatic',sourceHash:sourceReview.sourceHash},autoKey=randomUUID();
  assert.equal((await request('staff',reusePath+'/reuse',autoBody)).statusCode,403);
  assert.equal((await request('system_admin',reusePath+'/reuse',autoBody)).statusCode,403);
  await admin.query("CREATE TRIGGER reuse_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.documents.reuse' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic reuse audit failure'; END IF; END");
  try {assert.equal((await request('coordinator',reusePath+'/reuse',autoBody)).statusCode,500);} finally {await admin.query('DROP TRIGGER reuse_audit_failure');}
  assert.equal((await ok(request('coordinator',reusePath))).links.length,0);
  const reused=await ok(request('coordinator',reusePath+'/reuse',autoBody,autoKey));
  assert.deepEqual(reused.reused,[legacyCor]);assert.deepEqual(await ok(request('coordinator',reusePath+'/reuse',autoBody,autoKey)),reused);
  assert.equal((await request('coordinator',reusePath+'/reuse',autoBody)).statusCode,409,'Stale source rejected');
  const projected=(await ok(request('staff',reuseRoot))).items[0];
  assert.ok(projected.items.some((i:{id:string;status:string})=>i.id===legacyCor&&i.status==='submitted'));
  assert.equal(projected.items.length,2);
  assert.deepEqual((await admin.execute<RowDataPacket[]>('SELECT * FROM requirement_receipts WHERE instance_id=?',[legacyCor]))[0][0],originalReceipt);
  const emptyCor=reuseList.items.find((i:{coverage:{kind:string}})=>i.coverage.kind==='cor');
  assert.equal((await request('staff',`/api/v1/requirement-instances/${emptyCor.id}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null})).statusCode,409,'Hidden preparation slot cannot receive a duplicate');
  sourceReview=await ok(request('coordinator',reusePath));
  const manual={mode:'reviewed',sourceHash:sourceReview.sourceHash,legacyId:legacyCog,kind:'cog',reviewed:true,reason:'Checked original grades period against approved setup',reference:'TEST-COVERAGE'};
  assert.equal((await request('coordinator',reusePath+'/reuse',{...manual,reviewed:false})).statusCode,422);
  assert.equal((await request('coordinator',reusePath+'/reuse',{...manual,kind:'cor'})).statusCode,409,'Explicit policy kinds cannot be swapped');
  const manualKey=randomUUID();await ok(request('coordinator',reusePath+'/reuse',manual,manualKey));
  assert.deepEqual(await ok(request('coordinator',reusePath+'/reuse',manual,manualKey)),{reused:[legacyCog]});
  assert.equal((await ok(request('coordinator',reusePath))).unresolved.length,0);
  const allReused=(await ok(request('staff',reuseRoot))).items[0];
  assert.deepEqual(allReused.items.map((i:{id:string})=>i.id).sort(),[legacyCor,legacyCog].sort());
  assert.equal((await request('staff',`/api/v1/requirement-checklists/${allReused.id}/receive`,{items:[{id:legacyCog,expectedVersion:0}],physicalReference:null,storageLocation:null,remarks:null})).statusCode,409,'Original receipt remains immutable');
  assert.equal((await ok(request('staff',`${reuseRoot}/${term.id}/compliance`))).documents.length,2);
  // No-owner case: one reviewed command prepares the semester and retains a
  // previously verified receipt, without pretending its old coverage was known.
  const unprepared=await ok(request('staff','/api/v1/scholars',{expectedVersion:0,fields:{firstName:'Legacy Coverage',lastName:'Synthetic',academicYearId:y.id,contact:{}}}));
  await ok(request('staff',`/api/v1/scholars/${unprepared.id}/academic-records`,{academicYearId:y.id,schoolId:newSchool.id,courseId:newCourse.id,yearLevel:'Third year'}));
  const unpreparedAnnual=await ok(request('staff',`/api/v1/scholars/${unprepared.id}/scholarships`,{academicYearId:y.id,expectedVersion:0,effectiveOn:day}));
  await ok(request('staff',`/api/v1/scholarships/${unpreparedAnnual.id}/qualification/validate`,{expectedVersion:1,effectiveOn:day,priorQualificationConfirmed:true}));
  await ok(request('coordinator',`/api/v1/scholarships/${unpreparedAnnual.id}/qualification/select`,{expectedVersion:2,effectiveOn:day}));
  const unpreparedChecklist=randomUUID(),verifiedLegacy=randomUUID();
  await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic legacy verified','TEST-LEGACY',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[unpreparedChecklist,unpreparedAnnual.id,reuseList.id]);
  await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[verifiedLegacy,unpreparedChecklist,defs[0].id]);
  const oldPath=`/api/v1/requirement-instances/${verifiedLegacy}`;
  await ok(request('staff',oldPath+'/receive',{expectedVersion:0,physicalReference:'Original verified receipt',storageLocation:null,remarks:null}));
  const originalContext=await ok(request('staff',oldPath+'/verification-context'));
  const verificationDocument={scholarId:originalContext.scholarId,scholarVersion:originalContext.scholarVersion,academicYearId:originalContext.academicYearId,semesterId:originalContext.semesterId,schoolId:originalContext.schoolId,courseId:originalContext.courseId,academicVersion:originalContext.academicVersion,definitionVersionId:originalContext.definitionVersionId};
  await ok(request('staff',oldPath+'/verify',{action:'verify',expectedVersion:1,effectiveOn:day,remarks:null,document:verificationDocument,checks:{identity:true,period:true,placement:true,applicability:true,validity:true}}));
  const noOwnerRoot=`/api/v1/scholars/${unprepared.id}/semester-requirements`,noOwnerPath=`${noOwnerRoot}/${term.id}/shared-documents`;
  const beforeOwner=await ok(request('coordinator',noOwnerPath));assert.equal(beforeOwner.ownerId,null);
  const verifiedHistory=beforeOwner.legacy[0].history;
  assert.equal(beforeOwner.checks[0].automatic,false);
  const noOwnerBody={mode:'reviewed',sourceHash:beforeOwner.sourceHash,legacyId:verifiedLegacy,kind:'cor',reviewed:true,reason:'Checked original enrollment coverage and policy compatibility',reference:'TEST-ORIGINAL-COR'};
  await admin.query("CREATE TRIGGER reuse_prepare_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='semester.documents.reuse' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic preparation rollback'; END IF; END");
  try {assert.equal((await request('coordinator',noOwnerPath+'/reuse',noOwnerBody)).statusCode,500);} finally {await admin.query('DROP TRIGGER reuse_prepare_failure');}
  assert.equal((await ok(request('coordinator',noOwnerPath))).ownerId,null,'Preparation rolled back with audit');
  const simultaneous=await Promise.all([request('coordinator',noOwnerPath+'/reuse',noOwnerBody),request('coordinator',noOwnerPath+'/reuse',noOwnerBody)]);
  assert.deepEqual(simultaneous.map(r=>r.statusCode).sort(),[200,409]);
  const afterOwner=await ok(request('coordinator',noOwnerPath));assert.deepEqual(afterOwner.legacy[0].history,verifiedHistory);
  const retained=(await ok(request('staff',noOwnerRoot))).items[0].items.find((i:{id:string})=>i.id===verifiedLegacy);
  assert.equal(retained.status,'verified');assert.equal(retained.verificationNeedsReview,true);
  assert.ok(retained.receipt);assert.equal(retained.originalReused,true);
  const currentCompliance=await ok(request('staff',`${noOwnerRoot}/${term.id}/compliance`));
  assert.equal(currentCompliance.documents.find((d:{id:string})=>d.id===verifiedLegacy).verified,false,'Old verification does not acquire new coverage silently');
  // Show an unresolved source in the disposable browser fixture.
  if (process.argv.includes('--browser')) {
    const uiPerson=newPeople[1], uiList=(await ok(request('staff',`/api/v1/scholars/${uiPerson.id}/semester-requirements`))).items[0];
    const [[uiAnnual]]=await admin.execute<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?',[uiPerson.id,y.id]);
    const uiChecklist=randomUUID();
    await admin.execute(`INSERT INTO requirement_checklists(id,scholarship_record_id,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,reason,reference_text,actor_id,actor_name,created_at) SELECT ?,?,semester_id,policy_date,year_code,year_name,semester_code,semester_name,semester_version,'Synthetic browser source','TEST-BROWSER',actor_id,actor_name,created_at FROM requirement_checklists WHERE id=?`,[uiChecklist,uiAnnual.id,uiList.id]);
    await admin.execute("INSERT INTO requirement_instances(id,checklist_id,definition_version_id,status,created_at) VALUES(?,?,?,'not_submitted',UTC_TIMESTAMP(6))",[randomUUID(),uiChecklist,defs[0].id]);
    console.log(`Document reuse browser scholar=${uiPerson.id} semester=${term.id} year=${y.id}`);
  }
  console.log('PASS reviewed legacy: atomic first preparation, concurrent winner, original verified history retained but stale for new coverage');
  console.log('PASS document reuse: exact coverage only, original receipt retained, Coordinator permission, audit rollback, retry, stale source, duplicate-slot rejection, reviewed missing coverage and shared projection');
  console.log('PASS shared setup: explicit reuse review, stale source rejection, authorization, disabled until enablement, two selected new scholars inherit once with idempotent provisioning');
  const cycles=[];
  for(const n of [1,2]) cycles.push(await ok(request("system_admin","/api/v1/payout-cycles",{action:"create",code:`UNIFIED-PAY-${n}`,semesterId:term.id,expectedSemesterVersion:term.version,expectedVersion:0,fields:{name:`Synthetic cycle ${n}`,targetDate:`${year}-12-01`,requirements:[]}})));
  for(const c of cycles) { assert.equal(c.requirements.length,0); assert.ok(c.semesterDocuments.some((s:{cohort:string})=>s.cohort===roster.id)); }
  const instances=(await admin.execute<RowDataPacket[]>("SELECT i.id FROM requirement_instances i JOIN requirement_checklists c ON c.id=i.checklist_id WHERE c.id=?",[prepared.id]))[0]; assert.equal(instances.length,2);
  assert.equal((await ok(request("staff",receive+"/provision",{periodId:term.id}))).created,false);
  assert.equal((await request("system_admin","/api/v1/payout-cycles",{action:"create",code:"UNIFIED-EMPTY",semesterId:previous.id,expectedSemesterVersion:previous.version,expectedVersion:0,fields:{name:"No inherited policy",targetDate:day,requirements:[]}})).statusCode,409);
  const cog=after.items.find((i:{coverage?:{kind:string}})=>i.coverage?.kind==='cog');
  const cardPath=`/api/v1/requirement-instances/${cog.id}/entrant-card`;
  const review=await ok(request('coordinator',cardPath));
  const cardInput={sourceHash:review.sourceHash,expectedRevision:0,decision:'approved',issuingSchool:'Synthetic Senior High School',schoolYear:`${year-1}-${year}`,gradingPeriod:'Final grading period',periodEnd:`${year}-06-01`,reference:'TEST-ENTRANT',reason:'Reviewed first-time entrant and original grading card',firstTimeEntrant:true,noCompletedCollegeSemester:true,latestCompletedPeriod:true,reviewed:true};
  assert.equal((await request('staff',cardPath,cardInput)).statusCode,403);
  assert.equal((await request('system_admin',cardPath,cardInput)).statusCode,403);
  assert.equal((await request('coordinator',cardPath,{...cardInput,reviewed:false})).statusCode,422);
  assert.equal((await request('coordinator',cardPath,{...cardInput,periodEnd:day})).statusCode,422);
  await admin.query("CREATE TRIGGER entrant_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.entrant-card' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'; END IF; END");
  try{assert.equal((await request('coordinator',cardPath,cardInput)).statusCode,500);}finally{await admin.query('DROP TRIGGER entrant_audit_failure');}
  assert.equal((await ok(request('coordinator',cardPath))).card,null);
  const cardKey=randomUUID();
  const attempts=await Promise.all([request('coordinator',cardPath,cardInput,cardKey),request('coordinator',cardPath,cardInput)]);
  assert.deepEqual(attempts.map(r=>r.statusCode).sort(),[200,409]);
  const approval=(await ok(request('coordinator',cardPath))).card;
  if(attempts[0].statusCode===200)assert.deepEqual(await ok(request('coordinator',cardPath,cardInput,cardKey)),attempts[0].json());
  const cardDoc=(await ok(request('staff',receive))).items[0].items.find((i:{id:string})=>i.id===cog.id);
  assert.equal(cardDoc.coverageStatus,'grading_card');assert.equal(cardDoc.entrantCard.issuingSchool,cardInput.issuingSchool);
  const receipt={expectedVersion:0,physicalReference:null,storageLocation:'',remarks:null,documentType:'shs_grading_card',entrantCardId:approval.id};
  assert.equal((await request('staff',`/api/v1/requirement-instances/${cog.id}/receive`,{...receipt,entrantCardId:randomUUID()})).statusCode,409);
  const receiptKey=randomUUID(),received=await ok(request('staff',`/api/v1/requirement-instances/${cog.id}/receive`,receipt,receiptKey));
  assert.deepEqual(await ok(request('staff',`/api/v1/requirement-instances/${cog.id}/receive`,receipt,receiptKey)),received);
  const ctx=await ok(request('staff',`/api/v1/requirement-instances/${cog.id}/verification-context`));
  assert.equal(ctx.schoolId,null);assert.equal(ctx.courseId,null);assert.equal(ctx.schoolName,cardInput.issuingSchool);assert.equal(ctx.entrantCard.id,approval.id);
  const verify={action:'verify',expectedVersion:1,reason:'Synthetic physical grading card verified',reference:'TEST-VERIFY',remarks:null,attestation:'all-five-checked',document:{scholarId:ctx.scholarId,scholarVersion:ctx.scholarVersion,academicYearId:ctx.academicYearId,semesterId:ctx.semesterId,schoolId:ctx.schoolId,courseId:ctx.courseId,academicVersion:ctx.academicVersion,definitionVersionId:ctx.definitionVersionId,coverageId:ctx.coverageId,semesterRevision:ctx.semesterRevision,entrantCardId:approval.id}};
  await ok(request('staff',`/api/v1/requirement-instances/${cog.id}/verify`,verify));
  const compliance=await ok(request('staff',`${receive}/${term.id}/compliance`));
  assert.notEqual(compliance.result,'compliant');assert.ok(compliance.blockers.some((b:string)=>b.includes('grading card')));
  const usedReview=await ok(request('coordinator',cardPath));
  assert.ok(usedReview.editBlocker);
  assert.equal((await request('coordinator',cardPath,{...cardInput,expectedRevision:approval.revision,sourceHash:usedReview.sourceHash,issuingSchool:'Another school'})).statusCode,409);
  assert.equal((await ok(request('coordinator',cardPath))).card.id,approval.id);
  if(!process.argv.includes('--browser')) {
    const emptyRoot=`/api/v1/scholars/${newPeople[2].id}/semester-requirements`, sources=`${emptyRoot}/${term.id}/shared-documents`;
    const sourceBefore=await ok(request('staff',sources));
    assert.equal(sourceBefore.unusedPlaceholderIds.length,2);
    const assertPinned=async()=>{
      const source=await ok(request('staff',sources));
      assert.deepEqual(source.unusedPlaceholderIds,sourceBefore.unusedPlaceholderIds,'Current setup changes cannot revive old empty rows');
      assert.deepEqual(source.unresolved,sourceBefore.unresolved,'Setup availability is separate from documentary evidence');
      for(const id of sourceBefore.unusedPlaceholderIds){const r=await request('staff',`/api/v1/requirement-instances/${id}/receive`,{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null});assert.equal(r.statusCode,409,r.body);assert.equal(r.json().error.code,'DOCUMENT_SOURCE_REPLACED');}
    };
    const latest=(await ok(request('coordinator',sharedPath))).setups.find((s:{current:boolean})=>s.current);
    await ok(request('coordinator',sharedPath+'/availability',{scopeId:latest.id,expectedRevision:latest.revision,mode:'disabled',reason:'Synthetic paused setup review',expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
    await assertPinned();assert.equal((await ok(request('staff',emptyRoot))).items[0].periodUnavailable,true);
    const replacement=await ok(request('system_admin','/api/v1/requirement-definitions',{action:'create',code:'UNIFIED-REPLACEMENT-COR',expectedVersion:0,fields:{documentKind:'enrollment',name:'Synthetic separately approved COR',instructions:'Synthetic new policy lineage',appliesTo:'semester',semesterId:term.id,effectiveFrom:day,effectiveUntil:null}}));
    const disabled=(await ok(request('coordinator',sharedPath))).setups.find((s:{current:boolean})=>s.current);
    const next=await ok(request('coordinator',sharedPath,{...body,corDefinitionVersionId:replacement.id,policyDate:day,expectedScopeId:disabled.id,expectedScopeRevision:disabled.revision,reference:'TEST-PINNED-REVISION'}));
    const revisedScope=(await ok(request('coordinator',sharedPath))).setups.find((s:{current:boolean})=>s.current);
    await ok(request('coordinator',sharedPath+'/availability',{scopeId:next.id,expectedRevision:revisedScope.revision,mode:'enabled',expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
    await assertPinned();
    const pinned=(await ok(request('staff',emptyRoot))).items[0];
    assert.equal(pinned.periodUnavailable,false);assert.ok(pinned.items.every((i:{receivingBlocked:unknown})=>!i.receivingBlocked));
    const [[currentPolicy]]=await admin.execute<RowDataPacket[]>('SELECT p.id,p.rules FROM workflow_scope_versions w JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE w.id=?',[next.id]);
    const originalRules=typeof currentPolicy.rules==='string'?currentPolicy.rules:JSON.stringify(currentPolicy.rules);
    const rules=JSON.parse(originalRules) as {retainedScopeIds:string[];predecessorSemesterId:string};
    try {
      await admin.execute('UPDATE workflow_policy_versions SET rules=? WHERE id=?',[JSON.stringify({...rules,retainedScopeIds:[]}),currentPolicy.id]);
      await assertPinned();
      const nonretained=await ok(request('staff',sources));assert.ok(nonretained.setupIssue,'Non-retained owner has a setup blocker rather than false documentary evidence');
      assert.equal((await ok(request('staff',emptyRoot))).items[0].periodUnavailable,true);
      // Simulate a changed current mapping; existing owner's approved COG coverage is immutable.
      await admin.execute('UPDATE workflow_policy_versions SET rules=? WHERE id=?',[JSON.stringify({...rules,predecessorSemesterId:term.id}),currentPolicy.id]);
      await assertPinned();
      const changed=await ok(request('staff',sources));
      assert.deepEqual(changed.options,sourceBefore.options,'Predecessor edits cannot replace pinned owner coverage');
      const documents=(await ok(request('staff',emptyRoot))).items[0].items;
      assert.equal(documents.find((d:{coverage:{kind:string}})=>d.coverage.kind==='cog').coverage.semesterName,previous.name);
    } finally {await admin.execute('UPDATE workflow_policy_versions SET rules=? WHERE id=?',[originalRules,currentPolicy.id]);}
    const [[ownerPolicy]]=await admin.execute<RowDataPacket[]>('SELECT p.id,p.rules FROM scholar_semesters ss JOIN workflow_scope_versions w ON w.id=ss.scope_version_id JOIN workflow_policy_versions p ON p.id=w.policy_version_id WHERE ss.scholar_id=? AND ss.semester_id=?',[newPeople[2].id,term.id]);
    const originalOwnerRules=typeof ownerPolicy.rules==='string'?ownerPolicy.rules:JSON.stringify(ownerPolicy.rules);
    const incompleteRules=JSON.parse(originalOwnerRules) as {predecessorSemesterId?:string};delete incompleteRules.predecessorSemesterId;
    try {
      await admin.execute('UPDATE workflow_policy_versions SET rules=? WHERE id=?',[JSON.stringify(incompleteRules),ownerPolicy.id]);
      const incomplete=await ok(request('staff',sources));
      assert.ok(incomplete.setupIssue,'Incomplete historical owner policy reports a configuration issue');assert.equal(incomplete.options.length,0);
    } finally {await admin.execute('UPDATE workflow_policy_versions SET rules=? WHERE id=?',[originalOwnerRules,ownerPolicy.id]);}
    await assertPinned();
    console.log('PASS unused-placeholder setup lifecycle: disablement and new policy lineage preserve pinned source exclusion and obsolete-ID rejection');
  }
  const fresh=await ok(request('staff','/api/v1/scholars',{expectedVersion:0,fields:{firstName:'Freshman',lastName:'Synthetic',academicYearId:y.id,contact:{}}}));
  const school=await config('schools',{code:'FRESH-SCHOOL',name:'Synthetic Freshman College'}),course=await config('courses',{code:'FRESH-COURSE',name:'Synthetic Freshman Degree'});
  await ok(request('staff',`/api/v1/scholars/${fresh.id}/academic-records`,{academicYearId:y.id,schoolId:school.id,courseId:course.id,yearLevel:'First year'}));
  const freshRoster=await ok(request('staff','/api/v1/continuing-rosters',{sourceReference:'Synthetic entrant document review',entries:[{scholarId:fresh.id,version:1,sourceRow:2,originalName:'Synthetic Freshman'}]}));
  await ok(request('coordinator',`/api/v1/continuing-rosters/${freshRoster.id}/decision`,{expectedRevision:0,decision:'accepted',effectiveOn:day,issuer:'Synthetic committee',reference:'TEST-FRESH',reviewed:true}));
  const freshSetupPath=`/api/v1/continuing-rosters/${freshRoster.id}/semester-setup`;
  const freshSetup=await ok(request('coordinator',freshSetupPath,body));
  await ok(request('coordinator',freshSetupPath+'/availability',{scopeId:freshSetup.id,expectedRevision:1,mode:'enabled',expectedSemesterVersion:term.version,expectedPredecessorVersion:previous.version,reviewed:true}));
  const freshReceive=`/api/v1/scholars/${fresh.id}/semester-requirements`;
  await ok(request('staff',freshReceive+'/provision',{periodId:term.id}));
  const freshCog=(await ok(request('staff',freshReceive))).items[0].items.find((i:{coverage?:{kind:string}})=>i.coverage?.kind==='cog');
  assert.equal(freshCog.firstSemesterExceptionAvailable,false,'No semester mapping: hide exception action');
  const exceptionPath=`/api/v1/requirement-instances/${freshCog.id}/entrant-card`;
  let exceptionContext=await ok(request('coordinator',exceptionPath));
  const exceptionInput={...cardInput,sourceHash:exceptionContext.sourceHash,mode:'initial_requirements',admissionAssessmentReference:'TEST-ADMISSION-APPROVAL',admissionAssessmentReviewed:true,initialRequirementsReviewed:true,firstYearFirstSemester:true};
  assert.equal((await request('coordinator',exceptionPath,exceptionInput)).statusCode,409,'Unmapped semester cannot grant freshman exception');
  await admin.execute('INSERT INTO regular_payout_periods(cycle_id,semester_id,academic_year_id,term_number,semester_version,year_version,actor_id,recorded_at) SELECT ?,?,?,1,?,?,actor_id,UTC_TIMESTAMP(6) FROM scholar_semesters WHERE scholar_id=? AND semester_id=?',[cycles[0].id,term.id,y.id,term.version,y.version,fresh.id,term.id]);
  assert.equal((await ok(request('staff',freshReceive))).items[0].items.find((i:{id:string})=>i.id===freshCog.id).firstSemesterExceptionAvailable,true,'First year in first semester: show exception action');
  assert.equal((await ok(request('staff',`/api/v1/scholars/${newPeople[0].id}/semester-requirements`))).items[0].items.find((i:{coverage:{kind:string}})=>i.coverage.kind==='cog').firstSemesterExceptionAvailable,false,'Third year in first semester: hide exception action');
  exceptionContext=await ok(request('coordinator',exceptionPath));
  const exceptionBody={...exceptionInput,sourceHash:exceptionContext.sourceHash};
  assert.equal((await request('staff',exceptionPath,exceptionBody)).statusCode,403);
  await ok(request('coordinator',exceptionPath,exceptionBody));
  const exemptDoc=(await ok(request('staff',freshReceive))).items[0].items.find((i:{id:string})=>i.id===freshCog.id);
  assert.equal(exemptDoc.notRequired,true);assert.equal(exemptDoc.status,'not_submitted');assert.equal(exemptDoc.receipt,null);
  assert.equal((await request('staff',`/api/v1/requirement-instances/${freshCog.id}/receive`,{...receipt,entrantCardId:exemptDoc.entrantCard.id})).statusCode,409);
  const entrantCompliance=await ok(request('staff',`${freshReceive}/${term.id}/compliance`));
  assert.ok(entrantCompliance.documents.find((d:{id:string})=>d.id===freshCog.id).notRequired);
  assert.equal(entrantCompliance.blockers.some((b:string)=>b==="Verify the preceding completed semester's COG."),false);
  assert.notEqual(entrantCompliance.result,'compliant');
  await admin.execute('UPDATE regular_payout_periods SET term_number=2 WHERE semester_id=?',[term.id]);
  assert.equal((await ok(request('staff',freshReceive))).items[0].items.find((i:{id:string})=>i.id===freshCog.id).notRequired,false,'Exception cannot carry into a second-semester mapping');
  assert.equal((await ok(request('staff',freshReceive))).items[0].items.find((i:{id:string})=>i.id===freshCog.id).firstSemesterExceptionAvailable,false,'Second semester: hide exception action');
  await admin.execute('UPDATE regular_payout_periods SET term_number=1 WHERE semester_id=?',[term.id]);
  const academicPath=`${freshReceive}/${term.id}/academic-context`;
  const academicView=await ok(request('staff',academicPath));
  await ok(request('staff',academicPath,{expectedRevision:academicView.revision,academicRecordId:academicView.current.id,expectedAcademicVersion:academicView.current.version,category:'degree'}));
  const freshList=(await ok(request('staff',freshReceive))).items[0];
  const corDoc=freshList.items.find((i:{coverage:{kind:string}})=>i.coverage.kind==='cor');
  const corPath=`/api/v1/requirement-instances/${corDoc.id}`;
  await ok(request('staff',corPath+'/receive',{expectedVersion:0,physicalReference:null,storageLocation:null,remarks:null}));
  await ok(request('staff',corPath+'/send-for-verification',{action:'send-for-verification',expectedVersion:1,effectiveOn:day,remarks:null}));
  const corContext=await ok(request('staff',corPath+'/verification-context'));
  const {scholarId,scholarVersion,academicYearId,semesterId,schoolId,courseId,academicVersion,definitionVersionId,coverageId,semesterRevision}=corContext;
  await ok(request('staff',corPath+'/verify',{action:'verify',expectedVersion:2,effectiveOn:day,remarks:null,document:{scholarId,scholarVersion,academicYearId,semesterId,schoolId,courseId,academicVersion,definitionVersionId,coverageId,semesterRevision},checks:{identity:true,period:true,placement:true,applicability:true,validity:true}}));
  const compliancePath=`${freshReceive}/${term.id}/compliance`;
  const ready=await ok(request('staff',compliancePath));
  assert.equal(ready.writeBlocker,null);
  const findings={average:null,enrolled:true,fullLoad:true,hasFailed:null,hasDropped:null,hasIncomplete:null};
  const assessed=await ok(request('staff',compliancePath,{sourceHash:ready.sourceHash,expectedRevision:ready.revision,findings,reviewed:true}));
  assert.equal(assessed.result,'compliant','Freshman academic basis plus verified COR and reviewed enrollment/load');
  const revokeContext=await ok(request('coordinator',exceptionPath));
  const revoke={decision:'revoked',expectedRevision:revokeContext.card.revision,sourceHash:revokeContext.sourceHash,reference:'TEST-REVOKE',reason:'Initial entrant evidence requires correction',reviewed:true};
  assert.equal((await request('staff',exceptionPath,revoke)).statusCode,403);
  await admin.query("CREATE TRIGGER revoke_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.entrant-card' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic revocation audit failure'; END IF; END");
  try {assert.equal((await request('coordinator',exceptionPath,revoke)).statusCode,500);} finally {await admin.query('DROP TRIGGER revoke_audit_failure');}
  assert.equal((await ok(request('coordinator',exceptionPath))).card.decision,'approved');
  const revokeKey=randomUUID();
  const revoked=await ok(request('coordinator',exceptionPath,revoke,revokeKey));
  assert.deepEqual(await ok(request('coordinator',exceptionPath,revoke,revokeKey)),revoked);
  assert.equal((await ok(request('coordinator',exceptionPath))).card.decision,'revoked');
  assert.equal((await ok(request('staff',compliancePath))).stale,true,'Revocation invalidates current academic evidence');
  assert.equal((await ok(request('staff',freshReceive))).items[0].items.find((i:{id:string})=>i.id===freshCog.id).notRequired,false);
  console.log('PASS revocation: no false entrant assertions, roles, audit rollback, exact retry and unchanged original review');
  console.log('PASS first-semester COR-only exception: reviewed initial requirements, first-year record and explicit term mapping; no fabricated COG receipt/verification or automatic academic eligibility');
  console.log('PASS entrant grading card: explicit approval, role/attestation/date rejection, audit rollback, concurrent revision winner, receipt retries, explicit school coverage and no automatic academic compliance');
  console.log("PASS unified semester documents: mid-semester policies, default/pinned dates, exact retries, reviewed setup revisions, unchanged instances, two cycles inheriting one source and empty-policy rejection");
}
