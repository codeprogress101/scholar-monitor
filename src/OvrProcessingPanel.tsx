import LegacyConversion from "./LegacyConversion";
import TreasuryReconciliation from "./TreasuryReconciliation";
import { useActionForm } from "./use-action-form";
import { receivingToday } from "./receiving-selection";
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
  onTreasurySaved,
}: {
  detail: OvrDetail;
  session: Session;
  permissions: string[];
  onSaved: () => void;
  onTreasurySaved?: () => void;
}) {
  const [action, setAction] = useState(""),
    [holdTarget, setHoldTarget] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [outcome, setOutcome] = useState("not_paid"),
    [unpaidReason, setUnpaidReason] = useState("did_not_claim");
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const b = detail.batch,
    r = detail.reconciliation,
    members = detail.effectiveFinalization!.snapshot.entries;
  const available =
    Boolean(detail.releases) && ["open", "locked"].includes(detail.cycle.state) &&
    !detail.cycle.periodUnavailable &&
    !detail.amendments.some((a) => a.state === "pending");
  const labels: Record<string, string> = {
    submit: "Submit for administration",
    "mark-processed": "Mark processed",
    payments: "Record payment outcome",
    close: "Close Payroll",
    hold: "Hold payment — Coordinator",
    "release-hold": "Clear hold — Coordinator",
  };
  const holdAvailable = Boolean(detail.releases) && !detail.amendments.some(a => a.state === "pending");
  const holding = action === "hold" || action === "release-hold";
  const name = (id: string) => {
    const s = members.find((e) => e.scholarshipId === id)?.evidence.current
      .sources.scholarship;
    return s ? `${s.humanId} — ${s.name}` : id;
  };
  const actionForm = useActionForm(action);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: b.revision,
        effectiveOn: String(f.get("effectiveOn")),
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(["hold", "release-hold"].includes(action) ? { scholarshipId: holdTarget, sourceHash: detail.releases!.find(r => r.scholarshipId === holdTarget)!.sourceHash } : {}),
        ...(action === "close"
          ? { reconciled: f.get("reconciled") === "on" }
          : {}),
        ...(action === "payments"
          ? {
              scholarshipId: String(f.get("scholarshipId")),
              outcome,
              ...(outcome === "not_paid" ? { unpaidReason } : {}),
              amount: outcome === "not_paid" ? "0.00" : String(f.get("amount")),
              remarks: String(f.get("remarks")),
              ...((detail.releases || members.some(m => m.evidence.reprocessing)) && outcome === "paid" ? { receiptConfirmed: f.get("receiptConfirmed") === "on" } : {}),
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
    <section className="border rounded p-3 my-3" aria-label="Payroll processing">
      <h4>Processing and reconciliation</h4>
      {!detail.releases && permissions.includes("ovr.finalize") && <LegacyConversion id={detail.batch.id} session={session} onSaved={onSaved}/>}
      <TreasuryReconciliation detail={detail} session={session} permissions={permissions} onSaved={onTreasurySaved ?? onSaved}/>
      {detail.claimDeadline && <p role="status">Claim deadline: {detail.claimDeadline.endsOn ?? "Not configured"} (Philippine time). {detail.claimDeadline.expired && "Claim period ended; new payments are blocked."}</p>}
      {detail.releases && <><p>Staff records actual receipt. Coordinator holds preserve the allocation and cannot waive academic restrictions.</p><ul>{detail.releases.map(entry => <li key={entry.scholarshipId} className="mb-3"><strong>{name(entry.scholarshipId)}</strong> — {entry.state.replaceAll("_", " ")}
        {entry.state !== "released" && entry.reasons.length > 0 && <ul>{entry.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
        {holdAvailable && entry.state !== "released" && permissions.includes("ovr.finalize") && <button className="btn btn-sm btn-outline-secondary ms-2" disabled={saving || (entry.held && entry.reasons.length > 0)} onClick={() => { setHoldTarget(entry.scholarshipId); setAction(entry.held ? "release-hold" : "hold"); }}>{entry.held ? "Clear hold" : "Hold payment"}</button>}
        <details><summary>Allocation history</summary>{entry.history.map((e,i) => <p key={i}>{e.action}: {e.reason} · {e.reference} · {e.actor} · {e.recordedAt}</p>)}</details>
      </li>)}</ul></>}
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
        {r.paidTotal}. Paid: {r.recorded - r.notPaid}. Unclaimed: {r.unclaimed ?? 0}. Review required: {r.needsReview ?? r.notPaid}.
      </p>
      <p>
        Every frozen member needs an explicit outcome. Payment withheld and Other require an explanation.
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
          Payroll closed. Original processing records and roster are locked; payment
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
      {action && (holding ? holdAvailable : available) && (
        <form ref={actionForm}
          onSubmit={submit}
          className="mt-3"
          aria-label="Payroll processing command"
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
                    <option value="paid" disabled>{detail.releases ? "Released — actually received" : "Paid"}</option>
                    <option value="not_paid">Not paid</option>
                  </select>
                </label>
                {outcome === "not_paid" && <label className="form-label d-block">Unpaid reason<select className="form-select" value={unpaidReason} onChange={e => setUnpaidReason(e.target.value)}><option value="did_not_claim">Did not claim</option><option value="withheld">Payment withheld</option><option value="review">Other / needs review</option></select></label>}
                {outcome === "paid" && (
                  <label className="form-label d-block">
                    Stipend amount (fixed)
                    <input
                      className="form-control"
                      name="amount"
                      required
                      inputMode="decimal"
                      pattern="(0|[1-9][0-9]{0,9})\.[0-9]{2}"
                      
                      value="5000.00"
                      readOnly
                    />
                  </label>
                )}
                {(detail.releases || members.some(m => m.evidence.reprocessing)) && outcome === "paid" && <label className="d-block my-2"><input type="checkbox" name="receiptConfirmed" required /> I confirm the scholar actually received the full stipend, supported by the payment reference.</label>}
                <label className="form-label d-block">
                  Outcome remarks
                  <input
                    className="form-control"
                    name="remarks"
                    required={outcome === "not_paid" && unpaidReason !== "did_not_claim"}
                    minLength={outcome === "not_paid" && unpaidReason !== "did_not_claim" ? 5 : 0}
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
                defaultValue={receivingToday()}
                required
              />
            </label>
            <RoutineEvidence routine={!["hold", "release-hold"].includes(action)} referenceRequired={holding}><label className="form-label d-block">
              Additional note
              <input
                className="form-control"
                name="reason"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Supporting reference (optional)
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
