import type { FastifyInstance } from "fastify";
import type { PaymentRecordingService } from "./recording-service.js";
export function registerPaymentRecording(app:FastifyInstance,service:PaymentRecordingService) {
  const options={config:{permission:"ovr.process" as const}};
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/payment-summary",options,r=>service.summary(r.authSession!.user.id,r.params.id));
  app.get<{Params:{id:string}}>("/api/v1/ovr-batches/:id/payment-roster",options,r=>service.page(r.authSession!.user.id,r.params.id,r.query));
  app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/payment-operations/preview",{...options,bodyLimit:131072},r=>service.preview(r.authSession!.user.id,r.params.id,r.body));
  app.post<{Params:{id:string}}>("/api/v1/ovr-batches/:id/payment-operations",{...options,bodyLimit:196608},r=>service.commit(r.authSession!.user.id,r.params.id,r.headers["idempotency-key"],r.body,r.id));
  app.get<{Params:{key:string}}>("/api/v1/payment-operations/:key",options,r=>service.recovery(r.authSession!.user.id,r.params.key));
}
