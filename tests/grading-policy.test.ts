import { describe, expect, it } from "vitest";
import { currentGradingPolicy } from "../server/continuing/grading-policy";
const first = { id: "a", code: "POLICY", revision: 1, rules: "{}" };
const second = { id: "b", code: "POLICY", revision: 2, rules: { replacesPolicyId: "a" } };
describe("grading policy lineage", () => {
  it("preserves a single original rule and resolves its append-only successors", () => {
    expect(currentGradingPolicy([first])).toEqual(first);
    expect(currentGradingPolicy([second, first])).toEqual(second);
    expect(currentGradingPolicy([])).toBeNull();
  });
  it.each([
    [first, { ...second, code: "OTHER" }],
    [first, { ...second, revision: 3 }],
    [first, { ...second, rules: { replacesPolicyId: "wrong" } }],
    [first, second, { ...second, id: "fork" }],
    [{ ...first, rules: { replacesPolicyId: "older" } }],
  ])("rejects conflicting, incomplete or forked policy history %j", (...rows) => {
    expect(currentGradingPolicy(rows)).toBeNull();
  });
});

describe("explicit grading-policy recovery", () => {
  const conflict = { ...first, id: "x", code: "OTHER" };
  const recovered = { id: "r", code: "RECOVERED", revision: 1, rules: { recoveryOf: ["a", "b", "x"] } };
  it("resolves all prior versions without deleting conflicting history", () => {
    expect(currentGradingPolicy([first, second, conflict, recovered])).toEqual(recovered);
  });
  it("supports ordinary successors of a recovered root", () => {
    const successor = { id: "s", code: "RECOVERED", revision: 2, rules: { replacesPolicyId: "r" } };
    expect(currentGradingPolicy([successor, recovered, conflict, second, first])).toEqual(successor);
  });
  it("fails closed when an unrelated policy appears after recovery", () => {
    expect(currentGradingPolicy([first, second, conflict, recovered, { ...conflict, id: "y", code: "NEW" }])).toBeNull();
  });
  it.each([["a", "x"], ["a", "b", "x", "r"], ["a", "b", "x", "x"], []])("rejects incomplete/self/duplicate recovery coverage %j", (...ids) => {
    expect(currentGradingPolicy([first, second, conflict, { ...recovered, rules: { recoveryOf: ids } }])).toBeNull();
  });
  it("permits a later explicit recovery of all prior histories", () => {
    const next = { id: "new", code: "NEXT", revision: 1, rules: { recoveryOf: ["a", "b", "x", "r"] } };
    expect(currentGradingPolicy([first, second, conflict, recovered, next])).toEqual(next);
  });
});
