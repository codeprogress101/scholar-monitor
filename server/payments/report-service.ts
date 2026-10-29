import {randomUUID,createHash} from 'node:crypto';
import type {RowDataPacket} from 'mysql2/promise';
import {AuthorizationService} from '../authorization/service.js';
import {AuthError} from '../auth/service.js';
import {parseId} from '../configuration/validation.js';
import {financialReport} from './report-reads.js';
import {parseReport,reportQuery,reportExport,selectFinancialRows,reportSections,type FinancialReport} from './report-model.js';
import {reconciliationExcel,reconciliationPdf} from './report-export.js';
export type ReportRenderer=(report:FinancialReport,outcome:string,format:'xlsx'|'pdf')=>Promise<Buffer>;
const renderer:ReportRenderer=(report,outcome,format)=>format==='xlsx'?reconciliationExcel(report,outcome):reconciliationPdf(report,outcome);
export class FinancialReportService{
 constructor(private authorization:AuthorizationService,private render:ReportRenderer=renderer){}
 payrolls(actor:string,raw:unknown){const q=parseReport(reportQuery,raw);return this.authorization.readSnapshot(actor,'ovr.process',async db=>{
  const where="WHERE (LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',b.code,JSON_UNQUOTE(JSON_EXTRACT(ev.snapshot,'$.name')))))>0)";
  const from="FROM ovr_batches b JOIN ovr_finalizations f ON f.batch_id=b.id JOIN ovr_batch_events ev ON ev.batch_id=b.id AND NOT EXISTS(SELECT 1 FROM ovr_batch_events n WHERE n.batch_id=ev.batch_id AND n.revision>ev.revision) JOIN payroll_submission_windows w ON w.batch_id=b.id";
  const [[count]]=await db.execute<RowDataPacket[]>(`SELECT COUNT(*) n ${from} ${where}`,[q.q]);
  const [rows]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.code,JSON_UNQUOTE(JSON_EXTRACT(ev.snapshot,'$.name')) name,ev.state ${from} ${where} ORDER BY f.finalized_at DESC,b.code,b.id LIMIT ${q.limit} OFFSET ${q.offset}`,[q.q]);return {items:rows.map(r=>({id:r.id,code:r.code,name:r.name,state:r.state})),total:Number(count.n),offset:q.offset,limit:q.limit};
 });}
 page(actor:string,rawId:unknown,raw:unknown){const id=parseId(rawId),q=parseReport(reportQuery,raw);return this.authorization.readSnapshot(actor,'ovr.process',async db=>{
  const {rows,...report}=await financialReport(db,id,q.basis),selected=selectFinancialRows({...report,rows},q.outcome,q.q);return {...report,sections:reportSections(selectFinancialRows({...report,rows},q.outcome)),items:selected.slice(q.offset,q.offset+q.limit),total:selected.length,offset:q.offset,limit:q.limit};
 });}
 async export(actor:string,rawId:unknown,raw:unknown,requestId:string){
  const id=parseId(rawId),input=parseReport(reportExport,raw);
  // Use the established export convention: each explicit download prepares one
  // separately audited file. No financial command or financial retry is created.
  const report=await this.authorization.readSnapshot(actor,'ovr.process',db=>financialReport(db,id,input.basis));
  if(report.sourceHash!==input.sourceHash)throw new AuthError(409,'REPORT_CHANGED','Financial evidence changed. Refresh the report before downloading.');
  const buffer=await this.render(report,input.outcome,input.format);
  if(!buffer.length||buffer.length>16*1024*1024)throw new AuthError(422,'EXPORT_TOO_LARGE','The prepared report exceeds the 16 MiB download boundary. No file was published.');
  const hash=createHash('sha256').update(buffer).digest('hex'),exportId=randomUUID(),selected=selectFinancialRows(report,input.outcome);
  return this.authorization.withPermission(actor,'ovr.process',async db=>{
   const current=await financialReport(db,id,report.basis);
   if(current.sourceHash!==report.sourceHash)throw new AuthError(409,'REPORT_CHANGED','A payment, correction or source changed during generation. Refresh and download again. No export was published.');
   await db.execute("INSERT INTO audit_logs(id,event_type,entity_type,entity_id,action,actor_id,actor_kind,occurred_at,request_id,reason,details) VALUES(?,'payments.reconciliation_exported','ovr_batches',?,'prepare_download',?,'user',UTC_TIMESTAMP(6),?,'Authorized reconciliation report download',?)",[exportId,id,actor,requestId,JSON.stringify({exportId,projectionVersion:'financial-report/v1',sourceRevision:report.sourceRevision,basis:report.basis,format:input.format,outcome:input.outcome,sourceHash:report.sourceHash,generatedAt:report.generatedAt,rowCount:selected.length,sections:reportSections(selected),payrollTotals:report.payrollTotals,settlementTotals:report.settlementTotals,sha256:hash,bytes:buffer.length})]);
   return {buffer,fileName:`${report.batchCode.replace(/[^a-zA-Z0-9_-]/g,'-')}-${report.basis}-${input.outcome}.${input.format}`,id:exportId};
  });
 }
}
