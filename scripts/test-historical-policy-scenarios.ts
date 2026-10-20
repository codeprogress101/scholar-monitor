import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import type { LightMyRequestResponse } from "fastify";
import { policyResetManifest, resetUnusedPolicies } from "../server/requirements/policy-reset.js";
import type { RequirementVersion } from "../server/requirements/model.js";

type Request=(role:string,url:string,body?:unknown,key?:string)=>Promise<LightMyRequestResponse>;
export async function testHistoricalPolicyScenarios(request:Request,pool:Pool,actorId:string) {
 const [[working]]=await pool.query<RowDataPacket[]>("SELECT st.version setting_version,y.id,y.version FROM system_settings st JOIN academic_years y ON y.id=st.setting_value WHERE st.code='LDSS_WORKING_ACADEMIC_YEAR'");
 const input={workingYearId:working.id,expectedWorkingYearVersion:working.version,expectedSettingVersion:working.setting_version,year:{code:'HISTORICAL-1901',name:'Synthetic historical 1901',startsOn:'1901-01-01',endsOn:'1901-12-31'},semester:{code:'HISTORICAL-1901-2',name:'Historical second semester',startsOn:'1901-07-01',endsOn:'1901-12-31',termKind:'second'},reason:'Synthetic reviewed historical coverage',reference:'TEST-HISTORICAL',reviewed:true};
 const path='/api/v1/configuration/historical-calendar', key=randomUUID();
 for(const role of ['staff','coordinator'])assert.equal((await request(role,path,input)).statusCode,403);
 assert.equal((await request('system_admin',path,{...input,reviewed:false})).statusCode,422);
 assert.equal((await request('system_admin',path,{...input,expectedWorkingYearVersion:0})).statusCode,422);
 assert.equal((await request('system_admin',path,{...input,expectedWorkingYearVersion:working.version+1})).statusCode,409);
 await pool.query("CREATE TRIGGER fail_historical_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='configuration.historical_calendar' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic historical rollback'; END IF; END");
 assert.equal((await request('system_admin',path,input,key)).statusCode,500);
 assert.equal((await pool.query<RowDataPacket[]>("SELECT id FROM academic_years WHERE code='HISTORICAL-1901'"))[0].length,0);
 await pool.query('DROP TRIGGER fail_historical_audit');
 const result=await request('system_admin',path,input,key);assert.equal(result.statusCode,200,result.body);
 assert.deepEqual((await request('system_admin',path,input,key)).json(),result.json());
 assert.deepEqual((await request('system_admin',path,input)).json(),result.json());
 assert.equal((await request('system_admin',path,{...input,reference:'Changed reference'},key)).statusCode,409);
 assert.equal((await request('system_admin',path,{...input,year:{...input.year,code:'HISTORICAL-OVERLAP'}})).json().error.code,'ACADEMIC_YEAR_OVERLAP');
 assert.equal((await request('system_admin',path,{...input,semester:{...input.semester,code:'HISTORICAL-DUPLICATE'}})).json().error.code,'SEMESTER_IDENTITY_CONFLICT');
 const [[unchanged]]=await pool.query<RowDataPacket[]>("SELECT st.version setting_version,y.id,y.version FROM system_settings st JOIN academic_years y ON y.id=st.setting_value WHERE st.code='LDSS_WORKING_ACADEMIC_YEAR'");assert.deepEqual(unchanged,working);
 // Verify the restricted runtime can edit the new explicit term identity through the normal API.
 const update=await request('system_admin',`/api/v1/configuration/semesters/${result.json().semesterId}`,{action:'update',expectedVersion:1,reason:'Synthetic term identity grant check',fields:{...input.semester,academicYearId:result.json().yearId}});assert.equal(update.statusCode,200,update.body);

 const policyKey=randomUUID();
 const create={action:'create',expectedVersion:0,code:'RESET-SYNTHETIC',reason:'Synthetic unused policy reset',reference:'TEST-RESET',fields:{name:'Unused synthetic policy',instructions:'Synthetic reset only',documentKind:'enrollment',appliesTo:'semester',semesterId:null,effectiveFrom:'1901-01-01',effectiveUntil:null}};
 const response=await request('system_admin','/api/v1/requirement-definitions',create,policyKey);assert.equal(response.statusCode,200,response.body);const policy=response.json<RequirementVersion>();
 const db=await pool.getConnection();
 try{
  const [[database]]=await db.query<RowDataPacket[]>('SELECT DATABASE() db');
  const manifest=await policyResetManifest(db,[policy.definitionId]);
  const reset={database:database.db,actorId,commandId:randomUUID(),definitionIds:[policy.definitionId],expectedHash:manifest.hash,reason:'Explicit synthetic permanent reset',reference:'TEST-RESET'};
  await assert.rejects(resetUnusedPolicies(db,{...reset,expectedHash:'0'.repeat(64)}),{code:'POLICY_RESET_CHANGED'});
  const [[coordinator]]=await db.query<RowDataPacket[]>("SELECT user_id FROM user_roles WHERE role_code='coordinator' AND revoked_at IS NULL LIMIT 1");
  await assert.rejects(resetUnusedPolicies(db,{...reset,actorId:coordinator.user_id}),{code:'PERMISSION_DENIED'});
  await db.query("CREATE TRIGGER fail_policy_reset_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.event_type='requirement.policy_reset' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic purge rollback'; END IF; END");
  await assert.rejects(resetUnusedPolicies(db,reset));
  assert.equal((await db.query<RowDataPacket[]>('SELECT id FROM requirement_definitions WHERE id=?',[policy.definitionId]))[0].length,1);
  await db.query('DROP TRIGGER fail_policy_reset_audit');
  const deleted=await resetUnusedPolicies(db,reset);assert.deepEqual(deleted.deleted,[policy.definitionId]);assert.deepEqual(await resetUnusedPolicies(db,reset),deleted);
  assert.equal((await request('system_admin','/api/v1/requirement-definitions',create,policyKey)).json().error.code,'POLICY_REMOVED');
  assert.equal((await db.query<RowDataPacket[]>('SELECT id FROM requirement_definitions WHERE id=?',[policy.definitionId]))[0].length,0);
  // Direct policy references in an operational payroll revision are protected.
  const protectedResponse=await request('system_admin','/api/v1/requirement-definitions',{...create,code:'RESET-PROTECTED'});assert.equal(protectedResponse.statusCode,200,protectedResponse.body);const protectedPolicy=protectedResponse.json<RequirementVersion>();
  const cycle=randomUUID(), version=randomUUID();
  await db.execute('INSERT INTO payout_cycles(id,code,semester_id) VALUES(?,?,?)',[cycle,'RESET-PROTECTED-CYCLE',result.json().semesterId]);
  await db.execute("INSERT INTO payout_cycle_versions(id,cycle_id,version,name,target_date,state,action,reason,reference_text,actor_id,actor_name,recorded_at) VALUES(?,?,1,'Synthetic protected payroll','1901-09-01','open','open','Synthetic protection test','TEST',?,'Synthetic administrator',UTC_TIMESTAMP(6))",[version,cycle,actorId]);
  await db.execute('INSERT INTO payout_requirements(cycle_version_id,definition_version_id,allow_waiver) VALUES(?,?,0)',[version,protectedPolicy.id]);
  const protectedManifest=await policyResetManifest(db,[protectedPolicy.definitionId]);
  await assert.rejects(resetUnusedPolicies(db,{...reset,commandId:randomUUID(),definitionIds:[protectedPolicy.definitionId],expectedHash:protectedManifest.hash}),{code:'POLICY_IN_USE'});
 }finally{db.release();}
 console.log('PASS Historical calendar: authorization, stale revisions, overlap, retries, audit rollback and working-year preservation; unused policy deletion, protected payroll rejection and removed-command replay');
}
