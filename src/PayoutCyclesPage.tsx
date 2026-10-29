import ContinuingSemesterSetup from "./ContinuingSemesterSetup";
import { StatusBadge } from "./WorkspaceUI";
import { payrollPeriods, type PayrollPeriodScope } from "./payroll-periods";
import { receivingToday } from "./receiving-selection";
import PayrollSubmissionWindows from "./PayrollSubmissionWindows";
import HistoricalPayrollSetup from "./HistoricalPayrollSetup";
import PayoutCommandRecovery from "./PayoutCommandRecovery";
import {pendingPrior,retainPriorCommand} from "./prior-command";
import RoutineEvidence from "./RoutineEvidence";
import OvrDrafts from "./OvrDrafts";
import { payrollSelection, rememberPayroll } from "./payroll-navigation";
import EligibilityReport from "./EligibilityReport";
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigRecord, ConfigList } from "../server/configuration/model";
import type { RequirementVersion } from "../server/requirements/model";
import type { PayoutCycle } from "../server/payouts/model";
import { configurationRequest as request } from "./configuration-api";
const FinancialReports = lazy(() => import("./FinancialReports"));
const message = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Could not confirm the result. Retry the same command safely or refresh.";
type Editor = {
  action: "create" | "configure" | "open" | "lock" | "close";
  cycle?: PayoutCycle;
};
async function allSemesters(signal: AbortSignal) {
  const items: ConfigRecord[] = [];
  for (let offset = 0; ;) {
    const r = await request<ConfigList>(
      `configuration/semesters?includeArchived=true&limit=100&offset=${offset}`,
      { signal },
    );
    items.push(...r.items);
    offset += r.items.length;
    if (offset >= r.total || !r.items.length) return items;
  }
}
async function allPayoutCycles(signal: AbortSignal) {
  const items: PayoutCycle[] = [];
  for (let offset = 0; ;) {
    const page = await request<{ items: PayoutCycle[]; total: number }>(`payout-cycles?limit=100&offset=${offset}`, { signal });
    items.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total || !page.items.length) return { items, total: items.length };
  }
}
export default function PayoutCyclesPage({ session }: { session: Session }) {
  const [workspaceView, setWorkspaceView] = useState(() => new URLSearchParams(window.location.hash.split("?")[1]).get("view"));
  const [scope, setScope] = useState<PayrollPeriodScope>("current");
  const [ovrCycle, updateOvrCycle] = useState<string | null>(() => payrollSelection("cycle"));
  const setOvrCycle = (id: string | null) => { if(pendingPrior(session.user.id))return;rememberPayroll(id); updateOvrCycle(id); };
  const [reportCycle, setReportCycle] = useState<string | null>(() => new URLSearchParams(window.location.hash.split("?")[1]).get("view") === "eligibility" ? payrollSelection("cycle") : null);
  const [draftPage,setDraftPage]=useState(false);
  const [readFailure,setReadFailure]=useState<string|ApiError>("");
  const [data, setData] = useState<{ items: PayoutCycle[]; total: number }>({
      items: [],
      total: 0,
    }),
    [parents, setParents] = useState<ConfigRecord[]>([]),
    [permissions, setPermissions] = useState<string[]>([]);
  const [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [history, setHistory] = useState<PayoutCycle[] | null>(null);
  const [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [semesterId, setSemesterId] = useState(""),
    [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const [inherited, setInherited] = useState<NonNullable<PayoutCycle["semesterDocuments"]>>([]);
  const [choices, setChoices] = useState<RequirementVersion[] | null>(null),
    [selected, setSelected] = useState<Record<string, boolean>>({});
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null),
    panel = useRef<HTMLFormElement>(null);
  const [recovery,setRecovery]=useState(()=>{const c=pendingPrior(session.user.id);return c?.route==="payouts"&&!c.path.endsWith("historical-setup")&&!c.path.endsWith('historical-append')?c.path:null;});
  useEffect(() => {
    const followLink = () => {if(pendingPrior(session.user.id))return;const view=new URLSearchParams(window.location.hash.split("?")[1]).get("view");setWorkspaceView(view);updateOvrCycle(payrollSelection("cycle"));setReportCycle(view === "eligibility" ? payrollSelection("cycle") : null);};
    window.addEventListener("hashchange",followLink);
    return () => window.removeEventListener("hashchange",followLink);
  },[session.user.id]);
  const manage = permissions.includes("configuration.manage"),
    operate = permissions.includes("payouts.operate");
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    Promise.all([
      request<Access>("me/permissions", { signal: c.signal }),
      allPayoutCycles(c.signal),
      allSemesters(c.signal),
    ])
      .then(([access, list, refs]) => {
        if (active) {
          setReadFailure("");
          setPermissions(access.permissions.map((p) => p.code));
          setData(list);
          setParents(refs);
        }
      })
      .catch((e) => {
        if (active) setReadFailure(e instanceof ApiError?e:"Payroll periods could not be loaded. Retry the connection; no command was submitted.");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      c.abort();
    };
  }, [reload]);
  useEffect(() => {
    if (editor) {
      panel.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      panel.current?.focus({ preventScroll: true });
    }
  }, [editor]);
  function refresh() {
    if(pendingPrior(session.user.id))return;
    setLoading(true);
    setEditor(null);
    setHistory(null);
    setError("");
    setReload((n) => n + 1);
  }
  function edit(action: Editor["action"], cycle?: PayoutCycle) {
    setEditor({ action, cycle });
    setCode(cycle?.code ?? "");
    setName(cycle?.name ?? "");
    setSemesterId(cycle?.semesterId ?? "");
    setDate(cycle?.targetDate ?? "");
    setSelected(
      Object.fromEntries(
        cycle?.requirements.map((r) => [
          r.definitionVersionId,
          r.allowWaiver,
        ]) ?? [],
      ),
    );
    setChoices(null); setInherited(cycle?.semesterDocuments ?? []);
    setReason("");
    setReference("");
    setError("");
    pending.current = null;
  }
  async function loadChoices() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const results = await Promise.all((["payout", "semester"] as const).map(appliesTo => request<{ items: RequirementVersion[] }>(`requirement-definitions/applicable?semesterId=${encodeURIComponent(semesterId)}&appliesTo=${appliesTo}&effectiveOn=${encodeURIComponent(date)}`)));
      const shared = await request<{items: NonNullable<PayoutCycle["semesterDocuments"]>}>(`semesters/${semesterId}/document-sources`);
      setInherited(shared.items);
      const ids = new Set(shared.items.flatMap(s=>[s.corDefinitionVersionId,s.cogDefinitionVersionId]));
      const r = { items: results.flatMap(r => r.items).filter(r=>!ids.has(r.id)) };
      setChoices(r.items);
      setSelected((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([id]) =>
            r.items.some((i) => i.id === id),
          ),
        ),
      );
    } catch (e) {
      setChoices(null);
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function inspect(cycle: PayoutCycle) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      setHistory(
        (
          await request<{ items: PayoutCycle[] }>(
            `payout-cycles/${cycle.id}/history`,
          )
        ).items,
      );
    } catch (e) {
      setError(message(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editor || busy.current) return;
    if(pendingPrior(session.user.id)){setError("Resolve the retained payout command first.");return;}
    busy.current = true;
    setSaving(true);
    setError("");
    const { action, cycle } = editor;
    const body = {
      action,
      expectedVersion: cycle?.version ?? 0,
      reason,
      reference,
      ...(action === "create"
        ? {
            code,
            semesterId,
            expectedSemesterVersion: parents.find((s) => s.id === semesterId)!
              .version,
          }
        : {}),
      ...(["create", "configure"].includes(action)
        ? {
            fields: {
              name,
              targetDate: date,
              requirements: Object.entries(selected).map(
                ([definitionVersionId, allowWaiver]) => ({
                  definitionVersionId,
                  allowWaiver,
                }),
              ),
            },
          }
        : {}),
    };
    const path = cycle
        ? `payout-cycles/${cycle.id}/${action}`
        : "payout-cycles",
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    retainPriorCommand(session.user.id,{path,key:pending.current.key,body,route:"payouts"});
    try {
      const result = await request<PayoutCycle>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      retainPriorCommand(session.user.id,null);
      refresh();
      setNotice(`${result.code}: ${result.state}, revision ${result.version}.`);
    } catch (e) {
      setError(message(e));
      if(!(e instanceof ApiError)||e.status>=500)setRecovery(path);else retainPriorCommand(session.user.id,null);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const day = receivingToday();
  const periods = payrollPeriods(data.items, parents, scope, day);
  const pageOffset = Math.min(offset, Math.max(0, Math.ceil(periods.length / 25) - 1) * 25);
  const shown = ovrCycle ? data.items.filter(c => c.id === ovrCycle) : periods.slice(pageOffset, pageOffset + 25);
  const scopeLabels: Record<PayrollPeriodScope, string> = { current: "Current periods", past: "Past periods & batches", upcoming: "Upcoming periods", all: "All periods" };
  const recordingView = workspaceView === "recording" && Boolean(payrollSelection("batch"));
  const actionFirst=Boolean(ovrCycle&&!recordingView&&!reportCycle);
  if(readFailure&&!data.total)return <section className="configuration-page"><h1>Payroll</h1><p role="status">Payroll periods are unavailable; the period count is not confirmed.</p><p role="alert">{typeof readFailure==="string"?readFailure:readFailure.message}</p><button type="button" className="btn btn-outline-secondary" onClick={()=>{setReadFailure("");setLoading(true);setReload(n=>n+1);}}>Retry payroll connection</button></section>;
  if (workspaceView === "reports" && !payrollSelection("batch")) return <section className="configuration-page"><h1>Payroll</h1>{loading?<p role="status">Checking report access…</p>:permissions.includes("ovr.process")?<Suspense fallback={<p role="status">Loading Reports…</p>}><FinancialReports session={session}/></Suspense>:<p>Financial reports require Staff or Coordinator payment-processing permission.</p>}</section>;
  const setup = <>
      <div className="payroll-setup u1-payroll-setup"><details className="u1-payroll-administration" open={Boolean(editor)||undefined}>
      <summary>Semester setup and administration</summary>
        {recordingView && <>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          {recordingView ? "Refresh payroll setup" : "Refresh"}
        </button>
        </>}
      {manage && (
        <button
          className="btn configuration-primary mb-3"
          disabled={loading || saving}
          onClick={() => edit("create")}
        >
          Create payout cycle
        </button>
      )}
      {editor && (
        <form
          ref={panel}
          tabIndex={-1}
          className="card p-3 mb-3"
          aria-label="Payout cycle command"
          onSubmit={submit}
        >
          <h2>
            {editor.action === "create"
              ? "Create payout cycle"
              : `${editor.action} ${editor.cycle!.code}`}
          </h2>
          <fieldset disabled={saving}>
            {editor.action === "create" && (
              <>
                <label className="form-label d-block">
                  Cycle code
                  <input
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={60}
                    pattern={"[A-Z0-9][A-Z0-9_\\-]*"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <label className="form-label d-block">
                  Cycle semester
                  <select
                    className="form-select"
                    required
                    value={semesterId}
                    onChange={(e) => {
                      setSemesterId(e.target.value);
                      setChoices(null); setInherited([]);
                      setSelected({});
                    }}
                  >
                    <option value="">Select semester</option>
                    {parents.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={s.locked || s.archived || s.parentUnavailable}
                      >
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {["create", "configure"].includes(editor.action) ? (
              <>
                <label className="form-label d-block">
                  Cycle name
                  <input
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={160}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="form-label d-block">
                  Payout target date
                  <input
                    className="form-control"
                    type="date"
                    required
                    min="1900-01-01"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setChoices(null); setInherited([]);
                      setSelected({});
                    }}
                  />
                </label>
                <button
                  className="btn btn-outline-secondary mb-3"
                  type="button"
                  disabled={!semesterId || !date}
                  onClick={() => void loadChoices()}
                >
                  Load document setup
                </button>
                {inherited.length > 0 && <p role="status"><strong>Uses semester documents</strong> ? {inherited.length} cohort setup(s). COR/COG are inherited per scholar.</p>}
                {choices !== null && (
                  <>
                    <p>
                      Select any separate payout obligations. COR/COG use the approved semester setup.
                    </p>
                    {!choices.length && !inherited.length && (
                      <p>
                        No payout definitions apply. Configure them in
                        Requirement definitions first.
                      </p>
                    )}
                    {choices.map((r) => (
                      <div className="border rounded p-2 mb-2" key={r.id}>
                        <label className="d-block">
                          <input
                            type="checkbox"
                            checked={r.id in selected}
                            onChange={(e) =>
                              setSelected((old) => {
                                const next = { ...old };
                                if (e.target.checked) next[r.id] = true;
                                else delete next[r.id];
                                return next;
                              })
                            }
                          />{" "}
                          Require {r.code} - {r.name} (v{r.revision})
                        </label>
                        {r.id in selected && (
                          <label className="d-block">
                            <input
                              type="checkbox"
                              checked={selected[r.id]}
                              onChange={(e) =>
                                setSelected((old) => ({
                                  ...old,
                                  [r.id]: e.target.checked,
                                }))
                              }
                            />{" "}
                            Accept waiver for {r.code}
                          </label>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <p>
                  {editor.cycle!.yearCode} / {editor.cycle!.semesterCode} -
                  target {editor.cycle!.targetDate}
                </p>
                <p>
                  {editor.action === "open"
                    ? "Opening freezes the target date and requirement versions. Requirements are rechecked against current policy before opening."
                    : "This action stops new document changes. Existing documents and decisions remain readable; there is no reopen action."}
                </p>
              </>
            )}
            <RoutineEvidence ><label className="form-label d-block">
              Cycle command reason
              <input
                className="form-control"
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Cycle authority reference
              <input
                className="form-control"
                required
                minLength={3}
                maxLength={300}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label></RoutineEvidence>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn configuration-primary"
                disabled={
                  ["create", "configure"].includes(editor.action) &&
                  (!choices || (!Object.keys(selected).length && !inherited.some(s=>s.mode==="enabled")))
                }
              >
                Save payout cycle command
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setEditor(null)}
              >
                Cancel cycle command
              </button>
            </div>
          </fieldset>
        </form>
      )}
      </details>
      {loading ? (
        <p role="status">Loading payout cycles...</p>
      ) : (
        <>
          {!data.items.length && <p>No payout cycles configured.</p>}
          {!ovrCycle && data.items.length > 0 && !periods.length && <p className="empty-state">{scope === "current" ? "No payroll period matches today's semester dates. Use Past periods & batches or All periods to find another payroll." : "No payroll periods in this view."}</p>}
          {ovrCycle && <button type="button" className="btn btn-outline-secondary back-link" disabled={saving} onClick={() => { setOvrCycle(null); setReportCycle(null); setHistory(null); }}>Back to {scopeLabels[scope].toLowerCase()}</button>}
          {shown.map((c) => (
            <div key={c.id}><PayoutCycleCard
              cycle={c}
              manage={manage}
              operate={operate}
              saving={saving}
              onInspect={inspect}
              onEdit={edit}
              onOvr={
                permissions.includes("ovr.prepare") && ovrCycle !== c.id
                  ? () => { setOvrCycle(c.id); setReportCycle(null); setHistory(null); window.scrollTo(0, 0); }
                  : undefined
              }
              onReport={
                permissions.includes("scholars.read")
                  ? () => { setOvrCycle(c.id); setReportCycle(c.id); setHistory(null); window.scrollTo(0, 0); }
                  : undefined
              }
            />{operate&&permissions.includes("payroll.windows.manage")&&["draft","open"].includes(c.state)&&<HistoricalPayrollSetup cycleId={c.id} session={session} onChanged={()=>setReload(n=>n+1)}/>}</div>
          ))}
          <div className="d-flex gap-3 align-items-center" hidden={!!ovrCycle || periods.length <= 25}>
            <button
              className="btn btn-outline-secondary"
              disabled={!pageOffset || saving}
              onClick={() => {
                setOffset(Math.max(0, pageOffset - 25));
                setHistory(null);
              }}
            >
              Previous cycles
            </button>
            <span>{pageOffset + 1}–{Math.min(pageOffset + 25, periods.length)} of {periods.length} periods</span>
            <button
              className="btn btn-outline-secondary"
              disabled={pageOffset + 25 >= periods.length || saving}
              onClick={() => {
                setOffset(pageOffset + 25);
                setHistory(null);
              }}
            >
              Next cycles
            </button>
          </div>
        </>
      )}
      </div>
      {ovrCycle && <details className="my-2"><summary>Eligibility report and semester documents</summary><nav className="filter-pills" aria-label="Semester work areas"><button type="button" aria-pressed={!reportCycle} onClick={() => setReportCycle(null)}>Payroll batches</button><button type="button" aria-pressed={!!reportCycle} onClick={() => setReportCycle(ovrCycle)}>Eligibility report</button></nav><div className="my-2">{data.items.find(c=>c.id===ovrCycle)?.semesterDocuments?.map(s=><div key={s.scopeId}><strong>Uses semester documents</strong>{permissions.includes("semesters.configure") && <ContinuingSemesterSetup compact initialSemesterId={data.items.find(c=>c.id===ovrCycle)!.semesterId} batchId={s.cohort} session={session} canConfigure />}</div>)}</div></details>}
  </>;
  return (
    <section
      className={`configuration-page u1-payroll-page${recordingView ? " payment-recording-page" : ""}`}
      style={{ overflowWrap: "anywhere" }}
    >
      {!actionFirst&&<div className="d-flex justify-content-between gap-2 flex-wrap">
        <h1 id="payroll-title" tabIndex={-1}>{recordingView ? "Payment Recording" : "Payroll"}</h1>

        {!recordingView && <>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={refresh}
        >
          {recordingView ? "Refresh payroll setup" : "Refresh"}
        </button>
        </>}
      </div>}
      {!actionFirst&&!recordingView && <p>{scope === "past" ? "Open a past period to view its payroll batches." : scope === "current" ? "Review candidates and prepare payroll for the current semester." : "Choose a period to view its payroll batches."}</p>}
      {workspaceView === "recording" && !payrollSelection("batch") && <p className="alert alert-info">Choose a period, then select a processed payroll to record payments.</p>}
      {recovery&&<PayoutCommandRecovery session={session} path={recovery} onResolved={()=>{setRecovery(null);pending.current=null;refresh();requestAnimationFrame(()=>document.getElementById("payroll-title")?.focus());}}/>}
      {!ovrCycle && <nav className="filter-pills" aria-label="Payroll periods">{(["current", "past", "upcoming", "all"] as const).map(value => {
        const count = payrollPeriods(data.items, parents, value, day).length;
        if (value === "upcoming" && !count) return null;
        return <button type="button" key={value} aria-pressed={scope === value} disabled={loading || saving} onClick={() => { setScope(value); setOffset(0); setEditor(null); setHistory(null); setNotice(""); }}>{scopeLabels[value]}{!loading && ` (${count})`}</button>;
      })}</nav>}
      {readFailure&&<p role="alert">Payroll connection needs review. Previously loaded periods are retained. <button type="button" className="btn btn-outline-secondary" onClick={()=>setReload(n=>n+1)}>Retry payroll connection</button></p>}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {!recordingView && !ovrCycle && setup}
      {ovrCycle&&!reportCycle&&<PayrollSubmissionWindows key={ovrCycle} cycleId={ovrCycle} session={session} canManage={permissions.includes("payroll.windows.manage")} actionFirst={actionFirst} compactDraft={draftPage} administration={actionFirst?setup:undefined} context={data.items.filter(c=>c.id===ovrCycle).map(c=><div className="pay-ui-period" key={c.id}><div><strong>{c.yearCode} / {c.semesterCode}</strong><p>{c.name} / {c.state}</p>{c.periodUnavailable&&<p role="status">Period unavailable for changes.</p>}{c.targetDate<day&&c.state==='open'&&<p className="u1-deadline-warning">Planned target {c.targetDate} has passed.</p>}</div><button type="button" className="btn btn-link" disabled={saving} onClick={()=>{setOvrCycle(null);setReportCycle(null);setHistory(null);}}>All payroll periods</button></div>)}>
        <OvrDrafts
          key={`${ovrCycle}-${reload}`}
          cycleId={ovrCycle}
          session={session}
          permissions={permissions}
          compactHeading={actionFirst}
          onDraftViewChange={setDraftPage}
          onUncertain={setRecovery}
        />
      </PayrollSubmissionWindows>}
      {!recordingView&&ovrCycle&&reportCycle&&<details className="u1-period-details"><summary>Payroll setup &amp; history</summary>{setup}</details>}
      {reportCycle && (
        <EligibilityReport
          key={`${reportCycle}-${reload}`}
          cycleId={reportCycle}
          session={session}
          canCalculate={permissions.includes("eligibility.calculate")}
          permissions={permissions}
        />
      )}
      {recordingView && setup}
      {history && (
        <section className="card p-3 mt-3" aria-label="Payout cycle history">
          <h2>History: {history[0]?.code}</h2>
          {history.map((v) => (
            <div className="border-top py-2" key={v.versionId}>
              <strong>
                Revision {v.version}: {v.action} - {v.state}
              </strong>
              <p>
                {v.name} - target {v.targetDate}
                <br />
                {v.actorName} - {new Date(v.recordedAt).toLocaleString()}
                <br />
                {v.reason}
                <br />
                Reference: {v.reference}
              </p>
              <ul>
                {v.requirements.map((r) => (
                  <li key={r.definitionVersionId}>
                    {r.code} v{r.revision} -{" "}
                    {r.allowWaiver ? "waivers accepted" : "waivers excluded"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}

function PayoutCycleCard({
  cycle: c,
  manage,
  operate,
  saving,
  onInspect,
  onEdit,
  onReport,
  onOvr,
}: {
  cycle: PayoutCycle;
  manage: boolean;
  operate: boolean;
  saving: boolean;
  onInspect: (c: PayoutCycle) => Promise<void>;
  onReport?: () => void;
  onOvr?: () => void;
  onEdit: (action: Editor["action"], c: PayoutCycle) => void;
}) {
  return (
    <article
      className="card compact-card"
      key={c.id}
      aria-label={`Payout ${c.code}`}
    >
      <div className="card-heading"><div><h2>{c.name}</h2><p className="muted-line">{c.yearCode} / {c.semesterCode} · Target {c.targetDate}</p></div><StatusBadge tone={c.state === "open" ? "success" : "neutral"}>{c.state}</StatusBadge>
        {onOvr && <button className="btn btn-outline-secondary" disabled={saving} onClick={onOvr}>View payroll batches</button>}
        {c.state === "draft" && !c.periodUnavailable && (operate ? <button className="btn configuration-primary" disabled={saving} onClick={()=>onEdit("open",c)}>Open payout cycle</button> : <p>A Coordinator must open this payout cycle.</p>)}
      </div>
      {c.periodUnavailable && <p className="text-muted">This period is unavailable for changes.</p>}
      <details className="secondary-details"><summary>Documents & semester options</summary>
      <p className="muted-line">{c.code} · Revision {c.version}</p>
      <ul>
        {c.requirements.map((r) => (
          <li key={r.definitionVersionId}>
            {r.code} - {r.name} (v{r.revision});{" "}
            {r.allowWaiver
              ? "waivers accepted"
              : "verification required; waivers excluded"}
          </li>
        ))}
      </ul>
      <div className="d-flex gap-2 flex-wrap">
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={() => void onInspect(c)}
        >
          View history
        </button>
        {onReport && (
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={onReport}
          >
            Eligibility report
          </button>
        )}
        {manage && c.state === "draft" && !c.periodUnavailable && (
          <button
            className="btn btn-outline-secondary"
            disabled={saving}
            onClick={() => onEdit("configure", c)}
          >
            Edit setup
          </button>
        )}
        {operate &&
          (c.state === "draft" && !c.periodUnavailable
            ? []
            : c.state === "open"
              ? ["lock", "close"]
              : c.state === "locked"
                ? ["close"]
                : []
          ).map((a) => (
            <button
              key={a}
              className="btn btn-outline-secondary"
              disabled={saving}
              onClick={() => onEdit(a as Editor["action"], c)}
            >
              {a === "open" ? "Open semester" : a === "lock" ? "Lock semester" : "Close semester"}
            </button>
          ))}
      </div>
      </details>
    </article>
  );
}
