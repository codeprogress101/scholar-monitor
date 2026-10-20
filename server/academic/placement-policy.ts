import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import { payrollYear } from "../ovr/payroll-form.js";
import type { Placement } from "./changes-model.js";

export type PlacementPolicyEvidence = {
  priorShiftCount: number | null;
  secondYearBoundaryOn: string | null;
  permissionGrantedOn: string;
  permissionReference: string;
  historyReference: string;
  sourceCategory: "degree" | "non_degree";
  destinationCategory: "degree" | "non_degree";
};
export function validatePlacementPolicy(before: Placement, target: Pick<Placement,"schoolId"|"courseId"|"yearLevel">, effectiveOn: string, evidence: PlacementPolicyEvidence) {
  const shifted=before.courseId!==target.courseId, transferred=before.schoolId!==target.schoolId;
  if(!shifted && !transferred)return;
  const fail=(code:string,message:string):never=>{throw new AuthError(409,code,message);};
  if(!evidence.permissionReference.trim() || !evidence.historyReference.trim() || evidence.permissionGrantedOn>effectiveOn)
    fail("PRIOR_PERMISSION_REQUIRED","Record verified prior permission and historical evidence for this placement change.");
  if(evidence.sourceCategory === "non_degree" && evidence.destinationCategory === "degree")
    fail("PROHIBITED_PROGRAM_SHIFT","Non-degree to degree changes are not authorized by the approved policy.");
  if(shifted){
    if(evidence.priorShiftCount === null)fail("SHIFT_HISTORY_REVIEW_REQUIRED","Unknown prior course-shift history requires review; it is not zero.");
    if(evidence.priorShiftCount!==0)fail("SHIFT_LIMIT_REACHED","Only one lifetime course shift is permitted.");
    const year=payrollYear(before.yearLevel);
    if(!year || !evidence.secondYearBoundaryOn)return fail("SHIFT_BOUNDARY_REVIEW_REQUIRED","Verify year level and the beginning of first semester of second year.");
    if(year>2 || effectiveOn>evidence.secondYearBoundaryOn)fail("SHIFT_BOUNDARY_EXCEEDED","The permitted course-shift boundary has passed.");
  }
}
export async function placementPolicySource(db:PoolConnection,scholarId:string,before:Placement) {
  const [history]=await db.execute<RowDataPacket[]>("SELECT q.id,q.kind,d.resulting_version FROM academic_changes q JOIN academic_records a ON a.id=q.academic_record_id JOIN academic_change_decisions d ON d.request_id=q.id AND d.decision='approve' WHERE a.scholar_id=? ORDER BY q.id",[scholarId]);
  return {hash:digest(JSON.stringify({before,history})),recordedShifts:history.filter(h=>h.kind === "course_shift" || h.kind === "both").length};
}
export const placementProposalHash=(target:Pick<Placement,"schoolId"|"courseId"|"yearLevel">,effectiveOn:string)=>digest(JSON.stringify({schoolId:target.schoolId,courseId:target.courseId,yearLevel:target.yearLevel,effectiveOn}));
export async function requirePlacementPolicy(db:PoolConnection,academicId:string,scholarId:string,before:Placement,target:Pick<Placement,"schoolId"|"courseId"|"yearLevel">,effectiveOn:string) {
  // Recording a previously unknown course is not evidence of a course shift.
  if(before.coursePending && !before.courseId && target.courseId && before.schoolId===target.schoolId && before.yearLevel===target.yearLevel) return;
  if(before.schoolId===target.schoolId && before.courseId===target.courseId)return;
  const source=await placementPolicySource(db,scholarId,before);
  const [[row]]=await db.execute<RowDataPacket[]>("SELECT snapshot FROM placement_policy_reviews WHERE academic_record_id=? AND proposal_hash=? AND source_hash=? ORDER BY recorded_at DESC LIMIT 1",[academicId,placementProposalHash(target,effectiveOn),source.hash]);
  if(!row)throw new AuthError(409,"PLACEMENT_POLICY_REVIEW_REQUIRED","A Coordinator must verify prior permission, program category, shift history and any applicable boundary for this exact proposed change. Approval authority alone does not waive policy.");
  const evidence:PlacementPolicyEvidence=typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot;
  if(evidence.priorShiftCount!==null && evidence.priorShiftCount<source.recordedShifts)throw new AuthError(409,"SHIFT_HISTORY_CONFLICT","Reviewed shift history cannot omit recorded approved shifts.");
  validatePlacementPolicy(before,target,effectiveOn,evidence);
}
