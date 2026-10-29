import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const folder='output/historical-multi-batch-20261024';
// No login, session write or business command against the preceding V2 fixture.
const source=String.raw`import 'dotenv/config';
import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import mysql from 'mysql2/promise';
import {AuthorizationService} from '../../../server/authorization/service.js';import {OvrService} from '../../../server/ovr/service.js';import {PaymentRecordingService} from '../../../server/payments/recording-service.js';
import {managedCandidates} from '../../../server/ovr/managed-payroll.js';import {batchMetadata} from '../../../server/ovr/detail-reads.js';import {currentPayout} from '../../../server/payouts/service.js';import {cachedReads} from '../../../server/read-cache.js';
import {AuthorizationService as OldAuthorization} from '../baseline/server/authorization/service.js';import {OvrService as OldOvr} from '../baseline/server/ovr/service.js';
const folder=${JSON.stringify(folder)},json=async(p:string)=>JSON.parse(await readFile(p,'utf8')),runs:any[]=[];
for(const [fixture,path] of [['V2 legacy','output/localhost-two-batch-v2-20261024'],['V3 bound',folder]]){
 const m=await json(path+'/T.json'),secret=await json(path+'/private/credentials.json');assert.match(m.database,/^ldss_(twobatch_v2|hmulti)_test_\d+_[a-f\d]{8}$/);
 const pool=mysql.createPool({host:'127.0.0.1',port:Number(process.env.DB_PORT??3306),database:m.database,user:m.runtimeUser,password:secret.runtimePassword,timezone:'Z',connectionLimit:2});
 let selects=0,historicalSelects=0,sqlMs=0;const get=pool.getConnection.bind(pool);pool.getConnection=async()=>{const connection=await get();return new Proxy(connection,{get(db,method){const f=Reflect.get(db,method);if(method!=='execute'&&method!=='query')return typeof f==='function'?f.bind(db):f;return async(sql:string,values?:unknown[])=>{const start=performance.now();const r=await f.call(db,sql,values);if(/^\s*SELECT/i.test(sql)){selects++;if(sql.includes('historical_payout_setups'))historicalSelects++;sqlMs+=performance.now()-start;}return r;};}});};
 try{const [[staff]]:any=await pool.query("SELECT id FROM users WHERE email='staff@example.invalid'");
  for(const version of fixture==='V2 legacy'?['before','after']:['after']){
   const service=version==='before'?new OldOvr(new OldAuthorization(pool)):new OvrService(new AuthorizationService(pool));
   for(const limit of [25,50]){selects=0;historicalSelects=0;sqlMs=0;const start=performance.now();const result=fixture==='V2 legacy'?await service.candidatePage(staff.id,m.batches[1].batchId,{offset:0,limit}):await service.entryPage(staff.id,m.batches[1].batchId,{offset:0,limit});runs.push({fixture,version,operation:fixture==='V2 legacy'?'candidate-page':'frozen-entry-page',limit,selects,historicalSelects,sqlMs,ms:performance.now()-start,bytes:Buffer.byteLength(JSON.stringify(result)),rows:'items' in result?result.items.length:result.entries.length});}
  }
  if(fixture==='V3 bound'){
   for(const limit of [25,50,200]){selects=0;historicalSelects=0;sqlMs=0;const start=performance.now();const r=await new AuthorizationService(pool).readSnapshot(staff.id,'ovr.prepare',async connection=>{const db=cachedReads(connection),cycle=await currentPayout(db,m.cycleId),batch=await batchMetadata(db,m.batches[1].batchId);const [rows]:any=await db.execute('SELECT id FROM scholarship_records WHERE scholar_id IN ('+m.batches[1].scholarIds.map(()=>'?').join(',')+') ORDER BY id LIMIT '+limit,m.batches[1].scholarIds);return managedCandidates(db,batch,cycle,rows.map((r:any)=>r.id));});assert.equal(r?.form.rows.length,limit);runs.push({fixture,version:'after',operation:'read-only-bound-source-assessment',limit,selects,historicalSelects,sqlMs,ms:performance.now()-start,rows:r?.items.length,eligible:r?.form.rows.length,committed:false});}
   for(const b of m.batches){selects=0;historicalSelects=0;sqlMs=0;const start=performance.now();const r=await new PaymentRecordingService(new AuthorizationService(pool)).summary(staff.id,b.batchId);runs.push({fixture,version:'after',operation:'payment-summary',batch:b.number,selects,historicalSelects,sqlMs,ms:performance.now()-start,canRecord:r.canRecord,pending:r.pending});}
  }
 }finally{await pool.end();}
}
await writeFile(folder+'/loading-observations.json',JSON.stringify({at:new Date().toISOString(),runs,scope:'Local single-run observations; V2 before/after use the same unchanged data and archived accepted code. V3 frozen pages have different semantics; no speedup claim. No authentication/session or business writes to V2.'},null,2)+'\n');console.log(JSON.stringify(runs));
`;
assert.ok((await readFile(folder+'/baseline/server/ovr/service.ts','utf8')).length);
const file=folder+'/private/performance.ts';await writeFile(file,source);
const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--expose-gc','--import','tsx',file],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve);});assert.equal(code,0);
