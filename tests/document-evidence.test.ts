import { describe, expect, it } from "vitest";
import { receivedDocumentType } from "../server/requirements/document-evidence.js";
import { parseBatchReceipt, parseReceipt } from "../server/requirements/receipt-validation.js";
import { parseRequirementWorkflow } from "../server/requirements/workflow-validation.js";

describe("enrollment document evidence", () => {
  it("requires reviewed grading-card coverage and cannot substitute a college COG under that review", () => {
    expect(() => receivedDocumentType('cog','shs_grading_card')).toThrow();
    expect(() => receivedDocumentType('cor','shs_grading_card',true)).toThrow();
    expect(receivedDocumentType('cog','shs_grading_card',true)).toBe('shs_grading_card');
    expect(() => receivedDocumentType('cog','cog',true)).toThrow();
  });
  it("accepts either enrollment paper without satisfying grades", () => {
    expect(receivedDocumentType("cor", "certificate_of_enrollment")).toBe("certificate_of_enrollment");
    expect(receivedDocumentType("cor", "cor")).toBe("cor");
    expect(() => receivedDocumentType("cog", "certificate_of_enrollment")).toThrow();
    expect(() => receivedDocumentType("cor", "cog")).toThrow();
  });
  it("retains ordinary COR/COG requests and does not infer legacy alternatives", () => {
    expect(receivedDocumentType("cor")).toBe("cor");
    expect(receivedDocumentType("cog")).toBe("cog");
    expect(receivedDocumentType(undefined)).toBeNull();
    expect(() => receivedDocumentType(undefined, "certificate_of_enrollment")).toThrow();
  });
  it("accepts an explicit type on each initial receipt and replacement, rejecting forged types", () => {
    const receipt = { expectedVersion: 0, receivedOn: "2020-01-01", physicalReference: null, storageLocation: "Cabinet", remarks: null, reason: "Physical copy received", documentType: "certificate_of_enrollment" };
    expect(parseReceipt(receipt).documentType).toBe("certificate_of_enrollment");
    expect(parseBatchReceipt({ items: [{ id: "b064be54-326f-4e23-b452-734af9c50e0b", expectedVersion: 0, documentType: "certificate_of_enrollment" }], receivedOn: receipt.receivedOn, physicalReference: null, storageLocation: null, remarks: null }).items[0].documentType).toBe("certificate_of_enrollment");
    const replacement = { action: "resubmit", expectedVersion: 3, effectiveOn: receipt.receivedOn, reason: receipt.reason, reference: "TEST", remarks: null, physicalReference: null, storageLocation: "Cabinet", documentType: receipt.documentType };
    expect(parseRequirementWorkflow("resubmit", replacement).action).toBe("resubmit");
    expect(() => parseReceipt({ ...receipt, documentType: "requirements_complete" })).toThrow();
    expect(() => parseRequirementWorkflow("resubmit", { ...replacement, documentType: "other" })).toThrow();
  });
});
