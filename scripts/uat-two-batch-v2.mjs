// Versioned adapter: retains the original eight local schemas and all old fixtures.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const folder='output/localhost-two-batch-v2-20261024',generated=folder+'/private/environment.ts';
const sha=v=>createHash('sha256').update(v).digest('hex');
async function generate(){
 let s=await readFile('scripts/uat-two-batch.ts','utf8');const originalHash=sha(s);
 const replace=(a,b)=>{assert.equal(s.split(a).length-1,1,`Fixture adapter anchor changed: ${a.slice(0,100)}`);s=s.replace(a,b);};
 replace("export const folder='output/localhost-two-batch-20261024'",`export const folder='${folder}'`);
 s=s.replaceAll('ldss_twobatch_test_','ldss_twobatch_v2_test_').replaceAll('ldss_two_','ldss_twov2_').replaceAll('LDSS synthetic 800+200 localhost','LDSS synthetic 800+200 localhost v2').replaceAll('3009','3010');
 replace("f.startsWith('uat-')&&f!=='uat-two-batch.ts'","f.startsWith('uat-')&&f!=='uat-two-batch-v2.mjs'&&f!=='uat-two-batch-variety.ts'");
 replace("const targets=[process.env.DB_NAME!,", "const original=await json('output/localhost-two-batch-20261024/T.json');const targets=[process.env.DB_NAME!,original.database,");
 replace('/^(ldss_scholar_monitor_dev|ldss_(import|f19)_test_\\d+_[a-f\\d]{8})$/','/^(ldss_scholar_monitor_dev|ldss_(import|f19)_test_\\d+_[a-f\\d]{8}|ldss_twobatch_test_\\d+_[a-f\\d]{8})$/');
 replace('existingSchemas:7','existingSchemas:8');
 replace("for(const file of [...priorFiles.map(f=>'scripts/'+f),", "for(const file of ['docs/testing/LDSS_LOCALHOST_TWO_BATCH_UAT.md',...priorFiles.map(f=>'scripts/'+f),");
 replace("await config('schools',{code:'TWO-SCHOOL',name:'Fictional Luntian College'});await config('courses',{code:'TWO-COURSE',name:'Fictional degree program'});", "await createCatalog(config);await save(folder+'/academic-source.json',{synthetic:true,version:2,schools,programs,batches:[0,1].map(i=>({number:i+1,profiles:profilesForBatch(i)})),programLengthScope:'Fictional fixture facts only; not an application policy change'});");
 const start=s.indexOf('   const rows=Array.from({length:count}');const end=s.indexOf('\n   const book=',start);assert.ok(start>0&&end>start);
 s=s.slice(0,start)+"   const profiles=profilesForBatch(index);const rows=profiles.map(p=>[p.lastName,p.firstName,p.middleName,p.suffix,p.schoolCode,p.yearLevel,p.classification,p.courseCode??'']);"+s.slice(end);
 replace("knownProfileFacts:'Fictional school and second-year standing are explicit fixture facts; one quarter of courses remain genuinely unknown'", "knownProfileFacts:'Exact distributed year levels, varied fictional schools/programs, first-year entrants with reviewed SHS alternatives; some courses genuinely unknown'");
 replace('cor:true,cog:true,receivedOn:day','cor:true,cog:false,receivedOn:day');
 replace("assert.equal(result.items.length,count);assert.equal(result.receivedCount,count*2);", "assert.equal(result.items.length,count);assert.equal(result.receivedCount,count);console.log(`V2 batch ${number}: ${count} imported, COR received; receiving grades sources`);await receiveGrades({admin,request,ok,result,profiles,semester,day,offset,folder,number});console.log(`V2 batch ${number}: grading sources prepared, publishing masterlist`);");
 replace("   const path=`/api/v1/document-batches/prior-approval-preview", "   console.log(`V2 batch ${number}: official masterlist published; recording scoped prior review`);const path=`/api/v1/document-batches/prior-approval-preview");
 replace("   const item:FixtureBatch={number,count,", "   console.log(`V2 batch ${number}: prior reviews current`);const item:FixtureBatch={number,count,");
 replace("  const result={at:new Date().toISOString(),database:m.database,", "  await verifyAcademic(c,folder);const result={at:new Date().toISOString(),database:m.database,");
 replace(" if(command==='checkpoint-first')return captureFirstFreeze();", " if(command==='academic'){const c=await open();try{return await verifyAcademic(c,folder);}finally{await c.close();}}if(command==='checkpoint-first')return captureFirstFreeze();");
 // Finalize returns the updated batch. Avoid a redundant full-detail read after freezing.
 replace("for(const [role,action] of [['staff','submit-review'],['coordinator','finalize']]){await ok(request(role,`/api/v1/ovr-batches/${item.batchId}/${action}`,{expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash,...e}));d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));}","for(const [role,action] of [['staff','submit-review'],['coordinator','finalize']]){const updated=await ok<OvrBatch>(request(role,`/api/v1/ovr-batches/${item.batchId}/${action}`,{expectedRevision:d.batch.revision,expectedSourceHash:d.managed!.sourceHash,...e}));if(action==='submit-review')d=await ok<OvrDetail>(request('staff',`/api/v1/ovr-batches/${item.batchId}`));else d.batch=updated;}");
 s=s.replaceAll("from './migration-lib.mjs'","from '../../../scripts/migration-lib.mjs'").replaceAll("from '../server/","from '../../../server/").replaceAll("from './uat-types.js'","from '../../../scripts/uat-types.js'");
 s="import {profilesForBatch,createCatalog,receiveGrades,verifyAcademic,schools,programs} from '../../../scripts/uat-two-batch-variety.ts';\n"+s;
 await mkdir(folder+'/private',{recursive:true});await writeFile(generated,s);await writeFile(folder+'/adapter.json',JSON.stringify({original:'scripts/uat-two-batch.ts',originalHash,generatedHash:sha(s),changes:['Separate V2 ownership/schema/account/output and port 3010','Preserve original eight local schemas and old helpers','Exact year/program distribution','Approved SHS entrant alternatives before grades receipt','No per-document verification, only scoped prior review','Existing historical source/cutoff guards retained'],applicationSourceChanged:false},null,2)+'\n');
}
const args=process.argv.slice(2);assert.ok(['preserve','create','progress','verify','academic','controls','serve'].includes(args[0]),'Use preserve before|after, create, progress, verify, academic, controls, serve');
await generate();
const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--expose-gc','--max-old-space-size=4096','--import','tsx',generated,...args],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve);});assert.equal(code,0,'Owned V2 fixture retained; no reset or removal attempted');
