import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Connection,Pool,RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import type { OvrDetail } from "../server/ovr/model.js";
import { today } from "../server/scholars/validation.js";
type Request=(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;
export async function testTreasury({request,admin,runtime,batch,people}:{request:Request;admin:Connection;runtime:Pool;batch:string;people:{id:string;annual:string}[]}){
  const path=`/api/v1/ovr-batches/${batch}`,day=today();
  const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r;};
  const denied=async(p:Promise<LightMyRequestResponse>,code:string)=>{const r=await p;assert.notEqual(r.statusCode,200,r.body);assert.equal(r.json().error.code,code,r.body);};
  const read=async()=>(await ok(request("staff",path))).json<OvrDetail>();
  let detail=await read();
  const evidence={expectedRevision:1,payrollReference:"CORRECTED-SYNTHETIC-PAYROLL",officeReceivedOn:day,reason:"Coordinator reviewed a transcription correction"};
  await denied(request("staff",path+"/treasury-evidence",evidence),"TREASURY_REVISION_REQUIRES_COORDINATOR");
  await denied(request("system_admin",path+"/treasury-evidence",evidence),"PERMISSION_DENIED");
  const correctionKey=randomUUID();
  await ok(request("coordinator",path+"/treasury-evidence",evidence,correctionKey));
  await ok(request("coordinator",path+"/treasury-evidence",evidence,correctionKey));
  assert.equal((await read()).treasuryEvidence!.revision,2);
  const payload={expectedRevision:detail.batch.revision,scholarshipId:people[0].annual,treasuryEvidenceRevision:2,effectiveOn:null,outcome:"paid",amount:"5000.00",remarks:"",receiptConfirmed:true,reason:"Verified actual signed receipt",reference:"Client reference must not override batch evidence"};
  await denied(request("staff",path+"/payments",{...payload,treasuryEvidenceRevision:1}),"TREASURY_EVIDENCE_REQUIRED");
  await denied(request("staff",path+"/payments",{...payload,scholarshipId:people[1].annual}),"PAYROLL_ALLOCATION_REQUIRED");
  await admin.query("CREATE TRIGGER fail_treasury_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='ovr.processing' AND NEW.action='record-payment' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic treasury audit rollback'; END IF; END");
  const key=randomUUID();
  try{assert.equal((await request("staff",path+"/payments",payload,key)).statusCode,500);}finally{await admin.query("DROP TRIGGER fail_treasury_audit");}
  assert.equal((await read()).payments.length,0);
  assert.equal((await admin.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM payroll_treasury_confirmations"))[0][0].n,0);
  const race=await Promise.all([request("staff",path+"/payments",payload,key),request("staff",path+"/payments",payload,randomUUID())]);
  assert.deepEqual(race.map(r=>r.statusCode).sort(),[200,409]);
  if(race[0].statusCode===200)await ok(request("staff",path+"/payments",payload,key));
  detail=await read();
  assert.equal(detail.payments[0].effectiveOn,null);
  assert.equal(detail.payments[0].treasuryEvidenceRevision,2);
  assert.equal(detail.payments[0].reference,evidence.payrollReference);
  assert.ok(detail.payments[0].confirmedAt);
  assert.equal(detail.reconciliation.paid,1);assert.equal(detail.reconciliation.unpaid,1);assert.equal(detail.reconciliation.unclaimed,0);assert.equal(detail.reconciliation.complete,false);
  await ok(request("coordinator",path+"/treasury-evidence",{...evidence,expectedRevision:2,payrollReference:"CORRECTED-AGAIN",reason:"Second controlled correction retains earlier revision"}));
  assert.equal((await read()).payments[0].treasuryEvidenceRevision,2);
  const [[oldEvidence]]=await admin.execute<RowDataPacket[]>("SELECT payroll_reference FROM payroll_treasury_evidence WHERE batch_id=? AND revision=2",[batch]);assert.equal(oldEvidence.payroll_reference,evidence.payrollReference);
  for(const table of ["payroll_treasury_evidence","payroll_treasury_confirmations","payroll_historical_receipts","placement_policy_reviews","payroll_legacy_conversions"])for(const verb of ["UPDATE","DELETE"])await assert.rejects(runtime.query(verb === "UPDATE" ? `UPDATE ${table} SET actor_id=actor_id WHERE 1=0` : `DELETE FROM ${table} WHERE 1=0`));
  console.log("PASS Treasury evidence revisions, role separation, immutable confirmation association, unknown actual date, totals, audit rollback, simultaneous submissions and safe retry");

  // Advance only the four owned disposable runtime sessions. No dates or real records are changed.
  const connections=await Promise.all(Array.from({length:4},()=>runtime.getConnection()));
  const [[clock]]=await admin.execute<RowDataPacket[]>("SELECT UNIX_TIMESTAMP(DATE_ADD(ends_on,INTERVAL 2 DAY)) AS future FROM semesters WHERE id=?",[detail.cycle.semesterId]);
  try{for(const db of connections)await db.query("SET timestamp=?",[Number(clock.future)]);}finally{for(const db of connections)db.release();}
  try{
    detail=await read();assert.equal(detail.claimDeadline?.expired,true);
    const historical={expectedRevision:detail.batch.revision,scholarshipId:people[2].annual,evidenceRevision:3,actualPaidOn:null,beforeDeadlineEvidence:"Synthetic Treasury acknowledgment explicitly records receipt within the semester before expiry; precise day was not recorded.",receiptConfirmed:true};
    await denied(request("staff",path+"/payments",{...payload,expectedRevision:detail.batch.revision,scholarshipId:people[2].annual,treasuryEvidenceRevision:3}),"CLAIM_PERIOD_ENDED");
    const pending=(await ok(request("staff",path+"/historical-receipts/request",historical))).json();
    await denied(request("staff",path+"/historical-receipts/request",historical),"HISTORICAL_RECEIPT_PENDING");
    const approve={expectedRevision:detail.batch.revision,receiptId:pending.id,reason:"Coordinator independently verified historical receipt",verifiedBeforeDeadline:true};
    await denied(request("staff",path+"/historical-receipts/approve",approve),"PERMISSION_DENIED");
    await denied(request("coordinator",path+"/historical-receipts/approve",{...approve,verifiedBeforeDeadline:undefined}),"PRIOR_RECEIPT_CONFIRMATION_REQUIRED");
    await admin.query("CREATE TRIGGER fail_historical_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='treasury.historical' AND NEW.action='approve' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic historical rollback'; END IF; END");
    const approvalKey=randomUUID();
    try{assert.equal((await request("coordinator",path+"/historical-receipts/approve",approve,approvalKey)).statusCode,500);}finally{await admin.query("DROP TRIGGER fail_historical_audit");}
    assert.equal((await read()).payments.length,1);
    const approved=(await ok(request("coordinator",path+"/historical-receipts/approve",approve,approvalKey))).json();
    assert.deepEqual((await ok(request("coordinator",path+"/historical-receipts/approve",approve,approvalKey))).json(),approved);
    detail=await read();assert.equal(detail.payments.length,2);assert.equal(detail.payments.find(p=>p.scholarshipId===people[2].annual)!.effectiveOn,null);assert.equal(detail.historicalReceipts![0].state,"approved");
    assert.equal(detail.reconciliation.paid,2);assert.equal(detail.reconciliation.unpaid,0);assert.equal(detail.reconciliation.paidTotal,"10000.00");
    console.log("PASS historical receipt: expired ordinary release blocked, pending duplicate blocked, Coordinator verification required, atomic audit rollback, idempotent approval and unknown exact date preserved");
  }finally{
    const reset=await Promise.all(Array.from({length:4},()=>runtime.getConnection()));
    try{for(const db of reset)await db.query("SET timestamp=DEFAULT");}finally{for(const db of reset)db.release();}
  }
}
