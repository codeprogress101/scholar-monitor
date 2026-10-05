import RoutineEvidence from "./RoutineEvidence";
import { useRef, useState, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
export default function OvrProcessingPanel({
  detail,
  session,
  permissions,
  onSaved,
}: {
  detail: OvrDetail;
  session: Session;
  permissions: string[];
  onSaved: () => void;
}) {
  const [action, setAction] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [outcome, setOutcome] = useState("paid");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const b = detail.batch,
    r = detail.reconciliation,
    members = detail.effectiveFinalization!.snapshot.entries;
  const available =
    ["open", "locked"].includes(detail.cycle.state) &&
    !detail.cycle.periodUnavailable &&
    !detail.amendments.some((a) => a.state === "pending");
  const labels: Record<string, string> = {
    submit: "Submit for administration",
    "mark-processed": "Mark processed",
    payments: "Record payment outcome",
    close: "Close OVR",
  };
  const name = (id: string) => {
    const s = members.find((e) => e.scholarshipId === id)?.evidence.current
      .sources.scholarship;
    return s ? `${s.humanId} — ${s.name}` : id;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: b.revision,
        effectiveOn: String(f.get("effectiveOn")),
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(action === "close"
          ? { reconciled: f.get("reconciled") === "on" }
          : {}),
        ...(action === "payments"
          ? {
              scholarshipId: String(f.get("scholarshipId")),
              outcome,
              amount: outcome === "not_paid" ? "0.00" : String(f.get("amount")),
              remarks: String(f.get("remarks")),
            }
          : {}),
      };
    const path = `ovr-batches/${b.id}/${action}`,
      signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await request(path, {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
      });
      pending.current = null;
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not confirm the result. Retry the same command safely.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section className="border rounded p-3 my-3" aria-label="OVR processing">
      <h4>Processing and reconciliation</h4>
      {[
        ["Submitted", b.administration],
        ["Processed", b.processing],
        ["Closed", b.closure],
      ].map(([label, stamp]) =>
        typeof stamp === "object" && stamp ? (
          <p key={String(label)}>
            {String(label)}: {stamp.effectiveOn}, {stamp.actorName} —{" "}
            {stamp.reference}. {stamp.reason}
          </p>
        ) : null,
      )}
      <p>
        {r.recorded} of {r.required} outcomes recorded. Paid total:{" "}
        {r.paidTotal}. Not paid: {r.notPaid}.
      </p>
      <p>
        Every frozen member needs an outcome. Not paid requires an explanation.
        Closure confirms reconciliation of these outcomes; it does not imply
        everyone was paid.
      </p>
      {r.missingScholarshipIds.length > 0 && (
        <p>Missing outcomes: {r.missingScholarshipIds.map(name).join("; ")}.</p>
      )}
      <ul>
        {detail.payments.map((p) => (
          <li key={p.id}>
            {name(p.scholarshipId)}:{" "}
            {p.outcome === "paid" ? "Paid" : "Not paid"} {p.amount},{" "}
            {p.effectiveOn} — {p.reference}. {p.remarks} Recorded by{" "}
            {p.actorName}.
          </li>
        ))}
      </ul>
      {b.state === "closed" ? (
        <p role="status">
          OVR closed. Original processing records and roster are locked; payment
          corrections use the controlled workflow below.
        </p>
      ) : (
        available && (
          <div className="d-flex gap-2 flex-wrap">
            {b.state === "finalized" && permissions.includes("ovr.submit") && (
              <button
                className="btn configuration-primary"
                disabled={saving}
                onClick={() => setAction("submit")}
              >
                {labels.submit}
              </button>
            )}
            {b.state === "submitted" && permissions.includes("ovr.process") && (
              <button
                className="btn configuration-primary"
                disabled={saving}
                onClick={() => setAction("mark-processed")}
              >
                {labels["mark-processed"]}
              </button>
            )}
            {b.state === "processed" &&
              permissions.includes("ovr.process") &&
              !r.complete && (
                <button
                  className="btn configuration-primary"
                  disabled={saving}
                  onClick={() => setAction("payments")}
                >
                  {labels.payments}
                </button>
              )}
            {b.state === "processed" && permissions.includes("ovr.close") && (
              <button
                className="btn btn-success"
                disabled={saving || !r.complete}
                onClick={() => setAction("close")}
              >
                {labels.close}
              </button>
            )}
          </div>
        )
      )}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {action && available && (
        <form
          onSubmit={submit}
          className="mt-3"
          aria-label="OVR processing command"
          key={action}
        >
          <fieldset disabled={saving}>
            <legend>{labels[action]}</legend>
            {action === "payments" && (
              <>
                <label className="form-label d-block">
                  Frozen member
                  <select
                    className="form-select"
                    name="scholarshipId"
                    required
                    defaultValue=""
                  >
                    <option value="">Select a member</option>
                    {r.missingScholarshipIds.map((id) => (
                      <option key={id} value={id}>
                        {name(id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label d-block">
                  Payment outcome
                  <select
                    className="form-select"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="paid">Paid</option>
                    <option value="not_paid">Not paid</option>
                  </select>
                </label>
                {outcome === "paid" && (
                  <label className="form-label d-block">
                    Amount (two decimals)
                    <input
                      className="form-control"
                      name="amount"
                      required
                      inputMode="decimal"
                      pattern="(0|[1-9][0-9]{0,9})\.[0-9]{2}"
                      placeholder="1000.00"
                    />
                  </label>
                )}
                <label className="form-label d-block">
                  Outcome remarks
                  <input
                    className="form-control"
                    name="remarks"
                    required={outcome === "not_paid"}
                    minLength={outcome === "not_paid" ? 5 : 0}
                    maxLength={1000}
                  />
                </label>
              </>
            )}
            <label className="form-label d-block">
              Effective date
              <input
                className="form-control"
                type="date"
                name="effectiveOn"
                required
              />
            </label>
            <RoutineEvidence referenceRequired={action !== "close"}><label className="form-label d-block">
              Processing reason
              <input
                className="form-control"
                name="reason"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Processing reference
              <input
                className="form-control"
                name="reference"
                required
                minLength={3}
                maxLength={300}
              />
            </label></RoutineEvidence>
            {action === "close" && (
              <label className="form-label d-block">
                <input type="checkbox" name="reconciled" required /> I
                reconciled every recorded outcome and confirm closure.
              </label>
            )}
            <div className="d-flex gap-2">
              <button className="btn configuration-primary">
                Confirm processing action
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setAction("")}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
