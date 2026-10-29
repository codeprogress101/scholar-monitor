/** DB-COMPAT-1 isolated transfer v1. Not a primary migration or backup-format change. */
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {inventory,run} from '../backup-lib.mjs';
export const originalExpression="coalesce(`semester_id`,'00000000-0000-0000-0000-000000000000')";
export const compatibleExpression="coalesce(rtrim(`semester_id`),'00000000-0000-0000-0000-000000000000')";
const sha=x=>createHash('sha256').update(x).digest('hex');
export const expressionChanges=[
 ['graduation_monitoring_cases','scope_key',originalExpression,compatibleExpression],
 ['individual_payment_transactions','request_entitlement',"if(`source_kind` = 'unclaimed' and `replacement_of` is null,`entitlement_id`,NULL)","if(`source_kind` = 'unclaimed' and `replacement_of` is null,rtrim(`entitlement_id`),NULL)"],
 ['individual_payment_transactions','omission_request',"if(`source_kind` = 'omitted' and `replacement_of` is null,`omission_id`,NULL)","if(`source_kind` = 'omitted' and `replacement_of` is null,rtrim(`omission_id`),NULL)"],
 ['payroll_reconciliation_events','original_closure_batch',"case when `kind` = 'closed' then `batch_id` else NULL end","case when `kind` = 'closed' then rtrim(`batch_id`) else NULL end"],
 ['requirement_checklists','context_key',"if(`payout_cycle_id` is null,concat('S:',`semester_id`),concat('P:',`payout_cycle_id`))","if(rtrim(`payout_cycle_id`) is null,concat('S:',rtrim(`semester_id`)),concat('P:',rtrim(`payout_cycle_id`)))"],
];
export function adaptPayload(payload,{expectedTableCount=150}={}){
 assert.equal(payload.version,1);assert.equal(sha(payload.sql),payload.sqlHash);assert.ok([148,150].includes(expectedTableCount));assert.equal(payload.inventory.tables.length,expectedTableCount);
 let sql=payload.sql;const expected=structuredClone(payload.inventory),changes=[];
 for(const [table,column,before,after]of expressionChanges){
  const c=expected.columns.filter(x=>x.TABLE_NAME===table&&x.COLUMN_NAME===column);assert.equal(c.length,1);assert.equal(c[0].GENERATION_EXPRESSION,before);assert.equal(c[0].COLLATION_NAME,'ascii_bin');
  const begin=sql.indexOf('CREATE TABLE `'+table+'` (');assert.ok(begin>=0);const end=sql.indexOf(';',begin);assert.ok(end>begin);
  const ddl=sql.slice(begin,end+1),lines=ddl.split(/\r?\n/),matching=lines.filter(l=>l.startsWith('  `'+column+'` ')&&l.includes('GENERATED ALWAYS AS ('+before+')'));
  assert.equal(matching.length,1,'One exact generated declaration required');const line=matching[0],replacement=ddl.replace(line,line.replace(' AS ('+before+')',' AS ('+after+')'));
  sql=sql.slice(0,begin)+replacement+sql.slice(end+1);c[0].GENERATION_EXPRESSION=after;
  changes.push({table,column,before,after,originalDdlSha256:sha(ddl),compatibleDdlSha256:sha(replacement)});
 }
 return{sql,expected,proof:{adapter:'DB-COMPAT-1/v1',originalSqlHash:payload.sqlHash,onlyFiveGeneratedDeclarationsChanged:true,changes}};
}
export async function transfer(payload,{admin,mysqlTool,expectedDatadir,onInventory,runTool=run}){
 assert.equal(admin.host,'127.0.0.1');assert.equal(admin.port,3337);assert.match(expectedDatadir,/db-compat-1-20261028[\\/]runtime-one[\\/]data[\\/]?$/i);
 const db=await mysql.createConnection(admin);const[[v]]=await db.query('SELECT @@version version,@@port port,@@datadir datadir');assert.match(v.version,/^11\.4\.13-/);assert.equal(v.port,3337);assert.equal(v.datadir.replaceAll('\\','/').toLowerCase(),expectedDatadir.replaceAll('\\','/').toLowerCase());
 const adapted=adaptPayload(payload),target='ldss_dbc1_transfer_'+randomBytes(8).toString('hex'),user='ldss_dbc1_d_'+randomBytes(6).toString('hex'),password=randomBytes(32).toString('base64url'),account=db.escape(user)+"@'localhost'";let created=false,userCreated=false,verified=false;
 try{await db.query('CREATE DATABASE `'+target+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');created=true;await db.query('CREATE USER '+account+' IDENTIFIED BY '+db.escape(password));userCreated=true;await db.query('GRANT ALL PRIVILEGES ON `'+target+'`.* TO '+account);
 const sql=adapted.sql.replace(/^\/\*!\d{5}[^\r\n]*$/gm,line=>line.replace(/DEFINER=`(?:[^`]|``)*`@`(?:[^`]|``)*`/g,'DEFINER=CURRENT_USER'));
 await runTool(mysqlTool,['--no-defaults','--host=127.0.0.1','--port=3337','--user='+user,'--default-character-set=utf8mb4','--binary-mode','--local-infile=0',target],{input:sql,password});
 const restored=await mysql.createConnection({...admin,database:target,jsonStrings:true});let state;try{state=await inventory(restored);await onInventory?.(state,adapted.expected,restored);const differences=Object.keys(state).filter(k=>JSON.stringify(state[k])!==JSON.stringify(adapted.expected[k]));assert.deepEqual(differences,[],'Unreviewed target inventory difference');}finally{await restored.end();}
 verified=true;return{target,user,password,owned:true,state,proof:adapted.proof};
 }finally{try{if(!verified){if(created)await db.query('DROP DATABASE `'+target+'`');if(userCreated)await db.query('DROP USER '+account);}}finally{await db.end();}}
}
