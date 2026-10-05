import type { FastifyInstance } from "fastify";
import type { EligibilityService } from "./service.js";
export function registerEligibility(
  app: FastifyInstance,
  service: EligibilityService,
) {
  app.get<{ Params: { cycleId: string } }>(
    "/api/v1/payout-cycles/:cycleId/eligibility",
    { config: { permission: "scholars.read" } },
    (r) => service.report(r.authSession!.user.id, r.params.cycleId, r.query),
  );
  app.get<{ Params: { cycleId: string; id: string } }>(
    "/api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility",
    { config: { permission: "scholars.read" } },
    (r) => service.read(r.authSession!.user.id, r.params.cycleId, r.params.id),
  );
  app.post<{ Params: { cycleId: string; id: string } }>(
    "/api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility/calculate",
    { bodyLimit: 4096, config: { permission: "eligibility.calculate" } },
    (r) =>
      service.calculate(
        r.authSession!.user.id,
        r.params.cycleId,
        r.params.id,
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
}
