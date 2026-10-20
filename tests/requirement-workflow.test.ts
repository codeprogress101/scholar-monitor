import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  parseRequirementWorkflow,
  requirementTransition,
} from "../server/requirements/workflow-validation.js";
import {
  satisfiesNormalRequirement,
  type RequirementStatus,
  type RequirementAction,
} from "../server/requirements/workflow-model.js";
const base = {
  expectedVersion: 1,
  effectiveOn: "2026-01-01",
  reason: "Physical record reviewed",
  reference: "DECISION-001",
  remarks: null,
};
describe("requirement verification workflow", () => {
  it("records deferred course comparison explicitly and rejects contradictory checks",()=>{
    const document={scholarId:randomUUID(),scholarVersion:1,academicYearId:randomUUID(),semesterId:randomUUID(),schoolId:randomUUID(),courseId:null,academicVersion:0,definitionVersionId:randomUUID(),coursePendingId:randomUUID(),coursePendingRevision:1};
    const input={...base,action:"verify",document,attestation:"course-comparison-deferred"};
    const result=parseRequirementWorkflow("verify",input);
    expect(result.action==='verify'&&result.checks.placement).toBe(false);
    expect(()=>parseRequirementWorkflow("verify",{...input,checks:{identity:true,period:true,placement:true,applicability:true,validity:true}})).toThrow();
    expect(()=>parseRequirementWorkflow("verify",{...input,document:{...document,coursePendingId:undefined}})).toThrow();
  });
  it("permits only the intended transition edges", () => {
    const edges: [RequirementStatus, RequirementAction, RequirementStatus][] = [
      ["submitted", "send-for-verification", "for_verification"],
      ["resubmitted", "send-for-verification", "for_verification"],
      ["for_verification", "verify", "verified"],
      ["verified", "verify", "verified"], // Service requires changed evidence and links the prior verification.
      ["submitted", "verify", "verified"],
      ["resubmitted", "verify", "verified"],
      ["submitted", "return-for-correction", "for_correction"],
      ["resubmitted", "return-for-correction", "for_correction"],
      ["submitted", "reject", "rejected"],
      ["resubmitted", "reject", "rejected"],
      ["verified", "return-for-correction", "for_correction"],
      ["for_verification", "return-for-correction", "for_correction"],
      ["for_correction", "resubmit", "resubmitted"],
      ["for_verification", "reject", "rejected"],
    ];
    const statuses: RequirementStatus[] = [
      "not_submitted",
      "submitted",
      "for_verification",
      "verified",
      "for_correction",
      "resubmitted",
      "rejected",
    ];
    const actions: RequirementAction[] = [
      "send-for-verification",
      "verify",
      "return-for-correction",
      "resubmit",
      "reject",
    ];
    for (const status of statuses)
      for (const action of actions) {
        const edge = edges.find((e) => e[0] === status && e[1] === action);
        if (edge) expect(requirementTransition(status, action)).toBe(edge[2]);
        else expect(() => requirementTransition(status, action)).toThrow();
      }
  });
  it("Verified satisfies the normal rule; pending and rejected states do not", () => {
    for (const status of [
      "not_submitted",
      "submitted",
      "for_verification",
      "for_correction",
      "resubmitted",
      "rejected",
    ] as const)
      expect(satisfiesNormalRequirement(status)).toBe(false);
    expect(satisfiesNormalRequirement("verified")).toBe(true);
  });
  it("requires concrete document context and five affirmative checks", () => {
    const input = {
      ...base,
      action: "verify",
      document: {
        scholarId: randomUUID(),
        scholarVersion: 1,
        academicYearId: randomUUID(),
        semesterId: randomUUID(),
        schoolId: randomUUID(),
        courseId: randomUUID(),
        academicVersion: 0,
        definitionVersionId: randomUUID(),
      },
      checks: {
        identity: true,
        period: true,
        placement: true,
        applicability: true,
        validity: true,
      },
    };
    expect(parseRequirementWorkflow("verify", input).action).toBe("verify");
    const { checks, ...withoutChecks } = input;
    const attested = parseRequirementWorkflow("verify", {...withoutChecks,attestation:"all-five-checked"});
    expect(attested.action === "verify" && attested.attestation).toBe("all-five-checked");
    expect(() => parseRequirementWorkflow("verify", withoutChecks)).toThrow();
    expect(() => parseRequirementWorkflow("verify", {...input,attestation:false})).toThrow();
    expect(() => parseRequirementWorkflow("verify", {...input,attestation:"all-five-checked",checks:{...checks,validity:false}})).toThrow();

    expect(() =>
      parseRequirementWorkflow("verify", {
        ...input,
        checks: { ...input.checks, validity: false },
      }),
    ).toThrow();
    expect(() =>
      parseRequirementWorkflow("verify", { ...input, actorId: randomUUID() }),
    ).toThrow();
  });
  it("keeps correction linkage and resubmission custody explicit", () => {
    expect(
      parseRequirementWorkflow("return-for-correction", {
        ...base,
        action: "return-for-correction",
        correctionOf: randomUUID(),
      }).action,
    ).toBe("return-for-correction");
    expect(() =>
      parseRequirementWorkflow("resubmit", { ...base, action: "resubmit" }),
    ).toThrow();
    expect(
      parseRequirementWorkflow("resubmit", {
        ...base,
        action: "resubmit",
        storageLocation: "Cabinet A",
        physicalReference: null,
      }).action,
    ).toBe("resubmit");
  });
});
