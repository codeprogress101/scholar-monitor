import {settlementMigration,legacySettlementRows} from './settlement-test-boundary.mjs';
import {stripEmptyDocumentFixture,documentMigration} from './document-test-boundary.mjs';
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAdmin,applyMigrations} from './migration-lib.mjs';
import {createBackup,restoreBackup,loadKey} from './backup-lib.mjs';
const folder=process.env.LDSS_P05_OUTPUT??'output/p05-omitted-20261022';await mkdir(folder,{recursive:true});
const key=await loadKey(),backup=await createBackup(key),restored=await restoreBackup(backup.file,key,{keep:true}),metadata=JSON.parse(await readFile(restored.reportFile,'utf8')),db=await localAdmin();
assert.match(restored.target,/^ldss_restore_\d+_[a-f\d]{8}$/);assert.match(metadata.definerAccount,/^ldss_r_[a-f\d]{16}$/);
const migration='20261022040000_f49_omitted_scholars.sql',ownerMigration='20261022050000_f50_omission_approval_owner.sql',sha=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex');
try{
 await db.changeUser({database:restored.target});await stripEmptyDocumentFixture(db,restored.target);
 const [applied]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');
 // A post-P05 local source may be used only while its new structures are empty.
 // Never strip real omission evidence or discard old P04 transactions.
 if(applied.some(r=>r.version===migration)){
  for(const table of ['payroll_preparation_versions','payroll_omissions','payroll_omission_events']){const [[n]]=await db.query(`SELECT COUNT(*) n FROM ${table}`);assert.equal(Number(n.n),0,'Use the retained pre-P05 backup for populated later-phase sources');}
  const [[n]]=await db.query("SELECT COUNT(*) n FROM individual_payment_transactions WHERE source_kind<>'unclaimed' OR omission_id IS NOT NULL");assert.equal(Number(n.n),0);
  await db.query('ALTER TABLE individual_payment_transactions DROP FOREIGN KEY fk_individual_omission_approval, DROP FOREIGN KEY fk_individual_omission_origin, DROP FOREIGN KEY individual_payment_transactions_ibfk_2, DROP CONSTRAINT ck_individual_source, DROP INDEX fk_individual_omission_approval, DROP INDEX fk_individual_omission_origin, DROP INDEX uq_omission_individual_request, DROP COLUMN omission_request, DROP COLUMN omission_id, DROP COLUMN approval_revision, MODIFY COLUMN request_entitlement CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(replacement_of IS NULL,entitlement_id,NULL)) VIRTUAL, MODIFY COLUMN source_payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, DROP COLUMN source_kind, ADD CONSTRAINT fk_fixture_source_payment FOREIGN KEY(source_payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT');
  for(const table of ['payroll_omission_events','payroll_omissions','payroll_preparation_versions'])await db.query(`DROP TABLE ${table}`);
  await db.execute('DELETE FROM schema_migrations WHERE version IN (?,?)',[migration,ownerMigration]);
 }
 const [old]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(old.length,58);
 const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migrations' ORDER BY TABLE_NAME"),before=new Map();
 for(const {name} of tables){assert.match(name,/^[a-z_]+$/);before.set(name,sha(legacySettlementRows(name,(await db.query(`SELECT * FROM \`${name}\``))[0])));}
 const sql=await readFile(new URL('../db/migrations/'+migration,import.meta.url),'utf8');await db.query(sql.split(/\r?\n-- statement-break\r?\n/)[0]);
 await assert.rejects(applyMigrations(db),e=>e.code==='ER_TABLE_EXISTS_ERROR');assert.equal((await db.query('SELECT version FROM schema_migrations'))[0].length,58);
 for(const [name,hash] of before)assert.equal(sha((await db.query(`SELECT * FROM \`${name}\``))[0]),hash);
 await db.query('DROP TABLE payroll_preparation_versions');const start=performance.now();assert.deepEqual(await applyMigrations(db),[migration,ownerMigration,documentMigration,settlementMigration]);const ms=performance.now()-start;
 assert.deepEqual(await applyMigrations(db),[]);
 for(const [name,hash] of before){
  const [rows]=await db.query(`SELECT * FROM \`${name}\``);
  // New header fields have defaults only; compare every original P04 field.
  if(name==='individual_payment_transactions')for(const r of rows)for(const key of ['source_kind','omission_id','approval_revision','omission_request'])delete r[key];
  assert.equal(sha(legacySettlementRows(name,rows)),hash,'Preserve '+name);
 }
 const [now]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.deepEqual(now.slice(0,58),old);
 await writeFile(folder+'/migration.json',JSON.stringify({at:new Date().toISOString(),backup,restored,from:58,to:62,ms,businessTablesPreserved:before.size,existingP04FieldsPreserved:true,priorChecksumsPreserved:true,interruptedDdlRejected:true,partialMigrationNotJournaled:true,retryAppliedZero:true,fixtureOnlyEmptyReverseSetup:true},null,2));
 console.log('PASS P05 populated 58→62 upgrade, P04 field compatibility, prior hashes, interrupted-DDL containment, exact retry and verified restore');
}finally{await db.changeUser({database:process.env.DB_NAME});await db.query(`DROP DATABASE \`${restored.target}\``);await db.query(`DROP USER ${db.escape(metadata.definerAccount)}@'localhost'`);await db.end();}
