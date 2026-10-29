import {stripEmptyDocumentFixture,documentMigration} from './document-test-boundary.mjs';
import {settlementMigration,legacySettlementRows} from './settlement-test-boundary.mjs';
import assert from 'node:assert/strict';
import type {Connection,RowDataPacket} from 'mysql2/promise';
import {applyMigrations} from './migration-lib.mjs';
import {digest} from '../server/auth/crypto.js';
import {mkdir,writeFile} from 'node:fs/promises';
export async function testOmissionPopulatedUpgrade(db:Connection){
 const [[name]]=await db.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(String(name.name),/^ldss_f19_test_\d+_[a-f\d]{8}$/);
 await stripEmptyDocumentFixture(db,String(name.name));
 for(const table of ['payroll_preparation_versions','payroll_omissions','payroll_omission_events']){const [[r]]=await db.query<RowDataPacket[]>(`SELECT COUNT(*) n FROM ${table}`);assert.equal(Number(r.n),0,'Never discard populated P05 evidence');}
 const [p04]=await db.query<RowDataPacket[]>('SELECT * FROM individual_payment_transactions ORDER BY id');assert.ok(p04.length>0);assert.ok(p04.every(r=>r.source_kind==='unclaimed'&&r.source_payment_id&&r.omission_id===null));
 const original=p04.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['source_kind','omission_id','approval_revision','omission_request'].includes(k))));
 const tables=['payment_records','payment_corrections','individual_payment_events','entitlement_payment_routes','semester_entitlements','semester_entitlement_events','ovr_finalizations','payroll_closure_members','payroll_reconciliation_events'];
 const hashes=new Map<string,string>();for(const table of tables){const [rows]=await db.query<RowDataPacket[]>(`SELECT * FROM ${table}`);hashes.set(table,digest(JSON.stringify(legacySettlementRows(table,rows).map((r:RowDataPacket)=>JSON.stringify(r)).sort())));}
 await db.query('ALTER TABLE individual_payment_transactions DROP FOREIGN KEY fk_individual_omission_approval, DROP FOREIGN KEY fk_individual_omission_origin, DROP FOREIGN KEY individual_payment_transactions_ibfk_2, DROP CONSTRAINT ck_individual_source, DROP INDEX fk_individual_omission_approval, DROP INDEX fk_individual_omission_origin, DROP INDEX uq_omission_individual_request, DROP COLUMN omission_request, DROP COLUMN omission_id, DROP COLUMN approval_revision, MODIFY COLUMN request_entitlement CHAR(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (IF(replacement_of IS NULL,entitlement_id,NULL)) VIRTUAL, MODIFY COLUMN source_payment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, DROP COLUMN source_kind, ADD CONSTRAINT fk_fixture_source_payment FOREIGN KEY(source_payment_id) REFERENCES payment_records(id) ON DELETE RESTRICT');
 for(const table of ['payroll_omission_events','payroll_omissions','payroll_preparation_versions'])await db.query(`DROP TABLE ${table}`);
 const version='20261022040000_f49_omitted_scholars.sql',ownerVersion='20261022050000_f50_omission_approval_owner.sql';await db.execute('DELETE FROM schema_migrations WHERE version IN (?,?)',[version,ownerVersion]);assert.equal((await db.query<RowDataPacket[]>('SELECT version FROM schema_migrations'))[0].length,58);
 const started=performance.now();assert.deepEqual(await applyMigrations(db),[version,ownerVersion,documentMigration,settlementMigration]);const ms=performance.now()-started;
 const [after]=await db.query<RowDataPacket[]>('SELECT * FROM individual_payment_transactions ORDER BY id');assert.deepEqual(after.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['source_kind','omission_id','approval_revision','omission_request'].includes(k)))),original);
 for(const table of tables){const [rows]=await db.query<RowDataPacket[]>(`SELECT * FROM ${table}`);assert.equal(digest(JSON.stringify(legacySettlementRows(table,rows).map((r:RowDataPacket)=>JSON.stringify(r)).sort())),hashes.get(table));}
 assert.deepEqual(await applyMigrations(db),[]);
 await mkdir('output/p05-omitted-20261022',{recursive:true});await writeFile('output/p05-omitted-20261022/populated-p04-upgrade.json',JSON.stringify({at:new Date().toISOString(),from:58,to:62,ms,p04Transactions:p04.length,allOriginalP04FieldsUnchanged:true,preservedTables:tables,onlyOwnedEmptyP05StructuresUsedForBoundary:true,retryAppliedZero:true},null,2));
 console.log('PASS P05 58→62 upgrade with populated P04 requests/preparations/cancellations, corrections, payment history, routes and frozen closure evidence');
}
