import { describe, it, expect } from "vitest";
import { requireCoveredPlacement } from "../server/requirements/semester-context";

describe("semester document placement", () => {
  it("does not verify prior grades against a later transfer or course shift", () => {
    expect(() => requireCoveredPlacement("cog", "2026-08-01", "2026-05-31")).toThrow("historical placement");
  });
  it("accepts placement effective within the covered semester and the unchanged annual baseline", () => {
    expect(() => requireCoveredPlacement("cog", "2026-05-31", "2026-05-31")).not.toThrow();
    expect(() => requireCoveredPlacement("cog", null, "2026-05-31")).not.toThrow();
  });
  it("does not apply the prior-grades restriction to current COR", () => {
    expect(() => requireCoveredPlacement("cor", "2026-08-01", "2026-05-31")).not.toThrow();
  });
});
