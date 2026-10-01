import { describe, it, expect } from "vitest";
import {
  parseAcademic,
  requireAcademicRecord,
} from "../server/academic/service.js";
import type { PoolConnection } from "mysql2/promise";
const id = "00000000-0000-4000-8000-000000000001";
const body = {
  academicYearId: id,
  schoolId: id,
  courseId: id,
  yearLevel: "First year",
  reason: "Verified enrollment record",
  reference: "Physical COR 01",
};
describe("Academic record contract", () => {
  it("requires all controlled references and a nonblank year level", () => {
    for (const field of ["academicYearId", "schoolId", "courseId", "yearLevel"])
      expect(() => parseAcademic({ ...body, [field]: "" })).toThrow();
    expect(parseAcademic(body)).toEqual(body);
  });
  it("rejects browser identity, unknown fields and missing audit evidence", () => {
    for (const extra of [
      { actorId: id },
      { scholarId: id },
      { status: "active" },
      { reason: "" },
      { reference: "" },
      { yearLevel: "1\n2" },
    ])
      expect(() => parseAcademic({ ...body, ...extra })).toThrow();
  });
  it("accepts varied year-level labels without inventing a program policy", () => {
    for (const yearLevel of ["Grade 12", "2nd year", "Graduate year 1"])
      expect(parseAcademic({ ...body, yearLevel }).yearLevel).toBe(yearLevel);
  });
  it("blocks dependent workflows when the selected year has no complete record", async () => {
    for (const rows of [
      [],
      [{ id, school_id: id, course_id: id, year_level: " " }],
    ]) {
      const db = { execute: async () => [rows] } as unknown as PoolConnection;
      await expect(requireAcademicRecord(db, id, id)).rejects.toMatchObject({
        status: 409,
        code: "ACADEMIC_RECORD_REQUIRED",
      });
    }
  });
});
