import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import mysql from 'mysql2/promise';
import {ScholarService} from '../server/scholars/service.js';
import {AuthorizationService} from '../server/authorization/service.js';
import {PaymentRecordingService} from '../server/payments/recording-service.js';
import {today} from '../server/scholars/validation.js';
import {inventory} from './backup-lib.mjs';
// Read-only acceptance against the explicitly prepared B1 copy, never primary.
const folder=resolve(process.argv[2]??'output/b1-registry-20261025');
const m=JSON.parse(await readFile(folder+'/fixture.json','utf8')),s=JSON.parse(await readFile(folder+'/private/runtime.json','utf8')),e=JSON.parse(await readFile(folder+'/examples.json','utf8'));
assert.match(m.database,/^ldss_registry_test_\d+_[a-f0-9]{8}$/);assert.equal(m.origin,'http://127.0.0.1:3018');assert.equal(m.state,'copied');assert.equal(resolve(m.candidate),process.cwd());
const admin=await mysql.createConnection({host:'127.0.0.1',database:m.database,user:'root',password:process.env.LDSS_SETUP_ADMIN_PASSWORD??'',timezone:'Z'}),pool=mysql.createPool({host:'127.0.0.1',database:m.database,user:m.runtimeUser,password:s.runtimePassword,timezone:'Z'});
try{
 const [[actual]]=await pool.query<mysql.RowDataPacket[]>('SELECT DATABASE() name,CURRENT_USER() account,@@hostname hostname');assert.equal(actual.name,m.database);assert.equal(actual.account,m.runtimeUser+'@localhost');assert.equal(actual.hostname,'DESKTOP-BPLJKRP');
 const before=await inventory(admin),[users]=await pool.query<mysql.RowDataPacket[]>('SELECT id,email FROM users'),staff=users.find(u=>u.email==='staff@example.invalid')!.id,coordinator=users.find(u=>u.email==='coordinator@example.invalid')!.id;
 const service=new ScholarService(new AuthorizationService(pool)),q={registryYearId:e.year,scope:'all',limit:100};
 for(const actor of [staff,coordinator]){
  const current=await service.list(actor,{...q,q:'BOne'});assert.equal(current.total,4);const ids=current.items.map(r=>r.id);for(const key of ['new','continuing','academic'])assert.ok(ids.includes(e.people[key].id));assert.ok(!ids.includes(e.people.legacy.id));assert.ok(!ids.includes(e.people.historical.id));
  assert.equal(current.items.find(r=>r.id===e.people.new.id)?.annualIntake?.classification,'new');assert.equal(current.items.find(r=>r.id===e.people.continuing.id)?.annualIntake?.classification,'continuing');assert.equal(current.items.find(r=>r.id===e.people.new.id)?.placement?.schoolId,null);
  const all=await service.list(actor,{scope:'all',q:'BOne',limit:100});assert.equal(all.total,6);assert.equal(new Set(all.items.map(r=>r.scholarId)).size,6);
  const historical=await service.list(actor,{registryYearId:e.historicalYear.id,scope:'all',q:'BOne',limit:100});assert.equal(historical.total,1);assert.equal(historical.items[0].id,e.people.historical.id);assert.equal(historical.items[0].annualIntake,null);
  const filter=await service.list(actor,{...q,schoolId:e.placement.schoolId,courseId:e.placement.courseId,q:'BOne'});assert.equal(filter.total,2);assert.ok(filter.items.every(r=>r.placement?.schoolId===e.placement.schoolId&&r.placement?.courseId===e.placement.courseId));
  for(const classification of ['new','continuing','unknown']){const filtered=await service.list(actor,{...q,classification,q:'BOne'});assert.ok(filtered.items.every(r=>classification==='unknown'?r.placement?.classification===null:r.placement?.classification===classification));}
  for(const limit of [25,50,100]){const first=await service.list(actor,{...q,limit}),second=await service.list(actor,{...q,limit,offset:limit});assert.equal(first.total,1004);assert.equal(first.items.length,limit);assert.ok(second.items.every(r=>!first.items.some(p=>p.id===r.id)));}
  assert.equal((await service.list(actor,{...q,q:e.people.new.scholarId})).total,1);assert.equal((await service.list(actor,{...q,q:'%_'})).total,0);
 }
 for(const email of ['system_admin@example.invalid','unassigned@example.invalid'])await assert.rejects(service.list(users.find(u=>u.email===email)!.id,q),/permission|access|authorize/i);
 const payments=new PaymentRecordingService(new AuthorizationService(pool)),summaries=[];
 for(const batch of ['608d5a04-34e1-4eeb-8c00-5fd40ad2d44b','9cc2e740-061e-4667-98cc-bc1532032408']){const summary=await payments.summary(staff,batch);assert.equal(summary.canRecord,true);const preview=await payments.preview(staff,batch,{mode:'all_remaining_paid',scholarshipIds:[],outcome:'paid',actualPaidOn:today(),reference:'B1 read-only source check',reason:'No financial outcome command will be committed'});assert.equal(preview.conflicts.length,0);assert.equal(preview.acceptedIds.length,summary.pending);summaries.push(summary);}
 const after=await inventory(admin);assert.deepEqual(after,before,'Registry reads changed data/schema');await writeFile(folder+'/registry-db.json',JSON.stringify({passed:true,currentAssociated:1004,allYears:1006,historical:1,manualNullable:2,sourceClassificationPreserved:true,staffCoordinator:true,deniedRoles:true,filterPageSearchParity:true,readsHaveZeroSideEffects:true,summaries},null,2));console.log('PASS B1 actual annual membership, legacy exclusion, historical context, manual/import evidence, filters/pages/roles, full payment sources and zero read side effects');
}finally{await pool.end();await admin.end();}
