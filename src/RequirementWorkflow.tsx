import { useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { RequirementInstance } from "../server/requirements/instances-model";
import {
  REQUIREMENT_STATUS_LABELS as statusLabel,
  type RequirementAction,
  type VerificationContext,
} from "../server/requirements/workflow-model";
import { configurationRequest as request } from "./configuration-api";
const labels: Record<RequirementAction, string> = {
  "send-for-verification": "Send for verification",
  verify: "Verify document",
  "return-for-correction": "Return for correction",
  resubmit: "Record resubmission",
  reject: "Reject requirement",
};
const checkLabels = {
  identity: "The document belongs to this scholar.",
  period: "The document covers this academic year and semester.",
  placement: "School and course match the annual academic record.",
  applicability: "The pinned requirement policy applies to this document.",
  validity: "The physical document is valid, complete and legible.",
};
const unchecked = {
  identity: false,
  period: false,
  placement: false,
  applicability: false,
  validity: false,
};
export default function RequirementWorkflow({
  instance,
  session,
  canVerify,
  canReceive,
  disabled,
  closed,
  onBusy,
  onChanged,
}: {
  instance: RequirementInstance;
  session: Session;
  canVerify: boolean;
  canReceive: boolean;
  disabled: boolean;
  closed: boolean;
  onBusy: (value: boolean) => void;
  onChanged: () => void;
}) {
  const [action, setAction] = useState<RequirementAction | null>(null),
    [context, setContext] = useState<VerificationContext | null>(null),
    [checks, setChecks] = useState(unchecked);
  const [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [remarks, setRemarks] = useState(""),
    [storage, setStorage] = useState(""),
    [physicalRef, setPhysicalRef] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const actions: RequirementAction[] =
    instance.status === "submitted" || instance.status === "resubmitted"
      ? ["send-for-verification"]
      : instance.status === "for_verification"
        ? ["verify", "return-for-correction", "reject"]
        : instance.status === "verified"
          ? ["return-for-correction"]
          : instance.status === "for_correction"
            ? ["resubmit"]
            : [];
  const allowed = (a: RequirementAction) =>
    a === "resubmit" ? canReceive : canVerify;
  async function choose(a: RequirementAction) {
    if (busy.current) return;
    setAction(a);
    setError("");
    setContext(null);
    setChecks(unchecked);
    pending.current = null;
    if (a !== "verify") return;
    busy.current = true;
    setSaving(true);
    onBusy(true);
    try {
      setContext(
        await request<VerificationContext>(
          `requirement-instances/${instance.id}/verification-context`,
        ),
      );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not load verification context. Retry the review.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!action || busy.current) return;
    busy.current = true;
    setSaving(true);
    onBusy(true);
    setError("");
    const document = context
      ? {
          scholarId: context.scholarId,
          scholarVersion: context.scholarVersion,
          academicYearId: context.academicYearId,
          semesterId: context.semesterId,
          schoolId: context.schoolId,
          courseId: context.courseId,
          academicVersion: context.academicVersion,
          definitionVersionId: context.definitionVersionId,
        }
      : null;
    const body = {
      action,
      expectedVersion: instance.version,
      effectiveOn: date,
      reason,
      reference,
      remarks: remarks.trim() || null,
      ...(action === "verify" ? { document, checks } : {}),
      ...(action === "return-for-correction"
        ? {
            correctionOf:
              instance.status === "verified"
                ? instance.history.at(-1)!.id
                : null,
          }
        : {}),
      ...(action === "resubmit"
        ? {
            physicalReference: physicalRef.trim() || null,
            storageLocation: storage,
          }
        : {}),
    };
    const signature = JSON.stringify({ id: instance.id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    let success = false;
    try {
      await request(`requirement-instances/${instance.id}/${action}`, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setAction(null);
      success = true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Decision could not be confirmed. Retry the same command safely or refresh.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
      onBusy(false);
    }
    if (success) onChanged();
  }
  return (
    <div className="mt-2" aria-label={`Workflow ${instance.code}`}>
      {instance.satisfiesNormalRequirement && (
        <p className="alert alert-success py-2">
          Verified - meets the normal requirement rule. Other payout eligibility
          checks remain separate.
        </p>
      )}
      {!closed && (
        <div className="d-flex gap-2 flex-wrap">
          {actions.filter(allowed).map((a) => (
            <button
              key={a}
              disabled={disabled || saving}
              className="btn btn-outline-secondary"
              onClick={() => void choose(a)}
            >
              {a === "return-for-correction" && instance.status === "verified"
                ? "Reopen verified requirement"
                : labels[a]}
            </button>
          ))}
        </div>
      )}
      {action && (
        <form
          className="border rounded p-3 mt-2"
          onSubmit={submit}
          aria-label={`${labels[action]} ${instance.code}`}
        >
          <h5>
            {labels[action]} - {instance.code}
          </h5>
          {error && (
            <div role="alert" className="alert alert-danger">
              {error}
            </div>
          )}
          <fieldset disabled={disabled || saving || closed}>
            {action === "verify" && (
              <>
                {context ? (
                  <>
                    <p>
                      <strong>
                        {context.humanId} - {context.scholarName}
                      </strong>
                      <br />
                      {context.yearCode} / {context.semesterCode}
                      <br />
                      {context.schoolName} / {context.courseName}
                      <br />
                      Pinned policy version {instance.revision}, effective
                      context {context.policyDate}
                    </p>
                    <p>
                      Compare the physical document with these authoritative
                      records, then confirm every check.
                    </p>
                    {(
                      Object.keys(checkLabels) as Array<keyof typeof checks>
                    ).map((key) => (
                      <label key={key} className="d-block mb-2">
                        <input
                          type="checkbox"
                          required
                          checked={checks[key]}
                          onChange={(e) =>
                            setChecks({ ...checks, [key]: e.target.checked })
                          }
                        />{" "}
                        {checkLabels[key]}
                      </label>
                    ))}
                  </>
                ) : (
                  <p>
                    Load complete academic and identity data before verifying.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary mb-3"
                  onClick={() => void choose("verify")}
                >
                  Reload verification context
                </button>
              </>
            )}
            {action === "return-for-correction" &&
              instance.status === "verified" && (
                <p>
                  This controlled correction links to verification revision{" "}
                  {instance.version}. Its original decision stays in history;
                  the requirement will no longer satisfy the normal rule until
                  verified again.
                </p>
              )}
            <label className="form-label d-block">
              Decision effective date
              <input
                className="form-control"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {action === "resubmit" && (
              <>
                <p>
                  The effective date is the date the corrected hard copy was
                  received.
                </p>
                <label className="form-label d-block">
                  Resubmission storage location
                  <input
                    className="form-control"
                    required
                    maxLength={300}
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                  />
                </label>
                <label className="form-label d-block">
                  Resubmission physical reference (optional)
                  <input
                    className="form-control"
                    maxLength={300}
                    value={physicalRef}
                    onChange={(e) => setPhysicalRef(e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="form-label d-block">
              Decision reason
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
              Decision reference
              <input
                className="form-control"
                required
                minLength={3}
                maxLength={300}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Decision remarks (optional)
              <textarea
                className="form-control"
                maxLength={1000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn configuration-primary"
                disabled={
                  action === "verify" &&
                  (!context || !Object.values(checks).every(Boolean))
                }
              >
                Save requirement decision
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setAction(null)}
              >
                Cancel decision
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {!!instance.history.length && (
        <details className="mt-3">
          <summary>Decision history ({instance.history.length})</summary>
          <ol className="ps-3">
            {instance.history.map((event) => (
              <li className="my-3" key={event.id}>
                <strong>
                  {statusLabel[event.fromStatus]} to{" "}
                  {statusLabel[event.toStatus]}
                </strong>
                <div>
                  Revision {event.version} - effective {event.effectiveOn}
                </div>
                <div>
                  {event.actorName} - recorded{" "}
                  {new Date(event.recordedAt).toLocaleString()}
                </div>
                <div>{event.reason}</div>
                <div>Reference: {event.reference}</div>
                {event.remarks && (
                  <div style={{ whiteSpace: "pre-wrap" }}>{event.remarks}</div>
                )}
                {event.correctionOf && (
                  <div>
                    Controlled correction of the preceding verified decision.
                  </div>
                )}
                {event.details.verification && (
                  <div>
                    Verified: {event.details.verification.humanId},{" "}
                    {event.details.verification.scholarName};{" "}
                    {event.details.verification.yearCode} /{" "}
                    {event.details.verification.semesterCode};{" "}
                    {event.details.verification.schoolName} /{" "}
                    {event.details.verification.courseName}. All document checks
                    confirmed.
                  </div>
                )}
                {event.details.receipt && (
                  <div>
                    Corrected hard copy received{" "}
                    {event.details.receipt.receivedOn}. Storage:{" "}
                    {event.details.receipt.storageLocation}. Physical reference:{" "}
                    {event.details.receipt.physicalReference ?? "Not recorded"}.
                  </div>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
