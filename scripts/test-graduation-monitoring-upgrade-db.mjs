import 'dotenv/config';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {createBackup,restoreBackup,unseal,inventory,run} from './backup-lib.mjs';
import {applyMigrations,grantAuthRuntime} from './migration-lib.mjs';
import {preflightGraduationMonitoring,graduationTables} from './graduation-monitoring-preflight.mjs';
const folder=resolve(process.env.LDSS_GRADUATION_UAT_OUTPUT??'output/a6-2-implementation-20261024'),privateDir=folder+'/private';
await assert.rejects(access(folder+'/fixture.json'),'Existing fixture must never be overwritten');await mkdir(privateDir,{recursive:true});
execFileSync('icacls',[privateDir,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,'SYSTEM:(OI)(CI)F'],{stdio:'ignore'});
assert.equal(process.env.APP_ENV,'development');assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
const source='ldss_primary_test_12676_61497616',suffix=`${process.pid}_${randomBytes(4).toString('hex')}`;
const m={database:`ldss_graduation_test_${suffix}`,runtimeUser:`ldss_gra_${suffix}`,definerUser:`ldss_gd_${randomBytes(8).toString('hex')}`,source,pid:process.pid,origin:'http://127.0.0.1:'+String(process.env.LDSS_GRADUATION_UAT_PORT??3014),port:Number(process.env.LDSS_GRADUATION_UAT_PORT??3014),scope:'A6.2 AP1-AP4 isolated candidate; AP5 excluded',state:'preparing'};
const secret={runtimePassword:randomBytes(32).toString('base64url'),definerPassword:randomBytes(32).toString('base64url')};
const save=(name,v)=>writeFile(folder+'/'+name,JSON.stringify(v,null,2));await save('fixture.json',m);await save('private/runtime.json',secret);
assert.ok([3014,3015].includes(m.port));assert.ok(folder===resolve('output/a6-2-implementation-20261024')||folder.startsWith(resolve('output/a6-2-implementation-20261024')+'/')||folder.startsWith(resolve('output/a6-2-implementation-20261024')+'\\'));
const admin={host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
const digest=v=>createHash('sha256').update(v).digest('hex'),backups={};
async function backup(database,label){const key=randomBytes(32);await writeFile(privateDir+'/'+label+'.key',key,{flag:'wx'});const result=await createBackup(key,{connection:{...admin,database},args:['--no-defaults','--host=127.0.0.1',`--port=${admin.port}`,'--user=root','--default-character-set=utf8mb4'],directory:privateDir+'/'+label});const bytes=await readFile(result.file),payload=unseal(bytes,key,database),restored=await restoreBackup(result.file,key,{context:{admin,sourceDatabase:database,directory:privateDir+'/'+label}}),reportBytes=await readFile(restored.reportFile),report=JSON.parse(reportBytes);assert.equal(report.verified,true);assert.equal(report.retained,false);const entry={database,backupFile:result.file,backupSha256:digest(bytes),restoreReport:restored.reportFile,restoreReportSha256:digest(reportBytes),inventorySha256:digest(JSON.stringify(payload.inventory)),verified:true,temporaryRestoreRemoved:true,verifiedAt:new Date().toISOString(),pid:process.pid,authorization:'A6_2_AP1_AP4_ISOLATED'};backups[label]=entry;await save('backups.json',backups);console.log(JSON.stringify({backup:label,verified:true,tables:payload.inventory.tables.length}));return {entry,payload};}
const {payload}=await backup(source,'source-readonly');const db=await mysql.createConnection(admin);
try{
 const [[server]]=await db.query('SELECT @@hostname hostname,@@port port');assert.equal(server.hostname,process.env.COMPUTERNAME);assert.equal(server.port,3306);
 await db.query(`CREATE DATABASE \`${m.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 await db.query(`CREATE USER ${db.escape(m.definerUser)}@'localhost' IDENTIFIED BY ${db.escape(secret.definerPassword)}`);await db.query(`GRANT ALL PRIVILEGES ON \`${m.database}\`.* TO ${db.escape(m.definerUser)}@'localhost'`);
 let sql=payload.sql;for(const table of ['auth_sessions','password_resets','auth_rate_limits'])sql=sql.replace(new RegExp('^INSERT INTO `'+table+'` [^\\r\\n]*$','gm'),'');sql=sql.replace(/^\/\*!\d{5}[^\r\n]*$/gm,line=>line.replace(/DEFINER=`(?:[^`]|``)*`@`(?:[^`]|``)*`/g,'DEFINER=CURRENT_USER'));
 await run('C:/xampp/mysql/bin/mysql.exe',['--no-defaults','--host=127.0.0.1',`--port=${admin.port}`,`--user=${m.definerUser}`,'--default-character-set=utf8mb4','--binary-mode','--local-infile=0',m.database],{input:sql,password:secret.definerPassword});await db.changeUser({database:m.database});
 const before=await inventory(db);for(const t of payload.inventory.tables)if(!['auth_sessions','password_resets','auth_rate_limits'].includes(t.name))assert.deepEqual(before.tables.find(x=>x.name===t.name),t,t.name);
 const {entry}=await backup(m.database,'before-f54');const proof={...entry,serverHostname:server.hostname,port:server.port};await save('recovery-proof.json',proof);
 const preflight=await preflightGraduationMonitoring(db,proof);assert.deepEqual(await applyMigrations(db,{graduationReview:proof}),['20261024020000_f54_graduation_monitoring.sql']);
 const [migrations]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(migrations.length,64);for(const v of migrations)assert.equal(digest(await readFile(new URL('../db/migrations/'+v.version,import.meta.url))),v.checksum);
 await db.query(`CREATE USER ${db.escape(m.runtimeUser)}@'localhost' IDENTIFIED BY ${db.escape(secret.runtimePassword)}`);await grantAuthRuntime(db,m.database,m.runtimeUser);
 const after=await inventory(db);for(const t of before.tables)if(!['schema_migrations','permissions','role_permissions'].includes(t.name))assert.deepEqual(after.tables.find(x=>x.name===t.name),t,t.name+' changed during F54');for(const table of graduationTables)assert.equal(after.tables.find(t=>t.name===table).count,0);
 const runtime=await mysql.createConnection({...admin,database:m.database,user:m.runtimeUser,password:secret.runtimePassword});try{for(const table of graduationTables){await runtime.query(`SELECT * FROM ${table} LIMIT 0`);await runtime.query(`EXPLAIN INSERT INTO ${table} SELECT * FROM ${table} WHERE 1=0`);await assert.rejects(runtime.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`),/denied/);const col=table==='graduation_commands'?'command_id':table.endsWith('events')?(table.startsWith('program')?'reference_id':'case_id'):'id';await assert.rejects(runtime.query(`EXPLAIN UPDATE ${table} SET ${col}=${col} WHERE 1=0`),/denied/);}await assert.rejects(runtime.query(`SELECT id FROM \`${source}\`.scholars LIMIT 0`),/denied/);await assert.rejects(runtime.query('CREATE TABLE forbidden(id INT)'),/denied/);}finally{await runtime.end();}
 await save('upgrade.json',{passed:true,preflight,migrations:64,oldChecksumsExact:true,oldBusinessTablesExact:true,newTablesEmpty:true,narrowGrants:true});await save('prepared-inventory.json',after);m.state='upgraded';await save('fixture.json',m);await backup(m.database,'upgraded');console.log(JSON.stringify({passed:true,database:m.database,migrations:64,port:m.port}));
}finally{await db.end();}
