import { useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { RequirementInstance } from "../server/requirements/instances-model";
export default function RequirementReceiptForm({
  instance,
  session,
  canReceive,
  closed,
  onReceived,
  onBusy,
}: {
  instance: RequirementInstance;
  session: Session;
  canReceive: boolean;
  closed: boolean;
  onReceived: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [receivedOn, setReceivedOn] = useState(""),
    [physicalReference, setReference] = useState(""),
    [storageLocation, setStorage] = useState(""),
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
      receivedOn,
      physicalReference: physicalReference.trim() || null,
      storageLocation,
      remarks: remarks.trim() || null,
      reason,
    };
    const signature = JSON.stringify({ id: instance.id, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    let succeeded = false;
    try {
      await request(`requirement-instances/${instance.id}/receive`, {
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
          : "Receipt could not be confirmed. Retry the same command safely or refresh.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
      onBusy(false);
    }
    if (succeeded) onReceived();
  }
  const receipt = instance.receipt;
  return (
    <div className="mt-2">
      {receipt && (
        <div
          className="border rounded p-3"
          aria-label={`Receipt ${instance.code}`}
        >
          <strong>Physical receipt recorded</strong>
          <div>
            Received on {receipt.receivedOn} by {receipt.receiverName}
          </div>
          <div>Storage: {receipt.storageLocation}</div>
          <div>
            Physical reference: {receipt.physicalReference ?? "Not recorded"}
          </div>
          {receipt.remarks && (
            <div style={{ whiteSpace: "pre-wrap" }}>
              Remarks: {receipt.remarks}
            </div>
          )}
          <div>Reason: {receipt.reason}</div>
          <div className="small">
            Recorded {new Date(receipt.recordedAt).toLocaleString()}
          </div>
          <p className="small mb-0 mt-2">
            Initial receipt is preserved. Receipt alone does not verify the
            document or establish payout eligibility.
          </p>
        </div>
      )}
      {canReceive &&
        !closed &&
        instance.status === "not_submitted" &&
        !open && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            Receive {instance.code} hard copy
          </button>
        )}
      {closed && instance.status === "not_submitted" && (
        <p className="small">
          Receiving is unavailable while this period is closed.
        </p>
      )}
      {open && (
        <form
          className="border rounded p-3 mt-2"
          aria-label={`Receive ${instance.code}`}
          onSubmit={submit}
        >
          <h5>Receive {instance.code} hard copy</h5>
          <p>
            Receiver: {session.user.fullName}. Record where the physical
            document is stored. No file upload is needed.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={saving || closed || !canReceive}>
            <label className="form-label d-block">
              Received date
              <input
                className="form-control"
                type="date"
                required
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Physical reference (optional)
              <input
                className="form-control"
                maxLength={300}
                value={physicalReference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Folder / box / storage location
              <input
                className="form-control"
                required
                maxLength={300}
                value={storageLocation}
                onChange={(e) => setStorage(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Receipt remarks (optional)
              <textarea
                className="form-control"
                maxLength={1000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
            <label className="form-label d-block">
              Receipt reason
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
                {saving ? "Recording..." : "Record physical receipt"}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel receipt
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
