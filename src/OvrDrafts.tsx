import PayrollReprocessing from "./PayrollReprocessing";
import PayrollFormLinks from "./PayrollFormLinks";
import AutomaticPayrollDraft from "./AutomaticPayrollDraft";
import SavedPayrollTable from "./SavedPayrollTable";
import { useActionForm } from "./use-action-form";
import PayrollCandidates from "./PayrollCandidates";
import { payrollSelection, rememberPayroll } from "./payroll-navigation";
import RoutineEvidence from "./RoutineEvidence";
import ErrorNotice from "./ErrorNotice";
import PaymentCorrections from "./PaymentCorrections";
import OvrAmendments from "./OvrAmendments";
import OvrProcessingPanel from "./OvrProcessingPanel";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { OvrBatch, OvrDetail } from "../server/ovr/model";
import type { PayoutCycle } from "../server/payouts/model";
import type { EligibilityView } from "../server/eligibility/model";
type Candidates = {
  items: Pick<EligibilityView, "current" | "effective">[];
  total: number;
};
export default function OvrDrafts({
  cycleId,
  session,
  permissions,
}: {
  cycleId: string;
  session: Session;
  permissions: string[];
}) {
  const focusTreasury=useRef(false);
  const [list, setList] = useState<{
      managed?: boolean;
      cycle: PayoutCycle;
      items: OvrBatch[];
      total: number;
    } | null>(null),
    [offset, setOffset] = useState(0),
    [reload, setReload] = useState(0),
    [selected, updateSelected] = useState<string | null>(() => payrollSelection("cycle") === cycleId ? payrollSelection("batch") : null),
    [detail, setDetail] = useState<OvrDetail | null>(null),
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
  const [issues, setIssues] = useState<
    { code: string; message: string; scholarshipId?: string }[]
  >([]);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const setSelected = (id: string | null) => { rememberPayroll(cycleId, id); updateSelected(id); };
  const message = (e: unknown) =>
    e instanceof ApiError
      ? e
      : "Could not confirm the Payroll result. Refresh or retry the same command safely.";
  const actionForm = useActionForm(action);
  useEffect(() => {
    const followLink = () => {
      const next = payrollSelection("batch");
      if(payrollSelection("cycle") === cycleId && next !== selected) {updateSelected(next);setDetail(null);setAction(null);}
    };
    window.addEventListener("hashchange",followLink);
    return () => window.removeEventListener("hashchange",followLink);
  },[cycleId,selected]);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<{ managed?: boolean; cycle: PayoutCycle; items: OvrBatch[]; total: number }>(
      `payout-cycles/${cycleId}/ovr-batches?offset=${offset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setList(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
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
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<OvrDetail>(`ovr-batches/${selected}`, { signal: c.signal })
      .then((r) => {
        if (active) setDetail(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
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
    const refreshDraft = () => { if (document.visibilityState === "visible") setReload(n => n + 1); };
    window.addEventListener("focus", refreshDraft);
    return () => window.removeEventListener("focus", refreshDraft);
  }, [selected, action, saving, detail?.batch.state]);
  useEffect(() => {
    if (action !== "add") return;
    const c = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => c.abort(), 15000);
    request<Candidates>(
      `payout-cycles/${cycleId}/eligibility?q=${encodeURIComponent(search)}&offset=${candidateOffset}&limit=25`,
      { signal: c.signal },
    )
      .then((r) => {
        if (active) setCandidates(r);
      })
      .catch((e) => {
        if (active) setError(message(e));
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
    setDetail(null);
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
    if (!action || !list || busy.current || (action !== "create" && !detail))
      return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: action === "create" ? 0 : detail!.batch.revision,
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
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
    busy.current = true;
    setSaving(true);
    setError("");
    setIssues([]);
    try {
      const r = await request<OvrBatch>(path, {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
      });
      pending.current = null;
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
  return (
    <section
      className="card p-3 my-3"
      aria-label="Payroll draft batches"
      style={{ overflowWrap: "anywhere" }}
    >
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <h2>{selected ? "Selected payroll" : "Payroll batches"}</h2>
        <button
          className="btn btn-outline-secondary"
          disabled={saving}
          onClick={() => {
            setAction(null);
            refresh();
          }}
        >
          Refresh
        </button>
      </div>
      <p className="muted-line">{list?.managed ? "Choose a batch to review candidates and preview payroll." : "Legacy payroll is read-only. View history and original documents, or ask the Coordinator to review conversion to numbered payroll."}</p>
      <ErrorNotice error={error} />
      {!!issues.length && (
        <ul aria-label="Payroll validation errors">
          {issues.map((i, n) => (
            <li key={n}>
              {i.scholarshipId
                ? `${detail?.entries.find((e) => e.scholarshipId === i.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? i.scholarshipId}: `
                : ""}
              {i.message} ({i.code})
            </li>
          ))}
        </ul>
      )}
      {notice && <p role="status">{notice}</p>}
      {!list ? (
        <p>Loading Payroll batches...</p>
      ) : (
        <>
          {!list.managed && <p role="status">New financial processing requires a numbered payroll. Historical corrections remain controlled and audited.</p>}
          {!selected && <ul className="batch-list my-3">
            {list.items.map((b) => (
              <li key={b.id}>
                <button
                  className="btn btn-link"
                  disabled={saving}
                  onClick={() => {
                    setSelected(b.id);
                    setDetail(null);
                    setAction(null);
                    setError("");
                    setIssues([]);
                    setReload((n) => n + 1);
                  }}
                >
                  Open Payroll {b.code}
                </button>{" "}
                — {b.name} ({b.state}, revision {b.revision})
              </li>
            ))}
          </ul>}
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
      {selected && <button className="btn btn-outline-secondary back-link" disabled={saving} onClick={() => { setSelected(""); setDetail(null); setAction(null); }}>Back to batches</button>}
      {selected && !detail && <p>Loading selected batch...</p>}
      {detail && (
        <section
          className="border-top mt-3 pt-3"
          aria-label="Selected Payroll draft"
        >
          <h3>
            {detail.batch.code} — {detail.batch.name}
          </h3>
          <p>
            {detail.batch.state} · revision {detail.batch.revision} ·{" "}
            {detail.managed ? `${detail.managed.form.rows.length} included in this draft` : `${detail.automatic?.form.rows.length ?? detail.entries.length} entries`}
          </p>
          {(detail.managed || detail.finalization?.snapshot.payrollForm) && <PayrollCandidates detail={detail} session={session} canDefer={permissions.includes("ovr.finalize")} onSaved={refresh} />}
          {detail.automatic && <AutomaticPayrollDraft detail={detail} />}
          <PayrollReprocessing detail={detail} session={session} canManage={permissions.includes("ovr.finalize")} onSaved={refresh} />
          {detail.finalization?.snapshot.legacyPayrollForm && <PayrollFormLinks batchId={detail.batch.id} draft={false} />}
          {detail.finalization && <SavedPayrollTable detail={detail} />}
          <details><summary>Source checks</summary>
          <p
            hidden={Boolean(detail.automatic || detail.managed || detail.finalization?.snapshot.payrollForm)}
            className={`alert ${detail.validation.valid ? "alert-success" : "alert-warning"}`}
          >
            {detail.validation.valid
              ? "Current source validation passed."
              : "Current sources need attention."}{" "}
            Checked {new Date(detail.validation.checkedAt).toLocaleString()}.
          </p>
          {!detail.automatic && !detail.managed && !detail.finalization?.snapshot.payrollForm && !!detail.validation.issues.length && (
            <ul>
              {detail.validation.issues.map((i, n) => (
                <li key={n}>
                  {i.scholarshipId
                    ? `${detail.entries.find((e) => e.scholarshipId === i.scholarshipId)?.evidence.current.sources.scholarship.humanId ?? "Entry"}: `
                    : ""}
                  {i.message} ({i.code})
                </li>
              ))}
            </ul>
          )}
          </details>
          {detail.canEdit ? (
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn configuration-primary"
                disabled={saving || Boolean(detail.automatic && !detail.automatic.form.rows.length) || Boolean(detail.managed && (!detail.managed.cutoffReached || detail.managed.pendingCount || !detail.managed.form.rows.length))}
                onClick={() => choose("submit-review")}
              >
                Submit Payroll for review
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                hidden={Boolean(detail.managed || detail.automatic)}
                onClick={() => choose("add")}
              >
                Add Payroll entry
              </button>
              <button
                className="btn btn-outline-primary"
                disabled={saving}
                hidden={Boolean(detail.managed || detail.automatic)}
                onClick={() => choose("validate")}
              >
                Record draft validation
              </button>
            </div>
          ) : (
            <p hidden={Boolean(detail.finalization)}>
              Membership changes require a Draft batch and an open, available
              payout cycle.
            </p>
          )}
          {detail.batch.state === "review" && (
            <section aria-label="Payroll review">
              <p className="alert alert-warning"><strong>Coordinator action required: review and finalize this payroll.</strong> The Coordinator may finalize their own submitted batch. This approves the batch; it does not record payment.</p>
              <p>
                Submitted by {detail.batch.submission?.actorName}. Membership is
                locked during review.
              </p>
              {permissions.includes("ovr.finalize") &&
                detail.cycle.state === "open" &&
                !detail.cycle.periodUnavailable && (
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-outline-secondary"
                      disabled={saving}
                      onClick={() => choose("return-to-draft")}
                    >
                      Return Payroll to Draft
                    </button>
                    <button
                      className="btn btn-success"
                      disabled={
                        saving
                      }
                      onClick={() => choose("finalize")}
                    >
                      Finalize Payroll
                    </button>
                  </div>
                )}
            </section>
          )}
          {detail.finalization && <><details><summary>Finalization details</summary>
          {detail.finalization && (
            <section
              className="alert alert-info"
              aria-label="Finalized Payroll snapshot"
            >
              <h4>Original finalized roster</h4>
              <p>
                {detail.finalization.snapshot.entries.length} frozen entries,
                finalized by {detail.finalization.snapshot.finalizedByName} at{" "}
                {new Date(
                  detail.finalization.snapshot.finalizedAt,
                ).toLocaleString()}
                .
              </p>
              <p>
                The current source check may change; the finalized snapshot
                remains unchanged.
              </p>
              <details>
                <summary>Frozen roster and evidence</summary>
                <p>Snapshot hash: {detail.finalization.hash}</p>
                <ul>
                  {detail.finalization.snapshot.entries.map((e) => (
                    <li key={e.scholarshipId}>
                      {e.evidence.current.sources.scholarship.humanId} -{" "}
                      {e.evidence.current.sources.scholarship.name}:{" "}
                      {e.evidence.effective.label}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
          </details>
          <details open={detail.batch.state !== "closed"}><summary>Payment processing</summary>
          {detail.finalization && (
            <OvrProcessingPanel
              key={`processing-${detail.batch.id}-${detail.batch.revision}`}
              onTreasurySaved={()=>{focusTreasury.current=true;refresh();}}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          </details>
          <details><summary>Amendments and payment corrections</summary>
          {detail.finalization && !detail.finalization.snapshot.payrollForm && (
            <OvrAmendments
              key={`amendments-${detail.batch.id}-${detail.batch.revision}`}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          {!!detail.payments.length && (
            <PaymentCorrections
              key={`payment-corrections-${detail.batch.id}-${detail.batch.revision}`}
              detail={detail}
              session={session}
              permissions={permissions}
              onSaved={refresh}
            />
          )}
          </details>
          </>}
          <details><summary>Entry evidence</summary>
          {detail.entries.map((entry) => (
            <article
              className="border rounded p-3 my-3"
              key={entry.scholarshipId}
            >
              <h4>
                {entry.evidence.current.sources.scholarship.humanId} —{" "}
                {entry.evidence.current.sources.scholarship.name}
              </h4>
              <p>
                Added at revision {entry.addedRevision}:{" "}
                {entry.evidence.effective.label}.
              </p>
              <p hidden={Boolean(detail.finalization?.snapshot.payrollForm)}>
                Current assessment:{" "}
                {
                  detail.validation.entries.find(
                    (r) => r.scholarshipId === entry.scholarshipId,
                  )?.evidence.effective.label
                }
              </p>
              {detail.canEdit && !detail.managed && !detail.automatic && (
                <button
                  className="btn btn-outline-danger"
                  disabled={saving}
                  onClick={() => choose("remove", entry.scholarshipId)}
                >
                  Remove {entry.evidence.current.sources.scholarship.humanId}{" "}
                  from draft
                </button>
              )}
            </article>
          ))}
          </details>
          <details>
            <summary>Payroll draft history</summary>
            {detail.history.map((h) => (
              <p key={h.revision}>
                Revision {h.revision}: {h.action}, {h.actorName},{" "}
                {new Date(h.recordedAt).toLocaleString()}. {h.reason} (
                {h.reference})
                {h.entry && ` — ${h.entry.humanId}: ${h.entry.name}`}
                {h.validation
                  ? ` — Recorded validation: ${h.validation.valid ? "passed" : "issues found"}`
                  : ""}
              </p>
            ))}
          </details>
        </section>
      )}
      {action && (
        <form ref={actionForm}
          onSubmit={submit}
          className="border-top mt-3 pt-3"
          aria-label="Payroll draft command"
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
                      ? "Submit Payroll for review"
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
                  <p>Loading candidates...</p>
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
                onClick={() => setAction(null)}
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
