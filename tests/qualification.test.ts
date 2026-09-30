import { describe, expect, it } from "vitest";
import {
  parseQualification,
  transition,
} from "../server/qualification/validation.js";
import { qualificationPermission } from "../server/qualification/service.js";
import {
  QUALIFICATION_ACTIONS,
  type QualificationStatus,
} from "../server/qualification/model.js";
describe("Annual qualification commands", () => {
  const states: QualificationStatus[] = [
    "applicant",
    "exam_passed",
    "qualified",
    "selected",
    "not_selected",
  ];
  const edges: Record<string, string> = {
    "applicant:exam-passed": "exam_passed",
    "exam_passed:qualify": "qualified",
    "qualified:select": "selected",
    "applicant:not-select": "not_selected",
    "exam_passed:not-select": "not_selected",
    "qualified:not-select": "not_selected",
  };
  for (const state of states)
    it(`enforces every outgoing command from ${state}`, () => {
      for (const action of QUALIFICATION_ACTIONS) {
        const next = edges[state + ":" + action];
        if (next) expect(transition(state, action)).toBe(next);
        else
          expect(() => transition(state, action)).toThrow(
            expect.objectContaining({
              status: 409,
              code:
                state === "selected" && action === "activate"
                  ? "MASTERLIST_ACTIVATION_REQUIRED"
                  : "INVALID_STATE_TRANSITION",
            }),
          );
      }
    });
  it("assigns preparation and approval commands to distinct permissions", () => {
    expect(qualificationPermission("create")).toBe(
      "scholarship.status.request",
    );
    expect(qualificationPermission("exam-passed")).toBe(
      "scholarship.status.request",
    );
    for (const action of [
      "qualify",
      "select",
      "not-select",
      "activate",
    ] as const)
      expect(qualificationPermission(action)).toBe(
        "scholarship.status.approve",
      );
  });
  const command = {
    expectedVersion: 1,
    effectiveOn: "2026-01-01",
    reason: "Verified official decision",
    reference: "Physical register 1",
  };
  it("rejects forged state, approval identity, academic year mutation and future dates", () => {
    for (const extra of [
      { status: "active" },
      { actorId: "forged" },
      { approvedBy: "forged" },
      { academicYearId: "00000000-0000-4000-8000-000000000001" },
      { effectiveOn: "9999-01-01" },
      { effectiveOn: "2026-02-30" },
    ])
      expect(() =>
        parseQualification({ ...command, ...extra }, false),
      ).toThrow();
  });
  it("requires creation year, reason, reference and the correct expected version", () => {
    expect(() =>
      parseQualification({ ...command, expectedVersion: 0 }, true),
    ).toThrow();
    for (const extra of [
      { reason: " " },
      { reference: " " },
      { expectedVersion: 0 },
    ])
      expect(() =>
        parseQualification({ ...command, ...extra }, false),
      ).toThrow();
    expect(parseQualification(command, false)).toEqual(command);
  });
});
