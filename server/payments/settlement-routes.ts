import type {FastifyInstance} from 'fastify';
import type {IndividualSettlementService} from './settlement-service.js';
export function registerIndividualSettlement(app:FastifyInstance,service:IndividualSettlementService){
 const read={config:{permission:'ovr.process' as const}},base='/api/v1/individual-payments/settlement';
 app.get(base+'/availability',read,r=>service.availability(r.authSession!.user.id));
 app.get(base+'/queue',read,r=>service.page(r.authSession!.user.id,r.query));
 app.get(base+'/summary',read,r=>service.summary(r.authSession!.user.id));
 app.get<{Params:{id:string}}>(base+'/transactions/:id',read,r=>service.detail(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>(base+'/transactions/:id/corrections',read,r=>service.corrections(r.authSession!.user.id,r.params.id,r.query));
 app.post(base+'/preview',{...read,bodyLimit:32768},r=>service.preview(r.authSession!.user.id,r.body));
 app.post(base+'/paid',{...read,bodyLimit:32768},r=>service.commit(r.authSession!.user.id,r.headers['idempotency-key'],r.body,r.id));
 // The service selects and rechecks the exact existing permission for each
 // specific command; there is no generic status PATCH or caller-supplied role.
 app.post(base+'/commands',{...read,bodyLimit:8192},r=>service.command(r.authSession!.user.id,r.headers['idempotency-key'],r.body,r.id));
}
