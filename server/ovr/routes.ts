import type { FastifyInstance } from "fastify";
import type { OvrService } from "./service.js";
export function registerOvr(app: FastifyInstance, service: OvrService) {
  const config = { config: { permission: "ovr.prepare" as const } };
  app.get<{ Params: { cycleId: string } }>(
    "/api/v1/payout-cycles/:cycleId/ovr-batches",
    config,
    (r) => service.list(r.authSession!.user.id, r.params.cycleId, r.query),
  );
  app.post<{ Params: { cycleId: string } }>(
    "/api/v1/payout-cycles/:cycleId/ovr-batches",
    { ...config, bodyLimit: 4096 },
    (r) =>
      service.command(
        r.authSession!.user.id,
        r.params.cycleId,
        "create",
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  app.get<{ Params: { id: string } }>("/api/v1/ovr-batches/:id", config, (r) =>
    service.read(r.authSession!.user.id, r.params.id),
  );
  for (const action of ["add", "remove", "validate"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/${action === "validate" ? "validate" : `entries/${action}`}`,
      { ...config, bodyLimit: 4096 },
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
  for (const action of [
    "submit-review",
    "return-to-draft",
    "finalize",
  ] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/ovr-batches/:id/${action}`,
      {
        bodyLimit: 4096,
        config: {
          permission:
            action === "submit-review" ? "ovr.prepare" : "ovr.finalize",
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
