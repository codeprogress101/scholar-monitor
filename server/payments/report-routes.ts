import type {FastifyInstance} from 'fastify';
import type {FinancialReportService} from './report-service.js';
export function registerFinancialReports(app:FastifyInstance,service:FinancialReportService){
 const options={config:{permission:'ovr.process' as const}};
 app.get('/api/v1/reports/payrolls',options,(r,reply)=>{reply.header('Cache-Control','no-store').header('Vary','Cookie');return service.payrolls(r.authSession!.user.id,r.query);});
 app.get<{Params:{id:string}}>('/api/v1/ovr-batches/:id/financial-report',options,(r,reply)=>{reply.header('Cache-Control','no-store').header('Vary','Cookie');return service.page(r.authSession!.user.id,r.params.id,r.query);});
 app.post<{Params:{id:string}}>('/api/v1/ovr-batches/:id/reconciliation/exports',{...options,bodyLimit:4096},async(r,reply)=>{
  const file=await service.export(r.authSession!.user.id,r.params.id,r.body,r.id);
  return reply.header('Content-Type',file.fileName.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition',`attachment; filename="${file.fileName}"`).header('Cache-Control','no-store').header('Vary','Cookie').header('X-Content-Type-Options','nosniff').header('X-Export-ID',file.id).send(file.buffer);
 });
}
