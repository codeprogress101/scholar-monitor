import { scholarAddress } from "./scholar-navigation";

/** Route from an actual blocker, never guess eligibility from its display text. */
export function scholarIssueAction(code: string, scholarId: string, yearId: string, semesterId?: string, payoutCycleId?: string): {href?:string;label:string;role:string;explanation?:string;permissions?:string[]} {
  switch (code) {
    case 'BATCH_REVIEW_REQUIRED':
      return {href:payoutCycleId?`#payouts?${new URLSearchParams({cycle:payoutCycleId})}`:'#payouts',label:'Review new payroll preparation',role:'Coordinator creates the draft',explanation:'No new batch is assigned. Review its approved submission window; publication does not create a payroll or record payment.'};
    case 'DEGREE_POLICY_REQUIRED':
      return {href:semesterId?receivingScholarAddress(scholarId,yearId,semesterId,payoutCycleId):scholarAddress(scholarId,'academic',yearId),label:'Review semester assessment basis',role:'Authorized Staff / Coordinator',explanation:'Review the recorded prior attestation or the approved program category and grading evidence for the individual route. Do not infer the category from course wording.'};
    case "ACADEMIC_RECORD_REQUIRED":
    case "PAYROLL_PLACEMENT_REQUIRED":
      return { href: scholarAddress(scholarId, "academic", yearId), label: "Update academic record", role: "Staff or Coordinator",permissions:['academic.edit'] };
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
      return { href: "#masterlists", label: "Review official masterlist", role: "Coordinator approval required",permissions:['masterlists.approve'] };
    case "PRIOR_BATCH_APPROVAL_REQUIRED":
      return {href:'#scholars',label:'Review prior batch approval',role:'Coordinator approval required',permissions:['academic.changes.approve','requirements.verify','semesters.configure']};
    case "HISTORICAL_BATCH_APPROVAL_REQUIRED":
    case "HISTORICAL_SCOPE_CHANGED":
    case "HISTORICAL_SCOPE_INVALID":
      return {label:'Payroll source review required',role:'Coordinator',explanation:'Review this payroll’s confirmed import, prior approval and annual membership. Editing the scholar or repeating COR/COG checks does not resolve a payroll source restriction.'};
    case "CUTOFF_NOT_REACHED":
      return {label:'Submission cutoff has not ended',role:'Staff / Coordinator',explanation:'Review the selected payroll cutoff. Submission is available after the whole cutoff day ends in Philippine time.'};
    case "SEMESTER_ALREADY_ALLOCATED":
    case "EXISTING_PAYROLL_ALLOCATION":
    case "STIPEND_ALREADY_PAID":
    case "INDIVIDUAL_ROUTE_ACTIVE":
      return {label:'Existing stipend route requires review',role:'Coordinator',explanation:'Check the original payroll/payment history for this semester. A profile edit cannot create another stipend entitlement.'};
    case "NOT_ELIGIBLE":
      return {label:'Review the specific reasons above',role:'',explanation:'This is a summary of the current source checks.'};
    default:
      return {label:'Further review required',role:'Staff / Coordinator',explanation:'No supported correction action is identified for this reason. Review the source before changing records.'};
  }
}

export function receivingScholarAddress(scholarId:string, yearId:string, semesterId:string, payoutCycleId?:string) {
  return `#scholars?${new URLSearchParams({scholar:scholarId,section:"requirements",academicYear:yearId,semester:semesterId,...(payoutCycleId ? {payrollCycle:payoutCycleId} : {})})}`;
}
