/** Labels and destinations for the existing R06 pending permission, not new authority. */
export function pendingAction(permission: unknown, state: unknown): string | null {
 const labels: Record<string,string>={
  'masterlists.lock':'Lock published official list', 'masterlists.publish':'Publish approved list',
  'masterlists.approve':'Review masterlist approval', 'masterlists.prepare':'Complete masterlist review',
  'ovr.close':'Reconcile outcomes and close payroll', 'ovr.finalize':'Review and finalize payroll',
  'ovr.submit':'Submit finalized payroll', 'ovr.process':state==='processed'?'Record remaining payment outcomes':'Mark submitted payroll processed',
  'academic.changes.approve':'Review academic change', 'academic.edit':'Review changed academic source',
  'scholarship.status.approve':'Review scholar decision', 'scholarship.status.request':'Review changed standing source',
  'requirements.receive':'Correct and resubmit document', 'requirements.verify':'Verify received document',
  'continuing.approve':'Review Continuing roster', 'masterlists.amendments.approve':'Review masterlist amendment',
  'eligibility.overrides.approve':'Review eligibility exception', 'ovr.amendments.approve':'Review payroll amendment',
  'payments.corrections.approve':'Review payment correction',
 };
 return labels[String(permission)]??null;
}
