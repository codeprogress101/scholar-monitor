import type { FastifyInstance } from "fastify";
import type { PayrollReconciliationService } from "./reconciliation-service.js";
export function registerPayrollReconciliation(app:FastifyInstance,service:PayrollReconciliationService){
 const options={config:{permission:"ovr.process" as const}};
 app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/reconciliation-summary",options,r=>service.summary(r.authSession!.user.id,r.params.id));
 app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/reconciliation",options,r=>service.page(r.authSession!.user.id,r.params.id,r.query));
 app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/discrepancies",options,r=>service.cases(r.authSession!.user.id,r.params.id,r.query));
 app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/reconciliation-history",options,r=>service.history(r.authSession!.user.id,r.params.id,r.query));
 // The service re-authorizes the specific action in its protected transaction.
 app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/reconciliation-commands",{...options,bodyLimit:8192},r=>service.command(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
}
