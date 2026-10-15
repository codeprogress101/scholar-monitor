import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { currentReceiptEvidence } from "../server/requirements/receipt-evidence";
import type { RequirementReceipt } from "../server/requirements/instances-model";
import type { RequirementWorkflowEvent } from "../server/requirements/workflow-model";
import ReceiptTimingEvidence from "../src/ReceiptTimingEvidence";

const receipt: RequirementReceipt = { id: "original", receivedOn: "2026-10-05", recordedAt: "2026-10-06T16:00:00.123456Z", receiverName: "Staff", physicalReference: null, storageLocation: "", remarks: null, reason: "Receipt" };
const event = (version: number, action: RequirementWorkflowEvent["action"], date = "2026-10-08"): RequirementWorkflowEvent => ({
  id: `event-${version}`, version, action, fromStatus: "for_correction", toStatus: "resubmitted", effectiveOn: date,
  reason: "Test", reference: "Test", remarks: null, correctionOf: null, actorName: "Another officer", recordedAt: "2026-10-09T04:00:00.000001Z",
  details: action === "resubmit" ? { receipt: { receivedOn: date, storageLocation: "", physicalReference: null, remarks: null, documentType: "certificate_of_enrollment" } } : {},
});

it("preserves date-only physical evidence and the separate exact server timestamp", () => {
  const result = currentReceiptEvidence(receipt, []);
  expect(result.current).toMatchObject({ sourceId: "original", physicalPrecision: "date", receivedOn: "2026-10-05", recordedAt: receipt.recordedAt });
  expect(result.current).not.toHaveProperty("documentType");
  expect(result.current).not.toHaveProperty("eligible");
});

it("uses the latest replacement version, never later verification or decision dates", () => {
  const result = currentReceiptEvidence(receipt, [event(8, "verify", "2026-10-12"), event(7, "resubmit"), event(4, "resubmit", "2026-10-06")]);
  expect(result.current).toMatchObject({ source: "resubmission", sourceId: "event-7", version: 7, receivedOn: "2026-10-08", recordedBy: "Another officer", documentType: "certificate_of_enrollment" });
  expect(currentReceiptEvidence(receipt, [event(3, "verify")]).current?.sourceId).toBe("original");
});

it("does not reuse an old receipt when a replacement's physical evidence is missing", () => {
  const replacement = event(4, "resubmit"); replacement.details = {};
  expect(currentReceiptEvidence(receipt, [replacement])).toMatchObject({ current: null, issue: expect.any(String) });
});

it("does not infer a receipt from review history or waive missing precision", () => {
  expect(currentReceiptEvidence(null, [event(3, "verify")])).toEqual({ current: null, issue: null });
  for (const receivedOn of ["2026-02-30", "2026-10-05T12:00:00Z", ""])
    expect(currentReceiptEvidence({ ...receipt, receivedOn }, []).current).toBeNull();
  expect(currentReceiptEvidence({ ...receipt, recordedAt: "2026-10-06 16:00:00" }, []).current).toBeNull();
});

it("projects evidence without modifying original receipt or history", () => {
  const history = [event(4, "resubmit"), event(5, "reject")];
  const before = JSON.stringify({ receipt, history });
  currentReceiptEvidence(receipt, history);
  expect(JSON.stringify({ receipt, history })).toBe(before);
});

it("shows the Manila entry date separately without adding Staff inputs", () => {
  const html = renderToStaticMarkup(<ReceiptTimingEvidence evidence={currentReceiptEvidence(receipt, [])} />);
  expect(html).toContain("Physical receipt: 2026-10-05 (date only; time not recorded)");
  expect(html).toContain("Oct 7, 2026");
  expect(html).toContain("Asia/Manila");
  expect(html).not.toContain("<input");
  expect(renderToStaticMarkup(<ReceiptTimingEvidence evidence={currentReceiptEvidence(receipt, [event(4, "resubmit")])} />)).toContain("Latest replacement received");
});
