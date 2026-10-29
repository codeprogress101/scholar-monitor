// Explicit opt-in launcher for the retained, owned synthetic localhost fixture only.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import mysql,{type RowDataPacket} from 'mysql2/promise';
import {buildApp} from '../server/app.js';
import {loadConfig} from '../server/config.js';
import {AuthorizationService} from '../server/authorization/service.js';
import {PaymentRecordingService} from '../server/payments/recording-service.js';
import type {TwoBatchManifest} from './uat-types.js';

const folder='output/individual-uat-activation-20261024';
const fixture='output/historical-multi-batch-20261024';
export const individualUatFlags={HISTORICAL_MULTIBATCH_ENABLED:'true',INDIVIDUAL_PAYMENTS_ENABLED:'true',OMITTED_PAYMENTS_ENABLED:'true',INDIVIDUAL_DOCUMENTS_ENABLED:'true',INDIVIDUAL_SETTLEMENT_ENABLED:'true'} as const;
const json=async<T>(file:string):Promise<T>=>JSON.parse(await readFile(file,'utf8')) as T;
export async function individualUatContext(scenario=false){
 assert.equal(process.env.APP_ENV,'development');
 assert.equal(process.env.DB_NAME,'ldss_scholar_monitor_dev');
 assert.ok(['localhost','127.0.0.1'].includes(process.env.DB_HOST??''));
 const original=await json<TwoBatchManifest>(fixture+'/T.json');
 assert.match(original.database,/^ldss_hmulti_test_\d+_[a-f\d]{8}$/);
 const m=scenario?await json<TwoBatchManifest&{sourceDatabase:string;restoredFromSyntheticBaseline:boolean}>(folder+'/scenario.json'):original;
 if(scenario){assert.match(m.database,/^ldss_restore_\d+_[a-f\d]{8}$/);assert.ok('sourceDatabase' in m&&m.sourceDatabase===original.database&&'restoredFromSyntheticBaseline' in m&&m.restoredFromSyntheticBaseline);}
 else assert.equal(m.runtimeUser,m.database.replace('ldss_hmulti_test_','ldss_hmulti_'));
 const secrets=await json<{runtimePassword:string;accountPassword:string}>(scenario?folder+'/private/scenario-credentials.json':fixture+'/private/credentials.json');
 const pool=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:m.database,user:m.runtimeUser,password:secrets.runtimePassword,timezone:'Z',connectionLimit:8});
 try{
  // Fixture ownership is administrative metadata, deliberately unreadable by
  // the restricted application account. Check it without broadening grants.
  const ownerDb=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:m.database,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'});
  let owners:RowDataPacket[];
  try{[owners]=await ownerDb.query<RowDataPacket[]>('SELECT * FROM _ldss_uat_owner');}finally{await ownerDb.end();}
  assert.equal(owners.length,1);assert.equal(owners[0].id,original.ownerId);
  assert.equal(owners[0].token_hash,createHash('sha256').update(original.ownerToken).digest('hex'));
  assert.equal(owners[0].purpose,'LDSS synthetic 800+200 localhost multi-batch');
  const [migrations]=await pool.query<RowDataPacket[]>('SELECT version,checksum FROM schema_migrations');assert.equal(migrations.length,62);
  for(const row of migrations){assert.match(row.version,/^\d{14}_f\d{2}_[a-z_]+\.sql$/);assert.equal(row.checksum,createHash('sha256').update(await readFile('db/migrations/'+row.version)).digest('hex'));}
  const [grants]=await pool.query<RowDataPacket[]>('SHOW GRANTS');assert.doesNotMatch(grants.map(r=>Object.values(r)[0]).join('\n'),/GRANT (?:ALL|CREATE|ALTER|DROP|DELETE)|WITH GRANT OPTION/);
  for(const table of ['payment_records','individual_payment_events','individual_document_versions','payroll_closure_members','ovr_finalizations']){
   await pool.query(`SELECT * FROM ${table} LIMIT 0`);
   await assert.rejects(pool.query(`EXPLAIN DELETE FROM ${table} WHERE 1=0`));
  }
  const port=scenario?3012:3011,origin=`http://127.0.0.1:${port}`;
  const app=buildApp(loadConfig({APP_ENV:'test',PORT:String(port),APP_ORIGIN:origin,...individualUatFlags}),{database:{pool,check:async()=>{await pool.query('SELECT 1');return 'connected';},close:async()=>{}},clientRoot:resolve('dist/client')});
  return {m,pool,app,origin,port,secrets,close:async()=>{await app.close();await pool.end();}};
 }catch(error){await pool.end();throw error;}
}

async function main(){
 const command=process.argv[2];assert.ok(['serve','verify'].includes(command));
 const scenario=process.argv.includes('--scenario');
 const checks=await json<{name:string;code:number}[]>(folder+'/compatibility-tests.json');
 assert.equal(checks.length,5);assert.ok(checks.every(c=>c.code===0),'Complete compatibility verification before activation');
 const c=await individualUatContext(scenario);
 if(command==='serve'){
  await c.app.listen({host:'127.0.0.1',port:c.port});
  console.log(JSON.stringify({url:c.origin,database:c.m.database,synthetic:true,flags:individualUatFlags}));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await c.close();process.exit(0);});
 }else try{
  const [[staff]]=await c.pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email='staff@example.invalid'");
  const service=new PaymentRecordingService(new AuthorizationService(c.pool)),results=[];
  for(const batch of c.m.batches){assert.ok(batch.batchId);const r=await service.summary(staff.id,batch.batchId);assert.equal(r.canRecord,true);assert.equal(r.total,batch.count);if(!scenario){assert.equal(r.pending,batch.count);assert.equal(r.paid,0);assert.equal(r.unclaimed,0);}results.push(r);}
  await writeFile(folder+`/${scenario?'scenario':'baseline'}-readiness.json`,JSON.stringify({at:new Date().toISOString(),database:c.m.database,url:c.origin,flags:individualUatFlags,readOnly:true,results},null,2));
  console.log(JSON.stringify({url:c.origin,ready:true,pending:results.map(r=>r.pending),readOnly:true}));
 }finally{await c.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('scripts/local-individual-uat.ts'))await main();
