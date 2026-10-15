import { describe, expect, it } from "vitest";
import { gradingPeriodApplies } from "../server/continuing/compliance-period";

describe("grading applicability for ended academic reviews", () => {
  const semester = { starts: "2026-06-01", ends: "2026-09-30" };
  it("retains a rule through its covered semester after its applicability ends", () => {
    expect(gradingPeriodApplies(semester, semester, "2026-10-07")).toBe(true);
  });
  it("accepts open-ended applicability covering the semester", () => {
    expect(gradingPeriodApplies({ starts: "2026-01-01", ends: null }, semester, "2026-10-07")).toBe(true);
  });
  it("rejects rules beginning after the covered semester started", () => {
    expect(gradingPeriodApplies({ ...semester, starts: "2026-06-02" }, semester, "2026-10-07")).toBe(false);
  });
  it("rejects rules ending before the covered semester ended", () => {
    expect(gradingPeriodApplies({ ...semester, ends: "2026-09-29" }, semester, "2026-10-07")).toBe(false);
  });
  it("keeps the current-period boundary inclusive", () => {
    expect(gradingPeriodApplies(semester, semester, "2026-09-30")).toBe(true);
  });
  it("rejects a future rule during the current semester", () => {
    expect(gradingPeriodApplies({ ...semester, starts: "2026-09-02" }, semester, "2026-09-01")).toBe(false);
  });
});
