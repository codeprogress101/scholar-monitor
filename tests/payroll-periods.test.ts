import { describe, expect, it } from "vitest";
import { payrollPeriods, payrollPeriodScope } from "../src/payroll-periods";

const semesters = [
  { id: "old", startsOn: "2026-01-01", endsOn: "2026-05-31" },
  { id: "now", startsOn: "2026-06-01", endsOn: "2026-10-31" },
  { id: "next", startsOn: "2026-11-01", endsOn: "2027-03-31" },
];
const cycles = semesters.map(s => ({ id: s.id, semesterId: s.id, code: s.id, targetDate: "2026-12-01", state: "open" }));
describe("payroll period browsing", () => {
  it("uses inclusive semester dates, not an open cycle or future payout target, to identify current work", () => {
    expect(payrollPeriods(cycles, semesters, "current", "2026-10-07").map(c => c.id)).toEqual(["now"]);
    expect(payrollPeriodScope(semesters[1], "2026-06-01")).toBe("current");
    expect(payrollPeriodScope(semesters[1], "2026-10-31")).toBe("current");
    expect(payrollPeriods(cycles, semesters, "past", "2026-10-07").map(c => c.id)).toEqual(["old"]);
    expect(payrollPeriods(cycles, semesters, "upcoming", "2026-10-07").map(c => c.id)).toEqual(["next"]);
  });
  it("keeps undated records in All periods without silently presenting them as current", () => {
    expect(payrollPeriodScope({ ...semesters[1], working: false }, "2026-10-07")).toBe("all");
    const unknown = { id: "unknown", semesterId: "missing", code: "unknown", targetDate: "2026-12-31" };
    expect(payrollPeriodScope(undefined, "2026-10-07")).toBe("all");
    expect(payrollPeriodScope({ id: "bad", startsOn: "2027-01-01", endsOn: "2026-01-01" }, "2026-10-07")).toBe("all");
    expect(payrollPeriods([...cycles, unknown], semesters, "all", "2026-10-07").map(c => c.id)).toEqual(["next", "now", "old", "unknown"]);
    expect(payrollPeriods([unknown], semesters, "current", "2026-10-07")).toEqual([]);
  });
  it("filters the full collection before pagination and preserves overlapping calendars", () => {
    const records = Array.from({ length: 30 }, (_, n) => ({ ...cycles[0], id: `old-${n}` }));
    const result = payrollPeriods([...records, cycles[1], { ...cycles[1], id: "now-two" }], semesters, "current", "2026-10-07");
    expect(result.map(c => c.id)).toEqual(["now", "now-two"]);
    expect(records).toHaveLength(30);
    expect(payrollPeriods(cycles, semesters, "current", "2028-01-01")).toEqual([]);
  });
});
