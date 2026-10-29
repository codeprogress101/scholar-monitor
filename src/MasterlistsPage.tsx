import {pendingPrior} from "./prior-command";
import PayoutCommandRecovery from "./PayoutCommandRecovery";
import {ActionButton} from "./ActionProgress";
import MasterlistSelection from "./MasterlistSelection";
import MasterlistConflicts from "./MasterlistConflicts";
import FocusedDialog from "./FocusedDialog";
import { yearLevelLabel } from "./ScholarAcademicSummary";
import { PagedTable } from "./WorkspaceUI";
import BulkReview from "./BulkReview";
import { runBulkJobs, type BulkJob } from "./bulk-commands";
import ScholarIssueAction from "./ScholarIssueAction";
import { newRecordYear } from "./academic-year-options";
import RoutineEvidence from "./RoutineEvidence";
import ErrorNotice from "./ErrorNotice";
import MasterlistAmendments from "./MasterlistAmendments";
import MasterlistWorkflow from "./MasterlistWorkflow";
import MasterlistAddition from "./MasterlistAddition";
import MasterlistConsolidation from "./MasterlistConsolidation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { Access } from "../server/authorization/policy";
import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import type {
  DraftCandidate,
  DraftDetail,
  Masterlist,
} from "../server/masterlists/model";
type Page<T> = { items: T[]; total: number; offset: number; limit: number };
const failure = (e: unknown) =>
  e instanceof ApiError
    ? e
    : "Result unconfirmed. Refresh the draft or retry the same command safely.";
export default function MasterlistsPage({ session }: { session: Session }) {
  const [recovery,setRecovery]=useState(()=>{const c=pendingPrior(session.user.id);return c?.route==="masterlists"?c.path:null;});
  const [route] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] ?? ""));
  const [savedList] = useState(() => {try{return JSON.parse(sessionStorage.getItem("masterlist-list-view") ?? "{}");}catch{return {};}});
  const [listQuery,setListQuery]=useState<string>(savedList.query ?? ""),[listSearch,setListSearch]=useState<string>(savedList.query ?? "");
  const [candidateLimit,setCandidateLimit]=useState([25,50,100].includes(Number(route.get("limit")))?Number(route.get("limit")):25);
  const [issuesFor,setIssuesFor]=useState<DraftCandidate|null>(null);
  const [uncertainCommand,setUncertainCommand]=useState<{path:string;body:unknown;success:string}|null>(null);
  const [listScope, setListScope] = useState<"current" | "history">(route.get("scope") === "history" ? "history" : "current");
  const [checkedCandidates, setCheckedCandidates] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "page">("page"), [selectionPending, setSelectionPending] = useState(false);
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkBusy = useRef(false);
  const [access, setAccess] = useState<Access | null>(null),
    [years, setYears] = useState<ConfigRecord[]>([]),
    [list, setList] = useState<Page<Masterlist> | null>(null),
    [detail, setDetail] = useState<DraftDetail | null>(null),
    [candidates, setCandidates] = useState<Page<DraftCandidate> | null>(null);
  const [selected, setSelected] = useState(route.get("draft") ?? ""),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState<number>(savedList.scope === (route.get("scope") === "history" ? "history" : "current") ? Number(savedList.offset)||0 : 0),
    [candidateOffset, setCandidateOffset] = useState(Math.max(0, Number(route.get("offset")) || 0)),
    [q, setQ] = useState(route.get("q") ?? ""),
    [search, setSearch] = useState(route.get("q") ?? "");
  const [error, setError] = useState<string | ApiError>(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [detailLoading, setDetailLoading] = useState(false),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState<null | {
    action: "create" | "remove" | "refresh";
    scholarId: string;
    name: string;
    target?: {id:string;version:number;title:string};
  }>(null);
  const conflictRemovalReturn = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!form) {
      const trigger = conflictRemovalReturn.current;
      conflictRemovalReturn.current = null;
      if (trigger?.isConnected) trigger.focus();
    }
  }, [form]);
  const [fields, setFields] = useState({
    title: "",
    academicYearId: "",
    awardNumber: "",
    reason: "",
    reference: "",
  });
  const formElement = useRef<HTMLFormElement>(null);
  const [memberView, setMemberView] = useState<"entries" | "candidates">(route.get("view") === "candidates" ? "candidates" : "entries");
  useEffect(() => {
    const params = new URLSearchParams({ draft: selected, view: memberView, scope: listScope, limit:String(candidateLimit) });
    const previous = new URLSearchParams(window.location.hash.split("?")[1]);
    if (previous.get("draft") === selected) for (const key of ["request", "version", "amendments", "workflow"]) { const value=previous.get(key); if(value) params.set(key,value); }
    if (q) params.set("q", q);
    if (candidateOffset) params.set("offset", String(candidateOffset));
    window.history.replaceState(null, "", selected ? `#masterlists?${params}` : `#masterlists?scope=${listScope}`);
  }, [selected, memberView, q, candidateOffset, listScope, candidateLimit]);
  useEffect(()=>{sessionStorage.setItem("masterlist-list-view",JSON.stringify({query:listQuery,offset,scope:listScope}));},[listQuery,offset,listScope]);
  useEffect(()=>{if(!selected&&!loading)requestAnimationFrame(()=>window.scrollTo(0,Number(sessionStorage.getItem("masterlist-list-scroll"))||0));},[selected,loading]);
  const [review, setReview] = useState<DraftCandidate | null>(null);
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const allowed = access?.permissions.some(
    (p) => p.code === "masterlists.prepare",
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      const a = await request<Access>("me/permissions", {
        signal: controller.signal,
      });
      if (!active) return;
      setAccess(a);
      if (!a.permissions.some((p) => p.code === "masterlists.prepare")) return;
      const records: ConfigRecord[] = [];
      while (true) {
        const page = await request<ConfigList>(
          `configuration/academic-years?includeArchived=true&limit=100&offset=${records.length}`,
          { signal: controller.signal },
        );
        records.push(...page.items);
        if (records.length >= page.total || !page.items.length) break;
      }
      const drafts = await request<Page<Masterlist>>(
        `masterlists?offset=${offset}&scope=${listScope}&q=${encodeURIComponent(listQuery)}`,
        { signal: controller.signal },
      );
      if (active) {
        setYears(records);
        setList(drafts);
      }
    })()
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [offset, revision, listScope, listQuery]);
  useEffect(() => {
    if (!selected || !allowed) return;
    let active = true;
    const controller = new AbortController();
    Promise.all([
      request<DraftDetail>(`masterlists/${selected}`, {
        signal: controller.signal,
      }),
      request<Page<DraftCandidate>>(
        `masterlists/${selected}/candidates?q=${encodeURIComponent(q)}&offset=${candidateOffset}&limit=${candidateLimit}`,
        { signal: controller.signal },
      ),
    ])
      .then(([d, c]) => {
        if (active) {
          setCheckedCandidates([]);
          setDetail(d);
          setCandidates(c);
        }
      })
      .catch((e) => {
        if (active) setError(failure(e));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selected, allowed, revision, q, candidateOffset, candidateLimit]);
  useEffect(() => {
    if (!form) return;
    formElement.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (form.action !== "refresh") return;
    let active = true;
    const controller = new AbortController();
    request<Page<DraftCandidate>>(
      `masterlists/${selected}/candidates?q=${encodeURIComponent(form.name)}`,
      { signal: controller.signal },
    )
      .then((page) => {
        if (active)
          setReview(
            page.items.find((c) => c.scholarId === form.scholarId) ?? null,
          );
      })
      .catch((e) => {
        if (active) setError(failure(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [form, selected]);
  function refresh() {
    setError("");
    setForm(null);
    setLoading(true);
    if (selected) setDetailLoading(true);
    setRevision((n) => n + 1);
  }
  function openForm(
    action: "create" | "remove" | "refresh",
    scholarId = "",
    name = "",
    awardNumber = "",
    academicYearId = "",
    target?: {id:string;version:number;title:string},
  ) {
    setReview(null);
    setForm({ action, scholarId, name, target });
    setFields({
      title: "",
      academicYearId: academicYearId || newRecordYear(years, [], "", ""),
      awardNumber,
      reason: "",
      reference: "",
    });
    setError("");
    setNotice("");
    pending.current = null;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || busy.current) return;
    const body =
      form.action === "create"
        ? {
            title: fields.title,
            academicYearId: fields.academicYearId,
            ...(form.target?{targetId:form.target.id,targetVersion:form.target.version}:{}),
            reason: fields.reason,
            reference: fields.reference,
          }
        : {
            action: form.action,
            expectedVersion: detail!.version,
            scholarId: form.scholarId,
            awardNumber:
              form.action === "remove"
                ? null
                : fields.awardNumber.trim() || null,
            reason: fields.reason,
            reference: fields.reference,
          };
    await saveDraft(
      form.action === "create" ? "masterlists" : `masterlists/${selected}/entries`,
      body,
      form.action === "create" ? "Draft created. Add scholars below." : form.action === "remove" ? `${form.name} removed from this draft. The scholar profile is unchanged.` : "Entry saved.",
    );
  }
  async function addCandidate(candidate: DraftCandidate) {
    if (!detail || disabled || form || detail.unavailable || candidate.issues.length || busy.current) return;
    await saveDraft(`masterlists/${detail.id}/entries`, {
      action: "add",
      expectedVersion: detail.version,
      scholarId: candidate.scholarId,
      awardNumber: null,
      reason: "",
      reference: "",
    }, `${candidate.name} added to the draft.`);
  }
  async function saveDraft(path: string, body: unknown, success: string) {
    if (busy.current) return;
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ id: string; version: number }>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setUncertainCommand(null);
      setForm(null);
      setSelected(result.id);
      if (path === "masterlists") setMemberView("candidates");
      setDetailLoading(true);
      setLoading(true);
      setRevision((n) => n + 1);
      setNotice(success);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status >= 500) setUncertainCommand({path,body,success});
      else setUncertainCommand(null);
      setError(failure(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function reviewSelected() {
    if (!detail || disabled || form || detail.unavailable) return;
    const rows = candidates?.items.filter(c => checkedCandidates.includes(c.scholarId) && !c.issues.length && !detail.entries.some(e => e.scholarId === c.scholarId)) ?? [];
    setBulkJobs(rows.map((c, index) => ({ id: c.scholarId, label: c.name, path: `masterlists/${detail.id}/entries`, key: crypto.randomUUID(), body: { action: "add", expectedVersion: detail.version + index, scholarId: c.scholarId, awardNumber: null, reason: "", reference: "" } })));
  }
  async function saveSelected() {
    if (bulkBusy.current) return;
    bulkBusy.current = true; setBulkSaving(true);
    try { await runBulkJobs(bulkJobs, job => request(job.path, { body: job.body, key: job.key, csrf: session.csrfToken }), setBulkJobs); }
    finally { bulkBusy.current = false; setBulkSaving(false); }
  }
  const selectableCandidates = candidates?.items.filter(c => !c.issues.length && !detail?.entries.some(e => e.scholarId === c.scholarId)) ?? [];
  const disabled = loading || detailLoading || saving || selectionPending || !!uncertainCommand || bulkJobs.length > 0;
  return (
    <section className="scholars-page masterlists-workspace">
      {recovery&&<PayoutCommandRecovery workspace="masterlists" session={session} path={recovery} onResolved={()=>{setRecovery(null);refresh();}}/>}
      <div className="section-heading">
        <div>
          <h1>{detail?.title ?? "Masterlists"}</h1>
          <p>
            {detail ? `${detail.yearCode} \u00b7 ${detail.status.replaceAll("_", " ")} \u00b7 ${detail.count} ${detail.count === 1 ? "scholar" : "scholars"}` : "Prepare drafts and manage official membership."}
          </p>
        </div>
        <button
          className="btn btn-outline-secondary"
          disabled={disabled}
          onClick={refresh}
        >
          Refresh
        </button>
      </div>
      {!form && <ErrorNotice error={error} />}
      {bulkJobs.length > 0 && <BulkReview modal jobs={bulkJobs} busy={bulkSaving} title="Add selected scholars to this draft" context={detail ? `${detail.title} · ${detail.yearCode}` : undefined} onRun={() => void saveSelected()} onClose={() => { const attempted = bulkJobs.some(job => job.saved || job.error); setBulkJobs([]); if (attempted) { setCheckedCandidates([]); refresh(); } }} />}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading drafts...</p>}
      {access && !allowed && (
        <p className="alert alert-info">
          Masterlist preparation is available to Staff and Coordinators. Your
          account does not have this permission.
        </p>
      )}
      {allowed && (
        <>

          {!years.some((y) => !y.archived && !y.locked) && !loading && (
            <p>
              Configure an active, unlocked academic year before creating a
              draft.
            </p>
          )}
          {form && (
            <FocusedDialog title={form.action === "create" ? "Create masterlist draft" : form.action === "remove" ? "Remove scholar from draft" : "Review draft entry"} busy={saving || !!uncertainCommand} onClose={()=>setForm(null)}>
            <form
              ref={formElement}
              className="border rounded p-3 mb-3"
              onSubmit={submit}
            >
              <ErrorNotice error={error} /><fieldset disabled={disabled}>
                <legend className="visually-hidden">
                  {form.action === "create"
                    ? "Create masterlist draft"
                    : form.action === "remove" ? `Remove scholar: ${form.name}` : `Refresh candidate: ${form.name}`}
                </legend>
                {form.action === "create" && (
                  <>
                    <p className="alert alert-info">{form.target?`Addition to: ${form.target.title}. Creation and attachment are saved together.`:"This creates an independent masterlist. To extend an official list, open it and choose Create addition to this masterlist."}</p>
                    <label className="form-label" htmlFor="draft-title">
                      Draft title
                    </label>
                    <input
                      className="form-control mb-3"
                      id="draft-title"
                      required
                      maxLength={160}
                      value={fields.title}
                      onChange={(e) =>
                        setFields({ ...fields, title: e.target.value })
                      }
                    />
                    <label className="form-label" htmlFor="draft-year">
                      Draft academic year
                    </label>
                    <select
                      className="form-select mb-3"
                      id="draft-year"
                      disabled={!!form.target}
                      required
                      value={fields.academicYearId}
                      onChange={(e) =>
                        setFields({ ...fields, academicYearId: e.target.value })
                      }
                    >
                      <option value="">Select academic year</option>
                      {years
                        .filter((y) => y.working !== false && !y.archived && !y.locked)
                        .map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.code} - {y.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}
                {form.action === "refresh" && (
                  <>
                    <p>
                      Confirm this scholar's current details for the draft.
                    </p>
                    <label className="form-label" htmlFor="draft-award">
                      Award number (optional in draft)
                    </label>
                    <input
                      className="form-control mb-3"
                      id="draft-award"
                      maxLength={60}
                      value={fields.awardNumber}
                      onChange={(e) =>
                        setFields({ ...fields, awardNumber: e.target.value })
                      }
                    />
                    <p>
                      Separate from the permanent Scholar ID. Leave blank when
                      not assigned.
                    </p>
                  </>
                )}
                {form.action === "refresh" &&
                  (review ? (
                    <div className="alert alert-info">
                      <strong>Current source for review</strong>
                      {review.snapshot ? (
                        <p>
                          {review.snapshot.name} -{" "}
                          {review.snapshot.placement.school.name} -{" "}
                          {review.snapshot.placement.course.name} -{" "}
                          {review.snapshot.placement.yearLevel}
                        </p>
                      ) : (
                        <ul>
                          {review.issues.map((i) => (
                            <li key={i.code}>{i.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p role="status">
                      Loading current candidate information...
                    </p>
                  ))}
                {form.action === "remove" && (
                  <p>
                    Remove <strong className="ml-removal-identity">{form.name}</strong> from <strong>{detail?.title} · {detail?.yearCode}</strong>?
                    {" "}Their profile and scholarship status stay unchanged. The removal is recorded in history.
                  </p>
                )}
                <RoutineEvidence routine={form.action !== "remove"}>{(
                  [
                    {
                      key: "reason",
                      label: form.action === "remove" ? "Reason for removal" : "Draft change reason",
                      min: 5,
                      max: 500,
                    },
                    {
                      key: "reference",
                      label: "Physical-record reference (optional)",
                      min: 3,
                      max: 300,
                    },
                  ] as const
                ).map(({ key, label, min, max }) => (
                  <div key={key} className="mb-3">
                    <label className="form-label" htmlFor={`draft-${key}`}>
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={`draft-${key}`}
                      required
                      minLength={min}
                      maxLength={max}
                      value={fields[key]}
                      onChange={(e) =>
                        setFields({ ...fields, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}</RoutineEvidence>
                <div className="d-flex gap-2">
                  <ActionButton pending={saving}
                    className={form.action === "remove" ? "btn btn-danger" : "btn configuration-primary"}
                    type="submit"
                    disabled={
                      form.action === "refresh" &&
                      (!review || review.issues.length > 0)
                    }
                  >
                    {saving ? "Saving..." : form.action === "remove" ? "Remove from draft" : form.action === "create" ? "Create draft" : "Save reviewed entry"}
                  </ActionButton>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setForm(null)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>{uncertainCommand && <><p role="alert">Result unconfirmed. Retry the same action before leaving.</p><button className="btn configuration-primary" disabled={saving} onClick={()=>void saveDraft(uncertainCommand.path,uncertainCommand.body,uncertainCommand.success)}>Retry the same action</button></>}</FocusedDialog>
          )}
          {uncertainCommand && !form && <FocusedDialog title="Masterlist result not confirmed" busy onClose={()=>{}}><p>Retry the same action before leaving this list.</p><button className="btn configuration-primary" disabled={saving} onClick={()=>void saveDraft(uncertainCommand.path,uncertainCommand.body,uncertainCommand.success)}>Retry the same action</button></FocusedDialog>}
          {issuesFor && <FocusedDialog title={`Needs attention: ${issuesFor.name}`} onClose={()=>setIssuesFor(null)}><p>{issuesFor.humanId}</p><ul>{issuesFor.issues.map(i=><li key={i.code}>{i.message}<ScholarIssueAction code={i.code} scholarId={issuesFor.scholarId} yearId={detail?.academicYearId ?? ""}/></li>)}</ul></FocusedDialog>}
          <div hidden={!!selected}>
          <div className="d-flex flex-wrap align-items-center gap-2 my-3" aria-label="Masterlist views">
            {(["current", "history"] as const).map(scope => <button key={scope} type="button" aria-pressed={listScope === scope} className="btn btn-outline-secondary workspace-view-button" disabled={loading || !!form} onClick={() => {if (scope === listScope) return;setListScope(scope);setOffset(0);setList(null);setLoading(true);}}>{scope === "current" ? "Current masterlists" : "History"}</button>)}
          {!selected && <button
            className="btn configuration-primary"
            disabled={
              disabled || !!form || !years.some((y) => !y.archived && !y.locked)
            }
            onClick={() => openForm("create")}
          >
            Create draft
          </button>}
          </div>
          <h2 className="h4">{listScope === "current" ? "Current masterlists" : "Masterlist history"}</h2>
          <p className="text-muted">{listScope === "current" ? "Latest official lists and active drafts for the working academic year. Earlier publications are kept in History." : "Earlier revisions and past academic years. Original records remain available for reference."}</p>
          {!loading && !list?.items.length && <p>{listScope === "current" ? "No current masterlists. Create a draft to get started, or open History to view earlier records." : "No historical masterlists on this page."}</p>}
          <form className="list-toolbar" onSubmit={e=>{e.preventDefault();setListQuery(listSearch.trim());setOffset(0);setLoading(true);setRevision(n=>n+1);}}>
            <label className="search-field"><span className="visually-hidden">Search masterlist titles</span><input className="form-control" type="search" placeholder="Search masterlist titles" maxLength={100} value={listSearch} onChange={e=>setListSearch(e.target.value)}/></label>
            <button className="btn btn-outline-secondary" disabled={disabled}>Search</button><span role="status">{list?.total ?? 0} {list?.total === 1 ? "masterlist" : "masterlists"}</span>
          </form>
          {!!list?.items.length && <div className="table-responsive masterlist-table-scroll" role="region" aria-label="Saved masterlists" tabIndex={0}><table className="table compact-table masterlist-list-table"><thead><tr><th>Masterlist</th><th>Academic year</th><th>Scholars</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {list.items.map(d=><tr key={d.id} className={listScope==="current" && ["published","locked"].includes(d.status)?"current-official-row":""}>
            <td><span className="masterlist-title" tabIndex={0} title={d.title}>{d.title}</span>{listScope==="current"&&["published","locked"].includes(d.status)&&<small>Current official list</small>}{d.latestId!==d.id&&<small>Historical revision</small>}</td>
            <td>{d.yearCode}</td><td>{d.count}</td><td><span className="status-badge">{d.status.replaceAll("_"," ")}</span></td>
            <td><button className="btn btn-sm configuration-primary" disabled={disabled||!!form} aria-label={`Open ${d.title}`} onClick={()=>{
              sessionStorage.setItem("masterlist-list-scroll",String(window.scrollY));
              window.history.pushState(null,"",`#masterlists?draft=${d.id}&scope=${listScope}`);
              setSelected(d.id);setMemberView(d.count===0?"candidates":"entries");setDetail(null);setDetailLoading(true);setCandidateOffset(0);setQ("");setSearch("");setRevision(n=>n+1);setError("");setNotice("");window.scrollTo(0,0);
            }}>Open</button></td>
          </tr>)}
          </tbody></table></div>}
          {list && (
            <div className="d-flex gap-2 my-3" hidden={list.total <= 25}>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled || !!form || offset === 0}
                onClick={() => {
                  setLoading(true);
                  setOffset((n) => Math.max(0, n - 25));
                }}
              >
                Previous masterlists
              </button>
              <span>{list.total} masterlists</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled || !!form || offset + 25 >= list.total}
                onClick={() => {
                  setLoading(true);
                  setOffset((n) => n + 25);
                }}
              >
                Next masterlists
              </button>
            </div>
          )}
          </div>
          {selected && <button className="btn btn-outline-secondary back-link" disabled={disabled || !!form} onClick={() => { setSelected(""); setDetail(null); setCandidates(null); }}>Back to masterlists</button>}
          {detailLoading && <p role="status">Loading draft validation...</p>}
          {detail && (
            <div className="masterlist-detail">
              {["published", "locked"].includes(detail.status) && <div className="mb-3">
                <p className="text-muted">Official membership is read-only. Additions create a reviewed revision.</p>
                {detail.latestId && detail.latestId!==detail.id ? <a href={`#masterlists?draft=${detail.latestId}`}>Historical revision - open latest official publication</a> : years.some(y => y.id === detail.academicYearId && !y.locked && !y.archived) ? <button type="button" className="btn configuration-primary" disabled={disabled || !!form} onClick={() => openForm("create", "", "", "", detail.academicYearId, {id:detail.id,version:detail.version,title:detail.title})}>Create addition to this masterlist</button> : <p>This academic year is locked or archived, so new drafts cannot be prepared.</p>}
              </div>}
              {["published", "locked"].includes(detail.status) && (
                <details className="secondary-details" open={route.get("amendments") === "1" || undefined}><summary>Official versions & amendments</summary><MasterlistAmendments
                  key={detail.id + "-amendments"}
                  detail={detail}
                  session={session}
                  access={access!}
                  onOpen={(id) => {
                    setSelected(id);
                    setMemberView("entries");
                    setDetail(null);
                    setForm(null);
                    setDetailLoading(true);
                    setCandidateOffset(0);
                    setQ("");
                    setSearch("");
                    setRevision((n) => n + 1);
                    setError("");
                    setNotice("");
                  }}
                /></details>
              )}
              {detail.status === "published" && access?.permissions.some(p=>p.code==="masterlists.lock") && <details className="secondary-details" open={route.get("workflow")==="1" || undefined}><summary>Lock published official list</summary><MasterlistWorkflow listTitle={detail.title} proposalKind={detail.proposalKind} key={`lock-${detail.id}`} id={detail.id} version={detail.version} session={session} access={access} disabled={disabled || !!form} validation={detail.validation} onChanged={refresh}/></details>}
              {!["published","locked"].includes(detail.status) && <>
              <MasterlistWorkflow listTitle={detail.title}
                proposalKind={detail.proposalKind}
                key={`workflow-${detail.id}`}
                id={detail.id}
                version={detail.version}
                session={session}
                access={access!}
                disabled={disabled || !!form}
                validation={detail.validation}
                onChanged={refresh}
              />
              </>}

              {detail.proposalKind === "standalone" && !["published", "locked"].includes(detail.status) && <MasterlistConflicts key={`conflicts-${detail.id}-${detail.version}`} id={detail.id} count={detail.validation.issues.filter(i => ["ALREADY_ACTIVATED", "OPERATIONAL_STANDING_REVIEW"].includes(i.code)).length} disabled={disabled || !!form} session={session} onPending={setSelectionPending} onRemoved={result => { setNotice(`${result.removedCount.toLocaleString()} confirmed conflicting draft memberships removed atomically. ${result.remainingCount.toLocaleString()} members remain. Resubmission and approval are required.`); refresh(); }} onReviewRemoval={detail.status === "draft" && !detail.unavailable ? (member, trigger) => { conflictRemovalReturn.current = trigger; openForm("remove", member.scholarId, `${member.name} (${member.humanId ?? "No permanent ID"})`); } : undefined} />}
              {detail.count > 0 && !detail.validation.valid && detail.validation.issues.some(i => !["ALREADY_ACTIVATED", "OPERATIONAL_STANDING_REVIEW"].includes(i.code)) && <details className="secondary-details" open><summary>{detail.validation.valid ? "Checks passed" : "Needs attention"}</summary>
                <strong>
                  {detail.validation.valid
                    ? detail.status === "published" ||
                      detail.status === "locked"
                      ? "Current source comparison passed"
                      : "Masterlist validation passed"
                    : detail.status === "published" ||
                        detail.status === "locked"
                      ? "Current sources differ; official snapshot remains unchanged"
                      : "Masterlist needs attention"}
                </strong>
                {!!detail.validation.issues.length && (
                  <ul className="mb-0">
                    {detail.validation.issues.filter(i => !["ALREADY_ACTIVATED", "OPERATIONAL_STANDING_REVIEW"].includes(i.code)).map((i, n) => (
                      <li key={n}>
                        {i.scholarId
                          ? `${detail.entries.find((e) => e.scholarId === i.scholarId)?.snapshot.humanId ?? "Candidate"}: `
                          : ""}
                        {i.message}
                        {i.scholarId && <ScholarIssueAction code={i.code} scholarId={i.scholarId} yearId={detail.academicYearId} />}
                      </li>
                    ))}
                  </ul>
                )}
              </details>}
              {detail.unavailable && !["published", "locked"].includes(detail.status) && (
                <p className="alert alert-info">{detail.status === "draft" ? "The academic year is locked or archived. Entries are read-only." : "This list is in review or approval. A Coordinator must return it to Draft before entries can change."}</p>
              )}
              {detail.status === "draft" && !detail.unavailable && <nav className="filter-pills" aria-label="Masterlist tasks">
                <button type="button" aria-pressed={memberView === "entries"} disabled={disabled} onClick={() => setMemberView("entries")}>Scholars on list ({detail.count})</button>
                <button type="button" aria-pressed={memberView === "candidates"} disabled={disabled} onClick={() => setMemberView("candidates")}>Add scholars</button>
              </nav>}
              {(memberView === "entries" || detail.status !== "draft" || detail.unavailable) && <div>
              <h3 className="h5">Scholars on this list ({detail.count})</h3>
              {!detail.count ? <p className="empty-state">No scholars added yet. Use Add scholars to get started.</p> : <PagedTable pageSizes={[25,50,100]} storageKey={`masterlist-members-${detail.id}`} key={`entries-${detail.id}`} items={detail.entries} label="Masterlist entries" columns={["Scholar ID", "Scholar name", "School / Year", "Review", "Actions"]} searchText={e => `${e.snapshot.name} ${e.snapshot.humanId}`} row={e => <tr key={e.id}>
                <td className="permanent-id">{e.snapshot.humanId}</td>
                <td><span className="masterlist-title" tabIndex={0} title={e.snapshot.name}>{e.snapshot.name}</span>{e.awardNumber && <small>Award: {e.awardNumber}</small>}</td>
                <td>{e.snapshot.placement.school.name}<small>{yearLevelLabel(e.snapshot.placement.yearLevel)} · {e.snapshot.placement.course.name}</small></td>
                <td>{detail.validation.issues.some(i=>i.scholarId===e.scholarId)?<button className="btn btn-sm btn-outline-secondary" onClick={()=>setIssuesFor({scholarId:e.scholarId,humanId:e.snapshot.humanId,name:e.snapshot.name,snapshot:e.snapshot,issues:detail.validation.issues.filter(i=>i.scholarId===e.scholarId)})}>View reasons</button>:<span>{["published","locked"].includes(detail.status)?"Official member":"Checks passed"}</span>}</td>
                <td><a className="btn btn-sm btn-outline-secondary" href={`#scholars?scholar=${e.scholarId}&academicYear=${detail.academicYearId}`}>View</a>
                  {detail.status === "draft" && !detail.unavailable && <><button type="button" className="btn btn-sm btn-outline-danger" disabled={disabled || !!form} onClick={() => openForm("remove", e.scholarId, `${e.snapshot.name} (${e.snapshot.humanId})`)}>Remove</button><details><summary>Edit entry</summary><button className="btn btn-sm btn-outline-secondary" disabled={disabled || !!form} onClick={() => openForm("refresh", e.scholarId, e.snapshot.humanId, e.awardNumber ?? "")}>Review / refresh</button></details></>}
                </td>
              </tr>} />}
              </div>}
              {memberView === "candidates" && detail.status === "draft" && !detail.unavailable && <div>
              <p>Find scholars to add for {detail.yearCode}.</p>
              <form
                className="d-flex flex-wrap gap-2 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDetailLoading(true);
                  setQ(search.trim());
                  setCandidateOffset(0);
                  setRevision((n) => n + 1);
                }}
              >
                <label htmlFor="candidate-search" className="visually-hidden">
                  Candidate name or Scholar ID
                </label>
                <input
                  className="form-control"
                  id="candidate-search"
                  placeholder="Name or Scholar ID"
                  maxLength={100}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="btn btn-outline-secondary"
                  disabled={disabled || !!form}
                >
                  Search candidates
                </button>
              </form>
              {detail.proposalKind === "standalone" ? <MasterlistSelection key={`${detail.id}-${q}`} detail={detail} candidates={candidates?.items ?? []} checkedIds={checkedCandidates} setCheckedIds={setCheckedCandidates} mode={selectionMode} setMode={setSelectionMode} q={q} disabled={disabled || !!form} session={session} onPending={setSelectionPending} onAdded={result => { setNotice(`${result.addedCount.toLocaleString()} reviewed eligible scholars added atomically to this draft. Approval and publication remain separate.`); refresh(); }} /> : <div className="candidate-selection-bar" role="region" aria-label="Selected scholar actions" tabIndex={-1}>
                <span role="status"><strong>{checkedCandidates.length} selected</strong><small>Eligible scholars on this page</small></span>
                <button type="button" className="btn btn-outline-secondary" disabled={disabled || !!form || !selectableCandidates.length} onClick={() => setCheckedCandidates(selectableCandidates.map(c => c.scholarId))}>Select all eligible ({selectableCandidates.length})</button>
                <button type="button" className="btn btn-outline-secondary" disabled={disabled || !checkedCandidates.length} onClick={() => setCheckedCandidates([])}>Clear</button>
                <button type="button" className="btn configuration-primary" disabled={disabled || !!form || !checkedCandidates.length} onClick={reviewSelected}>Add selected ({checkedCandidates.length})</button>
              </div>}
              <div className="table-responsive" role="region" aria-label="Candidates to add" tabIndex={0}>
                <table className="table compact-table candidate-table">
                  <thead><tr><th scope="col"><input type="checkbox" aria-label="Select all eligible candidates on this page" disabled={disabled || !selectableCandidates.length} checked={selectableCandidates.length > 0 && checkedCandidates.length === selectableCandidates.length} onChange={e => { setSelectionMode("page"); setCheckedCandidates(e.target.checked ? selectableCandidates.map(c => c.scholarId) : []); }} /></th><th scope="col">Scholar</th><th scope="col">School / year</th><th scope="col">Action</th></tr></thead>
                  <tbody>{candidates?.items.map(c => <tr key={c.scholarId}>
                    <td><input type="checkbox" aria-label={`Select ${c.name} for masterlist`} disabled={disabled || !!c.issues.length || detail.entries.some(e => e.scholarId === c.scholarId)} checked={checkedCandidates.includes(c.scholarId)} onChange={e => { setSelectionMode("page"); setCheckedCandidates(prev => e.target.checked ? [...prev,c.scholarId] : prev.filter(id=>id!==c.scholarId)); }} /></td>
                    <td><span className="masterlist-title" tabIndex={0} title={c.name}>{c.name}</span><small className="permanent-id">{c.humanId}</small>{c.activationConflict?.masterlistId && <small><span className="status-badge status-warning">Already activated</span> <a href={`#masterlists?draft=${c.activationConflict.masterlistId}`}>{c.activationConflict.title}</a></small>}</td>
                    <td>{c.snapshot ? <>{c.snapshot.placement.school.name}<small>{yearLevelLabel(c.snapshot.placement.yearLevel)} / {c.snapshot.placement.course.name}</small></> : c.issues.some(i => i.code === "ACADEMIC_RECORD_REQUIRED") ? "Academic details required" : "Available after eligibility checks pass"}</td>
                    <td>{detail.entries.some(e => e.scholarId === c.scholarId) ? <span className="status-badge status-success">Added</span> : c.issues.length ? <button className="btn btn-sm btn-outline-secondary" onClick={()=>setIssuesFor(c)}>View reasons ({c.issues.length})</button> : <button type="button" className="btn btn-sm configuration-primary" aria-label={`Add ${c.name} to list`} disabled={disabled || !!form} onClick={() => void addCandidate(c)}>Add to list</button>}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              {candidates?.items.length === 0 && <p className="empty-state">No scholars found. Try another name or Scholar ID.</p>}
              {candidates && (
                <div className="d-flex flex-wrap gap-2 my-3">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={disabled || !!form || candidateOffset === 0}
                    onClick={() => {
                      setDetailLoading(true);
                      setCandidateOffset((n) => Math.max(0, n - candidateLimit));
                    }}
                  >
                    Previous candidates
                  </button>
                  <label className="page-size-control">Rows<select className="form-select" aria-label="Candidates per page" value={candidateLimit} disabled={disabled} onChange={e=>{setCandidateLimit(Number(e.target.value));setCandidateOffset(0);setDetailLoading(true);}}>{[25,50,100].map(n=><option key={n}>{n}</option>)}</select></label>
                  <span>{candidates.total ? `${candidateOffset + 1}-${candidateOffset + candidates.items.length} of ${candidates.total}` : "0 matches"}</span>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={
                      disabled ||
                      !!form ||
                      candidateOffset + candidateLimit >= candidates.total
                    }
                    onClick={() => {
                      setDetailLoading(true);
                      setCandidateOffset((n) => n + candidateLimit);
                    }}
                  >
                    Next candidates
                  </button>
                </div>
              )}
              </div>}
              {["published","locked"].includes(detail.status) && <details className="secondary-details"><summary>Publication and workflow history</summary>
              <MasterlistWorkflow listTitle={detail.title}
                proposalKind={detail.proposalKind}
                key={`workflow-${detail.id}`}
                id={detail.id}
                version={detail.version}
                session={session}
                access={access!}
                disabled={disabled || !!form}
                validation={detail.validation}
                onChanged={refresh}
              />
              </details>}
              <details className="secondary-details"><summary>Record details</summary><p>Revision {detail.version} · {detail.revisionKind ?? detail.proposalKind ?? "Draft"}</p></details>
              <MasterlistAddition key={`addition-${detail.id}`} detail={detail} session={session} onChanged={refresh} />
              {["published","locked"].includes(detail.status) && detail.latestId===detail.id && <MasterlistConsolidation key={`consolidation-${detail.id}`} detail={detail} disabled={disabled} onCreate={body=>saveDraft("masterlists",body,"Consolidation proposal created. Review both frozen memberships before submission.")} />}

            </div>
          )}
        </>
      )}
    </section>
  );
}
