import { describe, it, expect } from "vitest";
import {
  parseAcademicChange,
  validatePlacementChange,
} from "../server/academic/changes-validation.js";
const before = {
  schoolId: "00000000-0000-4000-8000-000000000001",
  courseId: "00000000-0000-4000-8000-000000000002",
  yearLevel: "First year",
  school: { code: "S", name: "School" },
  course: { code: "C", name: "Course" },
};
const input = {
  schoolId: before.schoolId,
  courseId: "00000000-0000-4000-8000-000000000003",
  yearLevel: before.yearLevel,
  expectedVersion: 0,
  kind: "course_shift",
  effectiveOn: "2026-09-01",
  reason: "Verified change",
  reference: "Register 01",
  remarks: "",
};
describe("academic changes", () => {
  it("requires valid date, evidence and server-owned actors", () => {
    for (const patch of [
      { effectiveOn: "2099-01-01" },
      { effectiveOn: "2026-02-30" },
      { reason: "" },
      { expectedVersion: -1 },
      { actorId: before.schoolId },
      { remarks: "bad\nremarks" },
    ])
      expect(() => parseAcademicChange({ ...input, ...patch })).toThrow();
  });
  it("accepts all four precise change types", () => {
    for (const patch of [
      {},
      {
        kind: "school_transfer",
        courseId: before.courseId,
        schoolId: input.courseId,
      },
      { kind: "both", schoolId: input.courseId },
      {
        kind: "year_level_correction",
        courseId: before.courseId,
        yearLevel: "Second year",
      },
    ])
      expect(() =>
        validatePlacementChange(
          before,
          parseAcademicChange({ ...input, ...patch }),
        ),
      ).not.toThrow();
  });
  it("rejects no-ops and unrelated field changes", () => {
    for (const patch of [
      { courseId: before.courseId },
      { schoolId: input.courseId },
      { yearLevel: "Second year" },
      { kind: "both" },
      { kind: "year_level_correction" },
    ])
      expect(() =>
        validatePlacementChange(
          before,
          parseAcademicChange({ ...input, ...patch }),
        ),
      ).toThrow();
  });
});
