import type { FastifyInstance } from "fastify";
import type { PayoutService } from "./service.js";
import { AuthError } from "../auth/service.js";
export function registerPayouts(app: FastifyInstance, service: PayoutService) {
  app.get<{ Params: { id: string } }>("/api/v1/semesters/:id/document-sources", { config: { permission: "configuration.read" } }, r => service.documentSources(r.authSession!.user.id, r.params.id));
  app.get(
    "/api/v1/payout-cycles",
    { config: { permission: "configuration.read" } },
    (r) => service.list(r.authSession!.user.id, r.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/payout-cycles/:id/history",
    { config: { permission: "configuration.read" } },
    (r) => service.history(r.authSession!.user.id, r.params.id),
  );
  app.post(
    "/api/v1/payout-cycles",
    { bodyLimit: 16384, config: { permission: "configuration.manage" } },
    (r) =>
      service.command(
        r.authSession!.user.id,
        null,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  for (const action of ["configure", "open", "lock", "close"] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/payout-cycles/:id/${action}`,
      {
        bodyLimit: 16384,
        config: {
          permission:
            action === "configure" ? "configuration.manage" : "payouts.operate",
        },
      },
      (r) => {
        if ((r.body as { action?: unknown })?.action !== action)
          throw new AuthError(
            422,
            "VALIDATION_FAILED",
            "The command must match its endpoint.",
          );
        return service.command(
          r.authSession!.user.id,
          r.params.id,
          r.headers["idempotency-key"],
          r.body,
          r.id,
        );
      },
    );
}
