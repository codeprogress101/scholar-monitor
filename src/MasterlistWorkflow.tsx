import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "./auth-api";
import { ApiError } from "./auth-api";
import type { Access } from "../server/authorization/policy";
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
  onChanged,
}: {
  id: string;
  version: number;
  session: Session;
  access: Access;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [view, setView] = useState<WorkflowView | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0),
    [action, setAction] = useState<MasterlistAction | null>(null);
  const [fields, setFields] = useState({
    reason: "",
    reference: "",
    effectiveOn: "",
  });
  const pending = useRef<{ signature: string; key: string } | null>(null),
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
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(path, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      setAction(null);
      setNotice("Masterlist workflow command saved.");
      setLoading(true);
      setRevision((n) => n + 1);
      onChanged();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Result unconfirmed. Retry the same command safely or refresh the masterlist.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      className="border rounded p-3 mb-3"
      aria-label="Masterlist workflow"
    >
      <h3 className="h5">Verification and official release</h3>
      {loading && <p role="status">Loading workflow...</p>}
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
      {view && (
        <>
          <p>
            <strong>Status: {title(view.status)}</strong> · Revision{" "}
            {view.version}
          </p>
          <p>
            Draft → For verification → Submitted for approval → Approved →
            Published → Locked
          </p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {(actions[view.status] ?? [])
              .filter((a) =>
                access.permissions.some((p) => p.code === permission(a)),
              )
              .map((a) => (
                <button
                  type="button"
                  className="btn btn-sm configuration-primary"
                  key={a}
                  disabled={
                    disabled ||
                    saving ||
                    loading ||
                    !!action ||
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
                  {labels[a]}
                </button>
              ))}
          </div>
          {action && (
            <form onSubmit={submit}>
              <fieldset disabled={disabled || saving || loading}>
                <legend className="h6">{labels[action]}</legend>
                {action === "submit-approval" && (
                  <p>
                    Confirm that all candidate records have been verified
                    against the referenced records. A different Coordinator must
                    approve this submission.
                  </p>
                )}
                {action === "publish" && (
                  <p>
                    Publication preserves the official snapshot and activates
                    every included scholar for this academic year. Publication
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
                      Activation effective date
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
                {(
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
                ))}
                <div className="d-flex flex-wrap gap-2">
                  <button type="submit" className="btn configuration-primary">
                    {saving ? "Saving..." : "Confirm workflow action"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setAction(null)}
                  >
                    Cancel workflow action
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {view.publication && (
            <div className="alert alert-success mt-3">
              <strong>Official snapshot preserved</strong>
              <p>
                Published by {view.publication.actorName} ·{" "}
                {new Date(view.publication.publishedAt).toLocaleString()}
                <br />
                {view.publication.snapshot.lineage
                  ? "Amendment effective"
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
              </details>
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
