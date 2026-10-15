import { useEffect, useRef, useState } from "react";
import type { Session } from "./auth-api";
import { configurationRequest as request } from "./configuration-api";
import type { AdditionPreview } from "../server/masterlists/additions";
import type { DraftDetail } from "../server/masterlists/model";
import { PagedTable } from "./WorkspaceUI";
type View = AdditionPreview & {
  targets: { id: string; title: string; version: number }[];
};
export default function MasterlistAddition({
  detail,
  session,
  onChanged,
}: {
  detail: DraftDetail;
  session: Session;
  onChanged: () => void;
}) {
  const [view, setView] = useState<View | null>(null),
    [target, setTarget] = useState("");
  const [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    request<View>(`masterlists/${detail.id}/addition`, { signal: c.signal })
      .then((v) => {
        setView(v);
        setTarget(v.targetId ?? "");
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [detail.id, detail.version]);
  async function save() {
    if (inFlight.current) return;
    const body = {
      expectedVersion: detail.version,
      targetId: target || null,
      ...(target
        ? { targetVersion: view?.targets.find((t) => t.id === target)?.version }
        : {}),
      reason,
      reference,
    };
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await request(`masterlists/${detail.id}/addition`, {
        body,
        csrf: session.csrfToken,
        key: pending.current.key,
      });
      pending.current = null;
      onChanged();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Result unknown. Retry the same action safely.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (["published", "locked"].includes(detail.status) && view && !view.targetId && !error) return null;
  return (
    <section className="masterlist-addition secondary-details" aria-label="Add to published masterlist">
      {view?.targetId && <h3 className="h5">Addition to published masterlist</h3>}
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {view?.targetId && (
        <>
          <p>
            {view.incorporated
              ? "This draft is incorporated into the combined publication shown here. Parent publication"
              : "Combined revision proposed for"}
            :{" "}
            <a href={`#masterlists?draft=${view.targetId}`}>
              {view.targetTitle}
            </a>
            .
          </p>
          <p>
            Existing members: {view.existing.length} · Additions:{" "}
            {view.additions} · Combined: {view.existing.length + view.additions}{" "}
            · Blocking issues: {view.issues.length}
          </p>
        </>
      )}
      {view?.targetId && !view.incorporated && view.issues.length > 0 && (
        <div className="alert alert-warning">
          <strong>Resolve before publication</strong>
          <ul>
            {view.issues.map((i, n) => (
              <li key={n}>
                {i.scholarId && (
                  <>
                    <a href={`#scholars?scholar=${i.scholarId}`}>
                      Review affected scholar
                    </a>
                    :{" "}
                  </>
                )}
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view?.consolidation && <p className="alert alert-info">Consolidation source: <a href={`#masterlists?draft=${view.consolidation.sourceId}`}>{view.consolidation.title}</a>. Both memberships are frozen. Publication preserves existing activations and payments. If either source changes, prepare a new proposal for renewed review.</p>}
      {detail.status === "draft" && !detail.unavailable && view && !view.consolidation && (
        <details><summary>{view.targetId ? "Change attached publication" : "Add this draft to a published masterlist"}</summary><form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="form-label">
            Official list
            <select
              className="form-select"
              value={target}
              disabled={busy}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Standalone draft (detach)</option>
              {view.targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Reason
            <input
              className="form-control"
              required
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="form-label">
            Reference
            <input
              className="form-control"
              required
              minLength={3}
              maxLength={300}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <button className="btn configuration-primary" disabled={busy}>
            {target ? "Attach to official list" : "Detach from official list"}
          </button>
        </form></details>
      )}
      {view?.targetId && !view.incorporated && (
        <p>
          Existing official members are read-only. Review the proposed
          additions, then use the normal verification, approval and publication
          steps. Return to Draft before changing the target.
        </p>
      )}
      {!!view?.existing.length && (
        <details>
          <summary>Existing official members (read-only)</summary>
          <PagedTable
            items={view.existing}
            label="Existing official members"
            columns={["Scholar ID", "Name", "Award number"]}
            searchText={(e) => `${e.snapshot.humanId} ${e.snapshot.name}`}
            row={(e) => (
              <tr key={e.scholarId}>
                <td>{e.snapshot.humanId}</td>
                <td>{e.snapshot.name}</td>
                <td>{e.awardNumber ?? "—"}</td>
              </tr>
            )}
          />
        </details>
      )}
    </section>
  );
}
