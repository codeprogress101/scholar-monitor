import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localAdmin } from './migration-lib.mjs';
import { createBackup, restoreBackup, unseal } from './backup-lib.mjs';

const directory = await mkdtemp(join(tmpdir(), 'ldss-drive-restore-'));
const key = randomBytes(32), files = [];
const db = await localAdmin();
let source, sourceReport, account;
try {
  // Populate a disposable source with the real schema; working source is read only.
  const seed = await createBackup(key); files.push(seed.file);
  source = await restoreBackup(seed.file, key, { keep: true }); files.push(source.reportFile);
  sourceReport = JSON.parse(await readFile(source.reportFile, 'utf8'));
  const username = `ldss_b_${randomBytes(6).toString('hex')}`, password = randomBytes(24).toString('hex');
  account = `${db.escape(username)}@'localhost'`;
  await db.query(`CREATE USER ${account} IDENTIFIED BY ${db.escape(password)}`);
  await db.query(`GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES ON \`${source.target}\`.* TO ${account}`);
  const port = Number(process.env.DB_PORT ?? 3306);
  const connection = { host:'127.0.0.1',port,user:username,password,database:source.target };
  const backup = await createBackup(key, { connection, directory, dumpTool:'C:/xampp/mysql/bin/mysqldump.exe', args:['--no-defaults','--host=127.0.0.1',`--port=${port}`,`--user=${username}`,'--default-character-set=utf8mb4'] });
  const bytes = await readFile(backup.file);
  assert.equal(unseal(bytes,key,source.target).database,source.target);
  assert.throws(() => unseal(bytes,key));
  const restored = await restoreBackup(backup.file,key,{ context:{ sourceDatabase:source.target, admin:{host:'127.0.0.1',port,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD ?? ''}, mysqlTool:'C:/xampp/mysql/bin/mysql.exe',directory } });
  const report = JSON.parse(await readFile(restored.reportFile,'utf8'));
  assert.equal(report.verified,true);
  assert.equal(report.tables.length,sourceReport.tables.length);
  console.log(`PASS Explicit-target backup with schema-scoped credentials and isolated recovery: ${report.tables.length} tables, constraints, triggers and views.`);
} catch (e) { console.error(e.code ? `Disposable backup test failed (${e.code}); SQL withheld.` : e.message); process.exitCode=1; }
finally {
  if(account) await db.query(`DROP USER IF EXISTS ${account}`);
  if(source) await db.query(`DROP DATABASE \`${source.target}\``);
  if(sourceReport) await db.query(`DROP USER ${db.escape(sourceReport.definerAccount)}@'localhost'`);
  await db.end();
  for(const file of files) await unlink(file).catch(()=>{});
  await rm(directory,{recursive:true});
}
