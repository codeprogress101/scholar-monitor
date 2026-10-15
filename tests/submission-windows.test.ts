import { describe, expect, it } from "vitest";
import { deadlineBoundary, localDayStart, parseWindowAction, submissionState, validateWindow } from "../server/payouts/submission-rules";

describe("Manila submission windows", () => {
  it("includes the whole selected local day with an exclusive next-day boundary", () => {
    expect(localDayStart("2026-10-15")).toBe("2026-10-14T16:00:00.000Z");
    expect(deadlineBoundary("2026-10-15")).toBe("2026-10-15T16:00:00.000Z");
    expect(submissionState("2026-10-15", "2026-10-15", "2026-10-14T15:59:59.999Z")).toBe("scheduled");
    expect(submissionState("2026-10-15", "2026-10-15", "2026-10-14T16:00:00Z")).toBe("open");
    expect(submissionState("2026-10-15", "2026-10-15", "2026-10-15T15:59:59.999Z")).toBe("open");
    expect(submissionState("2026-10-15", "2026-10-15", "2026-10-15T16:00:00Z")).toBe("cutoff_reached");
  });
  it("handles month, leap-year and year boundaries", () => {
    expect(deadlineBoundary("2028-02-29")).toBe("2028-02-29T16:00:00.000Z");
    expect(deadlineBoundary("2026-12-31")).toBe("2026-12-31T16:00:00.000Z");
  });
  it("rejects overlap on the cutoff day but permits the next local day", () => {
    const existing = [{ opensOn: "2026-10-01", cutoffOn: "2026-10-07" }];
    expect(() => validateWindow("2026-10-07", "2026-10-10", "2026-10-31", existing)).toThrow(/overlap/);
    expect(() => validateWindow("2026-10-08", "2026-10-10", "2026-10-31", existing)).not.toThrow();
  });
  it("does not extend the semester implicitly or accept reversed windows", () => {
    expect(() => validateWindow("2026-10-01", "2026-11-01", "2026-10-31", [])).toThrow(/deadline/);
    expect(() => validateWindow("2026-10-10", "2026-10-09", "2026-10-31", [])).toThrow();
  });
  it("requires reasons for extensions and rejects forged lifecycle, term and datetime values", () => {
    expect(() => parseWindowAction("extend-semester", { expectedCycleVersion: 1, expectedRevision: 1, deadlineOn: "2026-11-01" })).toThrow();
    const v = { expectedCycleVersion: 1, termNumber: 1, expectedSemesterVersion: 1, expectedYearVersion: 1, deadlineOn: "2026-10-31" };
    expect(() => parseWindowAction("configure", { ...v, termNumber: 3 })).toThrow();
    expect(() => parseWindowAction("configure", { ...v, deadlineOn: "2026-02-30" })).toThrow();
    expect(() => parseWindowAction("configure", { ...v, deadlineOn: "2026-10-31T23:59:59Z" })).toThrow();
    expect(() => parseWindowAction("configure", { ...v, financialActivationEnabled: true })).toThrow();
  });
});
