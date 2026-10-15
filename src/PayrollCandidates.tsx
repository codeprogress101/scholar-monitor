import { matchesCandidateFilter } from "./payroll-candidate-filter";
import { receivingScholarAddress } from "./scholar-issue-navigation";
import PayrollFormLinks from "./PayrollFormLinks";
import { PagedTable, StatusBadge } from "./WorkspaceUI";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import ErrorNotice from "./ErrorNotice";
import ScholarIssueAction from "./ScholarIssueAction";

export default function PayrollCandidates({ detail, session, canDefer, onSaved }: { detail: OvrDetail; session: Session; canDefer: boolean; onSaved: () => void }) {
  const [selected, setSelected] = useState(""), [error, setError] = useState<string | ApiError>(""), [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState(() => sessionStorage.getItem(`payroll-filter-${detail.batch.id}`) ?? "all");
  useEffect(()=>{sessionStorage.setItem(`payroll-filter-${detail.batch.id}`,filter);},[filter,detail.batch.id]);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const c = detail.managed;
  async function defer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!c || busy) return;
    const body = { expectedRevision: detail.batch.revision, expectedSourceHash: c.sourceHash, scholarshipId: selected, reason: String(new FormData(e.currentTarget).get("reason")), reference: "Coordinator batch deferral" };
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, key: crypto.randomUUID() };
    setBusy(true); setError("");
    try { await request(`ovr-batches/${detail.batch.id}/defer`, { body, key: pending.current.key, csrf: session.csrfToken }); pending.current = null; setSelected(""); onSaved(); }
    catch (e) { setError(e instanceof ApiError ? e : "Could not confirm deferral. Retry safely."); }
    finally { setBusy(false); }
  }
  const visible = c?.items.filter(i => matchesCandidateFilter(i,filter)) ?? [];
  return <section aria-label="Automatic payroll candidates" className="my-3">
    <div className="card-heading"><div><h4>{detail.finalization ? "Payroll form" : "Candidates"}</h4><p className="muted-line">Eligible scholars are included automatically. Printing does not record payment.</p></div>
      {(c?.form.rows.length || detail.finalization?.snapshot.payrollForm) ? <PayrollFormLinks batchId={detail.batch.id} draft={!detail.finalization} /> : null}
    </div>
    <ErrorNotice error={error} />
    {c && <>
      <div className="work-summary"><div><strong>{c.form.rows.length}</strong><span>Included in this draft</span></div><div><strong>{c.pendingCount}</strong><span>Awaiting review or deferral</span></div><div><strong>{c.cutoffOn}</strong><span>Submission cutoff (Philippine time)</span></div></div>
      {!c.cutoffReached && <p className="next-step">You can preview now. Submit for review after the cutoff; resolve or defer pending submissions first.</p>}
      <div className="filter-pills" aria-label="Candidate filters">{[["all", "All"], ["included", "Included"], ["deferred", "Deferred"], ["review", "Needs review"], ["other", "Other / blocked"]].map(([value,label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} ({c.items.filter(i=>matchesCandidateFilter(i,value)).length})</button>)}</div>
      <PagedTable storageKey={`payroll-candidates-${detail.batch.id}-${filter}`} key={filter} items={visible} label="Payroll candidates" columns={["Scholar", "Year", "Status", "Next action"]} searchText={i => `${i.evidence.current.sources.scholarship.name} ${i.evidence.current.sources.scholarship.humanId}`} row={i => <tr key={i.scholarshipId}>
        <td><strong>{i.evidence.current.sources.scholarship.name}</strong><small>{i.evidence.current.sources.scholarship.humanId}</small><details><summary>School & course</summary>{i.row ? <p>{i.row.school}<br />{i.row.course}</p> : <p>Academic details require review.</p>}</details></td>
        <td>{i.row ? `Year ${i.row.yearLevel}` : "Not recorded"}</td>
        <td><StatusBadge tone={i.eligible ? "success" : i.pending ? "warning" : "neutral"}>{i.issues.some(v=>v.code === "STIPEND_ALREADY_PAID") ? "Paid this semester" : i.issues.some(v=>v.code === "CLAIM_PERIOD_ENDED") ? "Claim period ended" : i.issues.some(v=>v.code === "PAYMENT_CORRECTION_PENDING") ? "Needs review" : i.deferred?.current ? "Deferred from this batch" : i.evidence.reprocessing ? "Reprocessing" : i.evidence.current.sources.semesterPayroll?.allocated ? "Already allocated" : i.eligible ? "Included in draft" : i.pending ? "Needs review" : "Other / blocked"}</StatusBadge>
          {(!i.eligible || i.deferred?.current) && <details><summary>View reason</summary>{i.deferred?.current && <p>{i.deferred.reason}</p>}{i.evidence.current.sources.semesterPayroll?.allocated && <p>Already allocated for this semester.</p>}<ul>{i.issues.map((issue,n) => <li key={n}>{issue.message}<ScholarIssueAction code={issue.code} scholarId={i.evidence.current.sources.scholarship.scholarId} yearId={detail.cycle.academicYearId} semesterId={detail.cycle.semesterId} payoutCycleId={detail.cycle.id} /></li>)}</ul></details>}
        </td>
        <td><a className="btn btn-sm btn-outline-secondary" onClick={()=>sessionStorage.setItem(`payroll-return-${detail.cycle.id}`,window.location.hash)} href={receivingScholarAddress(i.evidence.current.sources.scholarship.scholarId,detail.cycle.academicYearId,detail.cycle.semesterId,detail.cycle.id)}>Review scholar</a>
          {canDefer && detail.canEdit && (!i.evidence.current.sources.semesterPayroll?.allocated || i.evidence.reprocessing) && !i.deferred?.current && <details><summary>More actions</summary><button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setSelected(i.scholarshipId)}>Defer to later batch</button></details>}
        </td>
      </tr>} />
      {selected && <form onSubmit={defer} className="border rounded p-3 mt-3"><h5>Defer {c.items.find(i => i.scholarshipId === selected)?.evidence.current.sources.scholarship.name}</h5><p>Documents stay available for a later batch, where eligibility is checked again.</p><label className="form-label d-block">Deferral reason<textarea name="reason" className="form-control" minLength={5} maxLength={500} required /></label><button className="btn btn-primary" disabled={busy}>Record deferral</button> <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setSelected("")}>Cancel</button></form>}
    </>}
  </section>;
}
