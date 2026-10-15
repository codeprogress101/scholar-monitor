import { useEffect, useState } from "react";
import type { DraftDetail } from "../server/masterlists/model";
import { configurationRequest as request } from "./configuration-api";
export default function MasterlistConsolidation({
  detail,
  disabled,
  onCreate,
}: {
  detail: DraftDetail;
  disabled: boolean;
  onCreate: (body: unknown) => Promise<void>;
}) {
  const [targets, setTargets] = useState<
      { id: string; title: string; version: number }[]
    >([]),
    [source, setSource] = useState(""),
    [title, setTitle] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    request<{ targets: typeof targets }>(`masterlists/${detail.id}/addition`, {
      signal: controller.signal,
    })
      .then((v) => setTargets(v.targets))
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [detail.id, detail.version]);
  return (
    <details className="secondary-details">
      <summary>Consolidate published masterlists</summary>
      <p>
        Destination: <strong>{detail.title}</strong>. Select another latest
        publication from this academic year. This creates a proposal for
        verification and Coordinator approval; it does not change either
        published list.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onCreate({
            academicYearId: detail.academicYearId,
            title,
            targetId: detail.id,
            targetVersion: detail.version,
            sourceId: source,
            sourceVersion: targets.find((t) => t.id === source)?.version,
            reason,
            reference,
          });
        }}
      >
        <fieldset disabled={disabled}>
          <label className="form-label d-block">
            Source publication
            <select
              className="form-select"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select latest publication</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label d-block">
            Consolidated revision title
            <input
              className="form-control"
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="form-label d-block">
            Consolidation reason
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
            Consolidation reference
            <input
              className="form-control"
              required
              minLength={3}
              maxLength={300}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <button
            className="btn configuration-primary"
            disabled={!targets.length}
          >
            Prepare consolidation proposal
          </button>
        </fieldset>
      </form>
    </details>
  );
}
