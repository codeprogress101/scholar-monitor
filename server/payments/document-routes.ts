import type {FastifyInstance} from 'fastify';
import {AuthError} from '../auth/service.js';
import type {IndividualDocumentService} from './document-service.js';
export function registerIndividualDocuments(app:FastifyInstance,service:IndividualDocumentService){
 const options={config:{permission:'ovr.process' as const}};
 app.get('/api/v1/individual-payments/documents/availability',options,r=>service.availability(r.authSession!.user.id));
 app.get<{Params:{id:string}}>('/api/v1/individual-payments/transactions/:id/documents',options,r=>service.detail(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>('/api/v1/individual-payments/transactions/:id/documents/history',options,r=>service.history(r.authSession!.user.id,r.params.id,r.query));
 app.post<{Params:{id:string}}>('/api/v1/individual-payments/transactions/:id/documents/generate',{...options,bodyLimit:12288},r=>service.generate(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,r.id));
 app.get<{Params:{id:string;kind:string}}>('/api/v1/individual-payments/transactions/:id/documents/:kind/word',options,async(r,reply)=>{
  if(!['OR','DV'].includes(r.params.kind))throw new AuthError(422,'VALIDATION_FAILED','Choose OR or DV.');
  const file=await service.download(r.authSession!.user.id,r.params.id,r.params.kind as 'OR'|'DV',r.id);
  return reply.header('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document').header('Content-Disposition',`attachment; filename="${file.filename}"`).header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').send(file.content);
 });
}
