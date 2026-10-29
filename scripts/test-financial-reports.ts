import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import ExcelJS from 'exceljs';
import {AuthorizationService} from '../server/authorization/service.js';
import {FinancialReportService} from '../server/payments/report-service.js';
import {reconciliationExcel,reconciliationPdf,financialCells} from '../server/payments/report-export.js';
import {PayrollReconciliationService} from '../server/payments/reconciliation-service.js';
import {reportCents,type ReportPage} from '../server/payments/report-model.js';
import type {RecordingRow} from '../server/payments/recording-model.js';
import type {ClosureMember} from '../server/payments/reconciliation-model.js';
const folder=process.env.LDSS_TEST_REPORT_OUTPUT??'output/p08-reports-20261023';
type Context={runtime:Pool;admin:Pick<Pool,'query'|'execute'>;request:(role:string,path:string,body?:object,key?:string)=>Promise<LightMyRequestResponse>;batch:string;total:number;transactionId?:string};
export async function testFinancialReports(c:Context,stage:string,change?:()=>Promise<unknown>){
 const [[owned]]=await c.admin.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(owned.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 await mkdir(folder,{recursive:true});const base=`/api/v1/ovr-batches/${c.batch}`,ok=async(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,800));return r;};
 const [[staff]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
 let selects=0,sqlMs=0,connectionNumber=0,reorderFinancial=false;const rawGet=c.runtime.getConnection.bind(c.runtime),runs:object[]=[],diagnostic:object[]=[];
 c.runtime.getConnection=async()=>{const connection=await rawGet(),number=++connectionNumber;return new Proxy(connection,{get(db,method){if(method!=='execute'&&method!=='query'){const value=Reflect.get(db,method);return typeof value==='function'?value.bind(db):value;}return async(sql:string,values?:unknown[])=>{const start=performance.now(),result=await (db[method].bind(db) as (sql:string,values?:unknown[])=>Promise<unknown>)(sql,values);if(/^\s*SELECT/i.test(sql)){selects++;sqlMs+=performance.now()-start;if(process.argv.includes('--report-source-debug')){const rows=(result as [unknown[],unknown])[0],encoded=rows.map(r=>JSON.stringify(r)),hash=(s:string)=>createHash('sha256').update(s).digest('hex');diagnostic.push({connection:number,sql,rows:rows.length,ordered:hash(JSON.stringify(encoded)),unordered:hash(JSON.stringify([...encoded].sort())),rowHashes:encoded.map(hash)});}}if(reorderFinancial&&sql.startsWith('SELECT scholarship_id,scholar_id,amount_centavos,')){const [rows,fields]=result as [unknown[],unknown];return [[...rows].reverse(),fields];}return result;};}});};
 async function measure<T>(operation:string,run:()=>Promise<T>){global.gc?.();selects=0;sqlMs=0;const before=process.memoryUsage(),start=performance.now();const result=await run();runs.push({operation,ms:performance.now()-start,selects,sqlMs,bytes:result&&typeof result==='object'&&'rawPayload'in result?(result.rawPayload as Buffer).length:Buffer.byteLength(JSON.stringify(result)),before,after:process.memoryUsage()});return result;}
 const defaultBasis=stage.startsWith('omitted')?'settlement':'auto';
 const read=async(basis=defaultBasis,outcome='all',offset=0)=>(await ok(c.request('staff',`${base}/financial-report?basis=${basis}&outcome=${outcome}&offset=${offset}&limit=25`))).json<ReportPage>();
 const inventory=async()=>{const result=[];for(const name of ['payment_records','payment_corrections','semester_entitlements','semester_entitlement_events','payroll_allocations','ovr_finalizations','payroll_closure_members','payroll_reconciliation_events','individual_payment_transactions','individual_payment_events','entitlement_payment_routes']){const [rows]=await c.admin.query<RowDataPacket[]>(`SELECT * FROM ${name}`);result.push({name,hash:createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex')});}return result;};
 const before=await inventory();
 try{
  assert.equal((await c.request('system_admin',base+'/financial-report')).statusCode,403);
  assert.equal((await c.request('system_admin','/api/v1/reports/payrolls')).statusCode,403);
  await ok(measure('open_reports',()=>c.request('staff','/api/v1/reports/payrolls?limit=25')));
  let page=await read();const [[frozen]]=await c.admin.query<RowDataPacket[]>('SELECT entry_count FROM ovr_finalizations WHERE batch_id=?',[c.batch]);assert.ok(page.total>0);assert.equal(page.payrollTotals.count,Number(frozen.entry_count));assert.ok(page.items.every(r=>r.amountCentavos===500000));
  if(stage.startsWith('omitted')){assert.equal(page.basis,'settlement');assert.ok(page.items.some(r=>!r.member&&r.payrollOutcome==='omitted'&&r.laterStatus==='Paid via OR + DV'));}
  const legacy=new PayrollReconciliationService(new AuthorizationService(c.runtime));
  let comparedBasis='provisional';
  for(let i=0;i<3;i++){const previous=await measure('existing_p03_summary',()=>legacy.summary(staff.id,c.batch));const oldBasis=page.basis==='updated'&&!previous.updatedAvailable?'original':page.basis==='settlement'?(previous.summary.state==='closed'?'original':'provisional'):page.basis;comparedBasis=oldBasis;const previousPage=await measure('existing_p03_page_'+oldBasis,()=>legacy.page(staff.id,c.batch,{basis:oldBasis,limit:25,offset:0}));for(const [key,oldKey] of [['approvedCentavos','totalAmount'],['paidCentavos','paidAmount'],['unclaimedCentavos','unclaimedAmount'],['pendingCentavos','pendingAmount'],['reviewCentavos','needsReviewAmount']] as const)assert.equal(page.payrollTotals[key],reportCents(previousPage.summary[oldKey]),`P08 ${key} must match the accepted P03 source`);await ok(measure('summary_and_preview',()=>c.request('staff',base+`/financial-report?basis=${page.basis}&limit=25`)));await ok(measure('filter_unclaimed',()=>c.request('staff',base+`/financial-report?basis=${page.basis}&outcome=unclaimed&limit=25`)));}
  const all=[];for(let offset=0;offset<page.total;offset+=100){const p=(await ok(measure('page',()=>c.request('staff',base+`/financial-report?basis=${page.basis}&offset=${offset}&limit=100`)))).json<ReportPage>();all.push(...p.items);assert.equal(p.sourceHash,page.sourceHash);}
  assert.equal(all.length,page.total);assert.equal(new Set(all.map(r=>r.key)).size,all.length);
  if(page.basis!=='settlement'){const previousRows:(RecordingRow|ClosureMember)[]=[];for(let offset=0;offset<page.payrollTotals.count;offset+=100)previousRows.push(...(await legacy.page(staff.id,c.batch,{basis:comparedBasis,limit:100,offset})).items);assert.equal(previousRows.length,all.length);for(const current of all){const prior=previousRows.find(r=>r.scholarshipId===current.scholarshipId);assert.ok(prior);assert.equal(current.payrollOutcome,prior.outcome);assert.equal(current.amountCentavos,reportCents(prior.amount));assert.equal(current.payrollPaidOn,prior.outcome==='paid'?prior.actualPaidOn:null);}}
  if(stage==='unclaimed-settled'){assert.ok(all.some(r=>r.payrollOutcome==='unclaimed'&&r.laterStatus==='Paid via DV'));assert.equal(page.settlementTotals!.conflicts,0);assert.equal(page.settlementTotals!.entitlements,Number(frozen.entry_count));}
  if(stage==='unclaimed-settled'&&c.total===835){assert.equal(page.payrollTotals.paidCentavos,825*500000);assert.equal(page.payrollTotals.unclaimedCentavos,10*500000);assert.equal(page.settlementTotals!.paidEntitlements,835);assert.equal(page.settlementTotals!.paidCentavos,835*500000);assert.equal(page.settlementTotals!.outstandingCentavos,0);assert.equal(all.reduce((n,r)=>n+r.laterPaidCentavos,0),10*500000);}
  if(c.transactionId){const live=(await ok(c.request('staff',`/api/v1/individual-payments/settlement/transactions/${c.transactionId}`))).json();assert.ok(live.settlement);const current=all.find(r=>r.entitlementId===live.settlement.entitlementId);assert.ok(current);assert.equal(current.laterPaidOn,live.settlement.outcome==='paid'?live.settlement.effectiveOn:null);assert.equal(current.laterPaidCentavos,reportCents(live.settlement.amount));}
  if(stage==='review')assert.ok(all.some(r=>r.payrollOutcome==='needs_review'));if(stage==='pending')assert.ok(all.every(r=>r.payrollOutcome==='pending'));
  if(stage==='original'){
   const [[academic]]=await c.admin.query<RowDataPacket[]>('SELECT a.id,a.school_name FROM academic_records a JOIN scholarship_records r ON r.scholar_id=a.scholar_id WHERE r.id=? LIMIT 1',[all[0].scholarshipId]);
   assert.ok(academic);try{await c.admin.execute("UPDATE academic_records SET school_name='P08 synthetic current school differs from frozen placement' WHERE id=?",[academic.id]);const historical=await read('original');assert.equal(historical.sourceHash,page.sourceHash);assert.deepEqual(historical.items,page.items);}finally{await c.admin.execute('UPDATE academic_records SET school_name=? WHERE id=?',[academic.school_name,academic.id]);}
   const [[member]]=await c.admin.query<RowDataPacket[]>("SELECT m.* FROM payroll_closure_members m JOIN payroll_reconciliation_events e ON e.id=m.closure_id WHERE e.batch_id=? AND m.position=1",[c.batch]);
   try{await c.admin.execute('DELETE FROM payroll_closure_members WHERE closure_id=? AND position=1',[member.closure_id]);assert.equal((await c.request('staff',base+'/financial-report?basis=original')).statusCode,409);}finally{await c.admin.query('INSERT INTO payroll_closure_members SET ?',[member]);}
   assert.equal((await read('original')).sourceHash,page.sourceHash);
  }
  if(stage==='original')assert.equal(page.basis,'original');if(stage==='updated')assert.equal(page.basis,'updated');
  const paid=await read(page.basis,'paid'),unclaimed=await read(page.basis,'unclaimed');assert.ok(paid.items.every(r=>page.basis==='settlement'?r.settlement==='Paid':r.payrollOutcome==='paid'));assert.ok(unclaimed.items.every(r=>r.payrollOutcome==='unclaimed'));if(stage.startsWith('omitted'))assert.ok(paid.items.length>0);
  // This query has no ordering contract. Equivalent engine plans must not
  // invalidate a preview or block publication of the same financial evidence.
  reorderFinancial=true;
  try{const reordered=await read(page.basis);assert.equal(reordered.sourceHash,page.sourceHash,'Equivalent unordered SQL rows must retain the same source token');assert.deepEqual(reordered.items,page.items);for(const format of ['xlsx','pdf'])await ok(c.request('staff',base+'/reconciliation/exports',{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format}));}finally{reorderFinancial=false;}
  for(const format of ['xlsx','pdf'] as const){
   const input={basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format};
   assert.equal((await c.request('system_admin',base+'/reconciliation/exports',input)).statusCode,403);
   assert.equal((await c.request('staff',base+'/reconciliation/exports',{...input,sourceHash:'0'.repeat(64)})).statusCode,409);
   const r=await ok(measure('export_'+format,()=>c.request('staff',base+'/reconciliation/exports',input)));
   for(let sample=1;sample<3;sample++)await ok(measure('export_'+format,()=>c.request('staff',base+'/reconciliation/exports',input)));
   assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['x-content-type-options'],'nosniff');assert.match(String(r.headers['content-disposition']),/^attachment;/);
   const bytes=r.rawPayload;await writeFile(`${folder}/${stage}-${c.total}.${format}`,bytes);
   const [[audit]]=await c.admin.query<RowDataPacket[]>('SELECT details FROM audit_logs WHERE id=?',[r.headers['x-export-id']]);const details=typeof audit.details==='string'?JSON.parse(audit.details):audit.details;
   assert.equal(details.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(details.rowCount,all.length);assert.deepEqual(details.payrollTotals,page.payrollTotals);assert.deepEqual(details.settlementTotals,page.settlementTotals);
   if(format==='xlsx'){const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);const cells:string[]=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(cell=>{assert.notEqual(cell.type,ExcelJS.ValueType.Formula);cells.push(String(cell.value??''));})));for(const row of all)for(const field of financialCells(row).filter(Boolean))if(!/^\d[\d,.]*$/.test(field))assert.ok(cells.includes(field)||cells.includes("'"+field),field);}
   else assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  }
  const concurrentExports=await Promise.all(['xlsx','pdf'].map(format=>c.request('staff',base+'/reconciliation/exports',{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format})));for(const r of concurrentExports)assert.equal(r.statusCode,200,r.body.slice(0,200));assert.notEqual(concurrentExports[0].headers['x-export-id'],concurrentExports[1].headers['x-export-id']);
  const coordinatorExport=await ok(c.request('coordinator',base+'/reconciliation/exports',{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format:'xlsx'}));const [[coordinatorAudit]]=await c.admin.query<RowDataPacket[]>("SELECT u.email FROM audit_logs a JOIN users u ON u.id=a.actor_id WHERE a.id=?",[coordinatorExport.headers['x-export-id']]);assert.equal(coordinatorAudit.email,'coordinator@example.invalid');
  const auth=new AuthorizationService(c.runtime),service=new FinancialReportService(auth,async()=>{throw new Error('Synthetic renderer failure');});
  const auditCount=async()=>Number((await c.admin.query<RowDataPacket[]>("SELECT COUNT(*) n FROM audit_logs WHERE event_type='payments.reconciliation_exported'"))[0][0].n),count=await auditCount();
  await assert.rejects(service.export(staff.id,c.batch,{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format:'pdf'},randomUUID()),/Synthetic renderer failure/);assert.equal(await auditCount(),count);
  await c.admin.query("CREATE TRIGGER p08_audit_fail BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='payments.reconciliation_exported' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic P08 audit rollback'; END IF; END");
  try{assert.equal((await c.request('staff',base+'/reconciliation/exports',{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format:'xlsx'})).statusCode,500);}finally{await c.admin.query('DROP TRIGGER p08_audit_fail');}assert.equal(await auditCount(),count);
  assert.deepEqual(await inventory(),before,'Reporting/exporting may not mutate any financial evidence');
  if(stage==='pending'){
   const [[role]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM user_roles WHERE user_id=? AND role_code='staff' AND revoked_at IS NULL LIMIT 1",[staff.id]);
   const revoked=new FinancialReportService(auth,async(report,outcome,format)=>{await c.admin.execute('UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[role.id]);return format==='pdf'?reconciliationPdf(report,outcome):reconciliationExcel(report,outcome);});
   try{await assert.rejects(revoked.export(staff.id,c.batch,{basis:page.basis,outcome:'all',sourceHash:page.sourceHash,format:'pdf'},randomUUID()),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='PERMISSION_DENIED'));}finally{await c.admin.execute('UPDATE user_roles SET revoked_at=NULL WHERE id=?',[role.id]);}assert.equal(await auditCount(),count);
  }
  if(change){page=await read('updated');const original=await read('original'),source=page.sourceHash,concurrent=new FinancialReportService(auth,async(report,outcome,format)=>{await change();return format==='pdf'?reconciliationPdf(report,outcome):reconciliationExcel(report,outcome);});await assert.rejects(measure('correction_during_export',()=>concurrent.export(staff.id,c.batch,{basis:'updated',outcome:'all',sourceHash:source,format:'pdf'},randomUUID())),e=>Boolean(e&&typeof e==='object'&&'code'in e&&e.code==='REPORT_CHANGED'));assert.equal(await auditCount(),count);assert.notEqual((await read('updated')).sourceHash,source);const again=await read('original');assert.equal(again.sourceHash,original.sourceHash);assert.deepEqual(again.items,original.items);assert.deepEqual(again.payrollTotals,original.payrollTotals);}
  const pool=(c.runtime as unknown as {pool:{_allConnections:{length:number};_freeConnections:{length:number};_connectionQueue:{length:number}}}).pool;assert.equal(pool._allConnections.length,pool._freeConnections.length);assert.equal(pool._connectionQueue.length,0);
  const memory=[];for(let i=0;i<20;i++){await read(page.basis);global.gc?.();assert.equal(pool._allConnections.length,pool._freeConnections.length);assert.equal(pool._connectionQueue.length,0);memory.push({iteration:i+1,...process.memoryUsage(),connections:pool._allConnections.length});}
  await writeFile(`${folder}/${stage}-${c.total}-metrics.json`,JSON.stringify({at:new Date().toISOString(),stage,fixtureScholars:c.total,payrollMembers:Number(frozen.entry_count),runs,memory,financialPreserved:true,all,payrollTotals:page.payrollTotals,settlementTotals:page.settlementTotals,pool:pool._allConnections.length},null,2));
  console.log(`PASS P08 ${stage}/${c.total}: actual API, XLSX/PDF, exact rows/totals, protected financial inventory, authorization, stale source, renderer failure and audit rollback`);
 }finally{c.runtime.getConnection=rawGet;if(process.argv.includes('--report-source-debug'))await writeFile(`${folder}/${stage}-${c.total}-source-debug.json`,JSON.stringify(diagnostic,null,2));}
}
