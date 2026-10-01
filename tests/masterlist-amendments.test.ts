import { describe, it, expect } from "vitest";
import { parseAmendment } from "../server/masterlists/amendment-validation.js";
const body = {
  expectedVersion: 7,
  scholarId: "00000000-0000-4000-8000-000000000001",
  kind: "year_level_correction",
  yearLevel: "Third year",
  effectiveOn: "2026-09-04",
  reason: "Verified correction",
  reference: "Amendment register 01",
};
describe("official amendment validation", () => {
  it("requires only the fields for the selected change type", () => {
    expect(parseAmendment(body).kind).toBe("year_level_correction");
    for (const patch of [
      { schoolId: body.scholarId },
      { yearLevel: undefined },
      { kind: "award_number" },
      { kind: "identity_refresh" },
      { expectedVersion: 0 },
    ])
      expect(() => parseAmendment({ ...body, ...patch })).toThrow();
  });
  it("permits each explicit type and clearing an optional award", () => {
    const { yearLevel: unused, ...base } = body;
    void unused;
    for (const fields of [
      { kind: "course_shift", courseId: body.scholarId },
      { kind: "school_transfer", schoolId: body.scholarId },
      { kind: "both", courseId: body.scholarId, schoolId: body.scholarId },
      { kind: "award_number", awardNumber: null },
      { kind: "identity_refresh" },
    ])
      expect(() => parseAmendment({ ...base, ...fields })).not.toThrow();
  });
  it("rejects forged actors, arbitrary snapshot fields and invalid dates", () => {
    for (const patch of [
      { actorId: body.scholarId },
      { name: "Injected identity" },
      { after: {} },
      { effectiveOn: "2099-01-01" },
      { effectiveOn: "2026-02-30" },
      { reason: "" },
    ])
      expect(() => parseAmendment({ ...body, ...patch })).toThrow();
  });
});
