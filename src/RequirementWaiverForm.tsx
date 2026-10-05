import { REQUIREMENT_STATUS_LABELS as statusLabel } from "../server/requirements/workflow-model";
import { useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { RequirementInstance } from "../server/requirements/instances-model";
export default function RequirementWaiverForm({
  instance,
  session,
  canWaive,
  closed,
  onChanged,
  onBusy,
}: {
  instance: RequirementInstance;
  session: Session;
  canWaive: boolean;
  closed: boolean;
  onChanged: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [effectiveOn, setEffectiveOn] = useState(""),
    [authorityReference, setReference] = useState(""),
    [remarks, setRemarks] = useState(""),
    [reason, setReason] = useState("");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    onBusy(true);
    setError("");
    const body = {
      expectedVersion: instance.version,
      effectiveOn,
      authorityReference,
      remarks: remarks.trim() || null,
      reason,
    };
    const signature = JSON.stringify({ id: instance.id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    let succeeded = false;
    try {
      await request(`requirement-instances/${instance.id}/waive`, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setOpen(false);
      succeeded = true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Waiver could not be confirmed. Retry the same command safely or refresh.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
      onBusy(false);
    }
    if (succeeded) onChanged();
  }
  const waiver = instance.waiver;
  return (
    <div className="mt-2">
      {waiver && (
        <div
          className="alert alert-warning"
          aria-label={`Waiver ${instance.code}`}
        >
          <strong>Waived by authorized exception</strong>
          <p>
            Meets the normal requirement rule. Payout policy may exclude
            waivers; other eligibility checks remain separate.
          </p>
          <div>
            {statusLabel[waiver.fromStatus]} to Waived - revision{" "}
            {waiver.version}
          </div>
          <div>
            Effective {waiver.effectiveOn} - {waiver.actorName}
          </div>
          <div>Reason: {waiver.reason}</div>
          <div>Authority reference: {waiver.authorityReference}</div>
          {waiver.remarks && (
            <div style={{ whiteSpace: "pre-wrap" }}>
              Remarks: {waiver.remarks}
            </div>
          )}
          <div className="small">
            Recorded {new Date(waiver.recordedAt).toLocaleString()}
          </div>
        </div>
      )}
      {canWaive &&
        !closed &&
        !["verified", "waived"].includes(instance.status) &&
        !open && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            Waive {instance.code} requirement
          </button>
        )}
      {open && (
        <form
          className="border rounded p-3 mt-2"
          aria-label={`Waive ${instance.code}`}
          onSubmit={submit}
        >
          <h5>Waive {instance.code} requirement</h5>
          <p>
            Coordinator: {session.user.fullName}. Record the authority approving
            this exception. The decision and its reason are permanent.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={saving || closed || !canWaive}>
            <label className="form-label d-block">
              Waiver effective date
              <input
                className="form-control"
                type="date"
                required
                value={effectiveOn}
                onChange={(e) => setEffectiveOn(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Waiver authority reference
              <input
                className="form-control"
                maxLength={300}
                required
                minLength={3}
                value={authorityReference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Waiver remarks (optional)
              <textarea
                className="form-control"
                maxLength={1000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Waiver reason
              <input
                className="form-control"
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn configuration-primary">
                {saving ? "Recording..." : "Record requirement waiver"}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel waiver
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
