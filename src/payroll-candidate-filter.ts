export type CandidateStatus = {eligible:boolean;pending:boolean;deferred?:{current:boolean} | null};
export function candidateGroup(item:CandidateStatus) {
  return item.deferred?.current ? "deferred" : item.eligible ? "included" : item.pending ? "review" : "other";
}
export function matchesCandidateFilter(item:CandidateStatus,filter:string) {return filter === "all" || candidateGroup(item) === filter;}
