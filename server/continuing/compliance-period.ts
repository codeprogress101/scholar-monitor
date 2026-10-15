/** Grading applicability belongs to its covered semester, not an invented INC deadline. */
export function gradingPeriodApplies(policy: { starts: string; ends: string | null }, semester: { starts: string; ends: string }, day: string) {
  if (semester.ends < day) return policy.starts <= semester.starts && (!policy.ends || policy.ends >= semester.ends);
  return policy.starts <= day && (!policy.ends || policy.ends >= day);
}
