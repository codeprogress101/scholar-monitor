import {stripEmptySettlementFixture} from './settlement-test-boundary.mjs';
// Disposable old-schema boundary reconstruction only; never a live downgrade.
import assert from 'node:assert/strict';
export const documentMigration='20261022060000_f51_individual_documents.sql';
export async function stripEmptyDocumentFixture(db,ownedDatabase){
 assert.match(ownedDatabase,/^ldss_(?:restore_\d+_[a-f\d]{8}|(?:f\d+|import)_test_\d+_[a-f\d]{8})$/);
 const [[row]]=await db.query('SELECT DATABASE() name');assert.equal(row.name,ownedDatabase);
 await stripEmptySettlementFixture(db,ownedDatabase);
 for(const name of ['individual_document_contents','individual_document_versions']){
  const [[table]]=await db.execute('SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[name]);
  if(table.n){const [[count]]=await db.query(`SELECT COUNT(*) n FROM ${name}`);assert.equal(Number(count.n),0,'Never discard populated document evidence');await db.query(`DROP TABLE ${name}`);}
 }
 const [[index]]=await db.query("SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='individual_payment_transactions' AND INDEX_NAME='uq_individual_document_source'");
 if(index.n)await db.query('ALTER TABLE individual_payment_transactions DROP INDEX uq_individual_document_source');
 await db.execute('DELETE FROM schema_migrations WHERE version=?',[documentMigration]);
}
