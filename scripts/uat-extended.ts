import type {ExtendedWorkflows} from './uat-types.js';
import type {RequirementChecklist,RequirementInstance} from '../server/requirements/instances-model.js';
import type {ImportPreview,ImportResult} from '../server/imports/model.js';
import type {RowDataPacket} from 'mysql2/promise';
// Additional small office workflow examples, separate from the fixed 835 payroll.
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {session} from './uat-session.js';
import {folder,save} from './uat-environment.mjs';
import {SIMPLE_COLUMNS} from '../server/imports/model.js';
import {today} from '../server/scholars/validation.js';
const c=await session('A'),day=today(),evidence={reason:'Explicit fictional office UAT evidence',reference:'SYNTHETIC-OFFICE-PAPERS'};
const api=async<T=unknown>(role:string,url:string,body?:object)=>{const r=await c.request(role,url,body);assert.equal(r.statusCode,200,`${url}: ${r.body.slice(0,1000)}`);return r.json<T>();};
const result:ExtendedWorkflows={synthetic:true,scholars:[],documents:[],masterlists:[],status:[],academicChanges:[]};
try {
 const [[semester]]=await c.admin.query<RowDataPacket[]>("SELECT id,version,academic_year_id FROM semesters WHERE code='IMPORT-CURRENT'");
 const [[prior]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM academic_years WHERE code='IMPORT-PRIOR-YEAR'");
 const [[earlier]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM academic_years WHERE code='UAT-EARLIER-YEAR'");
 const [[school]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM schools WHERE code='UAT-TECH'");
 const [[course]]=await c.admin.query<RowDataPacket[]>("SELECT id FROM courses WHERE code='UAT-AGRI'");
 const names=['Amihan Tala','Maria Clara Ysadora','Sol Inaya','Juan Miguel Kalaw','Liwayway Marisol','Dalisay Aurora','Bayani Celestino','Hiraya Isagani'];
 for(let i=0;i<names.length;i++) {
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('Fictional Office Cases');s.addRow([...SIMPLE_COLUMNS]);s.addRow([`UAT Workflow ${['Estrella','Del Rio','Uy','Luntian','De la Cruz','Maningning','Horizon','Silangan'][i]}`,'Fictional '+names[i],'','','UAT-TECH',2,i%2?'Old':'New','Fictional Bachelor of Agricultural Systems']);
  const [[existing]]=await c.admin.query<RowDataPacket[]>('SELECT s.id,a.id academicRecordId FROM scholars s JOIN academic_records a ON a.scholar_id=s.id AND a.academic_year_id=s.academic_year_id WHERE s.first_name=?',['Fictional '+names[i]]);
  let person:Pick<ImportResult['items'][number],'id'|'academicRecordId'>=existing as Pick<ImportResult['items'][number],'id'|'academicRecordId'>;
  if(!person){const staged=await api<ImportPreview>('coordinator','/api/v1/imports/stage',{fileName:`fictional-office-${i}.xlsx`,base64:Buffer.from(await w.xlsx.writeBuffer()).toString('base64'),approvedSelection:{reference:'Synthetic prior selected office scenarios',effectiveOn:day}});assert.equal(staged.ready,true,JSON.stringify(staged.rows));
  const saved=await api<ImportResult>('coordinator',`/api/v1/imports/${staged.id}/confirm`,{hash:staged.hash,confirm:true});person=saved.items[0];}
  const [[annual]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM scholarship_records WHERE scholar_id=? AND academic_year_id=?',[person.id,semester.academic_year_id]);
  const scholar={index:i,scholarId:person.id,annualId:annual.id,academicId:person.academicRecordId!};result.scholars.push(scholar);
  if(i===3)for(const year of [prior.id,earlier.id]){const [[existingAcademic]]=await c.admin.query<RowDataPacket[]>('SELECT id FROM academic_records WHERE scholar_id=? AND academic_year_id=?',[person.id,year]);if(!existingAcademic)await api('staff',`/api/v1/scholars/${person.id}/academic-records`,{academicYearId:year,schoolId:school.id,courseId:course.id,yearLevel:'First year',...evidence});}
  // Generate even missing-document cases using the current configured semester policy.
  await api('staff',`/api/v1/scholars/${person.id}/semester-requirements/provision`,{periodId:semester.id});
  const list=await api<{items:(Omit<RequirementChecklist,'items'>&{items:(RequirementInstance&{documentKind?:string})[]})[];checklists?:(Omit<RequirementChecklist,'items'>&{items:(RequirementInstance&{documentKind?:string})[]})[]}>('staff',`/api/v1/scholars/${person.id}/semester-requirements`);
  const checklist=(list.items??list.checklists??[]).find(x=>x.semesterId===semester.id);assert.ok(checklist,JSON.stringify(list).slice(0,700));
  if(![2,7].includes(i)) {
   const items=checklist.items.filter(d=>i!==1||d.documentKind==='cor'||d.code==='IMPORT-COR');
   const missing=items.filter(d=>d.version===0);
   if(missing.length)await api('staff',`/api/v1/requirement-checklists/${checklist.id}/receive`,{items:missing.map(d=>({id:d.id,expectedVersion:0,...(d.code==='IMPORT-COR'?{documentType:'certificate_of_enrollment'}:{})})),receivedOn:day,physicalReference:'SYNTHETIC-RECEIVING-LOG-'+i,storageLocation:'Fictional UAT cabinet',remarks:'Synthetic physical receipt; server timestamp remains actual entry time'});
   for(const item of items) {
    const path='/api/v1/requirement-instances/'+item.id;
    const fresh=async()=>{const l=await api<{items:(Omit<RequirementChecklist,'items'>&{items:(RequirementInstance&{documentKind?:string})[]})[];checklists?:(Omit<RequirementChecklist,'items'>&{items:(RequirementInstance&{documentKind?:string})[]})[]}>('staff',`/api/v1/scholars/${person.id}/semester-requirements`);return l.items.find(x=>x.id===checklist.id)!.items.find(x=>x.id===item.id)!;};
    let current=await fresh();
    if(i===5&&current.status==='submitted')await api('staff',path+'/send-for-verification',{action:'send-for-verification',expectedVersion:current.version,effectiveOn:day,...evidence,remarks:null});
    if(i===4&&current.status==='submitted')await api('staff',path+'/reject',{action:'reject',expectedVersion:current.version,effectiveOn:day,...evidence,remarks:'Synthetic invalid covered-semester document'});
    if(i===6) {
     if(current.status==='submitted')await api('staff',path+'/return-for-correction',{action:'return-for-correction',expectedVersion:current.version,effectiveOn:day,...evidence,remarks:'Synthetic corrected paper required',correctionOf:null});
     current=await fresh();
     if(current.status==='for_correction')await api('staff',path+'/resubmit',{action:'resubmit',expectedVersion:current.version,effectiveOn:day,...evidence,remarks:'Fictional corrected document submitted',physicalReference:'SYNTHETIC-REPLACEMENT-'+i,storageLocation:'Fictional UAT cabinet',...(item.code==='IMPORT-COR'?{documentType:'certificate_of_enrollment'}:{})});
    }
   }
  }
  result.documents.push({scholarId:person.id,intended:['received','partial','missing','verified-review','invalid','awaiting-verification','corrected','missing'][i]});
 }
 // Approval states use distinct complete selected scholars and genuine transitions.
 for(const [index,state] of [[0,'draft'],[1,'for_verification'],[2,'submitted_for_approval'],[3,'approved']] as const) {
  const m=await api<{id:string}>('staff','/api/v1/masterlists',{academicYearId:semester.academic_year_id,title:'Synthetic office '+state,...evidence});
  await api('staff',`/api/v1/masterlists/${m.id}/entries`,{action:'add',expectedVersion:1,scholarId:result.scholars[index].scholarId,awardNumber:null,...evidence});
  let version=2;for(const action of ['submit-verification','submit-approval','approve'].slice(0,index))await api(action==='approve'?'coordinator':'staff',`/api/v1/masterlists/${m.id}/${action}`,{expectedVersion:version++,...evidence});
  result.masterlists.push({id:m.id,state});
 }
 const m=await api<{id:string}>('staff','/api/v1/masterlists',{academicYearId:semester.academic_year_id,title:'Synthetic standing and graduation cases',...evidence});
 let version=1;for(const p of result.scholars.slice(4))await api('staff',`/api/v1/masterlists/${m.id}/entries`,{action:'add',expectedVersion:version++,scholarId:p.scholarId,awardNumber:null,...evidence});
 for(const action of ['submit-verification','submit-approval','approve','publish'])await api(['approve','publish'].includes(action)?'coordinator':'staff',`/api/v1/masterlists/${m.id}/${action}`,{expectedVersion:version++,...evidence,...(action==='publish'?{effectiveOn:day}:{})});
 result.masterlists.push({id:m.id,state:'published'});
 for(const [index,status] of [[4,'on_hold'],[5,'suspended'],[6,'graduated'],[7,'on_hold']] as const) {
  const id=result.scholars[index].annualId,path=`/api/v1/scholarships/${id}/status`,state=await api<{version:number}>('staff',path);
  const pending=await api<{requestId:string}>('staff',path+'/requests',{expectedVersion:state.version,toStatus:status,kind:'change',effectiveOn:day,reasonCode:status==='graduated'?'GRADUATION':'SYNTHETIC_LEAVE',reason:'Written fictional office request; Coordinator reviews case-specific conditions',reference:status==='graduated'?'SYNTHETIC-OFFICIAL-SCHOOL-GRADUATION-LIST':'SYNTHETIC-WRITTEN-REQUEST'});
  if(index!==7)await api('coordinator',`/api/v1/status-requests/${pending.requestId}/approve`,{...evidence,...(status==='graduated'?{finalSemesterId:semester.id}:{})});
  result.status.push({scholarshipId:id,status:index===7?'pending_on_hold':status,requestId:pending.requestId});
 }
 await save(folder+'/extended-workflows.json',result);console.log(JSON.stringify({extendedScholars:result.scholars.length,documents:result.documents,masterlists:result.masterlists,status:result.status}));
} finally {await save(folder+'/extended-workflows-progress.json',result);await c.close();}
