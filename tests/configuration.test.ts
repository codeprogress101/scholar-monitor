import { describe, expect, it } from "vitest";
import {
  parseCommand,
  parseKind,
  parseQuery,
} from "../server/configuration/validation.js";
const base = {
  action: "create",
  expectedVersion: 0,
  reason: "Initial period setup",
  fields: {
    code: " ay2026 ",
    name: "Academic year 2026",
    startsOn: "2026-06-01",
    endsOn: "2027-05-31",
  },
};
describe("reference input rules", () => {
  it("normalizes permanent codes and retains calendar dates", () => {
    const result = parseCommand("academic-years", base);
    expect(result.fields?.code).toBe("AY2026");
    expect(result.fields?.startsOn).toBe("2026-06-01");
  });
  it.each([
    "2026-02-30",
    "2025-02-29",
    "2026-13-01",
    "1899-01-01",
    "2026-01-01T00:00:00Z",
  ])("rejects invalid date %s", (startsOn) => {
    expect(() =>
      parseCommand("academic-years", {
        ...base,
        fields: { ...base.fields, startsOn },
      }),
    ).toThrow();
  });
  it("rejects reversed dates and fields injected into state commands", () => {
    expect(() =>
      parseCommand("academic-years", {
        ...base,
        fields: { ...base.fields, startsOn: "2028-01-01" },
      }),
    ).toThrow();
    expect(() =>
      parseCommand("schools", {
        action: "archive",
        expectedVersion: 1,
        reason: "Archive record",
        fields: { name: "Injected" },
      }),
    ).toThrow();
  });
  it("rejects unknown fields, table names and invalid paging", () => {
    expect(() =>
      parseCommand("schools", {
        ...base,
        fields: { code: "SCHOOL", name: "School", locked: true },
      }),
    ).toThrow();
    expect(() => parseKind("users")).toThrow();
    expect(() => parseQuery({ limit: "1000" })).toThrow();
    expect(() => parseQuery({ includeArchived: "yes" })).toThrow();
  });
  it("validates dates stored as settings", () => {
    expect(() =>
      parseCommand("settings", {
        ...base,
        fields: {
          code: "DEADLINE",
          name: "Program deadline",
          valueType: "date",
          value: "2026-02-30",
        },
      }),
    ).toThrow();
  });
  it("requires the expected version and limits locks to periods", () => {
    expect(() =>
      parseCommand("schools", {
        action: "lock",
        expectedVersion: 1,
        reason: "Lock record",
      }),
    ).toThrow();
    expect(() =>
      parseCommand("academic-years", { ...base, expectedVersion: 1 }),
    ).toThrow();
    expect(() =>
      parseCommand("academic-years", {
        action: "lock",
        expectedVersion: 0,
        reason: "Lock record",
      }),
    ).toThrow();
  });
});
