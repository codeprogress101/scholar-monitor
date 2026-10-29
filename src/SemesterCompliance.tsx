import {ActionButton} from "./ActionProgress";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { emptyFindings, type AcademicFindings } from "../server/continuing/compliance-engine";
import type { SemesterComplianceView } from "../server/continuing/semester-compliance";
import { configurationRequest as request } from "./configuration-api";
import { ApiError, type Session } from "./auth-api";
import ErrorNotice from "./ErrorNotice";
import SemesterFindingCorrection from "./SemesterFindingCorrection";
import SemesterEligibilityPreview from "./SemesterEligibilityPreview";
import SemesterGradingRule from "./SemesterGradingRule";
import SemesterGradingRecovery from "./SemesterGradingRecovery";
import SemesterGradingReplacement from "./SemesterGradingReplacement";

const labels = { pending: "Pending review", review_required: "Review required", compliant: "Compliant", noncompliant: "Noncompliant" };
const findingLabel = (value: boolean | null) => value === null ? "Not checked" : value ? "Yes" : "No";
export default function SemesterCompliance({ scholarId, semesterId, session, canReview, canConfigure, canCorrect, onDocuments }: {
  scholarId: string; semesterId: string; session: Session; canReview: boolean; canConfigure: boolean; canCorrect: boolean; onDocuments: () => void;
}) {
  const [data, setData] = useState<SemesterComplianceView | null>(null), [findings, setFindings] = useState<AcademicFindings>({ ...emptyFindings });
  const [error, setError] = useState<string | ApiError>(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
  const [reviewed, setReviewed] = useState(false), [reason, setReason] = useState(""), [subjectDetails, setSubjectDetails] = useState(false);
  const saving = useRef(false), pending = useRef<{ signature: string; key: string } | null>(null);
  const path = `scholars/${scholarId}/semester-requirements/${semesterId}/compliance`;
  useEffect(() => {
    const c = new AbortController();
    request<SemesterComplianceView>(path, { signal: c.signal }).then((v) => {
      if (c.signal.aborted) return;
      setData(v); setError(""); setReviewed(false); setReason("");
      const prior = v.history[0], next = { ...emptyFindings };
      // Retain only findings supported by the exact same document version.
      if (prior) for (const key of Object.keys(next) as (keyof AcademicFindings)[]) {
        const kind = key === "enrolled" || key === "fullLoad" ? "cor" : "cog";
        const doc = v.documents.find((d) => d.kind === kind), old = prior.documents.find((d) => d.kind === kind);
        if (doc?.id === old?.id && doc?.version === old?.version) Object.assign(next, { [key]: prior.findings[key] });
      }
      setFindings(next); setSubjectDetails([next.hasFailed, next.hasDropped, next.hasIncomplete].some((f) => f === true));
    }).catch((e: unknown) => { if (!c.signal.aborted) { setData(null); setError(e instanceof ApiError ? e : "Could not load academic compliance."); } });
    return () => c.abort();
  }, [path, reload]);
  async function save(body: object, suffix = "") {
    if (saving.current || !data) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    const payload = { ...body, sourceHash: data.sourceHash }, signature = JSON.stringify({ suffix, payload });
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    try {
      await request(path + suffix, { body: payload, csrf: session.csrfToken, key: pending.current.key });
      pending.current = null; setNotice(suffix === "/correct-recording" ? "Recording correction saved. Original findings remain in history." : suffix === "/ended-review" ? "Academic-only review saved. This does not authorize late payment." : suffix ? "School grading rule saved for reuse." : "Academic review saved. Earlier reviews remain in history."); setReload((n) => n + 1);
    } catch (e) { setError(e instanceof ApiError ? e : "Could not confirm the result. Retry safely or reload."); }
    finally { saving.current = false; setBusy(false); }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save({ expectedRevision: data!.revision, findings, reviewed, reason: reason.trim() || null, ...(data!.ended && !data!.allocated ? { academicOnly: true } : {}) }, data!.allocated ? "/allocated-review" : data!.ended ? "/ended-review" : "");
  }
  function choice(key: Exclude<keyof AcademicFindings, "average">, label: string) {
    return <label className="col-md-6" key={key}>{label}<select className="form-select" value={findings[key] === null ? "" : String(findings[key])} onChange={(e) => setFindings({ ...findings, [key]: e.target.value === "" ? null : e.target.value === "true" })}>
      <option value="">Not checked</option><option value="true">Yes</option><option value="false">No</option>
    </select></label>;
  }
  const initialAdmission = data?.documents.find(d=>d.notRequired)?.context?.entrantCard?.admissionAssessmentReference;
  return <section className="border rounded p-3 my-3" aria-label="Semester academic compliance">
    <div className="d-flex justify-content-between gap-2"><h5>3. Academic compliance{data ? `: ${labels[data.result]}` : ""}</h5><button className="btn btn-outline-secondary" disabled={busy} onClick={() => { setData(null); setReload((n) => n + 1); }}>Refresh</button></div>
    <ErrorNotice error={error} />{notice && <p role="status">{notice}</p>}
    {data && <>
      {data.priorApproval&&<p role="status" className={data.priorApproval.valid?"alert alert-success":"alert alert-warning"}><strong>{data.priorApproval.valid?"Approved - prior batch assessment":"Prior batch assessment needs review"}</strong>. {data.priorApproval.reference}. Source: {data.priorApproval.sourceLocation}. {data.priorApproval.issue} Individual grades and findings remain as originally recorded.</p>}
      {data.history[0] && <div className="border rounded p-2 mb-2" aria-label="Recorded academic standing">
        <strong>Latest recorded findings</strong>
        <dl className="row mb-0 mt-2">
          <dt className="col-sm-4">Enrollment</dt><dd className="col-sm-8">{data.history[0].findings.enrolled === null ? "Not checked" : data.history[0].findings.enrolled ? "Enrolled" : "Not enrolled / stopped"}</dd>
          <dt className="col-sm-4">Failed subjects</dt><dd className="col-sm-8">{data.unresolvedFindings.some((f) => f.field === "hasFailed") || data.history[0].findings.hasFailed ? "Restricted â€” formal review required" : findingLabel(data.history[0].findings.hasFailed)}</dd>
          <dt className="col-sm-4">Dropped subjects</dt><dd className="col-sm-8">{data.unresolvedFindings.some((f) => f.field === "hasDropped") || data.history[0].findings.hasDropped ? "Restricted â€” formal review required" : findingLabel(data.history[0].findings.hasDropped)}</dd>
          <dt className="col-sm-4">INC</dt><dd className="col-sm-8">{data.history[0].findings.hasIncomplete ? "Restricted â€” updated verified COG required" : data.history[0].findings.hasIncomplete === false ? "None recorded" : "Not checked"}</dd>
        </dl>
        {data.stale && <p className="mb-0">Evidence changed. Review these findings before using them for payroll.</p>}
      </div>}
      {data.allocated && <p>Payroll membership is frozen. A Coordinator can record later findings; blocking findings hold unpaid release and do not cancel the allocation or reverse a payment. {data.allocationReviewBlocker}</p>}
      <SemesterEligibilityPreview key={`${path}:${data.sourceHash}:${data.revision}`} path={path} />
      <button type="button" className="btn btn-outline-secondary mb-2" disabled={busy} onClick={onDocuments}>{data.history[0]?.findings.hasIncomplete ? "Receive / verify updated COG" : "Review COR/COG documents"}</button>
      {data.unresolvedFindings.length > 0 && <p>Failed or dropped findings require a formal authorized review. Any exception remains subject to approved policy.</p>}
      {data.history[0]?.findings.hasIncomplete && <p>To resolve an INC, return the COG for correction, receive the corrected document and verify it before updating these findings.</p>}
      {data.blockers.length > 0 && <ul>{data.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
      {!data.allocated && (data.ended && canCorrect ? data.endedReviewBlocker : data.writeBlocker) && <p className="alert alert-info">{data.ended && canCorrect ? data.endedReviewBlocker : data.writeBlocker}</p>}
      {data.ended && <p>This semester has ended. A Coordinator can review verified academic evidence while the semester is unlocked. This records academic compliance only; late payment requires a separate authorized policy and process.</p>}
      {data.gradingRule && <p>School rule: {data.gradingRule.rule.label}. {data.gradingRule.rule.direction === "lower" ? "At most" : "At least"} {data.gradingRule.rule.threshold}; no rounding. Source: {data.gradingRule.reference}.</p>}
      {!data.gradingRule && !data.gradingHistory.length && canConfigure && data.gradingSchool && !data.writeBlocker && <SemesterGradingRule school={data.gradingSchool.name} busy={busy} onSave={(body) => save(body, "/grading-rule")} />}
      {data.gradingRule && canConfigure && data.gradingSchool && !data.ended && <SemesterGradingReplacement key={data.gradingRule.id} path={path} school={data.gradingSchool.name} session={session} onBusy={setBusy} onSaved={() => { setNotice("Grading rule replaced. Review the current evidence before using a new assessment."); setReload((n) => n + 1); }} />}
      {!data.gradingRule && data.gradingHistory.length > 0 && canConfigure && data.gradingSchool && <SemesterGradingRecovery path={path} school={data.gradingSchool.name} session={session} onBusy={setBusy} onSaved={() => { setNotice("Grading policy recovered. Review current evidence before using a new assessment."); setReload((n) => n + 1); }} />}
      {data.gradingHistory.length > 0 && <details className="my-2"><summary>Grading rule history ({data.gradingHistory.length})</summary>{data.gradingHistory.map((p) => <article key={p.id} className="border-top py-2"><p>Version {p.revision}: {p.rule.label}. {p.recoveryOf.length > 0 && `Recovery of ${p.recoveryOf.length} prior policy version(s).`} {p.rule.direction === "lower" ? "At most" : "At least"} {p.rule.threshold}; range {p.rule.minimum} to {p.rule.maximum}, {p.rule.precision} decimal places.</p><p>Source: {p.sourceReference}. Authority: {p.issuer}, {p.authorityReference}. {p.reason && `Replacement reason: ${p.reason}.`}</p></article>)}</details>}
      {canCorrect && data.unresolvedFindings.length > 0 && <SemesterFindingCorrection key={`${data.sourceHash}:${data.revision}`} data={data} busy={busy} onSave={(body) => save(body, "/correct-recording")} />}
      {(data.allocated || data.ended ? canCorrect : canReview) && <details><summary>{data.allocated ? "Coordinator: review findings after payroll approval" : data.ended ? "Review ended semester (academic only)" : "Review academic findings"}</summary>
        <p>{initialAdmission?`Academic basis: approved initial admission assessment (${initialAdmission}). Check current enrollment and required load.`:"COR supplies enrollment and full load. COG supplies average and subject findings. Unknown answers remain pending."}</p>
        <form onSubmit={submit} aria-label="Academic compliance review"><fieldset disabled={busy || Boolean(data.allocated ? data.allocationReviewBlocker : data.ended ? data.endedReviewBlocker : data.writeBlocker)}>
          <div className="row g-3 my-2">
            {choice("enrolled", "Enrolled for this semester?")}{choice("fullLoad", "Full load required by the course?")}
            {!initialAdmission && <><label className="col-md-6">Average on COG<input className="form-control" inputMode="decimal" maxLength={11} value={findings.average ?? ""} onChange={(e) => setFindings({ ...findings, average: e.target.value.trim() || null })} /></label>
            <label className="col-md-6">Subject findings<select className="form-select" value={subjectDetails ? "details" : [findings.hasFailed, findings.hasDropped, findings.hasIncomplete].every((v) => v === false) ? "clear" : ""} onChange={(e) => {
              setSubjectDetails(e.target.value === "details");
              if (e.target.value !== "details") setFindings({ ...findings, hasFailed: e.target.value === "clear" ? false : null, hasDropped: e.target.value === "clear" ? false : null, hasIncomplete: e.target.value === "clear" ? false : null });
            }}><option value="">Not checked</option><option value="clear">Checked: no failed, dropped or INC subjects</option><option value="details">Record individual findings</option></select></label>
            {subjectDetails && <>{choice("hasFailed", "Any failed subject?")}{choice("hasDropped", "Any dropped subject?")}{choice("hasIncomplete", "Any unresolved INC?")}</>}</>}
          </div>
          {data.allocated || data.ended ? <label className="form-label d-block">Reason for this controlled review<input className="form-control" required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label> : canCorrect && data.history.length > 0 && <details className="my-2"><summary>Correct a recorded finding</summary><label className="form-label d-block">Correction reason (only when changing findings against the same document)<input className="form-control" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label><p>INC resolution requires corrected, verified COG evidence. Failed or dropped findings remain for formal authorized review.</p></details>}
          <label className="d-block my-2"><input type="checkbox" required checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> {data.ended ? "I reviewed the verified documents. This academic-only review does not authorize late payment." : "I reviewed these findings against the documents shown for this semester."}</label>
          <ActionButton pending={busy} className="btn configuration-primary">{busy ? "Saving..." : data.ended ? "Save academic-only review" : "Save academic review"}</ActionButton>
        </fieldset></form>
      </details>}
      <details className="mt-3"><summary>Academic review history ({data.history.length})</summary>{data.history.map((r) => <article className="border-top py-2" key={r.id}>
        {r.correction && <p><strong>Recording error corrected.</strong> {r.correction.targets.map((t) => `${t.field === "hasFailed" ? "Failed" : "Dropped"} finding in review ${data.history.find((prior) => prior.id === t.reviewId)?.revision ?? t.reviewId}`).join("; ")}. Original reviews are retained below.</p>}
        {r.academicOnly && <p><strong>Ended semester: academic-only review. No late-payment authorization.</strong></p>}
        <p>Review {r.revision}: {labels[r.result]} â€” {r.actorName}, {r.recordedAt}. {r.reason}</p>
        <p>Average: {r.findings.average ?? "Not recorded"}. Enrollment: {findingLabel(r.findings.enrolled)}. Full load: {findingLabel(r.findings.fullLoad)}. Failed: {findingLabel(r.findings.hasFailed)}. Dropped: {findingLabel(r.findings.hasDropped)}. INC: {findingLabel(r.findings.hasIncomplete)}.</p>
        {r.documents.map((d) => <p key={d.id}>{d.kind?.toUpperCase() ?? "Document"}: {d.context?.yearCode} / {d.context?.semesterCode}, version {d.version}, {d.status}.</p>)}
        {r.blockers.length > 0 && <ul>{r.blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
      </article>)}</details>
    </>}
  </section>;
}
