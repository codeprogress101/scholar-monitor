import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
import ExcelJS from 'exceljs';
import {applyMigrations,grantAuthRuntime} from './migration-lib.mjs';
import {preflightAnnualIntakes} from './annual-intake-preflight.mjs';
import {createBackup,restoreBackup} from './backup-lib.mjs';
import {buildApp} from '../server/app.js';
import {loadConfig} from '../server/config.js';
import {AuthService} from '../server/auth/service.js';
import {AuthorizationService} from '../server/authorization/service.js';
import {SIMPLE_COLUMNS,type ImportPreview,type ImportResult} from '../server/imports/model.js';
import type {ConfigRecord} from '../server/configuration/model.js';
import type {AnnualIntake,RegistrationContext,RegistrationResult} from '../server/scholars/annual-intake-model.js';
import type {ScholarDetail,DuplicateCheck} from '../server/scholars/model.js';

assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.ok(['localhost','127.0.0.1'].includes(process.env.DB_HOST??''));
const out=resolve(process.env.LDSS_ANNUAL_OUTPUT??'output/a1-a5-registration-20261024/uat-verified'),manifestPath=resolve(out,'fixture.json');
assert.ok(out.startsWith(resolve('output/a1-a5-registration-20261024')+requireSeparator()),'Task-owned output only');
function requireSeparator(){return process.platform==='win32'?'\\':'/';}
mkdirSync(resolve(out,'private'),{recursive:true});
if(process.platform==='win32')execFileSync('icacls',[resolve(out,'private'),'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,'SYSTEM:(OI)(CI)F'],{stdio:'ignore'});
type Manifest={database:string;runtimeUser:string;port:number;year?:string;school?:string;course?:string;people?:Record<string,string>};
type Credentials={runtimePassword:string;password:string};
const adminConfig={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
const mode=process.argv[2]??'create',port=3013,origin=`http://127.0.0.1:${port}`;
const save=(name:string,value:unknown)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const load=<T>(path:string)=>JSON.parse(readFileSync(path,'utf8')) as T;
if(mode==='serve'){
 const m=load<Manifest>(manifestPath),c=load<Credentials>(resolve(out,'private/credentials.json'));
 assert.match(m.database,/^ldss_annual_test_\d+_[a-f0-9]{8}$/);assert.equal(m.port,port);
 const pool=mysql.createPool({...adminConfig,database:m.database,user:m.runtimeUser,password:c.runtimePassword,connectionLimit:8});
 const app=buildApp(loadConfig({APP_ENV:'test',APP_ORIGIN:origin,PORT:String(port)}),{clientRoot:resolve(out,'client'),database:{pool,check:async()=> 'connected' as const,close:()=>pool.end()}});
 await app.listen({host:'127.0.0.1',port});console.log(`Owned annual registration UAT: ${origin}`);
}else{
 assert.equal(mode,'create','Only create or serve is supported; no reset/drop/resume command');assert.ok(!existsSync(manifestPath),'Existing fixture manifest: retain it; never reset');
 const suffix=`${process.pid}_${randomBytes(4).toString('hex')}`,m:Manifest={database:`ldss_annual_test_${suffix}`,runtimeUser:`ldss_annual_${suffix}`,port};
 const credentials:Credentials={runtimePassword:randomBytes(24).toString('base64url'),password:randomBytes(24).toString('base64url')};
 save('fixture.json',m);save('private/credentials.json',credentials);
 const admin=await mysql.createConnection(adminConfig);let root:mysql.Pool|undefined,runtime:mysql.Pool|undefined,app:ReturnType<typeof buildApp>|undefined;
 const results:{id:string;description:string}[]=[];
 const pass=(id:string,description:string)=>{results.push({id,description});console.log(`PASS ${id}: ${description}`);save('acceptance-progress.json',results);};
 try{
  await admin.query(`CREATE DATABASE \`${m.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);await admin.changeUser({database:m.database});
  assert.equal((await applyMigrations(admin,{through:'20261022070000_f52_individual_settlement.sql'})).length,62);
  root=mysql.createPool({...adminConfig,database:m.database,connectionLimit:8});
  app=buildApp(loadConfig({APP_ENV:'test',APP_ORIGIN:origin,PORT:String(port)}),{database:{pool:root,check:async()=> 'connected' as const,close:async()=>{}}});
  const auth=new AuthService(root),roles=new AuthorizationService(root),accounts=new Map<string,{id:string;cookie:string;csrf:string}>();
  for(const role of ['system_admin','staff','coordinator','unassigned'] as const){
   const email=role+'@example.invalid',id=await auth.createAccount('Synthetic '+role,email,'annual-uat');
   const token=await auth.issueReset(email,'annual-uat','Owned annual registration UAT');await auth.resetPassword(token,credentials.password,'127.0.0.1',randomUUID());
   if(role!=='unassigned')await roles.setRoles({email,roles:[role],expectedVersion:2,requestId:randomUUID(),operator:'annual-uat',reason:'Synthetic role assignment'});
   const r:LightMyRequestResponse=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin,'content-type':'application/json'},payload:{email,password:credentials.password}});assert.equal(r.statusCode,200,r.body);
   accounts.set(role,{id,cookie:String(r.headers['set-cookie']).split(';')[0],csrf:r.json().csrfToken});
  }
  const request=(role:string,path:string,body?:object,key:string=randomUUID(),method:'GET'|'POST'|'PATCH'=body?'POST':'GET')=>{
   const a=accounts.get(role)!;return app!.inject({method,url:'/api/v1/'+path,headers:{origin,cookie:a.cookie,...(body?{'content-type':'application/json','x-csrf-token':a.csrf,'idempotency-key':key}:{})},...(body?{payload:body}:{})});
  };
  const ok=async<T>(p:Promise<LightMyRequestResponse>,status=200)=>{const r=await p;assert.equal(r.statusCode,status,r.body);return r.json<T>();};
  const bad=async(p:Promise<LightMyRequestResponse>,status:number,code?:string)=>{const r=await p;assert.equal(r.statusCode,status,r.body);if(code)assert.equal(r.json().error.code,code,r.body);};
  const config=(kind:string,fields:object)=>ok<ConfigRecord>(request('system_admin','configuration/'+kind,{action:'create',expectedVersion:0,reason:'Declared synthetic annual registration facts',fields}));
  const year=await config('academic-years',{code:'ANNUAL-2026',name:'Synthetic first digital year',startsOn:'2026-06-01',endsOn:'2027-05-31'});
  // Declare the future read-context fixture before selecting any working year.
  // No prior year and no future participation/intake is created.
  const laterYear=await config('academic-years',{code:'ANNUAL-2027',name:'Synthetic later year read context',startsOn:'2027-06-01',endsOn:'2028-05-31'});
  const school=await config('schools',{code:'ANNUAL-SCHOOL',name:'Synthetic Annual College'}),course=await config('courses',{code:'ANNUAL-COURSE',name:'Synthetic Annual Degree'});
  await config('settings',{code:'LDSS_WORKING_ACADEMIC_YEAR',name:'Working academic year',valueType:'text',value:year.id});
  const workbook=async(rows:(string|number)[][])=>{const w=new ExcelJS.Workbook(),s=w.addWorksheet('Scholars');s.addRow(SIMPLE_COLUMNS);rows.forEach(r=>s.addRow(r));return {fileName:'synthetic-annual.xlsx',base64:Buffer.from(await w.xlsx.writeBuffer()).toString('base64')};};
  const importRows=[['LegacyAlpha','One','','',school.code,2,'New',course.name],['LegacyBeta','Two','','',school.code,3,'Continuing',course.name],['LegacyGamma','Three','','',school.code,4,'Old',course.name]];
  const preview=await ok<ImportPreview>(request('staff','imports/stage',await workbook(importRows)));
  assert.equal(preview.ready,true,JSON.stringify(preview));
  const imported=await ok<ImportResult>(request('staff',`imports/${preview.id}/confirm`,{hash:preview.hash,confirm:true}));
  const checkpointTables=['scholar_intakes','scholars','scholar_identifiers','import_jobs','import_confirmations','academic_records','scholarship_records','masterlist_versions','semester_entitlements','payroll_allocations','payment_records'];
  async function snapshot(tables=checkpointTables){const result:Record<string,string>={};for(const table of tables){const [rows]=await admin.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);result[table]=hash(rows.map(r=>JSON.stringify(r)).sort());}return result;}
  // File checkpoint + read-back verification precede any populated-table DDL.
  const before=await snapshot();save('upgrade-checkpoint.json',{database:m.database,tables:before,legacyImports:imported,preview});assert.deepEqual(load<{tables:unknown}>(resolve(out,'upgrade-checkpoint.json')).tables,before);
  const backupKey=randomBytes(32);writeFileSync(resolve(out,'private/upgrade-backup.key'),backupKey,{flag:'wx'});
  const directory=resolve(out,'private/recovery'),backup=await createBackup(backupKey,{connection:{...adminConfig,database:m.database},args:['--no-defaults','--host=127.0.0.1',`--port=${adminConfig.port}`,'--user=root','--default-character-set=utf8mb4'],directory});
  const restoreOptions={keep:false,context:{admin:adminConfig,sourceDatabase:m.database,directory}};
  const restored=await restoreBackup(backup.file,backupKey,restoreOptions);
  const recovery=load<{verified:boolean}>(restored.reportFile);assert.equal(recovery.verified,true);save('upgrade-recoverability.json',{backup:backup.file,restoreReport:restored.reportFile,verified:true,temporaryRestoreRemoved:true});
  await admin.query('CREATE TABLE _ldss_annual_uat_owner(id INT PRIMARY KEY,recovery_verified INT NOT NULL,token_hash CHAR(64) NOT NULL)');
  await admin.execute('INSERT INTO _ldss_annual_uat_owner VALUES(1,1,?)',[hash(credentials.runtimePassword)]);
  const preflight=await preflightAnnualIntakes(admin);assert.equal(preflight.intakes,3);
  const [oldIntakes]=await admin.query<RowDataPacket[]>('SELECT * FROM scholar_intakes ORDER BY id');
  assert.equal((await applyMigrations(admin)).length,1);assert.deepEqual(await applyMigrations(admin),[]);
  const [afterIntakes]=await admin.query<RowDataPacket[]>('SELECT * FROM scholar_intakes ORDER BY id');
  for(let i=0;i<oldIntakes.length;i++)for(const key of Object.keys(oldIntakes[i]))assert.deepEqual(afterIntakes[i][key],oldIntakes[i][key]);
  const after=await snapshot(checkpointTables.filter(t=>t!=='scholar_intakes'));for(const t of Object.keys(after))assert.equal(after[t],before[t],t);
  save('upgrade.json',{preflight,legacyColumnsExact:true,otherProtectedDataExact:true,oldMigrations:62,newMigrations:63,partialDdlRecovery:'Retain checkpoint and inspect committed DDL; never retry blindly or roll back over subsequent transactions. Retained environments are excluded by ownership preflight.'});
  await app.close();await admin.query(`CREATE USER ${admin.escape(m.runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(credentials.runtimePassword)}`);await grantAuthRuntime(admin,m.database,m.runtimeUser);
  runtime=mysql.createPool({...adminConfig,database:m.database,user:m.runtimeUser,password:credentials.runtimePassword,connectionLimit:8});
  app=buildApp(loadConfig({APP_ENV:'test',APP_ORIGIN:origin,PORT:String(port)}),{database:{pool:runtime,check:async()=> 'connected' as const,close:async()=>{}}});
  const context=await ok<RegistrationContext>(request('staff','scholar-registrations/context'));
  const body=(name:string,classification:'new'|'continuing'='new')=>({identity:{mode:'new' as const,fields:{firstName:name,lastName:'Family'+hash(name).slice(0,16),middleName:'',suffix:'',birthDate:null,academicYearId:year.id,barangayId:null,contact:{email:'',phone:'',addressLine:''}}},workingContext:context.workingContext,annualIntake:{academicYearId:year.id,classification,sourceReference:'Declared synthetic selected / continuing office list',initialPlacement:{schoolId:null as string|null,courseId:null as string|null,yearLevel:null as string|null}},reason:'Synthetic annual registration acceptance'});
  const register=(b:object,key=randomUUID(),role='staff')=>ok<RegistrationResult>(request(role,'scholar-registrations',b,key),201);
  const profile=(id:string,y=year.id)=>ok<ScholarDetail>(request('staff',`scholars/${id}?contextAcademicYearId=${y}`));
  const revision=(r:AnnualIntake)=>({expectedRevision:r.revision,expectedSnapshotHash:r.snapshotHash,academicYearVersion:year.version,sourceReference:'Synthetic reviewed office correction evidence',reason:'Supported synthetic annual fact correction'});
  const financialTables=['academic_records','scholarship_records','masterlist_versions','requirement_instances','historical_payout_setups','semester_entitlements','payroll_allocations','payment_records','ovr_batches','payroll_reconciliation_events'];
  const protectedBefore=await snapshot(financialTables);
  const firstBody=body('FirstAnnual'),key=randomUUID(),first=await register(firstBody,key);assert.equal(first.registrationOnly,true);assert.equal(first.annualIntake.missingInitialFields.length,3);
  assert.deepEqual(await register(JSON.parse(JSON.stringify(firstBody)),key),first);
  const continuation=await register(body('DigitalContinuing','continuing'));assert.equal(continuation.annualIntake.classification,'continuing');
  const [[years]]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM academic_years WHERE starts_on<?',[year.startsOn]);assert.equal(years.n,0);
  pass('DA01/DA02','Atomic New and first-digital Continuing; no earlier year, no approval side effects; exact replay');
  for(const invalid of [{...firstBody,annualIntake:{...firstBody.annualIntake,classification:'Old'}},{...body('InvalidExtra'),actorId:randomUUID()},{...body('InvalidContext'),workingContext:{...context.workingContext,settingVersion:999}},{...body('InvalidSource'),annualIntake:{...firstBody.annualIntake,sourceReference:''}}])await bad(request('staff','scholar-registrations',invalid),invalid.workingContext.settingVersion===999?409:422);
  await bad(request('staff','scholars',{expectedVersion:0,fields:firstBody.identity.fields,reason:'Strict legacy route',annualIntake:firstBody.annualIntake}),422);
  for(let bits=0;bits<8;bits++){const b=body(`Combination${bits}`);b.annualIntake.initialPlacement={schoolId:bits&1?school.id:null,courseId:bits&2?course.id:null,yearLevel:bits&4?'Third year':null};const r=await register(b);assert.equal(r.annualIntake.missingInitialFields.length,3-((bits&1?1:0)+(bits&2?1:0)+(bits&4?1:0)));}
  pass('DA03','All eight nullable placement combinations; missing personal details remain unknown');
  const legacy=await ok<{id:string;version:number}>(request('staff','scholars',{expectedVersion:0,fields:body('ReuseAnnual').identity.fields,reason:'Legacy identity-only synthetic record'}));
  const legacyBefore=await profile(legacy.id),reuseBody={...body('Unused'),identity:{mode:'reuse',scholarId:legacy.id,expectedVersion:legacy.version,identityConfirmed:true,identityReference:'Compared synthetic permanent ID and office evidence'}};
  const reused=await register(reuseBody);assert.equal(reused.id,legacy.id);assert.equal((await profile(legacy.id)).version,legacy.version);assert.equal((await profile(legacy.id)).entryYear,legacyBefore.entryYear);
  await bad(request('staff','scholar-registrations',reuseBody),409,'ANNUAL_INTAKE_EXISTS');
  const duplicate=await ok<DuplicateCheck>(request('staff','scholars/duplicate-check',{fields:firstBody.identity.fields}));assert.ok(duplicate.total);
  await bad(request('staff','scholar-registrations',firstBody),409);
  await register({...firstBody,identity:{...firstBody.identity,duplicateResolution:{snapshot:duplicate.snapshot,decision:'create_separate',reason:'Declared distinct synthetic same-name person after identity comparison'}}});
  const raceLegacy=await ok<{id:string;version:number}>(request('staff','scholars',{expectedVersion:0,fields:body('RaceReuse').identity.fields,reason:'Concurrency identity fixture'}));
  const raceBody={...reuseBody,identity:{...reuseBody.identity,scholarId:raceLegacy.id,expectedVersion:raceLegacy.version}};
  const race=await Promise.all([request('staff','scholar-registrations',raceBody),request('coordinator','scholar-registrations',raceBody)]);assert.deepEqual(race.map(r=>r.statusCode).sort(),[201,409]);
  pass('DA04/DA05','Explicit identity reuse preserves identity; duplicate create requires fresh justified review; person/year race has one winner');
  await bad(request('staff','scholar-registrations',{...firstBody,reason:'Changed payload'},key),409,'IDEMPOTENCY_CONFLICT');
  const sameKey=randomUUID(),sameBody=body('SameKey');const same=await Promise.all([register(sameBody,sameKey),register(sameBody,sameKey)]);assert.deepEqual(same[0],same[1]);
  for(const table of ['scholars','scholar_intakes','audit_logs','annual_intake_commands']){
   const beforeFailure=await snapshot(['scholars','scholar_identifiers','scholar_id_sequences','scholar_intakes','scholar_commands','annual_intake_commands','audit_logs']);
   await admin.query(`CREATE TRIGGER annual_fail BEFORE INSERT ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic atomic rollback probe'`);
   try{await bad(request('staff','scholar-registrations',body('Rollback'+table.replaceAll('_',''))),500);}finally{await admin.query('DROP TRIGGER annual_fail');}
   assert.deepEqual(await snapshot(Object.keys(beforeFailure)),beforeFailure);
  }
  pass('DA06','Concurrent and lost-response exact retries; changed payload rejection; identity/root/audit/receipt failures roll back sequence and all evidence');
  let intake=first.annualIntake;
  const supplement=(placement:AnnualIntake['initialPlacement'])=>({...revision(intake),workingContext:context.workingContext,initialPlacement:placement});
  const supBody=supplement({schoolId:school.id,courseId:null,yearLevel:null});
  intake=await ok<AnnualIntake>(request('staff',`scholar-intakes/${intake.id}/supplements`,supBody));
  await bad(request('staff',`scholar-intakes/${intake.id}/supplements`,supBody),409,'VERSION_CONFLICT');
  await bad(request('staff',`scholar-intakes/${intake.id}/supplements`,supplement({schoolId:null,courseId:null,yearLevel:null})),409,'INITIAL_DETAILS_PROTECTED');
  const supplementRace=supplement({schoolId:school.id,courseId:course.id,yearLevel:'Second year'});
  const sr=await Promise.all([request('staff',`scholar-intakes/${intake.id}/supplements`,supplementRace),request('coordinator',`scholar-intakes/${intake.id}/supplements`,supplementRace)]);assert.deepEqual(sr.map(r=>r.statusCode).sort(),[200,409]);intake=sr.find(r=>r.statusCode===200)!.json<AnnualIntake>();
  assert.equal((await profile(first.id)).version,first.version);
  pass('DA07','Only missing manual details supplemented; stale/concurrent update blocked; identity version unchanged');
  const correction={...revision(intake),classification:'continuing',reviewed:true};
  await bad(request('staff',`scholar-intakes/${intake.id}/classification-corrections`,correction),403);
  for(const role of ['system_admin','unassigned']){await bad(request(role,'scholar-registrations',body('Forbidden'+role)),403);await bad(request(role,`scholar-intakes/${intake.id}/classification-corrections`,correction),403);}
  intake=await ok<AnnualIntake>(request('coordinator',`scholar-intakes/${intake.id}/classification-corrections`,correction));assert.equal(intake.originalClassification,'new');assert.equal(intake.classification,'continuing');assert.equal(intake.revision,4);
  const history=await ok<{items:unknown[];total:number}>(request('staff',`scholar-intakes/${intake.id}/history?limit=2`));assert.equal(history.total,4);assert.equal(history.items.length,2);
  const projected=(await profile(first.id)).annualIntake!;assert.equal(projected.snapshotHash,intake.snapshotHash);
  pass('DA08','Coordinator-only append correction, original retained, profile/head hash and bounded history agree');
  assert.equal((await profile(first.id,year.id)).annualIntake!.classification,'continuing');assert.equal((await profile(first.id,laterYear.id)).annualIntake,null);
  const classes=await ok<{items:ScholarDetail[];total:number}>(request('staff',`scholars?associatedYearId=${year.id}&classification=continuing&sort=classification&limit=25`));assert.ok(classes.items.some(r=>r.id===first.id));
  const annualOnly=await ok<{items:ScholarDetail[]}>(request('staff',`scholars?scholarshipYearId=${year.id}`));assert.ok(!annualOnly.items.some(r=>r.id===first.id));
  for(const limit of [25,50,100]){const list=await ok<{items:ScholarDetail[];total:number}>(request('staff',`scholars?associatedYearId=${year.id}&limit=${limit}`));assert.equal(new Set(list.items.map(r=>r.id)).size,list.items.length);assert.ok(list.items.some(r=>r.id===legacy.id));}
  await bad(request('staff',`scholars?associatedYearId=${year.id}&scholarshipYearId=${year.id}`),422);
  await bad(request('staff',`scholars?associatedYearId=${year.id}&contextAcademicYearId=${laterYear.id}`),422);
  assert.deepEqual(await snapshot(financialTables),protectedBefore);
  pass('DA09/DA10/DA12','Selected historical year explicit facts; no invented other-year intake; bounded unique annual association, legacy filters preserved; zero downstream writes');
  // Post-upgrade import remains its own unchanged public lane; raw import roots remain immutable.
  const post=await ok<ImportPreview>(request('staff','imports/stage',await workbook([['AfterMigration','Import','','',school.code,2,'Old',course.name]])));assert.equal(post.ready,true);
  await ok<ImportResult>(request('staff',`imports/${post.id}/confirm`,{hash:post.hash,confirm:true}));
  const [[importRoot]]=await admin.query<RowDataPacket[]>("SELECT * FROM scholar_intakes WHERE import_job_id=?",[post.id]);assert.equal(importRoot.origin_kind,'import');assert.equal(importRoot.classification,'continuing');
  const importView=await ok<{items:{intake:AnnualIntake}[]}>(request('staff',`scholars/${importRoot.scholar_id}/annual-intakes?academicYearId=${year.id}`));
  await bad(request('staff',`scholar-intakes/${importRoot.id}/supplements`,{...revision(importView.items[0].intake),workingContext:context.workingContext,initialPlacement:{schoolId:school.id,courseId:course.id,yearLevel:'Third year'}}),409,'INITIAL_DETAILS_PROTECTED');
  pass('DA11','Mixed New/Continuing/Old import before migration and normal import after; immutable import origin; manual supplements cannot mutate import');
  for(const table of ['scholar_intake_revisions','annual_intake_commands']){
   await runtime.query(`SELECT * FROM ${table} LIMIT 1`);
   await assert.rejects(runtime.query(`UPDATE ${table} SET recorded_at=recorded_at`),/denied/);
   await assert.rejects(runtime.query(`DELETE FROM ${table}`),/denied/);
   await assert.rejects(runtime.query(`ALTER TABLE ${table} ADD COLUMN forbidden INT`),/denied/);
   await assert.rejects(admin.query(`UPDATE ${table} SET recorded_at=recorded_at`),/immutable/);
  }
  const [grantRows]=await admin.query('SHOW GRANTS FOR '+admin.escape(m.runtimeUser)+"@'localhost'");save('runtime-grants.json',grantRows);
  const [migrations]=await admin.query('SELECT * FROM schema_migrations ORDER BY version');save('migrations.json',migrations);
  pass('DA13','Populated 62→63 upgrade preserves original columns/data; immutable triggers and runtime SELECT/INSERT-only tables; DDL/update/delete denied');
  m.year=year.id;m.school=school.id;m.course=course.id;m.people={new:first.id,continuing:continuation.id,reused:legacy.id};save('fixture.json',m);
  save('acceptance.json',{passed:true,results,protectedTablesExact:true,fixture:m.database,port,legacyIntakesPreserved:oldIntakes.length});
  console.log('Annual registration contract checks passed; owned fixture retained for browser UAT.');
 }finally{if(app)await app.close();if(runtime)await runtime.end();if(root)await root.end();await admin.end();}
}

