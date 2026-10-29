import type {RowDataPacket} from 'mysql2/promise';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {session} from './uat-session.js';
import {populateUat} from './uat-scenarios.js';
import {testDocumentBatches} from './uat-document-batches.js';
import {testPriorBatchApproval} from './test-prior-batch-scenarios.js';
import {resumePriorBatch} from './uat-prior-batch.js';
import {SIMPLE_COLUMNS} from '../server/imports/model.js';
import {today} from '../server/scholars/validation.js';
const scenario=process.argv[2],c=await session(scenario);
try {
 if(process.argv.includes('--finish-prior-volume')) {
  const [[semester]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM semesters WHERE code='IMPORT-CURRENT'");
  const [[job]]=await c.admin.query<RowDataPacket[]>("SELECT j.id FROM import_jobs j JOIN import_confirmations f ON f.job_id=j.id WHERE JSON_LENGTH(f.result,'$.items')=835");
  process.argv.push('--payment-recording-large','--payment-recording-browser');
  await resumePriorBatch(c.request,c.admin,job.id,semester.id,today(),c.runtime);
 }
 if(process.argv.includes('--recover-reviewed-volume')) {
  const [[semester]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM semesters WHERE code='IMPORT-CURRENT'");
  const path='/api/v1/continuing-rosters/00000000-0000-4000-8000-000000000001/semester-setup';
  const options=(await c.request('coordinator',path+'?semesterId='+semester.id)).json<import('../server/continuing/semester-setup.js').SemesterSetupOptions>();
  const [[scope]]=await c.admin.query<RowDataPacket[]>("SELECT w.*,s.version semester_version,p.version predecessor_version FROM workflow_scope_versions w JOIN semesters s ON s.id=w.semester_id JOIN workflow_policy_versions v ON v.id=w.policy_version_id JOIN semesters p ON p.id=JSON_UNQUOTE(JSON_EXTRACT(v.rules,'$.predecessorSemesterId')) WHERE w.semester_id=? ORDER BY w.revision DESC LIMIT 1",[semester.id]);
  const [[owners]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM scholar_semesters WHERE semester_id=?',[semester.id]);
  const r=await c.request('coordinator',path+'/recover',{scopeId:scope.id,expectedRevision:scope.revision,mode:'enabled',expectedSemesterVersion:scope.semester_version,expectedPredecessorVersion:scope.predecessor_version,expectedRecordCount:Number(owners.n),expectedCoverageHash:options.coverage!.sourceHash,reason:'Resume owned synthetic fixture after missing recovery hash',reviewed:true});assert.equal(r.statusCode,200,r.body);
  const [[job]]=await c.admin.query<RowDataPacket[]>("SELECT j.id FROM import_jobs j JOIN import_confirmations f ON f.job_id=j.id WHERE JSON_LENGTH(f.result,'$.items')=835");
  await testDocumentBatches(c.request,c.admin,job.id,semester.id,today(),835);
  process.argv.push('--payment-recording-large','--payment-recording-browser');
  await testPriorBatchApproval(c.request,c.admin,job.id,semester.id,today(),c.runtime);
 }
 if(process.argv.includes('--seed-unconfirmed-volume')) {
  assert.equal(scenario,'A');
  const [[counts]]=await c.admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM scholars');assert.ok(counts.n<30,'Never repeat a populated import');
  const [[semester]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM semesters WHERE code='IMPORT-CURRENT'");
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('Synthetic Scholars');s.addRow([...SIMPLE_COLUMNS]);
  for(let i=0;i<835;i++)s.addRow([`ReceiptVolume${String(i).padStart(4,'0')} ${i%7===0?'de la Estrella del Horizonte':'Luntian'}`,`Fictional ${['Amihan','Liwayway','Sol','Maria Clara','Juan Miguel'][i%5]} ${Array.from(String(i).padStart(3,'0'),d=>['ba','de','fi','go','lu','ma','ni','po','ra','se'][Number(d)].repeat(2)).join('')}`,'','','SIMPLE-SCHOOL',i===0?1:2,i%2?'Old':'New',i<380?'':'Import course']);
  const ok=async<T=unknown>(p:Promise<import('fastify').LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body.slice(0,800));return r.json<T>();};
  const preview=await ok<import('../server/imports/model.js').ImportPreview>(c.request('coordinator','/api/v1/imports/stage',{fileName:'synthetic-835.xlsx',base64:Buffer.from(await w.xlsx.writeBuffer()).toString('base64'),approvedSelection:{reference:'Synthetic approved roster; no LAN identities',effectiveOn:today()},receipts:{periodId:semester.id,cor:true,cog:true}}));assert.equal(preview.ready,true,JSON.stringify(preview.rows.filter(r=>r.errors.length||r.warnings.length).slice(0,1)));
  await ok(c.request('coordinator',`/api/v1/imports/${preview.id}/confirm`,{hash:preview.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true}));
  await testDocumentBatches(c.request,c.admin,preview.id,semester.id,today(),835);
  process.argv.push('--payment-recording-large','--payment-recording-browser');
  await testPriorBatchApproval(c.request,c.admin,preview.id,semester.id,today(),c.runtime);
 }
 await populateUat({...c,admin:c.admin});
} finally {await c.close();}
