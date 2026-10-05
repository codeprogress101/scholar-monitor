import { describe, it, expect } from "vitest";
import { parseReport } from "../server/reports/service";
import { REPORTS } from "../server/reports/model";
const cycleId = "c0dcf5e2-9e45-43d9-9241-3664534e1731";
describe("operational report scope", () => {
  it("requires explicit report and cycle, defaults bounded pagination", () => {
    for (const kind of Object.keys(REPORTS))
      expect(parseReport({ kind, cycleId })).toEqual({
        kind,
        cycleId,
        limit: 25,
        offset: 0,
      });
  });
  it("rejects arbitrary columns, invalid scopes and unbounded pagination", () => {
    for (const input of [
      { kind: "unknown", cycleId },
      { kind: "scholars" },
      { kind: "scholars", cycleId, columns: ["email"] },
      { kind: "scholars", cycleId, limit: 101 },
      { kind: "payments", cycleId, offset: -1 },
    ])
      expect(() => parseReport(input)).toThrow();
  });
});
