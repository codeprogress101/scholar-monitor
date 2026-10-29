import {ActionButton} from "./ActionProgress";
import { useActionForm } from "./use-action-form";
import { useEffect, useState, useRef, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import {
  OPERATIONAL_LABELS,
  OPERATIONAL_STATUSES,
  TERMINAL_STATUSES,
  type OperationalStatus,
  type StatusView,
  type StatusResult,
} from "../server/status/model";
import { configurationRequest as request } from "./configuration-api";
const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Result unconfirmed. Retry the same command safely, or refresh status history.";
export default function StatusPanel({
  id,
  session,
  access,
}: {
  id: string;
  session: Session;
  access: Access;
}) {
  const [view, setView] = useState<StatusView | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<{
    action: "request" | "approve" | "reject" | "cancel";
    id: string;
  } | null>(null);
  const [to, setTo] = useState<OperationalStatus>("on_hold"),
    [finalSemester, setFinalSemester] = useState(""),
    [effectiveOn, setEffectiveOn] = useState(""),
    [code, setCode] = useState(""),
    [reasonCategory, setReasonCategory] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null),
    busy = useRef(false);
  const canRequest = access.permissions.some(
      (p) => p.code === "scholarship.status.request",
    ),
    canApprove = access.permissions.some(
      (p) => p.code === "scholarship.status.approve",
    );
  const terminal = Boolean(
    view?.status && TERMINAL_STATUSES.includes(view.status),
  );
  const original = view?.requests.find(
    (r) =>
      r.decision?.action === "approve" &&
      r.decision.resultingVersion === view.version &&
      r.toStatus === view.status,
  );
  const actionForm = useActionForm(mode);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    request<StatusView>(`scholarships/${id}/status`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setView(data);
      })
      .catch((error) => {
        if (active) setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, revision]);
  function begin(
    action: "request" | "approve" | "reject" | "cancel",
    target = id,
  ) {
    setMode({ action, id: target });
    setError("");
    setNotice("");
    setReason("");
    setReference("");
    setFinalSemester("");
    setCode(terminal ? "RECORDING_CORRECTION" : "");
    setReasonCategory(terminal ? "RECORDING_CORRECTION" : "");
    setTo(
      terminal && original
        ? original.fromStatus
        : view?.status === "active"
          ? "on_hold"
          : "active",
    );
    setEffectiveOn(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
    pending.current = null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode || !view || busy.current) return;
    const path =
      mode.action === "request"
        ? `scholarships/${id}/status/requests`
        : `status-requests/${mode.id}/${mode.action}`;
    const body =
      mode.action === "request"
        ? {
            expectedVersion: view.version,
            toStatus: to,
            kind: terminal ? "correction" : "change",
            ...(terminal ? { correctsRequestId: original?.id } : {}),
            effectiveOn,
            reasonCode: code,
            reason,
            reference,
          }
        : { reason, reference, ...(mode.action === "approve" && view.requests.find(r => r.id === mode.id)?.toStatus === "graduated" ? { finalSemesterId: finalSemester } : {}) };
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await request<StatusResult>(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setMode(null);
      setNotice(
        result.outcome === "pending"
          ? "Request submitted. Current status is unchanged until approval."
          : `Decision recorded: ${result.outcome}.`,
      );
      setLoading(true);
      setRevision((n) => n + 1);
    } catch (error) {
      setError(message(error));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const options = terminal
    ? original
      ? [original.fromStatus]
      : []
    : OPERATIONAL_STATUSES.filter((s) =>
        view?.status === "active"
          ? s !== "active"
          : s === "active" || TERMINAL_STATUSES.includes(s),
      );
  return (
    <section
      className="border-top mt-4 pt-4"
      aria-label="Scholarship status changes"
    >
      <div className="section-heading">
        <h4>Scholarship standing</h4>
        <p className="small">Staff or Coordinator submits a request. The Coordinator approves the change.</p>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={saving || loading}
          onClick={() => {
            setLoading(true);
            setMode(null);
            setError("");
            setRevision((n) => n + 1);
          }}
        >
          Refresh status
        </button>
      </div>
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading status history...</p>}
      {view && (
        <>
          {view.graduation && <p className="alert alert-info"><strong>{view.graduation.label}</strong>{view.graduation.semesterName && ` · Final funded semester: ${view.graduation.semesterName}`}</p>}
          <p>
            <strong>
              {view.graduation ? "Graduated" : view.status ? OPERATIONAL_LABELS[view.status] : "Not activated"}
            </strong>
            {view.effectiveOn && ` - effective ${view.effectiveOn}`}
          </p>
          {view.graduation ? <p>Graduation is already recorded. No second graduation is needed. Previous decisions remain in the history below.</p> : !view.status ? (
            <p className="alert alert-info">
              Status changes become available after official masterlist
              activation. Qualification alone does not activate this record.
            </p>
          ) : (
            <p>
              {view.statusAllowsPayout
                ? "Active status alone does not establish payout eligibility; other eligibility checks remain required."
                : "This status does not permit normal payout eligibility."}
            </p>
          )}
          {view.periodUnavailable && (
            <p className="alert alert-warning">
              This year is locked or archived. New requests and approvals are
              blocked; pending requests may still be rejected or cancelled.
            </p>
          )}
          {terminal && (
            <p className="alert alert-warning">
              Terminal state. Reversal requires a correction linked to the
              original approved decision, a reason/reference, and the
              Coordinator's approval.
            </p>
          )}
          {!mode && view.status && canRequest && !view.graduation?.archived && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={
                saving ||
                loading ||
                view.periodUnavailable ||
                (terminal && !original)
              }
              onClick={() => begin("request")}
            >
              {terminal
                ? "Request controlled correction"
                : "Request status change"}
            </button>
          )}
          {!mode && view.status && !terminal && !view.graduation && canRequest && !view.periodUnavailable && <button className="btn configuration-primary ms-2" onClick={() => { begin("request"); setTo("graduated"); setCode("GRADUATION"); setReasonCategory("GRADUATION"); }}>Mark as Graduated</button>}
          {mode && (
            <form ref={actionForm} className="border rounded p-3 my-3" onSubmit={submit}>
              <fieldset disabled={saving || loading}>
                <legend className="h5">
                  {mode.action === "request"
                    ? terminal
                      ? "Request controlled correction"
                      : "Request status change"
                    : `${mode.action[0].toUpperCase() + mode.action.slice(1)} status request`}
                </legend>
                <p className="alert alert-info"><strong>{mode.action === "request" ? `${view.status ? OPERATIONAL_LABELS[view.status] : "Not activated"} \u2192 ${OPERATIONAL_LABELS[to]}` : (() => { const r = view.requests.find(r => r.id === mode.id); return r ? `${OPERATIONAL_LABELS[r.fromStatus]} \u2192 ${OPERATIONAL_LABELS[r.toStatus]}` : ""; })()}</strong></p>
                {mode.action === "approve" && (
                  <p>
                    Approval applies the requested state and effective date.
                    Review the request below before confirming.
                  </p>
                )}
                {mode.action === "request" && (
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-target">
                        Requested status
                      </label>
                      <select
                        id="status-target"
                        className="form-select"
                        value={to}
                        onChange={(e) => {
                          setTo(e.target.value as OperationalStatus);
                          setCode(terminal ? "RECORDING_CORRECTION" : ""); setReasonCategory(terminal ? "RECORDING_CORRECTION" : "");
                          if (e.target.value === "withdrawn" || e.target.value === "graduated") {
                            const category = e.target.value === "withdrawn" ? "VOLUNTARY_WITHDRAWAL" : "GRADUATION";
                            setCode(category); setReasonCategory(category);
                          }
                        }}
                      >
                        {options.map((s) => (
                          <option key={s} value={s}>
                            {s === "withdrawn" ? "Voluntary scholarship withdrawal" : OPERATIONAL_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-date">
                        Status effective date
                      </label>
                      <input
                        id="status-date"
                        type="date"
                        required
                        className="form-control"
                        value={effectiveOn}
                        onChange={(e) => setEffectiveOn(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="status-code">
                        Reason category
                      </label>
                      <select
                        id="status-code"
                        className="form-select"
                        required
                        value={reasonCategory}
                        onChange={(e) => { setReasonCategory(e.target.value); setCode(e.target.value === "custom" ? "" : e.target.value); }}
                      >
                        <option value="">Choose a reason category</option>
                        {to === "graduated" && !terminal && <option value="GRADUATION">Graduation (sets status to Graduated)</option>}
                        <option value="VOLUNTARY_WITHDRAWAL">Voluntary scholarship withdrawal</option>
                        <option value="ACADEMIC_REVIEW">Academic requirements</option>
                        <option value="ENROLLMENT_CHANGE">Enrollment or attendance change</option>
                        <option value="RETURN_TO_PROGRAM">Return to the program</option>
                        <option value="RECORDING_CORRECTION">Correction of a recorded decision</option>
                        <option value="custom">Other reason code</option>
                      </select>
                      {reasonCategory === "custom" && <label className="form-label d-block mt-2">Other reason code<input className="form-control" required minLength={2} maxLength={60} pattern="[A-Z][A-Z0-9_]+" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></label>}
                    </div>
                  </div>
                )}
                {mode.action === "approve" && view.requests.find(r => r.id === mode.id)?.toStatus === "graduated" && <label className="form-label d-block">Confirm final funded semester<select className="form-select" required value={finalSemester} onChange={e => setFinalSemester(e.target.value)}><option value="">Choose the scholar's final funded semester</option>{view.semesters?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="small">Other eligibility checks still apply. Graduation does not record payment.</span></label>}
                {mode.action === "request" && to === "withdrawn" && <p>Use this for leaving the scholarship program. Staff records the effective date and supporting request; the Coordinator approves. Document waivers are handled with the individual requirement.</p>}
                <label className="form-label" htmlFor="status-reason">
                  Status reason
                </label>
                <input
                  id="status-reason"
                  className="form-control mb-3"
                  required
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <label className="form-label" htmlFor="status-reference">
                  Status decision / physical record reference
                </label>
                <input
                  id="status-reference"
                  className="form-control"
                  required
                  minLength={3}
                  maxLength={300}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <div className="d-flex gap-2 mt-3">
                  <ActionButton pending={saving} type="submit" className="btn configuration-primary">
                    {saving
                      ? "Saving..."
                      : mode.action === "request"
                        ? "Submit status request"
                        : `Confirm ${mode.action}`}
                  </ActionButton>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setMode(null)}
                  >
                    Close status command
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          <h5 className="mt-4">Status requests and decisions</h5>
          {!view.requests.length && <p>No status changes recorded.</p>}
          <ol className="ps-3">
            {view.requests.map((r) => (
              <li className="mb-3" key={r.id} id={`request-${r.id}`}><details open={!r.decision || new URLSearchParams(window.location.hash.split("?")[1]).get("request") === r.id}>
                <summary>{OPERATIONAL_LABELS[r.toStatus]}: {r.decision?.action ?? "Pending approval"} ({r.effectiveOn})</summary>
                <strong>
                  {OPERATIONAL_LABELS[r.fromStatus]} →{" "}
                  {OPERATIONAL_LABELS[r.toStatus]}
                </strong>{" "}
                ({r.kind})
                <div>
                  Effective {r.effectiveOn} · {r.reasonCode}
                </div>
                <div>
                  Requested by {r.actorName} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div>{r.reason}</div>
                <div>Reference: {r.reference}</div>
                {r.correctsRequestId && (
                  <div className="text-break">
                    Corrects request: {r.correctsRequestId}
                  </div>
                )}
                {r.decision ? (
                  <div className="mt-2">
                    <strong>{r.decision.action}</strong> —{" "}
                    {r.decision.actorName} ·{" "}
                    {new Date(r.decision.occurredAt).toLocaleString()}
                    <div>{r.decision.reason}</div>
                    <div>Reference: {r.decision.reference}</div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 mb-2">
                      Pending approval
                      {r.expectedVersion !== view.version
                        ? " — source state changed; reject or cancel and submit a fresh request."
                        : ""}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {canApprove && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm configuration-primary"
                            disabled={
                              loading ||
                              saving ||
                              view.periodUnavailable ||
                              r.expectedVersion !== view.version
                            }
                            onClick={() => begin("approve", r.id)}
                          >
                            Approve request
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={loading || saving}
                            onClick={() => begin("reject", r.id)}
                          >
                            Reject request
                          </button>
                        </>
                      )}
                      {canRequest && r.actorId === access.userId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={loading || saving}
                          onClick={() => begin("cancel", r.id)}
                        >
                          Cancel my request
                        </button>
                      )}
                    </div>
                  </>
                )}
              </details></li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
