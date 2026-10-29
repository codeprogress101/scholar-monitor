import type {FastifyInstance} from 'fastify';
import {AuthError} from '../auth/service.js';
import type {OmissionPaymentService} from './omission-service.js';
import type {PayrollPreparationService} from '../payouts/preparation.js';
export function registerOmissionPayments(app:FastifyInstance,service:OmissionPaymentService,preparation:PayrollPreparationService){
 const options={config:{permission:'ovr.process' as const}},base='/api/v1/individual-payments/omissions';
 app.get(base+'/availability',options,r=>service.availability(r.authSession!.user.id));
 app.get(base+'/sources',options,r=>service.options(r.authSession!.user.id));
 app.get(base+'/assessment',options,r=>{const {sourceBatchId,scholarshipId,...rest}=r.query as Record<string,unknown>;if(Object.keys(rest).length)throw new AuthError(422,'VALIDATION_FAILED','Choose one source payroll and scholar for read-only assessment.');return service.candidate(r.authSession!.user.id,sourceBatchId,scholarshipId);});
 app.get(base,options,r=>{const {sourceBatchId,...filters}=r.query as Record<string,unknown>;return service.page(r.authSession!.user.id,sourceBatchId,filters);});
 app.get<{Params:{id:string}}>(base+'/:id',options,r=>service.detail(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>(base+'/:id/history',options,r=>service.history(r.authSession!.user.id,r.params.id,r.query));
 app.post(base+'/commands',{...options,bodyLimit:4096},r=>service.command(r.authSession!.user.id,r.headers['idempotency-key'],r.body,r.id));
 app.get<{Params:{id:string}}>('/api/v1/payout-cycles/:id/preparation',options,r=>preparation.read(r.authSession!.user.id,r.params.id));
 app.post<{Params:{id:string}}>('/api/v1/payout-cycles/:id/preparation',{config:{permission:'payroll.windows.manage'},bodyLimit:4096},r=>preparation.command(r.authSession!.user.id,r.params.id,r.headers['idempotency-key'],r.body,r.id));
}
