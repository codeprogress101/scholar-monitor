/** PAY-TIME-4: single-authorization administrative procedure; no HTTP route or runtime grant. */
import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,sep} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import mysql,{type Pool,type RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {AuthorizationService} from '../server/authorization/service.js';
import {AuthService,AuthError} from '../server/auth/service.js';
import {digest,validToken} from '../server/auth/crypto.js';
import {loadConfig} from '../server/config.js';
import {currentPayout} from '../server/payouts/service.js';
import {cutoffRule} from '../server/payouts/cutoff-source.js';
import {schemaReady} from '../server/schema-readiness.js';

export const syntheticTimes=['12:00:00','15:00:00','17:00:00','19:00:00','23:59:00'] as const;
export const authorizationSha256='7f9a4080914646064a7511c9190cbc039e0f2da1fa743c13b2af85581f6323f4';
export const authorizationSource='output/pay-time-4-primary-20261027/authorization.txt';
const cycleId='829ae3dc-9b49-4d88-9dfe-0a7250b164c0';
const primary='ldss_primary_test_12676_61497616';
const f57='b818ddafd1a38b91b421b6df0bcef9d1b8f7453b97635502afa8dd460946b71e';
const operation='payroll.cutoff.synthetic-uat.record';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const requestSchema=z.object({
 kind:z.literal('synthetic_uat_test'),officeApproval:z.literal(false),
 targetKind:z.enum(['primary-synthetic','owned-disposable']),database:z.string(),runtimeUser:z.string(),
 cycleId:z.literal(cycleId),commandId:z.uuid(),actorId:z.uuid(),expectedActorVersion:z.number().int().positive(),
 expectedCycleVersion:z.number().int().positive(),expectedDeadlineRevision:z.number().int().positive(),
 expectedWindowSequence:z.number().int().nonnegative(),expectedRuleRevision:z.literal(0),
 validFrom:z.iso.date(),validThrough:z.iso.date(),timeZone:z.literal('Asia/Manila'),
 permittedTimes:z.tuple([z.literal('12:00:00'),z.literal('15:00:00'),z.literal('17:00:00'),z.literal('19:00:00'),z.literal('23:59:00')]),
 defaultLocalTime:z.literal('17:00:00'),boundaryRule:z.literal('inclusive_microsecond_v1'),
 authorizationSha256:z.literal(authorizationSha256),authorizationSource:z.literal(authorizationSource),
 procedureSha256:z.string().regex(/^[a-f0-9]{64}$/),
 operator:z.object({principal:z.string().min(3).max(100),sid:z.string().regex(/^S-1-/).max(100),hostname:z.literal('DESKTOP-BPLJKRP')}).strict(),
}).strict();
export function parseSyntheticRuleRequest(raw:unknown){
 const r=requestSchema.parse(raw);
 if(r.validFrom>r.validThrough)throw new AuthError(422,'INVALID_SCOPE','The test validity range is reversed.');
 if(r.targetKind==='primary-synthetic'?(r.database!==primary||r.runtimeUser!=='ldss_primary_12676_61497616'):(!/^ldss_restore_\d+_[a-f0-9]{8}$/.test(r.database)||!/^ldss_pt4_[a-f0-9]{12}$/.test(r.runtimeUser)))throw new AuthError(403,'TARGET_DENIED','Only the exact primary synthetic target or a verified task-owned restore is supported.');
 return r;
}
export function realOperator(){
 const text=execFileSync('whoami.exe',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true}).trim();
 const match=/^"([^"]+)","(S-1-[^"]+)"$/.exec(text);
 if(!match||process.env.COMPUTERNAME!=='DESKTOP-BPLJKRP')throw new AuthError(403,'OPERATOR_UNAVAILABLE','Cannot verify the local Windows operator.');
 return {principal:match[1],sid:match[2],hostname:'DESKTOP-BPLJKRP' as const};
}
export async function procedureHash(){return sha(await readFile(fileURLToPath(import.meta.url)));}
export async function recordSyntheticRule(admin:Pool,runtime:Pool,raw:unknown,token:string,idleMinutes:number,absoluteHours:number){
 const r=parseSyntheticRuleRequest(raw),operator=realOperator();
 if(JSON.stringify(r.operator)!==JSON.stringify(operator)||r.procedureSha256!==await procedureHash()||sha(await readFile(r.authorizationSource))!==authorizationSha256)throw new AuthError(409,'PROCEDURE_SOURCE_CHANGED','Operator, reviewed procedure or authorization source changed.');
 if(!validToken(token))throw new AuthError(401,'AUTH_REQUIRED','A current authenticated operator session is required.');
 const [[runtimeIdentity]]=await runtime.query<RowDataPacket[]>('SELECT DATABASE() name,CURRENT_USER() account');
 if(runtimeIdentity.name!==r.database||runtimeIdentity.account!==r.runtimeUser+'@localhost')throw new AuthError(403,'TARGET_DENIED','Runtime identity differs from the confirmed target.');
 const session=await new AuthService(runtime,idleMinutes,absoluteHours).session(token,false);
 if(session.user.id!==r.actorId)throw new AuthError(403,'ACTOR_CHANGED','The confirmed actor differs from the authenticated session.');
 const payloadHash=digest(JSON.stringify(r));
 return new AuthorizationService(admin).withPermission(r.actorId,'payroll.windows.manage',async(db,actor)=>{
  const [[identity]]=await db.query<RowDataPacket[]>('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname,@@port port');
  if(identity.name!==r.database||identity.hostname!==operator.hostname||identity.port!==3306||identity.account!=='root@localhost')throw new AuthError(403,'TARGET_DENIED','Administrative connection does not match the reviewed local target.');
  const [[active]]=await db.execute<RowDataPacket[]>('SELECT user_id FROM auth_sessions WHERE token_hash=? AND user_id=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(6) AND TIMESTAMPADD(MINUTE,?,last_seen_at)>UTC_TIMESTAMP(6) FOR UPDATE',[digest(token),r.actorId,idleMinutes]);
  if(!active)throw new AuthError(401,'SESSION_EXPIRED','The recording session is no longer current. Keep the exact command for recovery.');
  const [[retry]]=await db.execute<RowDataPacket[]>('SELECT operation,payload_hash,result FROM workflow_commands WHERE actor_id=? AND command_id=? FOR UPDATE',[r.actorId,r.commandId]);
  if(retry){if(retry.operation!==operation||retry.payload_hash!==payloadHash)throw new AuthError(409,'IDEMPOTENCY_CONFLICT','This key was used with different configuration evidence.');return typeof retry.result==='string'?JSON.parse(retry.result) as Record<string,unknown>:retry.result as Record<string,unknown>;}
  if(actor.version!==r.expectedActorVersion)throw new AuthError(409,'VERSION_CONFLICT','Operator authority changed; review before a new recording.');
  const [journal]=await db.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations');
  const [settings]=await db.query<(RowDataPacket&{code:string;setting_value:string})[]>("SELECT code,setting_value FROM system_settings WHERE code='PAYROLL_SIGNATORIES' AND archived_at IS NULL");
  if(!schemaReady(journal as (RowDataPacket&{version:string;checksum:string})[],settings)||journal.length!==67||journal.find(x=>x.version==='20261027010000_f57_payroll_cutoff_policy.sql')?.checksum!==f57)throw new AuthError(409,'SCHEMA_UNAVAILABLE','The exact accepted 67-migration foundation is required.');
  const [privileges]=await db.execute<RowDataPacket[]>('SELECT PRIVILEGE_TYPE,IS_GRANTABLE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=? AND TABLE_NAME=\'payroll_cutoff_rule_versions\'',["'"+r.runtimeUser+"'@'localhost'",r.database]);
  if(privileges.length!==1||privileges[0].PRIVILEGE_TYPE!=='SELECT'||privileges[0].IS_GRANTABLE!=='NO')throw new AuthError(403,'GRANT_BOUNDARY_CHANGED','Runtime policy access must remain SELECT only.');
  const cycle=await currentPayout(db,r.cycleId);
  const [[deadline]]=await db.execute<RowDataPacket[]>("SELECT revision,DATE_FORMAT(deadline_on,'%Y-%m-%d') day FROM semester_submission_versions WHERE cycle_id=? ORDER BY revision DESC LIMIT 1 FOR UPDATE",[r.cycleId]);
  const [[sequence]]=await db.execute<RowDataPacket[]>('SELECT COALESCE(MAX(batch_number),0) n FROM payroll_submission_windows WHERE cycle_id=?',[r.cycleId]);
  const [[clock]]=await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') now,DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%d %H:%i:%s.%f') sqlNow,DATE_FORMAT(UTC_TIMESTAMP(6)+INTERVAL 8 HOUR,'%Y-%m-%d') today");
  if(cycle.version!==r.expectedCycleVersion||cycle.state!=='open'||cycle.periodUnavailable||!deadline||deadline.revision!==r.expectedDeadlineRevision||Number(sequence.n)!==r.expectedWindowSequence)throw new AuthError(409,'SOURCE_CHANGED','The current cycle, window sequence or deadline differs from the reviewed scope.');
  if(r.validFrom!==clock.today||r.validThrough!==deadline.day)throw new AuthError(409,'SCOPE_CHANGED','Validity must be limited to the observed current Manila day through the existing semester deadline.');
  const [existing]=await db.execute<RowDataPacket[]>('SELECT revision FROM payroll_cutoff_rule_versions WHERE cycle_id=? FOR UPDATE',[r.cycleId]);
  if(existing.length)throw new AuthError(409,'RULE_ALREADY_CONFIGURED','An existing rule requires separate review; no duplicate or overlapping rule will be added.');
  const reference='SYNTHETIC UAT ONLY / PAY-TIME-4 user authorization / NO office approval / default 17:00';
  await db.execute('INSERT INTO payroll_cutoff_rule_versions(cycle_id,revision,permitted_times,valid_from,valid_through,time_zone,boundary_rule,authority_reference,source_location,approved_by,approved_at,recorded_at) VALUES(?,1,?,?,?,?,?,?,?,?,?,?)',[r.cycleId,JSON.stringify(r.permittedTimes),r.validFrom,r.validThrough,r.timeZone,r.boundaryRule,reference,r.authorizationSource+'#sha256='+authorizationSha256,r.actorId,clock.sqlNow,clock.sqlNow]);
  const recorded=await cutoffRule(db,r.cycleId,1);
  if(!recorded)throw new AuthError(409,'RULE_READ_FAILED','The recorded rule could not be verified.');
  const auditId=randomUUID(),result={cycleId:r.cycleId,revision:1,ruleHash:recorded.hash,rule:recorded.rule,defaultLocalTime:r.defaultLocalTime,kind:r.kind,officeApproval:false,authorizationRecordedAt:clock.now,auditId};
  await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES(?,'payroll.cutoff.synthetic-uat','payout_cycle',?,'record-synthetic-rule',?,'user',?,?,?,'User-authorized synthetic UAT configuration; no office financial-policy approval',?)",[auditId,r.cycleId,r.actorId,operator.principal+' / '+operator.sid,clock.sqlNow,r.commandId,JSON.stringify({before:[],after:result,request:r,operator:{...operator,databaseAccount:identity.account},authorization:{kind:'user_instruction_for_synthetic_uat',source:r.authorizationSource,sha256:authorizationSha256,recordedAt:clock.now,originalUserDecisionTimestamp:'not independently supplied'},approvedByMeaning:'Authenticated recording actor acting under the explicit synthetic user authorization, not a Scholarship Office approver',physicalReceiptEvidenceChanged:false})]);
  await db.execute('INSERT INTO workflow_commands(actor_id,command_id,operation,payload_hash,result,recorded_at) VALUES(?,?,?,?,?,?)',[r.actorId,r.commandId,operation,payloadHash,JSON.stringify(result),clock.sqlNow]);
  return result;
 });
}

async function cli(){
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--command')throw new Error('Usage: node --import tsx scripts/record-synthetic-cutoff-rule.ts --command <restricted command file>');
 const command=JSON.parse(await readFile(args[1],'utf8')) as {request:unknown;sessionFile:string;targetFile:string;resultFile:string};
 const r=parseSyntheticRuleRequest(command.request),f='output/pay-time-4-primary-20261027/private/';
 for(const p of[args[1],command.sessionFile,command.targetFile,command.resultFile])if(!resolve(p).startsWith(resolve(f)+sep))throw new Error('Use only this task’s restricted command/credential directory.');
 const target=JSON.parse(await readFile(command.targetFile,'utf8')) as {database:string;user:string;password:string;owned?:boolean;restoreReportFile?:string};
 if(target.database!==r.database||target.user!==r.runtimeUser)throw new Error('Target file differs from reviewed request.');
 if(r.targetKind==='owned-disposable'){if(!target.owned||!target.restoreReportFile)throw new Error('Owned restore evidence required.');const proof=JSON.parse(await readFile(target.restoreReportFile,'utf8')) as {target:string;verified:boolean;retained:boolean};if(!proof.verified||!proof.retained||proof.target!==r.database)throw new Error('Owned restore verification failed.');}
 else{const profile=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/running-profile.json','utf8')) as {profile:string;controllerPid:number};if(profile.profile!=='synthetic')throw new Error('Primary synthetic launcher required.');const line=execFileSync('powershell.exe',['-NoProfile','-Command',`(Get-CimInstance Win32_Process -Filter 'ProcessId=${profile.controllerPid}').CommandLine`],{encoding:'utf8',windowsHide:true});if(!line.includes('scripts/localhost-5173-profile.mjs synthetic'))throw new Error('Unexpected primary launcher.');}
 const s=JSON.parse(await readFile(command.sessionFile,'utf8')) as {cookie:string};const token=s.cookie.startsWith('ldss_session=')?s.cookie.slice('ldss_session='.length):'';
 const config=loadConfig(process.env),admin=mysql.createPool({host:'127.0.0.1',port:3306,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD,database:r.database,timezone:'Z',connectionLimit:2}),runtime=mysql.createPool({host:'127.0.0.1',port:3306,user:target.user,password:target.password,database:r.database,timezone:'Z',connectionLimit:2});
 try{const result=await recordSyntheticRule(admin,runtime,r,token,config.SESSION_IDLE_MINUTES,config.SESSION_ABSOLUTE_HOURS);await writeFile(command.resultFile,JSON.stringify(result,null,2));process.stdout.write(JSON.stringify({recorded:true,syntheticOnly:true,resultFile:command.resultFile})+'\n');}finally{await admin.end();await runtime.end();}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)void cli().catch(e=>{process.stderr.write(JSON.stringify({code:e instanceof AuthError?e.code:'OPERATOR_PROCEDURE_FAILED',message:e instanceof AuthError?e.message:'Procedure failed; preserve the exact command and review the restricted evidence before retrying.'})+'\n');process.exitCode=1;});
