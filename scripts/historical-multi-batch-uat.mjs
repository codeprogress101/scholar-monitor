import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const folder='output/historical-multi-batch-20261024';
let source=await readFile('output/localhost-two-batch-v2-20261024/private/environment.ts','utf8');
source=source.replaceAll('output/localhost-two-batch-v2-20261024',folder).replaceAll('ldss_twobatch_v2_test_','ldss_hmulti_test_').replaceAll('ldss_twov2_','ldss_hmulti_').replaceAll('localhost v2','localhost multi-batch').replaceAll('3010','3011');
const change=(a,b)=>{assert.equal(source.split(a).length-1,1,a.slice(0,100));source=source.replace(a,b);};
change("original.database,...", "original.database,(await json('output/localhost-two-batch-v2-20261024/T.json')).database,...");
change('|ldss_twobatch_test_\\d+_[a-f\\d]{8})$/','|ldss_twobatch_test_\\d+_[a-f\\d]{8}|ldss_twobatch_v2_test_\\d+_[a-f\\d]{8})$/');
change('existingSchemas:8','existingSchemas:9');
change("const flags={", "const flags={HISTORICAL_MULTIBATCH_ENABLED:'true',");
change("from '../../../scripts/uat-two-batch-variety.ts'", "from './academic-variety.ts'");
change("key=randomUUID()", "key:string=randomUUID()");
change("const evidence={reason:", "const timeline=[{opensOn:offset(-20),deadlineOn:offset(-3),reportedReleaseOn:offset(-2)},{opensOn:offset(-2),deadlineOn:offset(-1),reportedReleaseOn:offset(-1)}];await save(folder+'/historical-scenario-facts.json',{synthetic:true,notOfficial:true,declaredBeforeImports:true,day,timeline,reference:'SYNTHETIC-800-200',meaning:'Explicit fictional batch-level historical dates; no individual actual payment or historical physical receipt asserted'});\n  const evidence={reason:");
change('deadlineOn:index===0?offset(-1):day','deadlineOn:timeline[index].deadlineOn');
change('deadlineOn:offset(-1),reportedReleaseOn:day','deadlineOn:timeline[0].deadlineOn,reportedReleaseOn:timeline[0].reportedReleaseOn');
change("originalApprovalOn:null,historicalPhysicalReceiptOn:null", "historicalDates:timeline[index],originalApprovalOn:null,historicalPhysicalReceiptOn:null");
const begin=source.indexOf('    // The historical setup is single-root.');
const end=source.indexOf('\n   }\n   await save(manifest,m)',begin);assert.ok(begin>0&&end>begin);
source=source.slice(0,begin)+`    item.batchId=await appendAndCheck(c,item,{...timeline[1],expectedCycleVersion:m.cycleVersion,expectedSemesterVersion:semester.version,expectedYearVersion:year.version,expectedHistoricalRevision:1,expectedSequence:1,importId:item.importId,reference:item.reference,sourceLocation:body.sourceLocation,reason:evidence.reason,reviewed:true});await save(manifest,m);
    await finalize(c,item);`+source.slice(end);
change("m.state='prepared-with-second-batch-blocker'","m.state='ready'");
change('await finishGapReport();','await verify();');
change("applicationSourceChanged:false","applicationSourceChanged:true,historicalAppendGateEnabledOnlyHere:true");
change('assert.equal(Number(counts.scholars),1000);', 'assert.equal(Number(counts.entitlements),1000);assert.equal(Number(counts.allocations),1000);assert.equal(Number(counts.scholars),1000);');
change("const frozen=finalizations.map", "assert.equal(finalizations.length,2);const frozen=finalizations.map");
// Expected, declared source/build changes are reported; existing fixture data and grants remain exact.
change('const sha256=hash(await readFile(e.file));assert.equal(sha256,e.sha256,e.file);', "const sha256=await readFile(e.file).then(hash,e2=>{if(mode==='after'&&e.file.startsWith('dist/'))return null;throw e2;});if(mode==='before')assert.equal(sha256,e.sha256,e.file);");
change('assert.deepEqual(files,before.files);const differences=[];', `const allowed=new Set(${JSON.stringify(['server/app.ts','server/config.ts','server/payouts/submission-service.ts','server/eligibility/semester-sources.ts','server/ovr/managed-payroll.ts','src/HistoricalPayrollSetup.tsx','src/PayoutCyclesPage.tsx','src/scholar-issue-navigation.ts','src/ScholarIssueAction.tsx','src/RegistryEligibility.tsx','src/PayrollCandidates.tsx','src/OvrDrafts.tsx','tests/scholar-issue-navigation.test.ts'])});const changedInputs=files.filter(f=>f.sha256!==before.files.find(b=>b.file===f.file)?.sha256);for(const f of changedInputs)assert.ok(allowed.has(f.file)||f.file.startsWith('dist/'),'Unexpected input change: '+f.file);const differences=[];`);
change('acceptedInputs:1006,environmentAndPriorHelperFilesExact:true','acceptedInputs:1006,changedInputs,environmentAndPriorHelperFilesExact:true');
const marker='const allowed=new Set(';const allowedStart=source.indexOf(marker);assert.ok(allowedStart>0);const allowedEnd=source.indexOf(');const changedInputs',allowedStart);assert.ok(allowedEnd>allowedStart);source=source.slice(0,allowedStart)+marker+JSON.stringify(['scripts/test-financial-reports.ts','server/app.ts','server/config.ts','server/eligibility/semester-sources.ts','server/ovr/detail-reads.ts','server/ovr/managed-payroll.ts','server/ovr/managed-release.ts','server/payouts/submission-service.ts','src/HistoricalPayrollSetup.tsx','src/OvrDrafts.tsx','src/PayoutCyclesPage.tsx','src/PayrollCandidates.tsx','src/PayrollPagedDetails.tsx','src/RegistryEligibility.tsx','src/ScholarIssueAction.tsx','src/scholar-issue-navigation.ts','tests/payroll-detail.test.ts','tests/scholar-issue-navigation.test.ts'])+source.slice(allowedEnd);
let academic=await readFile('scripts/uat-two-batch-variety.ts','utf8');
academic=academic.replaceAll("from '../server/","from '../../../server/").replace("from './uat-types.js'","from '../../../scripts/uat-types.js'");
const a=academic.indexOf(" const [frozen]=");const b=academic.indexOf(' const result=',a);assert.ok(a>0&&b>a);
academic=academic.slice(0,a)+` const [frozen]:any=await admin.query('SELECT batch_id,snapshot FROM ovr_finalizations');assert.equal(frozen.length,2);const allYearCounts=[];
 for(const batch of m.batches){const f=frozen.find((r:any)=>r.batch_id===batch.batchId);assert.ok(f);const form=decodeStoredJson<any>(f.snapshot).payrollForm;assert.equal(form.rows.length,batch.count);const yearCounts=[1,2,3,4,5].map(y=>form.rows.filter((r:any)=>r.yearLevel===y).length);assert.deepEqual(yearCounts,distributions[batch.number-1].counts);allYearCounts.push(yearCounts);assert.deepEqual(form.rows.map((r:any)=>r.scholarId).sort(),[...batch.scholarIds].sort());
 for(const row of form.rows){const a=actual.find((x:any)=>x.scholar_id===row.scholarId);assert.ok(a);assert.equal(row.yearLevel,Number(a.year_level));assert.equal(row.school,schools.find(s=>s.code===a.schoolCode)!.name);assert.equal(row.amountCentavos,500000);if(a.courseCode)assert.equal(row.course,programs.find(p=>p.code===a.courseCode)!.name);else assert.match(row.course,/pending/i);}
 const [[allocations]]:any=await admin.execute('SELECT COUNT(*) n FROM payroll_allocations a JOIN scholarship_records s ON s.id=a.scholarship_id JOIN semester_entitlements e ON e.id=a.entitlement_id WHERE a.batch_id=? AND s.scholar_id=e.scholar_id AND e.semester_id=? AND e.amount_centavos=500000',[batch.batchId,m.semesterId]);assert.equal(Number(allocations.n),batch.count);}
 const yearCounts=allYearCounts;
`+academic.slice(b);
await mkdir(folder+'/private',{recursive:true});const file=folder+'/private/environment.ts';await writeFile(file,source);
await writeFile(folder+'/private/academic-variety.ts',academic);
// Scenario assertions live only in the new owned database.
source=source.replace('async function populate(){',(await readFile('scripts/historical-multi-batch-checks.inc','utf8'))+'\n'+(await readFile('scripts/historical-multi-batch-postchecks.inc','utf8'))+'\nasync function populate(){');
source=source.replace("if(command==='controls')return controls();","if(command==='controls'){await controls();return boundChecks();}");
source=source.replaceAll('V2 batch','Historical batch').replace("${index===0?'processed, all Pending':'draft, cutoff guard retained'}","${item.state}, all Pending");await writeFile(file,source);
const args=process.argv.slice(2);assert.ok(['preserve','create','progress','verify','academic','controls','serve'].includes(args[0]));
const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--expose-gc','--max-old-space-size=4096','--import','tsx',file,...args],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve);});assert.equal(code,0,'Owned fixture retained; never reset automatically');
