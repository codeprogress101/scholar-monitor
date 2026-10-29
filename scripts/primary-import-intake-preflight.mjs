import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {resolve} from 'node:path';
import {createConnection} from 'node:net';
import mysql from 'mysql2/promise';
const hash=v=>createHash('sha256').update(v).digest('hex');
const database='ldss_primary_test_12676_61497616',runtime='ldss_primary_12676_61497616';
export async function preflightPrimaryImportBindings(db,proof){
 assert.equal(proof?.authorization,'A2_1_AP1_PRIMARY_20261025');
 assert.equal(proof.database,database);assert.equal(proof.runtimeUser,runtime);assert.equal(proof.pid,process.pid);
 assert.equal(resolve('.').toLowerCase(),'c:\\xampp\\htdocs\\scholar_monitor');
 const [[actual]]=await db.query('SELECT DATABASE() name,@@hostname hostname,@@port port');assert.equal(actual.name,database);assert.equal(actual.hostname,'DESKTOP-BPLJKRP');assert.equal(actual.hostname,hostname());assert.equal(Number(actual.port),3306);
 const manifest=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/primary.json','utf8'));assert.equal(manifest.database,database);assert.equal(manifest.runtimeUser,runtime);assert.equal(manifest.state,'verified');assert.equal(manifest.ownerDigest,proof.ownerDigest);assert.equal(manifest.origin,'http://127.0.0.1:5173');
 const profile=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/running-profile.json','utf8'));assert.equal(profile.profile,'synthetic');assert.equal(profile.controllerPid,proof.stoppedControllerPid);
 const credentials=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/private/primary-credentials.json','utf8'));const runtimeDb=await mysql.createConnection({host:'127.0.0.1',port:3306,database,user:runtime,password:credentials.runtimePassword});
 try{const [[r]]=await runtimeDb.query('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname');assert.equal(r.name,database);assert.equal(r.account,runtime+'@localhost');assert.equal(r.hostname,actual.hostname);}finally{await runtimeDb.end();}
 for(const port of [3001,5173])await new Promise((done,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(Error('F55 primary upgrade requires verified maintenance ports closed'));});socket.once('error',e=>{socket.destroy();if(e.code==='ECONNREFUSED')done();else reject(e);});socket.setTimeout(3000,()=>{socket.destroy();reject(Error('Cannot verify primary maintenance ports'));});});
 const [journal]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(journal.length,64);assert.equal(hash(JSON.stringify(journal)),proof.migrationsSha256);for(const row of journal)assert.equal(hash(await readFile('db/migrations/'+row.version)),row.checksum);
 assert.equal(hash(await readFile('db/migrations/20261025010000_f55_import_intake_bindings.sql')),'2208ea4522899c666ac6f2c475c1098a86a34a496a593d1bbbb0297b7c0e5f1e');
 const pkg=await readFile('output/a2-1-ap1-primary-20261025/promoted-package.json');assert.equal(hash(pkg),proof.promotedPackageSha256);const expected=JSON.parse(pkg);assert.deepEqual(proof.sourceFiles,expected.files);for(const file of expected.files)assert.equal(hash(await readFile(file.path)),file.sha256,'Promoted source changed: '+file.path);
 assert.equal(hash(await readFile('.env')),proof.environmentSha256);return actual;
}
