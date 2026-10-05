import type { FastifyInstance } from "fastify";
import type { EligibilityOverrideService } from "./override-service.js";
export function registerEligibilityOverrides(
  app: FastifyInstance,
  service: EligibilityOverrideService,
) {
  const base =
    "/api/v1/payout-cycles/:cycleId/scholarships/:id/eligibility/overrides";
  app.post<{ Params: { cycleId: string; id: string } }>(
    base,
    {
      bodyLimit: 8192,
      config: { permission: "eligibility.overrides.request" },
    },
    (r) =>
      service.command(
        r.authSession!.user.id,
        r.params.cycleId,
        r.params.id,
        null,
        "request",
        r.headers["idempotency-key"],
        r.body,
        r.id,
      ),
  );
  for (const action of [
    "submit-review",
    "reevaluate",
    "approve",
    "reject",
    "cancel",
  ] as const) {
    app.post<{ Params: { cycleId: string; id: string; overrideId: string } }>(
      `${base}/:overrideId/${action}`,
      {
        bodyLimit: 8192,
        config: {
          permission:
            action === "approve" || action === "reject"
              ? "eligibility.overrides.approve"
              : "eligibility.overrides.request",
        },
      },
      (r) =>
        service.command(
          r.authSession!.user.id,
          r.params.cycleId,
          r.params.id,
          r.params.overrideId,
          action,
          r.headers["idempotency-key"],
          r.body,
          r.id,
        ),
    );
  }
}
