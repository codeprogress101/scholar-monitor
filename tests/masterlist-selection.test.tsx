import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { projectCandidate, loadCandidateSources, type CandidateSources } from "../server/masterlists/candidate-source";
import { excludeActivation } from "../server/masterlists/activation-review";
import { SelectionCounts } from "../src/MasterlistSelection";
import type { SelectionReview } from "../server/masterlists/selection-model";

const facts = (): CandidateSources => ({ graduated: false,
  person: { id: "person", human_id: "LDSS-2026-00001", first_name: "Fictional", last_name: "Candidate", version: 2 } as RowDataPacket,
  annual: { id: "annual", version: 3, status: "selected" } as RowDataPacket,
  academic: { id: "academic", version: 0, placement: { schoolId: "school", courseId: "course", yearLevel: "1", school: { code: "S", name: "School" }, course: { code: "C", name: "Course" } } },
});
describe("ordinary Masterlist selection sources", () => {
  it("retains exact selected-year source IDs, revisions and placement", () => {
    const result = projectCandidate("person", facts());
    expect(result.issues).toEqual([]);
    expect(result.snapshot).toMatchObject({ scholarId: "person", scholarshipId: "annual", scholarshipVersion: 3, academicRecordId: "academic", academicVersion: 0, personVersion: 2 });
  });
  it("preserves accepted Continuing evidence without inventing a Selected record", () => {
    const f = facts(); delete f.annual; f.baseline = { id: "participation", event_id: "acceptance" } as RowDataPacket;
    const result = projectCandidate("person", f);
    expect(result.snapshot).toMatchObject({ scholarshipId: "participation", scholarshipVersion: 0, continuingAdmission: { participationId: "participation", eventId: "acceptance" } });
  });
  it("requires year-specific academic evidence and rejects graduated candidates", () => {
    const f = facts(); f.academic = null; f.graduated = true;
    const result = projectCandidate("person", f);
    expect(result.snapshot).toBeNull();
    expect(result.issues.map(i => i.code)).toEqual(["PRIOR_GRADUATE", "ACADEMIC_RECORD_REQUIRED"]);
  });
  it("retains a supported course-pending exception and reports unresolved sources honestly", () => {
    const f = facts(); f.academic!.placement.courseId = "";
    expect(projectCandidate("person", f).issues[0].code).toBe("ACADEMIC_RECORD_REQUIRED");
    f.academic!.placement.coursePending = { id: "exception", revision: 1, importId: "import", sourceRow: 2, approvalReference: "Declared fixture" };
    expect(projectCandidate("person", f).issues).toEqual([]);
    f.sourceIssue = "Review current scholarship standing.";
    expect(projectCandidate("person", f).snapshot).toBeNull();
  });
  it("excludes a second activation while retaining the authoritative official reference", () => {
    const c = projectCandidate("person", facts()), official = { masterlistId: "official", title: "Original official list", yearCode: "AY", effectiveOn: "2026-10-20" };
    const excluded = excludeActivation(c, official);
    expect(excluded.issues[0].code).toBe("ALREADY_ACTIVATED");
    expect(excluded.activationConflict).toEqual(official);
    expect(c.issues).toEqual([]);
    expect(excludeActivation(c, { ...official, masterlistId: null, title: null }).issues[0].code).toBe("OPERATIONAL_STANDING_REVIEW");
  });
  it("labels disjoint count categories and does not imply approval", () => {
    const review = { counts: { matching: 1000, eligible: 700, alreadyOnDraft: 100, activated: 150, blocked: 50 } } as SelectionReview;
    const html = renderToStaticMarkup(<SelectionCounts review={review} />);
    for (const label of ["Matching candidates", "Eligible for new addition", "Already on this draft", "Activated outside this draft", "Other blocked candidates", "Each match is counted once"]) expect(html).toContain(label);
    expect(html).not.toContain("approved");
  });
  it("rejects a scope above capacity before issuing any source query", async () => {
    await expect(loadCandidateSources({} as PoolConnection, Array.from({ length: 5001 }, (_, i) => String(i)), "year"))
      .rejects.toMatchObject({ code: "SELECTION_CAPACITY" });
  });
});
