import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { parseReceipt } from "../server/requirements/receipt-validation.js";
const body = {
  expectedVersion: 0,
  receivedOn: "2026-01-01",
  storageLocation: "Cabinet A / Folder 1",
  physicalReference: null,
  remarks: null,
  reason: "Record physical document custody",
};
describe("physical receipt contracts", () => {
  it("accepts storage and optional reference/remarks", () => {
    expect(parseReceipt(body)).toEqual(body);
    expect(
      parseReceipt({
        ...body,
        remarks: "Original document\nReceived at front desk",
        physicalReference: "REGISTER-01",
      }).physicalReference,
    ).toBe("REGISTER-01");
  });
  it("rejects future/invalid dates, missing custody and forged receiver or status", () => {
    for (const change of [
      { receivedOn: "9999-01-01" },
      { receivedOn: "2026-02-30" },
      { storageLocation: " " },
      { expectedVersion: -1 },
      { actorId: randomUUID() },
      { receivedBy: "Another person" },
      { status: "verified" },
      { uploadUrl: "file.pdf" },
      { reason: "x" },
    ])
      expect(() => parseReceipt({ ...body, ...change })).toThrow();
  });
});
