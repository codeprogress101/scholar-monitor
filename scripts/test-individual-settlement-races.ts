import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {AuthorizationService} from '../server/authorization/service.js';
import {semesterClaim} from '../server/ovr/reprocessing.js';
import {today} from '../server/scholars/validation.js';
export async function testSettlementRaces(c:{runtime:Pool;admin:Pick<Pool,'query'|'execute'>;transactionId:string;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>}){
 const base='/api/v1/individual-payments/settlement',ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,2000));return r;};
 const [[h]]=await c.admin.query<RowDataPacket[]>('SELECT t.*,e.semester_id FROM individual_payment_transactions t JOIN semester_entitlements e ON e.id=t.entitlement_id WHERE t.id=?',[c.transactionId]),[[staff]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
 const [[frozen]]=await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[h.source_batch_id]),[original]=await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='payroll' ORDER BY id");
 const d=(await ok(c.request('staff',base+'/transactions/'+c.transactionId))).json(),o=(await ok(c.request('staff',`/api/v1/ovr-batches/${h.source_batch_id}/reconciliation-summary`))).json();
 const input={mode:'single',transactionIds:[c.transactionId],actualPaidOn:today()},p=(await ok(c.request('staff',base+'/preview',input))).json();assert.deepEqual(p.conflicts,[]);
 const individual={input,basis:p.basis,acknowledgedRelease:true},payroll={action:'correct',expectedRevision:o.summary.revision,expectedReconciliationRevision:o.reconciliationRevision,sourceHash:o.sourceHash,paymentId:h.source_payment_id,outcome:'paid',actualPaidOn:today(),reason:'Coordinator reviewed original acknowledged payroll receipt during synthetic cross-route race',confirmed:true};
 const start=performance.now(),results=await Promise.all([c.request('staff',base+'/paid',individual,randomUUID()),c.request('coordinator',`/api/v1/ovr-batches/${h.source_batch_id}/reconciliation-commands`,payroll,randomUUID())]);
 assert.equal(results.filter(r=>r.statusCode===200).length,1,results.map(r=>r.body).join('\n'));assert.equal(results.filter(r=>r.statusCode===409).length,1);
 const [[annual]]=await c.admin.query<RowDataPacket[]>('SELECT scholarship_id FROM payment_records WHERE id=?',[h.source_payment_id]);
 const claim=await new AuthorizationService(c.runtime).readSnapshot(staff.id,'ovr.process',db=>semesterClaim(db,annual.scholarship_id,h.semester_id));assert.equal(claim.attempts.filter(p=>p.outcome==='paid').length,1);
 assert.deepEqual((await c.admin.query<RowDataPacket[]>("SELECT * FROM payment_records WHERE source_kind='payroll' ORDER BY id"))[0],original);assert.equal((await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[h.source_batch_id]))[0][0].snapshot_hash,frozen.snapshot_hash);
 const current=(await ok(c.request('staff',base+'/transactions/'+c.transactionId))).json();assert.ok(current.status==='Paid'||current.status==='Cancelled');assert.equal(d.status,'Pending Payment');
 const folder=process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022';await mkdir(folder,{recursive:true});await writeFile(folder+'/cross-route-race.json',JSON.stringify({at:new Date().toISOString(),ms:performance.now()-start,results:results.map(r=>({status:r.statusCode,code:r.json().error?.code??'OK'})),oneEffectivePaid:true,originalPayrollRowsExact:true,frozenHashExact:true},null,2));
 console.log('PASS P07 actual cross-route race: original payroll Paid correction versus individual cheque release; one effective Paid claim, unchanged raw original payroll and frozen source');
}
