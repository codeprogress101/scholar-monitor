import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parsePayout, payoutTransition } from "../server/payouts/validation.js";
import { parseGeneration } from "../server/requirements/instances-validation.js";
describe("Payout cycle contract", () => {
  const fields = {
    name: "First semester payout",
    targetDate: "2027-03-12",
    requirements: [{ definitionVersionId: randomUUID(), allowWaiver: true }],
  };
  const create = {
    action: "create",
    expectedVersion: 0,
    semesterId: randomUUID(),
    expectedSemesterVersion: 1,
    code: "CYCLE-ONE",
    fields,
    reason: "Configured business target",
    reference: "CALENDAR-001",
  };
  it("stores arbitrary configured target dates and requires an explicit policy selection", () => {
    expect(parsePayout(create)).toEqual(create);
    for (const targetDate of ["2027-01-15", "2027-06-20", "2027-11-09"])
      expect(
        parsePayout({ ...create, fields: { ...fields, targetDate } }),
      ).toMatchObject({ fields: { targetDate } });
    for (const change of [
      { targetDate: "" },
      { requirements: [] },
      { requirements: [fields.requirements[0], fields.requirements[0]] },
      { requirements: [{ definitionVersionId: randomUUID() }] },
    ])
      expect(() =>
        parsePayout({ ...create, fields: { ...fields, ...change } }),
      ).toThrow();
  });
  it("requires revision, authenticated attribution and explicit commands", () => {
    for (const change of [
      { actorId: randomUUID() },
      { state: "open" },
      { expectedVersion: -1 },
      { expectedSemesterVersion: 0 },
      { reason: "" },
    ])
      expect(() => parsePayout({ ...create, ...change })).toThrow();
  });
  it("freezes configuration at opening and never reopens locked or closed cycles", () => {
    const edges = {
      "draft:configure": "draft",
      "draft:open": "open",
      "open:lock": "locked",
      "open:close": "closed",
      "locked:close": "closed",
    };
    for (const state of ["draft", "open", "locked", "closed"] as const)
      for (const action of ["configure", "open", "lock", "close"] as const) {
        const result = edges[`${state}:${action}` as keyof typeof edges];
        if (result) expect(payoutTransition(state, action)).toBe(result);
        else expect(() => payoutTransition(state, action)).toThrow();
      }
  });
  it("requires paired cycle identity and revision without accepting policy dates from generation clients", () => {
    const generation = {
      semesterId: randomUUID(),
      expectedSemesterVersion: 1,
      reason: "Generate payout checklist",
      reference: "GEN-001",
    };
    expect(
      parseGeneration({
        ...generation,
        payoutCycleId: randomUUID(),
        expectedPayoutVersion: 2,
      }),
    ).toMatchObject({ expectedPayoutVersion: 2 });
    for (const extra of [
      { payoutCycleId: randomUUID() },
      { expectedPayoutVersion: 2 },
      { targetDate: "2027-01-01" },
      { payoutVersionId: randomUUID() },
    ])
      expect(() => parseGeneration({ ...generation, ...extra })).toThrow();
  });
});
