import {settlementMigration,legacySettlementRows} from './settlement-test-boundary.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Connection,RowDataPacket} from 'mysql2/promise';
import {applyMigrations} from './migration-lib.mjs';
import {documentMigration,stripEmptyDocumentFixture} from './document-test-boundary.mjs';
export async function testDocumentUpgrade(db:Pick<Connection,'query'|'execute'>){
 const [[name]]=await db.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(name.name,/^ldss_f19_test_\d+_[a-f\d]{8}$/);
 await stripEmptyDocumentFixture(db,name.name);
 const [old]=await db.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(old.length,60);
 const [tables]=await db.query<RowDataPacket[]>("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migrations' ORDER BY TABLE_NAME");
 const hash=(rows:RowDataPacket[])=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())).digest('hex'),before=new Map<string,string>();
 for(const table of tables){assert.match(table.name,/^[a-z_]+$/);before.set(table.name,hash(legacySettlementRows(table.name,(await db.query<RowDataPacket[]>(`SELECT * FROM ${table.name}`))[0])));}
 assert.ok(Number((await db.query<RowDataPacket[]>('SELECT COUNT(*) n FROM individual_payment_transactions'))[0][0].n)>0,'Upgrade actually includes prepared P04/P05 evidence');
 const started=performance.now();assert.deepEqual(await applyMigrations(db),[documentMigration,settlementMigration]);const ms=performance.now()-started;assert.deepEqual(await applyMigrations(db),[]);
 for(const [table,digest] of before)assert.equal(hash(legacySettlementRows(table,(await db.query<RowDataPacket[]>(`SELECT * FROM ${table}`))[0])),digest,table);
 const [after]=await db.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.deepEqual(after.slice(0,60),old);
 await mkdir('output/p06-documents-20261022',{recursive:true});await writeFile('output/p06-documents-20261022/populated-upgrade.json',JSON.stringify({at:new Date().toISOString(),from:60,to:62,ms,preservedTables:before.size,allOriginalRowsAndChecksumsPreserved:true,noDocumentBackfill:true,ownedFixtureOnly:true},null,2));
 console.log('PASS P06 populated 60→62 upgrade preserves P04/P05 headers, events, entitlement routes, payments and financial/frozen evidence');
}
