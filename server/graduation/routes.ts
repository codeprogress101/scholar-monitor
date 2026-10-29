import type {FastifyInstance} from 'fastify';
import type {DurationService} from './duration-service.js';
import type {MonitoringEvidenceService} from './monitoring-service.js';
export function registerGraduationEvidence(app:FastifyInstance,duration:DurationService,monitoring:MonitoringEvidenceService){
 app.get('/api/v1/program-duration-references/context',{config:{permission:'scholars.read'}},r=>duration.context(r.authSession!.user.id));
 app.get('/api/v1/program-duration-references',{config:{permission:'scholars.read'}},r=>duration.list(r.authSession!.user.id,r.query));
 app.get<{Params:{id:string}}>('/api/v1/program-duration-references/:id',{config:{permission:'scholars.read'}},r=>duration.detail(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>('/api/v1/program-duration-references/:id/history',{config:{permission:'scholars.read'}},r=>duration.history(r.authSession!.user.id,r.params.id,r.query));
 app.get<{Params:{id:string}}>('/api/v1/program-duration-references/:id/review',{config:{permission:'program.duration.confirm'}},r=>duration.review(r.authSession!.user.id,r.params.id));
 app.post('/api/v1/program-duration-references',{bodyLimit:8192,config:{permission:'program.duration.prepare'}},async(r,reply)=>{const out=await duration.create(r.authSession!.user.id,r.headers['idempotency-key'],r.body,r.id);return reply.code(out.status).send(out.result);});
 app.post<{Params:{id:string}}>('/api/v1/program-duration-references/:id/events',{bodyLimit:8192,config:{permission:'scholars.read'}},async(r,reply)=>{const out=await duration.append(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,r.id);return reply.code(out.status).send(out.result);});
 app.get<{Params:{id:string}}>('/api/v1/scholars/:id/graduation-monitoring',{config:{permission:'scholars.read'}},r=>monitoring.detail(r.authSession!.user.id,r.params.id,r.query));
 app.get<{Params:{id:string}}>('/api/v1/graduation-monitoring-cases/:id/history',{config:{permission:'scholars.read'}},r=>monitoring.history(r.authSession!.user.id,r.params.id,r.query));
 app.post('/api/v1/graduation-monitoring-cases',{bodyLimit:8192,config:{permission:'scholars.read'}},async(r,reply)=>{const out=await monitoring.write(r.authSession!.user.id,undefined,r.headers['idempotency-key'],r.body,r.id);return reply.code(out.status).send(out.result);});
 app.post<{Params:{id:string}}>('/api/v1/graduation-monitoring-cases/:id/events',{bodyLimit:8192,config:{permission:'scholars.read'}},async(r,reply)=>{const out=await monitoring.write(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,r.id);return reply.code(out.status).send(out.result);});
}
