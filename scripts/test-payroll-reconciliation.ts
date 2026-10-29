import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import type {Pool,RowDataPacket} from "mysql2/promise";
import type {LightMyRequestResponse} from "fastify";
import {AuthorizationService} from "../server/authorization/service.js";
import {PayrollReconciliationService} from "../server/payments/reconciliation-service.js";
import {PaymentRecordingService} from "../server/payments/recording-service.js";
import {OvrService} from "../server/ovr/service.js";
import {today} from "../server/scholars/validation.js";
import type {ReconciliationOverview,ReconciliationEvent,ClosureMember} from "../server/payments/reconciliation-model.js";
import type {RecordingRow} from "../server/payments/recording-model.js";
import {testP03Recovery} from "./test-p03-recovery.mjs";

export async function verifyReturnedPayroll(request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>,batch:string){
 const base=`/api/v1/ovr-batches/${batch}`,r=await request("staff",base+"/reconciliation-summary");assert.equal(r.statusCode,200,r.body);const o=r.json<ReconciliationOverview>();
 const result=await request("staff",base+"/reconciliation-commands",{action:"verify",expectedRevision:o.summary.revision,expectedReconciliationRevision:o.reconciliationRevision,sourceHash:o.sourceHash,returnedAndCompared:true});assert.equal(result.statusCode,200,result.body);
}
export async function testPayrollReconciliation(c:{runtime:Pool;admin:Pick<Pool,"query"|"execute">;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;batch:string;total:number}){
 const base=`/api/v1/ovr-batches/${c.batch}`,ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
 const read=async()=>(await ok(c.request("staff",base+"/reconciliation-summary"))).json<ReconciliationOverview>();
 const page=async(basis="provisional",offset=0)=>(await ok(c.request("staff",`${base}/reconciliation?basis=${basis}&offset=${offset}&limit=25`))).json<{items:(RecordingRow|ClosureMember)[];summary:ReconciliationOverview["summary"];total:number}>();
 const body=async(extra:object)=>{const o=await read();return {expectedRevision:o.summary.revision,expectedReconciliationRevision:o.reconciliationRevision,sourceHash:o.sourceHash,...extra};};
 const command=(role:string,input:object,key=randomUUID())=>c.request(role,base+"/reconciliation-commands",input,key);
 const input=async(extra:object)=>{const b=await body(extra);if(["report","dismiss"].includes(String((extra as {action:string}).action)))delete (b as Partial<typeof b>).sourceHash;return b;};
 const verify=async()=>ok(command("staff",await input({action:"verify",returnedAndCompared:true})));
 const [[actor]]=await c.runtime.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
 let selects=0,dbMs=0;
 const measured=new Proxy(c.runtime,{get(pool,p){if(p!=="getConnection"){const v=Reflect.get(pool,p);return typeof v==="function"?v.bind(pool):v;}return async()=>{const db=await pool.getConnection();return new Proxy(db,{get(target,m){if(m!=="execute"&&m!=="query"){const v=Reflect.get(target,m);return typeof v==="function"?v.bind(target):v;}return async(sql:string,values?:unknown[])=>{const start=performance.now(),invoke=target[m].bind(target) as (sql:string,values?:unknown[])=>Promise<unknown>;const r=await invoke(sql,values);if(/^\s*SELECT/i.test(sql)){selects++;dbMs+=performance.now()-start;}return r;};}});};}});
 const service=new PayrollReconciliationService(new AuthorizationService(measured)),recording=new PaymentRecordingService(new AuthorizationService(measured)),runs:object[]=[];
 async function measure<T>(name:string,run:()=>Promise<T>){global.gc?.();selects=0;dbMs=0;const start=performance.now(),initial=process.memoryUsage();let peakRss=initial.rss,peakHeap=initial.heapUsed;const timer=setInterval(()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);},20);try{const v=await run();const after=process.memoryUsage();runs.push({name,total:c.total,ms:performance.now()-start,selects,dbMs,bytes:Buffer.byteLength(JSON.stringify(v)),initial,after,peakRss:Math.max(peakRss,after.rss),peakHeap:Math.max(peakHeap,after.heapUsed)});return v;}finally{clearInterval(timer);}}
 const sqlCounts=async()=>{const [[r]]=await c.admin.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM payment_records) p,(SELECT COUNT(*) FROM payment_corrections) c,(SELECT COUNT(*) FROM payroll_reconciliation_events) e,(SELECT COUNT(*) FROM payroll_closure_members) m,(SELECT COUNT(*) FROM ovr_batch_events) b,(SELECT COUNT(*) FROM ovr_commands) j,(SELECT COUNT(*) FROM audit_logs) a");return {...r};};
 const reports=async(stage:string,change?:()=>Promise<unknown>)=>{if(process.argv.includes('--financial-reports'))await (await import('./test-financial-reports.js')).testFinancialReports(c,stage,change);};
 const initial=await read();assert.equal(initial.summary.total,c.total);assert.equal(initial.recordingComplete,true);assert.equal(initial.verification,"Not verified");
 for(let i=0;i<3;i++){
  await measure("post_payment_summary",()=>recording.summary(String(actor.id),c.batch));await measure("post_payment_page",()=>recording.page(String(actor.id),c.batch,{q:"",offset:0,limit:25}));
  await measure("existing_reconciliation_section",()=>new OvrService(new AuthorizationService(measured)).section(String(actor.id),c.batch,"reconciliation"));
  await measure("reconciliation_summary",()=>service.summary(String(actor.id),c.batch));await measure("provisional_page",()=>service.page(String(actor.id),c.batch,{basis:"provisional",q:"",offset:0,limit:25}));
 }
 const roster=(await page()).items as RecordingRow[],paid=roster.find(r=>r.outcome==="paid")!,unclaimed=roster.find(r=>r.outcome==="unclaimed")!;assert.ok(paid&&unclaimed);
 const beforeUnauthorizedClassification=await sqlCounts();
 const unauthorizedClassification=await c.request("staff",base+"/payment-corrections/correct",{expectedRevision:initial.summary.revision,paymentId:unclaimed.paymentId,outcome:"not_paid",unpaidReason:"review",amount:"0.00",effectiveOn:null,reason:"Staff cannot bypass reviewed outcome changes through the legacy command",reference:"P03-AUTHORITY",remarks:"Attempted semantic unpaid classification change"});
 assert.equal(unauthorizedClassification.statusCode,423,unauthorizedClassification.body);
 assert.deepEqual(await sqlCounts(),beforeUnauthorizedClassification,"Denied legacy commands must not append financial evidence, journals or audits");
 await reports('provisional');
 for(const unpaidReason of ["withheld","review","did_not_claim"]){
  await ok(c.request("coordinator",base+"/classify-unpaid",{expectedRevision:(await read()).summary.revision,paymentId:unclaimed.paymentId,unpaidReason,reason:"Synthetic classification remains a real closure gate"}));
  if(unpaidReason==='withheld')await reports('review');
  if(unpaidReason!=="did_not_claim"){
   assert.equal((await read()).recordingComplete,false);
   const rejected=await command("coordinator",await input({action:"close",effectiveOn:today(),reviewed:true,overrideReason:"Synthetic verification-only exception"}));
   assert.equal(rejected.json().error.code,"PAYMENT_RECORDING_INCOMPLETE");
  }
 }
 const [[staffRole]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM user_roles WHERE user_id=? AND role_code='staff' AND revoked_at IS NULL LIMIT 1",[actor.id]);
 try{await c.admin.execute("UPDATE users SET disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[actor.id]);await assert.rejects(service.summary(String(actor.id),c.batch),e=>Boolean(e&&typeof e==="object"&&"code" in e&&e.code==="ACCOUNT_DISABLED"));}finally{await c.admin.execute("UPDATE users SET disabled_at=NULL WHERE id=?",[actor.id]);}
 try{await c.admin.execute("UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?",[staffRole.id]);await assert.rejects(service.summary(String(actor.id),c.batch),e=>Boolean(e&&typeof e==="object"&&"code" in e&&e.code==="PERMISSION_DENIED"));}finally{await c.admin.execute("UPDATE user_roles SET revoked_at=NULL WHERE id=?",[staffRole.id]);}
 const [[source]]=await c.admin.query<RowDataPacket[]>("SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[c.batch]);
 const originalPayments=(await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE batch_id=? ORDER BY batch_revision",[c.batch]))[0];
 const historicalId=randomUUID();
 const [[historicalReviewer]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM users WHERE email='coordinator@example.invalid'");
 const historical={id:historicalId,scholarshipId:paid.scholarshipId,actualPaidOn:today(),beforeDeadlineEvidence:"Synthetic unresolved historical receipt evidence",state:"pending",version:1};
 await c.admin.execute("INSERT INTO payroll_historical_receipts(id,version,batch_id,scholarship_id,state,snapshot,actor_id,recorded_at) VALUES(?,1,?,?,'pending',?,?,UTC_TIMESTAMP(6))",[historicalId,c.batch,paid.scholarshipId,JSON.stringify(historical),actor.id]);
 const reversalWithConflict=await command("coordinator",await input({action:"correct",paymentId:paid.paymentId,outcome:"unclaimed",actualPaidOn:null,reason:"Competing historical evidence requires the existing review path",confirmed:true}));
 assert.equal(reversalWithConflict.json().error.code,"HISTORICAL_RECEIPT_PENDING");
 assert.equal((await command("coordinator",await input({action:"close",effectiveOn:today(),reviewed:true,overrideReason:"Verification-only exception cannot waive historical conflicts"}))).json().error.code,"PAYMENT_CORRECTION_PENDING");
 await c.admin.execute("INSERT INTO payroll_historical_receipts(id,version,batch_id,scholarship_id,state,snapshot,actor_id,recorded_at) VALUES(?,2,?,?,'rejected',?,?,UTC_TIMESTAMP(6))",[historicalId,c.batch,paid.scholarshipId,JSON.stringify({...historical,state:"rejected",version:2}),historicalReviewer.id]);
 assert.equal((await command("staff",await input({action:"verify",returnedAndCompared:false}))).statusCode,422);
 assert.equal((await command("system_admin",await input({action:"verify",returnedAndCompared:true}))).statusCode,403);
 assert.equal((await command("staff",{...await input({action:"verify",returnedAndCompared:true}),sourceHash:"0".repeat(64)})).statusCode,409);
 const verificationRevision=(await read()).summary.revision;
 const verification=await input({action:"verify",returnedAndCompared:true}),verificationKey=randomUUID();
 await measure("verify_returned",()=>service.command(String(actor.id),c.batch,verificationKey,verification,"p03-verify"));
 await ok(command("staff",verification,verificationKey));assert.equal((await command("staff",{...verification,sourceHash:"0".repeat(64)},verificationKey)).statusCode,409);
 let o=await read();assert.equal(o.verification,"Verified");assert.equal(o.summary.revision,verificationRevision);assert.equal(o.verificationEvent!.actorId,actor.id);assert.ok(Date.parse(o.verificationEvent!.recordedAt)<=Date.now());
 assert.equal(o.verificationEvent!.rosterHash,source.snapshot_hash);
 assert.ok(originalPayments.some(p=>p.actor_id===actor.id),"The original recorder is authorized to verify returned payroll");
 await page();await read();assert.equal((await read()).verification,"Verified");
 const report=await input({action:"report",scholarshipId:unclaimed.scholarshipId,description:"Synthetic discrepancy in the returned payroll"}),reportKey=randomUUID();
 await measure("report_discrepancy",()=>service.command(String(actor.id),c.batch,reportKey,report,"p03-report"));await ok(command("staff",report,reportKey));
 o=await read();assert.equal(o.unresolvedDiscrepancies,1);assert.equal(o.verification,"Verified");
 const close=async(override=false)=>input({action:"close",effectiveOn:today(),reviewed:true,...(override?{overrideReason:"Reviewed verification exception for synthetic test"}:{})});
 assert.equal((await command("coordinator",await close(true))).json().error.code,"DISCREPANCY_UNRESOLVED");
 assert.equal((await command("staff",await close(true))).statusCode,403);
 const cases=(await ok(c.request("coordinator",base+"/discrepancies?limit=25"))).json<{items:ReconciliationEvent[]}>();
 const dismiss=await input({action:"dismiss",caseId:cases.items[0].id,reason:"Returned payroll agrees; no correction needed"});
 assert.equal((await command("staff",dismiss)).statusCode,403);
 const [[coordinator]]=await c.runtime.query<RowDataPacket[]>("SELECT id FROM users WHERE email='coordinator@example.invalid'");
 await measure("dismiss_discrepancy",()=>service.command(String(coordinator.id),c.batch,randomUUID(),dismiss,"p03-dismiss"));
 assert.equal((await read()).unresolvedDiscrepancies,0);
 const beforeDate=await read(),date=paid.actualPaidOn===today()?new Date(Date.parse(today()+"T00:00:00Z")-86400000).toISOString().slice(0,10):today();
 await ok(c.request("staff",base+"/payment-corrections/date-only",{expectedRevision:beforeDate.summary.revision,paymentId:paid.paymentId,effectiveOn:date,reason:"Correct supported date from original signed evidence",reference:"P03-DATE"}));
 assert.equal((await read()).verification,"Re-verification Required");
 const correction=await input({action:"correct",paymentId:paid.paymentId,outcome:"unclaimed",actualPaidOn:null,reason:"Original Paid entry was recorded in error",confirmed:true});
 assert.equal((await command("staff",correction)).statusCode,403);
 const beforeAudit=await sqlCounts();
 await c.admin.query("CREATE TRIGGER p03_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payment.correction' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P03 audit failure'; END IF; END");
 try{assert.equal((await command("coordinator",correction)).statusCode,500);}finally{await c.admin.query("DROP TRIGGER p03_fail_audit");}
 assert.deepEqual(await sqlCounts(),beforeAudit);
 await measure("coordinator_correct",()=>service.command(String(coordinator.id),c.batch,randomUUID(),correction,"p03-correct"));
 assert.equal((await read()).summary.unclaimed,initial.summary.unclaimed+1);
 const restore=await input({action:"correct",paymentId:paid.paymentId,outcome:"paid",actualPaidOn:date,reason:"Actual signed receipt confirms the original payroll payment",confirmed:true});
 await ok(command("coordinator",restore));
 assert.equal((await read()).summary.paid,initial.summary.paid);
 assert.equal((await read()).verification,"Re-verification Required");
 if(c.total>2){const p=await page("provisional",25);assert.equal(p.items.length,25);assert.ok(p.items.every(r=>!roster.some(a=>a.scholarshipId===r.scholarshipId)));}
 const useOverride=process.argv.includes("--p03-override");
 if(!useOverride)await verify();else assert.equal((await command("coordinator",await close())).json().error.code,"RETURNED_VERIFICATION_REQUIRED");
 const beforeClosure=await sqlCounts();
 await c.admin.query("CREATE TRIGGER p03_fail_members BEFORE INSERT ON payroll_closure_members FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P03 closure member failure'");
 try{assert.equal((await command("coordinator",await close(useOverride))).statusCode,500);}finally{await c.admin.query("DROP TRIGGER p03_fail_members");}
 assert.deepEqual(await sqlCounts(),beforeClosure);assert.equal((await read()).summary.state,"processed");
 // The shared configuration guard serializes correction against closure; both
 // commands pin the same current financial/reconciliation revisions.
 const closureInput=await close(useOverride),raceCorrection=await input({action:"correct",paymentId:paid.paymentId,outcome:"unclaimed",actualPaidOn:null,reason:"Synthetic concurrent outcome correction",confirmed:true});
 let finalCloseInput=closureInput,finalCloseKey=randomUUID();
 const race=await Promise.all([command("coordinator",closureInput,finalCloseKey),command("coordinator",raceCorrection)]);
 assert.equal(race.filter(r=>r.statusCode===200).length,1,race.map(r=>r.body).join("\n"));
 if((await read()).summary.state!=="closed"){if(!useOverride)await verify();finalCloseInput=await close(useOverride);finalCloseKey=randomUUID();await measure("close_payroll",()=>service.command(String(coordinator.id),c.batch,finalCloseKey,finalCloseInput,"p03-close"));}
 else runs.push({name:"close_payroll",note:"Closure won the instrumented API concurrency race; separate latency not measured"});
 o=await read();assert.equal(o.summary.state,"closed");assert.equal(o.originalAvailable,true);
 const original=await page("original"),allOriginal:ClosureMember[]=[];
 for(let offset=0;offset<c.total;offset+=100){const r=(await ok(c.request("staff",`${base}/reconciliation?basis=original&offset=${offset}&limit=100`))).json<{items:ClosureMember[]}>();allOriginal.push(...r.items);}
 assert.equal(allOriginal.length,c.total);assert.equal(new Set(allOriginal.map(r=>r.scholarshipId)).size,c.total);assert.deepEqual(allOriginal.map(r=>r.position),Array.from({length:c.total},(_,i)=>i+1));
 assert.equal(original.summary.paid+original.summary.unclaimed,c.total);
 await reports('original');
 const [[immutable]]=await c.admin.query<RowDataPacket[]>("SELECT id,snapshot_hash,snapshot FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[c.batch]);
 await assert.rejects(c.admin.execute("INSERT INTO payroll_reconciliation_events(id,batch_id,revision,batch_revision,kind,case_id,case_version,scholarship_id,payment_id,snapshot,snapshot_hash,actor_id,occurred_at) SELECT ?,batch_id,revision+100000,batch_revision,kind,case_id,case_version,scholarship_id,payment_id,snapshot,snapshot_hash,actor_id,UTC_TIMESTAMP(6) FROM payroll_reconciliation_events WHERE id=?",[randomUUID(),immutable.id]),e=>Boolean(e&&typeof e==="object"&&"code" in e&&e.code==="ER_DUP_ENTRY"&&"message" in e&&String(e.message).includes("uq_payroll_original_closure")),"The database must reject a second original closure even outside the command's state guard");
 const [[member]]=await c.admin.query<RowDataPacket[]>("SELECT snapshot,snapshot_hash FROM payroll_closure_members WHERE closure_id=? AND position=1",[immutable.id]);
 try{await c.admin.execute("UPDATE payroll_closure_members SET position=100000 WHERE closure_id=? AND position=1",[immutable.id]);assert.equal((await c.request("staff",base+"/reconciliation?basis=original")).json().error.code,"RECONCILIATION_INTEGRITY_FAILED");}finally{await c.admin.execute("UPDATE payroll_closure_members SET position=1 WHERE closure_id=? AND position=100000",[immutable.id]);}
 try{await c.admin.execute("UPDATE payroll_closure_members SET snapshot=JSON_SET(snapshot,'$.name','Synthetic tampered name') WHERE closure_id=? AND position=1",[immutable.id]);assert.equal((await c.request("staff",base+"/reconciliation?basis=original")).json().error.code,"RECONCILIATION_INTEGRITY_FAILED");}finally{await c.admin.execute("UPDATE payroll_closure_members SET snapshot=? WHERE closure_id=? AND position=1",[typeof member.snapshot==="string"?member.snapshot:JSON.stringify(member.snapshot),immutable.id]);}
 const history=(await ok(c.request("staff",base+"/reconciliation-history?limit=100"))).json<{items:ReconciliationEvent[]}>();assert.ok(history.items.some(e=>e.kind==="dismissed"&&e.reason));assert.ok(history.items.some(e=>e.kind==="reported"&&e.description));assert.ok(history.items.some(e=>e.kind==="closed"));
 assert.equal((await command("staff",await input({action:"verify",returnedAndCompared:true}))).statusCode,423);
 await ok(command("staff",await input({action:"report",scholarshipId:unclaimed.scholarshipId,description:"Synthetic discrepancy discovered after closure"})));
 const postCase=(await ok(c.request("coordinator",base+"/discrepancies"))).json<{items:ReconciliationEvent[]}>().items[0];
 const postCorrection=await input({action:"correct",paymentId:unclaimed.paymentId,outcome:"paid",actualPaidOn:today(),reason:"Signed original payroll confirms actual receipt",confirmed:true,caseId:postCase.id}),mixedRole=randomUUID(),postKey=randomUUID();
 assert.equal((await command("staff",postCorrection)).statusCode,403);
 try{
  await c.admin.execute("INSERT INTO user_roles(id,user_id,role_code,granted_at) VALUES(?,?,'coordinator',UTC_TIMESTAMP(6))",[mixedRole,actor.id]);
  await ok(command("staff",postCorrection,postKey));
 }finally{await c.admin.execute("UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?",[mixedRole]);}
 assert.equal((await command("staff",postCorrection,postKey)).statusCode,403,"Revocation must also fence an exact completed correction retry");
 o=await read();assert.equal(o.summary.state,"closed");assert.equal(o.unresolvedDiscrepancies,0);assert.equal(o.updatedAvailable,true);
 const originalAgain=await page("original");assert.deepEqual(originalAgain.items,original.items);assert.deepEqual(originalAgain.summary,original.summary);
 const updated=await page("updated");assert.notEqual(updated.summary.paid,original.summary.paid);
 assert.equal((await c.request("staff",base+"/payment-corrections/date-only",{expectedRevision:o.summary.revision,paymentId:unclaimed.paymentId,effectiveOn:date,reason:"Restricted closed payroll date correction",reference:"P03-CLOSED-DATE"})).statusCode,423);
 const [[semester]]=await c.admin.query<RowDataPacket[]>("SELECT s.id,DATE_FORMAT(s.ends_on,'%Y-%m-%d') AS ends FROM semesters s JOIN payout_cycles p ON p.semester_id=s.id JOIN ovr_batches b ON b.cycle_id=p.id WHERE b.id=?",[c.batch]);
 try{await c.admin.execute("UPDATE semesters SET ends_on=? WHERE id=?",[new Date(Date.parse(today()+"T00:00:00Z")-86400000).toISOString().slice(0,10),semester.id]);assert.equal((await command("coordinator",await input({action:"correct",paymentId:unclaimed.paymentId,outcome:"unclaimed",actualPaidOn:null,reason:"Expired-period correction must retain historical review",confirmed:true}))).statusCode,423);}finally{await c.admin.execute("UPDATE semesters SET ends_on=? WHERE id=?",[semester.ends,semester.id]);}
 for(let i=0;i<3;i++){await measure("original_page",()=>service.page(String(actor.id),c.batch,{basis:"original",q:"",offset:0,limit:25}));await measure("updated_page",()=>service.page(String(actor.id),c.batch,{basis:"updated",q:"",offset:0,limit:25}));}
 const [[same]]=await c.admin.query<RowDataPacket[]>("SELECT snapshot_hash,snapshot FROM payroll_reconciliation_events WHERE id=?",[immutable.id]);assert.equal(same.snapshot_hash,immutable.snapshot_hash);assert.deepEqual(same.snapshot,immutable.snapshot);
 assert.deepEqual((await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE batch_id=? ORDER BY batch_revision",[c.batch]))[0],originalPayments);
 assert.equal((await c.admin.query<RowDataPacket[]>("SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?",[c.batch]))[0][0].snapshot_hash,source.snapshot_hash);
 const beforeRetry=await sqlCounts();await ok(command("coordinator",finalCloseInput,finalCloseKey));assert.deepEqual(await sqlCounts(),beforeRetry,"Exact closure retry survives post-closure corrections without another snapshot or audit");
 const memory=[];
 for(let iteration=0;iteration<20;iteration++){
  await service.summary(String(actor.id),c.batch);await service.page(String(actor.id),c.batch,{basis:iteration%2?"original":"updated",q:"",offset:0,limit:25});global.gc?.();
  const pool=(c.runtime as unknown as {pool:{_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}}}).pool;
  assert.equal(pool._connectionQueue.length,0);assert.equal(pool._allConnections.length,pool._freeConnections.length);
  memory.push({iteration:iteration+1,...process.memoryUsage(),connections:pool._allConnections.length,free:pool._freeConnections.length,queue:pool._connectionQueue.length});
 }
 await assert.rejects(c.runtime.query("UPDATE payroll_reconciliation_events SET snapshot=snapshot"));await assert.rejects(c.runtime.query("DELETE FROM payroll_closure_members WHERE 1=0"));
 const [[closureCount]]=await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n FROM payroll_reconciliation_events WHERE batch_id=? AND kind='closed'",[c.batch]);assert.equal(Number(closureCount.n),1);
 if(c.total===2&&!useOverride){const [[database]]=await c.admin.query<RowDataPacket[]>("SELECT DATABASE() name");await testP03Recovery(String(database.name));}
 await mkdir((process.env.LDSS_P03_OUTPUT??'output/p03-reconciliation-20261022'),{recursive:true});await writeFile(`${process.env.LDSS_P03_OUTPUT??'output/p03-reconciliation-20261022'}/after-${c.total}-${useOverride?"override":"normal"}.json`,JSON.stringify({conditions:"Disposable authorized finalized payroll; restricted runtime; warm buffers; fresh transaction per call; service time excludes HTTP/serialization; SELECT ms is client-observed roundtrip, 20ms sampled peaks may miss synchronous spikes",runs,memory,sourceHashUnchanged:true,originalPaymentRowsUnchanged:true,closureSnapshotUnchanged:true,summary:o.summary,originalSummary:original.summary},null,2));
 await reports('updated',async()=>{const result=await command('coordinator',await input({action:'correct',paymentId:unclaimed.paymentId,outcome:'unclaimed',actualPaidOn:null,reason:'P08 actual concurrent authorized post-closure correction',confirmed:true}));assert.equal(result.statusCode,200,result.body);});
 // The report source-change probe may legally leave every effective outcome
 // Unclaimed. Establish a separate, source-backed Paid witness for the later
 // duplicate-claim assertion, after all closure/report preservation checks.
 if(process.argv.includes('--financial-reports')){
  await ok(command('staff',await input({action:'report',scholarshipId:unclaimed.scholarshipId,description:'FICTIONAL independent Paid witness: signed receipt confirmed for the duplicate-claim fixture'})));
  const witnessCase=(await ok(c.request('coordinator',base+'/discrepancies'))).json<{items:ReconciliationEvent[]}>().items.find(e=>e.scholarshipId===unclaimed.scholarshipId);
  assert.ok(witnessCase);
  const witness=await input({action:'correct',paymentId:unclaimed.paymentId,outcome:'paid',actualPaidOn:today(),reason:'FICTIONAL independently reviewed receipt for the duplicate-claim fixture',confirmed:true,caseId:witnessCase.id}),witnessKey=randomUUID();
  const recorded=(await ok(command('coordinator',witness,witnessKey))).json();
  assert.deepEqual((await ok(command('coordinator',witness,witnessKey))).json(),recorded);
  assert.ok((await read()).summary.paid>=1,'Supported correction establishes a current Paid witness independently of the earlier race');
  assert.deepEqual((await c.admin.query<RowDataPacket[]>('SELECT * FROM payment_records WHERE batch_id=? ORDER BY batch_revision',[c.batch]))[0],originalPayments);
  const originalAfterWitness=await page('original');assert.deepEqual(originalAfterWitness.items,original.items);assert.deepEqual(originalAfterWitness.summary,original.summary);
  assert.deepEqual((await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[c.batch]))[0][0].snapshot_hash,source.snapshot_hash);
  console.log('PASS independent Paid witness: authorized fictional correction, exact retry, original payments/closure/frozen source intact');
 }
 console.log(`PASS P03 ${c.total} members: same-recorder verification, self-stability/invalidation, role boundaries, discrepancy dismissal/correction, ${useOverride?"verification override":"normal verified closure"}, audit/member rollback, closure/correction race, immutable original/current distinction and no duplicate payment ledger`);
}
