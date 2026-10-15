import { describe, expect, it } from "vitest";
import { unresolvedFindings, type RecordingCorrection } from "../server/continuing/finding-corrections";

const review = (id: string, revision: number, hasFailed: boolean | null, hasDropped: boolean | null, correction: RecordingCorrection | null = null) => ({ id, revision, findings: { hasFailed, hasDropped }, correction });
describe("recording-error reconciliation", () => {
  const original = review("a", 1, true, true);
  const correction: RecordingCorrection = { kind: "recording_error", targets: [{ reviewId: "a", field: "hasFailed" }] };
  it("does not clear historical findings through ordinary false or unknown answers", () => {
    expect(unresolvedFindings([original, review("b", 2, false, null)])).toHaveLength(2);
  });
  it("clears only the explicitly corrected review and field", () => {
    expect(unresolvedFindings([review("b", 2, false, null, correction), original])).toEqual([{ reviewId: "a", field: "hasDropped" }]);
  });
  it("requires an explicit No in the correction", () => {
    expect(unresolvedFindings([original, review("b", 2, null, null, correction)])).toHaveLength(2);
  });
  it("does not clear later genuine adverse evidence", () => {
    expect(unresolvedFindings([original, review("b", 2, false, null, correction), review("c", 3, true, null)])).toEqual([{ reviewId: "a", field: "hasDropped" }, { reviewId: "c", field: "hasFailed" }]);
  });
  it("cannot authorize corrections of future review IDs", () => {
    expect(unresolvedFindings([review("b", 1, false, null, correction), review("a", 2, true, null)])).toEqual([{ reviewId: "a", field: "hasFailed" }]);
  });
  it("cannot erase an unrelated review by correcting another review ID", () => {
    expect(unresolvedFindings([original, review("c", 2, true, null), review("b", 3, false, null, correction)])).toEqual([{ reviewId: "a", field: "hasDropped" }, { reviewId: "c", field: "hasFailed" }]);
  });
});
