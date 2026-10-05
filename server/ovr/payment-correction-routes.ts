import type { FastifyInstance } from "fastify";
import { PaymentCorrectionService } from "./payment-correction-service.js";
export function registerPaymentCorrections(
  app: FastifyInstance,
  service: PaymentCorrectionService,
) {
  for (const action of ["correct", "request", "approve", "reject"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/payment-corrections/${action}`,
      {
        bodyLimit: 8192,
        config: {
          permission:
            action === "approve" || action === "reject"
              ? "payments.corrections.approve"
              : "payments.correct",
        },
      },
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
