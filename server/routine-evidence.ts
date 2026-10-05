// Only ordinary commands may omit operator prose. Exceptional decisions and
// physical authority/payment references remain subject to their strict schemas.
export function routineEvidence(path: string, body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  let reason: string | undefined;
  let reference = false;
  const matches = (pattern: RegExp) => pattern.test(path);
  if (matches(/^\/api\/v1\/scholars(?:\/[^/]+)?$/) && !path.endsWith("/duplicate-check")) reason = "Scholar information recorded";
  else if (matches(/^\/api\/v1\/scholars\/[^/]+\/academic-records$/)) { reason = "Annual academic information recorded"; reference = true; }
  else if (matches(/^\/api\/v1\/scholars\/[^/]+\/scholarships$/)) { reason = "Annual scholarship application recorded"; reference = true; }
  else if (matches(/^\/api\/v1\/scholarships\/[^/]+\/qualification\/(exam-passed|qualify|select|not-select)$/)) {
    if (!path.endsWith("/not-select")) reason = "Qualification decision recorded";
    reference = true;
  } else if (matches(/^\/api\/v1\/configuration\/[^/]+(?:\/[^/]+)?$/)) {
    if (["create", "update"].includes(String(input.action))) reason = "Reference configuration recorded";
  } else if (matches(/^\/api\/v1\/requirement-definitions(?:\/[^/]+)?$/)) {
    if (["create", "revise"].includes(String(input.action))) reason = "Requirement policy recorded";
    reference = true;
  } else if (matches(/^\/api\/v1\/masterlists(?:\/[^/]+\/(entries|submit-verification|submit-approval|approve|publish|lock|return-draft))?$/)) {
    if (!path.endsWith("/return-draft")) reason = "Masterlist workflow action recorded";
    reference = true;
  } else if (matches(/^\/api\/v1\/requirement-instances\/[^/]+\/(send-for-verification|verify|resubmit|return-for-correction|reject)$/)) {
    if (!matches(/\/(return-for-correction|reject)$/)) reason = "Requirement workflow decision recorded";
    reference = true;
  } else if (matches(/^\/api\/v1\/scholarships\/[^/]+\/requirements\/generate$/)) { reason = "Requirement checklist generated"; reference = true; }
  else if (matches(/^\/api\/v1\/payout-cycles(?:\/[^/]+\/(configure|open|lock|close))?$/)) { reason = "Payout cycle action recorded"; reference = true; }
  else if (matches(/^\/api\/v1\/payout-cycles\/[^/]+\/scholarships\/[^/]+\/eligibility\/calculate$/)) { reason = "Eligibility calculated from current records"; reference = true; }
  else if (matches(/^\/api\/v1\/payout-cycles\/[^/]+\/ovr-batches$/) || matches(/^\/api\/v1\/ovr-batches\/[^/]+\/(entries\/(add|remove)|validate|submit-review|finalize|return-to-draft|close)$/)) {
    if (!path.endsWith("/return-to-draft")) reason = "OVR workflow action recorded";
    reference = true;
  } else if (matches(/^\/api\/v1\/ovr-batches\/[^/]+\/(submit|mark-processed|payments)$/)) {
    reason = "Payout processing action recorded";
    // Actual administrative/disbursement evidence remains required here.
  }
  const output = { ...input };
  const blank = (value: unknown) => value === undefined || (typeof value === "string" && !value.trim());
  if (reason && blank(output.reason)) output.reason = reason;
  if (reference && blank(output.reference)) output.reference = "Internal workflow record";
  return output;
}
