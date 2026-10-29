import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAdmin,applyMigrations} from './migration-lib.mjs';
import {createBackup,restoreBackup,loadKey} from './backup-lib.mjs';
import {settlementMigration,stripEmptySettlementFixture,legacySettlementRows} from './settlement-test-boundary.mjs';
const folder=process.env.LDSS_P07_OUTPUT??'output/p07-settlement-20261022';await mkdir(folder,{recursive:true});
const key=await loadKey(),backup=await createBackup(key),db=await localAdmin(),restores=[];
const sha=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
async function restore(){const r=await restoreBackup(backup.file,key,{keep:true}),metadata=JSON.parse(await readFile(r.reportFile,'utf8'));assert.match(r.target,/^ldss_restore_\d+_[a-f\d]{8}$/);assert.match(metadata.definerAccount,/^ldss_r_[a-f\d]{16}$/);restores.push({r,metadata});await db.changeUser({database:r.target});await stripEmptySettlementFixture(db,r.target);return r;}
try{
 await restore();const [old]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(old.length,61);
 const sql=await readFile(new URL('../db/migrations/'+settlementMigration,import.meta.url),'utf8');await db.query(sql.split(/\r?\n-- statement-break\r?\n/)[0]);
 await assert.rejects(applyMigrations(db,{through:settlementMigration}),e=>e.code==='ER_DUP_KEYNAME');assert.equal((await db.query('SELECT version FROM schema_migrations'))[0].length,61);
 // Recovery uses a newly verified restore, not destructive reversal of partial DDL.
 await restore();const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migrations' ORDER BY TABLE_NAME"),before=new Map();
 for(const {name} of tables){assert.match(name,/^[a-z_]+$/);before.set(name,sha(legacySettlementRows(name,(await db.query(`SELECT * FROM ${name}`))[0])));}
 const start=performance.now();assert.deepEqual(await applyMigrations(db,{through:settlementMigration}),[settlementMigration]);const ms=performance.now()-start;assert.deepEqual(await applyMigrations(db,{through:settlementMigration}),[]);
 for(const [name,hash] of before)assert.equal(sha(legacySettlementRows(name,(await db.query(`SELECT * FROM ${name}`))[0])),hash,'Preserve '+name);
 const [after]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(after.length,62);assert.deepEqual(after.slice(0,61),old);
 assert.equal(Number((await db.query("SELECT COUNT(*) n FROM payment_records WHERE source_kind<>'payroll' OR individual_transaction_id IS NOT NULL"))[0][0].n),0);
 await writeFile(folder+'/migration.json',JSON.stringify({at:new Date().toISOString(),backup,restores:restores.map(x=>x.r),from:61,to:62,ms,businessTablesPreserved:before.size,oldColumnsExact:true,all61ChecksumsPreserved:true,interruptedDdlRejected:true,recoveryByFreshVerifiedRestore:true,noPaidBackfill:true},null,2));
 console.log('PASS P07 canonical source migration: 61→62, previous values/checksums exact, interrupted DDL not journaled, fresh verified restore recovery, no backfill');
}finally{await db.changeUser({database:process.env.DB_NAME});for(const {r,metadata} of restores){await db.query(`DROP DATABASE \`${r.target}\``);await db.query(`DROP USER ${db.escape(metadata.definerAccount)}@'localhost'`);}await db.end();}
