// Owned disposable boundary reconstruction, never a live downgrade.
import assert from 'node:assert/strict';
export const settlementMigration='20261022070000_f52_individual_settlement.sql';
export const paymentSettlementColumns=['source_kind','individual_transaction_id','individual_revision','entitlement_id','scholar_id','semester_id','release_evidence'];
export const correctionSettlementColumns=['individual_transaction_id','individual_revision'];
export function legacySettlementRows(table,rows){return rows.map(r=>{const copy={...r};for(const key of table==='payment_records'?paymentSettlementColumns:table==='payment_corrections'?correctionSettlementColumns:[])delete copy[key];return copy;});}
export async function stripEmptySettlementFixture(db,ownedDatabase){
 assert.match(ownedDatabase,/^ldss_(?:restore_\d+_[a-f\d]{8}|(?:f\d+|import)_test_\d+_[a-f\d]{8})$/);
 assert.equal((await db.query('SELECT DATABASE() name'))[0][0].name,ownedDatabase);
 const [[column]]=await db.query("SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payment_records' AND COLUMN_NAME='individual_transaction_id'");
 if(column.n){
  assert.equal(Number((await db.query("SELECT COUNT(*) n FROM payment_records WHERE source_kind<>'payroll' OR batch_id IS NULL OR batch_revision IS NULL"))[0][0].n),0,'Never discard populated settlement evidence');
  assert.equal(Number((await db.query("SELECT COUNT(*) n FROM payment_corrections WHERE individual_transaction_id IS NOT NULL OR batch_id IS NULL OR batch_revision IS NULL"))[0][0].n),0);
  assert.equal(Number((await db.query("SELECT COUNT(*) n FROM individual_payment_events WHERE action IN ('forwarded','paid','payment_corrected')"))[0][0].n),0);
  await db.query('ALTER TABLE payment_corrections DROP FOREIGN KEY fk_correction_individual_payment,DROP FOREIGN KEY fk_correction_individual_event,DROP FOREIGN KEY fk_correction_payroll_owner,DROP CONSTRAINT ck_correction_source,DROP INDEX uq_individual_correction_revision,DROP COLUMN individual_transaction_id,DROP COLUMN individual_revision,MODIFY batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,MODIFY batch_revision INT UNSIGNED NOT NULL');
  await db.query('ALTER TABLE payment_records DROP FOREIGN KEY fk_payment_individual_owner,DROP FOREIGN KEY fk_payment_individual_event,DROP FOREIGN KEY fk_payment_entitlement_identity,DROP FOREIGN KEY fk_payment_annual_identity,DROP FOREIGN KEY fk_payment_cycle_semester,DROP CONSTRAINT ck_payment_source,DROP INDEX uq_payment_individual_transaction,DROP INDEX uq_payment_individual_owner,DROP INDEX uq_payment_payroll_owner,'+paymentSettlementColumns.map(c=>'DROP COLUMN '+c).join(',')+',MODIFY batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,MODIFY batch_revision INT UNSIGNED NOT NULL');
  // InnoDB can replace original auto-created FK indexes with wider F52 ones.
  // Dropping a column trims such an index instead of removing its name. Restore
  // the original FK support before removing only the known F52 support indexes.
  await db.query('ALTER TABLE payment_records ADD INDEX IF NOT EXISTS scholarship_id(scholarship_id)');
  await db.query('ALTER TABLE payment_corrections ADD INDEX IF NOT EXISTS payment_id(payment_id)');
  for(const [table,indexes] of [['payment_records',['fk_payment_individual_owner','fk_payment_individual_event','fk_payment_entitlement_identity','fk_payment_annual_identity','fk_payment_cycle_semester']],['payment_corrections',['fk_correction_individual_payment','fk_correction_individual_event','fk_correction_payroll_owner']]]){
   for(const index of indexes){const [[r]]=await db.execute('SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',[table,index]);if(r.n)await db.query(`ALTER TABLE ${table} DROP INDEX ${index}`);}
  }
  assert.equal(Number((await db.query('SELECT @@foreign_key_checks enabled'))[0][0].enabled),1);
  await db.query("ALTER TABLE individual_payment_events MODIFY action ENUM('request_recorded','prepared','cancel_requested','cancel_rejected','cancelled','original_paid_cancelled') NOT NULL");
 }
 for(const [table,index] of [['semester_entitlements','uq_entitlement_payment_identity'],['payout_cycles','uq_cycle_payment_semester']]){const [[r]]=await db.execute('SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',[table,index]);if(r.n)await db.query(`ALTER TABLE ${table} DROP INDEX ${index}`);}
 await db.execute('DELETE FROM schema_migrations WHERE version=?',[settlementMigration]);
}
