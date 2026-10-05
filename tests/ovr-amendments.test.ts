import { describe, it, expect } from "vitest";
import { parseAmendment } from "../server/ovr/amendment-service.js";
import { requireAmendable } from "../server/ovr/amendment-state.js";
describe("OVR amendments", () => {
  const evidence = {
      expectedRevision: 2,
      reason: "Correct the roster",
      reference: "AMEND-024",
    },
    id = "11111111-1111-4111-8111-111111111111";
  it("allows only finalized/submitted pre-processing corrections", () => {
    expect(() => requireAmendable("finalized")).not.toThrow();
    expect(() => requireAmendable("submitted")).not.toThrow();
    for (const state of ["draft", "review", "processed"])
      expect(() => requireAmendable(state)).toThrow(
        expect.objectContaining({ code: "RECORD_LOCKED" }),
      );
    expect(() => requireAmendable("closed")).toThrow(
      expect.objectContaining({ code: "OVR_ALREADY_CLOSED" }),
    );
  });
  it("requires one explicit membership or name correction", () => {
    expect(
      parseAmendment("request", {
        ...evidence,
        change: "add",
        scholarshipId: id,
      }),
    ).toMatchObject({ change: "add" });
    expect(
      parseAmendment("request", {
        ...evidence,
        change: "remove",
        scholarshipId: id,
      }),
    ).toMatchObject({ change: "remove" });
    expect(
      parseAmendment("request", {
        ...evidence,
        change: "rename",
        name: "Corrected title",
      }),
    ).toMatchObject({ change: "rename" });
    expect(() =>
      parseAmendment("request", {
        ...evidence,
        change: "rename",
        name: "Corrected title",
        scholarshipId: id,
      }),
    ).toThrow();
  });
  it("rejects forged approval data and missing audit evidence", () => {
    expect(() =>
      parseAmendment("approve", {
        ...evidence,
        amendmentId: id,
        approvedBy: id,
      }),
    ).toThrow();
    expect(() =>
      parseAmendment("request", {
        ...evidence,
        change: "remove",
        scholarshipId: id,
        reason: "",
      }),
    ).toThrow();
    expect(() =>
      parseAmendment("reject", {
        ...evidence,
        amendmentId: id,
        expectedRevision: 0,
      }),
    ).toThrow();
  });
});
