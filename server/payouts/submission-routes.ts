import type { FastifyInstance } from "fastify";
import type { SubmissionWindowService } from "./submission-service.js";
export function registerSubmissionWindows(app: FastifyInstance, service: SubmissionWindowService) {
  const path = "/api/v1/payout-cycles/:id/submission-windows";
  app.get<{ Params: { id: string } }>(path, { config: { permission: "configuration.read" } }, (r) => service.read(r.authSession!.user.id, r.params.id));
  for (const action of ["configure", "extend-semester", "open-window", "extend-window"] as const)
    app.post<{ Params: { id: string } }>(`${path}/${action}`, { config: { permission: "payroll.windows.manage" }, bodyLimit: 4096 }, (r) => service.command(r.authSession!.user.id, r.params.id, action, r.headers["idempotency-key"], r.body, r.id));
}
