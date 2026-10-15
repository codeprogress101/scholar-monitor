import { describe, it, expect } from "vitest";
import type { ConfigRecord } from "../server/configuration/model";
import type { ScholarshipRecord } from "../server/qualification/model";
import { receivingYears, receivingAdmission } from "../src/receiving-workspace";
const year = (id: string, startsOn: string, endsOn: string, working = false): ConfigRecord => ({ id, startsOn, endsOn, working, code:id, name:id, version:1, archived:false, locked:false, parentUnavailable:false, academicYearId:null, valueType:null, value:null });
describe("receiving workspace", () => {
  it("keeps this year, overlapping demo years and future years out of earlier-year history", () => {
    const current = year("current", "2026-06-01", "2027-05-31", true);
    const v = receivingYears([current, year("prior", "2025-06-01", "2026-05-31"), year("older", "2024-06-01", "2025-05-31"), year("demo", "2026-01-01", "2026-12-31"), year("future", "2027-06-01", "2028-05-31")], "demo", "2026-10-08");
    expect(v.current?.id).toBe("current");
    expect(v.previous.map(y => y.id)).toEqual(["prior", "older"]);
  });
  it("does not invent an earlier year when only the current year exists", () => {
    expect(receivingYears([year("current", "2026-01-01", "2026-12-31", true)], "current", "2026-10-08").previous).toEqual([]);
  });
  it("distinguishes completed selection from masterlist publication", () => {
    const selected = { status: "selected" } as ScholarshipRecord;
    expect(receivingAdmission(selected, false)).toBe("Coordinator selection complete. Masterlist publication pending.");
    expect(receivingAdmission(selected, true)).toBe("Official masterlist membership confirmed.");
    expect(receivingAdmission({ status: "applicant" } as ScholarshipRecord, false)).toBeNull();
  });
});
