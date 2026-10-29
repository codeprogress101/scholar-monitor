import {schemaManifest} from '../server/schema-manifest.js';
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {applyMigrations,grantAuthRuntime} from './migration-lib.mjs';
import {inventory} from './backup-lib.mjs';
import {MonitoringEvidenceService} from '../server/graduation/monitoring-service.js';
import {AuthService} from '../server/auth/service.js';
import {AuthorizationService} from '../server/authorization/service.js';
import {buildApp} from '../server/app.js';
import {loadConfig} from '../server/config.js';
import type {MonitoringList,MonitoringContext} from '../server/scholars/graduation-monitoring-model.js';
import type {ScholarResult} from '../server/scholars/model.js';
import type {ConfigRecord} from '../server/configuration/model.js';
import type {RowDataPacket} from 'mysql2/promise';
import type {LightMyRequestResponse} from 'fastify';
assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST??''));
const suffix=`${process.pid}_${randomBytes(4).toString('hex')}`,database=`ldss_gmonitor_test_${suffix}`,runtimeUser=`ldss_gm_${suffix}`,runtimePassword=randomBytes(32).toString('base64url');
const folder='output/a6-1-graduation-20261024',origin='http://127.0.0.1:3091';await mkdir(folder,{recursive:true});
await writeFile(folder+'/disposable-owner.json',JSON.stringify({database,runtimeUser,pid:process.pid,synthetic:true}));
const adminOptions={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
const admin=await mysql.createConnection(adminOptions);let created=false,userCreated=false,root:mysql.Pool|undefined,runtime:mysql.Pool|undefined,app:ReturnType<typeof buildApp>|undefined;
let assertions=0;
try{
 await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);created=true;await admin.changeUser({database});assert.equal((await applyMigrations(admin)).length,schemaManifest.length);
 await admin.query(`CREATE USER ${admin.escape(runtimeUser)}@'localhost' IDENTIFIED BY ${admin.escape(runtimePassword)}`);userCreated=true;await grantAuthRuntime(admin,database,runtimeUser);
 root=mysql.createPool({...adminOptions,database,connectionLimit:4});runtime=mysql.createPool({...adminOptions,database,user:runtimeUser,password:runtimePassword,connectionLimit:4});
 const auth=new AuthService(root),roles=new AuthorizationService(root),accounts=new Map<string,{id:string;cookie:string;csrf:string}>();
 app=buildApp(loadConfig({APP_ENV:'test',PORT:'3091',APP_ORIGIN:origin,GRADUATION_MONITORING_WRITES_ENABLED:'true'}),{database:{pool:runtime,check:async()=>'connected',close:async()=>{}}});
 for(const role of ['staff','coordinator','system_admin','unassigned'] as const){const email=role+'@example.invalid',id=await auth.createAccount('Fictional '+role,email,'synthetic-test');const reset=await auth.issueReset(email,'synthetic-test','Synthetic monitoring fixture');const password=randomBytes(32).toString('base64url');await auth.resetPassword(reset,password,'127.0.0.1',randomUUID());if(role!=='unassigned')await roles.setRoles({email,roles:[role],expectedVersion:2,requestId:randomUUID(),operator:'synthetic-test',reason:'Synthetic monitoring fixture roles'});const login:LightMyRequestResponse=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin},payload:{email,password}});assert.equal(login.statusCode,200);accounts.set(role,{id,cookie:String(login.headers['set-cookie']).split(';')[0],csrf:login.json().csrfToken});}
 const call=async(role:string,path:string,body?:object)=>{const account=accounts.get(role)!;return app!.inject({method:body?'POST':'GET',url:'/api/v1/'+path,headers:{origin,cookie:account.cookie,...(body?{'x-csrf-token':account.csrf,'idempotency-key':randomUUID()}: {})},...(body?{payload:body}:{})});};
 const ok=async<T>(role:string,path:string,body?:object)=>{const r=await call(role,path,body);assert.equal(r.statusCode,200,r.body);assertions++;return r.json<T>();};
 const config=async(kind:string,fields:object)=>ok<ConfigRecord>('system_admin','configuration/'+kind,{action:'create',expectedVersion:0,reason:'Explicit fictional monitoring test facts',fields});
 const year=await config('academic-years',{code:'MONITOR-2026',name:'Fictional monitoring year',startsOn:'2026-01-01',endsOn:'2026-12-31'}),old=await config('academic-years',{code:'MONITOR-2025',name:'Fictional earlier year',startsOn:'2025-01-01',endsOn:'2025-12-31'});
 const semester=await config('semesters',{code:'MONITOR-FIRST',name:'Fictional semester',startsOn:'2026-01-01',endsOn:'2026-06-30',academicYearId:year.id});
 const school=await config('schools',{code:'MONITOR-SCHOOL',name:'Fictional school'}),course=await config('courses',{code:'MONITOR-COURSE',name:'Fictional five-year name (not duration evidence)'});
 const people:ScholarResult[]=[];
 for(const [index,level]of ['4th Year','5th Year','3rd Year',null,'unrecognized'].entries()){
  const [firstName,lastName]=[['Amihan','Abad'],['Bituin','Basilio'],['Carlos','Cruz'],['Dalisay','Dizon'],['Ernesto','Esteban']][index];
  const p=await ok<ScholarResult>('staff','scholars',{expectedVersion:0,reason:'Fictional read-service scenario',fields:{firstName,lastName,academicYearId:year.id,contact:{}}});people.push(p);
  if(level!==null)await ok('staff',`scholars/${p.id}/academic-records`,{academicYearId:year.id,schoolId:school.id,courseId:course.id,yearLevel:level,reason:'Explicit fictional academic placement',reference:'Synthetic source declared for monitoring read test'});
 }
 // Disposable reader fixture only: an activated annual enables the actual
 // existing guarded graduation request/approval, never a primary-UAT mutation.
 const annual=randomUUID();await admin.execute("INSERT INTO scholarship_records(id,scholar_id,academic_year_id,status,version,last_effective_on,operational_status,status_version,status_effective_on,created_at,updated_at) VALUES (?,?,?,'selected',4,'2026-01-01','active',1,'2026-01-01',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[annual,people[0].id,year.id]);
 const request=await ok<{requestId:string}>('coordinator',`scholarships/${annual}/status/requests`,{expectedVersion:1,toStatus:'graduated',kind:'change',effectiveOn:'2026-06-30',reasonCode:'GRADUATION',reason:'Fictional official school graduation evidence',reference:'Synthetic school confirmation'});
 await ok('coordinator',`status-requests/${request.requestId}/approve`,{reason:'Reviewed fictional school graduation evidence',reference:'Synthetic Coordinator decision',finalSemesterId:semester.id});
 const path=`scholars/graduation-monitoring?academicYearId=${year.id}`;
 const before=await inventory(admin);
 const final=await ok<MonitoringList>('staff',path);assert.equal(final.total,2);assert.equal(final.items.filter(r=>r.indicator==='graduated').length,1);assert.equal(final.items.filter(r=>r.indicator==='cannot_determine').length,1);assert.ok(final.items.every(r=>r.durationYears===null));
 const all=await ok<MonitoringList>('coordinator',path+'&filter=all&limit=2');assert.equal(all.total,5);assert.equal(all.items.length,2);
 const second=await ok<MonitoringList>('staff',path+'&filter=all&limit=2&offset=2');assert.equal(second.items.length,2);assert.ok(second.items.every(r=>!all.items.some(p=>p.id===r.id)));
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=all&q='+people[1].scholarId)).total,1);
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=all&q=%25')).total,0);
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=all&schoolId='+school.id+'&courseId='+course.id)).total,4);
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=all')).items.find(r=>r.id===people[3].id)?.provisional,true);
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=graduated')).items[0].graduationRequestId,request.requestId);
 for(const filter of ['potentially_graduating','expected','delayed'])assert.equal((await ok<MonitoringList>('staff',path+'&filter='+filter)).total,0);
 assert.equal((await ok<MonitoringList>('staff',`scholars/graduation-monitoring?academicYearId=${old.id}&filter=all`)).total,0);
 assert.equal((await ok<MonitoringList>('staff',path+'&semesterId='+semester.id)).total,2);
 const context=await ok<MonitoringContext>('staff','scholars/graduation-monitoring/context');assert.equal(context.years.length,2);
 for(const role of ['system_admin','unassigned'])for(const suffix of ['', '/context'])assert.equal((await call(role,'scholars/graduation-monitoring'+suffix+(suffix?'':'?academicYearId='+year.id))).statusCode,403);
 assert.equal((await app.inject('/api/v1/'+path)).statusCode,401);
 assert.equal((await call('staff',`scholars/graduation-monitoring?academicYearId=${old.id}&semesterId=${semester.id}`)).statusCode,422);
 assert.equal((await call('staff',path+'&limit=101')).statusCode,422);
 const after=await inventory(admin);
 assert.deepEqual({...after,tables:after.tables.filter((t:{name:string})=>t.name!=='auth_sessions')},{...before,tables:before.tables.filter((t:{name:string})=>t.name!=='auth_sessions')},'Read monitoring changed business data or audit');
 // A normal correction reverses an incorrect graduation; the monitor must follow
 // the current approved source rather than an old Graduated event or status label.
 const correction=await ok<{requestId:string}>('coordinator',`scholarships/${annual}/status/requests`,{expectedVersion:2,toStatus:'active',kind:'correction',correctsRequestId:request.requestId,effectiveOn:'2026-07-01',reasonCode:'RECORDING_CORRECTION',reason:'Correct fictional graduation recorded in error',reference:'Synthetic correction source'});
 await ok('coordinator',`status-requests/${correction.requestId}/approve`,{reason:'Reviewed fictional correction evidence',reference:'Synthetic corrected decision'});
 assert.equal((await ok<MonitoringList>('staff',path+'&filter=graduated')).total,0);
 const [academic]=await admin.execute<RowDataPacket[]>('SELECT id FROM academic_records WHERE scholar_id=?',[people[2].id]);
 const change=await ok<{requestId:string}>('staff',`academic-records/${academic[0].id}/changes`,{expectedVersion:0,kind:'year_level_correction',schoolId:school.id,courseId:course.id,yearLevel:'Fourth year',effectiveOn:'2026-07-01',reason:'Fictional corrected academic level',reference:'Synthetic school placement correction',remarks:''});
 assert.equal((await ok<MonitoringList>('staff',path)).total,2);
 await ok('coordinator',`academic-changes/${change.requestId}/approve`,{reason:'Reviewed fictional level correction',reference:'Synthetic placement decision'});
 const current=await ok<MonitoringList>('staff',path);assert.equal(current.total,3);assert.equal(current.items.find(r=>r.id===people[2].id)?.yearLevel,'Fourth year');
 const [[counts]]=await admin.query<RowDataPacket[]>('SELECT (SELECT COUNT(*) FROM payment_records) payments,(SELECT COUNT(*) FROM semester_entitlements) entitlements');assert.equal(Number(counts.payments),0);assert.equal(Number(counts.entitlements),0);


 // A6.2 canonical placement and intake-only boundaries use real source commands.
 await config('settings',{code:'LDSS_WORKING_ACADEMIC_YEAR',name:'Working academic year',valueType:'text',value:year.id});
 const reviewContext=await ok<import('../server/graduation/duration-model.js').ReviewContext>('staff','program-duration-references/context');
 const durationResponse=await call('staff','program-duration-references',{schoolId:school.id,courseId:course.id,reviewContext,facts:{scopeKind:'all',appliesFromYearId:year.id,appliesThroughYearId:year.id,durationYears:'4.00',finalYearLevel:4,levelBasis:'annual_year_number',source:{type:'official_curriculum',issuer:'Fictional monitoring school',reference:'SYNTHETIC-A62-FOUR-YEAR-MAPPING'}},reason:'Explicit declared fictional four-year curriculum evidence'});assert.equal(durationResponse.statusCode,201,durationResponse.body);
 const sourceHead=durationResponse.json<import('../server/graduation/duration-model.js').DurationView>(),preview=await ok<import('../server/graduation/duration-model.js').DurationReview>('coordinator','program-duration-references/'+sourceHead.snapshot.id+'/review');
 await ok('coordinator','program-duration-references/'+sourceHead.snapshot.id+'/events',{action:'confirm',expectedRevision:sourceHead.snapshot.revision,expectedSnapshotHash:sourceHead.snapshotHash,reviewContext,reviewSourceHash:preview.reviewSourceHash,reviewed:true,reason:'Reviewed actual fictional mapping and conflict scope'});
 const potential=await ok<MonitoringList>('staff',path+'&filter=potentially_graduating');assert.ok(potential.items.some(r=>r.id===people[2].id));assert.equal(potential.items.find(r=>r.id===people[2].id)!.durationYears,'4.00');
 const registrationContext=await ok<import('../server/scholars/annual-intake-model.js').RegistrationContext>('staff','scholar-registrations/context');
 const intake=await app.inject({method:'POST',url:'/api/v1/scholar-registrations',headers:{origin,cookie:accounts.get('staff')!.cookie,'x-csrf-token':accounts.get('staff')!.csrf,'idempotency-key':randomUUID()},payload:{identity:{mode:'new',fields:{firstName:'Hiraya',lastName:'Herrera',academicYearId:year.id,contact:{}}},workingContext:registrationContext.workingContext,annualIntake:{academicYearId:year.id,classification:'new',sourceReference:'SYNTHETIC-A62-INITIAL-FACTS-ONLY',initialPlacement:{schoolId:school.id,courseId:course.id,yearLevel:'4'}},reason:'Explicit fictional initial facts without academic approval'}});assert.equal(intake.statusCode,201,intake.body);
 const registered=intake.json<{id:string;scholarId:string}>(),initial=await ok<MonitoringList>('staff',path+'&filter=all&q='+registered.scholarId);assert.equal(initial.items[0].indicator,'cannot_determine');assert.equal(initial.items[0].provisional,true);assert.equal(initial.items[0].durationYears,null);

 const incompletePath='scholars/'+registered.id+'/graduation-monitoring?academicYearId='+year.id;
 const incomplete=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>('staff',incompletePath),staffSession=accounts.get('staff')!;
 const contextProposal=await app.inject({method:'POST',url:'/api/v1/graduation-monitoring-cases',headers:{origin,cookie:staffSession.cookie,'x-csrf-token':staffSession.csrf,'idempotency-key':randomUUID()},payload:{scholarId:registered.id,academicYearId:year.id,semesterId:null,operation:'record_program_context',details:{curriculumCode:'SYNTHETIC-UNCONFIRMED',cohortCode:null,source:{type:'official_school_confirmation',issuer:'Fictional school',reference:'SYNTHETIC-A62-UNRESOLVED-CONTEXT'}},expectedRevision:0,expectedSnapshotHash:null,academicYearVersion:incomplete.academicYearVersion,semesterVersion:null,expectedSourceHash:incomplete.sourceHash,reason:'Explicit fictional proposed context without canonical placement',reviewed:true}});assert.equal(contextProposal.statusCode,201,contextProposal.body);
 const missing=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>('coordinator',incompletePath),coordinatorSession=accounts.get('coordinator')!,contextBody={operation:'review_program_context',details:{targetRevision:1,decision:'confirm',source:{type:'official_school_confirmation',issuer:'Fictional school',reference:'SYNTHETIC-A62-CONTEXT-REVIEW'},reviewSourceHash:missing.sourceHash},expectedRevision:1,expectedSnapshotHash:missing.case!.snapshotHash,academicYearVersion:missing.academicYearVersion,semesterVersion:null,expectedSourceHash:missing.sourceHash,reason:'Coordinator reviews unsupported fictional context',reviewed:true};
 const contextDecision=(decision:string)=>app!.inject({method:'POST',url:'/api/v1/graduation-monitoring-cases/'+missing.case!.snapshot.id+'/events',headers:{origin,cookie:coordinatorSession.cookie,'x-csrf-token':coordinatorSession.csrf,'idempotency-key':randomUUID()},payload:{...contextBody,details:{...contextBody.details,decision}}});assert.equal((await contextDecision('confirm')).statusCode,409);const rejected=await contextDecision('reject');assert.equal(rejected.statusCode,200,rejected.body);assert.equal(rejected.json().snapshot.context.state,'disputed');
 await writeFile(folder+'/a62-canonical-placement.json',JSON.stringify({passed:true,latestApprovedPlacementUsed:true,realSourceConfirmed:true,knownInitialCourseNeverPromoted:true,noAutomaticStandingOrEntitlement:true},null,2));

 const flagPath='scholars/'+people[2].id+'/graduation-monitoring?academicYearId='+year.id;
 const evidenceCommand=async(role:string,operation:string,details:object)=>{const p=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>(role,flagPath);const account=accounts.get(role)!;const body={...(p.case?{}:{scholarId:people[2].id,academicYearId:year.id,semesterId:null}),operation,details,expectedRevision:p.case?.snapshot.revision??0,expectedSnapshotHash:p.case?.snapshotHash??null,academicYearVersion:p.academicYearVersion,semesterVersion:null,expectedSourceHash:p.sourceHash,reason:'Actual fictional first-flag review and resolution',reviewed:true};const r=await app!.inject({method:'POST',url:'/api/v1/graduation-monitoring-cases'+(p.case?'/'+p.case.snapshot.id+'/events':''),headers:{origin,cookie:account.cookie,'x-csrf-token':account.csrf,'idempotency-key':randomUUID()},payload:body});assert.equal(r.statusCode,p.case?200:201,r.body);return r.json<import('../server/graduation/monitoring-model.js').MonitoringView>();};
 const evidenceSource={type:'official_school_confirmation',issuer:'Fictional test school',reference:'SYNTHETIC-A62-FIRST-FLAG'};
 const flagged=await evidenceCommand('staff','flag_review',{source:evidenceSource,finding:'Actual fictional school evidence missing initially'});assert.equal(flagged.snapshot.reviewFinding!.finding,'Actual fictional school evidence missing initially');
 const pending=await evidenceCommand('staff','propose_correction',{targetRevision:flagged.snapshot.revision,replacement:{kind:'expected',period:{precision:'academic_year',academicYearId:null,label:'Fictional school completion year 2028'},source:{...evidenceSource,reference:'SYNTHETIC-A62-FIRST-FLAG-RESOLVED'},finding:'New supported evidence resolves the original uncertainty'}});
 const review=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>('coordinator',flagPath);const resolved=await evidenceCommand('coordinator','review_correction',{targetRevision:pending.snapshot.pending!.revision,disposition:'apply_replacement',source:evidenceSource,reviewSourceHash:review.sourceHash});assert.equal(resolved.snapshot.reviewRequired,false);assert.equal(resolved.snapshot.reviewFinding,null);assert.equal(resolved.snapshot.assessment!.facts.kind,'expected');
 await writeFile(folder+'/a62-first-flag-resolution.json',JSON.stringify({passed:true,initialFindingRetained:true,staffProposalAllowed:true,coordinatorResolutionRequired:true,originalHistoryRetained:true},null,2));
 // A6.2: a separate old-year registration tests real closure/retry boundaries
 // without closing a year that owns a retained payroll or mutating that fixture.
 const digital=await ok<ScholarResult>('staff','scholars',{expectedVersion:0,reason:'Explicit isolated closure/retry scenario',fields:{firstName:'Felicidad',lastName:'Flores',academicYearId:old.id,contact:{}}});
 const panelPath='scholars/'+digital.id+'/graduation-monitoring?academicYearId='+old.id;
 const p=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>('staff',panelPath);
 const evidence={scholarId:digital.id,academicYearId:old.id,semesterId:null,operation:'follow_up',details:{source:{type:'official_school_confirmation',issuer:'Fictional registrar',reference:'SYNTHETIC-A62-LOCK-RETRY'},result:'Declared synthetic follow-up in an open historical case'},expectedRevision:0,academicYearVersion:p.academicYearVersion,expectedSourceHash:p.sourceHash,reason:'Explicit isolated exact receipt and period-lock test',reviewed:true};
 const key=randomUUID(),staffAccount=accounts.get('staff')!;
 const post=(body:object,retryKey=key,csrf=staffAccount.csrf)=>app!.inject({method:'POST',url:'/api/v1/graduation-monitoring-cases',headers:{origin,cookie:staffAccount.cookie,'x-csrf-token':csrf,'idempotency-key':retryKey},payload:body});
 assert.equal((await post(evidence,randomUUID(),'wrong-csrf')).statusCode,403);
 assert.equal((await post({...evidence,approved:true},randomUUID())).statusCode,422);
 assert.equal((await post({...evidence,semesterId:semester.id,semesterVersion:1},randomUUID())).statusCode,422);
 const copies=await Promise.all([post(evidence),post(evidence)]);assert.equal(copies[0].statusCode,201,copies[0].body);assert.deepEqual(copies[0].json(),copies[1].json());
 assert.equal((await post({...evidence,reason:'Changed replay body'})).statusCode,409);
 assert.equal((await post(evidence,randomUUID())).statusCode,409);
 await ok('system_admin','configuration/academic-years/'+old.id,{action:'lock',expectedVersion:old.version,reason:'Close only the isolated historical period for exact retry acceptance'});
 const receipt=await post(evidence);assert.equal(receipt.statusCode,201,receipt.body);assert.deepEqual(receipt.json(),copies[0].json());
 const now=await ok<import('../server/graduation/monitoring-model.js').ReviewPanel>('staff',panelPath);assert.equal(now.periodUnavailable,true);
 const fresh={operation:'follow_up',details:evidence.details,expectedRevision:1,expectedSnapshotHash:now.case!.snapshotHash,academicYearVersion:now.academicYearVersion,expectedSourceHash:now.sourceHash,reason:'Must not write to the locked historical case',reviewed:true};
 const denied=await app.inject({method:'POST',url:'/api/v1/graduation-monitoring-cases/'+now.case!.snapshot.id+'/events',headers:{origin,cookie:staffAccount.cookie,'x-csrf-token':staffAccount.csrf,'idempotency-key':randomUUID()},payload:fresh});assert.equal(denied.statusCode,409);assert.equal(denied.json().error.code,'GRADUATION_PERIOD_UNAVAILABLE');
 const [[user]]=await admin.execute<RowDataPacket[]>('SELECT version FROM users WHERE id=?',[staffAccount.id]);await roles.setRoles({email:'staff@example.invalid',roles:[],expectedVersion:user.version,requestId:randomUUID(),operator:'synthetic-test',reason:'Revoke only disposable Staff permission to verify completed-retry authorization'});assert.equal((await post(evidence)).statusCode,403);
 const disabled=new MonitoringEvidenceService(new AuthorizationService(runtime),false);await assert.rejects(disabled.detail(staffAccount.id,digital.id,{academicYearId:old.id}));
 await writeFile(folder+'/a62-closure-retry.json',JSON.stringify({passed:true,csrfDenied:true,strictUnknownFields:true,wrongParentSemesterDenied:true,concurrentExactReceipt:true,existingCaseConflict:true,lockedPeriodFreshDenied:true,completedRetryAfterClosure:true,revokedRoleCannotReadReceipt:true},null,2));
 await writeFile(folder+'/db-tests.json',JSON.stringify({passed:true,assertions,database,formalGraduationFromExistingCommand:true,unsupportedDurationNeverInferred:true,boundedPages:true,rolesDenied:true,readOnlyInventoryExact:true},null,2));console.log(JSON.stringify({passed:true,assertions,database}));
}finally{
 if(app)await app.close();if(runtime)await runtime.end();if(root)await root.end();assert.match(database,new RegExp('^ldss_gmonitor_test_'+process.pid+'_[a-f0-9]{8}$'));assert.match(runtimeUser,new RegExp('^ldss_gm_'+process.pid+'_[a-f0-9]{8}$'));
 if(userCreated)await admin.query(`DROP USER ${admin.escape(runtimeUser)}@'localhost'`);if(created)await admin.query(`DROP DATABASE \`${database}\``);await admin.end();await writeFile(folder+'/disposable-cleanup.json',JSON.stringify({database,runtimeUser,removed:true}));
}
