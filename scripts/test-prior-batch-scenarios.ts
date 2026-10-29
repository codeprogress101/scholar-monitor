import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import type {Pool,RowDataPacket} from "mysql2/promise";
import type {LightMyRequestResponse} from "fastify";
import type {PriorBatchPreview} from "../server/requirements/prior-approval-service.js";
import type {OvrDetail,OvrFinalization} from "../server/ovr/model.js";
import {currentPayrollTemplate,payrollLayout} from "../server/ovr/payroll-form.js";
import {decodeStoredJson} from "../server/stored-json.js";
import {requirementState} from "../server/requirements/workflow-state.js";
import {digest} from "../server/auth/crypto.js";
import {today} from "../server/scholars/validation.js";
import {checkManagedPayment} from "../server/ovr/managed-release.js";
type Request=(role:string,url:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;
export async function testPriorBatchApproval(request:Request,pool:Pool,importId:string,semesterId:string,day:string,runtime?:Pool){
 const start=performance.now(),evidence={reason:"Synthetic confirmed previously completed batch assessment",reference:"TEST-PRIOR-BATCH"};
 const ok=async<T>(p:Promise<LightMyRequestResponse>):Promise<T>=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r.json<T>();};
 const path=`/api/v1/document-batches/prior-approval-preview?importId=${importId}&semesterId=${semesterId}`;
 // Synthetic period identity is explicit; no working calendar is modified.
 await pool.execute("UPDATE semesters SET term_kind='first' WHERE id=?",[semesterId]);
 const [[period]]=await pool.execute<RowDataPacket[]>("SELECT s.*,DATE_FORMAT(s.starts_on,'%Y-%m-%d') starts,y.version year_version FROM semesters s JOIN academic_years y ON y.id=s.academic_year_id WHERE s.id=?",[semesterId]);
 const [[confirmed]]=await pool.execute<RowDataPacket[]>("SELECT result FROM import_confirmations WHERE job_id=?",[importId]);
 const imported=typeof confirmed.result==='string'?JSON.parse(confirmed.result):confirmed.result;
 const people=imported.items as {id:string}[],total=people.length;
 // Publish all 835 through the existing commands before taking approval fingerprints.
 const master=await ok<{id:string}>(request("staff","/api/v1/masterlists",{academicYearId:period.academic_year_id,title:"Synthetic prior-approved Batch 1",...evidence}));
 for(const [index,p] of people.entries())await ok(request("staff",`/api/v1/masterlists/${master.id}/entries`,{action:"add",expectedVersion:index+1,scholarId:p.id,awardNumber:null,...evidence}));
 for(const [index,action] of ["submit-verification","submit-approval","approve","publish"].entries())await ok(request(index<2?"staff":"coordinator",`/api/v1/masterlists/${master.id}/${action}`,{expectedVersion:people.length+1+index,...evidence,...(action==='publish'?{effectiveOn:day}:{})}));
 console.log(`Prior-batch fixture: ${total} official members published; checking adoption guards`);
 let preview=await ok<PriorBatchPreview>(request("coordinator",path));
 assert.equal(preview.scholarCount,total);assert.ok(preview.members.every(m=>!m.issues.length),JSON.stringify(preview.members.filter(m=>m.issues.length).slice(0,2)));
 assert.equal((await request("staff",path)).statusCode,403);assert.equal((await request("system_admin",path)).statusCode,403);
 const unknowns=preview.members.filter(m=>m.documents.some(d=>d.kind==='cog'&&d.status==='submitted'));
 for(const member of unknowns.slice(0,2)){const d=member.documents.find(d=>d.kind==='cog')!;const db=await pool.getConnection();let version;try{version=(await requirementState(db,d.id)).version;}finally{db.release();}await ok(request("coordinator",`/api/v1/requirement-instances/${d.id}/waive`,{expectedVersion:version,effectiveOn:day,reason:"Mistaken synthetic waiver while testing received documents",authorityReference:"TEST-WAIVER-ERROR",remarks:null}));}
 preview=await ok(request("coordinator",path));
 const makeBody=(p:PriorBatchPreview)=>({...evidence,importId,semesterId,scopeHash:p.scopeHash,items:p.members.filter(m=>!m.issues.length&&!m.approval?.valid).map(m=>({id:m.id,sourceHash:m.sourceHash})),approvalOn:null,deadlineOn:period.starts,sourceLocation:"Synthetic approved batch papers held in test fixture",documentsPreviouslyVerified:true,academicEligibilityPreviouslyApproved:true,deadlineCompliancePreviouslyApproved:true,correctMistakenWaivers:true});
 const body=makeBody(preview), key=randomUUID();
 assert.equal((await request("staff","/api/v1/document-batches/prior-approval",body)).statusCode,403);
 assert.equal((await request("system_admin","/api/v1/document-batches/prior-approval",body)).statusCode,403);
 assert.equal((await request("coordinator","/api/v1/document-batches/prior-approval",{...body,correctMistakenWaivers:false})).statusCode,422);
 assert.equal((await request("coordinator","/api/v1/document-batches/prior-approval",{...body,documentsPreviouslyVerified:false})).statusCode,422);
 assert.equal((await request("coordinator","/api/v1/document-batches/prior-approval",{...body,items:[{...body.items[0],sourceHash:'0'.repeat(64)}]})).statusCode,409);
 const [[receiptBefore]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n,SUM(UNIX_TIMESTAMP(recorded_at)) timestamps FROM requirement_receipts");
 const [[academicBefore]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM academic_records");
 const small={...body,items:body.items.slice(0,2)};
 await pool.query("CREATE TRIGGER fail_prior_batch BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='documents.prior-batch-approval' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic prior approval audit rollback'; END IF; END");
 assert.equal((await request("coordinator","/api/v1/document-batches/prior-approval",small)).statusCode,500);
 const [[rollback]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM prior_batch_approvals");assert.equal(Number(rollback.n),0);await pool.query("DROP TRIGGER fail_prior_batch");
 const results=await Promise.all([request("coordinator","/api/v1/document-batches/prior-approval",body,key),request("coordinator","/api/v1/document-batches/prior-approval",body,key)]);
 assert.equal(results[0].statusCode,200,results[0].body);assert.equal(results[1].statusCode,200,results[1].body);assert.deepEqual(results[0].json(),results[1].json());
 assert.equal(results[0].json().scholarCount,total);assert.equal(results[0].json().correctedWaivers,2);
 console.log("Prior-batch fixture: adoption committed once; checking shared academic evidence and historical setup");
 const [[truth]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM requirement_workflow_events WHERE JSON_EXTRACT(details,'$.priorBatchApproval') IS NOT NULL AND (JSON_EXTRACT(details,'$.checks') IS NOT NULL OR JSON_EXTRACT(details,'$.attestation') IS NOT NULL)");assert.equal(Number(truth.n),0,'Prior approvals must never claim ordinary five-check findings');
 const [[invented]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM semester_review_events WHERE JSON_EXTRACT(source_snapshot,'$.priorBatchApproval') IS NOT NULL AND (average_value IS NOT NULL OR has_failed IS NOT NULL OR has_dropped IS NOT NULL OR has_incomplete IS NOT NULL)");assert.equal(Number(invented.n),0);
 const [[receiptAfter]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n,SUM(UNIX_TIMESTAMP(recorded_at)) timestamps FROM requirement_receipts");assert.deepEqual(receiptAfter,receiptBefore);
 const [[academicAfter]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM academic_records");assert.deepEqual(academicAfter,academicBefore);
 const approved=await ok<PriorBatchPreview>(request("coordinator",path));assert.equal(approved.members.filter(m=>m.approval?.valid).length,total);
 const sample=approved.members.find(m=>m.coursePending)!;
 const compliance=await ok<{result:string;priorApproval:{valid:boolean};blockers:string[]}>(request("staff",`/api/v1/scholars/${sample.scholarId}/semester-requirements/${semesterId}/compliance`));assert.equal(compliance.result,'compliant');assert.equal(compliance.priorApproval.valid,true);assert.deepEqual(compliance.blockers,[]);
 const [cycles]=await pool.execute<RowDataPacket[]>("SELECT c.id,v.version FROM payout_cycles c JOIN payout_cycle_versions v ON v.cycle_id=c.id WHERE c.semester_id=? ORDER BY v.version DESC LIMIT 1",[semesterId]);
 let cycle=cycles[0] as {id:string;version:number}|undefined;
 if(!cycle)cycle=await ok<{id:string;version:number}>(request("system_admin","/api/v1/payout-cycles",{action:"create",code:"PRIOR-APPROVED-CYCLE",semesterId,expectedSemesterVersion:period.version,expectedVersion:0,fields:{name:"Synthetic prior-approved payroll",targetDate:day,requirements:[]},...evidence}));
 const historical={expectedCycleVersion:cycle.version,expectedSemesterVersion:period.version,expectedYearVersion:period.year_version,importId,deadlineOn:period.starts,reportedReleaseOn:day,sourceLocation:body.sourceLocation,...evidence,reviewed:true};
 assert.equal((await request("coordinator",`/api/v1/payout-cycles/${cycle.id}/submission-windows/configure`,{expectedCycleVersion:cycle.version,termNumber:1,expectedSemesterVersion:period.version,expectedYearVersion:period.year_version,deadlineOn:period.starts})).statusCode,422,'Ordinary setup must still reject a past deadline');
 for(const role of ["staff","system_admin"])assert.equal((await request(role,`/api/v1/payout-cycles/${cycle.id}/historical-setup`,historical)).statusCode,403);
 const setupPath=`/api/v1/payout-cycles/${cycle.id}/historical-setup`;
 assert.equal((await request("coordinator",setupPath,{...historical,expectedCycleVersion:historical.expectedCycleVersion+1})).statusCode,409);
 assert.equal((await request("coordinator",setupPath,{...historical,reviewed:false})).statusCode,422);
 await pool.query("CREATE TRIGGER fail_historical_payroll BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payroll.historical-setup' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic historical setup audit rollback'; END IF; END");
 assert.equal((await request("coordinator",setupPath,historical)).statusCode,500);
 const [[rolledSetup]]=await pool.execute<RowDataPacket[]>("SELECT COUNT(*) n FROM regular_payout_periods WHERE cycle_id=?",[cycle.id]);assert.equal(Number(rolledSetup.n),0);
 await pool.query("DROP TRIGGER fail_historical_payroll");
 const setupKey=randomUUID(),setups=await Promise.all([request("coordinator",setupPath,historical,setupKey),request("coordinator",setupPath,historical,setupKey)]);
 assert.equal(setups[0].statusCode,200,setups[0].body);assert.equal(setups[1].statusCode,200,setups[1].body);assert.deepEqual(setups[0].json(),setups[1].json());
 const setup=setups[0].json<{batchId:string}>();
 console.log("Prior-batch fixture: historical setup saved; checking existing cycle opening and payroll finalization");
 await ok(request("coordinator",`/api/v1/payout-cycles/${cycle.id}/open`,{action:'open',expectedVersion:cycle.version,...evidence}));
 const read=()=>ok<OvrDetail>(request("staff",`/api/v1/ovr-batches/${setup.batchId}`));
 let detail=await read();assert.equal(detail.managed?.form.rows.length,total,JSON.stringify(detail.managed?.items.filter(i=>!i.eligible).slice(0,2)));
 assert.equal(detail.managed!.form.template,currentPayrollTemplate);
 assert.deepEqual(payrollLayout(detail.managed!.form).map(p=>p.rows.length),Array.from({length:Math.ceil(total/20)},(_,i)=>Math.min(20,total-i*20)));
 console.log(`Prior-batch fixture: ${total} eligible rows; candidate payload ${Buffer.byteLength(JSON.stringify(detail.managed))} bytes; validating bounded storage under the unchanged database packet limit`);
 const payload=(d:OvrDetail)=>({expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash,...evidence});
 let omittedAnnual:string|undefined;
 if(process.argv.includes('--omitted-historical')){
  const [[annual]]=await pool.execute<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?',[people[1].id,period.academic_year_id]);omittedAnnual=String(annual.id);
  await ok(request('coordinator',`/api/v1/ovr-batches/${setup.batchId}/defer`,{...payload(detail),scholarshipId:omittedAnnual,reason:'Synthetic original historical payroll omission'}));detail=await read();assert.equal(detail.managed!.form.rows.length,total-1);
 }
 await ok(request("staff",`/api/v1/ovr-batches/${setup.batchId}/submit-review`,payload(detail)));detail=await read();
 const finalKey=randomUUID(),finalPayload=payload(detail),finalPath=`/api/v1/ovr-batches/${setup.batchId}/finalize`;
 const finalized=await ok(request("coordinator",finalPath,finalPayload,finalKey));
 assert.deepEqual(await ok(request("coordinator",finalPath,finalPayload,finalKey)),finalized,'A lost finalization response must replay the same expanded result');
 assert.equal((await request("coordinator",finalPath,finalPayload)).statusCode,409,'A second finalization must not allocate a second stipend');
 if(omittedAnnual){await (await import('./test-omission-historical.js')).testOmissionHistorical({request,pool,cycleId:cycle.id,source:setup.batchId,annual:omittedAnnual,scholar:people[1].id,semester:semesterId,importId});return;}
 const [[frozen]]=await pool.query<RowDataPacket[]>("SELECT snapshot FROM ovr_finalizations WHERE batch_id=? ORDER BY batch_revision DESC LIMIT 1",[setup.batchId]);const frozenHash=digest(JSON.stringify(frozen));
 const frozenForm=decodeStoredJson<OvrFinalization>(frozen.snapshot).payrollForm!;
 assert.equal(frozenForm.template,currentPayrollTemplate);assert.equal(payrollLayout(frozenForm).length,Math.ceil(total/20));
 const afterFinalization=await ok<PriorBatchPreview>(request("coordinator",path));assert.equal(afterFinalization.members.filter(m=>m.approval?.valid).length,total,'Finalization must not invalidate its prior sources');
 const [[allocation]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payroll_allocations WHERE batch_id=?",[setup.batchId]);assert.equal(Number(allocation.n),total);
 const [[annual]]=await pool.execute<RowDataPacket[]>("SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?",[sample.scholarId,period.academic_year_id]);
 const releaseDb=await pool.getConnection();try{const entry=await checkManagedPayment(releaseDb,setup.batchId,annual.id,"paid","5000.00");assert.equal(entry?.state,"approved_for_release");assert.deepEqual(entry?.reasons,[]);}finally{releaseDb.release();}
 const [[payments]]=await pool.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payment_records");assert.equal(Number(payments.n),0);
 if(process.argv.includes("--payment-recording-large")) {
   let batch=(await read()).batch;
   for(const action of ["submit","mark-processed"]){batch=await ok(request(action==="submit"?"coordinator":"staff",`/api/v1/ovr-batches/${setup.batchId}/${action}`,{expectedRevision:batch.revision,effectiveOn:day,reason:"Synthetic payment recording stage",reference:"P02-SYNTHETIC"}));}
   await (await import("./test-payment-recording-large.js")).testPaymentRecordingLarge({runtime:runtime??pool,root:pool,request,batch:setup.batchId,total});
   return;
 }
 const [[sameFrozen]]=await pool.query<RowDataPacket[]>("SELECT snapshot FROM ovr_finalizations WHERE batch_id=? ORDER BY batch_revision DESC LIMIT 1",[setup.batchId]);assert.equal(digest(JSON.stringify(sameFrozen)),frozenHash);
 await pool.execute("UPDATE scholars SET version=version+1 WHERE id=?",[sample.scholarId]);
 const changed=await ok<PriorBatchPreview>(request("coordinator",path));assert.equal(changed.members.find(m=>m.scholarId===sample.scholarId)!.approval!.valid,false,'A source change invalidates current approval');
 const staleDb=await pool.getConnection();try{await assert.rejects(checkManagedPayment(staleDb,setup.batchId,annual.id,"paid","5000.00"),(e:unknown)=>Boolean(e&&typeof e==='object'&&'code' in e&&e.code==='PAYROLL_ENTRY_WITHHELD'));}finally{staleDb.release();}
 const [[stillFrozen]]=await pool.query<RowDataPacket[]>("SELECT snapshot FROM ovr_finalizations WHERE batch_id=? ORDER BY batch_revision DESC LIMIT 1",[setup.batchId]);assert.equal(digest(JSON.stringify(stillFrozen)),frozenHash,'Frozen evidence must remain byte-identical after current source changes');
 assert.deepEqual((await request("coordinator","/api/v1/document-batches/prior-approval",body,key)).json(),results[0].json());
 console.log(`PASS Prior batch: ${total} adopted assessments, ${total*2} covered documents, two explicit waiver corrections, no fabricated academic records/grades/receipts, historical one-semester setup, existing submission/finalization and ${total} allocations with no payment; ${Math.round(performance.now()-start)}ms`);
}

/** A later correction must invalidate an adopted approval and retain real event
 * identities for the ordinary correction/resubmission workflow. */
export async function testPriorBatchCorrections(request:Request,pool:Pool,importId:string,semesterId:string,day:string){
 const ok=async<T>(p:Promise<LightMyRequestResponse>):Promise<T>=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r.json<T>();};
 const path=`/api/v1/document-batches/prior-approval-preview?importId=${importId}&semesterId=${semesterId}`;
 let preview=await ok<PriorBatchPreview>(request("coordinator",path));
 assert.ok(preview.members.every(m=>!m.issues.length),JSON.stringify(preview.members));
 const target=preview.members[0];
 const [[standing]]=await pool.execute<RowDataPacket[]>("SELECT id,operational_status,status_effective_on,status_version FROM scholarship_records WHERE scholar_id=? ORDER BY academic_year_id DESC LIMIT 1",[target.scholarId]);
 await pool.execute("UPDATE scholarship_records SET operational_status='suspended',status_effective_on=?,status_version=status_version+1 WHERE id=?",[today(),standing.id]);
 let blocked=await ok<PriorBatchPreview>(request("coordinator",path));assert.ok(blocked.members.find(m=>m.id===target.id)!.issues.some(i=>i.includes('standing')),'A genuine hold must block adoption');
 await pool.execute("UPDATE scholarship_records SET operational_status=?,status_effective_on=?,status_version=? WHERE id=?",[standing.operational_status,standing.status_effective_on,standing.status_version,standing.id]);
 const [[academic]]=await pool.execute<RowDataPacket[]>("SELECT scholar_semester_id,revision,enrolled FROM scholar_semester_revisions WHERE scholar_semester_id=? ORDER BY revision DESC LIMIT 1",[target.id]);
 await pool.execute("UPDATE scholar_semester_revisions SET enrolled=0 WHERE scholar_semester_id=? AND revision=?",[target.id,academic.revision]);
 blocked=await ok<PriorBatchPreview>(request("coordinator",path));assert.ok(blocked.members.find(m=>m.id===target.id)!.issues.some(i=>i.includes('enrollment')),'An explicit adverse enrollment finding must block adoption');
 await pool.execute("UPDATE scholar_semester_revisions SET enrolled=? WHERE scholar_semester_id=? AND revision=?",[academic.enrolled,target.id,academic.revision]);
 preview=await ok<PriorBatchPreview>(request("coordinator",path));
 const body={importId,semesterId,scopeHash:preview.scopeHash,items:preview.members.map(m=>({id:m.id,sourceHash:m.sourceHash})),approvalOn:null,deadlineOn:day,reference:"TEST-PRIOR-CORRECTION",sourceLocation:"Disposable previously approved papers",reason:"Adopt prior approval before testing a later correction",documentsPreviouslyVerified:true,academicEligibilityPreviouslyApproved:true,deadlineCompliancePreviouslyApproved:true,correctMistakenWaivers:false};
 await ok(request("coordinator","/api/v1/document-batches/prior-approval",body));
 const doc=preview.members[0].documents.find(d=>d.kind==='cog')!,db=await pool.getConnection();
 let state;try{state=await requirementState(db,doc.id);}finally{db.release();}
 assert.equal(state.status,"verified");assert.ok(state.latestEventId);
 const common={effectiveOn:today(),reason:"Discrepancy discovered after prior batch adoption",reference:"TEST-CORRECTION",remarks:null};
 await ok(request("staff",`/api/v1/requirement-instances/${doc.id}/return-for-correction`,{...common,action:"return-for-correction",expectedVersion:state.version,correctionOf:state.latestEventId}));
 let changed=await ok<PriorBatchPreview>(request("coordinator",path));
 assert.equal(changed.members[0].approval?.valid,false);assert.ok(changed.members[0].issues.some(i=>i.includes("correction")));
 assert.equal((await request("coordinator","/api/v1/document-batches/prior-approval",{...body,scopeHash:changed.scopeHash,items:[{id:changed.members[0].id,sourceHash:changed.members[0].sourceHash}]})).statusCode,409);
 await ok(request("staff",`/api/v1/requirement-instances/${doc.id}/resubmit`,{...common,action:"resubmit",expectedVersion:state.version+1,physicalReference:"Corrected physical COG",storageLocation:"Disposable replacement folder"}));
 changed=await ok<PriorBatchPreview>(request("coordinator",path));
 assert.equal(changed.members[0].approval?.valid,false);assert.ok(changed.members[0].issues.some(i=>i.includes("replacement awaiting verification")));
 console.log("PASS Prior approval: later correction uses the real verification event; resubmission remains unresolved and cannot be re-adopted as old approved evidence");
}
