import type {ExtendedWorkflows} from './uat-types.js';
import type {RequirementChecklist} from '../server/requirements/instances-model.js';
import type {SemesterComplianceView} from '../server/continuing/semester-compliance.js';
import type {RowDataPacket} from 'mysql2/promise';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {session} from './uat-session.js';
import {folder,save} from './uat-environment.mjs';
import {today} from '../server/scholars/validation.js';
const c=await session('A'),data=JSON.parse(await readFile(folder+'/extended-workflows.json','utf8')) as ExtendedWorkflows,day=today(),results:object[]=[];
const api=async<T=unknown>(role:string,url:string,body?:object)=>{const r=await c.request(role,url,body);assert.equal(r.statusCode,200,`${url}: ${r.body.slice(0,1100)}`);return r.json<T>();};
try {
 const [[term]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM semesters WHERE code='IMPORT-CURRENT'");
 const evidence={reason:'Fictional physical academic evidence checked for UAT',reference:'SYNTHETIC-ACADEMIC-PAPERS'};
 // Distinct outcomes are explicit academic findings, never automatic termination.
 for(const [index,failed,incomplete] of [[0,true,false],[3,false,true]] as const) {
  const p=data.scholars[index],root=`/api/v1/scholars/${p.scholarId}/semester-requirements`;
  const [[academic]]=await c.admin.query<RowDataPacket[]>('SELECT a.school_id,a.course_id FROM academic_records a JOIN academic_years y ON y.id=a.academic_year_id WHERE a.scholar_id=? AND y.code=\'IMPORT-YEAR\'',[p.scholarId]);
  const [[prior]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM academic_years WHERE code='IMPORT-PRIOR-YEAR'");
  const [[exists]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?',[p.scholarId,prior.id]);
  if(!exists)await api('staff',`/api/v1/scholars/${p.scholarId}/academic-records`,{academicYearId:prior.id,schoolId:academic.school_id,courseId:academic.course_id,yearLevel:'First year',...evidence});
  const path=root+'/'+term.id,academicContext=await api<import('../server/continuing/semester-academic.js').SemesterAcademicView>('staff',path+'/academic-context');
  if(academicContext.category==='unknown')await api('staff',path+'/academic-context',{expectedRevision:academicContext.revision,academicRecordId:academicContext.current!.id,expectedAcademicVersion:academicContext.current!.version,category:'degree'});
  const checklists=await api<{items:RequirementChecklist[]}>('staff',root),checklist=checklists.items.find(d=>d.semesterId===term.id)!;
  for(let item of checklist.items)if(['submitted','resubmitted','for_verification','verified'].includes(item.status)) {
   const path='/api/v1/requirement-instances/'+item.id,context=await api<import('../server/requirements/workflow-model.js').VerificationContext>('staff',path+'/verification-context');
   if(item.status==='verified') {
    const latest=item.history.filter(e=>e.action==='verify').at(-1);assert.ok(latest);
    await api('staff',path+'/return-for-correction',{action:'return-for-correction',expectedVersion:item.version,effectiveOn:day,...evidence,remarks:'Recheck synthetic source after the explicitly recorded program category',correctionOf:latest.id});
    let list=await api<{items:RequirementChecklist[]}>('staff',root);item=list.items.find(x=>x.id===checklist.id)!.items.find(x=>x.id===item.id)!;
    await api('staff',path+'/resubmit',{action:'resubmit',expectedVersion:item.version,effectiveOn:day,...evidence,remarks:'Fictional paper reviewed against the current category source',physicalReference:'SYNTHETIC-ACADEMIC-RECHECK',storageLocation:'Fictional UAT cabinet',...(item.code==='IMPORT-COR'?{documentType:'certificate_of_enrollment'}:{})});
    list=await api<{items:RequirementChecklist[]}>('staff',root);item=list.items.find(x=>x.id===checklist.id)!.items.find(x=>x.id===item.id)!;
   }
   const keys=['scholarId','scholarVersion','academicYearId','semesterId','schoolId','courseId','academicVersion','definitionVersionId','coverageId','semesterRevision','predecessorSourceHash'] as const;
   const document=Object.fromEntries(keys.filter(k=>context[k]!==undefined).map(k=>[k,context[k]]));
   await api('staff',path+'/verify',{action:'verify',expectedVersion:item.version,effectiveOn:day,...evidence,remarks:null,document,attestation:'all-five-checked'});
  }
  let compliance=await api<SemesterComplianceView>('staff',path+'/compliance');
  if(!compliance.gradingRule)await api('coordinator',path+'/compliance/grading-rule',{sourceHash:compliance.sourceHash,kind:'native',rule:null,issuer:'Fictional UAT Coordinator',authorityReference:'SYNTHETIC-GRADING-AUTHORITY',sourceReference:'Synthetic native 1-best scale; not a real school policy',reviewed:true});
  compliance=await api<SemesterComplianceView>('staff',path+'/compliance');
  await api('staff',path+'/compliance',{sourceHash:compliance.sourceHash,expectedRevision:compliance.revision,findings:{average:'2.50',enrolled:true,fullLoad:true,hasFailed:failed,hasDropped:false,hasIncomplete:incomplete},reviewed:true});
  const after=await api<SemesterComplianceView>('staff',path+'/compliance');results.push({scholarId:p.scholarId,hasFailed:failed,hasIncomplete:incomplete,result:after.result,blockers:after.blockers,standingAutomaticallyTerminated:false});
 }
 // Approved transfer before official membership; the application enforces policy evidence.
 const p=data.scholars[1],[[current]]=await c.admin.query<RowDataPacket[]>('SELECT * FROM academic_records WHERE id=?',[p.academicId]);
 const [[school]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM schools WHERE code='SIMPLE-SCHOOL'");
 const changePath='/api/v1/academic-records/'+p.academicId+'/changes',view=await api<import('../server/academic/changes-model.js').AcademicChangeView&{currentVersion?:number}>('staff',changePath);
 if(view.version===0||view.currentVersion===0) {
  const proposal={expectedVersion:0,kind:'school_transfer',schoolId:school.id,courseId:current.course_id,yearLevel:current.year_level,effectiveOn:day,...evidence,remarks:'Fictional approved school transfer example'};
  await api('coordinator',`/api/v1/academic-records/${p.academicId}/policy-reviews`,{expectedVersion:0,schoolId:proposal.schoolId,courseId:proposal.courseId,yearLevel:proposal.yearLevel,effectiveOn:day,priorShiftCount:0,secondYearBoundaryOn:'2027-06-01',permissionGrantedOn:'2026-08-01',permissionReference:'SYNTHETIC-PRIOR-PERMISSION',historyReference:'Complete fictional placement history; no real scholar history used',sourceCategory:'degree',destinationCategory:'degree',reviewed:true});
  const request=await api<{requestId:string}>('staff',changePath,proposal);await api('coordinator',`/api/v1/academic-changes/${request.requestId}/approve`,evidence);results.push({scholarId:p.scholarId,approvedTransfer:true});
 }
 await save(folder+'/academic-examples.json',{synthetic:true,results});console.log(JSON.stringify(results));
}finally{await c.close();}
