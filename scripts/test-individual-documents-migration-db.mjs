import {settlementMigration,legacySettlementRows} from './settlement-test-boundary.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {localAdmin,applyMigrations} from './migration-lib.mjs';
import {createBackup,restoreBackup,loadKey} from './backup-lib.mjs';
import {documentMigration,stripEmptyDocumentFixture} from './document-test-boundary.mjs';
const folder=process.env.LDSS_P06_OUTPUT??'output/p06-documents-20261022';await mkdir(folder,{recursive:true});
const key=await loadKey(),backup=await createBackup(key),restored=await restoreBackup(backup.file,key,{keep:true}),metadata=JSON.parse(await readFile(restored.reportFile,'utf8')),db=await localAdmin();
assert.match(restored.target,/^ldss_restore_\d+_[a-f\d]{8}$/);assert.match(metadata.definerAccount,/^ldss_r_[a-f\d]{16}$/);
const sha=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
try{
 await db.changeUser({database:restored.target});await stripEmptyDocumentFixture(db,restored.target);
 const [old]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(old.length,60);
 const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migrations' ORDER BY TABLE_NAME");
 const before=new Map();for(const {name} of tables){assert.match(name,/^[a-z_]+$/);before.set(name,sha(legacySettlementRows(name,(await db.query(`SELECT * FROM \`${name}\``))[0])));}
 const sql=await readFile(new URL('../db/migrations/'+documentMigration,import.meta.url),'utf8');
 await db.query(sql.split(/\r?\n-- statement-break\r?\n/)[0]);
 await assert.rejects(applyMigrations(db,{through:settlementMigration}),e=>e.code==='ER_DUP_KEYNAME');assert.equal((await db.query('SELECT version FROM schema_migrations'))[0].length,60);
 await stripEmptyDocumentFixture(db,restored.target);
 const start=performance.now();assert.deepEqual(await applyMigrations(db,{through:settlementMigration}),[documentMigration,settlementMigration]);const ms=performance.now()-start;
 assert.deepEqual(await applyMigrations(db,{through:settlementMigration}),[]);
 for(const [name,hash] of before)assert.equal(sha(legacySettlementRows(name,(await db.query(`SELECT * FROM \`${name}\``))[0])),hash,'Preserve '+name);
 const [current]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(current.length,62);assert.deepEqual(current.slice(0,60),old);
 for(const table of ['individual_document_versions','individual_document_contents'])assert.equal(Number((await db.query(`SELECT COUNT(*) n FROM ${table}`))[0][0].n),0);
 await writeFile(folder+'/migration.json',JSON.stringify({at:new Date().toISOString(),backup,restored,from:60,to:62,ms,businessTablesPreserved:before.size,priorChecksumsPreserved:true,interruptedDdlRejected:true,partialMigrationNotJournaled:true,retryAppliedZero:true,emptyFixtureOnlyReverseSetup:true},null,2));
 console.log('PASS P06 restored 60→62 upgrade, prior row/checksum preservation, interrupted-DDL containment, exact retry and verified restore');
}finally{await db.changeUser({database:process.env.DB_NAME});await db.query(`DROP DATABASE \`${restored.target}\``);await db.query(`DROP USER ${db.escape(metadata.definerAccount)}@'localhost'`);await db.end();}
