import type {ConfigFields,ConfigRecord,ConfigList} from '../server/configuration/model.js';
import type {RecordingSummary,RecordingPreview,RecordingRow} from '../server/payments/recording-model.js';
import type {ReportPage} from '../server/payments/report-model.js';
type Recon=Awaited<ReturnType<import('../server/payments/reconciliation-service.js').PayrollReconciliationService['summary']>>;
type IndividualPage=Awaited<ReturnType<import('../server/payments/individual-service.js').IndividualPaymentService['page']>>;
type IndividualDetail=Awaited<ReturnType<import('../server/payments/individual-service.js').IndividualPaymentService['detail']>>;
type SettlementDetail=Awaited<ReturnType<import('../server/payments/settlement-service.js').IndividualSettlementService['detail']>>;
type OmissionDetail=Awaited<ReturnType<import('../server/payments/omission-service.js').OmissionPaymentService['detail']>>;
import type {RowDataPacket} from 'mysql2/promise';
// Synthetic UAT state adapters: all business transitions use the accepted APIs.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import type {Pool,Connection} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import {today} from '../server/scholars/validation.js';
import {folder,save} from './uat-environment.mjs';

type Context={admin:Pool|Connection;runtime:Pool;request:(role:string,url:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;scenario:string;database:string};
export async function populateUat(c:Context) {
 const manifestPath=`${folder}/${c.scenario}.json`,metadata=JSON.parse(await readFile(manifestPath,'utf8'));
 assert.equal(metadata.database,c.database);
 const actions:object[]=[],metrics:object[]=[],day=today();
 let selects=0,sqlMs=0,writes=0;
 const originalGet=c.runtime.getConnection.bind(c.runtime);
 c.runtime.getConnection=async()=>{
  const db=await originalGet();
  return new Proxy(db,{get(target,key){const fn=Reflect.get(target,key);if(key!=='execute'&&key!=='query')return typeof fn==='function'?fn.bind(target):fn;
   return async(...args:unknown[])=>{const start=performance.now();try{return await (fn.bind(target) as (...a:unknown[])=>Promise<unknown>)(...args);}finally{sqlMs+=performance.now()-start;if(/^\s*SELECT\b/i.test(String(args[0])))selects++;else if(/^\s*(INSERT|UPDATE|DELETE)\b/i.test(String(args[0])))writes++;}};
  }});
 };
 const raw=c.request;
 const ok=async(role:string,url:string,body?:object,key?:string)=>{
  const result=await raw(role,url,body,key);assert.equal(result.statusCode,200,`${url}: ${result.body.slice(0,1400)}`);
  if(body)actions.push({role,url,action:(body as {action?:string}).action??'command',status:200});return result;
 };
 const api=async<T=unknown>(role:string,url:string,body?:object,key?:string)=> (await ok(role,url,body,key)).json<T>();
 const measure=async<T>(name:string,run:()=>Promise<T>)=>{
  global.gc?.();selects=0;sqlMs=0;writes=0;const before=process.memoryUsage(),start=performance.now();let peakRss=before.rss;
  const timer=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},20);
  try {const value=await run();metrics.push({name,ms:performance.now()-start,selects,writes,sqlMs,before,after:process.memoryUsage(),sampledPeakRss:Math.max(peakRss,process.memoryUsage().rss)});return value;}finally{clearInterval(timer);}
 };
 const config=async(kind:string,fields:ConfigFields)=>{
  const rows=await api<ConfigList>('system_admin',`/api/v1/configuration/${kind}?limit=100`),existing=rows.items.find(r=>r.code===fields.code);
  if(existing){for(const [key,value] of Object.entries(fields))assert.equal(existing[key as keyof ConfigRecord],value,`Existing synthetic configuration differs: ${fields.code}.${key}`);return existing;}
  return api<ConfigRecord>('system_admin',`/api/v1/configuration/${kind}`,{action:'create',expectedVersion:0,reason:'Synthetic populated UAT configuration',fields});
 };
 const offset=(n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const evidence={reason:'Explicit fictional UAT workflow evidence',reference:'SYNTHETIC-UAT-ONLY'};
 async function generateDocuments(id:string,sourceKind:string) {
  const base=`/api/v1/individual-payments/transactions/${id}/documents`;
  const doc=await api<import('../server/payments/document-model.js').DocumentDetail>('staff',base);
  await measure('word_generate_'+sourceKind,()=>api('staff',base+'/generate',{transactionId:id,sourceKind,sourceHash:doc.sourceHash,expectedRevision:doc.revision,templateVersion:doc.templates[0].version,fields:doc.fields}));
  for(const kind of sourceKind==='omitted'?['OR','DV']:['DV']) {
   const response=await ok('staff',`${base}/${kind}/word`);
   const bytes=response.rawPayload;assert.ok(bytes.subarray(0,2).equals(Buffer.from('PK')));
   await writeFile(`${folder}/exports/${c.scenario}-${id}-${kind}-DRAFT.docx`,bytes);
  }
 }
 async function forward(id:string) {
  const base='/api/v1/individual-payments/settlement',d=await api<SettlementDetail>('staff',`${base}/transactions/${id}`);
  await api('staff',base+'/commands',{action:'forward',transactionId:id,expectedRevision:d.revision,sourceHash:d.sourceHash});
 }
 async function release(ids:string[],representative=false) {
  const base='/api/v1/individual-payments/settlement';
  const input={mode:ids.length===1?'single':'bulk',transactionIds:ids,actualPaidOn:day,...(representative?{authorizationDocumentsVerified:true}:{})};
  const p=await measure('individual_release_preview',()=>api<import('../server/payments/settlement-model.js').SettlementPreview>('staff',base+'/preview',input));assert.equal(p.conflicts.length,0,JSON.stringify(p.conflicts));assert.equal(p.count,ids.length);
  const body={input,basis:p.basis,acknowledgedRelease:true,...(ids.length>1?{scholarPersonalReleaseConfirmed:true}:{})};
  const key=randomUUID(),result=await measure('individual_release_commit',()=>api('staff',base+'/paid',body,key));
  assert.deepEqual(await api('staff',base+'/paid',body,key),result,'Exact release retry');
 }
 try {
  await mkdir(folder+'/exports',{recursive:true});
  if(c.scenario!=='F') {
   const [batchRows]=await c.admin.query<RowDataPacket[]>("SELECT b.id,b.cycle_id FROM ovr_batches b JOIN ovr_finalizations f ON f.batch_id=b.id WHERE f.entry_count=835");
   assert.equal(batchRows.length,1);const batch=batchRows[0].id,base=`/api/v1/ovr-batches/${batch}`;
   metadata.batchId=batch;metadata.cycleId=batchRows[0].cycle_id;
   const summary=()=>api<RecordingSummary>('staff',base+'/payment-summary');
   const reconciliation=()=>api<Recon>('staff',base+'/reconciliation-summary');
   const reconCommand=async(action:string,extra:object={},role='coordinator')=>{const r=await reconciliation();return api(role,base+'/reconciliation-commands',{action,expectedRevision:r.summary.revision,expectedReconciliationRevision:r.reconciliationRevision,sourceHash:r.sourceHash,...extra});};
   const first=await api<{total:number;items:RecordingRow[]}>('staff',base+'/payment-roster?limit=25');assert.equal(first.total,835);
   if(c.scenario!=='A'&&(await summary()).pending===835) {
    const unclaimed={mode:'selected',scholarshipIds:first.items.slice(0,10).map(r=>r.scholarshipId),outcome:'unclaimed',actualPaidOn:null,reference:'SYNTHETIC-SIGNED-RETURN',reason:'Fictional recipients did not claim in this UAT scenario'};
    const p=await measure('preview_10_unclaimed',()=>api<RecordingPreview>('staff',base+'/payment-operations/preview',unclaimed));assert.equal(p.conflicts.length,0);
    await measure('commit_10_unclaimed',()=>api('staff',base+'/payment-operations',{input:unclaimed,basis:p.basis,acceptedIds:p.acceptedIds,reviewed:true,receiptConfirmed:false}));
    const paid={...unclaimed,mode:'all_remaining_paid',scholarshipIds:[],outcome:'paid',actualPaidOn:day};
    const review=await measure('preview_825_paid',()=>api<RecordingPreview>('staff',base+'/payment-operations/preview',paid));assert.equal(review.count,825);assert.equal(review.conflicts.length,0);
    const key=randomUUID(),body={input:paid,basis:review.basis,acceptedIds:review.acceptedIds,reviewed:true,receiptConfirmed:true};
    const result=await measure('commit_825_paid',()=>api('staff',base+'/payment-operations',body,key));assert.deepEqual(await api('staff',base+'/payment-operations',body,key),result);
    const complete=await summary();assert.equal(complete.paid,825);assert.equal(complete.unclaimed,10);assert.equal(complete.pending,0);assert.equal(complete.paidAmount,'4125000.00');
   }
   if(['C','D','E'].includes(c.scenario)&&(await reconciliation()).summary.state!=='closed'&&(await reconciliation()).verification!=='Verified')await reconCommand('verify',{returnedAndCompared:true},'staff');
   if(['D','E'].includes(c.scenario)) {
    if((await reconciliation()).summary.state!=='closed')await reconCommand('close',{effectiveOn:day,reviewed:true});
    const original=await api<{items:unknown[];summary:unknown}>('staff',base+'/reconciliation?basis=original&limit=25');
    const [[frozen]]=await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind=\'closed\'',[batch]);metadata.originalClosureHash=frozen.snapshot_hash;
    if(c.scenario==='E') {
     if((await summary()).paid===825){const source=(await api<IndividualPage>('staff','/api/v1/individual-payments/queue?limit=100')).items[0];
     await reconCommand('correct',{paymentId:source.paymentId,outcome:'paid',actualPaidOn:day,reason:'Synthetic signed returned payroll supports an authorized post-closure correction',confirmed:true});}
     assert.equal((await summary()).paid,826);
     const again=await api<{items:unknown[];summary:unknown}>('staff',base+'/reconciliation?basis=original&limit=25');assert.deepEqual(again.items,original.items);assert.deepEqual(again.summary,original.summary);
     const queue=await api<IndividualPage>('staff','/api/v1/individual-payments/queue?limit=100');
     const rows=queue.items.filter(r=>r.batchCode&&r.outcome==='Unclaimed');assert.equal(rows.length,9);
     const txs:string[]=[];
     for(let i=1;i<rows.length;i++) {
      const row=rows[i],detail=()=>api<IndividualDetail>('staff',`/api/v1/individual-payments/payments/${row.paymentId}`);
      const command=async(action:string,role='staff')=>{const d=await detail();return api(role,'/api/v1/individual-payments/commands',{action,paymentId:row.paymentId,expectedRevision:d.revision,...(d.transactionId?{transactionId:d.transactionId}:{}),...(action==='approve-cancellation'?{externalUnpaidConfirmed:true}:{}),reason:'Synthetic reviewed internal DV lifecycle'});};
      await command('request');if(i===1)continue;
      await command('prepare');let d=await detail();txs[i]=d.transactionId!;
      if(i===2)continue;
      await generateDocuments(d.transactionId!,'unclaimed');if(i===3)continue;
      await forward(d.transactionId!);if(i===4)continue;
      if(i===8) {
       await command('request-cancellation');await command('approve-cancellation','coordinator');await command('replace');
       d=await detail();txs[i]=d.transactionId!;await generateDocuments(d.transactionId!,'unclaimed');
       await command('request-cancellation');continue;
      }
     }
     await release([txs[5]],true);await release([txs[6],txs[7]]);
     const settled=await api<SettlementDetail>('staff',`/api/v1/individual-payments/settlement/transactions/${txs[7]}`);
     await api('staff','/api/v1/individual-payments/settlement/commands',{action:'report',transactionId:txs[7],expectedRevision:settled.revision,description:'Synthetic financial discrepancy kept pending for Coordinator investigation'});
     metadata.individualTransactions=txs.filter(Boolean);metadata.unclaimedSourceCount=9;
     const [[after]]=await c.admin.query<RowDataPacket[]>('SELECT snapshot_hash FROM payroll_reconciliation_events WHERE batch_id=? AND kind=\'closed\'',[batch]);assert.equal(after.snapshot_hash,metadata.originalClosureHash);
    }
   }
   metadata.recording=await summary();metadata.reconciliation=await reconciliation();
   // Exercise available report bases and both downloads against authoritative sources.
   const available=(await api<ReportPage>('staff',base+'/financial-report')).available;
   metadata.reports=[];
   for(const basis of available) {
    const report=await api<ReportPage>('staff',base+`/financial-report?basis=${basis}&limit=25`);
    assert.equal(report.payrollTotals.count,835);assert.equal(report.payrollTotals.approvedCentavos,417500000);
    for(const outcome of ['paid','unclaimed'])await api<ReportPage>('staff',base+`/financial-report?basis=${basis}&outcome=${outcome}&limit=25`);
    if(basis==='original')assert.equal(report.payrollTotals.paidCentavos,412500000);
    for(const format of ['xlsx','pdf']) {
     const response=await measure(`export_${basis}_${format}`,()=>ok('staff',base+'/reconciliation/exports',{basis,outcome:'all',sourceHash:report.sourceHash,format}));
     const buffer=response.rawPayload;assert.ok(buffer.subarray(0,format==='pdf'?4:2).equals(Buffer.from(format==='pdf'?'%PDF':'PK')));
     const file=`${folder}/exports/${c.scenario}-${basis}.${format}`;await writeFile(file,buffer);metadata.reports.push({basis,format,file,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')});
    }
   }
   // Add explicit synthetic historical calendar, never infer an official date.
   const years=await api<ConfigList>('system_admin','/api/v1/configuration/academic-years?limit=100');
   const year=years.items.find(y=>y.code==='IMPORT-YEAR')!,prior=years.items.find(y=>y.code==='IMPORT-PRIOR-YEAR')!;
   await config('semesters',{code:'UAT-CURRENT-SECOND',name:'Synthetic second semester',academicYearId:year.id,startsOn:offset(121),endsOn:offset(280),termKind:'second'});
   const [[setting]]=await c.admin.query<RowDataPacket[]>("SELECT version FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR'");
   const historicalSemester=(year:Pick<ConfigRecord,'code'|'name'|'startsOn'|'endsOn'>&{id?:string},semester:Pick<ConfigFields,'code'|'name'|'startsOn'|'endsOn'|'termKind'>)=>api('system_admin','/api/v1/configuration/historical-calendar',{workingYearId:year.id===prior.id?years.items.find(y=>y.code==='IMPORT-YEAR')!.id:years.items.find(y=>y.code==='IMPORT-YEAR')!.id,expectedWorkingYearVersion:years.items.find(y=>y.code==='IMPORT-YEAR')!.version,expectedSettingVersion:setting.version,year:{code:year.code,name:year.name,startsOn:year.startsOn,endsOn:year.endsOn},semester,...evidence,reviewed:true});
   await historicalSemester(prior,{code:'UAT-PRIOR-FIRST',name:'Synthetic prior first semester',startsOn:offset(-410),endsOn:offset(-241),termKind:'first'});
   const historical=await api<{yearId:string}>('system_admin','/api/v1/configuration/historical-calendar',{workingYearId:year.id,expectedWorkingYearVersion:year.version,expectedSettingVersion:setting.version,year:{code:'UAT-EARLIER-YEAR',name:'Synthetic earlier historical year',startsOn:offset(-780),endsOn:offset(-421)},semester:{code:'UAT-EARLIER-SECOND',name:'Synthetic earlier second semester',startsOn:offset(-590),endsOn:offset(-421),termKind:'second'},reason:'Explicit synthetic three-year UAT coverage',reference:'SYNTHETIC-CALENDAR',reviewed:true});
   await historicalSemester({code:'UAT-EARLIER-YEAR',name:'Synthetic earlier historical year',startsOn:offset(-780),endsOn:offset(-421)},{code:'UAT-EARLIER-FIRST',name:'Synthetic earlier first semester',startsOn:offset(-770),endsOn:offset(-600),termKind:'first'});
   metadata.calendarFixtureAnchor=day;
   // Distinct institutions and truthful incomplete profiles outside the 835 payroll.
   const college=await config('schools',{code:'UAT-TECH',name:'Fictional Luntian Institute of Technology'});
   const degree=await config('courses',{code:'UAT-AGRI',name:'Fictional Bachelor of Agricultural Systems'});
   metadata.specialScholars=[];
   for(const [index,name] of ['Sol','Maria Clara de los Angeles','Juan Miguel','Amihan','Liwayway'].entries()) {
    const fields={firstName:'Fictional '+name,lastName:index===0?'Uy':'UAT Del Rio '+index,academicYearId:year.id,contact:{}};
    const [[existing]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM scholars WHERE first_name=? AND last_name=? AND academic_year_id=?',[fields.firstName,fields.lastName,year.id]);
    const p=existing??await api<{id:string}>('staff','/api/v1/scholars',{expectedVersion:0,reason:evidence.reason,fields});
    if(index){const [[academic]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?',[p.id,year.id]);if(!academic)await api('staff',`/api/v1/scholars/${p.id}/academic-records`,{academicYearId:year.id,schoolId:college.id,courseId:degree.id,yearLevel:`${index} year`,...evidence});}
    metadata.specialScholars.push(p.id);
   }
   const fields={firstName:'Fictional Duplicate',lastName:'UAT Santos',academicYearId:year.id,contact:{}};
   const [[duplicateCount]]=await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n FROM scholars WHERE first_name='Fictional Duplicate' AND last_name='UAT Santos'");
   if(!Number(duplicateCount.n))await api<{id:string}>('staff','/api/v1/scholars',{expectedVersion:0,reason:evidence.reason,fields});
   const duplicate=await api<{snapshot:string}>('staff','/api/v1/scholars/duplicate-check',{fields});assert.ok(duplicate.snapshot);
   const denied=await raw('staff','/api/v1/scholars',{expectedVersion:0,reason:evidence.reason,fields});assert.equal(denied.statusCode,409);
   if(Number(duplicateCount.n)<2)await api<{id:string}>('staff','/api/v1/scholars',{expectedVersion:0,reason:evidence.reason,fields,duplicateResolution:{snapshot:duplicate.snapshot,decision:'create_separate',reason:'These are two distinct fictional UAT people reviewed using synthetic evidence'}});
   metadata.duplicateReview={unresolvedRejected:true,reviewedSeparateCreated:true};
   // Keep separate empty draft and pending-approval work without rewriting publication.
   metadata.masterlistStates=[];
   for(const [title] of [['Synthetic UAT draft','draft'],['Synthetic UAT pending approval','pending']]) {
    const [[existing]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM masterlist_versions WHERE title=? AND academic_year_id=?',[title,historical.yearId]);
    const m=existing??await api<{id:string}>('staff','/api/v1/masterlists',{academicYearId:historical.yearId,title,...evidence});metadata.masterlistStates.push({id:m.id,state:'draft'});
    // Empty lists cannot be submitted: leave truthful draft instead of bypassing validation.
   }
   // Fresh-source reads, search, page and authorization checks; cache never bypassed.
   metadata.state='populated';await save(manifestPath,metadata);
   for(let i=0;i<3;i++) {
    await measure('registry',()=>api('staff','/api/v1/scholars?limit=25&scope=all'));
    await measure('scholar_search',()=>api('staff','/api/v1/scholars?q=ReceiptVolume0042&limit=25'));
    await measure('payment_recording_summary',summary);
    await measure('payment_recording_page',()=>api('staff',base+'/payment-roster?limit=25'));
    await measure('individual_queue',()=>api('staff','/api/v1/individual-payments/queue?limit=25'));
    await measure('reconciliation',reconciliation);
   }
   await measure('dashboard',()=>api('staff','/api/v1/dashboard?cycleId='+metadata.cycleId));
   metadata.authorization=[];
   for(const [role,url] of [['system_admin',base+'/payment-summary'],['system_admin','/api/v1/individual-payments/queue?limit=25'],['system_admin',base+'/financial-report']]) {
    const response=await raw(role,url);assert.equal(response.statusCode,403);metadata.authorization.push({role,url,status:response.statusCode});
   }
  } else {
   // The existing main-payroll fixture has two frozen members plus one truly eligible omission.
   const [[source]]=await c.admin.query<RowDataPacket[]>("SELECT b.id,b.cycle_id,c.semester_id FROM ovr_batches b JOIN payout_cycles c ON c.id=b.cycle_id JOIN ovr_finalizations f ON f.batch_id=b.id WHERE f.entry_count=2 ORDER BY b.created_at DESC LIMIT 1");
   assert.ok(source);metadata.batchId=source.id;metadata.cycleId=source.cycle_id;
   const queue=await api<Awaited<ReturnType<import('../server/payments/omission-service.js').OmissionPaymentService['page']>>>('staff',`/api/v1/individual-payments/omissions?sourceBatchId=${source.id}&limit=100`);
   const row=queue.items.find(r=>r.state==='unrecorded'||!r.omissionId);assert.ok(row,JSON.stringify(queue));
   const base='/api/v1/individual-payments/omissions';
   const recorded=await api<{omissionId?:string;id?:string}>('staff',base+'/commands',{action:'record',sourceBatchId:source.id,scholarshipId:row.scholarshipId,expectedRevision:0,reason:'Synthetic source investigation supports this omission'});
   const id=recorded.omissionId??recorded.id;assert.ok(id,JSON.stringify(recorded));metadata.omissionId=id;
   const detail=()=>api<OmissionDetail>('staff',base+'/'+id);
   const command=async(action:string,role='staff',extra:object={})=>{const d=await detail();return api(role,base+'/commands',{action,sourceBatchId:source.id,scholarshipId:row.scholarshipId,omissionId:id,expectedRevision:d.revision,expectedSourceHash:d.sourceHash,reason:'Synthetic Coordinator-reviewed omitted stipend case',...extra});};
   const [destinations]=await c.admin.query<RowDataPacket[]>("SELECT b.id FROM ovr_batches b WHERE b.cycle_id=? AND b.id<>? ORDER BY created_at",[source.cycle_id,source.id]);
   assert.ok(destinations.length);await command('add-to-payroll','staff',{destinationBatchId:destinations[0].id});
   const prep=await api<{revision:number;cycleVersion:number}>('staff',`/api/v1/payout-cycles/${source.cycle_id}/preparation`);
   await api('coordinator',`/api/v1/payout-cycles/${source.cycle_id}/preparation`,{state:'closed',expectedRevision:prep.revision,expectedCycleVersion:prep.cycleVersion,reason:'Synthetic closure after outstanding omission review'});
   await command('request');assert.equal((await raw('staff',base+'/commands',{action:'approve',sourceBatchId:source.id,scholarshipId:row.scholarshipId,omissionId:id,expectedRevision:(await detail()).revision,expectedSourceHash:(await detail()).sourceHash,reason:'Staff must not authorize'})).statusCode,403);
   await command('approve','coordinator');await command('prepare');let d=await detail();await generateDocuments(d.transactionId!,'omitted');await forward(d.transactionId!);
   await command('request-cancellation');await command('approve-cancellation','coordinator',{externalUnpaidConfirmed:true});
   await command('request');await command('approve','coordinator');await command('prepare');d=await detail();await generateDocuments(d.transactionId!,'omitted');await forward(d.transactionId!);await release([d.transactionId]);
   metadata.omission=await detail();metadata.individualTransactions=[d.transactionId];
   const report=await api<ReportPage&{settlementTotals:import('../server/payments/report-model.js').SettlementTotals}>('staff',`/api/v1/ovr-batches/${source.id}/financial-report?basis=settlement`);assert.ok(report.items.some(r=>!r.member&&r.laterStatus==='Paid via OR + DV'));assert.equal(report.settlementTotals.conflicts,0);
   for(const format of ['xlsx','pdf']) {const r=await ok('staff',`/api/v1/ovr-batches/${source.id}/reconciliation/exports`,{basis:'settlement',outcome:'all',sourceHash:report.sourceHash,format});await writeFile(`${folder}/exports/F-omitted-settlement.${format}`,r.rawPayload);}
  }
  metadata.state='ready';metadata.completedAt=new Date().toISOString();metadata.syntheticOnly=true;
  await save(manifestPath,metadata);
  await save(`${folder}/actions-${c.scenario}.json`,actions);
  await save(`${folder}/metrics-${c.scenario}.json`,{at:new Date().toISOString(),database:c.database,conditions:'Unchanged accepted application, restricted runtime pool, local injected HTTP including authentication, instrumented connection SQL round trips; three read observations and single writes; 20 ms sampled RSS may miss synchronous peaks. Synthetic names and additional profiles differ from P10, so timings are contextual, not paired regression claims.',metrics});
  console.log(JSON.stringify({scenario:c.scenario,database:c.database,state:'ready',batchId:metadata.batchId,recording:metadata.recording,actions:actions.length,measurements:metrics.length}));
 } finally {c.runtime.getConnection=originalGet;}
}
