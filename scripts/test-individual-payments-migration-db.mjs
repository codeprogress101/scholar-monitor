import {settlementMigration,legacySettlementRows} from './settlement-test-boundary.mjs';
import {stripEmptyDocumentFixture,documentMigration} from './document-test-boundary.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAdmin,applyMigrations} from './migration-lib.mjs';
import {createBackup,restoreBackup,loadKey,inventory} from './backup-lib.mjs';
const folder=process.env.LDSS_P04_OUTPUT??'output/p04-unclaimed-20261022';
await mkdir(folder,{recursive:true});
const key=await loadKey(),backup=await createBackup(key),restored=await restoreBackup(backup.file,key,{keep:true});
const metadata=JSON.parse(await readFile(restored.reportFile,'utf8')),db=await localAdmin();
const migration='20261022030000_f48_individual_unclaimed.sql',tables=['entitlement_payment_routes','individual_payment_events','individual_payment_transactions'];
const successor='20261022040000_f49_omitted_scholars.sql',successorTables=['payroll_omission_events','payroll_omissions','payroll_preparation_versions'];
const ownerMigration='20261022050000_f50_omission_approval_owner.sql';
const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
assert.match(restored.target,/^ldss_restore_\d+_[a-f0-9]{8}$/);assert.match(metadata.definerAccount,/^ldss_r_[a-f0-9]{16}$/);
try{
 await db.changeUser({database:restored.target});await stripEmptyDocumentFixture(db,restored.target);
 const [applied]=await db.query('SELECT version FROM schema_migrations');
 // On an owned restored post-P04 source, remove ONLY empty P04 structures to
 // establish the actual populated 57-migration upgrade boundary. No down path
 // is offered for live evidence. Filled sources must use a pre-P04 backup.
 if(applied.some(r=>r.version===migration)){
  if(applied.some(r=>r.version===successor))for(const table of successorTables){const [[n]]=await db.query(`SELECT COUNT(*) n FROM \`${table}\``);assert.equal(Number(n.n),0,'Use the retained pre-P04 backup; never strip populated P05 evidence');}
  for(const table of tables){const [[n]]=await db.query(`SELECT COUNT(*) n FROM \`${table}\``);assert.equal(Number(n.n),0,'Never discard P04 evidence to construct an upgrade fixture');}
  for(const table of tables)await db.query(`DROP TABLE \`${table}\``);
  if(applied.some(r=>r.version===successor)){for(const table of successorTables)await db.query(`DROP TABLE \`${table}\``);await db.execute('DELETE FROM schema_migrations WHERE version IN (?,?)',[successor,ownerMigration]);}
  await db.execute('DELETE FROM schema_migrations WHERE version=?',[migration]);
 }
 assert.equal((await db.query('SELECT version FROM schema_migrations'))[0].length,57);
 const before=await inventory(db),data=new Map();
 for(const table of before.tables.filter(t=>t.name!=='schema_migrations'))data.set(table.name,hash(legacySettlementRows(table.name,(await db.query(`SELECT * FROM \`${table.name}\``))[0])));
 const sql=await readFile(new URL('../db/migrations/'+migration,import.meta.url),'utf8');
 await db.query(sql.split(/\r?\n-- statement-break\r?\n/)[0]);
 await assert.rejects(applyMigrations(db),e=>e.code==='ER_TABLE_EXISTS_ERROR');
 assert.equal((await db.query('SELECT version FROM schema_migrations'))[0].length,57,'Partial DDL cannot be falsely journaled complete');
 for(const [name,sha]of data)assert.equal(hash(legacySettlementRows(name,(await db.query(`SELECT * FROM \`${name}\``))[0])),sha,'Interrupted migration preserves '+name);
 // This empty, owned partial fixture is deliberately repaired before retry.
 // Production recovery is preservation + verified backup/forward repair.
 await db.query('DROP TABLE individual_payment_transactions');
 const start=performance.now();assert.deepEqual(await applyMigrations(db),[migration,successor,ownerMigration,documentMigration,settlementMigration]);const ms=performance.now()-start;
 assert.deepEqual(await applyMigrations(db),[]);
 for(const [name,sha]of data)assert.equal(hash(legacySettlementRows(name,(await db.query(`SELECT * FROM \`${name}\``))[0])),sha,'Upgrade preserves '+name);
 const after=await inventory(db);assert.equal(after.tables.length,before.tables.length+8);
 for(const table of tables){const [[n]]=await db.query(`SELECT COUNT(*) n FROM \`${table}\``);assert.equal(Number(n.n),0);}
 await writeFile(folder+'/migration.json',JSON.stringify({at:new Date().toISOString(),backup,restored,from:57,to:62,ms,businessTablesPreserved:data.size,interruptedDdlRejected:true,partialMigrationNotJournaled:true,existingHistoricalClosuresUnchanged:true,noAutomaticRequestsOrRoutes:true,retryAppliedZero:true,cumulativeP04P05:true},null,2));
 console.log('PASS P04 populated 57→62 cumulative migration, all original business hashes, interrupted-F48 DDL containment, empty-source repair rehearsal and exact retry');
}finally{
 await db.changeUser({database:process.env.DB_NAME});
 await db.query(`DROP DATABASE \`${restored.target}\``);
 await db.query(`DROP USER ${db.escape(metadata.definerAccount)}@'localhost'`);await db.end();
}
