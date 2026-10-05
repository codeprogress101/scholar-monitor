import { describe, it, expect } from "vitest";
import { parseProfileQuery } from "../server/scholars/profile-service.js";
describe("scholar timeline query", () => {
  it("defaults to bounded timeline pages", () => {
    expect(parseProfileQuery({})).toEqual({
      offset: 0,
      limit: 25,
      category: "all",
    });
    expect(
      parseProfileQuery({ offset: "25", limit: "50", category: "payout" }),
    ).toEqual({ offset: 25, limit: 50, category: "payout" });
  });
  it("rejects invalid pages, unknown categories and authority injection", () => {
    for (const query of [
      { limit: 0 },
      { limit: 101 },
      { offset: -1 },
      { offset: 1.2 },
      { category: "private" },
      { role: "coordinator" },
    ])
      expect(() => parseProfileQuery(query)).toThrow();
  });
});
