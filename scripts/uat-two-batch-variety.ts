import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {UatRequest,HttpOk,TwoBatchManifest} from './uat-types.js';
import type {ImportResult} from '../server/imports/model.js';
import type {OfficialSnapshot} from '../server/masterlists/workflow-model.js';
import type {OvrFinalization} from '../server/ovr/model.js';
// Fictional academic source facts and verification for the versioned fixture only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {decodeStoredJson} from '../server/stored-json.js';

export const schools=[
 {code:'VAR-NARRA',name:'Fictional Narra College'},
 {code:'VAR-ISLA',name:'Fictional Isla Institute'},
 {code:'VAR-BUKAL',name:'Fictional Bukal University'},
 {code:'VAR-HIRAYA',name:'Fictional Hiraya Academy'},
 {code:'VAR-ALON',name:'Fictional Alon Polytechnic'},
];
export const programs=[
 {code:'VAR-IT',name:'Fictional BS Information Technology',years:4},
 {code:'VAR-EDUC',name:'Fictional Bachelor of Elementary Education',years:4},
 {code:'VAR-BUS',name:'Fictional BS Business Administration',years:4},
 {code:'VAR-SOC',name:'Fictional BA Social Studies',years:4},
 {code:'VAR-AGRI',name:'Fictional BS Agriculture',years:4},
 {code:'VAR-NUR',name:'Fictional BS Nursing',years:4},
 {code:'VAR-ARCH5',name:'Fictional five-year Architecture degree',years:5},
 {code:'VAR-ENG5',name:'Fictional five-year Engineering degree',years:5},
];
export function profilesForBatch(index:number){
 const counts=index===0?[200,200,200,160,40]:[50,50,50,40,10];
 const first=['Amihan','Luningning','Sampaguita','Tala','Mayumi','Alon','Hiraya','Dalisay','Ligaya','Bituin','Malaya','Diwa','Lakan','Bayani','Sinag','Isagani','Agila','Nimfa','Rosario','Estrella','Felisa','Rafael','Lourdes','Mateo','Elena','Gabriel','Clarita','Leandro','Solana','Celia','Andres','Marisol'];
 const surnames=['Monteluna','Buenavista','Delarosa','Santos','Dimaculangan','Villaverde','Manalaysay','Balagtas','Cordero','Salcedo','Tolentino','Magbanua','Dela Cruz','Aquino','Mercado','Abad','Sarmiento','Mendoza','Alcantara','Navarro','Robles','De Leon','Magsino','Villanueva','Panganiban','Valencia','Lazaro','Silang','Roxas','Gonzales','Castillo','Flores'];
 let position=0;return counts.flatMap((count,level)=>Array.from({length:count},()=>{
  const local=position++,n=index*800+local;
  const unique=Array.from(String(n).padStart(4,'0'),d=>['ba','de','fi','go','lu','ma','ni','po','ra','se'][Number(d)]).join('');
  const year=level+1,program=year===5?programs[6+(n%2)]:programs[n%programs.length];
  // Missing courses stay unknown; fifth-year records always identify a five-year program.
  const courseCode=year<5&&local%10===0?null:program.code;
  return {syntheticKey:`V2-${String(n+1).padStart(4,'0')}`,firstName:first[n%first.length],lastName:`${surnames[Math.floor(n/32)%surnames.length]} ${unique}`,middleName:n%5===0?'':first[(n+11)%first.length],suffix:n%37===0?'Jr.':'',schoolCode:schools[n%schools.length].code,yearLevel:year,classification:year===1?'New':'Old',courseCode};
 }));
}
export async function createCatalog(config:(kind:string,fields:{code:string;name:string})=>Promise<unknown>){for(const s of schools)await config('schools',{code:s.code,name:s.name});for(const p of programs)await config('courses',{code:p.code,name:p.name});}
export async function receiveGrades(c:{admin:Pool;request:UatRequest;ok:HttpOk;result:ImportResult;profiles:ReturnType<typeof profilesForBatch>;semester:{id:string};day:string;offset:(n:number)=>string;folder:string;number:number}){
 const {admin,request,ok,result,profiles,semester,day,offset,folder,number}=c;
 const ids=result.items.map(p=>p.id);
 const [papers]=await admin.execute<RowDataPacket[]>("SELECT i.id,ss.scholar_id FROM requirement_instances i JOIN requirement_checklists ch ON ch.id=i.checklist_id JOIN scholar_semesters ss ON ss.id=ch.scholar_semester_id JOIN requirement_coverage cov ON cov.requirement_instance_id=i.id WHERE ss.semester_id=? AND cov.document_kind='cog' AND ss.scholar_id IN ("+ids.map(()=>'?').join(',')+')',[semester.id,...ids]);
 assert.equal(papers.length,profiles.length);const evidence=[];
 for(const [i,person] of result.items.entries()){
  const profile=profiles[person.row-2],paper=papers.find(d=>d.scholar_id===person.id);assert.ok(profile&&paper);
  let card:{id:string}|null=null;
  if(profile.yearLevel===1){
   const path=`/api/v1/requirement-instances/${paper.id}/entrant-card`,ctx=await ok<{editBlocker:string|null;blocker:string|null;revision:number;sourceHash:string}>(request('coordinator',path));assert.equal(ctx.editBlocker,null);assert.equal(ctx.blocker,null);
   card=await ok<{id:string}>(request('coordinator',path,{decision:'approved',mode:'grading_card',expectedRevision:0,sourceHash:ctx.sourceHash,issuingSchool:'Fictional Senior High School '+(i%3+1),schoolYear:'Synthetic preceding school year',gradingPeriod:'Latest completed senior-high period',periodEnd:offset(-61),reference:`SYNTHETIC-V2-ENTRANT-${profile.syntheticKey}`,reason:'Reviewed synthetic first-time entrant alternative; no college COG or grades invented',firstTimeEntrant:true,noCompletedCollegeSemester:true,latestCompletedPeriod:true,reviewed:true}));
  }
  await ok(request('staff',`/api/v1/requirement-instances/${paper.id}/receive`,{expectedVersion:0,receivedOn:day,physicalReference:`Synthetic V2 packet ${number}, ${profile.syntheticKey}`,storageLocation:`Synthetic V2 packet ${number}`,remarks:'Actual setup-day custody of fictional evidence; original historic receipt date unknown',reason:'Receive the synthetic grades source without per-person verification',...(card?{documentType:'shs_grading_card',entrantCardId:card.id}:{documentType:'cog'})}));
  evidence.push({syntheticKey:profile.syntheticKey,scholarId:person.id,year:profile.yearLevel,documentType:card?'shs_grading_card':'cog',entrantReviewId:card?.id??null,numericGrades:null});
 }
 await writeFile(`${folder}/grades-evidence-${number}.json`,JSON.stringify({synthetic:true,originalHistoricReceiptOn:null,setupCustodyOn:day,items:evidence},null,2)+'\n');
}
export async function verifyAcademic(c:{admin:Pool;m:TwoBatchManifest},folder:string){
 const {admin,m}=c;const expected=await readFile(folder+'/academic-source.json','utf8').then(JSON.parse) as {batches:{profiles:ReturnType<typeof profilesForBatch>}[]};const [[total]]=await admin.query<RowDataPacket[]>('SELECT COUNT(*) n FROM scholars');assert.equal(Number(total.n),1000);
 const [actual]=await admin.query<RowDataPacket[]>('SELECT a.scholar_id,a.id,a.academic_year_id,a.school_id,a.course_id,a.year_level,s.code schoolCode,co.code courseCode,a.course_pending_exception_id,p.first_name,p.last_name,p.middle_name,p.suffix FROM academic_records a JOIN scholars p ON p.id=a.scholar_id JOIN schools s ON s.id=a.school_id LEFT JOIN courses co ON co.id=a.course_id');
 assert.equal(actual.length,1000);assert.ok(actual.every(a=>a.academic_year_id===m.yearId));assert.equal(new Set(actual.map(a=>a.schoolCode)).size,5);assert.equal(new Set(actual.map(a=>a.courseCode).filter(Boolean)).size,8);const distributions:{batch:number;counts:number[];coursePending:number;masterlistMembers:number;publishedSnapshotSha256:string}[]=[];
 const [[owners]]=await admin.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM scholar_semesters ss JOIN semesters s ON s.id=ss.semester_id WHERE ss.semester_id=? AND s.academic_year_id=?',[m.semesterId,m.yearId]);assert.equal(Number(owners.n),1000);
 for(const b of m.batches){const people=expected.batches[b.number-1].profiles;assert.equal(people.length,b.count);const [[confirmation]]=await admin.execute<RowDataPacket[]>('SELECT result FROM import_confirmations WHERE job_id=?',[b.importId]);const imported=decodeStoredJson<ImportResult>(confirmation.result);const byYear=[0,0,0,0,0];
  for(const p of imported.items){const source=people[p.row-2],a=actual.find(x=>x.scholar_id===p.id);assert.ok(a);assert.equal(Number(a.year_level),source.yearLevel);assert.equal(a.schoolCode,source.schoolCode);assert.equal(a.courseCode,source.courseCode);assert.equal(Boolean(a.course_pending_exception_id),source.courseCode===null);byYear[source.yearLevel-1]++;if(source.yearLevel===5)assert.equal(programs.find(p=>p.code===a.courseCode)?.years,5);if(a.courseCode)assert.ok(source.yearLevel<=programs.find(p=>p.code===a.courseCode)!.years);}
  assert.deepEqual(byYear,b.number===1?[200,200,200,160,40]:[50,50,50,40,10]);
  const [[pub]]=await admin.execute<RowDataPacket[]>('SELECT snapshot FROM masterlist_publications WHERE masterlist_id=?',[b.masterlistId]);assert.ok(pub);const publication=decodeStoredJson<OfficialSnapshot>(pub.snapshot);assert.equal(publication.academicYearId,m.yearId);assert.equal(publication.entries.length,b.count);
  const [intakes]=await admin.execute<RowDataPacket[]>('SELECT scholar_id,classification FROM scholar_intakes WHERE import_job_id=?',[b.importId]);assert.equal(intakes.length,b.count);
  for(const p of imported.items){const source=people[p.row-2],a=actual.find(x=>x.scholar_id===p.id)!,entry=publication.entries.find(e=>e.scholarId===p.id);assert.ok(entry);assert.equal(entry.snapshot.academicRecordId,a.id);assert.equal(Number(entry.snapshot.placement.yearLevel),source.yearLevel);assert.equal(entry.snapshot.placement.school.code,source.schoolCode);assert.equal(entry.snapshot.placement.courseId||null,a.course_id);assert.equal(entry.snapshot.placement.coursePending?.importId??null,source.courseCode===null?b.importId:null);assert.equal(a.first_name,source.firstName);assert.equal(a.last_name,source.lastName);assert.equal(a.middle_name,source.middleName);assert.equal(a.suffix,source.suffix);assert.equal(intakes.find(r=>r.scholar_id===p.id)!.classification,source.classification==='New'?'new':'continuing');}
  // Current published members and their approved snapshot must cover exactly this import.
  const [entries]=await admin.execute<RowDataPacket[]>('SELECT scholar_id FROM masterlist_entries WHERE masterlist_id=?',[b.masterlistId]);assert.equal(entries.length,b.count);assert.deepEqual(entries.map(e=>e.scholar_id).sort(),imported.items.map(e=>e.id).sort());
  distributions.push({batch:b.number,counts:byYear,coursePending:people.filter(p=>!p.courseCode).length,masterlistMembers:entries.length,publishedSnapshotSha256:createHash('sha256').update(JSON.stringify(pub.snapshot)).digest('hex')});
 }
 assert.deepEqual(distributions[0].counts.map((n:number,i:number)=>n+distributions[1].counts[i]),[250,250,250,200,50]);
 const [types]=await admin.query<RowDataPacket[]>('SELECT document_type,COUNT(*) n FROM requirement_document_evidence WHERE receipt_id IS NOT NULL GROUP BY document_type ORDER BY document_type');const typeCounts=Object.fromEntries(types.map(r=>[r.document_type,Number(r.n)]));assert.deepEqual(typeCounts,{cog:750,cor:1000,shs_grading_card:250});
 const [frozen]=await admin.query<RowDataPacket[]>('SELECT snapshot FROM ovr_finalizations');assert.equal(frozen.length,1);const frozenSnapshot=decodeStoredJson<OvrFinalization>(frozen[0].snapshot),form=frozenSnapshot.payrollForm!;assert.equal(form.rows.length,800);const yearCounts=[1,2,3,4,5].map(y=>form.rows.filter(r=>r.yearLevel===y).length);assert.deepEqual(yearCounts,[200,200,200,160,40]);assert.deepEqual(form.rows.map(r=>r.scholarId).sort(),[...m.batches[0].scholarIds].sort());
 for(const row of form.rows){const a=actual.find(x=>x.scholar_id===row.scholarId);assert.ok(a);assert.equal(row.yearLevel,Number(a.year_level));assert.equal(row.school,schools.find(s=>s.code===a.schoolCode)!.name);assert.equal(row.amountCentavos,500000);if(a.courseCode)assert.equal(row.course,programs.find(p=>p.code===a.courseCode)!.name);else assert.match(row.course,/pending/i);}
 const [[allocations]]=await admin.execute<RowDataPacket[]>('SELECT COUNT(*) n FROM payroll_allocations a JOIN scholarship_records s ON s.id=a.scholarship_id JOIN semester_entitlements e ON e.id=a.entitlement_id WHERE a.batch_id=? AND s.scholar_id=e.scholar_id AND e.semester_id=? AND e.amount_centavos=500000',[m.batches[0].batchId!,m.semesterId]);assert.equal(Number(allocations.n),800);
 const result={at:new Date().toISOString(),synthetic:true,distribution:[250,250,250,200,50],batches:distributions,schools:schools.length,programs:programs.length,coursePending:actual.filter(a=>!a.course_id).length,fifthYearKnownFiveYearPrograms:50,gradeSources:typeCounts,frozenBatch1YearCounts:yearCounts,approvedPublicationPlacementAndIntakeMatch:true,payrollPlacementAndEntitlementsMatch:true,note:'Program lengths are explicit fictional fixture facts, not a new application validation rule or a real institution claim.'};
 await writeFile(folder+'/academic-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));return result;
}
