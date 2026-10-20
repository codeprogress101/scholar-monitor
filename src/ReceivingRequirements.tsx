import SharedSemesterDocuments from "./SharedSemesterDocuments";
import EntrantGradingCardReview from "./EntrantGradingCard";
import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import FocusedDialog from "./FocusedDialog";
import QuickDocumentReview from "./QuickDocumentReview";
import ErrorNotice from "./ErrorNotice";
import ReceiptTimingEvidence from "./ReceiptTimingEvidence";
import RequirementTimingPanel from "./RequirementTimingPanel";
import { documentLabels } from "./document-labels";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PayoutCycle } from "../server/payouts/model";
import type { Access } from "../server/authorization/policy";
import type {
  ReceivingPeriod,
  RequirementChecklist,
} from "../server/requirements/instances-model";
import { REQUIREMENT_STATUS_LABELS } from "../server/requirements/workflow-model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import { openReceivingPeriods, resolveReceivingContext, receivingToday, type ReceivingContext } from "./receiving-selection";
import RequirementWorkflow from "./RequirementWorkflow";
import RequirementWaiverForm from "./RequirementWaiverForm";
import SemesterAcademicDetails from "./SemesterAcademicDetails";
import SemesterCompliance from "./SemesterCompliance";

const message = (e: unknown) =>
  e instanceof ApiError
    ? e
    : "Could not confirm the result. Retry safely or refresh.";
export default function ReceivingRequirements({
  id,
  session,
  access,
  onAcademicSetup,
  initialPeriodId = "",
  receivingContext,
  onPeriodChange,
  continuing = false,
  onAcademicYear,
  readOnly = false,
  academicYearId,
  allowedSemesterId,
  setupCohort,
}: {
  id: string;
  session: Session;
  access: Access;
  onAcademicSetup?: (yearId?: string) => void;
  continuing?: boolean;
  onAcademicYear?: (yearId: string) => void;
  initialPeriodId?: string;
  receivingContext?: ReceivingContext;
  onPeriodChange?: (ownerId: string, period: ReceivingPeriod, explicit?: boolean) => void;
  readOnly?: boolean;
  academicYearId?: string;
  allowedSemesterId?: string;
  setupCohort?: string;
}) {
  const [periods, setPeriods] = useState<ReceivingPeriod[]>([]),
    [periodId, setPeriodId] = useState(initialPeriodId);
  const [blockedCycle, setBlockedCycle] = useState(false);
  const [changePeriod, setChangePeriod] = useState(false);
  const [checklist, setChecklist] = useState<RequirementChecklist | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [savedChecklists, setSavedChecklists] = useState<RequirementChecklist[]>([]);
  const [enrollmentDocuments, setEnrollmentDocuments] = useState<Record<string, "cor" | "certificate_of_enrollment">>({});
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0),
    [receivedOn, setDate] = useState(""),
    [reference, setReference] = useState(""),
    [storage, setStorage] = useState(""),
    [remarks, setRemarks] = useState("");
  const pending = useRef<{ path: string; body: object; key: string } | null>(null),
    busy = useRef(false);
  const focusAfterRefresh = useRef<string | null>(null);
  useEffect(()=>{if(!loading && focusAfterRefresh.current){const target=document.querySelector<HTMLButtonElement>(`[data-requirement-row="${focusAfterRefresh.current}"] button`);target?.focus();focusAfterRefresh.current=null;}},[loading,revision]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [academicReady, setAcademicReady] = useState(false);
  function openVerification() {
    document.getElementById("document-receiving-rows")?.scrollIntoView({block: "center"});
  }
  const can = (permission: string) =>
    access.permissions.some((p) => p.code === permission);
  const canGenerate = !readOnly && can("requirements.generate"),
    canReceive = !readOnly && can("requirements.receive");
  const endpoint = continuing ? `scholars/${id}/semester-requirements` : `scholarships/${id}/requirements`;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    async function load() {
      try {
        if (readOnly) {
          const data = await request<{ items: RequirementChecklist[] }>(endpoint, { signal: controller.signal });
          if (active) { setSavedChecklists(data.items.filter(c => !academicYearId || c.academicYearId === academicYearId)); setError(""); }
          return;
        }
        const options = await request<{ items: ReceivingPeriod[] }>(
          `${endpoint}/receiving-periods`,
          { signal: controller.signal },
        );
        options.items = options.items.filter(p => (!academicYearId || p.academicYearId === academicYearId) && (!allowedSemesterId || p.semesterId === allowedSemesterId));
        let cycleUnavailable = false;
        if (continuing && !periodId && receivingContext?.payoutCycleId) {
          try {
            const history = await request<{items: PayoutCycle[]}>(`payout-cycles/${encodeURIComponent(receivingContext.payoutCycleId)}/history`, {signal: controller.signal});
            const cycle = history.items.at(-1);
            cycleUnavailable = !cycle || cycle.state !== "open" || cycle.periodUnavailable || cycle.semesterId !== receivingContext.semesterId || (!!receivingContext.academicYearId && cycle.academicYearId !== receivingContext.academicYearId);
          } catch (e) {
            if (e instanceof ApiError && [404, 422].includes(e.status)) cycleUnavailable = true;
            else throw e;
          }
        }
        if (active) setBlockedCycle(cycleUnavailable);
        const chosen = cycleUnavailable ? undefined : options.items.find(
          (p) => p.id === resolveReceivingContext(options.items, periodId, receivingContext, id, continuing),
        );
        if (!active) return;
        setPeriods(options.items);
        onAcademicYear?.(chosen?.academicYearId ?? "");
        // Read saved documents first; provisioning is an explicit idempotent POST
        // only when the selected authorized context has no checklist yet.
        let data = await request<{ items: RequirementChecklist[] }>(endpoint, {signal:controller.signal});
        const existing=data.items.some(c=>c.semesterId===chosen?.semesterId && c.payoutCycleId===chosen?.payoutCycleId);
        if(chosen?.canProvision && canGenerate && !existing) {
          await request(`${endpoint}/provision`, {body:{periodId:chosen.id},csrf:session.csrfToken,key:crypto.randomUUID(),signal:controller.signal});
          data=await request<{items:RequirementChecklist[]}>(endpoint,{signal:controller.signal});
        }
        if (active) {
          setSavedChecklists(data.items.filter(c => !academicYearId || c.academicYearId === academicYearId));
          setChecklist(
            data.items.find(
              (c) =>
                c.semesterId === chosen?.semesterId &&
                c.payoutCycleId === chosen?.payoutCycleId,
            ) ?? null,
          );
          setError("");
          if (chosen) onPeriodChange?.(id, chosen);
        }
      } catch (e) {
        if (active) {
          setChecklist(null);
          setSavedChecklists([]);
          setError(message(e));
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [id, periodId, revision, canGenerate, session.csrfToken, onPeriodChange, endpoint, onAcademicYear, readOnly, academicYearId, allowedSemesterId, continuing, receivingContext]);
  const chosenId = blockedCycle && !periodId ? "" : resolveReceivingContext(periods, periodId, receivingContext, id, continuing);
  const openPeriods = openReceivingPeriods(periods);
  const otherSaved = savedChecklists.filter(c => c.id !== checklist?.id && c.items.some(i => i.receipt || i.history.length || i.waiver));
  function choosePeriod(next: string) {
    setAcademicReady(false);
    setReviewId(null);
    setPeriodId(next);
    setChangePeriod(false);
    const chosen = periods.find(p => p.id === next);
    if (chosen) onPeriodChange?.(id, chosen, true);
    setChecklist(null);
    setSelected([]);
    setNotice("");
    setLoading(true);
  }
  function refresh() {
    setLoading(true);
    setError("");
    setSelected([]);
    setRevision((n) => n + 1);
  }
  async function receive(e: FormEvent) {
    e.preventDefault();
    if (!checklist || busy.current || !selected.length) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      items: checklist.items
        .filter((i) => selected.includes(i.id))
        .map((i) => ({ id: i.id, expectedVersion: i.version, ...(i.entrantCard ? {entrantCardId:i.entrantCard.id,documentType:"shs_grading_card"}:{}), ...(i.coverage?.kind === "cor" ? { documentType: enrollmentDocuments[i.id] ?? "cor" } : {}) })),
      ...(receivedOn ? {receivedOn} : {}),
      physicalReference: reference.trim() || null,
      storageLocation: storage.trim() || null,
      remarks: remarks.trim() || null,
    };
    pending.current ??= { path: `requirement-checklists/${checklist.id}/receive`, body, key: crypto.randomUUID() };
    try {
      await request(pending.current.path, {
        body: pending.current.body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setNotice(
        `${body.items.length} document(s) received. Review the hard copies, then choose Verify document below.`,
      );
      setUncertain(false);
      refresh();
    } catch (e) {
      const unknown = !(e instanceof ApiError) || e.status >= 500;
      setUncertain(unknown);
      if (!unknown) pending.current = null;
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  if (readOnly) return <section aria-label="Saved requirement history">
    <ErrorNotice error={error} />
    {loading ? <p>Loading saved documents...</p> : !savedChecklists.length ? <p>No saved documents in this record for the selected year.</p> : savedChecklists.map(c => <details key={c.id} className="border rounded p-3 my-2"><summary>{c.yearCode} | {c.semesterName}{c.payoutCode ? ` | ${c.payoutCode}` : ""}</summary>
      {c.items.map(i => <article key={i.id} className="border-top py-2"><h5>{i.name} - {(i.priorApproval?.valid && !i.priorApproval.retainedIndividual ? "Verified - prior batch approval" : REQUIREMENT_STATUS_LABELS[i.status])}</h5><ReceiptTimingEvidence evidence={i.receiptEvidence} />
        {i.receipt && <p>Received {i.receipt.receivedOn} by {i.receipt.receiverName}.</p>}
        <RequirementWorkflow instance={i} session={session} canVerify={false} canReceive={false} closed disabled onBusy={setSaving} onChanged={refresh} />
      </article>)}
    </details>)}
  </section>;
  return (
    <section aria-label="Documents to receive">
      <div className="d-flex justify-content-between gap-2 align-items-center my-3">
        <h4>Requirements{checklist ? ` - ${checklist.semesterName} | ${checklist.yearCode}` : ""}</h4>
        <button
          className="btn btn-outline-secondary"
          disabled={saving || loading || uncertain}
          onClick={refresh}
        >
          Refresh
        </button>
      </div>
      {chosenId && <div className="list-toolbar">{openPeriods.length > 1 && <button type="button" className="btn btn-outline-secondary" disabled={saving || loading || uncertain} onClick={() => setChangePeriod(v => !v)}>{changePeriod ? "Keep this period" : "Change period"}</button>}</div>}
      {openPeriods.length > 0 && (!chosenId || changePeriod) ? (
        <label className="form-label d-block">
          Receiving period
          <select
            className="form-select"
            value={chosenId}
            disabled={saving || loading || uncertain}
            onChange={(e) => choosePeriod(e.target.value)}
          >
            <option value="" disabled>
              Choose period
            </option>
            {openPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <ErrorNotice error={error} />
      {continuing && chosenId && <SharedSemesterDocuments key={`${id}-${chosenId}-${revision}`} scholarId={id} semesterId={chosenId} session={session} canReview={can("semesters.configure")} onSaved={refresh} />}
      {uncertain && <FocusedDialog title="Receipt result not confirmed" busy onClose={()=>{}}><p>Retry the same action before leaving this scholar. The original selection and request are preserved.</p><button className="btn configuration-primary" disabled={saving} onClick={e=>void receive(e)}>{saving ? "Checking..." : "Retry the same action"}</button></FocusedDialog>}
      {!loading && !error && (periodId || receivingContext) && !chosenId && <p role="alert" className="alert alert-warning">The requested receiving context is unavailable or ambiguous. No different period has been selected. Saved documents remain available in Document history.{openPeriods.length > 0 && " Choose an open period to continue."}</p>}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading applicable requirements...</p>
      ) : error && !checklist ? null : !checklist ? (
        <div className="alert alert-info">
          {openPeriods.length
            ? "Choose a period to view its requirements."
            : "Semester receiving is not enabled. A Coordinator configures it once for this group; individual scholars inherit it automatically."}
          {!openPeriods.length && continuing && can("semesters.configure") && setupCohort && <ContinuingSemesterSetup compact batchId={setupCohort} session={session} canConfigure onEnabled={refresh}/>}
        </div>
      ) : (
        <>
          {checklist.periodUnavailable && (
            <p className="alert alert-info">
              This period is closed or locked. Its documents and history are
              read only.
            </p>
          )}
          <form onSubmit={receive}><p className="text-muted">Receiving records Submitted status. Verification and academic assessment are separate.</p>
            <fieldset
              disabled={saving || uncertain || checklist.periodUnavailable}
            >
              <legend className="fs-6">
                Select documents physically received
              </legend>
              <div id="document-receiving-rows" className="document-rows">
              {checklist.items.map(i => <div className="document-row" key={i.id} data-requirement-row={i.id}>
                <label><input type="checkbox" checked={selected.includes(i.id)} disabled={!canReceive || i.status !== "not_submitted" || i.notRequired || Boolean(i.receivingBlocked)}
                  onChange={e => setSelected(old => e.target.checked ? [...old, i.id] : old.filter(x => x !== i.id))}/>
                  <span>{i.notRequired ? "COG - not required this semester" : i.entrantCard ? "Senior-high-school grading card" : i.name}<small>{i.entrantCard ? `${i.entrantCard.issuingSchool} / ${i.entrantCard.schoolYear} / ${i.entrantCard.gradingPeriod}` : i.coverage?.semesterName ?? "Coverage needs review"}</small></span></label>
                <span className="status-badge">{i.receivingBlocked ? "Review existing source" : i.notRequired ? "Initial requirements reviewed" : i.verificationNeedsReview ? "Verification needs review" : (i.priorApproval?.valid && !i.priorApproval.retainedIndividual ? "Verified - prior batch approval" : REQUIREMENT_STATUS_LABELS[i.status])}</span>
                {(i.firstSemesterExceptionAvailable || i.entrantCard) && !checklist.periodUnavailable && can('semesters.configure') && <EntrantGradingCardReview existing={Boolean(i.entrantCard)} id={i.id} session={session} onSaved={refresh}/>}
                {!i.notRequired && !i.receivingBlocked && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setReviewId(i.id)}>{i.status === "not_submitted" ? (canReceive && can("requirements.verify") ? "Receive and verify" : "Details") : (i.verificationNeedsReview || ["submitted","resubmitted","for_verification"].includes(i.status)) ? "Verify" : "Details"}</button>}
              </div>)}
              </div>
              {checklist.items.filter((i) => i.coverage?.kind === "cor" && i.status === "not_submitted" && selected.includes(i.id)).map((i) => <label className="form-label d-block my-2" key={`document-${i.id}`}>
                Enrollment document received
                <select className="form-select" value={enrollmentDocuments[i.id] ?? "cor"} onChange={(e) => setEnrollmentDocuments((old) => ({ ...old, [i.id]: e.target.value as "cor" | "certificate_of_enrollment" }))}>
                  <option value="cor">{documentLabels.cor}</option>
                  <option value="certificate_of_enrollment">{documentLabels.certificate_of_enrollment}</option>
                </select>
              </label>)}
              {!checklist.periodUnavailable &&
                canReceive &&
                checklist.items.some((i) => i.status === "not_submitted") && (
                  <div className="row g-3 my-2">
                    <div className="col-12">
                      <details>
                        <summary>Additional details</summary><p>Leave the date blank for today in the Philippines.</p>                    <label className="col-md-6">
                      Date received
                      <input
                        className="form-control"
                        type="date"
                        max={receivingToday()}
                        value={receivedOn}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>

                        <div className="row g-3 mt-1">
                          <label className="col-md-6">
                            Physical reference (optional)
                            <input
                              className="form-control"
                              maxLength={300}
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                            />
                          </label>
                          <label className="col-md-6">
                            Storage location (optional)
                            <input
                              className="form-control"
                              maxLength={300}
                              value={storage}
                              onChange={(e) => setStorage(e.target.value)}
                            />
                          </label>
                          <label className="col-md-6">
                            Remarks (optional)
                            <textarea
                              className="form-control"
                              maxLength={1000}
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                            />
                          </label>
                        </div>
                      </details>
                    </div>
                    <div>
                      <button
                        className="btn configuration-primary"
                        disabled={!selected.length}
                      >
                        {saving
                          ? "Receiving..."
                          : "Receive selected documents"}
                      </button>
                    </div>
                  </div>
                )}
            </fieldset>
          </form>
          {continuing && <SemesterAcademicDetails key={checklist.id} scholarId={id} semesterId={checklist.semesterId} session={session} canEdit={can("academic.edit") && !checklist.periodUnavailable} canCorrect={can("academic.changes.approve")} onAcademicSetup={onAcademicSetup} onReady={setAcademicReady} onChanged={() => setRevision((n) => n + 1)} />}
          {continuing && !academicReady && !checklist.items.some(i=>i.priorApproval?.valid) && <p className="alert alert-info">Semester academic details are still needed for academic assessment. Document verification checks its own identity, coverage and placement context.</p>}
          {reviewId && <FocusedDialog title={checklist.items.find(i=>i.id===reviewId)?.name ?? "Document"} busy={saving} onClose={()=>setReviewId(null)}>
            {checklist.items.filter(i=>i.id===reviewId).map((i) => (

              <article className="border-top py-3" key={i.id}>
                <p className="status-badge">{i.verificationNeedsReview ? "Verification needs review" : (i.priorApproval?.valid && !i.priorApproval.retainedIndividual ? "Verified - prior batch approval" : REQUIREMENT_STATUS_LABELS[i.status])}</p>
                {i.originalReused && <p className="small">Existing document reused. Original receipt and decisions retained.</p>}
                <p className="small">{i.entrantCard ? `${i.entrantCard.issuingSchool} / ${i.entrantCard.schoolYear} / ${i.entrantCard.gradingPeriod}` : i.coverage ? `Coverage: ${i.coverage.semesterName}` : "Coverage needs review"}</p>
                <details><summary>Instructions & receiving history</summary><p>{i.instructions}</p>
                <ReceiptTimingEvidence evidence={i.receiptEvidence} />
                <RequirementTimingPanel key={`${i.id}-${i.version}`} instanceId={i.id} session={session} canDecide={can("payroll.windows.manage")} />
                {i.receipt && (
                  <p>
                    Initial receipt: {i.receipt.documentType ? documentLabels[i.receipt.documentType] : "document type not separately recorded"}. Received {i.receipt.receivedOn} by {i.receipt.receiverName}.
                    Reference: {i.receipt.physicalReference || "Not recorded"}.
                    Storage: {i.receipt.storageLocation || "Not recorded"}.{" "}
                    {i.receipt.remarks}
                  </p>
                )}
                </details>
                <QuickDocumentReview allowReceiveOnly={false} key={`quick-${i.id}-${i.version}-${academicReady}`} instance={i} session={session} canReceive={canReceive} canVerify={can("requirements.verify")} closed={checklist.periodUnavailable} disabled={saving} onBusy={setSaving} onChanged={()=>{focusAfterRefresh.current=i.id;setReviewId(null);refresh();}} onAcademicSetup={onAcademicSetup}/>
                <details><summary>Corrections and decision history</summary>
                <RequirementWorkflow
                  instance={i}
                  session={session}
                  canVerify={can("requirements.verify")}
                  canReceive={canReceive}
                  disabled={saving}
                  closed={checklist.periodUnavailable}
                  onBusy={setSaving}
                  onChanged={refresh}
                  onAcademicSetup={onAcademicSetup}
                />
                </details>
                <details><summary>Exceptional actions</summary><p>A waiver is for an authorized exception, not for documents already submitted.</p>
                <RequirementWaiverForm
                  instance={i}
                  session={session}
                  canWaive={can("requirements.waive") && !saving}
                  closed={checklist.periodUnavailable}
                  onBusy={setSaving}
                  onChanged={refresh}
                />
                </details>
              </article>
            ))}
          </FocusedDialog>}
          {continuing && <details className="secondary-details"><summary>Academic assessment and history</summary><SemesterCompliance key={`${checklist.id}-${revision}`} scholarId={id} semesterId={checklist.semesterId} session={session} canReview={can("requirements.verify")} canConfigure={can("semesters.configure")} canCorrect={can("academic.changes.approve")} onDocuments={openVerification} /></details>}
        </>
      )}
      {!loading && otherSaved.length > 0 && <details className="border rounded p-3 mt-3"><summary>Document history ({otherSaved.length})</summary>
        {otherSaved.map(c => { const p = periods.find(p => p.semesterId === c.semesterId && p.payoutCycleId === c.payoutCycleId); return <details className="border-top py-2" key={c.id}>
          <summary>{c.yearCode} / {p?.label ?? `${c.semesterName} / ${c.payoutCode ?? "Semester documents"}`}</summary>
          <p>{c.items.map(i => `${i.code}: ${(i.priorApproval?.valid && !i.priorApproval.retainedIndividual ? "Verified - prior batch approval" : REQUIREMENT_STATUS_LABELS[i.status])}`).join("; ")}</p>
          {p?.preferred && <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={() => choosePeriod(p.id)}>Receive for this open period</button>}
          {c.items.map(i => <article className="border-top py-2" key={i.id}>
            <h5>{i.name} ({i.code})</h5>
            <p>{i.entrantCard ? `${i.entrantCard.issuingSchool} / ${i.entrantCard.schoolYear} / ${i.entrantCard.gradingPeriod}` : i.coverage ? `Coverage: ${i.coverage.semesterName}` : "Coverage needs review"}</p>
            <ReceiptTimingEvidence evidence={i.receiptEvidence} />
            {i.receipt && <p>Initial receipt: {i.receipt.receivedOn} by {i.receipt.receiverName}.{i.receipt.physicalReference && ` Reference: ${i.receipt.physicalReference}.`}{i.receipt.storageLocation && ` Storage: ${i.receipt.storageLocation}.`} {i.receipt.remarks}</p>}
            <RequirementWorkflow instance={i} session={session} canVerify={false} canReceive={false} closed disabled onBusy={setSaving} onChanged={refresh} />
            <RequirementWaiverForm instance={i} session={session} canWaive={false} closed onBusy={setSaving} onChanged={refresh} />
          </article>)}
        </details>; })}
      </details>}
    </section>
  );
}
