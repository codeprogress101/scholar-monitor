import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {applyMigrations} from './migration-lib.mjs';
assert.equal(process.env.APP_ENV,'development');assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');assert.ok(['127.0.0.1','localhost'].includes(process.env.DB_HOST));
const name=`ldss_binding_recovery_test_${process.pid}_${randomBytes(4).toString('hex')}`,version='20261025010000_f55_import_intake_bindings.sql';
const db=await mysql.createConnection({host:'127.0.0.1',user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??''});
let created=false;
try{
 await db.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);created=true;await db.changeUser({database:name});
 assert.equal((await applyMigrations(db,{through:'20261024020000_f54_graduation_monitoring.sql'})).length,64);
 const fail={query:async(sql,...args)=>{if(sql.includes('CREATE TRIGGER import_intake_bindings_no_update'))throw Error('Declared F55 partial DDL fault');return db.query(sql,...args);},execute:(...args)=>db.execute(...args)};
 await assert.rejects(applyMigrations(fail),/partial DDL fault/);
 const [[count]]=await db.query('SELECT COUNT(*) n FROM schema_migrations');assert.equal(count.n,64);
 await assert.rejects(applyMigrations(db),/Partial F55/);
 const [[rows]]=await db.query('SELECT COUNT(*) n FROM import_intake_bindings');assert.equal(rows.n,0);
 // Reviewed recovery of this exact empty owned test: verify committed prefix,
 // then apply the two known remaining triggers and record the exact checksum.
 const [columns]=await db.query('SHOW COLUMNS FROM import_intake_bindings');assert.equal(columns.length,13);
 const [triggers]=await db.query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='import_intake_bindings'");assert.equal(triggers.length,0);
 const sql=await readFile(new URL('../db/migrations/'+version,import.meta.url),'utf8');for(const statement of sql.split(/\r?\n-- statement-break\r?\n/).slice(1))if(statement.trim())await db.query(statement);
 await db.execute('INSERT INTO schema_migrations(version,checksum,applied_at) VALUES(?,?,UTC_TIMESTAMP(6))',[version,createHash('sha256').update(sql).digest('hex')]);assert.deepEqual(await applyMigrations(db),[]);
 await writeFile('output/a2-1-implementation-20261025/partial-ddl.json',JSON.stringify({passed:true,database:name,partialFailureStopped:true,blindRetryRejected:true,verifiedEmptyPrefix:true,exactForwardRepair:true,oldChecksumsUnchanged:true},null,2));console.log('PASS F55 partial DDL stops, rejects blind retry and permits exact reviewed empty-fixture forward recovery');
}finally{const [[actual]]=await db.query('SELECT DATABASE() name');assert.equal(actual.name,name);assert.match(name,new RegExp(`^ldss_binding_recovery_test_${process.pid}_[a-f0-9]{8}$`));if(created)await db.query(`DROP DATABASE \`${name}\``);await db.end();}
