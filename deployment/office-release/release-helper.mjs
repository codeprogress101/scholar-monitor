import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseEnv} from 'node:util';
import {assertLaunch,assertMigrationHistory,filesIn,fingerprint,inside,sha} from './release-lib.mjs';

const root='C:/ProgramData/LDSSProduction';
const release=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
assert(inside(root,release),'Run the helper from a staged production release');
const require=createRequire(resolve(release,'package.json'));
const mysql=require('mysql2/promise');
const moduleAt=(folder,path)=>import(pathToFileURL(resolve(folder,path)).href);
const {createBackup,restoreBackup,inventory}=await moduleAt(release,'scripts/backup-lib.mjs');
const {applyMigrations,grantAuthRuntime}=await moduleAt(release,'scripts/migration-lib.mjs');
const env=parseEnv(await readFile(root+'/production.env','utf8'));
assert.equal(env.APP_ENV,'production');
assert.equal(env.DB_NAME,'ldss_scholar_monitor_production');
assert.equal(env.DB_HOST,'127.0.0.1');
assert.equal(env.DB_USER,'ldss_production_app');
assert.equal(env.APP_ORIGIN,'https://monitor.iskolarngdaet.app:3443');
const backupConfig=JSON.parse(await readFile('C:/ProgramData/LDSSBackupConfig/production.json','utf8'));
assert.equal(backupConfig.database,env.DB_NAME);
assert.equal(backupConfig.environment,'production');
const evidence=resolve(root,'go-live-20261019',release.split(/[\\/]/).at(-1));
await mkdir(evidence,{recursive:true});
execFileSync('icacls.exe',[evidence,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'ignore',windowsHide:true});
const save=async(name,value)=>{
  const path=resolve(evidence,name);
  await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  return path;
};
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const manifestPath=resolve(release,'release-manifest.json');
const manifest=await readJson(manifestPath);
const manifestHash=sha(await readFile(manifestPath));
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
async function verifyArtifact() {
  assert.equal(resolve(manifest.release),release);
  const names=(await filesIn(release)).filter(x=>x!=='release-manifest.json');
  assert.deepEqual(names,manifest.files.map(x=>x.path),'Frozen file set changed');
  assert.deepEqual(await fingerprint(release,names),manifest.files,'Frozen artifact changed');
}
async function candidateMigrations() {
  return Promise.all(manifest.files.filter(x=>/^db\/migrations\/.*\.sql$/.test(x.path)).map(async x=>({version:x.path.split('/').at(-1),checksum:sha(await readFile(resolve(release,x.path)))})));
}
async function adminConfig() {
  // Reuse the existing local OS administrator credential. Never relabel a production database as development.
  const local=parseEnv(await readFile('C:/xampp/htdocs/scholar_monitor/.env','utf8'));
  return {host:env.DB_HOST,port:Number(env.DB_PORT),user:'root',password:local.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'};
}
async function backup() {
  const key=await readFile(backupConfig.keyFile);assert.equal(key.length,32);
  const archive=await createBackup(key,{connection:{host:env.DB_HOST,port:Number(env.DB_PORT),user:backupConfig.backupUser,password:backupConfig.backupPassword,database:env.DB_NAME},directory:resolve(evidence,'backups'),dumpTool:backupConfig.dumpTool,args:['--no-defaults','--host=127.0.0.1',`--port=${env.DB_PORT}`,`--user=${backupConfig.backupUser}`,'--default-character-set=utf8mb4']});
  await save('backup-'+stamp()+'.json',{...archive,sha256:sha(await readFile(archive.file))});
  return {key,archive};
}
async function projection(db,columns) {
  const result=[];
  for(const name of [...new Set(columns.map(c=>c.TABLE_NAME))].filter(n=>n!=='schema_migrations').sort()) {
    assert(/^[a-z_]+$/.test(name));
    const fields=columns.filter(c=>c.TABLE_NAME===name).map(c=>'`'+c.COLUMN_NAME+'`').join(',');
    const [rows]=await db.query({sql:`SELECT ${fields} FROM \`${name}\` LIMIT 100001`,rowsAsArray:true,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
    assert(rows.length<=100000,'Preservation inventory size exceeded');
    result.push({name,count:rows.length,sha256:sha(rows.map(r=>sha(JSON.stringify(r))).sort().join('\n'))});
  }
  return result;
}
async function upgrade(db) {
  const [history]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');
  const candidate=await candidateMigrations();
  const pending=assertMigrationHistory(history,candidate);
  assert.equal(pending.length,candidate.length-(manifest.previousMigrationCount??48),'Unexpected migration boundary');
  const before=await inventory(db);
  const original=await projection(db,before.columns);
  const applied=await applyMigrations(db);
  assert.deepEqual(applied,pending);
  assert.deepEqual(await projection(db,before.columns),original,'Business records changed during migration');
  const [after]=await db.query('SELECT version,checksum FROM schema_migrations ORDER BY version');
  assertMigrationHistory(after,candidate);
  assert.deepEqual(await applyMigrations(db),[],'Repeat migration is not a no-op');
  const [lineage]=await db.query("SELECT masterlist_id,parent_id,root_id,revision,'amendment' AS kind FROM masterlist_amendment_versions ORDER BY masterlist_id");
  const [backfill]=await db.query('SELECT masterlist_id,parent_id,root_id,revision,kind FROM masterlist_revisions ORDER BY masterlist_id');
  if(history.length===48) assert.deepEqual(backfill,lineage,'Unexpected amendment backfill');
  const afterInventory=await inventory(db);
  const added=afterInventory.tables.filter(t=>!before.tables.some(b=>b.name===t.name));
  for(const table of added.filter(t=>t.name!=='masterlist_revisions')) assert.equal(table.count,0,'Unexpected new operational records');
  for(const [table,column] of (history.length===48 ? [['semesters','term_kind'],['requirement_definition_versions','document_kind'],['requirement_document_evidence','entrant_review_id']] : [])) {
    const [[row]]=await db.query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`);
    assert.equal(Number(row.n),0,'Unexpected automatic classification');
  }
  return {applied,businessTables:original.length,preservation:original,newTables:added.map(t=>({name:t.name,count:t.count})),amendmentLineageRows:backfill.length};
}
async function smoke(folder,config,accounts=false) {
  const previousCwd=process.cwd();process.chdir(folder);
  const [{buildApp},{loadConfig}]=await Promise.all([moduleAt(folder,'dist/server/app.js'),moduleAt(folder,'dist/server/config.js')]);
  const app=buildApp(loadConfig(config),{logger:false,clientRoot:resolve(folder,'dist/client')});
  const checks=[];
  try {
    for(const [url,status] of [['/',200],['/api/v1/health',200],['/api/v1/ready',200],['/api/v1/me/permissions',401],['/.env',404]]) {
      assert.equal((await app.inject({method:'GET',url})).statusCode,status,url);checks.push({url,status});
    }
    if(accounts) {
      assert.match(config.DB_NAME,/^ldss_restore_\d+_[a-f0-9]{8}$/,'Account smoke only on restored copy');
      const pool=mysql.createPool({host:config.DB_HOST,port:Number(config.DB_PORT),user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME,timezone:'Z'});
      const operatorPool=mysql.createPool({...await adminConfig(),database:config.DB_NAME});
      const [{AuthService},{AuthorizationService}]=await Promise.all([moduleAt(folder,'dist/server/auth/service.js'),moduleAt(folder,'dist/server/authorization/service.js')]);
      try {
        const auth=new AuthService(pool),issuer=new AuthService(operatorPool),roles=new AuthorizationService(pool);
        const [users]=await pool.query('SELECT email FROM users WHERE disabled_at IS NULL');
        const seen=new Set();
        for(const user of users) {
          const expected=await roles.inspectByEmail(user.email);
          const password=randomBytes(30).toString('base64url');
          await auth.resetPassword(await issuer.issueReset(user.email,'restored-copy','Isolated release rehearsal'),password,'127.0.0.1',crypto.randomUUID());
          const login=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin:env.APP_ORIGIN},payload:{email:user.email,password}});
          assert.equal(login.statusCode,200,'Restored account login');
          const cookie=login.cookies.map(c=>`${c.name}=${c.value}`).join('; ');
          const access=await app.inject({method:'GET',url:'/api/v1/me/permissions',headers:{cookie}});
          assert.equal(access.statusCode,200);
          assert.deepEqual(access.json().roles.map(r=>r.code).sort(),[...expected.roles].sort());
          if(resolve(folder)===release)assert.equal((await app.inject({method:'GET',url:'/api/v1/implementation-plan',headers:{cookie}})).statusCode,200,'Packaged authenticated help download');
          const catalog=await app.inject({method:'GET',url:'/api/v1/admin/role-catalog',headers:{cookie}});
          assert.equal(catalog.statusCode,expected.roles.includes('system_admin')?200:403);
          for(const role of expected.roles)seen.add(role);
          checks.push({roles:expected.roles,login:200,roleCatalog:catalog.statusCode});
        }
        for(const role of ['staff','coordinator','system_admin'])assert(seen.has(role),'Required role absent on restored copy');
      } finally {await pool.end();await operatorPool.end();}
    }
    return checks;
  } finally {await app.close();process.chdir(previousCwd);}
}
async function withRestored(archive,key,work) {
  const admin=await adminConfig();
  const restored=await restoreBackup(archive.file,key,{keep:true,context:{sourceDatabase:env.DB_NAME,admin,mysqlTool:backupConfig.mysqlTool,directory:resolve(evidence,'backups')}});
  const report=await readJson(restored.reportFile);
  assert.match(restored.target,/^ldss_restore_\d+_[a-f0-9]{8}$/);
  assert.match(report.definerAccount,/^ldss_r_[a-f0-9]{16}$/);
  const db=await mysql.createConnection({...admin,database:restored.target});
  const user='ldss_v_'+randomBytes(8).toString('hex'),password=randomBytes(30).toString('base64url');let created=false;
  try {
    const config={...env,DB_NAME:restored.target,DB_USER:user,DB_PASSWORD:password};
    const runtime=async(folder=release)=>{await db.query(`CREATE USER ${db.escape(user)}@'localhost' IDENTIFIED BY ${db.escape(password)}`);created=true;const grants=await moduleAt(folder,'scripts/migration-lib.mjs');await grants.grantAuthRuntime(db,restored.target,user);};
    return await work({db,config,runtime,restored});
  } finally {
    if(created)await db.query(`DROP USER ${db.escape(user)}@'localhost'`);
    await db.query('DROP DATABASE `'+restored.target+'`');
    await db.query(`DROP USER ${db.escape(report.definerAccount)}@'localhost'`);
    await db.end();
  }
}
async function rehearse() {
  const started=Date.now();
  const {archive,key}=await backup();
  const result=await withRestored(archive,key,async({db,config,runtime,restored})=>{
    const migration=await upgrade(db);await runtime();
    const checks=await smoke(release,config,true);
    const {createDatabase}=await moduleAt(manifest.previousRelease,'dist/server/database.js');
    const {loadConfig}=await moduleAt(manifest.previousRelease,'dist/server/config.js');
    const old=createDatabase(loadConfig(config));let oldStatus;
    try {oldStatus=await old.check();} finally {await old.close();}
    const sameSchema=(manifest.previousMigrationCount??48)===(await candidateMigrations()).length;
    assert.equal(oldStatus,sameSchema?'connected':'unavailable','Investigate unexpected old-runtime compatibility');
    return {migration,checks,upgradedCopy:restored.target,oldApplicationOnNewSchema:oldStatus};
  });
  // Recover from the pre-migration archive into a NEW isolated database, never reverse DDL.
  const recoveryStart=Date.now();
  const recovery=await withRestored(archive,key,async({db,config,runtime,restored})=>{
    const [history]=await db.query('SELECT version FROM schema_migrations');assert.equal(history.length,manifest.previousMigrationCount??48);
    await runtime(manifest.previousRelease);
    return {restoredCopy:restored.target,checks:await smoke(manifest.previousRelease,config,true)};
  });
  const report={completedAt:new Date().toISOString(),manifestSha256:manifestHash,release,archive,
    ...result,recovery:{...recovery,seconds:(Date.now()-recoveryStart)/1000},totalSeconds:(Date.now()-started)/1000,
    cleanup:'Both owned restored databases, definer accounts and test runtime accounts removed',liveMutations:false,liveBackupReadLocks:true,offComputerKeyCustody:'unverified',offHostDelivery:'unverified'};
  const reportFile=await save('rehearsal-'+stamp()+'.json',report);
  console.log(JSON.stringify({reportFile,applied:result.migration.applied,recoverySeconds:report.recovery.seconds,liveMutations:false}));
}
async function bindGate(gateFile) {
  const gate=await readJson(resolve(gateFile));
  assert.equal(gate.status,'automated_passed_awaiting_signoff');assert(gate.suites.length>=52&&gate.suites.every(s=>s.passed));
  for(const file of gate.artifacts)assert.equal(sha(await readFile(resolve(release,file.file))),file.sha256,'Staged build differs from acceptance artifact');
  const releaseInputs=gate.sourceFiles.filter(x=>/^(scripts\/|db\/migrations\/|package(?:-lock)?\.json$)/.test(x.file));
  for(const file of releaseInputs)assert.equal(sha(await readFile(resolve(release,file.file))),file.sha256,'Staged release source differs from gate');
  const report={checkedAt:new Date().toISOString(),manifestSha256:manifestHash,gateSha256:sha(await readFile(resolve(gateFile))),gateFile:resolve(gateFile),suites:gate.suites.length,passed:true};
  console.log(JSON.stringify({reportFile:await save('acceptance-'+stamp()+'.json',report),...report}));
}
async function launchEvidence(launchFile) {
  const launch=await readJson(resolve(launchFile));assertLaunch(launch,manifestHash);
  const rehearsal=await readJson(launch.rehearsalFile),acceptance=await readJson(launch.acceptanceFile);
  assert.equal(rehearsal.manifestSha256,manifestHash);assert.equal(rehearsal.liveMutations,false);assert.equal(rehearsal.migration.applied.length,(await candidateMigrations()).length-(manifest.previousMigrationCount??48));
  assert.equal(acceptance.manifestSha256,manifestHash);assert.equal(acceptance.passed,true);
  assert.equal(sha(await readFile(acceptance.gateFile)),acceptance.gateSha256);
  assert.equal(launch.recoveryKeyCustodyConfirmed,true,'Separate protected recovery key custody must be confirmed');
  assert(typeof launch.recoveryKeyCustodyReference==='string'&&launch.recoveryKeyCustodyReference.trim().length>=5,'Key custody evidence reference required, never the key');
  return launch;
}
async function migrate(launchFile) {
  const launch=await launchEvidence(launchFile);
  const {createConnection}=await import('node:net');
  const listening=await new Promise(ok=>{const socket=createConnection({host:'127.0.0.1',port:3002});socket.once('connect',()=>{socket.destroy();ok(true);});socket.once('error',()=>ok(false));});
  assert.equal(listening,false,'Stop supervised application before migration');
  const {archive,key}=await backup();
  await restoreBackup(archive.file,key,{context:{sourceDatabase:env.DB_NAME,admin:await adminConfig(),mysqlTool:backupConfig.mysqlTool,directory:resolve(evidence,'backups')}});
  assertLaunch(launch,manifestHash);
  const db=await mysql.createConnection({...await adminConfig(),database:env.DB_NAME});
  try {
    const [grantsBefore]=await db.query(`SHOW GRANTS FOR ${db.escape(env.DB_USER)}@'localhost'`);
    await save('grants-before-'+stamp()+'.json',grantsBefore.map(row=>Object.values(row)[0].replace(/ IDENTIFIED BY PASSWORD '[^']*'/g,' [authentication withheld]')));
    const migration=await upgrade(db);await grantAuthRuntime(db,env.DB_NAME,env.DB_USER);
    const [grantsAfter]=await db.query(`SHOW GRANTS FOR ${db.escape(env.DB_USER)}@'localhost'`);
    await save('grants-after-'+stamp()+'.json',grantsAfter.map(row=>Object.values(row)[0].replace(/ IDENTIFIED BY PASSWORD '[^']*'/g,' [authentication withheld]')));
    const checks=await smoke(release,env,false);
    console.log(JSON.stringify({reportFile:await save('cutover-'+stamp()+'.json',{completedAt:new Date().toISOString(),manifestSha256:manifestHash,archive,migration,checks,operatorSignoff:'pilot pending'})}));
  } finally {await db.end();}
}
try {
  await verifyArtifact();
  const [mode,arg]=process.argv.slice(2);
  if(mode==='rehearse')await rehearse();
  else if(mode==='bind-gate')await bindGate(arg);
  else if(mode==='migrate')await migrate(arg);
  else if(mode==='preflight'){await launchEvidence(arg);console.log(JSON.stringify({manifestSha256:manifestHash,readyForApprovedWindow:true}));}
  else if(mode==='verify')console.log(JSON.stringify({checks:await smoke(release,env),manifestSha256:manifestHash}));
  else if(mode==='verify-artifact')console.log(JSON.stringify({manifestSha256:manifestHash,files:manifest.files.length}));
  else throw Error('Use rehearse, bind-gate PATH, migrate PATH, verify or verify-artifact');
} catch(error) {
  console.error('Release operation stopped; no automatic retry or rollback. Code:',error.code??error.name);
  if(error.name==='AssertionError')console.error(error.message.split('\n')[0]);
  process.exitCode=1;
}
