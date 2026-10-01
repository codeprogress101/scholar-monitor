import type { FastifyInstance } from "fastify";
import type { RequirementReceiptService } from "./receipt-service.js";
export function registerRequirementReceipts(
  app: FastifyInstance,
  service: RequirementReceiptService,
) {
  app.post<{ Params: { id: string } }>(
    "/api/v1/requirement-instances/:id/receive",
    { bodyLimit: 8192, config: { permission: "requirements.receive" } },
    (r) =>
      service.receive(
        r.authSession!.user.id,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
