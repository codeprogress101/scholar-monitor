import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {createConnection} from 'node:net';
import mysql from 'mysql2/promise';
const hash=v=>createHash('sha256').update(v).digest('hex');
const database='ldss_primary_test_12676_61497616',runtime='ldss_primary_12676_61497616';
/** Explicit AP5 exception for this one synthetic primary. No generic force option. */
export async function preflightPrimaryGraduation(db,proof){
 assert.equal(proof?.authorization,'A6_2_AP5_PRIMARY_20261024');
 assert.equal(proof.database,database);assert.equal(proof.runtimeUser,runtime);assert.equal(proof.pid,process.pid);
 const [[actual]]=await db.query('SELECT DATABASE() name,@@hostname hostname,@@port port');
 assert.equal(actual.name,database);assert.equal(actual.hostname,hostname());assert.equal(Number(actual.port),3306);
 assert.equal(proof.serverHostname,actual.hostname);assert.equal(proof.port,3306);
 const manifest=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/primary.json','utf8'));
 assert.equal(manifest.database,database);assert.equal(manifest.runtimeUser,runtime);assert.equal(manifest.state,'verified');assert.equal(manifest.origin,'http://127.0.0.1:5173');assert.equal(manifest.ownerDigest,proof.ownerDigest);
 const credentials=JSON.parse(await readFile('output/5173-synthetic-primary-20261024/private/primary-credentials.json','utf8'));
 const runtimeDb=await mysql.createConnection({host:'127.0.0.1',port:3306,database,user:runtime,password:credentials.runtimePassword});
 try{const [[identity]]=await runtimeDb.query('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname');assert.equal(identity.name,database);assert.equal(identity.account,runtime+'@localhost');assert.equal(identity.hostname,actual.hostname);}finally{await runtimeDb.end();}
 for(const port of [3001,5173])await new Promise((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();reject(new Error('AP5 requires the main profile stopped'));});socket.once('error',e=>{socket.destroy();if(e.code==='ECONNREFUSED')resolve();else reject(e);});socket.setTimeout(3000,()=>{socket.destroy();reject(new Error('Cannot verify maintenance ports'));});});
 const [journal]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(journal.length,63);assert.equal(hash(JSON.stringify(journal)),proof.migrationsSha256);
 for(const migration of journal)assert.equal(hash(await readFile('db/migrations/'+migration.version)),migration.checksum);
 assert.equal(hash(await readFile('db/migrations/20261024020000_f54_graduation_monitoring.sql')),'31f507ee9ca5358ec6a64bb667ba6ef4055abb8d83bd486a67b7bdd23a0d8d66');
 const accepted=JSON.parse(await readFile('output/ap5-b3b-20261024/accepted-package.json','utf8'));
 assert.deepEqual(proof.sourceFiles.map(f=>f.path).sort(),[...accepted.changes.map(f=>f.path),'scripts/primary-graduation-preflight.mjs'].sort());
 for(const file of proof.sourceFiles)assert.equal(hash(await readFile(file.path)),file.sha256,'Promoted source changed: '+file.path);
 assert.equal(hash(await readFile('.env')),proof.environmentSha256);
 assert.equal(proof.runtimeAccount,runtime+'@localhost');
 return actual;
}
