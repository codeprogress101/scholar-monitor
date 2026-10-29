import PayrollProgress from "./PayrollProgress";
import CommandProgressDialog from "./CommandProgressDialog";
import {ArrowLeft} from "lucide-react";
import PayrollReprocessing from "./PayrollReprocessing";
import PayrollFormLinks from "./PayrollFormLinks";
import AutomaticPayrollDraft from "./AutomaticPayrollDraft";
import PayrollDetailBoundary, { PayrollDisclosure } from "./PayrollDetailBoundary";
import PayrollPagedDetails from "./PayrollPagedDetails";
import type { OvrSummary, OvrSections } from "../server/ovr/detail-model";
import { useActionForm } from "./use-action-form";
import PayrollCandidates from "./PayrollCandidates";
import PayrollDraftRoster, {type DraftReview} from "./PayrollDraftRoster";
import { payrollSelection, rememberPayroll } from "./payroll-navigation";
import RoutineEvidence from "./RoutineEvidence";
import {pendingPrior,retainPriorCommand} from "./prior-command";
import ErrorNotice from "./ErrorNotice";
import PaymentCorrections from "./PaymentCorrections";
import OvrAmendments from "./OvrAmendments";
import OvrProcessingPanel from "./OvrProcessingPanel";
import PaymentRecording from "./PaymentRecording";
import PayrollReconciliation from "./PayrollReconciliation";
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { OvrBatch } from "../server/ovr/model";
import type { PayoutCycle } from "../server/payouts/model";
import type { EligibilityView } from "../server/eligibility/model";
const FinancialReports=lazy(()=>import('./FinancialReports'));
type Candidates = {
  items: Pick<EligibilityView, "current" | "effective">[];
  total: number;
};
export default function OvrDrafts({
  cycleId,
  session,
  permissions,
  onUncertain,
  compactHeading=false,
  onDraftViewChange,
}: {
  cycleId: string;
  session: Session;
  permissions: string[];
  onUncertain?: (path:string)=>void;
  compactHeading?:boolean;
  onDraftViewChange?:(draft:boolean)=>void;
}) {
  const focusTreasury=useRef(false);
  const returnBatchFocus=useRef<string|null>(null);
  const [detailArea,setDetailArea]=useState(()=>new URLSearchParams(location.hash.split("?")[1]).get("recovery")==="deferral"||pendingPrior(session.user.id)?.path.endsWith("/restore")?"changes":"payments");
  const [list, setList] = useState<{
      managed?: boolean;
      cycle: PayoutCycle;
      items: OvrBatch[];
      total: number;
    } | null>(null),
    [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [selected, updateSelected] = useState<string | null>(() => payrollSelection("cycle") === cycleId ? payrollSelection("batch") : null),
    [detail, setDetail] = useState<(OvrSummary & Partial<OvrSections["candidates"]>) | null>(null),
    [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false);
  const [action, setAction] = useState<
      | "create"
      | "add"
      | "remove"
      | "validate"
      | "submit-review"
      | "return-to-draft"
      | "finalize"
      | null
    >(null),
    [removeId, setRemoveId] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [candidateOffset, setCandidateOffset] = useState(0),
    [candidates, setCandidates] = useState<Candidates | null>(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [draftReview,setDraftReview]=useState<DraftReview|null>(null);
  const [paymentTab,setPaymentTab]=useState(()=>new URLSearchParams(window.location.hash.split("?")[1]).get("view")==="recording"),[paymentBusy,setPaymentBusy]=useState(false);
  const [reportsTab,setReportsTab]=useState(()=>new URLSearchParams(window.location.hash.split('?')[1]).get('view')==='reports');
  const [reconciliationTab,setReconciliationTab]=useState(()=>new URLSearchParams(window.location.hash.split("?")[1]).get("view")==="reconciliation");
  const [issues, setIssues] = useState<
    { code: string; message: string; scholarshipId?: string }[]
  >([]);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const setSelected = (id: string | null) => { if(pendingPrior(session.user.id))return;rememberPayroll(cycleId, id); setReviewLoaded(false);setDraftReview(null); updateSelected(id); };
  const message = (e: unknown) =>
    e instanceof ApiError
      ? e
      : "Could not confirm the Payroll result. Refresh or retry the same command safely.";
  const actionForm = useActionForm(action);
  const reviewTrigger=useRef<HTMLButtonElement>(null);
  function dismissForm(){if(saving||pendingPrior(session.user.id))return;setAction(null);requestAnimationFrame(()=>reviewTrigger.current?.focus());}
  function openReconciliation(){if(pendingPrior(session.user.id))return;setReportsTab(false);setPaymentTab(false);setReconciliationTab(true);const params=new URLSearchParams(window.location.hash.split("?")[1]);params.set("view","reconciliation");window.location.hash=`payouts?${params}`;}
  useEffect(() => {
    const followLink = () => {
      if(pendingPrior(session.user.id)){rememberPayroll(cycleId,selected);return;}
      const next = payrollSelection("batch");
      if(new URLSearchParams(location.hash.split("?")[1]).get("recovery")==="deferral")setDetailArea("changes");
      setReportsTab(new URLSearchParams(window.location.hash.split('?')[1]).get('view')==='reports');
      setPaymentTab(new URLSearchParams(window.location.hash.split("?")[1]).get("view")==="recording");
      setReconciliationTab(new URLSearchParams(window.location.hash.split("?")[1]).get("view")==="reconciliation");
      if(payrollSelection("cycle") === cycleId && next !== selected) {updateSelected(next);setReviewLoaded(false);setDraftReview(null);setDetail(null);setAction(null);}
    };
    window.addEventListener("hashchange",followLink);
    return () => window.removeEventListener("hashchange",followLink);
  },[cycleId,selected,session.user.id]);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 30000);
    request<{ managed?: boolean; cycle: PayoutCycle; items: OvrBatch[]; total: number }>(
      `payout-cycles/${cycleId}/ovr-batch-summaries?offset=${offset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setList(r);
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError?e:"Could not load payroll data. Refresh to retry this read; no command was submitted.");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [cycleId, offset, reload]);
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 30000);
    request<OvrSummary>(`ovr-batches/${selected}/summary`, { signal: c.signal })
      .then((r) => {
        if (active) setDetail(current => current?.batch.id === r.batch.id && current.batch.revision === r.batch.revision ? {...current,...r} : r);
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError?e:"Could not load payroll data. Refresh to retry this read; no command was submitted.");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [selected, reload]);
  useEffect(() => {
    if (!selected || action || saving || detail?.batch.state !== "draft") return;
    const refreshDraft = () => { if (document.visibilityState === "visible" && !pendingPrior(session.user.id)) {setReviewLoaded(false);setDraftReview(null);setReload(n => n + 1);} };
    window.addEventListener("focus", refreshDraft);
    return () => window.removeEventListener("focus", refreshDraft);
  }, [selected, action, saving, detail?.batch.state, session.user.id]);
  useEffect(() => {
    if (action !== "add") return;
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 30000);
    request<Candidates>(
      `payout-cycles/${cycleId}/eligibility?q=${encodeURIComponent(search)}&offset=${candidateOffset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setCandidates(r);
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError?e:"Could not load payroll data. Refresh to retry this read; no command was submitted.");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      c.abort();
      window.clearTimeout(timeout);
    };
  }, [action, cycleId, search, candidateOffset, reload]);
  useEffect(()=>{if(detail && focusTreasury.current){document.getElementById("treasury-search")?.focus();focusTreasury.current=false;}},[detail]);
  function refresh() {
    if(pendingPrior(session.user.id))return;
    setDetail(null);
    setReviewLoaded(false);setDraftReview(null);
    setList(null);
    setError("");
    setIssues([]);
    setReload((n) => n + 1);
  }
  function choose(a: typeof action, id = "") {
    setAction(a);
    setRemoveId(id);
    setError("");
    setIssues([]);
    setNotice("");
    setCandidates(null);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(pendingPrior(session.user.id)){setError("Resolve the retained payroll command first.");return;}
    if (!action || !list || busy.current || (action !== "create" && !detail))
      return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: action === "create" ? 0 : detail!.batch.revision,
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(draftReview ? {expectedSourceHash:draftReview.sourceHash} : {}),
        ...((detail?.managed ?? detail?.automatic) ? { expectedSourceHash: (detail!.managed ?? detail!.automatic)!.sourceHash } : {}),
        ...(action === "create"
          ? {
              code: String(f.get("code")),
              name: String(f.get("name")),
              expectedCycleVersion: list.cycle.version,
            }
          : {}),
        ...(action === "add"
          ? { scholarshipId: String(f.get("scholarshipId")) }
          : {}),
        ...(action === "remove" ? { scholarshipId: removeId } : {}),
      };
    const path =
        action === "create"
          ? `payout-cycles/${cycleId}/ovr-batches`
          : `ovr-batches/${selected}/${action === "add" || action === "remove" ? `entries/${action}` : action}`,
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    retainPriorCommand(session.user.id,{path,key:pending.current.key,body,route:"payouts"});
    busy.current = true;
    setSaving(true);
    setError("");
    setIssues([]);
    try {
      const r = await request<OvrBatch>(path, {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
        signal:AbortSignal.timeout(300000),
      });
      pending.current = null;
      retainPriorCommand(session.user.id,null);
      setSelected(r.id);
      setAction(null);
      setNotice(
        action === "validate"
          ? r.validation?.valid
            ? "Draft validation passed. This batch is not finalized."
            : "Draft validation recorded issues. Review the roster below."
          : action === "finalize"
            ? "Payroll finalized. Membership and source evidence are frozen."
            : action === "submit-review"
              ? "Payroll submitted for Coordinator review."
              : action === "return-to-draft"
                ? "Payroll returned to Draft for corrections."
                : "Payroll draft change saved.",
      );
      refresh();
    } catch (e) {
      setError(message(e));
      if(!(e instanceof ApiError)||e.status>=500)onUncertain?.(path);else retainPriorCommand(session.user.id,null);
      if (e instanceof ApiError && e.code === "OVR_VALIDATION_FAILED")
        setIssues(
          (e.details as { validation?: { issues?: typeof issues } })?.validation
            ?.issues ?? [],
        );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  useEffect(()=>{
    if(selected||!returnBatchFocus.current)return;
    const frame=requestAnimationFrame(()=>{
      const target=document.querySelector<HTMLButtonElement>(`[data-u11-batch-id="${returnBatchFocus.current}"]`);
      if(target){target.focus();returnBatchFocus.current=null;}
    });
    return ()=>cancelAnimationFrame(frame);
  },[selected,list]);
  const draftView=Boolean(selected&&detail?.managedBatch&&!detail.frozen);
  useEffect(()=>{onDraftViewChange?.(draftView);return()=>onDraftViewChange?.(false);},[draftView,onDraftViewChange]);
  const recordingView = Boolean(selected && paymentTab && !reportsTab && detail?.frozen);
  return (
    <section
      className={recordingView ? "card payment-recording-batch" : "card p-3 my-3 u11-payroll-batches"}
      aria-label="Payroll draft batches"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex justify-content-between flex-wrap gap-2">
        {recordingView ? <button type="button" className="btn btn-link recording-back" disabled={saving||paymentBusy} onClick={() => { if(pendingPrior(session.user.id))return;setSelected(""); setDetail(null); setAction(null); }}>Back to Payroll Batches</button> : selected ? <button className="btn btn-link u1-back-link" disabled={saving||paymentBusy} onClick={() => { if(pendingPrior(session.user.id))return;returnBatchFocus.current=selected;setSelected(""); setDetail(null); setAction(null); }}><ArrowLeft size={16} aria-hidden="true"/> Back to batches</button> : !compactHeading&&<h2>Payroll batches</h2>}
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={() => {
            setAction(null);
            refresh();
          }}
        >
          {recordingView ? "Refresh batch" : "Refresh"}
        </button>
      </div>
      {!recordingView && !selected && (!compactHeading||Boolean(list&&!list.managed)) && <p className="muted-line">{list?.managed ? "Choose a batch to review candidates and preview payroll." : "Legacy payroll is read-only. View history and original documents, or ask the Coordinator to review conversion to numbered payroll."}</p>}
      <ErrorNotice error={error} />
      {!!issues.length && (
        <ul aria-label="Payroll validation errors">
          {issues.map((i, n) => (
            <li key={n}>
              {i.scholarshipId
                ? `${detail?.entries?.find((e) => e.scholarshipId === i.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? i.scholarshipId}: `
                : ""}
              {i.message} ({i.code})
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="status">{notice}</p>}
      {!list ? (
        <p role="status" hidden={!!error}>Loading Payroll batches...</p>
      ) : (
        <>
          {!list.managed && <p role="status">New financial processing requires a numbered payroll. Historical corrections remain controlled and audited.</p>}
          {!selected && <div className="table-responsive"><table className="table u1-batch-list"><thead><tr><th scope="col">Payroll batch</th><th scope="col">Next action</th><th scope="col">Status</th></tr></thead><tbody>
            {list.items.map((b) => (
              <tr key={b.id}><td><strong>{b.code}</strong><small className="d-block">{b.name}</small></td><td>
                <button
                  className="btn btn-link"
                  data-u11-batch-id={b.id}
                  disabled={saving}
                  onClick={() => {
                    setSelected(b.id);
                    setDetail(null);
                    setAction(null);
                    setError("");
                    setIssues([]);
                  }}
                >
                  Open Payroll {b.code}
                </button>{" "}
                {list.managed&&["processed","closed"].includes(b.state)&&permissions.includes("ovr.process")&&<button type="button" className="btn btn-outline-primary" disabled={saving||paymentBusy} onClick={()=>{
                  if(pendingPrior(session.user.id))return;
                  setSelected(b.id);setDetail(null);setAction(null);setPaymentTab(true);setReconciliationTab(false);setError("");
                  const params=new URLSearchParams(window.location.hash.split("?")[1]);params.set("view","recording");window.location.hash=`payouts?${params}`;
                }}>{b.state==="closed"?"View payment recording":"Record payments"}</button>}{" "}
                </td><td><span className="soft-badge neutral">{b.state}</span></td></tr>
            ))}
          </tbody></table></div>}
          {!list.items.length && <p>No Payroll batches for this cycle.</p>}
          <div className="d-flex gap-2" hidden={!!selected || list.total <= 25}>
            <button
              className="btn btn-outline-secondary"
              disabled={!offset || saving}
              onClick={() => {
                setOffset((n) => Math.max(0, n - 25));
                setList(null);
              }}
            >
              Previous batches
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={offset + 25 >= list.total || saving}
              onClick={() => {
                setOffset((n) => n + 25);
                setList(null);
              }}
            >
              Next batches
            </button>
          </div>
        </>
      )}
      
      {selected && !detail && !error && <p role="status">Loading selected batch summary...</p>}
      {detail && <section className={recordingView ? "recording-batch-detail" : "u1-batch-detail u11-batch-detail"} aria-label="Selected Payroll draft">
        {recordingView ? <dl className="recording-context" aria-label="Selected payroll context">
          <div><dt>Payroll batch</dt><dd><strong>{detail.batch.code}</strong> / {detail.batch.name}</dd></div>
          <div><dt>Academic year</dt><dd>{detail.cycle.yearCode}</dd></div>
          <div><dt>Semester</dt><dd>{detail.cycle.semesterCode}</dd></div>
          <div><dt>Payroll status</dt><dd className="text-capitalize">{detail.batch.state}</dd></div>
        </dl> : <>{detail.managedBatch&&!detail.frozen?<h1>{detail.batch.code} / {detail.batch.state}</h1>:<h2>{detail.batch.code} / {detail.batch.name}</h2>}
        {!draftView&&((paymentTab||reconciliationTab||reportsTab)&&detail.frozen?<p>{detail.frozen.count??"Recorded"} scholars in the finalized payroll.</p>:<p>{detail.batch.state} · {detail.frozen ? detail.frozen.count === null ? "Recorded membership needs evidence review" : detail.frozen.count + " recorded scholars" : detail.batch.state === "review" ? detail.savedEntryCount + " submitted scholars" : detail.managedBatch ? "Current payroll draft" : detail.annualScopeCount + " annual records in candidate scope"}</p>)}</>}
        <PayrollProgress detail={detail} permissions={permissions} review={draftReview}/>
        {detail.frozen&&reconciliationTab&&<nav className="d-flex flex-wrap gap-2 my-3" aria-label="Payment tasks">
          <button type="button" className={`btn ${paymentTab?'configuration-primary':'btn-outline-secondary'}`} aria-pressed={paymentTab} disabled={paymentBusy} onClick={()=>{if(pendingPrior(session.user.id))return;const params=new URLSearchParams(window.location.hash.split('?')[1]);params.set('view','recording');window.location.hash=`payouts?${params}`;}}>Record Payments</button>
          <button type="button" className={`btn ${reconciliationTab?'configuration-primary':'btn-outline-secondary'}`} aria-pressed={reconciliationTab} disabled={paymentBusy} onClick={openReconciliation}>Review Payments</button>
        </nav>}
        {detail.frozen&&!reportsTab&&paymentTab&&(permissions.includes("ovr.process")?<PaymentRecording key={detail.batch.id} batchId={detail.batch.id} session={session} onSaved={()=>setReload(n=>n+1)} onBusyChange={setPaymentBusy} onReconcile={openReconciliation}/>:<p>Payment Recording requires Staff or Coordinator payment-processing permission. System Administrator access alone does not grant payment authority.</p>)}
        {detail.frozen&&!reportsTab&&reconciliationTab&&(permissions.includes("ovr.process")?<PayrollReconciliation key={detail.batch.id} batchId={detail.batch.id} session={session} permissions={permissions} onSaved={()=>setReload(n=>n+1)} onBusyChange={setPaymentBusy}/>:<p>Review Payments requires Staff or Coordinator payment-processing permission.</p>)}
        {detail.frozen&&reportsTab&&(permissions.includes('ovr.process')?<Suspense fallback={<p role="status">Loading Reports…</p>}><FinancialReports key={detail.batch.id} batchId={detail.batch.id} session={session}/></Suspense>:<p>Financial reports require Staff or Coordinator payment-processing permission.</p>)}
        {(!paymentTab&&!reconciliationTab&&!reportsTab||!detail.frozen)&&<>
        {!detail.frozen&&!detail.managedBatch && <p>Candidate eligibility and overall totals load in Complete batch review.</p>}

        {detail.frozen&&<PayrollFormLinks batchId={detail.batch.id} draft={false}/>}

        {!detail.frozen&&detail.managedBatch&&<PayrollDraftRoster key={`${detail.batch.id}:${reload}`} detail={detail} session={session} permissions={permissions} onSaved={()=>{refresh();setNotice("Deferral confirmed. Reloading current payroll counts.");}} onBusyChange={setPaymentBusy} onReview={review=>{if(review.batchRevision!==detail.batch.revision)return;setDraftReview(review);setReviewLoaded(true);}} primaryAction={<>
          {detail.batch.state==="draft"&&permissions.includes("ovr.prepare")&&<><button type="button" className="btn configuration-primary" ref={reviewTrigger} disabled={!detail.canEdit||saving||paymentBusy||!draftReview||Boolean(draftReview.reviewBlocker)} onClick={()=>choose("submit-review")}>Submit for Coordinator Review</button>{(!detail.canEdit||saving||paymentBusy||!draftReview||draftReview.reviewBlocker)&&<span role="status">{saving||paymentBusy?"Confirm the current payroll command first.":!draftReview?"Load the current roster to confirm review availability.":draftReview.reviewBlocker?.message}</span>}</>}
          {detail.batch.state==="review"&&detail.actions.finalize&&<><button type="button" className="btn btn-outline-secondary" disabled={saving||paymentBusy} onClick={()=>choose("return-to-draft")}>Return Payroll to Draft</button><button type="button" className="btn configuration-primary" disabled={saving||paymentBusy||!draftReview||Boolean(draftReview.finalizeBlocker)} onClick={()=>choose("finalize")}>Finalize Payroll</button>{(!draftReview||draftReview.finalizeBlocker)&&<span role="status">{draftReview?.finalizeBlocker?.message??"Load the current roster before finalization."}</span>}</>}{detail.batch.state==="review"&&!detail.actions.finalize&&<span>Coordinator access is required to return or finalize this payroll.</span>}
        </>}/>}
        {!detail.frozen&&!detail.managedBatch && <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-review"} batchId={detail.batch.id} section="candidates" title="Complete batch review" onLoaded={data => {
          if (data.batch.revision !== detail.batch.revision) { setError("Payroll changed while loading. Refresh before reviewing or approving it."); return; }
          setDetail(current => current?.batch.id === data.batch.id ? {...current,...data} : current); setReviewLoaded(true);
        }}>{data => <>
          {data.managed && <PayrollCandidates permissions={permissions} detail={data} session={session} canDefer={permissions.includes("ovr.finalize")} onSaved={refresh}/>}
          {data.automatic && <AutomaticPayrollDraft detail={data}/>}
          {!data.managed && !data.automatic && <p>No automatic candidate projection is currently available.</p>}
        </>}</PayrollDetailBoundary>}
        {((detail.canEdit && permissions.includes("ovr.prepare")) || detail.actions.finalize) && !detail.managedBatch && !reviewLoaded && <button type="button" className="btn configuration-primary" disabled={saving} onClick={() => { const target = document.getElementById("payroll-section-candidates"); if (target instanceof HTMLDetailsElement) {target.open=true;target.scrollIntoView({block:"nearest"});} }}>Load complete review for payroll actions</button>}
        {detail.canEdit && reviewLoaded && !detail.managedBatch && <div className="d-flex gap-2 flex-wrap">
          <button className="btn configuration-primary" disabled={saving || Boolean(detail.automatic && !detail.automatic.form.rows.length) || Boolean(detail.managed && (detail.managed.pendingCount || !detail.managed.form.rows.length))} onClick={() => choose("submit-review")}>Submit for Coordinator Review</button>
          {!detail.managed && !detail.automatic && <><button className="btn btn-outline-primary" disabled={saving} onClick={() => choose("add")}>Add Payroll entry</button><button className="btn btn-outline-primary" disabled={saving} onClick={() => choose("validate")}>Record draft validation</button></>}
        </div>}
        {detail.batch.state === "review" && !detail.managedBatch && <section aria-label="Payroll review"><p className="alert alert-warning">Coordinator review and finalization are required. Finalization approves the batch; it does not record payment.</p>
          {detail.actions.finalize && <div className="d-flex gap-2"><button className="btn btn-outline-secondary" disabled={saving} onClick={() => choose("return-to-draft")}>Return Payroll to Draft</button><button className="btn btn-success" disabled={saving || !reviewLoaded} onClick={() => choose("finalize")}>Finalize Payroll</button></div>}
        </section>}
        <nav className="filter-pills u1-batch-tabs" aria-label="Batch details">{[["payments","Payments & Treasury"],["changes","Changes & deferrals"],["history","History & sources"]].map(([value,label])=><button type="button" key={value} className="btn btn-outline-secondary" aria-pressed={detailArea===value} onClick={()=>setDetailArea(value)}>{label}</button>)}</nav>
        <div hidden={detailArea!=="changes"}>
        <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-deferrals"} batchId={detail.batch.id} section="reprocessing" defaultOpen={new URLSearchParams(location.hash.split("?")[1]).get("recovery")==="deferral"||pendingPrior(session.user.id)?.path===`ovr-batches/${detail.batch.id}/restore`} title="Deferrals and reprocessing">{data => <PayrollReprocessing onBusyChange={setPaymentBusy} detail={data} managedBatch={detail.managedBatch} session={session} canManage={permissions.includes("ovr.finalize")} onSaved={refresh}/>}</PayrollDetailBoundary>
          {detail.frozen && <>          <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-amendments"} batchId={detail.batch.id} section="amendments" title="Amendments">{data => data.effectiveFinalization && !data.effectiveFinalization.snapshot.payrollForm ? <OvrAmendments key={data.batch.revision} detail={data} session={session} permissions={permissions} onSaved={refresh}/> : <p>Numbered payroll membership remains frozen; use the authorized source and payment workflows.</p>}</PayrollDetailBoundary></>}
        </div>
        {detail.frozen && <>
        <div hidden={detailArea!=="payments"}>
          <PayrollDisclosure key={detail.batch.id + "-payments"} title="Payment history"><PayrollPagedDetails permissions={permissions} batchId={detail.batch.id} cycle={detail.cycle} mode="payment-history"/></PayrollDisclosure>
          <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-processing"} batchId={detail.batch.id} section="processing" defaultOpen={new URLSearchParams(window.location.hash.split("?")[1]).get("task")==="processing"} title="Payment processing and Treasury evidence">{data => <OvrProcessingPanel key={data.batch.revision} detail={data} session={session} permissions={permissions} onTreasurySaved={() => {focusTreasury.current=true;refresh();}} onSaved={refresh} onReconcile={openReconciliation}/>}</PayrollDetailBoundary>
          <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-corrections"} batchId={detail.batch.id} section="corrections" title="Payment corrections">{data => data.payments.length ? <PaymentCorrections key={data.batch.revision} detail={data} session={session} permissions={permissions} onSaved={refresh}/> : <p>No recorded payment outcomes to correct.</p>}</PayrollDetailBoundary>

          <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-reconciliation"} batchId={detail.batch.id} section="reconciliation" title="Reconciliation">{data => <p>{data.reconciliation.recorded} of {data.reconciliation.required} outcomes recorded / Paid total {data.reconciliation.paidTotal} / Not paid {data.reconciliation.notPaid} / Pending {data.reconciliation.missingScholarshipIds.length}. {data.reconciliation.complete ? "All required outcomes are recorded." : "Reconciliation is incomplete."}</p>}</PayrollDetailBoundary>
        </div>
        </>}
        <div hidden={detailArea!=="history"}>
        {(detail.batch.submission||detail.frozen)&&<details className="u1-source-provenance"><summary>Submission &amp; finalization evidence</summary>        {detail.batch.submission && <p>Submitted by {detail.batch.submission.actorName} / {new Date(detail.batch.submission.submittedAt).toLocaleString()}.</p>}

        {detail.frozen && <><p>Finalization recorded by {detail.frozen.finalizedByName ?? "an authorized operator"}{detail.frozen.finalizedAt ? " / " + new Date(detail.frozen.finalizedAt).toLocaleString() : ""}. Current source validation loads separately.</p></>}
</details>}
        {detail.frozen&&<details><summary>Frozen source identity</summary><code className="text-break">{detail.frozen.hash}</code></details>}
        <PayrollDetailBoundary refreshToken={reload} key={detail.batch.id + "-validation"} batchId={detail.batch.id} section="validation" title="Current source checks and validation">{data => <>
          <p>{data.validation.valid ? "Current validation passed." : "Current sources require review."} Checked {new Date(data.validation.checkedAt).toLocaleString()}.</p><ul>{data.validation.issues.map((issue,i) => <li key={i}>{issue.scholarshipId ? (data.entries.find(e => e.scholarshipId === issue.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? issue.scholarshipId) + ": " : ""}{issue.message} ({issue.code})</li>)}</ul>
        </>}</PayrollDetailBoundary>
        <PayrollDisclosure key={detail.batch.id + "-history"} title="Payroll history"><PayrollPagedDetails permissions={permissions} batchId={detail.batch.id} cycle={detail.cycle} mode="history"/></PayrollDisclosure>
        </div>
        {(!detail.managedBatch||detail.frozen)&&<section className="u1-roster-page" aria-label={detail.frozen ? "Saved payroll roster" : "Candidate pages"}><h3>{detail.frozen ? "Saved payroll roster" : "Candidate pages"}{detail.frozen?.count!==null&&detail.frozen?.count!==undefined&&<span className="u11-roster-total">{detail.frozen.count} scholars</span>}</h3>
          <PayrollPagedDetails permissions={permissions} batchId={detail.batch.id} cycle={detail.cycle} mode={detail.frozen ? "roster" : "candidates"}/>
        </section>}
        </>}
      </section>}
      <CommandProgressDialog operation={action==="submit-review"?"Submitting for Coordinator Review":action==="finalize"?"Finalizing Payroll":action==="return-to-draft"?"Returning Payroll to Draft":"Saving payroll draft"} identity={`${detail?.batch.code??"Payroll"} / ${detail?.batch.id??cycleId}`} count={draftReview?.includedCount??detail?.frozen?.count??undefined} pending={saving}/>
      {action && (
        <form ref={actionForm}
          onSubmit={submit}
          className="border-top mt-3 pt-3"
          aria-label="Payroll draft command"
          onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();dismissForm();}}}
          key={`${action}-${removeId}`}
        >
          <fieldset
            disabled={saving || !list || (action !== "create" && !detail)}
          >
            <legend>
              {action === "create"
                ? "Create Payroll draft"
                : action === "add"
                  ? "Add Payroll entry"
                  : action === "remove"
                    ? "Remove Payroll entry"
                    : action === "submit-review"
                      ? "Submit for Coordinator Review"
                      : action === "return-to-draft"
                        ? "Return Payroll to Draft"
                        : action === "finalize"
                          ? "Finalize Payroll"
                          : "Record draft validation"}
            </legend>
            {action === "create" && (
              <>
                <label className="form-label d-block">
                  Payroll batch code
                  <input
                    name="code"
                    className="form-control"
                    required
                    maxLength={60}
                    pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
                  />
                </label>
                <label className="form-label d-block">
                  Payroll batch name
                  <input
                    name="name"
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={160}
                  />
                </label>
              </>
            )}
            {action === "add" && (
              <>
                <label className="form-label d-block">
                  Find scholar by name or ID
                  <input
                    className="form-control"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline-secondary mb-2"
                  onClick={() => {
                    setSearch(query);
                    setCandidateOffset(0);
                    setCandidates(null);
                    setReload((n) => n + 1);
                  }}
                >
                  Search Payroll candidates
                </button>
                <label className="form-label d-block">
                  Scholarship record
                  <select
                    className="form-select"
                    name="scholarshipId"
                    required
                    defaultValue=""
                    key={`${search}-${candidateOffset}-${reload}`}
                  >
                    <option value="">Select a record</option>
                    {candidates?.items.map((r) => (
                      <option
                        key={r.current.sources.scholarship.id}
                        value={r.current.sources.scholarship.id}
                      >
                        {r.current.sources.scholarship.humanId} —{" "}
                        {r.current.sources.scholarship.name} —{" "}
                        {r.effective.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!candidates ? (
                  <p role="status" hidden={!!error}>Loading candidates...</p>
                ) : (
                  <p>
                    {candidates.total} matching records. Adding always rechecks
                    the Payroll rules.
                  </p>
                )}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={!candidateOffset}
                    onClick={() => {
                      setCandidateOffset((n) => Math.max(0, n - 25));
                      setCandidates(null);
                    }}
                  >
                    Previous candidates
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={
                      !candidates || candidateOffset + 25 >= candidates.total
                    }
                    onClick={() => {
                      setCandidateOffset((n) => n + 25);
                      setCandidates(null);
                    }}
                  >
                    Next candidates
                  </button>
                </div>
              </>
            )}
            <RoutineEvidence routine={action !== "return-to-draft" && action !== "remove"}><label className="form-label d-block">
              Payroll action reason
              <input
                name="reason"
                className="form-control"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Payroll action reference
              <input
                name="reference"
                className="form-control"
                required
                minLength={3}
                maxLength={300}
              />
            </label></RoutineEvidence>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn configuration-primary">
                {action === "finalize"
                  ? "Confirm Payroll finalization"
                  : "Confirm Payroll action"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={dismissForm}
              >
                Dismiss Payroll form
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
