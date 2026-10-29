// Persistent, synthetic adapters for the existing disposable test infrastructure.
// Never changes .env, application code, grants of existing accounts, or live data.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID, createHash, randomBytes} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync, spawn} from 'node:child_process';
import mysql from 'mysql2/promise';
import {localAdmin} from './migration-lib.mjs';

export const folder = 'output/populated-uat-20261024';
const privateFolder = folder + '/private';
const hash = value => createHash('sha256').update(value).digest('hex');
const flags = ['INDIVIDUAL_PAYMENTS_ENABLED','OMITTED_PAYMENTS_ENABLED','INDIVIDUAL_DOCUMENTS_ENABLED','INDIVIDUAL_SETTLEMENT_ENABLED'];
const identifier = name => {assert.match(name,/^[a-zA-Z0-9_]+$/);return '`'+name+'`';};
const pathFor = scenario => {assert.match(scenario,/^[A-F]$/);return `${folder}/${scenario}.json`;};
const json = async path => JSON.parse(await readFile(path,'utf8'));
export const save = async (path, value) => writeFile(path,JSON.stringify(value,null,2)+'\n');

async function protectDirectory() {
  await mkdir(privateFolder,{recursive:true});
  assert.equal(process.platform,'win32','This local adapter requires reviewed Windows ACL handling');
  const sid=execFileSync('powershell.exe',['-NoProfile','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8',windowsHide:true}).trim();
  assert.match(sid,/^S-1-[\d-]+$/);
  execFileSync('icacls.exe',[resolve(privateFolder),'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true,stdio:'pipe'});
}

export async function registerOwned(context) {
  const scenario=process.env.LDSS_UAT_SCENARIO;
  const metadata=await json(pathFor(scenario));
  assert.equal(metadata.state,'allocated');
  assert.match(context.database,/^ldss_(?:import|f19)_test_\d+_[a-f\d]{8}$/);
  assert.match(context.runtimeUser,/^ldss_test_\d+_[a-f\d]{8}$/);
  // The import driver selects the new schema immediately after this hook.
  await context.admin.changeUser({database:context.database});
  assert.equal((await context.admin.query('SELECT DATABASE() name'))[0][0].name,context.database);
  await context.admin.query('CREATE TABLE _ldss_uat_owner (id CHAR(36) PRIMARY KEY, purpose VARCHAR(100) NOT NULL, scenario CHAR(1) NOT NULL, token_hash CHAR(64) NOT NULL, created_at DATETIME(6) NOT NULL) ENGINE=InnoDB');
  await context.admin.execute('INSERT INTO _ldss_uat_owner VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))',[metadata.ownerId,'LDSS reusable synthetic UAT',scenario,hash(metadata.ownerToken)]);
  await save(`${privateFolder}/${scenario}-credentials.json`,{runtimeUser:context.runtimeUser,runtimePassword:context.runtimePassword,accountPassword:context.password});
  Object.assign(metadata,{database:context.database,runtimeUser:context.runtimeUser,state:'initializing',createdAt:new Date().toISOString()});
  await save(pathFor(scenario),metadata);
}

export async function owned(scenario) {
  const metadata=await json(pathFor(scenario));
  assert.match(metadata.database,/^ldss_(?:import|f19)_test_\d+_[a-f\d]{8}$/);
  assert.equal(metadata.runtimeUser,metadata.database.replace(/^ldss_(?:import|f19)_test_/,'ldss_test_'),'Runtime account must belong to this exact generated schema identity');
  assert.notEqual(metadata.database,process.env.DB_NAME);
  const db=await localAdmin();
  try {
    await db.changeUser({database:metadata.database});
    const [rows]=await db.query('SELECT * FROM _ldss_uat_owner');
    assert.equal(rows.length,1);
    assert.equal(rows[0].id,metadata.ownerId);assert.equal(rows[0].scenario,scenario);
    assert.equal(rows[0].purpose,'LDSS reusable synthetic UAT');assert.equal(rows[0].token_hash,hash(metadata.ownerToken));
    return {db,metadata};
  } catch(error) {await db.end();throw error;}
}

export async function preserve(mode) {
  await mkdir(folder,{recursive:true});
  const gate=await json('output/p10-integration-20261023/uat-r1/F36-report.json');
  const files=[];
  for(const entry of [...gate.sourceFiles,...gate.artifacts,...gate.migrations]) {
    const sha256=hash(await readFile(entry.file));assert.equal(sha256,entry.sha256,entry.file);files.push({file:entry.file,sha256});
  }
  files.push({file:'.env',sha256:hash(await readFile('.env'))});
  const db=await localAdmin();
  try {
    assert.equal((await db.query('SELECT DATABASE() name'))[0][0].name,'ldss_scholar_monitor_dev');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    const data=[];
    for(const {name} of tables) {
      const [rows]=await db.query(`SELECT * FROM ${identifier(name)}`);
      data.push({name,count:rows.length,sha256:hash(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort())),ddl:hash(JSON.stringify((await db.query(`SHOW CREATE TABLE ${identifier(name)}`))[0]))});
    }
    await db.commit();
    const [schemas]=await db.query('SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME');
    const [accounts]=await db.query("SELECT User name,Host host FROM mysql.user WHERE User LIKE 'ldss%' ORDER BY User,Host");
    // Privilege metadata contains no password hash; normalize ordering for equality.
    const privileges={};
    for(const table of ['USER_PRIVILEGES','SCHEMA_PRIVILEGES','TABLE_PRIVILEGES','COLUMN_PRIVILEGES']) {
      const [rows]=await db.query(`SELECT * FROM information_schema.${table} WHERE GRANTEE LIKE "'ldss%"`);
      privileges[table]=rows.map(row=>JSON.stringify(row)).sort();
    }
    const result={at:new Date().toISOString(),files,data,schemas,accounts,privileges,features:Object.fromEntries(flags.map(f=>[f,process.env[f]??'false']))};
    if(mode==='after') {
      const before=await json(folder+'/preservation-before.json');
      assert.deepEqual(result.files,before.files);assert.deepEqual(result.features,before.features);
      const differences=result.data.filter(row=>JSON.stringify(row)!==JSON.stringify(before.data.find(b=>b.name===row.name)));
      assert.ok(differences.every(row=>row.name==='auth_sessions'),'Unexpected development business/history change');
      for(const row of result.data){const original=before.data.find(b=>b.name===row.name);assert.ok(original);assert.equal(row.ddl,original.ddl);assert.equal(row.count,original.count);}
      const owners=await Promise.all(['A','B','C','D','E','F'].map(s=>json(pathFor(s))));assert.ok(owners.every(o=>o.state==='ready'));
      assert.deepEqual(result.schemas.map(r=>r.name).sort(),[...before.schemas.map(r=>r.name),...owners.map(o=>o.database)].sort(),'Only the six owned UAT schemas may be added');
      assert.deepEqual(result.accounts.map(r=>JSON.stringify(r)).sort(),[...before.accounts,...owners.map(o=>({name:o.runtimeUser,host:'localhost'}))].map(r=>JSON.stringify(r)).sort(),'Only dedicated owned runtime identities may be added');
      const originalGrantees=new Set(before.accounts.map(a=>"'"+a.name+"'@'"+a.host+"'"));
      for(const table of Object.keys(privileges)) assert.deepEqual(privileges[table].filter(row=>originalGrantees.has(JSON.parse(row).GRANTEE)),before.privileges[table],table);
      result.preserved={acceptedInputs:files.length-1,developmentTables:data.length,exactTables:data.length-differences.length,developmentDefinitionsAndCountsExact:true,differingTables:differences.map(r=>r.name),sessionDifferenceCause: differences.length?'Not established by the initial table hashes; no whole-database zero-change claim':null,existingAccountsAndPrivilegesRetained:true,environmentExact:true};
    }
    await save(`${folder}/preservation-${mode}.json`,result);
    console.log(JSON.stringify(result.preserved??{acceptedInputs:files.length-1,developmentTables:data.length,schemas:schemas.length,accounts:accounts.length,features:result.features}));
  } finally {await db.rollback();await db.end();}
}

async function generate(scenario) {
  const sourcePath=scenario==='F'?'scripts/test-eligibility-db.ts':'scripts/test-import-db.ts';
  let source=await readFile(sourcePath,'utf8');const originalHash=hash(source);
  const replace=(a,b)=>{assert.equal(source.split(a).length-1,1,`Adapter source changed: ${a.slice(0,70)}`);source=source.replace(a,b);};
  if(scenario!=='F') {
    replace('from "./test-document-batch-scenarios.js"','from "./uat-document-batches.js"');
    const needle='code:"IMPORT-CURRENT",name:"Current import semester",academicYearId:year.id,startsOn:later(-20),endsOn:later(120)';
    replace(needle,needle+',termKind:"first"');
    replace('ok<{definitions:{id:string;code:string}[]}>','ok<{definitions:{id:string;code:string}[];coverage:{sourceHash:string}}>');
    replace('predecessorSemesterId:previous.id,coverageReason:','predecessorSemesterId:previous.id,expectedCoverageHash:options.coverage.sourceHash,coverageReason:');
    replace('expectedPredecessorVersion:previous.version,reviewed:true','expectedPredecessorVersion:previous.version,expectedCoverageHash:options.coverage.sourceHash,reviewed:true');
    // Realistic but explicitly fictional presentation. No LAN-derived names or mapping.
    replace('`ReceiptVolume${i}`,randomBytes(12).toString("hex")','`ReceiptVolume${String(i).padStart(4,"0")} ${i%7===0?"de la Estrella del Horizonte":"Luntian"}`,`Fictional ${["Amihan","Liwayway","Sol","Maria Clara","Juan Miguel"][i%5]} ${Array.from(String(i).padStart(3,"0"),d=>["ba","de","fi","go","lu","ma","ni","po","ra","se"][Number(d)].repeat(2)).join("")}`');
  }
  replace('password = "A long synthetic testing passphrase!"','password = "Uat-"+newToken()');
  replace('createdDatabase = true;','createdDatabase = true;\n  await registerOwned({admin,database,runtimeUser,runtimePassword,password});');
  // Explicit feature flags only on the injected isolated app. No process/global .env mutation.
  source=source.replace(/INDIVIDUAL_PAYMENTS_ENABLED:process\.argv[^\n]*?(?= \}\),| \}\))/g,"INDIVIDUAL_PAYMENTS_ENABLED:'true',OMITTED_PAYMENTS_ENABLED:'true',INDIVIDUAL_DOCUMENTS_ENABLED:'true',INDIVIDUAL_SETTLEMENT_ENABLED:'true'");
  const start=source.lastIndexOf('  if (process.argv.includes("--browser")) {');
  assert.ok(start>0);const end=source.indexOf('\n} finally {',start);assert.ok(end>start);
  source=source.slice(0,start)+`  await populateUat({admin:root??admin,runtime:runtime!,request,scenario:${JSON.stringify(scenario)},database});\n`+source.slice(end);
  // Match exact cleanup region, retain all normal connection close operations.
  const cleanupStart=source.lastIndexOf('  if (createdUser)');const cleanupEnd=source.indexOf('  await admin.end();',cleanupStart);
  assert.ok(cleanupStart>0&&cleanupEnd>cleanupStart);
  source=source.slice(0,cleanupStart)+'  // Persistent owned UAT: cleanup requires a separate exact-name confirmation.\n'+source.slice(cleanupEnd);
  source=source.replaceAll('from "./','from "../../../scripts/').replaceAll("from './","from '../../../scripts/").replaceAll('from "../server/','from "../../../server/').replaceAll("from '../server/","from '../../../server/").replaceAll('import("./','import("../../../scripts/').replaceAll("import('./","import('../../../scripts/");
  source=`import {registerOwned} from '../../../scripts/uat-environment.mjs';\nimport {populateUat} from '../../../scripts/uat-scenarios.ts';\n`+source;
  const file=`${privateFolder}/fixture-${scenario}.ts`;await writeFile(file,source);
  await save(`${folder}/adapter-${scenario}.json`,{sourcePath,originalHash,generatedHash:hash(source),changes:['Relative imports relocated','Owned metadata and restricted private credentials retained','Existing import fixture regular-semester identity/coverage supplied before receipts','Fictional presentation names','Explicit isolated feature flags','Normal automatic cleanup replaced by confirmed owned cleanup','Populate separate scenario using existing API commands'],applicationSourceChanged:false});
  return file;
}

async function inventory(scenario) {
  const {db,metadata}=await owned(scenario);
  try {
    const [tables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    const counts=[];for(const {name} of tables)counts.push({name,count:Number((await db.query(`SELECT COUNT(*) n FROM ${identifier(name)}`))[0][0].n)});
    const result={database:metadata.database,scenario,state:metadata.state,runtimeAccount:metadata.runtimeUser+'@localhost',tables:counts,destructive:false};
    await save(`${folder}/inventory-${scenario}.json`,result);console.log(JSON.stringify(result));
  } finally {await db.end();}
}

async function main() {
  const [command,scenario]=process.argv.slice(2);
  if(command==='preserve')return preserve(scenario);
  if(command==='create') {
    pathFor(scenario);await protectDirectory();
    try {
      const prior=await json(pathFor(scenario));
      assert.ok(prior.state==='removed'&&process.argv.includes('--new-after-confirmed-cleanup'),'Existing UAT manifest: refuse overwrite or reset. Use explicit owned cleanup first.');
      const db=await localAdmin();
      try {const [[existing]]=await db.execute('SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[prior.database]);assert.equal(Number(existing.n),0);}finally{await db.end();}
      await save(`${folder}/removed-${scenario}-${prior.ownerId}.json`,prior);
    } catch(e){if(e.code!=='ENOENT')throw e;}
    await save(pathFor(scenario),{scenario,ownerId:randomUUID(),ownerToken:randomBytes(32).toString('hex'),state:'allocated',synthetic:true,source:'existing disposable fixture; no LAN records',createdAt:new Date().toISOString()});
    const file=await generate(scenario);
    const args=scenario==='F'?['--main-payroll','--browser-release','--omitted-payments','--omitted-browser','--individual-documents','--individual-settlement']:['--payment-recording-large','--payment-recording-browser'];
    const code=await new Promise((resolveRun,reject)=>{const child=spawn(process.execPath,['--expose-gc','--max-old-space-size=4096','--import','tsx',file,...args],{windowsHide:true,stdio:'inherit',env:{...process.env,LDSS_UAT_SCENARIO:scenario}});child.on('error',reject);child.on('exit',resolveRun);});
    assert.equal(code,0,'Fixture failed; owned partial database retained for investigation, never automatically reset');return;
  }
  if(command==='inventory'||command==='reset-dry-run')return inventory(scenario);
  if(command==='cleanup') {
    const {db,metadata}=await owned(scenario);
    try {
      assert.equal(process.argv[4],`--confirm-drop=${metadata.database}`,'Exact destructive confirmation required; run reset-dry-run first');
      const inventoryBytes=await readFile(`${folder}/inventory-${scenario}.json`),reviewed=JSON.parse(inventoryBytes);
      assert.equal(process.argv[5],`--inventory-sha256=${hash(inventoryBytes)}`,'Supply the reviewed dry-run inventory hash');
      assert.equal(reviewed.database,metadata.database);assert.equal(reviewed.runtimeAccount,metadata.runtimeUser+'@localhost');
      const [currentTables]=await db.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
      assert.deepEqual(currentTables.map(t=>t.name),reviewed.tables.map(t=>t.name),'Schema changed since dry run');
      for(const table of reviewed.tables)assert.equal(Number((await db.query(`SELECT COUNT(*) n FROM ${identifier(table.name)}`))[0][0].n),table.count,'UAT changed since dry run; inventory and review again');
      const grantee="'"+metadata.runtimeUser+"'@'localhost'";
      for(const table of ['SCHEMA_PRIVILEGES','TABLE_PRIVILEGES','COLUMN_PRIVILEGES']) {const [[outside]]=await db.execute(`SELECT COUNT(*) n FROM information_schema.${table} WHERE GRANTEE=? AND TABLE_SCHEMA<>?`,[grantee,metadata.database]);assert.equal(Number(outside.n),0,'Runtime identity is shared outside its owned schema; refuse cleanup');}
      const [global]=await db.execute('SELECT PRIVILEGE_TYPE p FROM information_schema.USER_PRIVILEGES WHERE GRANTEE=?',[grantee]);assert.ok(global.every(r=>r.p==='USAGE'),'Do not remove a privileged/shared account');
      await db.changeUser({database:'information_schema'});
      await db.query(`DROP DATABASE ${identifier(metadata.database)}`);
      await db.query('DROP USER ?@\'localhost\'',[metadata.runtimeUser]);
      metadata.state='removed';metadata.removedAt=new Date().toISOString();await save(pathFor(scenario),metadata);
    } finally {await db.end();}return;
  }
  if(command==='serve') {
    const {db,metadata}=await owned(scenario);await db.end();assert.equal(metadata.state,'ready');
    const secrets=await json(`${privateFolder}/${scenario}-credentials.json`);
    const port=Number(process.argv[4]??3003);assert.ok(Number.isInteger(port)&&port>=3003&&port<=3010);
    const {buildApp}=await import('../server/app.ts');const {loadConfig}=await import('../server/config.ts');
    const pool=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:metadata.database,user:secrets.runtimeUser,password:secrets.runtimePassword,timezone:'Z',connectionLimit:8});
    const app=buildApp(loadConfig({APP_ENV:'test',HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:`http://127.0.0.1:${port}`,DB_NAME:metadata.database,...Object.fromEntries(flags.map(f=>[f,'true']))}),{database:{pool,check:async()=>{await pool.query('SELECT 1');return 'connected';},close:async()=>{}},clientRoot:resolve('dist/client')});
    await app.listen({host:'127.0.0.1',port});console.log(JSON.stringify({url:`http://127.0.0.1:${port}`,scenario,database:metadata.database,synthetic:true}));
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();await pool.end();process.exit(0);});return;
  }
  throw new Error('Use: preserve before|after; create A-F; inventory A-F; reset-dry-run A-F; serve A-F [3003-3010]; cleanup A-F --confirm-drop=EXACT_OWNED_DATABASE --inventory-sha256=REVIEWED_HASH');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('scripts/uat-environment.mjs'))main().catch(e=>{console.error('UAT command failed:',e.code??e.message);process.exitCode=1;});
