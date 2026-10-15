import { describe, expect, it } from "vitest";
import { admissionAddress, admissionRoute } from "../src/admission-navigation";

describe("admission review navigation", () => {
  it("round-trips the reviewed year, stage, search and page without carrying selected people or commands", () => {
    const hash = admissionAddress("year-one", "qualified", "Dela Cruz & Co + II", 50);
    expect(admissionRoute(hash)).toEqual({ year: "year-one", stage: "qualified", search: "Dela Cruz & Co + II", offset: 50 });
    expect(hash).not.toContain("selectedIds");
  });
  it("rejects unknown stages and bounds malformed page/search parameters", () => {
    expect(admissionRoute("#admissions?stage=approve-everyone&offset=-25").stage).toBeUndefined();
    for (const value of ["-1", "NaN", "Infinity", "25.5", "1000001"]) expect(admissionRoute(`#admissions?offset=${value}`).offset).toBe(0);
    expect(admissionRoute("#admissions?offset=49").offset).toBe(25);
    expect(admissionRoute(`#admissions?q=${"a".repeat(120)}`).search).toHaveLength(100);
  });
});
