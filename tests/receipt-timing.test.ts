import { expect, it } from "vitest";
import { classifyReceiptTiming } from "../server/requirements/timing-rules";
import type { PhysicalReceiptEvidence } from "../server/requirements/receipt-evidence";
const paper = (receivedOn: string, recordedAt: string): PhysicalReceiptEvidence => ({ source: "initial_receipt", sourceId: "receipt", version: 1, physicalPrecision: "date", receivedOn, recordedAt, recordedBy: "Staff" });
it("includes the full Manila cutoff day but not its next midnight", () => {
  expect(classifyReceiptTiming(paper("2026-10-07", "2026-10-07T15:59:59.999999Z"), "2026-10-07")).toBe("on_time");
  expect(classifyReceiptTiming(paper("2026-10-07", "2026-10-07T16:00:00.000000Z"), "2026-10-07")).toBe("review_required");
});
it("backdating alone cannot establish timely submission", () => {
  expect(classifyReceiptTiming(paper("2026-09-01", "2026-10-08T02:00:00Z"), "2026-10-07")).toBe("review_required");
});
it("a late replacement must qualify on its own physical date", () => {
  expect(classifyReceiptTiming({ ...paper("2026-10-08", "2026-10-08T02:00:00Z"), source: "resubmission" }, "2026-10-07")).toBe("late");
});
it("keeps missing evidence blocked and allows earlier evidence for a later cutoff", () => {
  expect(classifyReceiptTiming(null, "2026-10-07")).toBe("missing_receipt");
  expect(classifyReceiptTiming(paper("2026-10-01", "2026-10-01T02:00:00Z"), "2026-10-20")).toBe("on_time");
});
