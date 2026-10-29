import type {FastifyInstance} from 'fastify';
import type {IndividualPaymentService} from './individual-service.js';
export function registerIndividualPayments(app:FastifyInstance,service:IndividualPaymentService){
 const options={config:{permission:'ovr.process' as const}};
 app.get('/api/v1/individual-payments/availability',options,r=>service.availability(r.authSession!.user.id));
 app.get('/api/v1/individual-payments/queue',options,r=>service.page(r.authSession!.user.id,r.query));
 app.get<{Params:{id:string}}>('/api/v1/individual-payments/payments/:id',options,r=>service.detail(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>('/api/v1/individual-payments/entitlements/:id/history',options,r=>service.history(r.authSession!.user.id,r.params.id,r.query));
 app.post('/api/v1/individual-payments/commands',{...options,bodyLimit:4096},r=>service.command(r.authSession!.user.id,r.headers['idempotency-key'],r.body,r.id));
}
