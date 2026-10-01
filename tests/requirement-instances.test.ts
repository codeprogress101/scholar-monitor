import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parseGeneration } from "../server/requirements/instances-validation.js";
const body = {
  semesterId: randomUUID(),
  expectedSemesterVersion: 1,
  reason: "Generate official checklist",
  reference: "POLICY-001",
};
describe("requirement generation contract", () => {
  it("requires an identified semester, revision and audit context", () => {
    expect(parseGeneration(body)).toEqual(body);
    for (const change of [
      { semesterId: "" },
      { expectedSemesterVersion: 0 },
      { reason: "x" },
      { reference: "" },
    ])
      expect(() => parseGeneration({ ...body, ...change })).toThrow();
  });
  it("never accepts browser policy date, status, actor or definition selection", () => {
    for (const change of [
      { effectiveOn: "2026-10-01" },
      { definitionVersionIds: [randomUUID()] },
      { status: "verified" },
      { actorId: randomUUID() },
      { appliesTo: "payout" },
    ])
      expect(() => parseGeneration({ ...body, ...change })).toThrow();
  });
});
