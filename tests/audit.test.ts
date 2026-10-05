import { it, expect } from "vitest";
import {
  parseAuditQuery,
  redactAuditDetails,
  auditContext,
} from "../server/audit/service";
it("bounds audit filters and rejects scope overrides", () => {
  const dates = { from: "2026-01-01", to: "2026-01-31" };
  expect(parseAuditQuery(dates).limit).toBe(25);
  for (const q of [
    { ...dates, to: "2026-02-01" },
    { ...dates, scope: "all" },
    { ...dates, offset: -1 },
    { ...dates, actorId: "forged" },
  ])
    expect(() => parseAuditQuery(q)).toThrow();
});
it("uses recorded context without inventing historical values", () => {
  expect(
    auditContext({
      before: { state: "draft" },
      after: { state: "approved" },
      reference: "REF",
    }),
  ).toMatchObject({
    fromState: "draft",
    toState: "approved",
    reference: "REF",
    academicYearId: null,
  });
  expect(
    auditContext({
      calculation: {
        sources: {
          cycle: {
            id: "cycle",
            academicYearId: "year",
            semesterId: "semester",
          },
        },
      },
    }),
  ).toMatchObject({
    academicYearId: "year",
    semesterId: "semester",
    payoutCycleId: "cycle",
  });
});
it("redacts credentials recursively while preserving recorded change evidence", () => {
  expect(
    redactAuditDetails({
      before: { state: "draft" },
      after: { state: "approved" },
      items: [{ password_hash: "hidden", resetToken: "hidden" }],
    }),
  ).toEqual({
    before: { state: "draft" },
    after: { state: "approved" },
    items: [{ password_hash: "[redacted]", resetToken: "[redacted]" }],
  });
});
