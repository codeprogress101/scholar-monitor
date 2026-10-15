import { scholarAddress } from "./scholar-navigation";

/** Route from an actual blocker, never guess eligibility from its display text. */
export function scholarIssueAction(code: string, scholarId: string, yearId: string, semesterId?: string, payoutCycleId?: string) {
  switch (code) {
    case "ACADEMIC_RECORD_REQUIRED":
    case "PAYROLL_PLACEMENT_REQUIRED":
      return { href: scholarAddress(scholarId, "academic", yearId), label: "Update academic record", role: "Staff or Coordinator" };
    case "SCHOLARSHIP_RECORD_REQUIRED":
      return { href: scholarAddress(scholarId, "scholarship", yearId), label: "Review scholarship record", role: "Staff / Coordinator: check the annual record or continuing baseline" };
    case "SELECTION_REQUIRED":
    case "STATUS_NOT_ACTIVE":
    case "STANDING_REVIEW_REQUIRED":
      return { href: scholarAddress(scholarId, "scholarship", yearId), label: "Review scholarship decision", role: "Coordinator approval required" };
    case "CHECKLIST_MISSING":
    case "REQUIREMENT_MISSING":
    case "REQUIREMENT_UNSATISFIED":
    case "COVERED_DOCUMENT_UNVERIFIED":
    case "RECEIPT_TIMING_REQUIRED":
    case "ACADEMIC_COMPLIANCE_REQUIRED":
    case "ADVERSE_FINDING_UNRESOLVED":
    case "WAIVER_EXCLUDED":
      return { href: semesterId
        ? receivingScholarAddress(scholarId,yearId,semesterId,payoutCycleId)
        : scholarAddress(scholarId, "requirements", yearId), label: "Receive / review documents", role: "Staff receives; authorized reviewer verifies" };
    case "OFFICIAL_MEMBERSHIP_REQUIRED":
      return { href: "#masterlists", label: "Review official masterlist", role: "Coordinator approval required" };
    default:
      return { href: scholarAddress(scholarId, "overview", yearId), label: "View scholar", role: "" };
  }
}

export function receivingScholarAddress(scholarId:string, yearId:string, semesterId:string, payoutCycleId?:string) {
  return `#scholars?${new URLSearchParams({scholar:scholarId,section:"requirements",academicYear:yearId,semester:semesterId,...(payoutCycleId ? {payrollCycle:payoutCycleId} : {})})}`;
}
