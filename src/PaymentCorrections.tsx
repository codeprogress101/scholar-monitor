import { useRef, useState, type FormEvent } from "react";
import type { OvrDetail } from "../server/ovr/model";
import { ApiError, type Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
export default function PaymentCorrections({
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
    [target, setTarget] = useState(""),
    [outcome, setOutcome] = useState("paid"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false),
    retry = useRef<{ signature: string; key: string } | null>(null);
  const closed =
    detail.batch.state === "closed" ||
    detail.cycle.state === "closed" ||
    detail.cycle.periodUnavailable;
  const member = (id: string) => {
    const s = detail.effectiveFinalization?.snapshot.entries.find(
      (e) => e.scholarshipId === id,
    )?.evidence.current.sources.scholarship;
    return s ? `${s.humanId} — ${s.name}` : id;
  };
  const selected = detail.payments.find((p) => p.id === target);
  const decision = action === "approve" || action === "reject";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: detail.batch.revision,
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(decision
          ? { correctionId: target }
          : {
              paymentId: target,
              outcome,
              amount: outcome === "not_paid" ? "0.00" : String(f.get("amount")),
              effectiveOn: String(f.get("effectiveOn")),
              remarks: String(f.get("remarks")),
            }),
      };
    const path = `ovr-batches/${detail.batch.id}/payment-corrections/${action}`,
      signature = JSON.stringify({ path, body });
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await request(path, {
        body,
        key: retry.current.key,
        csrf: session.csrfToken,
      });
      retry.current = null;
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not confirm correction. Retry the same command safely.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      aria-label="Payment corrections"
      className="border rounded p-3 my-3"
    >
      <h4>Payment evidence and corrections</h4>
      <p>
        Corrections preserve original outcomes. Closed-period changes need
        approval from a different Coordinator. They do not reopen the OVR or
        rewrite its closure evidence.
      </p>
      {detail.batch.closure && (
        <p>
          At closure: paid total {detail.batch.closure.reconciliation.paidTotal}
          ; not paid {detail.batch.closure.reconciliation.notPaid}. Current
          effective totals: paid {detail.reconciliation.paidTotal}; not paid{" "}
          {detail.reconciliation.notPaid}.
        </p>
      )}
      <details>
        <summary>Original payment outcomes</summary>
        <ul>
          {detail.originalPayments.map((p) => (
            <li key={p.id}>
              {member(p.scholarshipId)}:{" "}
              {p.outcome === "paid" ? "Paid" : "Not paid"} {p.amount},{" "}
              {p.effectiveOn}. {p.reference} — {p.remarks}. Recorded by{" "}
              {p.actorName}.
            </li>
          ))}
        </ul>
      </details>
      {detail.payments.map((p) => {
        const pending = detail.paymentCorrections.some(
          (c) => c.paymentId === p.id && c.state === "pending",
        );
        return (
          <article className="border-top mt-3 pt-2" key={p.id}>
            <h5>{member(p.scholarshipId)}</h5>
            <p>
              Current outcome: {p.outcome === "paid" ? "Paid" : "Not paid"}{" "}
              {p.amount}, {p.effectiveOn}. {p.reference} — {p.remarks}
            </p>
            {pending ? (
              <p role="status">
                Correction pending approval. The current outcome remains
                effective.
              </p>
            ) : (
              permissions.includes("payments.correct") &&
              ["processed", "closed"].includes(detail.batch.state) && (
                <button
                  className="btn btn-outline-primary"
                  disabled={saving}
                  onClick={() => {
                    setTarget(p.id);
                    setOutcome(p.outcome);
                    setAction(closed ? "request" : "correct");
                    setError("");
                  }}
                >
                  {closed ? "Request correction" : "Correct payment"}:{" "}
                  {member(p.scholarshipId)}
                </button>
              )
            )}
          </article>
        );
      })}
      {detail.paymentCorrections.map((c) => (
        <article key={c.id} className="border-top mt-3 pt-2">
          <h5>Correction — {c.state}</h5>
          <p>
            {member(c.before.scholarshipId)}. Requested by {c.requestedByName},{" "}
            {new Date(c.requestedAt).toLocaleString()}. {c.reason} (
            {c.reference})
          </p>
          <p>
            Before: {c.before.outcome} {c.before.amount}, {c.before.effectiveOn}
            , {c.before.reference}. {c.before.remarks}
          </p>
          <p>
            Proposed: {c.proposed.outcome} {c.proposed.amount},{" "}
            {c.proposed.effectiveOn}, {c.proposed.reference}.{" "}
            {c.proposed.remarks}
          </p>
          {c.decidedBy && (
            <p>
              {c.state} by {c.decidedByName},{" "}
              {new Date(c.decidedAt!).toLocaleString()}. {c.decisionReason} (
              {c.decisionReference})
            </p>
          )}
          {c.state === "pending" &&
            permissions.includes("payments.corrections.approve") &&
            c.requestedBy !== session.user.id && (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-success"
                  disabled={saving}
                  onClick={() => {
                    setAction("approve");
                    setTarget(c.id);
                  }}
                >
                  Approve payment correction
                </button>
                <button
                  className="btn btn-outline-danger"
                  disabled={saving}
                  onClick={() => {
                    setAction("reject");
                    setTarget(c.id);
                  }}
                >
                  Reject payment correction
                </button>
              </div>
            )}
        </article>
      ))}
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {action && (
        <form
          onSubmit={submit}
          aria-label="Payment correction command"
          className="mt-3"
          key={`${action}-${target}`}
        >
          <fieldset disabled={saving}>
            <legend>
              {action === "correct"
                ? "Correct payment"
                : action === "request"
                  ? "Request closed-period correction"
                  : `${action} payment correction`}
            </legend>
            {!decision && selected && (
              <>
                <label className="form-label d-block">
                  Corrected outcome
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
                    Corrected amount
                    <input
                      className="form-control"
                      name="amount"
                      required
                      inputMode="decimal"
                      pattern="(0|[1-9][0-9]{0,9})\.[0-9]{2}"
                      defaultValue={selected.amount}
                    />
                  </label>
                )}
                <label className="form-label d-block">
                  Payment effective date
                  <input
                    className="form-control"
                    type="date"
                    name="effectiveOn"
                    required
                    defaultValue={selected.effectiveOn}
                  />
                </label>
                <label className="form-label d-block">
                  Corrected remarks
                  <input
                    className="form-control"
                    name="remarks"
                    required={outcome === "not_paid"}
                    minLength={outcome === "not_paid" ? 5 : 0}
                    maxLength={1000}
                    defaultValue={selected.remarks}
                  />
                </label>
              </>
            )}
            <label className="form-label d-block">
              Correction reason
              <input
                className="form-control"
                name="reason"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Correction reference
              <input
                className="form-control"
                name="reference"
                required
                minLength={3}
                maxLength={300}
              />
            </label>
            <div className="d-flex gap-2">
              <button className="btn configuration-primary">
                Confirm payment correction
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setAction("")}
              >
                Cancel correction
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
