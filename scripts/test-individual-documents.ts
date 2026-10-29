import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import type {Connection,Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {AuthorizationService} from '../server/authorization/service.js';
import {IndividualPaymentService} from '../server/payments/individual-service.js';
import {OmissionPaymentService} from '../server/payments/omission-service.js';
import {IndividualDocumentService} from '../server/payments/document-service.js';
import {prototypeDocuments,type IndividualDocumentRenderer} from '../server/payments/document-word.js';
import type {DocumentDetail,DocumentFields} from '../server/payments/document-model.js';
type Context={request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;admin:Pick<Connection,'query'|'execute'>;runtime:Pool;transactionId:string;sourceKind:'unclaimed'|'omitted'};
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.statusCode===200?'':r.body.slice(0,2000));return r;};
export async function testIndividualDocuments(c:Context){
 const volume=process.argv.includes('--payment-recording-large')||process.argv.includes('--recording-volume');
 const folder=process.env.LDSS_P06_OUTPUT??'output/p06-documents-20261022',base=`/api/v1/individual-payments/transactions/${c.transactionId}/documents`;await mkdir(folder+'/samples',{recursive:true});
 const [[database]]=await c.admin.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(database.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 if(process.argv.includes('--document-upgrade'))await (await import('./test-individual-documents-upgrade.js')).testDocumentUpgrade(c.admin);
 const protectedTables=['payment_records','payment_corrections','semester_entitlements','semester_entitlement_events','payroll_allocations','ovr_finalizations','payroll_closure_members','individual_payment_transactions','individual_payment_events','payroll_omissions','payroll_omission_events','entitlement_payment_routes','payroll_preparation_versions'];
 const financial=async()=>{const result:Record<string,string>={};for(const table of protectedTables){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${table}`);result[table]=sha(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort()));}return result;};
 const documents=async()=>{const result:Record<string,string>={};for(const table of ['individual_document_versions','individual_document_contents']){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${table} ORDER BY transaction_id,document_kind`);result[table]=sha(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort()));}return result;};
 const original=await financial(),oldGet=c.runtime.getConnection.bind(c.runtime);let selects=0,dbMs=0;
 c.runtime.getConnection=async()=>{const connection=await oldGet();return new Proxy(connection,{get(target,prop){if(prop!=='execute'&&prop!=='query'){const v=Reflect.get(target,prop);return typeof v==='function'?v.bind(target):v;}return async(...args:unknown[])=>{const start=performance.now();if(typeof args[0]==='string'&&/^\s*SELECT\b/i.test(args[0]))selects++;try{return await (target[prop] as (...v:unknown[])=>Promise<unknown>).apply(target,args);}finally{dbMs+=performance.now()-start;}};}}) as PoolConnection;};
 const runs:object[]=[],memory:object[]=[];
 async function measure(name:string,run:()=>Promise<LightMyRequestResponse>){global.gc?.();selects=0;dbMs=0;const start=performance.now(),before=process.memoryUsage();let peakRss=before.rss,peakHeap=before.heapUsed;const timer=setInterval(()=>{const m=process.memoryUsage();peakRss=Math.max(peakRss,m.rss);peakHeap=Math.max(peakHeap,m.heapUsed);},10);try{const r=await run(),after=process.memoryUsage();runs.push({name,ms:performance.now()-start,selects,dbMs,bytes:r.rawPayload.length,status:r.statusCode,before,after,peakRss:Math.max(peakRss,after.rss),peakHeap:Math.max(peakHeap,after.heapUsed)});return r;}finally{clearInterval(timer);}}
 const detail=async()=>(await ok(c.request('staff',base))).json<DocumentDetail>();
 const input=async(fields:Partial<DocumentFields>={})=>{const d=await detail();return {transactionId:c.transactionId,sourceKind:d.sourceKind,expectedRevision:d.revision,sourceHash:d.sourceHash,templateVersion:d.templates[0].version,fields:{...d.fields,...fields}};};
 const generate=(body:object,key=randomUUID())=>c.request('staff',base+'/generate',body,key);
 const [[staff]]=await c.admin.query<RowDataPacket[]>("SELECT u.id,ur.id role_id,ur.revoked_at FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE ur.role_code='staff' AND ur.revoked_at IS NULL LIMIT 1");
 const authorization=new AuthorizationService(c.runtime),reviews={individual:new IndividualPaymentService(authorization,true),omitted:new OmissionPaymentService(authorization,true)};
 const service=(renderer:IndividualDocumentRenderer)=>new IndividualDocumentService(authorization,reviews,true,renderer);
 try{
  assert.equal((await ok(c.request('staff','/api/v1/individual-payments/documents/availability'))).json().enabled,true);
  for(let i=0;i<3;i++)await ok(measure('open_document_review',()=>c.request('staff',base)));
  let d=await detail();assert.equal(d.sourceKind,c.sourceKind);assert.equal(d.revision,0);assert.equal(d.sourceHash,(await detail()).sourceHash,'Fresh unchanged financial sources have stable fingerprints');assert.deepEqual(d.documents,[]);assert.equal(d.fields.payee,'');assert.equal(d.fields.address,'');assert.deepEqual(await financial(),original);
  const wrong=await input();assert.equal((await generate({...wrong,fields:{amount:'1'}})).statusCode,422);assert.equal((await generate({...wrong,templateVersion:'../../unapproved-template.pub'})).statusCode,409);assert.equal((await generate({...wrong,sourceKind:c.sourceKind==='omitted'?'unclaimed':'omitted'})).statusCode,409);
  for(const path of [base,base+'/history',base+'/DV/word'])assert.equal((await c.request('system_admin',path)).statusCode,403);
  assert.equal((await c.request('system_admin',base+'/generate',wrong)).statusCode,403);
  assert.equal((await c.request('staff',`/api/v1/individual-payments/transactions/${randomUUID()}/documents/DV/word`)).statusCode,404);
  const firstKey=randomUUID(),firstInput=await input(),first=(await ok(measure('generate_documents',()=>generate(firstInput,firstKey)))).json();assert.equal(first.draft,true);assert.equal(first.revision,1);
  const afterFirst=await documents();assert.deepEqual((await ok(generate(firstInput,firstKey))).json(),first);assert.deepEqual(await documents(),afterFirst);
  assert.equal((await generate({...firstInput,fields:{payee:'Changed retry'}},firstKey)).statusCode,409);assert.equal((await generate(firstInput)).statusCode,409);
  d=await detail();assert.equal(d.documents.length,c.sourceKind==='omitted'?2:1);assert.ok(d.documents.every(v=>v.current));
  for(const artifact of d.documents){
   for(let i=0;i<3;i++){
    const file=await ok(measure('download_'+artifact.kind,()=>c.request('staff',`${base}/${artifact.kind}/word`)));
    assert.match(String(file.headers['content-type']),/wordprocessingml/);assert.equal(file.headers['cache-control'],'no-store');assert.match(String(file.headers['content-disposition']),/DRAFT-/);
    const zip=await JSZip.loadAsync(file.rawPayload),xml=await zip.file('word/document.xml')!.async('string');assert.ok(xml.includes('5,000.00'));assert.ok(xml.includes('Five Thousand Pesos Only'));assert.ok(!/CAROLINE|ROSSANO|RODANTE|RAYCHEL|TATLONGHARI|37,500|50,000/.test(xml));
    if(i===0)await writeFile(`${folder}/samples/${c.sourceKind}-${artifact.kind}-default.docx`,file.rawPayload);
   }
  }
  if(c.sourceKind==='unclaimed')assert.equal((await c.request('staff',base+'/OR/word')).statusCode,404);
  const correction=await input({payee:'Synthetic office-selected payee',office:'Synthetic permitted office',address:'Synthetic permitted address',additionalExplanation:'Supplementary office note <not accounting approval> & explanation.'});
  await ok(measure('regenerate_documents',()=>generate(correction)));d=await detail();assert.equal(d.revision,2);assert.equal(d.fields.payee,correction.fields.payee);
  assert.notDeepEqual(await documents(),afterFirst);assert.equal((await ok(c.request('staff',base+'/history?limit=25'))).json().total,(c.sourceKind==='omitted'?2:1)*2);
  const raceInput=await input(),keys=[randomUUID(),randomUUID()],race=await Promise.all(keys.map(key=>generate(raceInput,key)));assert.equal(race.filter(r=>r.statusCode===200).length,1);assert.equal(race.filter(r=>r.statusCode===409).length,1);const winning=race.findIndex(r=>r.statusCode===200);assert.deepEqual((await ok(generate(raceInput,keys[winning]))).json(),race[winning].json());
  if(!volume){
   const snapshot=await documents(),rollbackInput=await input(),rollbackKey=randomUUID();
   await c.admin.query("CREATE TRIGGER p06_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='individual.document' AND NEW.action='generated' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P06 audit rollback'; END IF; END");
   try{assert.equal((await generate(rollbackInput,rollbackKey)).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p06_fail_audit');}assert.deepEqual(await documents(),snapshot);await ok(generate(rollbackInput,rollbackKey));
   const failInput=await input(),beforeFailure=await documents();
   await assert.rejects(service({...prototypeDocuments,render:async()=>{throw new Error('Synthetic interrupted render');}}).generate(staff.id,c.transactionId,randomUUID(),failInput,'p06-render-failure'));assert.deepEqual(await documents(),beforeFailure);
   function paused(){let entered!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>{entered=r;}),gate=new Promise<void>(r=>{release=r;});const renderer:IndividualDocumentRenderer={...prototypeDocuments,render:async(...args)=>{entered();await gate;return prototypeDocuments.render(...args);}};return {ready,release,renderer};}
   const stale=paused(),staleInput=await input(),staleResult=service(stale.renderer).generate(staff.id,c.transactionId,randomUUID(),staleInput,'p06-stale-render');await stale.ready;
   await ok(generate(staleInput));stale.release();await assert.rejects(staleResult,e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='DOCUMENT_CHANGED'));
   const revoked=paused(),revokeInput=await input(),revokeBefore=await documents(),revokedResult=service(revoked.renderer).generate(staff.id,c.transactionId,randomUUID(),revokeInput,'p06-revoked-render');await revoked.ready;
   await c.admin.execute('UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[staff.role_id]);revoked.release();
   try{await assert.rejects(revokedResult,e=>Boolean(e&&typeof e==='object'&&'status'in e&&e.status===403));}finally{await c.admin.execute('UPDATE user_roles SET revoked_at=NULL WHERE id=?',[staff.role_id]);}assert.deepEqual(await documents(),revokeBefore);
   const changed=paused(),changedInput=await input(),sourceBefore=await documents();
   const [[identity]]=await c.admin.execute<RowDataPacket[]>('SELECT s.id,s.first_name,s.version FROM scholars s JOIN semester_entitlements e ON e.scholar_id=s.id JOIN individual_payment_transactions t ON t.entitlement_id=e.id WHERE t.id=?',[c.transactionId]);
   const changedResult=service(changed.renderer).generate(staff.id,c.transactionId,randomUUID(),changedInput,'p06-source-change');await changed.ready;
   await c.admin.execute('UPDATE scholars SET first_name=?,version=version+1 WHERE id=?',['Synthetic changed source',identity.id]);changed.release();
   try{await assert.rejects(changedResult);assert.equal((await c.request('staff',base+'/DV/word')).statusCode,409);}finally{await c.admin.execute('UPDATE scholars SET first_name=?,version=? WHERE id=?',[identity.first_name,identity.version,identity.id]);}assert.deepEqual(await documents(),sourceBefore);
   const template=paused(),templateInput=await input(),templateBefore=await documents(),templateResult=service(template.renderer).generate(staff.id,c.transactionId,randomUUID(),templateInput,'p06-template-change');await template.ready;
   Object.assign(template.renderer,{version:'unapproved-change/v2'});template.release();await assert.rejects(templateResult,e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='DOCUMENT_TEMPLATE_CHANGED'));assert.deepEqual(await documents(),templateBefore);
  }
  for(const sql of ['UPDATE individual_document_versions SET source_hash=source_hash WHERE 1=0','DELETE FROM individual_document_versions WHERE 1=0','DELETE FROM individual_document_contents WHERE 1=0','UPDATE individual_document_contents SET transaction_id=transaction_id WHERE 1=0'])await assert.rejects(c.runtime.query(sql));
  await assert.rejects(c.admin.execute('UPDATE individual_document_contents SET content_base64=? WHERE transaction_id=?',['!',c.transactionId]),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));
  if(c.sourceKind==='unclaimed'){const [[version]]=await c.admin.query<RowDataPacket[]>('SELECT * FROM individual_document_versions WHERE transaction_id=? LIMIT 1',[c.transactionId]);await assert.rejects(c.admin.query('INSERT INTO individual_document_versions SET ?',[{...version,document_kind:'OR',revision:99}]),e=>Boolean(e&&typeof e==='object'&&'errno'in e&&e.errno===4025));}
  const longNote='Supporting-document review note. '.repeat(35).slice(0,1100),longInput=await input({payee:'Synthetic office-selected payee with a deliberately long name for form wrapping verification',address:'Synthetic address retained only in this disposable layout fixture. '.repeat(3),additionalExplanation:longNote});
  await ok(generate(longInput));for(const artifact of (await detail()).documents){const response=await ok(c.request('staff',`${base}/${artifact.kind}/word`));await writeFile(`${folder}/samples/${c.sourceKind}-${artifact.kind}-long.docx`,response.rawPayload);}
  for(let i=0;i<20;i++){await ok(c.request('staff',base));global.gc?.();const pool=c.runtime.pool as unknown as {_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}};assert.equal(pool._allConnections.length,pool._freeConnections.length);assert.equal(pool._connectionQueue.length,0);memory.push({iteration:i+1,...process.memoryUsage(),connections:pool._allConnections.length});}
  assert.deepEqual(await financial(),original,'Document operations do not alter financial evidence, entitlement, route or payment records');
  await (await import('./test-individual-documents-backup.js')).testDocumentBackup(c.admin,c.transactionId);
  await writeFile(`${folder}/${c.sourceKind}${volume?'-835':''}-metrics.json`,JSON.stringify({at:new Date().toISOString(),cohort:volume?835:'small',conditions:'Authorized actual HTTP endpoints; three warm read/download samples; single generation observations; SQL client roundtrip; canonical source validation; selected transaction only',runs,memory,financialHashesUnchanged:true},null,2));
  console.log(`PASS P06 ${c.sourceKind}: editable draft generation, current downloads, exact retry, corrections, route/financial preservation, bounded metadata/history, cancellation-compatible storage and backup`);
 }finally{c.runtime.getConnection=oldGet;}
}
