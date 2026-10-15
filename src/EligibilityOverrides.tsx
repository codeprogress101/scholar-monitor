import { useActionForm } from "./use-action-form";
import { useRef, useState, type FormEvent } from "react";
import type { EligibilityView } from "../server/eligibility/model";
import type {
  EligibilityOverride,
  OverrideAction,
} from "../server/eligibility/override-model";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
export default function EligibilityOverrides({
  view,
  path,
  session,
  permissions,
  onSaved,
}: {
  view: EligibilityView;
  path: string;
  session: Session;
  permissions: string[];
  onSaved: () => void;
}) {
  const [action, setAction] = useState<OverrideAction | null>(null),
    [selected, setSelected] = useState<EligibilityOverride | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const busy = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  const seen = new Set<string>();
  const items = view.overrides.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  const canRequest = permissions.includes("eligibility.overrides.request"),
    canApprove = permissions.includes("eligibility.overrides.approve");
  const fresh = !!view.latest && !view.stale;
  function choose(a: OverrideAction, r: EligibilityOverride | null) {
    setAction(a);
    setSelected(r);
    setError("");
  }
  const actionForm = useActionForm(action);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!action || busy.current) return;
    const f = new FormData(e.currentTarget),
      body = {
        expectedRevision: selected?.revision ?? 0,
        reason: String(f.get("reason")),
        reference: String(f.get("reference")),
        ...(action === "request" || action === "reevaluate"
          ? {
              calculationId: view.latest?.id,
              expectedSourceHash: view.current.sourceHash,
            }
          : {}),
        ...(action === "request"
          ? {
              requestedEligible: f.get("requestedEligible") === "true",
              reasonCode: String(f.get("reasonCode")),
              justification: String(f.get("justification")),
              authorityReference: String(f.get("authorityReference")),
            }
          : {}),
      };
    const endpoint =
      path + "/overrides" + (selected ? `/${selected.id}/${action}` : "");
    const signature = JSON.stringify({ endpoint, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await request(endpoint, {
        body,
        key: pending.current.key,
        csrf: session.csrfToken,
      });
      pending.current = null;
      setAction(null);
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not confirm the override command. Retry the same command safely.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="border-top pt-3 mt-3"
      aria-label="Eligibility overrides"
    >
      <h4>Eligibility overrides</h4>
      <p>
        Exceptions preserve normal calculations and require explicit review by the
        Coordinator. Source changes invalidate an approval until a new request
        is approved.
      </p>
      {view.effective.overrideStale && (
        <p className="alert alert-warning">
          The approved override is stale and is not applied. Review the changed
          sources and request a new decision.
        </p>
      )}
      {!view.canCalculate && (
        <p>
          Override commands require an open payout cycle and available academic
          period.
        </p>
      )}
      {view.canCalculate &&
        canRequest &&
        !items.some((r) => r.state === "draft" || r.state === "pending") && (
          <button
            className="btn btn-outline-primary"
            disabled={!fresh || saving}
            onClick={() => choose("request", null)}
          >
            Request eligibility override
          </button>
        )}
      {view.canCalculate && canRequest && !fresh && (
        <p>
          Save a fresh normal calculation before requesting or re-evaluating an
          override.
        </p>
      )}
      {items.map((r) => (
        <article id={`request-${r.id}`} className="border rounded p-3 my-3" key={r.id}>
          <h5>
            Override {r.state} — revision {r.revision}
          </h5>
          <p>
            Requested:{" "}
            <strong>{r.requestedEligible ? "Eligible" : "Not Eligible"}</strong>{" "}
            by {r.requesterName}. Reason code: {r.reasonCode}.
          </p>
          <p>
            {r.justification}
            <br />
            Authority: {r.authorityReference}
          </p>
          <p>
            Original normal calculation: revision{" "}
            {r.originalCalculation.revision},{" "}
            {r.originalCalculation.eligible ? "Eligible" : "Not Eligible"}.
            Review calculation: revision {r.calculation.revision}.
          </p>
          {r.calculation.sourceHash !== view.current.sourceHash && (
            <p className="text-danger">
              Eligibility sources changed. Re-evaluation is required before
              review or approval.
            </p>
          )}
          <p>
            Latest action: {r.action} by {r.actorName} at {r.occurredAt}.{" "}
            {r.reason} ({r.reference})
          </p>
          {view.canCalculate && (
            <div className="d-flex flex-wrap gap-2">
              {canRequest &&
                r.requesterId === session.user.id &&
                (r.state === "draft" || r.state === "pending") && (
                  <>
                    {r.state === "draft" && (
                      <button
                        className="btn btn-outline-primary"
                        disabled={
                          saving ||
                          r.calculation.sourceHash !== view.current.sourceHash
                        }
                        onClick={() => choose("submit-review", r)}
                      >
                        Submit override for review
                      </button>
                    )}
                    <button
                      className="btn btn-outline-secondary"
                      disabled={!fresh || saving}
                      onClick={() => choose("reevaluate", r)}
                    >
                      Re-evaluate override
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      disabled={saving}
                      onClick={() => choose("cancel", r)}
                    >
                      Cancel override request
                    </button>
                  </>
                )}
              {canApprove &&
                
                r.state === "pending" && (
                  <>
                    <button
                      className="btn btn-success"
                      disabled={
                        saving ||
                        r.calculation.sourceHash !== view.current.sourceHash
                      }
                      onClick={() => choose("approve", r)}
                    >
                      Approve override
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      disabled={saving}
                      onClick={() => choose("reject", r)}
                    >
                      Reject override
                    </button>
                  </>
                )}
            </div>
          )}
          <details className="mt-2">
            <summary>Override history</summary>
            {view.overrides
              .filter((h) => h.id === r.id)
              .map((h) => (
                <p key={h.revision}>
                  Revision {h.revision}: {h.action} — {h.actorName},{" "}
                  {h.occurredAt}. {h.reason} ({h.reference}). Normal calculation{" "}
                  {h.calculation.revision}.
                </p>
              ))}
          </details>
        </article>
      ))}
      {error && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {action && (
        <form ref={actionForm}
          onSubmit={submit}
          aria-label="Override command"
          key={`${action}-${selected?.id ?? "new"}`}
        >
          <fieldset disabled={saving}>
            <legend>
              {action === "request"
                ? "Request eligibility override"
                : `${action} override`}
            </legend>
            {action === "request" && (
              <>
                <label className="form-label d-block">
                  Requested result
                  <select
                    name="requestedEligible"
                    className="form-select"
                    defaultValue={String(!view.current.eligible)}
                  >
                    <option value="true">Eligible</option>
                    <option value="false">Not Eligible</option>
                  </select>
                </label>
                <label className="form-label d-block">
                  Override reason code
                  <input
                    name="reasonCode"
                    className="form-control"
                    required
                    minLength={2}
                    maxLength={60}
                    pattern="[A-Z][A-Z0-9_]+"
                    placeholder="Authorized policy reason code"
                  />
                </label>
                <label className="form-label d-block">
                  Override justification
                  <textarea
                    name="justification"
                    className="form-control"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                </label>
                <label className="form-label d-block">
                  Override authority reference
                  <input
                    name="authorityReference"
                    className="form-control"
                    required
                    minLength={3}
                    maxLength={300}
                  />
                </label>
              </>
            )}
            <label className="form-label d-block">
              Decision or action reason
              <input
                name="reason"
                className="form-control"
                required
                minLength={5}
                maxLength={500}
              />
            </label>
            <label className="form-label d-block">
              Decision or action reference
              <input
                name="reference"
                className="form-control"
                required
                minLength={3}
                maxLength={300}
              />
            </label>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn configuration-primary">
                Confirm override action
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setAction(null)}
              >
                Dismiss form
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
