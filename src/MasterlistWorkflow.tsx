import FocusedDialog from "./FocusedDialog";
import RoutineEvidence from "./RoutineEvidence";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
import type { DraftValidation } from "../server/masterlists/model";
import type {
  WorkflowView,
  MasterlistAction,
} from "../server/masterlists/workflow-model";
import { configurationRequest as request } from "./configuration-api";
const labels: Record<MasterlistAction, string> = {
  "submit-verification": "Submit for verification",
  "submit-approval": "Submit for approval",
  approve: "Approve masterlist",
  "return-draft": "Return to Draft",
  publish: "Publish and activate scholars",
  lock: "Lock official masterlist",
};
const permission = (action: MasterlistAction) =>
  action === "approve" || action === "return-draft"
    ? "masterlists.approve"
    : action === "publish"
      ? "masterlists.publish"
      : action === "lock"
        ? "masterlists.lock"
        : "masterlists.prepare";
const actions: Record<string, MasterlistAction[]> = {
  draft: ["submit-verification"],
  for_verification: ["submit-approval", "return-draft"],
  submitted_for_approval: ["approve", "return-draft"],
  approved: ["publish", "return-draft"],
  published: ["lock"],
  locked: [],
};
const title = (state: string) => state.replaceAll("_", " ");
export default function MasterlistWorkflow({
  id,
  version,
  session,
  access,
  disabled,
  validation,
  onChanged,
  proposalKind="standalone",
}: {
  id: string;
  version: number;
  session: Session;
  access: Access;
  disabled: boolean;
  validation: DraftValidation;
  onChanged: () => void;
  proposalKind?: "standalone" | "addition" | "consolidation";
}) {
  const [view, setView] = useState<WorkflowView | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0),
    [action, setAction] = useState<MasterlistAction | null>(null);
  const [uncertain,setUncertain]=useState(false);
  const [fields, setFields] = useState({
    reason: "",
    reference: "",
    effectiveOn: "",
  });
  const pending = useRef<{ signature: string; key: string; path:string; body:object } | null>(null),
    busy = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    request<WorkflowView>(`masterlists/${id}/workflow`, {
      signal: controller.signal,
    })
      .then((v) => {
        if (active) setView(v);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError ? e.message : "Could not load workflow.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, version, revision]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!action || !view || busy.current) return;
    const body = {
      expectedVersion: view.version,
      reason: fields.reason,
      reference: fields.reference,
      ...(action === "publish" ? { effectiveOn: fields.effectiveOn } : {}),
    };
    const path = `masterlists/${id}/${action}`,
      signature = JSON.stringify({ path, body });
    if (!uncertain && pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID(), path, body };
    if (!pending.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(pending.current.path, {
        body: pending.current.body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setUncertain(false);
      setAction(null);
      setNotice("Masterlist workflow command saved.");
      setLoading(true);
      setRevision((n) => n + 1);
      onChanged();
    } catch (e) {
      setUncertain(!(e instanceof ApiError) || e.status >= 500);
      setError(
        e instanceof ApiError
          ? e.message
          : "Result unconfirmed. Retry the same action before leaving this masterlist.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="masterlist-workflow"
      aria-label="Masterlist workflow"
    >
      <h3 className="h5">Review & approval</h3>
      {loading && <p role="status">Loading workflow...</p>}
      {error && !action && (
        <p className="alert alert-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}
      {view && (
        <>
          <p>{view.status === "submitted_for_approval" ? "Awaiting Coordinator approval." : view.status === "approved" ? "Approved. A Coordinator can now review and publish." : view.status === "draft" || view.status === "for_verification" ? "Review membership and resolve blockers before the next step." : "Official membership and publication history are preserved."}</p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {(actions[view.status] ?? [])
              .filter((a) =>
                access.permissions.some((p) => p.code === permission(a)),
              )
              .map((a) => (
                <button
                  type="button"
                  className={a === "return-draft" ? "btn btn-sm btn-outline-secondary" : "btn btn-sm configuration-primary"}
                  key={a}
                  disabled={
                    disabled ||
                    saving ||
                    loading ||
                    view.version !== version ||
                    !!action ||
                    (["submit-verification", "submit-approval", "approve", "publish"].includes(a) && !validation.valid) ||
                    (view.periodUnavailable && a !== "lock")
                  }
                  onClick={() => {
                    setAction(a);
                    setFields({ reason: "", reference: "", effectiveOn: "" });
                    pending.current = null;
                    setError("");
                    setNotice("");
                  }}
                >
                  {a==="publish"&&proposalKind==="consolidation"?"Publish consolidated revision":labels[a]}{["approve", "publish", "lock", "return-draft"].includes(a) ? " · Coordinator" : ""}
                </button>
              ))}
          </div>
          {view.status === "draft" && !validation.valid && <p className="text-muted">{validation.count === 0 ? "Add a scholar to enable submission." : "Resolve the items marked Needs attention before submitting."}</p>}
          <details className="secondary-details"><summary>Approval steps and permissions</summary><p>Draft → For verification → Submitted for approval → Approved → Published → Locked.</p><p>Staff and Coordinators prepare and review. Coordinator approval and publication remain required. A Coordinator may approve their own prepared submission under the existing policy.</p></details>
          {action && (
            <FocusedDialog title={action === "publish" && proposalKind === "consolidation" ? "Publish consolidated revision" : labels[action]} busy={saving || uncertain} onClose={()=>setAction(null)}>
            <form onSubmit={submit}>
              <fieldset disabled={disabled || saving || loading || uncertain}>
                <legend className="visually-hidden">{action === "publish" && proposalKind === "consolidation" ? "Publish consolidated revision" : labels[action]}</legend>
                {action === "submit-approval" && (
                  <p>
                    Confirm that all candidate records have been verified
                    against the referenced records. The Coordinator must
                    approve this submission.
                  </p>
                )}
                {action === "publish" && (
                  <p>
                    <strong>{proposalKind==="standalone"?"This publishes an independent masterlist. ":proposalKind==="consolidation"?"This publishes a consolidated revision without reactivating scholars. ":"This publishes a combined revision of the attached official list. "}</strong>
                    {proposalKind==="consolidation"?"Both original publications, activation dates, statuses and payments remain unchanged. ":"Publication preserves the official snapshot and activates newly added scholars for this academic year. Existing activations remain unchanged. "}Publication
                    cannot be returned to Draft; corrections require amendments.
                  </p>
                )}
                {action === "lock" && (
                  <p>
                    Lock this official masterlist permanently. Its published
                    snapshot will remain unchanged.
                  </p>
                )}
                {action === "publish" && (
                  <>
                    <label
                      className="form-label"
                      htmlFor={`publish-date-${id}`}
                    >
                      {proposalKind==="consolidation"?"Consolidation effective date":"Activation effective date"}
                    </label>
                    <input
                      className="form-control mb-3"
                      id={`publish-date-${id}`}
                      type="date"
                      required
                      value={fields.effectiveOn}
                      onChange={(e) =>
                        setFields({ ...fields, effectiveOn: e.target.value })
                      }
                    />
                  </>
                )}
                <RoutineEvidence routine={action !== "return-draft"}>{(
                  [
                    {
                      key: "reason",
                      label: "Workflow reason",
                      min: 5,
                      max: 500,
                    },
                    {
                      key: "reference",
                      label: "Decision or verification reference",
                      min: 3,
                      max: 300,
                    },
                  ] as const
                ).map(({ key, label, min, max }) => (
                  <div className="mb-3" key={key}>
                    <label
                      className="form-label"
                      htmlFor={`workflow-${key}-${id}`}
                    >
                      {label}
                    </label>
                    <input
                      className="form-control"
                      id={`workflow-${key}-${id}`}
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
                <div className="d-flex flex-wrap gap-2">
                  <button type="submit" className="btn configuration-primary">
                    {saving ? "Saving..." : action === "publish" && proposalKind === "consolidation" ? "Publish consolidated revision" : labels[action]}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setAction(null)}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
              {error && <p role="alert" className="alert alert-danger">{error}</p>}
              {uncertain && <button type="submit" className="btn configuration-primary" disabled={saving}>Retry the same action</button>}
            </form></FocusedDialog>
          )}
          {view.publication && (
            <div className="alert alert-success mt-3">
              <strong>Official list preserved</strong><details><summary>Publication record & download</summary>
              <p>
                Published by {view.publication.actorName} ·{" "}
                {new Date(view.publication.publishedAt).toLocaleString()}
                <br />
                  {view.publication.snapshot.lineage
                    ? view.publication.snapshot.lineage.kind === "consolidation" ? "Consolidation effective" : view.publication.snapshot.lineage.kind === "addition" ? "Combined revision effective" : "Amendment effective"
                  : "Activation effective"}{" "}
                {view.publication.effectiveOn} ·{" "}
                {view.publication.snapshot.entries.length}{" "}
                {view.publication.snapshot.entries.length === 1
                  ? "scholar"
                  : "scholars"}
              </p>
              <a
                className="btn btn-sm btn-outline-secondary"
                href={`/api/v1/masterlists/${id}/publication`}
                download
              >
                Download official snapshot (JSON)
              </a>
              <details className="mt-2">
                <summary>Snapshot fingerprint</summary>
                <code style={{ overflowWrap: "anywhere" }}>
                  {view.publication.hash}
                </code>
              </details></details>
            </div>
          )}
          {view.events.length > 0 && (
            <details className="mt-3">
              <summary>Workflow history ({view.events.length})</summary>
              {view.events.map((e) => (
                <article className="border-top pt-2 mt-2" key={e.id}>
                  <strong>
                    {labels[e.action as MasterlistAction] ?? e.action}
                  </strong>
                  <p>
                    {title(e.fromStatus)} → {title(e.toStatus)} · Revision{" "}
                    {e.version}
                    <br />
                    {e.actorName} · {new Date(e.occurredAt).toLocaleString()}
                    <br />
                    {e.reason}
                    <br />
                    Reference: {e.reference}
                  </p>
                </article>
              ))}
            </details>
          )}
        </>
      )}
    </section>
  );
}
