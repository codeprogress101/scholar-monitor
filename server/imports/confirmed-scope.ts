import {textStates} from '../scholars/intake-text-source.js';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {digest} from '../auth/crypto.js';
import {decodeImportRows} from './storage.js';
import type {ImportPreviewRow,ImportResult,ImportRow} from './model.js';
import {bindingSnapshot,intakeSnapshots,rawRowHash,sourceFailure,verifyHistoricalText} from './intake-binding.js';
/** Legacy fingerprints stay byte-for-byte compatible. New-format evidence never falls back. */
export async function validateConfirmedScope(db:PoolConnection,job:string,rows:ImportPreviewRow[],result:ImportResult){
 if(!result||!Array.isArray(result.items))sourceFailure();
 if(!result.format){if(rows.some(r=>r.identityResolution)||result.items.some(i=>i.source))sourceFailure();const [[linked]]=await db.execute<RowDataPacket[]>('SELECT id FROM import_intake_bindings WHERE import_job_id=? LIMIT 1',[job]);if(linked)sourceFailure();return;}
 if(!['bound-import/v1','bound-import/v2'].includes(result.format)||rows.length!==result.items.length||result.selectedCount!==rows.length||rows.some(r=>!r.approvedSelection)||!rows.length||rows.length>1500)sourceFailure();
 const [[stored]]=await db.execute<RowDataPacket[]>('SELECT raw_rows,preview_hash,actor_id FROM import_jobs WHERE id=?',[job]);
 if(!stored||digest(JSON.stringify(rows))!==stored.preview_hash)sourceFailure();
 const raw=decodeImportRows<ImportRow>(stored.raw_rows);
 const [links]=await db.execute<RowDataPacket[]>('SELECT b.*,i.scholar_id,i.academic_year_id,i.origin_kind FROM import_intake_bindings b JOIN scholar_intakes i ON i.id=b.intake_id WHERE b.import_job_id=? ORDER BY b.source_row',[job]);
 const ids=result.items.map(i=>i.source?.intakeId);if(ids.some(i=>!i)||new Set(ids).size!==ids.length||new Set(result.items.map(i=>i.id)).size!==rows.length||new Set(rows.map(r=>r.row)).size!==rows.length||raw.length!==rows.length)sourceFailure();
 const histories=await intakeSnapshots(db,ids as string[]);
 const v2rows=rows.filter(r=>r.identityResolution&&'format' in r.identityResolution),pins=v2rows.map(r=>({id:r.identityResolution!.intakeId,revision:'format' in r.identityResolution!?r.identityResolution.suppliedTextReview.textRevision:0}));
 if(result.format==='bound-import/v2'?!v2rows.length:!!v2rows.length)sourceFailure();
 const texts=await textStates(db,pins.map(p=>p.id),false,pins);
 const recordIds=result.items.map(i=>i.academicRecordId).filter((v):v is string=>Boolean(v));
 const academics=v2rows.length&&recordIds.length?(await db.execute<RowDataPacket[]>(`SELECT id,scholar_id,academic_year_id,school_id,course_id,course_pending_exception_id FROM academic_records WHERE id IN (${recordIds.map(()=>'?').join(',')})`,recordIds))[0]:[];
 const pending=v2rows.length?(await db.execute<RowDataPacket[]>('SELECT id,scholar_id,academic_year_id,source_row FROM course_pending_exceptions WHERE import_job_id=?',[job]))[0]:[];
 const [identifiers]=await db.execute<RowDataPacket[]>(`SELECT scholar_id,human_id FROM scholar_identifiers WHERE scholar_id IN (${result.items.map(()=>'?').join(',')})`,result.items.map(i=>i.id));let used=0;
 for(const row of rows){
  const item=result.items.find(i=>i.row===row.row),original=raw.find(r=>r.row===row.row);
  if(!item?.source||!original||rawRowHash(row)!==rawRowHash(original)||JSON.stringify(row.identityResolution)!==JSON.stringify(original.identityResolution)||["approvedSelection","receipts","mappings"].some(k=>JSON.stringify(row[k as keyof ImportRow])!==JSON.stringify(original[k as keyof ImportRow]))||identifiers.find(i=>i.scholar_id===item.id)?.human_id!==item.scholarId)sourceFailure();
  const history=histories.get(item.source.intakeId),root=history?.[0];if(!root||root.scholarId!==item.id||root.academicYearId!==row.intake?.academicYearId)sourceFailure();
  if(row.identityResolution){
   if(item.source.kind!=='manual-binding')sourceFailure();
   const b=links.find(b=>b.id===(item.source?.kind==='manual-binding'?item.source.bindingId:null));if(!b)sourceFailure();
   let resolved:{schoolId:string;courseId:string|null}|undefined;
   if('format' in row.identityResolution){
    const loaded=texts.get(root.id);if(!loaded)sourceFailure();verifyHistoricalText(row,loaded,history!);
    const academic=academics.find(a=>a.id===item.academicRecordId&&a.scholar_id===item.id&&a.academic_year_id===root.academicYearId),course=pending.find(p=>p.id===academic?.course_pending_exception_id&&p.scholar_id===item.id&&p.source_row===row.row&&p.academic_year_id===root.academicYearId);
    if(!academic||row.coursePending&&(!course||academic.course_id!==null))sourceFailure();resolved={schoolId:academic.school_id,courseId:academic.course_id};
   }
   const expected=bindingSnapshot(job,{...row,confirmingActor:stored.actor_id},resolved),hash=digest(JSON.stringify(expected)),pin=history?.find(s=>s.revision===expected.intakeRevision);
   if(!b||b.source_row!==row.row||b.intake_id!==root.id||root.sourceKind!=='manual'||item.id!==expected.scholarId||item.source.bindingHash!==hash||b.binding_hash!==hash||b.person_version!==expected.personVersion||b.intake_revision!==expected.intakeRevision||b.intake_hash!==expected.intakeHash||b.raw_row_hash!==expected.rawRowHash||b.identity_reference!==expected.identityReference||digest(JSON.stringify(typeof b.snapshot==='string'?JSON.parse(b.snapshot):b.snapshot))!==hash||pin?.snapshotHash!==expected.intakeHash)sourceFailure();used++;
  }else if(item.source.kind!=='import-root'||root.sourceKind!=='import'||root.importJobId!==job||root.sourceRow!==row.row)sourceFailure();
 }
 if(used!==links.length||!used)sourceFailure();
}
