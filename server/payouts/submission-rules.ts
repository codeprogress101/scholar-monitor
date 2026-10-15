import { z } from "zod";
import { AuthError } from "../auth/service.js";
import { validationDetails } from "../validation-details.js";

// Date precision only. Manila has a fixed +08:00 offset for supported contemporary periods.
const date = z.iso.date().refine((v) => v >= "2000-01-01" && v <= "9998-12-31");
const version = z.number().int().positive();
const reason = z.string().trim().min(5).max(500).regex(/^\P{Cc}*$/u);
const common = { expectedCycleVersion: version };
const schemas = {
  configure: z.object({ ...common, termNumber: z.union([z.literal(1), z.literal(2)]), expectedSemesterVersion: version, expectedYearVersion: version, deadlineOn: date }).strict(),
  "extend-semester": z.object({ ...common, expectedRevision: version, deadlineOn: date, reason }).strict(),
  "open-window": z.object({ ...common, expectedDeadlineRevision: version, expectedSequence: z.number().int().min(0), opensOn: date, cutoffOn: date }).strict(),
  "extend-window": z.object({ ...common, batchId: z.uuid(), expectedDeadlineRevision: version, expectedRevision: version, cutoffOn: date, reason }).strict(),
};
export type WindowAction = keyof typeof schemas;
export function parseWindowAction<A extends WindowAction>(action: A, raw: unknown) {
  const r = schemas[action].safeParse(raw);
  if (!r.success) throw new AuthError(422, "VALIDATION_FAILED", "Provide the current versions and valid Manila dates. Extensions require a reason.", validationDetails(r.error));
  return r.data;
}
export function localDayStart(day: string) { return new Date(`${day}T00:00:00+08:00`).toISOString(); }
export function deadlineBoundary(day: string) { return new Date(Date.parse(localDayStart(day)) + 86400000).toISOString(); }
export function submissionState(opensOn: string, cutoffOn: string, now: string) {
  const t = Date.parse(now);
  return t < Date.parse(localDayStart(opensOn)) ? "scheduled" : t < Date.parse(deadlineBoundary(cutoffOn)) ? "open" : "cutoff_reached";
}
export function validateWindow(opens: string, cutoff: string, deadline: string, others: { opensOn: string; cutoffOn: string }[]) {
  if (opens > cutoff || cutoff > deadline) throw new AuthError(422, "WINDOW_OUTSIDE_DEADLINE", "The cutoff must be on or after opening and no later than the semester final deadline. Extend the semester deadline first if needed.");
  if (others.some((w) => opens <= w.cutoffOn && cutoff >= w.opensOn)) throw new AuthError(409, "WINDOW_OVERLAP", "Submission windows must be sequential and cannot overlap, including their cutoff day.");
}
