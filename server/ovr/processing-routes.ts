import type { FastifyInstance } from "fastify";
import {
  OvrProcessingService,
  processingPermission,
} from "./processing-service.js";
export function registerOvrProcessing(
  app: FastifyInstance,
  service: OvrProcessingService,
) {
  for (const action of [
    "submit",
    "mark-processed",
    "record-payment",
    "close",
  ] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/${action === "record-payment" ? "payments" : action}`,
      { bodyLimit: 8192, config: { permission: processingPermission(action) } },
      (r) =>
        service.command(
          r.authSession!.user.id,
          r.params.id,
          action,
          r.headers["idempotency-key"],
          r.body,
          r.id,
        ),
    );
}
