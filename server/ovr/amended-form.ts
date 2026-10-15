import { AuthError } from "../auth/service.js";
import type { OvrFinalization } from "./model.js";
import type { PayrollForm } from "./payroll-form.js";

export function assertPayrollRoster(form: PayrollForm, snapshot: OvrFinalization) {
  const identities = new Set(snapshot.entries.map(e => e.scholarshipId));
  if (identities.size !== snapshot.entries.length || form.rows.length !== identities.size ||
      new Set(form.rows.map(r => r.scholarshipId)).size !== identities.size ||
      new Set(form.rows.map(r => r.scholarId)).size !== identities.size ||
      form.rows.some(r => !identities.has(r.scholarshipId) || r.amountCentavos !== 500000))
    throw new AuthError(409, "PAYROLL_FORM_ROSTER_MISMATCH", "The effective payroll form and approved roster disagree. Reconcile the amendment before exporting.");
}

/** Copy frozen row evidence and historical signatories; never refresh from today's registry. */
export function amendFrozenForm(snapshot: OvrFinalization) {
  const amended = structuredClone(snapshot);
  for (const key of ["payrollForm", "legacyPayrollForm"] as const) {
    const form = amended[key];
    if (!form) continue;
    form.rows = form.rows.filter(r => amended.entries.some(e => e.scholarshipId === r.scholarshipId));
    assertPayrollRoster(form, amended);
  }
  return amended;
}
