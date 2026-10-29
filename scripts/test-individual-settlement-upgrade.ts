import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Connection,RowDataPacket} from 'mysql2/promise';
import {applyMigrations} from './migration-lib.mjs';
import {settlementMigration,stripEmptySettlementFixture,legacySettlementRows} from './settlement-test-boundary.mjs';
export async function testSettlementPopulatedUpgrade(db:Pick<Connection,'query'|'execute'>,sourceKind:string,total:number){
 const [[name]]=await db.query<RowDataPacket[]>('SELECT DATABASE() name');assert.match(name.name,/^ldss_(?:f19|import)_test_\d+_[a-f\d]{8}$/);
 assert.ok(Number((await db.query<RowDataPacket[]>('SELECT COUNT(*) n FROM individual_document_contents'))[0][0].n)>0,'Upgrade includes actual prepared P06 files');
 await stripEmptySettlementFixture(db,name.name);
 const [migrations]=await db.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.equal(migrations.length,61);
 const [tables]=await db.query<RowDataPacket[]>("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migrations' ORDER BY TABLE_NAME"),before=new Map<string,string>();
 const hash=(table:string,rows:RowDataPacket[])=>createHash('sha256').update(JSON.stringify(legacySettlementRows(table,rows).map((r:RowDataPacket)=>JSON.stringify(r)).sort())).digest('hex');
 for(const {name} of tables){assert.match(name,/^[a-z_]+$/);before.set(name,hash(name,(await db.query<RowDataPacket[]>(`SELECT * FROM ${name}`))[0]));}
 const start=performance.now();assert.deepEqual(await applyMigrations(db),[settlementMigration]);const ms=performance.now()-start;assert.deepEqual(await applyMigrations(db),[]);
 for(const [name,value] of before)assert.equal(hash(name,(await db.query<RowDataPacket[]>(`SELECT * FROM ${name}`))[0]),value,name);
 assert.deepEqual((await db.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations ORDER BY version'))[0].slice(0,61),migrations);
 const folder='output/p07-settlement-20261022';await mkdir(folder,{recursive:true});await writeFile(`${folder}/populated-upgrade-${sourceKind}-${total}.json`,JSON.stringify({at:new Date().toISOString(),from:61,to:62,ms,preservedBusinessTables:before.size,preparedDocuments:true,populatedFinancialFieldsExact:true,priorChecksumsExact:true,noPaidBackfill:true,fixtureOnlyReverseBoundary:true},null,2));
 console.log('PASS P07 populated upgrade: canonical payroll/corrections, P04/P05 preparation/history and actual P06 current files/metadata preserved exactly');
}
