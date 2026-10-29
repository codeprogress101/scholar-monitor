import type {RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import type {TwoBatchManifest,FixtureBatch} from './uat-types.js';
import type {ImportPreview,ImportResult} from '../server/imports/model.js';
import type {PriorBatchPreview} from '../server/requirements/prior-approval-service.js';
import type {ConfigFields,ConfigRecord} from '../server/configuration/model.js';
import type {OvrDetail,OvrBatch,OvrFinalization} from '../server/ovr/model.js';
import type {RecordingSummary,RecordingPreview} from '../server/payments/recording-model.js';
import type {SemesterSetupOptions} from '../server/continuing/semester-setup.js';
import type {SemesterComplianceView} from '../server/continuing/semester-compliance.js';
type PreservedTable={name:string;count:number;sha256:string;ddl:string};
type Preservation={at:string;files:{file:string;sha256:string}[];schemas:{name:string;data:PreservedTable[]}[];allSchemas:RowDataPacket[];accounts:RowDataPacket[];privileges:Record<string,string[]>;result?:Record<string,unknown>};
// Separate localhost fixture. All business writes use existing application commands.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import {localAdmin,applyMigrations,grantAuthRuntime} from './migration-lib.mjs';
import {AuthService} from '../server/auth/service.js';
import {AuthorizationService} from '../server/authorization/service.js';
import {buildApp} from '../server/app.js';
import {loadConfig} from '../server/config.js';
import {today} from '../server/scholars/validation.js';
import {parseScholarInput} from '../server/scholars/validation.js';
import {SIMPLE_COLUMNS} from '../server/imports/model.js';
import {decodeStoredJson} from '../server/stored-json.js';

export const folder='output/localhost-two-batch-20261024';
const manifest=folder+'/T.json',privateFolder=folder+'/private';
const hash=(v:import('node:crypto').BinaryLike)=>createHash('sha256').update(v).digest('hex');
const json=async<T=unknown>(p:string):Promise<T>=>JSON.parse(await readFile(p,'utf8'));
const save=async(p:string,v:unknown)=>writeFile(p,JSON.stringify(v,null,2)+'\n');
const ident=(s:string)=>{assert.match(s,/^[a-zA-Z0-9_]+$/);return '`'+s+'`';};
const flags={INDIVIDUAL_PAYMENTS_ENABLED:'false',OMITTED_PAYMENTS_ENABLED:'false',INDIVIDUAL_DOCUMENTS_ENABLED:'false',INDIVIDUAL_SETTLEMENT_ENABLED:'false'};
async function protect(){
 await mkdir(privateFolder,{recursive:true});
 const sid=execFileSync('powershell.exe',['-NoProfile','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8',windowsHide:true}).trim();assert.match(sid,/^S-1-[\d-]+$/);
 execFileSync('icacls.exe',[resolve(privateFolder),'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
}
async function owned(){
 const m=await json<TwoBatchManifest>(manifest);assert.match(m.database,/^ldss_twobatch_test_\d+_[a-f\d]{8}$/);assert.equal(m.runtimeUser,m.database.replace('ldss_twobatch_test_','ldss_two_'));assert.notEqual(m.database,process.env.DB_NAME);
 const db=await localAdmin();try{await db.changeUser({database:m.database});const [rows]=await db.query<RowDataPacket[]>('SELECT * FROM _ldss_uat_owner');assert.equal(rows.length,1);assert.equal(rows[0].id,m.ownerId);assert.equal(rows[0].token_hash,hash(m.ownerToken));assert.equal(rows[0].purpose,'LDSS synthetic 800+200 localhost');return {db,m};}catch(e){await db.end();throw e;}
}
async function open(){
 const {db,m}=await owned();await db.end();const secrets=await json<{runtimePassword:string;accountPassword:string}>(privateFolder+'/credentials.json');
 const config={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:m.database,timezone:'Z' as const};
 const admin=mysql.createPool({...config,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',connectionLimit:4});
 const runtime=mysql.createPool({...config,user:m.runtimeUser,password:secrets.runtimePassword,connectionLimit:8});
 const origin='http://127.0.0.1:3009';
 const app=buildApp(loadConfig({APP_ENV:'test',PORT:'3009',APP_ORIGIN:origin,...flags}),{database:{pool:runtime,check:async()=>{await runtime.query('SELECT 1');return 'connected';},close:async()=>{}}});
 const accounts=new Map<string,{cookie:string;csrf:string}>();
 for(const role of ['staff','coordinator','system_admin','unassigned']){
  const r=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin,'content-type':'application/json'},payload:{email:role+'@example.invalid',password:secrets.accountPassword}});assert.equal(r.statusCode,200,r.body);accounts.set(role,{cookie:String(r.headers['set-cookie']).split(';')[0],csrf:r.json().csrfToken});
 }
 const request=(role:string,url:string,body?:object,key:string=randomUUID())=>{const a=accounts.get(role)!;return app.inject({method:body?'POST':'GET',url,headers:{origin,cookie:a.cookie,...(body?{'content-type':'application/json','x-csrf-token':a.csrf,'idempotency-key':key}:{})},...(body?{payload:body}:{})});};
 const ok=async<T=unknown>(p:Promise<LightMyRequestResponse>)=>{const r=await p;assert.equal(r.statusCode,200,r.body);return r.json<T>();};
 return {m,admin,runtime,app,request,ok,close:async()=>{await app.close();await runtime.end();await admin.end();}};
}

async function preserve(mode:string){
 assert.ok(['before','after'].includes(mode));await mkdir(folder,{recursive:true});
 const gate=await json<Record<'sourceFiles'|'artifacts'|'migrations',{file:string;sha256:string}[]>>('output/p10-integration-20261023/uat-r1/F36-report.json');const files=[];
 for(const e of [...gate.sourceFiles,...gate.artifacts,...gate.migrations]){const sha256=hash(await readFile(e.file));assert.equal(sha256,e.sha256,e.file);files.push({file:e.file,sha256});}
 files.push({file:'.env',sha256:hash(await readFile('.env'))});
 // Retain the preceding six fixtures and their helper/document files too.
 const priorFiles=(await (await import('node:fs/promises')).readdir('scripts')).filter(f=>f.startsWith('uat-')&&f!=='uat-two-batch.ts');
 for(const file of [...priorFiles.map(f=>'scripts/'+f),...['LDSS_LAN_ROSTER_IMPORT_PLAN.md','LDSS_POPULATED_UAT_ENVIRONMENT.md','LDSS_UAT_DATASET_VERIFICATION.md'].map(f=>'docs/testing/'+f)])files.push({file,sha256:hash(await readFile(file))});
 const db=await localAdmin();const schemas=[];
 try{
  const targets=[process.env.DB_NAME!,...(await Promise.all(['A','B','C','D','E','F'].map(s=>json<{database:string}>(`output/populated-uat-20261024/${s}.json`)))).map(m=>m.database)];
  for(const name of targets){
   assert.match(name,/^(ldss_scholar_monitor_dev|ldss_(import|f19)_test_\d+_[a-f\d]{8})$/);await db.changeUser({database:name});await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
   const [tables]=await db.query<RowDataPacket[]>("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");const data=[];
   for(const t of tables){const [rows]=await db.query<RowDataPacket[]>('SELECT * FROM '+ident(t.name));data.push({name:t.name,count:rows.length,sha256:hash(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())),ddl:hash(JSON.stringify((await db.query('SHOW CREATE TABLE '+ident(t.name)))[0]))});}
   await db.commit();schemas.push({name,data});
  }
  const [allSchemas]=await db.query<RowDataPacket[]>('SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME');const [accounts]=await db.query<RowDataPacket[]>("SELECT User name,Host host FROM mysql.user WHERE User LIKE 'ldss%' ORDER BY User,Host");
  const privileges:Record<string,string[]>={};for(const table of ['USER_PRIVILEGES','SCHEMA_PRIVILEGES','TABLE_PRIVILEGES','COLUMN_PRIVILEGES']){const [rows]=await db.query<RowDataPacket[]>(`SELECT * FROM information_schema.${table} WHERE GRANTEE LIKE "'ldss%"`);privileges[table]=rows.map(r=>JSON.stringify(r)).sort();}
  const out:Preservation={at:new Date().toISOString(),files,schemas,allSchemas,accounts,privileges};
  if(mode==='after'){
   const before=await json<Preservation>(folder+'/preservation-before.json'),m=await json<TwoBatchManifest>(manifest);assert.deepEqual(files,before.files);const differences=[];
   for(const s of schemas){const b=before.schemas.find(x=>x.name===s.name);assert.ok(b);assert.deepEqual(s.data.map(t=>({name:t.name,ddl:t.ddl,count:t.count})),b.data.map(t=>({name:t.name,ddl:t.ddl,count:t.count})));for(const t of s.data)if(t.sha256!==b.data.find(p=>p.name===t.name)!.sha256)differences.push({schema:s.name,table:t.name});}
   assert.ok(differences.every(d=>d.table==='auth_sessions'),'Unexpected existing business/evidence change');
   assert.deepEqual(allSchemas.map(s=>s.name).sort(),[...before.allSchemas.map(s=>s.name),m.database].sort());
   assert.deepEqual(accounts.map(r=>JSON.stringify(r)).sort(),[...before.accounts,{name:m.runtimeUser,host:'localhost'}].map(r=>JSON.stringify(r)).sort());
   const originals=new Set(before.accounts.map(a=>`'${a.name}'@'${a.host}'`));for(const table of Object.keys(privileges))assert.deepEqual(privileges[table].filter((r:string)=>originals.has(JSON.parse(r).GRANTEE)),before.privileges[table]);
   out.result={existingSchemas:7,businessAndEvidenceExact:true,existingDefinitionsAndCountsExact:true,authenticationDifferences:differences,acceptedInputs:1006,environmentAndPriorHelperFilesExact:true,onlyOneOwnedSchemaAndRuntimeAdded:true,originalGrantsExact:true};console.log(JSON.stringify(out.result));
  }else console.log(JSON.stringify({preservedSchemas:schemas.map(s=>s.name),files:files.length}));
  await save(`${folder}/preservation-${mode}.json`,out);
 }finally{await db.rollback();await db.end();}
}

async function create(){
 await protect();try{await readFile(manifest);throw new Error('Existing two-batch manifest: refuse overwrite/reset');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 await readFile(folder+'/preservation-before.json');
 const suffix=process.pid+'_'+randomBytes(4).toString('hex'),database='ldss_twobatch_test_'+suffix,runtimeUser='ldss_two_'+suffix;
 const secrets={runtimePassword:'Uat-'+randomBytes(32).toString('base64url'),accountPassword:'Uat-'+randomBytes(32).toString('base64url')};
 const m={database,runtimeUser,ownerId:randomUUID(),ownerToken:randomBytes(32).toString('hex'),state:'allocated',synthetic:true,createdAt:new Date().toISOString()};await save(manifest,m);await save(privateFolder+'/credentials.json',secrets);
 const db=await localAdmin();try{
  await db.query('CREATE DATABASE '+ident(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await db.changeUser({database});
  await db.query('CREATE TABLE _ldss_uat_owner(id CHAR(36) PRIMARY KEY,purpose VARCHAR(100) NOT NULL,token_hash CHAR(64) NOT NULL,created_at DATETIME(6) NOT NULL) ENGINE=InnoDB');await db.execute('INSERT INTO _ldss_uat_owner VALUES (?,?,?,UTC_TIMESTAMP(6))',[m.ownerId,'LDSS synthetic 800+200 localhost',hash(m.ownerToken)]);
  assert.equal((await applyMigrations(db)).length,62);await db.query('CREATE USER '+db.escape(runtimeUser)+"@'localhost' IDENTIFIED BY "+db.escape(secrets.runtimePassword));await grantAuthRuntime(db,database,runtimeUser);
  const pool=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'});
  try{const auth=new AuthService(pool),roles=new AuthorizationService(pool);for(const role of ['staff','coordinator','system_admin','unassigned'] as const){const email=role+'@example.invalid';await auth.createAccount('Synthetic '+role,email,'two-batch-test');const token=await auth.issueReset(email,'two-batch-test','Synthetic localhost activation');await auth.resetPassword(token,secrets.accountPassword,'127.0.0.1',randomUUID());if(role!=='unassigned')await roles.setRoles({email,roles:[role],expectedVersion:2,requestId:randomUUID(),operator:'two-batch-test',reason:'Isolated synthetic localhost role'});}}finally{await pool.end();}
  m.state='initializing';await save(manifest,m);
 }finally{await db.end();}
 await populate();
}

async function populate(){
 const c=await open();const {m,admin,request,ok}=c;
 try{
  const day=today(),offset=(n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  const evidence={reason:'Synthetic reviewed localhost historical payroll preparation',reference:'SYNTHETIC-800-200'};
  const config=(kind:string,fields:ConfigFields)=>ok<ConfigRecord>(request('system_admin','/api/v1/configuration/'+kind,{action:'create',expectedVersion:0,reason:evidence.reason,fields}));
  const year=await config('academic-years',{code:'TWO-BATCH-YEAR',name:'Synthetic two-batch academic year',startsOn:offset(-60),endsOn:offset(300)});
  await config('settings',{code:'LDSS_WORKING_ACADEMIC_YEAR',name:'Working year',valueType:'text',value:year.id});
  await config('schools',{code:'TWO-SCHOOL',name:'Fictional Luntian College'});await config('courses',{code:'TWO-COURSE',name:'Fictional degree program'});
  const semester=await config('semesters',{code:'TWO-FIRST',name:'Synthetic two-batch first semester',academicYearId:year.id,startsOn:offset(-20),endsOn:offset(120),termKind:'first'});
  const [[setting]]=await admin.query<RowDataPacket[]>("SELECT version FROM system_settings WHERE code='LDSS_WORKING_ACADEMIC_YEAR'");
  const previous=await ok<{semesterId:string}>(request('system_admin','/api/v1/configuration/historical-calendar',{workingYearId:year.id,expectedWorkingYearVersion:year.version,expectedSettingVersion:setting.version,year:{code:'TWO-PRIOR-YEAR',name:'Synthetic prior completed year',startsOn:offset(-420),endsOn:offset(-61)},semester:{code:'TWO-PRIOR-SECOND',name:'Synthetic preceding completed semester',startsOn:offset(-240),endsOn:offset(-61),termKind:'second'},...evidence,reviewed:true}));
  for(const [code,documentKind] of [['TWO-COR','enrollment'],['TWO-COG','grades']])await ok(request('system_admin','/api/v1/requirement-definitions',{action:'create',code,expectedVersion:0,...evidence,fields:{documentKind,name:code,instructions:'Synthetic prior-reviewed fixture evidence only',appliesTo:'semester',semesterId:semester.id,effectiveFrom:offset(-20),effectiveUntil:null}}));
  const setupPath='/api/v1/continuing-rosters/00000000-0000-4000-8000-000000000001/semester-setup';const options=await ok<SemesterSetupOptions>(request('coordinator',setupPath+'?semesterId='+semester.id));
  const setup=await ok<{id:string}>(request('coordinator',setupPath,{semesterId:semester.id,expectedSemesterVersion:semester.version,policyDate:day,predecessorSemesterId:previous.semesterId,expectedCoverageHash:options.coverage!.sourceHash,coverageReason:'Synthetic preceding completed coverage',corDefinitionVersionId:options.definitions.find(d=>d.code==='TWO-COR')!.id,cogDefinitionVersionId:options.definitions.find(d=>d.code==='TWO-COG')!.id,issuer:'Synthetic office fixture',reference:evidence.reference,sourceReference:'Synthetic 800+200 prior-review packets',reviewed:true}));
  await ok(request('coordinator',setupPath+'/availability',{scopeId:setup.id,expectedRevision:1,mode:'enabled',expectedSemesterVersion:semester.version,expectedPredecessorVersion:1,expectedCoverageHash:options.coverage!.sourceHash,reviewed:true}));
  Object.assign(m,{yearId:year.id,semesterId:semester.id,day,batches:[]});await save(manifest,m);
  for(const [index,count] of [800,200].entries()){
   const number=index+1,reference=`SYNTHETIC-PREVIOUSLY-CHECKED-${number}`;
   const rows=Array.from({length:count},(_,i)=>{const n=index*800+i;const syllables=Array.from(String(n).padStart(4,'0'),d=>['ba','de','fi','go','lu','ma','ni','po','ra','se'][Number(d)].repeat(2)).join('');return [`Fictional ${syllables} Luntian`,`Synthetic ${syllables} Amihan`,'','','TWO-SCHOOL',2,'Old',i%4===0?'':'TWO-COURSE'];});
   const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Synthetic selected scholars');sheet.addRow(SIMPLE_COLUMNS);rows.forEach(r=>sheet.addRow(r));const bytes=Buffer.from(await book.xlsx.writeBuffer());await writeFile(`${folder}/synthetic-batch-${number}.xlsx`,bytes);
   // Dates refer to this synthetic packet's current custody, never invented past receipt.
   await save(`${folder}/prior-evidence-${number}.json`,{synthetic:true,notOfficial:true,reference,count,yearId:year.id,semesterId:semester.id,classification:'Already Processed — Requirements Previously Checked',workbookSha256:hash(bytes),originalApprovalOn:null,historicalPhysicalReceiptOn:null,syntheticPacketReceivedOn:day,scope:'Current COR and preceding completed-semester COG; separate prior academic and deadline review attestations',source:'Existing prior-batch UAT scenario pattern; entirely fictional packet',knownProfileFacts:'Fictional school and second-year standing are explicit fixture facts; one quarter of courses remain genuinely unknown',missingFacts:['birth date','address','contact','some courses','grades','original approval date','original physical receipt dates'],paymentOutcomes:'Pending; no releases or payment evidence asserted'});
   const payload={fileName:`synthetic-batch-${number}.xlsx`,base64:bytes.toString('base64'),approvedSelection:{reference,effectiveOn:day},receipts:{periodId:semester.id,cor:true,cog:true,receivedOn:day}};
   assert.equal((await request('staff','/api/v1/imports/stage',payload)).statusCode,403,'Prior approval remains Coordinator controlled');
   const staged=await ok<ImportPreview>(request('coordinator','/api/v1/imports/stage',payload));assert.equal(staged.ready,true,JSON.stringify(staged.rows.filter(r=>r.errors.length||r.warnings.length).slice(0,2)));
   const result=await ok<ImportResult>(request('coordinator',`/api/v1/imports/${staged.id}/confirm`,{hash:staged.hash,confirm:true,coursePendingConfirmed:true,receiptsConfirmed:true}));assert.equal(result.items.length,count);assert.equal(result.receivedCount,count*2);
   const master=await ok<import('../server/masterlists/model.js').Masterlist>(request('staff','/api/v1/masterlists',{academicYearId:year.id,title:`Synthetic official prior payroll ${number}`,...evidence}));
   for(const [j,p] of result.items.entries())await ok(request('staff',`/api/v1/masterlists/${master.id}/entries`,{action:'add',expectedVersion:j+1,scholarId:p.id,awardNumber:null,...evidence}));
   for(const [j,action] of ['submit-verification','submit-approval','approve','publish'].entries())await ok(request(j<2?'staff':'coordinator',`/api/v1/masterlists/${master.id}/${action}`,{expectedVersion:count+1+j,...evidence,...(action==='publish'?{effectiveOn:day}:{})}));
   const path=`/api/v1/document-batches/prior-approval-preview?importId=${staged.id}&semesterId=${semester.id}`;let preview=await ok<PriorBatchPreview>(request('coordinator',path));assert.equal(preview.scholarCount,count);assert.ok(preview.members.every(p=>!p.issues.length),JSON.stringify(preview.members.filter(p=>p.issues.length).slice(0,2)));
   const body={importId:staged.id,semesterId:semester.id,scopeHash:preview.scopeHash,items:preview.members.map(p=>({id:p.id,sourceHash:p.sourceHash})),approvalOn:null,deadlineOn:index===0?offset(-1):day,reference,sourceLocation:`Synthetic packet ${number}: ${folder}/prior-evidence-${number}.json`,reason:evidence.reason,documentsPreviouslyVerified:true,academicEligibilityPreviouslyApproved:true,deadlineCompliancePreviouslyApproved:true,correctMistakenWaivers:false};
   for(const role of ['staff','system_admin'])assert.equal((await request(role,'/api/v1/document-batches/prior-approval',body)).statusCode,403);
   assert.equal((await request('coordinator','/api/v1/document-batches/prior-approval',{...body,documentsPreviouslyVerified:false})).statusCode,422);
   const adoption=await ok(request('coordinator','/api/v1/document-batches/prior-approval',body));preview=await ok<PriorBatchPreview>(request('coordinator',path));assert.equal(preview.members.filter(p=>p.approval?.valid).length,count);
   const item:FixtureBatch={number,count,classification:'Already Processed — Requirements Previously Checked',importId:staged.id,masterlistId:master.id,priorApproval:adoption,reference,scholarIds:result.items.map(p=>p.id)};m.batches.push(item);await save(manifest,m);
   if(index===0){
    const cycle=await ok<import('../server/payouts/model.js').PayoutCycle>(request('system_admin','/api/v1/payout-cycles',{action:'create',code:'TWO-BATCH-CYCLE',semesterId:semester.id,expectedSemesterVersion:semester.version,expectedVersion:0,fields:{name:'Synthetic 800 + 200 semester payout',targetDate:day,requirements:[]},...evidence}));m.cycleId=cycle.id;
    const historical=await ok<{batchId:string}>(request('coordinator',`/api/v1/payout-cycles/${cycle.id}/historical-setup`,{expectedCycleVersion:cycle.version,expectedSemesterVersion:semester.version,expectedYearVersion:year.version,importId:staged.id,deadlineOn:offset(-1),reportedReleaseOn:day,sourceLocation:body.sourceLocation,...evidence,reviewed:true}));item.batchId=historical.batchId;
    const opened=await ok<import('../server/payouts/model.js').PayoutCycle>(request('coordinator',`/api/v1/payout-cycles/${cycle.id}/open`,{action:'open',expectedVersion:cycle.version,...evidence}));m.cycleVersion=opened.version;await save(manifest,m);
    await finalize(c,item);await save(manifest,m);await captureFirstFreeze();
   }else{
    // The historical setup is single-root. Later numbered windows retain ordinary guards.
    const secondHistorical=await request('coordinator',`/api/v1/payout-cycles/${m.cycleId}/historical-setup`,{expectedCycleVersion:m.cycleVersion,expectedSemesterVersion:semester.version,expectedYearVersion:year.version,importId:staged.id,deadlineOn:day,reportedReleaseOn:day,sourceLocation:body.sourceLocation,...evidence,reviewed:true});assert.equal(secondHistorical.statusCode,409);assert.equal(secondHistorical.json().error.code,'HISTORICAL_SETUP_REVIEW_REQUIRED');
    await ok(request('coordinator',`/api/v1/payout-cycles/${m.cycleId}/submission-windows/extend-semester`,{expectedCycleVersion:m.cycleVersion,expectedRevision:1,deadlineOn:day,reason:'Synthetic second-window setup; no real financial period changed'}));
    const next=await ok<{id:string}>(request('coordinator',`/api/v1/payout-cycles/${m.cycleId}/submission-windows/open-window`,{expectedCycleVersion:m.cycleVersion,expectedDeadlineRevision:2,expectedSequence:1,opensOn:day,cutoffOn:day}));item.batchId=next.id;await save(manifest,m);
    const detail=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));
    const attempt=await request('staff',`/api/v1/ovr-batches/${item.batchId}/submit-review`,{expectedRevision:detail.batch.revision,expectedSourceHash:detail.managed!.sourceHash,...evidence});assert.equal(attempt.statusCode,409);assert.equal(attempt.json().error.code,'CUTOFF_NOT_REACHED');
    item.guard={code:attempt.json().error.code,message:attempt.json().error.message,attemptedAt:new Date().toISOString(),earliestSubmitDay:offset(1),historicalSecondSetupCode:secondHistorical.json().error.code};
   }
   await save(manifest,m);console.log(`Batch ${number}: ${count} scoped prior reviews accepted; ${index===0?'processed, all Pending':'draft, cutoff guard retained'}`);
  }
  m.state='prepared-with-second-batch-blocker';await save(manifest,m);
 }finally{await c.close();}
 await finishGapReport();
}

async function finalize(c:Awaited<ReturnType<typeof open>>,item:FixtureBatch){
 const {request,ok}=c,e={reason:'Synthetic prior batch payroll reviewed through normal commands',reference:item.reference};
 let d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));assert.equal(d.managed!.form.rows.length,item.count);
 for(const [role,action] of [['staff','submit-review'],['coordinator','finalize']]){await ok(request(role,`/api/v1/ovr-batches/${item.batchId}/${action}`,{expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash,...e}));d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));}
 let b=d.batch;for(const [role,action] of [['coordinator','submit'],['staff','mark-processed']])b=await ok<OvrBatch>(request(role,`/api/v1/ovr-batches/${item.batchId}/${action}`,{expectedRevision:b.revision,effectiveOn:today(),...e}));
 const summary=await ok<RecordingSummary>(request('staff',`/api/v1/ovr-batches/${item.batchId}/payment-summary`));assert.equal(summary.canRecord,true);assert.equal(summary.pending,item.count);assert.equal(summary.paid,0);assert.equal(summary.unclaimed,0);item.state='processed';item.summary=summary;
 const [[frozen]]=await c.admin.execute<RowDataPacket[]>('SELECT snapshot FROM ovr_finalizations WHERE batch_id=?',[item.batchId!]);item.frozenHash=hash(JSON.stringify(frozen.snapshot));
}

async function verify(){
 const c=await open();const {m,admin,request,ok}=c;try{
  const checks=[];for(const item of m.batches){const p=await ok<PriorBatchPreview>(request('coordinator',`/api/v1/document-batches/prior-approval-preview?importId=${item.importId}&semesterId=${m.semesterId}`));assert.equal(p.members.filter(x=>x.approval?.valid).length,item.count);const d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));const r=await request('staff',`/api/v1/ovr-batches/${item.batchId}/payment-summary`);checks.push({number:item.number,count:item.count,priorReviewsCurrent:p.members.filter(x=>x.approval?.valid).length,coursePending:p.members.filter(x=>x.coursePending).length,unresolved:p.members.filter(x=>x.issues.length).map(x=>({id:x.scholarId,issues:x.issues})),state:d.batch.state,payrollRows:d.batch.state==='draft'?d.managed!.form.rows.length:item.count,paymentRecordingStatus:r.statusCode,paymentRecording:r.statusCode===200?r.json():r.json().error,guard:item.guard??null});}
  const [[counts]]=await admin.query<RowDataPacket[]>(`SELECT (SELECT COUNT(*) FROM scholars) scholars,(SELECT COUNT(*) FROM payment_records) paymentRecords,(SELECT COUNT(*) FROM semester_entitlements) entitlements,(SELECT COUNT(*) FROM payroll_allocations) allocations,(SELECT COUNT(*) FROM prior_batch_members) priorMembers,(SELECT COUNT(*) FROM requirement_receipts) receipts,(SELECT COUNT(*) FROM requirement_workflow_events WHERE JSON_EXTRACT(details,'$.priorBatchApproval') IS NOT NULL AND (JSON_EXTRACT(details,'$.checks') IS NOT NULL OR JSON_EXTRACT(details,'$.attestation') IS NOT NULL)) fabricatedOrdinaryChecks,(SELECT COUNT(*) FROM semester_review_events WHERE average_value IS NOT NULL OR has_failed IS NOT NULL OR has_dropped IS NOT NULL OR has_incomplete IS NOT NULL) inventedGrades`);
  assert.equal(Number(counts.scholars),1000);assert.equal(Number(counts.paymentRecords),0);assert.equal(Number(counts.priorMembers),1000);assert.equal(Number(counts.receipts),2000);assert.equal(Number(counts.fabricatedOrdinaryChecks),0);assert.equal(Number(counts.inventedGrades),0);assert.equal(new Set(m.batches.flatMap(b=>b.scholarIds)).size,1000);
  const [receiptDates]=await admin.query<RowDataPacket[]>("SELECT DATE_FORMAT(received_on,'%Y-%m-%d') day,COUNT(*) n FROM requirement_receipts GROUP BY received_on");assert.deepEqual(receiptDates.map(r=>({day:r.day,n:Number(r.n)})),[{day:m.day,n:2000}]);
  const [finalizations]=await admin.query<RowDataPacket[]>('SELECT batch_id,snapshot FROM ovr_finalizations');const frozen=finalizations.map(r=>({batchId:r.batch_id,sha256:hash(JSON.stringify(r.snapshot)),members:decodeStoredJson<OvrFinalization>(r.snapshot).payrollForm!.rows.length}));
  const result={at:new Date().toISOString(),database:m.database,yearId:m.yearId,semesterId:m.semesterId,counts,receiptDates,checks,frozen,targetFullyReady:checks.every(x=>x.paymentRecording?.canRecord===true),classificationLabels:['Already Processed — Requirements Previously Checked','Requirements Still Incomplete'],applicationSourceChanged:false};await save(folder+'/verification.json',result);console.log(JSON.stringify({counts,checks:checks.map(x=>({number:x.number,state:x.state,rows:x.payrollRows,canRecord:x.paymentRecording?.canRecord??false})),targetFullyReady:result.targetFullyReady}));
 }finally{await c.close();}
}

async function finishGapReport(){
 const c=await open();const {m,admin,request,ok}=c;try{
  assert.ok(['initializing','prepared-with-second-batch-blocker'].includes(m.state));assert.equal(m.batches.length,2);const b=m.batches[1];
  const d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${b.batchId}`));assert.equal(d.batch.state,'draft');
  const [annuals]=await admin.execute<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE academic_year_id=? AND scholar_id IN ('+b.scholarIds.map(()=>'?').join(',')+')',[m.yearId,...b.scholarIds]);const targetIds=new Set(annuals.map(a=>a.id));const covered=d.managed!.items.filter(i=>targetIds.has(i.scholarshipId));assert.equal(covered.length,200);assert.ok(covered.every(i=>i.issues.some(e=>e.code==='HISTORICAL_BATCH_APPROVAL_REQUIRED')));assert.equal(d.managed!.form.rows.length,0);
  const attempt=await request('staff',`/api/v1/ovr-batches/${b.batchId}/submit-review`,{expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash,reason:'Synthetic guard demonstration; no approval forced',reference:b.reference});assert.equal(attempt.statusCode,409);assert.equal(attempt.json().error.code,'CUTOFF_NOT_REACHED');
  const second=await request('coordinator',`/api/v1/payout-cycles/${m.cycleId}/historical-setup`,{expectedCycleVersion:m.cycleVersion,expectedSemesterVersion:1,expectedYearVersion:1,importId:b.importId,deadlineOn:m.day,reportedReleaseOn:m.day,sourceLocation:'Synthetic second prior-review packet',reason:'Synthetic second historical setup guard demonstration',reference:b.reference,reviewed:true});assert.equal(second.statusCode,409);assert.equal(second.json().error.code,'HISTORICAL_SETUP_REVIEW_REQUIRED');
  b.state='draft';b.guard={at:new Date().toISOString(),submission:attempt.json().error,secondHistoricalSetup:second.json().error,sourceIssue:'HISTORICAL_BATCH_APPROVAL_REQUIRED',sourceIssueCount:covered.length,candidateRows:0,sourceIssueMeaning:'The historical cycle requires the root import ID and a supported destination-origin link. This separate second import cannot satisfy that existing path. Ending the cutoff alone does not solve this.'};m.state='blocked-existing-historical-source-controls';await save(manifest,m);await save(folder+'/second-batch-source-issues.json',{batchId:b.batchId,importId:b.importId,guard:b.guard,scholars:covered.map(i=>({scholarshipId:i.scholarshipId,issues:i.issues}))});console.log(JSON.stringify({state:m.state,secondBatch:b.guard}));
 }finally{await c.close();}
 await verify();
}
async function controls(){
 const c=await open();const {m,admin,request,ok}=c;try{
  assert.ok(['blocked-existing-historical-source-controls','ready'].includes(m.state));
  const minimal=parseScholarInput({expectedVersion:0,reason:'Synthetic unknown placement validation only',fields:{firstName:'Synthetic',lastName:'Not committed',academicYearId:m.yearId,contact:{}}},true);assert.equal(minimal.fields.birthDate,null);
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Unknown placement');sheet.addRow(SIMPLE_COLUMNS);sheet.addRow(['Synthetic unknown placement','Not committed','','','','','Old','']);const bytes=Buffer.from(await book.xlsx.writeBuffer());
  const missing=await ok<ImportPreview>(request('coordinator','/api/v1/imports/stage',{fileName:'uncommitted-missing-placement.xlsx',base64:bytes.toString('base64'),approvedSelection:{reference:'SYNTHETIC-NOT-COMMITTED',effectiveOn:today()}}));assert.equal(missing.ready,false);assert.ok(missing.rows[0].errors.some((e:string)=>e.includes('Year Level')));
  const finalSummary=await ok<RecordingSummary>(request('staff',`/api/v1/ovr-batches/${m.batches[0].batchId}/payment-summary`));assert.equal(finalSummary.pending,800);assert.equal(finalSummary.canRecord,true);
  const preview=await ok<RecordingPreview>(request('staff',`/api/v1/ovr-batches/${m.batches[0].batchId}/payment-operations/preview`,{mode:'all_remaining_paid',scholarshipIds:[],outcome:'paid',actualPaidOn:today(),reference:'SYNTHETIC-PREVIEW-NO-RELEASE',reason:'Read-only payment readiness check; no payment committed'}));assert.equal(preview.count,800);assert.deepEqual(preview.conflicts,[]);
  const checkpoint=await json<{batchId:string;sha256:string}>(folder+'/first-freeze-checkpoint.json');const [[frozen]]=await admin.execute<RowDataPacket[]>('SELECT snapshot FROM ovr_finalizations WHERE batch_id=?',[checkpoint.batchId]);assert.equal(hash(JSON.stringify(frozen.snapshot)),checkpoint.sha256,'Second import/review/window must not rewrite first payroll evidence');
  const staffEvidence=[];for(const b of m.batches){const evidence=await ok<SemesterComplianceView>(request('staff',`/api/v1/scholars/${b.scholarIds[0]}/semester-requirements/${m.semesterId}/compliance`));assert.equal(evidence.result,'compliant');assert.equal(evidence.priorApproval!.valid,true);staffEvidence.push({batch:b.number,priorApproval:evidence.priorApproval});}
  const schema=m.database;const [fks]=await admin.execute<RowDataPacket[]>("SELECT TABLE_NAME childTable,CONSTRAINT_NAME name,REFERENCED_TABLE_NAME parentTable,GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) childCols,GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION) parentCols FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL GROUP BY TABLE_NAME,CONSTRAINT_NAME,REFERENCED_TABLE_NAME",[schema]);
  for(const fk of fks){const child=fk.childCols.split(','),parent=fk.parentCols.split(',');const [[r]]=await admin.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${ident(fk.childTable)} c LEFT JOIN ${ident(fk.parentTable)} p ON ${child.map((col:string,i:number)=>'c.'+ident(col)+'=p.'+ident(parent[i])).join(' AND ')} WHERE ${child.map((col:string)=>'c.'+ident(col)+' IS NOT NULL').join(' AND ')} AND p.${ident(parent[0])} IS NULL`);assert.equal(Number(r.n),0,fk.name);}
  const [migrations]=await admin.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(migrations.length,62);for(const row of migrations)assert.equal(hash(await readFile('db/migrations/'+row.version)),row.checksum);
  const [[dupes]]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM (SELECT scholar_id,semester_id,benefit_type FROM semester_entitlements GROUP BY scholar_id,semester_id,benefit_type HAVING COUNT(*)>1) x');assert.equal(Number(dupes.n),0);
  const grantee=`'${m.runtimeUser}'@'localhost'`;for(const table of ['SCHEMA_PRIVILEGES','TABLE_PRIVILEGES','COLUMN_PRIVILEGES']){const [[r]]=await admin.execute<RowDataPacket[]>(`SELECT COUNT(*) n FROM information_schema.${table} WHERE GRANTEE=? AND TABLE_SCHEMA<>?`,[grantee,schema]);assert.equal(Number(r.n),0);}
  const [global]=await admin.execute<RowDataPacket[]>('SELECT PRIVILEGE_TYPE p FROM information_schema.USER_PRIVILEGES WHERE GRANTEE=?',[grantee]);assert.ok(global.every(r=>r.p==='USAGE'));
  const [[payments]]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM payment_records');assert.equal(Number(payments.n),0);
  await save(folder+'/controls.json',{at:new Date().toISOString(),minimalProfileParserAcceptsUnknownPlacement:true,approvedImportUnknownPlacement:{ready:missing.ready,errors:missing.rows[0].errors,committed:false},paymentPreview:{count:preview.count,conflicts:preview.conflicts,committed:false},firstFrozenEvidenceUnchanged:true,staffEvidence,foreignKeyGroups:fks.length,orphans:0,migrations:62,duplicateEntitlements:0,runtimeGrantsConfined:true,payments:0});console.log('PASS focused controls: unknown placement boundary, 800 payment preview, immutable first payroll, Staff prior evidence, FK integrity, migration checksums, distinct entitlements, scoped runtime grants; no payment committed');
 }finally{await c.close();}
}
async function captureFirstFreeze(){const {db,m}=await owned();try{assert.equal(m.batches.length,1,'Capture only before the second prior review is committed to the manifest');const [[r]]=await db.execute<RowDataPacket[]>('SELECT snapshot FROM ovr_finalizations WHERE batch_id=?',[m.batches[0].batchId!]);assert.ok(r);const file=folder+'/first-freeze-checkpoint.json';await writeFile(file,JSON.stringify({at:new Date().toISOString(),batchId:m.batches[0].batchId,sha256:hash(JSON.stringify(r.snapshot))},null,2)+'\n',{flag:'wx'});console.log('First payroll frozen evidence checkpoint saved');}finally{await db.end();}}
async function serve(){const {db,m}=await owned();await db.end();assert.ok(['blocked-existing-historical-source-controls','ready'].includes(m.state));const secrets=await json<{runtimePassword:string;accountPassword:string}>(privateFolder+'/credentials.json');const pool=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:m.database,user:m.runtimeUser,password:secrets.runtimePassword,timezone:'Z',connectionLimit:8});const app=buildApp(loadConfig({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3009',APP_ORIGIN:'http://127.0.0.1:3009',DB_NAME:m.database,...flags}),{database:{pool,check:async()=>{await pool.query('SELECT 1');return 'connected';},close:async()=>{}},clientRoot:resolve('dist/client')});await app.listen({host:'127.0.0.1',port:3009});console.log(JSON.stringify({url:'http://127.0.0.1:3009',database:m.database,state:m.state,synthetic:true}));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();await pool.end();process.exit(0);});}
async function main(){
 const [command,arg]=process.argv.slice(2);
 if(command==='checkpoint-first')return captureFirstFreeze();
 if(command==='finish-gap-report')return finishGapReport();
 if(command==='progress'){const {db,m}=await owned();try{const [[counts]]=await db.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM scholars) scholars,(SELECT COUNT(*) FROM masterlist_entries) masterlistEntries,(SELECT COUNT(*) FROM prior_batch_members) priorMembers,(SELECT COUNT(*) FROM payroll_allocations) allocations');console.log(JSON.stringify({state:m.state,...counts}));}finally{await db.end();}return;}
 if(command==='preserve')return preserve(arg);if(command==='create')return create();if(command==='verify')return verify();if(command==='controls')return controls();if(command==='serve')return serve();
 throw new Error('Use preserve before|after, create, progress, verify, controls, or serve. No reset/drop command.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
