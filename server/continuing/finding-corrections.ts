export type AdverseField = "hasFailed" | "hasDropped";
export type CorrectionTarget = { reviewId: string; field: AdverseField };
export type RecordingCorrection = { kind: "recording_error"; targets: CorrectionTarget[] };
type Review = { id: string; revision: number; findings: { hasFailed: boolean | null; hasDropped: boolean | null }; correction: RecordingCorrection | null };

/** Resolve only explicitly corrected earlier findings; a later adverse finding is independent. */
export function unresolvedFindings(history: Review[]): CorrectionTarget[] {
  const ordered = [...history].sort((a, b) => a.revision - b.revision);
  let unresolved: CorrectionTarget[] = [];
  for (const review of ordered) {
    if (review.correction?.kind === "recording_error") {
      unresolved = unresolved.filter((target) => !review.correction!.targets.some((c) =>
        c.reviewId === target.reviewId && c.field === target.field && review.findings[c.field] === false));
    }
    for (const field of ["hasFailed", "hasDropped"] as const)
      if (review.findings[field] === true) unresolved.push({ reviewId: review.id, field });
  }
  return unresolved;
}
