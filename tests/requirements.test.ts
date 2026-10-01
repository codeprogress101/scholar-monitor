import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  parseRequirement,
  parseRequirementContext,
  parseRequirementList,
} from "../server/requirements/validation.js";
const fields = {
  name: "COR",
  instructions: "Present the physical document.",
  appliesTo: "semester",
  semesterId: null,
  effectiveFrom: "2026-10-01",
  effectiveUntil: null,
};
const command = {
  action: "create",
  code: "COR",
  expectedVersion: 0,
  reason: "Approved policy",
  reference: "MEMO-01",
  fields,
};
describe("requirement definition contracts", () => {
  it("accepts semester and payout policy, optional scope and exclusive end", () => {
    expect(parseRequirement(command).action).toBe("create");
    expect(
      parseRequirement({
        ...command,
        fields: {
          ...fields,
          appliesTo: "payout",
          semesterId: randomUUID(),
          effectiveUntil: "2026-10-02",
        },
      }).action,
    ).toBe("create");
  });
  it("rejects forged actors, mutable identity and invalid effective ranges", () => {
    for (const invalid of [
      { ...command, actorId: randomUUID() },
      { ...command, action: "revise" },
      { ...command, fields: { ...fields, effectiveUntil: "2026-10-01" } },
      { ...command, fields: { ...fields, effectiveFrom: "2026-02-30" } },
      {
        ...command,
        fields: { ...fields, uploadUrl: "https://example.invalid" },
      },
      { ...command, code: "invalid code" },
    ])
      expect(() => parseRequirement(invalid)).toThrow();
  });
  it("requires archive reason/date/revision without accepting policy replacement", () => {
    expect(
      parseRequirement({
        action: "archive",
        expectedVersion: 1,
        reason: "Withdraw policy",
        reference: "MEMO-02",
        effectiveFrom: "2026-11-01",
      }).action,
    ).toBe("archive");
    expect(() => parseRequirement({ ...command, action: "archive" })).toThrow();
  });
  it("requires a concrete period/purpose/date and bounded listing", () => {
    expect(
      parseRequirementContext({
        semesterId: randomUUID(),
        appliesTo: "payout",
        effectiveOn: "2026-10-01",
      }).appliesTo,
    ).toBe("payout");
    expect(() =>
      parseRequirementContext({ effectiveOn: "2026-10-01" }),
    ).toThrow();
    expect(parseRequirementList({}).limit).toBe(25);
    expect(() => parseRequirementList({ limit: 101 })).toThrow();
  });
});
