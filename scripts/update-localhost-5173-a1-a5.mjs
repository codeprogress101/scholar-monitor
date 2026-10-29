import 'dotenv/config';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createConnection} from 'node:net';
import {applyMigrations} from './migration-lib.mjs';
import {preflightAnnualIntakes} from './annual-intake-preflight.mjs';
import {inventory} from './backup-lib.mjs';
const folder='output/a1-a5-localhost-5173-20261024',version='20261024010000_f53_annual_intake_registration.sql',mode=process.argv[2]??'preflight';
assert.ok(['preflight','apply','verify'].includes(mode),'No reset, restore or arbitrary target operation');
assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.equal(process.env.DB_USER,'ldss_monitor_local');assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
const proof=JSON.parse(await readFile(folder+'/backup-verified.json','utf8')),before=JSON.parse(await readFile(folder+'/database-before.json','utf8')),target=JSON.parse(await readFile(folder+'/target-before.json','utf8'));
const hash=v=>createHash('sha256').update(v).digest('hex');
const base={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:proof.database,timezone:'Z'};
const runtime=await mysql.createConnection({...base,user:process.env.DB_USER,password:process.env.DB_PASSWORD}),db=await mysql.createConnection({...base,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??''});
const quiet=port=>new Promise((resolveQuiet,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(new Error(`Stop the identified main UAT listener on ${port} before schema work`));});socket.once('error',error=>{socket.destroy();if(error.code==='ECONNREFUSED')resolveQuiet();else reject(error);});socket.setTimeout(3000,()=>{socket.destroy();reject(new Error('Cannot verify local maintenance ports'));});});
async function compareData(){
 const after=await inventory(db),special=['scholar_intakes','schema_migrations','permissions','role_permissions'],changed=[];
 for(const prior of before.tables){const current=after.tables.find(t=>t.name===prior.name);assert.ok(current,prior.name);if(special.includes(prior.name))continue;assert.deepEqual(current,prior,prior.name+' business data must remain exact');}
 const predicates={scholar_intakes:'',schema_migrations:` WHERE version<>${db.escape(version)}`,permissions:" WHERE code<>'scholars.intakes.correct'",role_permissions:" WHERE NOT(role_code='coordinator' AND permission_code='scholars.intakes.correct')"};
 for(const table of special){const columns=before.columns.filter(c=>c.TABLE_NAME===table).sort((a,b)=>a.ORDINAL_POSITION-b.ORDINAL_POSITION).map(c=>'`'+c.COLUMN_NAME+'`').join(',');const [rows]=await db.query({sql:`SELECT ${columns} FROM \`${table}\`${predicates[table]}`,rowsAsArray:true,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});assert.equal(hash(rows.map(r=>hash(JSON.stringify(r))).sort().join('\n')),before.tables.find(t=>t.name===table).checksum,table+' original values');changed.push(table);}
 const [[extra]]=await db.query("SELECT COUNT(*) n FROM scholar_intakes WHERE origin_kind<>'import' OR source_reference IS NOT NULL");assert.equal(Number(extra.n),0,'No manual intake/backfill may be inserted by the update');
 const newTables=['scholar_intake_revisions','annual_intake_commands'];for(const table of newTables){const [[row]]=await db.query('SELECT COUNT(*) n FROM `'+table+'`');assert.equal(Number(row.n),0);}
 // All unaffected definitions are exact; only the approved root DDL/new tables differ.
 for(const section of ['columns','indexes','constraints','foreignKeys','rules','checks','triggers','views']){
  const exclude=r=>!['scholar_intakes',...newTables].includes(r.TABLE_NAME??r.EVENT_OBJECT_TABLE);
  assert.deepEqual(after[section].filter(exclude),before[section].filter(exclude),section+' outside F53');
 }
 await writeFile(folder+'/database-after-migration.json',JSON.stringify(after,null,2));
 return {allOriginalRowsExact:true,newTablesEmpty:true,affectedTables:changed,allOtherDefinitionsExact:true};
}
try{
 const [[identity]]=await runtime.query('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname,@@port port');assert.equal(identity.name,proof.database);assert.equal(identity.account,proof.runtimeIdentity);assert.equal(identity.hostname,proof.serverHostname);assert.equal(identity.port,proof.port);
 const [rows]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');for(const row of rows)assert.equal(hash(await readFile('db/migrations/'+row.version)),row.checksum);
 const existing=rows.some(r=>r.version===version);assert.equal(rows.length,existing?63:62);assert.deepEqual(rows.slice(0,62),target.migrations.map(({version,checksum})=>({version,checksum})));
 let preflight={alreadyApplied:existing};
 if(!existing){
  await quiet(3001);await quiet(5173);
  const [[permission]]=await db.query("SELECT COUNT(*) n FROM permissions WHERE code='scholars.intakes.correct'");assert.equal(Number(permission.n),0,'Unexpected pre-existing permission; investigate without rewriting');
  preflight=await preflightAnnualIntakes(db,proof);await writeFile(folder+'/preflight.json',JSON.stringify(preflight,null,2));
 }
 if(mode==='preflight'){assert.equal(existing,false,'Use verify for an already applied target');console.log(JSON.stringify(preflight));}
 else{
  if(mode==='apply'&&!existing){assert.deepEqual(await applyMigrations(db,{localUatReview:proof}),[version]);}
  else assert.equal(existing,true,'Verify never applies schema');
  const preserved=await compareData();
  if(mode==='apply')for(const table of ['scholar_intake_revisions','annual_intake_commands'])await db.query(`GRANT SELECT,INSERT ON \`ldss_scholar_monitor_dev\`.\`${table}\` TO 'ldss_monitor_local'@'localhost'`);
  for(const table of ['scholar_intake_revisions','annual_intake_commands']){
   await runtime.query(`SELECT * FROM ${table} LIMIT 0`);
   await runtime.query(`EXPLAIN INSERT INTO ${table} SELECT * FROM ${table} WHERE 1=0`);
   await assert.rejects(runtime.query(`EXPLAIN UPDATE ${table} SET recorded_at=recorded_at WHERE 1=0`),/denied/);await assert.rejects(runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),/denied/);
  }
  const [grants]=await runtime.query('SHOW GRANTS');const text=grants.map(r=>Object.values(r)[0]).join('\n');assert.doesNotMatch(text,/GRANT (?:ALL|CREATE|ALTER|DROP)|WITH GRANT OPTION/);
  const [roles]=await db.query("SELECT role_code,permission_code FROM role_permissions WHERE permission_code='scholars.intakes.correct'");assert.deepEqual(roles,[{role_code:'coordinator',permission_code:'scholars.intakes.correct'}]);
  await writeFile(folder+'/runtime-grants-after.json',JSON.stringify(grants,null,2));const result={mode,identity,migration:version,migrations:63,preserved,narrowPrivilegesVerified:true,coordinatorOnlyPermission:true};await writeFile(folder+`/${mode}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }
}finally{await runtime.end();await db.end();}
