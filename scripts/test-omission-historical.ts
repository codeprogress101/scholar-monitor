import assert from 'node:assert/strict';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {digest} from '../server/auth/crypto.js';
import {today} from '../server/scholars/validation.js';
import {mkdir,writeFile} from 'node:fs/promises';
export async function testOmissionHistorical(c:{request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;pool:Pool;cycleId:string;source:string;annual:string;scholar:string;semester:string;importId:string}){
 const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r.json();};
 const wp=`/api/v1/payout-cycles/${c.cycleId}/submission-windows`,setup=await ok(c.request('coordinator',wp));
 assert.equal(setup.mappedTerms.length,1,'Historical first semester must not require an unrelated second payout');
 const [[before]]=await c.pool.execute<RowDataPacket[]>('SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[c.source]);
 const tomorrow=new Date(Date.parse(today()+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 await ok(c.request('coordinator',wp+'/extend-semester',{expectedCycleVersion:setup.cycle.version,expectedRevision:setup.deadlines[0].revision,deadlineOn:tomorrow,reason:'Synthetic authorized later historical batch window'}));
 const destination=await ok(c.request('coordinator',wp+'/open-window',{expectedCycleVersion:setup.cycle.version,expectedDeadlineRevision:setup.deadlines[0].revision+1,expectedSequence:1,opensOn:today(),cutoffOn:tomorrow}));
 const read=async()=>(await ok(c.request('staff',`/api/v1/ovr-batches/${destination.id}`))).managed;
 let candidates=await read();assert.ok(candidates.items.find((i:{scholarshipId:string})=>i.scholarshipId===c.annual).issues.some((i:{code:string})=>i.code==='HISTORICAL_BATCH_APPROVAL_REQUIRED'));
 const base='/api/v1/individual-payments/omissions',record={action:'record',sourceBatchId:c.source,scholarshipId:c.annual,expectedRevision:0};
 const saved=await ok(c.request('staff',base+'/commands',record)),detail=async()=>ok(c.request('staff',base+'/'+saved.id));
 await ok(c.request('staff',base+'/commands',{...record,action:'add-to-payroll',omissionId:saved.id,expectedRevision:(await detail()).revision,destinationBatchId:destination.id}));
 candidates=await read();const member=candidates.items.find((i:{scholarshipId:string})=>i.scholarshipId===c.annual);assert.equal(member.eligible,true,JSON.stringify(member.issues));
 assert.equal(member.evidence.current.sources.semesterPayroll.priorApproval.importId,c.importId);
 assert.ok(member.evidence.current.sources.semesterPayroll.timing.every((t:{status:string})=>t.status==='on_time'),'Destination checks its own genuine receipt dates/cutoff, not the old prior-approved deadline');
 assert.match(member.row.course,/pending/i,'Course remains truthfully pending');
 const [[entries]]=await c.pool.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM ovr_entries WHERE batch_id=? AND scholarship_id=?',[destination.id,c.annual]);assert.equal(Number(entries.n),0);
 const [[after]]=await c.pool.execute<RowDataPacket[]>('SELECT snapshot,snapshot_hash FROM ovr_finalizations WHERE batch_id=?',[c.source]);assert.deepEqual(after,before);
 await c.pool.execute('UPDATE scholars SET version=version+1 WHERE id=?',[c.scholar]);
 try{const stale=(await read()).items.find((i:{scholarshipId:string})=>i.scholarshipId===c.annual);assert.equal(stale.eligible,false,'Source changes invalidate reused historical approval');}finally{await c.pool.execute('UPDATE scholars SET version=version-1 WHERE id=?',[c.scholar]);}
 const [[root]]=await c.pool.execute<RowDataPacket[]>('SELECT batch_id FROM historical_payout_setups WHERE cycle_id=? ORDER BY revision DESC LIMIT 1',[c.cycleId]);assert.equal(root.batch_id,c.source);
 const report={at:new Date().toISOString(),historicalRootPreserved:true,oldFrozenHash:digest(JSON.stringify(before)),sourceBatchId:c.source,destination:destination.id,onlyOneSemesterMapped:true,explicitDestinationOrigin:true,coursePendingPreserved:true,destinationTiming:'on_time',noManualRosterInsert:true,staleSourceBlocked:true};
 await mkdir('output/p05-omitted-20261022',{recursive:true});await writeFile('output/p05-omitted-20261022/historical.json',JSON.stringify(report,null,2));
 console.log('PASS P05 historical destination origin: same prior-approved import, Course pending, independent on-time destination cutoff, no unrelated second payroll, original root/frozen bytes unchanged and stale-source rejection');
}
