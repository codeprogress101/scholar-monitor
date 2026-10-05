import { expect, it } from "vitest";
import { parseDashboard } from "../server/dashboard/service";
it("requires explicit dashboard scope and rejects browser-supplied metrics", () => {
  const cycleId = "c0dcf5e2-9e45-43d9-9241-3664534e1731";
  expect(parseDashboard({ cycleId })).toEqual({ cycleId });
  for (const input of [
    {},
    { cycleId: "invalid" },
    { cycleId, total: 769 },
    { cycleId, kind: "payments" },
  ])
    expect(() => parseDashboard(input)).toThrow();
});
