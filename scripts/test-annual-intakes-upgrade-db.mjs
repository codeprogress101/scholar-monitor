import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {applyMigrations} from './migration-lib.mjs';
import {preflightAnnualIntakes} from './annual-intake-preflight.mjs';
assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
const folder='output/a1-a5-registration-20261024/upgrade-recovery',database=`ldss_annual_upgrade_test_${process.pid}_${randomBytes(4).toString('hex')}`;
await mkdir(folder,{recursive:true});await writeFile(folder+'/owner.json',JSON.stringify({database,pid:process.pid,scope:'Owned disposable partial-DDL recovery test; never a retained fixture'},null,2));
const db=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'});
try{
 await db.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);await db.changeUser({database});
 assert.equal((await applyMigrations(db,{through:'20261022070000_f52_individual_settlement.sql'})).length,62);
 const [before]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');
 // Fail compatibility before any DDL using the same real preflight reader.
 const incompatible={query:async(sql,...args)=>sql.includes('COUNT(*) n FROM scholar_intakes i')?[[{n:1}]]:db.query(sql,...args)};
 await assert.rejects(preflightAnnualIntakes(incompatible),/incompatibility/);
 const version='20261024010000_f53_annual_intake_registration.sql',sql=await readFile(new URL('../db/migrations/'+version,import.meta.url),'utf8');
 const statements=sql.split(/\r?\n-- statement-break\r?\n/).filter(s=>s.trim());
 // MariaDB DDL commits individually. Simulate failure after ALTER + first table.
 const fail={query:async(text,...args)=>{if(text.includes('CREATE TABLE annual_intake_commands'))throw new Error('Declared partial DDL fault');return db.query(text,...args);},execute:(...args)=>db.execute(...args)};
 await assert.rejects(applyMigrations(fail),/Declared partial DDL fault/);
 const [[count]]=await db.query('SELECT COUNT(*) n FROM schema_migrations');assert.equal(count.n,62);
 const [columns]=await db.query('SHOW COLUMNS FROM scholar_intakes');assert.ok(columns.some(c=>c.Field==='origin_kind'));
 await assert.rejects(applyMigrations(db),/Duplicate column/,'Blind retry must visibly reject partial DDL');
 // Explicit forward repair of this disposable fixture only, after verifying the
 // exact committed prefix and journal. Never edit an older checksum or drop data.
 const [[revisionTable]]=await db.query("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='scholar_intake_revisions'");assert.equal(revisionTable.n,1);
 for(const statement of statements.slice(2))await db.query(statement);
 await db.execute('INSERT INTO schema_migrations(version,checksum,applied_at) VALUES(?,?,UTC_TIMESTAMP(6))',[version,createHash('sha256').update(sql).digest('hex')]);
 assert.deepEqual(await applyMigrations(db),[]);const [after]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');assert.deepEqual(after.slice(0,62),before);
 await writeFile(folder+'/verification.json',JSON.stringify({passed:true,database,incompatiblePreflightBlocked:true,partialDdlJournalRetainedAt62:true,blindRetryRejected:true,inspectedForwardRepairSucceeded:true,allOldChecksumsExact:true,statements:statements.length},null,2));
 console.log('PASS DA13: incompatible preflight blocks; partial-DDL fault retains journal; blind retry rejects; inspected additive forward repair preserves old checksums.');
}finally{await db.end();}
