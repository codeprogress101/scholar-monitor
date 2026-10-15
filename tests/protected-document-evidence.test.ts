import { describe, expect, it } from "vitest";
import { evidenceDocumentIds } from "../server/requirements/protected-document-evidence.js";

describe("protected payroll document references", () => {
  it("protects instance references, not names or policy identifiers", () => {
    expect(evidenceDocumentIds({ current: { sources: { requirements: [
      { instanceId: "recorded-document", definitionVersionId: "policy", code: "COR" },
      { instanceId: null },
    ] } } })).toEqual(["recorded-document"]);
  });
  it("supports stored JSON and distinct unrelated references", () => {
    expect(evidenceDocumentIds(JSON.stringify({ current: { sources: { requirements: [{ instanceId: "other-document" }] } } }))).toEqual(["other-document"]);
  });
  it.each([null, "invalid JSON", {}, { current: { sources: {} } },
    { current: { sources: { requirements: [{}] } } },
    { current: { sources: { requirements: [{ instanceId: 1 }] } } }])("does not treat unknown historical evidence as empty", value => {
    expect(evidenceDocumentIds(value)).toBeNull();
  });
  it("accepts an explicit empty requirement set", () => {
    expect(evidenceDocumentIds({ current: { sources: { requirements: [] } } })).toEqual([]);
  });
  it("retains explicit document references in embedded review evidence", () => {
    expect(evidenceDocumentIds({ current: { sources: { requirements: [], review: { documents: [{ id: "review-document" }] } } } })).toEqual(["review-document"]);
  });
});
