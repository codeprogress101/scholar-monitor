import { expect, it } from "vitest";
import { scholarIssueAction } from "../src/scholar-issue-navigation";

it("routes academic and selection problems to different records in the draft year", () => {
  const academic = scholarIssueAction("ACADEMIC_RECORD_REQUIRED", "student", "draft-year");
  const selection = scholarIssueAction("SELECTION_REQUIRED", "student", "draft-year");
  expect(academic.href).toBe("#scholars?scholar=student&section=academic&academicYear=draft-year");
  expect(selection.href).toContain("section=scholarship");
  expect(selection.role).toBe("Coordinator approval required");
});

it("opens the blocked payroll semester's receiving context instead of silently choosing another period", () => {
  for (const code of ["REQUIREMENT_MISSING", "COVERED_DOCUMENT_UNVERIFIED", "ACADEMIC_COMPLIANCE_REQUIRED", "RECEIPT_TIMING_REQUIRED"]) {
    const action = scholarIssueAction(code, "student", "past-year", "past-semester", "cycle");
    const params = new URLSearchParams(action.href!.split("?")[1]);
    expect(Object.fromEntries(params)).toEqual({ scholar: "student", section: "requirements", academicYear: "past-year", semester: "past-semester", payrollCycle: "cycle" });
  }
});

it("does not disguise official membership or unknown blockers as document problems", () => {
  expect(scholarIssueAction("OFFICIAL_MEMBERSHIP_REQUIRED", "student", "year").href).toBe("#masterlists");
  expect(scholarIssueAction("FUTURE_BLOCKER", "student", "year").href).toBeUndefined();
  expect(scholarIssueAction("SCHOLARSHIP_RECORD_REQUIRED", "student", "year").role).toContain("continuing baseline");
});

it('does not offer a profile repair for historical, cutoff or entitlement restrictions',()=>{
 for(const code of ['HISTORICAL_BATCH_APPROVAL_REQUIRED','HISTORICAL_SCOPE_CHANGED','CUTOFF_NOT_REACHED','SEMESTER_ALREADY_ALLOCATED','INDIVIDUAL_ROUTE_ACTIVE','NOT_ELIGIBLE']){
  const action=scholarIssueAction(code,'student','year','semester','cycle');expect(action.href).toBeUndefined();expect(action.explanation).toBeTruthy();
 }
 expect(scholarIssueAction('PRIOR_BATCH_APPROVAL_REQUIRED','student','year').permissions).toEqual(['academic.changes.approve','requirements.verify','semesters.configure']);
});
