import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { routineEvidence } from "../server/routine-evidence";
import RoutineEvidence from "../src/RoutineEvidence";

it("defaults routine evidence without changing supplied evidence or invalid values", () => {
  const path = "/api/v1/masterlists/list/entries";
  expect(routineEvidence(path, { action: "add", reason: "  " })).toMatchObject({ reason: "Masterlist workflow action recorded", reference: "Internal workflow record" });
  expect(routineEvidence(path, { reason: null, reference: 12 })).toEqual({ reason: null, reference: 12 });
  expect(routineEvidence(path, { reason: "Reviewed roster", reference: "Actual reference" })).toEqual({ reason: "Reviewed roster", reference: "Actual reference" });
});

it("never supplies removal or exceptional decision reasons or external authority evidence", () => {
  for (const [path, body] of [
    ["/api/v1/masterlists/list/entries", { action: "remove" }],
    ["/api/v1/masterlists/list/return-draft", {}],
    ["/api/v1/ovr-batches/batch/entries/remove", {}],
    ["/api/v1/ovr-batches/batch/return-to-draft", {}],
    ["/api/v1/requirement-instances/doc/reject", {}],
    ["/api/v1/requirement-instances/doc/return-for-correction", {}],
    ["/api/v1/scholarships/s/qualification/not-select", {}],
  ] as const) expect(routineEvidence(path, body)).not.toHaveProperty("reason");
  expect(routineEvidence("/api/v1/ovr-batches/b/payments", {})).toMatchObject({ reference: "Internal workflow record" });
  expect(routineEvidence("/api/v1/requirement-instances/d/waive", {})).toEqual({});
});

it("keeps routine fields optional and requires only the exception reason", () => {
  const fields = <><input name="reason" /><input name="reference" /></>;
  const routine = renderToStaticMarkup(<RoutineEvidence>{fields}</RoutineEvidence>);
  expect(routine).toContain("Additional details (optional)");
  expect(routine).not.toContain('required=""');
  const exception = renderToStaticMarkup(<RoutineEvidence routine={false}>{fields}</RoutineEvidence>);
  expect(exception.match(/<input[^>]*name="reason"[^>]*>/)?.[0]).toContain('required=""');
  expect(exception.match(/<input[^>]*name="reference"[^>]*>/)?.[0]).not.toContain('required=""');
});
